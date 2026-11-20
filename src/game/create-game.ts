import Phaser from 'phaser';
import { PreviewScene } from './scenes/PreviewScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 768,
    height: 432,
    backgroundColor: '#171d24',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [PreviewScene],
    audio: { noAudio: true },
    // Phase 4 will enable audio after a user gesture; this preview contains no sound files.
  });
}
