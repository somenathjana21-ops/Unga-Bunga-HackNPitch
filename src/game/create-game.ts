import Phaser from 'phaser';
import { PreviewScene } from './scenes/PreviewScene';
import { WorldScene } from './scenes/WorldScene';

// Development route: `?world` starts the Phase 1 campus slice instead of the
// foundation preview. The preview remains the default menu entry point.
const startWorld = new URLSearchParams(window.location.search).has('world');

export function createGame(parent: HTMLElement): Phaser.Game {
  // Phaser auto-starts only the first scene given, so ordering controls which
  // scene enters first. The preview stays the default menu route; `?world`
  // opts into the Phase 1 campus slice as a development route.
  const scenes = startWorld ? [WorldScene, PreviewScene] : [PreviewScene, WorldScene];
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
    // Phase 4 will enable audio after a user gesture; this preview contains no sound files.
  });
}
