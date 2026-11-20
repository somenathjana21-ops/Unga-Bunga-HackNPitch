import './styles.css';
import { difficultyRules } from './game/rules';
import type { Difficulty } from './game/rules';

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
          <button id="start-preview" class="primary">Explore the preview <span aria-hidden="true">↗</span></button>
          <button id="open-controls" class="secondary">Controls & accessibility</button>
        </div>
        <p class="build-note">Foundation preview · Story campaign in development</p>
      </div>
      <div class="key-art" aria-hidden="true">
        <img src="/assets/characters/k/k-persona-poster.png" alt="" />
        <div class="art-caption"><span>01 / K</span><span>2026 → 2085</span></div>
      </div>
    </section>
    <section id="preview" class="preview" hidden aria-label="Exploration preview">
      <header><div><span class="eyebrow">WANT / exploration preview</span><p id="mode-label"></p></div>
        <button id="back-to-menu" class="secondary">Back to menu <kbd>Esc</kbd></button></header>
      <p id="preview-status" role="status">Walk to the amber marker, then press E.</p>
      <div id="game" role="region" aria-label="Game area. Use WASD or arrow keys to move." tabindex="0"></div>
      <div class="preview-footer"><p class="hint">WASD / arrows · Move &nbsp; E · Interact</p></div>
    </section>
    <p id="error" role="alert" hidden></p>
    <p class="desktop-note">This preview is designed for a desktop keyboard and mouse.</p>
  </main>
  <dialog id="controls" aria-labelledby="controls-title">
    <h2 id="controls-title">Find your footing.</h2>
    <p><kbd>WASD</kbd> or <kbd>↑ ↓ ← →</kbd> Move one tile at a time.</p>
    <p><kbd>E</kbd> Interact with a nearby marker.</p>
    <p><kbd>Esc</kbd> Return to the menu.</p>
    <p>The preview has no combat or sound yet. The campaign will add mouse aiming, shooting, and a Space dodge.</p>
    <p>Menus work with Tab and Enter. Your system’s reduced-motion preference is respected by menu effects.</p>
    <form method="dialog"><button class="primary">Got it</button></form>
  </dialog>`;

const menu = document.querySelector<HTMLElement>('#menu')!;
const preview = document.querySelector<HTMLElement>('#preview')!;
const start = document.querySelector<HTMLButtonElement>('#start-preview')!;
const gameHost = document.querySelector<HTMLDivElement>('#game')!;
const errorBox = document.querySelector<HTMLElement>('#error')!;
let game: { destroy: (removeCanvas: boolean) => void } | undefined;
let launching = false;

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

start.addEventListener('click', async () => {
  if (launching || game) return;
  launching = true;
  start.disabled = true;
  start.textContent = 'Loading…';
  errorBox.hidden = true;
  try {
    const { createGame } = await import('./game/create-game');
    const difficulty = document.querySelector<HTMLInputElement>('input[name="difficulty"]:checked')!.value as Difficulty;
    document.querySelector('#mode-label')!.textContent = `${difficultyRules[difficulty].label} · Movement test room`;
    menu.hidden = true;
    preview.hidden = false;
    game = createGame(gameHost);
    preview.scrollIntoView({ block: 'start' });
    gameHost.focus({ preventScroll: true });
  } catch {
    preview.hidden = true;
    menu.hidden = false;
    errorBox.hidden = false;
    errorBox.textContent = 'The preview could not start. Please refresh and try again.';
  } finally {
    launching = false;
    start.disabled = false;
    start.textContent = 'Explore the preview ↗';
  }
});

document.querySelector('#back-to-menu')!.addEventListener('click', () => {
  game?.destroy(true);
  game = undefined;
  preview.hidden = true;
  menu.hidden = false;
  document.querySelector('#preview-status')!.textContent = 'Walk to the amber marker, then press E.';
  start.focus();
});
