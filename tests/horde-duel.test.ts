import { describe, expect, it } from 'vitest';
import {
  DUEL_ALPHABET,
  compareDuelScores,
  decideDuelOutcome,
  generateDuelCode,
  normalizeDuelCode,
  type DuelRoom,
  type DuelRoomPlayer,
  type DuelRunStats,
} from '../src/game/horde/duel';
import { FallbackHordeDuelBackend, LocalHordeDuelBackend } from '../src/services/horde-duel';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mulberry32, normalizeSeed, randomSeed } from '../src/game/horde/rules';

class MemoryStore {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null { return this.map.get(key) ?? null; }
  setItem(key: string, value: string): void { this.map.set(key, value); }
  removeItem(key: string): void { this.map.delete(key); }
}

function stats(overrides: Partial<DuelRunStats> = {}): DuelRunStats {
  return {
    score: 1000,
    kills: 10,
    counterKills: 2,
    waveReached: 3,
    survivedSeconds: 60,
    cleared: false,
    ...overrides,
  };
}

function player(seat: 1 | 2, overrides: Partial<DuelRoomPlayer> = {}): DuelRoomPlayer {
  return {
    seat,
    name: seat === 1 ? 'K' : 'Mai',
    isHost: seat === 1,
    finished: true,
    ...stats(),
    ...overrides,
  };
}

function room(players: DuelRoomPlayer[], matchMode: 'duel' | 'coop' = 'duel'): DuelRoom {
  return {
    code: 'ABC234',
    matchMode,
    difficulty: 'hard',
    duration: '5m',
    seed: 12345,
    status: 'complete',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    expired: false,
    players,
  };
}

describe('duel codes', () => {
  it('normalizes lowercase and spaced codes', () => {
    expect(normalizeDuelCode(' abc234 ')).toBe('ABC234');
    expect(normalizeDuelCode('ab-c 234')).toBe('ABC234');
  });

  it('rejects wrong lengths and ambiguous characters', () => {
    expect(normalizeDuelCode('ABC23')).toBeNull();
    expect(normalizeDuelCode('ABC2345')).toBeNull();
    expect(normalizeDuelCode('ABCI23')).toBeNull();
    expect(normalizeDuelCode('ABC013')).toBeNull();
  });

  it('generates six characters from the unambiguous alphabet', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateDuelCode();
      expect(code).toHaveLength(6);
      for (const char of code) expect(DUEL_ALPHABET).toContain(char);
    }
  });
});

describe('duel outcome', () => {
  it('awards the higher score', () => {
    const outcome = decideDuelOutcome(room([
      player(1, { score: 900 }),
      player(2, { score: 1200 }),
    ]));
    expect(outcome.kind).toBe('duel-win');
    if (outcome.kind === 'duel-win') expect(outcome.winner.seat).toBe(2);
  });

  it('breaks a score tie by survival, then kills, then counters', () => {
    expect(compareDuelScores(stats({ survivedSeconds: 80 }), stats({ survivedSeconds: 60 }))).toBeGreaterThan(0);
    expect(compareDuelScores(stats({ kills: 12 }), stats({ kills: 10 }))).toBeGreaterThan(0);
    expect(compareDuelScores(stats({ counterKills: 3 }), stats({ counterKills: 1 }))).toBeGreaterThan(0);
  });

  it('is a draw when every tie-breaker matches', () => {
    const outcome = decideDuelOutcome(room([player(1), player(2)]));
    expect(outcome.kind).toBe('draw');
  });

  it('waits until both seats submit', () => {
    const outcome = decideDuelOutcome(room([
      player(1),
      player(2, { finished: false }),
    ]));
    expect(outcome).toEqual({ kind: 'waiting', waitingFor: ['Mai'] });
  });

  it('combines both scores in team mode', () => {
    const outcome = decideDuelOutcome(room([
      player(1, { score: 500 }),
      player(2, { score: 700 }),
    ], 'coop'));
    expect(outcome.kind).toBe('coop');
    if (outcome.kind === 'coop') expect(outcome.totalScore).toBe(1200);
  });
});

describe('seeded Horde runs', () => {
  it('repeats the same stream for the same seed and diverges for another', () => {
    const first = mulberry32(42);
    const second = mulberry32(42);
    const different = mulberry32(43);
    const a = Array.from({ length: 5 }, () => first());
    const b = Array.from({ length: 5 }, () => second());
    const c = Array.from({ length: 5 }, () => different());
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a.every((n) => n >= 0 && n < 1)).toBe(true);
  });

  it('normalizes out-of-range seeds and produces a valid random seed', () => {
    expect(normalizeSeed(-12.9)).toBe(12);
    const seed = randomSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2147483647);
  });
});

describe('local duel backend', () => {
  it('creates, joins, scores once per seat and declares a winner', async () => {
    const backend = new LocalHordeDuelBackend(new MemoryStore());
    const created = await backend.create({
      hostName: 'K',
      difficulty: 'hard',
      duration: '5m',
      matchMode: 'duel',
      seed: 777,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.room.code).toHaveLength(6);
    expect(created.data.room.seed).toBe(777);
    expect(created.data.seat).toBe(1);

    const joined = await backend.join(created.data.room.code.toLowerCase(), 'Mai');
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    expect(joined.data.seat).toBe(2);

    const full = await backend.join(created.data.room.code, 'Isshin');
    expect(full.ok).toBe(false);
    if (!full.ok) expect(full.error.code).toBe('ROOM_FULL');

    const hostScore = await backend.submit(created.data, stats({ score: 4200, kills: 21 }));
    expect(hostScore.ok).toBe(true);
    if (hostScore.ok) expect(hostScore.data.status).toBe('open');

    const guestScore = await backend.submit(joined.data, stats({ score: 5100, kills: 25 }));
    expect(guestScore.ok).toBe(true);
    if (!guestScore.ok) return;
    expect(guestScore.data.status).toBe('complete');

    const outcome = decideDuelOutcome(guestScore.data);
    expect(outcome.kind).toBe('duel-win');
    if (outcome.kind === 'duel-win') expect(outcome.winner.name).toBe('Mai');

    const duplicate = await backend.submit(joined.data, stats({ score: 9999 }));
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.code).toBe('ALREADY_FINISHED');
  });

  it('rejects duplicate names and unknown codes', async () => {
    const backend = new LocalHordeDuelBackend(new MemoryStore());
    const created = await backend.create({
      hostName: 'K',
      difficulty: 'easy',
      duration: '1m',
      matchMode: 'coop',
      seed: 1,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const duplicateName = await backend.join(created.data.room.code, 'k');
    expect(duplicateName.ok).toBe(false);
    if (!duplicateName.ok) expect(duplicateName.error.code).toBe('NAME_TAKEN');

    const missing = await backend.join('ZZZ999', 'Mai');
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('ROOM_NOT_FOUND');
  });
});

describe('duel backend fallback', () => {
  it('degrades to local pass-and-play when Supabase calls fail', async () => {
    const failing = () =>
      Promise.resolve({
        data: null,
        error: { message: 'function create_horde_duel does not exist', details: '', hint: '' },
      });
    const client = { rpc: failing } as unknown as SupabaseClient;
    const backend = new FallbackHordeDuelBackend(client, new MemoryStore());
    expect(backend.kind).toBe('supabase');

    const created = await backend.create({
      hostName: 'K',
      difficulty: 'easy',
      duration: '1m',
      matchMode: 'duel',
      seed: 1,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(backend.kind).toBe('local'); // degraded after the first failing RPC
    expect(created.data.room.code).toHaveLength(6);
    expect(created.data.seat).toBe(1);

    const joined = await backend.join(created.data.room.code, 'Mai');
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    expect(joined.data.seat).toBe(2);

    const full = await backend.join(created.data.room.code, 'Isshin');
    expect(full.ok).toBe(false);
    if (!full.ok) expect(full.error.code).toBe('ROOM_FULL');

    const submitted = await backend.submit(joined.data, stats({ score: 5100, kills: 25 }));
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.data.status).toBe('open'); // host seat still outstanding

    const hostSubmitted = await backend.submit(created.data, stats({ score: 4200, kills: 21 }));
    expect(hostSubmitted.ok).toBe(true);
    if (!hostSubmitted.ok) return;
    expect(hostSubmitted.data.status).toBe('complete');

    const duplicate = await backend.submit(joined.data, stats({ score: 9999 }));
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.code).toBe('ALREADY_FINISHED');
  });

  it('labels itself local once degraded', async () => {
    const failing = () => Promise.resolve({ data: null, error: { message: 'Failed', details: '', hint: '' } });
    const client = { rpc: failing } as unknown as SupabaseClient;
    const backend = new FallbackHordeDuelBackend(client);
    expect(backend.label).toBe('Supabase online');
    await backend.create({
      hostName: 'K',
      difficulty: 'easy',
      duration: '1m',
      matchMode: 'duel',
      seed: 1,
    });
    expect(backend.kind).toBe('local');
    expect(backend.label).toBe('Local pass-and-play (duel service unavailable)');
  });

  it('propagates business errors instead of degrading to local', async () => {
    const roomFull = () =>
      Promise.resolve({
        data: null,
        error: { message: 'ROOM_FULL', details: '', hint: '' },
      });
    const client = { rpc: roomFull } as unknown as SupabaseClient;
    const backend = new FallbackHordeDuelBackend(client, new MemoryStore());
    expect(backend.kind).toBe('supabase');

    const joined = await backend.join('ABC234', 'Mai');
    expect(joined.ok).toBe(false);
    if (!joined.ok) expect(joined.error.code).toBe('ROOM_FULL');
    expect(backend.kind).toBe('supabase'); // a full room is not an outage
  });

  it('degrades to local when Supabase is unreachable', async () => {
    const boom = () => Promise.reject(new Error('Failed to fetch'));
    const client = { rpc: boom } as unknown as SupabaseClient;
    const backend = new FallbackHordeDuelBackend(client, new MemoryStore());
    const created = await backend.create({
      hostName: 'K',
      difficulty: 'easy',
      duration: '1m',
      matchMode: 'duel',
      seed: 1,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(backend.kind).toBe('local'); // network failure degrades the session
  });
});
