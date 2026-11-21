import './styles.css';
import { difficultyRules } from './game/rules';
import type { Difficulty } from './game/rules';
import { playCutsceneOverlay, destroyCutscenePlayer } from './ui/cutscene-player';
import { openSettingsPanel } from './ui/settings-panel';
import { showEndingScreen, destroyEndingScreen } from './ui/ending-screen';
import { mountHordeLobby, showHordeResults, destroyHordeResults } from './ui/horde-modal';
import { loadPreferences, savePreferences, DEFAULT_PREFERENCES } from './services/preferences';
import { audio } from './services/audio';
import {
  clearStoryProgress,
  loadRun,
  loadStoryProgress,
  saveRun,
} from './services/local-save';
import { loadHordeScores } from './services/horde-scores';
import { newRun } from './game/state';
import type { RunState } from './game/state';
import { mapDisplayName, type StoryProgressSnapshot } from './game/story-state';
import {
  formatScore,
  hordeDifficultyRules,
  hordeDurationRules,
} from './game/horde/rules';
import type { HordeConfig, HordeRunResult } from './game/scenes/HordeScene';

// Development-only launch paths for isolated combat/rescue slices. Never shipped
// in the production build and never touch story preview routing.
const devCombatButton = import.meta.env.DEV
  ? '<button id="dev-combat-test" class="utility-btn" type="button">Combat test (dev)</button>'
  : '';
const devRescueButton = import.meta.env.DEV
  ? '<button id="dev-rescue-test" class="utility-btn" type="button">Rescue test (dev)</button>'
  : '';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="title-backdrop" id="title-backdrop" aria-hidden="true">
    <img src="/assets/backgrounds/campus-library-approach.png" alt="" class="title-bg-img" />
    <div class="title-scrim"></div>
    <canvas id="title-embers" class="title-embers-canvas"></canvas>
  </div>

  <main class="shell">
    <section class="menu" id="menu" aria-labelledby="title">
      <div class="menu-copy">
        <p class="eyebrow">Chapter One · The Wrong Person</p>
        <div class="brand-lockup">
          <h1 id="title" class="sr-only">WANT</h1>
          <svg
            class="brand-svg"
            viewBox="0 0 380 116"
            role="img"
            aria-label="WANT"
          >
            <text
              x="0"
              y="92"
              font-family="'Barlow Condensed', 'Segoe UI', Arial, sans-serif"
              font-size="112"
              font-weight="800"
              letter-spacing="-2"
              fill="#f4f0e8"
            >WANT<tspan fill="#e3b16b">.</tspan></text>
            <line x1="2" y1="108" x2="226" y2="108" stroke="#e3b16b" stroke-width="2" stroke-opacity="0.78" />
            <text
              x="238"
              y="112"
              font-family="'JetBrains Mono', monospace"
              font-size="12"
              font-weight="500"
              letter-spacing="2"
              fill="#e3b16b"
            >2026 → 2085</text>
          </svg>
        </div>

        <p class="tagline">The wrong person.<br />A choice that matters.</p>
        <p class="intro">A fractured world asked for someone else. You are here anyway.</p>

        <fieldset class="difficulty" aria-describedby="difficulty-note">
          <legend>Story Difficulty</legend>
          <div class="difficulty-toggle">
            <label class="diff-option">
              <input type="radio" name="difficulty" value="story" checked />
              <span>Story Mode</span>
            </label>
            <label class="diff-option">
              <input type="radio" name="difficulty" value="real" />
              <span>Real Mode</span>
            </label>
          </div>
        </fieldset>
        <p id="difficulty-note" class="hint">Half enemy health and damage. Four hits from full health.</p>

        <div class="actions">
          <button id="continue-campaign" class="primary cta-wide" type="button" hidden data-start="true">
            <span class="cta-main">
              <span>Continue Story</span>
              <span class="cta-arrow" aria-hidden="true">↗</span>
            </span>
            <span id="continue-meta" class="cta-sub num"></span>
          </button>

          <div class="cta-row">
            <button id="start-campaign" class="primary" type="button" data-start="true">
              <span id="start-label">Begin Story</span>
              <span class="cta-arrow" aria-hidden="true">↗</span>
            </button>
            <button id="open-horde" class="horde-cta" type="button">
              <span>Horde Mode</span>
              <span id="horde-top-note" class="horde-cta-sub num">1m · 5m · Unlimited</span>
            </button>
          </div>
        </div>

        <div class="utility-row">
          <button id="open-settings" class="utility-btn" type="button">Settings</button>
          <button id="open-controls" class="utility-btn" type="button">Controls</button>
          <button id="toggle-audio" class="utility-btn" type="button" aria-pressed="false">Audio: On</button>
          ${devCombatButton}
          ${devRescueButton}
        </div>

        <p class="title-controls-strip">
          <span>WASD / Arrows</span> Move · <span>E</span> Interact · <span>Click</span> Fire · <span>Space</span> Reflex Dodge · <span>R</span> Snap Reload · <span>Esc</span> Menu
        </p>
      </div>

      <div class="key-art" id="key-art-card" aria-hidden="true">
        <div class="key-art-frame">
          <img src="/assets/characters/k/k-persona-poster.png" alt="" id="key-art-img" />
          <div class="key-art-vignette"></div>
        </div>
        <div class="art-caption">
          <span class="num">01 / K</span>
          <span class="art-caption-mid">CEBU · SECTOR 04</span>
          <span class="num">2026 → 2085</span>
        </div>
      </div>
    </section>

    <section id="horde-lobby-section" class="horde-lobby-section" hidden aria-labelledby="horde-title"></section>

    <section id="preview" class="preview" hidden aria-label="Game area">
      <header>
        <div>
          <span class="eyebrow" id="preview-eyebrow">WANT / Chapter One</span>
          <p id="mode-label"></p>
        </div>
        <div class="preview-header-actions">
          <button id="preview-audio-toggle" class="secondary" type="button" aria-pressed="false">Audio: On</button>
          <button id="back-to-menu" class="secondary" type="button">Back to menu <kbd>Esc</kbd></button>
        </div>
      </header>
      <div id="game" role="region" aria-label="Game area. Use WASD or arrow keys to move. E to interact." tabindex="0"></div>
      <div class="preview-footer">
        <p id="preview-footer-hint" class="hint">
          WASD / arrows · Move &nbsp; E · Interact / Continue &nbsp; Space · Continue / Dodge &nbsp; Click · Fire &nbsp; R · Snap Reload &nbsp; Esc · Menu
        </p>
      </div>
    </section>

    <p id="error" role="alert" hidden></p>
    <p class="desktop-note">This game is designed for a desktop keyboard and mouse.</p>
  </main>

  <dialog id="controls" aria-labelledby="controls-title">
    <h2 id="controls-title">Find your footing.</h2>
    <p><kbd>WASD</kbd> or <kbd>↑ ↓ ← →</kbd> Move through rooms or weave across combat arenas.</p>
    <p><kbd>E</kbd> Interact with people, props, and gate switches. Advance dialogue.</p>
    <p><kbd>Left Click</kbd> Fire your pistol or Counter Rail during combat and Horde Mode.</p>
    <p><kbd>Space</kbd> Advance dialogue, or Reflex Dodge through attacks to trigger Bullet-Time.</p>
    <p><kbd>R</kbd> Reload your sidearm. Press again in the gold sweet spot for a Snap Reload.</p>
    <p><kbd>Esc</kbd> Skip dialogue, pause combat, or return to the title menu.</p>
    <p>Menus work with Tab and Enter. Your system's reduced-motion preference is respected.</p>
    <form method="dialog"><button class="primary">Got it</button></form>
  </dialog>

  <dialog id="new-run-confirm" aria-labelledby="new-run-title">
    <h2 id="new-run-title">Start a new story?</h2>
    <p>A saved story exists. Starting over will replace your saved progress — your location, health, checkpoint, and milestone state will be reset. Horde scores are kept separate and will not be affected.</p>
    <div class="dialog-actions">
      <button type="button" class="secondary" id="confirm-new-run-cancel">Cancel</button>
      <button type="button" class="primary" id="confirm-new-run">Start new story</button>
    </div>
  </dialog>
`;

const titleBackdrop = document.querySelector<HTMLElement>('#title-backdrop')!;
const menu = document.querySelector<HTMLElement>('#menu')!;
const hordeLobbySection = document.querySelector<HTMLElement>('#horde-lobby-section')!;
const preview = document.querySelector<HTMLElement>('#preview')!;
const previewEyebrow = document.querySelector<HTMLElement>('#preview-eyebrow')!;
const previewFooterHint = document.querySelector<HTMLElement>('#preview-footer-hint')!;
const startBtn = document.querySelector<HTMLButtonElement>('#start-campaign')!;
const startLabel = document.querySelector<HTMLElement>('#start-label')!;
const continueBtn = document.querySelector<HTMLButtonElement>('#continue-campaign')!;
const continueMeta = document.querySelector<HTMLElement>('#continue-meta')!;
const hordeBtn = document.querySelector<HTMLButtonElement>('#open-horde')!;
const hordeTopNote = document.querySelector<HTMLElement>('#horde-top-note')!;
const settingsBtn = document.querySelector<HTMLButtonElement>('#open-settings')!;
const toggleAudioBtn = document.querySelector<HTMLButtonElement>('#toggle-audio')!;
const previewAudioBtn = document.querySelector<HTMLButtonElement>('#preview-audio-toggle')!;
const gameHost = document.querySelector<HTMLDivElement>('#game')!;
const errorBox = document.querySelector<HTMLElement>('#error')!;
const newRunDialog = document.querySelector<HTMLDialogElement>('#new-run-confirm')!;
const confirmNewRun = document.querySelector<HTMLButtonElement>('#confirm-new-run')!;
const confirmCancel = document.querySelector<HTMLButtonElement>('#confirm-new-run-cancel')!;

let game: { destroy: (removeCanvas: boolean) => void } | undefined;
let launching = false;
let savedRun: RunState | null = null;
let savedStory: StoryProgressSnapshot | null = null;
let activeMode: 'title' | 'horde-setup' | 'story' | 'horde' | 'dev' = 'title';
let emberRafId: number | null = null;

// Preferences flow into the audio engine, cutscene player, and ending screen.
let preferences = (() => {
  const stored = loadPreferences();
  return stored.status === 'ok' ? stored.preferences : { ...DEFAULT_PREFERENCES };
})();

function isReducedMotion(): boolean {
  return (
    preferences.reducedMotion === 'reduce'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function syncAudioToggleUI(): void {
  const label = preferences.muted ? 'Audio: Muted' : 'Audio: On';
  toggleAudioBtn.textContent = label;
  toggleAudioBtn.setAttribute('aria-pressed', String(preferences.muted));
  previewAudioBtn.textContent = label;
  previewAudioBtn.setAttribute('aria-pressed', String(preferences.muted));
}

audio.configure({
  master: preferences.master,
  music: preferences.music,
  effects: preferences.effects,
  muted: preferences.muted,
});
syncAudioToggleUI();

const savePrefs = (next: typeof preferences): void => {
  preferences = next;
  savePreferences(next);
  audio.configure({
    master: next.master,
    music: next.music,
    effects: next.effects,
    muted: next.muted,
  });
  syncAudioToggleUI();
  updateTitleEmbers();
};

const toggleMute = (): void => {
  audio.unlock();
  savePrefs({ ...preferences, muted: !preferences.muted });
  if (!preferences.muted) {
    audio.playCue('ui-confirm');
    if (activeMode === 'title' || activeMode === 'horde-setup') {
      audio.setSceneAudio('campus', 'campus');
    }
  }
};

toggleAudioBtn.addEventListener('click', toggleMute);
previewAudioBtn.addEventListener('click', toggleMute);

// Unlock audio on the very first genuine user interaction anywhere on the page
// and smoothly bring in the title screen ambient + campus theme.
const unlockAudioOnce = (): void => {
  audio.unlock();
  if (activeMode === 'title' || activeMode === 'horde-setup') {
    audio.setSceneAudio('campus', 'campus');
  }
};
window.addEventListener('pointerdown', unlockAudioOnce, { once: true });
window.addEventListener('keydown', unlockAudioOnce, { once: true });

function selectedDifficulty(): Difficulty {
  return document.querySelector<HTMLInputElement>('input[name="difficulty"]:checked')!.value as Difficulty;
}

function updateDifficultyNote(diff: Difficulty): void {
  document.querySelector('#difficulty-note')!.textContent = diff === 'story'
    ? 'Half enemy health and damage. Four hits from full health.'
    : 'Two hits from full health. Damage persists until a major achievement.';
}

function showStorageMessage(status: 'empty' | 'invalid' | 'unavailable' | 'ok'): void {
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

function formatSavedLocation(run: RunState, story: StoryProgressSnapshot | null): string {
  if (run.checkpoint === 'rescue-start' && run.rescueStatus !== 'complete') {
    return run.rescueStatus === 'failed'
      ? `Rescue Mission (Failed) · ${difficultyRules[run.difficulty].label}`
      : `Rescue Mission · HP ${run.health}/100`;
  }
  if (run.rescueStatus === 'complete') {
    return `Chapter One Cleared · ${difficultyRules[run.difficulty].label}`;
  }
  const room = story ? mapDisplayName(story.currentMap) : mapDisplayName(run.checkpoint);
  return `${room} · HP ${run.health}/100 · ${difficultyRules[run.difficulty].label}`;
}

function refreshMenuState(): void {
  const result = loadRun();
  const storyRead = loadStoryProgress();
  savedStory = storyRead.status === 'ok' ? storyRead.snapshot : null;

  if (result.status === 'ok') {
    savedRun = result.state;
    continueBtn.hidden = false;
    continueMeta.textContent = formatSavedLocation(savedRun, savedStory);
    startBtn.classList.remove('primary');
    startBtn.classList.add('secondary');
    startLabel.textContent = 'New Story';

    const radio = document.querySelector<HTMLInputElement>(`input[name="difficulty"][value="${savedRun.difficulty}"]`);
    if (radio) radio.checked = true;
    updateDifficultyNote(savedRun.difficulty);
  } else {
    savedRun = null;
    continueBtn.hidden = true;
    startBtn.classList.remove('secondary');
    startBtn.classList.add('primary');
    startLabel.textContent = 'Begin Story';
  }
  showStorageMessage(result.status);

  // Update Horde button subtitle with current local high score if any
  const scores = loadHordeScores();
  if (scores.length > 0) {
    hordeTopNote.textContent = `Top: ${formatScore(scores[0].score)} · ${scores[0].playerName}`;
  } else {
    hordeTopNote.textContent = '1m · 5m · Unlimited';
  }
}

function setView(view: 'title' | 'horde-setup' | 'playing'): void {
  menu.hidden = view !== 'title';
  hordeLobbySection.hidden = view !== 'horde-setup';
  preview.hidden = view !== 'playing';
  titleBackdrop.hidden = view === 'playing';

  if (view === 'title') {
    activeMode = 'title';
    document.body.dataset.state = 'title';
    delete document.body.dataset.scene;
    delete document.body.dataset.map;
    delete document.body.dataset.tile;
    delete document.body.dataset.beat;
  } else if (view === 'horde-setup') {
    activeMode = 'horde-setup';
    document.body.dataset.state = 'horde-setup';
  } else {
    document.body.dataset.state = 'playing';
  }
  updateTitleEmbers();
}

function destroyActiveGame(flushStorySave: boolean): void {
  if (flushStorySave) {
    window.dispatchEvent(new CustomEvent('want:flush-save'));
  }
  destroyCutscenePlayer();
  destroyEndingScreen();
  destroyHordeResults();
  if (game) {
    game.destroy(true);
    game = undefined;
  }
}

function returnToTitle(flushStorySave = true): void {
  destroyActiveGame(flushStorySave);
  refreshMenuState();
  setView('title');
  errorBox.hidden = true;
  startBtn.disabled = false;
  continueBtn.disabled = false;
  audio.setSceneAudio('campus', 'campus');
  (savedRun ? continueBtn : startBtn).focus({ preventScroll: true });
}

async function launchStoryWorld(
  difficulty: Difficulty,
  initialState: RunState,
  storySnapshot: StoryProgressSnapshot | null,
): Promise<void> {
  if (launching || game) return;
  launching = true;
  startBtn.disabled = true;
  continueBtn.disabled = true;
  startLabel.textContent = 'Loading…';
  errorBox.hidden = true;
  try {
    const { createGame } = await import('./game/create-game');
    const resumeRescue =
      initialState.checkpoint === 'rescue-start' && initialState.rescueStatus !== 'complete';

    previewEyebrow.textContent = 'WANT / Chapter One';
    document.querySelector('#mode-label')!.textContent = resumeRescue
      ? `${difficultyRules[difficulty].label} · Rescue Mission`
      : `${difficultyRules[difficulty].label} · Chapter One`;
    previewFooterHint.textContent =
      'WASD / Arrows: Move  ·  E: Interact / Continue  ·  Click: Fire  ·  Space: Continue / Reflex Dodge  ·  R: Snap Reload  ·  Esc: Menu';

    activeMode = 'story';
    setView('playing');
    game = createGame(
      gameHost,
      resumeRescue ? 'rescue' : 'world',
      difficulty,
      initialState,
      { storySnapshot },
    );
    preview.scrollIntoView({ block: 'start' });
    gameHost.focus({ preventScroll: true });
  } catch {
    setView('title');
    errorBox.hidden = false;
    errorBox.textContent = 'The game could not start. Please refresh and try again.';
  } finally {
    launching = false;
    startBtn.disabled = false;
    continueBtn.disabled = false;
    refreshMenuState();
  }
}

function startNewRun(difficulty: Difficulty): void {
  audio.unlock();
  audio.playCue('ui-confirm');
  clearStoryProgress();
  const fresh = newRun(difficulty);
  saveRun(fresh);
  savedRun = fresh;
  savedStory = null;
  void launchStoryWorld(difficulty, fresh, null);
}

function continueSavedRun(): void {
  if (!savedRun) return;
  audio.unlock();
  audio.playCue('ui-confirm');
  // If the chapter was already finished, replay from the settlement/rescue cleanly
  // or continue wherever storySnapshot left off.
  const storyRead = loadStoryProgress();
  const snapshot = storyRead.status === 'ok' ? storyRead.snapshot : null;
  void launchStoryWorld(savedRun.difficulty, savedRun, snapshot);
}

async function launchHordeGame(config: HordeConfig): Promise<void> {
  if (launching || game) return;
  launching = true;
  errorBox.hidden = true;
  try {
    const { createGame } = await import('./game/create-game');
    const diff = hordeDifficultyRules[config.difficulty];
    const dur = hordeDurationRules[config.duration];
    previewEyebrow.textContent = `WANT / HORDE ARENA · ${config.playerName.toUpperCase()}`;
    document.querySelector('#mode-label')!.textContent =
      `${diff.label} (${formatScore(diff.difficultyFactor)}×) · ${dur.label}`;
    previewFooterHint.textContent =
      'WASD / Arrows: Move  ·  Click: Fire  ·  Space: Reflex Dodge  ·  R: Snap Reload  ·  Esc / P: Pause';

    activeMode = 'horde';
    setView('playing');
    game = createGame(gameHost, 'horde', 'real', undefined, { hordeConfig: config });
    preview.scrollIntoView({ block: 'start' });
    gameHost.focus({ preventScroll: true });
  } catch {
    setView('horde-setup');
    errorBox.hidden = false;
    errorBox.textContent = 'Horde Mode could not start. Please refresh and try again.';
  } finally {
    launching = false;
  }
}

async function launchDevScene(sceneKey: 'combat' | 'rescue', modeLabel: string, overrideState?: RunState): Promise<void> {
  if (launching || game) return;
  launching = true;
  startBtn.disabled = true;
  continueBtn.disabled = true;
  errorBox.hidden = true;
  try {
    const { createGame } = await import('./game/create-game');
    const difficulty = overrideState?.difficulty ?? selectedDifficulty();
    previewEyebrow.textContent = 'WANT / Chapter One';
    document.querySelector('#mode-label')!.textContent = modeLabel;
    activeMode = 'dev';
    setView('playing');
    game = createGame(gameHost, sceneKey, difficulty, overrideState);
    preview.scrollIntoView({ block: 'start' });
    gameHost.focus({ preventScroll: true });
  } catch {
    setView('title');
    errorBox.hidden = false;
    errorBox.textContent = 'The game could not start. Please refresh and try again.';
  } finally {
    launching = false;
    startBtn.disabled = false;
    continueBtn.disabled = false;
  }
}

// Mount Horde lobby once and refresh whenever opened.
const hordeLobby = mountHordeLobby(hordeLobbySection, {
  onLaunch: (config) => {
    void launchHordeGame(config);
  },
  onBack: () => {
    returnToTitle(false);
  },
});

function openHordeLobby(): void {
  destroyActiveGame(false);
  hordeLobby.refresh();
  setView('horde-setup');
  audio.setSceneAudio('campus', 'campus');
  const input = hordeLobbySection.querySelector<HTMLInputElement>('#horde-player-name');
  input?.focus({ preventScroll: true });
}

// Wire buttons & dialogs
settingsBtn.addEventListener('click', () => {
  audio.unlock();
  audio.playCue('ui-confirm');
  openSettingsPanel({
    preferences,
    onChange: savePrefs,
    onClose: () => settingsBtn.focus({ preventScroll: true }),
  });
});

document.querySelector('#open-controls')!.addEventListener('click', () => {
  audio.unlock();
  audio.playCue('ui-confirm');
  document.querySelector<HTMLDialogElement>('#controls')!.showModal();
});

document.querySelectorAll<HTMLInputElement>('input[name="difficulty"]').forEach((input) => {
  input.addEventListener('change', () => {
    audio.unlock();
    audio.playCue('ui-confirm');
    updateDifficultyNote(input.value as Difficulty);
  });
});

startBtn.addEventListener('click', () => {
  if (launching || game) return;
  audio.unlock();
  if (savedRun) {
    audio.playCue('ui-confirm');
    newRunDialog.showModal();
    return;
  }
  startNewRun(selectedDifficulty());
});

continueBtn.addEventListener('click', () => {
  if (launching || game) return;
  continueSavedRun();
});

hordeBtn.addEventListener('click', () => {
  if (launching || game) return;
  audio.unlock();
  audio.playCue('ui-confirm');
  openHordeLobby();
});

confirmCancel.addEventListener('click', () => {
  audio.playCue('ui-confirm');
  newRunDialog.close();
});

confirmNewRun.addEventListener('click', () => {
  newRunDialog.close();
  startNewRun(selectedDifficulty());
});

if (import.meta.env.DEV) {
  document.querySelector<HTMLButtonElement>('#dev-combat-test')?.addEventListener('click', () => {
    void launchDevScene('combat', 'Combat test (dev) · Story Mode');
  });
  document.querySelector<HTMLButtonElement>('#dev-rescue-test')?.addEventListener('click', () => {
    const difficulty = selectedDifficulty();
    void launchDevScene('rescue', `Rescue mission · ${difficultyRules[difficulty].label}`);
  });
}

// Game-to-shell event bridges
window.addEventListener('want:return-to-title', () => {
  returnToTitle(activeMode === 'story');
});

document.querySelector('#back-to-menu')!.addEventListener('click', () => {
  audio.playCue('ui-confirm');
  if (activeMode === 'horde') {
    openHordeLobby();
    return;
  }
  returnToTitle(activeMode === 'story');
});

// Animated Chapter One Ending overlay (replaces old soft-locked Phaser box)
window.addEventListener('want:chapter-ending', (event: Event) => {
  const detail = (event as CustomEvent<{ difficulty?: Difficulty }>).detail;
  const diff: Difficulty = detail?.difficulty ?? savedRun?.difficulty ?? selectedDifficulty();

  // Destroy Phaser before displaying the DOM ending screen so no canvas listener
  // can ever block keyboard or pointer navigation.
  if (game) {
    game.destroy(true);
    game = undefined;
  }
  destroyCutscenePlayer();
  preview.hidden = true;
  menu.hidden = true;
  hordeLobbySection.hidden = true;
  titleBackdrop.hidden = true;

  showEndingScreen({
    difficultyLabel: difficultyRules[diff].label,
    reducedMotion: isReducedMotion(),
    onReturnToTitle: () => {
      returnToTitle(false);
    },
    onOpenHorde: () => {
      openHordeLobby();
    },
    onReplayRescue: () => {
      const replayState: RunState = {
        ...newRun(diff),
        checkpoint: 'rescue-start',
        rescueStatus: 'active',
      };
      void launchDevScene('rescue', `Rescue mission · ${difficultyRules[diff].label}`, replayState);
    },
  });
});

// Horde Mode post-run results & scoreboard overlay
window.addEventListener('want:horde-finished', (event: Event) => {
  const result = (event as CustomEvent<HordeRunResult>).detail;
  if (!result) return;
  showHordeResults({
    result,
    onPlayAgain: (config) => {
      window.dispatchEvent(new CustomEvent('want:horde-restart', { detail: config }));
    },
    onChangeSetup: () => {
      openHordeLobby();
    },
    onReturnToMenu: () => {
      returnToTitle(false);
    },
  });
});

// Subtle mouse parallax on K's poster (disabled under reduced motion)
const keyArtCard = document.querySelector<HTMLElement>('#key-art-card');
const keyArtImg = document.querySelector<HTMLElement>('#key-art-img');
if (keyArtCard && keyArtImg) {
  keyArtCard.addEventListener('pointermove', (event) => {
    if (isReducedMotion()) return;
    const rect = keyArtCard.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    keyArtImg.style.transform = `scale(1.035) translate(${(-nx * 10).toFixed(1)}px, ${(-ny * 10).toFixed(1)}px)`;
  });
  keyArtCard.addEventListener('pointerleave', () => {
    keyArtImg.style.transform = 'scale(1.02) translate(0px, 0px)';
  });
}

// Gentle twilight embers over the title screen backdrop (zero per-frame allocations)
interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
}
let embers: Ember[] = [];
function updateTitleEmbers(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#title-embers');
  if (!canvas) return;
  const shouldRun = !titleBackdrop.hidden && !isReducedMotion();
  if (!shouldRun) {
    if (emberRafId !== null) {
      cancelAnimationFrame(emberRafId);
      emberRafId = null;
    }
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  if (emberRafId !== null) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  if (embers.length === 0) {
    embers = Array.from({ length: 28 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: 6 + Math.random() * 14,
      vy: -(8 + Math.random() * 18),
      r: 1.2 + Math.random() * 2.2,
      alpha: 0.16 + Math.random() * 0.34,
    }));
  }

  let last = performance.now();
  const tick = (now: number) => {
    if (titleBackdrop.hidden || isReducedMotion()) {
      emberRafId = null;
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < embers.length; i++) {
      const e = embers[i];
      e.x += (e.vx + Math.sin(now * 0.0008 + i) * 7) * dt;
      e.y += e.vy * dt;
      if (e.y < -8) {
        e.y = canvas.height + 8;
        e.x = Math.random() * canvas.width;
      }
      if (e.x > canvas.width + 8) e.x = -8;

      ctx.fillStyle = `rgba(235, 184, 108, ${e.alpha})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    emberRafId = requestAnimationFrame(tick);
  };
  emberRafId = requestAnimationFrame(tick);
}

// Initialize state & query-string dev/review routes
refreshMenuState();
setView('title');

const params = new URLSearchParams(window.location.search);
const cutsceneId = params.get('cutscene');
if (cutsceneId) {
  menu.hidden = true;
  preview.hidden = true;
  titleBackdrop.hidden = true;
  audio.unlock();
  playCutsceneOverlay({
    cutsceneId,
    reducedMotion: isReducedMotion(),
    onComplete: () => {
      returnToTitle(false);
    },
  });
} else if (params.get('ending') === '1') {
  window.dispatchEvent(
    new CustomEvent('want:chapter-ending', {
      detail: { difficulty: selectedDifficulty() },
    }),
  );
} else if (params.get('horde') === '1') {
  openHordeLobby();
} else if (params.get('autostart') === '1') {
  const diff = selectedDifficulty();
  if (savedRun) {
    continueSavedRun();
  } else {
    startNewRun(diff);
  }
}
