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
const ARENA_H = 432;
const EDGE = 10;

// Fixed enemy queues for the three rescue beats. Spawns are placed at arena edges,
// clear of the player start, cover blocks, Lina's shelter and the extraction
// destination. The hold uses a visible 45-second timer; the alley and extraction
// use short, readable sequences. Max active caps prevent a sudden pile of bodies.
export const rescueBeats: RescueBeatDef[] = [
  {
    id: 'alley',
    maxActive: 1,
    spawns: [
      { kind: 'scout', timeMs: 0, x: EDGE, y: ARENA_H * 0.5 },
      { kind: 'rusher', timeMs: 4500, x: ARENA_W - EDGE, y: ARENA_H * 0.5 },
    ],
  },
  {
    id: 'hold',
    maxActive: 3,
    holdSeconds: 45,
    spawns: [
      { kind: 'scout', timeMs: 0, x: EDGE, y: ARENA_H * 0.35 },
      { kind: 'rusher', timeMs: 7000, x: ARENA_W - EDGE, y: ARENA_H * 0.65 },
      { kind: 'scout', timeMs: 14000, x: ARENA_W * 0.5, y: EDGE },
      { kind: 'rusher', timeMs: 21000, x: ARENA_W * 0.5, y: ARENA_H - EDGE },
      { kind: 'scout', timeMs: 28000, x: EDGE, y: ARENA_H * 0.65 },
      { kind: 'rusher', timeMs: 35000, x: ARENA_W - EDGE, y: ARENA_H * 0.35 },
    ],
  },
  {
    id: 'extraction',
    maxActive: 1,
    spawns: [
      { kind: 'rusher', timeMs: 1000, x: ARENA_W - EDGE, y: ARENA_H * 0.5 },
    ],
  },
] as const;

export type RescueBeatId = (typeof rescueBeats)[number]['id'];
