// Production audio engine backed by WANT's supplied WAV library in /MUSIC/
// (prepared into /assets/audio/*.wav by scripts/prepare-assets.mjs).
//
// Architecture:
// - Separate Web Audio buses: master -> (musicBus, ambienceBus, effectsBus)
// - Smooth crossfades between music themes and ambient soundscapes via HTMLAudioElement
//   routed through Web Audio GainNodes (instant start, zero 5MB decode stall).
// - Decoded AudioBuffer pool for crisp, low-latency, pitch-varied sound effects,
//   with procedural Web Audio synthesis as a silent-proof fallback if any sample fails.
// - Never produces sound until unlock() runs from a real user gesture.

export const soundCues = [
  'ui-confirm',
  'phone-end',
  'phone-vibration',
  'wallet-drop',
  'bracelet-drop',
  'metal-drop',
  'power-cut',
  'machine-shriek',
  'gunshot',
  'scout-windup',
  'rusher-windup',
  'dodge',
  'counter-ready',
  'counter-impact',
  'k-hit',
  'machine-hit',
  'machine-disabled',
  'muffled-blast',
  'lane-crash',
  'radio-connect',
  'radio-connect-alt',
  'wind',
  'machinery',
  'gate-open',
  'resolve',
  'failure',
  'step-campus',
  'step-interior',
  'step-debris',
] as const;

export type CueName = typeof soundCues[number];

export type MusicTrack =
  | 'campus'
  | 'future'
  | 'rescue'
  | 'ending'
  | 'tense'
  | 'resolve';

export type AmbienceTrack =
  | 'campus'
  | 'dorm'
  | 'clinic-camp'
  | 'ruined-city';

export const MUSIC_FILES: Record<MusicTrack, string> = {
  campus: '/assets/audio/music-campus.wav',
  future: '/assets/audio/music-future.wav',
  rescue: '/assets/audio/music-rescue.wav',
  ending: '/assets/audio/music-ending.wav',
  // Backwards-compatible aliases used by Phase 4 cutscene code:
  tense: '/assets/audio/music-future.wav',
  resolve: '/assets/audio/music-ending.wav',
};

export const AMBIENCE_FILES: Record<AmbienceTrack, string> = {
  campus: '/assets/audio/amb-campus.wav',
  dorm: '/assets/audio/amb-dorm.wav',
  'clinic-camp': '/assets/audio/amb-clinic-camp.wav',
  'ruined-city': '/assets/audio/amb-ruined-city.wav',
};

export const SFX_FILES: Partial<Record<CueName, string>> = {
  'ui-confirm': '/assets/audio/ui-confirm.wav',
  'phone-end': '/assets/audio/phone-vibration.wav',
  'phone-vibration': '/assets/audio/phone-vibration.wav',
  'wallet-drop': '/assets/audio/wallet-drop.wav',
  'bracelet-drop': '/assets/audio/bracelet-drop.wav',
  'metal-drop': '/assets/audio/bracelet-drop.wav',
  'power-cut': '/assets/audio/power-cut-impact.wav',
  'machine-shriek': '/assets/audio/machine-shriek.wav',
  gunshot: '/assets/audio/pistol-shot.wav',
  'scout-windup': '/assets/audio/scout-windup.wav',
  'rusher-windup': '/assets/audio/rusher-windup.wav',
  dodge: '/assets/audio/dodge.wav',
  'counter-ready': '/assets/audio/counter-ready.wav',
  'counter-impact': '/assets/audio/counter-impact.wav',
  'k-hit': '/assets/audio/k-hit.wav',
  'machine-hit': '/assets/audio/machine-hit.wav',
  'machine-disabled': '/assets/audio/machine-disabled.wav',
  'muffled-blast': '/assets/audio/breach-blast.wav',
  'lane-crash': '/assets/audio/lane-crash.wav',
  'radio-connect': '/assets/audio/radio-connect.wav',
  'radio-connect-alt': '/assets/audio/radio-connect-alt.wav',
  'gate-open': '/assets/audio/gate-open.wav',
  resolve: '/assets/audio/resolve-restored.wav',
  failure: '/assets/audio/failure.wav',
  'step-campus': '/assets/audio/step-campus.wav',
  'step-interior': '/assets/audio/step-interior.wav',
  'step-debris': '/assets/audio/step-debris.wav',
};

interface AudioSettings {
  master: number;
  music: number;
  effects: number;
  muted: boolean;
}

interface StreamLayer {
  key: string;
  el: HTMLAudioElement;
  gain: GainNode | null;
  targetGain: number;
}

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const CUE_GAIN: Partial<Record<CueName, number>> = {
  'step-campus': 0.34,
  'step-interior': 0.32,
  'step-debris': 0.36,
  'ui-confirm': 0.55,
  gunshot: 0.68,
  'machine-hit': 0.62,
  'scout-windup': 0.55,
  'rusher-windup': 0.6,
  dodge: 0.72,
  'counter-ready': 0.85,
  'counter-impact': 0.9,
  'k-hit': 0.85,
  'machine-disabled': 0.78,
  'lane-crash': 0.82,
  'muffled-blast': 0.8,
  'gate-open': 0.8,
  resolve: 0.82,
  failure: 0.85,
};

const PITCH_VARIED_CUES = new Set<CueName>([
  'gunshot',
  'machine-hit',
  'step-campus',
  'step-interior',
  'step-debris',
  'dodge',
]);

class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private ambienceBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  private activeMusic: StreamLayer | null = null;
  private activeAmbience: StreamLayer | null = null;
  private requestedMusic: MusicTrack | null = null;
  private requestedAmbience: AmbienceTrack | null = null;
  private musicPlaybackRate = 1;

  private sfxCache = new Map<string, AudioBuffer>();
  private sfxPending = new Map<string, Promise<AudioBuffer | null>>();
  private lastCueTime = new Map<CueName, number>();

  private settings: AudioSettings = { master: 0.7, music: 0.55, effects: 0.75, muted: false };
  private failed = false;

  /** False when this browser has no usable Web Audio implementation. */
  get available(): boolean { return !this.failed; }

  /** True once a user gesture has unlocked the audio engine. */
  get unlocked(): boolean { return this.context !== null; }

  get muted(): boolean { return this.settings.muted; }

  get currentMusic(): MusicTrack | null { return this.requestedMusic; }

  get currentAmbience(): AmbienceTrack | null { return this.requestedAmbience; }

  /** Apply persisted volumes before or after the context exists. */
  configure(next: Partial<AudioSettings>): void {
    this.settings = {
      master: next.master === undefined ? this.settings.master : clamp01(next.master),
      music: next.music === undefined ? this.settings.music : clamp01(next.music),
      effects: next.effects === undefined ? this.settings.effects : clamp01(next.effects),
      muted: next.muted === undefined ? this.settings.muted : next.muted,
    };
    this.applyLevels();
  }

  /** Call from a click or keydown handler. Safe to call repeatedly. */
  unlock(): void {
    if (this.failed || typeof window === 'undefined') return;
    try {
      const context = this.ensureContext();
      if (context.state === 'suspended') {
        void context.resume().catch(() => { /* stay silent until the next gesture */ });
      }
      if (this.requestedMusic && (!this.activeMusic || this.activeMusic.key !== MUSIC_FILES[this.requestedMusic])) {
        this.startStreamLayer('music', MUSIC_FILES[this.requestedMusic], 0.78, this.musicPlaybackRate);
      }
      if (this.requestedAmbience && (!this.activeAmbience || this.activeAmbience.key !== AMBIENCE_FILES[this.requestedAmbience])) {
        this.startStreamLayer('ambience', AMBIENCE_FILES[this.requestedAmbience], 0.42, 1);
      }
      // Pre-warm the most frequent SFX silently in the background.
      this.preloadCommonCues();
    } catch {
      this.failed = true;
    }
  }

  /** Smoothly crossfade to the requested music track (or silence when null). */
  setMusic(track: MusicTrack | null, playbackRate = 1): void {
    const rate = Math.min(1.25, Math.max(0.75, playbackRate));
    this.musicPlaybackRate = rate;
    const prevFile = this.requestedMusic ? MUSIC_FILES[this.requestedMusic] : null;
    const nextFile = track ? MUSIC_FILES[track] : null;
    this.requestedMusic = track;

    if (prevFile === nextFile && this.activeMusic) {
      this.activeMusic.el.playbackRate = rate;
      return;
    }
    this.fadeOutLayer(this.activeMusic, 0.75);
    this.activeMusic = null;
    if (nextFile && this.context) {
      this.startStreamLayer('music', nextFile, 0.78, rate);
    }
  }

  /** Smoothly crossfade the background ambience bed (or silence when null). */
  setAmbience(track: AmbienceTrack | null): void {
    const prevFile = this.requestedAmbience ? AMBIENCE_FILES[this.requestedAmbience] : null;
    const nextFile = track ? AMBIENCE_FILES[track] : null;
    this.requestedAmbience = track;

    if (prevFile === nextFile && this.activeAmbience) return;
    this.fadeOutLayer(this.activeAmbience, 0.9);
    this.activeAmbience = null;
    if (nextFile && this.context) {
      this.startStreamLayer('ambience', nextFile, 0.42, 1);
    }
  }

  /** Convenience helper to update both music and ambience for a scene/room. */
  setSceneAudio(music: MusicTrack | null, ambience: AmbienceTrack | null, playbackRate = 1): void {
    this.setMusic(music, playbackRate);
    this.setAmbience(ambience);
  }

  /** Play a sound effect from the WAV library (with synth fallback). */
  playCue(name: CueName): void {
    const context = this.context;
    if (!context || !this.effectsBus || this.settings.muted || context.state === 'closed') return;
    if (context.state === 'suspended') {
      void context.resume().catch(() => { /* skipped until gesture */ });
    }

    // Throttle identical rapid-fire cues slightly (e.g., 5 simultaneous enemy hits on 1 frame)
    const nowMs = performance.now();
    const minGap = name.startsWith('step-') ? 110 : name === 'machine-hit' ? 35 : 22;
    const prevMs = this.lastCueTime.get(name) ?? 0;
    if (nowMs - prevMs < minGap) return;
    this.lastCueTime.set(name, nowMs);

    const file = SFX_FILES[name];
    if (file) {
      const cached = this.sfxCache.get(file);
      if (cached) {
        this.playBuffer(cached, name);
        return;
      }
      // Kick off fetch + decode and play once ready; meanwhile do not spam double cues.
      void this.loadBuffer(file).then((buffer) => {
        if (buffer) {
          this.playBuffer(buffer, name);
        } else {
          this.playSynthFallback(name);
        }
      });
      return;
    }

    this.playSynthFallback(name);
  }

  // ---------------- graph & layers ----------------

  private ensureContext(): AudioContext {
    if (this.context) return this.context;
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio is unavailable');
    const context = new Ctor();
    const master = context.createGain();
    const musicBus = context.createGain();
    const ambienceBus = context.createGain();
    const effectsBus = context.createGain();
    master.connect(context.destination);
    musicBus.connect(master);
    ambienceBus.connect(master);
    effectsBus.connect(master);
    this.context = context;
    this.master = master;
    this.musicBus = musicBus;
    this.ambienceBus = ambienceBus;
    this.effectsBus = effectsBus;
    this.noise = this.createNoise(context);
    this.applyLevels();
    return context;
  }

  private createNoise(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 2), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private applyLevels(): void {
    const context = this.context;
    const masterLevel = this.settings.muted ? 0 : this.settings.master;
    if (context && this.master && this.musicBus && this.ambienceBus && this.effectsBus) {
      const now = context.currentTime;
      this.master.gain.setTargetAtTime(masterLevel, now, 0.025);
      this.musicBus.gain.setTargetAtTime(this.settings.music, now, 0.025);
      this.ambienceBus.gain.setTargetAtTime(this.settings.music * 0.72, now, 0.025);
      this.effectsBus.gain.setTargetAtTime(this.settings.effects, now, 0.025);
    }
    // Keep any non-WebAudio fallback elements synced as well.
    if (this.activeMusic && !this.activeMusic.gain) {
      this.activeMusic.el.volume = clamp01(masterLevel * this.settings.music * this.activeMusic.targetGain);
    }
    if (this.activeAmbience && !this.activeAmbience.gain) {
      this.activeAmbience.el.volume = clamp01(masterLevel * this.settings.music * 0.72 * this.activeAmbience.targetGain);
    }
  }

  private startStreamLayer(kind: 'music' | 'ambience', src: string, targetGain: number, playbackRate: number): void {
    const context = this.context;
    const bus = kind === 'music' ? this.musicBus : this.ambienceBus;
    if (!context || !bus || typeof Audio === 'undefined') return;

    const el = new Audio(src);
    el.loop = true;
    el.preload = 'auto';
    el.playbackRate = playbackRate;

    let gain: GainNode | null = null;
    try {
      const source = context.createMediaElementSource(el);
      gain = context.createGain();
      const now = context.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.9);
      source.connect(gain).connect(bus);
    } catch {
      const masterLevel = this.settings.muted ? 0 : this.settings.master;
      el.volume = clamp01(masterLevel * this.settings.music * (kind === 'ambience' ? 0.72 : 1) * targetGain);
    }

    const layer: StreamLayer = { key: src, el, gain, targetGain };
    if (kind === 'music') this.activeMusic = layer;
    else this.activeAmbience = layer;

    const p = el.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => { /* autoplay blocked until next interaction */ });
    }
  }

  private fadeOutLayer(layer: StreamLayer | null, durationSec: number): void {
    if (!layer) return;
    const context = this.context;
    if (layer.gain && context) {
      const now = context.currentTime;
      layer.gain.gain.cancelScheduledValues(now);
      layer.gain.gain.setValueAtTime(Math.max(layer.gain.gain.value, 0.0001), now);
      layer.gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
      window.setTimeout(() => {
        try {
          layer.el.pause();
          layer.el.currentTime = 0;
          layer.el.src = '';
        } catch { /* ignore teardown errors */ }
      }, Math.round(durationSec * 1000) + 80);
    } else {
      try {
        layer.el.pause();
        layer.el.src = '';
      } catch { /* ignore */ }
    }
  }

  private preloadCommonCues(): void {
    const common: CueName[] = [
      'ui-confirm',
      'gunshot',
      'dodge',
      'counter-ready',
      'counter-impact',
      'k-hit',
      'machine-hit',
      'machine-disabled',
      'step-campus',
      'step-interior',
      'step-debris',
    ];
    for (const cue of common) {
      const file = SFX_FILES[cue];
      if (file && !this.sfxCache.has(file) && !this.sfxPending.has(file)) {
        void this.loadBuffer(file);
      }
    }
  }

  private loadBuffer(url: string): Promise<AudioBuffer | null> {
    const existing = this.sfxPending.get(url);
    if (existing) return existing;
    const context = this.context;
    if (!context || typeof fetch === 'undefined') return Promise.resolve(null);

    const promise = fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((arr) => (arr ? context.decodeAudioData(arr) : null))
      .then((decoded) => {
        if (decoded) this.sfxCache.set(url, decoded);
        return decoded;
      })
      .catch(() => null);

    this.sfxPending.set(url, promise);
    return promise;
  }

  private playBuffer(buffer: AudioBuffer, name: CueName): void {
    const context = this.context;
    const bus = this.effectsBus;
    if (!context || !bus || this.settings.muted || context.state === 'closed') return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    if (PITCH_VARIED_CUES.has(name)) {
      source.playbackRate.value = 0.94 + Math.random() * 0.12;
    }
    gain.gain.value = CUE_GAIN[name] ?? 0.72;
    source.connect(gain).connect(bus);
    source.start();
  }

  // ---------------- synth fallback ----------------

  private playSynthFallback(name: CueName): void {
    switch (name) {
      case 'ui-confirm':
        this.tone({ type: 'triangle', from: 520, to: 700, dur: 0.09, gain: 0.05 });
        break;
      case 'phone-end':
      case 'phone-vibration':
        this.tone({ type: 'sine', from: 660, dur: 0.08, gain: 0.04 });
        this.tone({ type: 'sine', from: 440, dur: 0.1, gain: 0.035, delay: 0.1 });
        break;
      case 'metal-drop':
      case 'bracelet-drop':
      case 'wallet-drop':
        this.noiseBurst({ dur: 0.09, gain: 0.05, type: 'highpass', freq: 2600 });
        this.tone({ type: 'triangle', from: 2400, to: 1200, dur: 0.16, gain: 0.025, delay: 0.01 });
        break;
      case 'power-cut':
        this.tone({ type: 'sine', from: 130, to: 38, dur: 0.55, gain: 0.09 });
        this.noiseBurst({ dur: 0.3, gain: 0.03, type: 'lowpass', freq: 420 });
        break;
      case 'machine-shriek':
        this.tone({ type: 'sawtooth', from: 880, to: 170, dur: 0.65, gain: 0.03 });
        this.noiseBurst({ dur: 0.6, gain: 0.035, type: 'bandpass', freq: 1700, q: 1.4 });
        break;
      case 'gunshot':
        this.noiseBurst({ dur: 0.14, gain: 0.1, type: 'lowpass', freq: 2400 });
        this.tone({ type: 'sine', from: 95, to: 40, dur: 0.16, gain: 0.05 });
        break;
      case 'muffled-blast':
      case 'lane-crash':
      case 'k-hit':
        this.noiseBurst({ dur: 0.45, gain: 0.1, type: 'lowpass', freq: 320 });
        this.tone({ type: 'sine', from: 62, to: 30, dur: 0.45, gain: 0.07 });
        break;
      case 'wind':
        this.noiseBurst({ dur: 1.5, gain: 0.03, type: 'bandpass', freq: 480, q: 0.6, attack: 0.5 });
        break;
      case 'machinery':
        this.tone({ type: 'sawtooth', from: 54, dur: 1.1, gain: 0.022, attack: 0.2 });
        this.tone({ type: 'sawtooth', from: 81, dur: 1.1, gain: 0.014, attack: 0.2, delay: 0.04 });
        break;
      case 'gate-open':
        this.noiseBurst({ dur: 0.45, gain: 0.05, type: 'bandpass', freq: 1200, q: 1.1 });
        this.tone({ type: 'square', from: 190, to: 92, dur: 0.4, gain: 0.025 });
        break;
      case 'resolve':
      case 'counter-ready':
      case 'counter-impact':
        this.tone({ type: 'sine', from: 330, dur: 0.5, gain: 0.04, attack: 0.04 });
        this.tone({ type: 'sine', from: 440, dur: 0.6, gain: 0.035, attack: 0.04, delay: 0.12 });
        break;
      case 'failure':
        this.tone({ type: 'triangle', from: 220, to: 98, dur: 0.7, gain: 0.06 });
        break;
      default:
        break;
    }
  }

  private tone(options: {
    type: OscillatorType;
    from: number;
    to?: number;
    dur: number;
    gain: number;
    delay?: number;
    attack?: number;
  }): void {
    const context = this.context;
    const bus = this.effectsBus;
    if (!context || !bus) return;
    const start = context.currentTime + (options.delay ?? 0);
    const attack = options.attack ?? 0.012;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = options.type;
    osc.frequency.setValueAtTime(options.from, start);
    if (options.to !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(options.to, 1), start + options.dur);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(options.gain, 0.0002), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.dur);
    osc.connect(gain).connect(bus);
    osc.start(start);
    osc.stop(start + options.dur + 0.03);
  }

  private noiseBurst(options: {
    dur: number;
    gain: number;
    type: BiquadFilterType;
    freq: number;
    q?: number;
    delay?: number;
    attack?: number;
  }): void {
    const context = this.context;
    const bus = this.effectsBus;
    const noise = this.noise;
    if (!context || !bus || !noise) return;
    const start = context.currentTime + (options.delay ?? 0);
    const attack = options.attack ?? 0.008;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noise;
    source.loop = true;
    filter.type = options.type;
    filter.frequency.setValueAtTime(options.freq, start);
    filter.Q.value = options.q ?? 0.9;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(options.gain, 0.0002), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.dur);
    source.connect(filter).connect(gain).connect(bus);
    source.start(start);
    source.stop(start + options.dur + 0.03);
  }
}

export const audio = new AudioEngine();