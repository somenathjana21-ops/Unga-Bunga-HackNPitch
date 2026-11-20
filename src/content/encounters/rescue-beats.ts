import type { EnemyKind } from '../../game/combat/types';

export interface RescueSpawn {
  kind: EnemyKind;
  // Beat-relative spawn time in milliseconds.
  timeMs: number;
  x: number;
  y: number;
}

export interface RescueBeatDef {
  id: 'alley' | 'hold' | 'extraction';
  spawns: RescueSpawn[];
  maxActive: number;
  holdSeconds?: number; // only meaningful for the hold beat
}

const ARENA_W = 768;
const LEFT_LANE_X = 36;
const RIGHT_LANE_X = ARENA_W - 36;

// Fixed enemy queues for the three rescue beats. Spawns are placed on the real
// open left/right alley entries inside the painted yard walls (y: 210..335),
// clear of the player start, cover blocks, Lina's shelter and Mai's alcove.
export const rescueBeats: RescueBeatDef[] = [
  {
    id: 'alley',
    maxActive: 2,
    spawns: [
      { kind: 'scout', timeMs: 0, x: RIGHT_LANE_X, y: 295 },
      { kind: 'rusher', timeMs: 3200, x: RIGHT_LANE_X, y: 330 },
    ],
  },
  {
    id: 'hold',
    maxActive: 3,
    holdSeconds: 45,
    spawns: [
      { kind: 'scout', timeMs: 0, x: RIGHT_LANE_X, y: 280 },
      { kind: 'rusher', timeMs: 5500, x: LEFT_LANE_X, y: 330 },
      { kind: 'scout', timeMs: 12000, x: RIGHT_LANE_X, y: 335 },
      { kind: 'rusher', timeMs: 18500, x: LEFT_LANE_X, y: 255 },
      { kind: 'scout', timeMs: 25500, x: RIGHT_LANE_X, y: 265 },
      { kind: 'rusher', timeMs: 32500, x: LEFT_LANE_X, y: 325 },
      { kind: 'scout', timeMs: 38500, x: RIGHT_LANE_X, y: 310 },
    ],
  },
  {
    id: 'extraction',
    maxActive: 2,
    spawns: [
      { kind: 'rusher', timeMs: 900, x: LEFT_LANE_X, y: 340 },
      { kind: 'scout', timeMs: 2800, x: RIGHT_LANE_X, y: 320 },
    ],
  },
] as const;

export type RescueBeatId = (typeof rescueBeats)[number]['id'];
