import './styles.css';
import { difficultyRules } from './game/rules';
import type { Difficulty } from './game/rules';
import { loadRun, saveRun } from './services/local-save';
import { newRun } from './game/state';
import type { RunState } from './game/state';

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
          <button id="continue-campaign" class="primary" hidden>Continue <span aria-hidden="true">↗</span></button>
          <button id="start-campaign" class="primary">Begin the story <span aria-hidden="true">↗</span></button>
          <button id="open-controls" class="secondary">Controls & accessibility</button>
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
  </dialog>
  <dialog id="new-run-confirm" aria-labelledby="new-run-title">
    <h2 id="new-run-title">Start a new story?</h2>
    <p>A saved run exists. Starting over will replace your saved progress — your health, checkpoint, and milestone state will be reset. This cannot be undone.</p>
    <div style="display:flex; gap:10px; margin-top:18px">
      <button type="button" class="secondary" id="confirm-new-run-cancel">Cancel</button>
      <button type="button" class="primary" id="confirm-new-run">Start new story</button>
    </div>
  </dialog>`;

const menu = document.querySelector<HTMLElement>('#menu')!;
const preview = document.querySelector<HTMLElement>('#preview')!;
const start = document.querySelector<HTMLButtonElement>('#start-campaign')!;
const continueBtn = document.querySelector<HTMLButtonElement>('#continue-campaign')!;
const gameHost = document.querySelector<HTMLDivElement>('#game')!;
const errorBox = document.querySelector<HTMLElement>('#error')!;
const newRunDialog = document.querySelector<HTMLDialogElement>('#new-run-confirm')!;
const confirmNewRun = document.querySelector<HTMLButtonElement>('#confirm-new-run')!;
const confirmCancel = document.querySelector<HTMLButtonElement>('#confirm-new-run-cancel')!;
let game: { destroy: (removeCanvas: boolean) => void } | undefined;
let launching = false;
let savedRun: RunState | null = null;

function selectedDifficulty(): Difficulty {
  return document.querySelector<HTMLInputElement>('input[name="difficulty"]:checked')!.value as Difficulty;
}

function showStorageMessage(status: 'empty' | 'invalid' | 'unavailable' | 'ok') {
  if (status === 'invalid') {
    errorBox.hidden = false;
    errorBox.textContent = 'Your saved progress could not be read and will be ignored. You can still begin a new story.';
  } else if (status === 'unavailable') {
    errorBox.hidden = false;
    errorBox.textContent = 'Browser storage is not available, so progress will not be saved between sessions. You can still play locally.';
  } else {
    errorBox.hidden = true;
  }
}

async function loadSavedRun(): Promise<void> {
  const result = loadRun();
  if (result.status === 'ok') {
    savedRun = result.state;
    continueBtn.hidden = false;
    const radio = document.querySelector<HTMLInputElement>(`input[name="difficulty"][value="${savedRun.difficulty}"]`);
    if (radio) radio.checked = true;
    const note = document.querySelector('#difficulty-note')!;
    note.textContent = savedRun.difficulty === 'story'
      ? 'Half enemy health and damage. Four hits from full health.'
      : 'Two hits from full health. Damage persists until a major achievement.';
  }
  showStorageMessage(result.status);
}

function startNewRun(difficulty: Difficulty): void {
  // Explicit new run: overwrite any saved progress with a fresh run.
  // Best-effort save; local play continues even if storage cannot write.
  saveRun(newRun(difficulty));
  launchGame(difficulty);
}

function continueSavedRun(): void {
  if (!savedRun) return;
  launchGame(savedRun.difficulty, savedRun);
}

async function launchGame(difficulty: Difficulty, initialState?: RunState): Promise<void> {
  if (launching || game) return;
  launching = true;
  start.disabled = true;
  continueBtn.disabled = true;
  start.textContent = 'Loading…';
  errorBox.hidden = true;
  try {
    const { createGame } = await import('./game/create-game');
    document.querySelector('#mode-label')!.textContent = `${difficultyRules[difficulty].label} · Chapter One`;
    menu.hidden = true;
    preview.hidden = false;
    game = createGame(gameHost, difficulty, initialState);
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
    continueBtn.disabled = false;
    start.textContent = 'Begin the story ↗';
  }
}

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

loadSavedRun();

start.addEventListener('click', async () => {
  if (launching || game) return;
  // A saved run requires an explicit confirmation before starting over.
  if (savedRun) {
    newRunDialog.showModal();
    return;
  }
  launchGame(selectedDifficulty());
});

continueBtn.addEventListener('click', async () => {
  if (launching || game) return;
  continueSavedRun();
});

confirmCancel.addEventListener('click', () => {
  newRunDialog.close();
});

confirmNewRun.addEventListener('click', () => {
  newRunDialog.close();
  startNewRun(selectedDifficulty());
});

document.querySelector('#back-to-menu')!.addEventListener('click', () => {
  game?.destroy(true);
  game = undefined;
  preview.hidden = true;
  menu.hidden = false;
  start.focus();
});