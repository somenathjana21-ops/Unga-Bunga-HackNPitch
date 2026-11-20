import Phaser from 'phaser';
import { getMap, canWalkTo, TILE_SIZE } from '../../content/maps';
import type { GameMap } from '../../content/maps/types';
import { characters } from '../../content/characters';
import {
  createStoryProgress, completeSequence, hasFlag, setFlag,
  enterMap, markSettlementInteraction, areAllSettlementInteractionsDone,
} from '../story-state';
import type { StoryProgress } from '../story-state';
import { dialogueSequences } from '../../content/dialogue/sequences';
import { playCutsceneOverlay } from '../../ui/cutscene-player';
import { loadPreferences } from '../../services/preferences';
import { saveRun } from '../../services/local-save';
import type { RunState } from '../state';
import type { Difficulty } from '../rules';
import type { Milestone } from '../../content/campaign';

/** Display name for each character ID, used by the on-map NPC labels. */
const characterNames: Record<string, string> = Object.fromEntries(
  characters.map((character) => [character.id, character.name]),
);

/** Sprite key for each character's 48px interaction sheet. */
const characterSprites: Record<string, string> = {
  k: 'k',
  kingsley: 'kingsley',
  hachimi: 'hachimi',
  isshin: 'isshin',
  mai: 'mai',
  nero: 'nero',
  sayu: 'sayu',
  civilian: 'k',
  'man-1': 'man-1',
  'man-2': 'man-2',
};

export class WorldScene extends Phaser.Scene {
  private map!: GameMap;
  private progress!: StoryProgress;
  private player!: Phaser.GameObjects.Sprite;
  private tile = { x: 2, y: 6 };
  private moving = false;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private npcSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private interactableMarkers: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private npcLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private npcMarkers: Map<string, Phaser.GameObjects.Text> = new Map();
  private objectiveText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private locationText?: Phaser.GameObjects.Text;
  private floorGraphics!: Phaser.GameObjects.Graphics;
  private backgroundSprite?: Phaser.GameObjects.Image;

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
      if (!this.scene.isActive('DialogueScene')) {
        document.querySelector<HTMLButtonElement>('#back-to-menu')?.click();
      }
    });

    this.loadMap('campus');
  }

  private loadMap(mapId: string) {
    // Clean up previous map objects
    this.npcSprites.forEach(s => s.destroy());
    this.npcSprites.clear();
    this.interactableMarkers.forEach(m => m.destroy());
    this.interactableMarkers.clear();
    this.clearNpcDecorations();
    if (this.floorGraphics) this.floorGraphics.destroy();
    if (this.player) this.player.destroy();
    if (this.objectiveText) this.objectiveText.destroy();
    if (this.promptText) this.promptText.destroy();
    if (this.locationText) this.locationText.destroy();
    if (this.backgroundSprite) {
      this.backgroundSprite.destroy();
      this.backgroundSprite = undefined;
    }

    const oldMap = this.map;
    this.map = getMap(mapId);
    // Carry a story-advanced objective across room transitions instead of
    // regressing to a previous map's static text (e.g. "Go home." must not flip
    // back to "Find Hachimi outside the library." when leaving the library).
    let nextObjective = this.map.objective;
    if (oldMap && this.progress.objective !== oldMap.objective) {
      nextObjective = this.progress.objective;
    }
    enterMap(this.progress, mapId, nextObjective);
    this.tile = { ...this.map.spawn };

    this.drawMap();
    this.spawnNpcs();
    this.spawnInteractableMarkers();
    this.spawnPlayer();
    this.createObjectiveUI();

    // Auto-trigger clinic wake sequence
    if (mapId === 'clinic' && !hasFlag(this.progress, 'clinic-woke')) {
      // Re-check inside the callback: the player may have talked to Mai and
      // finished the wake sequence before this delayed call fires.
      this.time.delayedCall(500, () => {
        if (!hasFlag(this.progress, 'clinic-woke')) this.startDialogue('clinic-wake');
      });
    }

    // Auto-trigger settlement cry for help when all interactions done
    if (mapId === 'settlement' && areAllSettlementInteractionsDone(this.progress) && !hasFlag(this.progress, 'settlement-cry-heard')) {
      // Same guard: the player may reach the east lane trigger before this fires.
      this.time.delayedCall(1000, () => {
        if (!hasFlag(this.progress, 'settlement-cry-heard')) this.startDialogue('settlement-cry-for-help');
      });
    }
  }

  private drawMap() {
    // Full-map backdrop behind the tile grid (walls and doors draw on top).
    const bgId = this.map.backgroundImageId;
    if (bgId) {
      const key = `bg-${bgId}`;
      if (this.textures.exists(key)) {
        this.backgroundSprite = this.add.image(0, 0, key).setOrigin(0, 0);
        this.backgroundSprite
          .setDisplaySize(this.scale.width, this.scale.height)
          .setDepth(-1);
      }
    }

    this.floorGraphics = this.add.graphics();
    this.map.grid.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (cell === '#') {
          this.floorGraphics.fillStyle(0x39434c);
          this.floorGraphics.fillRect(px, py, TILE_SIZE - 1, TILE_SIZE - 1);
          this.floorGraphics.fillStyle(0x57616b);
          this.floorGraphics.fillRect(px + 3, py + 3, TILE_SIZE - 7, 3);
        } else if (cell === 'D') {
          // Door tile
          this.floorGraphics.fillStyle(0x1e262e);
          this.floorGraphics.fillRect(px, py, TILE_SIZE - 1, TILE_SIZE - 1);
          this.floorGraphics.fillStyle(0xe9b45c, 0.3);
          this.floorGraphics.fillRect(px + 4, py + 4, TILE_SIZE - 9, TILE_SIZE - 9);
          this.floorGraphics.lineStyle(2, 0xe9b45c);
          this.floorGraphics.strokeRect(px + 4, py + 4, TILE_SIZE - 9, TILE_SIZE - 9);
        } else {
          this.floorGraphics.fillStyle((x + y) % 2 ? 0x1e262e : 0x222c34);
          this.floorGraphics.fillRect(px, py, TILE_SIZE - 1, TILE_SIZE - 1);
        }
      });
    });
  }

  private spawnNpcs() {
    // Clean up old NPC sprites and their labels/markers
    this.npcSprites.forEach(s => s.destroy());
    this.npcSprites.clear();
    this.clearNpcDecorations();

    for (const npc of this.map.npcs) {
      if (npc.excludesFlag && hasFlag(this.progress, npc.excludesFlag)) continue;
      if (npc.requiresFlag && !hasFlag(this.progress, npc.requiresFlag)) continue;

      const spriteKey = characterSprites[npc.characterId] ? `sprite-${characterSprites[npc.characterId]}` : 'sprite-k';
      const centerX = npc.position.x * TILE_SIZE + 24;
      const topY = npc.position.y * TILE_SIZE;
      const name = characterNames[npc.characterId] ?? npc.characterId;

      const sprite = this.add.sprite(centerX, topY + 24, spriteKey, 0).setDepth(10);
      // Pulse the quest NPC so it is unmistakable on a dark, empty map.
      this.tweens.add({
        targets: sprite,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.npcSprites.set(npc.id, sprite);

      // Name plate under the character so quest NPCs are identifiable at a glance.
      const label = this.add.text(centerX, topY + TILE_SIZE - 2, name, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '10px',
        color: '#e3b16b',
        backgroundColor: '#0d1117d9',
        padding: { x: 4, y: 1 },
      }).setOrigin(0.5, 1).setDepth(20);
      this.npcLabels.set(npc.id, label);

      // "!" prompt above talkable NPCs (all visible NPCs here have dialogue).
      const marker = this.add.text(centerX, topY + 2, '!', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#edbb70',
        stroke: '#0d1117',
        strokeThickness: 3,
      }).setOrigin(0.5, 0).setDepth(20);
      this.npcMarkers.set(npc.id, marker);
      this.tweens.add({
        targets: marker,
        y: topY - 2,
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

  private spawnInteractableMarkers() {
    // Clean up old markers
    this.interactableMarkers.forEach(m => m.destroy());
    this.interactableMarkers.clear();

    for (const item of this.map.interactables) {
      if (item.excludesFlag && hasFlag(this.progress, item.excludesFlag)) continue;
      if (item.requiresFlag && !hasFlag(this.progress, item.requiresFlag)) continue;

      const marker = this.add.rectangle(
        item.position.x * TILE_SIZE + 24,
        item.position.y * TILE_SIZE + 24,
        20, 20, 0xe9b45c, 0.4,
      ).setStrokeStyle(1, 0xe9b45c).setDepth(5);
      this.interactableMarkers.set(item.id, marker);
    }
  }

  private spawnPlayer() {
    this.player = this.add.sprite(
      this.tile.x * TILE_SIZE + 24,
      this.tile.y * TILE_SIZE + 24,
      'sprite-k', 0,
    ).setDepth(10);

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
    // Idle animation (use first frame of down walk or interaction sheet)
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
      backgroundColor: '#0d1117',
      padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(100);

    // Current room name, so the player always knows which map they are in.
    this.locationText = this.add.text(12, 42, this.map.name, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '12px',
      color: '#8892a0',
      backgroundColor: '#0d1117',
      padding: { x: 8, y: 3 },
    }).setScrollFactor(0).setDepth(100);

    this.promptText = this.add.text(this.scale.width / 2, this.scale.height - 24, '', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '13px',
      color: '#c4c9d0',
      backgroundColor: '#0d1117',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(100);
  }

  update() {
    if (this.scene.isActive('DialogueScene') || this.moving) return;

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

    this.tweens.add({
      targets: this.player,
      x: this.tile.x * TILE_SIZE + 24,
      y: this.tile.y * TILE_SIZE + 24,
      duration: 170,
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
      if (door.requiresFlag && !hasFlag(this.progress, door.requiresFlag)) continue;
      if (door.targetMap === 'rescue') {
        this.startRescueMission();
        return;
      }
      this.loadMap(door.targetMap);
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
    this.scene.start('RescueScene', {
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
        this.promptText.setText(`E — ${item.prompt}`);
        return;
      }
    }

    // Check for nearby NPCs
    for (const npc of this.map.npcs) {
      if (npc.excludesFlag && hasFlag(this.progress, npc.excludesFlag)) continue;
      if (npc.requiresFlag && !hasFlag(this.progress, npc.requiresFlag)) continue;
      const dist = Math.abs(this.tile.x - npc.position.x) + Math.abs(this.tile.y - npc.position.y);
      if (dist <= 1) {
        this.promptText.setText('E — Talk');
        return;
      }
    }

    this.promptText.setText('');
  }

  private tryInteract() {
    if (this.scene.isActive('DialogueScene')) return;

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
      }
    } else if (completionFlag === 'breach-door-examined') {
      // Auto-trigger the breach attack immediately after examining the door
      this.time.delayedCall(600, () => this.startDialogue('breach-attack'));
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
      this.progress.objective = 'Speak to Mai.';
      this.objectiveText.setText(`Objective: ${this.progress.objective}`);
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
      this.time.delayedCall(800, () => this.startDialogue('library-bracelet-scene'));
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
            this.time.delayedCall(400, () => this.startDialogue('library-hachimi-farewell'));
          } else if (completionFlag === 'breach-survived') {
            this.loadMap('clinic');
          }
        },
      });
    }

    // Refresh NPCs and markers to reflect new state
    this.spawnNpcs();
    this.spawnInteractableMarkers();
    this.updatePrompt();
  }

  shutdown() {
    this.input.keyboard?.removeAllListeners();
    this.input.keyboard?.removeAllKeys(true);
  }
}