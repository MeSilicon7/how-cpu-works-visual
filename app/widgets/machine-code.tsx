import { useMemo, useState } from "react";
import { Link } from "react-router";

import { Btn, cx, Pill, Widget } from "~/components/ui";
import { assemble, compileExpr, type Expr } from "~/lib/asm";
import { binStr } from "~/lib/bits";
import { disassemble, opByCode, programs, ramToHex } from "~/lib/cpu";

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
          <div className="mt-1 text-xs text-dim">8 wires: ~1 V for 1, 0 V for 0. Showing “{sel.text}”.</div>
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
