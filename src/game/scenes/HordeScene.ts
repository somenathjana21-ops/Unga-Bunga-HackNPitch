import Phaser from 'phaser';
import { combatTuning } from '../rules';
import { audio } from '../../services/audio';
import { ArenaFx } from '../combat/arena-fx';
import { bulletHitsCover, updateBullet } from '../combat/bullet';
import { Player, PERFECT_DODGE_GRAZE_MARGIN, circleRectOverlap } from '../combat/player';
import { EXPOSED_DAMAGE_MULT, isEnemyExposed, nextAttackId, nextEnemyId, staggerEnemy } from '../combat/enemy';
import type { ArenaBounds, CombatBullet, CombatEnemy, CoverRect } from '../combat/types';
import { SPRITE_DISPLAY, directionFrame4Dir } from '../sprite-metrics';
import {
  calculateClearBonus,
  calculateKillPoints,
  formatHordeClock,
  formatScore,
  hordeDifficultyRules,
  hordeDurationRules,
  hordeHitsToFall,
  hordeTimeRamp,
  mulberry32,
  normalizeSeed,
  pickHordeEnemyKind,
  randomSeed,
  type HordeDifficulty,
  type HordeDuration,
  type HordeEnemyKind,
} from '../horde/rules';
import {
  HORDE_ARENA_HEIGHT,
  HORDE_ARENA_WIDTH,
  HORDE_MAP_IDS,
  generateRandomHordeCover,
  hordeMaps,
  resolveHordeMap,
  type HordeMapChoice,
  type HordeMapId,
} from '../horde/maps';
import {
  computeLeadDirection,
  computePincerApproach,
  computeTacticalRangedMove,
  hasImmediateCoverAhead,
  type SquadUnit,
} from '../horde/ai';

const PLAYER_RADIUS = 10;
const BULLET_RADIUS = 3.5;
const SAFE_SPAWN_DIST = 260;
const MAX_SPAWN_RING_DIST = 620;
const BULLET_TTL_MS = 2800;
const HIT_FLASH_MS = 130;
const HIT_INVULN_MS = 950;
const REFLEX_TIME_SCALE = 0.24;
const COMBO_WINDOW_MS = 4200;

export interface HordeConfig {
  playerName: string;
  difficulty: HordeDifficulty;
  duration: HordeDuration;
  mapChoice?: HordeMapChoice;
  /** Shared duel seed; omitted for solo runs (a fresh seed is generated). */
  seed?: number;
}

export interface HordeRunResult {
  playerName: string;
  difficulty: HordeDifficulty;
  duration: HordeDuration;
  mapId: HordeMapId;
  seed: number;
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
  private config: HordeConfig = {
    playerName: 'Agent',
    difficulty: 'easy',
    duration: '1m',
    mapChoice: 'warehouse',
    seed: randomSeed(),
  };
  private activeMapId: HordeMapId = 'warehouse';
  private health = 160;
  private invulnerableUntil = 0;
  private hitAttackIds = new Set<string>();

  private player = new Player();
  private playerVx = 0;
  private playerVy = 0;
  /** Deterministic spawn stream: duel seats share a seed, solo runs get a fresh one. */
  private rng: () => number = Math.random;
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
  private backdropImg: Phaser.GameObjects.Image | null = null;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private coverGfx!: Phaser.GameObjects.Graphics;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private enemySprites = new Map<string, Phaser.GameObjects.Sprite>();
  private enemyShadows = new Map<string, Phaser.GameObjects.Ellipse>();
  private bulletGraphics = new Map<string, Phaser.GameObjects.Arc>();
  private telegraphGraphics!: Phaser.GameObjects.Graphics;
  private counterRing!: Phaser.GameObjects.Graphics;
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private reflexTint!: Phaser.GameObjects.Rectangle;
  private hitFlash!: Phaser.GameObjects.Rectangle;
  private hudLeft!: Phaser.GameObjects.Text;
  private hudCenter!: Phaser.GameObjects.Text;
  private hudRight!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;
  private waveBanner!: Phaser.GameObjects.Text;

  private pauseContainer!: Phaser.GameObjects.Container;
  private pauseSubText!: Phaser.GameObjects.Text;

  constructor() {
    super('horde');
  }

  init(data: Partial<HordeConfig> = {}): void {
    const regConfig = this.registry.get('hordeConfig') as Partial<HordeConfig> | undefined;
    this.config = {
      playerName: data.playerName ?? regConfig?.playerName ?? 'Agent',
      difficulty: data.difficulty ?? regConfig?.difficulty ?? 'easy',
      duration: data.duration ?? regConfig?.duration ?? '1m',
      mapChoice: data.mapChoice ?? regConfig?.mapChoice ?? 'warehouse',
      seed: normalizeSeed(data.seed ?? regConfig?.seed ?? randomSeed()),
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
    // Load all 4 Horde Arena map backgrounds
    for (const id of HORDE_MAP_IDS) {
      const def = hordeMaps[id];
      if (!this.textures.exists(def.backgroundKey)) {
        this.load.image(def.backgroundKey, def.backgroundPath);
      }
    }
  }

  create() {
    const cam = this.cameras.main;
    const viewW = cam.width;
    const viewH = cam.height;
    const rule = hordeDifficultyRules[this.config.difficulty];

    this.resetRunState();
    this.arenaBounds = {
      minX: 34,
      maxX: HORDE_ARENA_WIDTH - 34,
      minY: 54,
      maxY: HORDE_ARENA_HEIGHT - 34,
    };

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

    // Arena visual layers (world-space)
    this.gridGfx = this.add.graphics().setDepth(-1);
    this.coverGfx = this.add.graphics().setDepth(5);
    this.buildArenaEnvironment();

    this.fx = new ArenaFx(this);

    // Screen-pinned overlays
    this.reflexTint = this.add.rectangle(0, 0, viewW, viewH, 0xfde047, 0.09)
      .setOrigin(0).setDepth(92).setScrollFactor(0).setVisible(false);
    this.hitFlash = this.add.rectangle(0, 0, viewW, viewH, 0xef4444, 0)
      .setOrigin(0).setDepth(105).setScrollFactor(0).setVisible(false);

    // Player spawns in open center plaza of the expanded arena
    this.player.x = HORDE_ARENA_WIDTH * 0.5;
    this.player.y = HORDE_ARENA_HEIGHT * 0.52;
    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 18, 24, 9, 0x05070a, 0.48).setDepth(46);
    this.playerSprite = this.add.sprite(this.player.x, this.player.y, 'sprite-k', 0)
      .setDisplaySize(SPRITE_DISPLAY.combatPlayer, SPRITE_DISPLAY.combatPlayer)
      .setOrigin(0.5, 0.62)
      .setDepth(50);

    // Smooth camera follow across the expanded 1440x864 arena
    cam.setBounds(0, 0, HORDE_ARENA_WIDTH, HORDE_ARENA_HEIGHT);
    cam.startFollow(this.playerSprite, true, 0.14, 0.14);

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
    this.minimapGfx = this.add.graphics().setDepth(98).setScrollFactor(0);

    // Compact screen-pinned HUD bar
    this.add.rectangle(0, 0, viewW, 36, 0x090d14, 0.92).setOrigin(0).setDepth(99).setScrollFactor(0);
    this.hudLeft = this.add.text(12, 9, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#e2e8f0',
    }).setDepth(100).setScrollFactor(0);
    this.hudCenter = this.add.text(viewW / 2, 7, '', {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fde68a',
    }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);
    this.hudRight = this.add.text(viewW - 12, 9, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#f8fafc',
    }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);

    this.counterText = this.add.text(viewW / 2, 56, '', {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fde047',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setVisible(false);

    this.waveBanner = this.add.text(viewW / 2, viewH * 0.28, '', {
      fontSize: '19px', fontFamily: 'monospace', fontStyle: 'bold', color: rule.accentHex,
      stroke: '#090d14', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(102).setScrollFactor(0).setAlpha(0);

    // Pause modal pinned to screen center
    this.pauseContainer = this.add.container(viewW / 2, viewH / 2)
      .setDepth(130)
      .setScrollFactor(0)
      .setVisible(false);
    const pBackdrop = this.add.rectangle(0, 0, viewW, viewH, 0x05080d, 0.72);
    const pCard = this.add.rectangle(0, 0, 340, 214, 0x111722, 0.98).setStrokeStyle(1.5, 0xe3b16b);
    const pTitle = this.add.text(0, -70, 'PAUSED', {
      fontSize: '22px', fontFamily: 'monospace', fontStyle: 'bold', color: '#f2eee6',
    }).setOrigin(0.5);
    this.pauseSubText = this.add.text(
      0,
      -42,
      `${this.config.playerName} · ${rule.label} · ${hordeMaps[this.activeMapId].shortName}`,
      {
        fontSize: '12px', fontFamily: 'Segoe UI, Arial, sans-serif', color: '#b4bcc8',
      },
    ).setOrigin(0.5);

    const makePauseBtn = (y: number, label: string, fill: number, textCol: string, onClick: () => void) => {
      const bg = this.add.rectangle(0, y, 224, 34, fill).setInteractive({ useHandCursor: true });
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

    const resumePair = makePauseBtn(-2, 'Resume Trial', 0xe3b16b, '#12161d', () => this.setPaused(false));
    const restartPair = makePauseBtn(42, 'Restart (New Cover)', 0x263142, '#f2eee6', () => this.restartTrial());
    const menuPair = makePauseBtn(84, 'Return to Menu', 0x1a222f, '#cbd5e1', () => {
      window.dispatchEvent(new CustomEvent('want:return-to-title'));
    });

    this.pauseContainer.add([
      pBackdrop,
      pCard,
      pTitle,
      this.pauseSubText,
      ...resumePair,
      ...restartPair,
      ...menuPair,
    ]);

    // Opening spawns so action starts immediately with crisp readability
    this.spawnEnemy('scout', this.simNow);
    if (this.config.difficulty !== 'easy') {
      this.spawnEnemy('rusher', this.simNow);
    }
    this.announceWave(
      `WAVE 1 · ${hordeMaps[this.activeMapId].shortName.toUpperCase()} · ${rule.label.toUpperCase()} (${formatScore(rule.difficultyFactor)}×)`,
    );

    const onBlur = () => {
      this.player.setDirection(0, 0);
    };
    window.addEventListener('blur', onBlur);

    const onRestartReq = (event: Event) => {
      const detail = (event as CustomEvent<Partial<HordeConfig> | undefined>).detail;
      if (detail) {
        this.config = {
          ...this.config,
          ...detail,
        };
      }
      this.restartTrial();
    };
    window.addEventListener('want:horde-restart', onRestartReq);

    this.events.once('shutdown', () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('want:horde-restart', onRestartReq);
      this.input.off('pointerdown', onPointerDown);
      this.input.keyboard?.removeAllKeys(true);
    });

    this.syncGraphics();
    this.updateHUD();
  }

  /** Resolves map, generates brand-new randomized cover for this match, and paints the expanded arena. */
  private buildArenaEnvironment(): void {
    const rule = hordeDifficultyRules[this.config.difficulty];
    this.activeMapId = resolveHordeMap(this.config.mapChoice ?? 'warehouse');
    const mapDef = hordeMaps[this.activeMapId];
    const isDoom = this.config.difficulty === 'doom';

    // Fresh randomized tactical cover every single match
    this.cover = generateRandomHordeCover(HORDE_ARENA_WIDTH, HORDE_ARENA_HEIGHT, this.activeMapId);

    // Expose active map & cover layout for testing/debugging
    document.body.dataset.hordeMap = this.activeMapId;
    document.body.dataset.hordeCovers = this.cover.map((c) => `${c.x},${c.y},${c.w}x${c.h}`).join(';');
    window.dispatchEvent(new CustomEvent<{ mapId: HordeMapId }>('want:horde-map-active', {
      detail: { mapId: this.activeMapId },
    }));

    // Map-themed audio
    audio.setSceneAudio(mapDef.musicTrack, mapDef.ambienceTrack, rule.musicRate);

    // Backdrop image scaled smoothly across the expanded arena
    if (this.backdropImg) {
      this.backdropImg.destroy();
      this.backdropImg = null;
    }
    if (this.textures.exists(mapDef.backgroundKey)) {
      this.backdropImg = this.add.image(
        HORDE_ARENA_WIDTH / 2,
        HORDE_ARENA_HEIGHT / 2,
        mapDef.backgroundKey,
      )
        .setDisplaySize(HORDE_ARENA_WIDTH, HORDE_ARENA_HEIGHT)
        .setDepth(-2)
        .setAlpha(0.58)
        .setTint(isDoom ? mapDef.doomTint : mapDef.backdropTint);
    }

    // Tactical grid + arena perimeter frame
    this.gridGfx.clear();
    this.gridGfx.fillStyle(0x0b1018, 0.38);
    this.gridGfx.fillRect(0, 0, HORDE_ARENA_WIDTH, HORDE_ARENA_HEIGHT);
    this.gridGfx.lineStyle(1, mapDef.gridColor, 0.28);
    for (let x = 0; x <= HORDE_ARENA_WIDTH; x += 64) {
      this.gridGfx.lineBetween(x, 0, x, HORDE_ARENA_HEIGHT);
    }
    for (let y = 0; y <= HORDE_ARENA_HEIGHT; y += 64) {
      this.gridGfx.lineBetween(0, y, HORDE_ARENA_WIDTH, y);
    }
    // Center spawn ring indicator
    this.gridGfx.lineStyle(1.5, isDoom ? 0xef4444 : mapDef.coverAccent, 0.22);
    this.gridGfx.strokeCircle(HORDE_ARENA_WIDTH * 0.5, HORDE_ARENA_HEIGHT * 0.52, 84);
    // Outer boundary line
    this.gridGfx.lineStyle(3, isDoom ? 0xef4444 : mapDef.coverAccent, 0.55);
    this.gridGfx.strokeRect(18, 42, HORDE_ARENA_WIDTH - 36, HORDE_ARENA_HEIGHT - 60);

    // Draw randomized cover barricades with map-themed beveled plates
    this.coverGfx.clear();
    const hazardAccent = isDoom ? 0xef4444 : mapDef.coverAccent;
    for (const c of this.cover) {
      this.coverGfx.fillStyle(0x05070b, 0.58);
      this.coverGfx.fillRect(c.x + 5, c.y + 7, c.w, c.h);

      this.coverGfx.fillStyle(mapDef.coverBase, 0.96);
      this.coverGfx.fillRect(c.x, c.y, c.w, c.h);

      this.coverGfx.fillStyle(mapDef.coverTop, 0.92);
      this.coverGfx.fillRect(c.x + 1, c.y + 1, c.w - 2, 6);

      this.coverGfx.fillStyle(mapDef.coverPanel, 0.92);
      this.coverGfx.fillRect(c.x + 7, c.y + 11, Math.max(8, c.w - 14), Math.max(8, c.h - 18));

      this.coverGfx.lineStyle(1, mapDef.gridColor, 0.68);
      this.coverGfx.lineBetween(c.x + 9, c.y + c.h / 2 + 2, c.x + c.w - 9, c.y + c.h / 2 + 2);

      this.coverGfx.fillStyle(hazardAccent, 0.88);
      this.coverGfx.fillRect(c.x + 3, c.y + 3, 6, 2);
      this.coverGfx.fillRect(c.x + c.w - 9, c.y + 3, 6, 2);
      this.coverGfx.fillRect(c.x + 3, c.y + c.h - 5, 6, 2);
      this.coverGfx.fillRect(c.x + c.w - 9, c.y + c.h - 5, 6, 2);

      this.coverGfx.lineStyle(1.5, mapDef.coverTrim, 0.92);
      this.coverGfx.strokeRect(c.x, c.y, c.w, c.h);
    }

    if (this.pauseSubText) {
      this.pauseSubText.setText(`${this.config.playerName} · ${rule.label} · ${mapDef.shortName}`);
    }
  }

  private resetRunState(): void {
    const rule = hordeDifficultyRules[this.config.difficulty];
    this.rng = mulberry32(this.config.seed ?? randomSeed());
    this.health = rule.playerMaxHealth;
    this.invulnerableUntil = 0;
    this.hitAttackIds.clear();
    this.player = new Player();
    this.playerVx = 0;
    this.playerVy = 0;
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
    const rule = hordeDifficultyRules[this.config.difficulty];
    this.resetRunState();
    // Re-roll map (if Random) and generate a brand-new randomized cover layout
    this.buildArenaEnvironment();
    this.player.x = HORDE_ARENA_WIDTH * 0.5;
    this.player.y = HORDE_ARENA_HEIGHT * 0.52;
    this.playerSprite.setPosition(this.player.x, this.player.y);
    this.cameras.main.centerOn(this.player.x, this.player.y);

    this.pauseContainer.setVisible(false);
    this.counterText.setVisible(false);
    this.reflexTint.setVisible(false);
    this.hitFlash.setVisible(false);
    document.body.dataset.state = 'playing';
    document.body.dataset.hordeScore = '0';

    this.spawnEnemy('scout', this.simNow);
    if (this.config.difficulty !== 'easy') this.spawnEnemy('rusher', this.simNow);
    this.announceWave(
      `WAVE 1 · ${hordeMaps[this.activeMapId].shortName.toUpperCase()} · ${rule.label.toUpperCase()} (${formatScore(rule.difficultyFactor)}×)`,
    );
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
      delay: 1150,
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

    // Wave ramp + Wave-clear recovery (Easy/Medium/Hard only; 0 on Maniac/DOOM)
    const rule = hordeDifficultyRules[this.config.difficulty];
    const ramp = hordeTimeRamp(elapsedSec);
    if (ramp.waveNumber > this.currentWave) {
      this.currentWave = ramp.waveNumber;
      audio.playCue('resolve');
      if (rule.healPerWave > 0 && this.health < rule.playerMaxHealth) {
        const restored = Math.min(rule.playerMaxHealth - this.health, rule.healPerWave);
        this.health += restored;
        this.fx.callout(this.player.x, this.player.y - 34, `+${restored} HP WAVE RECOVERY`, '#86efac', true);
        this.fx.sparks(this.player.x, this.player.y, 0x86efac, 10, 30);
        this.announceWave(`WAVE ${this.currentWave} · +${restored} HP`);
      } else {
        this.announceWave(`WAVE ${this.currentWave}`);
      }
    }

    // Movement
    let dx = 0;
    let dy = 0;
    if (this.keys.W.isDown || this.keys.UP.isDown) dy = -1;
    else if (this.keys.S.isDown || this.keys.DOWN.isDown) dy = 1;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) dx = -1;
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx = 1;
    this.player.setDirection(dx, dy);

    // Keep pointer world coordinates synced with smooth camera scrolling
    const p = this.input.activePointer;
    p.updateWorldPoint(this.cameras.main);
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

    const prevX = this.player.x;
    const prevY = this.player.y;
    this.player.tickDodge(this.simNow);
    this.player.tickReload(this.simNow);
    this.player.updateMovement(dtSec * rule.playerMoveSpeedMult, this.cover);
    this.clampPlayer();
    if (dtSec > 0.001) {
      const instVx = (this.player.x - prevX) / dtSec;
      const instVy = (this.player.y - prevY) / dtSec;
      this.playerVx = this.playerVx * 0.45 + instVx * 0.55;
      this.playerVy = this.playerVy * 0.45 + instVy * 0.55;
    }

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

    // Build shared squad snapshot once per frame for coordinated flanking & separation
    const squad: SquadUnit[] = [];
    for (const e of this.enemies) {
      if (e.phase !== 'dead') {
        squad.push({ id: e.id, x: e.x, y: e.y, kind: e.hordeKind });
      }
    }

    // Update enemies with clever AI (lead aiming, cover flanking, pincer Rushers, squad spacing)
    for (const e of this.enemies) {
      if (e.phase === 'dead') continue;
      this.updateHordeEnemy(e, dtSec, squad);
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

    // Spawner (respects active cap & tactical ring around player)
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
    p.updateWorldPoint(this.cameras.main);
    this.fx.renderFrame(this.player, this.enemies, this.bullets, p.worldX, p.worldY, this.simNow, realDtSec);
    this.reflexTint.setVisible(this.player.canCounter(this.simNow));
    this.updateHUD();
  }

  private updateHordeEnemy(e: HordeEnemy, dt: number, squad: readonly SquadUnit[]): void {
    const rule = hordeDifficultyRules[this.config.difficulty];
    const now = this.simNow;

    if (e.phase === 'staggered') {
      if (now >= e.staggeredUntil) {
        e.phase = 'idle';
        e.slammedCover = false;
        e.nextDecisionTime = now + Math.max(240, 580 / rule.enemySpeedMultiplier);
      }
      return;
    }

    if (e.phase === 'recovering') {
      if (now >= e.recoverEndTime) {
        e.phase = 'idle';
        e.slammedCover = false;
        e.strafeDir = e.strafeDir === 1 ? -1 : 1;
        e.nextDecisionTime = now + Math.max(280, 720 / rule.enemySpeedMultiplier);
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

      if (e.hordeKind === 'scout') {
        const move = computeTacticalRangedMove({
          selfId: e.id,
          x: e.x,
          y: e.y,
          px: this.player.x,
          py: this.player.y,
          strafeDir: e.strafeDir,
          minRange: 190,
          maxRange: 330,
          cover: this.cover,
          allies: squad,
        });
        e.strafeDir = move.preferredStrafe;
        const speed = 88 * rule.enemySpeedMultiplier;
        this.moveEnemyWithCover(e, move.vx * speed * dt, move.vy * speed * dt);

        if (now >= e.nextDecisionTime && move.clearSight && dist <= 560) {
          e.phase = 'telegraph';
          e.telegraphT = 0;
          e.dirLocked = false;
          audio.playCue('scout-windup');
        }
      } else if (e.hordeKind === 'rusher') {
        const move = computePincerApproach({
          selfId: e.id,
          x: e.x,
          y: e.y,
          px: this.player.x,
          py: this.player.y,
          strafeDir: e.strafeDir,
          cover: this.cover,
          allies: squad,
        });
        const speed = 118 * rule.enemySpeedMultiplier;
        this.moveEnemyWithCover(e, move.vx * speed * dt, move.vy * speed * dt);

        const blockedClose = hasImmediateCoverAhead(e.x, e.y, ux, uy, e.radius, this.cover, 56);
        if (now >= e.nextDecisionTime && dist <= 290 && move.clearSight && !blockedClose) {
          e.phase = 'telegraph';
          e.telegraphT = 0;
          e.dirLocked = false;
          audio.playCue('rusher-windup');
        }
      } else {
        // Breach Striker: flanks cover to establish wide crossfire lanes & delivers fan spreads
        const move = computeTacticalRangedMove({
          selfId: e.id,
          x: e.x,
          y: e.y,
          px: this.player.x,
          py: this.player.y,
          strafeDir: e.strafeDir,
          minRange: 250,
          maxRange: 420,
          cover: this.cover,
          allies: squad,
        });
        e.strafeDir = move.preferredStrafe;
        const speed = 64 * rule.enemySpeedMultiplier;
        this.moveEnemyWithCover(e, move.vx * speed * dt, move.vy * speed * dt);

        if (now >= e.nextDecisionTime && (move.clearSight || now >= e.nextDecisionTime + 750) && dist <= 620) {
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
        if (e.hordeKind === 'scout') {
          const lead = computeLeadDirection(
            e.x, e.y, this.player.x, this.player.y,
            this.playerVx, this.playerVy,
            rule.bulletSpeed, rule.aiLeadFactor,
          );
          e.dirX = lead.x;
          e.dirY = lead.y;
        } else if (e.hordeKind === 'striker') {
          const lead = computeLeadDirection(
            e.x, e.y, this.player.x, this.player.y,
            this.playerVx, this.playerVy,
            rule.bulletSpeed * 0.88, rule.aiLeadFactor * 0.85,
          );
          e.dirX = lead.x;
          e.dirY = lead.y;
        } else {
          // Rushers lightly anticipate strafing direction to intercept K cleanly
          const lead = computeLeadDirection(
            e.x, e.y, this.player.x, this.player.y,
            this.playerVx, this.playerVy,
            395 * Math.min(1.55, rule.enemySpeedMultiplier),
            rule.aiLeadFactor * 0.45,
          );
          e.dirX = lead.x;
          e.dirY = lead.y;
        }
        if (e.telegraphT >= 0.72) e.dirLocked = true;
      }

      if (e.telegraphT >= 1) {
        e.phase = 'committed';
        e.attackId = nextAttackId();
        if (e.hordeKind === 'scout') {
          this.spawnEnemyBullet(e, e.dirX, e.dirY, rule.bulletSpeed, e.attackId);
          e.burstRemaining = Math.max(0, rule.scoutBurstCount - 1);
          e.nextBurstTime = now + Math.max(90, 155 / rule.enemySpeedMultiplier);
          e.committedEndTime = now + Math.max(300, 500 / rule.enemySpeedMultiplier);
        } else if (e.hordeKind === 'striker') {
          const baseAngle = Math.atan2(e.dirY, e.dirX);
          const count = e.spreadCount;
          const arc = 0.52;
          for (let i = 0; i < count; i++) {
            const frac = count === 1 ? 0 : (i / (count - 1)) - 0.5;
            const a = baseAngle + frac * arc;
            this.spawnEnemyBullet(e, Math.cos(a), Math.sin(a), rule.bulletSpeed * 0.88, e.attackId);
          }
          e.committedEndTime = now + 460;
        } else {
          const chargeSpeed = 395 * Math.min(1.55, rule.enemySpeedMultiplier);
          e.committedVx = e.dirX * chargeSpeed;
          e.committedVy = e.dirY * chargeSpeed;
          e.committedEndTime = now + 490;
        }
      }
      return;
    }

    if (e.phase === 'committed') {
      if (e.hordeKind === 'scout') {
        if (e.burstRemaining > 0 && now >= e.nextBurstTime) {
          e.burstRemaining--;
          e.nextBurstTime = now + Math.max(90, 155 / rule.enemySpeedMultiplier);
          // Re-lead follow-up burst shots slightly on higher tiers
          const burstDir = rule.aiLeadFactor >= 0.65
            ? computeLeadDirection(
                e.x, e.y, this.player.x, this.player.y,
                this.playerVx, this.playerVy,
                rule.bulletSpeed, rule.aiLeadFactor * 0.65,
              )
            : { x: e.dirX, y: e.dirY };
          this.spawnEnemyBullet(e, burstDir.x, burstDir.y, rule.bulletSpeed, e.attackId);
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
        e.recoverEndTime = now + Math.max(280, 720 / rule.enemySpeedMultiplier);
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
    // Prefer spawning on a tactical ring around K (300..620px away) so the larger 1440x864 arena
    // stays dynamic and readable rather than spawning units far off in empty corners.
    // Deterministic via this.rng() so duel seats sharing a seed get identical placement.
    for (let i = 0; i < 48; i++) {
      if (i < 32) {
        const angle = this.rng() * Math.PI * 2;
        const radius = SAFE_SPAWN_DIST + 40 + this.rng() * (MAX_SPAWN_RING_DIST - SAFE_SPAWN_DIST - 40);
        x = Math.min(Math.max(this.player.x + Math.cos(angle) * radius, minX + 12), maxX - 12);
        y = Math.min(Math.max(this.player.y + Math.sin(angle) * radius, minY + 12), maxY - 12);
      } else {
        const side = Math.floor(this.rng() * 4);
        if (side === 0) { x = minX + this.rng() * (maxX - minX); y = minY + 10; }
        else if (side === 1) { x = minX + this.rng() * (maxX - minX); y = maxY - 10; }
        else if (side === 2) { x = minX + 10; y = minY + this.rng() * (maxY - minY); }
        else { x = maxX - 10; y = minY + this.rng() * (maxY - minY); }
      }

      if (Math.hypot(x - this.player.x, y - this.player.y) < SAFE_SPAWN_DIST) continue;
      if (this.cover.some((c) => x > c.x - 22 && x < c.x + c.w + 22 && y > c.y - 22 && y < c.y + c.h + 22)) continue;
      if (this.enemies.some((e) => e.phase !== 'dead' && Math.hypot(e.x - x, e.y - y) < 44)) continue;
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
      nextDecisionTime: now + Math.max(250, 700 / rule.enemySpeedMultiplier),
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
    this.fireCooldown = rule.playerFireCooldownMs;
    const shot = this.player.fireBullet(this.player.x, this.player.y, this.simNow);
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
    const rule = hordeDifficultyRules[this.config.difficulty];

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
            if (b.isCounter) {
              this.counterKills++;
              if (rule.counterKillHeal > 0 && this.health < rule.playerMaxHealth) {
                const siphon = Math.min(rule.playerMaxHealth - this.health, rule.counterKillHeal);
                this.health += siphon;
                this.fx.callout(this.player.x, this.player.y - 26, `+${siphon} HP`, '#86efac', false);
              }
            }
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
      mapId: this.activeMapId,
      seed: this.config.seed ?? 0,
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

  private renderMinimap(): void {
    const cam = this.cameras.main;
    const mapW = 108;
    const mapH = 65;
    const mx = cam.width - mapW - 10;
    const my = cam.height - mapH - 10;
    const sx = mapW / HORDE_ARENA_WIDTH;
    const sy = mapH / HORDE_ARENA_HEIGHT;
    const mapDef = hordeMaps[this.activeMapId];

    this.minimapGfx.clear();
    // Minimap backdrop
    this.minimapGfx.fillStyle(0x090d14, 0.62);
    this.minimapGfx.fillRect(mx, my, mapW, mapH);
    this.minimapGfx.lineStyle(1, mapDef.coverAccent, 0.55);
    this.minimapGfx.strokeRect(mx, my, mapW, mapH);

    // Randomized cover blocks
    this.minimapGfx.fillStyle(0x64748b, 0.72);
    for (const c of this.cover) {
      this.minimapGfx.fillRect(mx + c.x * sx, my + c.y * sy, Math.max(2, c.w * sx), Math.max(2, c.h * sy));
    }

    // Current viewport box
    this.minimapGfx.lineStyle(1, 0xe2e8f0, 0.28);
    this.minimapGfx.strokeRect(
      mx + cam.scrollX * sx,
      my + cam.scrollY * sy,
      cam.width * sx,
      cam.height * sy,
    );

    // Enemy blips
    for (const e of this.enemies) {
      if (e.phase === 'dead') continue;
      const col = e.hordeKind === 'striker' ? 0xc084fc : e.hordeKind === 'rusher' ? 0xfb923c : 0xf87171;
      this.minimapGfx.fillStyle(col, 0.95);
      this.minimapGfx.fillCircle(mx + e.x * sx, my + e.y * sy, e.hordeKind === 'striker' ? 2.2 : 1.7);
    }

    // Player blip
    this.minimapGfx.fillStyle(0x4ade80, 1);
    this.minimapGfx.fillCircle(mx + this.player.x * sx, my + this.player.y * sy, 2.5);
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
        this.telegraphGraphics.lineBetween(e.x, e.y, e.x + e.dirX * 320, e.y + e.dirY * 320);
      } else if (e.hordeKind === 'striker') {
        const base = Math.atan2(e.dirY, e.dirX);
        const arc = 0.52;
        this.telegraphGraphics.lineStyle(e.dirLocked ? 2 : 1.2, e.dirLocked ? 0xc084fc : 0xfbbf24, e.dirLocked ? 0.85 : 0.45);
        for (const offset of [-arc / 2, 0, arc / 2]) {
          this.telegraphGraphics.lineBetween(
            e.x,
            e.y,
            e.x + Math.cos(base + offset) * 250,
            e.y + Math.sin(base + offset) * 250,
          );
        }
      } else {
        const laneLen = 215;
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

    this.renderMinimap();
  }

  private updateHUD(): void {
    const rule = hordeDifficultyRules[this.config.difficulty];
    const durationSec = hordeDurationRules[this.config.duration].seconds;
    const elapsedSec = this.elapsedRealMs / 1000;

    const hitsMax = hordeHitsToFall(this.config.difficulty);
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
    const mapTag = hordeMaps[this.activeMapId].shortName.toUpperCase();
    this.hudRight.setText(
      `${mapTag}  ·  ${rule.label.toUpperCase()} (${formatScore(rule.difficultyFactor)}×)  ·  W${this.currentWave}  ·  ${formatScore(this.score)}${comboTag}`,
    );

    this.counterText.setVisible(this.player.canCounter(this.simNow));
    this.hitFlash.setAlpha(0.32).setVisible(this.simNow < this.hitFlashEndTime);
  }

  private inBounds(b: CombatBullet): boolean {
    return b.x >= -50 && b.x <= HORDE_ARENA_WIDTH + 50 && b.y >= -50 && b.y <= HORDE_ARENA_HEIGHT + 50;
  }
}

function circleOverlap(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
}
