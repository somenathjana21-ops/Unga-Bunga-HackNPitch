// Pure rules for the shared-code Horde duel.
// No Phaser, storage or network calls live here so the match logic is testable.

import type { HordeDifficulty, HordeDuration } from './rules';

export const DUEL_CODE_LENGTH = 6;
export const DUEL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const DUEL_ROOM_TTL_MS = 24 * 60 * 60 * 1000;

export type DuelMatchMode = 'duel' | 'coop';
export type DuelStatus = 'open' | 'complete';
export type DuelSeat = 1 | 2;

export interface DuelRunStats {
  score: number;
  kills: number;
  counterKills: number;
  waveReached: number;
  survivedSeconds: number;
  cleared: boolean;
}

export interface DuelRoomPlayer extends DuelRunStats {
  seat: DuelSeat;
  name: string;
  isHost: boolean;
  finished: boolean;
}

export interface DuelRoom {
  code: string;
  matchMode: DuelMatchMode;
  difficulty: HordeDifficulty;
  duration: HordeDuration;
  seed: number;
  status: DuelStatus;
  expiresAt: string;
  expired: boolean;
  players: DuelRoomPlayer[];
}

export interface DuelSession {
  room: DuelRoom;
  playerId: string;
  token: string;
  seat: DuelSeat;
}

export type DuelOutcome =
  | { kind: 'waiting'; waitingFor: string[] }
  | { kind: 'duel-win'; winner: DuelRoomPlayer; loser: DuelRoomPlayer }
  | { kind: 'draw'; players: [DuelRoomPlayer, DuelRoomPlayer] }
  | { kind: 'coop'; totalScore: number; players: [DuelRoomPlayer, DuelRoomPlayer] };

export type DuelErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_EXPIRED'
  | 'NAME_TAKEN'
  | 'INVALID_NAME'
  | 'INVALID_CODE'
  | 'INVALID_TOKEN'
  | 'ALREADY_FINISHED'
  | 'INVALID_SCORE'
  | 'BACKEND_UNAVAILABLE'
  | 'UNKNOWN';

export interface DuelError {
  code: DuelErrorCode;
  message: string;
}

export type DuelResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: DuelError };

export const duelMatchModeLabels: Record<DuelMatchMode, string> = {
  duel: 'Duel · highest score wins',
  coop: 'Team · combined score',
};

/** Uppercases and strips punctuation. Returns null unless exactly 6 legal characters remain. */
export function normalizeDuelCode(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length !== DUEL_CODE_LENGTH) return null;
  for (const char of cleaned) {
    if (!DUEL_ALPHABET.includes(char)) return null;
  }
  return cleaned;
}

/** Generates a code from the unambiguous alphabet. Used by the local backend and tests. */
export function generateDuelCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < DUEL_CODE_LENGTH; i++) {
    code += DUEL_ALPHABET[Math.floor(random() * DUEL_ALPHABET.length)] ?? 'A';
  }
  return code;
}

export function duplicateDuelName(players: readonly DuelRoomPlayer[], name: string): boolean {
  const clean = name.trim().toLowerCase();
  return players.some((p) => p.name.trim().toLowerCase() === clean);
}

/** Lower score first; used by the result table. */
export function sortDuelPlayers(players: readonly DuelRoomPlayer[]): DuelRoomPlayer[] {
  return [...players].sort((a, b) => a.seat - b.seat);
}

/**
 * Duel tie-breakers after score: survival time, then kills, then counter kills.
 * A true tie is a draw rather than inventing a winner.
 */
export function compareDuelScores(a: DuelRunStats, b: DuelRunStats): number {
  if (a.score !== b.score) return a.score - b.score;
  if (a.survivedSeconds !== b.survivedSeconds) return a.survivedSeconds - b.survivedSeconds;
  if (a.kills !== b.kills) return a.kills - b.kills;
  return a.counterKills - b.counterKills;
}

/** Decides the room result once zero, one or both players have submitted. */
export function decideDuelOutcome(room: DuelRoom): DuelOutcome {
  const players = sortDuelPlayers(room.players);
  const unfinished = players.filter((p) => !p.finished);
  if (players.length < 2 || unfinished.length > 0) {
    return {
      kind: 'waiting',
      waitingFor: players.length < 2
        ? ['a second player']
        : unfinished.map((p) => p.name),
    };
  }

  const [first, second] = players as [DuelRoomPlayer, DuelRoomPlayer];
  if (room.matchMode === 'coop') {
    return {
      kind: 'coop',
      totalScore: Math.round(first.score + second.score),
      players: [first, second],
    };
  }

  const comparison = compareDuelScores(first, second);
  if (comparison === 0) return { kind: 'draw', players: [first, second] };
  return comparison > 0
    ? { kind: 'duel-win', winner: first, loser: second }
    : { kind: 'duel-win', winner: second, loser: first };
}

/** Keeps server/local payloads inside the same numeric bounds as the scoreboard. */
export function sanitizeDuelStats(stats: DuelRunStats): DuelRunStats {
  const clamp = (value: number, min: number) => Math.max(min, Math.round(Number.isFinite(value) ? value : min));
  return {
    score: clamp(stats.score, 0),
    kills: clamp(stats.kills, 0),
    counterKills: clamp(stats.counterKills, 0),
    waveReached: clamp(stats.waveReached, 1),
    survivedSeconds: clamp(stats.survivedSeconds, 0),
    cleared: Boolean(stats.cleared),
  };
}
