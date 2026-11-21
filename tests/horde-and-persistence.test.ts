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
  hordeTimeRamp,
  normalizePlayerName,
  pickHordeEnemyKind,
} from '../src/game/horde/rules';
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
    const bonus1mEasy = calculateClearBonus({ duration: '1m', difficulty: 'easy', remainingHealth: 100 });
    const bonus5mEasy = calculateClearBonus({ duration: '5m', difficulty: 'easy', remainingHealth: 100 });
    const bonus1mMed = calculateClearBonus({ duration: '1m', difficulty: 'medium', remainingHealth: 100 });
    const bonusUnlimited = calculateClearBonus({ duration: 'unlimited', difficulty: 'doom', remainingHealth: 100 });

    expect(bonus1mEasy).toBeGreaterThan(0);
    expect(bonus5mEasy).toBeGreaterThan(bonus1mEasy);
    expect(bonus1mMed).toBe(bonus1mEasy * 10);
    expect(bonusUnlimited).toBe(0);
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

describe('Audio manifest mapping integrity', () => {
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
});
