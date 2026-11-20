/**
 * Headless Phase 0 shell check.
 *
 * Boots the game in Chromium, proves the loop/pause/resize/asset/audio wiring,
 * and fails on any console error, page error, failed request or 4xx/5xx.
 *
 * Run: npm run check
 */

import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { PROJECT_ROOT, startServer } from './dev-server.mjs';

const artifactsDir = path.join(PROJECT_ROOT, 'tests', 'artifacts');
const screenshotPath = path.join(artifactsDir, 'phase-0-boot.png');
const pausedScreenshotPath = path.join(artifactsDir, 'phase-0-paused.png');

const checks = [];
let failed = 0;
let fatal = false;

function record(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function relative(file) {
  return path.relative(PROJECT_ROOT, file).replaceAll('\\', '/');
}

async function listSourceFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...(await listSourceFiles(full)));
    else if (entry.isFile() && entry.name.endsWith('.js')) results.push(full);
  }
  return results;
}

/**
 * The manifest is the only game module allowed to mention an asset path or an
 * asset file extension. index.html and src/ are scanned.
 */
async function scanForHardcodedAssetPaths() {
  const manifestFile = path.join(PROJECT_ROOT, 'src', 'systems', 'asset-manifest.js');
  const files = [path.join(PROJECT_ROOT, 'index.html'), ...(await listSourceFiles(path.join(PROJECT_ROOT, 'src')))];
  const hits = [];
  const pathPattern = /assets\//;
  const extensionPattern = /\.(png|jpe?g|webp|gif|ogg|wav|mp3|m4a)\b/i;

  for (const file of files) {
    if (path.resolve(file) === path.resolve(manifestFile)) continue;
    const lines = (await readFile(file, 'utf8')).split(/\r?\n/);
    lines.forEach((line, index) => {
      if (pathPattern.test(line) || extensionPattern.test(line)) {
        hits.push(`${relative(file)}:${index + 1}: ${line.trim()}`);
      }
    });
  }
  return hits;
}

let serverInfo = null;
let browser = null;

try {
  serverInfo = await startServer({ port: 0, silent: true });
  browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const consoleWarnings = [];
  const pageErrors = [];
  const badResponses = [];
  const requestFailures = [];

  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error') consoleErrors.push(message.text());
    if (type === 'warning') consoleWarnings.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith('data:')) return;
    requestFailures.push(`${request.url()} (${request.failure()?.errorText ?? 'failed'})`);
  });

  await page.goto(serverInfo.url, { waitUntil: 'load' });
  await page.waitForFunction(() => (window.WANT?.game?.stats?.frames ?? 0) > 2, undefined, {
    timeout: 15000,
  });
  await page.waitForTimeout(1500);

  // --- boot ---------------------------------------------------------------
  const boot = await page.evaluate(() => {
    const game = window.WANT?.game;
    return {
      ready: document.documentElement.dataset.wantReady === 'true',
      hasDebugHandle: Boolean(window.WANT),
      version: window.WANT?.version ?? null,
      frames: game?.stats?.frames ?? 0,
      paused: game?.paused ?? null,
      reasons: game ? [...game.pauseReasons] : [],
    };
  });
  record(
    'boot: ready flag and live render loop',
    boot.ready && boot.hasDebugHandle && boot.frames > 5 && boot.paused === false,
    `version=${boot.version}, frames=${boot.frames}, paused=${boot.paused}, reasons=${
      boot.reasons.join(',') || 'none'
    }`,
  );

  // --- fixed timestep -----------------------------------------------------
  const loop = await page.evaluate(() => {
    const game = window.WANT.game;
    return {
      fixedDt: game.fixedDt,
      maxFrameDt: game.maxFrameDt,
      maxSteps: game.maxSteps,
      updates: game.stats.updates,
      fps: game.stats.fps,
      lowFps: game.stats.lowFps,
    };
  });
  record(
    'loop: fixed 60 Hz with delta clamp and step cap',
    Math.abs(loop.fixedDt - 1 / 60) < 1e-9 &&
      Math.abs(loop.maxFrameDt - 0.25) < 1e-9 &&
      loop.maxSteps === 8 &&
      loop.updates > 0,
    `fixedDt=${loop.fixedDt.toFixed(5)}, maxFrameDt=${loop.maxFrameDt}, maxSteps=${loop.maxSteps}, updates=${loop.updates}`,
  );
  record('loop: FPS is measured', loop.fps > 0, `${loop.fps} fps`);

  // Deterministically drive the guard with synthetic 40 fps windows. This
  // proves the 3-second sustained threshold without relying on CI throttling.
  const guard = await page.evaluate(() => {
    const game = window.WANT.game;
    const originalWarn = console.warn;
    const warnings = [];
    const saved = {
      lowFpsWindows: game._lowFpsWindows,
      lastWarn: game._lastFpsWarnAt,
      windowSeconds: game._fpsWindowSeconds,
      windowFrames: game._fpsWindowFrames,
      fps: game.stats.fps,
      lowFps: game.stats.lowFps,
      lowFpsSeconds: game.stats.lowFpsSeconds,
    };

    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      game._lowFpsWindows = 0;
      game._lastFpsWarnAt = -Infinity;
      game._fpsWindowSeconds = 0;
      game._fpsWindowFrames = 0;
      for (let i = 0; i < 150; i += 1) game._measureFps(1 / 40);
    } finally {
      console.warn = originalWarn;
      game._lowFpsWindows = saved.lowFpsWindows;
      game._lastFpsWarnAt = saved.lastWarn;
      game._fpsWindowSeconds = saved.windowSeconds;
      game._fpsWindowFrames = saved.windowFrames;
      game.stats.fps = saved.fps;
      game.stats.lowFps = saved.lowFps;
      game.stats.lowFpsSeconds = saved.lowFpsSeconds;
    }

    const fired = warnings.filter((warning) => warning.includes('FPS guard'));
    return { count: fired.length, text: fired[0] ?? '' };
  });
  record(
    'loop: FPS guard warns after 3 sustained seconds below 50',
    guard.count === 1 && /sustained/.test(guard.text),
    guard.text || 'no warning fired',
  );

  // --- resize / render ----------------------------------------------------
  await page.setViewportSize({ width: 960, height: 600 });
  await page.waitForTimeout(400);

  const resized = await page.evaluate(() => {
    const canvas = document.getElementById('game');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const viewport = window.WANT.game.viewport;
    const ctx = canvas.getContext('2d');
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sampled = 0;
    let lit = 0;
    for (let i = 0; i < data.length; i += 4 * 211) {
      sampled += 1;
      if (data[i] + data[i + 1] + data[i + 2] > 120) lit += 1;
    }
    return {
      backingW: canvas.width,
      backingH: canvas.height,
      cssW: rect.width,
      cssH: rect.height,
      dpr,
      viewport,
      sampled,
      lit,
    };
  });

  record(
    'resize: backing store tracks CSS size and DPR',
    Math.abs(resized.backingW - Math.round(resized.cssW * resized.dpr)) <= 1 &&
      Math.abs(resized.backingH - Math.round(resized.cssH * resized.dpr)) <= 1,
    `canvas=${resized.backingW}x${resized.backingH}, css=${resized.cssW}x${resized.cssH}, dpr=${resized.dpr}`,
  );

  const vp = resized.viewport;
  const expectedScale = Math.min(resized.cssW / 1280, resized.cssH / 720);
  record(
    'resize: 16:9 letterbox stays centred and unstretched',
    Math.abs(vp.width / vp.height - 16 / 9) < 1e-6 &&
      Math.abs(vp.scale - expectedScale) < 1e-6 &&
      Math.abs(vp.x - (resized.cssW - vp.width) / 2) < 0.5 &&
      Math.abs(vp.y - (resized.cssH - vp.height) / 2) < 0.5,
    `viewport=${vp.width.toFixed(1)}x${vp.height.toFixed(1)}, scale=${vp.scale.toFixed(4)}`,
  );

  record(
    'render: canvas contains a drawn frame (not blank)',
    resized.lit > resized.sampled * 0.01,
    `${resized.lit}/${resized.sampled} bright samples`,
  );

  // --- manual pause -------------------------------------------------------
  await page.evaluate(() => window.WANT.game.pause('manual'));
  await page.waitForTimeout(150);
  const pausedA = await page.evaluate(() => ({
    paused: window.WANT.game.paused,
    frames: window.WANT.game.stats.frames,
    time: window.WANT.game.time,
    reasons: [...window.WANT.game.pauseReasons],
  }));
  await page.waitForTimeout(350);
  const pausedB = await page.evaluate(() => ({
    frames: window.WANT.game.stats.frames,
    time: window.WANT.game.time,
  }));
  record(
    'pause: manual pause freezes frames and simulation time',
    pausedA.paused &&
      pausedA.reasons.includes('manual') &&
      pausedB.frames === pausedA.frames &&
      pausedB.time === pausedA.time,
    `frames ${pausedA.frames} -> ${pausedB.frames}, time ${pausedA.time.toFixed(3)} -> ${pausedB.time.toFixed(3)}`,
  );

  // Resizing while paused must re-render the overlay without restarting time.
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(250);
    const pausedAfterResize = await page.evaluate(() => ({
      paused: window.WANT.game.paused,
      frames: window.WANT.game.stats.frames,
      time: window.WANT.game.time,
    }));
    record(
      'pause: resizing while paused keeps the loop frozen',
      pausedAfterResize.paused &&
        pausedAfterResize.frames === pausedB.frames &&
        pausedAfterResize.time === pausedB.time,
      `frames=${pausedAfterResize.frames}, time=${pausedAfterResize.time.toFixed(3)}`,
    );
    await mkdir(artifactsDir, { recursive: true });
    await page.screenshot({ path: pausedScreenshotPath });
    console.log(`\n[check] paused screenshot: ${relative(pausedScreenshotPath)}`);
  } catch (error) {
    console.warn(`[check] paused screenshot skipped: ${error.message}`);
  }

  await page.evaluate(() => window.WANT.game.resume('manual'));
  await page.waitForTimeout(400);
  const resumed = await page.evaluate(() => ({
    paused: window.WANT.game.paused,
    frames: window.WANT.game.stats.frames,
    time: window.WANT.game.time,
  }));
  record(
    'pause: resume restarts the loop without a time jump',
    !resumed.paused && resumed.frames > pausedB.frames && resumed.time - pausedB.time < 0.8,
    `frames=${resumed.frames}, simTime +${(resumed.time - pausedB.time).toFixed(3)}s`,
  );

  // --- tab visibility -----------------------------------------------------
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(150);
  const hiddenA = await page.evaluate(() => ({
    paused: window.WANT.game.paused,
    frames: window.WANT.game.stats.frames,
    reasons: [...window.WANT.game.pauseReasons],
  }));
  await page.waitForTimeout(350);
  const hiddenB = await page.evaluate(() => window.WANT.game.stats.frames);
  record(
    'pause: tab hidden adds reason and halts the loop',
    hiddenA.paused && hiddenA.reasons.includes('tab-hidden') && hiddenB === hiddenA.frames,
    `frames ${hiddenA.frames} -> ${hiddenB}, reasons=${hiddenA.reasons.join(',')}`,
  );

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    delete document.hidden;
  });
  await page.waitForTimeout(400);
  const visible = await page.evaluate(() => ({
    paused: window.WANT.game.paused,
    frames: window.WANT.game.stats.frames,
  }));
  record(
    'pause: returning to the tab resumes cleanly',
    !visible.paused && visible.frames > hiddenB,
    `frames ${hiddenB} -> ${visible.frames}`,
  );

  // --- asset manifest -----------------------------------------------------
  const manifest = await page.evaluate(() => {
    const m = window.WANT.assets;
    const entry = m.tryGetEntry('characters.k.sprites');
    return {
      count: m.list().length,
      summary: m.summary(),
      entry,
      resolved: entry ? m.resolve(entry.id) : null,
      unknownThrows: (() => {
        try {
          m.resolve('definitely.not.an.asset');
          return false;
        } catch {
          return true;
        }
      })(),
    };
  });

  record(
    'assets: manifest holds the planned catalog and loads nothing at boot',
    manifest.count >= 40 &&
      manifest.summary.planned === manifest.count &&
      manifest.summary.loaded === 0 &&
      manifest.unknownThrows,
    `${manifest.count} ids, ${manifest.summary.planned} planned, ${manifest.summary.loaded} loaded at boot`,
  );
  record(
    'assets: IDs resolve to URLs underneath assets/',
    Boolean(manifest.resolved) &&
      manifest.resolved.endsWith(`/assets/${manifest.entry.path}`) &&
      manifest.entry.type === 'image',
    `${manifest.entry?.id} -> ${manifest.resolved}`,
  );

  const assetPathHits = await scanForHardcodedAssetPaths();
  record(
    'assets: no asset path strings outside asset-manifest.js',
    assetPathHits.length === 0,
    assetPathHits.length ? assetPathHits.slice(0, 3).join(' | ') : 'scan clean (index.html + src/)',
  );

  // --- audio --------------------------------------------------------------
  const audio = await page.evaluate(() => {
    const system = window.WANT.audio;
    const before = system.getState();
    system.setBusVolume('music', 0.25);
    system.mute();
    const muted = system.getState();
    system.unmute();
    const after = system.getState();
    return { before, muted, after };
  });

  record(
    'audio: master/music/sfx buses, mute and restore',
    ['master', 'music', 'sfx'].every((bus) => typeof audio.before.volumes[bus] === 'number') &&
      audio.before.context === 'uninitialized' &&
      audio.muted.muted === true &&
      audio.after.muted === false &&
      Math.abs(audio.after.volumes.music - 0.25) < 1e-9,
    `context=${audio.before.context}, buses=${audio.before.buses.join('/')}, mute=${audio.muted.muted}->${audio.after.muted}`,
  );

  const silentCue = await page.evaluate(() => window.WANT.audio.play('audio.doesNotExist'));
  record(
    'audio: missing cue resolves to silence without throwing',
    silentCue === null,
    'play() returned null',
  );

  // --- console / network --------------------------------------------------
  await page.waitForTimeout(300);
  record(
    'console: zero console errors and zero page errors',
    consoleErrors.length === 0 && pageErrors.length === 0,
    `${consoleErrors.length} console error(s), ${pageErrors.length} page error(s)${
      consoleErrors.length ? `: ${consoleErrors.slice(0, 2).join(' | ')}` : ''
    }${pageErrors.length ? `: ${pageErrors.slice(0, 2).join(' | ')}` : ''}`,
  );
  record(
    'network: no failed requests and no 4xx/5xx responses',
    badResponses.length === 0 && requestFailures.length === 0,
    `${badResponses.length} bad response(s), ${requestFailures.length} failed request(s)${
      badResponses.length ? `: ${badResponses.slice(0, 2).join(' | ')}` : ''
    }${requestFailures.length ? `: ${requestFailures.slice(0, 2).join(' | ')}` : ''}`,
  );

  // --- screenshot ---------------------------------------------------------
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      for (const reason of [...window.WANT.game.pauseReasons]) {
        window.WANT.game.resume(reason);
      }
    });
    await page.waitForTimeout(600);
    await mkdir(artifactsDir, { recursive: true });
    await page.screenshot({ path: screenshotPath });
    console.log(`\n[check] screenshot: ${relative(screenshotPath)}`);
  } catch (error) {
    console.warn(`[check] screenshot skipped: ${error.message}`);
  }

  if (consoleWarnings.length > 0) {
    console.log(`\n[check] ${consoleWarnings.length} console warning(s) (non-fatal):`);
    for (const warning of consoleWarnings.slice(0, 5)) {
      console.log(`  ! ${warning}`);
    }
  }
} catch (error) {
  fatal = true;
  record(
    'check run completed',
    false,
    error instanceof Error ? error.message : String(error),
  );
  if (error?.stack) console.error(error.stack);
  if (/Executable doesn't exist|browserType\.launch/i.test(String(error))) {
    console.error('\n[check] Chromium is not installed for Playwright. Run: npx playwright install chromium');
  }
} finally {
  try {
    await browser?.close();
  } catch {
    // Ignore teardown errors.
  }
  try {
    await serverInfo?.close();
  } catch {
    // Ignore teardown errors.
  }
}

const passed = checks.filter((check) => check.ok).length;
console.log(`\n[check] ${passed}/${checks.length} checks passed, ${failed} failed.`);

if (failed > 0 || fatal) process.exitCode = 1;
