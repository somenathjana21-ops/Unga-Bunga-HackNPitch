// Horde Mode Setup + Scoreboard + Post-Run Results UI.
// Asks for the player's name before launching, exposes 4 Arena Maps (+ Random),
// 1m / 5m / Unlimited, and Easy / Medium / Hard / Maniac / DOOM (10-fold scaling),
// and renders the persisted local scoreboard.

import {
  HORDE_DIFFICULTIES,
  HORDE_DURATIONS,
  formatHordeClock,
  formatScore,
  hordeDifficultyRules,
  hordeDurationRules,
  hordeHitsToFall,
  normalizePlayerName,
  randomSeed,
  type HordeDifficulty,
  type HordeDuration,
} from '../game/horde/rules';
import {
  HORDE_MAP_IDS,
  hordeMaps,
  type HordeMapChoice,
} from '../game/horde/maps';
import {
  decideDuelOutcome,
  duelMatchModeLabels,
  normalizeDuelCode,
  sortDuelPlayers,
  type DuelMatchMode,
  type DuelRoom,
  type DuelSession,
} from '../game/horde/duel';
import type { HordeConfig, HordeRunResult } from '../game/scenes/HordeScene';
import {
  filterHordeScores,
  loadHordeScores,
  loadLastHordePlayer,
  saveHordeScore,
  saveLastHordePlayer,
  type HordeScoreEntry,
} from '../services/horde-scores';
import type { HordeDuelBackend } from '../services/horde-duel';
import { clearStoredDuelSession, saveStoredDuelSession } from '../services/horde-duel';
import { audio } from '../services/audio';

export interface HordeLobbyOptions {
  onLaunch: (config: HordeConfig) => void;
  onDuelLaunch: (session: DuelSession) => void;
  onBack: () => void;
  duelBackend: HordeDuelBackend;
}

export interface HordeResultOptions {
  result: HordeRunResult;
  onPlayAgain: (config: HordeConfig) => void;
  onChangeSetup: () => void;
  onReturnToMenu: () => void;
  duel?: {
    session: DuelSession;
    backend: HordeDuelBackend;
  };
  onDuelLobby?: () => void;
}

let resultsOverlay: HTMLElement | null = null;
let resultsKeyHandler: ((e: KeyboardEvent) => void) | null = null;
let duelPollTimer: number | null = null;

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
  return scores.slice(0, 10).map((entry, index) => {
    const diff = hordeDifficultyRules[entry.difficulty];
    const dur = hordeDurationRules[entry.duration];
    const mapShort = entry.mapId ? hordeMaps[entry.mapId].shortName : 'Warehouse';
    const isCurrent = highlightId
      ? entry.id === highlightId
      : Boolean(highlightPlayer && entry.playerName.toLowerCase() === highlightPlayer.toLowerCase());
    const outcome = entry.cleared ? 'Cleared' : `W${entry.waveReached}`;
    return `
      <tr class="${isCurrent ? 'is-highlight' : ''}">
        <td class="num">#${index + 1}</td>
        <td class="player-cell">${escapeHtml(entry.playerName)}</td>
        <td><span class="diff-label" style="color:${diff.accentHex}">${diff.label}</span></td>
        <td>${mapShort} · ${dur.label} · ${outcome}</td>
        <td class="num">${entry.kills} (${formatHordeClock(entry.survivedSeconds)})</td>
        <td class="num score-cell">${formatScore(entry.score)}</td>
      </tr>
    `;
  }).join('');
}

async function copyDuelCode(code: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
      return true;
    }
  } catch {
    // Clipboard permission can be denied; the code stays visible for manual copy.
  }
  return false;
}

function renderDuelPlayers(room: DuelRoom, highlightSeat?: number): string {
  const players = sortDuelPlayers(room.players);
  if (players.length === 0) return '<p class="duel-hint">Waiting for players…</p>';
  return players.map((player) => `
    <div class="duel-player${player.seat === highlightSeat ? ' is-you' : ''}">
      <span class="duel-seat">P${player.seat}${player.isHost ? ' · HOST' : ''}${player.seat === highlightSeat ? ' · YOU' : ''}</span>
      <strong class="duel-player-name">${escapeHtml(player.name)}</strong>
      <span class="duel-player-status num">${player.finished ? `${formatScore(player.score)} pts` : 'Not played'}</span>
    </div>
  `).join('');
}

function renderDuelOutcome(room: DuelRoom): { title: string; detail: string; tone: string } {
  const outcome = decideDuelOutcome(room);
  switch (outcome.kind) {
    case 'duel-win':
      return {
        title: `${outcome.winner.name} wins`,
        detail: `${formatScore(outcome.winner.score)} vs ${formatScore(outcome.loser.score)} pts · tie-breaks: survival, kills, counters`,
        tone: 'is-win',
      };
    case 'draw':
      return { title: 'Draw', detail: 'Identical score and tie-breakers.', tone: 'is-draw' };
    case 'coop':
      return {
        title: 'Team score',
        detail: `${formatScore(outcome.totalScore)} combined pts from ${outcome.players.map((p) => p.name).join(' + ')}`,
        tone: 'is-coop',
      };
    case 'waiting':
      return {
        title: 'Match in progress',
        detail: `Waiting for ${outcome.waitingFor.join(', ')}…`,
        tone: 'is-waiting',
      };
  }
}

/** Renders and wires the Horde Mode setup & live scoreboard section inside the host element. */
export function mountHordeLobby(host: HTMLElement, options: HordeLobbyOptions): {
  refresh: () => void;
  setDuelSession: (session: DuelSession | null) => void;
} {
  let selectedDifficulty: HordeDifficulty = 'easy';
  let selectedDuration: HordeDuration = '1m';
  let selectedMap: HordeMapChoice = 'warehouse';
  let selectedDuelMode: DuelMatchMode = 'duel';
  let scoreFilter: HordeDifficulty | 'all' = 'all';
  let duelSession: DuelSession | null = null;
  let duelBusy = false;

  host.innerHTML = `
    <div class="horde-lobby">
      <div class="horde-lobby-header">
        <div>
          <p class="eyebrow">Resistance Trials · Expanded Arena · Randomized Cover</p>
          <h2 id="horde-title" class="horde-heading">Horde Arena</h2>
          <p class="horde-sub">
            Empowered loadout scales through Hard; Maniac &amp; DOOM strip sustain for pure skill. Cover randomizes every match.
          </p>
        </div>
        <button type="button" id="horde-back-menu" class="secondary">Back to Title</button>
      </div>

      <div class="horde-grid">
        <form id="horde-setup-form" class="horde-config-panel" novalidate>
          <div class="horde-top-inputs">
            <div class="horde-field">
              <label for="horde-player-name" class="horde-label">Player Name</label>
              <input
                id="horde-player-name"
                name="playerName"
                type="text"
                maxlength="24"
                autocomplete="nickname"
                placeholder="Enter callsign (e.g. K-85)"
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
                      <span class="seg-desc">${d.id === '1m' ? '60s blitz' : d.id === '5m' ? '5m siege' : 'Endless'}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <div class="horde-field">
            <span class="horde-label">Arena Map · Fresh Randomized Cover Every Match</span>
            <div class="horde-map-grid" role="group" aria-label="Horde arena map">
              ${HORDE_MAP_IDS.map((id) => {
                const m = hordeMaps[id];
                return `
                  <button
                    type="button"
                    class="horde-map-btn${id === selectedMap ? ' is-active' : ''}"
                    data-map="${id}"
                    aria-pressed="${id === selectedMap}"
                  >
                    <span class="map-thumb" style="background-image:url('${m.backgroundPath}')"></span>
                    <span class="map-name">${m.shortName}</span>
                  </button>
                `;
              }).join('')}
              <button
                type="button"
                class="horde-map-btn horde-map-random"
                data-map="random"
                aria-pressed="false"
              >
                <span class="map-thumb is-random">?</span>
                <span class="map-name">Random</span>
              </button>
            </div>
            <p id="horde-map-summary" class="horde-diff-summary"></p>
          </div>

          <div class="horde-field">
            <span class="horde-label">Difficulty · 10× Escalation Per Tier</span>
            <div class="horde-diff-grid" role="group" aria-label="Horde difficulty">
              ${HORDE_DIFFICULTIES.map((id) => {
                const r = hordeDifficultyRules[id];
                const hits = hordeHitsToFall(id);
                return `
                  <button
                    type="button"
                    class="horde-diff-btn${id === selectedDifficulty ? ' is-active' : ''}${r.skillOnly ? ' is-skill-only' : ''}"
                    data-difficulty="${id}"
                    aria-pressed="${id === selectedDifficulty}"
                    style="--tier-accent:${r.accentHex}"
                  >
                    <span class="diff-top">
                      <strong>${r.label}</strong>
                      <span class="diff-mult num">${formatScore(r.difficultyFactor)}×</span>
                    </span>
                    <span class="diff-meta">${hits} ${hits === 1 ? 'hit' : 'hits'} · ${r.skillOnly ? 'Skill Only' : `+${r.healPerWave} HP`}</span>
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

          <div class="horde-duel-panel">
            <div class="horde-duel-head">
              <span class="horde-label">Multiplayer Duel</span>
              <span id="duel-backend-badge" class="duel-backend-badge"></span>
            </div>
            <p class="horde-duel-sub">
              Create a six-character code and share it. Both players run the same difficulty,
              duration and spawn seed on their own time.
            </p>
            <div class="horde-duel-mode" role="group" aria-label="Duel scoring mode">
              ${(['duel', 'coop'] as const).map((mode) => `
                <button
                  type="button"
                  class="horde-seg-btn${mode === 'duel' ? ' is-active' : ''}"
                  data-duel-mode="${mode}"
                  aria-pressed="${mode === 'duel'}"
                >
                  <span class="seg-title">${mode === 'duel' ? 'Duel' : 'Team'}</span>
                  <span class="seg-desc">${mode === 'duel' ? 'Highest score wins' : 'Combined score'}</span>
                </button>
              `).join('')}
            </div>

            <div id="duel-setup-actions" class="horde-duel-actions">
              <button type="button" id="duel-create" class="primary">Create Duel Code</button>
              <div class="duel-join-row">
                <input
                  id="duel-code-input"
                  class="horde-input duel-code-input"
                  type="text"
                  maxlength="6"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="6-CHAR CODE"
                  aria-label="Duel code"
                />
                <button type="button" id="duel-join" class="secondary">Join Code</button>
              </div>
            </div>

            <p id="duel-error" class="horde-field-error" role="alert" hidden></p>
            <div id="duel-room" class="duel-room" hidden></div>
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
                  <th>Arena / Mode</th>
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
  const mapSummary = host.querySelector<HTMLElement>('#horde-map-summary')!;
  const diffSummary = host.querySelector<HTMLElement>('#horde-diff-summary')!;
  const playerBestEl = host.querySelector<HTMLElement>('#horde-player-best')!;
  const scoresBody = host.querySelector<HTMLElement>('#horde-scores-body')!;
  const backBtn = host.querySelector<HTMLButtonElement>('#horde-back-menu')!;
  const form = host.querySelector<HTMLFormElement>('#horde-setup-form')!;

  const durationBtns = [...host.querySelectorAll<HTMLButtonElement>('[data-duration]')];
  const mapBtns = [...host.querySelectorAll<HTMLButtonElement>('[data-map]')];
  const diffBtns = [...host.querySelectorAll<HTMLButtonElement>('[data-difficulty]')];
  const filterBtns = [...host.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const duelModeBtns = [...host.querySelectorAll<HTMLButtonElement>('[data-duel-mode]')];
  const duelCreateBtn = host.querySelector<HTMLButtonElement>('#duel-create')!;
  const duelJoinBtn = host.querySelector<HTMLButtonElement>('#duel-join')!;
  const duelCodeInput = host.querySelector<HTMLInputElement>('#duel-code-input')!;
  const duelErrorEl = host.querySelector<HTMLElement>('#duel-error')!;
  const duelRoomEl = host.querySelector<HTMLElement>('#duel-room')!;
  const duelSetupActions = host.querySelector<HTMLElement>('#duel-setup-actions')!;
  const duelBackendBadge = host.querySelector<HTMLElement>('#duel-backend-badge')!;
  const soloStartBtn = host.querySelector<HTMLButtonElement>('#horde-start-btn')!;

  duelBackendBadge.textContent = options.duelBackend.label;
  duelBackendBadge.dataset.backend = options.duelBackend.kind;

  const showDuelError = (message: string) => {
    duelErrorEl.textContent = message;
    duelErrorEl.hidden = false;
  };
  const clearDuelError = () => {
    duelErrorEl.hidden = true;
    duelErrorEl.textContent = '';
  };

  const renderDuelRoom = () => {
    duelBackendBadge.textContent = options.duelBackend.label;
    duelBackendBadge.dataset.backend = options.duelBackend.kind;
    if (!duelSession) {
      duelRoomEl.hidden = true;
      duelRoomEl.innerHTML = '';
      duelSetupActions.hidden = false;
      soloStartBtn.disabled = false;
      soloStartBtn.textContent = 'Launch Horde Trial ↗';
      return;
    }
    const room = duelSession.room;
    const complete = room.status === 'complete' || room.expired;
    const diff = hordeDifficultyRules[room.difficulty];
    duelSetupActions.hidden = true;
    soloStartBtn.disabled = complete;
    soloStartBtn.textContent = complete ? 'Duel Complete' : 'Enter Duel Arena ↗';
    duelRoomEl.hidden = false;
    duelRoomEl.innerHTML = `
      <div class="duel-room-head">
        <div>
          <span class="duel-code-label">Share this code</span>
          <strong class="duel-code">${room.code}</strong>
        </div>
        <button type="button" id="duel-copy" class="secondary">Copy</button>
      </div>
      <p class="duel-room-meta">
        ${duelMatchModeLabels[room.matchMode]} · ${diff.label} (${formatScore(diff.difficultyFactor)}×) ·
        ${hordeDurationRules[room.duration].label} · seed ${room.seed} · you are P${duelSession.seat}
      </p>
      <div class="duel-players">${renderDuelPlayers(room, duelSession.seat)}</div>
      <p class="duel-hint">
        ${complete
          ? 'This match is complete. Create a new code to play again.'
          : 'Both players finish one run in this room. Each seat can submit exactly one score.'}
      </p>
      <div class="duel-room-actions">
        <button type="button" id="duel-enter" class="primary"${complete ? ' disabled' : ''}>Enter Arena</button>
        <button type="button" id="duel-refresh" class="secondary">Refresh</button>
        <button type="button" id="duel-leave" class="secondary">Leave Room</button>
      </div>
    `;

    const copyBtn = duelRoomEl.querySelector<HTMLButtonElement>('#duel-copy')!;
    const enterBtn = duelRoomEl.querySelector<HTMLButtonElement>('#duel-enter')!;
    const refreshBtn = duelRoomEl.querySelector<HTMLButtonElement>('#duel-refresh')!;
    const leaveBtn = duelRoomEl.querySelector<HTMLButtonElement>('#duel-leave')!;
    const activeSession = duelSession;

    copyBtn.addEventListener('click', () => {
      void copyDuelCode(room.code).then((copied) => {
        copyBtn.textContent = copied ? 'Copied!' : room.code;
      });
    });
    enterBtn.addEventListener('click', () => {
      if (complete) return;
      audio.unlock();
      audio.playCue('ui-confirm');
      options.onDuelLaunch(activeSession);
    });
    refreshBtn.addEventListener('click', () => void refreshDuelRoom());
    leaveBtn.addEventListener('click', () => {
      audio.playCue('ui-confirm');
      duelSession = null;
      clearStoredDuelSession();
      clearDuelError();
      renderDuelRoom();
    });
  };

  const refreshDuelRoom = async (): Promise<void> => {
    if (!duelSession || duelBusy) return;
    duelBusy = true;
    const code = duelSession.room.code;
    const res = await options.duelBackend.get(code);
    duelBusy = false;
    if (res.ok) {
      duelSession = { ...duelSession, room: res.data };
      clearDuelError();
      renderDuelRoom();
    } else {
      showDuelError(res.error.message);
    }
  };

  const requireDuelName = (): string | null => {
    const playerName = normalizePlayerName(nameInput.value);
    if (!playerName) {
      nameError.textContent = 'Enter your player name before creating or joining a duel.';
      nameError.hidden = false;
      nameInput.focus();
      return null;
    }
    nameError.hidden = true;
    saveLastHordePlayer(playerName);
    return playerName;
  };

  const handleCreateDuel = async (): Promise<void> => {
    if (duelBusy) return;
    const playerName = requireDuelName();
    if (!playerName) return;
    clearDuelError();
    duelBusy = true;
    duelCreateBtn.disabled = true;
    const res = await options.duelBackend.create({
      hostName: playerName,
      difficulty: selectedDifficulty,
      duration: selectedDuration,
      matchMode: selectedDuelMode,
      seed: randomSeed(),
    });
    duelBusy = false;
    duelCreateBtn.disabled = false;
    if (!res.ok) {
      showDuelError(res.error.message);
      return;
    }
    audio.playCue('ui-confirm');
    duelSession = res.data;
    saveStoredDuelSession(duelSession);
    renderDuelRoom();
  };

  const handleJoinDuel = async (): Promise<void> => {
    if (duelBusy) return;
    const playerName = requireDuelName();
    if (!playerName) return;
    const code = normalizeDuelCode(duelCodeInput.value);
    if (!code) {
      showDuelError('Enter the six-character duel code.');
      duelCodeInput.focus();
      return;
    }
    clearDuelError();
    duelBusy = true;
    duelJoinBtn.disabled = true;
    const res = await options.duelBackend.join(code, playerName);
    duelBusy = false;
    duelJoinBtn.disabled = false;
    if (!res.ok) {
      showDuelError(res.error.message);
      return;
    }
    audio.playCue('ui-confirm');
    duelSession = res.data;
    saveStoredDuelSession(duelSession);
    renderDuelRoom();
  };

  duelModeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.unlock();
      audio.playCue('ui-confirm');
      selectedDuelMode = btn.dataset.duelMode as DuelMatchMode;
      duelModeBtns.forEach((b) => {
        const active = b.dataset.duelMode === selectedDuelMode;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    });
  });
  duelCreateBtn.addEventListener('click', () => void handleCreateDuel());
  duelJoinBtn.addEventListener('click', () => void handleJoinDuel());
  duelCodeInput.addEventListener('input', () => {
    duelCodeInput.value = duelCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    clearDuelError();
  });
  duelCodeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleJoinDuel();
    }
  });

  const updateMapSummary = () => {
    if (selectedMap === 'random') {
      mapSummary.textContent = 'Random Arena — Picks a surprise sector and fresh randomized cover layout every trial.';
      return;
    }
    const m = hordeMaps[selectedMap];
    mapSummary.textContent = `${m.name} — ${m.tagline}.`;
  };

  const updateSummary = () => {
    const r = hordeDifficultyRules[selectedDifficulty];
    const hits = hordeHitsToFall(selectedDifficulty);
    const kSpec = r.skillOnly
      ? `K ${r.playerMaxHealth} HP (${hits} ${hits === 1 ? 'hit' : 'hits'}) · ${r.playerPistolDamage} DMG · Zero Heal (Pure Skill)`
      : `K ${r.playerMaxHealth} HP (${hits} hits) · ${r.playerPistolDamage} DMG · +${r.healPerWave} HP/wave · +${r.counterKillHeal} HP/counter`;
    diffSummary.textContent = `${r.label}: ${kSpec} · Enemy HP ${r.enemyHealth}, cap ${r.maxActiveEnemies}.`;
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

  mapBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.unlock();
      audio.playCue('ui-confirm');
      selectedMap = btn.dataset.map as HordeMapChoice;
      mapBtns.forEach((b) => {
        const active = b.dataset.map === selectedMap;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      updateMapSummary();
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
    if (duelSession) {
      if (duelSession.room.status === 'complete' || duelSession.room.expired) return;
      audio.playCue('ui-confirm');
      options.onDuelLaunch(duelSession);
      return;
    }
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
      mapChoice: selectedMap,
    });
  });

  const refresh = () => {
    const savedName = loadLastHordePlayer();
    if (!nameInput.value && savedName) {
      nameInput.value = savedName;
    }
    updateMapSummary();
    updateSummary();
    renderScores();
    renderDuelRoom();
  };

  const setDuelSession = (session: DuelSession | null) => {
    duelSession = session;
    clearDuelError();
    renderDuelRoom();
    if (session) void refreshDuelRoom();
  };

  refresh();
  return { refresh, setDuelSession };
}

export function destroyHordeResults(): void {
  if (duelPollTimer !== null) {
    window.clearInterval(duelPollTimer);
    duelPollTimer = null;
  }
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
    mapId: result.mapId,
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
  const mapDef = hordeMaps[result.mapId];

  resultsOverlay = document.createElement('div');
  resultsOverlay.id = 'horde-results';
  resultsOverlay.className = 'horde-results-overlay';
  resultsOverlay.setAttribute('role', 'dialog');
  resultsOverlay.setAttribute('aria-modal', 'true');
  resultsOverlay.setAttribute('aria-labelledby', 'horde-results-title');

  resultsOverlay.innerHTML = `
    <div class="horde-results-card">
      <p class="eyebrow" style="color:${diff.accentHex}">
        ${result.cleared ? 'Trial Cleared' : 'Signal Lost'} · ${mapDef.shortName} · ${diff.label} (${formatScore(diff.difficultyFactor)}×) · ${dur.label}
      </p>
      <h2 id="horde-results-title" class="horde-results-title">
        ${escapeHtml(result.playerName)} — ${formatScore(result.score)} pts
      </h2>
      <p class="horde-results-sub">
        ${rank > 0 ? `Placed #${rank} on the local scoreboard` : 'Score recorded'}
        ${result.clearBonus > 0 ? ` · Includes +${formatScore(result.clearBonus)} survival bonus` : ''}
      </p>

      <div id="horde-duel-result" class="horde-duel-result" hidden></div>

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
              <th>Arena / Mode</th>
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
        ${options.duel
          ? '<button type="button" id="horde-duel-lobby" class="primary">Back to Duel Lobby</button>'
          : '<button type="button" id="horde-play-again" class="primary" data-start="true">Play Again (New Cover)</button>'}
        <button type="button" id="horde-change-setup" class="secondary">Change Setup</button>
        <button type="button" id="horde-return-menu" class="secondary">Return to Title</button>
      </div>
    </div>
  `;

  document.body.appendChild(resultsOverlay);

  const playAgainBtn = resultsOverlay.querySelector<HTMLButtonElement>('#horde-play-again');
  const duelLobbyBtn = resultsOverlay.querySelector<HTMLButtonElement>('#horde-duel-lobby');
  const setupBtn = resultsOverlay.querySelector<HTMLButtonElement>('#horde-change-setup')!;
  const menuBtn = resultsOverlay.querySelector<HTMLButtonElement>('#horde-return-menu')!;

  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      audio.playCue('ui-confirm');
      destroyHordeResults();
      options.onPlayAgain({
        playerName: result.playerName,
        difficulty: result.difficulty,
        duration: result.duration,
        mapChoice: result.mapId,
      });
    });
  }

  if (duelLobbyBtn) {
    duelLobbyBtn.addEventListener('click', () => {
      audio.playCue('ui-confirm');
      destroyHordeResults();
      (options.onDuelLobby ?? options.onChangeSetup)();
    });
  }

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
      if (options.duel && options.onDuelLobby) options.onDuelLobby();
      else options.onReturnToMenu();
    }
  };
  window.addEventListener('keydown', resultsKeyHandler, true);

  const duel = options.duel;
  const duelEl = resultsOverlay.querySelector<HTMLElement>('#horde-duel-result');
  if (duel && duelEl) {
    let currentRoom: DuelRoom = duel.session.room;
    let checking = false;
    const stopPolling = () => {
      if (duelPollTimer !== null) {
        window.clearInterval(duelPollTimer);
        duelPollTimer = null;
      }
    };
    const renderRoom = (room: DuelRoom) => {
      currentRoom = room;
      const info = renderDuelOutcome(room);
      duelEl.hidden = false;
      duelEl.innerHTML = `
        <div class="duel-result-head">
          <div>
            <span class="duel-code-label">Duel ${room.code}</span>
            <strong class="duel-outcome ${info.tone}">${escapeHtml(info.title)}</strong>
          </div>
          <button type="button" id="duel-copy-result" class="secondary">Copy Code</button>
        </div>
        <p class="duel-result-detail">${escapeHtml(info.detail)}</p>
        <div class="duel-players">${renderDuelPlayers(room, duel.session.seat)}</div>
        <div class="duel-result-actions">
          <button type="button" id="duel-check-result" class="secondary">Check Opponent</button>
        </div>
      `;
      const checkBtn = duelEl.querySelector<HTMLButtonElement>('#duel-check-result');
      if (decideDuelOutcome(room).kind !== 'waiting') {
        stopPolling();
        if (checkBtn) checkBtn.hidden = true;
      }
    };
    const checkOpponent = async (): Promise<void> => {
      if (checking) return;
      checking = true;
      const res = await duel.backend.get(currentRoom.code);
      checking = false;
      if (res.ok) renderRoom(res.data);
    };
    const submitScore = async (): Promise<void> => {
      stopPolling();
      duelEl.hidden = false;
      duelEl.innerHTML = '<p class="duel-hint">Submitting your duel score…</p>';
      const res = await duel.backend.submit(duel.session, {
        score: result.score,
        kills: result.kills,
        counterKills: result.counterKills,
        waveReached: result.waveReached,
        survivedSeconds: result.survivedSeconds,
        cleared: result.cleared,
      });
      if (!res.ok) {
        if (res.error.code === 'ALREADY_FINISHED') {
          const roomRes = await duel.backend.get(currentRoom.code);
          if (roomRes.ok) {
            renderRoom(roomRes.data);
            return;
          }
        }
        duelEl.innerHTML = `
          <p class="duel-error">${escapeHtml(res.error.message)}</p>
          <button type="button" id="duel-retry-submit" class="secondary">Retry Submission</button>
        `;
        duelEl.querySelector<HTMLButtonElement>('#duel-retry-submit')?.addEventListener('click', () => {
          void submitScore();
        });
        return;
      }
      renderRoom(res.data);
      if (decideDuelOutcome(res.data).kind === 'waiting') {
        duelPollTimer = window.setInterval(() => void checkOpponent(), 4000);
      }
    };

    duelEl.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('#duel-check-result')) void checkOpponent();
      if (target.closest('#duel-copy-result')) {
        void copyDuelCode(currentRoom.code).then((copied) => {
          const button = duelEl.querySelector<HTMLButtonElement>('#duel-copy-result');
          if (button) button.textContent = copied ? 'Copied!' : currentRoom.code;
        });
      }
    });

    void submitScore();
  }

  (playAgainBtn ?? duelLobbyBtn)?.focus({ preventScroll: true });
  return saved;
}
