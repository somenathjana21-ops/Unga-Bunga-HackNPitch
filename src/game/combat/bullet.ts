import type { CombatBullet } from './types';

export function updateBullet(b: CombatBullet, dt: number): void {
  b.x += b.vx * b.speed * dt;
  b.y += b.vy * b.speed * dt;
}
