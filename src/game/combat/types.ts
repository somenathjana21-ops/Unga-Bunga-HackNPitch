export type EnemyKind = 'scout' | 'rusher';

export interface Vec {
  x: number;
  y: number;
}

export interface CoverRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CombatEnemy {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  phase: 'idle' | 'telegraph' | 'committed' | 'recovering' | 'dead';
  // Current committed hostile attack. Set when the attack commits; cleared when it
  // resolves. Tied to attack IDs so one attack cannot award multiple counters.
  attackId: string | null;
  attackDamage: number;
  // Telegraph progress 0..1 over enemyTelegraphMs.
  telegraphT: number;
  // Locked firing/charge direction (unit vector). Aimed at the player at telegraph
  // start and locked near the end so the player must react to the telegraphed line.
  dirX: number;
  dirY: number;
  dirLocked: boolean;
  // Committed movement (rusher charge).
  committedVx: number;
  committedVy: number;
  committedEndTime: number;
  // Recovery end after a committed attack.
  recoverEndTime: number;
  // Next AI decision timestamp.
  nextDecisionTime: number;
}

export interface CombatBullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  owner: 'player' | 'enemy';
  attackId: string | null;
  born: number;
  ttl: number;
  hit?: boolean;
}

export interface SpawnRequest {
  kind: EnemyKind;
  x: number;
  y: number;
}
