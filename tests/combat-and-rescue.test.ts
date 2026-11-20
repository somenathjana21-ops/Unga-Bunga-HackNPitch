import { describe, expect, it } from 'vitest';
import {
  ACTIVE_RELOAD_MAX,
  ACTIVE_RELOAD_MIN,
  MAGAZINE_SIZE,
  OVERCHARGE_DAMAGE_MULT,
  Player,
  RELOAD_DURATION_MS,
} from '../src/game/combat/player';
import { bulletHitsCover, updateBullet } from '../src/game/combat/bullet';
import { isEnemyExposed, makeEnemy, updateEnemy } from '../src/game/combat/enemy';
import {
  SWITCH_HOLD_MS,
  SWITCH_INTERACT_RADIUS,
  evaluateSwitchAttempt,
  switchHoldProgress,
} from '../src/game/combat/rescue-switch';
import { combatTuning } from '../src/game/rules';
import type { CombatBullet, CoverRect } from '../src/game/combat/types';

describe('tactical combat mechanics', () => {
  it('supports 6-round magazine, auto-reload, active snap-reload overcharge, and counter override', () => {
    const p = new Player();
    expect(p.ammo).toBe(MAGAZINE_SIZE);

    // Fire 6 rounds -> triggers automatic reload
    for (let i = 0; i < MAGAZINE_SIZE; i++) {
      expect(p.canFire(i * 100)).toBe(true);
      const shot = p.fireBullet(0, 0, i * 100);
      expect(shot.isCounter).toBe(false);
      expect(shot.piercing).toBe(false);
    }
    expect(p.ammo).toBe(0);
    expect(p.reloading).toBe(true);
    expect(p.canFire(600)).toBe(false);

    // Snap-reload inside sweet spot immediately refills + grants 1 overcharged shot
    const sweetTime = 500 + RELOAD_DURATION_MS * ((ACTIVE_RELOAD_MIN + ACTIVE_RELOAD_MAX) / 2);
    expect(p.triggerReload(sweetTime)).toBe('snap');
    expect(p.reloading).toBe(false);
    expect(p.ammo).toBe(MAGAZINE_SIZE);

    const empowered = p.fireBullet(0, 0, sweetTime + 10);
    expect(empowered.isOvercharged).toBe(true);
    expect(empowered.damage).toBe(Math.round(combatTuning.pistolDamage * OVERCHARGE_DAMAGE_MULT));

    // Reflex Counter always fires even mid-reload and produces a piercing 3x counter rail shot
    p.triggerReload(sweetTime + 20);
    expect(p.reloading).toBe(true);
    p.openCounter(sweetTime + 30, 'atk-1');
    expect(p.canFire(sweetTime + 40)).toBe(true);
    const counterShot = p.fireBullet(0, 0, sweetTime + 40);
    expect(counterShot.isCounter).toBe(true);
    expect(counterShot.piercing).toBe(true);
    expect(counterShot.damage).toBe(combatTuning.pistolDamage * combatTuning.counterDamageMultiplier);
    expect(p.reloading).toBe(false);
  });

  it('blocks normal bullets on cover while letting piercing counter rails pass through', () => {
    const cover: CoverRect[] = [{ x: 100, y: 100, w: 60, h: 60 }];
    const normalBullet: CombatBullet = {
      id: 'b-1',
      x: 110,
      y: 120,
      prevX: 90,
      prevY: 120,
      vx: 1,
      vy: 0,
      speed: 500,
      damage: 10,
      owner: 'enemy',
      attackId: 'atk-1',
      born: 0,
      ttl: 2000,
    };
    expect(bulletHitsCover(normalBullet, 3, cover)).toBe(true);

    const counterRail: CombatBullet = { ...normalBullet, owner: 'player', isCounter: true, piercing: true };
    expect(bulletHitsCover(counterRail, 3, cover)).toBe(false);

    updateBullet(counterRail, 0.05);
    expect(counterRail.prevX).toBe(110);
    expect(counterRail.x).toBeGreaterThan(110);
  });

  it('moves Scouts/Rushers actively during idle and staggers Rushers that slam into cover', () => {
    const bounds = { minX: 20, maxX: 740, minY: 20, maxY: 410 };
    const scout = makeEnemy('scout', 500, 200, 'story', 0);
    const startX = scout.x;
    const startY = scout.y;
    updateEnemy(scout, { x: 120, y: 200, radius: 10 }, 200, 0.2, [], bounds, 'story');
    expect(Math.hypot(scout.x - startX, scout.y - startY)).toBeGreaterThan(5);

    // Charging Rusher slams into cover directly ahead -> staggers & becomes exposed
    const rusher = makeEnemy('rusher', 180, 200, 'story', 0);
    rusher.phase = 'committed';
    rusher.committedVx = 360;
    rusher.committedVy = 0;
    rusher.committedEndTime = 2000;
    rusher.attackId = 'atk-charge';
    const coverAhead: CoverRect[] = [{ x: 205, y: 160, w: 50, h: 80 }];

    const res = updateEnemy(rusher, { x: 350, y: 200, radius: 10 }, 500, 0.1, coverAhead, bounds, 'story');
    expect(res.slammedCover).toBe(true);
    expect(rusher.phase).toBe('staggered');
    expect(isEnemyExposed(rusher)).toBe(true);
  });
});

describe('rescue gate switch rules', () => {
  it('gates activation strictly on extraction beat, proximity, and hold duration', () => {
    expect(evaluateSwitchAttempt({ beatId: 'alley', gateOpen: false, holding: false, distancePx: 20 })).toBe('locked');
    expect(evaluateSwitchAttempt({ beatId: 'hold', gateOpen: false, holding: false, distancePx: 20 })).toBe('locked');
    expect(
      evaluateSwitchAttempt({
        beatId: 'extraction',
        gateOpen: false,
        holding: false,
        distancePx: SWITCH_INTERACT_RADIUS + 20,
      }),
    ).toBe('too-far');
    expect(
      evaluateSwitchAttempt({
        beatId: 'extraction',
        gateOpen: false,
        holding: false,
        distancePx: SWITCH_INTERACT_RADIUS - 10,
      }),
    ).toBe('started');
    expect(
      evaluateSwitchAttempt({
        beatId: 'extraction',
        gateOpen: false,
        holding: true,
        distancePx: 10,
      }),
    ).toBe('already-holding');
    expect(
      evaluateSwitchAttempt({
        beatId: 'extraction',
        gateOpen: true,
        holding: false,
        distancePx: 10,
      }),
    ).toBe('already-open');

    expect(switchHoldProgress(1000, 1000)).toBe(0);
    expect(switchHoldProgress(1000, 1000 + SWITCH_HOLD_MS / 2)).toBeCloseTo(0.5);
    expect(switchHoldProgress(1000, 1000 + SWITCH_HOLD_MS)).toBe(1);
  });
});
