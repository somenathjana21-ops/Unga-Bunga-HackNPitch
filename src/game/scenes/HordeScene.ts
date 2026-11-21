import Phaser from 'phaser';
import { MAX_HEALTH, combatTuning } from '../rules';
import { audio } from '../../services/audio';
import { ArenaFx } from '../combat/arena-fx';
import { bulletHitsCover, updateBullet } from '../combat/bullet';
import { Player, PERFECT_DODGE_GRAZE_MARGIN, circleRectOverlap } from '../combat/player';
import { EXPOSED_DAMAGE_MULT, isEnemyExposed, nextAttackId, nextEnemyId, staggerEnemy, hasLineOfSight } from '../combat/enemy';
import type { ArenaBounds, CombatBullet, CombatEnemy, CoverRect } from '../combat/types';
import { SPRITE_DISPLAY, directionFrame4Dir } from '../sprite-metrics';
import {
  calculateClearBonus,
  calculateKillPoints,
  formatHordeClock,
  formatScore,
  hordeDifficultyRules,
  hordeDurationRules,
  hordeTimeRamp,
  pickHordeEnemyKind,
  type HordeDifficulty,
  type HordeDuration,
  type HordeEnemyKind,
} from '../horde/rules';

const PLAYER_RADIUS = 10;
const BULLET_RADIUS = 3.5;
const SAFE_SPAWN_DIST = 170;
const FIRE_COOLDOWN_MS = 225;
const BULLET_TTL_MS = 2400;
const HIT_FLASH_MS = 130;
const HIT_INVULN_MS = 950;
const REFLEX_TIME_SCALE = 0.24;
const COMBO_WINDOW_MS = 4200;

export interface HordeConfig {
  playerName: string;
  difficulty: HordeDifficulty;
  duration: HordeDuration;
}

export interface HordeRunResult {
  playerName: string;
  difficulty: HordeDifficulty;
  duration: HordeDuration;
  score: number;
  combatScore: number;
  clearBonus: number;
  kills: number;
  counterKills: number;
  waveReached: number;
  survivedSeconds: number;
  cleared: boolean;
}

interface HordeEnemy extends CombatEnemy {
  hordeKind: HordeEnemyKind;
  spreadCount: number;
}

export class HordeScene extends Phaser.Scene {
  private config: HordeConfig = { playerName: 'Agent', difficulty: 'easy', duration: '1m' };
  private health = MAX_HEALTH;
  private invulnerableUntil = 0;
  private hitAttackIds = new Set<string>();

  private player = new Player();
  private enemies: HordeEnemy[] = [];
  private bullets: CombatBullet[] = [];
  private cover: CoverRect[] = [];
  private arenaBounds!: ArenaBounds;
  private bulletSeq = 0;
  private spawnSeq = 0;
  private awardedCounterAttackIds = new Set<string>();

  private simNow = 0;
  private elapsedRealMs = 0;
  private paused = false;
  private finished = false;
  private fireCooldown = 0;
  private spawnTimer = 0;
  private hitFlashEndTime = 0;
  private lastGhostTime = 0;

  // Score & combo
  private score = 0;
  private kills = 0;
  private counterKills = 0;
  private combo = 0;
  private comboExpiresAt = 0;
  private currentWave = 1;
  private lastCountdownBeep = -1;

  // Visual objects
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private fx!: ArenaFx;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private enemySprites = new Map<string, Phaser.GameObjects.Sprite>();
  private enemyShadows = new Map<string, Phaser.GameObjects.Ellipse>();
  private bulletGraphics = new Map<string, Phaser.GameObjects.Arc>();
  private telegraphGraphics!: Phaser.GameObjects.Graphics;
  private counterRing!: Phaser.GameObjects.Graphics;
  private reflexTint!: Phaser.GameObjects.Rectangle;
  private hitFlash!: Phaser.GameObjects.Rectangle;
  private hudLeft!: Phaser.GameObjects.Text;
  private hudCenter!: Phaser.GameObjects.Text;
  private hudRight!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;
  private waveBanner!: Phaser.GameObjects.Text;

  private pauseContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('horde');
  }

  init(data: Partial<HordeConfig> = {}): void {
    const regConfig = this.registry.get('hordeConfig') as Partial<HordeConfig> | undefined;
    this.config = {
      playerName: data.playerName ?? regConfig?.playerName ?? 'Agent',
      difficulty: data.difficulty ?? regConfig?.difficulty ?? 'easy',
      duration: data.duration ?? regConfig?.duration ?? '1m',
    };
  }

  preload() {
    if (!this.textures.exists('sprite-k')) {
      this.load.spritesheet('sprite-k', '/assets/characters/k/k-interaction-sprites-48px.png', {
        frameWidth: 48, frameHeight: 48,
      });
    }
    for (const dir of ['down', 'left', 'right', 'up']) {
      const key = `k-walk-${dir}`;
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, `/assets/characters/k/k-walk-${dir}-48px.png`, {
          frameWidth: 48, frameHeight: 48,
        });
      }
    }
    for (const state of ['idle', 'windup', 'recoil', 'disabled']) {
      const key = `scout-${state}`;
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, `/assets/characters/scout/scout-${state}-4dir-48px.png`, {
          frameWidth: 48, frameHeight: 48,
        });
      }
    }
    for (const state of ['idle', 'windup', 'charge', 'recovery']) {
      const key = `rusher-${state}`;
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, `/assets/characters/rusher/rusher-${state}-4dir-48px.png`, {
          frameWidth: 48, frameHeight: 48,
        });
      }
    }
    if (!this.textures.exists('breach-machine')) {
      this.load.spritesheet('breach-machine', '/assets/characters/breach-machine/breach-machine-48px-4x4.png', {
        frameWidth: 48, frameHeight: 48,
      });
    }
    for (let i = 1; i <= 4; i++) {
      const key = `muzzle-flash-${i.toString().padStart(2, '0')}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `/assets/effects/muzzle-flash-${i.toString().padStart(2, '0')}-48px.png`);
      }
    }
    if (!this.textures.exists('bg-horde')) {
      this.load.image('bg-horde', '/assets/backgrounds/twilight-ruins-warehouse-yard.png');
    }
  }

  create() {
    const cam = this.cameras.main;
    const width = cam.width;
    const height = cam.height;
    const rule = hordeDifficultyRules[this.config.difficulty];

    this.resetRunState();
    this.arenaBounds = { minX: 28, maxX: width - 28, minY: 48, maxY: height - 28 };

    // Audio
    audio.setSceneAudio('rescue', 'ruined-city', rule.musicRate);

    document.body.dataset.scene = 'horde';
    document.body.dataset.state = 'playing';
    document.body.dataset.hordeDifficulty = this.config.difficulty;
    document.body.dataset.hordeScore = '0';

    // Input
    this.keys = this.input.keyboard!.addKeys(
      'W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,ESC,P,R',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'ESC', 'P', 'R']);

    const onPointerDown = (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (currentlyOver.length > 0) return;
      audio.unlock();
      this.tryFire();
    };
    this.input.on('pointerdown', onPointerDown);

    // Arena backdrop
    if (this.textures.exists('bg-horde')) {
      this.add.image(width / 2, height / 2, 'bg-horde')
        .setDisplaySize(width, height)
        .setDepth(-2)
        .setAlpha(0.55)
        .setTint(this.config.difficulty === 'doom' ? 0xd98a8a : 0xa5b4c8);
    }
    const grid = this.add.graphics().setDepth(-1);
    grid.fillStyle(0x0c1118, 0.42);
    grid.fillRect(0, 0, width, height);
    grid.lineStyle(1, 0x334155, 0.25);
    for (let x = 0; x <= width; x += 48) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += 48) grid.lineBetween(0, y, width, y);
    grid.lineStyle(2, this.config.difficulty === 'doom' ? 0xef4444 : 0xe3b16b, 0.45);
    grid.strokeRect(12, 40, width - 24, height - 52);

    // Four symmetric tactical cover pillars
    const cx = width * 0.5;
    const cy = height * 0.54;
    this.cover = [
      { x: cx - 185, y: cy - 72, w: 68, h: 48 },
      { x: cx + 117, y: cy - 72, w: 68, h: 48 },
      { x: cx - 185, y: cy + 34, w: 68, h: 48 },
      { x: cx + 117, y: cy + 34, w: 68, h: 48 },
    ];
    const coverGfx = this.add.graphics().setDepth(5);
    const hazardAccent = this.config.difficulty === 'doom' ? 0xef4444 : 0xe3b16b;
    for (const c of this.cover) {
      // Soft ground drop shadow
      coverGfx.fillStyle(0x05070b, 0.58);
      coverGfx.fillRect(c.x + 5, c.y + 7, c.w, c.h);
      // Outer reinforced steel body
      coverGfx.fillStyle(0x1f2836, 0.96);
      coverGfx.fillRect(c.x, c.y, c.w, c.h);
      // Top bevel highlight
      coverGfx.fillStyle(0x364459, 0.92);
      coverGfx.fillRect(c.x + 1, c.y + 1, c.w - 2, 6);
      // Recessed center steel plate
      coverGfx.fillStyle(0x151c27, 0.92);
      coverGfx.fillRect(c.x + 7, c.y + 11, c.w - 14, c.h - 18);
      // Subtle center seam line
      coverGfx.lineStyle(1, 0x334155, 0.65);
      coverGfx.lineBetween(c.x + 9, c.y + c.h / 2 + 2, c.x + c.w - 9, c.y + c.h / 2 + 2);
      // Subtle corner rivets / tactical hazard ticks
      coverGfx.fillStyle(hazardAccent, 0.85);
      coverGfx.fillRect(c.x + 3, c.y + 3, 6, 2);
      coverGfx.fillRect(c.x + c.w - 9, c.y + 3, 6, 2);
      coverGfx.fillRect(c.x + 3, c.y + c.h - 5, 6, 2);
      coverGfx.fillRect(c.x + c.w - 9, c.y + c.h - 5, 6, 2);
      // Crisp outer steel trim
      coverGfx.lineStyle(1.5, 0x52627a, 0.9);
      coverGfx.strokeRect(c.x, c.y, c.w, c.h);
    }

    this.fx = new ArenaFx(this);

    this.reflexTint = this.add.rectangle(0, 0, width, height, 0xfde047, 0.09)
      .setOrigin(0).setDepth(92).setVisible(false);
    this.hitFlash = this.add.rectangle(0, 0, width, height, 0xef4444, 0)
      .setOrigin(0).setDepth(105).setVisible(false);

    // Player spawns in open center lane
    this.player.x = cx;
    this.player.y = cy;
    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 18, 24, 9, 0x05070a, 0.48).setDepth(46);
    this.playerSprite = this.add.sprite(this.player.x, this.player.y, 'sprite-k', 0)
      .setDisplaySize(SPRITE_DISPLAY.combatPlayer, SPRITE_DISPLAY.combatPlayer)
      .setOrigin(0.5, 0.62)
      .setDepth(50);

    for (const dir of ['down', 'left', 'right', 'up']) {
      const animKey = `k-walk-${dir}`;
      if (!this.anims.exists(animKey) && this.textures.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(animKey, { start: 0, end: 3 }),
          frameRate: 10,
          repeat: -1,
        });
      }
    }
    if (!this.anims.exists('k-idle')) {
      this.anims.create({
        key: 'k-idle',
        frames: [{ key: 'sprite-k', frame: 0 }],
        frameRate: 1,
      });
    }

    this.telegraphGraphics = this.add.graphics().setDepth(45);
    this.counterRing = this.add.graphics().setDepth(52);

    // Compact perimeter HUD bar
    this.add.rectangle(0, 0, width, 36, 0x090d14, 0.9).setOrigin(0).setDepth(99);
    this.hudLeft = this.add.text(12, 9, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#e2e8f0',
    }).setDepth(100);
    this.hudCenter = this.add.text(width / 2, 7, '', {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fde68a',
    }).setOrigin(0.5, 0).setDepth(100);
    this.hudRight = this.add.text(width - 12, 9, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#f8fafc',
    }).setOrigin(1, 0).setDepth(100);

    this.counterText = this.add.text(width / 2, 56, '', {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fde047',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    this.waveBanner = this.add.text(width / 2, height * 0.28, '', {
      fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold', color: rule.accentHex,
      stroke: '#090d14', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(102).setAlpha(0);

    // Pause modal inside canvas (clean, centered hitboxes on individual buttons!)
    this.pauseContainer = this.add.container(width / 2, height / 2).setDepth(130).setVisible(false);
    const pBackdrop = this.add.rectangle(0, 0, width, height, 0x05080d, 0.72);
    const pCard = this.add.rectangle(0, 0, 320, 210, 0x111722, 0.98).setStrokeStyle(1.5, 0xe3b16b);
    const pTitle = this.add.text(0, -68, 'PAUSED', {
      fontSize: '22px', fontFamily: 'monospace', fontStyle: 'bold', color: '#f2eee6',
    }).setOrigin(0.5);
    const pSub = this.add.text(0, -40, `${this.config.playerName} · ${rule.label} (${formatScore(rule.difficultyFactor)}×)`, {
      fontSize: '12px', fontFamily: 'Segoe UI, Arial, sans-serif', color: '#b4bcc8',
    }).setOrigin(0.5);

    const makePauseBtn = (y: number, label: string, fill: number, textCol: string, onClick: () => void) => {
      const bg = this.add.rectangle(0, y, 220, 34, fill).setInteractive({ useHandCursor: true });
      const txt = this.add.text(0, y, label, {
        fontSize: '13px', fontFamily: 'Segoe UI, Arial, sans-serif', fontStyle: 'bold', color: textCol,
      }).setOrigin(0.5);
      bg.on('pointerover', () => bg.setAlpha(0.88));
      bg.on('pointerout', () => bg.setAlpha(1));
      bg.on('pointerdown', () => {
        audio.playCue('ui-confirm');
        onClick();
      });
      return [bg, txt];
    };

    const resumePair = makePauseBtn(0, 'Resume Trial', 0xe3b16b, '#12161d', () => this.setPaused(false));
    const restartPair = makePauseBtn(44, 'Restart Trial', 0x263142, '#f2eee6', () => this.restartTrial());
    const menuPair = makePauseBtn(84, 'Return to Menu', 0x1a222f, '#cbd5e1', () => {
      window.dispatchEvent(new CustomEvent('want:return-to-title'));
    });

    this.pauseContainer.add([pBackdrop, pCard, pTitle, pSub, ...resumePair, ...restartPair, ...menuPair]);

    // Opening spawns after brief grace so player can orient
    this.spawnEnemy('scout', this.simNow);
    if (this.config.difficulty !== 'easy') {
      this.spawnEnemy('rusher', this.simNow);
    }
    this.announceWave(`WAVE 1 · ${rule.label.toUpperCase()} (${formatScore(rule.difficultyFactor)}×)`);

    const onBlur = () => {
      this.player.setDirection(0, 0);
    };
    window.addEventListener('blur', onBlur);

    const onRestartReq = () => this.restartTrial();
    window.addEventListener('want:horde-restart', onRestartReq);

    this.events.once('shutdown', () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('want:horde-restart', onRestartReq);
      this.input.off('pointerdown', onPointerDown);
      this.input.keyboard?.removeAllKeys(true);
    });

    this.updateHUD();
  }

  private resetRunState(): void {
    this.health = MAX_HEALTH;
    this.invulnerableUntil = 0;
    this.hitAttackIds.clear();
    this.player = new Player();
    this.enemies = [];
    this.bullets = [];
    this.enemySprites.forEach((s) => s.destroy());
    this.enemySprites.clear();
    this.enemyShadows.forEach((s) => s.destroy());
    this.enemyShadows.clear();
    this.bulletGraphics.forEach((g) => g.destroy());
    this.bulletGraphics.clear();
    this.awardedCounterAttackIds.clear();
    this.simNow = 0;
    this.elapsedRealMs = 0;
    this.paused = false;
    this.finished = false;
    this.fireCooldown = 0;
    this.spawnTimer = 0;
    this.hitFlashEndTime = 0;
    this.lastGhostTime = 0;
    this.score = 0;
    this.kills = 0;
    this.counterKills = 0;
    this.combo = 0;
    this.comboExpiresAt = 0;
    this.currentWave = 1;
    this.lastCountdownBeep = -1;
    this.spawnSeq = 0;
  }

  private restartTrial(): void {
    const cam = this.cameras.main;
    const rule = hordeDifficultyRules[this.config.difficulty];
    this.resetRunState();
    this.player.x = cam.width * 0.5;
    this.player.y = cam.height * 0.54;
    this.pauseContainer.setVisible(false);
    this.counterText.setVisible(false);
    this.reflexTint.setVisible(false);
    this.hitFlash.setVisible(false);
    document.body.dataset.state = 'playing';
    document.body.dataset.hordeScore = '0';
    audio.setSceneAudio('rescue', 'ruined-city', rule.musicRate);
    this.spawnEnemy('scout', this.simNow);
    if (this.config.difficulty !== 'easy') this.spawnEnemy('rusher', this.simNow);
    this.announceWave(`WAVE 1 · ${rule.label.toUpperCase()} (${formatScore(rule.difficultyFactor)}×)`);
    this.updateHUD();
    this.syncGraphics();
  }

  private setPaused(p: boolean): void {
    if (this.finished) return;
    this.paused = p;
    this.pauseContainer.setVisible(p);
    document.body.dataset.state = p ? 'paused' : 'playing';
    if (!p) this.player.setDirection(0, 0);
  }

  private announceWave(text: string): void {
    this.tweens.killTweensOf(this.waveBanner);
    this.waveBanner.setText(text).setAlpha(1).setScale(0.94);
    this.tweens.add({
      targets: this.waveBanner,
      scale: 1.02,
      alpha: 0,
      delay: 1100,
      duration: 650,
      ease: 'Cubic.easeOut',
    });
  }

  update(_time: number, rawDt: number) {
    if (this.finished) return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC) || Phaser.Input.Keyboard.JustDown(this.keys.P)) {
      this.setPaused(!this.paused);
      return;
    }
    if (this.paused) return;

    const clampedDt = Math.min(rawDt, 50);
    const inReflex = this.player.canCounter(this.simNow);
    const simDt = inReflex ? clampedDt * REFLEX_TIME_SCALE : clampedDt;
    this.simNow += simDt;
    this.elapsedRealMs += clampedDt;
    const dtSec = simDt / 1000;
    const realDtSec = clampedDt / 1000;

    // Timed survival check
    const durationSec = hordeDurationRules[this.config.duration].seconds;
    const elapsedSec = this.elapsedRealMs / 1000;
    if (durationSec !== null) {
      const remaining = durationSec - elapsedSec;
      if (remaining <= 10 && remaining > 0) {
        const whole = Math.ceil(remaining);
        if (whole !== this.lastCountdownBeep) {
          this.lastCountdownBeep = whole;
          audio.playCue('ui-confirm');
        }
      }
      if (remaining <= 0) {
        this.finishRun(true);
        return;
      }
    }

    // Combo expiry
    if (this.combo > 0 && this.simNow >= this.comboExpiresAt) {
      this.combo = 0;
    }

    // Wave ramp
    const rule = hordeDifficultyRules[this.config.difficulty];
    const ramp = hordeTimeRamp(elapsedSec);
    if (ramp.waveNumber > this.currentWave) {
      this.currentWave = ramp.waveNumber;
      audio.playCue('resolve');
      this.announceWave(`WAVE ${this.currentWave}`);
    }

    // Movement
    let dx = 0;
    let dy = 0;
    if (this.keys.W.isDown || this.keys.UP.isDown) dy = -1;
    else if (this.keys.S.isDown || this.keys.DOWN.isDown) dy = 1;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) dx = -1;
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx = 1;
    this.player.setDirection(dx, dy);

    const p = this.input.activePointer;
    this.player.setAim(p.worldX - this.player.x, p.worldY - this.player.y);

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && this.player.canDodge(this.simNow)) {
      audio.unlock();
      this.player.startDodge(this.simNow);
      audio.playCue('dodge');
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      audio.unlock();
      const res = this.player.triggerReload(this.simNow);
      if (res === 'snap') {
        audio.playCue('counter-ready');
        this.fx.callout(this.player.x, this.player.y - 30, 'SNAP RELOAD!', '#fde047', true);
        this.fx.sparks(this.player.x, this.player.y, 0xfde047, 8, 26);
      } else if (res === 'started') {
        audio.playCue('metal-drop');
      }
    }

    this.player.tickDodge(this.simNow);
    this.player.tickReload(this.simNow);
    this.player.updateMovement(dtSec, this.cover);
    this.clampPlayer();

    if (this.player.dodging && this.simNow - this.lastGhostTime >= 42) {
      this.lastGhostTime = this.simNow;
      this.fx.dodgeGhost(
        this.player.x,
        this.player.y,
        this.playerSprite.texture.key,
        this.playerSprite.frame.name,
        SPRITE_DISPLAY.combatPlayer,
        inReflex,
      );
    }

    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - clampedDt);

    // Update enemies with difficulty-scaled speed, telegraph, burst, and 3rd archetype (Breach Striker)
    for (const e of this.enemies) {
      if (e.phase === 'dead') continue;
      this.updateHordeEnemy(e, dtSec);
    }

    // Update bullets
    for (const b of this.bullets) {
      updateBullet(b, dtSec);
      if (!b.hit && bulletHitsCover(b, BULLET_RADIUS, this.cover)) {
        b.hit = true;
        this.fx.sparks(b.x, b.y, b.owner === 'player' ? 0x94a3b8 : 0xf87171, 4, 16);
      }
    }

    this.resolveCollisions();
    if (this.finished) return;

    // Spawner (respects active cap & safe distance)
    this.spawnTimer += simDt;
    const effectiveInterval = rule.spawnIntervalMs * ramp.spawnIntervalScale;
    const effectiveCap = rule.maxActiveEnemies + ramp.activeCapBonus;
    const liveCount = this.enemies.filter((e) => e.phase !== 'dead').length;
    if (this.spawnTimer >= effectiveInterval && liveCount < effectiveCap) {
      const kind = pickHordeEnemyKind(this.currentWave, this.spawnSeq, this.config.difficulty);
      if (this.spawnEnemy(kind, this.simNow)) {
        this.spawnSeq++;
        this.spawnTimer = 0;
      }
    }

    this.enemies = this.enemies.filter((e) => e.phase !== 'dead');
    this.bullets = this.bullets.filter((b) => !b.hit && this.simNow - b.born < b.ttl && this.inBounds(b));

    this.syncGraphics();
    this.fx.renderFrame(this.player, this.enemies, this.bullets, p.worldX, p.worldY, this.simNow, realDtSec);
    this.reflexTint.setVisible(this.player.canCounter(this.simNow));
    this.updateHUD();
  }

  private updateHordeEnemy(e: HordeEnemy, dt: number): void {
    const rule = hordeDifficultyRules[this.config.difficulty];
    const now = this.simNow;

    if (e.phase === 'staggered') {
      if (now >= e.staggeredUntil) {
        e.phase = 'idle';
        e.slammedCover = false;
        e.nextDecisionTime = now + Math.max(260, 620 / rule.enemySpeedMultiplier);
      }
      return;
    }

    if (e.phase === 'recovering') {
      if (now >= e.recoverEndTime) {
        e.phase = 'idle';
        e.slammedCover = false;
        e.strafeDir = e.strafeDir === 1 ? -1 : 1;
        e.nextDecisionTime = now + Math.max(300, 760 / rule.enemySpeedMultiplier);
      }
      return;
    }

    const dx = this.player.x - e.x;
    const dy = this.player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;

    if (e.phase === 'idle') {
      e.dirX = ux;
      e.dirY = uy;
      const clearSight = hasLineOfSight(e.x, e.y, this.player.x, this.player.y, this.cover);

      if (e.hordeKind === 'scout') {
        let mx = -uy * e.strafeDir * 0.72;
        let my = ux * e.strafeDir * 0.72;
        if (dist < 170) { mx -= ux * 0.65; my -= uy * 0.65; }
        else if (dist > 280 || !clearSight) { mx += ux * 0.55; my += uy * 0.55; }
        const mlen = Math.hypot(mx, my) || 1;
        this.moveEnemyWithCover(e, (mx / mlen) * 80 * rule.enemySpeedMultiplier * dt, (my / mlen) * 80 * rule.enemySpeedMultiplier * dt);
        if (now >= e.nextDecisionTime && (clearSight || now >= e.nextDecisionTime + 600)) {
          e.phase = 'telegraph';
          e.telegraphT = 0;
          e.dirLocked = false;
          audio.playCue('scout-windup');
        }
      } else if (e.hordeKind === 'rusher') {
        let mx = ux;
        let my = uy;
        if (!clearSight) {
          mx = ux * 0.55 - uy * e.strafeDir * 0.85;
          my = uy * 0.55 + ux * e.strafeDir * 0.85;
        }
        const mlen = Math.hypot(mx, my) || 1;
        this.moveEnemyWithCover(e, (mx / mlen) * 108 * rule.enemySpeedMultiplier * dt, (my / mlen) * 108 * rule.enemySpeedMultiplier * dt);
        if (now >= e.nextDecisionTime && (dist <= 260 || now >= e.nextDecisionTime + 450)) {
          e.phase = 'telegraph';
          e.telegraphT = 0;
          e.dirLocked = false;
          audio.playCue('rusher-windup');
        }
      } else {
        // Breach Striker: slow armored artillery walker that holds wide perimeter and fires fan spreads
        let mx = -uy * e.strafeDir * 0.48 + (dist > 260 ? ux * 0.52 : -ux * 0.35);
        let my = ux * e.strafeDir * 0.48 + (dist > 260 ? uy * 0.52 : -uy * 0.35);
        const mlen = Math.hypot(mx, my) || 1;
        this.moveEnemyWithCover(e, (mx / mlen) * 58 * rule.enemySpeedMultiplier * dt, (my / mlen) * 58 * rule.enemySpeedMultiplier * dt);
        if (now >= e.nextDecisionTime) {
          e.phase = 'telegraph';
          e.telegraphT = 0;
          e.dirLocked = false;
          audio.playCue('machine-shriek');
        }
      }
      return;
    }

    if (e.phase === 'telegraph') {
      e.telegraphT += dt / (rule.telegraphMs / 1000);
      if (!e.dirLocked) {
        e.dirX = ux;
        e.dirY = uy;
        if (e.telegraphT >= 0.72) e.dirLocked = true;
      }
      if (e.telegraphT >= 1) {
        e.phase = 'committed';
        e.attackId = nextAttackId();
        if (e.hordeKind === 'scout') {
          this.spawnEnemyBullet(e, e.dirX, e.dirY, rule.bulletSpeed, e.attackId);
          e.burstRemaining = Math.max(0, rule.scoutBurstCount - 1);
          e.nextBurstTime = now + Math.max(95, 160 / rule.enemySpeedMultiplier);
          e.committedEndTime = now + Math.max(320, 520 / rule.enemySpeedMultiplier);
        } else if (e.hordeKind === 'striker') {
          const baseAngle = Math.atan2(e.dirY, e.dirX);
          const count = e.spreadCount;
          const arc = 0.52;
          for (let i = 0; i < count; i++) {
            const frac = count === 1 ? 0 : (i / (count - 1)) - 0.5;
            const a = baseAngle + frac * arc;
            this.spawnEnemyBullet(e, Math.cos(a), Math.sin(a), rule.bulletSpeed * 0.88, e.attackId);
          }
          e.committedEndTime = now + 480;
        } else {
          const chargeSpeed = 375 * Math.min(1.55, rule.enemySpeedMultiplier);
          e.committedVx = e.dirX * chargeSpeed;
          e.committedVy = e.dirY * chargeSpeed;
          e.committedEndTime = now + 480;
        }
      }
      return;
    }

    if (e.phase === 'committed') {
      if (e.hordeKind === 'scout') {
        if (e.burstRemaining > 0 && now >= e.nextBurstTime) {
          e.burstRemaining--;
          e.nextBurstTime = now + Math.max(95, 160 / rule.enemySpeedMultiplier);
          this.spawnEnemyBullet(e, e.dirX, e.dirY, rule.bulletSpeed, e.attackId);
        }
      } else if (e.hordeKind === 'rusher') {
        const nx = e.x + e.committedVx * dt;
        const ny = e.y + e.committedVy * dt;
        if (circleRectOverlap(nx, ny, e.radius, this.cover)) {
          e.slammedCover = true;
          staggerEnemy(e, now, 1450);
          audio.playCue('lane-crash');
          this.fx.shake(110, 0.007);
          this.fx.sparks(e.x, e.y, 0xfde047, 10, 32);
          this.fx.callout(e.x, e.y - 32, 'STAGGERED! 1.5×', '#fde047', true);
          return;
        }
        e.x = Math.min(Math.max(nx, this.arenaBounds.minX), this.arenaBounds.maxX);
        e.y = Math.min(Math.max(ny, this.arenaBounds.minY), this.arenaBounds.maxY);
      }

      if (now >= e.committedEndTime) {
        e.phase = 'recovering';
        e.recoverEndTime = now + Math.max(300, 740 / rule.enemySpeedMultiplier);
        e.attackId = null;
        e.committedVx = 0;
        e.committedVy = 0;
        e.burstRemaining = 0;
      }
    }
  }

  private moveEnemyWithCover(e: HordeEnemy, sx: number, sy: number): void {
    const nx = e.x + sx;
    const ny = e.y + sy;
    if (!circleRectOverlap(nx, e.y, e.radius, this.cover)) e.x = nx;
    if (!circleRectOverlap(e.x, ny, e.radius, this.cover)) e.y = ny;
    e.x = Math.min(Math.max(e.x, this.arenaBounds.minX), this.arenaBounds.maxX);
    e.y = Math.min(Math.max(e.y, this.arenaBounds.minY), this.arenaBounds.maxY);
  }

  private spawnEnemyBullet(e: HordeEnemy, vx: number, vy: number, speed: number, attackId: string | null): void {
    audio.playCue('gunshot');
    this.bullets.push({
      id: `hb-${++this.bulletSeq}`,
      x: e.x + vx * 16,
      y: e.y + vy * 16,
      prevX: e.x + vx * 16,
      prevY: e.y + vy * 16,
      vx,
      vy,
      speed,
      damage: e.attackDamage,
      owner: 'enemy',
      attackId,
      born: this.simNow,
      ttl: BULLET_TTL_MS,
    });
  }

  private spawnEnemy(kind: HordeEnemyKind, now: number): boolean {
    const rule = hordeDifficultyRules[this.config.difficulty];
    const { minX, maxX, minY, maxY } = this.arenaBounds;
    let x = 0;
    let y = 0;
    let placed = false;
    for (let i = 0; i < 40; i++) {
      const side = Math.floor(Math.random() * 4);
      if (side === 0) { x = minX + Math.random() * (maxX - minX); y = minY + 6; }
      else if (side === 1) { x = minX + Math.random() * (maxX - minX); y = maxY - 6; }
      else if (side === 2) { x = minX + 6; y = minY + Math.random() * (maxY - minY); }
      else { x = maxX - 6; y = minY + Math.random() * (maxY - minY); }
      if (Math.hypot(x - this.player.x, y - this.player.y) < SAFE_SPAWN_DIST) continue;
      if (this.cover.some((c) => x > c.x - 18 && x < c.x + c.w + 18 && y > c.y - 18 && y < c.y + c.h + 18)) continue;
      placed = true;
      break;
    }
    if (!placed) return false;

    const hpScale = kind === 'striker' ? 1.55 : kind === 'rusher' ? 1.1 : 1;
    const maxHealth = Math.max(10, Math.round(rule.enemyHealth * hpScale));
    this.enemies.push({
      id: nextEnemyId(),
      kind: kind === 'rusher' ? 'rusher' : 'scout',
      hordeKind: kind,
      spreadCount: rule.strikerSpreadCount,
      x,
      y,
      radius: kind === 'striker' ? 16 : 14,
      health: maxHealth,
      maxHealth,
      phase: 'idle',
      attackId: null,
      attackDamage: rule.damagePerHit,
      telegraphT: 0,
      dirX: 1,
      dirY: 0,
      dirLocked: false,
      committedVx: 0,
      committedVy: 0,
      committedEndTime: 0,
      recoverEndTime: 0,
      staggeredUntil: 0,
      nextDecisionTime: now + Math.max(260, 720 / rule.enemySpeedMultiplier),
      strafeDir: this.spawnSeq % 2 === 0 ? 1 : -1,
      hitFlashUntil: 0,
      burstRemaining: 0,
      nextBurstTime: 0,
      slammedCover: false,
    });
    return true;
  }

  private tryFire(): void {
    if (this.paused || this.finished) return;
    if (this.fireCooldown > 0 && !this.player.canCounter(this.simNow)) return;
    if (!this.player.canFire(this.simNow)) {
      if (this.player.reloading) {
        const res = this.player.triggerReload(this.simNow);
        if (res === 'snap') {
          audio.playCue('counter-ready');
          this.fx.callout(this.player.x, this.player.y - 30, 'SNAP RELOAD!', '#fde047', true);
          this.fx.sparks(this.player.x, this.player.y, 0xfde047, 8, 26);
        }
      }
      return;
    }

    const rule = hordeDifficultyRules[this.config.difficulty];
    this.fireCooldown = FIRE_COOLDOWN_MS;
    const shot = this.player.fireBullet(this.player.x, this.player.y, this.simNow);
    // Scale Horde pistol damage with tier so DOOM remains skill-winnable
    const scaledDamage = Math.round(shot.damage * (rule.playerPistolDamage / combatTuning.pistolDamage));
    this.bullets.push({
      id: `hb-${++this.bulletSeq}`,
      x: shot.x,
      y: shot.y,
      prevX: shot.x,
      prevY: shot.y,
      vx: shot.vx,
      vy: shot.vy,
      speed: shot.speed,
      damage: scaledDamage,
      owner: 'player',
      attackId: null,
      born: this.simNow,
      ttl: BULLET_TTL_MS,
      isCounter: shot.isCounter,
      isOvercharged: shot.isOvercharged,
      piercing: shot.piercing,
      hitEnemyIds: [],
    });
    this.fx.muzzleFlash(this.player.x, this.player.y, shot.vx, shot.vy, shot.isCounter);
    if (shot.isCounter) {
      audio.playCue('counter-impact');
      this.fx.shake(130, 0.009);
      this.fx.callout(this.player.x, this.player.y - 32, 'COUNTER RAIL!', '#fde047', true);
    } else {
      audio.playCue('gunshot');
      this.fx.shake(45, 0.0022);
    }
  }

  private resolveCollisions(): void {
    const effNow = this.simNow;

    // Player bullets vs enemies
    for (const b of this.bullets) {
      if (b.owner !== 'player' || b.hit) continue;
      for (const e of this.enemies) {
        if (e.phase === 'dead') continue;
        if (b.hitEnemyIds?.includes(e.id)) continue;
        if (circleOverlap(b.x, b.y, BULLET_RADIUS + (b.isCounter ? 5 : 0), e.x, e.y, e.radius + 4)) {
          const exposed = isEnemyExposed(e);
          const dmg = exposed ? Math.round(b.damage * EXPOSED_DAMAGE_MULT) : b.damage;
          e.health -= dmg;
          e.hitFlashUntil = effNow + 100;
          b.hitEnemyIds?.push(e.id);
          if (!b.piercing) b.hit = true;
          if (b.isCounter && e.health > 0) staggerEnemy(e, effNow, 1200);

          this.fx.sparks(e.x, e.y, b.isCounter ? 0xfde047 : exposed ? 0xf59e0b : 0xf87171, b.isCounter ? 10 : 5);
          if (e.health <= 0) {
            e.phase = 'dead';
            e.attackId = null;
            this.kills++;
            if (b.isCounter) this.counterKills++;
            this.combo = Math.min(20, this.combo + 1);
            this.comboExpiresAt = effNow + COMBO_WINDOW_MS;
            const pts = calculateKillPoints({
              kind: e.hordeKind,
              difficulty: this.config.difficulty,
              combo: this.combo,
              isCounter: Boolean(b.isCounter),
              wasExposed: exposed,
            });
            this.score += pts;
            document.body.dataset.hordeScore = String(this.score);
            audio.playCue('machine-disabled');
            this.fx.sparks(e.x, e.y, 0xfde047, 12, 36);
            this.fx.shake(75, 0.0045);
            this.fx.callout(e.x, e.y - 26, `+${formatScore(pts)}`, b.isCounter ? '#fde047' : '#86efac', Boolean(b.isCounter));
          } else {
            audio.playCue('machine-hit');
            this.fx.callout(
              e.x,
              e.y - 22,
              b.isCounter ? `COUNTER ${dmg}!` : `${dmg}`,
              b.isCounter ? '#fde047' : '#f8fafc',
              Boolean(b.isCounter),
            );
          }
          if (!b.piercing) break;
        }
      }
    }

    const dodgeImmune = this.player.isDodgeInvulnerable(effNow);

    // Enemy bullets vs player
    for (const b of this.bullets) {
      if (b.owner !== 'enemy' || b.hit) continue;
      if (dodgeImmune) {
        if (
          b.attackId
          && !this.awardedCounterAttackIds.has(b.attackId)
          && circleOverlap(b.x, b.y, BULLET_RADIUS, this.player.x, this.player.y, PLAYER_RADIUS + PERFECT_DODGE_GRAZE_MARGIN)
        ) {
          this.grantCounter(b.attackId, effNow);
        }
        continue;
      }
      if (!circleOverlap(b.x, b.y, BULLET_RADIUS, this.player.x, this.player.y, PLAYER_RADIUS)) continue;
      b.hit = true;
      this.acceptPlayerHit(b.attackId, effNow);
      if (this.finished) return;
    }

    // Committed Rusher contact vs player
    for (const e of this.enemies) {
      if (e.phase !== 'committed' || !e.attackId || e.hordeKind !== 'rusher') continue;
      if (dodgeImmune) {
        if (
          !this.awardedCounterAttackIds.has(e.attackId)
          && circleOverlap(e.x, e.y, e.radius, this.player.x, this.player.y, PLAYER_RADIUS + PERFECT_DODGE_GRAZE_MARGIN)
        ) {
          this.grantCounter(e.attackId, effNow);
        }
        continue;
      }
      if (!circleOverlap(this.player.x, this.player.y, PLAYER_RADIUS, e.x, e.y, e.radius)) continue;
      this.acceptPlayerHit(e.attackId, effNow);
      if (this.finished) return;
    }

    if (this.player.counterActive && effNow >= this.player.counterEndTime) {
      this.player.clearCounter();
    }
  }

  private acceptPlayerHit(attackId: string | null, effNow: number): void {
    if (effNow < this.invulnerableUntil) return;
    if (attackId !== null && this.hitAttackIds.has(attackId)) return;

    const rule = hordeDifficultyRules[this.config.difficulty];
    this.health = Math.max(0, this.health - rule.damagePerHit);
    this.invulnerableUntil = effNow + HIT_INVULN_MS;
    this.hitAttackIds.clear();
    if (attackId !== null) this.hitAttackIds.add(attackId);

    this.combo = 0;
    this.player.clearCounter();
    this.hitFlashEndTime = effNow + HIT_FLASH_MS;
    audio.playCue('k-hit');
    this.fx.shake(170, 0.012);
    this.fx.sparks(this.player.x, this.player.y, 0xef4444, 12, 34);
    this.fx.callout(this.player.x, this.player.y - 30, `-${rule.damagePerHit} HP`, '#f87171', true);

    if (this.health <= 0) {
      this.finishRun(false);
    }
  }

  private grantCounter(attackId: string, effNow: number): void {
    if (this.player.counterActive) return;
    this.awardedCounterAttackIds.add(attackId);
    this.player.openCounter(effNow, attackId);
    audio.playCue('counter-ready');
    this.fx.reflexFlash(this.player.x, this.player.y);
    this.counterText.setText('REFLEX COUNTER — CLICK TO FIRE RAIL').setVisible(true);
  }

  private finishRun(cleared: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.paused = true;
    this.counterText.setVisible(false);
    this.reflexTint.setVisible(false);
    this.pauseContainer.setVisible(false);
    document.body.dataset.state = 'gameover';

    const clearBonus = cleared
      ? calculateClearBonus({
          duration: this.config.duration,
          difficulty: this.config.difficulty,
          remainingHealth: this.health,
        })
      : 0;
    const combatScore = this.score;
    const totalScore = combatScore + clearBonus;
    this.score = totalScore;
    document.body.dataset.hordeScore = String(totalScore);

    audio.playCue(cleared ? 'resolve' : 'failure');
    if (cleared) audio.setMusic('ending');

    const result: HordeRunResult = {
      playerName: this.config.playerName,
      difficulty: this.config.difficulty,
      duration: this.config.duration,
      score: totalScore,
      combatScore,
      clearBonus,
      kills: this.kills,
      counterKills: this.counterKills,
      waveReached: this.currentWave,
      survivedSeconds: Math.round(this.elapsedRealMs / 1000),
      cleared,
    };

    window.dispatchEvent(new CustomEvent<HordeRunResult>('want:horde-finished', { detail: result }));
  }

  private clampPlayer(): void {
    this.player.x = Math.min(Math.max(this.player.x, this.arenaBounds.minX), this.arenaBounds.maxX);
    this.player.y = Math.min(Math.max(this.player.y, this.arenaBounds.minY), this.arenaBounds.maxY);
  }

  private syncGraphics(): void {
    this.playerSprite.setPosition(this.player.x, this.player.y);
    this.playerShadow.setPosition(this.player.x, this.player.y + 18);
    if (this.player.dodging) {
      this.playerSprite.setTint(this.player.canCounter(this.simNow) ? 0xfde047 : 0x7dd3fc);
    } else if (this.simNow < this.invulnerableUntil && Math.floor(this.simNow / 70) % 2 === 0) {
      this.playerSprite.setTint(0xfca5a5);
    } else {
      this.playerSprite.clearTint();
    }

    const movingUp = this.keys.W.isDown || this.keys.UP.isDown;
    const movingDown = this.keys.S.isDown || this.keys.DOWN.isDown;
    const movingLeft = this.keys.A.isDown || this.keys.LEFT.isDown;
    const movingRight = this.keys.D.isDown || this.keys.RIGHT.isDown;
    let targetAnim = 'k-idle';
    if (movingLeft) targetAnim = 'k-walk-left';
    else if (movingRight) targetAnim = 'k-walk-right';
    else if (movingUp) targetAnim = 'k-walk-up';
    else if (movingDown) targetAnim = 'k-walk-down';
    if (this.anims.exists(targetAnim) && this.playerSprite.anims.currentAnim?.key !== targetAnim) {
      this.playerSprite.play(targetAnim);
    }

    const liveEnemyIds = new Set<string>();
    for (const e of this.enemies) {
      liveEnemyIds.add(e.id);
      let sprite = this.enemySprites.get(e.id);
      let shadow = this.enemyShadows.get(e.id);
      const displaySize = e.hordeKind === 'striker'
        ? 58
        : e.hordeKind === 'rusher'
          ? SPRITE_DISPLAY.combatRusher
          : SPRITE_DISPLAY.combatScout;

      if (!sprite) {
        const initTex = e.hordeKind === 'striker'
          ? 'breach-machine'
          : e.hordeKind === 'rusher'
            ? 'rusher-idle'
            : 'scout-idle';
        sprite = this.add.sprite(e.x, e.y, initTex, 0)
          .setDisplaySize(displaySize, displaySize).setDepth(48);
        this.enemySprites.set(e.id, sprite);
      }
      if (!shadow) {
        shadow = this.add.ellipse(e.x, e.y + 18, displaySize * 0.56, 10, 0x05070a, 0.45).setDepth(44);
        this.enemyShadows.set(e.id, shadow);
      }
      sprite.setPosition(e.x, e.y);
      shadow.setPosition(e.x, e.y + 18);
      const dirFrame = directionFrame4Dir(e.dirX, e.dirY);

      if (e.hordeKind === 'striker') {
        const rowOffset = e.phase === 'committed' ? 8 : e.phase === 'telegraph' ? 4 : 0;
        sprite.setTexture('breach-machine', rowOffset + dirFrame);
        if (e.phase === 'staggered') sprite.setTint(0xfde047);
        else if (e.phase === 'committed') sprite.setTint(0xf87171);
        else if (e.phase === 'telegraph') sprite.setTint(0xfbbf24);
        else sprite.setTint(0xd8b4fe);
      } else if (e.phase === 'staggered') {
        sprite.setTexture(e.hordeKind === 'scout' ? 'scout-disabled' : 'rusher-recovery', dirFrame);
        sprite.setTint(0xfde047);
      } else if (e.phase === 'committed') {
        sprite.setTexture(e.hordeKind === 'scout' ? 'scout-recoil' : 'rusher-charge', dirFrame);
        sprite.setTint(0xf87171);
      } else if (e.phase === 'telegraph') {
        sprite.setTexture(e.hordeKind === 'scout' ? 'scout-windup' : 'rusher-windup', dirFrame);
        sprite.clearTint();
      } else {
        sprite.setTexture(e.hordeKind === 'scout' ? 'scout-idle' : 'rusher-idle', dirFrame);
        sprite.clearTint();
      }

      if (this.simNow < e.hitFlashUntil) {
        sprite.setTintFill(0xffffff);
      }
      sprite.setDisplaySize(displaySize, displaySize);
    }

    for (const [id, sprite] of this.enemySprites) {
      if (!liveEnemyIds.has(id)) { sprite.destroy(); this.enemySprites.delete(id); }
    }
    for (const [id, shadow] of this.enemyShadows) {
      if (!liveEnemyIds.has(id)) { shadow.destroy(); this.enemyShadows.delete(id); }
    }

    const liveBulletIds = new Set<string>();
    for (const b of this.bullets) {
      liveBulletIds.add(b.id);
      let g = this.bulletGraphics.get(b.id);
      if (!g) {
        const col = b.isCounter ? 0xfde047 : b.isOvercharged ? 0xf59e0b : b.owner === 'player' ? 0x4ade80 : 0xf87171;
        g = this.add.circle(0, 0, b.isCounter ? 5 : BULLET_RADIUS, col).setDepth(47);
        this.bulletGraphics.set(b.id, g);
      }
      g.setPosition(b.x, b.y);
    }
    for (const [id, g] of this.bulletGraphics) {
      if (!liveBulletIds.has(id)) { g.destroy(); this.bulletGraphics.delete(id); }
    }

    // Telegraphs for all 3 enemy types
    this.telegraphGraphics.clear();
    for (const e of this.enemies) {
      if (e.phase !== 'telegraph') continue;
      if (e.hordeKind === 'scout') {
        const alpha = e.dirLocked ? 0.92 : 0.42 + e.telegraphT * 0.35;
        this.telegraphGraphics.lineStyle(e.dirLocked ? 2.5 : 1.5, e.dirLocked ? 0xff3b3b : 0xfbbf24, alpha);
        this.telegraphGraphics.lineBetween(e.x, e.y, e.x + e.dirX * 300, e.y + e.dirY * 300);
      } else if (e.hordeKind === 'striker') {
        const base = Math.atan2(e.dirY, e.dirX);
        const arc = 0.52;
        this.telegraphGraphics.lineStyle(e.dirLocked ? 2 : 1.2, e.dirLocked ? 0xc084fc : 0xfbbf24, e.dirLocked ? 0.85 : 0.45);
        for (const offset of [-arc / 2, 0, arc / 2]) {
          this.telegraphGraphics.lineBetween(
            e.x,
            e.y,
            e.x + Math.cos(base + offset) * 230,
            e.y + Math.sin(base + offset) * 230,
          );
        }
      } else {
        const laneLen = 195;
        const perpX = -e.dirY * 14;
        const perpY = e.dirX * 14;
        const endX = e.x + e.dirX * laneLen;
        const endY = e.y + e.dirY * laneLen;
        this.telegraphGraphics.fillStyle(0xef4444, e.dirLocked ? 0.24 : 0.12);
        this.telegraphGraphics.beginPath();
        this.telegraphGraphics.moveTo(e.x + perpX, e.y + perpY);
        this.telegraphGraphics.lineTo(endX + perpX, endY + perpY);
        this.telegraphGraphics.lineTo(endX - perpX, endY - perpY);
        this.telegraphGraphics.lineTo(e.x - perpX, e.y - perpY);
        this.telegraphGraphics.closePath();
        this.telegraphGraphics.fillPath();
        this.telegraphGraphics.lineStyle(2, e.dirLocked ? 0xff4d4d : 0xf97316, e.dirLocked ? 0.9 : 0.55);
        this.telegraphGraphics.lineBetween(e.x, e.y, endX, endY);
      }
    }

    this.counterRing.clear();
    if (this.player.counterActive) {
      const rem = Math.max(0, (this.player.counterEndTime - this.simNow) / combatTuning.counterWindowMs);
      this.counterRing.lineStyle(3, 0xfde047, 0.95);
      this.counterRing.beginPath();
      this.counterRing.arc(this.player.x, this.player.y, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * rem, false);
      this.counterRing.strokePath();
      this.counterRing.setVisible(true);
    } else {
      this.counterRing.setVisible(false);
    }
  }

  private updateHUD(): void {
    const rule = hordeDifficultyRules[this.config.difficulty];
    const durationSec = hordeDurationRules[this.config.duration].seconds;
    const elapsedSec = this.elapsedRealMs / 1000;

    const hitsMax = Math.max(1, Math.ceil(MAX_HEALTH / rule.damagePerHit));
    const hitsLeft = Math.min(hitsMax, Math.ceil(Math.max(0, this.health) / rule.damagePerHit));
    let hpPips = '';
    for (let i = 0; i < hitsMax; i++) hpPips += i < hitsLeft ? '█' : '░';
    const ammoStr = this.player.reloading ? 'RELOAD [R]' : `AMMO ${this.player.ammo}/6`;
    this.hudLeft.setText(`${this.config.playerName}  HP ${hpPips}  ·  ${ammoStr}`);

    if (durationSec !== null) {
      const rem = Math.max(0, durationSec - elapsedSec);
      this.hudCenter.setText(formatHordeClock(rem));
      this.hudCenter.setColor(rem <= 10 ? '#f87171' : '#fde68a');
    } else {
      this.hudCenter.setText(`∞ ${formatHordeClock(elapsedSec)}`);
      this.hudCenter.setColor('#7dd3fc');
    }

    const comboTag = this.combo > 1 ? ` · ${this.combo}×` : '';
    this.hudRight.setText(
      `${rule.label.toUpperCase()} (${formatScore(rule.difficultyFactor)}×)  ·  W${this.currentWave}  ·  ${formatScore(this.score)}${comboTag}`,
    );

    this.counterText.setVisible(this.player.canCounter(this.simNow));
    this.hitFlash.setAlpha(0.32).setVisible(this.simNow < this.hitFlashEndTime);
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
