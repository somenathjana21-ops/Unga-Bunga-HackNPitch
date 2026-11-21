import { readFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(root, 'assets/runtime-manifest.json'), 'utf8'));
const checking = process.argv.includes('--check');
const ids = new Set();
const destinations = new Set();
let bytes = 0;

const AUDIO_MANIFEST = [
  ['music-campus', 'MUSIC/music-campus_(76_BPM_#3-1795208617010.wav'],
  ['music-future', 'MUSIC/music-future_(64_BPM_#4-1795208712940.wav'],
  ['music-rescue', 'MUSIC/music-rescue_(104_BP_#2-1795208896771.wav'],
  ['music-ending', 'MUSIC/music-ending_(72_BPM_#4-1795209049811.wav'],
  ['amb-campus', 'MUSIC/amb-campus_Create_an_#1-1795208190977.wav'],
  ['amb-dorm', 'MUSIC/amb-dorm_Create_an_o_#2-1795208267093.wav'],
  ['amb-clinic-camp', 'MUSIC/amb-clinic-camp_(als_#2-1795208334610.wav'],
  ['amb-ruined-city', 'MUSIC/amb-ruined-city_Crea_#1-1795208393965.wav'],
  ['ui-confirm', 'MUSIC/ui-confirm_Create_on_#4-1795205939200.wav'],
  ['phone-vibration', 'MUSIC/phone-vibration_Crea_#1-1795206074601.wav'],
  ['wallet-drop', 'MUSIC/wallet-drop_Create_o_#2-1795206226075.wav'],
  ['bracelet-drop', 'MUSIC/bracelet-drop_Create_#1-1795206308666.wav'],
  ['power-cut-impact', 'MUSIC/power-cut-impact_Cre_#3-1795206375820.wav'],
  ['machine-shriek', 'MUSIC/machine-shriek_Creat_#3-1795206503966.wav'],
  ['pistol-shot', 'MUSIC/pistol-shot_Create_o_#3-1795206785652.wav'],
  ['scout-windup', 'MUSIC/scout-windup_Create__#2-1795206883968.wav'],
  ['rusher-windup', 'MUSIC/rusher-windup_Create_#1-1795206966242.wav'],
  ['dodge', 'MUSIC/dodge_Create_one_ori_#1-1795207060088.wav'],
  ['counter-ready', 'MUSIC/counter-ready_Create_#1-1795207127523.wav'],
  ['counter-impact', 'MUSIC/counter-impact_Creat_#4-1795207264350.wav'],
  ['k-hit', 'MUSIC/k-hit_Create_one_ori_#3-1795207352297.wav'],
  ['machine-hit', 'MUSIC/machine-hit_Create_o_#2-1795207407972.wav'],
  ['machine-disabled', 'MUSIC/machine-disabled_Cre_#3-1795207490931.wav'],
  ['breach-blast', 'MUSIC/breach-blast_Create__#1-1795207551796.wav'],
  ['lane-crash', 'MUSIC/lane-crash_Create_on_#2-1795207609130.wav'],
  ['radio-connect', 'MUSIC/radio-connect_Create_#4-1795207675643.wav'],
  ['radio-connect-alt', 'MUSIC/adio-connect_Create__#3-1795207727584.wav'],
  ['resolve-restored', 'MUSIC/resolve-restored_Cre_#1-1795207824707.wav'],
  ['gate-open', 'MUSIC/gate-open_Create_one_#1-1795207902983.wav'],
  ['failure', 'MUSIC/failure_Create_one_o_#4-1795207952300.wav'],
  ['step-campus', 'MUSIC/step-campus_(run_3_t_#1-1795205939196.wav'],
  ['step-interior', 'MUSIC/step-interior_(run_3_#4-1795205939194.wav'],
  ['step-debris', 'MUSIC/step-debris_(run_3_t_#4-1795205939190.wav'],
];

for (const asset of manifest.assets) {
  if (ids.has(asset.id) || destinations.has(asset.output)) throw new Error(`Duplicate asset: ${asset.id}`);
  ids.add(asset.id);
  destinations.add(asset.output);
  const source = resolve(root, asset.source);
  const publicRoot = resolve(root, 'public/assets');
  const destination = resolve(publicRoot, asset.output);
  const sourceOk = [resolve(root, 'assets/characters'), resolve(root, 'assets/backgrounds'), resolve(root, 'assets/effects'), resolve(root, 'assets/tilesets')].some((base) => {
    const rel = relative(base, source);
    return !rel.startsWith('..') && !isAbsolute(rel);
  });
  if (!sourceOk) throw new Error(`Asset path escapes its folder: ${asset.id}`);
  const destRel = relative(publicRoot, destination);
  if (destRel.startsWith('..') || isAbsolute(destRel)) throw new Error(`Asset output path escapes its folder: ${asset.id}`);
  const data = await readFile(source);
  if (data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Not a PNG: ${asset.id}`);
  if (data.readUInt32BE(16) !== asset.width || data.readUInt32BE(20) !== asset.height) {
    throw new Error(`Dimensions changed; review the manifest for ${asset.id}`);
  }
  if (asset.frameWidth && (asset.width % asset.frameWidth || asset.height % asset.frameHeight)) {
    throw new Error(`Invalid sprite frame grid: ${asset.id}`);
  }
  bytes += data.length;
  if (!checking) {
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
}

let audioBytes = 0;
const audioRoot = resolve(root, 'public/assets/audio');
if (!checking) {
  await mkdir(audioRoot, { recursive: true });
}
for (const [id, srcRel] of AUDIO_MANIFEST) {
  const source = resolve(root, srcRel);
  const header = (await readFile(source)).subarray(0, 12);
  if (header.subarray(0, 4).toString('ascii') !== 'RIFF' || header.subarray(8, 12).toString('ascii') !== 'WAVE') {
    throw new Error(`Not a valid WAV file: ${id} (${srcRel})`);
  }
  const info = await stat(source);
  audioBytes += info.size;
  if (!checking) {
    const dest = resolve(audioRoot, `${id}.wav`);
    // Skip re-copying identical-size files so incremental builds stay snappy.
    let skip = false;
    try {
      const existing = await stat(dest);
      if (existing.size === info.size && existing.mtimeMs >= info.mtimeMs) skip = true;
    } catch { /* destination does not exist yet */ }
    if (!skip) await copyFile(source, dest);
  }
}

console.log(
  `${checking ? 'Validated' : 'Prepared'} ${ids.size} runtime visual assets (${(bytes / 1048576).toFixed(1)} MiB) ` +
  `and ${AUDIO_MANIFEST.length} audio assets (${(audioBytes / 1048576).toFixed(1)} MiB).`,
);
