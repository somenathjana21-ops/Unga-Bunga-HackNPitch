import Phaser from 'phaser';
import { PreviewScene } from './scenes/PreviewScene';
import { CombatScene } from './scenes/CombatScene';

type SceneKey = 'preview' | 'combat';

const SCENES: Record<SceneKey, new () => Phaser.Scene> = {
  preview: PreviewScene,
  combat: CombatScene,
};

export function createGame(parent: HTMLElement, sceneKey: SceneKey = 'preview'): Phaser.Game {
  const Scene = SCENES[sceneKey];
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 768,
    height: 432,
    backgroundColor: '#171d24',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [Scene],
    audio: { noAudio: true },
    // Phase 4 will enable audio after a user gesture; this preview contains no sound files.
  });
}
