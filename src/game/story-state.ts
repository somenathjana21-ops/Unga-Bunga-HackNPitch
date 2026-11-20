/**
 * Story progress tracking for the opening through settlement.
 * This is separate from RunState (which handles combat/save state).
 * Story flags track which dialogue sequences have been seen and which choices were made.
 *
 * Skip and read must set the same completion flags — this is the single source of truth.
 */

export interface StoryProgress {
  /** Set of completed dialogue sequence IDs. */
  completedSequences: Set<string>;
  /** Story flags set by choices or events. */
  flags: Set<string>;
  /** Current map ID. */
  currentMap: string;
  /** Current objective text. */
  objective: string;
  /** Track which settlement interactions have been visited. */
  settlementInteractions: Set<string>;
}

export function createStoryProgress(): StoryProgress {
  return {
    completedSequences: new Set(),
    flags: new Set(),
    currentMap: 'campus',
    objective: 'Reach the faculty library.',
    settlementInteractions: new Set(),
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