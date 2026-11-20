import type { CombatBullet, CoverRect } from './types';

export function updateBullet(b: CombatBullet, dt: number): void {
  b.prevX = b.x;
  b.prevY = b.y;
  b.x += b.vx * b.speed * dt;
  b.y += b.vy * b.speed * dt;
}

/**
 * Returns true if the bullet's current step intersects any solid cover rectangle.
 * Piercing counter-rail rounds intentionally bypass cover so a perfect dodge
 * unlocks an unstoppable counter-shot through obstacles.
 */
export function bulletHitsCover(b: CombatBullet, radius: number, cover: readonly CoverRect[]): boolean {
  if (b.piercing) return false;
  for (const c of cover) {
    const closestX = Math.max(c.x, Math.min(b.x, c.x + c.w));
    const closestY = Math.max(c.y, Math.min(b.y, c.y + c.h));
    const dx = b.x - closestX;
    const dy = b.y - closestY;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}
