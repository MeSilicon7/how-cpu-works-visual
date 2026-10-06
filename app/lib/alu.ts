export type AluOp = "ADD" | "SUB" | "AND" | "OR" | "XOR" | "NOT" | "SHL" | "SHR";

export const aluOps: Array<{ op: AluOp; code: number; symbol: string; describe: string }> = [
  { op: "ADD", code: 0b000, symbol: "A + B", describe: "add with the full-adder chain" },
  { op: "SUB", code: 0b001, symbol: "A − B", describe: "add A + NOT(B) + 1" },
  { op: "AND", code: 0b010, symbol: "A AND B", describe: "AND each pair of bits" },
  { op: "OR", code: 0b011, symbol: "A OR B", describe: "OR each pair of bits" },
  { op: "XOR", code: 0b100, symbol: "A XOR B", describe: "XOR each pair of bits" },
  { op: "NOT", code: 0b101, symbol: "NOT A", describe: "flip every bit of A" },
  { op: "SHL", code: 0b110, symbol: "A << 1", describe: "shift left: ×2" },
  { op: "SHR", code: 0b111, symbol: "A >> 1", describe: "shift right: ÷2 (rounding down)" },
];

export interface AluResult {
  value: number;
  /** Zero: the result is 0. */
  z: boolean;
  /** Carry / borrow: the true answer didn't fit in 8 bits (or a bit fell off a shift). */
  c: boolean;
  /** Negative: top bit set (the result is negative if read as signed). */
  n: boolean;
  /** Overflow: the signed answer didn't fit in −128…127. */
  v: boolean;
}

export function alu(op: AluOp, a: number, b: number): AluResult {
  a &= 255;
  b &= 255;
  let raw = 0;
  let c = false;
  let v = false;
  const sign = (x: number) => (x >> 7) & 1;
  switch (op) {
    case "ADD":
      raw = a + b;
      c = raw > 255;
      v = sign(a) === sign(b) && sign(raw & 255) !== sign(a);
      break;
    case "SUB":
      raw = a - b;
      c = a < b; // borrow
      v = sign(a) !== sign(b) && sign(raw & 255) !== sign(a);
      break;
    case "AND":
      raw = a & b;
      break;
    case "OR":
      raw = a | b;
      break;
    case "XOR":
      raw = a ^ b;
      break;
    case "NOT":
      raw = ~a;
      break;
    case "SHL":
      raw = a << 1;
      c = !!(a & 128);
      break;
    case "SHR":
      raw = a >> 1;
      c = !!(a & 1);
      break;
  }
  const value = raw & 255;
  return { value, z: value === 0, c, n: !!(value & 128), v };
}
