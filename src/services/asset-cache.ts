// Client-side performance & network-resilience helper:
// 1. Registers the Cache-First Service Worker (/sw.js) so sprites, backgrounds,
//    and WAV audio load directly from local storage on repeat/flaky connections.
// 2. Lazily pre-warms the Phaser game bundle (still dynamically imported, never
//    statically imported on initial boot) once the player enters Mode Select.
// 3. Gently warms high-frequency combat/rescue assets during browser idle slices
//    so scene launches feel instantaneous without causing frame drops.

type CreateGameModule = typeof import('../game/create-game');

let swRegistered = false;
let gameModulePromise: Promise<CreateGameModule> | null = null;
let criticalWarmStarted = false;

const CRITICAL_WARM_URLS: readonly string[] = [
  '/assets/backgrounds/twilight-ruins-warehouse-yard.png',
  '/assets/characters/k/k-interaction-sprites-48px.png',
  '/assets/characters/k/k-walk-down-48px.png',
  '/assets/characters/k/k-walk-left-48px.png',
  '/assets/characters/k/k-walk-right-48px.png',
  '/assets/characters/k/k-walk-up-48px.png',
  '/assets/characters/lina/lina-shelter-48px.png',
  '/assets/characters/lina/lina-idle-48px.png',
  '/assets/characters/scout/scout-idle-4dir-48px.png',
  '/assets/characters/rusher/rusher-idle-4dir-48px.png',
  '/assets/audio/pistol-shot.wav',
  '/assets/audio/ui-confirm.wav',
  '/assets/audio/dodge.wav',
  '/assets/audio/k-hit.wav',
  '/assets/audio/machine-hit.wav',
];

export function registerOfflineCache(): void {
  if (swRegistered || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  swRegistered = true;
  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Non-fatal in restricted/sandboxed frames; in-memory caches still protect gameplay.
    });
  };
  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}

/**
 * Dynamically imports the Phaser game entry once and memoizes the promise so
 * launching Story, Rescue, or Horde has zero bundle-fetch stall.
 */
export function loadGameModule(): Promise<CreateGameModule> {
  if (!gameModulePromise) {
    gameModulePromise = import('../game/create-game');
  }
  return gameModulePromise;
}

/** Gently pre-warms the Phaser chunk on hover / Mode Select entry. */
export function warmGameModule(): void {
  if (gameModulePromise || typeof window === 'undefined') return;
  scheduleIdle(() => {
    void loadGameModule().catch(() => {
      gameModulePromise = null;
    });
  });
}

/** Staggered idle prefetch of critical sprites & SFX into Service Worker / HTTP cache. */
export function warmCriticalAssets(): void {
  if (criticalWarmStarted || typeof window === 'undefined' || typeof fetch === 'undefined') return;
  criticalWarmStarted = true;

  let index = 0;
  const step = () => {
    if (index >= CRITICAL_WARM_URLS.length) return;
    const url = CRITICAL_WARM_URLS[index++];
    void fetch(url, { priority: 'low' as RequestPriority }).catch(() => { /* ignore offline miss */ });
    window.setTimeout(() => scheduleIdle(step), 140);
  };
  scheduleIdle(step);
}

function scheduleIdle(fn: () => void): void {
  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(fn, { timeout: 1200 });
  } else {
    window.setTimeout(fn, 80);
  }
}
