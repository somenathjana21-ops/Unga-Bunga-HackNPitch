// Horde Mode Setup + Scoreboard + Post-Run Results UI.
// Asks for the player's name before launching, exposes 1m / 5m / Unlimited and
// Easy / Medium / Hard / Maniac / DOOM (10-fold difficulty scaling per tier),
// and renders the persisted local scoreboard.

import {
  HORDE_DIFFICULTIES,
  HORDE_DURATIONS,
  formatHordeClock,
  formatScore,
  hordeDifficultyRules,
  hordeDurationRules,
  normalizePlayerName,
  type HordeDifficulty,
  type HordeDuration,
} from '../game/horde/rules';
import type { HordeConfig, HordeRunResult } from '../game/scenes/HordeScene';
import {
  filterHordeScores,
  loadHordeScores,
  loadLastHordePlayer,
  saveHordeScore,
  saveLastHordePlayer,
  type HordeScoreEntry,
} from '../services/horde-scores';
import { audio } from '../services/audio';

export interface HordeLobbyOptions {
  onLaunch: (config: HordeConfig) => void;
  onBack: () => void;
}

export interface HordeResultOptions {
  result: HordeRunResult;
  onPlayAgain: (config: HordeConfig) => void;
  onChangeSetup: () => void;
  onReturnToMenu: () => void;
}

let resultsOverlay: HTMLElement | null = null;
let resultsKeyHandler: ((e: KeyboardEvent) => void) | null = null;

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderScoreRows(
  scores: readonly HordeScoreEntry[],
  highlightId?: string,
  highlightPlayer?: string,
): string {
  if (scores.length === 0) {
    return `
      <tr>
        <td colspan="6" class="horde-empty-row">
          No runs recorded for this filter yet. Enter your callsign and deploy to claim the first rank.
        </td>
      </tr>
    `;
  }
  return scores.slice(0, 12).map((entry, index) => {
    const diff = hordeDifficultyRules[entry.difficulty];
    const dur = hordeDurationRules[entry.duration];
    const isCurrent = highlightId
      ? entry.id === highlightId
      : Boolean(highlightPlayer && entry.playerName.toLowerCase() === highlightPlayer.toLowerCase());
    const outcome = entry.cleared ? 'Cleared' : `Wave ${entry.waveReached}`;
    return `
      <tr class="${isCurrent ? 'is-highlight' : ''}">
        <td class="num">#${index + 1}</td>
        <td class="player-cell">${escapeHtml(entry.playerName)}</td>
        <td><span class="diff-label" style="color:${diff.accentHex}">${diff.label}</span></td>
        <td>${dur.label} · ${outcome}</td>
        <td class="num">${entry.kills} (${formatHordeClock(entry.survivedSeconds)})</td>
        <td class="num score-cell">${formatScore(entry.score)}</td>
      </tr>
    `;
  }).join('');
}

/** Renders and wires the Horde Mode setup & live scoreboard section inside the host element. */
export function mountHordeLobby(host: HTMLElement, options: HordeLobbyOptions): { refresh: () => void } {
  let selectedDifficulty: HordeDifficulty = 'easy';
  let selectedDuration: HordeDuration = '1m';
  let scoreFilter: HordeDifficulty | 'all' = 'all';

  host.innerHTML = `
    <div class="horde-lobby">
      <div class="horde-lobby-header">
        <div>
          <p class="eyebrow">Resistance Trials · Standalone Combat Mode</p>
          <h2 id="horde-title" class="horde-heading">Horde Arena</h2>
          <p class="horde-sub">
            Survive escalating machine waves. Each tier multiplies threat intensity and score yield tenfold.
          </p>
        </div>
        <button type="button" id="horde-back-menu" class="secondary">Back to Title</button>
      </div>

      <div class="horde-grid">
        <form id="horde-setup-form" class="horde-config-panel" novalidate>
          <div class="horde-field">
            <label for="horde-player-name" class="horde-label">Player Name</label>
            <input
              id="horde-player-name"
              name="playerName"
              type="text"
              maxlength="24"
              autocomplete="nickname"
              placeholder="Enter your callsign (e.g. K-85)"
              class="horde-input"
              required
            />
            <p id="horde-name-error" class="horde-field-error" role="alert" hidden></p>
          </div>

          <div class="horde-field">
            <span class="horde-label">Time Mode</span>
            <div class="horde-duration-group" role="group" aria-label="Horde duration">
              ${HORDE_DURATIONS.map((id) => {
                const d = hordeDurationRules[id];
                return `
                  <button
                    type="button"
                    class="horde-seg-btn${id === selectedDuration ? ' is-active' : ''}"
                    data-duration="${id}"
                    aria-pressed="${id === selectedDuration}"
                  >
                    <span class="seg-title">${d.label}</span>
                    <span class="seg-desc">${d.description}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="horde-field">
            <span class="horde-label">Difficulty · 10× Escalation Per Tier</span>
            <div class="horde-diff-grid" role="group" aria-label="Horde difficulty">
              ${HORDE_DIFFICULTIES.map((id) => {
                const r = hordeDifficultyRules[id];
                const hits = Math.ceil(100 / r.damagePerHit);
                return `
                  <button
                    type="button"
                    class="horde-diff-btn${id === selectedDifficulty ? ' is-active' : ''}"
                    data-difficulty="${id}"
                    aria-pressed="${id === selectedDifficulty}"
                    style="--tier-accent:${r.accentHex}"
                  >
                    <span class="diff-top">
                      <strong>${r.label}</strong>
                      <span class="diff-mult num">${formatScore(r.difficultyFactor)}×</span>
                    </span>
                    <span class="diff-meta">${hits} ${hits === 1 ? 'hit' : 'hits'} · Cap ${r.maxActiveEnemies}</span>
                  </button>
                `;
              }).join('')}
            </div>
            <p id="horde-diff-summary" class="horde-diff-summary"></p>
          </div>

          <div class="horde-launch-row">
            <button type="submit" id="horde-start-btn" class="primary">
              Launch Horde Trial <span aria-hidden="true">↗</span>
            </button>
            <span id="horde-player-best" class="horde-player-best num"></span>
          </div>
        </form>

        <section class="horde-board-panel" aria-labelledby="horde-board-heading">
          <div class="horde-board-head">
            <h3 id="horde-board-heading">Local Scoreboard</h3>
            <div class="horde-filter-bar" role="group" aria-label="Filter scoreboard by difficulty">
              <button type="button" class="horde-filter-btn is-active" data-filter="all">All</button>
              ${HORDE_DIFFICULTIES.map((id) => `
                <button type="button" class="horde-filter-btn" data-filter="${id}">
                  ${hordeDifficultyRules[id].label}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="horde-table-wrap">
            <table class="horde-table">
              <thead>
                <tr>
                  <th class="num">Rank</th>
                  <th>Player</th>
                  <th>Difficulty</th>
                  <th>Mode</th>
                  <th class="num">Kills / Time</th>
                  <th class="num">Score</th>
                </tr>
              </thead>
              <tbody id="horde-scores-body"></tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `;

  const nameInput = host.querySelector<HTMLInputElement>('#horde-player-name')!;
  const nameError = host.querySelector<HTMLElement>('#horde-name-error')!;
  const diffSummary = host.querySelector<HTMLElement>('#horde-diff-summary')!;
  const playerBestEl = host.querySelector<HTMLElement>('#horde-player-best')!;
  const scoresBody = host.querySelector<HTMLElement>('#horde-scores-body')!;
  const backBtn = host.querySelector<HTMLButtonElement>('#horde-back-menu')!;
  const form = host.querySelector<HTMLFormElement>('#horde-setup-form')!;

  const durationBtns = [...host.querySelectorAll<HTMLButtonElement>('[data-duration]')];
  const diffBtns = [...host.querySelectorAll<HTMLButtonElement>('[data-difficulty]')];
  const filterBtns = [...host.querySelectorAll<HTMLButtonElement>('[data-filter]')];

  const updateSummary = () => {
    const r = hordeDifficultyRules[selectedDifficulty];
    const hits = Math.ceil(100 / r.damagePerHit);
    diffSummary.textContent =
      `${r.tagline} — Enemy HP ${r.enemyHealth}, active cap ${r.maxActiveEnemies}, ${hits} ${hits === 1 ? 'hit' : 'hits'} before defeat.`;
  };

  const renderScores = () => {
    const allScores = loadHordeScores();
    const filtered = filterHordeScores(allScores, scoreFilter, 'all');
    const cleanName = normalizePlayerName(nameInput.value) ?? undefined;
    scoresBody.innerHTML = renderScoreRows(filtered, undefined, cleanName);

    if (cleanName) {
      const playerRuns = allScores.filter((s) => s.playerName.toLowerCase() === cleanName.toLowerCase());
      if (playerRuns.length > 0) {
        playerBestEl.textContent = `${cleanName}'s Best: ${formatScore(playerRuns[0].score)} (${playerRuns.length} ${playerRuns.length === 1 ? 'run' : 'runs'})`;
      } else {
        playerBestEl.textContent = `${cleanName} · Ready for first run`;
      }
    } else {
      playerBestEl.textContent = allScores.length > 0
        ? `Top Score: ${formatScore(allScores[0].score)} by ${allScores[0].playerName}`
        : 'No runs recorded yet';
    }
  };

  durationBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.unlock();
      audio.playCue('ui-confirm');
      selectedDuration = btn.dataset.duration as HordeDuration;
      durationBtns.forEach((b) => {
        const active = b.dataset.duration === selectedDuration;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    });
  });

  diffBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.unlock();
      audio.playCue('ui-confirm');
      selectedDifficulty = btn.dataset.difficulty as HordeDifficulty;
      diffBtns.forEach((b) => {
        const active = b.dataset.difficulty === selectedDifficulty;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      updateSummary();
    });
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.unlock();
      audio.playCue('ui-confirm');
      scoreFilter = btn.dataset.filter as HordeDifficulty | 'all';
      filterBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.filter === scoreFilter));
      renderScores();
    });
  });

  nameInput.addEventListener('input', () => {
    if (!nameError.hidden && normalizePlayerName(nameInput.value)) {
      nameError.hidden = true;
    }
    renderScores();
  });

  backBtn.addEventListener('click', () => {
    audio.unlock();
    audio.playCue('ui-confirm');
    options.onBack();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    audio.unlock();
    const playerName = normalizePlayerName(nameInput.value);
    if (!playerName) {
      nameError.textContent = 'Enter your player name before starting Horde Mode.';
      nameError.hidden = false;
      nameInput.focus();
      return;
    }
    nameError.hidden = true;
    saveLastHordePlayer(playerName);
    audio.playCue('ui-confirm');
    options.onLaunch({
      playerName,
      difficulty: selectedDifficulty,
      duration: selectedDuration,
    });
  });

  const refresh = () => {
    const savedName = loadLastHordePlayer();
    if (!nameInput.value && savedName) {
      nameInput.value = savedName;
    }
    updateSummary();
    renderScores();
  };

  refresh();
  return { refresh };
}

export function destroyHordeResults(): void {
  if (resultsKeyHandler) {
    window.removeEventListener('keydown', resultsKeyHandler, true);
    resultsKeyHandler = null;
  }
  if (resultsOverlay) {
    resultsOverlay.remove();
    resultsOverlay = null;
  }
}

/** Shows the post-run Horde results modal, records the score, and displays updated rankings. */
export function showHordeResults(options: HordeResultOptions): HordeScoreEntry | null {
  destroyHordeResults();
  const { result } = options;
  const saved = saveHordeScore({
    playerName: result.playerName,
    difficulty: result.difficulty,
    duration: result.duration,
    score: result.score,
    kills: result.kills,
    counterKills: result.counterKills,
    waveReached: result.waveReached,
    survivedSeconds: result.survivedSeconds,
    cleared: result.cleared,
  });

  const allScores = loadHordeScores();
  const rank = saved ? allScores.findIndex((s) => s.id === saved.id) + 1 : 0;
  const diff = hordeDifficultyRules[result.difficulty];
  const dur = hordeDurationRules[result.duration];

  resultsOverlay = document.createElement('div');
  resultsOverlay.id = 'horde-results';
  resultsOverlay.className = 'horde-results-overlay';
  resultsOverlay.setAttribute('role', 'dialog');
  resultsOverlay.setAttribute('aria-modal', 'true');
  resultsOverlay.setAttribute('aria-labelledby', 'horde-results-title');

  resultsOverlay.innerHTML = `
    <div class="horde-results-card">
      <p class="eyebrow" style="color:${diff.accentHex}">
        ${result.cleared ? 'Trial Cleared' : 'Signal Lost'} · ${diff.label} (${formatScore(diff.difficultyFactor)}×) · ${dur.label}
      </p>
      <h2 id="horde-results-title" class="horde-results-title">
        ${escapeHtml(result.playerName)} — ${formatScore(result.score)} pts
      </h2>
      <p class="horde-results-sub">
        ${rank > 0 ? `Placed #${rank} on the local scoreboard` : 'Score recorded'}
        ${result.clearBonus > 0 ? ` · Includes +${formatScore(result.clearBonus)} survival bonus` : ''}
      </p>

      <div class="horde-stats-strip">
        <div class="horde-stat">
          <span class="stat-label">Machines Down</span>
          <strong class="stat-value num">${result.kills}</strong>
        </div>
        <div class="horde-stat">
          <span class="stat-label">Counter Kills</span>
          <strong class="stat-value num">${result.counterKills}</strong>
        </div>
        <div class="horde-stat">
          <span class="stat-label">Wave Reached</span>
          <strong class="stat-value num">${result.waveReached}</strong>
        </div>
        <div class="horde-stat">
          <span class="stat-label">Time Survived</span>
          <strong class="stat-value num">${formatHordeClock(result.survivedSeconds)}</strong>
        </div>
      </div>

      <div class="horde-results-table-wrap">
        <table class="horde-table">
          <thead>
            <tr>
              <th class="num">Rank</th>
              <th>Player</th>
              <th>Difficulty</th>
              <th>Mode</th>
              <th class="num">Kills / Time</th>
              <th class="num">Score</th>
            </tr>
          </thead>
          <tbody>
            ${renderScoreRows(allScores.slice(0, 6), saved?.id)}
          </tbody>
        </table>
      </div>

      <div class="horde-results-actions">
        <button type="button" id="horde-play-again" class="primary" data-start="true">Play Again</button>
        <button type="button" id="horde-change-setup" class="secondary">Change Setup</button>
        <button type="button" id="horde-return-menu" class="secondary">Return to Title</button>
      </div>
    </div>
  `;

  document.body.appendChild(resultsOverlay);

  const playAgainBtn = resultsOverlay.querySelector<HTMLButtonElement>('#horde-play-again')!;
  const setupBtn = resultsOverlay.querySelector<HTMLButtonElement>('#horde-change-setup')!;
  const menuBtn = resultsOverlay.querySelector<HTMLButtonElement>('#horde-return-menu')!;

  playAgainBtn.addEventListener('click', () => {
    audio.playCue('ui-confirm');
    destroyHordeResults();
    options.onPlayAgain({
      playerName: result.playerName,
      difficulty: result.difficulty,
      duration: result.duration,
    });
  });

  setupBtn.addEventListener('click', () => {
    audio.playCue('ui-confirm');
    destroyHordeResults();
    options.onChangeSetup();
  });

  menuBtn.addEventListener('click', () => {
    audio.playCue('ui-confirm');
    destroyHordeResults();
    options.onReturnToMenu();
  });

  resultsKeyHandler = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      destroyHordeResults();
      options.onReturnToMenu();
    }
  };
  window.addEventListener('keydown', resultsKeyHandler, true);

  playAgainBtn.focus({ preventScroll: true });
  return saved;
}
