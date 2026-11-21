// Pure Horde Mode arsenal definitions, weapon caveats, and state machine.
// Kept isolated from Story Mode combat so campaign pistol rules remain unchanged.

import { ACTIVE_RELOAD_MAX, ACTIVE_RELOAD_MIN } from '../combat/player';

export const HORDE_WEAPON_IDS = ['pistol', 'machinegun', 'sniper', 'minigun', 'rocket'] as const;
export type HordeWeaponId = (typeof HORDE_WEAPON_IDS)[number];

export interface HordeWeaponSpec {
  id: HordeWeaponId;
  slot: number;
  name: string;
  shortName: string;
  magSize: number;
  fireCooldownMs: number;
  reloadMs: number;
  damageMult: number;
  bulletSpeed: number;
  bulletRadius: number;
  baseSpreadRad: number;
  maxSpreadRad: number;
  bloomPerShot: number;
  bloomDecayPerSec: number;
  moveSpeedMult: number;
  firingMoveSpeedMult: number;
  autoFire: boolean;
  piercing: boolean;
  spinUpMs: number;
  spinDownMs: number;
  splashRadius: number;
  selfDamageRadius: number;
  recoilKick: number;
  accentHex: string;
  accentColor: number;
  strengthLabel: string;
  caveatLabel: string;
  summary: string;
}

export const hordeWeapons: Record<HordeWeaponId, HordeWeaponSpec> = {
  pistol: {
    id: 'pistol',
    slot: 1,
    name: 'Service Pistol',
    shortName: 'PISTOL',
    magSize: 6,
    fireCooldownMs: 175,
    reloadMs: 850,
    damageMult: 1.0,
    bulletSpeed: 640,
    bulletRadius: 3.5,
    baseSpreadRad: 0.01,
    maxSpreadRad: 0.032,
    bloomPerShot: 0.006,
    bloomDecayPerSec: 0.14,
    moveSpeedMult: 1.0,
    firingMoveSpeedMult: 1.0,
    autoFire: false,
    piercing: false,
    spinUpMs: 0,
    spinDownMs: 0,
    splashRadius: 0,
    selfDamageRadius: 0,
    recoilKick: 0,
    accentHex: '#93c5fd',
    accentColor: 0x93c5fd,
    strengthLabel: 'Agile · Fast 0.85s reload',
    caveatLabel: '6-rd mag · Moderate DPS',
    summary: 'Zero mobility penalty, crisp accuracy, and the fastest reload — falls behind in raw crowd DPS.',
  },
  machinegun: {
    id: 'machinegun',
    slot: 2,
    name: 'Machine Gun',
    shortName: 'MG',
    magSize: 28,
    fireCooldownMs: 112,
    reloadMs: 1450,
    damageMult: 0.56,
    bulletSpeed: 680,
    bulletRadius: 3.2,
    baseSpreadRad: 0.032,
    maxSpreadRad: 0.15,
    bloomPerShot: 0.013,
    bloomDecayPerSec: 0.16,
    moveSpeedMult: 0.96,
    firingMoveSpeedMult: 0.88,
    autoFire: true,
    piercing: false,
    spinUpMs: 0,
    spinDownMs: 0,
    splashRadius: 0,
    selfDamageRadius: 0,
    recoilKick: 1.4,
    accentHex: '#fbbf24',
    accentColor: 0xfbbf24,
    strengthLabel: 'Full-auto · 28-rd mag',
    caveatLabel: 'Burst bloom · 1.45s reload',
    summary: 'Hold fire for steady automatic pressure — sustained bursts widen spread and slightly slow strafing.',
  },
  sniper: {
    id: 'sniper',
    slot: 3,
    name: 'Rail Sniper',
    shortName: 'SNIPER',
    magSize: 4,
    fireCooldownMs: 900,
    reloadMs: 1650,
    damageMult: 3.35,
    bulletSpeed: 1140,
    bulletRadius: 4.2,
    baseSpreadRad: 0,
    maxSpreadRad: 0,
    bloomPerShot: 0,
    bloomDecayPerSec: 0.5,
    moveSpeedMult: 0.93,
    firingMoveSpeedMult: 0.85,
    autoFire: false,
    piercing: true,
    spinUpMs: 0,
    spinDownMs: 0,
    splashRadius: 0,
    selfDamageRadius: 0,
    recoilKick: 7.5,
    accentHex: '#38bdf8',
    accentColor: 0x38bdf8,
    strengthLabel: '3.35× DMG · Pierces lines',
    caveatLabel: 'Slow 0.9s bolt · 4-rd mag',
    summary: 'Pinpoint rail rounds pierce entire enemy columns — punishingly slow bolt cycle and small 4-shot mag.',
  },
  minigun: {
    id: 'minigun',
    slot: 4,
    name: 'Rotary Minigun',
    shortName: 'MINIGUN',
    magSize: 60,
    fireCooldownMs: 66,
    reloadMs: 2150,
    damageMult: 0.36,
    bulletSpeed: 660,
    bulletRadius: 2.8,
    baseSpreadRad: 0.11,
    maxSpreadRad: 0.21,
    bloomPerShot: 0.004,
    bloomDecayPerSec: 0.22,
    moveSpeedMult: 0.84,
    firingMoveSpeedMult: 0.58,
    autoFire: true,
    piercing: false,
    spinUpMs: 420,
    spinDownMs: 650,
    splashRadius: 0,
    selfDamageRadius: 0,
    recoilKick: 2.6,
    accentHex: '#fb923c',
    accentColor: 0xfb923c,
    strengthLabel: '60-rd belt · Shreds crowds',
    caveatLabel: '0.42s spin-up · Heavy 58% speed',
    summary: 'Unmatched bullet hose after spooling up — leaves K heavily slowed with wide cone spread and 2.15s reload.',
  },
  rocket: {
    id: 'rocket',
    slot: 5,
    name: 'Rocket Launcher',
    shortName: 'ROCKET',
    magSize: 2,
    fireCooldownMs: 1100,
    reloadMs: 2200,
    damageMult: 3.1,
    bulletSpeed: 410,
    bulletRadius: 6.2,
    baseSpreadRad: 0.01,
    maxSpreadRad: 0.025,
    bloomPerShot: 0.008,
    bloomDecayPerSec: 0.2,
    moveSpeedMult: 0.86,
    firingMoveSpeedMult: 0.78,
    autoFire: false,
    piercing: false,
    spinUpMs: 0,
    spinDownMs: 0,
    splashRadius: 108,
    selfDamageRadius: 72,
    recoilKick: 10.5,
    accentHex: '#f87171',
    accentColor: 0xf87171,
    strengthLabel: '108px AoE blast · Staggers',
    caveatLabel: 'Slow warhead · Self-blast <72px',
    summary: 'Detonates on enemies or cover for massive splash damage — slow 2-rocket tube with close-range self-blast danger.',
  },
};

export interface HordeWeaponSlotState {
  ammo: number;
  reloading: boolean;
  reloadStartTime: number;
  reloadEndTime: number;
  snapAttempted: boolean;
  overchargedRounds: number;
  bloom: number;
  nextFireTime: number;
}

export interface HordeArsenalState {
  activeId: HordeWeaponId;
  slots: Record<HordeWeaponId, HordeWeaponSlotState>;
  spinProgress: number;
  lastShotTime: number;
}

export interface ArsenalShotResult {
  weaponId: HordeWeaponId;
  vx: number;
  vy: number;
  speed: number;
  radius: number;
  damage: number;
  isOvercharged: boolean;
  piercing: boolean;
  splashRadius: number;
  selfDamageRadius: number;
  recoilKick: number;
  color: number;
}

function createSlotState(id: HordeWeaponId): HordeWeaponSlotState {
  return {
    ammo: hordeWeapons[id].magSize,
    reloading: false,
    reloadStartTime: 0,
    reloadEndTime: 0,
    snapAttempted: false,
    overchargedRounds: 0,
    bloom: 0,
    nextFireTime: 0,
  };
}

export function createArsenalState(initialWeapon: HordeWeaponId = 'pistol'): HordeArsenalState {
  return {
    activeId: initialWeapon,
    slots: {
      pistol: createSlotState('pistol'),
      machinegun: createSlotState('machinegun'),
      sniper: createSlotState('sniper'),
      minigun: createSlotState('minigun'),
      rocket: createSlotState('rocket'),
    },
    spinProgress: 0,
    lastShotTime: -10_000,
  };
}

export function getActiveWeaponSpec(state: HordeArsenalState): HordeWeaponSpec {
  return hordeWeapons[state.activeId];
}

export function getActiveSlot(state: HordeArsenalState): HordeWeaponSlotState {
  return state.slots[state.activeId];
}

/** Switches active weapon while preserving every weapon's magazine count. Cancels any in-progress reload cleanly. */
export function switchWeapon(state: HordeArsenalState, targetId: HordeWeaponId): boolean {
  if (state.activeId === targetId) return false;
  const prevSlot = state.slots[state.activeId];
  if (prevSlot.reloading) {
    prevSlot.reloading = false;
    prevSlot.snapAttempted = false;
  }
  state.activeId = targetId;
  if (hordeWeapons[targetId].spinUpMs === 0) {
    state.spinProgress = 0;
  }
  return true;
}

export function cycleWeapon(state: HordeArsenalState, delta: 1 | -1): HordeWeaponId {
  const idx = HORDE_WEAPON_IDS.indexOf(state.activeId);
  const nextIdx = (idx + delta + HORDE_WEAPON_IDS.length) % HORDE_WEAPON_IDS.length;
  const nextId = HORDE_WEAPON_IDS[nextIdx];
  switchWeapon(state, nextId);
  return nextId;
}

export function reloadProgress(state: HordeArsenalState, now: number): number {
  const slot = getActiveSlot(state);
  if (!slot.reloading) return 0;
  const duration = Math.max(1, slot.reloadEndTime - slot.reloadStartTime);
  return Math.max(0, Math.min(1, (now - slot.reloadStartTime) / duration));
}

export function tickArsenal(
  state: HordeArsenalState,
  dtMs: number,
  now: number,
  holdingFire: boolean,
): { completedReload: boolean; startedSpinUp: boolean } {
  const spec = getActiveWeaponSpec(state);
  const slot = getActiveSlot(state);
  const dtSec = dtMs / 1000;

  let completedReload = false;
  if (slot.reloading && now >= slot.reloadEndTime) {
    slot.reloading = false;
    slot.ammo = spec.magSize;
    slot.snapAttempted = false;
    completedReload = true;
  }

  // Decay bloom across all slots so holstered weapons settle naturally
  for (const id of HORDE_WEAPON_IDS) {
    const s = state.slots[id];
    if (s.bloom > 0) {
      s.bloom = Math.max(0, s.bloom - hordeWeapons[id].bloomDecayPerSec * dtSec);
    }
  }

  // Spin-up / spin-down tracking for rotary weapons (Minigun)
  let startedSpinUp = false;
  if (spec.spinUpMs > 0) {
    const canSpool = holdingFire && !slot.reloading && slot.ammo > 0;
    if (canSpool) {
      if (state.spinProgress < 0.05) startedSpinUp = true;
      state.spinProgress = Math.min(1, state.spinProgress + dtMs / spec.spinUpMs);
    } else if (state.spinProgress > 0) {
      state.spinProgress = Math.max(0, state.spinProgress - dtMs / Math.max(1, spec.spinDownMs));
    }
  } else {
    state.spinProgress = 0;
  }

  return { completedReload, startedSpinUp };
}

export function triggerArsenalReload(
  state: HordeArsenalState,
  now: number,
): 'started' | 'snap' | 'miss' | 'noop' {
  const spec = getActiveWeaponSpec(state);
  const slot = getActiveSlot(state);

  if (slot.reloading) {
    if (slot.snapAttempted) return 'noop';
    slot.snapAttempted = true;
    const p = reloadProgress(state, now);
    if (p >= ACTIVE_RELOAD_MIN && p <= ACTIVE_RELOAD_MAX) {
      slot.reloading = false;
      slot.ammo = spec.magSize;
      // Grant overcharged rounds scaled modestly to mag size
      slot.overchargedRounds = spec.magSize >= 20 ? Math.min(6, Math.ceil(spec.magSize * 0.18)) : Math.min(2, spec.magSize);
      return 'snap';
    }
    return 'miss';
  }

  if (slot.ammo >= spec.magSize) return 'noop';
  slot.reloading = true;
  slot.reloadStartTime = now;
  slot.reloadEndTime = now + spec.reloadMs;
  slot.snapAttempted = false;
  slot.overchargedRounds = 0;
  return 'started';
}

export function effectiveWeaponMoveMult(
  state: HordeArsenalState,
  now: number,
  holdingFire: boolean,
): number {
  const spec = getActiveWeaponSpec(state);
  const recentlyFired = now - state.lastShotTime < 260;
  const activeFiring = (holdingFire && (spec.autoFire || spec.spinUpMs > 0)) || state.spinProgress > 0.15 || recentlyFired;
  return activeFiring ? spec.firingMoveSpeedMult : spec.moveSpeedMult;
}

export function canArsenalFire(state: HordeArsenalState, now: number): boolean {
  const spec = getActiveWeaponSpec(state);
  const slot = getActiveSlot(state);
  if (slot.reloading || slot.ammo <= 0) return false;
  if (now < slot.nextFireTime) return false;
  if (spec.spinUpMs > 0 && state.spinProgress < 0.99) return false;
  return true;
}

export function consumeArsenalShot(
  state: HordeArsenalState,
  now: number,
  tierBasePistolDamage: number,
  tierFireCooldownScale: number,
  aimX: number,
  aimY: number,
  rng: () => number = Math.random,
): ArsenalShotResult | null {
  if (!canArsenalFire(state, now)) return null;
  const spec = getActiveWeaponSpec(state);
  const slot = getActiveSlot(state);

  const isOvercharged = slot.overchargedRounds > 0;
  if (isOvercharged) slot.overchargedRounds--;

  slot.ammo--;
  const clampedScale = Math.max(0.82, Math.min(1.05, tierFireCooldownScale));
  slot.nextFireTime = now + Math.round(spec.fireCooldownMs * clampedScale);
  state.lastShotTime = now;

  // Apply weapon base spread + accumulated sustained-fire bloom
  const totalSpread = Math.min(spec.maxSpreadRad, spec.baseSpreadRad + slot.bloom);
  const baseAngle = Math.atan2(aimY, aimX);
  const jitter = totalSpread > 0 ? (rng() - 0.5) * 2 * totalSpread : 0;
  const finalAngle = baseAngle + jitter;
  slot.bloom = Math.min(spec.maxSpreadRad, slot.bloom + spec.bloomPerShot);

  // Auto-start reload when the magazine hits zero
  if (slot.ammo === 0) {
    slot.reloading = true;
    slot.reloadStartTime = now;
    slot.reloadEndTime = now + spec.reloadMs;
    slot.snapAttempted = false;
  }

  const baseDamage = tierBasePistolDamage * spec.damageMult;
  const finalDamage = Math.max(1, Math.round(isOvercharged ? baseDamage * 1.4 : baseDamage));

  return {
    weaponId: spec.id,
    vx: Math.cos(finalAngle),
    vy: Math.sin(finalAngle),
    speed: spec.bulletSpeed,
    radius: spec.bulletRadius,
    damage: finalDamage,
    isOvercharged,
    piercing: spec.piercing,
    splashRadius: spec.splashRadius,
    selfDamageRadius: spec.selfDamageRadius,
    recoilKick: spec.recoilKick,
    color: isOvercharged ? 0xfde047 : spec.accentColor,
  };
}

/** Computes explosive AoE damage with smooth radial falloff (100% at center down to 55% at blast rim). */
export function computeSplashDamage(
  cx: number,
  cy: number,
  targetX: number,
  targetY: number,
  splashRadius: number,
  maxDamage: number,
): number {
  if (splashRadius <= 0 || maxDamage <= 0) return 0;
  const dist = Math.hypot(targetX - cx, targetY - cy);
  if (dist > splashRadius) return 0;
  const falloff = 1 - (dist / splashRadius) * 0.45;
  return Math.max(1, Math.round(maxDamage * falloff));
}
