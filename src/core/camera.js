/**
 * Camera stub for Phase 1+.
 *
 * The camera's `(x, y)` is the world-space centre of the view. Rendering code
 * uses `worldToScreen` / `screenToWorld` and never needs to know about bounds
 * or smoothing. Phase 1 adds lookahead tuning; the API stays the same.
 */

import { clamp, damp } from './math.js';

export class Camera {
  constructor({
    x = 0,
    y = 0,
    zoom = 1,
    viewportWidth = 1280,
    viewportHeight = 720,
    bounds = null,
    stiffness = 8,
    lookahead = { x: 0, y: 0 },
  } = {}) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.bounds = bounds;
    this.stiffness = stiffness;
    this.lookahead = { x: lookahead.x ?? 0, y: lookahead.y ?? 0 };
  }

  setViewport(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  /** Bounds are world-space `{ x, y, w, h }`. Pass null for unbounded. */
  setBounds(bounds) {
    this.bounds = bounds;
    this.clampToBounds();
  }

  setZoom(zoom) {
    this.zoom = Math.max(0.01, zoom);
    this.clampToBounds();
  }

  snapTo(x, y) {
    this.x = x;
    this.y = y;
    this.clampToBounds();
  }

  /**
   * Smoothly follow a world-space target.
   * @param {{x:number,y:number}} target
   * @param {number} dt seconds
   * @param {boolean} [immediate] snap instead of easing
   */
  follow(target, dt, immediate = false) {
    const desiredX = target.x + (target.lookahead?.x ?? this.lookahead.x);
    const desiredY = target.y + (target.lookahead?.y ?? this.lookahead.y);

    if (immediate) {
      this.x = desiredX;
      this.y = desiredY;
    } else {
      this.x = damp(this.x, desiredX, this.stiffness, dt);
      this.y = damp(this.y, desiredY, this.stiffness, dt);
    }
    this.clampToBounds();
  }

  clampToBounds() {
    if (!this.bounds) return;
    const halfW = this.viewportWidth / (2 * this.zoom);
    const halfH = this.viewportHeight / (2 * this.zoom);
    const { x, y, w, h } = this.bounds;

    // If the scene is smaller than the view, centre it rather than jittering.
    this.x = w <= halfW * 2 ? x + w / 2 : clamp(this.x, x + halfW, x + w - halfW);
    this.y = h <= halfH * 2 ? y + h / 2 : clamp(this.y, y + halfH, y + h - halfH);
  }

  worldToScreen(point) {
    return {
      x: (point.x - this.x) * this.zoom + this.viewportWidth / 2,
      y: (point.y - this.y) * this.zoom + this.viewportHeight / 2,
    };
  }

  screenToWorld(point) {
    return {
      x: (point.x - this.viewportWidth / 2) / this.zoom + this.x,
      y: (point.y - this.viewportHeight / 2) / this.zoom + this.y,
    };
  }

  /** Visible world rectangle, useful for culling. */
  getVisibleBounds() {
    const halfW = this.viewportWidth / (2 * this.zoom);
    const halfH = this.viewportHeight / (2 * this.zoom);
    return {
      x: this.x - halfW,
      y: this.y - halfH,
      w: halfW * 2,
      h: halfH * 2,
    };
  }
}
