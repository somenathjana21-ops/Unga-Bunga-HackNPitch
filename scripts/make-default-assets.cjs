// Generates default background/template placeholder PNGs so phases can fall back
// to defaults while the real generated assets are still being produced.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf, start, end) {
  // Standard CRC-32 (ISO 3309 / ITU-T V.42), polynomial 0xEDB88320 reflected.
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) {
      crc = (crc >>> 1) ^ (0xedb88320 & (-(crc & 1) | 0));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writePng(file, width, height, pixels) {
  // pixels: array of [r,g,b,a] per pixel, row-major
  const rowBytes = width * 4;
  const stride = rowBytes + 1; // filter byte per row
  const raw = Buffer.alloc(height * stride);
  let i = 0;
  for (let y = 0; y < height; y++) {
    raw[i++] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const p = pixels[y * width + x];
      raw[i++] = p[0]; raw[i++] = p[1]; raw[i++] = p[2]; raw[i++] = p[3];
    }
  }
  const idat = zlib.deflateRawSync(raw);

  const parts = [];
  function chunk(type, data) {
    const len = data.length;
    const hdr = Buffer.alloc(8);
    hdr.writeUInt32BE(len, 0);
    hdr.write(type, 4, 4);
    const crcInput = Buffer.concat([hdr.slice(4), data]);
    const crc = crc32(crcInput, 0, crcInput.length);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    parts.push(hdr, data, crcBuf);
  }

  // signature
  parts.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  chunk('IHDR', ihdr);

  chunk('IDAT', idat);

  // IEND
  chunk('IEND', Buffer.alloc(0));

  fs.writeFileSync(file, Buffer.concat(parts));
  console.log('wrote', file);
}

function solid(r, g, b, a = 255) { return [r, g, b, a]; }

const W = 1280, H = 720;

const bgDir = path.join(__dirname, '..', 'assets', 'backgrounds');
fs.mkdirSync(bgDir, { recursive: true });

const bg = [];
for (let i = 0; i < W * H; i++) bg.push(solid(16, 18, 23)); // #101217
writePng(path.join(bgDir, 'default-background.png'), W, H, bg);

const tmpl = [];
for (let i = 0; i < W * H; i++) tmpl.push(solid(16, 18, 23));
// gold border frame placeholder
const frameX = Math.floor(W * 0.25), frameY = Math.floor(H * 0.25);
const frameW = Math.floor(W * 0.5), frameH = Math.floor(H * 0.5);
for (let y = frameY; y < frameY + frameH; y++) {
  for (let x = frameX; x < frameX + frameW; x++) {
    const onEdge = x === frameX || x === frameX + frameW - 1 || y === frameY || y === frameY + frameH - 1;
    tmpl[y * W + x] = onEdge ? solid(227, 177, 107, 200) : solid(16, 18, 23, 0);
  }
}
writePng(path.join(bgDir, 'default-template.png'), W, H, tmpl);

console.log('done');
