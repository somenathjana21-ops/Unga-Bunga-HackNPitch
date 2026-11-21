import './styles.css';
import { difficultyRules } from './game/rules';
import type { Difficulty } from './game/rules';
import { playCutsceneOverlay, destroyCutscenePlayer } from './ui/cutscene-player';
import { openSettingsPanel } from './ui/settings-panel';
import { showEndingScreen, destroyEndingScreen } from './ui/ending-screen';
import {
  showRescueFailedScreen,
  destroyRescueFailedScreen,
  type RescueFailedDetail,
} from './ui/rescue-failed-screen';
import { mountHordeLobby, showHordeResults, destroyHordeResults } from './ui/horde-modal';
import { loadPreferences, savePreferences, DEFAULT_PREFERENCES } from './services/preferences';
import { audio } from './services/audio';
import {
  loadGameModule,
  registerOfflineCache,
  warmCriticalAssets,
  warmGameModule,
} from './services/asset-cache';
import {
  clearStoryProgress,
  loadRun,
  loadStoryProgress,
  saveRun,
} from './services/local-save';
import { loadHordeScores } from './services/horde-scores';
import { getHordeDuelBackend, loadStoredDuelSession, saveStoredDuelSession } from './services/horde-duel';
import type { DuelSession } from './game/horde/duel';
import { newRun } from './game/state';
import type { RunState } from './game/state';
import { mapDisplayName, type StoryProgressSnapshot } from './game/story-state';
import {
  formatScore,
  hordeDifficultyRules,
  hordeDurationRules,
} from './game/horde/rules';
import { hordeMaps, type HordeMapId } from './game/horde/maps';
import type { HordeConfig, HordeRunResult } from './game/scenes/HordeScene';

// Development-only launch paths for isolated combat/rescue slices. Never shipped
// in the production build and never touch story preview routing.
const devCombatButton = import.meta.env.DEV
  ? '<button id="dev-combat-test" class="crt-util-btn" type="button">Combat (dev)</button>'
  : '';
const devRescueButton = import.meta.env.DEV
  ? '<button id="dev-rescue-test" class="crt-util-btn" type="button">Rescue (dev)</button>'
  : '';

function pixelHeartSvg(index: number): string {
  return `
    <span class="crt-heart is-lit" data-heart-index="${index}" style="--heart-i:${index}" aria-hidden="true">
      <svg viewBox="0 0 9 8" width="32" height="28" shape-rendering="crispEdges">
        <!-- Base golden-orange silhouette -->
        <path fill="#ff9e14" d="M1 0h2v1h1v1h1V1h1V0h2v1h1v3H8v1H7v1H6v1H5v1H4V7H3V6H2V5H1V4H0V1h1V0z"/>
        <!-- Bright golden highlight pixels -->
        <path fill="#ffd748" d="M1 0h2v1H1V0zm5 0h2v1H6V0zM1 1h2v1H1V1zm5 0h2v1H6V1zM1 2h1v1H1V2z"/>
        <!-- Warm deep orange lower shade -->
        <path fill="#e36d00" d="M8 2h1v2H8V2zM7 4h1v1H7V4zM6 5h1v1H6V5zM5 6h1v1H5V6zM4 7h1v1H4V7zM0 3h1v1H0V3zM1 4h1v1H1V4z"/>
      </svg>
    </span>
  `;
}

const CURSOR_TRIANGLE_SVG = `
  <svg class="crt-cursor-tri" viewBox="0 0 14 14" width="24" height="24" aria-hidden="true">
    <polygon points="1,7 13,1 13,13" fill="#ff9e14" />
    <polygon points="1,7 13,1 13,6" fill="#ffd94a" />
    <polygon points="1,7 13,11 13,13" fill="#df6800" />
  </svg>
`;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <!-- Outer indigo arcade cabinet beveled wall -->
  <div class="arcade-cabinet" id="arcade-cabinet">
    <svg class="cabinet-bevel-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polygon points="0,0 100,0 88,12 12,12" fill="#373b6e" />
      <polygon points="0,0 12,12 12,88 0,100" fill="#4b4f88" />
      <polygon points="100,0 100,100 88,88 88,12" fill="#4b4f88" />
      <polygon points="12,88 88,88 100,100 0,100" fill="#5c60a2" />
      <line x1="0" y1="0" x2="12" y2="12" stroke="#2c2f59" stroke-width="0.35" />
      <line x1="100" y1="0" x2="88" y2="12" stroke="#2c2f59" stroke-width="0.35" />
      <line x1="0" y1="100" x2="12" y2="88" stroke="#6f74bd" stroke-width="0.35" />
      <line x1="100" y1="100" x2="88" y2="88" stroke="#6f74bd" stroke-width="0.35" />
    </svg>

    <main class="shell">
      <div class="crt-monitor crt-booting" id="crt-monitor">
        <!-- CRT internal glass visual layers (grid, curved specular glares, scanline sweep, warp flash) -->
        <div class="crt-grid-overlay" aria-hidden="true"></div>
        <div class="crt-scanlines" aria-hidden="true"></div>
        <div class="crt-sweep-beam" aria-hidden="true"></div>
        <svg class="crt-glass-glare" viewBox="0 0 1000 660" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M 46 210 C 48 84, 100 36, 250 34 C 315 33, 375 36, 435 42 C 260 44, 118 68, 72 178 C 60 206, 49 235, 46 210 Z"
            fill="rgba(224, 210, 255, 0.12)"
          />
          <path
            d="M 760 618 C 864 608, 932 552, 948 446 C 956 544, 900 622, 760 618 Z"
            fill="rgba(216, 198, 255, 0.08)"
          />
        </svg>
        <div class="crt-warp-flash" id="crt-warp-flash" aria-hidden="true"></div>

        <!-- Standby power-down overlay when user selects NO -->
        <div class="crt-standby" id="crt-standby" hidden role="region" aria-label="Monitor Standby">
          <div class="standby-beam" aria-hidden="true"></div>
          <div class="standby-copy">
            <p class="pixel-kicker">SIGNAL STANDBY</p>
            <p class="standby-sub">WANT · CEBU SECTOR 04 WAITS FOR YOU</p>
            <button type="button" id="crt-wake-btn" class="arcade-choice-btn is-selected">
              <span class="choice-label">WAKE UP</span>
              <span class="choice-cursor">${CURSOR_TRIANGLE_SVG}</span>
            </button>
          </div>
        </div>

        <!-- MENU VIEWS (READY SCREEN + MODE SELECT SCREEN) -->
        <section class="crt-menu" id="menu" aria-labelledby="title">
          <!-- Persistent Arcade Top HUD: HI-SCORE left, 5 Pixel Hearts right -->
          <header class="crt-hud-bar" id="crt-hud-bar">
            <div class="crt-hiscore">
              <span class="crt-hiscore-label">HI-SCORE</span>
              <span class="crt-hiscore-value num" id="crt-hiscore-value">000000</span>
            </div>
            <div class="crt-hearts" id="crt-hearts" aria-label="Resolve hearts">
              ${[0, 1, 2, 3, 4].map((i) => pixelHeartSvg(i)).join('')}
            </div>
          </header>

          <!-- STAGE 1: WANT SHOWCASE / START / ARE YOU READY? / YES ◀  NO -->
          <div class="crt-stage-ready" id="crt-stage-ready">
            <div class="crt-want-showcase" aria-label="WANT — Chapter One: The Wrong Person">
              <div class="crt-want-rule" aria-hidden="true"></div>
              <h1 id="title" class="crt-want-wordmark-wrap">
                <svg class="crt-want-svg" viewBox="0 0 540 84" role="img" aria-label="WANT">
                  <defs>
                    <linearGradient id="want-hero-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#fffdf4" />
                      <stop offset="56%" stop-color="#fde5a6" />
                      <stop offset="100%" stop-color="#f5b13d" />
                    </linearGradient>
                  </defs>
                  <!-- Layered retro arcade pixel depth shadow -->
                  <text
                    x="275"
                    y="69"
                    text-anchor="middle"
                    font-family="'Press Start 2P', monospace"
                    font-size="64"
                    letter-spacing="16"
                    fill="#140620"
                  >WANT</text>
                  <text
                    x="272"
                    y="66"
                    text-anchor="middle"
                    font-family="'Press Start 2P', monospace"
                    font-size="64"
                    letter-spacing="16"
                    fill="#7c35a8"
                    opacity="0.72"
                  >WANT</text>
                  <text
                    x="270"
                    y="63"
                    text-anchor="middle"
                    font-family="'Press Start 2P', monospace"
                    font-size="64"
                    letter-spacing="16"
                    fill="url(#want-hero-fill)"
                  >WANT</text>
                </svg>
              </h1>
              <p class="crt-want-caption">CHAPTER ONE · THE WRONG PERSON</p>
              <div class="crt-want-rule" aria-hidden="true"></div>
            </div>

            <button
              type="button"
              id="crt-start-logo-btn"
              class="crt-start-hero-btn"
              aria-label="Start WANT"
            >
              <svg class="crt-start-svg" viewBox="0 0 640 124" role="img" aria-label="START">
                <defs>
                  <linearGradient id="start-gold-fill" x1="0" y1="0" x2="0.18" y2="1">
                    <stop offset="0%" stop-color="#ffe14d" />
                    <stop offset="48%" stop-color="#ffa914" />
                    <stop offset="100%" stop-color="#f06e00" />
                  </linearGradient>
                  <linearGradient id="start-shine-grad" x1="0" y1="0" x2="1" y2="0.35">
                    <stop offset="0%" stop-color="rgba(255,255,255,0)" />
                    <stop offset="45%" stop-color="rgba(255,252,224,0.45)" />
                    <stop offset="55%" stop-color="rgba(255,252,224,0.45)" />
                    <stop offset="100%" stop-color="rgba(255,255,255,0)" />
                  </linearGradient>
                  <clipPath id="start-text-clip">
                    <text
                      x="320"
                      y="102"
                      text-anchor="middle"
                      font-family="'Press Start 2P', monospace"
                      font-size="88"
                      letter-spacing="6"
                    >START</text>
                  </clipPath>
                </defs>
                <!-- Crisp dark pixel offset drop shadow -->
                <text
                  x="325"
                  y="108"
                  text-anchor="middle"
                  font-family="'Press Start 2P', monospace"
                  font-size="88"
                  letter-spacing="6"
                  fill="#150721"
                >START</text>
                <!-- Main golden-orange pixel fill -->
                <text
                  x="320"
                  y="102"
                  text-anchor="middle"
                  font-family="'Press Start 2P', monospace"
                  font-size="88"
                  letter-spacing="6"
                  fill="url(#start-gold-fill)"
                >START</text>
                <!-- Animated diagonal pixel sheen sweeping across START -->
                <g clip-path="url(#start-text-clip)">
                  <rect class="start-sheen-bar" x="-180" y="0" width="140" height="124" fill="url(#start-shine-grad)" />
                </g>
              </svg>
            </button>

            <p class="crt-ready-prompt" id="crt-ready-prompt">ARE YOU READY?</p>

            <div class="crt-yes-no-row" role="group" aria-label="Ready prompt">
              <button
                type="button"
                id="crt-ready-yes"
                class="arcade-choice-btn is-selected"
                data-ready-choice="yes"
              >
                <span class="choice-label">YES</span>
                <span class="choice-cursor">${CURSOR_TRIANGLE_SVG}</span>
              </button>
              <button
                type="button"
                id="crt-ready-no"
                class="arcade-choice-btn"
                data-ready-choice="no"
              >
                <span class="choice-label">NO</span>
                <span class="choice-cursor">${CURSOR_TRIANGLE_SVG}</span>
              </button>
            </div>

            <p class="crt-ready-hint">
              <span>← →</span> SELECT · <span>ENTER</span> CONFIRM · CLICK <span>YES</span> TO ENTER
            </p>
          </div>

          <!-- STAGE 2: MODE SELECT INSIDE THE CRT (Smooth animated slide-in after YES) -->
          <div class="crt-stage-select" id="crt-stage-select" hidden>
            <div class="crt-select-grid">
              <div class="crt-select-main">
                <div class="crt-select-head">
                  <p class="crt-game-sub">CHAPTER ONE · THE WRONG PERSON</p>
                  <h2 class="crt-select-title">SELECT MODE</h2>
                  <p class="crt-select-tagline">A fractured world asked for someone else. You are here anyway.</p>
                </div>

                <!-- Story Difficulty Toggle (syncs top-right golden hearts!) -->
                <fieldset class="crt-difficulty" aria-describedby="difficulty-note">
                  <legend>Story Difficulty</legend>
                  <div class="difficulty-toggle">
                    <label class="diff-option">
                      <input type="radio" name="difficulty" value="story" checked />
                      <span>Story Mode · 4 ♥</span>
                    </label>
                    <label class="diff-option">
                      <input type="radio" name="difficulty" value="real" />
                      <span>Real Mode · 2 ♥</span>
                    </label>
                  </div>
                </fieldset>
                <p id="difficulty-note" class="crt-diff-note">Half enemy health and damage. Four hits from full health.</p>

                <!-- Primary Arcade Command List with Animated ◀ Cursor -->
                <div class="crt-command-list" id="crt-command-list">
                  <button
                    id="continue-campaign"
                    class="crt-cmd-btn is-primary"
                    type="button"
                    hidden
                    data-start="true"
                  >
                    <span class="cmd-body">
                      <span class="cmd-title">CONTINUE STORY</span>
                      <span id="continue-meta" class="cmd-sub num"></span>
                    </span>
                    <span class="cmd-cursor">${CURSOR_TRIANGLE_SVG}</span>
                  </button>

                  <button
                    id="start-campaign"
                    class="crt-cmd-btn is-primary"
                    type="button"
                    data-start="true"
                  >
                    <span class="cmd-body">
                      <span id="start-label" class="cmd-title">BEGIN STORY</span>
                      <span class="cmd-sub">Campus 2026 → Cebu 2085</span>
                    </span>
                    <span class="cmd-cursor">${CURSOR_TRIANGLE_SVG}</span>
                  </button>

                  <button
                    id="open-horde"
                    class="crt-cmd-btn is-horde"
                    type="button"
                  >
                    <span class="cmd-body">
                      <span class="cmd-title">HORDE MODE</span>
                      <span id="horde-top-note" class="cmd-sub num">1m · 5m · Unlimited</span>
                    </span>
                    <span class="cmd-cursor">${CURSOR_TRIANGLE_SVG}</span>
                  </button>
                </div>

                <div class="crt-utility-row">
                  <button id="open-settings" class="crt-util-btn" type="button">Settings</button>
                  <button id="open-controls" class="crt-util-btn" type="button">Controls</button>
                  <button id="toggle-audio" class="crt-util-btn" type="button" aria-pressed="false">Audio: On</button>
                  ${devCombatButton}
                  ${devRescueButton}
                  <button id="crt-back-ready" class="crt-util-btn" type="button">← Start</button>
                </div>
              </div>

              <!-- Right Character Dossier Card inside CRT -->
              <aside class="crt-poster-card" id="key-art-card" aria-hidden="true">
                <div class="crt-poster-frame">
                  <img src="/assets/characters/k/k-persona-poster.png" alt="" id="key-art-img" />
                  <div class="crt-poster-vignette"></div>
                </div>
                <div class="crt-poster-caption">
                  <span class="num">01 / K</span>
                  <span class="crt-poster-mid">SECTOR 04</span>
                  <span class="num">2026→2085</span>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <!-- HORDE LOBBY INSIDE THE CRT MONITOR -->
        <section id="horde-lobby-section" class="horde-lobby-section" hidden aria-labelledby="horde-title"></section>

        <!-- PLAYABLE GAME SCREEN INSIDE THE CRT MONITOR -->
        <section id="preview" class="preview" hidden aria-label="Game area">
          <header class="preview-header">
            <div class="preview-title-block">
              <span class="preview-eyebrow" id="preview-eyebrow">WANT / CHAPTER ONE</span>
              <p id="mode-label"></p>
            </div>
            <div class="preview-header-actions">
              <button id="preview-audio-toggle" class="crt-util-btn" type="button" aria-pressed="false">Audio: On</button>
              <button id="back-to-menu" class="crt-util-btn is-accent" type="button">Menu <kbd>Esc</kbd></button>
            </div>
          </header>
          <div id="game" role="region" aria-label="Game area. Use WASD or arrow keys to move. E to interact." tabindex="0"></div>
          <div class="preview-footer">
            <p id="preview-footer-hint" class="hint">
              WASD / Arrows: Move · E: Interact / Continue · Click: Fire · Space: Reflex Dodge · R: Snap Reload · Esc: Menu
            </p>
          </div>
        </section>

        <p id="error" role="alert" hidden></p>
      </div>

      <p class="desktop-note">This game is designed for a desktop keyboard and mouse.</p>
    </main>
  </div>

  <dialog id="controls" aria-labelledby="controls-title">
    <h2 id="controls-title">Find your footing.</h2>
    <p><kbd>WASD</kbd> or <kbd>↑ ↓ ← →</kbd> Move through rooms or weave across combat arenas.</p>
    <p><kbd>E</kbd> Interact with people, props, and gate switches. Advance dialogue.</p>
    <p><kbd>Left Click</kbd> Fire your weapon or Counter Rail (hold for Machine Gun / Minigun).</p>
    <p><kbd>1–5</kbd>, <kbd>Q</kbd>, or <kbd>Scroll</kbd> Switch Horde weapons (Pistol, MG, Sniper, Minigun, Rocket).</p>
    <p><kbd>Space</kbd> Advance dialogue, or Reflex Dodge through attacks to trigger Bullet-Time.</p>
    <p><kbd>R</kbd> Reload your weapon. Press again in the gold sweet spot for a Snap Reload.</p>
    <p><kbd>Esc</kbd> Skip dialogue, pause combat, or return to the arcade menu.</p>
    <p>Menus work with Arrow keys, Tab, and Enter. Your system's reduced-motion preference is respected.</p>
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

const crtMonitor = document.querySelector<HTMLElement>('#crt-monitor')!;
const crtWarpFlash = document.querySelector<HTMLElement>('#crt-warp-flash')!;
const crtStandby = document.querySelector<HTMLElement>('#crt-standby')!;
const crtWakeBtn = document.querySelector<HTMLButtonElement>('#crt-wake-btn')!;
const crtHiScoreValue = document.querySelector<HTMLElement>('#crt-hiscore-value')!;
const crtHearts = [...document.querySelectorAll<HTMLElement>('.crt-heart')];
const crtStageReady = document.querySelector<HTMLElement>('#crt-stage-ready')!;
const crtStageSelect = document.querySelector<HTMLElement>('#crt-stage-select')!;
const crtStartLogoBtn = document.querySelector<HTMLButtonElement>('#crt-start-logo-btn')!;
const crtReadyYesBtn = document.querySelector<HTMLButtonElement>('#crt-ready-yes')!;
const crtReadyNoBtn = document.querySelector<HTMLButtonElement>('#crt-ready-no')!;
const crtBackReadyBtn = document.querySelector<HTMLButtonElement>('#crt-back-ready')!;

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
let activeMode: 'ready' | 'select' | 'standby' | 'horde-setup' | 'story' | 'horde' | 'dev' = 'ready';
let readyChoice: 'yes' | 'no' = 'yes';
let displayedHiScore = -1;
let hiScoreRafId: number | null = null;
let warpTimerId: number | null = null;
let activeDuel: DuelSession | null = loadStoredDuelSession();
const duelBackend = getHordeDuelBackend();

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

function syncReducedMotionClass(): void {
  crtMonitor.classList.toggle('is-reduced-motion', isReducedMotion());
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
syncReducedMotionClass();
// Register cache-first Service Worker immediately so all art & audio stay snappy
// even under severe network fluctuations.
registerOfflineCache();

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
  syncReducedMotionClass();
};

const toggleMute = (): void => {
  audio.unlock();
  savePrefs({ ...preferences, muted: !preferences.muted });
  if (!preferences.muted) {
    audio.playCue('ui-confirm');
    if (activeMode === 'ready' || activeMode === 'select' || activeMode === 'horde-setup') {
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
  if (activeMode === 'ready' || activeMode === 'select' || activeMode === 'horde-setup') {
    audio.setSceneAudio('campus', 'campus');
  }
};
window.addEventListener('pointerdown', unlockAudioOnce, { once: true });
window.addEventListener('keydown', unlockAudioOnce, { once: true });

function selectedDifficulty(): Difficulty {
  return document.querySelector<HTMLInputElement>('input[name="difficulty"]:checked')!.value as Difficulty;
}

function formatArcadeHiScore(value: number): string {
  const clamped = Math.max(0, Math.round(value));
  return String(clamped).padStart(6, '0');
}

function animateHiScoreTo(target: number): void {
  if (hiScoreRafId !== null) {
    cancelAnimationFrame(hiScoreRafId);
    hiScoreRafId = null;
  }
  if (isReducedMotion() || displayedHiScore === target) {
    displayedHiScore = target;
    crtHiScoreValue.textContent = formatArcadeHiScore(target);
    return;
  }
  const from = displayedHiScore < 0 ? 0 : displayedHiScore;
  const start = performance.now();
  const duration = 680;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = Math.round(from + (target - from) * eased);
    crtHiScoreValue.textContent = formatArcadeHiScore(current);
    if (t < 1) {
      hiScoreRafId = requestAnimationFrame(tick);
    } else {
      displayedHiScore = target;
      hiScoreRafId = null;
    }
  };
  hiScoreRafId = requestAnimationFrame(tick);
}

function updateHeartsDisplay(litCount: number, pop = false): void {
  const clamped = Math.max(0, Math.min(5, litCount));
  crtHearts.forEach((heart, idx) => {
    const lit = idx < clamped;
    heart.classList.toggle('is-lit', lit);
    heart.classList.toggle('is-dim', !lit);
    if (pop && lit && !isReducedMotion()) {
      heart.classList.remove('is-popping');
      void heart.offsetWidth;
      heart.classList.add('is-popping');
    }
  });
}

function syncHeartsForCurrentView(pop = false): void {
  if (activeMode === 'ready') {
    updateHeartsDisplay(5, pop);
    return;
  }
  const diff = selectedDifficulty();
  const maxHits = diff === 'story' ? 4 : 2;
  if (savedRun && savedRun.difficulty === diff && savedRun.rescueStatus !== 'complete') {
    const hitDmg = diff === 'story' ? 25 : 50;
    const remaining = Math.max(1, Math.ceil(savedRun.health / hitDmg));
    updateHeartsDisplay(Math.min(maxHits, remaining), pop);
  } else {
    updateHeartsDisplay(maxHits, pop);
  }
}

function updateDifficultyNote(diff: Difficulty, popHearts = false): void {
  document.querySelector('#difficulty-note')!.textContent = diff === 'story'
    ? 'Half enemy health and damage. Four hits from full health.'
    : 'Two hits from full health. Damage persists until a major achievement.';
  syncHeartsForCurrentView(popHearts);
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

function getActiveCommandButtons(): HTMLButtonElement[] {
  return [continueBtn, startBtn, hordeBtn].filter((btn) => !btn.hidden);
}

function highlightCommandButton(target: HTMLButtonElement): void {
  getActiveCommandButtons().forEach((btn) => {
    btn.classList.toggle('is-active-cmd', btn === target);
  });
}

function refreshMenuState(): void {
  const result = loadRun();
  const storyRead = loadStoryProgress();
  savedStory = storyRead.status === 'ok' ? storyRead.snapshot : null;

  if (result.status === 'ok') {
    savedRun = result.state;
    continueBtn.hidden = false;
    continueMeta.textContent = formatSavedLocation(savedRun, savedStory);
    startBtn.classList.remove('is-primary');
    startBtn.classList.add('is-secondary');
    startLabel.textContent = 'NEW STORY';

    const radio = document.querySelector<HTMLInputElement>(`input[name="difficulty"][value="${savedRun.difficulty}"]`);
    if (radio) radio.checked = true;
    updateDifficultyNote(savedRun.difficulty);
    highlightCommandButton(continueBtn);
  } else {
    savedRun = null;
    continueBtn.hidden = true;
    startBtn.classList.remove('is-secondary');
    startBtn.classList.add('is-primary');
    startLabel.textContent = 'BEGIN STORY';
    highlightCommandButton(startBtn);
  }
  showStorageMessage(result.status);

  // Sync arcade HI-SCORE and Horde top note from persisted local scores
  const scores = loadHordeScores();
  if (scores.length > 0) {
    hordeTopNote.textContent = `Top: ${formatScore(scores[0].score)} · ${scores[0].playerName}`;
    animateHiScoreTo(scores[0].score);
  } else {
    hordeTopNote.textContent = '1m · 5m · Unlimited';
    animateHiScoreTo(0);
  }
  syncHeartsForCurrentView(false);
}

/** Triggers a crisp CRT warp/channel-switch transition when moving between screens. */
function playCrtTransition(kind: 'warp' | 'snap', onMidpoint: () => void): void {
  if (warpTimerId !== null) {
    window.clearTimeout(warpTimerId);
    warpTimerId = null;
  }
  if (isReducedMotion()) {
    onMidpoint();
    return;
  }
  crtMonitor.classList.remove('crt-warping', 'crt-snapping', 'crt-entering');
  crtWarpFlash.classList.remove('is-flashing');
  void crtMonitor.offsetWidth;

  if (kind === 'warp') {
    crtMonitor.classList.add('crt-warping');
    crtWarpFlash.classList.add('is-flashing');
    warpTimerId = window.setTimeout(() => {
      onMidpoint();
      crtMonitor.classList.remove('crt-warping');
      crtMonitor.classList.add('crt-entering');
      warpTimerId = window.setTimeout(() => {
        crtMonitor.classList.remove('crt-entering');
        crtWarpFlash.classList.remove('is-flashing');
        warpTimerId = null;
        if (game) window.dispatchEvent(new Event('resize'));
      }, 340);
    }, 170);
  } else {
    crtMonitor.classList.add('crt-snapping');
    warpTimerId = window.setTimeout(() => {
      onMidpoint();
      crtMonitor.classList.remove('crt-snapping');
      crtMonitor.classList.add('crt-entering');
      warpTimerId = window.setTimeout(() => {
        crtMonitor.classList.remove('crt-entering');
        warpTimerId = null;
      }, 280);
    }, 110);
  }
}

function setReadyChoice(choice: 'yes' | 'no', playSound = false): void {
  if (readyChoice !== choice && playSound) {
    audio.unlock();
    audio.playCue('ui-confirm');
  }
  readyChoice = choice;
  crtReadyYesBtn.classList.toggle('is-selected', choice === 'yes');
  crtReadyNoBtn.classList.toggle('is-selected', choice === 'no');
  crtReadyYesBtn.setAttribute('aria-pressed', String(choice === 'yes'));
  crtReadyNoBtn.setAttribute('aria-pressed', String(choice === 'no'));
}

function setView(view: 'ready' | 'select' | 'standby' | 'horde-setup' | 'playing'): void {
  const isMenuView = view === 'ready' || view === 'select';
  menu.hidden = !isMenuView;
  crtStageReady.hidden = view !== 'ready';
  crtStageSelect.hidden = view !== 'select';
  crtStandby.hidden = view !== 'standby';
  hordeLobbySection.hidden = view !== 'horde-setup';
  preview.hidden = view !== 'playing';

  crtMonitor.classList.toggle('is-playing', view === 'playing');
  crtMonitor.classList.toggle('is-horde-lobby', view === 'horde-setup');
  crtMonitor.classList.toggle('is-standby', view === 'standby');

  if (view === 'ready') {
    activeMode = 'ready';
    document.body.dataset.state = 'title';
    document.body.dataset.screen = 'ready';
    delete document.body.dataset.scene;
    delete document.body.dataset.map;
    delete document.body.dataset.tile;
    delete document.body.dataset.beat;
    setReadyChoice('yes', false);
    syncHeartsForCurrentView(false);
  } else if (view === 'select') {
    activeMode = 'select';
    document.body.dataset.state = 'title';
    document.body.dataset.screen = 'select';
    delete document.body.dataset.scene;
    delete document.body.dataset.map;
    delete document.body.dataset.tile;
    delete document.body.dataset.beat;
    syncHeartsForCurrentView(true);
  } else if (view === 'standby') {
    activeMode = 'standby';
    document.body.dataset.state = 'standby';
    document.body.dataset.screen = 'standby';
  } else if (view === 'horde-setup') {
    activeMode = 'horde-setup';
    document.body.dataset.state = 'horde-setup';
    document.body.dataset.screen = 'horde-setup';
  } else {
    document.body.dataset.state = 'playing';
    document.body.dataset.screen = 'playing';
  }
}

function confirmReadyYes(): void {
  if (activeMode !== 'ready') return;
  audio.unlock();
  audio.playCue('counter-ready');
  // Lazily pre-warm Phaser bundle + core assets once the player enters Mode Select
  // so launching Story, Rescue, or Horde feels instantaneous.
  warmGameModule();
  warmCriticalAssets();
  crtReadyYesBtn.classList.add('is-confirmed');
  playCrtTransition('warp', () => {
    crtReadyYesBtn.classList.remove('is-confirmed');
    refreshMenuState();
    setView('select');
    (savedRun ? continueBtn : startBtn).focus({ preventScroll: true });
  });
}

function confirmReadyNo(): void {
  if (activeMode !== 'ready') return;
  audio.unlock();
  audio.playCue('power-cut');
  setView('standby');
  crtWakeBtn.focus({ preventScroll: true });
}

function wakeFromStandby(): void {
  if (activeMode !== 'standby') return;
  audio.unlock();
  audio.playCue('ui-confirm');
  audio.setSceneAudio('campus', 'campus');
  crtMonitor.classList.remove('crt-booting');
  void crtMonitor.offsetWidth;
  crtMonitor.classList.add('crt-booting');
  setView('ready');
  crtReadyYesBtn.focus({ preventScroll: true });
}

function destroyActiveGame(flushStorySave: boolean): void {
  if (flushStorySave) {
    window.dispatchEvent(new CustomEvent('want:flush-save'));
  }
  destroyCutscenePlayer();
  destroyEndingScreen();
  destroyRescueFailedScreen();
  destroyHordeResults();
  delete document.body.dataset.kHp;
  delete document.body.dataset.linaHp;
  delete document.body.dataset.rescueFailedReason;
  if (game) {
    game.destroy(true);
    game = undefined;
  }
}

function returnToTitle(flushStorySave = true, targetStage: 'select' | 'ready' = 'select'): void {
  destroyActiveGame(flushStorySave);
  refreshMenuState();
  errorBox.hidden = true;
  startBtn.disabled = false;
  continueBtn.disabled = false;
  audio.setSceneAudio('campus', 'campus');
  playCrtTransition('snap', () => {
    setView(targetStage);
    if (targetStage === 'ready') {
      crtReadyYesBtn.focus({ preventScroll: true });
    } else {
      (savedRun ? continueBtn : startBtn).focus({ preventScroll: true });
    }
  });
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
  startLabel.textContent = 'LOADING…';
  errorBox.hidden = true;
  try {
    const { createGame } = await loadGameModule();
    const resumeRescue =
      initialState.checkpoint === 'rescue-start' && initialState.rescueStatus !== 'complete';

    previewEyebrow.textContent = 'WANT / CHAPTER ONE';
    document.querySelector('#mode-label')!.textContent = resumeRescue
      ? `${difficultyRules[difficulty].label} · Rescue Mission`
      : `${difficultyRules[difficulty].label} · Chapter One`;
    previewFooterHint.textContent =
      'WASD / Arrows: Move  ·  E: Interact / Continue  ·  Click: Fire  ·  Space: Continue / Reflex Dodge  ·  R: Snap Reload  ·  Esc: Menu';

    playCrtTransition('warp', () => {
      activeMode = 'story';
      setView('playing');
      game = createGame(
        gameHost,
        resumeRescue ? 'rescue' : 'world',
        difficulty,
        initialState,
        { storySnapshot },
      );
      gameHost.focus({ preventScroll: true });
    });
  } catch {
    setView('select');
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
  const storyRead = loadStoryProgress();
  const snapshot = storyRead.status === 'ok' ? storyRead.snapshot : null;
  void launchStoryWorld(savedRun.difficulty, savedRun, snapshot);
}

let lastHordeConfig: HordeConfig | null = null;

async function launchHordeGame(config: HordeConfig): Promise<void> {
  if (launching || game) return;
  launching = true;
  lastHordeConfig = config;
  errorBox.hidden = true;
  try {
    const { createGame } = await loadGameModule();
    const diff = hordeDifficultyRules[config.difficulty];
    const dur = hordeDurationRules[config.duration];
    const mapLabel = config.mapChoice && config.mapChoice !== 'random'
      ? hordeMaps[config.mapChoice].name
      : 'Random Arena';
    const duelTag = activeDuel && activeDuel.room.seed === config.seed
      ? ` · DUEL ${activeDuel.room.code} P${activeDuel.seat}`
      : '';
    previewEyebrow.textContent = `WANT / HORDE ARENA · ${config.playerName.toUpperCase()}${duelTag}`;
    document.querySelector('#mode-label')!.textContent =
      `${mapLabel} · ${diff.label} (${formatScore(diff.difficultyFactor)}×) · ${dur.label}`;
    previewFooterHint.textContent =
      'WASD: Move · Click/Hold: Fire · 1-5 / Q / Scroll: Switch Weapon · Space: Reflex Dodge · R: Snap Reload · Esc / P: Pause';

    playCrtTransition('warp', () => {
      activeMode = 'horde';
      setView('playing');
      game = createGame(gameHost, 'horde', 'real', undefined, { hordeConfig: config });
      gameHost.focus({ preventScroll: true });
    });
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
    const { createGame } = await loadGameModule();
    const difficulty = overrideState?.difficulty ?? selectedDifficulty();
    previewEyebrow.textContent = 'WANT / CHAPTER ONE';
    document.querySelector('#mode-label')!.textContent = modeLabel;
    playCrtTransition('warp', () => {
      activeMode = 'dev';
      setView('playing');
      game = createGame(gameHost, sceneKey, difficulty, overrideState);
      gameHost.focus({ preventScroll: true });
    });
  } catch {
    setView('select');
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
  duelBackend,
  onLaunch: (config) => {
    void launchHordeGame(config);
  },
  onDuelLaunch: (session) => {
    activeDuel = session;
    saveStoredDuelSession(session);
    const playerName = session.room.players.find((p) => p.seat === session.seat)?.name ?? 'Agent';
    void launchHordeGame({
      playerName,
      difficulty: session.room.difficulty,
      duration: session.room.duration,
      seed: session.room.seed,
    });
  },
  onBack: () => {
    returnToTitle(false, 'select');
  },
});

function openHordeLobby(): void {
  destroyActiveGame(false);
  if (!activeDuel) activeDuel = loadStoredDuelSession();
  hordeLobby.setDuelSession(activeDuel);
  hordeLobby.refresh();
  audio.setSceneAudio('campus', 'campus');
  playCrtTransition('warp', () => {
    setView('horde-setup');
    const input = hordeLobbySection.querySelector<HTMLInputElement>('#horde-player-name');
    input?.focus({ preventScroll: true });
  });
}

// Wire Stage 1 (READY) interactions
crtStartLogoBtn.addEventListener('click', () => {
  setReadyChoice('yes', false);
  confirmReadyYes();
});
crtReadyYesBtn.addEventListener('pointerenter', () => setReadyChoice('yes', true));
crtReadyYesBtn.addEventListener('focus', () => setReadyChoice('yes', false));
crtReadyYesBtn.addEventListener('click', () => {
  setReadyChoice('yes', false);
  confirmReadyYes();
});

crtReadyNoBtn.addEventListener('pointerenter', () => setReadyChoice('no', true));
crtReadyNoBtn.addEventListener('focus', () => setReadyChoice('no', false));
crtReadyNoBtn.addEventListener('click', () => {
  setReadyChoice('no', false);
  confirmReadyNo();
});

crtWakeBtn.addEventListener('click', wakeFromStandby);
crtStandby.addEventListener('click', (event) => {
  if (event.target === crtStandby) wakeFromStandby();
});

crtBackReadyBtn.addEventListener('click', () => {
  audio.unlock();
  audio.playCue('ui-confirm');
  playCrtTransition('snap', () => {
    setView('ready');
    crtReadyYesBtn.focus({ preventScroll: true });
  });
});

// Wire Stage 2 command list hover/focus cursor animation
[continueBtn, startBtn, hordeBtn].forEach((btn) => {
  btn.addEventListener('pointerenter', () => {
    if (!btn.classList.contains('is-active-cmd')) {
      highlightCommandButton(btn);
    }
  });
  btn.addEventListener('focus', () => highlightCommandButton(btn));
});

// Keyboard arcade navigation for READY, STANDBY, and MODE SELECT screens
window.addEventListener('keydown', (event) => {
  if (document.querySelector('dialog[open]') || document.querySelector('#cutscene:not([hidden])')) {
    return;
  }
  if (activeMode === 'standby') {
    event.preventDefault();
    wakeFromStandby();
    return;
  }
  if (activeMode === 'ready') {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
      event.preventDefault();
      setReadyChoice('yes', true);
      crtReadyYesBtn.focus({ preventScroll: true });
    } else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      setReadyChoice('no', true);
      crtReadyNoBtn.focus({ preventScroll: true });
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (readyChoice === 'yes') confirmReadyYes();
      else confirmReadyNo();
    }
    return;
  }
  if (activeMode === 'select') {
    const cmds = getActiveCommandButtons();
    const currentIdx = Math.max(0, cmds.findIndex((b) => b.classList.contains('is-active-cmd')));
    if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
      event.preventDefault();
      const next = cmds[(currentIdx + 1) % cmds.length];
      audio.playCue('ui-confirm');
      highlightCommandButton(next);
      next.focus({ preventScroll: true });
    } else if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
      event.preventDefault();
      const prev = cmds[(currentIdx - 1 + cmds.length) % cmds.length];
      audio.playCue('ui-confirm');
      highlightCommandButton(prev);
      prev.focus({ preventScroll: true });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      audio.playCue('ui-confirm');
      playCrtTransition('snap', () => {
        setView('ready');
        crtReadyYesBtn.focus({ preventScroll: true });
      });
    }
  }
});

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
    updateDifficultyNote(input.value as Difficulty, true);
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
  returnToTitle(activeMode === 'story', 'select');
});

document.querySelector('#back-to-menu')!.addEventListener('click', () => {
  audio.playCue('ui-confirm');
  if (activeMode === 'horde') {
    openHordeLobby();
    return;
  }
  returnToTitle(activeMode === 'story', 'select');
});

// Dedicated Rescue Mission Failed / Restart Rescue overlay
window.addEventListener('want:rescue-failed', (event: Event) => {
  const detail = (event as CustomEvent<RescueFailedDetail>).detail;
  if (!detail) return;
  showRescueFailedScreen({
    ...detail,
    reducedMotion: isReducedMotion(),
    onRestartRescue: () => {
      window.dispatchEvent(new CustomEvent('want:rescue-restart'));
      gameHost.focus({ preventScroll: true });
    },
    onReturnToTitle: () => {
      returnToTitle(false, 'select');
    },
  });
});

// Animated Chapter One Ending overlay
window.addEventListener('want:chapter-ending', (event: Event) => {
  const detail = (event as CustomEvent<{ difficulty?: Difficulty }>).detail;
  const diff: Difficulty = detail?.difficulty ?? savedRun?.difficulty ?? selectedDifficulty();

  if (game) {
    game.destroy(true);
    game = undefined;
  }
  destroyCutscenePlayer();
  destroyRescueFailedScreen();
  preview.hidden = true;
  menu.hidden = true;
  hordeLobbySection.hidden = true;
  crtStandby.hidden = true;

  showEndingScreen({
    difficultyLabel: difficultyRules[diff].label,
    reducedMotion: isReducedMotion(),
    onReturnToTitle: () => {
      returnToTitle(false, 'select');
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

// Keep gameplay header synced whenever Horde Arena resolves a concrete map (e.g. Random)
window.addEventListener('want:horde-map-active', (event: Event) => {
  const detail = (event as CustomEvent<{ mapId?: HordeMapId }>).detail;
  if (!detail?.mapId || !lastHordeConfig || activeMode !== 'horde') return;
  const diff = hordeDifficultyRules[lastHordeConfig.difficulty];
  const dur = hordeDurationRules[lastHordeConfig.duration];
  const mapName = hordeMaps[detail.mapId].name;
  document.querySelector('#mode-label')!.textContent =
    `${mapName} · ${diff.label} (${formatScore(diff.difficultyFactor)}×) · ${dur.label}`;
});

// Horde Mode post-run results & scoreboard overlay
window.addEventListener('want:horde-finished', (event: Event) => {
  const result = (event as CustomEvent<HordeRunResult>).detail;
  if (!result) return;
  const duel = activeDuel && activeDuel.room.seed === result.seed
    ? { session: activeDuel, backend: duelBackend }
    : undefined;
  showHordeResults({
    result,
    duel,
    onPlayAgain: (config) => {
      const nextConfig: HordeConfig = {
        ...config,
        mapChoice: lastHordeConfig?.mapChoice ?? config.mapChoice,
        initialWeapon: lastHordeConfig?.initialWeapon ?? config.initialWeapon,
      };
      window.dispatchEvent(new CustomEvent('want:horde-restart', { detail: nextConfig }));
    },
    onChangeSetup: () => {
      openHordeLobby();
    },
    onDuelLobby: () => {
      openHordeLobby();
    },
    onReturnToMenu: () => {
      returnToTitle(false, 'select');
    },
  });
  refreshMenuState();
});

// Subtle mouse parallax on K's poster inside Mode Select
const keyArtCard = document.querySelector<HTMLElement>('#key-art-card');
const keyArtImg = document.querySelector<HTMLElement>('#key-art-img');
if (keyArtCard && keyArtImg) {
  keyArtCard.addEventListener('pointermove', (event) => {
    if (isReducedMotion()) return;
    const rect = keyArtCard.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    keyArtImg.style.transform = `scale(1.035) translate(${(-nx * 8).toFixed(1)}px, ${(-ny * 8).toFixed(1)}px)`;
  });
  keyArtCard.addEventListener('pointerleave', () => {
    keyArtImg.style.transform = 'scale(1.01) translate(0px, 0px)';
  });
}

// Clear initial CRT boot animation class once finished so later transitions work cleanly
window.setTimeout(() => {
  crtMonitor.classList.remove('crt-booting');
}, 820);

// Initialize state & query-string dev/review routes
refreshMenuState();

const params = new URLSearchParams(window.location.search);
const cutsceneId = params.get('cutscene');
if (cutsceneId) {
  menu.hidden = true;
  preview.hidden = true;
  audio.unlock();
  playCutsceneOverlay({
    cutsceneId,
    reducedMotion: isReducedMotion(),
    onComplete: () => {
      returnToTitle(false, 'select');
    },
  });
} else if (params.get('ending') === '1') {
  setView('select');
  window.dispatchEvent(
    new CustomEvent('want:chapter-ending', {
      detail: { difficulty: selectedDifficulty() },
    }),
  );
} else if (params.get('horde') === '1') {
  warmGameModule();
  setView('horde-setup');
  hordeLobby.refresh();
} else if (params.get('rescue') === '1') {
  const diff = selectedDifficulty();
  const rescueState: RunState = {
    ...newRun(diff),
    checkpoint: 'rescue-start',
    rescueStatus: 'active',
  };
  void launchDevScene('rescue', `Rescue mission · ${difficultyRules[diff].label}`, rescueState);
} else if (params.get('screen') === 'select') {
  warmGameModule();
  warmCriticalAssets();
  setView('select');
} else if (params.get('autostart') === '1') {
  const diff = selectedDifficulty();
  if (savedRun) {
    continueSavedRun();
  } else {
    startNewRun(diff);
  }
} else {
  setView('ready');
}
