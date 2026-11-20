import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(root, 'assets/runtime-manifest.json'), 'utf8'));
const checking = process.argv.includes('--check');
const ids = new Set();
const destinations = new Set();
let bytes = 0;
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
console.log(`${checking ? 'Validated' : 'Prepared'} ${ids.size} runtime assets (${(bytes / 1048576).toFixed(1)} MiB on disk; load by scene).`);
