import Phaser from 'phaser';
import { canEnter, previewRoom, TILE_SIZE } from '../maps/preview-room';

export class PreviewScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private tile = { x: 2, y: 5 };
  private moving = false;

  constructor() { super('preview'); }

  preload() {
    this.load.spritesheet('k', '/assets/characters/k/k-interaction-sprites-48px.png', {
      frameWidth: 48, frameHeight: 48,
    });
    this.load.once('loaderror', () => {
      const status = document.querySelector('#preview-status');
      if (status) status.textContent = 'Character art could not load. Return to the menu and try again.';
    });
  }

  create() {
    this.tile = { x: 2, y: 5 };
    this.moving = false;
    const floor = this.add.graphics();
    previewRoom.forEach((row, y) => [...row].forEach((cell, x) => {
      floor.fillStyle(cell === '#' ? 0x39434c : (x + y) % 2 ? 0x1e262e : 0x222c34);
      floor.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
      if (cell === '#') {
        floor.fillStyle(0x57616b);
        floor.fillRect(x * TILE_SIZE + 3, y * TILE_SIZE + 3, TILE_SIZE - 7, 3);
      }
    }));
    this.add.rectangle(13 * TILE_SIZE + 24, 5 * TILE_SIZE + 24, 34, 34, 0xe9b45c, 0.2)
      .setStrokeStyle(2, 0xe9b45c);
    this.player = this.add.sprite(this.tile.x * TILE_SIZE + 24, this.tile.y * TILE_SIZE + 24, 'k', 0);
    // Existing six frames are interaction poses, not a walk cycle. Keep frame 0 until art is supplied.
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,E,ESC') as typeof this.keys;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    // A quick tap can be pressed and released between scene updates.
    this.keys.E.on('down', () => {
      const nearby = Math.abs(this.tile.x - 13) + Math.abs(this.tile.y - 5) <= 1;
      const status = document.querySelector('#preview-status');
      if (status) status.textContent = nearby
        ? 'K: “I don’t know this place. But I can take one step.”'
        : 'Walk to the amber marker, then press E.';
    });
    this.events.once('shutdown', () => this.input.keyboard?.removeAllKeys(true));
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      document.querySelector<HTMLButtonElement>('#back-to-menu')?.click();
      return;
    }
    if (this.moving) return;
    let dx = 0;
    let dy = 0;
    if (this.keys.W.isDown || this.keys.UP.isDown) dy = -1;
    else if (this.keys.S.isDown || this.keys.DOWN.isDown) dy = 1;
    else if (this.keys.A.isDown || this.keys.LEFT.isDown) dx = -1;
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx = 1;
    if ((!dx && !dy) || !canEnter(this.tile.x + dx, this.tile.y + dy)) return;
    this.tile.x += dx;
    this.tile.y += dy;
    this.moving = true;
    this.tweens.add({ targets: this.player,
      x: this.tile.x * TILE_SIZE + 24, y: this.tile.y * TILE_SIZE + 24,
      duration: 170, onComplete: () => { this.moving = false; } });
  }
}
