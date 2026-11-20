export type Difficulty = 'story' | 'real';

export const MAX_HEALTH = 100;
export const difficultyRules = {
  story: { label: 'Story Mode', enemyHealthMultiplier: 0.5, damagePerHit: 25 },
  real: { label: 'Real Mode', enemyHealthMultiplier: 1, damagePerHit: 50 },
} as const;

// Starting tuning targets. Validate against human playtests in Phase 3.
export const combatTuning = {
  playerSpeed: 160,
  dodgeDurationMs: 180,
  dodgeCooldownMs: 900,
  hitInvulnerabilityMs: 1000,
  enemyTelegraphMs: 800,
  counterWindowMs: 250,
  counterDamageMultiplier: 3,
  maxActiveEnemies: 4,
  baseEnemyHealth: 60,
  pistolDamage: 10,
} as const;
