export type RescueBeatId = 'alley' | 'hold' | 'extraction';

export const SWITCH_INTERACT_RADIUS = 105;
export const SWITCH_KEEP_RADIUS = 122;
export const SWITCH_HOLD_MS = 1000;

export type SwitchAttemptResult =
  | 'locked'
  | 'already-open'
  | 'already-holding'
  | 'too-far'
  | 'started';

/**
 * Pure gate-switch rule check used by RescueScene for both E-key and mouse-click
 * activation so the switch never fails silently and always provides clear feedback.
 */
export function evaluateSwitchAttempt(params: {
  beatId: RescueBeatId;
  gateOpen: boolean;
  holding: boolean;
  distancePx: number;
}): SwitchAttemptResult {
  if (params.gateOpen) return 'already-open';
  if (params.beatId !== 'extraction') return 'locked';
  if (params.holding) return 'already-holding';
  if (params.distancePx > SWITCH_INTERACT_RADIUS) return 'too-far';
  return 'started';
}

export function switchHoldProgress(startTime: number, now: number): number {
  return Math.min(1, Math.max(0, (now - startTime) / SWITCH_HOLD_MS));
}
