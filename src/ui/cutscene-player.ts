// Phase 4 cutscene player: a keyboard-accessible DOM overlay that plays a
// ledger sequence as still images with captions, optional restrained pan/zoom,
// and a visible Skip / Next control. Sound starts only after a user gesture
// (audio.unlock() is called on the first interaction).
//
// Rendering is intentionally DOM-based, matching the dialogue and menu layers,
// so cutscenes never share a coordinate system with the Phaser canvas.

import { cutscenes } from '../content/cutscenes/ledger';
import type { Cutscene, CutsceneShot } from '../content/cutscenes/ledger';
import { playCutscene, panTransform, type CutsceneController } from '../game/cutscene/playback';
import { audio, type CueName } from '../services/audio';

let overlay: HTMLElement | null = null;
let imageEl: HTMLImageElement | null = null;
let cardEl: HTMLElement | null = null;
let captionEl: HTMLElement | null = null;
let panLayer: HTMLElement | null = null;
let videoEl: HTMLVideoElement | null = null;
let skipEl: HTMLButtonElement | null = null;
let nextEl: HTMLButtonElement | null = null;
let controller: CutsceneController | null = null;
let rafId: number | null = null;
let autoTimer: number | null = null;
let panStart = 0;

function ensureOverlay(): HTMLElement {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'cutscene';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'cutscene-title');
  overlay.innerHTML = `
    <div class="cutscene-backdrop"></div>
    <div class="cutscene-stage" id="cutscene-stage">
      <h2 id="cutscene-title" class="cutscene-title"></h2>
      <div class="cutscene-pan" id="cutscene-pan">
        <img class="cutscene-image" id="cutscene-image" alt="" />
        <video class="cutscene-video" id="cutscene-video" playsinline muted preload="none"></video>
        <div class="cutscene-card" id="cutscene-card"></div>
      </div>
      <p id="cutscene-caption" class="cutscene-caption"></p>
      <div class="cutscene-controls" id="cutscene-controls">
        <button class="cutscene-skip" id="cutscene-skip" type="button">Skip scene</button>
        <button class="cutscene-next" id="cutscene-next" type="button" disabled>Next</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function refs(): void {
  imageEl = document.getElementById('cutscene-image') as HTMLImageElement | null;
  cardEl = document.getElementById('cutscene-card') as HTMLElement | null;
  captionEl = document.getElementById('cutscene-caption') as HTMLElement | null;
  panLayer = document.getElementById('cutscene-pan') as HTMLElement | null;
  videoEl = document.getElementById('cutscene-video') as HTMLVideoElement | null;
  skipEl = document.getElementById('cutscene-skip') as HTMLButtonElement | null;
  nextEl = document.getElementById('cutscene-next') as HTMLButtonElement | null;
}

function imagePath(imageId: string): string {
  return `/assets/${imageId}.png`;
}

function renderShot(shot: CutsceneShot, transform: { scale: number; x: number; y: number }): void {
  if (!imageEl || !cardEl || !captionEl || !panLayer || !videoEl) return;
  const video = videoEl;
  const image = imageEl;
  const card = cardEl;

  image.hidden = true;
  card.hidden = true;
  video.hidden = true;
  video.pause();
  video.removeAttribute('src');
  video.load();

  if (shot.video && audio.unlocked) {
    // A supplied video takes priority. Play it, but fall back to a still or
    // text card if loading or playback is rejected.
    video.hidden = false;
    video.src = shot.video;
    video.setAttribute('aria-label', shot.caption);
    const tryPlay = () => {
      const promise = video.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => showFallback(shot));
      }
    };
    video.onerror = () => showFallback(shot);
    video.onloadeddata = tryPlay;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      tryPlay();
    }
  } else if (shot.kind === 'card') {
    card.hidden = false;
    card.textContent = shot.caption;
    card.setAttribute('aria-live', 'polite');
    image.alt = '';
  } else {
    image.hidden = false;
    image.src = imagePath(shot.imageId!);
    image.alt = shot.caption;
    const label = shot.kind === 'portrait' ? 'Character portrait' : 'Environment';
    image.setAttribute('aria-label', `${label}: ${shot.caption}`);
  }

  captionEl.textContent = shot.caption;

  if (controller && panLayer) {
    if (controller.reducedMotion || !shot.pan || shot.video) {
      panLayer.style.transform = 'none';
    } else {
      panLayer.style.transform = `scale(${transform.scale}) translate(${transform.x * 100}%, ${transform.y * 100}%)`;
    }
    panLayer.style.transformOrigin = 'center center';
  }
}

function showFallback(shot: CutsceneShot): void {
  if (!imageEl || !cardEl || !videoEl) return;
  const video = videoEl;
  const image = imageEl;
  const card = cardEl;
  video.hidden = true;
  video.pause();
  video.removeAttribute('src');
  video.load();
  if (shot.imageId) {
    image.hidden = false;
    image.src = imagePath(shot.imageId);
    image.alt = shot.caption;
  } else {
    card.hidden = false;
    card.textContent = shot.caption;
    card.setAttribute('aria-live', 'polite');
  }
}

function playShotAudio(shot: CutsceneShot): void {
  if (!audio.unlocked) return;
  for (const cue of shot.audio ?? []) {
    audio.playCue(cue as CueName);
  }
}

function startAutoAdvance(shot: CutsceneShot): void {
  stopAutoAdvance();
  if (shot.advanceAfterMs != null) {
    autoTimer = window.setTimeout(() => {
      autoTimer = null;
      controller?.advance();
    }, shot.advanceAfterMs);
  }
}

function stopAutoAdvance(): void {
  if (autoTimer !== null) {
    window.clearTimeout(autoTimer);
    autoTimer = null;
  }
}

function renderFrame(): void {
  if (!controller || !panLayer) return;
  const current = controller.current;
  if (!current) return;
  if (!controller.reducedMotion && current.shot.pan) {
    const elapsed = controller.completed
      ? current.shot.pan.durationMs
      : performance.now() - panStart;
    const progress = Math.min(1, Math.max(0, elapsed / current.shot.pan.durationMs));
    const transform = panTransform(current.shot.pan, progress, controller.reducedMotion);
    panLayer.style.transform = `scale(${transform.scale}) translate(${transform.x * 100}%, ${transform.y * 100}%)`;
  }
  rafId = requestAnimationFrame(renderFrame);
}

function show(cutscene: Cutscene, reducedMotion: boolean, onComplete: (cutsceneId: string) => void): void {
  const el = ensureOverlay();
  refs();
  const titleEl = document.getElementById('cutscene-title') as HTMLElement | null;
  if (titleEl) titleEl.textContent = cutscene.title;

  panStart = performance.now();

  controller = playCutscene(cutscene, {
    reducedMotion,
    onComplete: (id) => {
      stopAutoAdvance();
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      el.hidden = true;
      controller = null;
      onComplete(id);
    },
  });

  skipEl!.addEventListener('click', () => controller!.skip());
  nextEl!.addEventListener('click', () => controller!.advance());

  const onKey = (event: KeyboardEvent) => {
    if (!controller) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      controller.skip();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      controller.advance();
    }
  };
  el.addEventListener('keydown', onKey);

  const renderShotNow = () => {
    const current = controller!.current;
    if (!current) return;
    renderShot(current.shot, current.transform);
    playShotAudio(current.shot);
    startAutoAdvance(current.shot);
    if (!controller!.completed) rafId = requestAnimationFrame(renderFrame);
  };
  renderShotNow();
}

export function playCutsceneOverlay(options: {
  cutsceneId: string;
  onComplete: (cutsceneId: string) => void;
  reducedMotion: boolean;
}): void {
  const cutscene = cutscenes[options.cutsceneId];
  if (!cutscene) {
    console.error(`[CutscenePlayer] unknown cutscene: ${options.cutsceneId}`);
    options.onComplete(options.cutsceneId);
    return;
  }
  audio.unlock();
  show(cutscene, options.reducedMotion, options.onComplete);
}

export function destroyCutscenePlayer(): void {
  stopAutoAdvance();
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  imageEl = null;
  cardEl = null;
  captionEl = null;
  panLayer = null;
  videoEl = null;
  skipEl = null;
  nextEl = null;
  controller = null;
}
