#!/usr/bin/env node
/**
 * Generates the application icon (a shield with a check mark, matching the
 * in-app branding) as a PNG.
 *
 * Written by hand rather than committing a binary blob or pulling in an image
 * library: the icon is fully described by the code below, so it can be tweaked
 * and regenerated without a design tool. electron-builder derives the Windows
 * .ico and Linux icon set from this single 512x512 PNG.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 512;
const SAMPLES = 3; // supersampling factor per axis, for antialiasing

// --- geometry helpers (all in normalised 0..1 coordinates) ---------------

function insideRoundedRect(x, y, radius) {
  const r = radius;
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function quadraticBezier(t, p0, p1, p2) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

/** Shield outline: straight shoulders, curved flanks converging to a bottom tip. */
function buildShieldPolygon() {
  const halfWidth = 0.30;
  const top = 0.17;
  const shoulder = 0.55;
  const tip = 0.86;
  const cornerR = 0.06;

  const left = 0.5 - halfWidth;
  const right = 0.5 + halfWidth;
  const points = [];

  // Top edge, left corner rounded
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * (Math.PI / 2);
    points.push({ x: left + cornerR + Math.cos(a) * cornerR, y: top + cornerR + Math.sin(a) * cornerR });
  }
  // Top-right corner
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2);
    points.push({ x: right - cornerR + Math.cos(a) * cornerR, y: top + cornerR + Math.sin(a) * cornerR });
  }
  // Right flank curving to the tip
  for (let i = 0; i <= 24; i++) {
    points.push(
      quadraticBezier(i / 24, { x: right, y: shoulder }, { x: right, y: tip - 0.06 }, { x: 0.5, y: tip })
    );
  }
  // Left flank, mirrored back up
  for (let i = 24; i >= 0; i--) {
    points.push(
      quadraticBezier(i / 24, { x: left, y: shoulder }, { x: left, y: tip - 0.06 }, { x: 0.5, y: tip })
    );
  }
  return points;
}

const SHIELD = buildShieldPolygon();

function insidePolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

const CHECK = [
  [0.385, 0.505],
  [0.468, 0.592],
  [0.625, 0.408],
];
const CHECK_HALF_WIDTH = 0.037;

function insideCheck(x, y) {
  for (let i = 0; i < CHECK.length - 1; i++) {
    const [ax, ay] = CHECK[i];
    const [bx, by] = CHECK[i + 1];
    if (distanceToSegment(x, y, ax, ay, bx, by) <= CHECK_HALF_WIDTH) return true;
  }
  return false;
}

// --- colours -------------------------------------------------------------

const BG_TOP = [59, 130, 246]; // #3b82f6
const BG_BOTTOM = [29, 78, 216]; // #1d4ed8
const SHIELD_COLOR = [255, 255, 255];

function samplePixel(x, y) {
  if (!insideRoundedRect(x, y, 0.22)) return [0, 0, 0, 0];

  if (insidePolygon(x, y, SHIELD)) {
    if (insideCheck(x, y)) {
      // Check mark punched through the shield, showing the background blue
      const t = y;
      return [
        Math.round(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t),
        Math.round(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t),
        Math.round(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t),
        255,
      ];
    }
    return [...SHIELD_COLOR, 255];
  }

  const t = y;
  return [
    Math.round(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t),
    Math.round(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t),
    Math.round(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t),
    255,
  ];
}

function renderRGBA() {
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  let offset = 0;
  for (let py = 0; py < SIZE; py++) {
    raw[offset++] = 0; // PNG filter type: none
    for (let px = 0; px < SIZE; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px + (sx + 0.5) / SAMPLES) / SIZE;
          const y = (py + (sy + 0.5) / SAMPLES) / SIZE;
          const [sr, sg, sb, sa] = samplePixel(x, y);
          const w = sa / 255;
          r += sr * w;
          g += sg * w;
          b += sb * w;
          a += sa;
        }
      }
      const n = SAMPLES * SAMPLES;
      const alpha = a / n;
      const norm = alpha > 0 ? alpha / 255 : 1;
      raw[offset++] = Math.round(r / n / norm);
      raw[offset++] = Math.round(g / n / norm);
      raw[offset++] = Math.round(b / n / norm);
      raw[offset++] = Math.round(alpha);
    }
  }
  return raw;
}

// --- PNG container -------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePNG(raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- main ----------------------------------------------------------------

const png = encodePNG(renderRGBA());
const targets = [
  path.join(__dirname, "../resources/icon.png"),
  path.join(__dirname, "../apps/desktop/public/icon.png"),
];

for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, png);
  console.log(`icon written: ${target} (${png.length} bytes, ${SIZE}x${SIZE})`);
}
