import { describe, expect, it } from 'vitest';
import { completeMilestone, enterCheckpoint, isRunState, newRun, restartRescue, takeHit } from '../src/game/state';
import type { RunState } from '../src/game/state';
import { difficultyRules, MAX_HEALTH } from '../src/game/rules';
import { loadRun, saveRun } from '../src/services/local-save';
import { canEnter } from '../src/game/maps/preview-room';
import { dialogueSequences } from '../src/content/dialogue/sequences';
import { cutscenes } from '../src/content/cutscenes/ledger';
import { campusMap } from '../src/content/maps/campus';
import { libraryMap } from '../src/content/maps/library';
import { dormMap } from '../src/content/maps/dorm';
import { clinicMap } from '../src/content/maps/clinic';
import { settlementMap } from '../src/content/maps/settlement';
import { canWalkTo } from '../src/content/maps';
import { createStoryProgress, completeSequence, hasFlag, markSettlementInteraction, areAllSettlementInteractionsDone } from '../src/game/story-state';

describe('campaign promises', () => {
  it('Real Mode kills on the second hit, even across scenes', () => {
    const wounded = takeHit(newRun('real'));
    expect(wounded.health).toBe(50);
    expect(takeHit(enterCheckpoint(wounded, 'camp')).health).toBe(0);
  });
  it('Story Mode halves health and damage; the fourth hit kills', () => {
    let run = newRun('story');
    for (let i = 0; i < 3; i++) run = takeHit(run);
    expect(run.health).toBe(25);
    expect(takeHit(run).health).toBe(0);
    expect(difficultyRules.story.enemyHealthMultiplier).toBe(0.5);
  });
  it('a milestone heals once and cannot revive a dead player', () => {
    const rescued = completeMilestone(takeHit(newRun('real')), 'girl-rescued');
    expect(rescued.health).toBe(100);
    expect(completeMilestone(takeHit(rescued), 'girl-rescued').health).toBe(50);
    expect(completeMilestone(takeHit(takeHit(newRun('real'))), 'girl-rescued').health).toBe(0);
  });
  it('death ends rescue; an explicit retry resets the attempt, not the story', () => {
    const started = { ...newRun('real'), rescueStatus: 'active' as const, counterUnlocked: true };
    const dead = takeHit(takeHit(started));
    expect(dead.rescueStatus).toBe('failed');
    expect(restartRescue(dead)).toMatchObject({ health: 100, checkpoint: 'rescue-start',
      rescueStatus: 'active', counterUnlocked: false, difficulty: 'real' });
    expect(() => restartRescue(started)).toThrow();
  });
  it('does not trust malformed or future save files', () => {
    expect(isRunState({ ...newRun('real'), health: Infinity })).toBe(false);
    expect(isRunState({ ...newRun('real'), version: 2 })).toBe(false);
    expect(isRunState({ ...newRun('real'), milestones: ['girl-rescued', 'girl-rescued'] })).toBe(false);
    expect(isRunState(newRun('story'))).toBe(true);
  });
  it('round-trips a wound and handles blocked or corrupt storage', () => {
    let value: string | null = null;
    const store = { getItem: () => value, setItem: (_key: string, v: string) => { value = v; }, removeItem: () => { value = null; } };
    const wounded = takeHit(newRun('real'));
    expect(saveRun(wounded, store)).toBe(true);
    expect(loadRun(store)).toEqual({ status: 'ok', state: wounded });
    value = '{broken';
    expect(loadRun(store).status).toBe('invalid');
    const blocked = { ...store, getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
    expect(loadRun(blocked).status).toBe('unavailable');
    expect(saveRun(wounded, blocked)).toBe(false);
  });
  it('reload preserves wounds and never heals to fresh health', () => {
    let stored: string | null = null;
    const store = { getItem: () => stored, setItem: (_key: string, v: string) => { stored = v; }, removeItem: () => { stored = null; } };
    // Mid-rescue death/reload: a wounded failed-rescue run must reload wounded/failed, not fresh.
    const started = { ...newRun('real'), rescueStatus: 'active' as const };
    const dead = takeHit(takeHit(started));
    expect(dead.health).toBe(0);
    expect(dead.rescueStatus).toBe('failed');
    expect(saveRun(dead, store)).toBe(true);
    const reloaded = loadRun(store);
    expect(reloaded.status).toBe('ok');
    if (reloaded.status !== 'ok') throw new Error('expected ok save');
    expect(reloaded.state.health).toBe(0);
    expect(reloaded.state.rescueStatus).toBe('failed');
    // A new run starts fresh; reloading never overrides a saved wound with MAX_HEALTH.
    expect(newRun('real').health).toBe(MAX_HEALTH);
    expect(reloaded.state.health).not.toBe(MAX_HEALTH);
  });
  it('invalid or future saves are ignored but do not block a fresh local run', () => {
    let stored: string | null = null;
    const store = { getItem: () => stored, setItem: (_key: string, v: string) => { stored = v; }, removeItem: () => { stored = null; } };
    // Malformed JSON.
    stored = '{broken';
    expect(loadRun(store).status).toBe('invalid');
    // Future schema version rejected by validation.
    const future = { ...newRun('real'), version: 99 } as unknown as RunState;
    expect(saveRun(future, store)).toBe(false);
    expect(isRunState(future)).toBe(false);
    stored = '{broken';
    expect(loadRun(store).status).toBe('invalid');
    // Local play can still begin fresh: a new run is always creatable regardless of storage state.
    const fresh = newRun('story');
    expect(fresh.health).toBe(MAX_HEALTH);
    expect(fresh.rescueStatus).toBe('not-started');
  });
  it('blocks walls and out-of-map movement', () => {
    expect(canEnter(0, 0)).toBe(false);
    expect(canEnter(-1, 5)).toBe(false);
    expect(canEnter(16, 9)).toBe(false);
    expect(canEnter(2, 5)).toBe(true);
  });
  it('dialogue cutscene references map to ledger cutscenes and section 11 epilogue exists', () => {
    expect(dialogueSequences['library-bracelet-scene'].cutsceneId).toBe('c01');
    expect(dialogueSequences['breach-attack'].cutsceneId).toBe('c02');
    expect(dialogueSequences['clinic-window'].cutsceneId).toBe('c03');
    expect(cutscenes.c01).toBeDefined();
    expect(cutscenes.c02).toBeDefined();
    expect(cutscenes.c03).toBeDefined();
    expect(cutscenes.c04).toBeDefined();
    expect(dialogueSequences['epilogue-shelter']).toBeDefined();
    expect(dialogueSequences['epilogue-shelter'].lines.length).toBeGreaterThan(5);
  });
  it('settlement map provides a door to the rescue mission after cry for help', () => {
    const rescueDoor = settlementMap.doors.find(d => d.targetMap === 'rescue');
    expect(rescueDoor).toBeDefined();
    expect(rescueDoor?.requiresFlag).toBe('settlement-cry-heard');
    expect(settlementMap.grid[4][15]).toBe('D');
  });
  it('story progression chain reaches clinic after Mai appears and unlocks settlement and rescue doors', () => {
    const progress = createStoryProgress();
    const runSeq = (id: string) => {
      const seq = dialogueSequences[id];
      expect(seq).toBeDefined();
      completeSequence(progress, seq.id, seq.completionFlag);
    };

    // Campus -> Library
    expect(canWalkTo(campusMap, 15, 4)).toBe(true);
    // Library -> Dorm
    runSeq('library-hachimi-meet');
    runSeq('library-bracelet-scene');
    const dormDoor = libraryMap.doors.find(d => d.targetMap === 'dorm');
    expect(dormDoor).toBeDefined();
    expect(hasFlag(progress, dormDoor!.requiresFlag!)).toBe(true);
    expect(canWalkTo(libraryMap, dormDoor!.position.x, dormDoor!.position.y)).toBe(true);

    // Dorm -> Breach (Mai appears) -> Clinic
    runSeq('dorm-kingsley-talk');
    runSeq('dorm-tv-broadcast-1');
    runSeq('dorm-tv-broadcast-2');
    runSeq('breach-wake');
    // Once awake during breach, the library return door is locked and (0,7) triggers the breach
    const returnDoor = dormMap.doors.find(d => d.targetMap === 'library');
    expect(returnDoor?.excludesFlag).toBe('breach-woke');
    expect(dormMap.triggers.some(t => t.position.x === 0 && t.position.y === 7 && t.dialogueId === 'breach-door')).toBe(true);
    runSeq('breach-door');
    runSeq('breach-attack');
    expect(hasFlag(progress, 'breach-survived')).toBe(true);
    expect(dialogueSequences['breach-attack'].cutsceneId).toBe('c02');

    // Clinic (Mai wake -> window -> Mai history 1 & 2 -> Isshin -> Mai wrong-name 2 & 3) -> Settlement
    runSeq('clinic-wake');
    runSeq('clinic-window');
    expect(dialogueSequences['clinic-window'].cutsceneId).toBe('c03');
    for (const seqId of ['clinic-mai-history-1', 'clinic-mai-history-2', 'clinic-wrong-name-1', 'clinic-wrong-name-2', 'clinic-wrong-name-3']) {
      const npc = clinicMap.npcs.find(n => n.dialogueId === seqId);
      expect(npc).toBeDefined();
      if (npc?.requiresFlag) expect(hasFlag(progress, npc.requiresFlag)).toBe(true);
      runSeq(seqId);
    }
    const settlementDoor = clinicMap.doors.find(d => d.targetMap === 'settlement');
    expect(settlementDoor).toBeDefined();
    expect(hasFlag(progress, settlementDoor!.requiresFlag!)).toBe(true);
    expect(canWalkTo(clinicMap, settlementDoor!.position.x, settlementDoor!.position.y)).toBe(true);

    // Settlement (3 interactions + cry for help) -> Rescue
    for (const seqId of ['settlement-ration-table', 'settlement-barricade', 'settlement-shelter-board']) {
      runSeq(seqId);
      markSettlementInteraction(progress, dialogueSequences[seqId].completionFlag);
    }
    expect(areAllSettlementInteractionsDone(progress)).toBe(true);
    runSeq('settlement-cry-for-help');
    const rescueDoor = settlementMap.doors.find(d => d.targetMap === 'rescue');
    expect(rescueDoor).toBeDefined();
    expect(hasFlag(progress, rescueDoor!.requiresFlag!)).toBe(true);
    expect(canWalkTo(settlementMap, rescueDoor!.position.x, rescueDoor!.position.y)).toBe(true);
  });
});
