import './styles.css';
import { difficultyRules } from './game/rules';
import type { Difficulty } from './game/rules';
import { playCutsceneOverlay, destroyCutscenePlayer } from './ui/cutscene-player';
import { openSettingsPanel } from './ui/settings-panel';
import { loadPreferences, savePreferences, DEFAULT_PREFERENCES } from './services/preferences';
import { audio } from './services/audio';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="shell">
    <section class="menu" id="menu" aria-labelledby="title">
      <div class="menu-copy">
        <p class="eyebrow">A story of an ordinary person</p>
        <h1 id="title">WANT<span>.</span></h1>
        <p class="tagline">The wrong person.<br>A choice that matters.</p>
        <p class="intro">A fractured world asked for someone else.<br>You are here anyway.</p>
        <fieldset class="difficulty">
          <legend>Choose your difficulty</legend>
          <label><input type="radio" name="difficulty" value="story" checked /> Story Mode</label>
          <label><input type="radio" name="difficulty" value="real" /> Real Mode</label>
        </fieldset>
        <p id="difficulty-note" class="hint">Half enemy health and damage. Four hits from full health.</p>
        <div class="actions">
          <button id="start-campaign" class="primary">Begin the story <span aria-hidden="true">↗</span></button>
          <button id="open-settings" class="secondary">Settings &amp; accessibility</button>
          <button id="open-controls" class="secondary">Controls &amp; accessibility</button>
        </div>
        <p class="build-note">Chapter One · The Wrong Person</p>
      </div>
      <div class="key-art" aria-hidden="true">
        <img src="/assets/characters/k/k-persona-poster.png" alt="" />
        <div class="art-caption"><span>01 / K</span><span>2026 → 2085</span></div>
      </div>
    </section>
    <section id="preview" class="preview" hidden aria-label="Game area">
      <header><div><span class="eyebrow">WANT / Chapter One</span><p id="mode-label"></p></div>
        <button id="back-to-menu" class="secondary">Back to menu <kbd>Esc</kbd></button></header>
      <div id="game" role="region" aria-label="Game area. Use WASD or arrow keys to move. E to interact." tabindex="0"></div>
      <div class="preview-footer"><p class="hint">WASD / arrows · Move &nbsp; E · Interact / Continue &nbsp; Space · Continue &nbsp; Esc · Skip dialogue / Back to menu</p></div>
    </section>
    <p id="error" role="alert" hidden></p>
    <p class="desktop-note">This game is designed for a desktop keyboard and mouse.</p>
  </main>
  <dialog id="controls" aria-labelledby="controls-title">
    <h2 id="controls-title">Find your footing.</h2>
    <p><kbd>WASD</kbd> or <kbd>↑ ↓ ← →</kbd> Move one tile at a time.</p>
    <p><kbd>E</kbd> Interact with a nearby person or object. Advance dialogue.</p>
    <p><kbd>Space</kbd> Advance dialogue.</p>
    <p><kbd>Esc</kbd> Skip dialogue. Return to the menu when no dialogue is open.</p>
    <p>Menus work with Tab and Enter. Your system's reduced-motion preference is respected by menu effects.</p>
    <form method="dialog"><button class="primary">Got it</button></form>
  </dialog>`;

const menu = document.querySelector<HTMLElement>('#menu')!;
const preview = document.querySelector<HTMLElement>('#preview')!;
const start = document.querySelector<HTMLButtonElement>('#start-campaign')!;
const settingsBtn = document.querySelector<HTMLButtonElement>('#open-settings')!;
const gameHost = document.querySelector<HTMLDivElement>('#game')!;
const errorBox = document.querySelector<HTMLElement>('#error')!;
let game: { destroy: (removeCanvas: boolean) => void } | undefined;
let launching = false;

// Preferences flow into the audio engine and the cutscene player. Load once;
// every change saves and re-applies audio levels immediately.
let preferences = (() => {
  const stored = loadPreferences();
  return stored.status === 'ok' ? stored.preferences : { ...DEFAULT_PREFERENCES };
})();
audio.configure({
  master: preferences.master,
  music: preferences.music,
  effects: preferences.effects,
  muted: preferences.muted,
});

const savePrefs = (next: typeof preferences): void => {
  preferences = next;
  savePreferences(next);
  audio.configure({
    master: next.master,
    music: next.music,
    effects: next.effects,
    muted: next.muted,
  });
};

settingsBtn.addEventListener('click', () => {
  openSettingsPanel({
    preferences,
    onChange: savePrefs,
    onClose: () => {
      // Focus returns to the settings button so keyboard users stay oriented.
      settingsBtn.focus({ preventScroll: true });
    },
  });
});

document.querySelector('#open-controls')!.addEventListener('click', () => {
  document.querySelector<HTMLDialogElement>('#controls')!.showModal();
});

document.querySelectorAll<HTMLInputElement>('input[name="difficulty"]').forEach((input) => {
  input.addEventListener('change', () => {
    document.querySelector('#difficulty-note')!.textContent = input.value === 'story'
      ? 'Half enemy health and damage. Four hits from full health.'
      : 'Two hits from full health. Damage persists until a major achievement.';
  });
});

// First genuine user gesture unlocks the audio graph. Sound and music never
// start before this point.
const unlockAudioOnce = (): void => {
  audio.unlock();
};
const bindUnlock = (element: HTMLElement): void => {
  element.addEventListener('click', unlockAudioOnce, { once: true });
  element.addEventListener('keydown', ((event: Event) => {
    const keyboard = event as KeyboardEvent;
    if (keyboard.key === 'Enter' || keyboard.key === ' ') unlockAudioOnce();
  }) as EventListener, { once: true });
};
bindUnlock(start);
bindUnlock(settingsBtn);

start.addEventListener('click', async () => {
  if (launching || game) return;
  launching = true;
  start.disabled = true;
  start.textContent = 'Loading…';
  errorBox.hidden = true;
  try {
    const { createGame } = await import('./game/create-game');
    const difficulty = document.querySelector<HTMLInputElement>('input[name="difficulty"]:checked')!.value as Difficulty;
    document.querySelector('#mode-label')!.textContent = `${difficultyRules[difficulty].label} · Chapter One`;
    menu.hidden = true;
    preview.hidden = false;
    game = createGame(gameHost, difficulty);
    preview.scrollIntoView({ block: 'start' });
    gameHost.focus({ preventScroll: true });
  } catch {
    preview.hidden = true;
    menu.hidden = false;
    errorBox.hidden = false;
    errorBox.textContent = 'The game could not start. Please refresh and try again.';
  } finally {
    launching = false;
    start.disabled = false;
    start.textContent = 'Begin the story ↗';
  }
});

document.querySelector('#back-to-menu')!.addEventListener('click', () => {
  game?.destroy(true);
  game = undefined;
  destroyCutscenePlayer();
  preview.hidden = true;
  menu.hidden = false;
  start.focus();
});

// Development route: `?cutscene=c01` plays a cutscene directly instead of the
// preview, so contributors can review cutscenes without replaying the opening.
const cutsceneId = new URLSearchParams(window.location.search).get('cutscene');
if (cutsceneId) {
  menu.hidden = true;
  preview.hidden = true;
  audio.unlock();
  playCutsceneOverlay({
    cutsceneId,
    reducedMotion: preferences.reducedMotion === 'reduce',
    onComplete: () => {
      menu.hidden = false;
      preview.hidden = true;
      start.focus();
    },
  });
}
