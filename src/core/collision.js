/**
 * Axis-aligned bounding-box (AABB) helpers.
 *
 * Boxes use a top-left origin: `{ x, y, w, h }`.
 * Edges that merely touch are not considered overlapping; that keeps wall
 * sliding from jittering when a body rests against a solid.
 */

import { clamp } from './math.js';

/** Create an AABB. */
export function aabb(x = 0, y = 0, w = 0, h = 0) {
  return { x, y, w, h };
}

/** Build a box from its centre point. */
export function fromCenter(cx, cy, w, h) {
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Centre point of a box. */
export function center(box) {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

/** True when two boxes overlap. Touching edges return false. */
export function intersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** Overlap rectangle, or null when the boxes do not overlap. */
export function intersection(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  if (right <= x || bottom <= y) return null;
  return { x, y, w: right - x, h: bottom - y };
}

/** Area of the overlap (0 when separated). */
export function overlapArea(a, b) {
  const rect = intersection(a, b);
  return rect ? rect.w * rect.h : 0;
}

/** True when a point is inside the box. */
export function containsPoint(box, point) {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.w &&
    point.y >= box.y &&
    point.y <= box.y + box.h
  );
}

/** Closest point on or inside the box to `point`. */
export function closestPoint(box, point) {
  return {
    x: clamp(point.x, box.x, box.x + box.w),
    y: clamp(point.y, box.y, box.y + box.h),
  };
}

/** Distance from a point to the nearest edge of the box (0 when inside). */
export function distanceToPoint(box, point) {
  const closest = closestPoint(box, point);
  return Math.hypot(point.x - closest.x, point.y - closest.y);
}

/** Expand a box by `amount` on every side (negative shrinks). */
export function inflate(box, amount) {
  return {
    x: box.x - amount,
    y: box.y - amount,
    w: box.w + amount * 2,
    h: box.h + amount * 2,
  };
}

/**
 * Move a box by `(dx, dy)` against static solids, resolving each axis in turn.
 * This produces wall sliding: a blocked X move still allows the Y move.
 *
 * Sweeps use the starting position to decide which face was crossed, so a
 * single step cannot tunnel through a solid at normal movement speeds.
 *
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {number} dx
 * @param {number} dy
 * @param {Array<{x:number,y:number,w:number,h:number}>} solids
 * @returns {{x:number,y:number,hitX:boolean,hitY:boolean}}
 */
export function moveAndSlide(box, dx, dy, solids = []) {
  const w = box.w;
  const h = box.h;
  let x = box.x;
  let y = box.y;
  let hitX = false;
  let hitY = false;

  if (dx !== 0) {
    let nextX = x + dx;
    for (const solid of solids) {
      if (!solid) continue;
      // Only solids overlapping the current vertical span can block an X move.
      if (y + h <= solid.y || y >= solid.y + solid.h) continue;

      if (dx > 0 && x + w <= solid.x && nextX + w > solid.x) {
        nextX = Math.min(nextX, solid.x - w);
        hitX = true;
      } else if (dx < 0 && x >= solid.x + solid.w && nextX < solid.x + solid.w) {
        nextX = Math.max(nextX, solid.x + solid.w);
        hitX = true;
      }
    }
    x = nextX;
  }

  if (dy !== 0) {
    let nextY = y + dy;
    for (const solid of solids) {
      if (!solid) continue;
      // Resolve against the already-moved X span so corners behave cleanly.
      if (x + w <= solid.x || x >= solid.x + solid.w) continue;

      if (dy > 0 && y + h <= solid.y && nextY + h > solid.y) {
        nextY = Math.min(nextY, solid.y - h);
        hitY = true;
      } else if (dy < 0 && y >= solid.y + solid.h && nextY < solid.y + solid.h) {
        nextY = Math.max(nextY, solid.y + solid.h);
        hitY = true;
      }
    }
    y = nextY;
  }

  return { x, y, hitX, hitY };
}

/** All solids that overlap `box`. */
export function queryOverlaps(box, solids = []) {
  return solids.filter((solid) => solid && intersects(box, solid));
}
