import { combatTuning, difficultyRules } from '../rules';
import type { CombatEnemy, Difficulty, EnemyKind } from './types';

let enemyIdSeq = 0;
let attackIdSeq = 0;

export function nextEnemyId(): string { return `e-${++enemyIdSeq}`; }
export function nextAttackId(): string { return `atk-${++attackIdSeq}`; }

const TELEGRAPH_MS = combatTuning.enemyTelegraphMs; // 800 ms
const LOCK_AT = 0.7; // direction locks near the end of the telegraph
const RUSHER_CHARGE_SPEED = 300;
const RUSHER_CHARGE_MS = 520;
const SCOUT_COMMITTED_MS = 700;
const RECOVERY_MS = 1000;
const IDLE_DECISION_MS = 1100;
const BLOCKED_UNTIL_MS = 90000;
const ENEMY_BULLET_SPEED = 420;

export function makeEnemy(kind: EnemyKind, x: number, y: number, difficulty: Difficulty, now: number): CombatEnemy {
  const mult = difficultyRules[difficulty].enemyHealthMultiplier;
  const maxHealth = Math.max(1, Math.round(combatTuning.baseEnemyHealth * mult));
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
    attackDamage: difficultyRules[difficulty].damagePerHit,
    telegraphT: 0,
    dirX: 1,
    dirY: 0,
    dirLocked: false,
    committedVx: 0,
    committedVy: 0,
    committedEndTime: 0,
    recoverEndTime: 0,
    nextDecisionTime: now + IDLE_DECISION_MS,
  };
}

// Advances one enemy's AI. Returns bullets the enemy fires (scout shot on commit).
// The caller assigns ids, owner, born and ttl. Movement and phase changes mutate
// the enemy in place.
export function updateEnemy(
  e: CombatEnemy,
  player: { x: number; y: number; radius: number },
  now: number,
  dt: number,
): { x: number; y: number; vx: number; vy: number; speed: number; damage: number; attackId: string | null }[] {
  const out: { x: number; y: number; vx: number; vy: number; speed: number; damage: number; attackId: string | null }[] = [];

  if (e.phase === 'dead') return out;

  if (e.phase === 'recovering') {
    if (now >= e.recoverEndTime) {
      e.phase = 'idle';
      e.nextDecisionTime = now + IDLE_DECISION_MS;
    }
    return out;
  }

  if (e.phase === 'idle') {
    if (now >= e.nextDecisionTime) {
      e.phase = 'telegraph';
      e.telegraphT = 0;
      e.dirLocked = false;
      aimAt(e, player.x, player.y);
      e.nextDecisionTime = now + BLOCKED_UNTIL_MS;
    }
    return out;
  }

  if (e.phase === 'telegraph') {
    e.telegraphT += dt / (TELEGRAPH_MS / 1000);
    if (!e.dirLocked && e.telegraphT >= LOCK_AT) {
      aimAt(e, player.x, player.y);
      e.dirLocked = true;
    }
    if (e.telegraphT >= 1) {
      e.phase = 'committed';
      e.attackId = nextAttackId();
      if (e.kind === 'scout') {
        out.push({
          x: e.x,
          y: e.y,
          vx: e.dirX,
          vy: e.dirY,
          speed: ENEMY_BULLET_SPEED,
          damage: e.attackDamage,
          attackId: e.attackId,
        });
        e.committedEndTime = now + SCOUT_COMMITTED_MS;
      } else {
        e.committedVx = e.dirX * RUSHER_CHARGE_SPEED;
        e.committedVy = e.dirY * RUSHER_CHARGE_SPEED;
        e.committedEndTime = now + RUSHER_CHARGE_MS;
      }
    }
    return out;
  }

  if (e.phase === 'committed') {
    if (e.kind === 'rusher') {
      e.x += e.committedVx * dt;
      e.y += e.committedVy * dt;
    }
    if (now >= e.committedEndTime) {
      e.phase = 'recovering';
      e.recoverEndTime = now + RECOVERY_MS;
      e.attackId = null;
      e.committedVx = 0;
      e.committedVy = 0;
    }
    return out;
  }

  return out;
}

function aimAt(e: CombatEnemy, tx: number, ty: number): void {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const len = Math.hypot(dx, dy) || 1;
  e.dirX = dx / len;
  e.dirY = dy / len;
}
