// Pure Rescue Mission Lina Defense, Enemy Target Selection, and K Body-Block Rules.
// Decoupled from Phaser so targeting, interception, and Lina's HP/invulnerability
// rules are deterministically unit-tested.

import type { Difficulty } from '../rules';
import type { CombatEnemy } from './types';
import type { RescueBeatId } from './rescue-switch';

export const LINA_MAX_HEALTH = 100;
export const LINA_RADIUS = 13;
export const LINA_INVULN_MS = 950;
export const BODY_BLOCK_CORRIDOR_WIDTH = 28;
export const PLAYER_AGGRO_RADIUS = 96;

export type RescueFailureReason = 'k-down' | 'lina-down';
export type RescueTargetKind = 'player' | 'lina';

export interface LinaDefenseState {
  health: number;
  maxHealth: number;
  invulnerableUntil: number;
  hitAttackIds: string[];
  lastHitAt: number;
}

export interface LinaHitResult {
  hit: boolean;
  damage: number;
  defeated: boolean;
  remainingHealth: number;
}

export function createLinaDefenseState(): LinaDefenseState {
  return {
    health: LINA_MAX_HEALTH,
    maxHealth: LINA_MAX_HEALTH,
    invulnerableUntil: -Infinity,
    hitAttackIds: [],
    lastHitAt: -Infinity,
  };
}

/**
 * Story Mode: 25 damage per hit (4 hits to defeat Lina).
 * Real Mode:  34 damage per hit (3 hits to defeat Lina — intense but fair under pressure).
 */
export function linaDamageForDifficulty(difficulty: Difficulty): number {
  return difficulty === 'story' ? 25 : 34;
}

/**
 * Applies a frame-safe, attackId-deduplicated hit against Lina with brief post-hit
 * invulnerability so a single Rusher charge or overlapping burst never insta-deletes her.
 */
export function applyLinaHit(
  state: LinaDefenseState,
  attackId: string | null,
  difficulty: Difficulty,
  now: number,
): LinaHitResult {
  if (state.health <= 0) {
    return { hit: false, damage: 0, defeated: true, remainingHealth: 0 };
  }
  if (now < state.invulnerableUntil) {
    return { hit: false, damage: 0, defeated: false, remainingHealth: state.health };
  }
  if (attackId && state.hitAttackIds.includes(attackId)) {
    return { hit: false, damage: 0, defeated: false, remainingHealth: state.health };
  }

  const damage = linaDamageForDifficulty(difficulty);
  state.health = Math.max(0, state.health - damage);
  state.invulnerableUntil = now + LINA_INVULN_MS;
  state.lastHitAt = now;
  if (attackId) {
    state.hitAttackIds.push(attackId);
    if (state.hitAttackIds.length > 48) state.hitAttackIds.shift();
  }
  return {
    hit: true,
    damage,
    defeated: state.health <= 0,
    remainingHealth: state.health,
  };
}

/**
 * Returns true when K is physically standing in the corridor between an attacking
 * machine (or projectile origin) and Lina so K can intercept shots/charges for her.
 */
export function isPlayerInterceptingLine(
  sourceX: number,
  sourceY: number,
  linaX: number,
  linaY: number,
  playerX: number,
  playerY: number,
  corridorHalfWidth = BODY_BLOCK_CORRIDOR_WIDTH,
): boolean {
  const vx = linaX - sourceX;
  const vy = linaY - sourceY;
  const lenSq = vx * vx + vy * vy;
  if (lenSq < 1) return false;

  const t = ((playerX - sourceX) * vx + (playerY - sourceY) * vy) / lenSq;
  if (t < 0.06 || t > 0.96) return false;

  const projX = sourceX + vx * t;
  const projY = sourceY + vy * t;
  const distSq = (playerX - projX) ** 2 + (playerY - projY) ** 2;
  return distSq <= corridorHalfWidth * corridorHalfWidth;
}

/**
 * Determines whether a rescue-yard machine actively targets Lina or K on this tick.
 * - Machines actively hunt Lina (especially Rushers and flanking units across all beats).
 * - If K steps directly between a machine and Lina or gets within close aggro range,
 *   the machine focuses K so body-blocking and drawing aggro feel immediate and responsive.
 * - Mid-telegraph / committed machines keep their locked target so telegraphs stay readable.
 */
export function chooseRescueTarget(params: {
  enemy: Pick<CombatEnemy, 'x' | 'y' | 'kind' | 'phase'>;
  enemyIndex: number;
  beatId: RescueBeatId;
  player: { x: number; y: number };
  lina: { x: number; y: number };
  linaSafe: boolean;
  prevTarget?: RescueTargetKind;
}): RescueTargetKind {
  const { enemy, enemyIndex, beatId, player, lina, linaSafe, prevTarget } = params;
  if (linaSafe) return 'player';

  // Keep locked target during windup/commit so telegraphs don't erratically snap away.
  if ((enemy.phase === 'telegraph' || enemy.phase === 'committed') && prevTarget) {
    return prevTarget;
  }

  const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
  const distToLina = Math.hypot(lina.x - enemy.x, lina.y - enemy.y);

  // K stepping directly in front of Lina or pressing close draws immediate aggro.
  if (
    distToPlayer <= PLAYER_AGGRO_RADIUS
    || isPlayerInterceptingLine(enemy.x, enemy.y, lina.x, lina.y, player.x, player.y)
  ) {
    return 'player';
  }

  // Alley beat: Rushers and odd-indexed units actively flank/fire toward Lina's shelter.
  if (beatId === 'alley') {
    if (enemy.kind === 'rusher' || enemyIndex % 2 === 1 || distToLina < distToPlayer * 0.85) {
      return 'lina';
    }
    return 'player';
  }

  // Hold & Extraction beats: strong active pressure on Lina so K must intercept or clear fast.
  if (enemy.kind === 'rusher' || enemyIndex % 2 === 0 || distToLina <= distToPlayer + 140) {
    return 'lina';
  }
  return 'player';
}
