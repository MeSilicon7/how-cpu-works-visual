import { useMemo, useState } from "react";
import { Link } from "react-router";

import { Btn, cx, Pill, Segmented, Widget } from "~/components/ui";
import { assemble, compileExpr, type Expr } from "~/lib/asm";
import { binStr } from "~/lib/bits";
import { disassemble, opByCode, programs, ramToHex } from "~/lib/cpu";
import { useInterval } from "~/lib/hooks";

/* ------------------------------------------------------------------ */
/* One program, four levels                                              */
/* ------------------------------------------------------------------ */

type Grp = "load" | "add" | "print" | "end";

const asmLines: Array<{ text: string; byte: number; addr: number; g: Grp }> = [
  { text: "LDA 14", byte: 0x1e, addr: 0, g: "load" },
  { text: "ADD 15", byte: 0x2f, addr: 1, g: "add" },
  { text: "OUT", byte: 0xe0, addr: 2, g: "print" },
  { text: "HLT", byte: 0xf0, addr: 3, g: "end" },
  { text: "14: 2", byte: 0x02, addr: 14, g: "load" },
  { text: "15: 3", byte: 0x03, addr: 15, g: "add" },
];

export function LayersView() {
  const [g, setG] = useState<Grp>("add");
  const sel = asmLines.find((l) => l.g === g)!;
  const hl = (x: Grp) =>
    cx("rounded px-0.5 transition cursor-pointer", x === g ? "bg-amber-tint text-amber" : "hover:bg-panel-3");

  const W = 320;
  const wave = (() => {
    let d = "";
    for (let i = 0; i < 8; i++) {
      const bit = (sel.byte >> (7 - i)) & 1;
      const y = bit ? 14 : 54;
      const x0 = 10 + i * 37;
      d += `${i === 0 ? "M" : "L"}${x0} ${y} L${x0 + 37} ${y} `;
    }
    return d;
  })();

  return (
    <Widget
      title="The same program at four levels"
      subtitle="Click any part. The matching pieces light up on every level."
      wide
    >
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-line bg-bg/60 p-3">
          <div className="mb-2 text-[0.7rem] font-semibold tracking-wider text-violet uppercase">1 · Your code</div>
          <div className="font-mono text-lg">
            <span className={hl("print")} onClick={() => setG("print")}>
              print(
            </span>
            <span className={hl("load")} onClick={() => setG("load")}>
              2
            </span>
            <span className={hl("add")} onClick={() => setG("add")}>
              {" "}
              + 3
            </span>
            <span className={hl("print")} onClick={() => setG("print")}>
              )
            </span>
            <span className={hl("end")} onClick={() => setG("end")}>
              ⏎
            </span>
          </div>
          <div className="mt-2 text-xs text-dim">written by a human</div>
        </div>
        <div className="rounded-xl border border-line bg-bg/60 p-3">
          <div className="mb-2 text-[0.7rem] font-semibold tracking-wider text-cyan uppercase">2 · Assembly</div>
          <div className="space-y-0.5 font-mono text-sm">
            {asmLines.map((l) => (
              <div key={l.addr} className={hl(l.g)} onClick={() => setG(l.g)}>
                {l.text}
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-dim">made by a compiler</div>
        </div>
        <div className="rounded-xl border border-line bg-bg/60 p-3">
          <div className="mb-2 text-[0.7rem] font-semibold tracking-wider text-on uppercase">3 · Machine code</div>
          <div className="space-y-0.5 font-mono text-sm">
            {asmLines.map((l) => (
              <div key={l.addr} className={hl(l.g)} onClick={() => setG(l.g)}>
                <span className="text-dim">{String(l.addr).padStart(2, "0")}:</span> {binStr(l.byte, 8, 4)}
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-dim">made by an assembler, stored in RAM</div>
        </div>
        <div className="rounded-xl border border-line bg-bg/60 p-3">
          <div className="mb-2 text-[0.7rem] font-semibold tracking-wider text-amber uppercase">4 · Voltages</div>
          <svg viewBox={`0 0 ${W} 70`} className="w-full">
            <path d={wave} fill="none" stroke="var(--color-amber)" strokeWidth={3} className="glow-amber" />
            {Array.from({ length: 8 }, (_, i) => (
              <text key={i} x={28 + i * 37} y={68} textAnchor="middle" className="fill-mute font-mono text-[11px]">
                {(sel.byte >> (7 - i)) & 1}
              </text>
            ))}
          </svg>
          <div className="mt-1 text-xs text-dim">The 8 bus wires, drawn side by side: ~1 V for 1, 0 V for 0. Showing “{sel.text}”.</div>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* A tiny compiler                                                      */
/* ------------------------------------------------------------------ */

function layoutTree(e: Expr) {
  const nodes: Array<{ x: number; y: number; label: string; leaf: boolean }> = [];
  const edges: Array<[number, number, number, number]> = [];
  let leafX = 0;
  let maxDepth = 0;
  const walk = (n: Expr, depth: number): { x: number; y: number } => {
    maxDepth = Math.max(maxDepth, depth);
    if (n.kind === "num") {
      const p = { x: leafX++, y: depth };
      nodes.push({ ...p, label: String(n.value), leaf: true });
      return p;
    }
    const l = walk(n.left, depth + 1);
    const r = walk(n.right, depth + 1);
    const p = { x: (l.x + r.x) / 2, y: depth };
    nodes.push({ ...p, label: n.op === "-" ? "−" : "+", leaf: false });
    edges.push([p.x, p.y, l.x, l.y], [p.x, p.y, r.x, r.y]);
    return p;
  };
  walk(e, 0);
  return { nodes, edges, leaves: leafX, depth: maxDepth };
}

export function TinyCompiler() {
  const [src, setSrc] = useState("7 + 5 - 2");
  const res = useMemo(() => compileExpr(src), [src]);
  const asm = useMemo(() => (res.error ? null : assemble(res.asm.join("\n"))), [res]);
  const tree = res.tree ? layoutTree(res.tree) : null;
  const dx = 54;
  const dy = 50;

  return (
    <Widget
      title="A real (tiny) compiler"
      subtitle="Type an arithmetic expression. Watch it go through the same stages a real compiler uses, all the way to bytes for our CPU."
      wide
    >
      <input
        value={src}
        onChange={(e) => setSrc(e.target.value)}
        className="w-full rounded-xl border border-line-2 bg-bg px-4 py-3 font-mono text-xl text-ink focus:border-on focus:outline-none"
        aria-label="Expression to compile"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {["2 + 3", "7 + 5 - 2", "100 + 100 + 55", "200 + 100", "10 - 20", "1 + 2 + 3 + 4 + 5 + 6 + 7"].map((e) => (
          <Btn key={e} className="text-xs" active={src === e} onClick={() => setSrc(e)}>
            {e}
          </Btn>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-bg/60 p-3">
          <div className="mb-2 text-[0.7rem] font-semibold tracking-wider text-violet uppercase">
            Step 1 · Tokens (lexing)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {res.tokens.map((t, i) => (
              <span
                key={i}
                className={cx(
                  "rounded-md border px-2 py-0.5 font-mono text-sm",
                  t.type === "num" ? "border-cyan/50 text-cyan" : "border-amber/50 text-amber",
                )}
              >
                {t.value}
                <span className="ml-1 text-[0.6875rem] text-dim">{t.type === "num" ? "number" : "op"}</span>
              </span>
            ))}
          </div>
          <div className="mt-3 mb-2 text-[0.7rem] font-semibold tracking-wider text-violet uppercase">
            Step 2 · Tree (parsing)
          </div>
          {tree ? (
            <svg
              viewBox={`-30 -20 ${Math.max(1, tree.leaves - 1) * dx + 60} ${tree.depth * dy + 40}`}
              className="max-h-56 w-full"
            >
              {tree.edges.map(([x1, y1, x2, y2], i) => (
                <line
                  key={i}
                  x1={x1 * dx}
                  y1={y1 * dy}
                  x2={x2 * dx}
                  y2={y2 * dy}
                  stroke="var(--color-line-2)"
                  strokeWidth={2}
                />
              ))}
              {tree.nodes.map((n, i) => (
                <g key={i}>
                  <circle
                    cx={n.x * dx}
                    cy={n.y * dy}
                    r={16}
                    fill="var(--color-panel-2)"
                    stroke={n.leaf ? "var(--color-cyan)" : "var(--color-amber)"}
                    strokeWidth={2}
                  />
                  <text
                    x={n.x * dx}
                    y={n.y * dy + 4}
                    textAnchor="middle"
                    className="font-mono text-[11px] font-bold"
                    fill={n.leaf ? "var(--color-cyan)" : "var(--color-amber)"}
                  >
                    {n.label}
                  </text>
                </g>
              ))}
            </svg>
          ) : (
            <div className="text-sm text-dim">—</div>
          )}
        </div>
        <div className="rounded-xl border border-line bg-bg/60 p-3">
          <div className="mb-2 text-[0.7rem] font-semibold tracking-wider text-cyan uppercase">
            Step 3 · Assembly (code generation)
          </div>
          {res.error ? (
            <p className="text-sm text-pink">{res.error}</p>
          ) : (
            <pre className="scroll-thin overflow-x-auto font-mono text-sm leading-relaxed text-ink">
              {res.asm.map((l, i) => {
                const [code, comment] = l.split(";");
                return (
                  <div key={i}>
                    {code}
                    {comment && <span className="text-dim">;{comment}</span>}
                  </div>
                );
              })}
            </pre>
          )}
        </div>
        <div className="rounded-xl border border-line bg-bg/60 p-3">
          <div className="mb-2 text-[0.7rem] font-semibold tracking-wider text-on uppercase">
            Step 4 · Machine code (assembling)
          </div>
          {asm && (
            <>
              <div className="space-y-0.5 font-mono text-xs sm:text-sm">
                {asm.ram.map((b, addr) => {
                  const isInstr = asm.lines.find((l) => l.addr === addr)?.kind === "instr";
                  return (
                    <div key={addr} className={cx(!asm.used.has(addr) && "opacity-30")}>
                      <span className="text-dim">{String(addr).padStart(2, "0")}: </span>
                      {isInstr ? (
                        <>
                          <span className="text-amber">{binStr(b >> 4, 4)}</span>{" "}
                          <span className="text-cyan">{binStr(b & 15, 4)}</span>
                        </>
                      ) : (
                        <span className="text-on">{binStr(b, 8, 4)}</span>
                      )}
                      <span className="ml-2 text-dim">{isInstr ? disassemble(b) : asm.used.has(addr) ? b : ""}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  to={`/cpu?ram=${ramToHex(asm.ram)}`}
                  className="rounded-lg bg-on px-3 py-1.5 text-sm font-semibold text-bg halo-on hover:bg-on-2"
                >
                  Run it on the CPU →
                </Link>
                {res.value !== undefined && (
                  <Pill tone={res.value < 0 || res.value > 255 ? "pink" : "on"}>
                    expected: {res.value}
                    {(res.value < 0 || res.value > 255) && ` → shows ${((res.value % 256) + 256) % 256} (8-bit wrap)`}
                  </Pill>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* A free-form assembler                                                 */
/* ------------------------------------------------------------------ */

const starter = `; Count down from 5 to 0
LDA 15     ; A = 5
OUT        ; show it
SUB 14     ; A = A - 1
JZ 6       ; reached 0? jump to the end
JMP 1      ; otherwise loop back to OUT
HLT        ; (address 5) never reached
OUT        ; address 6: show the final 0
HLT
14: 1      ; constant 1
15: 5      ; starting value`;

export function AssemblerEditor() {
  const [text, setText] = useState(starter);
  const res = useMemo(() => assemble(text), [text]);
  return (
    <Widget
      title="Write your own program"
      subtitle="One instruction per line. Put data anywhere with “address: value”. Use ; for comments. The bytes update as you type."
      wide
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            rows={14}
            className="scroll-thin w-full resize-y rounded-xl border border-line-2 bg-bg p-3 font-mono text-sm leading-relaxed text-ink focus:border-on focus:outline-none"
            aria-label="Assembly source"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {programs.map((p) => (
              <Btn
                key={p.id}
                className="text-xs"
                onClick={() =>
                  setText(
                    p.ram
                      .map((b, addr) => {
                        const c = p.comments?.[addr];
                        if (p.data.includes(addr)) return `${addr}: ${b}${c ? `      ; ${c}` : ""}`;
                        if (!b && !c) return null;
                        return `${addr}: ${disassemble(b)}${c ? `      ; ${c}` : ""}`;
                      })
                      .filter(Boolean)
                      .join("\n"),
                  )
                }
              >
                Load “{p.name}”
              </Btn>
            ))}
          </div>
        </div>
        <div>
          <div className="scroll-thin max-h-[360px] overflow-y-auto rounded-xl border border-line bg-bg/60 p-3 font-mono text-xs">
            {res.lines
              .filter((l) => l.kind !== "empty" || l.error)
              .map((l) => (
                <div key={l.lineNo} className="flex gap-2 py-[1px]">
                  <span className="w-7 text-right text-dim">L{l.lineNo}</span>
                  {l.error ? (
                    <span className="text-pink">⚠ {l.error}</span>
                  ) : (
                    <>
                      <span className="w-6 text-right text-mute">{l.addr}</span>
                      {l.kind === "instr" && l.byte !== null ? (
                        <span>
                          <span className="text-amber">{binStr(l.byte >> 4, 4)}</span>{" "}
                          <span className="text-cyan">{binStr(l.byte & 15, 4)}</span>
                        </span>
                      ) : (
                        <span className="text-on">{binStr(l.byte ?? 0, 8, 4)}</span>
                      )}
                      <span className="truncate text-dim">
                        {l.kind === "instr" ? opByCode.get((l.byte ?? 0) >> 4)?.short : "data"}
                      </span>
                    </>
                  )}
                </div>
              ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {res.errors ? (
              <Pill tone="pink">
                {res.errors} error{res.errors > 1 ? "s" : ""}
              </Pill>
            ) : (
              <>
                <Pill tone="on">{res.used.size} / 16 bytes used</Pill>
                <Link
                  to={`/cpu?ram=${ramToHex(res.ram)}`}
                  className="rounded-lg bg-on px-3 py-1.5 text-sm font-semibold text-bg halo-on hover:bg-on-2"
                >
                  Run it on the CPU →
                </Link>
              </>
            )}
          </div>
          <div className="mt-2 font-mono text-[0.7rem] break-all text-dim">RAM image: {ramToHex(res.ram)}</div>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Walk the string: a pointer, a loop and base + i × size               */
/* ------------------------------------------------------------------ */

const WALK_TEXT = "hi Sam";
/** Character codes of "hi Sam", then the 0 that marks the end. */
const WALK_ITEMS = [...[...WALK_TEXT].map((c) => c.charCodeAt(0)), 0];
const WALK_BASE = 1000;
type ItemSize = 1 | 2 | 4;

interface Walk {
  i: number;
  /** The line that runs next: 0, 1, 2, or 3 = stopped. */
  line: number;
  x: number | null;
  shown: string;
}
const walkStart: Walk = { i: 0, line: 0, x: null, shown: "" };

const showChar = (v: number) => (v === 32 ? "space" : `'${String.fromCharCode(v)}'`);

export function WalkTheString() {
  const [size, setSize] = useState<ItemSize>(1);
  const [w, setW] = useState<Walk>(walkStart);
  const [running, setRunning] = useState(false);
  const p = WALK_BASE + w.i * size;
  const done = w.line === 3;

  const step = () =>
    setW((s) => {
      if (s.line === 0) return { ...s, x: WALK_ITEMS[s.i], line: 1 };
      if (s.line === 1) return { ...s, line: s.x === 0 ? 3 : 2 };
      if (s.line === 2) return { ...s, shown: s.shown + String.fromCharCode(s.x ?? 32), i: s.i + 1, line: 0 };
      return s;
    });
  const reset = () => {
    setW(walkStart);
    setRunning(false);
  };

  useInterval(
    () => {
      if (done) setRunning(false);
      else step();
    },
    running ? 650 : null,
  );

  const codeLines = [
    <>
      x = memory[{WALK_BASE} + i × {size}]
    </>,
    <>if x == 0: stop</>,
    <>show x; i = i + 1; go to line 1</>,
  ];
  const lineNotes = ["read one item", "0 marks the end", "next item"];

  return (
    <Widget
      title="Walk the string"
      subtitle="The text “hi Sam” is stored at address 1000, one item per letter, with a 0 at the end. A 3-line loop walks along it. Step through it, then change how many bytes each item takes."
      wide
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="label-caps text-dim">Bytes per item</span>
        <Segmented<ItemSize>
          size="sm"
          value={size}
          onChange={(v) => {
            setSize(v);
            reset();
          }}
          options={[
            { value: 1, label: "1 byte" },
            { value: 2, label: "2 bytes" },
            { value: 4, label: "4 bytes" },
          ]}
        />
        <span className="font-serif text-[0.9375rem] text-mute">
          {size === 1 && "Like ASCII and UTF-8 text."}
          {size === 2 && "Like text inside Windows, Java and JavaScript (UTF-16)."}
          {size === 4 && "Like UTF-32 text, or a list of 32-bit whole numbers."}
        </span>
      </div>

      {/* memory */}
      <div className="mt-4 rounded-md border border-line bg-panel-2 px-3 pt-2 pb-3">
        <div className="label-caps text-dim">Memory</div>
        <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-2">
          {WALK_ITEMS.map((v, k) => {
            const bytes = Array.from({ length: size }, (_, j) => (v >> (8 * j)) & 255);
            const cur = k === w.i && !done;
            const stopHere = k === w.i && done;
            const read = k < w.i;
            return (
              <div key={k} className="flex flex-col items-center">
                <div className="h-5 font-mono text-xs leading-5 font-bold">
                  {(cur || stopHere) && <span className={stopHere ? "text-violet" : "text-cyan"}>▼ p</span>}
                </div>
                <div
                  className={cx(
                    "flex gap-0.5 rounded-md border p-0.5 transition-colors duration-200",
                    cur && "border-cyan bg-cyan-tint halo-cyan",
                    stopHere && "border-violet bg-violet-tint halo-violet",
                    !cur && !stopHere && (read ? "border-line bg-panel-3" : "border-line-2 bg-panel"),
                  )}
                >
                  {bytes.map((b, j) => (
                    <div key={j} className="flex w-8 flex-col items-center py-0.5 sm:w-10">
                      <span className="font-mono text-[0.6875rem] text-dim tabular-nums">{WALK_BASE + k * size + j}</span>
                      <span
                        className={cx(
                          "font-mono text-sm tabular-nums",
                          j === 0 ? "font-semibold text-ink" : "text-dim",
                        )}
                      >
                        {b}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-0.5 text-center font-mono text-xs leading-tight">
                  <div className={v === 0 ? "font-semibold text-violet" : "text-ink"}>
                    {v === 0 ? "end" : showChar(v)}
                  </div>
                  <div className="text-dim">i = {k}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* the loop */}
        <div className="rounded-md border border-line bg-panel px-3 py-2.5">
          <div className="label-caps text-dim">The loop</div>
          <div className="mt-1.5 space-y-1 font-mono text-sm">
            {codeLines.map((c, n) => (
              <div
                key={n}
                className={cx(
                  "flex items-baseline gap-2 rounded px-1.5 py-1",
                  w.line === n ? "bg-amber-tint text-ink" : "text-mute",
                )}
              >
                <span className={cx("w-3 shrink-0", w.line === n ? "text-amber" : "text-transparent")} aria-hidden>
                  ▶
                </span>
                <span className="w-3 shrink-0 text-dim">{n + 1}</span>
                <span className="min-w-0 flex-1">{c}</span>
                <span className="hidden shrink-0 font-sans text-xs text-dim sm:inline">{lineNotes[n]}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 font-serif text-[0.9375rem] text-mute">
            {done ? (
              <>
                <strong className="text-violet">■ Stopped.</strong> x = 0, the end marker, so the loop is over.
              </>
            ) : w.line === 0 ? (
              <>Next: read the item that p points at.</>
            ) : w.line === 1 ? (
              <>
                Just read x = {w.x} ({showChar(w.x ?? 0)}). Is it 0?
              </>
            ) : (
              <>Not 0, so show it and move to the next item.</>
            )}
          </div>
        </div>

        {/* the address math and the output */}
        <div className="space-y-3">
          <div className="rounded-md border border-line bg-panel px-3 py-2.5 font-mono text-sm leading-relaxed text-ink tabular-nums">
            <div className="label-caps mb-1 font-sans text-dim">Where is item i?</div>
            <div>
              p = base + i × size
            </div>
            <div className="pl-[2ch]">
              = {WALK_BASE} + {w.i} × {size}
            </div>
            <div className="pl-[2ch]">
              = <span className="font-bold text-cyan">{p}</span>
            </div>
            {w.x !== null && w.line !== 0 && (
              <div className="mt-1 text-mute">
                x = {w.x}
                {size > 1 && <span className="font-sans text-xs text-dim"> (all {size} bytes together)</span>}
              </div>
            )}
          </div>
          <div className="surface-screen rounded-md px-3 py-2.5">
            <div className="label-caps text-dim">Screen</div>
            <div className="mt-1 min-h-7 font-mono text-xl text-screen-ink">
              {w.shown}
              {!done && <span className="animate-pulse text-dim motion-reduce:animate-none">▏</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn variant="primary" onClick={step} disabled={done || running}>
          Step one line
        </Btn>
        <Btn onClick={() => setRunning((r) => !r)} disabled={done} active={running}>
          {running ? "Pause" : "Run"}
        </Btn>
        <Btn onClick={reset}>Reset</Btn>
      </div>
      {size > 1 && (
        <p className="mt-3 max-w-[70ch] font-serif text-[0.9375rem] text-mute">
          With {size} bytes per item, the letter 'h' (104) is stored as {[104, 0, 0, 0].slice(0, size).join(", ")}:
          most CPUs put the low byte first. The loop reads all {size} bytes of an item as one number, so those extra 0s
          are not mistaken for the end. A program that read this text 1 byte at a time would stop right after 'h'.
          That's a real bug, and it happens when the reading code and the stored data disagree about the item size.
        </p>
      )}
    </Widget>
  );
}
