/**
 * Audio stub for Phase 0.
 *
 * Routing:
 *   music ─┐
 *          ├─► master ─► destination
 *   sfx  ──┘
 *
 * The Web Audio context is created lazily on the first user gesture, so the
 * browser never blocks or warns about autoplay. `play()` resolves asset IDs
 * through the asset manifest only; this module never builds a file path.
 *
 * Missing or undecodable files are treated as silence: `play()` resolves to
 * null after a single warning. Phase 6 wires real cues without changing callers.
 */

import { clamp } from '../core/math.js';

export const AUDIO_BUSES = Object.freeze(['master', 'music', 'sfx']);

const DEFAULT_VOLUMES = Object.freeze({ master: 0.8, music: 0.6, sfx: 0.8 });

function assertBus(bus) {
  if (!AUDIO_BUSES.includes(bus)) {
    throw new Error(`Unknown audio bus "${bus}". Use one of: ${AUDIO_BUSES.join(', ')}`);
  }
}

export class AudioSystem {
  /**
   * @param {object} assetManifest - the shared asset manifest module/object
   */
  constructor(assetManifest, { volumes = {}, muted = false } = {}) {
    if (!assetManifest || typeof assetManifest.load !== 'function') {
      throw new Error('AudioSystem requires the asset manifest module.');
    }

    this.assets = assetManifest;
    this.volumes = {
      master: clamp(volumes.master ?? DEFAULT_VOLUMES.master, 0, 1),
      music: clamp(volumes.music ?? DEFAULT_VOLUMES.music, 0, 1),
      sfx: clamp(volumes.sfx ?? DEFAULT_VOLUMES.sfx, 0, 1),
    };
    this.muted = Boolean(muted);

    this.context = null;
    this.nodes = null;
    this.currentMusicId = null;
    this.currentMusic = null;

    this._decoded = new Map();
    this._decodePromises = new Map();
    this._failed = new Set();
    this._active = new Set();
    this._warned = new Set();

    this._gestureTarget = null;
    this._gestureHandler = null;
    this._gestureTypes = ['pointerdown', 'keydown'];
  }

  /** Create the audio graph. Safe to call repeatedly. */
  init() {
    if (this.context) return this.context;

    const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextClass) {
      this._warnOnce('no-webaudio', 'Web Audio is unavailable — running silent.');
      return null;
    }

    try {
      const context = new AudioContextClass();
      const master = context.createGain();
      const music = context.createGain();
      const sfx = context.createGain();

      music.connect(master);
      sfx.connect(master);
      master.connect(context.destination);

      this.context = context;
      this.nodes = { master, music, sfx };
      this._applyMix(true);
      return context;
    } catch (error) {
      this._warnOnce(
        'init-failed',
        `Could not create the audio graph (${error instanceof Error ? error.message : error}) — running silent.`,
      );
      return null;
    }
  }

  /** Resume after a user gesture. Never throws. */
  async unlock() {
    const context = this.init();
    if (!context) return false;

    try {
      if (context.state === 'suspended') await context.resume();
    } catch {
      // Browser may still refuse; the next gesture can try again.
    }

    if (context.state === 'running') {
      this._removeGestureListeners();
      return true;
    }
    return false;
  }

  /** Attach one-shot gesture listeners that unlock audio on first input. */
  attachUnlock(target = globalThis) {
    if (!target?.addEventListener || this._gestureHandler) return;
    this._gestureTarget = target;
    this._gestureHandler = () => {
      void this.unlock();
    };

    for (const type of this._gestureTypes) {
      target.addEventListener(type, this._gestureHandler, {
        capture: true,
        once: true,
        passive: type === 'pointerdown',
      });
    }
  }

  setBusVolume(bus, value) {
    assertBus(bus);
    this.volumes[bus] = clamp(Number(value) || 0, 0, 1);
    this._applyMix();
  }

  getBusVolume(bus) {
    assertBus(bus);
    return this.volumes[bus];
  }

  setVolume(value) {
    this.setBusVolume('master', value);
  }

  mute() {
    this.muted = true;
    this._applyMix();
  }

  unmute() {
    this.muted = false;
    this._applyMix();
  }

  /** @returns {boolean} new muted state */
  toggleMute() {
    this.muted = !this.muted;
    this._applyMix();
    return this.muted;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this._applyMix();
  }

  /**
   * Play any audio asset through a bus.
   * @returns {Promise<null | {id:string, source:AudioBufferSourceNode, gain:GainNode, duration:number, stop:(fade?:number)=>void}>}
   */
  async play(
    id,
    { bus = 'sfx', loop = false, volume = 1, rate = 1, fadeIn = 0 } = {},
  ) {
    assertBus(bus);

    const buffer = await this._loadBuffer(id);
    if (!buffer) return null;

    const context = this.context;
    if (!context) return null;

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = clamp(Number(rate) || 1, 0.25, 4);

    const level = clamp(Number(volume) || 0, 0, 1);
    const now = context.currentTime;
    if (fadeIn > 0) {
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(level, now + fadeIn);
    } else {
      gain.gain.setValueAtTime(level, now);
    }

    source.connect(gain);
    gain.connect(this.nodes[bus]);

    let stopped = false;
    const handle = {
      id,
      source,
      gain,
      duration: buffer.duration,
      stop: (fade = 0.05) => {
        if (stopped) return;
        stopped = true;
        const fadeSeconds = Math.max(0, fade);
        const start = context.currentTime;
        try {
          gain.gain.cancelScheduledValues(start);
          gain.gain.setValueAtTime(gain.gain.value, start);
          gain.gain.linearRampToValueAtTime(0.0001, start + fadeSeconds);
          source.stop(start + fadeSeconds + 0.01);
        } catch {
          // Already stopped or context closed.
        }
        this._active.delete(handle);
      },
    };

    source.addEventListener('ended', () => {
      this._active.delete(handle);
      if (this.currentMusic === handle) {
        this.currentMusic = null;
        this.currentMusicId = null;
      }
      try {
        gain.disconnect();
      } catch {
        // Already disconnected.
      }
    });

    // A suspended context accepts scheduling; resume opportunistically.
    if (context.state === 'suspended') {
      context.resume().catch(() => {});
    }

    source.start();
    this._active.add(handle);
    return handle;
  }

  playSfx(id, options = {}) {
    return this.play(id, { ...options, bus: 'sfx' });
  }

  /** Replace the current music loop. Missing files simply leave silence. */
  async playMusic(id, { volume = 1, fadeIn = 0.4, loop = true, rate = 1 } = {}) {
    this.stopMusic();
    const handle = await this.play(id, { bus: 'music', volume, fadeIn, loop, rate });
    if (handle) {
      this.currentMusicId = id;
      this.currentMusic = handle;
    }
    return handle;
  }

  stopMusic(fade = 0.3) {
    if (this.currentMusic) {
      this.currentMusic.stop(fade);
      this.currentMusic = null;
    }
    this.currentMusicId = null;
  }

  stopAll(fade = 0.05) {
    for (const handle of [...this._active]) handle.stop(fade);
    this.currentMusic = null;
    this.currentMusicId = null;
  }

  getState() {
    return {
      context: this.context ? this.context.state : 'uninitialized',
      supported: Boolean(globalThis.AudioContext ?? globalThis.webkitAudioContext),
      muted: this.muted,
      volumes: { ...this.volumes },
      buses: [...AUDIO_BUSES],
      currentMusic: this.currentMusicId,
      activeVoices: this._active.size,
      decoded: this._decoded.size,
      failed: [...this._failed],
    };
  }

  destroy() {
    this.stopAll(0);
    this._removeGestureListeners();
    this._decoded.clear();
    this._decodePromises.clear();
    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
      this.nodes = null;
    }
  }

  async _loadBuffer(id) {
    if (this._decoded.has(id)) return this._decoded.get(id);
    if (this._failed.has(id)) return null;
    if (this._decodePromises.has(id)) return this._decodePromises.get(id);

    const entry = this.assets.tryGetEntry?.(id) ?? null;
    if (!entry) {
      this._warnOnce(`unknown:${id}`, `Unknown audio asset "${id}" — staying silent.`);
      return null;
    }
    if (entry.type !== 'audio') {
      this._warnOnce(
        `not-audio:${id}`,
        `Asset "${id}" is a ${entry.type}, not audio — staying silent.`,
      );
      return null;
    }

    const context = this.init();
    if (!context) return null;

    const promise = (async () => {
      const data = await this.assets.load(id);
      if (!data) {
        this._failed.add(id);
        return null;
      }

      try {
        // decodeAudioData detaches its input in some browsers; keep the cache intact.
        const buffer = await context.decodeAudioData(data.slice(0));
        this._decoded.set(id, buffer);
        return buffer;
      } catch (error) {
        this._failed.add(id);
        this._warnOnce(
          `decode:${id}`,
          `Could not decode "${id}" (${error instanceof Error ? error.message : error}) — staying silent.`,
        );
        return null;
      }
    })();

    this._decodePromises.set(id, promise);
    try {
      return await promise;
    } finally {
      this._decodePromises.delete(id);
    }
  }

  _applyMix(immediate = false) {
    if (!this.context || !this.nodes) return;
    const now = this.context.currentTime;
    for (const bus of AUDIO_BUSES) {
      const target = this.muted ? 0 : this.volumes[bus];
      const gain = this.nodes[bus].gain;
      if (immediate) {
        gain.setValueAtTime(target, now);
      } else {
        gain.setTargetAtTime(target, now, 0.02);
      }
    }
  }

  _removeGestureListeners() {
    if (!this._gestureTarget || !this._gestureHandler) return;
    for (const type of this._gestureTypes) {
      this._gestureTarget.removeEventListener(type, this._gestureHandler, { capture: true });
    }
    this._gestureTarget = null;
    this._gestureHandler = null;
  }

  _warnOnce(key, message) {
    if (this._warned.has(key)) return;
    this._warned.add(key);
    console.warn(`[WANT audio] ${message}`);
  }
}
