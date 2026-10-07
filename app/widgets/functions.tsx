import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Btn, cx, Pill, Segmented, Slider, Stat, Widget } from "~/components/ui";
import { binStr } from "~/lib/bits";
import { useInterval, useReducedMotion } from "~/lib/hooks";

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                  */
/* ------------------------------------------------------------------ */

const hatch: CSSProperties = {
  backgroundImage: "repeating-linear-gradient(135deg, transparent 0 6px, var(--color-line) 6px 7px)",
};

function Narration({ title, children, tone }: { title?: ReactNode; children: ReactNode; tone?: "pink" | "on" }) {
  return (
    <div
      className={cx(
        "rounded-md border p-3",
        tone === "pink" ? "border-pink bg-pink-tint" : tone === "on" ? "border-on bg-on-tint" : "border-line-2 bg-panel-2",
      )}
    >
      {title && <div className="label-caps mb-1 text-[0.6875rem] text-dim">{title}</div>}
      <div className="min-h-[3.2em] font-serif text-[0.9375rem] leading-relaxed text-body">{children}</div>
    </div>
  );
}

function Verdict({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div
      className={cx(
        "flex gap-2 rounded-md border px-3 py-2 font-serif text-[0.9375rem] leading-snug",
        ok ? "border-on bg-on-tint text-ink" : "border-pink bg-pink-tint text-ink",
      )}
    >
      <span className={cx("font-sans font-bold", ok ? "text-on" : "text-pink")}>{ok ? "✓" : "✗"}</span>
      <span>{children}</span>
    </div>
  );
}

function Reg({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-md border border-line-2 bg-panel px-3 py-1.5", className)}>
      <div className="label-caps text-[0.6875rem] text-dim">{label}</div>
      <div className="font-mono text-lg font-semibold text-ink tabular-nums">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1 · Find the way back                                                 */
/* ------------------------------------------------------------------ */

type WOp = "LDI" | "ADD" | "STA" | "OUT" | "HLT" | "JMP" | "CALL" | "RET";
interface WLine {
  addr: number;
  op?: WOp;
  n?: number;
  data?: number;
  note: string;
  changed?: boolean;
}
type Scenario = "two" | "nested";
type Method = "jmp2" | "jmp4" | "note" | "one" | "pile";

const wayCode: Record<Scenario, string> = {
  two: "def show_double(x):\n    print(x + x)\n\nshow_double(3)\nshow_double(5)",
  nested: "def g():\n    return 5\n\ndef f():\n    return g() + 1\n\nprint(f())",
};

function wayProgram(sc: Scenario, m: Method): WLine[] {
  if (sc === "two") {
    const call = m === "note";
    return [
      { addr: 0, op: "LDI", n: 3, note: "x = 3" },
      { addr: 1, op: call ? "CALL" : "JMP", n: 7, note: "show_double(3)", changed: call },
      { addr: 2, op: "LDI", n: 5, note: "x = 5" },
      { addr: 3, op: call ? "CALL" : "JMP", n: 7, note: "show_double(5)", changed: call },
      { addr: 4, op: "HLT", note: "stop" },
      { addr: 7, op: "STA", n: 13, note: "show_double: temp = x" },
      { addr: 8, op: "ADD", n: 13, note: "A = x + x" },
      { addr: 9, op: "OUT", note: "print it" },
      m === "jmp2"
        ? { addr: 10, op: "JMP", n: 2, note: "go back… to 2?", changed: true }
        : m === "jmp4"
          ? { addr: 10, op: "JMP", n: 4, note: "go back… to 4?", changed: true }
          : { addr: 10, op: "RET", note: "go back where the note says", changed: true },
      { addr: 13, data: 0, note: "temp" },
    ];
  }
  return [
    { addr: 0, op: "CALL", n: 4, note: "main: call f" },
    { addr: 1, op: "OUT", note: "print the answer" },
    { addr: 2, op: "HLT", note: "stop" },
    { addr: 3, data: 1, note: "the number 1" },
    { addr: 4, op: "CALL", n: 7, note: "f: first call g" },
    { addr: 5, op: "ADD", n: 3, note: "then add 1" },
    { addr: 6, op: "RET", note: "f is done" },
    { addr: 7, op: "LDI", n: 5, note: "g: A = 5" },
    { addr: 8, op: "RET", note: "g is done" },
  ];
}

interface WState {
  pc: number;
  a: number;
  mem: Record<number, number>;
  notes: number[];
  lost: number[];
  out: number[];
  path: number[];
  caller: number;
  halted: boolean;
  stopped: boolean;
  steps: number;
  msg: string;
  verdict: { ok: boolean; text: string } | null;
  fRets: number;
}

const WAY_MAX = 40;

function wayTrace(sc: Scenario, m: Method): WState[] {
  const prog = wayProgram(sc, m);
  const byAddr = new Map(prog.map((l) => [l.addr, l]));
  let s: WState = {
    pc: 0,
    a: 0,
    mem: sc === "two" ? { 13: 0 } : { 3: 1 },
    notes: [],
    lost: [],
    out: [],
    path: [],
    caller: -1,
    halted: false,
    stopped: false,
    steps: 0,
    msg: "The program counter (PC) starts at address 0. Press Step to run one instruction.",
    verdict: null,
    fRets: 0,
  };
  const states = [s];
  const pile = m === "pile";
  while (!s.halted && s.steps < WAY_MAX) {
    const l = byAddr.get(s.pc);
    const n: WState = {
      ...s,
      mem: { ...s.mem },
      notes: [...s.notes],
      lost: [...s.lost],
      out: [...s.out],
      path: [...s.path, s.pc],
      steps: s.steps + 1,
    };
    let next = s.pc + 1;
    let msg = "";
    const v = l?.n ?? 0;
    switch (l?.op) {
      case "LDI":
        n.a = v;
        msg = `LDI ${v}: A = ${v}.`;
        break;
      case "STA":
        n.mem[v] = n.a;
        msg = `STA ${v}: copy A (${n.a}) into address ${v}.`;
        break;
      case "ADD":
        n.a = (s.a + (n.mem[v] ?? 0)) & 255;
        msg = `ADD ${v}: A = ${s.a} + ${n.mem[v] ?? 0} = ${n.a}.`;
        break;
      case "OUT":
        n.out.push(n.a);
        msg = `OUT: print ${n.a}.`;
        break;
      case "HLT":
        n.halted = true;
        next = s.pc;
        msg = "HLT: the program stops.";
        if (sc === "two" && m === "note")
          n.verdict = { ok: true, text: "Both calls came back to the right place. Output: 6, then 10." };
        if (sc === "two" && m === "jmp4") msg += " Only one answer was printed.";
        if (sc === "nested" && m === "pile")
          n.verdict = {
            ok: true,
            text: "Each RET used the newest note. g went back to f, and f went back to main. Output: 6.",
          };
        break;
      case "JMP":
        next = v;
        if (s.pc === 10) {
          const right = s.caller + 1;
          if (v === right) {
            msg = `JMP ${v}: back to address ${v}. Right this time, because this call came from address ${s.caller}.`;
          } else {
            msg = `JMP ${v}: back to address ${v}. Wrong! This call came from address ${s.caller}, so it should go back to ${right}.`;
            if (!n.verdict)
              n.verdict =
                m === "jmp2"
                  ? {
                      ok: false,
                      text: "The second call goes back to the wrong place. The program prints 6, 10, 10, 10, … and never reaches HLT.",
                    }
                  : { ok: false, text: "The first call goes back to the wrong place. show_double(5) never runs." };
          }
        } else {
          n.caller = s.pc;
          msg = `JMP ${v}: the PC becomes ${v}. Nothing remembers that this jump came from address ${s.pc}.`;
        }
        break;
      case "CALL": {
        const back = s.pc + 1;
        n.caller = s.pc;
        next = v;
        if (pile) {
          n.notes.push(back);
          msg = `CALL ${v}: put a note with the way back (${back}) on top of the pile, then jump to ${v}.${
            n.notes.length > 1 ? ` The ${n.notes[n.notes.length - 2]} is still there, underneath.` : ""
          }`;
        } else {
          if (n.notes.length) n.lost.push(n.notes[0]);
          const old = n.notes[0];
          n.notes = [back];
          msg =
            old === undefined
              ? `CALL ${v}: write the way back (${back}) on the note, then jump to ${v}.`
              : `CALL ${v}: write the way back (${back}) on the note, then jump to ${v}. But there is only one note: the ${old} (the way back to main) is rubbed out!`;
        }
        break;
      }
      case "RET": {
        if (pile) {
          const back = n.notes.pop() ?? 0;
          next = back;
          msg = `RET: take the top note (${back}) off the pile and jump there${back === 1 ? ", back in main" : ", back into f"}. Correct.`;
        } else {
          const back = n.notes[0] ?? 0;
          next = back;
          if (sc === "two") {
            msg = `RET: read the note (${back}) and jump there. This call came from address ${s.caller}, so ${back} is exactly right.`;
          } else if (s.pc === 8) {
            msg = `RET: the note says ${back}, so jump to ${back}, back into f. Correct.`;
          } else {
            n.fRets = s.fRets + 1;
            msg =
              n.fRets === 1
                ? `RET: the note still says ${back}, so f jumps back into itself instead of to main!`
                : `RET: the note says ${back} again. Round and round.`;
            if (!n.verdict)
              n.verdict = {
                ok: false,
                text: "The way back to main was lost. f adds 1 and returns to itself again and again: A goes 6, 7, 8, … and nothing is ever printed.",
              };
          }
        }
        break;
      }
      default:
        msg = "Nothing here.";
    }
    n.pc = next;
    if (!n.halted && n.steps >= WAY_MAX) {
      n.stopped = true;
      msg += " (We stop the demo here. The real machine would go on forever.)";
    }
    n.msg = msg;
    states.push(n);
    s = n;
  }
  return states;
}

function PathTrail({ path }: { path: number[] }) {
  const shown = path.slice(-22);
  const cut = path.length - shown.length;
  return (
    <div className="font-mono text-xs leading-relaxed text-mute tabular-nums">
      {cut > 0 && <span className="text-dim">… </span>}
      {shown.map((addr, i) => {
        const prev = i > 0 ? shown[i - 1] : cut > 0 ? path[cut - 1] : undefined;
        const jump = prev !== undefined && addr !== prev + 1;
        return (
          <span key={i}>
            {jump ? <span className="text-amber"> → </span> : i > 0 ? " " : ""}
            <span className={cx(i === shown.length - 1 && "font-bold text-ink")}>{addr}</span>
          </span>
        );
      })}
      {path.length === 0 && <span className="text-dim">nothing yet</span>}
    </div>
  );
}

export function WayBack() {
  const [sc, setSc] = useState<Scenario>("two");
  const [m, setM] = useState<Method>("jmp2");
  const trace = useMemo(() => wayTrace(sc, m), [sc, m]);
  const [i, setI] = useState(0);
  const [running, setRunning] = useState(false);
  const s = trace[Math.min(i, trace.length - 1)];
  const atEnd = i >= trace.length - 1;
  const prog = wayProgram(sc, m);

  const pick = (nsc: Scenario, nm: Method) => {
    setSc(nsc);
    setM(nm);
    setI(0);
    setRunning(false);
  };
  useInterval(
    () => {
      if (atEnd) setRunning(false);
      else setI((x) => x + 1);
    },
    running ? 650 : null,
  );

  const methods: Array<{ value: Method; label: string }> =
    sc === "two"
      ? [
          { value: "jmp2", label: "end with JMP 2" },
          { value: "jmp4", label: "end with JMP 4" },
          { value: "note", label: "write a note first" },
        ]
      : [
          { value: "one", label: "one note" },
          { value: "pile", label: "a pile of notes" },
        ];

  const noteMode = m === "note" || m === "one";
  return (
    <Widget
      title="Find the way back"
      subtitle="One function is used from two places, or one function calls another. Pick how the function returns, then step through and watch where the program counter goes."
      wide
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Segmented
          size="sm"
          value={sc}
          onChange={(v) => pick(v, v === "two" ? "jmp2" : "one")}
          options={[
            { value: "two", label: "Two callers" },
            { value: "nested", label: "A call inside a call" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps text-[0.6875rem] text-dim">Way back</span>
          <Segmented size="sm" value={m} onChange={(v) => pick(sc, v)} options={methods} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        <div className="space-y-3">
          <pre className="scroll-thin overflow-x-auto rounded-md border border-line bg-panel-2 px-3 py-2 font-mono text-xs leading-relaxed text-ink">
            {wayCode[sc]}
          </pre>
          <div className="rounded-md border border-line-2 bg-panel px-1 py-1">
            <table className="w-full font-mono text-xs tabular-nums">
              <tbody>
                {prog.map((l, k) => {
                  const gap = k > 0 && l.addr !== prog[k - 1].addr + 1;
                  const isPc = s.pc === l.addr;
                  return (
                    <FragmentRows key={l.addr} gap={gap}>
                      <tr className={cx("transition-colors", isPc && "bg-panel-3")}>
                        <td className="w-5 py-[3px] pl-1 text-pink">{isPc ? "▶" : ""}</td>
                        <td className="w-6 py-[3px] pr-2 text-right text-dim">{l.addr}</td>
                        <td
                          className={cx(
                            "py-[3px] pr-2 whitespace-nowrap",
                            l.data !== undefined
                              ? "text-amber"
                              : l.changed
                                ? "font-bold text-amber"
                                : "font-semibold text-ink",
                          )}
                        >
                          {l.data !== undefined ? (s.mem[l.addr] ?? l.data) : l.n !== undefined ? `${l.op} ${l.n}` : l.op}
                        </td>
                        <td className="py-[3px] pr-1 font-sans text-[0.6875rem] text-dim">{l.note}</td>
                      </tr>
                    </FragmentRows>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-3 text-[0.6875rem] text-dim">
            <span>
              <span className="text-pink">▶</span> program counter (next instruction)
            </span>
            <span>
              <span className="font-bold text-amber">amber</span> = the lines your choice changes
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="primary" onClick={() => setI((x) => Math.min(x + 1, trace.length - 1))} disabled={atEnd || running}>
              Step
            </Btn>
            <Btn onClick={() => setRunning((r) => !r)} disabled={atEnd}>
              {running ? "⏸ Pause" : "▶ Run"}
            </Btn>
            <Btn onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0 || running}>
              ← Back
            </Btn>
            <Btn
              onClick={() => {
                setI(0);
                setRunning(false);
              }}
            >
              Reset
            </Btn>
            <span className="ml-auto font-mono text-[0.6875rem] text-dim">{s.steps} instructions run</span>
          </div>
          <Narration title="What just happened">{s.msg}</Narration>
          {s.verdict && <Verdict ok={s.verdict.ok}>{s.verdict.text}</Verdict>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Reg label="PC">{s.pc}</Reg>
            <Reg label="Register A">{s.a}</Reg>
            <div className="col-span-2 rounded-md border border-line-2 bg-panel px-3 py-1.5 sm:col-span-1">
              <div className="label-caps text-[0.6875rem] text-dim">Printed</div>
              <div className="font-mono text-lg font-semibold text-on tabular-nums">
                {s.out.length ? s.out.join(", ") : <span className="text-dim">–</span>}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-line-2 bg-panel px-3 py-2">
            <div className="label-caps text-[0.6875rem] text-dim">
              {m === "pile" ? "The pile of notes (newest on top)" : noteMode ? "The note" : "Notes"}
            </div>
            {m === "jmp2" || m === "jmp4" ? (
              <p className="mt-1 font-serif text-[0.9375rem] text-mute">
                None. A JMP only knows the one address written inside it.
              </p>
            ) : m === "pile" ? (
              <div className="mt-1.5 flex flex-col gap-1">
                {s.notes.length === 0 && <span className="font-serif text-[0.9375rem] text-mute">empty</span>}
                {[...s.notes].reverse().map((v, k) => (
                  <div
                    key={s.notes.length - k}
                    className={cx(
                      "flex w-44 items-center justify-between rounded border px-2 py-0.5 font-mono text-sm",
                      k === 0 ? "border-violet bg-violet-tint font-bold text-violet" : "border-line-2 text-mute",
                    )}
                  >
                    <span>back to {v}</span>
                    <span className="text-[0.6875rem] font-normal text-dim">{k === 0 ? "top" : ""}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-1.5 flex items-center gap-3">
                {s.lost.map((v, k) => (
                  <span key={k} className="font-mono text-sm text-dim line-through">
                    back to {v}
                  </span>
                ))}
                {s.notes.length ? (
                  <span className="rounded border border-violet bg-violet-tint px-2 py-0.5 font-mono text-sm font-bold text-violet">
                    back to {s.notes[0]}
                  </span>
                ) : (
                  <span className="font-serif text-[0.9375rem] text-mute">blank</span>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="label-caps mb-1 text-[0.6875rem] text-dim">
              Path of the PC <span className="normal-case">(→ marks a jump)</span>
            </div>
            <PathTrail path={s.path} />
          </div>
        </div>
      </div>
    </Widget>
  );
}

function FragmentRows({ gap, children }: { gap: boolean; children: ReactNode }) {
  return (
    <>
      {gap && (
        <tr>
          <td />
          <td className="py-0 pr-2 text-right text-dim">⋮</td>
          <td colSpan={2} />
        </tr>
      )}
      {children}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 2 · Stack playground: PUSH and POP                                    */
/* ------------------------------------------------------------------ */

const PG_PROG = ["LDI 3", "PUSH", "LDI 7", "PUSH", "POP", "HLT"]; // addresses 0–5
const PG_ROW = 28;

export function StackPlayground() {
  const [ram, setRam] = useState<Array<number | null>>(() => Array(16).fill(null));
  const [sp, setSp] = useState(15);
  const [a, setA] = useState(3);
  const [last, setLast] = useState<{ lines: string[]; addr: number | null; tone?: "pink" }>({
    lines: ["The stack is empty. SP is 15: the next free slot is address 15, the very bottom of memory."],
    addr: null,
  });
  const [log, setLog] = useState<string[]>([]);
  const [broken, setBroken] = useState<number | null>(null);

  const canPush = sp >= PG_PROG.length - 1;
  const push = () => {
    if (!canPush) return;
    const addr = sp;
    const r = ram.slice();
    r[addr] = a;
    setRam(r);
    setSp(addr - 1);
    setLog((l) => [...l, `push ${a}`]);
    if (addr < PG_PROG.length) {
      setBroken(addr);
      setLast({
        lines: [
          `1. Write A (${a}) into the slot SP points at: address ${addr}.`,
          `2. Count SP down: ${addr} − 1 = ${addr - 1}.`,
          `✗ But address ${addr} held part of the program (${PG_PROG[addr]})! The stack has grown into the code and overwritten it. This is a stack overflow.`,
        ],
        addr,
        tone: "pink",
      });
    } else {
      setLast({
        lines: [
          `1. Write A (${a}) into the slot SP points at: address ${addr}.`,
          `2. Count SP down: ${addr} − 1 = ${addr - 1}. SP points at the next free slot again.`,
        ],
        addr,
      });
    }
  };
  const pop = () => {
    if (sp >= 15) {
      setLast({ lines: ["The stack is empty: SP is 15, the very bottom. There is nothing to take."], addr: null, tone: "pink" });
      return;
    }
    const addr = sp + 1;
    const v = ram[addr] ?? 0;
    setA(v);
    setSp(addr);
    setLog((l) => [...l, `pop → ${v}`]);
    setLast({
      lines: [
        `1. Count SP up: ${sp} + 1 = ${addr}. Now SP points at the top value.`,
        `2. Read address ${addr} (${v}) into A.`,
        "The number is still in memory, but it no longer counts: the next PUSH will write over it.",
      ],
      addr,
    });
  };
  const reset = () => {
    setRam(Array(16).fill(null));
    setSp(15);
    setA(3);
    setLog([]);
    setBroken(null);
    setLast({
      lines: ["The stack is empty. SP is 15: the next free slot is address 15, the very bottom of memory."],
      addr: null,
    });
  };

  return (
    <Widget
      title="PUSH and POP by hand"
      subtitle="The bottom of RAM is the stack. Set register A, then push and pop. Try: push 3, push 7, then pop twice. Which number comes out first?"
      wide
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* RAM column */}
        <div>
          <div className="label-caps mb-1.5 text-[0.6875rem] text-dim">RAM · 16 bytes</div>
          <div className="relative rounded-md border border-line-2 bg-panel">
            {ram.map((v, addr) => {
              const isProg = addr < PG_PROG.length;
              const onStack = addr > sp;
              const isTop = addr === sp + 1;
              const touched = last.addr === addr;
              return (
                <div
                  key={addr}
                  style={{ height: PG_ROW, ...(isProg && broken !== addr ? hatch : {}) }}
                  className={cx(
                    "flex items-center gap-2 border-b border-line pr-14 pl-2 font-mono text-xs tabular-nums last:border-b-0",
                    onStack && "bg-violet-tint",
                    broken === addr && "bg-pink-tint",
                    touched && "halo-violet relative z-[1]",
                  )}
                >
                  <span className="w-5 text-right text-dim">{addr}</span>
                  {isProg ? (
                    broken === addr ? (
                      <span className="font-bold text-pink">
                        {v} <span className="font-sans text-[0.6875rem] font-normal">✗ was {PG_PROG[addr]}</span>
                      </span>
                    ) : (
                      <span className="text-dim">
                        {PG_PROG[addr]} <span className="font-sans text-[0.6875rem]">program</span>
                      </span>
                    )
                  ) : onStack ? (
                    <span className="font-bold text-violet">
                      {v}
                      <span className="ml-2 font-sans text-[0.6875rem] font-normal">{isTop ? "top of the stack" : "on the stack"}</span>
                    </span>
                  ) : v !== null ? (
                    <span className="text-dim">
                      {v} <span className="font-sans text-[0.6875rem]">old value, free</span>
                    </span>
                  ) : (
                    <span className="text-dim">·</span>
                  )}
                </div>
              );
            })}
            {sp >= 0 && (
              <div
                className="pointer-events-none absolute right-1.5 flex items-center font-sans text-xs font-bold text-violet transition-[top] duration-300"
                style={{ top: sp * PG_ROW, height: PG_ROW }}
              >
                ◂ SP
              </div>
            )}
          </div>
          <div className="mt-1.5 text-[0.6875rem] text-dim">
            Address 0 is at the top, like the CPU simulator. The pile starts at address 15 and grows toward smaller
            addresses.
          </div>
        </div>

        {/* controls */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-line-2 bg-panel px-3 py-2">
              <div className="label-caps text-[0.6875rem] text-dim">Register A</div>
              <div className="font-mono text-2xl font-semibold text-ink tabular-nums">{a}</div>
            </div>
            <div className="rounded-md border border-violet bg-panel px-3 py-2">
              <div className="label-caps text-[0.6875rem] text-violet">Stack pointer SP</div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-semibold text-violet tabular-nums">{sp}</span>
                <span className="font-mono text-xs text-mute">= {binStr(sp & 15, 4)}</span>
              </div>
            </div>
          </div>
          <Slider label="Set register A to" min={0} max={99} value={a} onChange={setA} />
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" onClick={push} disabled={!canPush}>
              PUSH A
            </Btn>
            <Btn onClick={pop}>POP → A</Btn>
            <Btn variant="ghost" onClick={reset}>
              Reset
            </Btn>
          </div>
          <Narration title="What the CPU just did" tone={last.tone}>
            {last.lines.map((t, k) => (
              <span key={k} className="block">
                {t}
              </span>
            ))}
          </Narration>
          <div>
            <div className="label-caps mb-1 text-[0.6875rem] text-dim">History</div>
            <div className="flex flex-wrap gap-1.5">
              {log.length === 0 && <span className="text-sm text-dim">nothing yet</span>}
              {log.slice(-14).map((t, k) => (
                <Pill key={k} tone={t.startsWith("pop") ? "violet" : "mute"}>
                  {t}
                </Pill>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 3 · The call-stack tower                                              */
/* ------------------------------------------------------------------ */

type CellKind = "ret" | "arg" | "local";
interface TCell {
  label: string;
  value: string;
  kind: CellKind;
}
interface TFrame {
  name: string;
  cells: TCell[];
  bad?: boolean;
}
interface TEvent {
  kind: "call" | "return";
  /** The code line the return address points at. */
  line: number;
  /** Address of the return-address slot. */
  slot: number;
}
interface TState {
  line: number;
  frames: TFrame[];
  a: string | null;
  out: string[];
  note: string;
  event?: TEvent;
  overflow?: boolean;
  done?: boolean;
}

const T_BASE = 63; // first stack slot (the bottom of the pile)
const T_LIMIT = 45; // highest address used by the program
const T_TOP = 42; // first row drawn
const T_CAP = T_BASE - T_LIMIT; // 18 slots
const T_ROW = 24;

const used = (fs: TFrame[]) => fs.reduce((k, f) => k + f.cells.length, 0);
const spOf = (fs: TFrame[]) => T_BASE - used(fs);
const ret = (line: number): TCell => ({ label: "way back", value: `line ${line}`, kind: "ret" });
const arg = (label: string, v: number | string): TCell => ({ label, value: String(v), kind: "arg" });
const loc = (label: string, v: string): TCell => ({ label, value: v, kind: "local" });

class Recorder {
  states: TState[] = [];
  frames: TFrame[] = [];
  a: string | null = null;
  out: string[] = [];
  snap(line: number, note: string, extra: Partial<TState> = {}) {
    this.states.push({
      line,
      frames: this.frames.map((f) => ({ ...f, cells: f.cells.map((c) => ({ ...c })) })),
      a: this.a,
      out: [...this.out],
      note,
      ...extra,
    });
  }
  /** Push a frame. Returns false (and records the crash) if it does not fit. */
  call(line: number, frame: TFrame, note: (sp0: number, sp1: number) => string): boolean {
    const sp0 = spOf(this.frames);
    const slot = sp0;
    if (used(this.frames) + frame.cells.length > T_CAP) {
      this.frames.push({ ...frame, bad: true });
      this.snap(
        line,
        `Stack overflow! ${frame.name} needs ${frame.cells.length} more slots, but the next free slot, address ${sp0}, belongs to the program. Our toy stack has room for ${T_CAP} slots (${T_CAP / 3} frames like these). A real computer stops the program here with an error such as “Segmentation fault” or “Stack overflow”.`,
        { overflow: true, done: true, event: { kind: "call", line, slot } },
      );
      return false;
    }
    this.frames.push(frame);
    this.snap(line, note(sp0, spOf(this.frames)), { event: { kind: "call", line, slot } });
    return true;
  }
  ret(line: number, backTo: number, note: (sp0: number, sp1: number) => string, extra: Partial<TState> = {}) {
    const sp0 = spOf(this.frames);
    this.frames.pop();
    const sp1 = spOf(this.frames);
    this.snap(line, note(sp0, sp1), { event: { kind: "return", line: backTo, slot: sp1 }, ...extra });
  }
  top() {
    return this.frames[this.frames.length - 1];
  }
}

const greetCode = [
  "def add(a, b):",
  "    s = a + b",
  "    return s",
  "",
  "def greet(age):",
  "    older = add(age, 1)",
  '    print("Next year:", older)',
  "    return",
  "",
  "greet(41)",
  'print("bye")',
];

function greetTrace(): TState[] {
  const r = new Recorder();
  r.snap(10, "The program starts at line 10. The stack is empty, so SP points at address 63: the first free slot.");
  r.call(
    10,
    { name: "greet(41)", cells: [ret(10), arg("age", 41), loc("older", "?")] },
    (a, b) =>
      `Line 10 calls greet(41). A new frame goes on the stack: the way back (line 10), the argument age = 41, and an empty slot for greet's own variable older. SP: ${a} → ${b}. Then the PC jumps into greet.`,
  );
  r.call(
    6,
    { name: "add(41, 1)", cells: [ret(6), arg("a", 41), arg("b", 1), loc("s", "?")] },
    (a, b) =>
      `Line 6 calls add(age, 1), which is add(41, 1). A second frame goes on top: the way back (line 6), a = 41, b = 1, and room for s. SP: ${a} → ${b}.`,
  );
  r.top().cells[3].value = "42";
  r.snap(2, "Line 2: s = a + b = 41 + 1 = 42. add finds a, b and s in its own frame, the one on top.");
  r.a = "42";
  r.ret(
    3,
    6,
    (a, b) =>
      `Line 3: return s. The answer, 42, goes into register A. Then the top frame is thrown away (SP: ${a} → ${b}), and the PC jumps to the way back it held: line 6.`,
  );
  r.top().cells[2].value = "42";
  r.snap(6, "Back in greet, line 6 finishes: the answer waiting in A (42) is stored in older, in greet's frame.");
  r.out.push("Next year: 42");
  r.snap(7, "Line 7 prints “Next year: 42”.");
  r.a = null;
  r.ret(
    8,
    10,
    (a, b) => `Line 8: return. greet's frame is thrown away (SP: ${a} → ${b}), and the PC jumps back to line 10.`,
  );
  r.out.push("bye");
  r.snap(11, "greet(41) is finished, so the program carries on with line 11 and prints “bye”. The stack is empty again.", {
    done: true,
  });
  return r.states;
}

const factCode = (n: number) => [
  "def fact(n):",
  "    if n == 1:",
  "        return 1",
  "    smaller = fact(n - 1)",
  "    return n * smaller",
  "",
  `answer = fact(${n})`,
  "print(answer)",
];

function factTrace(N: number): TState[] {
  const r = new Recorder();
  r.snap(7, "The program starts at line 7. The stack is empty, so SP points at address 63.");
  const frame = (k: number, back: number): TFrame => ({
    name: `fact(${k})`,
    cells: [ret(back), arg("n", k), loc("smaller", "?")],
  });
  if (!r.call(7, frame(N, 7), (a, b) => `Line 7 calls fact(${N}). Frame 1 goes on the stack: the way back (line 7), n = ${N}, and an empty slot for smaller. SP: ${a} → ${b}.`))
    return r.states;
  for (let k = N; k >= 1; k--) {
    if (k > 1) {
      r.snap(2, `Line 2: n is ${k}, not 1, so skip to line 4.`);
      const depth = r.frames.length + 1;
      const ok = r.call(
        4,
        frame(k - 1, 4),
        (a, b) =>
          `Line 4 needs fact(${k - 1}) before it can finish. Frame ${depth} goes on top, with its own n = ${k - 1}. The n = ${k} below it is safe. SP: ${a} → ${b}.`,
      );
      if (!ok) return r.states;
    } else {
      r.snap(2, "Line 2: n is 1. This is the stop rule (the base case): no more calls.");
      r.a = "1";
      const back = N === 1 ? 7 : 4;
      r.ret(3, back, (a, b) => `Line 3: return 1. A = 1. The top frame is thrown away (SP: ${a} → ${b}) and the PC jumps to its way back: line ${back}.`);
    }
  }
  let v = 1;
  for (let k = 2; k <= N; k++) {
    r.top().cells[2].value = String(v);
    r.snap(4, `Back in fact(${k}), line 4 finishes: smaller = A = ${v}.`);
    const res = k * v;
    r.a = String(res);
    const back = k === N ? 7 : 4;
    r.ret(
      5,
      back,
      (a, b) => `Line 5: return n × smaller = ${k} × ${v} = ${res}. A = ${res}. Throw away the frame (SP: ${a} → ${b}) and jump back to line ${back}.`,
    );
    v = res;
  }
  r.snap(7, `Back in the main program, line 7 finishes: answer = A = ${v}.`);
  r.out.push(String(v));
  r.snap(8, `Line 8 prints ${v}. The stack is empty again. Every frame had variables with the same names (n and smaller), but each call had its own copy.`, {
    done: true,
  });
  return r.states;
}

const noStopCode = [
  "def fact(n):",
  "    smaller = fact(n - 1)   # no stop rule!",
  "    return n * smaller",
  "",
  "answer = fact(4)",
  "print(answer)",
];

function noStopTrace(): TState[] {
  const r = new Recorder();
  r.snap(5, "The program starts at line 5. Look at fact: it always calls itself. Nothing ever tells it to stop.");
  const frame = (k: number, back: number): TFrame => ({
    name: `fact(${k})`,
    cells: [ret(back), arg("n", k), loc("smaller", "?")],
  });
  if (!r.call(5, frame(4, 5), (a, b) => `Line 5 calls fact(4). Frame 1 goes on the stack. SP: ${a} → ${b}.`)) return r.states;
  for (let k = 4; k > -10; k--) {
    const m = k - 1;
    const extra =
      m === 0
        ? " n is now 0. A factorial should stop at 1, but this code has no rule to stop."
        : m < 0
          ? ` n is ${m}. The numbers go below zero, and nothing stops them.`
          : "";
    const ok = r.call(
      2,
      frame(m, 2),
      (a, b) => `Line 2 calls fact(${m}). Frame ${r.frames.length} goes on top. SP: ${a} → ${b}.${extra}`,
    );
    if (!ok) break;
  }
  return r.states;
}

type Preset = "greet" | "fact" | "nostop";

const kindStyle: Record<CellKind, string> = {
  ret: "text-cyan",
  arg: "text-amber",
  local: "text-violet",
};

export function CallStackTower() {
  const [preset, setPreset] = useState<Preset>("fact");
  const [n, setN] = useState(4);
  const trace = useMemo(
    () => (preset === "greet" ? greetTrace() : preset === "fact" ? factTrace(n) : noStopTrace()),
    [preset, n],
  );
  const code = preset === "greet" ? greetCode : preset === "fact" ? factCode(n) : noStopCode;
  const [i, setI] = useState(0);
  const [running, setRunning] = useState(false);
  const s = trace[Math.min(i, trace.length - 1)];
  const atEnd = i >= trace.length - 1;
  const reduced = useReducedMotion();

  const choose = (p: Preset) => {
    setPreset(p);
    setI(0);
    setRunning(false);
  };
  useInterval(
    () => {
      if (atEnd) setRunning(false);
      else setI((x) => x + 1);
    },
    running ? 950 : null,
  );

  // ---- the return address flying between the code and the stack ----
  const wrapRef = useRef<HTMLDivElement>(null);
  const towerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef(new Map<number, HTMLElement>());
  const prevI = useRef(i);
  const [flight, setFlight] = useState<{ key: number; text: string; xs: number[]; ys: number[] } | null>(null);
  useEffect(() => {
    const forward = i === prevI.current + 1;
    prevI.current = i;
    const ev = s.event;
    if (!forward || !ev || reduced || !wrapRef.current || !towerRef.current) {
      setFlight(null);
      return;
    }
    const w = wrapRef.current.getBoundingClientRect();
    const t = towerRef.current.getBoundingClientRect();
    const le = lineRefs.current.get(ev.line);
    if (!le) return;
    const l = le.getBoundingClientRect();
    const code = { x: l.left + Math.min(l.width, 230) - w.left - 30, y: l.top + l.height / 2 - w.top };
    const slot = { x: t.left + t.width * 0.4 - w.left, y: t.top + (ev.slot - T_TOP + 0.5) * T_ROW - w.top };
    const [a, b] = ev.kind === "call" ? [code, slot] : [slot, code];
    setFlight({ key: i, text: `line ${ev.line}`, xs: [a.x, b.x], ys: [a.y, b.y] });
  }, [i, s, reduced]);

  const sp = spOf(s.frames.filter((f) => !f.bad));
  const depth = s.frames.filter((f) => !f.bad).length;
  const top = s.frames.length - 1;

  // where each frame sits: its lowest address (top on screen) and its size
  let usedSoFar = 0;
  const placed = s.frames.map((f) => {
    const start = T_BASE - usedSoFar; // address of its first cell (the way back)
    usedSoFar += f.cells.length;
    return { f, low: start - f.cells.length + 1 };
  });

  const rows = Array.from({ length: T_BASE - T_TOP + 1 }, (_, k) => T_TOP + k);

  return (
    <Widget
      title="The call-stack tower"
      subtitle="Every call puts a frame on the stack: the way back, the arguments, and the function's own variables. Every return takes the top frame off again. Step through and watch the tower grow and shrink."
      wide
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Segmented
          size="sm"
          value={preset}
          onChange={choose}
          options={[
            { value: "greet", label: "greet → add" },
            { value: "fact", label: "factorial" },
            { value: "nostop", label: "factorial, no stop rule" },
          ]}
        />
        {preset === "fact" && (
          <Slider
            className="w-48"
            label="n"
            min={1}
            max={7}
            value={n}
            onChange={(v) => {
              setN(v);
              setI(0);
              setRunning(false);
            }}
            format={(v) => `fact(${v})`}
          />
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn variant="primary" onClick={() => setI((x) => Math.min(x + 1, trace.length - 1))} disabled={atEnd || running}>
          Step
        </Btn>
        <Btn onClick={() => setRunning((r) => !r)} disabled={atEnd}>
          {running ? "⏸ Pause" : "▶ Run"}
        </Btn>
        <Btn onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0 || running}>
          ← Back
        </Btn>
        <Btn
          onClick={() => {
            setI(0);
            setRunning(false);
          }}
        >
          Reset
        </Btn>
        <span className="ml-auto font-mono text-[0.6875rem] text-dim">
          step {i} of {trace.length - 1}
        </span>
      </div>
      <div className="mt-3">
        <Narration title={s.overflow ? "Crash" : "What just happened"} tone={s.overflow ? "pink" : s.done ? "on" : undefined}>
          {s.note}
        </Narration>
      </div>

      <div ref={wrapRef} className="relative mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)]">
        {/* code + registers */}
        <div className="min-w-0 space-y-3">
          <div className="scroll-thin overflow-x-auto rounded-md border border-line-2 bg-panel py-1.5">
            {code.map((txt, k) => {
              const ln = k + 1;
              const here = s.line === ln;
              return (
                <div
                  key={ln}
                  ref={(el) => {
                    if (el) lineRefs.current.set(ln, el);
                    else lineRefs.current.delete(ln);
                  }}
                  className={cx(
                    "flex items-center gap-2 pr-3 font-mono text-[0.8125rem] whitespace-pre transition-colors",
                    here && (s.overflow ? "bg-pink-tint" : "bg-panel-3"),
                  )}
                  style={{ minHeight: 24 }}
                >
                  <span className="w-4 shrink-0 pl-1 text-pink">{here ? "▶" : ""}</span>
                  <span className="w-5 shrink-0 text-right text-[0.6875rem] text-dim">{ln}</span>
                  <span className={cx(here ? "font-semibold text-ink" : "text-body")}>{txt || " "}</span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Depth" value={`${depth} frame${depth === 1 ? "" : "s"}`} tone="violet" />
            <Stat label="SP" value={s.overflow ? "✗" : sp} sub="next free slot" tone="violet" />
            <Stat label="Stack used" value={`${used(s.frames.filter((f) => !f.bad))} / ${T_CAP}`} sub="slots" />
            <Stat label="Register A" value={s.a ?? "–"} sub="return value" tone="cyan" />
          </div>
          <div className="rounded-md border border-line-2 bg-panel px-3 py-2">
            <div className="label-caps text-[0.6875rem] text-dim">Printed</div>
            <div className="mt-0.5 min-h-[1.5em] font-mono text-sm font-semibold text-on">
              {s.out.length ? s.out.join(" · ") : <span className="font-normal text-dim">nothing yet</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-dim">
            <span>
              <span className="font-semibold text-cyan">way back</span> = return address
            </span>
            <span>
              <span className="font-semibold text-amber">amber</span> = arguments
            </span>
            <span>
              <span className="font-semibold text-violet">violet</span> = local variables
            </span>
          </div>
        </div>

        {/* the tower */}
        <div className="min-w-0">
          <div className="label-caps mb-1.5 flex justify-between text-[0.6875rem] text-dim">
            <span>RAM, addresses {T_TOP}–{T_BASE}</span>
            <span>the stack</span>
          </div>
          <div
            ref={towerRef}
            className="relative overflow-hidden rounded-md border border-line-2 bg-panel"
            style={{ height: rows.length * T_ROW }}
          >
            {/* address rows */}
            {rows.map((addr) => {
              const prog = addr <= T_LIMIT;
              return (
                <div
                  key={addr}
                  className={cx("absolute right-0 left-0 flex items-center border-b border-line", prog && "bg-panel-2")}
                  style={{ top: (addr - T_TOP) * T_ROW, height: T_ROW, ...(prog ? hatch : {}) }}
                >
                  <span className="w-8 shrink-0 pr-1.5 text-right font-mono text-[0.6875rem] text-dim tabular-nums">
                    {addr}
                  </span>
                </div>
              );
            })}
            <div
              className="absolute left-9 flex items-center font-sans text-[0.6875rem] text-dim"
              style={{ top: 0, height: (T_LIMIT - T_TOP + 1) * T_ROW }}
            >
              program & data (addresses 0–{T_LIMIT})
            </div>
            <div
              className="absolute right-0 left-0 border-t-2 border-dashed border-off"
              style={{ top: (T_LIMIT - T_TOP + 1) * T_ROW - 1 }}
            />

            {/* frames */}
            <AnimatePresence initial={false}>
              {placed.map(({ f, low }, k) => {
                const active = k === top;
                return (
                  <motion.div
                    key={`${k}-${f.name}`}
                    initial={reduced ? false : { opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: 14 }}
                    transition={{ duration: 0.3 }}
                    className={cx(
                      "absolute right-14 left-9 z-[2] flex overflow-hidden rounded-sm border",
                      f.bad
                        ? "halo-pink border-pink bg-pink-tint"
                        : active
                          ? "halo-violet border-violet bg-violet-tint"
                          : "border-line-2 bg-panel",
                    )}
                    style={{ top: (low - T_TOP) * T_ROW + 1, height: f.cells.length * T_ROW - 2 }}
                  >
                    <div className="min-w-0 flex-1">
                      {[...f.cells].reverse().map((c, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-1.5 px-1.5 text-xs"
                          style={{ height: T_ROW - (j === 0 ? 1 : 0) }}
                        >
                          <span className="truncate font-sans text-mute">
                            {c.kind === "ret" ? "↩ " : ""}
                            {c.label}
                          </span>
                          <span
                            className={cx(
                              "ml-auto font-mono font-bold tabular-nums",
                              f.bad ? "text-pink" : c.value === "?" ? "text-dim" : kindStyle[c.kind],
                            )}
                          >
                            {c.kind === "ret" ? c.value : `= ${c.value}`}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div
                      className={cx(
                        "flex w-[4.6rem] shrink-0 items-center justify-center border-l px-1 text-center font-mono text-[0.6875rem] leading-tight font-semibold",
                        f.bad ? "border-pink text-pink" : active ? "border-violet text-violet" : "border-line-2 text-mute",
                      )}
                    >
                      {f.bad ? `✗ ${f.name}` : f.name}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* SP marker */}
            {!s.overflow && (
              <div
                className="absolute right-1 z-[3] flex items-center font-sans text-xs font-bold text-violet transition-[top] duration-300"
                style={{ top: (sp - T_TOP) * T_ROW, height: T_ROW }}
              >
                ◂ SP
              </div>
            )}
            {s.overflow && (
              <div
                className="absolute right-1 z-[3] flex items-center font-sans text-xs font-bold text-pink"
                style={{ top: 0, height: T_ROW }}
              >
                ✗ crash
              </div>
            )}
          </div>
          <div className="mt-1.5 font-serif text-[0.875rem] leading-snug text-mute">
            The first frame sits at the bottom (address {T_BASE}); new frames pile on top, toward smaller addresses. In
            this toy one slot is one memory cell. On a 64-bit computer each slot is 8 bytes, and a real stack has room
            for about a million of them.
          </div>
        </div>

        {flight && (
          <motion.div
            key={flight.key}
            className="pointer-events-none absolute top-0 left-0 z-10 rounded-md border border-cyan bg-bg px-1.5 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-cyan halo-cyan"
            initial={{ x: flight.xs[0], y: flight.ys[0], opacity: 0 }}
            animate={{ x: flight.xs, y: flight.ys, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.85, ease: "easeInOut", opacity: { times: [0, 0.15, 0.8, 1], duration: 0.85 } }}
            style={{ translateX: "-50%", translateY: "-50%" }}
          >
            ↩ {flight.text}
          </motion.div>
        )}
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 4 · Interrupts: a call made by the hardware                           */
/* ------------------------------------------------------------------ */

type IOp = "ADD" | "OUT" | "JMP" | "PUSH" | "POP" | "LDA" | "RTI";
interface ILine {
  op?: IOp;
  n?: number;
  note: string;
}

function intProgram(saves: boolean): ILine[] {
  const handler: ILine[] = saves
    ? [
        { op: "PUSH", note: "handler: save A" },
        { op: "LDA", n: 6, note: "A = the key code" },
        { op: "OUT", note: "show it" },
        { op: "POP", note: "get main's A back" },
        { op: "RTI", note: "return from interrupt" },
      ]
    : [
        { op: "LDA", n: 6, note: "handler: A = the key code" },
        { op: "OUT", note: "show it" },
        { op: "RTI", note: "return from interrupt" },
        { note: "" },
        { note: "" },
      ];
  return [
    { op: "ADD", n: 5, note: "main: A = A + 1" },
    { op: "OUT", note: "show A" },
    { op: "JMP", n: 0, note: "and again, forever" },
    { note: "" },
    { note: "" },
    { note: "the number 1" },
    { note: "key: the keyboard writes here" },
    ...handler,
    { note: "" },
    { note: "" },
    { note: "" },
    { note: "" },
  ];
}

const regionOf = (addr: number) =>
  addr <= 2 ? "main program" : addr === 5 || addr === 6 ? "data" : addr >= 7 && addr <= 11 ? "handler" : null;

interface IState {
  pc: number;
  a: number;
  sp: number;
  ram: number[];
  tags: Record<number, string>;
  c: boolean;
  z: boolean;
  irq: boolean;
  inH: boolean;
  out: Array<{ v: number; key: boolean }>;
  note: string;
  steps: number;
  hw: boolean;
}

function intInit(): IState {
  const ram = Array(16).fill(0);
  ram[5] = 1;
  return {
    pc: 0,
    a: 0,
    sp: 15,
    ram,
    tags: {},
    c: false,
    z: false,
    irq: false,
    inH: false,
    out: [],
    note: "The main program counts: add 1, show it, jump back. Press Run (or Step), then press a key whenever you like.",
    steps: 0,
    hw: false,
  };
}

function intStep(s: IState, prog: ILine[]): IState {
  const n: IState = { ...s, ram: s.ram.slice(), tags: { ...s.tags }, out: [...s.out], steps: s.steps + 1, hw: false };
  if (s.irq && !s.inH) {
    n.ram[s.sp] = s.pc;
    n.tags[s.sp] = "return address";
    n.ram[s.sp - 1] = (s.c ? 2 : 0) + (s.z ? 1 : 0);
    n.tags[s.sp - 1] = "flags";
    n.sp = s.sp - 2;
    n.pc = 7;
    n.irq = false;
    n.inH = true;
    n.hw = true;
    n.note = `Interrupt! Between two instructions, the control unit sees IRQ = 1. With no instruction at all, the hardware ① pushes the PC (${s.pc}, where main was going next) to address ${s.sp}, ② pushes the flags to address ${s.sp - 1}, and ③ jumps to the handler at address 7. New interrupts are switched off for now.`;
    return n;
  }
  const l = prog[s.pc];
  const inH = s.pc >= 7 && s.pc <= 11;
  n.pc = (s.pc + 1) & 15;
  switch (l.op) {
    case "ADD": {
      const raw = s.a + s.ram[l.n ?? 0];
      n.a = raw & 255;
      n.c = raw > 255;
      n.z = n.a === 0;
      n.note = `ADD 5: A = ${s.a} + 1 = ${n.a}.`;
      break;
    }
    case "OUT":
      n.out.push({ v: s.a, key: inH });
      n.note = inH ? `OUT: show ${s.a}, the key code.` : `OUT: show ${s.a}.`;
      break;
    case "JMP":
      n.pc = l.n ?? 0;
      n.note = "JMP 0: back to the top of the loop.";
      break;
    case "PUSH":
      n.ram[s.sp] = s.a;
      n.tags[s.sp] = "saved A";
      n.sp = s.sp - 1;
      n.note = `PUSH: the handler is about to use A, so it first saves main's A (${s.a}) on the stack, at address ${s.sp}. SP: ${s.sp} → ${n.sp}.`;
      break;
    case "LDA":
      n.a = s.ram[l.n ?? 0];
      n.note = s.tags[s.sp + 1] === "saved A"
        ? `LDA 6: A = the key code (${n.a}). Main's ${s.ram[s.sp + 1]} is safe on the stack.`
        : `LDA 6: A = the key code (${n.a}). Main's count (${s.a}) is overwritten, and nobody saved it!`;
      break;
    case "POP":
      n.sp = s.sp + 1;
      n.a = s.ram[n.sp];
      n.note = `POP: SP: ${s.sp} → ${n.sp}, and A = ${n.a}, main's number, back again.`;
      break;
    case "RTI": {
      const fAddr = s.sp + 1;
      const pAddr = s.sp + 2;
      const f = s.ram[fAddr];
      n.c = !!(f & 2);
      n.z = !!(f & 1);
      n.pc = s.ram[pAddr];
      n.sp = pAddr;
      n.inH = false;
      n.note = `RTI (return from interrupt): pop the flags (address ${fAddr}), then pop the PC (address ${pAddr}): PC = ${n.pc}. Main carries on exactly where it stopped${
        prog[7].op === "PUSH" ? ". It never noticed it was interrupted." : `, but A still holds the key code (${s.a}), so main's count is now wrong.`
      }`;
      break;
    }
    default:
      n.note = "NOP: nothing here.";
  }
  return n;
}

const KEYS = [
  { k: "A", code: 65 },
  { k: "B", code: 66 },
  { k: "C", code: 67 },
];

export function InterruptDemo() {
  const [saves, setSaves] = useState(true);
  const prog = useMemo(() => intProgram(saves), [saves]);
  const [hist, setHist] = useState<IState[]>(() => [intInit()]);
  const s = hist[hist.length - 1];
  const [running, setRunning] = useState(false);

  const step = () => setHist((h) => [...h.slice(-300), intStep(h[h.length - 1], prog)]);
  useInterval(step, running ? 750 : null);
  const reset = (sv = saves) => {
    setSaves(sv);
    setHist([intInit()]);
    setRunning(false);
  };
  const press = (k: (typeof KEYS)[number]) => {
    setHist((h) => {
      const cur = h[h.length - 1];
      if (cur.irq || cur.inH) return h;
      const ram = cur.ram.slice();
      ram[6] = k.code;
      return [
        ...h.slice(0, -1),
        {
          ...cur,
          ram,
          irq: true,
          note: `You pressed ${k.k}. The keyboard puts its code (${k.code}) at address 6 and pulls the IRQ wire to 1. The CPU will notice as soon as it finishes the instruction it is on.`,
        },
      ];
    });
  };
  const busy = s.irq || s.inH;

  return (
    <Widget
      title="An interrupt: a call made by the hardware"
      subtitle="The main program counts forever. Press a key: the CPU finishes its instruction, saves where it was on the stack, runs the keyboard handler, then returns."
      wide
    >
      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="primary" onClick={step} disabled={running}>
          Step
        </Btn>
        <Btn onClick={() => setRunning((r) => !r)}>{running ? "⏸ Pause" : "▶ Run"}</Btn>
        <Btn onClick={() => reset()}>Reset</Btn>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="label-caps text-[0.6875rem] text-dim">The handler</span>
          <Segmented
            size="sm"
            value={saves ? "yes" : "no"}
            onChange={(v) => reset(v === "yes")}
            options={[
              { value: "yes", label: "saves A" },
              { value: "no", label: "forgets to save A" },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        {/* memory */}
        <div>
          <div className="label-caps mb-1.5 text-[0.6875rem] text-dim">RAM · 16 bytes</div>
          <div className="rounded-md border border-line-2 bg-panel px-1 py-1">
            <table className="w-full font-mono text-xs tabular-nums">
              <tbody>
                {prog.map((l, addr) => {
                  const isPc = s.pc === addr;
                  const onStack = addr > s.sp;
                  const region = regionOf(addr);
                  const firstOfRegion = region && regionOf(addr - 1) !== region;
                  const data = addr === 5 || addr === 6;
                  return (
                    <tr
                      key={addr}
                      className={cx(
                        "transition-colors",
                        onStack && "bg-violet-tint",
                        isPc && "bg-panel-3",
                        firstOfRegion && addr > 0 && "border-t border-line",
                        addr === 12 && "border-t border-line",
                      )}
                    >
                      <td className="w-5 py-[3px] pl-1 text-pink">{isPc ? "▶" : ""}</td>
                      <td className="w-6 py-[3px] pr-2 text-right text-dim">{addr}</td>
                      <td className="py-[3px] pr-2 whitespace-nowrap">
                        {onStack ? (
                          <span className="font-bold text-violet">
                            {s.tags[addr] === "flags"
                              ? `C=${(s.ram[addr] >> 1) & 1} Z=${s.ram[addr] & 1}`
                              : s.ram[addr]}
                          </span>
                        ) : data ? (
                          <span className="text-amber">{addr === 6 && s.ram[6] === 0 ? "–" : s.ram[addr]}</span>
                        ) : l.op ? (
                          <span className="font-semibold text-ink">{l.n !== undefined ? `${l.op} ${l.n}` : l.op}</span>
                        ) : (
                          <span className="text-dim">·</span>
                        )}
                      </td>
                      <td className="py-[3px] pr-1 font-sans text-[0.6875rem] text-dim">
                        {onStack ? (
                          <span className="text-violet">{s.tags[addr] ?? "on the stack"}</span>
                        ) : addr === s.sp ? (
                          <span className="font-semibold text-violet">◂ SP</span>
                        ) : (
                          l.note
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-1.5 text-[0.6875rem] text-dim">
            Addresses 12–15 are the stack. RTI is an imagined extra instruction: “return from interrupt”.
          </div>
        </div>

        {/* CPU + keyboard */}
        <div className="space-y-3">
          <Narration title={s.hw ? "The hardware, on its own" : "What just happened"}>{s.note}</Narration>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Reg label="PC">{s.pc}</Reg>
            <Reg label="Register A">{s.a}</Reg>
            <Reg label="SP" className="border-violet">
              <span className="text-violet">{s.sp}</span>
            </Reg>
            <Reg label="Flags">
              <span className={cx(s.c ? "text-amber" : "text-dim")}>C={s.c ? 1 : 0}</span>{" "}
              <span className={cx(s.z ? "text-amber" : "text-dim")}>Z={s.z ? 1 : 0}</span>
            </Reg>
          </div>
          <div className="flex flex-wrap items-center gap-4 rounded-md border border-line-2 bg-panel px-3 py-2">
            <div>
              <div className="label-caps text-[0.6875rem] text-dim">Keyboard</div>
              <div className="mt-1 flex gap-1.5">
                {KEYS.map((k) => (
                  <button
                    key={k.k}
                    type="button"
                    disabled={busy}
                    onClick={() => press(k)}
                    className="h-10 w-10 rounded-md border border-line-2 bg-panel-2 font-sans text-base font-bold text-ink shadow-[inset_0_-2px_0_var(--color-line-2)] transition-colors hover:border-off hover:bg-panel-3 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label={`Press key ${k.k}`}
                  >
                    {k.k}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="label-caps text-[0.6875rem] text-dim">IRQ wire</div>
              <div className="mt-1 flex items-center gap-2">
                <svg width="64" height="20" viewBox="0 0 64 20" aria-hidden>
                  <path
                    d="M2 10 H62"
                    fill="none"
                    stroke={s.irq ? "var(--color-on)" : "var(--color-off)"}
                    strokeWidth={s.irq ? 4 : 2}
                    strokeLinecap="round"
                    className={cx(s.irq && "glow-on")}
                  />
                </svg>
                <span className={cx("font-mono text-lg font-bold", s.irq ? "text-on" : "text-dim")}>{s.irq ? 1 : 0}</span>
              </div>
            </div>
            <div>
              <div className="label-caps text-[0.6875rem] text-dim">Interrupts</div>
              <div className="mt-1 font-sans text-sm font-semibold">
                {s.inH ? <span className="text-pink">off (handler running)</span> : <span className="text-ink">on</span>}
              </div>
            </div>
          </div>
          <div className="rounded-md border border-line-2 bg-panel px-3 py-2">
            <div className="label-caps text-[0.6875rem] text-dim">Output display</div>
            <div className="scroll-thin mt-1 flex min-h-[1.75rem] flex-wrap gap-1.5 font-mono text-sm tabular-nums">
              {s.out.length === 0 && <span className="text-dim">nothing yet</span>}
              {s.out.slice(-24).map((o, k) => (
                <span
                  key={k}
                  className={cx(
                    "rounded px-1.5 py-0.5",
                    o.key ? "bg-amber-tint font-bold text-amber" : "bg-panel-2 font-semibold text-on",
                  )}
                >
                  {o.v}
                  {o.key ? ` (${String.fromCharCode(o.v)})` : ""}
                </span>
              ))}
            </div>
            <div className="mt-1 text-[0.6875rem] text-dim">
              <span className="text-on">green</span> = printed by main · <span className="text-amber">amber</span> =
              printed by the keyboard handler
            </div>
          </div>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Static figure: one real stack frame                                  */
/* ------------------------------------------------------------------ */

export function FrameAnatomy() {
  const parts: Array<{ label: string; bytes: number; kind: CellKind | "saved"; sub: string }> = [
    { label: "local variables", bytes: 32, kind: "local", sub: "4 numbers × 8 bytes" },
    { label: "saved register", bytes: 8, kind: "saved", sub: "the caller's value, kept safe" },
    { label: "arguments", bytes: 16, kind: "arg", sub: "2 numbers × 8 bytes" },
    { label: "return address", bytes: 8, kind: "ret", sub: "the way back" },
  ];
  const tone: Record<string, string> = {
    local: "border-violet bg-violet-tint text-violet",
    saved: "border-line-2 bg-panel-2 text-ink",
    arg: "border-amber bg-amber-tint text-amber",
    ret: "border-cyan bg-cyan-tint text-cyan",
  };
  return (
    <div className="mx-auto flex max-w-[30rem] items-stretch gap-3 font-sans">
      <div className="flex-1">
        <div className="mb-1 text-[0.6875rem] text-dim">◂ SP (smaller addresses, newer)</div>
        {parts.map((p) => {
          return (
            <div
              key={p.label}
              className={cx("-mt-px flex items-center justify-between border px-3", tone[p.kind])}
              style={{ height: Math.max(30, p.bytes * 1.6) }}
            >
              <div>
                <div className="text-sm font-semibold">{p.label}</div>
                <div className="text-[0.6875rem] text-mute">{p.sub}</div>
              </div>
              <div className="text-right font-mono text-sm font-bold tabular-nums">{p.bytes} B</div>
            </div>
          );
        })}
        <div className="mt-1 text-[0.6875rem] text-dim">▾ the caller's frame (bigger addresses, older)</div>
      </div>
      <div className="flex w-16 flex-col items-center justify-center">
        <div className="w-3 flex-1 rounded-r border-y border-r border-ink" />
        <div className="py-1 text-center font-mono text-sm font-bold text-ink">64 B</div>
        <div className="w-3 flex-1 rounded-r border-y border-r border-ink" />
      </div>
    </div>
  );
}
