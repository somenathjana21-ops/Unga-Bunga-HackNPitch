// Phase 4 preferences: master/music/effects volume, mute and reduced motion.
// Kept separate from campaign saves: settings are not run progress, and a
// corrupt or blocked settings store must never stop play.

export type MotionPreference = 'auto' | 'reduce';

export interface Preferences {
  version: 1;
  master: number;
  music: number;
  effects: number;
  muted: boolean;
  reducedMotion: MotionPreference;
}

export const PREFERENCES_KEY = 'want.preferences.v1';

export const DEFAULT_PREFERENCES: Preferences = {
  version: 1,
  master: 0.7,
  music: 0.5,
  effects: 0.7,
  muted: false,
  reducedMotion: 'auto',
};

export type PreferencesRead =
  | { status: 'empty' | 'invalid' | 'unavailable' }
  | { status: 'ok'; preferences: Preferences };

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const isVolume = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

export function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.version === 1
    && isVolume(candidate.master)
    && isVolume(candidate.music)
    && isVolume(candidate.effects)
    && typeof candidate.muted === 'boolean'
    && (candidate.reducedMotion === 'auto' || candidate.reducedMotion === 'reduce');
}

export function loadPreferences(storage?: Store): PreferencesRead {
  try {
    const value = (storage ?? window.localStorage).getItem(PREFERENCES_KEY);
    if (!value) return { status: 'empty' };
    const parsed: unknown = JSON.parse(value);
    return isPreferences(parsed)
      ? { status: 'ok', preferences: parsed }
      : { status: 'invalid' };
  } catch (error) {
    return { status: error instanceof SyntaxError ? 'invalid' : 'unavailable' };
  }
}

export function savePreferences(preferences: Preferences, storage?: Store): boolean {
  if (!isPreferences(preferences)) return false;
  try {
    (storage ?? window.localStorage).setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}

/** True when the player asked the system for reduced motion. */
export function systemReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 'reduce' always reduces; 'auto' follows the operating system. */
export function resolveReducedMotion(preferences: Preferences, system: boolean): boolean {
  return preferences.reducedMotion === 'reduce' || (preferences.reducedMotion === 'auto' && system);
}