import { useState } from "react";

import { Gate, InputPin, Junction, OutputPin, Wire } from "~/components/circuit";
import { TeX } from "~/components/tex";
import { BitButton, Btn, cx, Pill, Stat, Widget } from "~/components/ui";
import { binStr } from "~/lib/bits";
import { useInterval } from "~/lib/hooks";

/* ------------------------------------------------------------------ */
/* SR latch from two NOR gates                                          */
/* ------------------------------------------------------------------ */

export function SrLatch() {
  const [s, setS] = useState(false);
  const [r, setR] = useState(false);
  const [q, setQ] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  // Settle the feedback loop for the new inputs.
  const settle = (ns: boolean, nr: boolean, prevQ: boolean) => {
    if (ns && !nr) return true;
    if (nr && !ns) return false;
    return prevQ; // both 0: hold. both 1 handled separately.
  };
  const invalid = s && r;
  const qOut = invalid ? false : q;
  const qbOut = invalid ? false : !q;

  const update = (ns: boolean, nr: boolean) => {
    const nq = settle(ns, nr, q);
    setS(ns);
    setR(nr);
    if (!(ns && nr)) setQ(nq);
    const what =
      ns && nr
        ? "S=1, R=1 → both outputs forced to 0 (not allowed!)"
        : ns
          ? "S=1 → Q set to 1"
          : nr
            ? "R=1 → Q reset to 0"
            : `S=0, R=0 → Q holds ${nq ? 1 : 0} (remembered!)`;
    setLog((l) => [what, ...l].slice(0, 4));
  };

  return (
    <Widget
      title="The SR latch: two NOR gates holding hands"
      subtitle="Each gate's output feeds the other gate's input. Flip S on and off again, and notice that Q stays 1. That's memory."
    >
      <div className="grid items-center gap-4 md:grid-cols-[1.4fr_1fr]">
        <svg viewBox="0 0 420 220" className="w-full" role="img" aria-label="SR latch made of two NOR gates">
          <InputPin x={30} y={50} on={r} label="R (reset)" onToggle={() => update(s, !r)} />
          <InputPin x={30} y={170} on={s} label="S (set)" onToggle={() => update(!s, r)} />
          <Wire d="M45 50 H180" on={r} />
          <Wire d="M45 170 H180" on={s} />
          <Gate kind="NOR" x={180} y={40} out={qOut} />
          <Gate kind="NOR" x={180} y={140} out={qbOut} />
          <Wire d="M244 60 H364" on={qOut} />
          <Wire d="M244 160 H364" on={qbOut} />
          {/* feedback paths */}
          <Wire d="M290 60 V105 H150 V150 H180" on={qOut} />
          <Wire d="M310 160 V115 H130 V70 H180" on={qbOut} />
          <Junction x={290} y={60} on={qOut} />
          <Junction x={310} y={160} on={qbOut} />
          <OutputPin x={380} y={60} on={qOut} label="Q" />
          <OutputPin x={380} y={160} on={qbOut} label="not Q" />
        </svg>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <Btn onClick={() => update(!s, r)} active={s}>
              S = {s ? 1 : 0}
            </Btn>
            <Btn onClick={() => update(s, !r)} active={r}>
              R = {r ? 1 : 0}
            </Btn>
            <span className="font-mono text-mute">→</span>
            <BitButton on={qOut} label="Q (stored bit)" />
          </div>
          {invalid && (
            <p className="rounded-lg border border-pink/40 bg-pink/10 p-2 text-pink">
              S and R are both 1. Both outputs become 0 and “Q” and “not Q” disagree with their names. Designers never
              allow this input.
            </p>
          )}
          <ul className="space-y-1 font-mono text-xs">
            {log.length === 0 && <li className="text-dim">Try: S on → S off → R on → R off</li>}
            {log.map((l, i) => (
              <li key={i} className={i === 0 ? "text-ink" : "text-dim"}>
                {l}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* D flip-flop with a scrolling waveform                                 */
/* ------------------------------------------------------------------ */

const SAMPLES = 64;
const HALF = 6; // samples per half clock period

export function DFlipFlop() {
  const [running, setRunning] = useState(true);
  const [d, setD] = useState(true);
  const [hist, setHist] = useState(() =>
    Array.from({ length: SAMPLES }, (_, i) => ({ clk: Math.floor(i / HALF) % 2 === 1, d: true, q: i >= HALF })),
  );
  const [phase, setPhase] = useState(SAMPLES);

  useInterval(
    () => {
      setHist((h) => {
        const prev = h[h.length - 1];
        const clk = Math.floor(phase / HALF) % 2 === 1;
        const rising = clk && !prev.clk;
        const q = rising ? d : prev.q;
        return [...h.slice(1), { clk, d, q }];
      });
      setPhase((p) => p + 1);
    },
    running ? 110 : null,
  );

  const W = 600;
  const rowH = 44;
  const x = (i: number) => 60 + (i / (SAMPLES - 1)) * (W - 70);
  const wave = (key: "clk" | "d" | "q", row: number) => {
    const top = 14 + row * rowH;
    const hi = top + 4;
    const lo = top + 26;
    let path = "";
    hist.forEach((s, i) => {
      const y = s[key] ? hi : lo;
      if (i === 0) path = `M${x(0)} ${y}`;
      else {
        const py = hist[i - 1][key] ? hi : lo;
        if (py !== y) path += ` L${x(i)} ${py} L${x(i)} ${y}`;
        else path += ` L${x(i)} ${y}`;
      }
    });
    return path;
  };
  const cur = hist[hist.length - 1];
  const edges = hist.map((s, i) => (i > 0 && s.clk && !hist[i - 1].clk ? i : -1)).filter((i) => i >= 0);

  return (
    <Widget
      title="The D flip-flop: “remember D when the clock ticks”"
      subtitle="Q copies D only at the instant the clock rises from 0 to 1 (the dashed lines). Change D in between and Q ignores it until the next tick."
    >
      <svg viewBox={`0 0 ${W} 150`} className="w-full" role="img" aria-label="Clock, D and Q waveforms">
        {edges.map((i) => (
          <line
            key={i}
            x1={x(i)}
            x2={x(i)}
            y1={8}
            y2={142}
            stroke="var(--color-amber)"
            strokeOpacity={0.4}
            strokeDasharray="3 4"
          />
        ))}
        {(
          [
            ["clk", "CLOCK", "var(--color-amber)"],
            ["d", "D (data)", "var(--color-cyan)"],
            ["q", "Q (stored)", "var(--color-on)"],
          ] as const
        ).map(([k, label, color], row) => (
          <g key={k}>
            <text x={0} y={34 + row * rowH} className="fill-mute font-mono text-[11px]">
              {label}
            </text>
            <path d={wave(k, row)} fill="none" stroke={color} strokeWidth={2.2} />
          </g>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Btn variant="primary" onClick={() => setD((v) => !v)}>
          Flip D (now {d ? 1 : 0})
        </Btn>
        <Btn onClick={() => setRunning((r) => !r)}>{running ? "⏸ Pause clock" : "▶ Run clock"}</Btn>
        <div className="ml-auto flex items-center gap-2 font-mono text-sm">
          <Pill tone="amber">CLK {cur.clk ? 1 : 0}</Pill>
          <Pill tone="cyan">D {cur.d ? 1 : 0}</Pill>
          <Pill tone="on">Q {cur.q ? 1 : 0}</Pill>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* A tiny RAM with an address decoder                                    */
/* ------------------------------------------------------------------ */

const initialRam = Array.from(
  { length: 16 },
  (_, i) => [72, 101, 108, 108, 111, 33, 0, 0, 7, 42, 0, 255, 0, 128, 3, 1][i],
);

export function RamGrid() {
  const [ram, setRam] = useState(initialRam);
  const [addr, setAddr] = useState(4);
  const [data, setData] = useState(0b01010111);
  const [readOut, setReadOut] = useState<number | null>(null);
  const [flash, setFlash] = useState<"read" | "write" | null>(null);

  const addrBits = [3, 2, 1, 0].map((i) => (addr >> i) & 1);
  const term = addrBits.map((b, k) => (b ? `A_${3 - k}` : `\\overline{A_${3 - k}}`)).join("\\cdot ");

  const doWrite = () => {
    setRam((r) => r.map((v, i) => (i === addr ? data : v)));
    setFlash("write");
    setReadOut(null);
    setTimeout(() => setFlash(null), 500);
  };
  const doRead = () => {
    setReadOut(ram[addr]);
    setFlash("read");
    setTimeout(() => setFlash(null), 500);
  };

  return (
    <Widget
      title="16 bytes of RAM"
      subtitle="Each row is a register of 8 flip-flops. The 4 address bits go into a decoder, which turns on exactly one row's “word line”."
      wide
    >
      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-xs font-semibold tracking-wider text-mute uppercase">Address (4 bits)</div>
            <div className="flex items-center gap-1.5">
              {[3, 2, 1, 0].map((i) => (
                <BitButton
                  key={i}
                  on={!!((addr >> i) & 1)}
                  color="violet"
                  label={`A${i}`}
                  onClick={() => {
                    setAddr((a) => a ^ (1 << i));
                    setReadOut(null);
                  }}
                />
              ))}
              <span className="ml-2 font-mono text-lg text-violet">= {addr}</span>
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold tracking-wider text-mute uppercase">Data in (8 bits)</div>
            <div className="flex flex-wrap items-center gap-1">
              {[7, 6, 5, 4, 3, 2, 1, 0].map((i) => (
                <BitButton
                  key={i}
                  size="sm"
                  on={!!((data >> i) & 1)}
                  color="cyan"
                  onClick={() => setData((d) => d ^ (1 << i))}
                />
              ))}
              <span className="ml-2 font-mono text-cyan">= {data}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn variant="primary" onClick={doWrite}>
              Write → row {addr}
            </Btn>
            <Btn onClick={doRead}>Read row {addr}</Btn>
          </div>
          <div className="rounded-xl border border-line bg-bg/60 p-3 text-sm">
            <div className="text-xs text-mute">Decoder: row {addr} turns on when</div>
            <div className="mt-1">
              <TeX>{`\\text{row}_{${addr}} = ${term}`}</TeX>
            </div>
            <div className="mt-1 text-xs text-dim">
              One 4-input AND gate per row, with NOTs on the address bits that must be 0.
            </div>
          </div>
          <div className="rounded-xl border border-line bg-bg/60 p-3 font-mono text-sm">
            <span className="text-mute">Data out: </span>
            {readOut === null ? (
              <span className="text-dim">press Read</span>
            ) : (
              <span className="text-on">
                {binStr(readOut, 8, 4)} = {readOut}
                {readOut >= 32 && readOut < 127 && (
                  <span className="text-mute"> = “{String.fromCharCode(readOut)}”</span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="scroll-thin overflow-x-auto">
          <table className="w-full font-mono text-xs tabular-nums sm:text-sm">
            <thead>
              <tr className="text-[0.6875rem] text-dim">
                <th className="px-1 text-left font-normal">addr</th>
                <th className="px-1 text-left font-normal">word line</th>
                <th className="px-1 text-left font-normal">8 flip-flops</th>
                <th className="px-1 text-right font-normal">value</th>
                <th className="px-1 text-left font-normal">as text</th>
              </tr>
            </thead>
            <tbody>
              {ram.map((v, i) => {
                const sel = i === addr;
                return (
                  <tr
                    key={i}
                    className={cx(
                      "transition-colors",
                      sel && "bg-violet/10",
                      sel && flash === "write" && "bg-cyan-tint",
                      sel && flash === "read" && "bg-on-tint",
                    )}
                  >
                    <td className={cx("px-1 py-[2px]", sel ? "text-violet" : "text-dim")}>
                      {binStr(i, 4)} <span className="text-mute">{String(i).padStart(2, " ")}</span>
                    </td>
                    <td className="px-1 py-[2px]">
                      <span
                        className={cx(
                          "inline-block h-2 w-14 rounded-full align-middle transition",
                          sel ? "bg-violet halo-violet" : "bg-line-2",
                        )}
                      />
                    </td>
                    <td className="px-1 py-[2px]">
                      <span className="inline-flex gap-[2px]">
                        {[7, 6, 5, 4, 3, 2, 1, 0].map((b) => {
                          const on = (v >> b) & 1;
                          return (
                            <span
                              key={b}
                              className={cx(
                                "flex h-[18px] w-[16px] items-center justify-center rounded-[3px] text-[0.6875rem] font-bold",
                                on ? (sel ? "bg-on-tint text-on" : "bg-on-tint text-on") : "bg-panel-2 text-dim",
                                b === 3 && "ml-1",
                              )}
                            >
                              {on}
                            </span>
                          );
                        })}
                      </span>
                    </td>
                    <td className="px-1 py-[2px] text-right text-ink">{v}</td>
                    <td className="px-1 py-[2px] text-mute">{v >= 32 && v < 127 ? String.fromCharCode(v) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Master–slave: two latches that take turns                            */
/* ------------------------------------------------------------------ */

function LatchCard({
  name,
  rule,
  open,
  value,
}: {
  name: string;
  rule: string;
  open: boolean;
  value: boolean;
}) {
  return (
    <div
      className={cx(
        "min-w-0 flex-1 rounded-md border p-3 transition-colors",
        open ? "border-amber bg-amber-tint halo-amber" : "border-line-2 bg-panel-2",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-sans text-sm font-semibold text-ink">{name}</div>
        <div className="font-sans text-xs text-mute">{rule}</div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <BitButton on={value} size="md" />
        <div className={cx("font-sans text-sm font-semibold", open ? "text-amber" : "text-mute")}>
          {open ? "open: copying its input" : "closed: holding its bit"}
        </div>
      </div>
    </div>
  );
}

function FlowArrow({ on }: { on: boolean }) {
  return (
    <div className={cx("flex items-center justify-center font-mono text-xl", on ? "text-ink" : "text-dim")} aria-hidden>
      <span className="sm:hidden">↓</span>
      <span className="hidden sm:inline">→</span>
    </div>
  );
}

export function MasterSlave() {
  const [d, setD] = useState(true);
  const [clk, setClk] = useState(false);
  const [master, setMaster] = useState(true);
  const [q, setQ] = useState(false);
  const [note, setNote] = useState(
    "The clock is 0, so the master is open and already copies D = 1. The slave is closed, so Q still shows its old 0.",
  );

  const flipD = () => {
    const nd = !d;
    setD(nd);
    if (!clk) {
      setMaster(nd);
      setNote(`D is now ${nd ? 1 : 0}. The master is open, so it follows. The slave is closed, so Q stays ${q ? 1 : 0}.`);
    } else {
      setNote(`D is now ${nd ? 1 : 0}, but the master is closed, so nothing moves. Q stays ${q ? 1 : 0}.`);
    }
  };
  const flipClk = () => {
    const nc = !clk;
    setClk(nc);
    if (nc) {
      setQ(master);
      setNote(
        `Rising edge (0 → 1)! The master closes and keeps ${master ? 1 : 0}. The slave opens and copies it: Q = ${master ? 1 : 0}.`,
      );
    } else {
      setMaster(d);
      setNote(`Falling edge (1 → 0). The slave closes and holds Q = ${q ? 1 : 0}. The master opens and follows D again.`);
    }
  };

  return (
    <Widget
      title="Master and slave: two latches taking turns"
      subtitle="The master listens while the clock is 0. The slave listens while the clock is 1. They are never open at the same time."
    >
      <div className="flex flex-wrap items-end gap-4">
        <BitButton on={d} onClick={flipD} color="cyan" label="D (flip it)" size="lg" />
        <Btn onClick={flipClk} variant="primary">
          {clk ? "Lower the clock (1 → 0)" : "Raise the clock (0 → 1)"}
        </Btn>
        <Pill tone="amber">CLK = {clk ? 1 : 0}</Pill>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="flex items-center justify-center rounded-md border border-cyan bg-cyan-tint px-3 py-2 font-mono text-sm text-cyan">
          D = {d ? 1 : 0}
        </div>
        <FlowArrow on={!clk} />
        <LatchCard name="Master" rule="open when CLK = 0" open={!clk} value={master} />
        <FlowArrow on={clk} />
        <LatchCard name="Slave" rule="open when CLK = 1" open={clk} value={q} />
        <FlowArrow on={clk} />
        <div
          className={cx(
            "flex items-center justify-center rounded-md border px-3 py-2 font-mono text-sm",
            q ? "border-on bg-on-tint font-bold text-on" : "border-line-2 bg-panel text-dim",
          )}
        >
          Q = {q ? 1 : 0}
        </div>
      </div>
      <p className="mt-4 font-serif text-[0.9375rem] leading-normal text-body" aria-live="polite">
        {note}
      </p>
      <p className="mt-1 font-serif text-[0.9375rem] leading-normal text-mute">
        Try this: raise the clock, then flip D a few times. Q does not move until the next rising edge.
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* ROM: a lookup table of squares, frozen in transistors                */
/* ------------------------------------------------------------------ */

const ROM_ROWS = 8;
const ROM_BITS = 6;
const romWord = (n: number) => n * n; // what the chip makers decided to store

export function RomSquares() {
  const [addr, setAddr] = useState(5);
  const word = romWord(addr);
  const rowY = (r: number) => 44 + r * 32;
  const colX = (c: number) => 114 + c * 38; // c = 0 is the top bit (b5)
  const bitOf = (v: number, c: number) => (v >> (ROM_BITS - 1 - c)) & 1;
  const bottom = rowY(ROM_ROWS - 1) + 22;

  return (
    <Widget
      title="A ROM that knows its squares"
      subtitle="3 address bits pick one of 8 rows. A dot is a transistor, which makes its column read 1. The dots were placed when the chip was made: they store n × n for every n from 0 to 7."
    >
      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,380px)_1fr]">
        <svg viewBox="0 0 364 348" className="mx-auto w-full max-w-[400px]" role="img" aria-label="ROM grid: a decoder picks one row; dots on that row switch their columns on">
          <rect x={8} y={26} width={76} height={bottom - 18} rx={6} fill="var(--color-panel-2)" stroke="var(--color-line-2)" />
          <text x={46} y={18} textAnchor="middle" className="fill-mute font-sans text-[13px] font-semibold">
            decoder
          </text>
          {Array.from({ length: ROM_BITS }, (_, c) => (
            <text key={c} x={colX(c)} y={18} textAnchor="middle" className="fill-mute font-mono text-[13px]">
              b{ROM_BITS - 1 - c}
            </text>
          ))}
          {/* column (bit) lines */}
          {Array.from({ length: ROM_BITS }, (_, c) => (
            <Wire key={c} d={`M${colX(c)} 28 V${bottom + 16}`} on={!!bitOf(word, c)} />
          ))}
          {/* row (word) lines, dots and labels */}
          {Array.from({ length: ROM_ROWS }, (_, r) => {
            const sel = r === addr;
            const y = rowY(r);
            return (
              <g key={r}>
                <Wire d={`M84 ${y} H${colX(ROM_BITS - 1) + 14}`} on={sel} />
                <text
                  x={46}
                  y={y + 5}
                  textAnchor="middle"
                  className={sel ? "fill-violet font-mono text-[13px] font-bold" : "fill-dim font-mono text-[13px]"}
                >
                  {binStr(r, 3)}
                </text>
                {Array.from({ length: ROM_BITS }, (_, c) =>
                  bitOf(romWord(r), c) ? (
                    <circle
                      key={c}
                      cx={colX(c)}
                      cy={y}
                      r={5.5}
                      fill={sel ? "var(--color-on)" : "var(--color-mute)"}
                      stroke="var(--color-panel)"
                      strokeWidth={1.5}
                      className={sel ? "glow-on" : undefined}
                    />
                  ) : null,
                )}
                <text
                  x={colX(ROM_BITS - 1) + 22}
                  y={y + 5}
                  className={sel ? "fill-on font-mono text-[13px] font-bold" : "fill-dim font-mono text-[13px]"}
                >
                  {romWord(r)}
                </text>
              </g>
            );
          })}
          {/* outputs */}
          {Array.from({ length: ROM_BITS }, (_, c) => {
            const on = !!bitOf(word, c);
            return (
              <g key={c}>
                <rect
                  x={colX(c) - 13}
                  y={bottom + 16}
                  width={26}
                  height={26}
                  rx={4}
                  fill={on ? "var(--color-on-tint)" : "var(--color-panel)"}
                  stroke={on ? "var(--color-on)" : "var(--color-off)"}
                  strokeWidth={1.75}
                />
                <text
                  x={colX(c)}
                  y={bottom + 34}
                  textAnchor="middle"
                  className={on ? "fill-on font-mono text-[14px] font-bold" : "fill-dim font-mono text-[14px]"}
                >
                  {on ? 1 : 0}
                </text>
              </g>
            );
          })}
          <text x={46} y={bottom + 34} textAnchor="middle" className="fill-mute font-sans text-[13px] font-semibold">
            output
          </text>
        </svg>

        <div className="min-w-0 space-y-4">
          <div>
            <div className="label-caps text-dim">Address (3 bits)</div>
            <div className="mt-2 flex items-start gap-1.5">
              {[2, 1, 0].map((i) => (
                <BitButton
                  key={i}
                  on={!!((addr >> i) & 1)}
                  color="violet"
                  label={`A${i}`}
                  onClick={() => setAddr((a) => a ^ (1 << i))}
                />
              ))}
              <span className="ml-2 pt-1 font-mono text-lg text-violet tabular-nums">= {addr}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Row switched on" value={`row ${addr}`} tone="violet" />
            <Stat label="Output" value={`${binStr(word, 6)} = ${word}`} sub={`${addr} × ${addr} = ${word}`} tone="on" />
          </div>
          <p className="font-serif text-[0.9375rem] leading-normal text-mute">
            The decoder switches on row {addr}. Wherever that row has a dot, the column wire turns on; the other columns
            stay 0. Nothing is calculated: the answer was built into the wiring. (Many real chips use the opposite rule,
            a transistor means 0. Either works, as long as the designers agree.)
          </p>
        </div>
      </div>
    </Widget>
  );
}
