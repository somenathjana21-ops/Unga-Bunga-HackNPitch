import Phaser from 'phaser';
import { getMap, canWalkTo, TILE_SIZE } from '../../content/maps';
import type { GameMap, MapPosition } from '../../content/maps/types';
import { characters } from '../../content/characters';
import {
  createStoryProgress, completeSequence, hasFlag, setFlag,
  enterMap, markSettlementInteraction, areAllSettlementInteractionsDone,
} from '../story-state';
import type { StoryProgress } from '../story-state';
import { dialogueSequences } from '../../content/dialogue/sequences';
import { playCutsceneOverlay, isCutsceneActive } from '../../ui/cutscene-player';
import { loadPreferences } from '../../services/preferences';
import { saveRun } from '../../services/local-save';
import type { RunState } from '../state';
import type { Difficulty } from '../rules';
import type { Milestone } from '../../content/campaign';
import { SPRITE_DISPLAY } from '../sprite-metrics';

/** Display name for each character ID, used by the on-map NPC labels. */
const characterNames: Record<string, string> = Object.fromEntries(
  characters.map((character) => [character.id, character.name]),
);

/** Sprite texture key for each character on the world map. */
const characterSpriteKeys: Record<string, string> = {
  k: 'sprite-k',
  kingsley: 'sprite-kingsley',
  hachimi: 'sprite-hachimi',
  isshin: 'sprite-isshin',
  mai: 'sprite-mai',
  nero: 'sprite-nero',
  sayu: 'sprite-sayu',
  civilian: 'sprite-civilian',
  'man-1': 'sprite-man-1',
  'man-2': 'sprite-man-2',
};

const CHAR_ORIGIN_Y = 0.74;
const CHAR_FOOT_OFFSET_Y = 38;

export class WorldScene extends Phaser.Scene {
  private map!: GameMap;
  private progress!: StoryProgress;
  private player!: Phaser.GameObjects.Sprite;
  private playerShadow?: Phaser.GameObjects.Ellipse;
  private tile = { x: 2, y: 6 };
  private moving = false;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private npcSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private npcShadows: Map<string, Phaser.GameObjects.Ellipse> = new Map();
  private interactableObjects: Phaser.GameObjects.GameObject[] = [];
  private doorObjects: Phaser.GameObjects.GameObject[] = [];
  private npcLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private npcMarkers: Map<string, Phaser.GameObjects.Text> = new Map();
  private objectiveText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private locationText?: Phaser.GameObjects.Text;
  private floorGraphics!: Phaser.GameObjects.Graphics;
  private backgroundSprite?: Phaser.GameObjects.Image;
  private visitedMaps: Set<string> = new Set();

  constructor() { super('WorldScene'); }

  preload() {
    // Load all character sprites needed for the maps
    const sprites = [
      'k', 'kingsley', 'hachimi', 'isshin', 'mai', 'nero', 'sayu', 'man-1', 'man-2',
    ];
    for (const id of sprites) {
      const key = `sprite-${id}`;
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, `/assets/characters/${id}/${id}-interaction-sprites-48px.png`, {
          frameWidth: 48, frameHeight: 48,
        });
      }
    }
    // Camp civilian single-frame idle sprite for settlement ration line
    if (!this.textures.exists('sprite-civilian')) {
      this.load.image('sprite-civilian', '/assets/characters/camp-civilian/camp-civilian-a-idle.png');
    }
    // World prop icons rendered on interactable tiles not painted into the backdrop
    if (!this.textures.exists('prop-pixel-art-leather-wallet-icon')) {
      this.load.image('prop-pixel-art-leather-wallet-icon', '/assets/backgrounds/pixel-art-leather-wallet-icon.png');
    }
    // K's four-direction walk cycles (4 frames each)
    const walkDirs = ['down', 'left', 'right', 'up'];
    for (const dir of walkDirs) {
      const key = `k-walk-${dir}`;
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, `/assets/characters/k/k-walk-${dir}-48px.png`, {
          frameWidth: 48, frameHeight: 48,
        });
      }
    }
    // Portrait images for dialogue
    const portraits = [
      { id: 'k', path: '/assets/characters/k/k-speaking-pose.png' },
      { id: 'nero', path: '/assets/characters/nero/nero-speaking-pose.png' },
      { id: 'sayu', path: '/assets/characters/sayu/sayu-speaking-pose.png' },
      { id: 'hachimi', path: '/assets/characters/hachimi/hachimi-speaking-pose.png' },
      { id: 'kingsley', path: '/assets/characters/kingsley/kingsley-speaking-pose.png' },
      { id: 'isshin', path: '/assets/characters/isshin/isshin-speaking-pose.png' },
      { id: 'mai', path: '/assets/characters/mai/mai-speaking-pose.png' },
    ];
    for (const p of portraits) {
      const key = `portrait-${p.id}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, p.path);
      }
    }
    // Full-map backdrops (drawn behind the tile grid, one per map).
    const backgrounds = [
      'campus-library-approach',
      'twilight-library-courtyard-encounter',
      'dorm-room-shared',
      'moonlit-dorm-void-doorway',
      'post-apocalyptic-clinic',
      'post-apocalyptic-courtyard-camp',
    ];
    for (const id of backgrounds) {
      const key = `bg-${id}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `/assets/backgrounds/${id}.png`);
      }
    }
    this.load.once('loaderror', () => {
      const status = document.querySelector('#preview-status');
      if (status) status.textContent = 'Some character art could not load. The story will continue with text only.';
    });
  }

  create() {
    this.progress = createStoryProgress();

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,E,ESC') as typeof this.keys;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    this.input.keyboard!.on('keydown-E', () => this.tryInteract());
    this.input.keyboard!.on('keydown-ESC', () => {
      if (!this.scene.isActive('DialogueScene') && !isCutsceneActive()) {
        document.querySelector<HTMLButtonElement>('#back-to-menu')?.click();
      }
    });

    const requestedMap = new URLSearchParams(window.location.search).get('map');
    const validMaps = new Set(['campus', 'library', 'dorm', 'clinic', 'settlement']);
    const startMap = requestedMap && validMaps.has(requestedMap) ? requestedMap : 'campus';
    this.loadMap(startMap);
  }

  private loadMap(mapId: string, spawnOverride?: MapPosition) {
    // Clean up previous map objects
    this.npcSprites.forEach(s => {
      this.tweens.killTweensOf(s);
      s.destroy();
    });
    this.npcSprites.clear();
    this.npcShadows.forEach(s => s.destroy());
    this.npcShadows.clear();
    this.clearInteractableMarkers();
    this.clearDoorMarkers();
    this.clearNpcDecorations();
    if (this.floorGraphics) this.floorGraphics.destroy();
    if (this.player) {
      this.tweens.killTweensOf(this.player);
      this.player.destroy();
    }
    if (this.playerShadow) {
      this.tweens.killTweensOf(this.playerShadow);
      this.playerShadow.destroy();
      this.playerShadow = undefined;
    }
    if (this.objectiveText) this.objectiveText.destroy();
    if (this.promptText) this.promptText.destroy();
    if (this.locationText) this.locationText.destroy();
    if (this.backgroundSprite) {
      this.backgroundSprite.destroy();
      this.backgroundSprite = undefined;
    }

    const oldMap = this.map;
    this.map = getMap(mapId);
    // Preserve a story-advanced objective when revisiting an earlier room
    // (e.g. "Go home." must not regress when backtracking), while adopting the
    // new room's objective on first entry (e.g. dorm -> clinic must not keep
    // "Check the door.").
    const revisited = this.visitedMaps.has(mapId);
    let nextObjective = this.map.objective;
    if (revisited && oldMap && this.progress.objective !== oldMap.objective) {
      nextObjective = this.progress.objective;
    }
    this.visitedMaps.add(mapId);
    enterMap(this.progress, mapId, nextObjective);
    this.tile = spawnOverride ? { ...spawnOverride } : { ...this.map.spawn };
    this.moving = false;

    document.body.dataset.scene = 'world';
    document.body.dataset.map = mapId;

    this.drawMap();
    this.spawnDoorMarkers();
    this.spawnNpcs();
    this.spawnInteractableMarkers();
    this.spawnPlayer();
    this.createObjectiveUI();
    this.updatePrompt();

    // Auto-trigger clinic wake sequence
    if (mapId === 'clinic' && !hasFlag(this.progress, 'clinic-woke')) {
      // Re-check inside the callback: the player may have talked to Mai and
      // finished the wake sequence before this delayed call fires.
      this.time.delayedCall(500, () => {
        if (this.map.id === 'clinic' && !hasFlag(this.progress, 'clinic-woke')) {
          this.startDialogue('clinic-wake');
        }
      });
    }

    // Auto-trigger settlement cry for help when all interactions done
    if (mapId === 'settlement' && areAllSettlementInteractionsDone(this.progress) && !hasFlag(this.progress, 'settlement-cry-heard')) {
      // Same guard: the player may reach the east lane trigger before this fires.
      this.time.delayedCall(1000, () => {
        if (this.map.id === 'settlement' && !hasFlag(this.progress, 'settlement-cry-heard')) {
          this.startDialogue('settlement-cry-for-help');
        }
      });
    }
  }

  private drawMap() {
    // Full-map backdrop behind the tile grid.
    const bgId = this.map.id === 'dorm' && hasFlag(this.progress, 'breach-woke')
      ? 'moonlit-dorm-void-doorway'
      : this.map.backgroundImageId;
    const hasBackground = Boolean(bgId && this.textures.exists(`bg-${bgId}`));
    if (hasBackground && bgId) {
      this.backgroundSprite = this.add.image(0, 0, `bg-${bgId}`).setOrigin(0, 0);
      this.backgroundSprite
        .setDisplaySize(this.scale.width, this.scale.height)
        .setDepth(-1);
    }

    this.floorGraphics = this.add.graphics().setDepth(0);
    if (!hasBackground) {
      this.map.grid.forEach((row, y) => {
        [...row].forEach((cell, x) => {
          const px = x * TILE_SIZE;
          const py = y * TILE_SIZE;
          if (cell === '#') {
            this.floorGraphics.fillStyle(0x39434c, 1);
            this.floorGraphics.fillRect(px, py, TILE_SIZE - 1, TILE_SIZE - 1);
            this.floorGraphics.fillStyle(0x57616b);
            this.floorGraphics.fillRect(px + 3, py + 3, TILE_SIZE - 7, 3);
          } else {
            this.floorGraphics.fillStyle((x + y) % 2 ? 0x1e262e : 0x222c34);
            this.floorGraphics.fillRect(px, py, TILE_SIZE - 1, TILE_SIZE - 1);
          }
        });
      });
    }
  }

  private clearDoorMarkers() {
    for (const obj of this.doorObjects) {
      this.tweens.killTweensOf(obj);
      obj.destroy();
    }
    this.doorObjects = [];
  }

  private spawnDoorMarkers() {
    this.clearDoorMarkers();

    // Render indicators ONLY for currently unlocked doors so locked exits never
    // confuse the player.
    for (const door of this.map.doors) {
      if (door.excludesFlag && hasFlag(this.progress, door.excludesFlag)) continue;
      if (door.requiresFlag && !hasFlag(this.progress, door.requiresFlag)) continue;

      const cx = door.position.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = door.position.y * TILE_SIZE + TILE_SIZE / 2;

      const glow = this.add.rectangle(cx, cy, TILE_SIZE - 10, TILE_SIZE - 10, 0xe9b45c, 0.2)
        .setStrokeStyle(2, 0xe9b45c, 0.9)
        .setDepth(4);
      this.tweens.add({
        targets: glow,
        alpha: 0.45,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.doorObjects.push(glow);

      if (door.label) {
        const labelY = door.position.y <= 2
          ? cy + TILE_SIZE / 2 + 2
          : cy - TILE_SIZE / 2 - 2;
        const originY = door.position.y <= 2 ? 0 : 1;
        const label = this.add.text(cx, labelY, door.label, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#f7d694',
          backgroundColor: '#0d1117e6',
          padding: { x: 5, y: 2 },
        }).setOrigin(0.5, originY).setDepth(30);
        this.doorObjects.push(label);
      }
    }

    // Special breach doorway beacon in the dorm once K wakes up ("Check the door.")
    if (
      this.map.id === 'dorm' &&
      hasFlag(this.progress, 'breach-woke') &&
      !hasFlag(this.progress, 'breach-survived')
    ) {
      const cx = 13 * TILE_SIZE + TILE_SIZE / 2;
      const cy = 7 * TILE_SIZE + TILE_SIZE / 2;
      const pulse = this.add.rectangle(cx, cy, TILE_SIZE - 8, TILE_SIZE - 8, 0xef4444, 0.22)
        .setStrokeStyle(2, 0xf87171, 0.95)
        .setDepth(4);
      this.tweens.add({
        targets: pulse,
        alpha: 0.55,
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      const tag = this.add.text(cx, cy - TILE_SIZE / 2 - 4, 'Check door', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fca5a5',
        backgroundColor: '#0d1117e6',
        padding: { x: 5, y: 2 },
      }).setOrigin(0.5, 1).setDepth(30);
      this.doorObjects.push(pulse, tag);
    }
  }

  private spawnNpcs() {
    // Clean up old NPC sprites and their labels/markers
    this.npcSprites.forEach(s => {
      this.tweens.killTweensOf(s);
      s.destroy();
    });
    this.npcSprites.clear();
    this.npcShadows.forEach(s => s.destroy());
    this.npcShadows.clear();
    this.clearNpcDecorations();

    for (const npc of this.map.npcs) {
      if (npc.excludesFlag && hasFlag(this.progress, npc.excludesFlag)) continue;
      if (npc.requiresFlag && !hasFlag(this.progress, npc.requiresFlag)) continue;

      const spriteKey = characterSpriteKeys[npc.characterId] ?? 'sprite-k';
      const centerX = npc.position.x * TILE_SIZE + TILE_SIZE / 2;
      const footY = npc.position.y * TILE_SIZE + CHAR_FOOT_OFFSET_Y;
      const name = characterNames[npc.characterId] ?? npc.characterId;

      // Ground shadow beneath feet
      const shadow = this.add.ellipse(centerX, footY + 12, 26, 9, 0x05070a, 0.45)
        .setDepth(8);
      this.npcShadows.set(npc.id, shadow);

      const sprite = this.add.sprite(centerX, footY, spriteKey, 0)
        .setOrigin(0.5, CHAR_ORIGIN_Y)
        .setScale(SPRITE_DISPLAY.worldCharacterScale)
        .setDepth(10 + footY * 0.01);

      // Subtle breathing pulse around the scaled world size so quest NPCs stay clear.
      this.tweens.add({
        targets: sprite,
        scaleX: SPRITE_DISPLAY.worldNpcPulseScale,
        scaleY: SPRITE_DISPLAY.worldNpcPulseScale,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.npcSprites.set(npc.id, sprite);

      // Name plate beneath the character's feet
      const label = this.add.text(centerX, footY + 16, name, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#e3b16b',
        backgroundColor: '#0d1117e0',
        padding: { x: 4, y: 1 },
      }).setOrigin(0.5, 0).setDepth(35);
      this.npcLabels.set(npc.id, label);

      // "!" prompt cleanly above the character's head
      const headTopY = footY - SPRITE_DISPLAY.worldCharacter * CHAR_ORIGIN_Y - 12;
      const marker = this.add.text(centerX, headTopY, '!', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#edbb70',
        stroke: '#0d1117',
        strokeThickness: 3,
      }).setOrigin(0.5, 0.5).setDepth(35);
      this.npcMarkers.set(npc.id, marker);
      this.tweens.add({
        targets: marker,
        y: headTopY - 5,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private clearNpcDecorations() {
    this.npcLabels.forEach(label => label.destroy());
    this.npcLabels.clear();
    this.npcMarkers.forEach(marker => {
      this.tweens.killTweensOf(marker);
      marker.destroy();
    });
    this.npcMarkers.clear();
  }

  private clearInteractableMarkers() {
    for (const obj of this.interactableObjects) {
      this.tweens.killTweensOf(obj);
      obj.destroy();
    }
    this.interactableObjects = [];
  }

  private spawnInteractableMarkers() {
    this.clearInteractableMarkers();

    for (const item of this.map.interactables) {
      if (item.excludesFlag && hasFlag(this.progress, item.excludesFlag)) continue;
      if (item.requiresFlag && !hasFlag(this.progress, item.requiresFlag)) continue;

      const cx = item.position.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = item.position.y * TILE_SIZE + TILE_SIZE / 2;

      const propKey = item.spriteId ? `prop-${item.spriteId}` : null;
      if (propKey && this.textures.exists(propKey)) {
        const ring = this.add.circle(cx, cy + 4, 14, 0xe9b45c, 0.18)
          .setStrokeStyle(1.5, 0xe9b45c, 0.85)
          .setDepth(4);
        this.tweens.add({
          targets: ring,
          scale: 1.18,
          alpha: 0.45,
          duration: 950,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        const prop = this.add.image(cx, cy, propKey)
          .setDisplaySize(28, 28)
          .setDepth(6);
        this.interactableObjects.push(ring, prop);
      } else {
        const ring = this.add.circle(cx, cy, 11, 0xe9b45c, 0.24)
          .setStrokeStyle(2, 0xf7d694, 0.9)
          .setDepth(5);
        const dot = this.add.circle(cx, cy, 3.5, 0xfde047, 0.95)
          .setDepth(6);
        this.tweens.add({
          targets: ring,
          scale: 1.24,
          alpha: 0.48,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.interactableObjects.push(ring, dot);
      }
    }
  }

  private spawnPlayer() {
    const cx = this.tile.x * TILE_SIZE + TILE_SIZE / 2;
    const footY = this.tile.y * TILE_SIZE + CHAR_FOOT_OFFSET_Y;

    this.playerShadow = this.add.ellipse(cx, footY + 12, 26, 9, 0x05070a, 0.48)
      .setDepth(8);

    this.player = this.add.sprite(cx, footY, 'sprite-k', 0)
      .setOrigin(0.5, CHAR_ORIGIN_Y)
      .setScale(SPRITE_DISPLAY.worldCharacterScale)
      .setDepth(10 + footY * 0.01);

    // Create walk animations for K (if not already created)
    const walkDirs = ['down', 'left', 'right', 'up'];
    for (const dir of walkDirs) {
      const animKey = `k-walk-${dir}`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(`k-walk-${dir}`, { start: 0, end: 3 }),
          frameRate: 8,
          repeat: -1,
        });
      }
    }
    // Idle animation (use first frame of interaction sheet)
    if (!this.anims.exists('k-idle')) {
      this.anims.create({
        key: 'k-idle',
        frames: [{ key: 'sprite-k', frame: 0 }],
        frameRate: 1,
      });
    }
  }

  private createObjectiveUI() {
    this.objectiveText = this.add.text(12, 12, `Objective: ${this.progress.objective}`, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '14px',
      color: '#e3b16b',
      backgroundColor: '#0d1117e6',
      padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(100);

    // Current room name, so the player always knows which map they are in.
    this.locationText = this.add.text(12, 42, this.map.name, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '12px',
      color: '#b4bcc8',
      backgroundColor: '#0d1117e0',
      padding: { x: 8, y: 3 },
    }).setScrollFactor(0).setDepth(100);

    this.promptText = this.add.text(this.scale.width / 2, this.scale.height - 20, '', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#f7d694',
      backgroundColor: '#0d1117e6',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(100);
  }

  update() {
    if (this.scene.isActive('DialogueScene') || isCutsceneActive() || this.moving) return;

    let dx = 0;
    let dy = 0;
    if (this.keys.W.isDown || this.keys.UP.isDown) dy = -1;
    else if (this.keys.S.isDown || this.keys.DOWN.isDown) dy = 1;
    else if (this.keys.A.isDown || this.keys.LEFT.isDown) dx = -1;
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx = 1;

    if ((!dx && !dy) || !canWalkTo(this.map, this.tile.x + dx, this.tile.y + dy)) {
      // Not moving - play idle
      if (this.player.anims.currentAnim?.key !== 'k-idle') {
        this.player.play('k-idle');
      }
      return;
    }

    // Determine walk direction for animation
    let walkAnim = 'k-walk-down';
    if (dx === -1) walkAnim = 'k-walk-left';
    else if (dx === 1) walkAnim = 'k-walk-right';
    else if (dy === -1) walkAnim = 'k-walk-up';
    else if (dy === 1) walkAnim = 'k-walk-down';

    this.tile.x += dx;
    this.tile.y += dy;
    this.moving = true;

    // Play walk animation
    this.player.play(walkAnim);

    const targetX = this.tile.x * TILE_SIZE + TILE_SIZE / 2;
    const targetFootY = this.tile.y * TILE_SIZE + CHAR_FOOT_OFFSET_Y;

    if (this.playerShadow) {
      this.tweens.add({
        targets: this.playerShadow,
        x: targetX,
        y: targetFootY + 12,
        duration: 170,
      });
    }

    this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetFootY,
      duration: 170,
      onUpdate: () => {
        this.player.setDepth(10 + this.player.y * 0.01);
      },
      onComplete: () => {
        this.moving = false;
        // Return to idle
        this.player.play('k-idle');
        this.checkTriggers();
        this.checkDoors();
        this.updatePrompt();
      },
    });
  }

  private checkTriggers() {
    for (const trigger of this.map.triggers) {
      if (trigger.position.x !== this.tile.x || trigger.position.y !== this.tile.y) continue;
      if (trigger.excludesFlag && hasFlag(this.progress, trigger.excludesFlag)) continue;
      if (trigger.requiresFlag && !hasFlag(this.progress, trigger.requiresFlag)) continue;
      this.startDialogue(trigger.dialogueId);
      return;
    }
  }

  private checkDoors() {
    for (const door of this.map.doors) {
      if (door.position.x !== this.tile.x || door.position.y !== this.tile.y) continue;
      if (door.excludesFlag && hasFlag(this.progress, door.excludesFlag)) continue;
      if (door.requiresFlag && !hasFlag(this.progress, door.requiresFlag)) continue;
      if (door.targetMap === 'rescue') {
        this.startRescueMission();
        return;
      }
      this.loadMap(door.targetMap, door.targetSpawn);
      return;
    }
  }

  private startRescueMission() {
    const runState: RunState = {
      version: 1,
      mode: 'campaign',
      difficulty: (this.registry.get('difficulty') as Difficulty) ?? 'story',
      health: (this.registry.get('health') as number) ?? 100,
      checkpoint: 'rescue-start',
      milestones: (this.registry.get('milestones') as Milestone[]) ?? [],
      counterUnlocked: (this.registry.get('counterUnlocked') as boolean) ?? false,
      rescueStatus: 'active',
    };
    saveRun(runState);
    this.scene.start('rescue', {
      state: runState,
      difficulty: runState.difficulty,
    });
  }

  private updatePrompt() {
    // Check for nearby interactables
    for (const item of this.map.interactables) {
      if (item.excludesFlag && hasFlag(this.progress, item.excludesFlag)) continue;
      if (item.requiresFlag && !hasFlag(this.progress, item.requiresFlag)) continue;
      const dist = Math.abs(this.tile.x - item.position.x) + Math.abs(this.tile.y - item.position.y);
      if (dist <= 1) {
        this.promptText.setText(`E — ${item.prompt}`).setVisible(true);
        return;
      }
    }

    // Check for nearby NPCs
    for (const npc of this.map.npcs) {
      if (npc.excludesFlag && hasFlag(this.progress, npc.excludesFlag)) continue;
      if (npc.requiresFlag && !hasFlag(this.progress, npc.requiresFlag)) continue;
      const dist = Math.abs(this.tile.x - npc.position.x) + Math.abs(this.tile.y - npc.position.y);
      if (dist <= 1) {
        const name = characterNames[npc.characterId] ?? 'Talk';
        this.promptText.setText(`E — Talk to ${name}`).setVisible(true);
        return;
      }
    }

    this.promptText.setText('').setVisible(false);
  }

  private tryInteract() {
    if (this.scene.isActive('DialogueScene') || isCutsceneActive()) return;

    // Check interactables
    for (const item of this.map.interactables) {
      if (item.excludesFlag && hasFlag(this.progress, item.excludesFlag)) continue;
      if (item.requiresFlag && !hasFlag(this.progress, item.requiresFlag)) continue;
      const dist = Math.abs(this.tile.x - item.position.x) + Math.abs(this.tile.y - item.position.y);
      if (dist <= 1) {
        this.startDialogue(item.dialogueId);
        return;
      }
    }

    // Check NPCs
    for (const npc of this.map.npcs) {
      if (npc.excludesFlag && hasFlag(this.progress, npc.excludesFlag)) continue;
      if (npc.requiresFlag && !hasFlag(this.progress, npc.requiresFlag)) continue;
      const dist = Math.abs(this.tile.x - npc.position.x) + Math.abs(this.tile.y - npc.position.y);
      if (dist <= 1) {
        this.startDialogue(npc.dialogueId);
        return;
      }
    }
  }

  private startDialogue(sequenceId: string) {
    if (this.scene.isActive('DialogueScene')) return;

    this.scene.launch('DialogueScene', {
      sequenceId,
      onComplete: (seqId: string, flag: string, choiceFlag?: string) => this.onDialogueComplete(seqId, flag, choiceFlag),
    });

    this.moving = false;
  }

  private onDialogueComplete(sequenceId: string, completionFlag: string, choiceFlag?: string) {
    completeSequence(this.progress, sequenceId, completionFlag);
    if (choiceFlag) setFlag(this.progress, choiceFlag);

    // Handle post-dialogue logic
    if (completionFlag === 'breach-woke') {
      this.progress.objective = 'Check the door.';
      this.objectiveText.setText(`Objective: ${this.progress.objective}`);
      if (this.textures.exists('bg-moonlit-dorm-void-doorway')) {
        this.backgroundSprite?.setTexture('bg-moonlit-dorm-void-doorway');
        this.backgroundSprite?.setDisplaySize(this.scale.width, this.scale.height);
      }
    } else if (completionFlag === 'breach-door-examined') {
      // Auto-trigger the breach attack immediately after examining the door
      this.time.delayedCall(600, () => {
        if (this.map.id === 'dorm' && !hasFlag(this.progress, 'breach-survived')) {
          this.startDialogue('breach-attack');
        }
      });
    } else if (completionFlag === 'breach-survived') {
      // Handled via cutscene overlay completion (or fallback if cutscene fails)
      const hasCutscene = Boolean(dialogueSequences[sequenceId]?.cutsceneId);
      if (!hasCutscene) {
        this.loadMap('clinic');
        return;
      }
    } else if (completionFlag === 'clinic-woke') {
      this.progress.objective = 'Look out the window.';
      this.objectiveText.setText(`Objective: ${this.progress.objective}`);
    } else if (completionFlag === 'clinic-window-seen') {
      if (!hasFlag(this.progress, 'clinic-history-part1')) {
        this.progress.objective = 'Speak to Mai.';
        this.objectiveText.setText(`Objective: ${this.progress.objective}`);
      }
    } else if (completionFlag === 'clinic-history-part1') {
      this.progress.objective = 'Speak to Mai again.';
      this.objectiveText.setText(`Objective: ${this.progress.objective}`);
    } else if (completionFlag === 'clinic-history-part2') {
      this.progress.objective = 'Ask Isshin about the retrieval.';
      this.objectiveText.setText(`Objective: ${this.progress.objective}`);
    } else if (completionFlag === 'clinic-wrong-name-part1') {
      this.progress.objective = 'Speak to Mai.';
      this.objectiveText.setText(`Objective: ${this.progress.objective}`);
    } else if (completionFlag === 'clinic-wrong-name-part2') {
      this.progress.objective = 'Speak to Mai.';
      this.objectiveText.setText(`Objective: ${this.progress.objective}`);
    } else if (completionFlag === 'library-hachimi-met') {
      // Hachimi steps aside and K sees Sayu and Nero. Defer the bracelet scene
      // so the current DialogueScene has fully stopped before we launch the next one.
      this.time.delayedCall(800, () => {
        if (this.map.id === 'library' && !hasFlag(this.progress, 'library-breakup-done')) {
          this.startDialogue('library-bracelet-scene');
        }
      });
    } else if (completionFlag === 'library-breakup-done') {
      this.progress.objective = 'Go home.';
      this.objectiveText.setText(`Objective: ${this.progress.objective}`);
    } else if (completionFlag === 'dorm-kingsley-talked') {
      this.progress.objective = 'Watch the news, then try to sleep.';
      this.objectiveText.setText(`Objective: ${this.progress.objective}`);
    } else if (completionFlag === 'dorm-tv-seen-2') {
      this.progress.objective = 'Try to sleep.';
      this.objectiveText.setText(`Objective: ${this.progress.objective}`);
    } else if (completionFlag === 'clinic-wrong-name-done') {
      this.progress.objective = 'Explore the settlement.';
      this.objectiveText.setText(`Objective: ${this.progress.objective}`);
    } else if (completionFlag.startsWith('settlement-')) {
      if (completionFlag === 'settlement-ration-visited' || completionFlag === 'settlement-barricade-visited' || completionFlag === 'settlement-shelter-board-seen') {
        markSettlementInteraction(this.progress, completionFlag);
      }
      if (areAllSettlementInteractionsDone(this.progress) && !hasFlag(this.progress, 'settlement-cry-heard')) {
        this.progress.objective = 'Find the person in the east lane.';
        this.objectiveText.setText(`Objective: ${this.progress.objective}`);
      } else if (completionFlag === 'settlement-cry-heard') {
        this.progress.objective = 'Pass through the east gate to rescue the civilian.';
        this.objectiveText.setText(`Objective: ${this.progress.objective}`);
      }
    }

    // Play associated cutscene if defined for this sequence
    const seq = dialogueSequences[sequenceId];
    if (seq?.cutsceneId) {
      const cutsceneId = seq.cutsceneId.toLowerCase();
      const prefs = loadPreferences();
      const reducedMotion = prefs.status === 'ok' ? prefs.preferences.reducedMotion === 'reduce' : false;
      playCutsceneOverlay({
        cutsceneId,
        reducedMotion,
        onComplete: () => {
          if (completionFlag === 'library-breakup-done') {
            this.time.delayedCall(400, () => {
              if (this.map.id === 'library' && !hasFlag(this.progress, 'library-hachimi-farewell-done')) {
                this.startDialogue('library-hachimi-farewell');
              }
            });
          } else if (completionFlag === 'breach-survived') {
            this.loadMap('clinic');
          }
        },
      });
    }

    // Refresh doors, NPCs, and markers to reflect new state
    this.spawnDoorMarkers();
    this.spawnNpcs();
    this.spawnInteractableMarkers();
    this.updatePrompt();
  }

  shutdown() {
    this.input.keyboard?.removeAllListeners();
    this.input.keyboard?.removeAllKeys(true);
  }
}