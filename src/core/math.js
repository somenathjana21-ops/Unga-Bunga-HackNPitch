/**
 * Small, dependency-free math helpers shared by every WANT system.
 *
 * Conventions:
 * - Angles are radians unless a function name says otherwise.
 * - `t` is a normalised 0..1 interpolation value unless documented otherwise.
 * - Vectors are plain `{ x, y }` objects so they serialise and destructure easily.
 */

export const TAU = Math.PI * 2;
export const HALF_PI = Math.PI / 2;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;
export const EPSILON = 1e-6;

/** Clamp `value` into the inclusive range [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Clamp `value` into 0..1. */
export function clamp01(value) {
  return clamp(value, 0, 1);
}

/** Linear interpolation from `a` to `b` by `t`. Does not clamp `t`. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Inverse lerp: where does `value` sit between `a` and `b`? */
export function invLerp(a, b, value) {
  if (Math.abs(b - a) < EPSILON) return 0;
  return (value - a) / (b - a);
}

/** Map `value` from one range to another, optionally clamped. */
export function remap(value, inMin, inMax, outMin, outMax, doClamp = false) {
  const t = invLerp(inMin, inMax, value);
  const result = lerp(outMin, outMax, t);
  return doClamp ? clamp(result, Math.min(outMin, outMax), Math.max(outMin, outMax)) : result;
}

/**
 * Frame-rate independent smoothing (exponential decay).
 * Higher `lambda` = snappier. Use for camera follow and UI easing.
 */
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * Math.max(0, dt)));
}

/** Move `current` toward `target` by at most `maxDelta`, preserving sign. */
export function approach(current, target, maxDelta) {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}

/** -1, 0, or 1. */
export function sign(value) {
  return value > 0 ? 1 : value < 0 ? -1 : 0;
}

/** Float comparison with a tolerance. */
export function approx(a, b, tolerance = EPSILON) {
  return Math.abs(a - b) <= tolerance;
}

/** Create a 2D vector. */
export function vec2(x = 0, y = 0) {
  return { x, y };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a, scalar) {
  return { x: a.x * scalar, y: a.y * scalar };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function length(a) {
  return Math.hypot(a.x, a.y);
}

export function lengthSq(a) {
  return a.x * a.x + a.y * a.y;
}

export function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function distanceSq(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/** Normalise a vector. Returns a zero vector for zero-length input. */
export function normalize(a) {
  const len = length(a);
  return len < EPSILON ? { x: 0, y: 0 } : { x: a.x / len, y: a.y / len };
}

/** Rotate a vector by `radians` around the origin. */
export function rotate(a, radians) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: a.x * cos - a.y * sin, y: a.x * sin + a.y * cos };
}

/** Unit vector for an angle where 0 points right and positive Y points down. */
export function fromAngle(radians, magnitude = 1) {
  return { x: Math.cos(radians) * magnitude, y: Math.sin(radians) * magnitude };
}

/** Angle of a vector in radians. */
export function angleOf(a) {
  return Math.atan2(a.y, a.x);
}

/** Shortest signed delta between two angles, in (-PI, PI]. */
export function angleDelta(a, b) {
  let delta = (b - a) % TAU;
  if (delta > Math.PI) delta -= TAU;
  if (delta < -Math.PI) delta += TAU;
  return delta;
}

/** Wrap an angle into [0, TAU). */
export function wrapAngle(radians) {
  return ((radians % TAU) + TAU) % TAU;
}

/** Random float in [min, max). */
export function randomRange(min, max, random = Math.random) {
  return min + (max - min) * random();
}

/** Random integer in [min, max] inclusive. */
export function randomInt(min, max, random = Math.random) {
  return Math.floor(min + (max - min + 1) * random());
}

/** Pick a random item from an array. */
export function pick(items, random = Math.random) {
  return items[Math.floor(random() * items.length)];
}

/**
 * Deterministic PRNG (mulberry32). Useful for repeatable tests and effects.
 * Returns a function that yields floats in [0, 1).
 */
export function createRng(seed = 1) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
