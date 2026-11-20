// Phase 4 cutscene playback: pure rules for advancing a shot sequence,
// computing restrained camera motion, and guaranteeing that skip and normal
// completion apply the same story state exactly once. No Phaser, no DOM, no
// audio - easy to unit test.

import type { Cutscene, CutscenePan, CutsceneShot } from '../../content/cutscenes/ledger';

export interface ShotView {
  shot: CutsceneShot;
  index: number;
  last: boolean;
  transform: ShotTransform;
  reducedMotion: boolean;
}

export interface ShotTransform {
  scale: number;
  x: number;
  y: number;
}

export interface CutsceneController {
  readonly current: ShotView | null;
  readonly completed: boolean;
  readonly reducedMotion: boolean;
  advance(): void;
  skip(): void;
}

export interface PlaybackOptions {
  reducedMotion: boolean;
  onComplete?(cutsceneId: string): void;
}

/** How far through a pan's duration (0..1) the player is at a given shot. */
export function shotProgress(shot: CutsceneShot, elapsedMs: number): number {
  const duration = shot.pan?.durationMs ?? 0;
  if (!duration) return 1;
  return Math.min(1, Math.max(0, elapsedMs / duration));
}

export function panTransform(
  pan: CutscenePan,
  progress: number,
  reducedMotion: boolean,
): ShotTransform {
  if (reducedMotion) {
    return { scale: 1, x: 0, y: 0 };
  }
  const scale = pan.from.scale + (pan.to.scale - pan.from.scale) * progress;
  const x = pan.from.x + (pan.to.x - pan.from.x) * progress;
  const y = pan.from.y + (pan.to.y - pan.from.y) * progress;
  return { scale, x, y };
}

export function shotTransform(shot: CutsceneShot, elapsedMs: number, reducedMotion: boolean): ShotTransform {
  if (!shot.pan) return { scale: 1, x: 0, y: 0 };
  return panTransform(shot.pan, shotProgress(shot, elapsedMs), reducedMotion);
}

/** Build a controller over a cutscene's shot sequence. */
export function playCutscene(cutscene: Cutscene, options: PlaybackOptions): CutsceneController {
  let index = -1;
  let completed = false;
  let shotStart = 0;
  let lastElapsed = 0;

  const setShot = (next: number): void => {
    index = next;
    shotStart = performance.now();
    lastElapsed = 0;
  };

  const finish = (): void => {
    if (completed) return;
    completed = true;
    index = cutscene.shots.length - 1;
    options.onComplete?.(cutscene.id);
  };

  const current = (): ShotView | null => {
    if (index < 0 || index >= cutscene.shots.length) return null;
    const shot = cutscene.shots[index];
    const elapsed = completed ? lastElapsed : performance.now() - shotStart;
    return {
      shot,
      index,
      last: index === cutscene.shots.length - 1,
      transform: shotTransform(shot, elapsed, options.reducedMotion),
      reducedMotion: options.reducedMotion,
    };
  };

  // Start on the first shot immediately.
  setShot(0);

  return {
    get current() { return current(); },
    get completed() { return completed; },
    get reducedMotion() { return options.reducedMotion; },
    advance(): void {
      if (completed) return;
      if (index < 0 || index >= cutscene.shots.length - 1) {
        finish();
        return;
      }
      setShot(index + 1);
    },
    skip(): void {
      finish();
    },
  };
}

export type { Cutscene, CutsceneShot, CutscenePan };