// Animated, accessible Chapter One Ending screen overlay.
// Fixes the Phaser Container hit-area soft-lock and replaces the static box
// with a cinematic twilight courtyard presentation, drifting cherry-blossom petals,
// staggered epilogue typography, ending music, and responsive keyboard + pointer actions.

import { audio } from '../services/audio';

export interface EndingScreenOptions {
  difficultyLabel: string;
  reducedMotion: boolean;
  onReturnToTitle: () => void;
  onReplayRescue: () => void;
  onOpenHorde: () => void;
}

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
  alpha: number;
  warm: boolean;
}

let overlay: HTMLElement | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let rafId: number | null = null;
let resizeHandler: (() => void) | null = null;

export function isEndingScreenActive(): boolean {
  return overlay !== null && !overlay.hidden;
}

export function destroyEndingScreen(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (keyHandler) {
    window.removeEventListener('keydown', keyHandler, true);
    keyHandler = null;
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}

export function showEndingScreen(options: EndingScreenOptions): void {
  destroyEndingScreen();
  document.body.dataset.state = 'ending';
  audio.setSceneAudio('ending', 'campus');

  overlay = document.createElement('div');
  overlay.id = 'chapter-ending';
  overlay.className = `ending-overlay${options.reducedMotion ? ' is-reduced-motion' : ''}`;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'ending-heading');

  overlay.innerHTML = `
    <div class="ending-backdrop" aria-hidden="true">
      <img
        src="/assets/backgrounds/chapter-one-ending.png"
        alt=""
        class="ending-bg-img"
      />
      <div class="ending-scrim"></div>
      <canvas id="ending-petals" class="ending-petals-canvas"></canvas>
    </div>

    <div class="ending-card">
      <p class="ending-kicker">Chapter One Complete · ${options.difficultyLabel}</p>
      <h2 id="ending-heading" class="ending-title">The Wrong Person</h2>
      <blockquote class="ending-epigraph">
        “You were not the person they came for.<br />You were the person who stayed.”
      </blockquote>

      <div class="ending-transcript" aria-label="Chapter epilogue">
        <p class="ending-line" style="--delay: 0.25s">
          <span class="ending-speaker">Lina</span> “I thought nobody heard me.”
          <span class="ending-sep" aria-hidden="true">·</span>
          <span class="ending-speaker">K</span> “I almost kept walking.”
        </p>
        <p class="ending-line" style="--delay: 0.45s">
          <span class="ending-speaker">Lina</span> “But you didn’t.”
        </p>
        <p class="ending-line" style="--delay: 0.65s">
          <span class="ending-speaker">Mai</span> “You’re who went back for her. I’m sorry for what I said.”
        </p>
        <p class="ending-line" style="--delay: 0.85s">
          <span class="ending-speaker">Isshin</span> “Today you gave someone a way home. We can start there.”
        </p>
      </div>

      <p class="ending-status">Lina safely in camp · Resolve fully restored</p>

      <div class="ending-actions">
        <button type="button" id="ending-return-title" class="primary" data-ending-primary="true">
          Return to Title
        </button>
        <button type="button" id="ending-open-horde" class="secondary">
          Enter Horde Mode
        </button>
        <button type="button" id="ending-replay-rescue" class="secondary">
          Replay Rescue
        </button>
      </div>

      <p class="ending-hint">Enter or Esc · Return to Title</p>
    </div>
  `;

  document.body.appendChild(overlay);

  const returnBtn = overlay.querySelector<HTMLButtonElement>('#ending-return-title')!;
  const hordeBtn = overlay.querySelector<HTMLButtonElement>('#ending-open-horde')!;
  const replayBtn = overlay.querySelector<HTMLButtonElement>('#ending-replay-rescue')!;

  const triggerReturn = () => {
    audio.playCue('ui-confirm');
    destroyEndingScreen();
    options.onReturnToTitle();
  };

  returnBtn.addEventListener('click', triggerReturn);
  hordeBtn.addEventListener('click', () => {
    audio.playCue('ui-confirm');
    destroyEndingScreen();
    options.onOpenHorde();
  });
  replayBtn.addEventListener('click', () => {
    audio.playCue('ui-confirm');
    destroyEndingScreen();
    options.onReplayRescue();
  });

  // Capture Enter / Space / Esc so the player is NEVER trapped on the ending screen.
  const openedAt = performance.now();
  keyHandler = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (performance.now() - openedAt < 280) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      triggerReturn();
    } else if (
      (event.key === 'Enter' || event.key === ' ')
      && document.activeElement !== hordeBtn
      && document.activeElement !== replayBtn
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      triggerReturn();
    }
  };
  window.addEventListener('keydown', keyHandler, true);

  returnBtn.focus({ preventScroll: true });

  if (!options.reducedMotion) {
    startPetalCanvas(overlay.querySelector<HTMLCanvasElement>('#ending-petals')!);
  }
}

function startPetalCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  resizeHandler = resize;
  window.addEventListener('resize', resize);

  // Fixed-capacity petal ring buffer (zero per-frame allocations)
  const count = 40;
  const petals: Petal[] = Array.from({ length: count }, (_, idx) => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: 14 + Math.random() * 24,
    vy: 18 + Math.random() * 26,
    size: 3.5 + Math.random() * 4.5,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.8,
    alpha: 0.35 + Math.random() * 0.45,
    warm: idx % 3 === 0,
  }));

  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < petals.length; i++) {
      const p = petals[i];
      p.x += (p.vx + Math.sin(now * 0.0012 + i) * 12) * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;

      if (p.y > canvas.height + 16) {
        p.y = -12;
        p.x = Math.random() * canvas.width;
      }
      if (p.x > canvas.width + 16) {
        p.x = -12;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.warm
        ? `rgba(243, 198, 125, ${p.alpha})`
        : `rgba(244, 179, 198, ${p.alpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}
