import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { DialogueScene } from './scenes/DialogueScene';
import type { Difficulty } from './rules';

export function createGame(parent: HTMLElement, difficulty: Difficulty): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 768,
    height: 432,
    backgroundColor: '#171d24',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [WorldScene, DialogueScene],
    audio: { noAudio: true },
    callbacks: {
      preBoot: (game) => {
        game.registry.set('difficulty', difficulty);
      },
    },
    // Phase 4 will enable audio after a user gesture; this preview contains no sound files.
  });
}