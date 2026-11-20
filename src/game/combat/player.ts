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

const DODGE_SPEED_MULT = 1.6;

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
    if (this.moving) return { x: this.dirX, y: this.dirY };
    return { x: this.aimX, y: this.aimY };
  }

  canCounter(now: number): boolean {
    return this.counterActive && now < this.counterEndTime;
  }

  openCounter(now: number, sourceAttackId: string | null): void {
    this.counterActive = true;
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

  fireBullet(fromX: number, fromY: number, now: number): {
    x: number;
    y: number;
    vx: number;
    vy: number;
    speed: number;
    damage: number;
    isCounter: boolean;
  } {
    const isCounter = this.canCounter(now);
    const damage = isCounter ? pistolDamage * counterDamageMultiplier : pistolDamage;
    if (isCounter) this.consumeCounter();
    return {
      x: fromX,
      y: fromY,
      vx: this.aimX,
      vy: this.aimY,
      speed: 560,
      damage,
      isCounter,
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

function circleRectOverlap(cx: number, cy: number, r: number, cover: readonly CoverRect[]): boolean {
  for (const c of cover) {
    const closestX = Math.max(c.x, Math.min(cx, c.x + c.w));
    const closestY = Math.max(c.y, Math.min(cy, c.y + c.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}
