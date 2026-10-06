import { opByName, type Mnemonic } from "./cpu";

export interface AsmLine {
  lineNo: number;
  src: string;
  addr: number | null;
  byte: number | null;
  kind: "instr" | "data" | "empty";
  error?: string;
}

export interface AsmResult {
  ram: number[];
  lines: AsmLine[];
  errors: number;
  used: Set<number>;
}

function parseNum(s: string): number | null {
  const t = s.trim().toLowerCase();
  if (/^0b[01]+$/.test(t)) return parseInt(t.slice(2), 2);
  if (/^0x[0-9a-f]+$/.test(t)) return parseInt(t.slice(2), 16);
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  return null;
}

/**
 * Assemble SAP-8 assembly.
 *   LDA 14        ; instruction with operand
 *   OUT           ; instruction without operand
 *   14: 2         ; put the number 2 at address 14
 *   7             ; a bare number is data at the next address
 */
export function assemble(text: string): AsmResult {
  const ram = new Array(16).fill(0);
  const used = new Set<number>();
  const lines: AsmLine[] = [];
  let addr = 0;
  let errors = 0;

  text.split("\n").forEach((raw, i) => {
    const line: AsmLine = { lineNo: i + 1, src: raw, addr: null, byte: null, kind: "empty" };
    let code = raw.split(";")[0].trim();
    if (!code) {
      lines.push(line);
      return;
    }
    const m = code.match(/^(\w+)\s*:\s*(.*)$/);
    if (m) {
      const a = parseNum(m[1]);
      if (a === null || a > 15) {
        line.error = `Address “${m[1]}” must be a number from 0 to 15.`;
        errors++;
        lines.push(line);
        return;
      }
      addr = a;
      code = m[2].trim();
      if (!code) {
        lines.push(line);
        return;
      }
    }
    if (addr > 15) {
      line.error = "Out of memory: our CPU only has 16 bytes (addresses 0–15).";
      errors++;
      lines.push(line);
      return;
    }
    const parts = code.split(/\s+/);
    const head = parts[0].toUpperCase();
    const op = opByName.get(head as Mnemonic);
    let byte: number | null = null;
    if (op) {
      if (op.operand === "none") {
        if (parts.length > 1) line.error = `${op.name} doesn't take an operand.`;
        byte = op.code << 4;
      } else {
        const n = parts[1] !== undefined ? parseNum(parts[1]) : null;
        if (n === null) line.error = `${op.name} needs a number after it (0–15).`;
        else if (n > 15) line.error = `Operand ${n} doesn't fit in 4 bits (max 15).`;
        else byte = (op.code << 4) | n;
      }
      line.kind = "instr";
    } else {
      const dataStr = head === "DB" ? (parts[1] ?? "") : code;
      const n = parseNum(dataStr);
      if (n === null) line.error = `Unknown instruction “${parts[0]}”.`;
      else if (n > 255) line.error = `${n} doesn't fit in one byte (max 255).`;
      else byte = n;
      line.kind = "data";
    }
    if (line.error) {
      errors++;
    } else if (byte !== null) {
      if (used.has(addr)) {
        line.error = `Address ${addr} is already used by an earlier line.`;
        errors++;
      } else {
        ram[addr] = byte;
        used.add(addr);
        line.addr = addr;
        line.byte = byte;
      }
    }
    lines.push(line);
    addr++;
  });

  return { ram, lines, errors, used };
}

/* ------------------------------------------------------------------ */
/* A tiny compiler for expressions like 7 + 5 - 2                         */
/* ------------------------------------------------------------------ */

export type Token = { type: "num"; value: number } | { type: "op"; value: "+" | "-" };

export type Expr = { kind: "num"; value: number } | { kind: "bin"; op: "+" | "-"; left: Expr; right: Expr };

export interface CompileResult {
  tokens: Token[];
  tree: Expr | null;
  asm: string[];
  error?: string;
  value?: number;
}

export function compileExpr(src: string): CompileResult {
  const tokens: Token[] = [];
  const re = /\s*(\d+|[+-])/y;
  let pos = 0;
  const s = src.replace(/−/g, "-").trim();
  while (pos < s.length) {
    re.lastIndex = pos;
    const m = re.exec(s);
    if (!m) {
      return {
        tokens,
        tree: null,
        asm: [],
        error: `I don't understand “${s.slice(pos).trim()[0]}”. Use whole numbers with + and −.`,
      };
    }
    const t = m[1];
    if (t === "+" || t === "-") tokens.push({ type: "op", value: t });
    else tokens.push({ type: "num", value: Number(t) });
    pos = re.lastIndex;
    while (pos < s.length && s[pos] === " ") pos++;
  }
  if (!tokens.length) return { tokens, tree: null, asm: [], error: "Type an expression like 7 + 5 − 2." };

  // Parse: num (op num)*  → left-associative tree
  if (tokens[0].type !== "num")
    return { tokens, tree: null, asm: [], error: "An expression must start with a number." };
  let tree: Expr = { kind: "num", value: tokens[0].value as number };
  const nums: number[] = [tokens[0].value as number];
  const opsList: Array<"+" | "-"> = [];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const num = tokens[i + 1];
    if (op.type !== "op")
      return { tokens, tree: null, asm: [], error: "Two numbers in a row: put + or − between them." };
    if (!num || num.type !== "num")
      return { tokens, tree: null, asm: [], error: `“${op.value}” needs a number after it.` };
    tree = { kind: "bin", op: op.value, left: tree, right: { kind: "num", value: num.value } };
    nums.push(num.value);
    opsList.push(op.value);
  }
  if (nums.some((n) => n > 255)) return { tokens, tree, asm: [], error: "Each number must fit in one byte (0–255)." };
  const n = nums.length;
  if (n * 2 + 2 > 16)
    return {
      tokens,
      tree,
      asm: [],
      error: `Too long for 16 bytes of RAM: ${n} numbers need ${n * 2 + 2} bytes. Use at most 7 numbers.`,
    };

  // Code generation: data at the top of memory
  const dataStart = 16 - n;
  const asm: string[] = [];
  asm.push(`LDA ${dataStart}      ; A = ${nums[0]}`);
  opsList.forEach((op, i) => {
    asm.push(
      `${op === "+" ? "ADD" : "SUB"} ${dataStart + i + 1}      ; A = A ${op === "+" ? "+" : "−"} ${nums[i + 1]}`,
    );
  });
  asm.push("OUT         ; show A");
  asm.push("HLT         ; stop");
  nums.forEach((v, i) => asm.push(`${dataStart + i}: ${v}       ; the number ${v}`));
  let value = nums[0];
  opsList.forEach((op, i) => (value = op === "+" ? value + nums[i + 1] : value - nums[i + 1]));
  return { tokens, tree, asm, value };
}
