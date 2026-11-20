import { isRunState } from '../game/state';
import type { RunState } from '../game/state';

export const SAVE_KEY = 'want.campaign.v1';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type SaveRead = { status: 'empty' | 'invalid' | 'unavailable' } | { status: 'ok'; state: RunState };

export function loadRun(storage?: Store): SaveRead {
  try {
    const value = (storage ?? window.localStorage).getItem(SAVE_KEY);
    if (!value) return { status: 'empty' };
    const parsed: unknown = JSON.parse(value);
    return isRunState(parsed) ? { status: 'ok', state: parsed } : { status: 'invalid' };
  } catch (error) {
    return { status: error instanceof SyntaxError ? 'invalid' : 'unavailable' };
  }
}

export function saveRun(state: RunState, storage?: Store): boolean {
  if (!isRunState(state)) return false;
  try {
    (storage ?? window.localStorage).setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch { return false; }
}
