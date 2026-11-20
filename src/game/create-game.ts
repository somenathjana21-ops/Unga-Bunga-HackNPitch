import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { DialogueScene } from './scenes/DialogueScene';
import { MAX_HEALTH } from './rules';
import type { Difficulty } from './rules';
import type { RunState } from './state';

export function createGame(parent: HTMLElement, difficulty: Difficulty, initialState?: RunState): Phaser.Game {
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
        if (initialState) {
          // Resume the saved campaign state. Health is never reset to fresh on reload.
          game.registry.set('health', initialState.health);
          game.registry.set('checkpoint', initialState.checkpoint);
          game.registry.set('milestones', initialState.milestones);
          game.registry.set('counterUnlocked', initialState.counterUnlocked);
          game.registry.set('rescueStatus', initialState.rescueStatus);
        } else {
          game.registry.set('health', MAX_HEALTH);
          game.registry.set('checkpoint', 'campus');
          game.registry.set('milestones', []);
          game.registry.set('counterUnlocked', false);
          game.registry.set('rescueStatus', 'not-started');
        }
      },
    },
    // Phase 4 will enable audio after a user gesture; this preview contains no sound files.
  });
}