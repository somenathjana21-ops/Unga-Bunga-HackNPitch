// Dedicated Rescue Mission Failed / Restart Rescue overlay screen.
// Matches the Arcade CRT aesthetic and gives players clear tactical feedback
// whether Lina fell or K went down, plus instant one-click / R / Enter restart
// that resets the rescue attempt cleanly without losing Story Mode progress.

import { audio } from '../services/audio';
import type { RescueFailureReason } from '../game/combat/rescue-defense';
import type { RescueBeatId } from '../game/combat/rescue-switch';

export interface RescueFailedDetail {
  reason: RescueFailureReason;
  beatId: RescueBeatId;
  difficultyLabel: string;
  kHealth: number;
  linaHealth: number;
  intercepts: number;
}

export interface RescueFailedScreenOptions extends RescueFailedDetail {
  reducedMotion: boolean;
  onRestartRescue: () => void;
  onReturnToTitle: () => void;
}

const BEAT_NAMES: Record<RescueBeatId, string> = {
  alley: 'Beat 1/3 · Alley Approach',
  hold: 'Beat 2/3 · Shelter Hold',
  extraction: 'Beat 3/3 · Gate Extraction',
};

let overlay: HTMLElement | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;

export function isRescueFailedScreenActive(): boolean {
  return overlay !== null && !overlay.hidden;
}

export function destroyRescueFailedScreen(): void {
  if (keyHandler) {
    window.removeEventListener('keydown', keyHandler, true);
    keyHandler = null;
  }
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}

export function showRescueFailedScreen(options: RescueFailedScreenOptions): void {
  destroyRescueFailedScreen();
  document.body.dataset.state = 'rescue-failed';
  document.body.dataset.rescueFailedReason = options.reason;

  const isLinaDown = options.reason === 'lina-down';
  const headline = isLinaDown ? 'LINA WAS LOST' : 'K FELL IN THE YARD';
  const summary = isLinaDown
    ? 'The breach machines broke through to Lina’s shelter. Cut down flanking machines first, or step into their line of fire to body-block or Reflex Dodge shots aimed at her.'
    : 'K couldn’t make it through the warehouse yard. Use cover, Reflex Dodge through red telegraphs, and counter-rail exposed machines to keep both of you alive.';
  const tip = isLinaDown
    ? 'TACTICAL TIP · Watch for pulsing crimson TARGET: LINA lines — stand in front of Lina to intercept fire or dodge through it for a Counter Rail.'
    : 'TACTICAL TIP · Space grants brief dodge invulnerability and opens Bullet-Time Counter Rail on close grazes.';

  overlay = document.createElement('div');
  overlay.id = 'rescue-failed-screen';
  overlay.className = `rescue-failed-overlay${options.reducedMotion ? ' is-reduced-motion' : ''}`;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'rescue-failed-title');

  overlay.innerHTML = `
    <div class="rescue-failed-backdrop" aria-hidden="true">
      <img
        src="/assets/backgrounds/twilight-ruins-warehouse-yard.png"
        alt=""
        class="rescue-failed-bg-img"
      />
      <div class="rescue-failed-scrim"></div>
      <div class="rescue-failed-scanlines"></div>
    </div>

    <div class="rescue-failed-card">
      <div class="rescue-failed-badge-row">
        <span class="rescue-failed-alert-dot" aria-hidden="true"></span>
        <span class="rescue-failed-kicker">RESCUE ATTEMPT FAILED · ${options.difficultyLabel.toUpperCase()}</span>
      </div>

      <h2 id="rescue-failed-title" class="rescue-failed-title">${headline}</h2>
      <p class="rescue-failed-summary">${summary}</p>

      <div class="rescue-failed-metrics" aria-label="Rescue attempt summary">
        <div class="rescue-metric">
          <span class="rescue-metric-label">STAGE REACHED</span>
          <strong class="rescue-metric-value">${BEAT_NAMES[options.beatId]}</strong>
        </div>
        <div class="rescue-metric ${options.kHealth <= 0 ? 'is-critical' : ''}">
          <span class="rescue-metric-label">K RESOLVE</span>
          <strong class="rescue-metric-value num">${Math.max(0, Math.round(options.kHealth))} / 100</strong>
        </div>
        <div class="rescue-metric ${options.linaHealth <= 0 ? 'is-critical' : ''}">
          <span class="rescue-metric-label">LINA HEALTH</span>
          <strong class="rescue-metric-value num">${Math.max(0, Math.round(options.linaHealth))} / 100</strong>
        </div>
        <div class="rescue-metric">
          <span class="rescue-metric-label">INTERCEPTS</span>
          <strong class="rescue-metric-value num">${options.intercepts}</strong>
        </div>
      </div>

      <p class="rescue-failed-tip">${tip}</p>

      <div class="rescue-failed-actions">
        <button type="button" id="rescue-restart-btn" class="rescue-btn-primary">
          <span>RESTART RESCUE MISSION</span>
          <kbd>R / Enter</kbd>
        </button>
        <button type="button" id="rescue-title-btn" class="rescue-btn-secondary">
          <span>Return to Title</span>
          <kbd>Esc</kbd>
        </button>
      </div>

      <p class="rescue-failed-note">
        Restarting restores K &amp; Lina to full health at the warehouse alley without resetting your Story progress.
      </p>
    </div>
  `;

  document.body.appendChild(overlay);

  const restartBtn = overlay.querySelector<HTMLButtonElement>('#rescue-restart-btn')!;
  const titleBtn = overlay.querySelector<HTMLButtonElement>('#rescue-title-btn')!;

  const triggerRestart = () => {
    audio.unlock();
    audio.playCue('ui-confirm');
    destroyRescueFailedScreen();
    delete document.body.dataset.rescueFailedReason;
    document.body.dataset.state = 'playing';
    options.onRestartRescue();
  };

  const triggerReturn = () => {
    audio.unlock();
    audio.playCue('ui-confirm');
    destroyRescueFailedScreen();
    delete document.body.dataset.rescueFailedReason;
    options.onReturnToTitle();
  };

  restartBtn.addEventListener('click', triggerRestart);
  titleBtn.addEventListener('click', triggerReturn);

  // Guard against held keys at moment of defeat (260ms buffer)
  const openedAt = performance.now();
  keyHandler = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (performance.now() - openedAt < 260) return;

    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      event.stopImmediatePropagation();
      triggerRestart();
    } else if (event.key === 'Enter' && document.activeElement !== titleBtn) {
      event.preventDefault();
      event.stopImmediatePropagation();
      triggerRestart();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      triggerReturn();
    }
  };
  window.addEventListener('keydown', keyHandler, true);

  restartBtn.focus({ preventScroll: true });
}
