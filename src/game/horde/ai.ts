// Clever tactical AI helpers for Horde Mode enemies.
// Pure functions (no Phaser dependency) so lead aiming, cover flanking,
// pincer approaches, and squad separation can be unit-tested cleanly.

import { circleRectOverlap } from '../combat/player';
import { hasLineOfSight } from '../combat/enemy';
import type { CoverRect } from '../combat/types';

export interface Vec2 {
  x: number;
  y: number;
}

export interface SquadUnit {
  id: string;
  x: number;
  y: number;
  kind: 'scout' | 'rusher' | 'striker';
}

/**
 * Calculates a predictive lead-aim unit direction so ranged enemies anticipate
 * a moving player's trajectory rather than always shooting behind them.
 * `leadWeight` in [0, 1] scales how aggressively the enemy leads its shots.
 */
export function computeLeadDirection(
  ex: number,
  ey: number,
  px: number,
  py: number,
  playerVx: number,
  playerVy: number,
  bulletSpeed: number,
  leadWeight: number,
): Vec2 {
  const dx = px - ex;
  const dy = py - ey;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return { x: 1, y: 0 };

  const safeSpeed = Math.max(120, bulletSpeed);
  const clampedWeight = Math.max(0, Math.min(1, leadWeight));
  // Cap lookahead time to 0.58s so rapid dodging still cleanly jukes incoming shots.
  const travelTime = Math.min(0.58, dist / safeSpeed) * clampedWeight;
  const targetX = px + playerVx * travelTime;
  const targetY = py + playerVy * travelTime;
  const lx = targetX - ex;
  const ly = targetY - ey;
  const len = Math.hypot(lx, ly) || 1;
  return { x: lx / len, y: ly / len };
}

/**
 * Computes anti-clumping repulsion so enemies spread out into readable flanking arcs
 * instead of stacking on top of one another.
 */
export function computeSeparation(
  selfId: string,
  x: number,
  y: number,
  allies: readonly SquadUnit[],
  desiredDist = 66,
): Vec2 {
  let sx = 0;
  let sy = 0;
  const d2 = desiredDist * desiredDist;
  for (const ally of allies) {
    if (ally.id === selfId) continue;
    const dx = x - ally.x;
    const dy = y - ally.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > 0.001 && distSq < d2) {
      const dist = Math.sqrt(distSq);
      const strength = (desiredDist - dist) / desiredDist;
      sx += (dx / dist) * strength;
      sy += (dy / dist) * strength;
    }
  }
  const len = Math.hypot(sx, sy);
  if (len > 1) {
    sx /= len;
    sy /= len;
  }
  return { x: sx, y: sy };
}

/**
 * Checks whether a short corridor straight ahead is blocked by cover, allowing
 * Rushers to skirt a pillar edge cleanly before launching a full-speed charge.
 */
export function hasImmediateCoverAhead(
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  radius: number,
  cover: readonly CoverRect[],
  probeDist = 56,
): boolean {
  for (const frac of [0.45, 0.75, 1.0]) {
    const px = x + dirX * probeDist * frac;
    const py = y + dirY * probeDist * frac;
    if (circleRectOverlap(px, py, radius + 2, cover)) {
      return true;
    }
  }
  return false;
}

/**
 * Computes an intelligent flanking movement vector for ranged units (Scouts / Strikers):
 * - When LOS is blocked by cover, tests left and right bypass probes and steers
 *   toward whichever flank opens a clean shot first.
 * - Maintains optimal standoff range and angular crossfire spread against allies.
 */
export function computeTacticalRangedMove(options: {
  selfId: string;
  x: number;
  y: number;
  px: number;
  py: number;
  strafeDir: 1 | -1;
  minRange: number;
  maxRange: number;
  cover: readonly CoverRect[];
  allies: readonly SquadUnit[];
}): { vx: number; vy: number; clearSight: boolean; preferredStrafe: 1 | -1 } {
  const { selfId, x, y, px, py, strafeDir, minRange, maxRange, cover, allies } = options;
  const dx = px - x;
  const dy = py - y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const clearSight = hasLineOfSight(x, y, px, py, cover);

  let preferredStrafe: 1 | -1 = strafeDir;
  let mx = 0;
  let my = 0;

  if (!clearSight) {
    // Evaluate left vs right perpendicular flank steps to peek around cover cleanly
    const probeDist = 68;
    const leftX = x - uy * probeDist;
    const leftY = y + ux * probeDist;
    const rightX = x + uy * probeDist;
    const rightY = y - ux * probeDist;

    const leftOpen = !circleRectOverlap(leftX, leftY, 15, cover) && hasLineOfSight(leftX, leftY, px, py, cover);
    const rightOpen = !circleRectOverlap(rightX, rightY, 15, cover) && hasLineOfSight(rightX, rightY, px, py, cover);

    if (leftOpen && !rightOpen) {
      preferredStrafe = 1;
    } else if (rightOpen && !leftOpen) {
      preferredStrafe = -1;
    } else {
      // Pick whichever side isn't immediately wedged into cover
      const leftBlocked = circleRectOverlap(x - uy * 34, y + ux * 34, 15, cover);
      const rightBlocked = circleRectOverlap(x + uy * 34, y - ux * 34, 15, cover);
      if (leftBlocked && !rightBlocked) preferredStrafe = -1;
      else if (rightBlocked && !leftBlocked) preferredStrafe = 1;
    }

    mx = -uy * preferredStrafe * 0.88 + ux * 0.42;
    my = ux * preferredStrafe * 0.88 + uy * 0.42;
  } else {
    mx = -uy * strafeDir * 0.72;
    my = ux * strafeDir * 0.72;
    if (dist < minRange) {
      mx -= ux * 0.72;
      my -= uy * 0.72;
    } else if (dist > maxRange) {
      mx += ux * 0.62;
      my += uy * 0.62;
    }
  }

  // Spread out from nearby allies to form crossfire angles instead of single-file lines
  const sep = computeSeparation(selfId, x, y, allies, 84);
  mx += sep.x * 0.75;
  my += sep.y * 0.75;

  const len = Math.hypot(mx, my) || 1;
  return { vx: mx / len, vy: my / len, clearSight, preferredStrafe };
}

/**
 * Computes a coordinated pincer approach vector for Rushers:
 * - Offsets approach angle away from nearby Rushers so pairs pincer K from two sides.
 * - Skirts around obstructing cover instead of face-planting into pillars before dashing.
 */
export function computePincerApproach(options: {
  selfId: string;
  x: number;
  y: number;
  px: number;
  py: number;
  strafeDir: 1 | -1;
  cover: readonly CoverRect[];
  allies: readonly SquadUnit[];
}): { vx: number; vy: number; clearSight: boolean } {
  const { selfId, x, y, px, py, strafeDir, cover, allies } = options;
  const dx = px - x;
  const dy = py - y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const clearSight = hasLineOfSight(x, y, px, py, cover);

  // Check if another Rusher is approaching from a similar angle -> swing wide for a pincer
  let flankBias = 0;
  for (const ally of allies) {
    if (ally.id === selfId || ally.kind !== 'rusher') continue;
    const adx = px - ally.x;
    const ady = py - ally.y;
    const adist = Math.hypot(adx, ady) || 1;
    const dot = ux * (adx / adist) + uy * (ady / adist);
    if (dot > 0.65) {
      // Project offset onto perpendicular (-uy, ux) so each Rusher peels away from its partner
      const sideDot = (x - ally.x) * -uy + (y - ally.y) * ux;
      flankBias += sideDot >= 0 ? 0.55 : -0.55;
    }
  }

  let mx = ux;
  let my = uy;
  if (!clearSight || hasImmediateCoverAhead(x, y, ux, uy, 14, cover, 48)) {
    const side = flankBias !== 0 ? Math.sign(flankBias) : strafeDir;
    mx = ux * 0.48 - uy * side * 0.88;
    my = uy * 0.48 + ux * side * 0.88;
  } else if (flankBias !== 0 && dist > 150) {
    const clamped = Math.max(-0.7, Math.min(0.7, flankBias));
    mx = ux - uy * clamped;
    my = uy + ux * clamped;
  }

  const sep = computeSeparation(selfId, x, y, allies, 62);
  mx += sep.x * 0.6;
  my += sep.y * 0.6;

  const len = Math.hypot(mx, my) || 1;
  return { vx: mx / len, vy: my / len, clearSight };
}
