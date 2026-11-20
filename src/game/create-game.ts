import Phaser from 'phaser';
import { PreviewScene } from './scenes/PreviewScene';
import { WorldScene } from './scenes/WorldScene';
import { DialogueScene } from './scenes/DialogueScene';
import { CombatScene } from './scenes/CombatScene';
import { RescueScene } from './scenes/RescueScene';
import { MAX_HEALTH } from './rules';
import type { Difficulty } from './rules';
import type { RunState } from './state';

type SceneKey = 'preview' | 'world' | 'combat' | 'rescue';

const SCENES: Record<SceneKey, new () => Phaser.Scene> = {
  preview: PreviewScene,
  world: WorldScene,
  combat: CombatScene,
  rescue: RescueScene,
};

// Development route: `?world` starts the Phase 1 campus slice instead of the
// foundation preview. The preview remains the default menu entry point.
const startWorld = new URLSearchParams(window.location.search).has('world');

export function createGame(
  parent: HTMLElement,
  sceneKey: SceneKey = startWorld ? 'world' : 'preview',
  difficulty: Difficulty = 'story',
  initialState?: RunState,
): Phaser.Game {
  const Scene = SCENES[sceneKey];
  // Phaser auto-starts only the first scene given, so ordering controls which
  // scene enters first. All campaign scenes are registered so they can be
  // launched by key from world/combat/rescue code. The chosen scene also
  // appears in the shared list, so dedupe: Phaser throws on duplicate keys.
  const scenes = [...new Set<new () => Phaser.Scene>([
    Scene, WorldScene, DialogueScene, CombatScene, RescueScene, PreviewScene,
  ])];
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
