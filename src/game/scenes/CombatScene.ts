import Phaser from 'phaser';
import { newRun } from '../state';
import type { RunState } from '../state';
import type { Difficulty } from '../rules';
import { difficultyRules, combatTuning, MAX_HEALTH } from '../rules';
import { saveRun } from '../../services/local-save';
import type { CombatEnemy, CombatBullet, CoverRect, EnemyKind } from '../combat/types';
import { DamageSystem } from '../combat/damage';
import { Player } from '../combat/player';
import { makeEnemy, updateEnemy } from '../combat/enemy';
import { updateBullet } from '../combat/bullet';
import { SPRITE_DISPLAY, directionFrame4Dir } from '../sprite-metrics';

// Dev tuning for the isolated arena. Not part of the shared combatTuning contract.
const FIRE_COOLDOWN_MS = 400;
const SPAWN_INTERVAL_MS = 3000;
const BULLET_TTL_MS = 2000;
const BULLET_RADIUS = 3;
const PLAYER_RADIUS = 10;
const SAFE_SPAWN_DIST = 150;
const HIT_FLASH_MS = 120;
const HIT_TEXT_MS = 220;

export class CombatScene extends Phaser.Scene {
  private difficulty: Difficulty = 'story';
  private state!: RunState;
  private damage = new DamageSystem();
  private player = new Player();
  private enemies: CombatEnemy[] = [];
  private bullets: CombatBullet[] = [];
  private cover: CoverRect[] = [];
  private nextBulletId = 0;
  private awardedCounterAttackIds = new Set<string>();

  // Pause / focus-loss / defeat freezing. All deadlines run on effectiveNow so they
  // genuinely freeze while paused instead of drifting on the real clock.
  private pausedOffset = 0;
  private pausedAt: number | null = null;
  private paused = false;
  private defeated = false;

  private fireCooldown = 0;
  private spawnTimer = 0;
  private hitFlashEndTime = 0;
  private hitTextEndTime = 0;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private enemySprites = new Map<string, Phaser.GameObjects.Sprite>();
  private enemyShadows = new Map<string, Phaser.GameObjects.Ellipse>();
  private bulletGraphics = new Map<string, Phaser.GameObjects.Arc>();
  private coverGraphics!: Phaser.GameObjects.Graphics;
  private telegraphGraphics!: Phaser.GameObjects.Graphics;
  private hitFlash!: Phaser.GameObjects.Rectangle;
  private hudText!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;
  private counterRing!: Phaser.GameObjects.Graphics;
  private hitText!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Rectangle;
  private gameOverPanel!: Phaser.GameObjects.Container;
  private restartBtn!: Phaser.GameObjects.Rectangle;
  private restartBtnText!: Phaser.GameObjects.Text;

  constructor() { super('combat'); }

  private now(time: number): number { return time - this.pausedOffset; }

  preload() {
    // Load combat sprites
    // Player (K) - use interaction sheet for now
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
    // Scout sprites (4 directions each, 4 frames)
    const scoutStates = ['idle', 'windup', 'recoil', 'disabled'];
    for (const state of scoutStates) {
      const key = `scout-${state}`;
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, `/assets/characters/scout/scout-${state}-4dir-48px.png`, {
          frameWidth: 48, frameHeight: 48,
        });
      }
    }
    // Rusher sprites
    const rusherStates = ['idle', 'windup', 'charge', 'recovery'];
    for (const state of rusherStates) {
      const key = `rusher-${state}`;
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, `/assets/characters/rusher/rusher-${state}-4dir-48px.png`, {
          frameWidth: 48, frameHeight: 48,
        });
      }
    }
    // Muzzle flashes
    for (let i = 1; i <= 4; i++) {
      const key = `muzzle-flash-${i.toString().padStart(2, '0')}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `/assets/effects/muzzle-flash-${i.toString().padStart(2, '0')}-48px.png`);
      }
    }
  }

  create() {
    const cam = this.cameras.main;
    const width = cam.width;
    const height = cam.height;

    this.state = newRun(this.difficulty);
    this.fireCooldown = 0;
    this.spawnTimer = 0;
    this.awardedCounterAttackIds.clear();

    // Input
    this.keys = this.input.keyboard!.addKeys(
      'W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,ESC,M',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'ESC', 'M']);
    this.input.on('pointerdown', () => this.tryFire());

    // Solid cover blocks movement and dodges (temporary blocks).
    const cx = width * 0.5;
    const cy = height * 0.5;
    this.cover = [
      { x: cx - 90, y: cy - 60, w: 120, h: 100 },
      { x: cx - 200, y: cy + 55, w: 80, h: 90 },
      { x: cx + 150, y: cy - 95, w: 90, h: 80 },
    ];
    this.coverGraphics = this.add.graphics();
    this.coverGraphics.fillStyle(0x4a5568);
    for (const c of this.cover) this.coverGraphics.fillRect(c.x, c.y, c.w, c.h);

    document.body.dataset.scene = 'combat';

    // Player (decoupled readable visual size with fair collision hitbox)
    this.player.x = width * 0.22;
    this.player.y = height * 0.5;
    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 18, 24, 9, 0x05070a, 0.48)
      .setDepth(46);
    this.playerSprite = this.add.sprite(
      this.player.x,
      this.player.y,
      'sprite-k', 0,
    ).setDisplaySize(SPRITE_DISPLAY.combatPlayer, SPRITE_DISPLAY.combatPlayer)
      .setOrigin(0.5, 0.62)
      .setDepth(50);

    for (const dir of ['down', 'left', 'right', 'up']) {
      const animKey = `k-walk-${dir}`;
      if (!this.anims.exists(animKey) && this.textures.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(animKey, { start: 0, end: 3 }),
          frameRate: 9,
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

    // Telegraph overlay (warning lines).
    this.telegraphGraphics = this.add.graphics();
    this.telegraphGraphics.setDepth(45);

    // Hit feedback: white flash + text (never color-only).
    this.hitFlash = this.add
      .rectangle(0, 0, width, height, 0xffffff, 0)
      .setOrigin(0)
      .setDepth(105)
      .setVisible(false);
    this.hitText = this.add
      .text(width / 2, height / 2 - 70, 'HIT', {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(110)
      .setVisible(false);

    // HUD
    this.hudText = this.add
      .text(16, 12, '', { fontSize: '16px', fontFamily: 'monospace', color: '#e2e8f0' })
      .setDepth(100);
    this.counterText = this.add
      .text(width / 2, 34, '', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#fde047',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);
    this.counterRing = this.add.graphics().setDepth(52);

    // Pause overlay
    this.pauseOverlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0)
      .setDepth(120)
      .setVisible(false);
    const pauseTitle = this.add
      .text(width / 2, height / 2 - 20, 'PAUSED', {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(121)
      .setVisible(false)
      .setScrollFactor(0);
    this.add
      .text(width / 2, height / 2 + 12, 'Esc · Resume', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#cbd5e1',
      })
      .setOrigin(0.5)
      .setDepth(121)
      .setVisible(false)
      .setScrollFactor(0);
    this.pauseOverlay.setScrollFactor(0);
    pauseTitle.setScrollFactor(0);

    // Game Over overlay (hidden until defeat)
    this.gameOverPanel = this.add.container(width / 2, height / 2);
    this.gameOverPanel.setDepth(130);
    this.gameOverPanel.setVisible(false);
    const goBg = this.add.rectangle(0, 0, 340, 160, 0x111827, 0.95).setStrokeStyle(2, 0xef4444);
    const goTitle = this.add.text(0, -48, 'GAME OVER', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ef4444',
    }).setOrigin(0.5);
    const goHint = this.add.text(0, -6, 'K is down. The attempt failed.', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#e2e8f0',
    }).setOrigin(0.5);
    this.restartBtn = this.add
      .rectangle(0, 40, 200, 36, 0x4cc9f0)
      .setInteractive({ useHandCursor: true })
      .setDepth(131);
    this.restartBtn.on('pointerdown', () => this.restartMission());
    this.restartBtnText = this.add.text(0, 40, 'Restart mission', {
      fontSize: '15px',
      fontFamily: 'monospace',
      color: '#0f172a',
    }).setOrigin(0.5).setDepth(132);
    this.gameOverPanel.add([goBg, goTitle, goHint, this.restartBtn, this.restartBtnText]);

    // Spawn one Scout and one Rusher (Phase 3 starting condition).
    const startNow = this.now(performance.now());
    this.spawnEnemy('scout', startNow);
    this.spawnEnemy('rusher', startNow);

    // Window focus loss auto-pauses; resume clears held input.
    this.game.events.on('hidden', () => this.setPaused(true));
    this.game.events.on('visible', () => this.setPaused(false, true));

    this.events.once('shutdown', () => {
      this.game.events.off('hidden', () => this.setPaused(true));
      this.game.events.off('visible', () => this.setPaused(false, true));
      this.input.keyboard?.removeAllKeys(true);
    });

    this.updateHUD();
  }

  update(time: number, dt: number) {
    if (this.paused || this.defeated) return;

    const effNow = this.now(time);

    // Input: continuous movement, normalized diagonals (no speed advantage).
    let dx = 0;
    let dy = 0;
    if (this.keys.W.isDown || this.keys.UP.isDown) dy = -1;
    else if (this.keys.S.isDown || this.keys.DOWN.isDown) dy = 1;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) dx = -1;
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx = 1;
    this.player.setDirection(dx, dy);

    // Mouse-world aim matches the pointer at all canvas sizes.
    const p = this.input.activePointer;
    this.player.setAim(p.worldX - this.player.x, p.worldY - this.player.y);

    // Space dodge (one-shot on press, not held).
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && this.player.canDodge(effNow)) {
      this.player.startDodge(effNow);
    }

    // Esc pauses.
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.setPaused(!this.paused);
      return;
    }

    // Dev-only: toggle difficulty to verify both multipliers.
    if (Phaser.Input.Keyboard.JustDown(this.keys.M)) {
      this.toggleDifficulty();
    }

    this.player.tickDodge(effNow);
    this.player.updateMovement(dt / 1000, this.cover);
    this.clampPlayer();

    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    // Enemy AI and telegraphed attacks.
    const newBullets: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      speed: number;
      damage: number;
      attackId: string | null;
    }[] = [];
    for (const e of this.enemies) {
      if (e.phase === 'dead') continue;
      for (const b of updateEnemy(e, { x: this.player.x, y: this.player.y, radius: PLAYER_RADIUS }, effNow, dt / 1000)) {
        newBullets.push(b);
      }
    }

    // Bullets
    for (const b of this.bullets) updateBullet(b, dt / 1000);
    for (const b of newBullets) {
      this.bullets.push({
        id: `b-${++this.nextBulletId}`,
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
        speed: b.speed,
        damage: b.damage,
        owner: 'enemy',
        attackId: b.attackId,
        born: effNow,
        ttl: BULLET_TTL_MS,
      });
    }

    this.resolveCollisions(effNow);

    // Cap active enemies; spawn replacements at safe distance.
    this.spawnTimer += dt;
    const active = this.enemies.filter((e) => e.phase !== 'dead').length;
    if (this.spawnTimer >= SPAWN_INTERVAL_MS && active < combatTuning.maxActiveEnemies) {
      const kind: EnemyKind = active % 2 === 0 ? 'scout' : 'rusher';
      this.spawnEnemy(kind, effNow);
      this.spawnTimer = 0;
    }

    // Remove dead enemies and expired bullets.
    this.enemies = this.enemies.filter((e) => e.phase !== 'dead');
    this.bullets = this.bullets.filter((b) => effNow - b.born < b.ttl && this.inBounds(b));

    this.syncGraphics();
    this.updateHUD(effNow);

    if (this.state.health <= 0 && !this.defeated) this.handleDefeat();
  }

  private clampPlayer() {
    const cam = this.cameras.main;
    const r = this.player.radius;
    this.player.x = Math.min(Math.max(this.player.x, r), cam.width - r);
    this.player.y = Math.min(Math.max(this.player.y, r), cam.height - r);
  }

  private tryFire() {
    if (this.paused || this.defeated) return;
    if (this.fireCooldown > 0) return;
    this.fireCooldown = FIRE_COOLDOWN_MS;
    const shot = this.player.fireBullet(this.player.x, this.player.y, this.now(performance.now()));
    this.bullets.push({
      id: `b-${++this.nextBulletId}`,
      x: shot.x,
      y: shot.y,
      vx: shot.vx,
      vy: shot.vy,
      speed: shot.speed,
      damage: shot.damage,
      owner: 'player',
      attackId: null,
      born: this.now(performance.now()),
      ttl: BULLET_TTL_MS,
    });
  }

  private spawnEnemy(kind: EnemyKind, now: number) {
    const cam = this.cameras.main;
    const width = cam.width;
    const height = cam.height;
    const px = this.player.x;
    const py = this.player.y;
    let placed = false;
    let x = 0;
    let y = 0;
    for (let i = 0; i < 40; i++) {
      const side = Math.floor(Math.random() * 4);
      if (side === 0) { x = Math.random() * width; y = 0; }
      else if (side === 1) { x = Math.random() * width; y = height; }
      else if (side === 2) { x = 0; y = Math.random() * height; }
      else { x = width; y = Math.random() * height; }
      if (Math.hypot(x - px, y - py) < SAFE_SPAWN_DIST) continue;
      if (this.cover.some((c) => x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h)) continue;
      placed = true;
      break;
    }
    if (!placed) return;
    this.enemies.push(makeEnemy(kind, x, y, this.difficulty, now));
  }

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

    // Enemy projectiles and committed enemy bodies damage K.
    const dodgeImmune = this.player.isDodgeInvulnerable(effNow);
    for (const b of this.bullets) {
      if (b.owner !== 'enemy') continue;
      if (!circleOverlap(b.x, b.y, BULLET_RADIUS, this.player.x, this.player.y, PLAYER_RADIUS)) continue;
      b.hit = true;
      if (dodgeImmune) continue; // the dodge absorbed this would-be hit (counter candidate below)
      const res = this.damage.acceptHit(this.state, b.attackId, effNow);
      if (res) this.applyHit(res, effNow);
    }

    // Committed rusher body contact.
    for (const e of this.enemies) {
      if (e.phase !== 'committed' || !e.attackId) continue;
      if (!circleOverlap(this.player.x, this.player.y, PLAYER_RADIUS, e.x, e.y, e.radius)) continue;
      if (dodgeImmune) continue;
      const res = this.damage.acceptHit(this.state, e.attackId, effNow);
      if (res) this.applyHit(res, effNow);
    }

    // Perfect dodge: a committed hostile attack would have hit K during the dodge's
    // invulnerable interval. One counter per attack ID.
    if (dodgeImmune) {
      for (const b of this.bullets) {
        if (b.owner !== 'enemy' || !b.attackId || this.awardedCounterAttackIds.has(b.attackId)) continue;
        if (circleOverlap(b.x, b.y, BULLET_RADIUS, this.player.x, this.player.y, PLAYER_RADIUS)) {
          this.grantCounter(b.attackId, effNow);
        }
      }
      for (const e of this.enemies) {
        if (e.phase !== 'committed' || !e.attackId || this.awardedCounterAttackIds.has(e.attackId)) continue;
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
    this.hitFlashEndTime = effNow + HIT_FLASH_MS;
    this.hitTextEndTime = effNow + HIT_TEXT_MS;
    if (res.killed) {
      this.defeated = true;
    }
  }

  private grantCounter(attackId: string, effNow: number) {
    // No stacked counters: one window at a time.
    if (this.player.counterActive) return;
    this.awardedCounterAttackIds.add(attackId);
    this.player.openCounter(effNow, attackId);
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
    this.pausedOffset = 0;
    this.pausedAt = null;
    this.fireCooldown = 0;
    this.spawnTimer = 0;
    this.awardedCounterAttackIds.clear();
    this.hitFlashEndTime = 0;
    this.hitTextEndTime = 0;

    this.state = newRun(this.difficulty);
    this.damage.clear();
    this.player = new Player();
    const cam = this.cameras.main;
    this.player.x = cam.width * 0.22;
    this.player.y = cam.height * 0.5;

    this.enemies = [];
    this.bullets = [];
    this.enemySprites.forEach((s) => s.destroy());
    this.enemySprites.clear();
    this.enemyShadows.forEach((s) => s.destroy());
    this.enemyShadows.clear();
    this.bulletGraphics.forEach((g) => g.destroy());
    this.bulletGraphics.clear();

    this.gameOverPanel.setVisible(false);
    this.pauseOverlay.setVisible(false);
    this.counterText.setVisible(false);
    this.hitText.setVisible(false);
    this.hitFlash.setVisible(false);

    const startNow = this.now(performance.now());
    this.spawnEnemy('scout', startNow);
    this.spawnEnemy('rusher', startNow);

    this.updateHUD();
    this.syncGraphics();
  }

  // Dev-only: switch difficulty to verify both Story and Real multipliers.
  private toggleDifficulty() {
    if (this.paused || this.defeated) return;
    this.difficulty = this.difficulty === 'story' ? 'real' : 'story';
    this.updateHUD();
  }

  private setPaused(p: boolean, clearInputs = false) {
    if (this.defeated) return;
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
    this.playerShadow.setPosition(this.player.x, this.player.y + 18);

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
      const displaySize = e.kind === 'scout' ? SPRITE_DISPLAY.combatScout : SPRITE_DISPLAY.combatRusher;
      if (!sprite) {
        const textureKey = e.kind === 'scout' ? 'scout-idle' : 'rusher-idle';
        sprite = this.add.sprite(e.x, e.y, textureKey, 0);
        sprite.setDisplaySize(displaySize, displaySize);
        sprite.setDepth(48);
        this.enemySprites.set(e.id, sprite);
      }
      if (!shadow) {
        shadow = this.add.ellipse(e.x, e.y + 18, displaySize * 0.56, 10, 0x05070a, 0.45)
          .setDepth(44);
        this.enemyShadows.set(e.id, shadow);
      }
      sprite.setPosition(e.x, e.y);
      shadow.setPosition(e.x, e.y + 18);
      const dirFrame = directionFrame4Dir(e.dirX, e.dirY);
      // Update texture and directional frame based on phase
      if (e.phase === 'committed') {
        sprite.setTexture(e.kind === 'scout' ? 'scout-recoil' : 'rusher-charge', dirFrame);
        sprite.setTint(0xf87171);
      } else if (e.phase === 'telegraph') {
        sprite.setTexture(e.kind === 'scout' ? 'scout-windup' : 'rusher-windup', dirFrame);
        sprite.clearTint();
      } else {
        sprite.setTexture(e.kind === 'scout' ? 'scout-idle' : 'rusher-idle', dirFrame);
        sprite.clearTint();
      }
      sprite.setDisplaySize(displaySize, displaySize);
    }
    for (const [id, sprite] of this.enemySprites) {
      if (!liveEnemyIds.has(id)) {
        sprite.destroy();
        this.enemySprites.delete(id);
      }
    }
    for (const [id, shadow] of this.enemyShadows) {
      if (!liveEnemyIds.has(id)) {
        shadow.destroy();
        this.enemyShadows.delete(id);
      }
    }

    // ... rest stays the same for bullets, telegraph, counter
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

    // Counter window: ring + text (text updated in updateHUD).
    this.counterRing.clear();
    if (this.player.counterActive) {
      this.counterRing.lineStyle(3, 0xfde047, 0.9);
      this.counterRing.strokeCircle(this.player.x, this.player.y, 28);
      this.counterRing.setVisible(true);
    } else {
      this.counterRing.setVisible(false);
    }
  }

  private updateHUD(effNow?: number) {
    const rules = difficultyRules as unknown as Record<Difficulty, typeof difficultyRules.story>;
    const d = rules[this.difficulty];
    const seg = d.damagePerHit;
    const numSegments = Math.round(MAX_HEALTH / seg);
    const filled = Math.min(numSegments, Math.ceil(Math.max(0, this.state.health) / seg));
    let bars = '';
    for (let i = 0; i < numSegments; i++) bars += i < filled ? '█' : '░';
    const active = this.enemies.filter((e) => e.phase !== 'dead').length;
    this.hudText.setText(
      `${d.label}  Health ${bars}  ${this.state.health}/100  ` +
      `Enemies ${active}/${combatTuning.maxActiveEnemies}  ` +
      `Cap ${combatTuning.maxActiveEnemies}`,
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
