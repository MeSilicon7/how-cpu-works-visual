import { useState } from "react";

import { Gate, InputPin, Junction, OutputPin, Wire } from "~/components/circuit";
import { TeX } from "~/components/tex";
import { BitButton, Btn, cx, Pill, Widget } from "~/components/ui";
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
              <tr className="text-[0.65rem] text-dim">
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
                      sel && flash === "write" && "bg-cyan/25",
                      sel && flash === "read" && "bg-on/25",
                    )}
                  >
                    <td className={cx("px-1 py-[2px]", sel ? "text-violet" : "text-dim")}>
                      {binStr(i, 4)} <span className="text-mute">{String(i).padStart(2, " ")}</span>
                    </td>
                    <td className="px-1 py-[2px]">
                      <span
                        className={cx(
                          "inline-block h-2 w-14 rounded-full align-middle transition",
                          sel ? "bg-violet shadow-[0_0_8px_var(--color-violet)]" : "bg-line-2",
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
                                "flex h-[18px] w-[16px] items-center justify-center rounded-[3px] text-[0.65rem] font-bold",
                                on ? (sel ? "bg-on/30 text-on" : "bg-on/15 text-on/80") : "bg-panel-2 text-dim",
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
