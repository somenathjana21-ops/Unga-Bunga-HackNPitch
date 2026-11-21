import { isRunState } from '../game/state';
import type { RunState } from '../game/state';
import {
  isStoryProgressSnapshot,
  type StoryProgressSnapshot,
} from '../game/story-state';

export const SAVE_KEY = 'want.campaign.v1';
export const STORY_SAVE_KEY = 'want.story.v1';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type SaveRead = { status: 'empty' | 'invalid' | 'unavailable' } | { status: 'ok'; state: RunState };
export type StorySaveRead =
  | { status: 'empty' | 'invalid' | 'unavailable' }
  | { status: 'ok'; snapshot: StoryProgressSnapshot };

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

export function loadStoryProgress(storage?: Store): StorySaveRead {
  try {
    const value = (storage ?? window.localStorage).getItem(STORY_SAVE_KEY);
    if (!value) return { status: 'empty' };
    const parsed: unknown = JSON.parse(value);
    return isStoryProgressSnapshot(parsed) ? { status: 'ok', snapshot: parsed } : { status: 'invalid' };
  } catch (error) {
    return { status: error instanceof SyntaxError ? 'invalid' : 'unavailable' };
  }
}

export function saveStoryProgress(snapshot: StoryProgressSnapshot, storage?: Store): boolean {
  if (!isStoryProgressSnapshot(snapshot)) return false;
  try {
    (storage ?? window.localStorage).setItem(STORY_SAVE_KEY, JSON.stringify(snapshot));
    return true;
  } catch { return false; }
}

export function clearStoryProgress(storage?: Store): boolean {
  try {
    (storage ?? window.localStorage).removeItem(STORY_SAVE_KEY);
    return true;
  } catch { return false; }
}
