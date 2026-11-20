import Phaser from 'phaser';
import { newRun, completeMilestone, restartRescue, type RunState } from '../state';
import type { Difficulty } from '../rules';
import { difficultyRules, MAX_HEALTH } from '../rules';
import { saveRun } from '../../services/local-save';
import type { CombatEnemy, CombatBullet, CoverRect, EnemyKind } from '../combat/types';
import { DamageSystem } from '../combat/damage';
import { Player } from '../combat/player';
import { makeEnemy, updateEnemy } from '../combat/enemy';
import { updateBullet } from '../combat/bullet';
import type { RescueBeatDef } from '../../content/encounters/rescue-beats';
import { rescueBeats } from '../../content/encounters/rescue-beats';

// Rescue mission arena. One continuous combat scene runs the three rescue beats
// (alley -> shelter hold -> extraction) while preserving campaign health across
// all of them. Only reaching Lina's safety grants girl-rescued and full recovery
// exactly once. Failure kills K, shows Game Over, and offers an explicit restart
// of this mission only (not the campus/dorm story).

const ARENA_W = 768;
const ARENA_H = 432;
const PLAYER_RADIUS = 10;
const ENEMY_RADIUS = 14;
const BULLET_RADIUS = 3;
const HIT_FLASH_MS = 120;
const HIT_TEXT_MS = 220;
const FIRE_COOLDOWN_MS = 400;
const BULLET_TTL_MS = 2000;
const SWITCH_HOLD_MS = 1000; // hold E for one second to open the gate
const LINA_RADIUS = 10;
const MAI_RADIUS = 10;

// Fixed cover blocks shared with the isolated arena, reused as readable hard
// cover. Lina shelters behind hard cover and is never a simulated health bar.
const COVER: CoverRect[] = [
  { x: ARENA_W * 0.5 - 90, y: ARENA_H * 0.5 - 60, w: 120, h: 100 }, // shelter cover
  { x: ARENA_W * 0.5 - 200, y: ARENA_H * 0.5 + 55, w: 80, h: 90 },
  { x: ARENA_W * 0.5 + 150, y: ARENA_H * 0.5 - 95, w: 90, h: 80 },
];

// Scripted positions for the rescue cast. All are placeholders labelled
// temporary until campaign art is supplied; none are walk cycles.
const PLAYER_START = { x: ARENA_W * 0.22, y: ARENA_H * 0.5 };
const LINA_START = { x: ARENA_W * 0.34, y: ARENA_H * 0.5 }; // behind shelter cover
const MAI_MARKER = { x: ARENA_W * 0.82, y: ARENA_H * 0.5 }; // Mai's safe marker
const ISSHIN_POS = { x: ARENA_W * 0.5, y: ARENA_H * 0.22 }; // fixed covering-fire position
const SWITCH_POS = { x: ARENA_W * 0.62, y: ARENA_H * 0.62 }; // extraction switch
const LINA_SAFE = { x: MAI_MARKER.x, y: MAI_MARKER.y }; // Lina's destination

type BeatId = 'alley' | 'hold' | 'extraction';
const BEAT_ORDER: BeatId[] = ['alley', 'hold', 'extraction'];

interface Lina {
  x: number;
  y: number;
  phase: 'behind-cover' | 'moving-to-mai' | 'safe';
  moveStartTime: number;
  moveDurationMs: number;
}

interface SwitchHold {
  active: boolean;
  startTime: number;
}

export class RescueScene extends Phaser.Scene {
  private difficulty: Difficulty = 'story';
  private state!: RunState;
  private damage = new DamageSystem();
  private player = new Player();
  private enemies: CombatEnemy[] = [];
  private bullets: CombatBullet[] = [];
  private coverGraphics!: Phaser.GameObjects.Graphics;
  private telegraphGraphics!: Phaser.GameObjects.Graphics;
  private playerSprite!: Phaser.GameObjects.Ellipse;
  private linaSprite!: Phaser.GameObjects.Ellipse;
  private maiSprite!: Phaser.GameObjects.Ellipse;
  private isshinSprite!: Phaser.GameObjects.Ellipse;
  private switchSprite!: Phaser.GameObjects.Rectangle;
  private enemyGraphics = new Map<string, Phaser.GameObjects.Ellipse>();
  private bulletGraphics = new Map<string, Phaser.GameObjects.Arc>();
  private bulletSeq = 0;
  private hitFlash!: Phaser.GameObjects.Rectangle;
  private hitText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;
  private counterRing!: Phaser.GameObjects.Graphics;
  private pauseOverlay!: Phaser.GameObjects.Rectangle;
  private gameOverPanel!: Phaser.GameObjects.Container;
  private endingPanel!: Phaser.GameObjects.Container;
  private teachingCard!: Phaser.GameObjects.Container;

  // Beat progression
  private beatIndex = 0;
  private beatStartTime = 0;
  private holdSecondsLeft = 0;
  private holdTimerEndTime = 0;
  private gateOpen = false;
  private holdExpired = false;
  private lina!: Lina;
  private switchHold!: SwitchHold;
  private spawnQueue: { kind: EnemyKind; timeMs: number; x: number; y: number }[] = [];
  private nextSpawnIndex = 0;

  // Teaching / counter
  private counterTaught = false;
  private teachingPaused = false;

  // Pause / focus-loss / defeat freezing.
  private pausedOffset = 0;
  private pausedAt: number | null = null;
  private paused = false;
  private defeated = false;
  private ended = false;

  private fireCooldown = 0;
  private hitFlashEndTime = 0;
  private hitTextEndTime = 0;
  private isshinCoverFireTime = 0;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() { super('rescue'); }

  init(data: { state?: RunState; difficulty?: Difficulty } = {}): void {
    this.difficulty = data.difficulty ?? 'story';
    // Entry snapshot: retain current health across beats. A retry passes a state
    // already reset by restartRescue (full health, counterUnlocked false).
    this.state = data.state ?? newRun(this.difficulty);
    // A failed rescue that was saved must not be resurrected on reload.
    if (this.state.rescueStatus === 'failed') {
      this.defeated = true;
    } else if (this.state.rescueStatus === 'not-started') {
      // Entering the mission marks it active so a later lethal hit is recorded
      // as a failed rescue (and reloads as Game Over) rather than left un-started.
      this.state = { ...this.state, rescueStatus: 'active' };
    }
  }

  private now(time: number): number { return time - this.pausedOffset; }

  preload() {
    // Intentional placeholder rendering only: no rescue art is supplied yet, so
    // entities are drawn with graphics primitives and labelled temporary.
  }

  create() {
    const cam = this.cameras.main;
    const width = cam.width;
    const height = cam.height;

    this.beatStartTime = this.now(performance.now());
    const beat = this.currentBeat();
    this.holdSecondsLeft = beat.holdSeconds ?? 0;
    this.holdTimerEndTime = this.now(performance.now()) + (beat.holdSeconds ?? 0) * 1000;
    this.holdExpired = false;
    this.spawnQueue = [...beat.spawns];
    this.nextSpawnIndex = 0;
    this.gateOpen = false;
    this.switchHold = { active: false, startTime: 0 };
    this.lina = {
      x: LINA_START.x,
      y: LINA_START.y,
      phase: 'behind-cover',
      moveStartTime: 0,
      moveDurationMs: 2000,
    };
    this.counterTaught = this.state.counterUnlocked;
    this.teachingPaused = false;

    // Input
    this.keys = this.input.keyboard!.addKeys(
      'W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,ESC,E',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'ESC', 'E']);
    this.input.on('pointerdown', () => this.tryFire());

    // Cover
    this.coverGraphics = this.add.graphics();
    this.coverGraphics.fillStyle(0x4a5568);
    for (const c of COVER) this.coverGraphics.fillRect(c.x, c.y, c.w, c.h);

    // Player (temporary placeholder: blue ellipse).
    this.player.x = PLAYER_START.x;
    this.player.y = PLAYER_START.y;
    this.playerSprite = this.add.ellipse(
      this.player.x, this.player.y, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2, 0x4cc9f0,
    );
    this.playerSprite.setDepth(50);

    // Lina behind shelter cover (temporary placeholder: magenta ellipse).
    this.linaSprite = this.add.ellipse(
      this.lina.x, this.lina.y, LINA_RADIUS * 2, LINA_RADIUS * 2, 0xd946ef,
    );
    this.linaSprite.setDepth(49);

    // Mai at her safe marker (temporary placeholder: cyan ellipse).
    this.maiSprite = this.add.ellipse(
      MAI_MARKER.x, MAI_MARKER.y, MAI_RADIUS * 2, MAI_RADIUS * 2, 0x22d3ee,
    );
    this.maiSprite.setDepth(49);

    // Isshin at fixed covering-fire position (temporary placeholder: yellow ellipse).
    this.isshinSprite = this.add.ellipse(
      ISSHIN_POS.x, ISSHIN_POS.y, ENEMY_RADIUS * 2, ENEMY_RADIUS * 2, 0xfde047,
    );
    this.isshinSprite.setDepth(48);

    // Extraction switch.
    this.switchSprite = this.add
      .rectangle(SWITCH_POS.x, SWITCH_POS.y, 30, 30, 0xe9b45c)
      .setStrokeStyle(2, 0xe9b45c)
      .setDepth(47);

    // Telegraph overlay.
    this.telegraphGraphics = this.add.graphics();
    this.telegraphGraphics.setDepth(45);

    // Hit feedback (never color-only).
    this.hitFlash = this.add
      .rectangle(0, 0, width, height, 0xffffff, 0)
      .setOrigin(0).setDepth(105).setVisible(false);
    this.hitText = this.add
      .text(width / 2, height / 2 - 70, 'HIT', {
        fontSize: '28px', fontFamily: 'monospace', color: '#ffffff',
      })
      .setOrigin(0.5).setDepth(110).setVisible(false);

    // HUD
    this.hudText = this.add
      .text(16, 12, '', { fontSize: '14px', fontFamily: 'monospace', color: '#e2e8f0' })
      .setDepth(100);
    this.counterText = this.add
      .text(width / 2, 34, '', {
        fontSize: '20px', fontFamily: 'monospace', color: '#fde047',
        stroke: '#000000', strokeThickness: 4,
      })
      .setOrigin(0.5).setDepth(100).setVisible(false);
    this.counterRing = this.add.graphics().setDepth(52);

    // Pause overlay
    this.pauseOverlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0).setDepth(120).setVisible(false);
    this.pauseOverlay.setScrollFactor(0);
    this.add
      .text(width / 2, height / 2 - 20, 'PAUSED', {
        fontSize: '28px', fontFamily: 'monospace', color: '#ffffff',
      }).setOrigin(0.5).setDepth(121).setVisible(false).setScrollFactor(0);
    this.add
      .text(width / 2, height / 2 + 12, 'Esc · Resume', {
        fontSize: '16px', fontFamily: 'monospace', color: '#cbd5e1',
      }).setOrigin(0.5).setDepth(121).setVisible(false).setScrollFactor(0);

    // Teaching card (shown once during the hold after the first perfect dodge).
    this.teachingCard = this.add.container(width / 2, height / 2);
    this.teachingCard.setDepth(130);
    this.teachingCard.setVisible(false);
    const cardBg = this.add.rectangle(0, 0, 420, 220, 0x111827, 0.95)
      .setStrokeStyle(2, 0xfde047);
    const cardTitle = this.add.text(0, -70, 'COUNTER UNLOCKED', {
      fontSize: '20px', fontFamily: 'monospace', color: '#fde047',
    }).setOrigin(0.5);
    const cardBody = this.add.text(0, -10, 'Dodge through a near hit. When COUNTER - CLICK appears, click to fire into the opening.', {
      fontSize: '14px', fontFamily: 'monospace', color: '#e2e8f0', align: 'center',
    }).setOrigin(0.5).setLineSpacing(4);
    const cardHint = this.add.text(0, 55, 'Click anywhere to continue', {
      fontSize: '14px', fontFamily: 'monospace', color: '#cbd5e1',
    }).setOrigin(0.5);
    this.teachingCard.add([cardBg, cardTitle, cardBody, cardHint]);
    this.teachingCard.setSize(420, 220);
    this.teachingCard.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-210, -110, 420, 220), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
    this.teachingCard.on('pointerdown', () => this.dismissTeaching());

    // Game Over overlay
    this.gameOverPanel = this.add.container(width / 2, height / 2);
    this.gameOverPanel.setDepth(130);
    this.gameOverPanel.setVisible(false);
    const goBg = this.add.rectangle(0, 0, 360, 180, 0x111827, 0.95).setStrokeStyle(2, 0xef4444);
    const goTitle = this.add.text(0, -60, 'GAME OVER', {
      fontSize: '24px', fontFamily: 'monospace', color: '#ef4444',
    }).setOrigin(0.5);
    const goHint = this.add.text(0, -20, 'K couldn\'t make it through. The attempt failed.', {
      fontSize: '14px', fontFamily: 'monospace', color: '#e2e8f0',
    }).setOrigin(0.5).setWordWrapWidth(320);
    const restartBtn = this.add
      .rectangle(0, 24, 220, 36, 0x4cc9f0)
      .setInteractive({ useHandCursor: true })
      .setDepth(131);
    const restartBtnText = this.add.text(0, 24, 'Restart rescue mission', {
      fontSize: '15px', fontFamily: 'monospace', color: '#0f172a',
    }).setOrigin(0.5).setDepth(132);
    const returnBtn = this.add
      .rectangle(0, 72, 220, 36, 0x4b5563)
      .setInteractive({ useHandCursor: true })
      .setDepth(131);
    const returnBtnText = this.add.text(0, 72, 'Return to title', {
      fontSize: '15px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(132);
    restartBtn.on('pointerdown', () => this.restartMission());
    returnBtn.on('pointerdown', () => this.returnToTitle());
    this.gameOverPanel.add([goBg, goTitle, goHint, restartBtn, restartBtnText, returnBtn, returnBtnText]);

    // Ending panel (shown when Lina reaches safety).
    this.endingPanel = this.add.container(width / 2, height / 2);
    this.endingPanel.setDepth(130);
    this.endingPanel.setVisible(false);
    const endBg = this.add.rectangle(0, 0, 420, 260, 0x111827, 0.95).setStrokeStyle(2, 0x22d3ee);
    const endTitle = this.add.text(0, -80, 'Resolve restored', {
      fontSize: '20px', fontFamily: 'monospace', color: '#22d3ee',
    }).setOrigin(0.5);
    const endBody = this.add.text(0, -25, 'Lina reached Mai\'s safe marker. girl-rescued once — health fully recovered.', {
      fontSize: '14px', fontFamily: 'monospace', color: '#e2e8f0', align: 'center',
    }).setOrigin(0.5).setLineSpacing(4).setWordWrapWidth(360);
    const endLine = this.add.text(0, 30, '“You were the person who stayed.”', {
      fontSize: '15px', fontFamily: 'monospace', color: '#fde047',
    }).setOrigin(0.5);
    const endFinish = this.add.text(0, 75, 'Finish chapter · Return to title', {
      fontSize: '14px', fontFamily: 'monospace', color: '#cbd5e1',
    }).setOrigin(0.5);
    this.endingPanel.add([endBg, endTitle, endBody, endLine, endFinish]);
    this.endingPanel.setSize(420, 260);
    this.endingPanel.on('pointerdown', () => this.returnToTitle());
    this.endingPanel.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-210, -130, 420, 260), hitAreaCallback: Phaser.Geom.Rectangle.Contains });

    if (this.defeated) {
      this.showGameOver();
      return;
    }

    this.spawnBeatEnemies(this.now(performance.now()));

    this.game.events.on('hidden', () => this.setPaused(true));
    this.game.events.on('visible', () => this.setPaused(false, true));

    this.events.once('shutdown', () => {
      this.game.events.off('hidden', () => this.setPaused(true));
      this.game.events.off('visible', () => this.setPaused(false, true));
      this.input.keyboard?.removeAllKeys(true);
      this.input.off('pointerdown', () => this.tryFire());
    });

    this.updateHUD();
  }

  // ---------- beat helpers ----------

  private currentBeat(): RescueBeatDef {
    return rescueBeats[this.beatIndex];
  }

  private beatId(): BeatId {
    return BEAT_ORDER[this.beatIndex];
  }

  private spawnBeatEnemies(now: number) {
    const beat = this.currentBeat();
    for (const s of beat.spawns) {
      if (s.timeMs === 0) this.spawnEnemy(s.kind, s.x, s.y, now);
    }
  }

  private spawnEnemy(kind: EnemyKind, x: number, y: number, now: number) {
    if (this.enemies.filter((e) => e.phase !== 'dead').length >= this.currentBeat().maxActive) return;
    this.enemies.push(makeEnemy(kind, x, y, this.difficulty, now));
  }

  // ---------- main loop ----------

  update(time: number, dt: number) {
    if (this.teachingPaused || this.paused || this.defeated || this.ended) return;

    const effNow = this.now(time);

    // Teaching card: click to dismiss and unlock the counter.
    if (this.teachingCard.visible) return;

    // Input: continuous movement, normalized diagonals.
    let dx = 0;
    let dy = 0;
    if (this.keys.W.isDown || this.keys.UP.isDown) dy = -1;
    else if (this.keys.S.isDown || this.keys.DOWN.isDown) dy = 1;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) dx = -1;
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx = 1;
    this.player.setDirection(dx, dy);

    // Mouse-world aim.
    const p = this.input.activePointer;
    this.player.setAim(p.worldX - this.player.x, p.worldY - this.player.y);

    // Space dodge.
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && this.player.canDodge(effNow)) {
      this.player.startDodge(effNow);
    }

    // Esc pauses.
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.setPaused(!this.paused);
      return;
    }

    // E: extraction switch (only in extraction beat, in range).
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.trySwitch();
    }

    this.player.tickDodge(effNow);
    this.player.updateMovement(dt / 1000, COVER);
    this.clampPlayer();

    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    // Enemy AI + scheduled spawns from the fixed queue.
    const newBullets: {
      x: number; y: number; vx: number; vy: number; speed: number;
      damage: number; attackId: string | null;
    }[] = [];
    for (const e of this.enemies) {
      if (e.phase === 'dead') continue;
      for (const b of updateEnemy(e, { x: this.player.x, y: this.player.y, radius: PLAYER_RADIUS }, effNow, dt / 1000)) {
        newBullets.push(b);
      }
    }

    // Fixed-queue spawns (beat-relative time).
    while (
      this.nextSpawnIndex < this.spawnQueue.length &&
      effNow - this.beatStartTime >= this.spawnQueue[this.nextSpawnIndex].timeMs
    ) {
      const s = this.spawnQueue[this.nextSpawnIndex++];
      this.spawnEnemy(s.kind, s.x, s.y, effNow);
    }

    // Hold-beat timer: when it reaches zero the hold is over and the gate route
    // is ready; the player still opens the switch in the extraction beat.
    if (this.beatId() === 'hold' && !this.holdExpired && effNow >= this.holdTimerEndTime) {
      this.holdExpired = true;
      this.holdSecondsLeft = 0;
    }

    // Bullets
    for (const b of this.bullets) updateBullet(b, dt / 1000);
    for (const b of newBullets) {
      this.bullets.push({
        id: `b-${this.allocBulletId()}`,
        x: b.x, y: b.y, vx: b.vx, vy: b.vy, speed: b.speed, damage: b.damage,
        owner: 'enemy', attackId: b.attackId, born: effNow, ttl: BULLET_TTL_MS,
      });
    }

    this.resolveCollisions(effNow);

    // A lethal hit ends the attempt immediately. A same-frame milestone must not
    // advance the ending in favor of death (death wins the race).
    if (this.defeated) {
      this.syncGraphics();
      this.updateHUD(effNow);
      return;
    }

    // Isshin scripted covering fire during hold/extraction at readable intervals.
    if (this.beatId() !== 'alley' && effNow - this.isshinCoverFireTime > 4000) {
      const target = this.enemies.find((e) => e.phase !== 'dead');
      if (target) {
        this.isshinCoverFireTime = effNow;
        const dx = target.x - ISSHIN_POS.x;
        const dy = target.y - ISSHIN_POS.y;
        const len = Math.hypot(dx, dy) || 1;
        this.bullets.push({
          id: `b-${this.allocBulletId()}`,
          x: ISSHIN_POS.x, y: ISSHIN_POS.y,
          vx: dx / len, vy: dy / len, speed: 520, damage: 40,
          owner: 'player', attackId: null, born: effNow, ttl: BULLET_TTL_MS,
        });
      }
    }

    // Lina scripted extraction movement after the gate is open and lane is safe.
    this.updateLina(effNow);

    this.enemies = this.enemies.filter((e) => e.phase !== 'dead');
    this.bullets = this.bullets.filter((b) => effNow - b.born < b.ttl && this.inBounds(b));

    this.syncGraphics();
    this.updateHUD(effNow);

    this.maybeAdvanceBeat();
    this.maybeEndMission();
    this.updateSwitch(effNow);

    if (this.state.health <= 0 && !this.defeated) this.handleDefeat();
  }

  private allocBulletId(): number { return ++this.bulletSeq; }

  private clampPlayer() {
    const cam = this.cameras.main;
    const r = this.player.radius;
    this.player.x = Math.min(Math.max(this.player.x, r), cam.width - r);
    this.player.y = Math.min(Math.max(this.player.y, r), cam.height - r);
  }

  private tryFire() {
    if (this.teachingPaused || this.paused || this.defeated || this.ended) return;
    if (this.fireCooldown > 0) return;
    this.fireCooldown = FIRE_COOLDOWN_MS;
    const shot = this.player.fireBullet(this.player.x, this.player.y, this.now(performance.now()));
    this.bullets.push({
      id: `b-${this.allocBulletId()}`,
      x: shot.x, y: shot.y, vx: shot.vx, vy: shot.vy, speed: shot.speed, damage: shot.damage,
      owner: 'player', attackId: null, born: this.now(performance.now()), ttl: BULLET_TTL_MS,
    });
  }

  private trySwitch() {
    if (this.beatId() !== 'extraction') return;
    if (this.gateOpen) return; // already open
    if (this.switchHold.active) return; // already holding
    // Must be in range of the switch.
    const d = Math.hypot(this.player.x - SWITCH_POS.x, this.player.y - SWITCH_POS.y);
    if (d > 60) return;
    this.switchHold = { active: true, startTime: this.now(performance.now()) };
  }

  private updateSwitch(effNow: number) {
    if (!this.switchHold.active) return;
    if (effNow - this.switchHold.startTime >= SWITCH_HOLD_MS) {
      this.gateOpen = true;
      this.switchHold = { active: false, startTime: 0 };
    }
  }

  private updateLina(effNow: number) {
    // Beat 1 & 2: Lina stays behind shelter cover.
    if (this.beatId() === 'alley' || this.beatId() === 'hold') {
      this.lina.x = LINA_START.x;
      this.lina.y = LINA_START.y;
      this.lina.phase = 'behind-cover';
      return;
    }
    // Extraction: once gate open and no live enemies, Lina moves to Mai's marker.
    if (this.beatId() === 'extraction' && this.gateOpen && this.lina.phase !== 'safe') {
      const active = this.enemies.some((e) => e.phase !== 'dead');
      if (!active && this.lina.phase !== 'moving-to-mai') {
        this.lina.phase = 'moving-to-mai';
        this.lina.moveStartTime = effNow;
      }
      if (this.lina.phase === 'moving-to-mai') {
        const t = Math.min(1, (effNow - this.lina.moveStartTime) / this.lina.moveDurationMs);
        this.lina.x = LINA_START.x + (LINA_SAFE.x - LINA_START.x) * t;
        this.lina.y = LINA_START.y + (LINA_SAFE.y - LINA_START.y) * t;
        if (t >= 1) {
          this.lina.phase = 'safe';
          this.ended = true;
          this.grantRescue();
        }
      }
    }
    this.linaSprite.setPosition(this.lina.x, this.lina.y);
  }

  private grantRescue() {
    // Only reaching safety grants girl-rescued and full recovery, exactly once.
    const next = completeMilestone(this.state, 'girl-rescued');
    if (next !== this.state) {
      this.state = next;
      saveRun(this.state);
    }
    this.showEnding();
  }

  private maybeAdvanceBeat() {
    const active = this.enemies.filter((e) => e.phase !== 'dead').length;
    const allSpawned = this.nextSpawnIndex >= this.spawnQueue.length;

    if (this.beatId() === 'alley' && active === 0 && allSpawned) {
      // All alley enemies defeated -> proceed to shelter hold.
      this.advanceTo('hold');
    } else if (this.beatId() === 'hold' && this.holdExpired) {
      // Hold timer expired: Isshin opens the route -> extraction.
      this.advanceTo('extraction');
    }
  }

  private advanceTo(nextId: BeatId) {
    const target = BEAT_ORDER.indexOf(nextId);
    if (target <= this.beatIndex) return;
    this.beatIndex = target;
    this.beatStartTime = this.now(performance.now());
    const beat = this.currentBeat();
    this.holdSecondsLeft = beat.holdSeconds ?? 0;
    this.holdTimerEndTime = this.beatStartTime + (beat.holdSeconds ?? 0) * 1000;
    this.spawnQueue = [...beat.spawns];
    this.nextSpawnIndex = 0;
    this.gateOpen = false;
    // Moving between beats never heals; health is preserved automatically.
    // Clear telegraphed commitments from the previous beat so nothing carries over.
    for (const e of this.enemies) e.attackId = null;
    this.spawnBeatEnemies(this.beatStartTime);
    this.updateHUD();
  }

  private maybeEndMission() {
    // Handled by grantRescue via updateLina when Lina reaches safety.
  }

  // ---------- collisions / damage / counter ----------

  private resolveCollisions(effNow: number) {
    // Player bullets damage enemies.
    for (const b of this.bullets) {
      if (b.owner !== 'player') continue;
      for (const e of this.enemies) {
        if (e.phase === 'dead') continue;
        if (circleOverlap(b.x, b.y, BULLET_RADIUS, e.x, e.y, e.radius)) {
          e.health -= b.damage;
          b.hit = true;
          if (e.health <= 0) {
            e.phase = 'dead';
            e.attackId = null;
          }
          break;
        }
      }
    }

    const dodgeImmune = this.player.isDodgeInvulnerable(effNow);

    // Enemy projectiles and committed enemy bodies damage K.
    for (const b of this.bullets) {
      if (b.owner !== 'enemy') continue;
      if (!circleOverlap(b.x, b.y, BULLET_RADIUS, this.player.x, this.player.y, PLAYER_RADIUS)) continue;
      b.hit = true;
      if (dodgeImmune) continue;
      const res = this.damage.acceptHit(this.state, b.attackId, effNow);
      if (res) this.applyHit(res, effNow);
    }

    for (const e of this.enemies) {
      if (e.phase !== 'committed' || !e.attackId) continue;
      if (!circleOverlap(this.player.x, this.player.y, PLAYER_RADIUS, e.x, e.y, e.radius)) continue;
      if (dodgeImmune) continue;
      const res = this.damage.acceptHit(this.state, e.attackId, effNow);
      if (res) this.applyHit(res, effNow);
    }

    // Perfect dodge: a committed hostile attack would have hit K during the
    // dodge's invulnerable interval. One counter per attack ID.
    if (dodgeImmune) {
      for (const b of this.bullets) {
        if (b.owner !== 'enemy' || !b.attackId) continue;
        if (circleOverlap(b.x, b.y, BULLET_RADIUS, this.player.x, this.player.y, PLAYER_RADIUS)) {
          this.grantCounter(b.attackId, effNow);
        }
      }
      for (const e of this.enemies) {
        if (e.phase !== 'committed' || !e.attackId) continue;
        if (circleOverlap(e.x, e.y, e.radius, this.player.x, this.player.y, PLAYER_RADIUS)) {
          this.grantCounter(e.attackId, effNow);
        }
      }
    }

    this.bullets = this.bullets.filter((b) => !b.hit);

    // Counter window expires harmlessly; a missed window is never a punishment.
    if (this.player.counterActive && effNow >= this.player.counterEndTime) {
      this.player.clearCounter();
    }
  }

  private applyHit(res: { state: RunState; killed: boolean }, effNow: number) {
    this.state = res.state;
    saveRun(this.state); // save each validated damaging hit immediately
    this.player.clearCounter(); // new damaging hits clear stale counter windows
    this.switchHold = { active: false, startTime: 0 }; // damage interrupts the switch hold
    this.hitFlashEndTime = effNow + HIT_FLASH_MS;
    this.hitTextEndTime = effNow + HIT_TEXT_MS;
    if (res.killed) {
      this.defeated = true;
    }
  }

  private grantCounter(attackId: string, effNow: number) {
    if (this.player.counterActive) return;
    // Counter teaching: the first perfect dodge during the hold pauses and
    // explains the technique before unlocking it for this attempt.
    if (this.beatId() === 'hold' && !this.counterTaught && !this.state.counterUnlocked) {
      this.counterTaught = true;
      this.teachingPaused = true;
      this.paused = true;
      this.teachingCard.setVisible(true);
      this.teachingCard.setSize(420, 220);
      return;
    }
    this.awardCounter(attackId, effNow);
  }

  private dismissTeaching() {
    this.teachingCard.setVisible(false);
    this.teachingPaused = false;
    this.paused = false;
    this.state.counterUnlocked = true;
    saveRun(this.state);
    this.awardCounter(null, this.now(performance.now())); // open a fresh window
  }

  private awardCounter(attackId: string | null, effNow: number) {
    this.player.openCounter(effNow, attackId ?? null);
    this.counterText.setText('COUNTER - CLICK').setVisible(true);
  }

  private handleDefeat() {
    this.defeated = true;
    this.paused = true;
    saveRun(this.state);
    this.pauseOverlay.setVisible(true);
    this.gameOverPanel.setVisible(true);
    this.counterText.setVisible(false);
  }

  private restartMission() {
    this.defeated = false;
    this.paused = false;
    this.ended = false;
    this.pausedOffset = 0;
    this.pausedAt = null;
    this.fireCooldown = 0;
    this.hitFlashEndTime = 0;
    this.hitTextEndTime = 0;
    this.teachingPaused = false;
    this.counterTaught = false; // a retry re-locks the counter and re-teaches it

    // restartRescue only accepts a failed rescue: full health, reset mission,
    // counter unlock cleared, earlier story preserved.
    const failedState = { ...this.state, rescueStatus: 'failed' as const };
    this.state = restartRescue(failedState);
    saveRun(this.state);

    this.damage = new DamageSystem();
    this.player = new Player();
    this.player.x = PLAYER_START.x;
    this.player.y = PLAYER_START.y;

    this.enemies = [];
    this.bullets = [];
    this.enemyGraphics.forEach((g) => g.destroy());
    this.enemyGraphics.clear();
    this.bulletGraphics.forEach((g) => g.destroy());
    this.bulletGraphics.clear();

    this.gateOpen = false;
    this.holdExpired = false;
    this.switchHold = { active: false, startTime: 0 };
    this.lina = {
      x: LINA_START.x, y: LINA_START.y, phase: 'behind-cover',
      moveStartTime: 0, moveDurationMs: 2000,
    };
    this.linaSprite.setPosition(this.lina.x, this.lina.y);

    this.beatIndex = 0;
    this.beatStartTime = this.now(performance.now());
    const beat = this.currentBeat();
    this.holdSecondsLeft = beat.holdSeconds ?? 0;
    this.holdTimerEndTime = this.beatStartTime + (beat.holdSeconds ?? 0) * 1000;
    this.spawnQueue = [...beat.spawns];
    this.nextSpawnIndex = 0;

    this.gameOverPanel.setVisible(false);
    this.pauseOverlay.setVisible(false);
    this.counterText.setVisible(false);
    this.hitText.setVisible(false);
    this.hitFlash.setVisible(false);
    this.teachingCard.setVisible(false);

    this.spawnBeatEnemies(this.beatStartTime);
    this.updateHUD();
    this.syncGraphics();
  }

  private returnToTitle() {
    // Signal the host page (main.ts) to re-show the menu, then tear down the
    // scene. Story routing and Continue are owned by Phase 6.
    window.dispatchEvent(new CustomEvent('want:return-to-title'));
    this.game.destroy(true);
  }

  private showGameOver() {
    this.pauseOverlay.setVisible(true);
    this.gameOverPanel.setVisible(true);
  }

  private showEnding() {
    this.ended = true;
    this.paused = true;
    this.endingPanel.setVisible(true);
    this.counterText.setVisible(false);
  }

  private setPaused(p: boolean, clearInputs = false) {
    if (this.defeated && !p) return;
    this.paused = p;
    this.pauseOverlay.setVisible(p);
    if (p) {
      this.pausedAt = performance.now();
    } else if (this.pausedAt !== null) {
      this.pausedOffset += performance.now() - this.pausedAt;
      this.pausedAt = null;
      if (clearInputs) this.player.setDirection(0, 0);
    }
  }

  private syncGraphics() {
    this.playerSprite.setPosition(this.player.x, this.player.y);
    this.switchSprite.setPosition(SWITCH_POS.x, SWITCH_POS.y);
    if (this.switchHold.active) {
      this.switchSprite.setFillStyle(0xfde047);
    } else {
      this.switchSprite.setFillStyle(0xe9b45c);
    }

    const liveEnemyIds = new Set<string>();
    for (const e of this.enemies) {
      liveEnemyIds.add(e.id);
      let g = this.enemyGraphics.get(e.id);
      if (!g) {
        g = this.add.ellipse(0, 0, e.radius * 2, e.radius * 2, e.kind === 'scout' ? 0xffffff : 0xfde047);
        g.setDepth(48);
        this.enemyGraphics.set(e.id, g);
      }
      g.setPosition(e.x, e.y);
      g.setFillStyle(e.phase === 'committed' ? 0xf87171 : e.kind === 'scout' ? 0xffffff : 0xfde047);
    }
    for (const [id, g] of this.enemyGraphics) {
      if (!liveEnemyIds.has(id)) {
        g.destroy();
        this.enemyGraphics.delete(id);
      }
    }

    const liveBulletIds = new Set<string>();
    for (const b of this.bullets) {
      liveBulletIds.add(b.id);
      let g = this.bulletGraphics.get(b.id);
      if (!g) {
        g = this.add.circle(0, 0, BULLET_RADIUS, b.owner === 'player' ? 0x4ade80 : 0xf87171);
        g.setDepth(47);
        this.bulletGraphics.set(b.id, g);
      }
      g.setPosition(b.x, b.y);
    }
    for (const [id, g] of this.bulletGraphics) {
      if (!liveBulletIds.has(id)) {
        g.destroy();
        this.bulletGraphics.delete(id);
      }
    }

    this.telegraphGraphics.clear();
    this.telegraphGraphics.lineStyle(2, 0xf87171, 0.5);
    for (const e of this.enemies) {
      if (e.phase === 'telegraph') {
        this.telegraphGraphics.lineBetween(e.x, e.y, e.x + e.dirX * 96, e.y + e.dirY * 96);
      }
    }

    // Counter window: ring + text.
    this.counterRing.clear();
    if (this.player.counterActive) {
      this.counterRing.lineStyle(3, 0xfde047, 0.9);
      this.counterRing.strokeCircle(this.player.x, this.player.y, 28);
      this.counterRing.setVisible(true);
    } else {
      this.counterRing.setVisible(false);
    }

    // Lina flash when safe.
    if (this.lina.phase === 'safe') {
      this.linaSprite.setFillStyle(0x86efac);
    } else {
      this.linaSprite.setFillStyle(0xd946ef);
    }
  }

  private updateHUD(effNow?: number) {
    const d = difficultyRules[this.difficulty];
    const seg = d.damagePerHit;
    const numSegments = Math.round(MAX_HEALTH / seg);
    const filled = Math.min(numSegments, Math.ceil(Math.max(0, this.state.health) / seg));
    let bars = '';
    for (let i = 0; i < numSegments; i++) bars += i < filled ? '█' : '░';
    const active = this.enemies.filter((e) => e.phase !== 'dead').length;
    const beatLabel = this.beatId().toUpperCase();
    const hold = this.beatId() === 'hold' ? `  Hold ${Math.max(0, this.holdSecondsLeft)}s` : '';
    const gate = this.gateOpen ? `  GATE OPEN` : '';
    this.hudText.setText(
      `${d.label}  ${beatLabel}${hold}${gate}  Health ${bars}  ${this.state.health}/100  ` +
      `Enemies ${active}/${this.currentBeat().maxActive}`,
    );

    if (effNow !== undefined) {
      if (this.player.counterActive && effNow < this.player.counterEndTime) {
        this.counterText.setVisible(true);
      } else {
        this.counterText.setVisible(false);
      }
      if (effNow < this.hitFlashEndTime) {
        this.hitFlash.setAlpha(0.35).setVisible(true);
      } else {
        this.hitFlash.setVisible(false);
      }
      if (effNow < this.hitTextEndTime) {
        this.hitText.setVisible(true);
      } else {
        this.hitText.setVisible(false);
      }
      // Tick the hold seconds display.
      if (this.beatId() === 'hold' && !this.gateOpen) {
        this.holdSecondsLeft = Math.max(0, Math.ceil((this.holdTimerEndTime - effNow) / 1000));
      }
    }
  }

  private inBounds(b: CombatBullet): boolean {
    const cam = this.cameras.main;
    return b.x >= -50 && b.x <= cam.width + 50 && b.y >= -50 && b.y <= cam.height + 50;
  }
}

function circleOverlap(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
}
