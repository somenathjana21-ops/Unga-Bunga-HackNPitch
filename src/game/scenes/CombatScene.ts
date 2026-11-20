import Phaser from 'phaser';
import { newRun } from '../state';
import type { RunState } from '../state';
import type { Difficulty } from '../rules';
import { difficultyRules, combatTuning, MAX_HEALTH } from '../rules';
import { saveRun } from '../../services/local-save';
import { audio } from '../../services/audio';
import type { ArenaBounds, CombatEnemy, CombatBullet, CoverRect, EnemyKind } from '../combat/types';
import { DamageSystem } from '../combat/damage';
import { Player, PERFECT_DODGE_GRAZE_MARGIN } from '../combat/player';
import {
  EXPOSED_DAMAGE_MULT,
  isEnemyExposed,
  makeEnemy,
  staggerEnemy,
  updateEnemy,
} from '../combat/enemy';
import { bulletHitsCover, updateBullet } from '../combat/bullet';
import { ArenaFx } from '../combat/arena-fx';
import { SPRITE_DISPLAY, directionFrame4Dir } from '../sprite-metrics';

const FIRE_COOLDOWN_MS = 260;
const SPAWN_INTERVAL_MS = 2600;
const BULLET_TTL_MS = 2000;
const BULLET_RADIUS = 3.5;
const PLAYER_RADIUS = 10;
const SAFE_SPAWN_DIST = 165;
const HIT_FLASH_MS = 130;
const HIT_TEXT_MS = 260;
const REFLEX_TIME_SCALE = 0.24;

export class CombatScene extends Phaser.Scene {
  private difficulty: Difficulty = 'story';
  private state!: RunState;
  private damage = new DamageSystem();
  private player = new Player();
  private enemies: CombatEnemy[] = [];
  private bullets: CombatBullet[] = [];
  private cover: CoverRect[] = [];
  private arenaBounds!: ArenaBounds;
  private nextBulletId = 0;
  private awardedCounterAttackIds = new Set<string>();

  // Unified simulation clock (freezes cleanly on pause / focus loss / defeat,
  // slows during Reflex Counter bullet-time).
  private simNow = 0;
  private paused = false;
  private defeated = false;
  private kills = 0;
  private counterKills = 0;

  private fireCooldown = 0;
  private spawnTimer = 0;
  private hitFlashEndTime = 0;
  private hitTextEndTime = 0;
  private lastGhostTime = 0;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private fx!: ArenaFx;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private enemySprites = new Map<string, Phaser.GameObjects.Sprite>();
  private enemyShadows = new Map<string, Phaser.GameObjects.Ellipse>();
  private bulletGraphics = new Map<string, Phaser.GameObjects.Arc>();
  private coverGraphics!: Phaser.GameObjects.Graphics;
  private telegraphGraphics!: Phaser.GameObjects.Graphics;
  private reflexTint!: Phaser.GameObjects.Rectangle;
  private hitFlash!: Phaser.GameObjects.Rectangle;
  private hudText!: Phaser.GameObjects.Text;
  private controlsTip!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;
  private counterRing!: Phaser.GameObjects.Graphics;
  private hitText!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Rectangle;
  private pauseTitle!: Phaser.GameObjects.Text;
  private pauseHint!: Phaser.GameObjects.Text;
  private gameOverPanel!: Phaser.GameObjects.Container;
  private restartBtn!: Phaser.GameObjects.Rectangle;
  private restartBtnText!: Phaser.GameObjects.Text;

  constructor() { super('combat'); }

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
    this.simNow = 0;
    this.paused = false;
    this.defeated = false;
    this.kills = 0;
    this.counterKills = 0;
    this.fireCooldown = 0;
    this.spawnTimer = 0;
    this.lastGhostTime = 0;
    this.awardedCounterAttackIds.clear();
    this.arenaBounds = { minX: 28, maxX: width - 28, minY: 48, maxY: height - 28 };

    // Input
    this.keys = this.input.keyboard!.addKeys(
      'W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,ESC,M,R',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'ESC', 'M', 'R']);

    const onPointerDown = (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (currentlyOver.length > 0) return;
      audio.unlock();
      this.tryFire();
    };
    this.input.on('pointerdown', onPointerDown);

    // Tactical arena grid backdrop
    const floor = this.add.graphics().setDepth(-2);
    floor.fillStyle(0x131922, 1);
    floor.fillRect(0, 0, width, height);
    floor.lineStyle(1, 0x1e293b, 0.7);
    for (let x = 0; x <= width; x += 48) floor.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += 48) floor.lineBetween(0, y, width, y);
    floor.lineStyle(2, 0x334155, 0.85);
    floor.strokeRect(12, 38, width - 24, height - 50);

    // Solid tactical cover blocks (block enemy fire AND stagger charging Rushers on slam!)
    const cx = width * 0.5;
    const cy = height * 0.52;
    this.cover = [
      { x: cx - 64, y: cy - 42, w: 112, h: 76 },
      { x: cx - 220, y: cy + 52, w: 84, h: 72 },
      { x: cx + 150, y: cy - 88, w: 88, h: 70 },
    ];
    this.coverGraphics = this.add.graphics().setDepth(5);
    for (const c of this.cover) {
      this.coverGraphics.fillStyle(0x090d14, 0.5);
      this.coverGraphics.fillRect(c.x + 4, c.y + 6, c.w, c.h);
      this.coverGraphics.fillStyle(0x334155, 1);
      this.coverGraphics.fillRect(c.x, c.y, c.w, c.h);
      this.coverGraphics.fillStyle(0x475569, 0.9);
      this.coverGraphics.fillRect(c.x, c.y, c.w, 8);
      this.coverGraphics.lineStyle(1.5, 0x64748b, 0.9);
      this.coverGraphics.strokeRect(c.x, c.y, c.w, c.h);
    }

    document.body.dataset.scene = 'combat';

    // Shared VFX layer
    this.fx = new ArenaFx(this);

    // Subtle golden slow-mo tint during Reflex Counter window
    this.reflexTint = this.add.rectangle(0, 0, width, height, 0xfde047, 0.08)
      .setOrigin(0)
      .setDepth(92)
      .setVisible(false);

    // Player
    this.player.x = width * 0.2;
    this.player.y = height * 0.5;
    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 18, 24, 9, 0x05070a, 0.48)
      .setDepth(46);
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

    this.hitFlash = this.add.rectangle(0, 0, width, height, 0xffffff, 0)
      .setOrigin(0).setDepth(105).setVisible(false);
    this.hitText = this.add.text(width / 2, height / 2 - 70, 'HIT', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#090d14', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(110).setVisible(false);

    // HUD bar
    this.add.rectangle(0, 0, width, 34, 0x090d14, 0.88).setOrigin(0).setDepth(99);
    this.hudText = this.add.text(14, 8, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#e2e8f0',
    }).setDepth(100);
    this.controlsTip = this.add.text(
      width / 2,
      height - 14,
      'Click: Fire  ·  Space: Reflex Dodge  ·  R: Snap Reload  ·  Bait Rushers into cover to stagger  ·  M: Mode',
      { fontSize: '11px', fontFamily: 'Segoe UI, Arial, sans-serif', color: '#94a3b8' },
    ).setOrigin(0.5).setDepth(100);

    this.counterText = this.add.text(width / 2, 54, '', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fde047',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100).setVisible(false);
    this.counterRing = this.add.graphics().setDepth(52);

    // Pause overlay (store refs so PAUSED text actually toggles visible!)
    this.pauseOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.58)
      .setOrigin(0).setDepth(120).setVisible(false).setScrollFactor(0);
    this.pauseTitle = this.add.text(width / 2, height / 2 - 18, 'PAUSED', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(121).setVisible(false).setScrollFactor(0);
    this.pauseHint = this.add.text(width / 2, height / 2 + 16, 'Esc · Resume', {
      fontSize: '15px', fontFamily: 'monospace', color: '#cbd5e1',
    }).setOrigin(0.5).setDepth(121).setVisible(false).setScrollFactor(0);

    // Game Over overlay
    this.gameOverPanel = this.add.container(width / 2, height / 2).setDepth(130).setVisible(false);
    const goBg = this.add.rectangle(0, 0, 340, 168, 0x111827, 0.96).setStrokeStyle(2, 0xef4444);
    const goTitle = this.add.text(0, -50, 'GAME OVER', {
      fontSize: '24px', fontFamily: 'monospace', color: '#ef4444',
    }).setOrigin(0.5);
    const goHint = this.add.text(0, -10, 'K is down. The attempt failed.', {
      fontSize: '14px', fontFamily: 'monospace', color: '#e2e8f0',
    }).setOrigin(0.5);
    this.restartBtn = this.add.rectangle(0, 40, 200, 36, 0x4cc9f0)
      .setInteractive({ useHandCursor: true }).setDepth(131);
    this.restartBtn.on('pointerdown', () => this.restartMission());
    this.restartBtnText = this.add.text(0, 40, 'Restart mission', {
      fontSize: '15px', fontFamily: 'monospace', color: '#0f172a',
    }).setOrigin(0.5).setDepth(132);
    this.gameOverPanel.add([goBg, goTitle, goHint, this.restartBtn, this.restartBtnText]);

    // Spawn opening Scout + Rusher
    this.spawnEnemy('scout', this.simNow);
    this.spawnEnemy('rusher', this.simNow);

    const onHidden = () => this.setPaused(true);
    const onVisible = () => this.setPaused(false, true);
    this.game.events.on('hidden', onHidden);
    this.game.events.on('visible', onVisible);

    this.events.once('shutdown', () => {
      this.game.events.off('hidden', onHidden);
      this.game.events.off('visible', onVisible);
      this.input.off('pointerdown', onPointerDown);
      this.input.keyboard?.removeAllKeys(true);
    });

    this.updateHUD();
  }

  update(_time: number, rawDt: number) {
    if (this.defeated) return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.setPaused(!this.paused);
      return;
    }
    if (this.paused) return;

    const clampedDt = Math.min(rawDt, 50);
    // Reflex Bullet-Time: world slows to 24% speed while the Counter window is open,
    // letting the player snap-aim a piercing golden counter shot.
    const inReflex = this.player.canCounter(this.simNow);
    const simDt = inReflex ? clampedDt * REFLEX_TIME_SCALE : clampedDt;
    this.simNow += simDt;
    const dtSec = simDt / 1000;
    const realDtSec = clampedDt / 1000;

    // Movement
    let dx = 0;
    let dy = 0;
    if (this.keys.W.isDown || this.keys.UP.isDown) dy = -1;
    else if (this.keys.S.isDown || this.keys.DOWN.isDown) dy = 1;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) dx = -1;
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx = 1;
    this.player.setDirection(dx, dy);

    // Mouse-world aim stays 100% real-time even during Reflex slow-mo
    const p = this.input.activePointer;
    this.player.setAim(p.worldX - this.player.x, p.worldY - this.player.y);

    // Space dodge
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && this.player.canDodge(this.simNow)) {
      audio.unlock();
      this.player.startDodge(this.simNow);
      audio.playCue('ui-confirm');
    }

    // R active snap-reload
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      audio.unlock();
      const res = this.player.triggerReload(this.simNow);
      if (res === 'snap') {
        audio.playCue('resolve');
        this.fx.callout(this.player.x, this.player.y - 30, 'SNAP RELOAD!', '#fde047', true);
        this.fx.sparks(this.player.x, this.player.y, 0xfde047, 8, 26);
      } else if (res === 'started') {
        audio.playCue('metal-drop');
      }
    }

    // Dev difficulty toggle
    if (Phaser.Input.Keyboard.JustDown(this.keys.M)) {
      this.toggleDifficulty();
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

    // Enemy tactical AI
    const newBullets: {
      x: number; y: number; vx: number; vy: number; speed: number;
      damage: number; attackId: string | null;
    }[] = [];
    for (const e of this.enemies) {
      if (e.phase === 'dead') continue;
      const res = updateEnemy(
        e,
        { x: this.player.x, y: this.player.y, radius: PLAYER_RADIUS },
        this.simNow,
        dtSec,
        this.cover,
        this.arenaBounds,
        this.difficulty,
      );
      if (res.slammedCover) {
        audio.playCue('muffled-blast');
        this.fx.shake(120, 0.008);
        this.fx.sparks(e.x, e.y, 0xfde047, 10, 34);
        this.fx.callout(e.x, e.y - 34, 'STAGGERED! 1.5x', '#fde047', true);
      }
      for (const b of res.bullets) newBullets.push(b);
    }

    // Bullets + cover ricochets
    for (const b of this.bullets) {
      updateBullet(b, dtSec);
      if (!b.hit && bulletHitsCover(b, BULLET_RADIUS, this.cover)) {
        b.hit = true;
        this.fx.sparks(b.x, b.y, b.owner === 'player' ? 0x94a3b8 : 0xf87171, 5, 18);
      }
    }
    for (const b of newBullets) {
      audio.playCue('gunshot');
      this.bullets.push({
        id: `b-${++this.nextBulletId}`,
        x: b.x, y: b.y, prevX: b.x, prevY: b.y,
        vx: b.vx, vy: b.vy, speed: b.speed, damage: b.damage,
        owner: 'enemy', attackId: b.attackId, born: this.simNow, ttl: BULLET_TTL_MS,
      });
    }

    this.resolveCollisions(this.simNow);

    // Cap active enemies; spawn replacements at safe distance.
    this.spawnTimer += simDt;
    const active = this.enemies.filter((e) => e.phase !== 'dead').length;
    if (this.spawnTimer >= SPAWN_INTERVAL_MS && active < combatTuning.maxActiveEnemies) {
      const kind: EnemyKind = (this.kills + active) % 2 === 0 ? 'scout' : 'rusher';
      this.spawnEnemy(kind, this.simNow);
      this.spawnTimer = 0;
    }

    this.enemies = this.enemies.filter((e) => e.phase !== 'dead');
    this.bullets = this.bullets.filter((b) => !b.hit && this.simNow - b.born < b.ttl && this.inBounds(b));

    this.syncGraphics();
    this.fx.renderFrame(this.player, this.enemies, this.bullets, p.worldX, p.worldY, this.simNow, realDtSec);
    this.reflexTint.setVisible(this.player.canCounter(this.simNow));
    this.updateHUD();

    if (this.state.health <= 0 && !this.defeated) this.handleDefeat();
  }

  private clampPlayer() {
    this.player.x = Math.min(Math.max(this.player.x, this.arenaBounds.minX), this.arenaBounds.maxX);
    this.player.y = Math.min(Math.max(this.player.y, this.arenaBounds.minY), this.arenaBounds.maxY);
  }

  private tryFire() {
    if (this.paused || this.defeated) return;
    if (this.fireCooldown > 0 && !this.player.canCounter(this.simNow)) return;
    if (!this.player.canFire(this.simNow)) {
      // Clicking while reloading attempts an Active Snap-Reload!
      if (this.player.reloading) {
        const res = this.player.triggerReload(this.simNow);
        if (res === 'snap') {
          audio.playCue('resolve');
          this.fx.callout(this.player.x, this.player.y - 30, 'SNAP RELOAD!', '#fde047', true);
          this.fx.sparks(this.player.x, this.player.y, 0xfde047, 8, 26);
        }
      }
      return;
    }
    this.fireCooldown = FIRE_COOLDOWN_MS;
    const shot = this.player.fireBullet(this.player.x, this.player.y, this.simNow);
    this.bullets.push({
      id: `b-${++this.nextBulletId}`,
      x: shot.x, y: shot.y, prevX: shot.x, prevY: shot.y,
      vx: shot.vx, vy: shot.vy, speed: shot.speed, damage: shot.damage,
      owner: 'player', attackId: null, born: this.simNow, ttl: BULLET_TTL_MS,
      isCounter: shot.isCounter,
      isOvercharged: shot.isOvercharged,
      piercing: shot.piercing,
      hitEnemyIds: [],
    });
    this.fx.muzzleFlash(this.player.x, this.player.y, shot.vx, shot.vy, shot.isCounter);
    if (shot.isCounter) {
      audio.playCue('muffled-blast');
      this.fx.shake(140, 0.009);
      this.fx.callout(this.player.x, this.player.y - 32, 'COUNTER RAIL!', '#fde047', true);
    } else {
      audio.playCue('gunshot');
      this.fx.shake(50, 0.0025);
    }
  }

  private spawnEnemy(kind: EnemyKind, now: number) {
    const px = this.player.x;
    const py = this.player.y;
    const { minX, maxX, minY, maxY } = this.arenaBounds;
    let placed = false;
    let x = 0;
    let y = 0;
    for (let i = 0; i < 40; i++) {
      const side = Math.floor(Math.random() * 4);
      if (side === 0) { x = minX + Math.random() * (maxX - minX); y = minY + 6; }
      else if (side === 1) { x = minX + Math.random() * (maxX - minX); y = maxY - 6; }
      else if (side === 2) { x = minX + 6; y = minY + Math.random() * (maxY - minY); }
      else { x = maxX - 6; y = minY + Math.random() * (maxY - minY); }
      if (Math.hypot(x - px, y - py) < SAFE_SPAWN_DIST) continue;
      if (this.cover.some((c) => x > c.x - 18 && x < c.x + c.w + 18 && y > c.y - 18 && y < c.y + c.h + 18)) continue;
      placed = true;
      break;
    }
    if (!placed) return;
    this.enemies.push(makeEnemy(kind, x, y, this.difficulty, now));
  }

  private resolveCollisions(effNow: number) {
    // Player bullets damage enemies (piercing Counter Rail shots pass through enemies!).
    for (const b of this.bullets) {
      if (b.owner !== 'player' || b.hit) continue;
      for (const e of this.enemies) {
        if (e.phase === 'dead') continue;
        if (b.hitEnemyIds?.includes(e.id)) continue;
        if (circleOverlap(b.x, b.y, BULLET_RADIUS + (b.isCounter ? 4 : 0), e.x, e.y, e.radius + 4)) {
          const exposed = isEnemyExposed(e);
          const dmg = exposed ? Math.round(b.damage * EXPOSED_DAMAGE_MULT) : b.damage;
          e.health -= dmg;
          e.hitFlashUntil = effNow + 110;
          b.hitEnemyIds?.push(e.id);
          if (!b.piercing) b.hit = true;

          // Counter Rail shots stagger surviving machines immediately!
          if (b.isCounter && e.health > 0) {
            staggerEnemy(e, effNow, 1200);
          }

          this.fx.sparks(e.x, e.y, b.isCounter ? 0xfde047 : exposed ? 0xf59e0b : 0xf87171, b.isCounter ? 10 : 6);
          this.fx.callout(
            e.x,
            e.y - 24,
            b.isCounter ? `COUNTER ${dmg}!` : exposed ? `EXPOSED ${dmg}` : `${dmg}`,
            b.isCounter ? '#fde047' : exposed ? '#fbbf24' : '#f8fafc',
            Boolean(b.isCounter || exposed),
          );

          if (e.health <= 0) {
            e.phase = 'dead';
            e.attackId = null;
            this.kills++;
            if (b.isCounter) this.counterKills++;
            audio.playCue('metal-drop');
            this.fx.sparks(e.x, e.y, 0xfde047, 12, 38);
            this.fx.shake(90, 0.005);
          }
          if (!b.piercing) break;
        }
      }
    }

    const dodgeImmune = this.player.isDodgeInvulnerable(effNow);

    // Enemy projectiles vs player
    for (const b of this.bullets) {
      if (b.owner !== 'enemy' || b.hit) continue;
      if (dodgeImmune) {
        // Graze-assisted Reflex Perfect Dodge!
        if (
          b.attackId &&
          !this.awardedCounterAttackIds.has(b.attackId) &&
          circleOverlap(b.x, b.y, BULLET_RADIUS, this.player.x, this.player.y, PLAYER_RADIUS + PERFECT_DODGE_GRAZE_MARGIN)
        ) {
          this.grantCounter(b.attackId, effNow);
        }
        continue;
      }
      if (!circleOverlap(b.x, b.y, BULLET_RADIUS, this.player.x, this.player.y, PLAYER_RADIUS)) continue;
      b.hit = true;
      const res = this.damage.acceptHit(this.state, b.attackId, effNow);
      if (res) this.applyHit(res, effNow);
    }

    // Committed Rusher contact vs player
    for (const e of this.enemies) {
      if (e.phase !== 'committed' || !e.attackId) continue;
      if (dodgeImmune) {
        if (
          !this.awardedCounterAttackIds.has(e.attackId) &&
          circleOverlap(e.x, e.y, e.radius, this.player.x, this.player.y, PLAYER_RADIUS + PERFECT_DODGE_GRAZE_MARGIN)
        ) {
          this.grantCounter(e.attackId, effNow);
        }
        continue;
      }
      if (!circleOverlap(this.player.x, this.player.y, PLAYER_RADIUS, e.x, e.y, e.radius)) continue;
      const res = this.damage.acceptHit(this.state, e.attackId, effNow);
      if (res) this.applyHit(res, effNow);
    }

    if (this.player.counterActive && effNow >= this.player.counterEndTime) {
      this.player.clearCounter();
    }
  }

  private applyHit(res: { state: RunState; killed: boolean }, effNow: number) {
    this.state = res.state;
    saveRun(this.state);
    this.player.clearCounter();
    this.hitFlashEndTime = effNow + HIT_FLASH_MS;
    this.hitTextEndTime = effNow + HIT_TEXT_MS;
    audio.playCue('muffled-blast');
    this.fx.shake(160, 0.011);
    this.fx.sparks(this.player.x, this.player.y, 0xef4444, 10, 32);
    if (res.killed) this.defeated = true;
  }

  private grantCounter(attackId: string, effNow: number) {
    if (this.player.counterActive) return;
    this.awardedCounterAttackIds.add(attackId);
    this.player.openCounter(effNow, attackId);
    audio.playCue('resolve');
    this.fx.reflexFlash(this.player.x, this.player.y);
    this.counterText.setText('REFLEX COUNTER — CLICK TO FIRE RAIL').setVisible(true);
  }

  private handleDefeat() {
    this.defeated = true;
    this.paused = true;
    saveRun(this.state);
    this.pauseOverlay.setVisible(true);
    this.gameOverPanel.setVisible(true);
    this.counterText.setVisible(false);
    this.reflexTint.setVisible(false);
  }

  private restartMission() {
    this.defeated = false;
    this.paused = false;
    this.simNow = 0;
    this.kills = 0;
    this.counterKills = 0;
    this.fireCooldown = 0;
    this.spawnTimer = 0;
    this.lastGhostTime = 0;
    this.awardedCounterAttackIds.clear();
    this.hitFlashEndTime = 0;
    this.hitTextEndTime = 0;

    this.state = newRun(this.difficulty);
    this.damage.clear();
    this.player = new Player();
    const cam = this.cameras.main;
    this.player.x = cam.width * 0.2;
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
    this.pauseTitle.setVisible(false);
    this.pauseHint.setVisible(false);
    this.counterText.setVisible(false);
    this.hitText.setVisible(false);
    this.hitFlash.setVisible(false);
    this.reflexTint.setVisible(false);

    this.spawnEnemy('scout', this.simNow);
    this.spawnEnemy('rusher', this.simNow);
    this.updateHUD();
    this.syncGraphics();
  }

  private toggleDifficulty() {
    if (this.paused || this.defeated) return;
    this.difficulty = this.difficulty === 'story' ? 'real' : 'story';
    this.updateHUD();
  }

  private setPaused(p: boolean, clearInputs = false) {
    if (this.defeated) return;
    this.paused = p;
    this.pauseOverlay.setVisible(p);
    this.pauseTitle.setVisible(p);
    this.pauseHint.setVisible(p);
    if (!p && clearInputs) this.player.setDirection(0, 0);
  }

  private syncGraphics() {
    this.playerSprite.setPosition(this.player.x, this.player.y);
    this.playerShadow.setPosition(this.player.x, this.player.y + 18);
    if (this.player.dodging) {
      this.playerSprite.setTint(this.player.canCounter(this.simNow) ? 0xfde047 : 0x7dd3fc);
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
      const displaySize = e.kind === 'scout' ? SPRITE_DISPLAY.combatScout : SPRITE_DISPLAY.combatRusher;
      if (!sprite) {
        sprite = this.add.sprite(e.x, e.y, e.kind === 'scout' ? 'scout-idle' : 'rusher-idle', 0)
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

      if (e.phase === 'staggered') {
        sprite.setTexture(e.kind === 'scout' ? 'scout-disabled' : 'rusher-recovery', dirFrame);
        sprite.setTint(0xfde047);
      } else if (e.phase === 'committed') {
        sprite.setTexture(e.kind === 'scout' ? 'scout-recoil' : 'rusher-charge', dirFrame);
        sprite.setTint(0xf87171);
      } else if (e.phase === 'telegraph') {
        sprite.setTexture(e.kind === 'scout' ? 'scout-windup' : 'rusher-windup', dirFrame);
        sprite.clearTint();
      } else {
        sprite.setTexture(e.kind === 'scout' ? 'scout-idle' : 'rusher-idle', dirFrame);
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

    // Telegraphs: crisp Scout laser lock-on sight + Rusher shaded charge corridor
    this.telegraphGraphics.clear();
    for (const e of this.enemies) {
      if (e.phase !== 'telegraph') continue;
      if (e.kind === 'scout') {
        const len = 320;
        const alpha = e.dirLocked ? 0.92 : 0.42 + e.telegraphT * 0.35;
        this.telegraphGraphics.lineStyle(e.dirLocked ? 2.5 : 1.5, e.dirLocked ? 0xff3b3b : 0xfbbf24, alpha);
        this.telegraphGraphics.lineBetween(e.x, e.y, e.x + e.dirX * len, e.y + e.dirY * len);
      } else {
        // Rusher danger lane
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

  private updateHUD() {
    const rules = difficultyRules as unknown as Record<Difficulty, typeof difficultyRules.story>;
    const d = rules[this.difficulty];
    const seg = d.damagePerHit;
    const numSegments = Math.round(MAX_HEALTH / seg);
    const filled = Math.min(numSegments, Math.ceil(Math.max(0, this.state.health) / seg));
    let bars = '';
    for (let i = 0; i < numSegments; i++) bars += i < filled ? '█' : '░';
    const active = this.enemies.filter((e) => e.phase !== 'dead').length;
    const ammoStr = this.player.reloading ? 'RELOAD [R]' : `AMMO ${this.player.ammo}/6`;
    this.hudText.setText(
      `${d.label}  HP ${bars} ${this.state.health}/100  ·  ${ammoStr}  ·  Enemies ${active}/${combatTuning.maxActiveEnemies}  ·  Down ${this.kills}` +
      (this.counterKills > 0 ? ` (${this.counterKills} Counter)` : ''),
    );

    this.counterText.setVisible(this.player.canCounter(this.simNow));
    this.hitFlash.setAlpha(0.35).setVisible(this.simNow < this.hitFlashEndTime);
    this.hitText.setVisible(this.simNow < this.hitTextEndTime);
    this.controlsTip.setVisible(!this.paused && !this.defeated);
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
