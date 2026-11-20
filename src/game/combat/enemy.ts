import { combatTuning, difficultyRules, type Difficulty } from '../rules';
import { circleRectOverlap } from './player';
import type { ArenaBounds, CombatEnemy, CoverRect, EnemyKind } from './types';

let enemyIdSeq = 0;
let attackIdSeq = 0;

export function nextEnemyId(): string { return `e-${++enemyIdSeq}`; }
export function nextAttackId(): string { return `atk-${++attackIdSeq}`; }

const TELEGRAPH_MS = combatTuning.enemyTelegraphMs; // 800 ms
const LOCK_AT = 0.72; // direction locks near the end of the telegraph
const RUSHER_STALK_SPEED = 104;
const RUSHER_CHARGE_SPEED = 375;
const RUSHER_CHARGE_MS = 500;
const RUSHER_CHARGE_RANGE = 250;
const SCOUT_STRAFE_SPEED = 78;
const SCOUT_MIN_RANGE = 175;
const SCOUT_MAX_RANGE = 285;
const SCOUT_COMMITTED_MS = 560;
const SCOUT_BURST_INTERVAL_MS = 165;
const RECOVERY_MS = 820;
const COVER_SLAM_STAGGER_MS = 1550;
const IDLE_DECISION_MS = 850;
const BLOCKED_UNTIL_MS = 90000;
const ENEMY_BULLET_SPEED = 475;

/** Exposed enemies (staggered or recovering from a cover slam) take 1.5x damage. */
export const EXPOSED_DAMAGE_MULT = 1.5;

export interface EnemyUpdateResult {
  bullets: { x: number; y: number; vx: number; vy: number; speed: number; damage: number; attackId: string | null }[];
  slammedCover: boolean;
}

export function makeEnemy(kind: EnemyKind, x: number, y: number, difficulty: Difficulty, now: number): CombatEnemy {
  const rules = difficultyRules as unknown as Record<Difficulty, typeof difficultyRules.story>;
  const mult = rules[difficulty].enemyHealthMultiplier;
  const maxHealth = Math.max(1, Math.round(combatTuning.baseEnemyHealth * mult));
  const strafeDir: 1 | -1 = enemyIdSeq % 2 === 0 ? 1 : -1;
  return {
    id: nextEnemyId(),
    kind,
    x,
    y,
    radius: 14,
    health: maxHealth,
    maxHealth,
    phase: 'idle',
    attackId: null,
    attackDamage: rules[difficulty].damagePerHit,
    telegraphT: 0,
    dirX: 1,
    dirY: 0,
    dirLocked: false,
    committedVx: 0,
    committedVy: 0,
    committedEndTime: 0,
    recoverEndTime: 0,
    staggeredUntil: 0,
    nextDecisionTime: now + IDLE_DECISION_MS,
    strafeDir,
    hitFlashUntil: 0,
    burstRemaining: 0,
    nextBurstTime: 0,
    slammedCover: false,
  };
}

export function isEnemyExposed(e: CombatEnemy): boolean {
  return e.phase === 'staggered' || (e.phase === 'recovering' && e.slammedCover);
}

export function staggerEnemy(e: CombatEnemy, now: number, durationMs = 1100): void {
  if (e.phase === 'dead') return;
  e.phase = 'staggered';
  e.staggeredUntil = now + durationMs;
  e.attackId = null;
  e.committedVx = 0;
  e.committedVy = 0;
  e.burstRemaining = 0;
}

/** Checks if the straight segment between (x1,y1) and (x2,y2) crosses any cover block. */
export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cover: readonly CoverRect[],
): boolean {
  const steps = 10;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    for (const c of cover) {
      if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Advances one enemy's tactical AI with active positioning, cover avoidance,
 * Scout flanking/burst fire, and Rusher stalking + cover-slam stagger.
 */
export function updateEnemy(
  e: CombatEnemy,
  player: { x: number; y: number; radius: number },
  now: number,
  dt: number,
  cover: readonly CoverRect[] = [],
  bounds?: ArenaBounds,
  difficulty: Difficulty = 'story',
): EnemyUpdateResult {
  const result: EnemyUpdateResult = { bullets: [], slammedCover: false };
  if (e.phase === 'dead') return result;

  if (e.phase === 'staggered') {
    if (now >= e.staggeredUntil) {
      e.phase = 'idle';
      e.slammedCover = false;
      e.nextDecisionTime = now + 650;
    }
    return result;
  }

  if (e.phase === 'recovering') {
    if (now >= e.recoverEndTime) {
      e.phase = 'idle';
      e.slammedCover = false;
      e.strafeDir = e.strafeDir === 1 ? -1 : 1;
      e.nextDecisionTime = now + IDLE_DECISION_MS;
    }
    return result;
  }

  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  if (e.phase === 'idle') {
    aimAt(e, player.x, player.y);
    const clearSight = hasLineOfSight(e.x, e.y, player.x, player.y, cover);

    if (e.kind === 'scout') {
      // Scouts actively strafe laterally and hold mid-range to flank around cover.
      let mx = -uy * e.strafeDir * 0.72;
      let my = ux * e.strafeDir * 0.72;
      if (dist < SCOUT_MIN_RANGE) {
        mx -= ux * 0.65;
        my -= uy * 0.65;
      } else if (dist > SCOUT_MAX_RANGE || !clearSight) {
        mx += ux * 0.55;
        my += uy * 0.55;
      }
      const mlen = Math.hypot(mx, my) || 1;
      moveWithCover(e, (mx / mlen) * SCOUT_STRAFE_SPEED * dt, (my / mlen) * SCOUT_STRAFE_SPEED * dt, cover, bounds);

      if (now >= e.nextDecisionTime && (clearSight || now >= e.nextDecisionTime + 700)) {
        e.phase = 'telegraph';
        e.telegraphT = 0;
        e.dirLocked = false;
        aimAt(e, player.x, player.y);
        e.nextDecisionTime = now + BLOCKED_UNTIL_MS;
      }
    } else {
      // Rushers stalk relentlessly toward K, angling around cover to open a charge lane.
      let mx = ux;
      let my = uy;
      if (!clearSight) {
        mx = ux * 0.55 - uy * e.strafeDir * 0.85;
        my = uy * 0.55 + ux * e.strafeDir * 0.85;
      }
      const mlen = Math.hypot(mx, my) || 1;
      moveWithCover(e, (mx / mlen) * RUSHER_STALK_SPEED * dt, (my / mlen) * RUSHER_STALK_SPEED * dt, cover, bounds);

      if (now >= e.nextDecisionTime && (dist <= RUSHER_CHARGE_RANGE || now >= e.nextDecisionTime + 550)) {
        e.phase = 'telegraph';
        e.telegraphT = 0;
        e.dirLocked = false;
        aimAt(e, player.x, player.y);
        e.nextDecisionTime = now + BLOCKED_UNTIL_MS;
      }
    }
    return result;
  }

  if (e.phase === 'telegraph') {
    e.telegraphT += dt / (TELEGRAPH_MS / 1000);
    if (!e.dirLocked) {
      aimAt(e, player.x, player.y);
      if (e.telegraphT >= LOCK_AT) {
        e.dirLocked = true;
      }
    }
    if (e.telegraphT >= 1) {
      e.phase = 'committed';
      e.attackId = nextAttackId();
      if (e.kind === 'scout') {
        result.bullets.push({
          x: e.x + e.dirX * 16,
          y: e.y + e.dirY * 16,
          vx: e.dirX,
          vy: e.dirY,
          speed: ENEMY_BULLET_SPEED,
          damage: e.attackDamage,
          attackId: e.attackId,
        });
        // Real Mode Scouts fire a tense 2-round rapid burst sharing the same attackId.
        e.burstRemaining = difficulty === 'real' ? 1 : 0;
        e.nextBurstTime = now + SCOUT_BURST_INTERVAL_MS;
        e.committedEndTime = now + SCOUT_COMMITTED_MS;
      } else {
        e.committedVx = e.dirX * RUSHER_CHARGE_SPEED;
        e.committedVy = e.dirY * RUSHER_CHARGE_SPEED;
        e.committedEndTime = now + RUSHER_CHARGE_MS;
      }
    }
    return result;
  }

  if (e.phase === 'committed') {
    if (e.kind === 'scout') {
      if (e.burstRemaining > 0 && now >= e.nextBurstTime) {
        e.burstRemaining--;
        e.nextBurstTime = now + SCOUT_BURST_INTERVAL_MS;
        result.bullets.push({
          x: e.x + e.dirX * 16,
          y: e.y + e.dirY * 16,
          vx: e.dirX,
          vy: e.dirY,
          speed: ENEMY_BULLET_SPEED,
          damage: e.attackDamage,
          attackId: e.attackId,
        });
      }
    } else {
      const nextX = e.x + e.committedVx * dt;
      const nextY = e.y + e.committedVy * dt;
      const hitCover = cover.length > 0 && circleRectOverlap(nextX, nextY, e.radius, cover);
      if (hitCover) {
        // Baiting a charging Rusher into solid cover staggers and exposes it!
        e.slammedCover = true;
        result.slammedCover = true;
        staggerEnemy(e, now, COVER_SLAM_STAGGER_MS);
        return result;
      }
      e.x = nextX;
      e.y = nextY;
      clampToBounds(e, bounds);
    }

    if (now >= e.committedEndTime) {
      e.phase = 'recovering';
      e.recoverEndTime = now + RECOVERY_MS;
      e.attackId = null;
      e.committedVx = 0;
      e.committedVy = 0;
      e.burstRemaining = 0;
    }
    return result;
  }

  return result;
}

function moveWithCover(
  e: CombatEnemy,
  stepX: number,
  stepY: number,
  cover: readonly CoverRect[],
  bounds?: ArenaBounds,
): void {
  const nx = e.x + stepX;
  const ny = e.y + stepY;
  if (!circleRectOverlap(nx, e.y, e.radius, cover)) e.x = nx;
  if (!circleRectOverlap(e.x, ny, e.radius, cover)) e.y = ny;
  clampToBounds(e, bounds);
}

function clampToBounds(e: CombatEnemy, bounds?: ArenaBounds): void {
  if (!bounds) return;
  e.x = Math.min(Math.max(e.x, bounds.minX), bounds.maxX);
  e.y = Math.min(Math.max(e.y, bounds.minY), bounds.maxY);
}

function aimAt(e: CombatEnemy, tx: number, ty: number): void {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const len = Math.hypot(dx, dy) || 1;
  e.dirX = dx / len;
  e.dirY = dy / len;
}
