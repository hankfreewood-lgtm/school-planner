// Erzeugt die PWA-Icons (PNG) ohne externe Abhängigkeiten.  Aufruf: npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = new URL('../public/icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const sdRoundRect = (px, py, cx, cy, hw, hh, r) => {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const distSeg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** scale: Größe des Motivs relativ zur Fläche, rounded: transparente Ecken (any) oder Vollfläche (maskable) */
function render(size, { scale, rounded }) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 3;
  const c1 = [61, 95, 52], c2 = [26, 44, 22];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size, v = (y + (sy + 0.5) / SS) / size;
          let col = null, cov = 1;
          // Hintergrund
          if (rounded) cov = sdRoundRect(u, v, 0.5, 0.5, 0.5, 0.5, 0.22) < 0 ? 1 : 0;
          if (cov) {
            col = mix(c1, c2, (u + v) / 2);
            // Blatt
            const k = scale;
            const page = sdRoundRect(u, v, 0.5, 0.5, 0.25 * k, 0.30 * k, 0.07 * k) < 0;
            if (page) {
              col = [250, 251, 255];
              const th = 0.034 * k;
              const m = (p) => 0.5 + (p - 0.5) * k;
              const d = Math.min(
                distSeg(u, v, m(0.405), m(0.505), m(0.468), m(0.575)),
                distSeg(u, v, m(0.468), m(0.575), m(0.60), m(0.43)),
              );
              if (d < th) col = [60, 90, 50];
              // Textzeilen
              const lineY = [0.66, 0.73];
              for (const ly of lineY) {
                if (sdRoundRect(u, v, 0.5, 0.5 + (ly - 0.5) * k, 0.12 * k, 0.012 * k, 0.012 * k) < 0) col = [200, 214, 186];
              }
            }
          }
          if (col) { r += col[0]; g += col[1]; b += col[2]; a += 255; }
        }
      }
      const n = SS * SS, i = (y * size + x) * 4;
      const cnt = a / 255 || 1;
      buf[i] = r / cnt; buf[i + 1] = g / cnt; buf[i + 2] = b / cnt; buf[i + 3] = a / n;
    }
  }
  return png(size, size, buf);
}

const write = (name, data) => { writeFileSync(new URL(name, OUT), data); console.log('→', name); };
write('icon-192.png', render(192, { scale: 1, rounded: true }));
write('icon-512.png', render(512, { scale: 1, rounded: true }));
write('icon-maskable-512.png', render(512, { scale: 0.78, rounded: false }));
write('apple-touch-icon.png', render(180, { scale: 0.9, rounded: false }));
write('favicon-32.png', render(32, { scale: 1, rounded: true }));

write('icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3d5f34"/><stop offset="1" stop-color="#1a2c16"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/><rect x="128" y="102" width="256" height="308" rx="36" fill="#fafbff"/><path d="M207 258l32 36 69-74" fill="none" stroke="#3c5a32" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><rect x="194" y="338" width="124" height="12" rx="6" fill="#c2d6b6"/><rect x="194" y="372" width="124" height="12" rx="6" fill="#c2d6b6"/></svg>`);
