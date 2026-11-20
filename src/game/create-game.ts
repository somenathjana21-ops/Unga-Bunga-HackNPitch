import Phaser from 'phaser';
import { PreviewScene } from './scenes/PreviewScene';
import { WorldScene } from './scenes/WorldScene';
import { DialogueScene } from './scenes/DialogueScene';
import type { Difficulty } from './rules';
import type { RunState } from './state';

// Development route: `?world` starts the Phase 1 campus slice instead of the
// foundation preview. The preview remains the default menu entry point.
const startWorld = new URLSearchParams(window.location.search).has('world');

export function createGame(
  parent: HTMLElement,
  difficulty: Difficulty = 'story',
  initialState?: RunState,
): Phaser.Game {
  // Phaser auto-starts only the first scene given, so ordering controls which
  // scene enters first. The preview stays the default menu route; `?world`
  // opts into the Phase 1 campus slice as a development route.
  const scenes = startWorld ? [WorldScene, DialogueScene, PreviewScene] : [PreviewScene, WorldScene, DialogueScene];
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 768,
    height: 432,
    backgroundColor: '#171d24',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: scenes,
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
          game.registry.set('health', 100);
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
