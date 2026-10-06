/**
 * A tiny 8-bit teaching CPU in the spirit of the "SAP-1" (Simple As Possible)
 * design: 16 bytes of RAM, registers A and B, an ALU, a program counter and
 * an instruction register. Every instruction is 1 byte:
 *
 *     [ 4-bit opcode | 4-bit operand ]
 *
 * The emulator runs one micro-step (one clock tick) at a time and records which
 * control signals were active, so the UI can show data moving over the bus.
 */
import { binStr } from "./bits";

export type Mnemonic = "NOP" | "LDA" | "ADD" | "SUB" | "STA" | "LDI" | "JMP" | "JC" | "JZ" | "OUT" | "HLT";

export interface OpInfo {
  name: Mnemonic;
  code: number;
  operand: "addr" | "value" | "none";
  short: string;
  describe: string;
}

export const ops: OpInfo[] = [
  { name: "NOP", code: 0x0, operand: "none", short: "do nothing", describe: "No operation. Just move on." },
  {
    name: "LDA",
    code: 0x1,
    operand: "addr",
    short: "A ← RAM[n]",
    describe: "Load A with the byte stored at address n.",
  },
  { name: "ADD", code: 0x2, operand: "addr", short: "A ← A + RAM[n]", describe: "Add the byte at address n to A." },
  {
    name: "SUB",
    code: 0x3,
    operand: "addr",
    short: "A ← A − RAM[n]",
    describe: "Subtract the byte at address n from A.",
  },
  { name: "STA", code: 0x4, operand: "addr", short: "RAM[n] ← A", describe: "Store A into memory at address n." },
  { name: "LDI", code: 0x5, operand: "value", short: "A ← n", describe: "Load A with the number n itself (0–15)." },
  { name: "JMP", code: 0x6, operand: "addr", short: "PC ← n", describe: "Jump: continue running from address n." },
  { name: "JC", code: 0x7, operand: "addr", short: "if C: PC ← n", describe: "Jump to n only if the carry flag is 1." },
  { name: "JZ", code: 0x8, operand: "addr", short: "if Z: PC ← n", describe: "Jump to n only if the zero flag is 1." },
  { name: "OUT", code: 0xe, operand: "none", short: "display ← A", describe: "Copy A to the output display." },
  { name: "HLT", code: 0xf, operand: "none", short: "stop", describe: "Halt: stop the clock." },
];

export const opByCode = new Map(ops.map((o) => [o.code, o]));
export const opByName = new Map(ops.map((o) => [o.name, o]));

export function disassemble(byte: number): string {
  const op = opByCode.get(byte >> 4);
  if (!op) return "???";
  if (op.operand === "none") return op.name;
  return `${op.name} ${byte & 15}`;
}

export type Signal =
  | "HLT"
  | "MI"
  | "RI"
  | "RO"
  | "IO"
  | "II"
  | "AI"
  | "AO"
  | "EO"
  | "SU"
  | "BI"
  | "OI"
  | "CE"
  | "CO"
  | "J"
  | "FI";

export const signalInfo: Record<Signal, string> = {
  HLT: "Halt the clock",
  MI: "Memory address register In",
  RI: "RAM In (write)",
  RO: "RAM Out (read)",
  IO: "Instruction register Out (operand)",
  II: "Instruction register In",
  AI: "A register In",
  AO: "A register Out",
  EO: "ALU (Σ) Out",
  SU: "ALU: Subtract",
  BI: "B register In",
  OI: "Output register In",
  CE: "Counter Enable (PC + 1)",
  CO: "Counter Out (PC → bus)",
  J: "Jump (bus → PC)",
  FI: "Flags In",
};

export const allSignals = Object.keys(signalInfo) as Signal[];

export type Unit = "pc" | "mar" | "ram" | "ir" | "a" | "b" | "alu" | "out" | "flags" | "control";

export type Phase = "fetch" | "decode" | "execute" | "halted" | "ready";

export interface CpuState {
  ram: number[];
  pc: number;
  mar: number;
  ir: number;
  a: number;
  b: number;
  out: number | null;
  outputs: number[];
  c: boolean;
  z: boolean;
  halted: boolean;
  /** Index of the next micro-step within the current instruction. */
  t: number;
  /** What the step that just ran did (for display). */
  last: {
    phase: Phase;
    t: number;
    signals: Signal[];
    bus: number | null;
    src: Unit | null;
    dst: Unit[];
    title: string;
    note: string;
  };
  ticks: number;
  instructions: number;
}

export function initCpu(ram: number[]): CpuState {
  const r = Array.from({ length: 16 }, (_, i) => (ram[i] ?? 0) & 255);
  return {
    ram: r,
    pc: 0,
    mar: 0,
    ir: 0,
    a: 0,
    b: 0,
    out: null,
    outputs: [],
    c: false,
    z: false,
    halted: false,
    t: 0,
    last: {
      phase: "ready",
      t: -1,
      signals: [],
      bus: null,
      src: null,
      dst: [],
      title: "Ready",
      note: "The program is in memory and every register is 0. Press Step to tick the clock once.",
    },
    ticks: 0,
    instructions: 0,
  };
}

const b8 = (v: number) => binStr(v, 8, 4);

interface Exec {
  signals: Signal[];
  bus: number | null;
  src: Unit | null;
  dst: Unit[];
  note: string;
  apply: (s: CpuState) => Partial<CpuState>;
}

function execSteps(s: CpuState): Exec[] {
  const op = opByCode.get(s.ir >> 4);
  const n = s.ir & 15;
  const loadAddr: Exec = {
    signals: ["IO", "MI"],
    bus: n,
    src: "ir",
    dst: ["mar"],
    note: `The operand (the last 4 bits of the instruction, ${binStr(n, 4)} = ${n}) goes over the bus into the memory address register, to point at address ${n}.`,
    apply: () => ({ mar: n }),
  };
  switch (op?.name) {
    case "LDA":
      return [
        loadAddr,
        {
          signals: ["RO", "AI"],
          bus: s.ram[n],
          src: "ram",
          dst: ["a"],
          note: `Memory sends the byte at address ${n} (${b8(s.ram[n])} = ${s.ram[n]}) into register A.`,
          apply: (st) => ({ a: st.ram[n] }),
        },
      ];
    case "ADD":
    case "SUB": {
      const sub = op.name === "SUB";
      const v = s.ram[n];
      const raw = sub ? s.a - v : s.a + v;
      const res = raw & 255;
      return [
        loadAddr,
        {
          signals: ["RO", "BI"],
          bus: v,
          src: "ram",
          dst: ["b"],
          note: `Memory sends the byte at address ${n} (${b8(v)} = ${v}) into register B. The ALU is always wired to A and B, so its output already shows ${s.a} ${sub ? "−" : "+"} ${v}.`,
          apply: () => ({ b: v }),
        },
        {
          signals: sub ? ["EO", "SU", "AI", "FI"] : ["EO", "AI", "FI"],
          bus: res,
          src: "alu",
          dst: ["a", "flags"],
          note: `The ALU's answer ${s.a} ${sub ? "−" : "+"} ${v} = ${raw}${raw !== res ? ` → ${res} (it doesn't fit in 8 bits, so the carry flag is set)` : ""} goes into A. Flags are updated: Z = ${res === 0 ? 1 : 0}, C = ${(sub ? s.a < v : raw > 255) ? 1 : 0}.`,
          apply: () => ({ a: res, z: res === 0, c: sub ? s.a < v : raw > 255 }),
        },
      ];
    }
    case "STA":
      return [
        loadAddr,
        {
          signals: ["AO", "RI"],
          bus: s.a,
          src: "a",
          dst: ["ram"],
          note: `Register A (${b8(s.a)} = ${s.a}) is written into memory at address ${n}.`,
          apply: (st) => {
            const ram = st.ram.slice();
            ram[n] = st.a;
            return { ram };
          },
        },
      ];
    case "LDI":
      return [
        {
          signals: ["IO", "AI"],
          bus: n,
          src: "ir",
          dst: ["a"],
          note: `The operand ${n} itself goes straight into register A. No memory read needed.`,
          apply: () => ({ a: n }),
        },
      ];
    case "JMP":
      return [
        {
          signals: ["IO", "J"],
          bus: n,
          src: "ir",
          dst: ["pc"],
          note: `The operand ${n} is loaded into the program counter. The next fetch will come from address ${n}. That's a jump!`,
          apply: () => ({ pc: n }),
        },
      ];
    case "JC":
    case "JZ": {
      const flag = op.name === "JC" ? s.c : s.z;
      const fname = op.name === "JC" ? "carry (C)" : "zero (Z)";
      return flag
        ? [
            {
              signals: ["IO", "J"],
              bus: n,
              src: "ir",
              dst: ["pc"],
              note: `The ${fname} flag is 1, so the control unit enables J: the program counter becomes ${n}. Jump taken.`,
              apply: () => ({ pc: n }),
            },
          ]
        : [
            {
              signals: [],
              bus: null,
              src: "flags",
              dst: [],
              note: `The ${fname} flag is 0, so the control unit does nothing. No jump; the program continues at address ${s.pc}.`,
              apply: () => ({}),
            },
          ];
    }
    case "OUT":
      return [
        {
          signals: ["AO", "OI"],
          bus: s.a,
          src: "a",
          dst: ["out"],
          note: `Register A (${s.a}) is copied to the output display.`,
          apply: (st) => ({ out: st.a, outputs: [...st.outputs, st.a].slice(-24) }),
        },
      ];
    case "HLT":
      return [
        {
          signals: ["HLT"],
          bus: null,
          src: "control",
          dst: [],
          note: "The HLT signal stops the clock. The program is finished.",
          apply: () => ({ halted: true }),
        },
      ];
    case "NOP":
    default:
      return [
        {
          signals: [],
          bus: null,
          src: null,
          dst: [],
          note: op
            ? "NOP: nothing happens this tick."
            : `Opcode ${binStr(s.ir >> 4, 4)} isn't a known instruction, so the CPU treats it as a NOP.`,
          apply: () => ({}),
        },
      ];
  }
}

/** Run exactly one clock tick (one micro-step). */
export function microStep(s: CpuState): CpuState {
  if (s.halted) return s;
  const base = { ticks: s.ticks + 1 };
  if (s.t === 0) {
    return {
      ...s,
      ...base,
      mar: s.pc,
      t: 1,
      last: {
        phase: "fetch",
        t: 0,
        signals: ["CO", "MI"],
        bus: s.pc,
        src: "pc",
        dst: ["mar"],
        title: "Fetch · step 1",
        note: `The program counter says the next instruction is at address ${s.pc}. Copy PC (${binStr(s.pc, 4)}) over the bus into the memory address register.`,
      },
    };
  }
  if (s.t === 1) {
    const byte = s.ram[s.mar];
    return {
      ...s,
      ...base,
      ir: byte,
      pc: (s.pc + 1) & 15,
      t: 2,
      last: {
        phase: "fetch",
        t: 1,
        signals: ["RO", "II", "CE"],
        bus: byte,
        src: "ram",
        dst: ["ir", "pc"],
        title: "Fetch · step 2",
        note: `Memory sends the byte at address ${s.mar} (${b8(byte)}) into the instruction register. At the same time the program counter counts up to ${(s.pc + 1) & 15}, ready for next time.`,
      },
    };
  }
  if (s.t === 2) {
    const op = opByCode.get(s.ir >> 4);
    const recipe = execSteps(s);
    return {
      ...s,
      ...base,
      t: 3,
      last: {
        phase: "decode",
        t: 2,
        signals: [],
        bus: null,
        src: "ir",
        dst: ["control"],
        title: "Decode",
        note: `The control unit reads the opcode ${binStr(s.ir >> 4, 4)} = ${op?.name ?? "???"}${op && op.operand !== "none" ? ` with operand ${s.ir & 15}` : ""}. It looks up the recipe for ${op?.name ?? "it"}: ${recipe.length} step${recipe.length > 1 ? "s" : ""} of control signals.`,
      },
    };
  }
  const recipe = execSteps(s);
  const k = s.t - 3;
  const step = recipe[Math.min(k, recipe.length - 1)];
  const patch = step.apply(s);
  const last = k >= recipe.length - 1;
  const next: CpuState = {
    ...s,
    ...patch,
    ...base,
    t: last ? 0 : s.t + 1,
    instructions: last ? s.instructions + 1 : s.instructions,
    last: {
      phase: "execute",
      t: s.t,
      signals: step.signals,
      bus: step.bus,
      src: step.src,
      dst: step.dst,
      title: `Execute ${disassemble(s.ir)} · step ${k + 1} of ${recipe.length}`,
      note: step.note,
    },
  };
  if (next.halted) next.last.phase = "halted";
  return next;
}

/** Run until the current instruction finishes (back at t = 0) or the CPU halts. */
export function stepInstruction(s: CpuState): CpuState {
  let cur = microStep(s);
  let guard = 0;
  while (cur.t !== 0 && !cur.halted && guard++ < 10) cur = microStep(cur);
  return cur;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  explain: string;
  ram: number[];
  /** Addresses holding data rather than instructions (for display). */
  data: number[];
  comments?: Record<number, string>;
}

const enc = (name: Mnemonic, n = 0) => (opByName.get(name)!.code << 4) | (n & 15);

export const programs: Program[] = [
  {
    id: "add",
    name: "2 + 3",
    code: "print(2 + 3)",
    explain: "Load 2 from address 14, add 3 from address 15, show the answer, stop.",
    ram: [enc("LDA", 14), enc("ADD", 15), enc("OUT"), enc("HLT"), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3],
    data: [14, 15],
    comments: { 0: "A = 2", 1: "A = A + 3", 2: "show A", 3: "stop", 14: "the number 2", 15: "the number 3" },
  },
  {
    id: "count",
    name: "Count by 15",
    code: "x = 0\nwhile no overflow:\n    print(x)\n    x = x + 15",
    explain: "Show A, add 15, and loop until the 8-bit register overflows (the carry flag).",
    ram: [enc("OUT"), enc("ADD", 15), enc("JC", 4), enc("JMP", 0), enc("HLT"), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15],
    data: [15],
    comments: { 0: "show A", 1: "A = A + 15", 2: "overflowed? → stop", 3: "loop back", 4: "stop", 15: "step size" },
  },
  {
    id: "mul",
    name: "3 × 4",
    code: "product = 0\ny = 4\nwhile y != 0:\n    product = product + 3\n    y = y - 1\nprint(product)",
    explain:
      "There's no multiply instruction, so add 3 to a running total 4 times, counting down with SUB and checking the zero flag.",
    ram: [
      enc("LDA", 14),
      enc("ADD", 13),
      enc("STA", 14),
      enc("LDA", 15),
      enc("SUB", 12),
      enc("STA", 15),
      enc("JZ", 8),
      enc("JMP", 0),
      enc("LDA", 14),
      enc("OUT"),
      enc("HLT"),
      0,
      1,
      3,
      0,
      4,
    ],
    data: [12, 13, 14, 15],
    comments: {
      0: "A = product",
      1: "A = A + 3",
      2: "product = A",
      3: "A = y",
      4: "A = A − 1",
      5: "y = A",
      6: "y is 0? → done",
      7: "loop again",
      8: "A = product",
      9: "show it",
      10: "stop",
      12: "constant 1",
      13: "x = 3",
      14: "product",
      15: "y = 4 (counter)",
    },
  },
  {
    id: "fib",
    name: "Fibonacci",
    code: "x, y = 0, 1\nwhile no overflow:\n    print(x)\n    x, y = y, x + y",
    explain: "Each number is the sum of the previous two: 0, 1, 1, 2, 3, 5, 8… until it no longer fits in 8 bits.",
    ram: [
      enc("LDA", 14),
      enc("OUT"),
      enc("ADD", 15),
      enc("JC", 10),
      enc("STA", 13),
      enc("LDA", 15),
      enc("STA", 14),
      enc("LDA", 13),
      enc("STA", 15),
      enc("JMP", 0),
      enc("HLT"),
      0,
      0,
      0,
      0,
      1,
    ],
    data: [13, 14, 15],
    comments: {
      0: "A = x",
      1: "show x",
      2: "A = x + y",
      3: "too big? → stop",
      4: "t = x + y",
      5: "A = y",
      6: "x = y",
      7: "A = t",
      8: "y = t",
      9: "loop",
      10: "stop",
      13: "t (temporary)",
      14: "x",
      15: "y",
    },
  },
];

export function ramToHex(ram: number[]) {
  return ram.map((b) => (b & 255).toString(16).padStart(2, "0")).join("");
}

export function hexToRam(hex: string): number[] | null {
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) return null;
  return Array.from({ length: 16 }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
}
