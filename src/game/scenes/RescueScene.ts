import Phaser from 'phaser';
import { newRun, completeMilestone, restartRescue, type RunState } from '../state';
import type { Difficulty } from '../rules';
import { combatTuning, difficultyRules, MAX_HEALTH } from '../rules';
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
import {
  SWITCH_HOLD_MS,
  SWITCH_KEEP_RADIUS,
  evaluateSwitchAttempt,
  switchHoldProgress,
  type RescueBeatId,
} from '../combat/rescue-switch';
import {
  LINA_INVULN_MS,
  LINA_MAX_HEALTH,
  LINA_RADIUS,
  applyLinaHit,
  chooseRescueTarget,
  createLinaDefenseState,
  isPlayerInterceptingLine,
  type LinaDefenseState,
  type LinaHitResult,
  type RescueFailureReason,
  type RescueTargetKind,
} from '../combat/rescue-defense';
import type { RescueBeatDef } from '../../content/encounters/rescue-beats';
import { rescueBeats } from '../../content/encounters/rescue-beats';
import { playCutsceneOverlay, isCutsceneActive } from '../../ui/cutscene-player';
import { loadPreferences } from '../../services/preferences';
import { SPRITE_DISPLAY, directionFrame4Dir } from '../sprite-metrics';

const PLAYER_RADIUS = 10;
const BULLET_RADIUS = 3.5;
const HIT_FLASH_MS = 130;
const HIT_TEXT_MS = 260;
const FIRE_COOLDOWN_MS = 260;
const BULLET_TTL_MS = 2000;
const REFLEX_TIME_SCALE = 0.24;

// Hard cover rectangles aligned to the painted props in twilight-ruins-warehouse-yard.png:
// left handcart, center stone wall (shielding Lina from the west while leaving east/south-east
// flanks open so machines can pressure her and K can step in front to intercept), and sandbags.
const COVER: CoverRect[] = [
  { x: 238, y: 162, w: 72, h: 52 },  // industrial handcart
  { x: 332, y: 185, w: 110, h: 66 }, // center stone wall beside tarp shelter
  { x: 538, y: 264, w: 114, h: 46 }, // sandbag barricade
];

// Scripted positions aligned to the warehouse yard landmarks.
const PLAYER_START = { x: 112, y: 236 }; // west service-lane entry
const LINA_START = { x: 462, y: 224 };   // sheltered beside the stone wall, exposed to east/south-east flanks
const MAI_MARKER = { x: 682, y: 170 };   // warm-lit covered safe alcove on top-right
const ISSHIN_POS = { x: 594, y: 244 };   // behind the sandbag barricade providing covering fire
const SWITCH_POS = { x: 518, y: 152 };   // glowing gate switch on the concrete pillar
const LINA_SAFE = { x: MAI_MARKER.x, y: MAI_MARKER.y };

const BEAT_ORDER: RescueBeatId[] = ['alley', 'hold', 'extraction'];

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
  private awardedCounterAttackIds = new Set<string>();
  private arenaBounds!: ArenaBounds;

  private fx!: ArenaFx;
  private coverGraphics!: Phaser.GameObjects.Graphics;
  private telegraphGraphics!: Phaser.GameObjects.Graphics;
  private switchProgressGraphics!: Phaser.GameObjects.Graphics;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private linaSprite!: Phaser.GameObjects.Sprite;
  private linaShadow!: Phaser.GameObjects.Ellipse;
  private linaLabel!: Phaser.GameObjects.Text;
  private maiSprite!: Phaser.GameObjects.Sprite;
  private isshinSprite!: Phaser.GameObjects.Sprite;
  private switchSprite!: Phaser.GameObjects.Arc;
  private switchHitZone!: Phaser.GameObjects.Zone;
  private switchLabel!: Phaser.GameObjects.Text;
  private enemySprites = new Map<string, Phaser.GameObjects.Sprite>();
  private enemyShadows = new Map<string, Phaser.GameObjects.Ellipse>();
  private enemyTargets = new Map<string, RescueTargetKind>();
  private bulletGraphics = new Map<string, Phaser.GameObjects.Arc>();
  private bulletOrigins = new Map<string, { x: number; y: number; targetKind: RescueTargetKind }>();
  private bulletSeq = 0;

  private linaDefense: LinaDefenseState = createLinaDefenseState();
  private linaHpGraphics!: Phaser.GameObjects.Graphics;
  private linaThreatLabel!: Phaser.GameObjects.Text;
  private linaFlashEndTime = 0;
  private interceptCount = 0;
  private defeatReason: RescueFailureReason = 'k-down';

  private reflexTint!: Phaser.GameObjects.Rectangle;
  private hitFlash!: Phaser.GameObjects.Rectangle;
  private hitText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private toastUntil = 0;
  private counterText!: Phaser.GameObjects.Text;
  private counterRing!: Phaser.GameObjects.Graphics;
  private pauseOverlay!: Phaser.GameObjects.Rectangle;
  private pauseTitle!: Phaser.GameObjects.Text;
  private pauseHint!: Phaser.GameObjects.Text;
  private teachingCard!: Phaser.GameObjects.Container;
  private endingBackground?: Phaser.GameObjects.Image;

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
  private teachingOpenedAt = 0;

  // Unified simulation clock (completely frozen on pause / teaching / defeat / cutscene)
  private simNow = 0;
  private paused = false;
  private defeated = false;
  private ended = false;

  private fireCooldown = 0;
  private hitFlashEndTime = 0;
  private hitTextEndTime = 0;
  private isshinCoverFireTime = 0;
  private lastGhostTime = 0;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() { super('rescue'); }

  init(data: { state?: RunState; difficulty?: Difficulty } = {}): void {
    const regState = this.registry.get('initialRunState') as RunState | null;
    const regDifficulty = (this.registry.get('difficulty') as Difficulty) ?? 'story';
    this.difficulty = data.difficulty ?? data.state?.difficulty ?? regState?.difficulty ?? regDifficulty;
    this.state = data.state ?? regState ?? newRun(this.difficulty);
    this.defeated = false;
    this.ended = false;
    this.paused = false;
    this.teachingPaused = false;
    this.simNow = 0;
    this.linaDefense = createLinaDefenseState();
    this.interceptCount = 0;
    this.defeatReason = this.state.health <= 0 ? 'k-down' : 'lina-down';
    if (this.state.rescueStatus === 'failed') {
      this.defeated = true;
      if (this.defeatReason === 'lina-down') {
        this.linaDefense.health = 0;
      }
    } else if (this.state.rescueStatus === 'not-started') {
      this.state = { ...this.state, rescueStatus: 'active' };
    }
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
    if (!this.textures.exists('sprite-mai')) {
      this.load.spritesheet('sprite-mai', '/assets/characters/mai/mai-interaction-sprites-48px.png', {
        frameWidth: 48, frameHeight: 48,
      });
    }
    if (!this.textures.exists('sprite-isshin')) {
      this.load.spritesheet('sprite-isshin', '/assets/characters/isshin/isshin-interaction-sprites-48px.png', {
        frameWidth: 48, frameHeight: 48,
      });
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
    if (!this.textures.exists('lina-idle')) {
      this.load.image('lina-idle', '/assets/characters/lina/lina-idle-48px.png');
    }
    if (!this.textures.exists('lina-shelter')) {
      this.load.image('lina-shelter', '/assets/characters/lina/lina-shelter-48px.png');
    }
    if (!this.textures.exists('bg-ending')) {
      this.load.image('bg-ending', '/assets/backgrounds/chapter-one-ending.png');
    }
    if (!this.textures.exists('counter-tutorial')) {
      this.load.image('counter-tutorial', '/assets/backgrounds/counter-unlocked-tutorial.png');
    }
    if (!this.textures.exists('bg-rescue')) {
      this.load.image('bg-rescue', '/assets/backgrounds/twilight-ruins-warehouse-yard.png');
    }
    if (!this.textures.exists('breach-machine')) {
      this.load.spritesheet('breach-machine', '/assets/characters/breach-machine/breach-machine-48px-4x4.png', {
        frameWidth: 48, frameHeight: 48,
      });
    }
  }

  create() {
    const cam = this.cameras.main;
    const width = cam.width;
    const height = cam.height;

    this.arenaBounds = { minX: 28, maxX: width - 28, minY: 146, maxY: height - 56 };
    this.simNow = 0;
    this.fireCooldown = 0;
    this.hitFlashEndTime = 0;
    this.hitTextEndTime = 0;
    this.isshinCoverFireTime = 0;
    this.lastGhostTime = 0;
    this.toastUntil = 0;
    this.enemies = [];
    this.bullets = [];
    this.enemySprites.clear();
    this.enemyShadows.clear();
    this.enemyTargets.clear();
    this.bulletGraphics.clear();
    this.bulletOrigins.clear();
    this.awardedCounterAttackIds.clear();
    this.damage = new DamageSystem();
    this.player = new Player();
    this.linaDefense = createLinaDefenseState();
    this.linaFlashEndTime = 0;
    this.interceptCount = 0;

    // Optional dev query override for inspecting a specific rescue beat cleanly.
    const params = new URLSearchParams(window.location.search);
    const devBeat = params.get('rescue_beat');
    const devBeatIdx = devBeat ? BEAT_ORDER.indexOf(devBeat as RescueBeatId) : -1;
    this.beatIndex = devBeatIdx >= 0 ? devBeatIdx : 0;

    this.beatStartTime = this.simNow;
    const beat = this.currentBeat();
    this.holdSecondsLeft = beat.holdSeconds ?? 0;
    this.holdTimerEndTime = this.simNow + (beat.holdSeconds ?? 0) * 1000;
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
      'W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,ESC,E,R,ENTER',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'ESC', 'E', 'R']);

    const onPointerDown = (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (currentlyOver.length > 0) return; // Don't misfire when clicking switch or UI panels
      audio.unlock();
      this.tryFire();
    };
    this.input.on('pointerdown', onPointerDown);

    document.body.dataset.scene = 'rescue';
    document.body.dataset.beat = this.beatId();
    audio.setSceneAudio('rescue', 'ruined-city');

    // Service lane arena backdrop
    if (this.textures.exists('bg-rescue')) {
      this.add.image(width / 2, height / 2, 'bg-rescue')
        .setDisplaySize(width, height)
        .setDepth(-1)
        .setAlpha(0.92);
    }

    // Subtle tactical ground outlines aligned to painted cover props
    this.coverGraphics = this.add.graphics().setDepth(5);
    this.coverGraphics.fillStyle(0x0f172a, 0.03);
    this.coverGraphics.lineStyle(1, 0x94a3b8, 0.14);
    for (const c of COVER) {
      this.coverGraphics.fillRect(c.x, c.y, c.w, c.h);
      this.coverGraphics.strokeRect(c.x, c.y, c.w, c.h);
    }

    this.fx = new ArenaFx(this);

    this.reflexTint = this.add.rectangle(0, 0, width, height, 0xfde047, 0.08)
      .setOrigin(0).setDepth(92).setVisible(false);

    // Player
    this.player.x = PLAYER_START.x;
    this.player.y = PLAYER_START.y;
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

    // Lina beside shelter cover with live world-space HP bar & threat alert
    this.linaShadow = this.add.ellipse(this.lina.x, this.lina.y + 16, 22, 8, 0x05070a, 0.45).setDepth(46);
    this.linaSprite = this.add.sprite(this.lina.x, this.lina.y, 'lina-shelter')
      .setDisplaySize(SPRITE_DISPLAY.rescueLina, SPRITE_DISPLAY.rescueLina)
      .setOrigin(0.5, 0.62)
      .setDepth(49);
    this.linaLabel = this.add.text(this.lina.x, this.lina.y + 22, 'Lina · Protect', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#fde68a',
      backgroundColor: '#0d1117d9',
      padding: { x: 4, y: 1 },
    }).setOrigin(0.5, 0).setDepth(55);
    this.linaHpGraphics = this.add.graphics().setDepth(56);
    this.linaThreatLabel = this.add.text(this.lina.x, this.lina.y - 42, 'TARGETED!', {
      fontFamily: 'monospace',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#fecaca',
      backgroundColor: '#991b1be6',
      padding: { x: 5, y: 2 },
    }).setOrigin(0.5, 1).setDepth(57).setVisible(false);

    // Mai waiting in the lit safe alcove
    this.add.ellipse(MAI_MARKER.x, MAI_MARKER.y + 18, 24, 9, 0x05070a, 0.48).setDepth(46);
    this.maiSprite = this.add.sprite(MAI_MARKER.x, MAI_MARKER.y, 'sprite-mai', 0)
      .setDisplaySize(SPRITE_DISPLAY.rescueMai, SPRITE_DISPLAY.rescueMai)
      .setOrigin(0.5, 0.62)
      .setDepth(49);
    this.add.text(MAI_MARKER.x, MAI_MARKER.y + 24, 'Mai · Safe', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#86efac',
      backgroundColor: '#0d1117d9',
      padding: { x: 4, y: 1 },
    }).setOrigin(0.5, 0).setDepth(55);

    // Isshin behind the sandbag barricade providing covering fire
    this.add.ellipse(ISSHIN_POS.x, ISSHIN_POS.y + 18, 24, 9, 0x05070a, 0.48).setDepth(46);
    this.isshinSprite = this.add.sprite(ISSHIN_POS.x, ISSHIN_POS.y, 'sprite-isshin', 0)
      .setDisplaySize(SPRITE_DISPLAY.rescueIsshin, SPRITE_DISPLAY.rescueIsshin)
      .setOrigin(0.5, 0.62)
      .setDepth(48);
    this.add.text(ISSHIN_POS.x, ISSHIN_POS.y + 24, 'Isshin', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#cbd5e1',
      backgroundColor: '#0d1117d9',
      padding: { x: 4, y: 1 },
    }).setOrigin(0.5, 0).setDepth(55);

    // Extraction gate switch beacon — supports BOTH E key AND direct mouse click!
    this.switchSprite = this.add.circle(SWITCH_POS.x, SWITCH_POS.y, 16, 0x475569, 0.22)
      .setStrokeStyle(2, 0x94a3b8, 0.7)
      .setDepth(47);
    this.tweens.add({
      targets: this.switchSprite,
      scale: 1.15,
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.switchProgressGraphics = this.add.graphics().setDepth(56);
    this.switchLabel = this.add.text(SWITCH_POS.x, SWITCH_POS.y - 22, 'Gate locked', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#94a3b8',
      backgroundColor: '#0d1117e8',
      padding: { x: 5, y: 2 },
    }).setOrigin(0.5, 1).setDepth(57);

    // Interactive click target over the gate switch pillar (consumes click so it never misfires pistol)
    this.switchHitZone = this.add.zone(SWITCH_POS.x, SWITCH_POS.y, 58, 58)
      .setInteractive({ useHandCursor: true })
      .setDepth(58);
    this.switchHitZone.on('pointerdown', () => {
      if (this.teachingPaused || this.paused || this.defeated || this.ended) return;
      audio.unlock();
      this.trySwitch();
    });

    this.telegraphGraphics = this.add.graphics().setDepth(45);

    // Hit feedback
    this.hitFlash = this.add.rectangle(0, 0, width, height, 0xffffff, 0)
      .setOrigin(0).setDepth(105).setVisible(false);
    this.hitText = this.add.text(width / 2, height / 2 - 70, 'HIT', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#090d14', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(110).setVisible(false);

    // HUD top bar + live beat objective strip
    this.add.rectangle(0, 0, width, 34, 0x090d14, 0.86).setOrigin(0).setDepth(99);
    this.hudText = this.add.text(14, 8, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#e2e8f0',
    }).setDepth(100);
    this.objectiveText = this.add.text(width / 2, 42, '', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#fde68a',
      backgroundColor: '#0d1117e6',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5, 0).setDepth(100);

    this.toastText = this.add.text(width / 2, height - 26, '', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#fef08a',
      backgroundColor: '#0d1117f0',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5, 1).setDepth(102).setVisible(false);

    this.counterText = this.add.text(width / 2, 72, '', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fde047',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100).setVisible(false);
    this.counterRing = this.add.graphics().setDepth(52);

    // Pause overlay (properly stores title/hint refs!)
    this.pauseOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.58)
      .setOrigin(0).setDepth(120).setVisible(false).setScrollFactor(0);
    this.pauseTitle = this.add.text(width / 2, height / 2 - 18, 'PAUSED', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(121).setVisible(false).setScrollFactor(0);
    this.pauseHint = this.add.text(width / 2, height / 2 + 16, 'Esc · Resume', {
      fontSize: '15px', fontFamily: 'monospace', color: '#cbd5e1',
    }).setOrigin(0.5).setDepth(121).setVisible(false).setScrollFactor(0);

    // Teaching card (shown once during the hold after the first perfect dodge).
    this.teachingCard = this.add.container(width / 2, height / 2).setDepth(130).setVisible(false);
    const cardBg = this.add.rectangle(0, 0, 480, 266, 0x111827, 0.96).setStrokeStyle(2, 0xfde047);
    const cardTitle = this.add.text(0, -100, 'REFLEX COUNTER UNLOCKED', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fde047',
    }).setOrigin(0.5);
    const cardBody = this.add.text(
      0, -68,
      'Dodge past an incoming hit to trigger Bullet-Time.\nClick during REFLEX COUNTER to fire a piercing Counter Rail!',
      { fontSize: '12px', fontFamily: 'Segoe UI, Arial, sans-serif', color: '#e2e8f0', align: 'center' },
    ).setOrigin(0.5).setLineSpacing(3);
    const cardItems: Phaser.GameObjects.GameObject[] = [cardBg, cardTitle, cardBody];
    if (this.textures.exists('counter-tutorial')) {
      const tutImg = this.add.image(0, 16, 'counter-tutorial')
        .setDisplaySize(420, 110)
        .setOrigin(0.5);
      cardItems.push(tutImg);
    }
    const cardHint = this.add.text(0, 108, 'Click, Space, or E to continue', {
      fontSize: '12px', fontFamily: 'monospace', color: '#fde68a',
    }).setOrigin(0.5);
    cardItems.push(cardHint);
    this.teachingCard.add(cardItems);
    this.teachingCard.setSize(480, 266);
    this.teachingCard.setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(0, 0, 480, 266),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });
    this.teachingCard.on('pointerdown', () => this.dismissTeaching());

    // Chapter One Ending renders via the animated DOM overlay (want:chapter-ending).
    this.endingBackground = this.add.image(width / 2, height / 2, 'bg-ending').setOrigin(0.5)
      .setDisplaySize(width, height).setDepth(125).setVisible(false);

    const onGameHidden = () => this.setPaused(true);
    const onGameVisible = () => this.setPaused(false, true);
    const onRescueRestart = () => {
      if (this.defeated) this.restartMission();
    };
    this.game.events.on('hidden', onGameHidden);
    this.game.events.on('visible', onGameVisible);
    window.addEventListener('want:rescue-restart', onRescueRestart);

    this.events.once('shutdown', () => {
      this.game.events.off('hidden', onGameHidden);
      this.game.events.off('visible', onGameVisible);
      window.removeEventListener('want:rescue-restart', onRescueRestart);
      this.input.keyboard?.removeAllKeys(true);
      this.input.off('pointerdown', onPointerDown);
    });

    this.syncSwitchVisuals();
    this.syncGraphics();
    this.updateHUD();

    if (this.defeated) {
      this.showGameOver();
    }
  }

  // ---------- beat helpers ----------

  private currentBeat(): RescueBeatDef {
    return rescueBeats[this.beatIndex];
  }

  private beatId(): RescueBeatId {
    return BEAT_ORDER[this.beatIndex];
  }

  private showToast(message: string, durationMs = 2400): void {
    this.toastText.setText(message).setVisible(true);
    this.toastUntil = performance.now() + durationMs;
  }

  private spawnEnemy(kind: EnemyKind, x: number, y: number, now: number): boolean {
    if (this.enemies.filter((e) => e.phase !== 'dead').length >= this.currentBeat().maxActive) {
      return false;
    }
    this.enemies.push(makeEnemy(kind, x, y, this.difficulty, now));
    return true;
  }

  // ---------- main loop ----------

  update(_time: number, rawDt: number) {
    if (isCutsceneActive()) return;

    if (this.defeated) {
      // Dedicated DOM Restart Rescue overlay handles R / Enter / Esc cleanly.
      return;
    }

    if (this.ended) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.ESC) || Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
        this.returnToTitle();
      }
      return;
    }

    // Update real-time toast expiry even if paused
    if (this.toastText.visible && performance.now() >= this.toastUntil) {
      this.toastText.setVisible(false);
    }

    // Teaching card accepts Space or E dismissal (after a brief 350ms guard)
    if (this.teachingPaused || this.teachingCard.visible) {
      if (
        performance.now() - this.teachingOpenedAt > 350 &&
        (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.E))
      ) {
        this.dismissTeaching();
      }
      return;
    }

    // Esc toggles pause
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.setPaused(!this.paused);
      return;
    }

    if (this.paused) return;

    const clampedDt = Math.min(rawDt, 50);
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

    // Mouse-world aim
    const p = this.input.activePointer;
    this.player.setAim(p.worldX - this.player.x, p.worldY - this.player.y);

    // Space dodge
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && this.player.canDodge(this.simNow)) {
      audio.unlock();
      this.player.startDodge(this.simNow);
      audio.playCue('dodge');
    }

    // R active snap-reload
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      audio.unlock();
      const res = this.player.triggerReload(this.simNow);
      if (res === 'snap') {
        audio.playCue('counter-ready');
        this.fx.callout(this.player.x, this.player.y - 30, 'SNAP RELOAD!', '#fde047', true);
        this.fx.sparks(this.player.x, this.player.y, 0xfde047, 8, 26);
      } else if (res === 'started') {
        audio.playCue('ui-confirm');
      }
    }

    // E: gate switch interaction
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      audio.unlock();
      this.trySwitch();
    }

    this.player.tickDodge(this.simNow);
    this.player.tickReload(this.simNow);
    this.player.updateMovement(dtSec, COVER);
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

    // Enemy tactical AI — machines actively hunt Lina AND pressure K.
    const newBullets: {
      x: number; y: number; vx: number; vy: number; speed: number;
      damage: number; attackId: string | null;
      originX: number; originY: number; targetKind: RescueTargetKind;
    }[] = [];
    const linaSafe = this.lina.phase === 'safe';
    for (let idx = 0; idx < this.enemies.length; idx++) {
      const e = this.enemies[idx];
      if (e.phase === 'dead') continue;
      const targetKind = chooseRescueTarget({
        enemy: e,
        enemyIndex: idx,
        beatId: this.beatId(),
        player: this.player,
        lina: this.lina,
        linaSafe,
        prevTarget: this.enemyTargets.get(e.id),
      });
      this.enemyTargets.set(e.id, targetKind);
      const target = targetKind === 'lina'
        ? { x: this.lina.x, y: this.lina.y, radius: LINA_RADIUS }
        : { x: this.player.x, y: this.player.y, radius: PLAYER_RADIUS };

      const res = updateEnemy(
        e,
        target,
        this.simNow,
        dtSec,
        COVER,
        this.arenaBounds,
        this.difficulty,
      );
      if (res.startedTelegraph === 'scout') {
        audio.playCue('scout-windup');
        if (targetKind === 'lina') {
          this.fx.callout(e.x, e.y - 30, 'AIMING AT LINA!', '#fca5a5', true);
        }
      } else if (res.startedTelegraph === 'rusher') {
        audio.playCue('rusher-windup');
        if (targetKind === 'lina') {
          this.fx.callout(e.x, e.y - 30, 'CHARGING LINA!', '#fca5a5', true);
        }
      }
      if (res.slammedCover) {
        audio.playCue('lane-crash');
        this.fx.shake(120, 0.008);
        this.fx.sparks(e.x, e.y, 0xfde047, 10, 34);
        this.fx.callout(e.x, e.y - 34, 'STAGGERED! 1.5x', '#fde047', true);
      }
      for (const b of res.bullets) {
        newBullets.push({ ...b, originX: e.x, originY: e.y, targetKind });
      }
    }

    // Fixed-queue spawns: only consume queue entry when a slot is available (never silently drop!)
    while (
      this.nextSpawnIndex < this.spawnQueue.length &&
      this.simNow - this.beatStartTime >= this.spawnQueue[this.nextSpawnIndex].timeMs
    ) {
      const s = this.spawnQueue[this.nextSpawnIndex];
      if (!this.spawnEnemy(s.kind, s.x, s.y, this.simNow)) break;
      this.nextSpawnIndex++;
    }

    // Hold-beat timer
    if (this.beatId() === 'hold' && !this.holdExpired && this.simNow >= this.holdTimerEndTime) {
      this.holdExpired = true;
      this.holdSecondsLeft = 0;
    }

    // Bullets + cover ricochets
    for (const b of this.bullets) {
      updateBullet(b, dtSec);
      if (!b.hit && bulletHitsCover(b, BULLET_RADIUS, COVER)) {
        b.hit = true;
        this.fx.sparks(b.x, b.y, b.owner === 'player' ? 0x94a3b8 : 0xf87171, 5, 18);
      }
    }
    for (const b of newBullets) {
      audio.playCue('gunshot');
      const id = `b-${this.allocBulletId()}`;
      this.bullets.push({
        id,
        x: b.x, y: b.y, prevX: b.x, prevY: b.y,
        vx: b.vx, vy: b.vy, speed: b.speed, damage: b.damage,
        owner: 'enemy', attackId: b.attackId, born: this.simNow, ttl: BULLET_TTL_MS,
      });
      this.bulletOrigins.set(id, { x: b.originX, y: b.originY, targetKind: b.targetKind });
    }

    this.resolveCollisions(this.simNow);

    // Death (K or Lina) wins same-frame race over milestones
    if (this.defeated) {
      this.syncGraphics();
      this.updateHUD();
      this.handleDefeat(this.defeatReason);
      return;
    }

    // Isshin scripted covering fire during hold/extraction
    if (this.beatId() !== 'alley' && this.simNow - this.isshinCoverFireTime > 3600) {
      const target = this.enemies.find((e) => e.phase !== 'dead');
      if (target) {
        this.isshinCoverFireTime = this.simNow;
        const dxI = target.x - ISSHIN_POS.x;
        const dyI = target.y - ISSHIN_POS.y;
        const len = Math.hypot(dxI, dyI) || 1;
        this.bullets.push({
          id: `b-${this.allocBulletId()}`,
          x: ISSHIN_POS.x, y: ISSHIN_POS.y,
          prevX: ISSHIN_POS.x, prevY: ISSHIN_POS.y,
          vx: dxI / len, vy: dyI / len, speed: 560, damage: 22,
          owner: 'player', attackId: null, born: this.simNow, ttl: BULLET_TTL_MS,
          isOvercharged: true, hitEnemyIds: [],
        });
        this.fx.muzzleFlash(ISSHIN_POS.x, ISSHIN_POS.y, dxI / len, dyI / len, false);
        audio.playCue('gunshot');
      }
    }

    this.updateSwitch(this.simNow);
    this.updateLina(this.simNow);

    this.enemies = this.enemies.filter((e) => e.phase !== 'dead');
    this.bullets = this.bullets.filter((b) => !b.hit && this.simNow - b.born < b.ttl && this.inBounds(b));
    const liveBulletIds = new Set(this.bullets.map((b) => b.id));
    for (const id of this.bulletOrigins.keys()) {
      if (!liveBulletIds.has(id)) this.bulletOrigins.delete(id);
    }

    this.maybeAdvanceBeat();

    this.syncGraphics();
    this.fx.renderFrame(this.player, this.enemies, this.bullets, p.worldX, p.worldY, this.simNow, realDtSec);
    this.reflexTint.setVisible(this.player.canCounter(this.simNow));
    this.updateHUD();

    if ((this.state.health <= 0 || this.linaDefense.health <= 0) && !this.defeated) {
      this.handleDefeat(this.linaDefense.health <= 0 ? 'lina-down' : 'k-down');
    }
  }

  private allocBulletId(): number { return ++this.bulletSeq; }

  private clampPlayer() {
    this.player.x = Math.min(Math.max(this.player.x, this.arenaBounds.minX), this.arenaBounds.maxX);
    this.player.y = Math.min(Math.max(this.player.y, this.arenaBounds.minY), this.arenaBounds.maxY);
  }

  private tryFire() {
    if (this.teachingPaused || this.paused || this.defeated || this.ended) return;
    if (this.fireCooldown > 0 && !this.player.canCounter(this.simNow)) return;
    if (!this.player.canFire(this.simNow)) {
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
      id: `b-${this.allocBulletId()}`,
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
      audio.playCue('counter-impact');
      this.fx.shake(140, 0.009);
      this.fx.callout(this.player.x, this.player.y - 32, 'COUNTER RAIL!', '#fde047', true);
    } else {
      audio.playCue('gunshot');
      this.fx.shake(50, 0.0025);
    }
  }

  private trySwitch() {
    const dist = Math.hypot(this.player.x - SWITCH_POS.x, this.player.y - SWITCH_POS.y);
    const outcome = evaluateSwitchAttempt({
      beatId: this.beatId(),
      gateOpen: this.gateOpen,
      holding: this.switchHold.active,
      distancePx: dist,
    });

    if (outcome === 'locked') {
      audio.playCue('metal-drop');
      const reason = this.beatId() === 'alley'
        ? 'Gate locked — clear the alley machines first!'
        : `Gate locked — hold Lina's shelter for ${Math.max(1, this.holdSecondsLeft)}s!`;
      this.showToast(reason);
      this.fx.callout(SWITCH_POS.x, SWITCH_POS.y - 34, 'LOCKED', '#94a3b8');
      return;
    }
    if (outcome === 'too-far') {
      this.showToast('Move closer to the gate switch to pull it!');
      this.fx.callout(SWITCH_POS.x, SWITCH_POS.y - 34, 'MOVE CLOSER', '#fde047');
      return;
    }
    if (outcome === 'already-open') {
      this.showToast('Gate is already open — clear remaining machines!');
      return;
    }
    if (outcome === 'started') {
      audio.playCue('ui-confirm');
      this.switchHold = { active: true, startTime: this.simNow };
      this.showToast('Pulling gate switch — stay near the pillar for 1s!', 1300);
    }
  }

  private updateSwitch(effNow: number) {
    if (!this.switchHold.active) return;
    // Interrupt cleanly if K leaves the switch pillar
    const dist = Math.hypot(this.player.x - SWITCH_POS.x, this.player.y - SWITCH_POS.y);
    if (dist > SWITCH_KEEP_RADIUS) {
      this.switchHold = { active: false, startTime: 0 };
      this.showToast('Moved away from gate switch — pull again!', 1600);
      return;
    }
    if (effNow - this.switchHold.startTime >= SWITCH_HOLD_MS) {
      this.gateOpen = true;
      this.switchHold = { active: false, startTime: 0 };
      audio.playCue('gate-open');
      this.fx.sparks(SWITCH_POS.x, SWITCH_POS.y, 0x4ade80, 14, 42);
      this.fx.callout(SWITCH_POS.x, SWITCH_POS.y - 36, 'GATE OPEN!', '#4ade80', true);
      this.showToast('Gate unlocked! Clear any remaining machines so Lina can cross to Mai.', 3000);
    }
  }

  private updateLina(effNow: number) {
    if (this.beatId() === 'alley' || this.beatId() === 'hold') {
      this.lina.x = LINA_START.x;
      this.lina.y = LINA_START.y;
      this.lina.phase = 'behind-cover';
      return;
    }
    if (this.beatId() === 'extraction' && this.gateOpen && this.lina.phase !== 'safe') {
      const active = this.enemies.some((e) => e.phase !== 'dead');
      const allSpawned = this.nextSpawnIndex >= this.spawnQueue.length;
      if (!active && allSpawned && this.lina.phase !== 'moving-to-mai') {
        this.lina.phase = 'moving-to-mai';
        this.lina.moveStartTime = effNow;
        this.showToast('Lane clear! Lina is running to Mai!', 2200);
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
    this.linaShadow.setPosition(this.lina.x, this.lina.y + 16);
    this.linaLabel.setPosition(this.lina.x, this.lina.y + 22);
    const linaTex = this.lina.phase === 'behind-cover' ? 'lina-shelter' : 'lina-idle';
    if (this.linaSprite.texture.key !== linaTex) {
      this.linaSprite.setTexture(linaTex);
      this.linaSprite.setDisplaySize(SPRITE_DISPLAY.rescueLina, SPRITE_DISPLAY.rescueLina);
    }
  }

  private grantRescue() {
    const next = completeMilestone(this.state, 'girl-rescued');
    if (next !== this.state) {
      this.state = next;
      saveRun(this.state);
    }
    this.ended = true;
    this.paused = true;
    this.counterText.setVisible(false);
    this.reflexTint.setVisible(false);

    const prefs = loadPreferences();
    const reducedMotion = prefs.status === 'ok' ? prefs.preferences.reducedMotion === 'reduce' : false;
    playCutsceneOverlay({
      cutsceneId: 'c04',
      reducedMotion,
      onComplete: () => {
        this.showEnding();
      },
    });
  }

  private maybeAdvanceBeat() {
    const active = this.enemies.filter((e) => e.phase !== 'dead').length;
    const allSpawned = this.nextSpawnIndex >= this.spawnQueue.length;

    if (this.beatId() === 'alley' && active === 0 && allSpawned) {
      this.advanceTo('hold');
      this.showToast('Alley clear! Hold Lina\'s shelter for 45s — Space to Reflex Dodge!', 3000);
    } else if (this.beatId() === 'hold' && this.holdExpired) {
      this.advanceTo('extraction');
      audio.playCue('resolve');
      this.showToast('Gate power restored! Move to the Gate Switch and press E or Click it!', 4000);
    }
  }

  private advanceTo(nextId: RescueBeatId) {
    const target = BEAT_ORDER.indexOf(nextId);
    if (target <= this.beatIndex) return;
    this.beatIndex = target;
    document.body.dataset.beat = nextId;
    this.beatStartTime = this.simNow;
    const beat = this.currentBeat();
    this.holdSecondsLeft = beat.holdSeconds ?? 0;
    this.holdTimerEndTime = this.beatStartTime + (beat.holdSeconds ?? 0) * 1000;
    this.spawnQueue = [...beat.spawns];
    this.nextSpawnIndex = 0;
    this.gateOpen = false;
    this.switchHold = { active: false, startTime: 0 };
    for (const e of this.enemies) e.attackId = null;
    this.syncSwitchVisuals();
    this.updateHUD();
  }

  // ---------- collisions / damage / counter ----------

  private resolveCollisions(effNow: number) {
    // Player bullets damage enemies (piercing Counter Rail shots pass through!)
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
          if (b.isCounter && e.health > 0) staggerEnemy(e, effNow, 1200);

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
            audio.playCue('machine-disabled');
            this.fx.sparks(e.x, e.y, 0xfde047, 12, 36);
            this.fx.shake(80, 0.005);
          } else {
            audio.playCue('machine-hit');
          }
          if (!b.piercing) break;
        }
      }
    }

    const dodgeImmune = this.player.isDodgeInvulnerable(effNow);
    const linaCanBeHit = this.lina.phase !== 'safe' && this.linaDefense.health > 0;

    // 1. Enemy projectiles vs K FIRST (allows body-blocking & Reflex-Dodge interception for Lina!)
    for (const b of this.bullets) {
      if (b.owner !== 'enemy' || b.hit) continue;
      const origin = this.bulletOrigins.get(b.id);
      const aimedAtLina = Boolean(
        origin
        && (origin.targetKind === 'lina'
          || isPlayerInterceptingLine(origin.x, origin.y, this.lina.x, this.lina.y, this.player.x, this.player.y)),
      );

      if (dodgeImmune) {
        if (
          b.attackId &&
          !this.awardedCounterAttackIds.has(b.attackId) &&
          circleOverlap(b.x, b.y, BULLET_RADIUS, this.player.x, this.player.y, PLAYER_RADIUS + PERFECT_DODGE_GRAZE_MARGIN)
        ) {
          this.grantCounter(b.attackId, effNow);
          if (aimedAtLina) {
            // Deflect shots aimed at Lina when K Reflex-Dodges across the firing lane!
            b.hit = true;
            this.interceptCount++;
            this.fx.sparks(b.x, b.y, 0xfde047, 10, 30);
            this.fx.callout(this.player.x, this.player.y - 34, 'INTERCEPTED!', '#fde047', true);
          }
        }
        continue;
      }

      if (circleOverlap(b.x, b.y, BULLET_RADIUS, this.player.x, this.player.y, PLAYER_RADIUS)) {
        b.hit = true;
        const res = this.damage.acceptHit(this.state, b.attackId, effNow);
        if (res) {
          if (aimedAtLina) {
            this.interceptCount++;
            this.fx.callout(this.player.x, this.player.y - 34, 'BODY BLOCK!', '#fbbf24', true);
          }
          this.applyHit(res, effNow);
        }
        continue;
      }

      // 2. Enemy projectiles vs LINA SECOND (only if K didn't intercept it!)
      if (linaCanBeHit && circleOverlap(b.x, b.y, BULLET_RADIUS, this.lina.x, this.lina.y, LINA_RADIUS)) {
        b.hit = true;
        const linaRes = applyLinaHit(this.linaDefense, b.attackId, this.difficulty, effNow);
        if (linaRes.hit) this.applyLinaDamage(linaRes, effNow);
      }
    }

    // 3. Committed Rusher contact vs K FIRST, then Lina SECOND
    for (const e of this.enemies) {
      if (e.phase !== 'committed' || !e.attackId) continue;
      const huntingLina = this.enemyTargets.get(e.id) === 'lina';

      if (dodgeImmune) {
        if (
          !this.awardedCounterAttackIds.has(e.attackId) &&
          circleOverlap(e.x, e.y, e.radius, this.player.x, this.player.y, PLAYER_RADIUS + PERFECT_DODGE_GRAZE_MARGIN)
        ) {
          this.grantCounter(e.attackId, effNow);
          if (huntingLina) {
            staggerEnemy(e, effNow, 700);
            this.interceptCount++;
            this.fx.sparks(e.x, e.y, 0xfde047, 10, 32);
            this.fx.callout(e.x, e.y - 34, 'INTERCEPTED!', '#fde047', true);
          }
        }
        continue;
      }

      if (circleOverlap(this.player.x, this.player.y, PLAYER_RADIUS, e.x, e.y, e.radius)) {
        const res = this.damage.acceptHit(this.state, e.attackId, effNow);
        if (res) {
          if (huntingLina) {
            // K's body-block halts the Rusher's charge so it cannot plow through K into Lina!
            staggerEnemy(e, effNow, 750);
            this.interceptCount++;
            this.fx.callout(this.player.x, this.player.y - 34, 'BODY BLOCK!', '#fbbf24', true);
          }
          this.applyHit(res, effNow);
        }
        continue;
      }

      if (linaCanBeHit && circleOverlap(this.lina.x, this.lina.y, LINA_RADIUS, e.x, e.y, e.radius)) {
        const linaRes = applyLinaHit(this.linaDefense, e.attackId, this.difficulty, effNow);
        if (linaRes.hit) {
          this.applyLinaDamage(linaRes, effNow);
          e.phase = 'recovering';
          e.recoverEndTime = effNow + 680;
          e.attackId = null;
        }
      }
    }

    if (this.player.counterActive && effNow >= this.player.counterEndTime) {
      this.player.clearCounter();
    }
  }

  private applyHit(res: { state: RunState; killed: boolean }, effNow: number) {
    this.state = res.state;
    saveRun(this.state);
    this.player.clearCounter();
    if (this.switchHold.active) {
      this.switchHold = { active: false, startTime: 0 };
      this.showToast('Hit interrupted the gate switch — pull it again!', 2000);
    }
    this.hitFlashEndTime = effNow + HIT_FLASH_MS;
    this.hitTextEndTime = effNow + HIT_TEXT_MS;
    audio.playCue('k-hit');
    this.fx.shake(160, 0.011);
    this.fx.sparks(this.player.x, this.player.y, 0xef4444, 10, 32);
    if (res.killed) {
      this.defeatReason = 'k-down';
      this.defeated = true;
    }
  }

  private applyLinaDamage(res: LinaHitResult, effNow: number) {
    this.linaFlashEndTime = effNow + 240;
    audio.playCue('k-hit');
    this.fx.shake(175, 0.012);
    this.fx.sparks(this.lina.x, this.lina.y, 0xf87171, 14, 38);
    this.fx.callout(this.lina.x, this.lina.y - 36, `LINA -${res.damage} HP!`, '#f87171', true);
    this.showToast(`Lina took a hit (${res.remainingHealth}/${LINA_MAX_HEALTH} HP) — intercept or eliminate attackers!`, 2400);
    if (res.defeated) {
      this.state = { ...this.state, rescueStatus: 'failed' };
      saveRun(this.state);
      this.defeatReason = 'lina-down';
      this.defeated = true;
    }
  }

  private grantCounter(attackId: string, effNow: number) {
    if (this.player.counterActive) return;
    this.awardedCounterAttackIds.add(attackId);
    if (this.beatId() === 'hold' && !this.counterTaught && !this.state.counterUnlocked) {
      this.counterTaught = true;
      this.teachingPaused = true;
      this.teachingOpenedAt = performance.now();
      this.teachingCard.setVisible(true);
      audio.playCue('counter-ready');
      return;
    }
    this.awardCounter(attackId, effNow);
  }

  private dismissTeaching() {
    if (!this.teachingCard.visible) return;
    this.teachingCard.setVisible(false);
    this.teachingPaused = false;
    this.state.counterUnlocked = true;
    saveRun(this.state);
    this.awardCounter(null, this.simNow);
  }

  private awardCounter(attackId: string | null, effNow: number) {
    this.player.openCounter(effNow, attackId ?? null);
    audio.playCue('counter-ready');
    this.fx.reflexFlash(this.player.x, this.player.y);
    this.counterText.setText('REFLEX COUNTER — CLICK TO FIRE RAIL').setVisible(true);
  }

  private handleDefeat(reason: RescueFailureReason) {
    if (this.paused && this.defeated && this.state.rescueStatus === 'failed') {
      // Guard against duplicate dispatches on the same defeat.
      return;
    }
    this.defeatReason = reason;
    this.defeated = true;
    this.paused = true;
    if (this.state.rescueStatus !== 'failed') {
      this.state = { ...this.state, rescueStatus: 'failed' };
    }
    saveRun(this.state);
    audio.playCue('failure');
    this.counterText.setVisible(false);
    this.reflexTint.setVisible(false);
    this.linaThreatLabel.setVisible(false);
    this.showGameOver();
  }

  private restartMission() {
    audio.playCue('ui-confirm');
    audio.setSceneAudio('rescue', 'ruined-city');
    this.defeated = false;
    this.paused = false;
    this.ended = false;
    this.simNow = 0;
    this.fireCooldown = 0;
    this.hitFlashEndTime = 0;
    this.hitTextEndTime = 0;
    this.linaFlashEndTime = 0;
    this.isshinCoverFireTime = 0;
    this.lastGhostTime = 0;
    this.teachingPaused = false;
    this.counterTaught = false;
    this.interceptCount = 0;
    this.defeatReason = 'k-down';
    this.awardedCounterAttackIds.clear();

    const failedState = { ...this.state, rescueStatus: 'failed' as const };
    this.state = restartRescue(failedState);
    saveRun(this.state);

    this.damage = new DamageSystem();
    this.player = new Player();
    this.player.x = PLAYER_START.x;
    this.player.y = PLAYER_START.y;
    this.linaDefense = createLinaDefenseState();

    this.enemies = [];
    this.bullets = [];
    this.enemySprites.forEach((s) => s.destroy());
    this.enemySprites.clear();
    this.enemyShadows.forEach((s) => s.destroy());
    this.enemyShadows.clear();
    this.enemyTargets.clear();
    this.bulletGraphics.forEach((g) => g.destroy());
    this.bulletGraphics.clear();
    this.bulletOrigins.clear();

    this.gateOpen = false;
    this.holdExpired = false;
    this.switchHold = { active: false, startTime: 0 };
    this.lina = {
      x: LINA_START.x, y: LINA_START.y, phase: 'behind-cover',
      moveStartTime: 0, moveDurationMs: 2000,
    };
    this.linaSprite.setTexture('lina-shelter')
      .setDisplaySize(SPRITE_DISPLAY.rescueLina, SPRITE_DISPLAY.rescueLina)
      .setPosition(this.lina.x, this.lina.y)
      .clearTint();
    this.linaShadow.setPosition(this.lina.x, this.lina.y + 16);
    this.linaLabel.setPosition(this.lina.x, this.lina.y + 22);

    this.beatIndex = 0;
    document.body.dataset.beat = this.beatId();
    this.beatStartTime = this.simNow;
    const beat = this.currentBeat();
    this.holdSecondsLeft = beat.holdSeconds ?? 0;
    this.holdTimerEndTime = this.beatStartTime + (beat.holdSeconds ?? 0) * 1000;
    this.spawnQueue = [...beat.spawns];
    this.nextSpawnIndex = 0;

    this.pauseOverlay.setVisible(false);
    this.pauseTitle.setVisible(false);
    this.pauseHint.setVisible(false);
    this.counterText.setVisible(false);
    this.hitText.setVisible(false);
    this.hitFlash.setVisible(false);
    this.teachingCard.setVisible(false);
    this.reflexTint.setVisible(false);
    this.linaThreatLabel.setVisible(false);

    this.syncSwitchVisuals();
    this.updateHUD();
    this.syncGraphics();
    this.showToast('Rescue restarted — K and Lina back at full health!', 2200);
  }

  private returnToTitle() {
    window.dispatchEvent(new CustomEvent('want:return-to-title'));
  }

  private showGameOver() {
    this.pauseOverlay.setVisible(true);
    window.dispatchEvent(
      new CustomEvent('want:rescue-failed', {
        detail: {
          reason: this.defeatReason,
          beatId: this.beatId(),
          difficultyLabel: difficultyRules[this.difficulty].label,
          kHealth: this.state.health,
          linaHealth: this.linaDefense.health,
          intercepts: this.interceptCount,
        },
      }),
    );
  }

  private showEnding() {
    this.ended = true;
    this.paused = true;
    this.counterText.setVisible(false);
    this.reflexTint.setVisible(false);
    this.endingBackground?.setVisible(true);
    audio.playCue('resolve');
    // Hand off to the animated, accessible DOM Chapter One Ending screen
    // (avoids Phaser container hit-area offsets and guarantees full interactivity).
    window.dispatchEvent(
      new CustomEvent('want:chapter-ending', {
        detail: { difficulty: this.difficulty },
      }),
    );
  }

  private setPaused(p: boolean, clearInputs = false) {
    if (this.defeated && !p) return;
    this.paused = p;
    this.pauseOverlay.setVisible(p);
    this.pauseTitle.setVisible(p);
    this.pauseHint.setVisible(p);
    if (!p && clearInputs) this.player.setDirection(0, 0);
  }

  private syncSwitchVisuals() {
    this.switchProgressGraphics.clear();
    if (this.gateOpen) {
      this.switchSprite.setFillStyle(0x4ade80, 0.35);
      this.switchSprite.setStrokeStyle(2, 0x86efac, 0.95);
      this.switchLabel.setText('Gate OPEN').setColor('#86efac');
      return;
    }

    if (this.beatId() !== 'extraction') {
      this.switchSprite.setFillStyle(0x475569, 0.16);
      this.switchSprite.setStrokeStyle(1.5, 0x94a3b8, 0.65);
      this.switchLabel.setText('Gate locked').setColor('#94a3b8');
      return;
    }

    if (this.switchHold.active) {
      const p = switchHoldProgress(this.switchHold.startTime, this.simNow);
      const pct = Math.round(p * 100);
      this.switchSprite.setFillStyle(0xfde047, 0.42);
      this.switchSprite.setStrokeStyle(2, 0xfef08a, 1);
      this.switchLabel.setText(`Opening… ${pct}%`).setColor('#fef08a');
      this.switchProgressGraphics.lineStyle(4, 0x4ade80, 1);
      this.switchProgressGraphics.beginPath();
      this.switchProgressGraphics.arc(
        SWITCH_POS.x,
        SWITCH_POS.y,
        22,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * p,
        false,
      );
      this.switchProgressGraphics.strokePath();
      return;
    }

    // Extraction ready!
    this.switchSprite.setFillStyle(0xe9b45c, 0.28);
    this.switchSprite.setStrokeStyle(2.5, 0xfde047, 1);
    this.switchLabel.setText('E / Click · Gate switch').setColor('#fde047');
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

    this.maiSprite.setPosition(MAI_MARKER.x, MAI_MARKER.y);
    this.isshinSprite.setPosition(ISSHIN_POS.x, ISSHIN_POS.y);
    this.switchSprite.setPosition(SWITCH_POS.x, SWITCH_POS.y);
    this.switchHitZone.setPosition(SWITCH_POS.x, SWITCH_POS.y);
    this.syncSwitchVisuals();

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

    // Crisp telegraphs: Scout laser sight + Rusher shaded charge corridor
    // Distinct high-contrast crimson-magenta alert style when targeting Lina!
    this.telegraphGraphics.clear();
    let linaUnderThreat = false;
    for (const e of this.enemies) {
      if (e.phase !== 'telegraph' && !(e.phase === 'committed' && this.enemyTargets.get(e.id) === 'lina')) {
        continue;
      }
      const targetingLina = this.enemyTargets.get(e.id) === 'lina' && this.lina.phase !== 'safe';
      if (targetingLina) linaUnderThreat = true;
      if (e.phase !== 'telegraph') continue;

      if (e.kind === 'scout') {
        const len = 320;
        const alpha = e.dirLocked ? 0.96 : 0.48 + e.telegraphT * 0.36;
        const color = targetingLina ? (e.dirLocked ? 0xff1f5a : 0xf43f5e) : (e.dirLocked ? 0xff3b3b : 0xfbbf24);
        this.telegraphGraphics.lineStyle(targetingLina ? 3 : e.dirLocked ? 2.5 : 1.5, color, alpha);
        this.telegraphGraphics.lineBetween(e.x, e.y, e.x + e.dirX * len, e.y + e.dirY * len);
      } else {
        const laneLen = 200;
        const perpX = -e.dirY * 14;
        const perpY = e.dirX * 14;
        const endX = e.x + e.dirX * laneLen;
        const endY = e.y + e.dirY * laneLen;
        this.telegraphGraphics.fillStyle(targetingLina ? 0xf43f5e : 0xef4444, e.dirLocked ? 0.28 : 0.14);
        this.telegraphGraphics.beginPath();
        this.telegraphGraphics.moveTo(e.x + perpX, e.y + perpY);
        this.telegraphGraphics.lineTo(endX + perpX, endY + perpY);
        this.telegraphGraphics.lineTo(endX - perpX, endY - perpY);
        this.telegraphGraphics.lineTo(e.x - perpX, e.y - perpY);
        this.telegraphGraphics.closePath();
        this.telegraphGraphics.fillPath();
        this.telegraphGraphics.lineStyle(targetingLina ? 2.6 : 2, targetingLina ? 0xff2a6d : e.dirLocked ? 0xff4d4d : 0xf97316, e.dirLocked ? 0.94 : 0.6);
        this.telegraphGraphics.lineBetween(e.x, e.y, endX, endY);
      }
    }

    // World-space Lina Health Bar & Danger Pulse
    this.linaHpGraphics.clear();
    if (this.lina.phase !== 'safe') {
      const barW = 46;
      const barH = 6;
      const bx = this.lina.x - barW / 2;
      const by = this.lina.y - 34;
      const ratio = Math.max(0, Math.min(1, this.linaDefense.health / LINA_MAX_HEALTH));
      const fillColor = ratio > 0.6 ? 0x4ade80 : ratio > 0.3 ? 0xfbbf24 : 0xf87171;
      this.linaHpGraphics.fillStyle(0x090d14, 0.88);
      this.linaHpGraphics.fillRoundedRect(bx - 1, by - 1, barW + 2, barH + 2, 2);
      if (ratio > 0) {
        this.linaHpGraphics.fillStyle(fillColor, 1);
        this.linaHpGraphics.fillRect(bx, by, Math.round(barW * ratio), barH);
      }
      this.linaHpGraphics.lineStyle(1, linaUnderThreat ? 0xff4d6d : 0xfde68a, 0.9);
      this.linaHpGraphics.strokeRect(bx - 1, by - 1, barW + 2, barH + 2);

      if (linaUnderThreat) {
        const pulseR = 22 + Math.sin(this.simNow * 0.014) * 3;
        this.linaHpGraphics.lineStyle(2, 0xff2a6d, 0.72);
        this.linaHpGraphics.strokeCircle(this.lina.x, this.lina.y, pulseR);
      }
    }
    this.linaThreatLabel
      .setPosition(this.lina.x, this.lina.y - 38)
      .setVisible(linaUnderThreat && !this.defeated && !this.ended);

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

    if (this.lina.phase === 'safe') {
      this.linaSprite.setTint(0x86efac);
    } else if (this.simNow < this.linaFlashEndTime) {
      this.linaSprite.setTintFill(0xff6b6b);
    } else if (this.simNow < this.linaDefense.invulnerableUntil && Math.floor(this.simNow / 90) % 2 === 0) {
      this.linaSprite.setTint(0xfca5a5);
    } else {
      this.linaSprite.clearTint();
    }
    // Keep invuln constant visibly referenced for lint/strict checks
    void LINA_INVULN_MS;
  }

  private updateHUD() {
    const d = difficultyRules[this.difficulty];
    const seg = d.damagePerHit;
    const numSegments = Math.round(MAX_HEALTH / seg);
    const filled = Math.min(numSegments, Math.ceil(Math.max(0, this.state.health) / seg));
    let bars = '';
    for (let i = 0; i < numSegments; i++) bars += i < filled ? '█' : '░';
    const active = this.enemies.filter((e) => e.phase !== 'dead').length;
    const beatLabel = this.beatId().toUpperCase();

    if (this.beatId() === 'hold' && !this.holdExpired) {
      this.holdSecondsLeft = Math.max(0, Math.ceil((this.holdTimerEndTime - this.simNow) / 1000));
    }

    const hold = this.beatId() === 'hold' ? ` · ${Math.max(0, this.holdSecondsLeft)}s` : '';
    const gate = this.gateOpen ? ' · GATE OPEN' : '';
    const ammoStr = this.player.reloading ? 'RELOAD' : `AMMO ${this.player.ammo}/6`;
    const linaHpVal = Math.max(0, Math.round(this.linaDefense.health));
    this.hudText.setText(
      `${d.label} ${beatLabel}${hold}${gate} · K ${bars} ${this.state.health} · LINA ${linaHpVal}% · ${ammoStr} · Hostiles ${active}/${this.currentBeat().maxActive}`,
    );

    document.body.dataset.kHp = String(Math.max(0, Math.round(this.state.health)));
    document.body.dataset.linaHp = String(linaHpVal);

    // Clear, unambiguous objective banner for every rescue stage
    let obj = '';
    if (this.beatId() === 'alley') {
      obj = 'BEAT 1/3 · Protect Lina & clear the alley — step in front of crimson lines to intercept or cut them down!';
    } else if (this.beatId() === 'hold') {
      obj = `BEAT 2/3 · Defend Lina (${this.holdSecondsLeft}s left) — intercept fire aimed at her or Reflex Dodge [Space]`;
    } else if (!this.gateOpen) {
      obj = this.switchHold.active
        ? 'BEAT 3/3 · Pulling Gate Switch — stay near the pillar & guard Lina!'
        : 'BEAT 3/3 · Keep Lina alive, move to the glowing Gate Switch, and press E or Click it!';
    } else if (this.lina.phase === 'moving-to-mai') {
      obj = 'EXTRACTION · Gate open — covering Lina as she runs to Mai!';
    } else {
      obj = 'BEAT 3/3 · Gate OPEN! Clear remaining machines so Lina can cross to Mai';
    }
    this.objectiveText.setText(obj);

    this.counterText.setVisible(this.player.canCounter(this.simNow));
    this.hitFlash.setAlpha(0.35).setVisible(this.simNow < this.hitFlashEndTime);
    this.hitText.setVisible(this.simNow < this.hitTextEndTime);
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
