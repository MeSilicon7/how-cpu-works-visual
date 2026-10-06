import { useMemo, useState } from "react";

import { TeX } from "~/components/tex";
import { BitButton, Btn, cx, Pill, Slider, Stat, Widget } from "~/components/ui";
import { binStr, fmt } from "~/lib/bits";
import { useAnimationTime } from "~/lib/hooks";

/* ------------------------------------------------------------------ */
/* A slowed-down clock driving a counter                                 */
/* ------------------------------------------------------------------ */

export function ClockCounter() {
  const [hz, setHz] = useState(1);
  const [running, setRunning] = useState(true);
  const t = useAnimationTime(running);
  // Integrate phase so changing the frequency doesn't jump the wave.
  const [base, setBase] = useState({ t0: 0, cycles0: 0 });
  const cycles = base.cycles0 + (t - base.t0) * hz;
  const setFreq = (f: number) => {
    setBase({ t0: t, cycles0: cycles });
    setHz(f);
  };
  const ticks = Math.floor(cycles);
  const high = cycles - ticks < 0.5;
  const count = ticks & 15;

  const W = 600;
  const H = 90;
  const window = 4; // cycles visible
  const pts: string[] = [];
  const start = cycles - window;
  for (let k = Math.floor(start * 2) / 2; k <= cycles + 0.001; k += 0.5) {
    const c0 = Math.max(start, k);
    const c1 = Math.min(cycles, k + 0.5);
    if (c1 <= c0) continue;
    const isHigh = Math.round((k - Math.floor(k)) * 2) === 0;
    const y = isHigh ? 18 : 72;
    const x0 = ((c0 - start) / window) * W;
    const x1 = ((c1 - start) / window) * W;
    pts.push(`${pts.length ? "L" : "M"}${x0.toFixed(1)} ${y} L${x1.toFixed(1)} ${y}`);
  }

  return (
    <Widget
      title="Tick, tick, tick: a clock driving a counter"
      subtitle="Every time the clock rises (0 → 1), the 4-bit register stores “old value + 1”. This clock is slowed down about a billion times."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Clock square wave">
        <line x1={0} x2={W} y1={18} y2={18} stroke="var(--color-line)" strokeDasharray="3 5" />
        <line x1={0} x2={W} y1={72} y2={72} stroke="var(--color-line)" strokeDasharray="3 5" />
        <path d={pts.join(" ")} fill="none" stroke="var(--color-amber)" strokeWidth={3} className="glow-amber" />
        <circle cx={W} cy={high ? 18 : 72} r={6} fill="var(--color-amber)" />
        <text x={4} y={14} className="fill-dim font-mono text-[10px]">
          1
        </text>
        <text x={4} y={86} className="fill-dim font-mono text-[10px]">
          0
        </text>
      </svg>
      <div className="mt-3 grid items-center gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <Slider
            label="Clock speed"
            min={0.25}
            max={6}
            step={0.25}
            value={hz}
            onChange={setFreq}
            format={(v) => `${v} Hz`}
          />
          <div className="flex gap-2">
            <Btn onClick={() => setRunning((r) => !r)}>{running ? "⏸ Pause" : "▶ Run"}</Btn>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-bg/60 p-3">
          <div className="flex gap-1">
            {[3, 2, 1, 0].map((i) => (
              <BitButton key={i} on={!!((count >> i) & 1)} size="md" />
            ))}
          </div>
          <div className="font-mono text-2xl text-ink">= {count}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label="Frequency f" value={`${hz} Hz`} sub="ticks per second" tone="amber" />
        <Stat label="Period T = 1 / f" value={`${(1 / hz).toFixed(2)} s`} sub="time per tick" />
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Real clock speeds, in numbers                                         */
/* ------------------------------------------------------------------ */

export function GhzCalculator() {
  const [ghz, setGhz] = useState(3);
  const T = 1 / (ghz * 1e9);
  const ps = T * 1e12;
  const light = 3e8 * T * 100; // cm
  const blink = 0.1 * ghz * 1e9; // ticks in a 0.1 s blink
  return (
    <Widget title="What does a GHz feel like?" subtitle="Drag to pick a real CPU clock speed.">
      <Slider
        label="Clock speed"
        min={0.5}
        max={6}
        step={0.1}
        value={ghz}
        onChange={setGhz}
        format={(v) => `${v.toFixed(1)} GHz`}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Ticks per second" value={fmt(ghz * 1e9)} tone="amber" />
        <Stat label="One tick lasts" value={`${ps.toFixed(0)} ps`} sub={`= ${(T * 1e9).toFixed(3)} ns`} />
        <Stat label="Light travels" value={`${light.toFixed(1)} cm`} sub="in one tick (in vacuum)" tone="cyan" />
      </div>
      <div className="mt-3 text-sm text-mute">
        In the time it takes you to blink (about 0.1 s), this CPU ticks{" "}
        <span className="font-mono text-ink">{fmt(blink)}</span> times.
      </div>
      <div className="mt-3 rounded-xl border border-line bg-bg/60 p-3 text-sm">
        <TeX>{`T = \\frac{1}{f} = \\frac{1}{${ghz.toFixed(1)} \\times 10^9\\ \\text{Hz}} = ${(T * 1e9).toFixed(3)}\\ \\text{ns} \\qquad d = c \\cdot T = 3\\times10^8\\ \\tfrac{\\text{m}}{\\text{s}} \\times ${(T * 1e9).toFixed(3)}\\times10^{-9}\\ \\text{s} = ${light.toFixed(1)}\\ \\text{cm}`}</TeX>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Why a clock can't be too fast: an adder still rippling                */
/* ------------------------------------------------------------------ */

const BITS = 8;
const STAGE_PS = 20;

function simulateRipple(a: number, b: number) {
  // values[k] = output word after k stage delays (all outputs start at 0)
  const steps: Array<{ sum: number; cout: number }> = [{ sum: 0, cout: 0 }];
  let carryIn = new Array(BITS + 1).fill(0);
  for (let k = 1; k <= BITS + 1; k++) {
    const nextCarry = new Array(BITS + 1).fill(0);
    let sum = 0;
    for (let i = 0; i < BITS; i++) {
      const ai = (a >> i) & 1;
      const bi = (b >> i) & 1;
      const ci = carryIn[i];
      sum |= (ai ^ bi ^ ci) << i;
      nextCarry[i + 1] = (ai & bi) | (ci & (ai ^ bi));
    }
    steps.push({ sum, cout: nextCarry[BITS] });
    carryIn = nextCarry;
  }
  return steps;
}

const presets = [
  { a: 127, b: 1, label: "127 + 1 (carry ripples all the way)" },
  { a: 85, b: 42, label: "85 + 42 (no carries)" },
  { a: 200, b: 55, label: "200 + 55" },
];

export function SettleDemo() {
  const [preset, setPreset] = useState(0);
  const [ghz, setGhz] = useState(7);
  const { a, b } = presets[preset];
  const steps = useMemo(() => simulateRipple(a, b), [a, b]);
  const final = steps[steps.length - 1];
  const settleStep = steps.findIndex((s) => s.sum === final.sum && s.cout === final.cout);
  const settlePs = settleStep * STAGE_PS;
  const periodPs = 1000 / ghz;
  const captured = steps[Math.min(steps.length - 1, Math.floor(periodPs / STAGE_PS))];
  const ok = periodPs >= settlePs;
  const maxPs = 260;
  const W = 600;
  const x = (ps: number) => 70 + (Math.min(ps, maxPs) / maxPs) * (W - 80);

  return (
    <Widget
      title="Overclocking gone wrong"
      subtitle={`An 8-bit ripple-carry adder where each stage takes ${STAGE_PS} ps. The register grabs the adder's output at the next clock tick, ready or not.`}
      wide
    >
      <div className="flex flex-wrap gap-2">
        {presets.map((p, i) => (
          <Btn key={p.label} active={i === preset} onClick={() => setPreset(i)} className="text-xs">
            {p.label}
          </Btn>
        ))}
      </div>
      <div className="mt-4">
        <Slider
          label="Clock speed"
          min={4}
          max={12}
          step={0.1}
          value={ghz}
          onChange={setGhz}
          format={(v) => `${v.toFixed(1)} GHz → tick every ${(1000 / v).toFixed(0)} ps`}
        />
      </div>
      <svg viewBox={`0 0 ${W} ${BITS * 22 + 50}`} className="mt-4 w-full" role="img" aria-label="Output bits over time">
        {Array.from({ length: BITS }, (_, row) => {
          const bit = BITS - 1 - row;
          const y = 18 + row * 22;
          return (
            <g key={bit}>
              <text x={0} y={y + 4} className="fill-mute font-mono text-[11px]">
                S{bit}
              </text>
              {steps.map((s, k) => {
                const v = (s.sum >> bit) & 1;
                const x0 = x(k * STAGE_PS);
                const x1 = k === steps.length - 1 ? x(maxPs) : x((k + 1) * STAGE_PS);
                const wrong = v !== ((final.sum >> bit) & 1);
                return (
                  <rect
                    key={k}
                    x={x0}
                    y={y - 8}
                    width={Math.max(0, x1 - x0 - 1)}
                    height={16}
                    rx={2}
                    fill={
                      v
                        ? wrong
                          ? "var(--color-pink)"
                          : "var(--color-on)"
                        : wrong
                          ? "rgb(255 92 138 / 0.25)"
                          : "var(--color-panel-3)"
                    }
                    opacity={v ? 0.85 : 1}
                  />
                );
              })}
            </g>
          );
        })}
        {Array.from({ length: 14 }, (_, k) => (
          <text
            key={k}
            x={x(k * STAGE_PS)}
            y={BITS * 22 + 24}
            textAnchor="middle"
            className="fill-dim font-mono text-[9px]"
          >
            {k * STAGE_PS}
          </text>
        ))}
        <text x={W - 10} y={BITS * 22 + 40} textAnchor="end" className="fill-dim font-mono text-[10px]">
          time after inputs change (ps)
        </text>
        {/* settle line */}
        <line
          x1={x(settlePs)}
          x2={x(settlePs)}
          y1={4}
          y2={BITS * 22 + 12}
          stroke="var(--color-on)"
          strokeDasharray="4 3"
        />
        {/* clock edge */}
        <line
          x1={x(periodPs)}
          x2={x(periodPs)}
          y1={0}
          y2={BITS * 22 + 14}
          stroke="var(--color-amber)"
          strokeWidth={3}
          className="glow-amber"
        />
        <text
          x={x(periodPs) + (x(periodPs) > W - 90 ? -6 : 6)}
          y={10}
          textAnchor={x(periodPs) > W - 90 ? "end" : "start"}
          className="fill-amber font-mono text-[10px] font-bold"
        >
          clock tick
        </text>
      </svg>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Correct answer"
          value={`${binStr(final.sum, 8)} = ${final.sum}`}
          sub={`ready after ${settlePs} ps`}
          tone="on"
        />
        <Stat
          label="Register captured"
          value={`${binStr(captured.sum, 8)} = ${captured.sum}`}
          sub={`at ${periodPs.toFixed(0)} ps`}
          tone={ok ? "on" : "pink"}
        />
        <div
          className={cx(
            "flex items-center justify-center rounded-xl border p-3 text-center",
            ok ? "border-on/50 bg-on/10" : "border-pink/50 bg-pink/10",
          )}
        >
          <span className={cx("text-sm font-semibold", ok ? "text-on" : "text-pink")}>
            {ok ? "✓ Correct. The adder settled in time." : "✗ Wrong! The carry was still rippling."}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm text-mute">
        Pink cells are bits that are still wrong at that moment. The fastest safe clock for this adder is{" "}
        <Pill tone="amber">
          1 / {settlePs} ps = {(1000 / settlePs).toFixed(2)} GHz
        </Pill>{" "}
        for this input. A real chip must be safe for the <em>worst</em> input: {(BITS + 1) * STAGE_PS} ps here.
      </p>
    </Widget>
  );
}
