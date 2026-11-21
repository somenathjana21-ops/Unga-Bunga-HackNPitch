// Horde Arena maps and per-match procedural cover generator.
// Pure module (no Phaser/DOM dependency) so layout safety invariants can be unit-tested.

import type { CoverRect } from '../combat/types';
import type { AmbienceTrack, MusicTrack } from '../../services/audio';

export const HORDE_ARENA_WIDTH = 1440;
export const HORDE_ARENA_HEIGHT = 864;

export const HORDE_MAP_IDS = ['warehouse', 'settlement', 'library', 'campus'] as const;
export type HordeMapId = typeof HORDE_MAP_IDS[number];
export type HordeMapChoice = HordeMapId | 'random';

export interface HordeMapDefinition {
  id: HordeMapId;
  name: string;
  shortName: string;
  tagline: string;
  backgroundKey: string;
  backgroundPath: string;
  musicTrack: MusicTrack;
  ambienceTrack: AmbienceTrack;
  backdropTint: number;
  doomTint: number;
  gridColor: number;
  coverBase: number;
  coverTop: number;
  coverPanel: number;
  coverAccent: number;
  coverTrim: number;
  coverCountMin: number;
  coverCountMax: number;
  /** Preferred barricade dimension templates (w, h) to give each map a distinct tactical feel. */
  coverTemplates: readonly { w: number; h: number }[];
}

export const hordeMaps: Record<HordeMapId, HordeMapDefinition> = {
  warehouse: {
    id: 'warehouse',
    name: 'Twilight Warehouse Yard',
    shortName: 'Warehouse',
    tagline: 'Cebu 2085 salvage depot · Heavy steel crates & balanced sightlines',
    backgroundKey: 'horde-bg-warehouse',
    backgroundPath: '/assets/backgrounds/twilight-ruins-warehouse-yard.png',
    musicTrack: 'rescue',
    ambienceTrack: 'ruined-city',
    backdropTint: 0xa6b6cc,
    doomTint: 0xd98a8a,
    gridColor: 0x334155,
    coverBase: 0x1f2836,
    coverTop: 0x38475e,
    coverPanel: 0x151c27,
    coverAccent: 0xe3b16b,
    coverTrim: 0x52627a,
    coverCountMin: 9,
    coverCountMax: 12,
    coverTemplates: [
      { w: 84, h: 52 },
      { w: 56, h: 86 },
      { w: 72, h: 56 },
      { w: 102, h: 44 },
    ],
  },
  settlement: {
    id: 'settlement',
    name: 'Settlement Courtyard',
    shortName: 'Settlement',
    tagline: 'Resistance camp perimeter · Sandbag bunkers & wide flanking corridors',
    backgroundKey: 'horde-bg-settlement',
    backgroundPath: '/assets/backgrounds/post-apocalyptic-courtyard-camp.png',
    musicTrack: 'rescue',
    ambienceTrack: 'clinic-camp',
    backdropTint: 0xc4b89f,
    doomTint: 0xdc887d,
    gridColor: 0x4b4338,
    coverBase: 0x332b24,
    coverTop: 0x52463a,
    coverPanel: 0x241e19,
    coverAccent: 0xf59e0b,
    coverTrim: 0x736352,
    coverCountMin: 10,
    coverCountMax: 13,
    coverTemplates: [
      { w: 96, h: 44 },
      { w: 46, h: 92 },
      { w: 68, h: 64 },
      { w: 80, h: 48 },
    ],
  },
  library: {
    id: 'library',
    name: 'Twilight Library Plaza',
    shortName: 'Library',
    tagline: 'Breached 2026 courtyard · Stone columns & crisp crossfire lanes',
    backgroundKey: 'horde-bg-library',
    backgroundPath: '/assets/backgrounds/twilight-library-courtyard-encounter.png',
    musicTrack: 'future',
    ambienceTrack: 'campus',
    backdropTint: 0xb2a6d4,
    doomTint: 0xd9809c,
    gridColor: 0x473966,
    coverBase: 0x2a213d,
    coverTop: 0x453863,
    coverPanel: 0x1d162b,
    coverAccent: 0xc084fc,
    coverTrim: 0x6b5b95,
    coverCountMin: 9,
    coverCountMax: 12,
    coverTemplates: [
      { w: 64, h: 64 },
      { w: 54, h: 82 },
      { w: 82, h: 50 },
      { w: 58, h: 58 },
    ],
  },
  campus: {
    id: 'campus',
    name: 'Campus Avenue',
    shortName: 'Campus',
    tagline: 'Open twilight road & crosswalk · Long barriers built for Rusher cover-slams',
    backgroundKey: 'horde-bg-campus',
    backgroundPath: '/assets/backgrounds/campus-library-approach.png',
    musicTrack: 'future',
    ambienceTrack: 'campus',
    backdropTint: 0x9cb4d6,
    doomTint: 0xd98686,
    gridColor: 0x364a63,
    coverBase: 0x222c3a,
    coverTop: 0x3b4d66,
    coverPanel: 0x171f29,
    coverAccent: 0x38bdf8,
    coverTrim: 0x567091,
    coverCountMin: 8,
    coverCountMax: 11,
    coverTemplates: [
      { w: 116, h: 40 },
      { w: 42, h: 98 },
      { w: 92, h: 44 },
      { w: 68, h: 54 },
    ],
  },
};

export function resolveHordeMap(choice: HordeMapChoice, rng: () => number = Math.random): HordeMapId {
  if (choice !== 'random' && HORDE_MAP_IDS.includes(choice)) {
    return choice;
  }
  const idx = Math.floor(Math.max(0, Math.min(0.999999, rng())) * HORDE_MAP_IDS.length);
  return HORDE_MAP_IDS[idx];
}

export function isHordeMapId(value: unknown): value is HordeMapId {
  return typeof value === 'string' && HORDE_MAP_IDS.includes(value as HordeMapId);
}

/**
 * Generates a fresh, balanced set of randomized tactical cover blocks for a Horde match.
 * Guarantees:
 * - Wide clear spawn plaza around arena center so K never spawns boxed in
 * - Walkable flanking perimeter around outer arena bounds
 * - Generous corridor gap (>= 70px) between every pair of cover blocks
 * - Spread across all 4 quadrants so no quadrant is barren or overcrowded
 */
export function generateRandomHordeCover(
  width: number = HORDE_ARENA_WIDTH,
  height: number = HORDE_ARENA_HEIGHT,
  mapId: HordeMapId = 'warehouse',
  rng: () => number = Math.random,
): CoverRect[] {
  const def = hordeMaps[mapId];
  const countSpan = def.coverCountMax - def.coverCountMin + 1;
  const targetCount = def.coverCountMin + Math.floor(rng() * countSpan);

  const cx = width * 0.5;
  const cy = height * 0.52;
  const marginX = 86;
  const marginTop = 92;
  const marginBottom = 86;
  const spawnClearRadius = 128;
  const minGap = 72;

  const rects: CoverRect[] = [];

  const fits = (cand: CoverRect): boolean => {
    if (
      cand.x < marginX
      || cand.y < marginTop
      || cand.x + cand.w > width - marginX
      || cand.y + cand.h > height - marginBottom
    ) {
      return false;
    }

    // Keep center spawn plaza open
    const closestX = Math.max(cand.x, Math.min(cx, cand.x + cand.w));
    const closestY = Math.max(cand.y, Math.min(cy, cand.y + cand.h));
    if (Math.hypot(cx - closestX, cy - closestY) < spawnClearRadius) {
      return false;
    }

    // Keep clean corridor gap between every pair of barricades
    for (const existing of rects) {
      const separated =
        cand.x + cand.w + minGap <= existing.x
        || existing.x + existing.w + minGap <= cand.x
        || cand.y + cand.h + minGap <= existing.y
        || existing.y + existing.h + minGap <= cand.y;
      if (!separated) return false;
    }
    return true;
  };

  // Seed at least 1 cover piece per quadrant first so the whole arena stays playable.
  const quadrants = [
    { minX: marginX, maxX: cx - 50, minY: marginTop, maxY: cy - 30 },
    { minX: cx + 50, maxX: width - marginX, minY: marginTop, maxY: cy - 30 },
    { minX: marginX, maxX: cx - 50, minY: cy + 30, maxY: height - marginBottom },
    { minX: cx + 50, maxX: width - marginX, minY: cy + 30, maxY: height - marginBottom },
  ];

  for (let i = 0; i < targetCount; i++) {
    const q = quadrants[i % quadrants.length];
    let placed = false;
    for (let attempt = 0; attempt < 48; attempt++) {
      const tmpl = def.coverTemplates[Math.floor(rng() * def.coverTemplates.length)];
      // Slight organic width/height variation (+/- 8px)
      const w = Math.max(40, Math.round(tmpl.w + (rng() - 0.5) * 16));
      const h = Math.max(38, Math.round(tmpl.h + (rng() - 0.5) * 14));
      const useQuadrant = attempt < 28;
      const xMin = useQuadrant ? q.minX : marginX;
      const xMax = Math.max(xMin + 10, (useQuadrant ? q.maxX : width - marginX) - w);
      const yMin = useQuadrant ? q.minY : marginTop;
      const yMax = Math.max(yMin + 10, (useQuadrant ? q.maxY : height - marginBottom) - h);

      const cand: CoverRect = {
        x: Math.round(xMin + rng() * (xMax - xMin)),
        y: Math.round(yMin + rng() * (yMax - yMin)),
        w,
        h,
      };
      if (fits(cand)) {
        rects.push(cand);
        placed = true;
        break;
      }
    }
    if (!placed) continue;
  }

  return rects;
}
