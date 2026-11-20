import { takeHit } from '../state';
import type { RunState } from '../state';

// Frame-safe damage: one validated damage event per attack, protected by
// invulnerability frames. A multi-frame collision or overlapping same-frame
// attacks cannot consume the whole health pool.
export class DamageSystem {
  private invulnerableUntil = 0;
  private readonly invulnerabilityMs = 1000;
  private readonly hitAttackIds = new Set<string>();

  // Accepts a hit when not blocked by invulnerability frames and when this attack
  // has not already landed in the current invulnerability window. Returns the next
  // RunState and whether K was killed, or null when the hit is blocked.
  acceptHit(state: RunState, attackId: string | null, now: number): { state: RunState; killed: boolean } | null {
    if (now < this.invulnerableUntil) return null;
    if (attackId !== null && this.hitAttackIds.has(attackId)) return null;
    const next = takeHit(state);
    this.invulnerableUntil = now + this.invulnerabilityMs;
    this.hitAttackIds.clear();
    if (attackId !== null) this.hitAttackIds.add(attackId);
    return { state: next, killed: next.health <= 0 };
  }

  clear(): void {
    this.invulnerableUntil = 0;
    this.hitAttackIds.clear();
  }
}
