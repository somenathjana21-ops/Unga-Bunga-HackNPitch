// Multiplayer Horde duel transport.
//
// Supabase is the shared backend when VITE_SUPABASE_URL and a publishable key
// are configured. Otherwise (or if the client cannot be created) the same
// create/join/submit flow runs against localStorage so one browser can still
// host a pass-and-play duel. Local play never requires a network call.

import type { SupabaseClient } from '@supabase/supabase-js';
import { createOptionalSupabaseClient } from './supabase';
import {
  HORDE_DIFFICULTIES,
  HORDE_DURATIONS,
  normalizePlayerName,
  type HordeDifficulty,
  type HordeDuration,
} from '../game/horde/rules';
import {
  DUEL_ROOM_TTL_MS,
  generateDuelCode,
  normalizeDuelCode,
  sanitizeDuelStats,
  sortDuelPlayers,
  type DuelError,
  type DuelErrorCode,
  type DuelMatchMode,
  type DuelResponse,
  type DuelRoom,
  type DuelRoomPlayer,
  type DuelRunStats,
  type DuelSeat,
  type DuelSession,
  type DuelStatus,
} from '../game/horde/duel';

export interface CreateDuelInput {
  hostName: string;
  difficulty: HordeDifficulty;
  duration: HordeDuration;
  matchMode: DuelMatchMode;
  seed: number;
}

export interface HordeDuelBackend {
  readonly kind: 'supabase' | 'local';
  readonly label: string;
  create(input: CreateDuelInput): Promise<DuelResponse<DuelSession>>;
  join(code: string, playerName: string): Promise<DuelResponse<DuelSession>>;
  get(code: string): Promise<DuelResponse<DuelRoom>>;
  submit(session: DuelSession, stats: DuelRunStats): Promise<DuelResponse<DuelRoom>>;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const DUEL_SESSION_KEY = 'want.horde.duel.session.v1';
const LOCAL_DUELS_KEY = 'want.horde.duels.v1';

function fail(code: DuelErrorCode, message: string): DuelResponse<never> {
  return { ok: false, error: { code, message } };
}

function randomId(prefix: string): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function mapBackendError(message: string): DuelError {
  const known: DuelErrorCode[] = [
    'ROOM_NOT_FOUND', 'ROOM_FULL', 'ROOM_EXPIRED', 'NAME_TAKEN', 'INVALID_NAME',
    'INVALID_CODE', 'INVALID_TOKEN', 'ALREADY_FINISHED', 'INVALID_SCORE',
  ];
  const code = known.find((candidate) => message.includes(candidate)) ?? 'UNKNOWN';
  const friendly: Record<DuelErrorCode, string> = {
    ROOM_NOT_FOUND: 'That duel code was not found. Check the six characters and try again.',
    ROOM_FULL: 'This duel already has two players.',
    ROOM_EXPIRED: 'This duel code has expired. Create a new one.',
    NAME_TAKEN: 'That name is already used in this duel. Pick another callsign.',
    INVALID_NAME: 'Enter a callsign of 1-24 characters.',
    INVALID_CODE: 'Enter the six-character duel code.',
    INVALID_TOKEN: 'This browser cannot submit for that seat. Rejoin the duel.',
    ALREADY_FINISHED: 'That score was already submitted for this seat.',
    INVALID_SCORE: 'The run score was rejected.',
    BACKEND_UNAVAILABLE: 'The duel service is unavailable. Try again in a moment.',
    UNKNOWN: 'The duel service returned an unexpected error.',
  };
  return { code, message: friendly[code] };
}

function cleanMode(value: unknown): DuelMatchMode | null {
  return value === 'duel' || value === 'coop' ? value : null;
}

function cleanDifficulty(value: unknown): HordeDifficulty | null {
  return HORDE_DIFFICULTIES.includes(value as HordeDifficulty) ? value as HordeDifficulty : null;
}

function cleanDuration(value: unknown): HordeDuration | null {
  return HORDE_DURATIONS.includes(value as HordeDuration) ? value as HordeDuration : null;
}

function cleanSeat(value: unknown): DuelSeat | null {
  return value === 1 || value === 2 ? value : null;
}

function isExpired(expiresAt: string): boolean {
  const time = Date.parse(expiresAt);
  return Number.isFinite(time) && time <= Date.now();
}

export class SupabaseHordeDuelBackend implements HordeDuelBackend {
  readonly kind = 'supabase' as const;
  readonly label = 'Supabase online';

  constructor(private readonly client: SupabaseClient) {}

  private async call<T>(fn: string, args: Record<string, unknown>): Promise<DuelResponse<T>> {
    try {
      const { data, error } = await this.client.rpc(fn, args);
      if (error) return { ok: false, error: mapBackendError(error.message) } as DuelResponse<T>;
      if (!data) return fail('UNKNOWN', 'The duel service returned no data.') as DuelResponse<T>;
      return { ok: true, data: data as T };
    } catch {
      return fail('BACKEND_UNAVAILABLE', 'The duel service is unreachable.') as DuelResponse<T>;
    }
  }

  create(input: CreateDuelInput): Promise<DuelResponse<DuelSession>> {
    return this.call<DuelSession>('create_horde_duel', {
      p_host_name: input.hostName,
      p_difficulty: input.difficulty,
      p_duration: input.duration,
      p_match_mode: input.matchMode,
      p_seed: input.seed,
    });
  }

  join(code: string, playerName: string): Promise<DuelResponse<DuelSession>> {
    return this.call<DuelSession>('join_horde_duel', {
      p_code: code,
      p_player_name: playerName,
    });
  }

  get(code: string): Promise<DuelResponse<DuelRoom>> {
    return this.call<DuelRoom>('get_horde_duel', { p_code: code });
  }

  submit(session: DuelSession, stats: DuelRunStats): Promise<DuelResponse<DuelRoom>> {
    const clean = sanitizeDuelStats(stats);
    return this.call<DuelRoom>('submit_horde_duel_score', {
      p_player_id: session.playerId,
      p_token: session.token,
      p_score: clean.score,
      p_kills: clean.kills,
      p_counter_kills: clean.counterKills,
      p_wave_reached: clean.waveReached,
      p_survived_seconds: clean.survivedSeconds,
      p_cleared: clean.cleared,
    });
  }
}

interface LocalPlayerRecord extends DuelRoomPlayer {
  id: string;
  token: string;
}

interface LocalRoomRecord {
  code: string;
  matchMode: DuelMatchMode;
  difficulty: HordeDifficulty;
  duration: HordeDuration;
  seed: number;
  status: DuelStatus;
  expiresAt: string;
  players: LocalPlayerRecord[];
}

interface LocalFile {
  version: 1;
  rooms: Record<string, LocalRoomRecord>;
}

function emptyFile(): LocalFile {
  return { version: 1, rooms: {} };
}

function roomView(room: LocalRoomRecord): DuelRoom {
  const expired = isExpired(room.expiresAt);
  const players = sortDuelPlayers(room.players).map((player) => ({
    seat: player.seat,
    name: player.name,
    isHost: player.isHost,
    finished: player.finished,
    score: player.score,
    kills: player.kills,
    counterKills: player.counterKills,
    waveReached: player.waveReached,
    survivedSeconds: player.survivedSeconds,
    cleared: player.cleared,
  }));
  return {
    code: room.code,
    matchMode: room.matchMode,
    difficulty: room.difficulty,
    duration: room.duration,
    seed: room.seed,
    status: expired ? 'complete' : room.status,
    expiresAt: room.expiresAt,
    expired,
    players,
  };
}

/** Same contract as the Supabase backend, persisted in localStorage for offline/pass-and-play. */
export class LocalHordeDuelBackend implements HordeDuelBackend {
  readonly kind = 'local' as const;
  readonly label = 'Local pass-and-play';

  constructor(private readonly storage?: Store) {}

  private store(): Store {
    return this.storage ?? window.localStorage;
  }

  private read(): LocalFile {
    try {
      const raw = this.store().getItem(LOCAL_DUELS_KEY);
      if (!raw) return emptyFile();
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyFile();
      const file = parsed as Partial<LocalFile>;
      if (file.version !== 1 || !file.rooms || typeof file.rooms !== 'object') return emptyFile();
      return { version: 1, rooms: file.rooms };
    } catch {
      return emptyFile();
    }
  }

  private write(file: LocalFile): boolean {
    try {
      this.store().setItem(LOCAL_DUELS_KEY, JSON.stringify(file));
      return true;
    } catch {
      return false;
    }
  }

  async create(input: CreateDuelInput): Promise<DuelResponse<DuelSession>> {
    const name = normalizePlayerName(input.hostName);
    const difficulty = cleanDifficulty(input.difficulty);
    const duration = cleanDuration(input.duration);
    const matchMode = cleanMode(input.matchMode);
    if (!name) return fail('INVALID_NAME', 'Enter a callsign of 1-24 characters.');
    if (!difficulty || !duration || !matchMode) return fail('UNKNOWN', 'Invalid duel setup.');

    const file = this.read();
    let code = generateDuelCode();
    for (let attempt = 0; attempt < 20 && file.rooms[code]; attempt++) code = generateDuelCode();

    const player: LocalPlayerRecord = {
      id: randomId('duel-player'),
      token: randomId('duel-token'),
      seat: 1,
      name,
      isHost: true,
      finished: false,
      score: 0,
      kills: 0,
      counterKills: 0,
      waveReached: 1,
      survivedSeconds: 0,
      cleared: false,
    };
    const room: LocalRoomRecord = {
      code,
      matchMode,
      difficulty,
      duration,
      seed: Math.abs(Math.trunc(input.seed)),
      status: 'open',
      expiresAt: new Date(Date.now() + DUEL_ROOM_TTL_MS).toISOString(),
      players: [player],
    };
    file.rooms[code] = room;
    if (!this.write(file)) return fail('BACKEND_UNAVAILABLE', 'Local duel storage is unavailable.');
    return {
      ok: true,
      data: { room: roomView(room), playerId: player.id, token: player.token, seat: 1 },
    };
  }

  async join(code: string, playerName: string): Promise<DuelResponse<DuelSession>> {
    const cleanCode = normalizeDuelCode(code);
    const name = normalizePlayerName(playerName);
    if (!cleanCode) return fail('INVALID_CODE', 'Enter the six-character duel code.');
    if (!name) return fail('INVALID_NAME', 'Enter a callsign of 1-24 characters.');

    const file = this.read();
    const room = file.rooms[cleanCode];
    if (!room) return fail('ROOM_NOT_FOUND', 'That duel code was not found.');
    if (isExpired(room.expiresAt)) return fail('ROOM_EXPIRED', 'This duel code has expired.');
    if (room.players.length >= 2) return fail('ROOM_FULL', 'This duel already has two players.');
    if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return fail('NAME_TAKEN', 'That name is already used in this duel.');
    }

    const player: LocalPlayerRecord = {
      id: randomId('duel-player'),
      token: randomId('duel-token'),
      seat: room.players.some((p) => p.seat === 1) ? 2 : 1,
      name,
      isHost: false,
      finished: false,
      score: 0,
      kills: 0,
      counterKills: 0,
      waveReached: 1,
      survivedSeconds: 0,
      cleared: false,
    };
    room.players.push(player);
    if (!this.write(file)) return fail('BACKEND_UNAVAILABLE', 'Local duel storage is unavailable.');
    return {
      ok: true,
      data: { room: roomView(room), playerId: player.id, token: player.token, seat: player.seat },
    };
  }

  async get(code: string): Promise<DuelResponse<DuelRoom>> {
    const cleanCode = normalizeDuelCode(code);
    if (!cleanCode) return fail('INVALID_CODE', 'Enter the six-character duel code.');
    const room = this.read().rooms[cleanCode];
    if (!room) return fail('ROOM_NOT_FOUND', 'That duel code was not found.');
    return { ok: true, data: roomView(room) };
  }

  async submit(session: DuelSession, stats: DuelRunStats): Promise<DuelResponse<DuelRoom>> {
    const file = this.read();
    const room = file.rooms[session.room.code];
    if (!room) return fail('ROOM_NOT_FOUND', 'That duel code was not found.');
    const player = room.players.find((p) => p.id === session.playerId);
    if (!player || player.token !== session.token) {
      return fail('INVALID_TOKEN', 'This browser cannot submit for that seat.');
    }
    if (player.finished) return fail('ALREADY_FINISHED', 'That score was already submitted.');

    Object.assign(player, sanitizeDuelStats(stats), { finished: true });
    if (room.players.length === 2 && room.players.every((p) => p.finished)) room.status = 'complete';
    if (!this.write(file)) return fail('BACKEND_UNAVAILABLE', 'Local duel storage is unavailable.');
    return { ok: true, data: roomView(room) };
  }
}

let cachedBackend: HordeDuelBackend | null = null;

/** Supabase when configured; local otherwise. Never throws during startup. */
export function getHordeDuelBackend(): HordeDuelBackend {
  if (cachedBackend) return cachedBackend;
  try {
    const client = createOptionalSupabaseClient();
    if (client) {
      cachedBackend = new SupabaseHordeDuelBackend(client);
      return cachedBackend;
    }
  } catch (error) {
    console.warn('Supabase duel backend unavailable; using local pass-and-play.', error);
  }
  cachedBackend = new LocalHordeDuelBackend();
  return cachedBackend;
}

function validSession(value: unknown): value is DuelSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<DuelSession>;
  return typeof s.playerId === 'string' && s.playerId.length > 0
    && typeof s.token === 'string' && s.token.length > 0
    && cleanSeat(s.seat) !== null
    && !!s.room && typeof s.room === 'object'
    && typeof s.room.code === 'string' && normalizeDuelCode(s.room.code) === s.room.code;
}

export function saveStoredDuelSession(session: DuelSession, storage?: Store): void {
  try {
    (storage ?? window.localStorage).setItem(DUEL_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Session restore is a convenience; the in-memory session still works.
  }
}

export function loadStoredDuelSession(storage?: Store): DuelSession | null {
  try {
    const raw = (storage ?? window.localStorage).getItem(DUEL_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return validSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearStoredDuelSession(storage?: Store): void {
  try {
    (storage ?? window.localStorage).removeItem(DUEL_SESSION_KEY);
  } catch {
    // Nothing else to do.
  }
}
