/**
 * A miniature JPEG-style codec: colour conversion, 8×8 DCT, quantisation,
 * zig-zag ordering and run-length coding. Used to show *real* compression
 * on real pixels in the video chapter.
 */
import type { Img } from "./image";

export const LUMA_Q = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51,
  87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99,
];

export const CHROMA_Q = [
  17,
  18,
  24,
  47,
  99,
  99,
  99,
  99,
  18,
  21,
  26,
  66,
  99,
  99,
  99,
  99,
  24,
  26,
  56,
  99,
  99,
  99,
  99,
  99,
  47,
  66,
  99,
  99,
  99,
  99,
  99,
  99,
  ...new Array(32).fill(99),
];

/** Zig-zag scan order: index k → position in the 8×8 block (row-major). */
export const ZIGZAG: number[] = (() => {
  const out: number[] = [];
  for (let s = 0; s < 15; s++) {
    const cells: number[] = [];
    for (let y = 0; y < 8; y++) {
      const x = s - y;
      if (x >= 0 && x < 8) cells.push(y * 8 + x);
    }
    if (s % 2 === 0) cells.reverse();
    out.push(...cells);
  }
  return out;
})();

/** Scale a quantisation table for quality 1–100 (the classic IJG formula). */
export function scaleTable(table: number[], quality: number) {
  const q = Math.max(1, Math.min(100, quality));
  const s = q < 50 ? 5000 / q : 200 - 2 * q;
  return table.map((v) => Math.max(1, Math.min(255, Math.floor((v * s + 50) / 100))));
}

const COS: number[][] = Array.from({ length: 8 }, (_, x) =>
  Array.from({ length: 8 }, (_, u) => Math.cos(((2 * x + 1) * u * Math.PI) / 16)),
);
const C = (u: number) => (u === 0 ? Math.SQRT1_2 : 1);

/** Forward 2D DCT of an 8×8 block (values already centred around 0). */
export function dct8(block: number[]): number[] {
  const tmp = new Array(64).fill(0);
  // rows
  for (let y = 0; y < 8; y++)
    for (let u = 0; u < 8; u++) {
      let s = 0;
      for (let x = 0; x < 8; x++) s += block[y * 8 + x] * COS[x][u];
      tmp[y * 8 + u] = 0.5 * C(u) * s;
    }
  const out = new Array(64).fill(0);
  // columns
  for (let u = 0; u < 8; u++)
    for (let v = 0; v < 8; v++) {
      let s = 0;
      for (let y = 0; y < 8; y++) s += tmp[y * 8 + u] * COS[y][v];
      out[v * 8 + u] = 0.5 * C(v) * s;
    }
  return out;
}

/** Inverse 2D DCT. */
export function idct8(coef: number[]): number[] {
  const tmp = new Array(64).fill(0);
  for (let v = 0; v < 8; v++)
    for (let x = 0; x < 8; x++) {
      let s = 0;
      for (let u = 0; u < 8; u++) s += C(u) * coef[v * 8 + u] * COS[x][u];
      tmp[v * 8 + x] = 0.5 * s;
    }
  const out = new Array(64).fill(0);
  for (let x = 0; x < 8; x++)
    for (let y = 0; y < 8; y++) {
      let s = 0;
      for (let v = 0; v < 8; v++) s += C(v) * tmp[v * 8 + x] * COS[y][v];
      out[y * 8 + x] = 0.5 * s;
    }
  return out;
}

/** Number of bits needed for |v| (JPEG's "category"). */
const category = (v: number) => (v === 0 ? 0 : Math.floor(Math.log2(Math.abs(v))) + 1);

/** Run-length pairs (zeros-before, value) in zig-zag order, ending with EOB. */
export function runLength(q: number[]): Array<{ run: number; value: number } | "EOB"> {
  const zz = ZIGZAG.map((i) => q[i]);
  let last = 63;
  while (last >= 0 && zz[last] === 0) last--;
  const out: Array<{ run: number; value: number } | "EOB"> = [];
  let run = 0;
  for (let k = 0; k <= last; k++) {
    if (zz[k] === 0) run++;
    else {
      out.push({ run, value: zz[k] });
      run = 0;
    }
  }
  if (last < 63) out.push("EOB");
  return out;
}

/** Rough bit cost of one quantised block (≈ what Huffman coding would achieve). */
export function blockBits(q: number[]) {
  let bits = 0;
  for (const p of runLength(q)) {
    if (p === "EOB") bits += 4;
    else bits += 4 + Math.floor(p.run / 16) * 11 + category(p.value);
  }
  return bits;
}

export function rgbToYcc(r: number, g: number, b: number): [number, number, number] {
  return [
    0.299 * r + 0.587 * g + 0.114 * b,
    128 - 0.168736 * r - 0.331264 * g + 0.5 * b,
    128 + 0.5 * r - 0.418688 * g - 0.081312 * b,
  ];
}

export function yccToRgb(y: number, cb: number, cr: number): [number, number, number] {
  return [y + 1.402 * (cr - 128), y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128), y + 1.772 * (cb - 128)];
}

export interface Planes {
  w: number;
  h: number;
  y: Float32Array;
  cb: Float32Array;
  cr: Float32Array;
}

export function toPlanes(img: Img): Planes {
  const n = img.w * img.h;
  const y = new Float32Array(n);
  const cb = new Float32Array(n);
  const cr = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [Y, Cb, Cr] = rgbToYcc(img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]);
    y[i] = Y;
    cb[i] = Cb;
    cr[i] = Cr;
  }
  return { w: img.w, h: img.h, y, cb, cr };
}

/** Average colour over `f`×`f` squares, then stretch back (chroma subsampling). */
export function subsample(plane: Float32Array, w: number, h: number, f: number) {
  if (f <= 1) return plane;
  const out = new Float32Array(plane.length);
  for (let by = 0; by < h; by += f)
    for (let bx = 0; bx < w; bx += f) {
      let s = 0;
      let c = 0;
      for (let y = by; y < Math.min(h, by + f); y++)
        for (let x = bx; x < Math.min(w, bx + f); x++) {
          s += plane[y * w + x];
          c++;
        }
      const avg = s / c;
      for (let y = by; y < Math.min(h, by + f); y++)
        for (let x = bx; x < Math.min(w, bx + f); x++) out[y * w + x] = avg;
    }
  return out;
}

export function planesToImg(p: { w: number; h: number; y: Float32Array; cb: Float32Array; cr: Float32Array }): Img {
  const data = new Uint8ClampedArray(p.w * p.h * 4);
  for (let i = 0; i < p.w * p.h; i++) {
    const [r, g, b] = yccToRgb(p.y[i], p.cb[i], p.cr[i]);
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { w: p.w, h: p.h, data };
}

export function readBlock(plane: Float32Array, w: number, bx: number, by: number): number[] {
  const out: number[] = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) out.push(plane[(by * 8 + y) * w + bx * 8 + x]);
  return out;
}

/** Compress + decompress one plane; returns the reconstructed plane and total estimated bits. */
function codePlane(plane: Float32Array, w: number, h: number, table: number[]) {
  const out = new Float32Array(plane.length);
  let bits = 0;
  for (let by = 0; by < h / 8; by++)
    for (let bx = 0; bx < w / 8; bx++) {
      const blk = readBlock(plane, w, bx, by).map((v) => v - 128);
      const coef = dct8(blk);
      const q = coef.map((c, i) => Math.round(c / table[i]));
      bits += blockBits(q);
      const rec = idct8(q.map((v, i) => v * table[i]));
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) out[(by * 8 + y) * w + bx * 8 + x] = rec[y * 8 + x] + 128;
    }
  return { out, bits };
}

/** Shrink a plane by 2 in each direction (for 4:2:0 chroma). */
function half(plane: Float32Array, w: number, h: number) {
  const hw = w / 2;
  const hh = h / 2;
  const out = new Float32Array(hw * hh);
  for (let y = 0; y < hh; y++)
    for (let x = 0; x < hw; x++)
      out[y * hw + x] =
        (plane[2 * y * w + 2 * x] +
          plane[2 * y * w + 2 * x + 1] +
          plane[(2 * y + 1) * w + 2 * x] +
          plane[(2 * y + 1) * w + 2 * x + 1]) /
        4;
  return out;
}

function double(plane: Float32Array, hw: number, hh: number) {
  const w = hw * 2;
  const out = new Float32Array(w * hh * 2);
  for (let y = 0; y < hh * 2; y++)
    for (let x = 0; x < w; x++) out[y * w + x] = plane[Math.floor(y / 2) * hw + Math.floor(x / 2)];
  return out;
}

/** Full JPEG-like round trip. Image width/height must be multiples of 16. */
export function compressImage(img: Img, quality: number) {
  const p = toPlanes(img);
  const lt = scaleTable(LUMA_Q, quality);
  const ct = scaleTable(CHROMA_Q, quality);
  const Y = codePlane(p.y, p.w, p.h, lt);
  const hw = p.w / 2;
  const hh = p.h / 2;
  const Cb = codePlane(half(p.cb, p.w, p.h), hw, hh, ct);
  const Cr = codePlane(half(p.cr, p.w, p.h), hw, hh, ct);
  const rec = planesToImg({ w: p.w, h: p.h, y: Y.out, cb: double(Cb.out, hw, hh), cr: double(Cr.out, hw, hh) });
  const bytes = Math.ceil((Y.bits + Cb.bits + Cr.bits) / 8);
  return { img: rec, bytes, raw: p.w * p.h * 3 };
}
