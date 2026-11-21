// Phase 4 settings panel: master/music/effects volume, mute, and reduced
// motion. Preferences load from localStorage on first open and save on every
// change. Nothing is audible until audio.unlock() runs from a user gesture.

import type { Preferences } from '../services/preferences';
import {
  loadPreferences,
  savePreferences,
  systemReducedMotion,
  DEFAULT_PREFERENCES,
} from '../services/preferences';
import { audio } from '../services/audio';

interface SettingsPanelOptions {
  preferences: Preferences;
  onChange: (preferences: Preferences) => void;
  onClose: () => void;
}

let dialog: HTMLDialogElement | null = null;
let masterInput: HTMLInputElement | null = null;
let musicInput: HTMLInputElement | null = null;
let effectsInput: HTMLInputElement | null = null;
let muteInput: HTMLInputElement | null = null;
let reducedMotionInput: HTMLInputElement | null = null;
let masterValueEl: HTMLElement | null = null;
let musicValueEl: HTMLElement | null = null;
let effectsValueEl: HTMLElement | null = null;

let current: Preferences = { ...DEFAULT_PREFERENCES };
let activeOnChange: ((preferences: Preferences) => void) | null = null;
let activeOnClose: (() => void) | null = null;
let listenersWired = false;

function ensureDialog(): HTMLDialogElement {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'settings';
  dialog.setAttribute('aria-labelledby', 'settings-title');
  dialog.innerHTML = `
    <form method="dialog">
      <h2 id="settings-title">Settings &amp; accessibility</h2>
      <p class="settings-note">Sound starts after your first interaction. Volumes persist on this device.</p>
      <div class="settings-row">
        <label for="settings-master">Master volume <span id="settings-master-value" class="num">70%</span></label>
        <input type="range" min="0" max="100" value="70" id="settings-master" />
      </div>
      <div class="settings-row">
        <label for="settings-music">Music &amp; ambience <span id="settings-music-value" class="num">50%</span></label>
        <input type="range" min="0" max="100" value="50" id="settings-music" />
      </div>
      <div class="settings-row">
        <label for="settings-effects">Effects <span id="settings-effects-value" class="num">70%</span></label>
        <input type="range" min="0" max="100" value="70" id="settings-effects" />
      </div>
      <div class="settings-row">
        <label><input type="checkbox" id="settings-muted" /> Mute all sound</label>
      </div>
      <div class="settings-row">
        <label><input type="checkbox" id="settings-reduced-motion" /> Reduced motion (no camera pan or shake)</label>
      </div>
      <p class="settings-hint">Your system reduced-motion setting is ${systemReducedMotion() ? 'on' : 'off'}.</p>
      <div class="settings-actions">
        <button class="secondary" type="button" id="settings-close">Close</button>
        <button class="primary" type="submit">Done</button>
      </div>
    </form>
  `;
  document.body.appendChild(dialog);
  return dialog;
}

function refs(): void {
  masterInput = document.getElementById('settings-master') as HTMLInputElement | null;
  musicInput = document.getElementById('settings-music') as HTMLInputElement | null;
  effectsInput = document.getElementById('settings-effects') as HTMLInputElement | null;
  muteInput = document.getElementById('settings-muted') as HTMLInputElement | null;
  reducedMotionInput = document.getElementById('settings-reduced-motion') as HTMLInputElement | null;
  masterValueEl = document.getElementById('settings-master-value') as HTMLElement | null;
  musicValueEl = document.getElementById('settings-music-value') as HTMLElement | null;
  effectsValueEl = document.getElementById('settings-effects-value') as HTMLElement | null;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function applyPreferences(prefs: Preferences, save: boolean): void {
  current = prefs;
  if (masterInput) masterInput.value = String(Math.round(prefs.master * 100));
  if (musicInput) musicInput.value = String(Math.round(prefs.music * 100));
  if (effectsInput) effectsInput.value = String(Math.round(prefs.effects * 100));
  if (muteInput) muteInput.checked = prefs.muted;
  if (reducedMotionInput) reducedMotionInput.checked = prefs.reducedMotion === 'reduce';
  if (masterValueEl) masterValueEl.textContent = percent(prefs.master);
  if (musicValueEl) musicValueEl.textContent = percent(prefs.music);
  if (effectsValueEl) effectsValueEl.textContent = percent(prefs.effects);
  audio.configure({
    master: prefs.master,
    music: prefs.music,
    effects: prefs.effects,
    muted: prefs.muted,
  });
  if (save) {
    savePreferences(prefs);
  }
}

function readForm(): Preferences {
  return {
    ...current,
    version: 1,
    master: masterInput ? Number(masterInput.value) / 100 : current.master,
    music: musicInput ? Number(musicInput.value) / 100 : current.music,
    effects: effectsInput ? Number(effectsInput.value) / 100 : current.effects,
    muted: muteInput ? muteInput.checked : current.muted,
    reducedMotion: reducedMotionInput && reducedMotionInput.checked ? 'reduce' : 'auto',
  };
}

function wireEventsOnce(el: HTMLDialogElement): void {
  if (listenersWired || !masterInput || !musicInput || !effectsInput || !muteInput || !reducedMotionInput) return;
  listenersWired = true;

  const update = () => {
    const next = readForm();
    applyPreferences(next, true);
    activeOnChange?.(next);
  };
  masterInput.addEventListener('input', () => {
    if (masterValueEl) masterValueEl.textContent = percent(Number(masterInput!.value) / 100);
    update();
  });
  musicInput.addEventListener('input', () => {
    if (musicValueEl) musicValueEl.textContent = percent(Number(musicInput!.value) / 100);
    update();
  });
  effectsInput.addEventListener('input', () => {
    if (effectsValueEl) effectsValueEl.textContent = percent(Number(effectsInput!.value) / 100);
    update();
  });
  muteInput.addEventListener('change', update);
  reducedMotionInput.addEventListener('change', update);

  const closeBtn = document.getElementById('settings-close') as HTMLButtonElement | null;
  closeBtn?.addEventListener('click', () => {
    el.close();
  });
  el.addEventListener('close', () => {
    activeOnClose?.();
  });
}

export function openSettingsPanel(options: SettingsPanelOptions): void {
  const el = ensureDialog();
  refs();
  activeOnChange = options.onChange;
  activeOnClose = options.onClose;

  const stored = loadPreferences();
  let prefs: Preferences;
  if (stored.status === 'ok') {
    prefs = stored.preferences;
  } else {
    prefs = { ...DEFAULT_PREFERENCES };
    prefs.reducedMotion = systemReducedMotion() ? 'reduce' : 'auto';
    savePreferences(prefs);
  }
  current = prefs;
  applyPreferences(prefs, false);
  wireEventsOnce(el);
  if (!el.open) el.showModal();
}

export function destroySettingsPanel(): void {
  if (dialog) {
    dialog.close();
    dialog.remove();
    dialog = null;
  }
  masterInput = null;
  musicInput = null;
  effectsInput = null;
  muteInput = null;
  reducedMotionInput = null;
  masterValueEl = null;
  musicValueEl = null;
  effectsValueEl = null;
}

export function currentPreferences(): Preferences {
  return { ...current };
}