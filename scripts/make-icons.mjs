import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type), len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([len, name, data, crc]);
}
function makeIcon(size) {
  const stride = size * 4 + 1, raw = Buffer.alloc(stride * size), c = size / 2, radius = size * .43;
  for (let y = 0; y < size; y++) {
    const row = y * stride; raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - c, dy = y - c, d = Math.hypot(dx, dy), round = Math.min(x, y, size - 1 - x, size - 1 - y);
      const p = row + 1 + x * 4;
      if (round < size * .08 && Math.hypot(Math.max(Math.abs(dx) - size * .38, 0), Math.max(Math.abs(dy) - size * .38, 0)) > size * .09) { raw[p + 3] = 0; continue; }
      const glow = Math.max(0, 1 - Math.hypot(dx + size * .08, dy + size * .1) / (size * .62));
      let r = 3 + glow * 2, g = 19 + glow * 28, b = 14 + glow * 23, a = 255;
      if (d < radius) {
        const light = Math.max(0, 1 - Math.hypot(dx + size * .14, dy + size * .16) / radius);
        const edge = Math.max(0, 1 - d / radius);
        r = 4 + 20 * light + 3 * edge; g = 67 + 163 * light + 49 * edge; b = 51 + 158 * light + 21 * edge;
        const spec = Math.max(0, 1 - Math.hypot(dx + size * .18, dy + size * .2) / (size * .13));
        r += 43 * spec; g += 44 * spec; b += 38 * spec;
      }
      raw[p] = Math.min(255, r); raw[p + 1] = Math.min(255, g); raw[p + 2] = Math.min(255, b); raw[p + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
mkdirSync(new URL("../", import.meta.url), { recursive: true });
for (const size of [192, 512]) writeFileSync(new URL(`../icon-${size}.png`, import.meta.url), makeIcon(size));
