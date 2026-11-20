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

export interface ArenaBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CombatEnemy {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  phase: 'idle' | 'telegraph' | 'committed' | 'recovering' | 'staggered' | 'dead';
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
  // Recovery / stagger end after a committed attack or cover slam.
  recoverEndTime: number;
  staggeredUntil: number;
  // Next AI decision timestamp.
  nextDecisionTime: number;
  // Active positioning & feedback state.
  strafeDir: 1 | -1;
  hitFlashUntil: number;
  burstRemaining: number;
  nextBurstTime: number;
  slammedCover: boolean;
}

export interface CombatBullet {
  id: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  owner: 'player' | 'enemy';
  attackId: string | null;
  born: number;
  ttl: number;
  hit?: boolean;
  isCounter?: boolean;
  isOvercharged?: boolean;
  piercing?: boolean;
  hitEnemyIds?: string[];
}

export interface SpawnRequest {
  kind: EnemyKind;
  x: number;
  y: number;
}
