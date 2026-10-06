/** Bits of `value`, most significant first. */
export function toBits(value: number, width: number): number[] {
  const out: number[] = [];
  for (let i = width - 1; i >= 0; i--) out.push((value >>> i) & 1);
  return out;
}

export function fromBits(bits: number[]): number {
  return bits.reduce((acc, b) => acc * 2 + (b ? 1 : 0), 0);
}

export function binStr(value: number, width: number, group = 0): string {
  const s = (value >>> 0).toString(2).padStart(width, "0").slice(-width);
  if (!group) return s;
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= group) parts.unshift(s.slice(Math.max(0, i - group), i));
  return parts.join(" ");
}

export function hexStr(value: number, digits = 2): string {
  return (value >>> 0).toString(16).toUpperCase().padStart(digits, "0");
}

/** Interpret an unsigned `width`-bit value as two's complement. */
export function toSigned(value: number, width: number): number {
  const top = 1 << (width - 1);
  return value & top ? value - (1 << width) : value;
}

export function mask(width: number) {
  return width >= 32 ? 0xffffffff : (1 << width) - 1;
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** Format with thousands separators. */
export function fmt(n: number, digits = 0) {
  return n.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

/** Deterministic pseudo-random numbers (mulberry32) so SSR and client agree. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
