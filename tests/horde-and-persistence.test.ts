import { describe, it, expect } from 'vitest';
import {
  HORDE_DIFFICULTIES,
  HORDE_DURATIONS,
  calculateClearBonus,
  calculateKillPoints,
  formatHordeClock,
  formatScore,
  hordeDifficultyRules,
  hordeDurationRules,
  hordeHitsToFall,
  hordeTimeRamp,
  mulberry32,
  normalizePlayerName,
  pickHordeEnemyKind,
} from '../src/game/horde/rules';
import {
  HORDE_ARENA_HEIGHT,
  HORDE_ARENA_WIDTH,
  HORDE_MAP_IDS,
  generateRandomHordeCover,
  hordeMaps,
  resolveHordeMap,
} from '../src/game/horde/maps';
import {
  computeLeadDirection,
  computePincerApproach,
  computeSeparation,
  computeTacticalRangedMove,
  hasImmediateCoverAhead,
} from '../src/game/horde/ai';
import {
  HORDE_WEAPON_IDS,
  canArsenalFire,
  computeSplashDamage,
  consumeArsenalShot,
  createArsenalState,
  cycleWeapon,
  effectiveWeaponMoveMult,
  hordeWeapons,
  switchWeapon,
  tickArsenal,
  triggerArsenalReload,
} from '../src/game/horde/weapons';
import { DEFAULT_PREFERENCES } from '../src/services/preferences';
import {
  HORDE_PLAYER_KEY,
  HORDE_SCORES_KEY,
  filterHordeScores,
  loadHordeScores,
  loadLastHordePlayer,
  saveHordeScore,
  saveLastHordePlayer,
} from '../src/services/horde-scores';
import {
  createStoryProgress,
  completeSequence,
  deserializeStoryProgress,
  enterMap,
  isStoryProgressSnapshot,
  mapDisplayName,
  mapToCheckpoint,
  markSettlementInteraction,
  serializeStoryProgress,
  setFlag,
} from '../src/game/story-state';
import {
  SAVE_KEY,
  STORY_SAVE_KEY,
  clearStoryProgress,
  loadRun,
  loadStoryProgress,
  saveRun,
  saveStoryProgress,
} from '../src/services/local-save';
import { newRun } from '../src/game/state';
import { AMBIENCE_FILES, MUSIC_FILES, SFX_FILES } from '../src/services/audio';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear() { map.clear(); },
    getItem(key: string) { return map.has(key) ? map.get(key)! : null; },
    key(index: number) { return [...map.keys()][index] ?? null; },
    removeItem(key: string) { map.delete(key); },
    setItem(key: string, value: string) { map.set(key, value); },
  };
}

describe('Horde Mode 10-fold difficulty progression & scoring', () => {
  it('increases difficultyFactor and scoreMultiplier strictly 10-fold per tier', () => {
    expect(HORDE_DIFFICULTIES).toEqual(['easy', 'medium', 'hard', 'maniac', 'doom']);
    const factors = HORDE_DIFFICULTIES.map((d) => hordeDifficultyRules[d].difficultyFactor);
    const mults = HORDE_DIFFICULTIES.map((d) => hordeDifficultyRules[d].scoreMultiplier);
    expect(factors).toEqual([1, 10, 100, 1000, 10000]);
    expect(mults).toEqual([1, 10, 100, 1000, 10000]);
    for (let i = 1; i < factors.length; i++) {
      expect(factors[i]).toBe(factors[i - 1] * 10);
      expect(mults[i]).toBe(mults[i - 1] * 10);
    }
  });

  it('escalates threat parameters monotonically from Easy to DOOM', () => {
    for (let i = 1; i < HORDE_DIFFICULTIES.length; i++) {
      const prev = hordeDifficultyRules[HORDE_DIFFICULTIES[i - 1]];
      const next = hordeDifficultyRules[HORDE_DIFFICULTIES[i]];
      expect(next.enemyHealth).toBeGreaterThan(prev.enemyHealth);
      expect(next.maxActiveEnemies).toBeGreaterThan(prev.maxActiveEnemies);
      expect(next.spawnIntervalMs).toBeLessThan(prev.spawnIntervalMs);
      expect(next.enemySpeedMultiplier).toBeGreaterThan(prev.enemySpeedMultiplier);
      expect(next.damagePerHit).toBeGreaterThan(prev.damagePerHit);
    }
    expect(hordeDifficultyRules.doom.damagePerHit).toBe(100);
  });

  it('defines 1 Minute, 5 Minutes, and Unlimited time modes accurately', () => {
    expect(HORDE_DURATIONS).toEqual(['1m', '5m', 'unlimited']);
    expect(hordeDurationRules['1m'].seconds).toBe(60);
    expect(hordeDurationRules['5m'].seconds).toBe(300);
    expect(hordeDurationRules.unlimited.seconds).toBeNull();
  });

  it('scales kill points 10-fold across difficulties and rewards counters & streaks', () => {
    const easyScout = calculateKillPoints({
      kind: 'scout', difficulty: 'easy', combo: 1, isCounter: false, wasExposed: false,
    });
    const medScout = calculateKillPoints({
      kind: 'scout', difficulty: 'medium', combo: 1, isCounter: false, wasExposed: false,
    });
    const doomScout = calculateKillPoints({
      kind: 'scout', difficulty: 'doom', combo: 1, isCounter: false, wasExposed: false,
    });
    expect(medScout).toBe(easyScout * 10);
    expect(doomScout).toBe(easyScout * 10000);

    const counterKill = calculateKillPoints({
      kind: 'striker', difficulty: 'hard', combo: 1, isCounter: true, wasExposed: false,
    });
    const normalKill = calculateKillPoints({
      kind: 'striker', difficulty: 'hard', combo: 1, isCounter: false, wasExposed: false,
    });
    expect(counterKill).toBeGreaterThan(normalKill);

    const highStreak = calculateKillPoints({
      kind: 'rusher', difficulty: 'medium', combo: 6, isCounter: false, wasExposed: false,
    });
    const lowStreak = calculateKillPoints({
      kind: 'rusher', difficulty: 'medium', combo: 1, isCounter: false, wasExposed: false,
    });
    expect(highStreak).toBeGreaterThan(lowStreak);
  });

  it('awards clear bonuses only for timed clears and 0 for unlimited', () => {
    const bonus1mEasy = calculateClearBonus({
      duration: '1m',
      difficulty: 'easy',
      remainingHealth: hordeDifficultyRules.easy.playerMaxHealth,
    });
    const bonus5mEasy = calculateClearBonus({
      duration: '5m',
      difficulty: 'easy',
      remainingHealth: hordeDifficultyRules.easy.playerMaxHealth,
    });
    const bonus1mMed = calculateClearBonus({
      duration: '1m',
      difficulty: 'medium',
      remainingHealth: hordeDifficultyRules.medium.playerMaxHealth,
    });
    const bonusUnlimited = calculateClearBonus({
      duration: 'unlimited',
      difficulty: 'doom',
      remainingHealth: hordeDifficultyRules.doom.playerMaxHealth,
    });

    expect(bonus1mEasy).toBeGreaterThan(0);
    expect(bonus5mEasy).toBeGreaterThan(bonus1mEasy);
    expect(bonus1mMed).toBe(bonus1mEasy * 10);
    expect(bonusUnlimited).toBe(0);
  });

  it('empowers K cleanly through Hard then switches to skill-only rules on Maniac and DOOM', () => {
    expect(hordeHitsToFall('easy')).toBe(8);
    expect(hordeHitsToFall('medium')).toBe(6);
    expect(hordeHitsToFall('hard')).toBe(5);
    expect(hordeHitsToFall('maniac')).toBe(2);
    expect(hordeHitsToFall('doom')).toBe(1);

    for (const tier of ['easy', 'medium', 'hard'] as const) {
      const r = hordeDifficultyRules[tier];
      expect(r.skillOnly).toBe(false);
      expect(r.playerMaxHealth).toBeGreaterThanOrEqual(150);
      expect(r.healPerWave).toBeGreaterThan(0);
      expect(r.counterKillHeal).toBeGreaterThan(0);
    }

    // Harder-hitting sidearm scaling up through Hard
    expect(hordeDifficultyRules.medium.playerPistolDamage).toBeGreaterThan(hordeDifficultyRules.easy.playerPistolDamage);
    expect(hordeDifficultyRules.hard.playerPistolDamage).toBeGreaterThan(hordeDifficultyRules.medium.playerPistolDamage);

    for (const tier of ['maniac', 'doom'] as const) {
      const r = hordeDifficultyRules[tier];
      expect(r.skillOnly).toBe(true);
      expect(r.playerMaxHealth).toBe(100);
      expect(r.healPerWave).toBe(0);
      expect(r.counterKillHeal).toBe(0);
    }
  });

  it('normalizes player names and rejects blank or whitespace-only names', () => {
    expect(normalizePlayerName('')).toBeNull();
    expect(normalizePlayerName('   \t\n  ')).toBeNull();
    expect(normalizePlayerName('  K   Vanguard  ')).toBe('K Vanguard');
    expect(normalizePlayerName('ABCDEFGHIJKLMNOPQRSTUVWXYZ123456')?.length).toBe(24);
  });

  it('formats clocks, scores, time ramp, and enemy kinds cleanly', () => {
    expect(formatHordeClock(0)).toBe('00:00');
    expect(formatHordeClock(65)).toBe('01:05');
    expect(formatHordeClock(300)).toBe('05:00');
    expect(formatScore(1250000)).toBe('1,250,000');

    const startRamp = hordeTimeRamp(0);
    const laterRamp = hordeTimeRamp(90);
    expect(laterRamp.waveNumber).toBeGreaterThan(startRamp.waveNumber);
    expect(laterRamp.spawnIntervalScale).toBeLessThan(startRamp.spawnIntervalScale);
    expect(['scout', 'rusher', 'striker']).toContain(pickHordeEnemyKind(2, 4, 'doom'));
  });
});

describe('Horde scoreboard persistence & isolation from Story saves', () => {
  it('persists, sorts, filters scores and remembers last player without touching campaign save', () => {
    const storage = createMemoryStorage();
    const campaign = newRun('real');
    saveRun(campaign, storage);

    saveLastHordePlayer('K-85', storage);
    expect(loadLastHordePlayer(storage)).toBe('K-85');
    expect(storage.getItem(HORDE_PLAYER_KEY)).toBe('K-85');

    saveHordeScore({
      playerName: 'K-85',
      difficulty: 'easy',
      duration: '1m',
      score: 1200,
      kills: 8,
      counterKills: 2,
      waveReached: 2,
      survivedSeconds: 60,
      cleared: true,
    }, storage);

    saveHordeScore({
      playerName: 'Isshin',
      difficulty: 'doom',
      duration: '1m',
      score: 4_500_000,
      kills: 3,
      counterKills: 2,
      waveReached: 1,
      survivedSeconds: 24,
      cleared: false,
    }, storage);

    const scores = loadHordeScores(storage);
    expect(scores).toHaveLength(2);
    expect(scores[0].playerName).toBe('Isshin');
    expect(scores[1].playerName).toBe('K-85');

    const doomOnly = filterHordeScores(scores, 'doom', 'all');
    expect(doomOnly).toHaveLength(1);
    expect(doomOnly[0].playerName).toBe('Isshin');

    // Campaign save must remain completely untouched
    const loadedCampaign = loadRun(storage);
    expect(loadedCampaign.status).toBe('ok');
    if (loadedCampaign.status === 'ok') {
      expect(loadedCampaign.state).toEqual(campaign);
    }
    expect(SAVE_KEY).not.toBe(HORDE_SCORES_KEY);
  });

  it('ignores corrupted scoreboard JSON gracefully', () => {
    const storage = createMemoryStorage();
    storage.setItem(HORDE_SCORES_KEY, '{broken json');
    expect(loadHordeScores(storage)).toEqual([]);
  });
});

describe('Story progress persistence (fixes return-to-menu reset glitch)', () => {
  it('round-trips map, exact tile, flags, completed sequences, objective, and visited maps', () => {
    const storage = createMemoryStorage();
    const progress = createStoryProgress();
    enterMap(progress, 'library', 'Go home.');
    setFlag(progress, 'campus-wallet-found');
    completeSequence(progress, 'library-hachimi', 'library-hachimi-met');
    markSettlementInteraction(progress, 'settlement-ration-visited');
    progress.visitedMaps = new Set(['campus', 'library']);

    const snapshot = serializeStoryProgress(progress, { x: 7, y: 4 });
    expect(isStoryProgressSnapshot(snapshot)).toBe(true);
    expect(saveStoryProgress(snapshot, storage)).toBe(true);
    expect(storage.getItem(STORY_SAVE_KEY)).not.toBeNull();

    const loaded = loadStoryProgress(storage);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      const restored = deserializeStoryProgress(loaded.snapshot);
      expect(restored.currentMap).toBe('library');
      expect(restored.objective).toBe('Go home.');
      expect(restored.tile).toEqual({ x: 7, y: 4 });
      expect(restored.flags.has('campus-wallet-found')).toBe(true);
      expect(restored.flags.has('library-hachimi-met')).toBe(true);
      expect(restored.completedSequences.has('library-hachimi')).toBe(true);
      expect(restored.settlementInteractions.has('settlement-ration-visited')).toBe(true);
      expect([...(restored.visitedMaps ?? [])]).toEqual(['campus', 'library']);
    }

    clearStoryProgress(storage);
    expect(loadStoryProgress(storage).status).toBe('empty');
  });

  it('maps every world room to a valid campaign checkpoint and human-readable display name', () => {
    expect(mapToCheckpoint('campus')).toBe('campus');
    expect(mapToCheckpoint('library')).toBe('campus');
    expect(mapToCheckpoint('dorm')).toBe('dorm');
    expect(mapToCheckpoint('clinic')).toBe('camp');
    expect(mapToCheckpoint('settlement')).toBe('camp');
    expect(mapDisplayName('library')).toBe('Library Courtyard');
    expect(mapDisplayName('settlement')).toBe('Settlement Courtyard');
  });

  it('rejects invalid story snapshot payloads cleanly', () => {
    const storage = createMemoryStorage();
    storage.setItem(STORY_SAVE_KEY, JSON.stringify({ version: 1, currentMap: 'invalid-room' }));
    expect(loadStoryProgress(storage).status).toBe('invalid');
  });
});

describe('Horde maps, expanded arena & randomized per-match cover', () => {
  const seededRng = (seed: number) => {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  };

  it('defines 4 distinct Horde maps in an expanded 1440x864 arena', () => {
    expect(HORDE_ARENA_WIDTH).toBe(1440);
    expect(HORDE_ARENA_HEIGHT).toBe(864);
    expect(HORDE_MAP_IDS).toEqual(['warehouse', 'settlement', 'library', 'campus']);
    for (const id of HORDE_MAP_IDS) {
      expect(hordeMaps[id].backgroundPath.startsWith('/assets/backgrounds/')).toBe(true);
      expect(resolveHordeMap(id)).toBe(id);
    }
    expect(HORDE_MAP_IDS).toContain(resolveHordeMap('random', () => 0.6));
  });

  it('randomizes cover per match while keeping center spawn plaza and >=72px corridors clear', () => {
    const cx = HORDE_ARENA_WIDTH * 0.5;
    const cy = HORDE_ARENA_HEIGHT * 0.52;

    for (const id of HORDE_MAP_IDS) {
      const a = generateRandomHordeCover(HORDE_ARENA_WIDTH, HORDE_ARENA_HEIGHT, id, seededRng(101));
      const b = generateRandomHordeCover(HORDE_ARENA_WIDTH, HORDE_ARENA_HEIGHT, id, seededRng(909));
      expect(a.length).toBeGreaterThanOrEqual(6);
      expect(b.length).toBeGreaterThanOrEqual(6);
      // Distinct layouts across runs
      expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));

      for (const rect of a) {
        expect(rect.x).toBeGreaterThanOrEqual(86);
        expect(rect.y).toBeGreaterThanOrEqual(92);
        expect(rect.x + rect.w).toBeLessThanOrEqual(HORDE_ARENA_WIDTH - 86);
        expect(rect.y + rect.h).toBeLessThanOrEqual(HORDE_ARENA_HEIGHT - 86);

        const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
        const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
        expect(Math.hypot(cx - closestX, cy - closestY)).toBeGreaterThanOrEqual(128);
      }

      // Pairwise corridor spacing >= 72px
      for (let i = 0; i < a.length; i++) {
        for (let j = i + 1; j < a.length; j++) {
          const r1 = a[i];
          const r2 = a[j];
          const separated =
            r1.x + r1.w + 72 <= r2.x
            || r2.x + r2.w + 72 <= r1.x
            || r1.y + r1.h + 72 <= r2.y
            || r2.y + r2.h + 72 <= r1.y;
          expect(separated).toBe(true);
        }
      }
    }
  });

  it('produces identical cover for duel seats sharing a seed', () => {
    // Both seats of a seeded duel run this.rng from the same seed, so the
    // cover layout must match exactly for a fair match.
    const seatA = generateRandomHordeCover(HORDE_ARENA_WIDTH, HORDE_ARENA_HEIGHT, 'warehouse', mulberry32(360556158));
    const seatB = generateRandomHordeCover(HORDE_ARENA_WIDTH, HORDE_ARENA_HEIGHT, 'warehouse', mulberry32(360556158));
    expect(seatB).toEqual(seatA);
    expect(seatA.length).toBeGreaterThanOrEqual(6);

    // A different seed must diverge so Random map choice stays unpredictable
    const differentSeed = generateRandomHordeCover(HORDE_ARENA_WIDTH, HORDE_ARENA_HEIGHT, 'warehouse', mulberry32(1));
    expect(differentSeed).not.toEqual(seatA);
  });

  it('stores optional mapId on Horde scores cleanly', () => {
    const storage = createMemoryStorage();
    saveHordeScore({
      playerName: 'Lina',
      difficulty: 'hard',
      duration: '1m',
      mapId: 'library',
      score: 140_000,
      kills: 16,
      counterKills: 4,
      waveReached: 3,
      survivedSeconds: 60,
      cleared: true,
    }, storage);
    const loaded = loadHordeScores(storage);
    expect(loaded[0].mapId).toBe('library');
  });
});

describe('Clever Horde enemy AI behaviors', () => {
  it('leads moving targets ahead of their current position when leadWeight > 0', () => {
    const direct = computeLeadDirection(0, 0, 300, 0, 0, 220, 500, 0);
    const led = computeLeadDirection(0, 0, 300, 0, 0, 220, 500, 1);
    expect(direct.y).toBeCloseTo(0, 4);
    expect(led.y).toBeGreaterThan(0.2);
  });

  it('steers ranged enemies around blocking cover toward the open flank', () => {
    const cover = [{ x: 180, y: 150, w: 60, h: 120 }];
    // Enemy at (120, 175) looking toward player at (320, 175) -> top flank (y < 150) is much closer than bottom
    const move = computeTacticalRangedMove({
      selfId: 's1',
      x: 120,
      y: 175,
      px: 320,
      py: 175,
      strafeDir: 1,
      minRange: 180,
      maxRange: 320,
      cover,
      allies: [{ id: 's1', x: 120, y: 175, kind: 'scout' }],
    });
    expect(move.clearSight).toBe(false);
    expect(move.vy).toBeLessThan(0); // flanks upward around the shorter cover edge
  });

  it('splits nearby Rushers into opposing pincer angles and separates overlapping allies', () => {
    const allies = [
      { id: 'r1', x: 100, y: 200, kind: 'rusher' as const },
      { id: 'r2', x: 105, y: 235, kind: 'rusher' as const },
    ];
    const m1 = computePincerApproach({
      selfId: 'r1', x: 100, y: 200, px: 500, py: 218, strafeDir: 1, cover: [], allies,
    });
    const m2 = computePincerApproach({
      selfId: 'r2', x: 105, y: 235, px: 500, py: 218, strafeDir: 1, cover: [], allies,
    });
    // One peels upward (negative y), the other downward (positive y)
    expect(m1.vy).toBeLessThan(0);
    expect(m2.vy).toBeGreaterThan(0);

    const sep = computeSeparation('r1', 100, 200, allies, 80);
    expect(sep.y).toBeLessThan(0);
    expect(hasImmediateCoverAhead(100, 200, 1, 0, 14, [{ x: 130, y: 180, w: 40, h: 40 }], 56)).toBe(true);
  });
});

describe('Audio manifest mapping & boosted default volumes', () => {
  it('maps all music, ambience, and sfx cues to /assets/audio/*.wav paths', () => {
    const allPaths = [
      ...Object.values(MUSIC_FILES),
      ...Object.values(AMBIENCE_FILES),
      ...Object.values(SFX_FILES),
    ];
    expect(allPaths.length).toBeGreaterThanOrEqual(33);
    for (const p of allPaths) {
      expect(p.startsWith('/assets/audio/')).toBe(true);
      expect(p.endsWith('.wav')).toBe(true);
    }
  });

  it('uses boosted default music and effects volume levels', () => {
    expect(DEFAULT_PREFERENCES.master).toBeGreaterThanOrEqual(0.9);
    expect(DEFAULT_PREFERENCES.music).toBeGreaterThanOrEqual(0.8);
    expect(DEFAULT_PREFERENCES.effects).toBeGreaterThanOrEqual(0.9);
  });
});

describe('Horde Mode 5-weapon arsenal & per-weapon caveats', () => {
  it('defines Pistol, Machine Gun, Rail Sniper, Rotary Minigun, and Rocket Launcher with distinct caveats', () => {
    expect(HORDE_WEAPON_IDS).toEqual(['pistol', 'machinegun', 'sniper', 'minigun', 'rocket']);

    // Sniper: highest single-shot multiplier & speed, piercing, zero spread, slow bolt cooldown
    expect(hordeWeapons.sniper.piercing).toBe(true);
    expect(hordeWeapons.sniper.baseSpreadRad).toBe(0);
    expect(hordeWeapons.sniper.damageMult).toBeGreaterThan(3);
    expect(hordeWeapons.sniper.fireCooldownMs).toBeGreaterThanOrEqual(850);
    expect(hordeWeapons.sniper.magSize).toBeLessThanOrEqual(4);

    // Minigun: mandatory spin-up, fastest fire rate, heavy slowdown while firing
    expect(hordeWeapons.minigun.autoFire).toBe(true);
    expect(hordeWeapons.minigun.spinUpMs).toBeGreaterThanOrEqual(350);
    expect(hordeWeapons.minigun.fireCooldownMs).toBeLessThan(hordeWeapons.machinegun.fireCooldownMs);
    expect(hordeWeapons.minigun.firingMoveSpeedMult).toBeLessThan(0.65);

    // Rocket Launcher: slowest projectile, AoE splash radius, self-blast danger, 2-shot tube
    expect(hordeWeapons.rocket.bulletSpeed).toBeLessThan(hordeWeapons.pistol.bulletSpeed);
    expect(hordeWeapons.rocket.splashRadius).toBeGreaterThanOrEqual(100);
    expect(hordeWeapons.rocket.selfDamageRadius).toBeGreaterThanOrEqual(60);
    expect(hordeWeapons.rocket.magSize).toBe(2);
  });

  it('enforces Minigun spin-up delay and heavy movement slowdown while spooled up', () => {
    const arsenal = createArsenalState('minigun');
    expect(canArsenalFire(arsenal, 0)).toBe(false);

    // Partial spin-up (200ms < 420ms) still cannot fire
    const step1 = tickArsenal(arsenal, 200, 200, true);
    expect(step1.startedSpinUp).toBe(true);
    expect(canArsenalFire(arsenal, 200)).toBe(false);
    expect(effectiveWeaponMoveMult(arsenal, 200, true)).toBe(hordeWeapons.minigun.firingMoveSpeedMult);

    // Full spin-up (>= 420ms) unlocks rapid fire
    tickArsenal(arsenal, 250, 450, true);
    expect(canArsenalFire(arsenal, 450)).toBe(true);
    const shot = consumeArsenalShot(arsenal, 450, 35, 1, 1, 0, () => 0.5);
    expect(shot?.weaponId).toBe('minigun');
    expect(arsenal.slots.minigun.ammo).toBe(hordeWeapons.minigun.magSize - 1);
  });

  it('widens Machine Gun bloom on sustained bursts and decays it when releasing fire', () => {
    const arsenal = createArsenalState('machinegun');
    let now = 0;
    for (let i = 0; i < 6; i++) {
      consumeArsenalShot(arsenal, now, 35, 1, 1, 0, () => 0.5);
      now += hordeWeapons.machinegun.fireCooldownMs + 5;
    }
    const peakBloom = arsenal.slots.machinegun.bloom;
    expect(peakBloom).toBeGreaterThan(0.05);

    tickArsenal(arsenal, 1000, now + 1000, false);
    expect(arsenal.slots.machinegun.bloom).toBeLessThan(peakBloom);
  });

  it('preserves per-weapon ammo across switches, cancels active reloads, and cycles cleanly', () => {
    const arsenal = createArsenalState('sniper');
    const shot = consumeArsenalShot(arsenal, 0, 35, 1, 1, 0, () => 0.5);
    expect(shot?.piercing).toBe(true);
    expect(arsenal.slots.sniper.ammo).toBe(3);

    expect(triggerArsenalReload(arsenal, 100)).toBe('started');
    expect(arsenal.slots.sniper.reloading).toBe(true);

    // Switching cancels in-progress reload without losing remaining ammo
    expect(switchWeapon(arsenal, 'rocket')).toBe(true);
    expect(arsenal.activeId).toBe('rocket');
    expect(arsenal.slots.sniper.reloading).toBe(false);
    expect(arsenal.slots.sniper.ammo).toBe(3);

    // Cycling wraps around rocket -> pistol
    expect(cycleWeapon(arsenal, 1)).toBe('pistol');
    expect(cycleWeapon(arsenal, -1)).toBe('rocket');
  });

  it('supports active Snap-Reload and rocket AoE splash damage falloff', () => {
    const arsenal = createArsenalState('rocket');
    consumeArsenalShot(arsenal, 0, 40, 1, 1, 0, () => 0.5);
    expect(triggerArsenalReload(arsenal, 100)).toBe('started');
    // Hit sweet spot (50% through 2200ms reload -> t = 1200ms)
    expect(triggerArsenalReload(arsenal, 1200)).toBe('snap');
    expect(arsenal.slots.rocket.reloading).toBe(false);
    expect(arsenal.slots.rocket.ammo).toBe(2);
    expect(arsenal.slots.rocket.overchargedRounds).toBeGreaterThan(0);

    // Splash falloff math: full damage at center, reduced at edge, 0 outside radius
    expect(computeSplashDamage(0, 0, 0, 0, 108, 120)).toBe(120);
    const midSplash = computeSplashDamage(0, 0, 54, 0, 108, 120);
    expect(midSplash).toBeGreaterThan(60);
    expect(midSplash).toBeLessThan(120);
    expect(computeSplashDamage(0, 0, 120, 0, 108, 120)).toBe(0);
  });
});
