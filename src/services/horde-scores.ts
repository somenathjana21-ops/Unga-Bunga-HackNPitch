// Local persistence for Horde Mode player name and scores.
// Strictly separate from want.campaign.v1 so Horde data can never corrupt or
// modify Story Mode saves.

import {
  HORDE_DIFFICULTIES,
  HORDE_DURATIONS,
  normalizePlayerName,
  type HordeDifficulty,
  type HordeDuration,
} from '../game/horde/rules';

export const HORDE_SCORES_KEY = 'want.horde.scores.v1';
export const HORDE_PLAYER_KEY = 'want.horde.player.v1';
const MAX_STORED_SCORES = 50;

export interface HordeScoreEntry {
  version: 1;
  id: string;
  playerName: string;
  difficulty: HordeDifficulty;
  duration: HordeDuration;
  score: number;
  kills: number;
  counterKills: number;
  waveReached: number;
  survivedSeconds: number;
  cleared: boolean;
  timestamp: number;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function isHordeScoreEntry(value: unknown): value is HordeScoreEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return e.version === 1
    && typeof e.id === 'string' && e.id.length > 0
    && typeof e.playerName === 'string' && e.playerName.trim().length > 0
    && HORDE_DIFFICULTIES.includes(e.difficulty as HordeDifficulty)
    && HORDE_DURATIONS.includes(e.duration as HordeDuration)
    && typeof e.score === 'number' && Number.isFinite(e.score) && e.score >= 0
    && typeof e.kills === 'number' && Number.isFinite(e.kills) && e.kills >= 0
    && typeof e.counterKills === 'number' && Number.isFinite(e.counterKills) && e.counterKills >= 0
    && typeof e.waveReached === 'number' && Number.isFinite(e.waveReached) && e.waveReached >= 1
    && typeof e.survivedSeconds === 'number' && Number.isFinite(e.survivedSeconds) && e.survivedSeconds >= 0
    && typeof e.cleared === 'boolean'
    && typeof e.timestamp === 'number' && Number.isFinite(e.timestamp);
}

export function loadHordeScores(storage?: Store): HordeScoreEntry[] {
  try {
    const raw = (storage ?? window.localStorage).getItem(HORDE_SCORES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isHordeScoreEntry)
      .sort((a, b) => b.score - a.score || b.survivedSeconds - a.survivedSeconds || b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export function saveHordeScore(
  entry: Omit<HordeScoreEntry, 'version' | 'id' | 'timestamp'> & { id?: string; timestamp?: number },
  storage?: Store,
): HordeScoreEntry | null {
  const cleanName = normalizePlayerName(entry.playerName);
  if (!cleanName) return null;
  const record: HordeScoreEntry = {
    version: 1,
    id: entry.id ?? `hs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    playerName: cleanName,
    difficulty: entry.difficulty,
    duration: entry.duration,
    score: Math.max(0, Math.round(entry.score)),
    kills: Math.max(0, Math.round(entry.kills)),
    counterKills: Math.max(0, Math.round(entry.counterKills)),
    waveReached: Math.max(1, Math.round(entry.waveReached)),
    survivedSeconds: Math.max(0, Math.round(entry.survivedSeconds)),
    cleared: Boolean(entry.cleared),
    timestamp: entry.timestamp ?? Date.now(),
  };
  if (!isHordeScoreEntry(record)) return null;

  const existing = loadHordeScores(storage);
  const next = [...existing, record]
    .sort((a, b) => b.score - a.score || b.survivedSeconds - a.survivedSeconds || b.timestamp - a.timestamp)
    .slice(0, MAX_STORED_SCORES);

  try {
    (storage ?? window.localStorage).setItem(HORDE_SCORES_KEY, JSON.stringify(next));
  } catch {
    // Still return the record for immediate UI display even if storage is blocked.
  }
  return record;
}

export function loadLastHordePlayer(storage?: Store): string {
  try {
    const raw = (storage ?? window.localStorage).getItem(HORDE_PLAYER_KEY);
    return raw ? (normalizePlayerName(raw) ?? '') : '';
  } catch {
    return '';
  }
}

export function saveLastHordePlayer(name: string, storage?: Store): boolean {
  const clean = normalizePlayerName(name);
  if (!clean) return false;
  try {
    (storage ?? window.localStorage).setItem(HORDE_PLAYER_KEY, clean);
    return true;
  } catch {
    return false;
  }
}

export function filterHordeScores(
  scores: readonly HordeScoreEntry[],
  difficultyFilter: HordeDifficulty | 'all' = 'all',
  durationFilter: HordeDuration | 'all' = 'all',
): HordeScoreEntry[] {
  return scores.filter((s) =>
    (difficultyFilter === 'all' || s.difficulty === difficultyFilter)
    && (durationFilter === 'all' || s.duration === durationFilter),
  );
}
