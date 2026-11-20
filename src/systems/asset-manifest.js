/**
 * THE asset manifest.
 *
 * This is the only module allowed to know where an asset lives. Gameplay, UI,
 * audio and tests reference assets by ID (`characters.k.sprites`,
 * `audio.music.alleyCombat`) and call `load()` / `resolve()` here.
 *
 * Paths are relative to `assets/` and are validated at module load. Group B
 * delivers files to these paths (or asks for the manifest to be updated first);
 * no other code changes when a file is swapped.
 *
 * Loading is lazy and tolerant: a missing planned asset logs a warning and
 * resolves to `null` instead of throwing, so the shell and un-finished scenes
 * keep running while Group B's assets land.
 */

export const AssetType = Object.freeze({
  IMAGE: 'image',
  AUDIO: 'audio',
  JSON: 'json',
  TEXT: 'text',
});

export const AssetStatus = Object.freeze({
  /** Path is reserved; the file is not expected to exist yet. */
  PLANNED: 'planned',
  /** Delivered and ledgered; safe to load. */
  READY: 'ready',
  /** Superseded; kept only so old scenes fail loudly in review, not at runtime. */
  DEPRECATED: 'deprecated',
});

const ROOT = new URL('../../assets/', import.meta.url);
const warned = new Set();

function image(id, path, note = '') {
  return Object.freeze({ id, path, type: AssetType.IMAGE, status: AssetStatus.PLANNED, note });
}

function audio(id, path, note = '') {
  return Object.freeze({ id, path, type: AssetType.AUDIO, status: AssetStatus.PLANNED, note });
}

/** Every asset WANT will reference. Keep grouped and alphabetical within groups. */
const DEFINITIONS = [
  // --- characters -----------------------------------------------------------
  image('characters.k.fullBody', 'characters/k/k-full-body.png'),
  image('characters.k.speaking', 'characters/k/k-speaking-pose.png'),
  image('characters.k.sprites', 'characters/k/k-interaction-sprites-48px.png'),
  image('characters.sayu.fullBody', 'characters/sayu/sayu-full-body.png'),
  image('characters.sayu.speaking', 'characters/sayu/sayu-speaking-pose.png'),
  image('characters.sayu.sprites', 'characters/sayu/sayu-interaction-sprites-48px.png'),
  image('characters.nero.fullBody', 'characters/nero/nero-full-body.png'),
  image('characters.nero.speaking', 'characters/nero/nero-speaking-pose.png'),
  image('characters.nero.sprites', 'characters/nero/nero-interaction-sprites-48px.png'),
  image('characters.kingsley.fullBody', 'characters/kingsley/kingsley-full-body.png'),
  image('characters.kingsley.speaking', 'characters/kingsley/kingsley-speaking-pose.png'),
  image('characters.kingsley.sprites', 'characters/kingsley/kingsley-interaction-sprites-48px.png'),
  image('characters.mai.fullBody', 'characters/mai/mai-full-body.png'),
  image('characters.mai.speaking', 'characters/mai/mai-speaking-pose.png'),
  image('characters.mai.sprites', 'characters/mai/mai-interaction-sprites-48px.png'),
  image('characters.isshin.fullBody', 'characters/isshin/isshin-full-body.png'),
  image('characters.isshin.speaking', 'characters/isshin/isshin-speaking-pose.png'),
  image('characters.isshin.sprites', 'characters/isshin/isshin-interaction-sprites-48px.png'),
  image('characters.lina.fullBody', 'characters/lina/lina-full-body.png'),
  image('characters.lina.speaking', 'characters/lina/lina-speaking-pose.png'),
  image('characters.lina.sprites', 'characters/lina/lina-interaction-sprites-48px.png'),
  image('characters.enemies.scout.sheet', 'characters/enemies/scout-sheet.png'),
  image('characters.enemies.rusher.sheet', 'characters/enemies/rusher-sheet.png'),

  // --- backgrounds ----------------------------------------------------------
  image('backgrounds.campus.courtyard', 'backgrounds/campus-courtyard.png'),
  image('backgrounds.campus.dorm', 'backgrounds/campus-dorm.png'),
  image('backgrounds.clinic.interior', 'backgrounds/clinic-interior.png'),
  image('backgrounds.alley.eastServiceLane', 'backgrounds/east-service-lane.png'),
  image('backgrounds.settlement.shelter', 'backgrounds/shelter-interior.png'),

  // --- portraits ------------------------------------------------------------
  image('portraits.k.neutral', 'portraits/k/k-neutral.png'),
  image('portraits.mai.neutral', 'portraits/mai/mai-neutral.png'),
  image('portraits.lina.rescue', 'portraits/lina/lina-rescue.png'),

  // --- illustrations --------------------------------------------------------
  image('illustrations.c01.scanMismatch', 'illustrations/c01-scan-mismatch.png'),
  image('illustrations.c02.wrongPerson', 'illustrations/c02-wrong-person.png'),
  image('illustrations.c04.ending', 'illustrations/c04-ending.png'),

  // --- audio: sfx -----------------------------------------------------------
  audio('audio.sfx.uiConfirm', 'audio/sfx/ui-confirm.ogg'),
  audio('audio.sfx.uiCancel', 'audio/sfx/ui-cancel.ogg'),
  audio('audio.sfx.footsteps', 'audio/sfx/footsteps.ogg'),
  audio('audio.sfx.pistol', 'audio/sfx/pistol.ogg'),
  audio('audio.sfx.dodge', 'audio/sfx/dodge.ogg'),
  audio('audio.sfx.counter', 'audio/sfx/counter.ogg'),
  audio('audio.sfx.hit', 'audio/sfx/hit.ogg'),
  audio('audio.sfx.gate', 'audio/sfx/gate.ogg'),
  audio('audio.sfx.objective', 'audio/sfx/objective.ogg'),

  // --- audio: music ---------------------------------------------------------
  audio('audio.music.campusAmbient', 'audio/music/campus-ambient.ogg'),
  audio('audio.music.clinicAmbient', 'audio/music/clinic-ambient.ogg'),
  audio('audio.music.alleyCombat', 'audio/music/alley-combat.ogg'),
  audio('audio.music.ending', 'audio/music/ending.ogg'),

  // --- vfx ------------------------------------------------------------------
  image('vfx.muzzleFlash', 'vfx/muzzle-flash.png'),
  image('vfx.counterRing', 'vfx/counter-ring.png'),
  image('vfx.hitSpark', 'vfx/hit-spark.png'),
  image('vfx.scanMismatch', 'vfx/scan-mismatch.png'),
];

function assertPath(entry) {
  if (typeof entry.path !== 'string' || entry.path.length === 0) {
    throw new Error(`Asset "${entry.id}" has no path.`);
  }
  if (entry.path.startsWith('/') || entry.path.includes('\\') || entry.path.split('/').includes('..')) {
    throw new Error(`Asset "${entry.id}" path must stay inside assets/: ${entry.path}`);
  }
}

const entries = new Map();
for (const definition of DEFINITIONS) {
  assertPath(definition);
  if (entries.has(definition.id)) {
    throw new Error(`Duplicate asset id: ${definition.id}`);
  }
  entries.set(definition.id, definition);
}

/** @type {Map<string, {status:string, promise:Promise<unknown>|null, value:unknown, error:Error|null}>} */
const cache = new Map();

function warn(message) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[WANT assets] ${message}`);
}

/** True when an ID is registered. */
export function has(id) {
  return entries.has(id);
}

/** Entry metadata. Throws for unknown IDs (typos should be loud). */
export function getEntry(id) {
  const entry = entries.get(id);
  if (!entry) {
    throw new Error(
      `Unknown asset id "${id}". Register it in src/systems/asset-manifest.js.`,
    );
  }
  return entry;
}

/** Entry metadata or null, for tolerant callers such as the audio stub. */
export function tryGetEntry(id) {
  return entries.get(id) ?? null;
}

/** Absolute URL for an asset ID. */
export function resolve(id) {
  return new URL(getEntry(id).path, ROOT).href;
}

/** List registered assets, optionally filtered by type and/or status. */
export function list(filter = {}) {
  const values = [...entries.values()];
  return values.filter(
    (entry) =>
      (!filter.type || entry.type === filter.type) &&
      (!filter.status || entry.status === filter.status),
  );
}

/** Load state: unknown | idle | loading | ready | error. */
export function getState(id) {
  if (!entries.has(id)) return 'unknown';
  return cache.get(id)?.status ?? 'idle';
}

/** Backwards-compatible alias used by a few scaffold notes. */
export const getStatus = getState;

function loadImage(url) {
  return new Promise((resolveImage, rejectImage) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = async () => {
      try {
        await img.decode?.();
      } catch {
        // Decoding can reject on some browsers after onload; the image is usable.
      }
      resolveImage(img);
    };
    img.onerror = () => rejectImage(new Error('image failed to load or decode'));
    img.src = url;
  });
}

async function loadAudio(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.arrayBuffer();
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function loadText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

const LOADERS = {
  [AssetType.IMAGE]: loadImage,
  [AssetType.AUDIO]: loadAudio,
  [AssetType.JSON]: loadJson,
  [AssetType.TEXT]: loadText,
};

/**
 * Load one asset and cache it. Never rejects: failures resolve to null after a
 * console warning, so a scene can boot with placeholder art.
 */
export function load(id) {
  const entry = entries.get(id);
  if (!entry) {
    warn(`Unknown asset id "${id}" — returning null.`);
    return Promise.resolve(null);
  }

  const cached = cache.get(id);
  if (cached) return cached.promise ?? Promise.resolve(cached.value);

  const record = { status: 'loading', promise: null, value: null, error: null };
  cache.set(id, record);

  const loader = LOADERS[entry.type];
  if (!loader) {
    record.status = 'error';
    record.error = new Error(`No loader for asset type "${entry.type}"`);
    warn(`No loader for "${id}" (${entry.type}).`);
    record.promise = Promise.resolve(null);
    return record.promise;
  }

  record.promise = (async () => {
    try {
      const value = await loader(resolve(id), entry);
      record.status = 'ready';
      record.value = value;
      return value;
    } catch (error) {
      record.status = 'error';
      record.error = error instanceof Error ? error : new Error(String(error));
      warn(
        `Could not load "${id}" (${entry.path}): ${record.error.message}. ` +
          'Continuing without it.',
      );
      return null;
    }
  })();

  return record.promise;
}

/**
 * Load several assets without failing the batch.
 * @param {string[]} ids
 * @param {{onProgress?: (done:number, total:number, id:string) => void}} [options]
 */
export async function preload(ids, { onProgress } = {}) {
  const unique = [...new Set(ids)];
  const results = new Map();
  let done = 0;

  await Promise.all(
    unique.map(async (id) => {
      const value = await load(id);
      results.set(id, value);
      done += 1;
      onProgress?.(done, unique.length, id);
    }),
  );

  const failed = [...results].filter(([, value]) => value === null).map(([id]) => id);
  return {
    loaded: unique.length - failed.length,
    failed,
    results,
  };
}

/** Drop cached values (development aid; not used by the boot path). */
export function clearCache() {
  cache.clear();
  warned.clear();
}

/** Counts for HUDs and the Phase 0 check. */
export function summary() {
  const counts = { total: entries.size, planned: 0, ready: 0, deprecated: 0 };
  for (const entry of entries.values()) {
    counts[entry.status] = (counts[entry.status] ?? 0) + 1;
  }
  let loaded = 0;
  let failed = 0;
  for (const record of cache.values()) {
    if (record.status === 'ready') loaded += 1;
    if (record.status === 'error') failed += 1;
  }
  return { ...counts, loaded, failed, cached: cache.size };
}

/** Named namespace for callers that prefer an object import. */
export const assetManifest = Object.freeze({
  AssetType,
  AssetStatus,
  has,
  getEntry,
  tryGetEntry,
  resolve,
  list,
  getState,
  getStatus,
  load,
  preload,
  clearCache,
  summary,
});
