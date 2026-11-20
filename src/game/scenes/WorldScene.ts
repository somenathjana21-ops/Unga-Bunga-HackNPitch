import Phaser from 'phaser';
import { getMap, canWalkTo, TILE_SIZE } from '../../content/maps';
import type { GameMap } from '../../content/maps/types';
import type { Checkpoint } from '../../content/campaign';
import {
  createStoryProgress, completeSequence, hasFlag, setFlag,
  enterMap, markSettlementInteraction, areAllSettlementInteractionsDone,
} from '../story-state';
import type { StoryProgress } from '../story-state';

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
  man1: 'man-1',
  man2: 'man-2',
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
  private objectiveText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private dialogueActive = false;
  private floorGraphics!: Phaser.GameObjects.Graphics;

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
    this.load.once('loaderror', () => {
      const status = document.querySelector('#preview-status');
      if (status) status.textContent = 'Some character art could not load. The story will continue with text only.';
    });
  }

  create() {
    this.progress = createStoryProgress();
    this.dialogueActive = false;

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,E,ESC') as typeof this.keys;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    this.input.keyboard!.on('keydown-E', () => this.tryInteract());
    this.input.keyboard!.on('keydown-ESC', () => {
      if (!this.dialogueActive) {
        document.querySelector<HTMLButtonElement>('#back-to-menu')?.click();
      }
    });

    // Resume the saved campaign checkpoint on reload; never heal to fresh health.
    const savedCheckpoint = this.registry.get('checkpoint') as Checkpoint | undefined;
    this.loadMap(savedCheckpoint ?? 'campus');
  }

  private loadMap(mapId: string) {
    // Clean up previous map objects
    this.npcSprites.forEach(s => s.destroy());
    this.npcSprites.clear();
    this.interactableMarkers.forEach(m => m.destroy());
    this.interactableMarkers.clear();
    if (this.floorGraphics) this.floorGraphics.destroy();
    if (this.player) this.player.destroy();
    if (this.objectiveText) this.objectiveText.destroy();
    if (this.promptText) this.promptText.destroy();

    this.map = getMap(mapId);
    enterMap(this.progress, mapId, this.map.objective);
    this.tile = { ...this.map.spawn };

    this.drawMap();
    this.spawnNpcs();
    this.spawnInteractableMarkers();
    this.spawnPlayer();
    this.createObjectiveUI();

    // Auto-trigger clinic wake sequence
    if (mapId === 'clinic' && !hasFlag(this.progress, 'clinic-woke')) {
      this.time.delayedCall(500, () => this.startDialogue('clinic-wake'));
    }

    // Auto-trigger settlement cry for help when all interactions done
    if (mapId === 'settlement' && areAllSettlementInteractionsDone(this.progress) && !hasFlag(this.progress, 'settlement-cry-heard')) {
      this.time.delayedCall(1000, () => this.startDialogue('settlement-cry-for-help'));
    }
  }

  private drawMap() {
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
    // Clean up old NPC sprites
    this.npcSprites.forEach(s => s.destroy());
    this.npcSprites.clear();

    for (const npc of this.map.npcs) {
      if (npc.excludesFlag && hasFlag(this.progress, npc.excludesFlag)) continue;
      if (npc.requiresFlag && !hasFlag(this.progress, npc.requiresFlag)) continue;

      const spriteKey = characterSprites[npc.characterId] ? `sprite-${characterSprites[npc.characterId]}` : 'sprite-k';
      const sprite = this.add.sprite(
        npc.position.x * TILE_SIZE + 24,
        npc.position.y * TILE_SIZE + 24,
        spriteKey, 0,
      );
      this.npcSprites.set(npc.id, sprite);
    }
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
      ).setStrokeStyle(1, 0xe9b45c);
      this.interactableMarkers.set(item.id, marker);
    }
  }

  private spawnPlayer() {
    this.player = this.add.sprite(
      this.tile.x * TILE_SIZE + 24,
      this.tile.y * TILE_SIZE + 24,
      'sprite-k', 0,
    );
  }

  private createObjectiveUI() {
    this.objectiveText = this.add.text(12, 12, `Objective: ${this.progress.objective}`, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '14px',
      color: '#e3b16b',
      backgroundColor: '#0d1117',
      padding: { x: 8, y: 4 },
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
    if (this.dialogueActive || this.moving) return;

    let dx = 0;
    let dy = 0;
    if (this.keys.W.isDown || this.keys.UP.isDown) dy = -1;
    else if (this.keys.S.isDown || this.keys.DOWN.isDown) dy = 1;
    else if (this.keys.A.isDown || this.keys.LEFT.isDown) dx = -1;
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx = 1;

    if ((!dx && !dy) || !canWalkTo(this.map, this.tile.x + dx, this.tile.y + dy)) return;

    this.tile.x += dx;
    this.tile.y += dy;
    this.moving = true;
    this.tweens.add({
      targets: this.player,
      x: this.tile.x * TILE_SIZE + 24,
      y: this.tile.y * TILE_SIZE + 24,
      duration: 170,
      onComplete: () => {
        this.moving = false;
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
      this.loadMap(door.targetMap);
      return;
    }
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
    if (this.dialogueActive) return;

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
    if (this.dialogueActive) return;
    this.dialogueActive = true;

    this.scene.launch('DialogueScene', {
      sequenceId,
      onComplete: (seqId: string, flag: string, choiceFlag?: string) => this.onDialogueComplete(seqId, flag, choiceFlag),
    });

    this.moving = false;
  }

  private onDialogueComplete(sequenceId: string, completionFlag: string, choiceFlag?: string) {
    this.dialogueActive = false;
    completeSequence(this.progress, sequenceId, completionFlag);
    if (choiceFlag) setFlag(this.progress, choiceFlag);

    // Handle post-dialogue logic
    if (completionFlag === 'breach-woke') {
      this.progress.objective = 'Check the door.';
      this.objectiveText.setText(`Objective: ${this.progress.objective}`);
    } else if (completionFlag === 'breach-survived') {
      // Transition to clinic after the breach
      this.loadMap('clinic');
      return;
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
      // Auto-trigger the bracelet scene — Hachimi steps aside and K sees Sayu and Nero
      this.time.delayedCall(800, () => this.startDialogue('library-bracelet-scene'));
      return;
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
      }
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