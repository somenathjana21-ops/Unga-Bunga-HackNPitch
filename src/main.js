/**
 * WANT entry point (Phase 0 shell).
 *
 * Composes the core loop, input, asset manifest, audio stub and boot screen.
 * Phase 1 will replace the boot screen with the first playable scene; the
 * shell and system boundaries stay the same.
 */

import { Game } from './core/game.js';
import { isEditableTarget } from './core/input.js';
import * as assetManifest from './systems/asset-manifest.js';
import { AudioSystem } from './systems/audio.js';
import { drawBootScreen } from './ui/boot-screen.js';

const VERSION = 'v0.0.0-phase0';

const canvas = document.getElementById('game');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('index.html is missing <canvas id="game">.');
}

const audio = new AudioSystem(assetManifest);
audio.attachUnlock(window);

const game = new Game(canvas, {
  onRender(ctx, frame) {
    drawBootScreen(ctx, {
      ...frame,
      version: VERSION,
      audioState: audio.getState(),
      assetSummary: assetManifest.summary(),
    });
  },
});

function togglePause() {
  game.togglePause('manual');
}

window.addEventListener('keydown', (event) => {
  if (event.repeat || isEditableTarget(event.target)) return;
  if (event.code !== 'KeyP' && event.code !== 'Escape') return;
  event.preventDefault();
  togglePause();
});

game.start();

document.documentElement.dataset.wantReady = 'true';

/** Debug handle used by the headless check and manual testing. */
window.WANT = Object.freeze({
  version: VERSION,
  game,
  audio,
  assets: assetManifest,
});
