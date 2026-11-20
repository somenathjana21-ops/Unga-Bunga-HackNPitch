import { describe, expect, it } from 'vitest';
import { playCutscene, shotProgress, panTransform } from '../src/game/cutscene/playback';
import { cutscenes } from '../src/content/cutscenes/ledger';

const c01 = cutscenes.c01!;

describe('cutscene playback', () => {
  it('starts on the first shot', () => {
    const ctrl = playCutscene(c01, { reducedMotion: false });
    expect(ctrl.current?.shot.id).toBe(c01.shots[0].id);
    expect(ctrl.current?.index).toBe(0);
    expect(ctrl.current?.last).toBe(false);
    expect(ctrl.completed).toBe(false);
  });

  it('advances through every shot and completes on the last', () => {
    const ctrl = playCutscene(c01, { reducedMotion: false });
    while (!ctrl.completed && ctrl.current) ctrl.advance();
    expect(ctrl.completed).toBe(true);
    expect(ctrl.current?.last).toBe(true);
    expect(ctrl.current?.shot.id).toBe(c01.shots[c01.shots.length - 1].id);
  });

  it('advancing past completion stays completed', () => {
    const ctrl = playCutscene(c01, { reducedMotion: false });
    while (!ctrl.completed) ctrl.advance();
    ctrl.advance();
    ctrl.advance();
    expect(ctrl.completed).toBe(true);
  });

  it('skip applies completion exactly once', () => {
    let calls = 0;
    const ctrl = playCutscene(c01, {
      reducedMotion: false,
      onComplete: () => { calls++; },
    });
    ctrl.skip();
    expect(ctrl.completed).toBe(true);
    expect(calls).toBe(1);
    ctrl.skip();
    ctrl.skip();
    expect(calls).toBe(1);
  });

  it('normal completion fires onComplete exactly once', () => {
    let calls = 0;
    const ctrl = playCutscene(c01, {
      reducedMotion: false,
      onComplete: () => { calls++; },
    });
    while (!ctrl.completed) ctrl.advance();
    expect(calls).toBe(1);
  });

  it('shotProgress clamps between 0 and 1', () => {
    const shot = c01.shots[1]!;
    expect(shotProgress(shot, 0)).toBe(0);
    expect(shotProgress(shot, shot.pan!.durationMs / 2)).toBeCloseTo(0.5);
    expect(shotProgress(shot, shot.pan!.durationMs)).toBe(1);
    expect(shotProgress(shot, shot.pan!.durationMs * 10)).toBe(1);
    expect(shotProgress({ ...shot, pan: undefined }, 999)).toBe(1);
  });

  it('panTransform returns identity under reduced motion', () => {
    const shot = c01.shots[1]!;
    const t = panTransform(shot.pan!, 0.5, true);
    expect(t).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('panTransform interpolates normally', () => {
    const shot = c01.shots[1]!;
    const t = panTransform(shot.pan!, 0.5, false);
    expect(t.scale).toBeCloseTo(1.03);
    expect(t.x).toBeCloseTo(0.01);
  });

  it('plays c01, c02, c03, and c04 sequentially to completion once each', () => {
    for (const id of ['c01', 'c02', 'c03', 'c04'] as const) {
      const cs = cutscenes[id]!;
      let completions = 0;
      const ctrl = playCutscene(cs, {
        reducedMotion: false,
        onComplete: (completedId) => {
          expect(completedId).toBe(id);
          completions++;
        },
      });
      let steps = 0;
      while (!ctrl.completed && steps < 30) {
        ctrl.advance();
        steps++;
      }
      expect(ctrl.completed).toBe(true);
      expect(steps).toBe(cs.shots.length);
      expect(completions).toBe(1);
    }
  });
});