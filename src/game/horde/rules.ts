// Pure rules for Resistance Trials (Horde Mode).
// Completely decoupled from Story Mode RunState so Horde runs never touch
// campaign saves, checkpoints, or milestones.

export const HORDE_DIFFICULTIES = ['easy', 'medium', 'hard', 'maniac', 'doom'] as const;
export type HordeDifficulty = typeof HORDE_DIFFICULTIES[number];

export const HORDE_DURATIONS = ['1m', '5m', 'unlimited'] as const;
export type HordeDuration = typeof HORDE_DURATIONS[number];

export type HordeEnemyKind = 'scout' | 'rusher' | 'striker';

export interface HordeDifficultyRule {
  id: HordeDifficulty;
  label: string;
  tagline: string;
  /** Exact 10-fold difficulty power rating & score multiplier (1x -> 10,000x). */
  difficultyFactor: number;
  scoreMultiplier: number;
  /** Enemy durability, tempo, density, and AI sharpness scaling. */
  enemyHealth: number;
  maxActiveEnemies: number;
  spawnIntervalMs: number;
  enemySpeedMultiplier: number;
  telegraphMs: number;
  bulletSpeed: number;
  scoutBurstCount: number;
  strikerSpreadCount: number;
  /** Predictive lead-aiming accuracy in [0, 1]. Higher tiers anticipate K's movement cleanly. */
  aiLeadFactor: number;
  /** Player durability & combat power scaling: tougher/harder-hitting through Hard, pure skill on Maniac/DOOM. */
  playerMaxHealth: number;
  damagePerHit: number;
  playerPistolDamage: number;
  playerFireCooldownMs: number;
  playerMoveSpeedMult: number;
  /** Wave-clear recovery & Counter-Kill siphon (0 on Maniac/DOOM — pure skill only). */
  healPerWave: number;
  counterKillHeal: number;
  /** True on Maniac/DOOM where armor/sustain are stripped and survival is pure skill. */
  skillOnly: boolean;
  /** Music tempo subtly accelerates on higher tiers. */
  musicRate: number;
  /** Accent hex color for HUD/labels. */
  accentHex: string;
}

export const hordeDifficultyRules: Record<HordeDifficulty, HordeDifficultyRule> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    tagline: 'Empowered warm-up · 8 hits · Heavy pistol & +40 HP/wave · 1× score',
    difficultyFactor: 1,
    scoreMultiplier: 1,
    enemyHealth: 30,
    maxActiveEnemies: 5,
    spawnIntervalMs: 2450,
    enemySpeedMultiplier: 0.86,
    telegraphMs: 950,
    bulletSpeed: 350,
    scoutBurstCount: 1,
    strikerSpreadCount: 2,
    aiLeadFactor: 0.18,
    playerMaxHealth: 160,
    damagePerHit: 20,
    playerPistolDamage: 24,
    playerFireCooldownMs: 190,
    playerMoveSpeedMult: 1.08,
    healPerWave: 40,
    counterKillHeal: 15,
    skillOnly: false,
    musicRate: 0.96,
    accentHex: '#86efac',
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    tagline: 'Armored vanguard · 6 hits · High-caliber rounds & +30 HP/wave · 10× score',
    difficultyFactor: 10,
    scoreMultiplier: 10,
    enemyHealth: 64,
    maxActiveEnemies: 8,
    spawnIntervalMs: 1650,
    enemySpeedMultiplier: 1.04,
    telegraphMs: 800,
    bulletSpeed: 425,
    scoutBurstCount: 2,
    strikerSpreadCount: 3,
    aiLeadFactor: 0.42,
    playerMaxHealth: 150,
    damagePerHit: 25,
    playerPistolDamage: 38,
    playerFireCooldownMs: 175,
    playerMoveSpeedMult: 1.12,
    healPerWave: 30,
    counterKillHeal: 12,
    skillOnly: false,
    musicRate: 1.0,
    accentHex: '#7dd3fc',
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    tagline: 'Heavy striker · 5 hits · Overclocked firepower & +25 HP/wave · 100× score',
    difficultyFactor: 100,
    scoreMultiplier: 100,
    enemyHealth: 112,
    maxActiveEnemies: 12,
    spawnIntervalMs: 1040,
    enemySpeedMultiplier: 1.24,
    telegraphMs: 650,
    bulletSpeed: 500,
    scoutBurstCount: 2,
    strikerSpreadCount: 3,
    aiLeadFactor: 0.68,
    playerMaxHealth: 150,
    damagePerHit: 30,
    playerPistolDamage: 58,
    playerFireCooldownMs: 162,
    playerMoveSpeedMult: 1.18,
    healPerWave: 25,
    counterKillHeal: 10,
    skillOnly: false,
    musicRate: 1.04,
    accentHex: '#fbbf24',
  },
  maniac: {
    id: 'maniac',
    label: 'Maniac',
    tagline: 'Skill-only gauntlet · 2 hits · Zero wave heal · Lethal pincers · 1,000× score',
    difficultyFactor: 1000,
    scoreMultiplier: 1000,
    enemyHealth: 220,
    maxActiveEnemies: 17,
    spawnIntervalMs: 560,
    enemySpeedMultiplier: 1.5,
    telegraphMs: 460,
    bulletSpeed: 620,
    scoutBurstCount: 3,
    strikerSpreadCount: 4,
    aiLeadFactor: 0.88,
    playerMaxHealth: 100,
    damagePerHit: 50,
    playerPistolDamage: 62,
    playerFireCooldownMs: 175,
    playerMoveSpeedMult: 1.16,
    healPerWave: 0,
    counterKillHeal: 0,
    skillOnly: true,
    musicRate: 1.08,
    accentHex: '#fb923c',
  },
  doom: {
    id: 'doom',
    label: 'DOOM',
    tagline: 'Pure skill · 1 hit ends it · Zero heal · Apex squad AI · 10,000× score',
    difficultyFactor: 10000,
    scoreMultiplier: 10000,
    enemyHealth: 420,
    maxActiveEnemies: 24,
    spawnIntervalMs: 320,
    enemySpeedMultiplier: 1.78,
    telegraphMs: 360,
    bulletSpeed: 730,
    scoutBurstCount: 4,
    strikerSpreadCount: 5,
    aiLeadFactor: 1.0,
    playerMaxHealth: 100,
    damagePerHit: 100,
    playerPistolDamage: 78,
    playerFireCooldownMs: 175,
    playerMoveSpeedMult: 1.2,
    healPerWave: 0,
    counterKillHeal: 0,
    skillOnly: true,
    musicRate: 1.13,
    accentHex: '#f87171',
  },
};

export interface HordeDurationRule {
  id: HordeDuration;
  label: string;
  seconds: number | null;
  description: string;
}

export const hordeDurationRules: Record<HordeDuration, HordeDurationRule> = {
  '1m': {
    id: '1m',
    label: '1 Minute',
    seconds: 60,
    description: '60-second blitz survival',
  },
  '5m': {
    id: '5m',
    label: '5 Minutes',
    seconds: 300,
    description: '5-minute endurance siege',
  },
  unlimited: {
    id: 'unlimited',
    label: 'Unlimited',
    seconds: null,
    description: 'Endless survival until K falls',
  },
};

export const HORDE_ENEMY_BASE_POINTS: Record<HordeEnemyKind, number> = {
  scout: 100,
  rusher: 150,
  striker: 250,
};

/** Returns how many damaging hits K can withstand from full health at this tier. */
export function hordeHitsToFall(difficulty: HordeDifficulty): number {
  const rule = hordeDifficultyRules[difficulty];
  return Math.max(1, Math.ceil(rule.playerMaxHealth / rule.damagePerHit));
}

/** Validates and normalizes a Horde player callsign. Returns null if empty/invalid. */
export function normalizePlayerName(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (cleaned.length === 0) return null;
  return cleaned.slice(0, 24);
}

/**
 * Computes effective composite intensity ramp over elapsed play time so
 * the opening 10 seconds are readable while long runs escalate cleanly.
 */
export function hordeTimeRamp(elapsedSec: number): {
  spawnIntervalScale: number;
  activeCapBonus: number;
  waveNumber: number;
} {
  const safeSec = Math.max(0, elapsedSec);
  const waveNumber = Math.floor(safeSec / 20) + 1;
  // Opening 10s slightly calmer (1.2x interval), then ramps down to 0.62x interval over 3 minutes.
  const spawnIntervalScale = safeSec < 10
    ? 1.2 - (safeSec / 10) * 0.2
    : Math.max(0.62, 1 - ((safeSec - 10) / 180) * 0.38);
  const activeCapBonus = Math.min(8, Math.floor(safeSec / 45));
  return { spawnIntervalScale, activeCapBonus, waveNumber };
}

/** Chooses enemy archetype based on wave number and kill count so all 3 roles appear cleanly. */
export function pickHordeEnemyKind(waveNumber: number, spawnIndex: number, difficulty: HordeDifficulty): HordeEnemyKind {
  if (waveNumber === 1 && difficulty === 'easy') {
    return spawnIndex % 3 === 2 ? 'rusher' : 'scout';
  }
  const mod = spawnIndex % 5;
  if (mod === 4 && (waveNumber >= 2 || difficulty === 'hard' || difficulty === 'maniac' || difficulty === 'doom')) {
    return 'striker';
  }
  return mod % 2 === 0 ? 'scout' : 'rusher';
}

/** Calculates points awarded for a single kill. */
export function calculateKillPoints(options: {
  kind: HordeEnemyKind;
  difficulty: HordeDifficulty;
  combo: number;
  isCounter: boolean;
  wasExposed: boolean;
}): number {
  const base = HORDE_ENEMY_BASE_POINTS[options.kind];
  const diffMult = hordeDifficultyRules[options.difficulty].scoreMultiplier;
  const comboMult = Math.min(5, 1 + Math.max(0, options.combo - 1) * 0.25);
  const styleMult = (options.isCounter ? 1.5 : 1) * (options.wasExposed ? 1.25 : 1);
  return Math.round(base * diffMult * comboMult * styleMult);
}

/** Calculates survival completion bonus when finishing a 1m or 5m timed run. */
export function calculateClearBonus(options: {
  duration: HordeDuration;
  difficulty: HordeDifficulty;
  remainingHealth: number;
}): number {
  const seconds = hordeDurationRules[options.duration].seconds;
  if (seconds === null) return 0;
  const rule = hordeDifficultyRules[options.difficulty];
  const healthRatio = Math.max(0, Math.min(1, options.remainingHealth / rule.playerMaxHealth));
  const healthBonus = Math.round(healthRatio * 1000);
  return Math.round((seconds * 25 + healthBonus) * rule.scoreMultiplier);
}

/** Formats MM:SS countdown or elapsed timer cleanly. */
export function formatHordeClock(seconds: number): string {
  const clamped = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** Formats large 10,000x DOOM scores compactly with commas. */
export function formatScore(score: number): string {
  return Math.max(0, Math.round(score)).toLocaleString('en-US');
}

/** Returns an unsigned 31-bit seed suitable for a deterministic Horde run. */
export function randomSeed(): number {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    cryptoApi.getRandomValues(buf);
    return buf[0] % 2147483647;
  }
  return Math.floor(Math.random() * 2147483647);
}

/** Coerces any stored/URL value to the same seed space; invalid values get a fresh seed. */
export function normalizeSeed(value: unknown): number {
  const n = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : Number.NaN;
  if (!Number.isFinite(n)) return randomSeed();
  return Math.abs(Math.trunc(n)) % 2147483647;
}

/**
 * Small deterministic PRNG (mulberry32). Both duel seats use the same seed, so
 * spawn sides/positions repeat exactly for a fair shared run.
 */
export function mulberry32(seed: number): () => number {
  let a = normalizeSeed(seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
