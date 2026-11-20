import { combatTuning } from '../rules';
import type { CoverRect } from './types';

const {
  playerSpeed,
  dodgeDurationMs,
  dodgeCooldownMs,
  counterWindowMs,
  counterDamageMultiplier,
  pistolDamage,
} = combatTuning;

const DODGE_SPEED_MULT = 2.05;

export const MAGAZINE_SIZE = 6;
export const RELOAD_DURATION_MS = 900;
export const ACTIVE_RELOAD_MIN = 0.46;
export const ACTIVE_RELOAD_MAX = 0.78;
export const OVERCHARGE_DAMAGE_MULT = 1.6;
/** Extra margin around K's dodge hitbox that counts as a Reflex Perfect Dodge graze. */
export const PERFECT_DODGE_GRAZE_MARGIN = 22;

export interface FiredShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  isCounter: boolean;
  isOvercharged: boolean;
  piercing: boolean;
}

export class Player {
  x = 0;
  y = 0;
  radius = 10;
  aimX = 1;
  aimY = 0;

  dodging = false;
  dodgeEndTime = 0;
  dodgeCooldownEndTime = 0;

  counterActive = false;
  counterEndTime = 0;
  counterSourceAttackId: string | null = null;

  // Tactical 6-round magazine + optional Active Snap-Reload sweet spot
  ammo = MAGAZINE_SIZE;
  reloading = false;
  reloadStartTime = 0;
  reloadEndTime = 0;
  reloadAttemptedSnap = false;
  overchargedRounds = 0;

  private dirX = 0;
  private dirY = 0;
  private moving = false;

  setDirection(x: number, y: number): void {
    this.dirX = x;
    this.dirY = y;
    this.moving = x !== 0 || y !== 0;
  }

  setAim(x: number, y: number): void {
    const len = Math.hypot(x, y);
    if (len > 0) {
      this.aimX = x / len;
      this.aimY = y / len;
    }
  }

  canDodge(now: number): boolean {
    return !this.dodging && now >= this.dodgeCooldownEndTime;
  }

  startDodge(now: number): void {
    this.dodging = true;
    this.dodgeEndTime = now + dodgeDurationMs;
  }

  tickDodge(now: number): void {
    if (this.dodging && now >= this.dodgeEndTime) {
      this.dodging = false;
      this.dodgeCooldownEndTime = now + dodgeCooldownMs;
    }
  }

  isDodgeInvulnerable(now: number): boolean {
    return this.dodging && now < this.dodgeEndTime;
  }

  getDodgeDirection(): { x: number; y: number } {
    if (this.moving) {
      const len = Math.hypot(this.dirX, this.dirY) || 1;
      return { x: this.dirX / len, y: this.dirY / len };
    }
    return { x: this.aimX, y: this.aimY };
  }

  canCounter(now: number): boolean {
    return this.counterActive && now < this.counterEndTime;
  }

  openCounter(now: number, sourceAttackId: string | null): void {
    this.counterActive = true;
    // Note: during Reflex slow-mo (0.24x sim time), 250ms of sim time gives ~1s of
    // real-time tactical aim window while still honoring combatTuning.counterWindowMs.
    this.counterEndTime = now + counterWindowMs;
    this.counterSourceAttackId = sourceAttackId;
  }

  consumeCounter(): void {
    this.counterActive = false;
    this.counterEndTime = 0;
    this.counterSourceAttackId = null;
  }

  clearCounter(): void {
    this.consumeCounter();
  }

  /**
   * Starts a reload or attempts a Tactical Snap-Reload if already reloading.
   * Returns 'snap' on sweet-spot hit, 'started' when starting a reload, or 'noop'.
   */
  triggerReload(now: number): 'snap' | 'started' | 'noop' {
    if (this.reloading) {
      if (this.reloadAttemptedSnap) return 'noop';
      const p = this.reloadProgress(now);
      this.reloadAttemptedSnap = true;
      if (p >= ACTIVE_RELOAD_MIN && p <= ACTIVE_RELOAD_MAX) {
        this.reloading = false;
        this.ammo = MAGAZINE_SIZE;
        this.overchargedRounds = 1;
        return 'snap';
      }
      return 'noop';
    }
    if (this.ammo >= MAGAZINE_SIZE) return 'noop';
    this.reloading = true;
    this.reloadStartTime = now;
    this.reloadEndTime = now + RELOAD_DURATION_MS;
    this.reloadAttemptedSnap = false;
    return 'started';
  }

  reloadProgress(now: number): number {
    if (!this.reloading) return 1;
    const total = Math.max(1, this.reloadEndTime - this.reloadStartTime);
    return Math.min(1, Math.max(0, (now - this.reloadStartTime) / total));
  }

  tickReload(now: number): boolean {
    if (this.reloading && now >= this.reloadEndTime) {
      this.reloading = false;
      this.ammo = MAGAZINE_SIZE;
      this.reloadAttemptedSnap = false;
      return true;
    }
    return false;
  }

  canFire(now: number): boolean {
    if (this.canCounter(now)) return true;
    return !this.reloading && this.ammo > 0;
  }

  fireBullet(fromX: number, fromY: number, now: number): FiredShot {
    const isCounter = this.canCounter(now);
    if (isCounter) {
      this.consumeCounter();
      // Reflex Counter overrides any reload and chambers emergency rounds so the
      // reward for a perfect dodge is never blocked by an empty magazine.
      if (this.reloading) {
        this.reloading = false;
        this.ammo = Math.max(this.ammo, 2);
      }
      return {
        x: fromX,
        y: fromY,
        vx: this.aimX,
        vy: this.aimY,
        speed: 860,
        damage: pistolDamage * counterDamageMultiplier,
        isCounter: true,
        isOvercharged: false,
        piercing: true,
      };
    }

    const isOvercharged = this.overchargedRounds > 0;
    if (isOvercharged) this.overchargedRounds--;
    this.ammo = Math.max(0, this.ammo - 1);
    if (this.ammo === 0) {
      this.reloading = true;
      this.reloadStartTime = now;
      this.reloadEndTime = now + RELOAD_DURATION_MS;
      this.reloadAttemptedSnap = false;
    }
    const damage = isOvercharged
      ? Math.round(pistolDamage * OVERCHARGE_DAMAGE_MULT)
      : pistolDamage;
    return {
      x: fromX,
      y: fromY,
      vx: this.aimX,
      vy: this.aimY,
      speed: isOvercharged ? 700 : 600,
      damage,
      isCounter: false,
      isOvercharged,
      piercing: false,
    };
  }

  updateMovement(dt: number, cover: readonly CoverRect[]): void {
    let nx = 0;
    let ny = 0;
    let speed = playerSpeed;
    if (this.dodging) {
      const d = this.getDodgeDirection();
      nx = d.x;
      ny = d.y;
      speed = playerSpeed * DODGE_SPEED_MULT;
    } else if (this.moving) {
      const len = Math.hypot(this.dirX, this.dirY);
      nx = this.dirX / len;
      ny = this.dirY / len;
    }
    if (nx === 0 && ny === 0) return;
    const step = speed * dt;
    const nextX = this.x + nx * step;
    const nextY = this.y + ny * step;
    // Resolve X and Y separately so the player slides along cover instead of
    // getting stuck, and never tunnels through a solid block.
    if (!circleRectOverlap(nextX, this.y, this.radius, cover)) this.x = nextX;
    if (!circleRectOverlap(this.x, nextY, this.radius, cover)) this.y = nextY;
  }
}

export function circleRectOverlap(cx: number, cy: number, r: number, cover: readonly CoverRect[]): boolean {
  for (const c of cover) {
    const closestX = Math.max(c.x, Math.min(cx, c.x + c.w));
    const closestY = Math.max(c.y, Math.min(cy, c.y + c.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}
