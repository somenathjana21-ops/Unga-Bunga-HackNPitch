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
  /** Enemy durability, tempo, and density scaling. */
  enemyHealth: number;
  maxActiveEnemies: number;
  spawnIntervalMs: number;
  enemySpeedMultiplier: number;
  telegraphMs: number;
  bulletSpeed: number;
  scoutBurstCount: number;
  strikerSpreadCount: number;
  /** Player durability (damage taken per hit at 100 max HP). */
  damagePerHit: number;
  /** Player pistol damage scales cleanly so Reflex Counters & skill stay lethal. */
  playerPistolDamage: number;
  /** Music tempo subtly accelerates on higher tiers. */
  musicRate: number;
  /** Accent hex color for HUD/labels. */
  accentHex: string;
}

export const hordeDifficultyRules: Record<HordeDifficulty, HordeDifficultyRule> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    tagline: 'Measured patrols · 5 hits to fall · 1× threat & score',
    difficultyFactor: 1,
    scoreMultiplier: 1,
    enemyHealth: 30,
    maxActiveEnemies: 4,
    spawnIntervalMs: 2400,
    enemySpeedMultiplier: 0.85,
    telegraphMs: 920,
    bulletSpeed: 360,
    scoutBurstCount: 1,
    strikerSpreadCount: 2,
    damagePerHit: 20,
    playerPistolDamage: 12,
    musicRate: 0.96,
    accentHex: '#86efac',
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    tagline: 'Coordinated resistance drills · 4 hits · 10× threat & score',
    difficultyFactor: 10,
    scoreMultiplier: 10,
    enemyHealth: 60,
    maxActiveEnemies: 7,
    spawnIntervalMs: 1550,
    enemySpeedMultiplier: 1.05,
    telegraphMs: 760,
    bulletSpeed: 440,
    scoutBurstCount: 2,
    strikerSpreadCount: 3,
    damagePerHit: 25,
    playerPistolDamage: 16,
    musicRate: 1.0,
    accentHex: '#7dd3fc',
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    tagline: 'Relentless crossfire · 3 hits · 100× threat & score',
    difficultyFactor: 100,
    scoreMultiplier: 100,
    enemyHealth: 120,
    maxActiveEnemies: 11,
    spawnIntervalMs: 960,
    enemySpeedMultiplier: 1.26,
    telegraphMs: 610,
    bulletSpeed: 520,
    scoutBurstCount: 2,
    strikerSpreadCount: 3,
    damagePerHit: 34,
    playerPistolDamage: 24,
    musicRate: 1.04,
    accentHex: '#fbbf24',
  },
  maniac: {
    id: 'maniac',
    label: 'Maniac',
    tagline: 'Overwhelming swarm pressure · 2 hits · 1,000× threat & score',
    difficultyFactor: 1000,
    scoreMultiplier: 1000,
    enemyHealth: 240,
    maxActiveEnemies: 16,
    spawnIntervalMs: 560,
    enemySpeedMultiplier: 1.5,
    telegraphMs: 470,
    bulletSpeed: 620,
    scoutBurstCount: 3,
    strikerSpreadCount: 4,
    damagePerHit: 50,
    playerPistolDamage: 38,
    musicRate: 1.08,
    accentHex: '#fb923c',
  },
  doom: {
    id: 'doom',
    label: 'DOOM',
    tagline: 'One hit ends it · Total siege · 10,000× threat & score',
    difficultyFactor: 10000,
    scoreMultiplier: 10000,
    enemyHealth: 480,
    maxActiveEnemies: 24,
    spawnIntervalMs: 320,
    enemySpeedMultiplier: 1.78,
    telegraphMs: 360,
    bulletSpeed: 730,
    scoutBurstCount: 4,
    strikerSpreadCount: 5,
    damagePerHit: 100,
    playerPistolDamage: 64,
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
  // Opening 10s slightly calmer (1.2x interval), then ramps down to 0.65x interval over 3 minutes.
  const spawnIntervalScale = safeSec < 10
    ? 1.2 - (safeSec / 10) * 0.2
    : Math.max(0.62, 1 - ((safeSec - 10) / 180) * 0.38);
  const activeCapBonus = Math.min(8, Math.floor(safeSec / 45));
  return { spawnIntervalScale, activeCapBonus, waveNumber };
}

/** Chooses enemy archetype based on wave number and kill count so all 3 policies appear cleanly. */
export function pickHordeEnemyKind(waveNumber: number, spawnIndex: number, difficulty: HordeDifficulty): HordeEnemyKind {
  // Opening wave introduces Scouts and Rushers first, then brings Breach Strikers into the mix.
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
  const diffMult = hordeDifficultyRules[options.difficulty].scoreMultiplier;
  const healthBonus = Math.max(0, Math.min(100, options.remainingHealth)) * 10;
  return Math.round((seconds * 25 + healthBonus) * diffMult);
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
