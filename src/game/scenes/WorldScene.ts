import Phaser from 'phaser';
import type { MapRoom } from '../../content/maps/campus';
import { getRoom, canEnter, TILE_SIZE } from '../../content/maps/campus';

const OBJECTIVE = 'Objective: Reach the faculty library.';
const OBJECTIVE_AFTER_HACHIMI =
  'Objective: You found Hachimi. Use the library door to go inside.';

const HACHIMI_DIALOGUE = [
  { speaker: 'Hachimi', text: "You made it to the library courtyard." },
  { speaker: 'Hachimi', text: "I was told someone would be coming." },
  { speaker: 'Hachimi', text: "Take care when you go inside." },
];

export class WorldScene extends Phaser.Scene {
  private room!: MapRoom;
  private tilesGraphics!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Sprite;
  private npcs: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private objectMarkers: Map<string, Phaser.GameObjects.Rectangle> = new Map();

  private tile = { x: 0, y: 0 };
  private facing: 'up' | 'down' | 'left' | 'right' = 'down';
  private moving = false;
  private dialogueOpen = false;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // DOM UI owned by this scene.
  private objectiveEl!: HTMLElement;
  private promptEl!: HTMLElement;
  private dialogueEl!: HTMLElement;
  private dialogueSpeakerEl!: HTMLElement;
  private dialogueTextEl!: HTMLElement;
  private dialogueLineIndex = 0;

  constructor() {
    super('world');
  }

  preload() {
    this.load.spritesheet('k', '/assets/characters/k/k-interaction-sprites-48px.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('hachimi', '/assets/characters/hachimi/hachimi-interaction-sprites-48px.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.once('loaderror', () => {
      const prompt = document.querySelector('#world-prompt');
      if (prompt) {
        prompt.textContent = 'Character art could not load. Return to the menu and try again.';
      }
    });
  }

  create() {
    this.createUi();
    this.switchRoom('campus');

    this.keys = this.input.keyboard!.addKeys(
      'W,A,S,D,UP,LEFT,DOWN,RIGHT,E,ESC',
    ) as typeof this.keys;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);

    this.keys.E.on('down', () => this.handleE());
    this.keys.ESC.on('down', () => {
      if (this.dialogueOpen) this.closeDialogue();
    });

    this.events.once('shutdown', () => {
      this.destroyUi();
      this.input.keyboard?.removeAllKeys(true);
    });
  }

  update() {
    if (this.dialogueOpen || this.moving) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) return;

    let dx = 0;
    let dy = 0;
    if (this.keys.W.isDown || this.keys.UP.isDown) {
      dy = -1;
      this.facing = 'up';
    } else if (this.keys.S.isDown || this.keys.DOWN.isDown) {
      dy = 1;
      this.facing = 'down';
    } else if (this.keys.A.isDown || this.keys.LEFT.isDown) {
      dx = -1;
      this.facing = 'left';
    } else if (this.keys.D.isDown || this.keys.RIGHT.isDown) {
      dx = 1;
      this.facing = 'right';
    }

    if (!dx && !dy) return;
    const targetX = this.tile.x + dx;
    const targetY = this.tile.y + dy;
    if (!canEnter(this.room, targetX, targetY)) return;
    // NPCs are solid: you face them to talk, you do not walk onto them.
    if ([...this.npcs.values()].some((s) => s.x === targetX * TILE_SIZE + 24 && s.y === targetY * TILE_SIZE + 24))
      return;

    this.tile.x = targetX;
    this.tile.y = targetY;
    this.moving = true;
    this.tweens.add({
      targets: this.player,
      x: this.tile.x * TILE_SIZE + 24,
      y: this.tile.y * TILE_SIZE + 24,
      duration: 170,
      onComplete: () => {
        this.moving = false;
      },
    });
    this.updatePrompt();
  }

  private switchRoom(id: string) {
    let target: typeof this.room;
    try {
      target = getRoom(id);
    } catch {
      // Unknown or missing map IDs fail visibly (console message) rather than
      // crashing the scene; the player stays in the current room.
      console.error(`[WorldScene] unknown map room: ${id}`);
      return;
    }
    this.room = target;
    this.tile = { x: this.room.spawnX, y: this.room.spawnY };
    this.facing = 'down';
    this.moving = false;

    this.cameras.main.setBounds(
      0,
      0,
      this.room.width * TILE_SIZE,
      this.room.height * TILE_SIZE,
    );

    if (!this.tilesGraphics) {
      this.tilesGraphics = this.add.graphics();
    } else {
      this.tilesGraphics.clear();
    }
    this.drawMap();
    this.spawnPlayer();
    this.spawnObjects();
    this.updatePrompt();
  }

  private drawMap() {
    const g = this.tilesGraphics;
    for (let y = 0; y < this.room.height; y++) {
      for (let x = 0; x < this.room.width; x++) {
        const cell = this.room.tiles[y][x];
        if (cell === '#') {
          g.fillStyle(0x39434c);
          g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
          g.fillStyle(0x57616b);
          g.fillRect(x * TILE_SIZE + 3, y * TILE_SIZE + 3, TILE_SIZE - 7, 3);
        } else {
          g.fillStyle((x + y) % 2 ? 0x1e262e : 0x222c34);
          g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
        }
      }
    }
  }

  private spawnPlayer() {
    if (this.player) this.player.destroy();
    this.player = this.add.sprite(
      this.tile.x * TILE_SIZE + 24,
      this.tile.y * TILE_SIZE + 24,
      'k',
      0,
    );
    // Existing six frames are interaction poses, not a walk cycle. Keep frame 0
    // until a directional walk cycle is supplied (labelled temporary).
  }

  private spawnObjects() {
    this.npcs.forEach((sprite) => sprite.destroy());
    this.npcs.clear();
    this.objectMarkers.forEach((marker) => marker.destroy());
    this.objectMarkers.clear();

    for (const obj of this.room.objects) {
      const px = obj.x * TILE_SIZE + 24;
      const py = obj.y * TILE_SIZE + 24;
      if (obj.type === 'npc') {
        const sprite = this.add.sprite(px, py, 'hachimi', 0);
        sprite.setDepth(1);
        this.npcs.set(obj.id, sprite);
      } else {
        const marker = this.add.rectangle(px, py, 26, 26, 0xe9b45c, 0.35);
        marker.setStrokeStyle(2, 0xe9b45c);
        marker.setDepth(1);
        this.objectMarkers.set(obj.id, marker);
      }
    }
  }

  private handleE() {
    if (this.dialogueOpen) {
      this.advanceDialogue();
      return;
    }
    const target = this.interactionTarget();
    if (!target) return;
    if (target.type === 'door') {
      this.switchRoom(target.targetRoom!);
      return;
    }
    if (target.type === 'npc') {
      this.openDialogue(target.dialogueId!);
      return;
    }
    // Interactable: show a one-off line in the prompt.
    this.promptEl.textContent = `You examine the ${target.name}. Nothing here but a reminder of yesterday.`;
    setTimeout(() => this.updatePrompt(), 2000);
  }

  /** Find the adjacent object the player is eligible to interact with. */
  private interactionTarget():
    | typeof this.room.objects[number]
    | undefined {
    for (const obj of this.room.objects) {
      const distance = Math.abs(this.tile.x - obj.x) + Math.abs(this.tile.y - obj.y);
      if (distance !== 1) continue;
      if (obj.type === 'npc') {
        // NPC interaction requires adjacency and facing the NPC.
        if (!this.facingToward(obj.x, obj.y)) continue;
      }
      return obj;
    }
    return undefined;
  }

  private facingToward(tx: number, ty: number): boolean {
    const dx = tx - this.tile.x;
    const dy = ty - this.tile.y;
    if (this.facing === 'up') return dy === -1 && dx === 0;
    if (this.facing === 'down') return dy === 1 && dx === 0;
    if (this.facing === 'left') return dx === -1 && dy === 0;
    if (this.facing === 'right') return dx === 1 && dy === 0;
    return false;
  }

  private updatePrompt() {
    if (this.dialogueOpen) {
      this.promptEl.hidden = true;
      return;
    }
    const target = this.interactionTarget();
    if (target) {
      this.promptEl.hidden = false;
      this.promptEl.textContent = `E · ${target.name}`;
    } else {
      this.promptEl.hidden = true;
    }
  }

  // ---------------- Dialogue ----------------

  private openDialogue(dialogueId: string) {
    if (dialogueId !== 'hachimi-greeting') return;
    this.dialogueOpen = true;
    this.dialogueLineIndex = 0;
    this.dialogueEl.hidden = false;
    this.player.setDepth(2);
    this.showDialogueLine(0);
    // Movement is blocked by the dialogueOpen flag in update().
  }

  private advanceDialogue() {
    this.dialogueLineIndex++;
    if (this.dialogueLineIndex >= HACHIMI_DIALOGUE.length) {
      this.closeDialogue();
      return;
    }
    this.showDialogueLine(this.dialogueLineIndex);
  }

  private showDialogueLine(index: number) {
    const line = HACHIMI_DIALOGUE[index];
    this.dialogueSpeakerEl.textContent = line.speaker;
    this.dialogueTextEl.textContent = line.text;
  }

  private closeDialogue() {
    this.dialogueOpen = false;
    this.dialogueEl.hidden = true;
    this.dialogueLineIndex = 0;
    this.player.setDepth(1);
    if (this.room.id === 'campus') {
      this.objectiveEl.textContent = OBJECTIVE_AFTER_HACHIMI;
    }
    this.updatePrompt();
  }

  // ---------------- UI ----------------

  private createUi() {
    // Defensive: clear any leftover UI from a previous world session so
    // returning to the menu and re-entering never duplicates overlays.
    for (const id of ['world-objective', 'world-prompt', 'world-dialogue']) {
      const existing = document.querySelector<HTMLElement>(`#${id}`);
      if (existing) existing.remove();
    }

    this.objectiveEl = document.createElement('p');
    this.objectiveEl.id = 'world-objective';
    this.objectiveEl.textContent = OBJECTIVE;
    document.body.appendChild(this.objectiveEl);

    this.promptEl = document.createElement('p');
    this.promptEl.id = 'world-prompt';
    document.body.appendChild(this.promptEl);

    this.dialogueEl = document.createElement('div');
    this.dialogueEl.id = 'world-dialogue';
    this.dialogueEl.hidden = true;
    const speaker = document.createElement('p');
    speaker.id = 'world-dialogue-speaker';
    const text = document.createElement('p');
    text.id = 'world-dialogue-text';
    const hint = document.createElement('p');
    hint.id = 'world-dialogue-hint';
    hint.textContent = 'E / Enter · advance  ·  Esc · close';
    this.dialogueEl.appendChild(speaker);
    this.dialogueEl.appendChild(text);
    this.dialogueEl.appendChild(hint);
    document.body.appendChild(this.dialogueEl);

    this.dialogueSpeakerEl = speaker;
    this.dialogueTextEl = text;
  }

  private destroyUi() {
    for (const id of [
      'world-objective',
      'world-prompt',
      'world-dialogue',
    ]) {
      const el = document.querySelector<HTMLElement>(`#${id}`);
      if (el) el.remove();
    }
  }
}
