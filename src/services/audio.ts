// Phase 4 audio: one small Web Audio graph for music and effects.
//
// There are no supplied audio files in the repository yet. Every cue below is
// synthesized at runtime, so the credits ledger records WANT code as the source
// and there are no third-party samples to license. Keep the cues short and quiet:
// the defaults are deliberately low, and nothing is created until unlock() runs
// from a real user gesture.

export const soundCues = [
  'ui-confirm',
  'phone-end',
  'metal-drop',
  'power-cut',
  'machine-shriek',
  'gunshot',
  'muffled-blast',
  'wind',
  'machinery',
  'gate-open',
  'resolve',
] as const;

export type CueName = typeof soundCues[number];
export type MusicTrack = 'tense' | 'resolve';

interface AudioSettings {
  master: number;
  music: number;
  effects: number;
  muted: boolean;
}

interface MusicVoice {
  nodes: OscillatorNode[];
  gain: GainNode;
}

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private music: MusicVoice | null = null;
  private requestedMusic: MusicTrack | null = null;
  private settings: AudioSettings = { master: 0.7, music: 0.5, effects: 0.7, muted: false };
  private failed = false;

  /** False when this browser has no usable Web Audio implementation. */
  get available(): boolean { return !this.failed; }

  /** True once a user gesture has created the audio graph. */
  get unlocked(): boolean { return this.context !== null; }

  get muted(): boolean { return this.settings.muted; }

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
    if (this.failed) return;
    try {
      const context = this.ensureContext();
      if (context.state === 'suspended') {
        void context.resume().catch(() => { /* stay silent until the next gesture */ });
      }
      if (this.requestedMusic) this.startMusic(this.requestedMusic);
    } catch {
      this.failed = true;
    }
  }

  setMusic(track: MusicTrack | null): void {
    if (track === this.requestedMusic) return;
    this.requestedMusic = track;
    this.stopMusic();
    if (track && this.context) this.startMusic(track);
  }

  playCue(name: CueName): void {
    const context = this.context;
    if (!context || !this.effectsBus || this.settings.muted || context.state === 'closed') return;
    if (context.state === 'suspended') {
      void context.resume().catch(() => { /* the cue is skipped rather than queued */ });
    }
    switch (name) {
      case 'ui-confirm':
        this.tone({ type: 'triangle', from: 520, to: 700, dur: 0.09, gain: 0.05 });
        break;
      case 'phone-end':
        this.tone({ type: 'sine', from: 660, dur: 0.08, gain: 0.04 });
        this.tone({ type: 'sine', from: 440, dur: 0.1, gain: 0.035, delay: 0.1 });
        break;
      case 'metal-drop':
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
        this.noiseBurst({ dur: 0.16, gain: 0.12, type: 'lowpass', freq: 2400 });
        this.tone({ type: 'sine', from: 95, to: 40, dur: 0.18, gain: 0.06 });
        break;
      case 'muffled-blast':
        this.noiseBurst({ dur: 0.6, gain: 0.12, type: 'lowpass', freq: 300 });
        this.tone({ type: 'sine', from: 62, to: 30, dur: 0.6, gain: 0.08 });
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
        this.tone({ type: 'sine', from: 330, dur: 1.1, gain: 0.035, attack: 0.08 });
        this.tone({ type: 'sine', from: 440, dur: 1.2, gain: 0.03, attack: 0.08, delay: 0.22 });
        break;
      default:
        break;
    }
  }

  // ---------------- graph ----------------

  private ensureContext(): AudioContext {
    if (this.context) return this.context;
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio is unavailable');
    const context = new Ctor();
    const master = context.createGain();
    const musicBus = context.createGain();
    const effectsBus = context.createGain();
    master.connect(context.destination);
    musicBus.connect(master);
    effectsBus.connect(master);
    this.context = context;
    this.master = master;
    this.musicBus = musicBus;
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
    if (!context || !this.master || !this.musicBus || !this.effectsBus) return;
    const now = context.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.master, now, 0.02);
    this.musicBus.gain.setTargetAtTime(this.settings.music, now, 0.02);
    this.effectsBus.gain.setTargetAtTime(this.settings.effects, now, 0.02);
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

  private startMusic(track: MusicTrack): void {
    const context = this.context;
    const bus = this.musicBus;
    if (!context || !bus || this.music) return;
    const tense = track === 'tense';
    const frequencies = tense ? [55, 82.41] : [110, 164.81];
    const now = context.currentTime;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(tense ? 240 : 900, now);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(tense ? 0.05 : 0.04, now + 1.4);
    filter.connect(gain).connect(bus);
    const nodes = frequencies.map((frequency, index) => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);
      osc.detune.setValueAtTime(index === 0 ? -4 : 4, now);
      osc.connect(filter);
      osc.start(now);
      return osc;
    });
    this.music = { nodes, gain };
  }

  private stopMusic(): void {
    const voice = this.music;
    const context = this.context;
    this.music = null;
    if (!voice || !context) return;
    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    for (const node of voice.nodes) {
      try { node.stop(now + 0.35); } catch { /* already stopped */ }
    }
  }
}

export const audio = new AudioEngine();