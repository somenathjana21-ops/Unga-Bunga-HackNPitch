import { checkpoints, milestones } from '../content/campaign';
import type { Checkpoint, Milestone } from '../content/campaign';
import { difficultyRules, MAX_HEALTH } from './rules';
import type { Difficulty } from './rules';

export interface RunState {
  version: 1;
  mode: 'campaign';
  difficulty: Difficulty;
  checkpoint: Checkpoint;
  health: number;
  counterUnlocked: boolean;
  rescueStatus: 'not-started' | 'active' | 'failed' | 'complete';
  milestones: Milestone[];
}

export function newRun(difficulty: Difficulty): RunState {
  return { version: 1, mode: 'campaign', difficulty, checkpoint: 'campus',
    health: MAX_HEALTH, counterUnlocked: false, rescueStatus: 'not-started', milestones: [] };
}

export function enterCheckpoint(state: RunState, checkpoint: Checkpoint): RunState {
  // Scene changes never heal. Combat must save each damaging hit, not only scene exits.
  return { ...state, checkpoint };
}

export function takeHit(state: RunState): RunState {
  const health = Math.max(0, state.health - difficultyRules[state.difficulty].damagePerHit);
  return { ...state, health,
    rescueStatus: health === 0 && state.rescueStatus === 'active' ? 'failed' : state.rescueStatus };
}

export function completeMilestone(state: RunState, milestone: Milestone): RunState {
  // Replaying an already-completed trigger cannot be farmed for healing.
  if (state.health === 0 || state.milestones.includes(milestone)) return state;
  return { ...state, health: MAX_HEALTH, milestones: [...state.milestones, milestone],
    rescueStatus: milestone === 'girl-rescued' ? 'complete' : state.rescueStatus };
}

export function restartRescue(state: RunState): RunState {
  if (state.rescueStatus !== 'failed') throw new Error('Only a failed rescue can be restarted.');
  return { ...state, checkpoint: 'rescue-start', health: MAX_HEALTH,
    rescueStatus: 'active', counterUnlocked: false };
}

export function isRunState(value: unknown): value is RunState {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return s.version === 1 && s.mode === 'campaign'
    && (s.difficulty === 'story' || s.difficulty === 'real')
    && checkpoints.includes(s.checkpoint as Checkpoint)
    && typeof s.health === 'number' && Number.isFinite(s.health) && s.health >= 0 && s.health <= MAX_HEALTH
    && typeof s.counterUnlocked === 'boolean'
    && ['not-started', 'active', 'failed', 'complete'].includes(s.rescueStatus as string)
    && Array.isArray(s.milestones) && s.milestones.length <= milestones.length
    && new Set(s.milestones).size === s.milestones.length
    && s.milestones.every((m) => milestones.includes(m as Milestone));
}
