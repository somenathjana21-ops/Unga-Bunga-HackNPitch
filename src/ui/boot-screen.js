/**
 * Phase 0 boot screen.
 *
 * A deliberately non-gameplay status board: it proves the shell loop, renderer,
 * resize, pause path and systems wiring are alive. Phase 1 replaces this with
 * the first playable scene.
 */

import { ACTIONS } from '../core/input.js';
import {
  LOW_FPS_SUSTAIN_SECONDS,
  LOW_FPS_THRESHOLD,
} from '../core/game.js';

const W = 1280;
const H = 720;
const MARGIN = 64;

const MONO = '"Cascadia Mono", Consolas, "Courier New", monospace';
const SANS = '"Segoe UI", system-ui, -apple-system, sans-serif';

const COLORS = {
  bg: '#060910',
  ink: '#ece9e1',
  dim: '#8893a0',
  faint: '#414b59',
  accent: '#e8b45a',
  accentDim: '#8f6d34',
  good: '#6fbf8b',
  warn: '#e8b45a',
  bad: '#d95c4a',
  line: 'rgba(236, 233, 225, 0.08)',
  panel: 'rgba(255, 255, 255, 0.018)',
};

const REASON_LABELS = {
  'tab-hidden': 'tab hidden',
  'window-blur': 'window lost focus',
  manual: 'paused by player',
};

function prefersReducedMotion() {
  return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function drawSpacedText(ctx, text, x, y, spacing) {
  let cursor = x;
  for (const character of text) {
    ctx.fillText(character, cursor, y);
    cursor += ctx.measureText(character).width + spacing;
  }
  return cursor;
}

function panel(ctx, x, y, width, height) {
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

function cornerBrackets(ctx) {
  const inset = 28;
  const arm = 16;
  ctx.strokeStyle = 'rgba(232, 180, 90, 0.35)';
  ctx.lineWidth = 2;
  const corners = [
    [inset, inset, 1, 1],
    [W - inset, inset, -1, 1],
    [inset, H - inset, 1, -1],
    [W - inset, H - inset, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * arm);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * arm, y);
    ctx.stroke();
  }
}

function drawBackdrop(ctx, time) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Graph-paper grid.
  ctx.strokeStyle = 'rgba(136, 147, 160, 0.055)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 64) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
  }
  for (let y = 0; y <= H; y += 64) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
  }
  ctx.stroke();

  // A slow amber glow behind the title, kept subtle.
  const glowX = 300 + Math.sin(time * 0.18) * 40;
  const gradient = ctx.createRadialGradient(glowX, 250, 10, glowX, 250, 420);
  gradient.addColorStop(0, 'rgba(232, 180, 90, 0.075)');
  gradient.addColorStop(1, 'rgba(232, 180, 90, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Vignette.
  const vignette = ctx.createRadialGradient(W / 2, H / 2, 220, W / 2, H / 2, 760);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

function drawHeader(ctx, time, { version, paused }) {
  const pulse = 0.55 + Math.sin(time * 2.4) * 0.35;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 11px ${MONO}`;
  ctx.fillStyle = COLORS.accentDim;
  drawSpacedText(ctx, 'PHASE 0 // REPOSITORY SCAFFOLD', MARGIN, 58, 1.6);

  ctx.textAlign = 'right';
  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(version, W - MARGIN, 58);

  ctx.fillStyle = paused ? COLORS.warn : COLORS.good;
  ctx.globalAlpha = paused ? 1 : pulse;
  ctx.beginPath();
  ctx.arc(W - MARGIN - ctx.measureText(version).width - 18, 54, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, time, paused) {
  const motion = prefersReducedMotion() ? 0 : time;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 104px ${SANS}`;
  ctx.fillStyle = COLORS.ink;
  drawSpacedText(ctx, 'WANT', MARGIN, 196, 20);

  ctx.font = `500 15px ${MONO}`;
  ctx.fillStyle = COLORS.accent;
  drawSpacedText(ctx, 'CHAPTER ONE  ·  THE WRONG PERSON', MARGIN + 3, 246, 2.2);

  ctx.font = `400 14px ${SANS}`;
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(
    'A story-driven 2D top-down browser game. The shell is online; no gameplay is wired yet.',
    MARGIN + 3,
    274,
  );

  // Scanning line: a compact visual proof that the fixed-step simulation runs.
  const lineY = 306;
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, lineY + 0.5);
  ctx.lineTo(W - MARGIN, lineY + 0.5);
  ctx.stroke();

  const sweep = prefersReducedMotion() ? 0.5 : (motion % 5) / 5;
  const sweepX = MARGIN + sweep * (W - MARGIN * 2);
  const beam = ctx.createLinearGradient(sweepX - 90, 0, sweepX + 90, 0);
  beam.addColorStop(0, 'rgba(232, 180, 90, 0)');
  beam.addColorStop(0.5, paused ? 'rgba(136, 147, 160, 0.5)' : 'rgba(232, 180, 90, 0.9)');
  beam.addColorStop(1, 'rgba(232, 180, 90, 0)');
  ctx.strokeStyle = beam;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sweepX - 90, lineY);
  ctx.lineTo(sweepX + 90, lineY);
  ctx.stroke();
}

function drawStatus(ctx, { stats, audioState, assetSummary, version, viewport }) {
  const x = MARGIN;
  const labelX = x + 2;
  const valueX = x + 168;
  let y = 366;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 10px ${MONO}`;
  ctx.fillStyle = COLORS.faint;
  drawSpacedText(ctx, 'SHELL STATUS', labelX, 348, 2);

  const fps = stats.fps > 0 ? stats.fps.toFixed(1) : '—';
  const fpsColor =
    stats.lowFps && stats.lowFpsSeconds >= LOW_FPS_SUSTAIN_SECONDS
      ? COLORS.bad
      : fps !== '—' && stats.fps < LOW_FPS_THRESHOLD
        ? COLORS.warn
        : COLORS.ink;

  const audioValue =
    audioState.context === 'running'
      ? `running${audioState.muted ? ' · muted' : ''} · master/music/sfx`
      : audioState.context === 'suspended'
        ? 'suspended · click to unlock'
        : 'standby · click to unlock';

  const rows = [
    ['LOOP', 'fixed 60 Hz · delta clamp 250 ms', COLORS.ink],
    ['RENDER', `canvas 2D · ${W}×${H} letterbox`, COLORS.ink],
    ['RESIZE', `DPR ${viewport.dpr.toFixed(1)} · ${Math.round(viewport.cssWidth)}×${Math.round(viewport.cssHeight)} CSS`, COLORS.ink],
    ['INPUT', `${Object.keys(ACTIONS).length} actions · keyboard + mouse`, COLORS.ink],
    ['AUTO-PAUSE', 'tab blur · clean resume', COLORS.ink],
    ['FPS', `${fps} · guard < ${LOW_FPS_THRESHOLD} for ${LOW_FPS_SUSTAIN_SECONDS}s`, fpsColor],
    ['AUDIO', audioValue, audioState.context === 'running' ? COLORS.good : COLORS.dim],
    [
      'ASSETS',
      `${assetSummary.total} ids · ${assetSummary.loaded} loaded · manifest only`,
      assetSummary.failed > 0 ? COLORS.bad : COLORS.ink,
    ],
  ];

  for (const [label, value, color] of rows) {
    ctx.font = `500 11px ${MONO}`;
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(label, labelX, y);

    ctx.font = `500 12px ${MONO}`;
    ctx.fillStyle = color;
    ctx.fillText(value, valueX, y);

    y += 31;
  }

  ctx.font = `400 10px ${MONO}`;
  ctx.fillStyle = COLORS.faint;
  ctx.fillText(`shell ${version}`, labelX, y + 4);
}

function drawScaffoldPanel(ctx, { stats }) {
  const x = 680;
  const y = 328;
  const width = W - MARGIN - x;
  const height = 270;
  panel(ctx, x, y, width, height);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 10px ${MONO}`;
  ctx.fillStyle = COLORS.faint;
  drawSpacedText(ctx, 'SCAFFOLD', x + 20, y + 26, 2);

  const folders = [
    ['src/core', 'loop · input · camera · collision · math'],
    ['src/world', 'scenes · tiles · props · objectives'],
    ['src/story', 'dialogue · portraits · cutscenes'],
    ['src/combat', 'weapons · enemies · damage'],
    ['src/ui', 'HUD · menus · this shell'],
    ['src/systems', 'asset manifest · audio'],
    ['docs', 'decisions · asset ledger'],
    ['tests/manual', 'phase checklists'],
  ];

  let rowY = y + 52;
  for (const [folder, description] of folders) {
    ctx.font = `600 11px ${MONO}`;
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(folder, x + 20, rowY);

    ctx.font = `400 10.5px ${MONO}`;
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(description, x + 142, rowY);
    rowY += 24.5;
  }

  ctx.strokeStyle = COLORS.line;
  ctx.beginPath();
  ctx.moveTo(x + 20, y + height - 34);
  ctx.lineTo(x + width - 20, y + height - 34);
  ctx.stroke();

  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(
    `frames ${stats.frames.toString().padStart(6, '0')}   updates ${stats.updates
      .toString()
      .padStart(6, '0')}`,
    x + 20,
    y + height - 16,
  );
}

function drawFooter(ctx, { paused }) {
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, 634.5);
  ctx.lineTo(W - MARGIN, 634.5);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 10px ${MONO}`;
  ctx.fillStyle = paused ? COLORS.warn : COLORS.faint;
  drawSpacedText(ctx, paused ? 'PAUSED' : 'SHELL ONLY — NO GAMEPLAY WIRED', MARGIN, 662, 1.4);

  ctx.textAlign = 'right';
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = COLORS.dim;
  ctx.fillText('P / ESC PAUSE  ·  CLICK TO UNLOCK AUDIO', W - MARGIN, 662);
}

function drawPausedOverlay(ctx, { time, pauseReasons, flagged }) {
  ctx.fillStyle = 'rgba(4, 6, 10, 0.82)';
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const boxW = 560;
  const boxH = 218;
  const pulse = prefersReducedMotion() ? 1 : 0.7 + Math.sin(time * 2) * 0.3;

  ctx.fillStyle = 'rgba(12, 16, 24, 0.9)';
  ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
  ctx.strokeStyle = 'rgba(232, 180, 90, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - boxW / 2 + 0.5, cy - boxH / 2 + 0.5, boxW - 1, boxH - 1);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.font = `600 10px ${MONO}`;
  ctx.fillStyle = COLORS.accentDim;
  ctx.fillText('SIMULATION HALTED', cx, cy - 58);

  ctx.font = `700 48px ${SANS}`;
  ctx.fillStyle = COLORS.ink;
  ctx.fillText('PAUSED', cx, cy + 2);

  const reasons = (pauseReasons.length ? pauseReasons : ['manual'])
    .map((reason) => REASON_LABELS[reason] ?? reason)
    .join(' + ');

  ctx.font = `500 12px ${MONO}`;
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(reasons.toUpperCase(), cx, cy + 38);

  ctx.globalAlpha = pulse;
  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = COLORS.accent;
  ctx.fillText('PRESS P / ESC — OR RETURN TO THIS TAB — TO RESUME', cx, cy + 76);
  ctx.globalAlpha = 1;

  if (flagged) {
    ctx.font = `400 10px ${MONO}`;
    ctx.fillStyle = COLORS.faint;
    ctx.fillText(
      'AUTO-PAUSE IS ARMED: TAB HIDDEN / WINDOW BLUR ADD THEIR OWN PAUSE REASONS',
      cx,
      cy + 101,
    );
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state
 */
export function drawBootScreen(ctx, state) {
  const { time, stats, paused, pauseReasons, viewport, audioState, assetSummary, version } =
    state;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  drawBackdrop(ctx, time);
  cornerBrackets(ctx);
  drawHeader(ctx, time, { version, paused });
  drawTitle(ctx, time, paused);
  drawStatus(ctx, { stats, audioState, assetSummary, version, viewport });
  drawScaffoldPanel(ctx, { stats });
  drawFooter(ctx, { paused });

  if (paused) {
    drawPausedOverlay(ctx, {
      time,
      pauseReasons,
      flagged: pauseReasons.some((reason) => reason !== 'manual'),
    });
  }
}
