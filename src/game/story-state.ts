import type { Checkpoint } from '../content/campaign';

/**
 * Story progress tracking for the opening through settlement.
 * This is separate from RunState (which handles combat/save state).
 * Story flags track which dialogue sequences have been seen and which choices were made.
 *
 * Skip and read must set the same completion flags — this is the single source of truth.
 */

export const VALID_WORLD_MAPS = ['campus', 'library', 'dorm', 'clinic', 'settlement'] as const;
export type WorldMapId = typeof VALID_WORLD_MAPS[number];

export interface StoryProgress {
  /** Set of completed dialogue sequence IDs. */
  completedSequences: Set<string>;
  /** Story flags set by choices or events. */
  flags: Set<string>;
  /** Current map ID. */
  currentMap: string;
  /** Last saved tile coordinate inside currentMap (optional for backward compatibility). */
  tile?: { x: number; y: number };
  /** Current objective text. */
  objective: string;
  /** Track which settlement interactions have been visited. */
  settlementInteractions: Set<string>;
  /** Maps visited at least once during this run. */
  visitedMaps?: Set<string>;
}

export interface StoryProgressSnapshot {
  version: 1;
  completedSequences: string[];
  flags: string[];
  currentMap: WorldMapId;
  tile?: { x: number; y: number };
  objective: string;
  settlementInteractions: string[];
  visitedMaps: string[];
}

export function createStoryProgress(): StoryProgress {
  return {
    completedSequences: new Set(),
    flags: new Set(),
    currentMap: 'campus',
    objective: 'Reach the faculty library.',
    settlementInteractions: new Set(),
    visitedMaps: new Set(['campus']),
  };
}

/** Mark a dialogue sequence as complete. Called by both read and skip paths. */
export function completeSequence(progress: StoryProgress, sequenceId: string, completionFlag: string): void {
  progress.completedSequences.add(sequenceId);
  progress.flags.add(completionFlag);
}

/** Check if a sequence has been completed. */
export function isSequenceComplete(progress: StoryProgress, sequenceId: string): boolean {
  return progress.completedSequences.has(sequenceId);
}

/** Check if a flag is set. */
export function hasFlag(progress: StoryProgress, flag: string): boolean {
  return progress.flags.has(flag);
}

/** Set a story flag (e.g. from a choice). */
export function setFlag(progress: StoryProgress, flag: string): void {
  progress.flags.add(flag);
}

/** Change the current map and objective. */
export function enterMap(progress: StoryProgress, mapId: string, objective: string): void {
  progress.currentMap = mapId;
  progress.objective = objective;
  if (!progress.visitedMaps) progress.visitedMaps = new Set();
  progress.visitedMaps.add(mapId);
}

/** Mark a settlement interaction as visited. */
export function markSettlementInteraction(progress: StoryProgress, id: string): void {
  progress.settlementInteractions.add(id);
}

/** Check if all three settlement interactions have been visited. */
export function areAllSettlementInteractionsDone(progress: StoryProgress): boolean {
  return progress.settlementInteractions.size >= 3;
}

/** Reset story progress (for starting a new run). */
export function resetStoryProgress(): StoryProgress {
  return createStoryProgress();
}

/** Maps a world map ID to its corresponding RunState campaign checkpoint. */
export function mapToCheckpoint(mapId: string): Checkpoint {
  switch (mapId) {
    case 'dorm':
      return 'dorm';
    case 'clinic':
    case 'settlement':
      return 'camp';
    case 'campus':
    case 'library':
    default:
      return 'campus';
  }
}

/** Human-readable room label for the Continue button on the title screen. */
export function mapDisplayName(mapId: string): string {
  switch (mapId) {
    case 'campus': return 'Campus Walkway';
    case 'library': return 'Library Courtyard';
    case 'dorm': return 'Dormitory Room';
    case 'clinic': return 'Resistance Clinic';
    case 'settlement': return 'Settlement Courtyard';
    case 'rescue': return 'Rescue Mission';
    default: return 'Chapter One';
  }
}

export function serializeStoryProgress(
  progress: StoryProgress,
  tile?: { x: number; y: number },
): StoryProgressSnapshot {
  const mapId: WorldMapId = (VALID_WORLD_MAPS as readonly string[]).includes(progress.currentMap)
    ? (progress.currentMap as WorldMapId)
    : 'campus';
  const savedTile = tile ?? progress.tile;
  return {
    version: 1,
    completedSequences: [...progress.completedSequences],
    flags: [...progress.flags],
    currentMap: mapId,
    tile: savedTile && Number.isInteger(savedTile.x) && Number.isInteger(savedTile.y)
      ? { x: savedTile.x, y: savedTile.y }
      : undefined,
    objective: progress.objective,
    settlementInteractions: [...progress.settlementInteractions],
    visitedMaps: [...(progress.visitedMaps ?? new Set([mapId]))],
  };
}

export function isStoryProgressSnapshot(value: unknown): value is StoryProgressSnapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  const tileOk = s.tile === undefined || (
    typeof s.tile === 'object' && s.tile !== null
    && typeof (s.tile as Record<string, unknown>).x === 'number'
    && Number.isInteger((s.tile as Record<string, unknown>).x)
    && typeof (s.tile as Record<string, unknown>).y === 'number'
    && Number.isInteger((s.tile as Record<string, unknown>).y)
  );
  return s.version === 1
    && (VALID_WORLD_MAPS as readonly string[]).includes(s.currentMap as string)
    && typeof s.objective === 'string'
    && tileOk
    && Array.isArray(s.completedSequences) && s.completedSequences.every((x) => typeof x === 'string')
    && Array.isArray(s.flags) && s.flags.every((x) => typeof x === 'string')
    && Array.isArray(s.settlementInteractions) && s.settlementInteractions.every((x) => typeof x === 'string')
    && Array.isArray(s.visitedMaps) && s.visitedMaps.every((x) => typeof x === 'string');
}

export function deserializeStoryProgress(snapshot: StoryProgressSnapshot): StoryProgress {
  return {
    completedSequences: new Set(snapshot.completedSequences),
    flags: new Set(snapshot.flags),
    currentMap: snapshot.currentMap,
    tile: snapshot.tile ? { x: snapshot.tile.x, y: snapshot.tile.y } : undefined,
    objective: snapshot.objective,
    settlementInteractions: new Set(snapshot.settlementInteractions),
    visitedMaps: new Set(snapshot.visitedMaps.length > 0 ? snapshot.visitedMaps : [snapshot.currentMap]),
  };
}