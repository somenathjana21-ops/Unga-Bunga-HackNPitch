/**
 * WANT game shell.
 *
 * Responsibilities:
 * - own the canvas backing store and letterboxed 1280x720 design viewport
 * - drive a fixed-timestep update loop with a clamped frame delta
 * - auto-pause on tab hide / window blur and resume without a time jump
 * - watch sustained low FPS and warn once per cooldown
 *
 * Gameplay does not live here. Callers pass `onUpdate` / `onRender` hooks.
 */

import { Input } from './input.js';
import { clamp } from './math.js';

export const FIXED_DT = 1 / 60;
export const MAX_FRAME_DT = 0.25;
export const MAX_STEPS_PER_FRAME = 8;
export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;
export const LOW_FPS_THRESHOLD = 50;
export const LOW_FPS_SUSTAIN_SECONDS = 3;
export const LOW_FPS_WARN_COOLDOWN_SECONDS = 10;

export class Game {
  constructor(
    canvas,
    {
      fixedDt = FIXED_DT,
      maxFrameDt = MAX_FRAME_DT,
      maxSteps = MAX_STEPS_PER_FRAME,
      designWidth = DESIGN_WIDTH,
      designHeight = DESIGN_HEIGHT,
      maxDpr = 2,
      onUpdate = null,
      onRender = null,
      onResize = null,
      input = null,
    } = {},
  ) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new Error('Game requires a <canvas> element.');
    }

    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) throw new Error('Could not create a 2D canvas context.');

    this.canvas = canvas;
    this.ctx = context;
    this.fixedDt = fixedDt;
    this.maxFrameDt = maxFrameDt;
    this.maxSteps = maxSteps;
    this.designWidth = designWidth;
    this.designHeight = designHeight;
    this.maxDpr = maxDpr;

    this.onUpdate = onUpdate;
    this.onRender = onRender;
    this.onResize = onResize;

    this.input = input ?? new Input(window, canvas);
    this.pauseReasons = new Set();
    this.started = false;
    this.paused = false;
    this.running = false;

    this.time = 0;
    this.accumulator = 0;
    this.lastTime = 0;
    this.rafId = 0;
    this.frameCount = 0;
    this.updateCount = 0;

    this.viewport = {
      x: 0,
      y: 0,
      width: designWidth,
      height: designHeight,
      scale: 1,
      cssWidth: designWidth,
      cssHeight: designHeight,
      dpr: 1,
    };

    this.stats = {
      fps: 0,
      frameMs: 0,
      frames: 0,
      updates: 0,
      droppedSeconds: 0,
      lowFps: false,
      lowFpsSeconds: 0,
    };

    this._fpsWindowSeconds = 0;
    this._fpsWindowFrames = 0;
    this._lowFpsWindows = 0;
    this._lastFpsWarnAt = -Infinity;

    this._boundFrame = (now) => this._frame(now);
    this._onVisibilityChange = () => {
      if (document.hidden) this.pause('tab-hidden');
      else this.resume('tab-hidden');
    };
    this._onWindowBlur = () => this.pause('window-blur');
    this._onWindowFocus = () => this.resume('window-blur');
    this._onWindowResize = () => this.resize();

    this._installListeners();
    this.resize();
  }

  /** Install global listeners and prime the first layout. */
  _installListeners() {
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    window.addEventListener('blur', this._onWindowBlur);
    window.addEventListener('focus', this._onWindowFocus);
    window.addEventListener('resize', this._onWindowResize);
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(this._onWindowResize);
      this._resizeObserver.observe(this.canvas);
    }
  }

  /**
   * Match the canvas backing store to its CSS size and compute a centred,
   * aspect-correct 16:9 viewport. Rendering still uses 1280x720 coordinates.
   */
  resize() {
    const cssWidth = this.canvas.clientWidth || window.innerWidth || this.designWidth;
    const cssHeight = this.canvas.clientHeight || window.innerHeight || this.designHeight;
    const dpr = clamp(window.devicePixelRatio || 1, 1, this.maxDpr);

    const backingWidth = Math.max(1, Math.round(cssWidth * dpr));
    const backingHeight = Math.max(1, Math.round(cssHeight * dpr));
    if (this.canvas.width !== backingWidth) this.canvas.width = backingWidth;
    if (this.canvas.height !== backingHeight) this.canvas.height = backingHeight;

    const scale = Math.min(cssWidth / this.designWidth, cssHeight / this.designHeight);
    this.viewport = {
      x: (cssWidth - this.designWidth * scale) / 2,
      y: (cssHeight - this.designHeight * scale) / 2,
      width: this.designWidth * scale,
      height: this.designHeight * scale,
      scale,
      cssWidth,
      cssHeight,
      dpr,
    };

    if (this.input?.setPointerMap) {
      const { x: offsetX, y: offsetY, scale: viewScale } = this.viewport;
      this.input.setPointerMap((point) => ({
        x: (point.x - offsetX) / viewScale,
        y: (point.y - offsetY) / viewScale,
      }));
    }

    this.onResize?.(this.viewport);

    // Keep the paused frame in sync with the new viewport.
    if (this.started && this.paused) this._renderPausedFrame();
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    if (this.paused) {
      this._renderPausedFrame();
      return;
    }
    this._startLoop();
  }

  stop() {
    this.started = false;
    this._stopLoop();
  }

  /** Pause with a named reason. Multiple reasons can stack. */
  pause(reason = 'manual') {
    this.pauseReasons.add(reason);
    this.paused = true;
    this.running = false;
    this.input?.releaseAll();
    this.input?.endFrame();
    this._stopLoop();
    if (this.started) this._renderPausedFrame();
  }

  /** Remove a pause reason. The loop resumes only when none remain. */
  resume(reason = 'manual') {
    this.pauseReasons.delete(reason);
    if (!this.paused || this.pauseReasons.size > 0) return;
    this.paused = false;
    this.accumulator = 0;
    this.lastTime = performance.now();
    if (this.started) this._startLoop();
  }

  togglePause(reason = 'manual') {
    if (this.pauseReasons.has(reason)) this.resume(reason);
    else this.pause(reason);
  }

  _startLoop() {
    if (this.rafId !== 0 || !this.started || this.paused) return;
    this.running = true;
    this.rafId = requestAnimationFrame(this._boundFrame);
  }

  _stopLoop() {
    if (this.rafId !== 0) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.running = false;
  }

  _frame(now) {
    this.rafId = 0;
    if (!this.started || this.paused) return;

    const rawDt = Math.max(0, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // Guard against background tabs / breakpoints producing huge deltas.
    const frameDt = Math.min(rawDt, this.maxFrameDt);
    if (rawDt > this.maxFrameDt) {
      this.stats.droppedSeconds += rawDt - this.maxFrameDt;
    }

    this.accumulator += frameDt;

    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < this.maxSteps) {
      this.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
      steps += 1;
      this.updateCount += 1;
    }

    // Spiral-of-death guard: if we hit the step cap, discard the backlog.
    if (steps === this.maxSteps && this.accumulator >= this.fixedDt) {
      this.stats.droppedSeconds += this.accumulator;
      this.accumulator = 0;
    }

    const alpha = this.accumulator / this.fixedDt;
    this.render(alpha);

    this.frameCount += 1;
    this.stats.frames = this.frameCount;
    this.stats.updates = this.updateCount;
    this.stats.frameMs = rawDt * 1000;
    this._measureFps(rawDt);

    this.input.endFrame();

    this.rafId = requestAnimationFrame(this._boundFrame);
  }

  update(dt) {
    this.time += dt;
    this.onUpdate?.(dt, this);
  }

  /** Draw one frame. All draw coordinates are in 1280x720 design space. */
  render(alpha) {
    const ctx = this.ctx;
    const { cssWidth, cssHeight, dpr, x, y, scale } = this.viewport;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#04060a';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.rect(0, 0, this.designWidth, this.designHeight);
    ctx.clip();

    this.onRender?.(ctx, {
      alpha,
      time: this.time,
      stats: this.stats,
      viewport: this.viewport,
      paused: this.paused,
      pauseReasons: [...this.pauseReasons],
      designWidth: this.designWidth,
      designHeight: this.designHeight,
      input: this.input,
    });

    ctx.restore();
  }

  _renderPausedFrame() {
    this.render(0);
  }

  _measureFps(frameDt) {
    // Ignore absurd deltas (tab wake-up, debugger pause) so the guard is honest.
    if (frameDt <= 0 || frameDt > 0.5) return;

    this._fpsWindowSeconds += frameDt;
    this._fpsWindowFrames += 1;
    if (this._fpsWindowSeconds < 1) return;

    const fps = this._fpsWindowFrames / this._fpsWindowSeconds;
    this.stats.fps = Math.round(fps * 10) / 10;

    if (fps < LOW_FPS_THRESHOLD) {
      this._lowFpsWindows += 1;
      this.stats.lowFps = true;
      this.stats.lowFpsSeconds = this._lowFpsWindows;
    } else {
      this._lowFpsWindows = 0;
      this.stats.lowFps = false;
      this.stats.lowFpsSeconds = 0;
    }

    const now = performance.now() / 1000;
    if (
      this._lowFpsWindows >= LOW_FPS_SUSTAIN_SECONDS &&
      now - this._lastFpsWarnAt >= LOW_FPS_WARN_COOLDOWN_SECONDS
    ) {
      this._lastFpsWarnAt = now;
      console.warn(
        `[WANT] FPS guard: ${this.stats.fps.toFixed(1)} fps sustained for ` +
          `${this._lowFpsWindows}s (target 60).`,
      );
    }

    this._fpsWindowSeconds = 0;
    this._fpsWindowFrames = 0;
  }

  destroy() {
    this.stop();
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    window.removeEventListener('blur', this._onWindowBlur);
    window.removeEventListener('focus', this._onWindowFocus);
    window.removeEventListener('resize', this._onWindowResize);
    this._resizeObserver?.disconnect();
    this.input?.destroy();
    this.input = null;
  }
}
