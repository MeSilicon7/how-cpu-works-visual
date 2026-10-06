/**
 * A small procedurally generated "sunset over the sea" picture, so the
 * graphics and video chapters have real pixels to work with without
 * shipping any image files. Everything is deterministic.
 */
import { rng } from "./bits";

export interface Img {
  w: number;
  h: number;
  /** RGBA, row by row. */
  data: Uint8ClampedArray;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

export function makeScene(w: number, h: number): Img {
  const data = new Uint8ClampedArray(w * h * 4);
  const horizon = 0.64 * h;
  const sun = { x: 0.68 * w, y: 0.5 * h, r: 0.11 * h };
  const r = rng(5);
  const stars = Array.from({ length: Math.round((w * h) / 900) }, () => ({ x: r() * w, y: r() * h * 0.35 }));

  const ridge = (x: number, base: number, amp: number, f: number, phase: number) =>
    base +
    amp *
      (0.55 * Math.sin((x / w) * f * 6.28 + phase) +
        0.3 * Math.sin((x / w) * f * 15.1 + phase * 2) +
        0.15 * Math.sin((x / w) * f * 37 + phase));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let R: number;
      let G: number;
      let B: number;
      if (y < horizon) {
        // sky gradient: deep blue → violet → orange near the horizon
        const t = y / horizon;
        if (t < 0.55) {
          const k = t / 0.55;
          R = mix(18, 88, k);
          G = mix(24, 46, k);
          B = mix(70, 120, k);
        } else {
          const k = (t - 0.55) / 0.45;
          R = mix(88, 255, k);
          G = mix(46, 140, k);
          B = mix(120, 70, k);
        }
        // sun glow
        const d = Math.hypot(x - sun.x, y - sun.y);
        const glow = Math.exp(-((d / (sun.r * 2.6)) ** 2));
        R = mix(R, 255, glow * 0.55);
        G = mix(G, 190, glow * 0.45);
        B = mix(B, 110, glow * 0.25);
        if (d < sun.r) {
          const k = clamp01((sun.r - d) / 1.5);
          R = mix(R, 255, k);
          G = mix(G, 226, k);
          B = mix(B, 150, k);
        }
        // far mountains
        if (y > ridge(x, horizon - 0.16 * h, 0.07 * h, 1.3, 0.7)) {
          const k = (y - (horizon - 0.25 * h)) / (0.25 * h);
          R = mix(96, 70, k);
          G = mix(52, 40, k);
          B = mix(110, 90, k);
        }
        // near mountains
        if (y > ridge(x, horizon - 0.06 * h, 0.06 * h, 2.1, 2.4)) {
          R = 38;
          G = 26;
          B = 58;
        }
      } else {
        // sea: darker with depth, with a shimmering sun reflection
        const t = (y - horizon) / (h - horizon);
        R = mix(70, 14, t);
        G = mix(50, 24, t);
        B = mix(100, 60, t);
        const band = Math.exp(-(((x - sun.x) / (sun.r * (1.1 + t * 1.6))) ** 2));
        const wave = 0.5 + 0.5 * Math.sin(y * 1.7 + Math.sin(x * 0.35) * 2);
        const k = band * wave * (1 - t * 0.6);
        R = mix(R, 255, k * 0.85);
        G = mix(G, 170, k * 0.75);
        B = mix(B, 90, k * 0.5);
      }
      const i = (y * w + x) * 4;
      data[i] = R;
      data[i + 1] = G;
      data[i + 2] = B;
      data[i + 3] = 255;
    }
  }
  for (const s of stars) {
    const i = (Math.floor(s.y) * w + Math.floor(s.x)) * 4;
    data[i] = data[i + 1] = data[i + 2] = 230;
  }
  return { w, h, data };
}

/** Draw a filled, lightly shaded ball (used for video motion examples). */
export function drawBall(img: Img, cx: number, cy: number, r: number, color: [number, number, number]) {
  const { w, h, data } = img;
  for (let y = Math.max(0, Math.floor(cy - r - 1)); y < Math.min(h, Math.ceil(cy + r + 1)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r - 1)); x < Math.min(w, Math.ceil(cx + r + 1)); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const cover = clamp01(r - d + 0.5);
      if (cover <= 0) continue;
      const light = 0.65 + 0.35 * clamp01(1 - Math.hypot(x - (cx - r * 0.35), y - (cy - r * 0.35)) / r);
      const i = (y * w + x) * 4;
      data[i] = mix(data[i], color[0] * light, cover);
      data[i + 1] = mix(data[i + 1], color[1] * light, cover);
      data[i + 2] = mix(data[i + 2], color[2] * light, cover);
    }
  }
}

export function cloneImg(img: Img): Img {
  return { w: img.w, h: img.h, data: new Uint8ClampedArray(img.data) };
}

export function pixel(img: Img, x: number, y: number): [number, number, number] {
  const i = (y * img.w + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}
