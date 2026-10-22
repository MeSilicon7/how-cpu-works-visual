import { useMemo, useState } from "react";

import { Gate, Wire } from "~/components/circuit";
import { TeX } from "~/components/tex";
import { BitButton, Btn, cx, Figure, Pill, Segmented, Slider, Stat, Widget } from "~/components/ui";
import { binStr, fmt } from "~/lib/bits";
import { useAnimationTime, useInterval, useReducedMotion } from "~/lib/hooks";

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
        <text x={4} y={14} className="fill-dim font-mono text-[11px]">
          1
        </text>
        <text x={4} y={86} className="fill-dim font-mono text-[11px]">
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
                          ? "var(--color-pink-tint)"
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
            className="fill-dim font-mono text-[11px]"
          >
            {k * STAGE_PS}
          </text>
        ))}
        <text x={W - 10} y={BITS * 22 + 40} textAnchor="end" className="fill-dim font-mono text-[11px]">
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
          className="fill-amber font-mono text-[11px] font-bold"
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

/* ------------------------------------------------------------------ */
/* A ring of NOT gates: the simplest oscillator                          */
/* ------------------------------------------------------------------ */

const RING_HIST = 44;

/** Start with every gate agreeing with its input, except gate 1 (when n is odd). */
function ringStart(n: number): boolean[] {
  return Array.from({ length: n }, (_, i) => i % 2 === 1);
}

/** One gate delay later: every gate shows NOT of what its input was. */
function ringStep(v: boolean[]): boolean[] {
  return v.map((_, i) => !v[(i - 1 + v.length) % v.length]);
}

function ringHistory(n: number) {
  let v = ringStart(n);
  const hist = [v[0]];
  for (let k = 1; k < RING_HIST; k++) {
    v = ringStep(v);
    hist.push(v[0]);
  }
  return { v, hist };
}

export function RingOscillator() {
  const reduced = useReducedMotion();
  const [n, setN] = useState(3);
  const [delay, setDelay] = useState(10);
  const [paused, setPaused] = useState(false);
  const [sim, setSim] = useState(() => ringHistory(3));

  const step = () =>
    setSim((s) => {
      const v = ringStep(s.v);
      return { v, hist: [...s.hist.slice(1), v[0]] };
    });
  useInterval(step, paused || reduced ? null : 420);

  const choose = (k: number) => {
    setN(k);
    setSim(ringHistory(k));
  };

  const v = sim.v;
  const odd = n % 2 === 1;
  const unstable = v.findIndex((out, i) => out === v[(i - 1 + n) % n]);
  const period = 2 * n * delay;

  // Geometry of the ring.
  const C = 140;
  const R = 92;
  const S = 0.75; // gate scale: body 42 × 30, input at −21, output at +21 along the ring
  const half = 28 * S;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pos = (i: number) => [C + R * Math.cos(ang(i)), C + R * Math.sin(ang(i))] as const;
  const tan = (i: number) => [-Math.sin(ang(i)), Math.cos(ang(i))] as const;
  const end = (i: number, side: 1 | -1) => {
    const [x, y] = pos(i);
    const [tx, ty] = tan(i);
    return [x + side * half * tx, y + side * half * ty] as const;
  };
  const arcR = Math.hypot(R, half);

  const W = 520;
  const hx = (k: number) => 10 + (k * (W - 20)) / (RING_HIST - 1);
  const wave = sim.hist
    .map((b, k) => {
      const y = b ? 12 : 56;
      if (k === 0) return `M${hx(0)} ${y}`;
      const py = sim.hist[k - 1] ? 12 : 56;
      return py === y ? `L${hx(k)} ${y}` : `L${hx(k)} ${py} L${hx(k)} ${y}`;
    })
    .join(" ");

  return (
    <Widget
      title="A ring of NOT gates"
      subtitle="Each NOT feeds the next, and the last feeds the first. With an odd number of gates they can never all agree, so a flip runs around the ring forever."
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Segmented
          value={n}
          onChange={choose}
          options={[2, 3, 5, 7].map((k) => ({ value: k, label: `${k} NOTs` }))}
        />
        <Slider
          className="w-full max-w-64"
          label="Delay of one gate"
          min={5}
          max={30}
          value={delay}
          onChange={setDelay}
          format={(d) => `${d} ps`}
        />
        <div className="flex gap-2">
          {!reduced && (
            <Btn onClick={() => setPaused((p) => !p)} active={paused}>
              {paused ? "▶ Run" : "⏸ Pause"}
            </Btn>
          )}
          <Btn onClick={step}>Step one gate delay</Btn>
        </div>
      </div>

      <div className="mt-4 grid items-center gap-5 md:grid-cols-[minmax(0,300px)_1fr]">
        <svg viewBox="0 0 280 280" className="mx-auto w-full max-w-[300px]" role="img" aria-label={`${n} NOT gates connected in a ring`}>
          {Array.from({ length: n }, (_, i) => {
            const [x1, y1] = end(i, 1);
            const [x2, y2] = end((i + 1) % n, -1);
            return <Wire key={`w${i}`} d={`M${x1.toFixed(1)} ${y1.toFixed(1)} A${arcR.toFixed(1)} ${arcR.toFixed(1)} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`} on={v[i]} />;
          })}
          {Array.from({ length: n }, (_, i) => {
            const [x, y] = pos(i);
            const deg = (ang(i) * 180) / Math.PI + 90;
            const [lx, ly] = [C + (R + 34) * Math.cos(ang(i)), C + (R + 34) * Math.sin(ang(i))];
            return (
              <g key={`g${i}`}>
                {odd && i === unstable && (
                  <circle cx={x} cy={y} r={27} fill="none" stroke="var(--color-amber)" strokeWidth={2} strokeDasharray="4 3" className="glow-amber" />
                )}
                <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(1)})`}>
                  <Gate kind="NOT" x={-half} y={-20 * S} out={v[i]} label={false} scale={S} />
                </g>
                <text x={lx} y={ly + 5} textAnchor="middle" className="fill-mute font-mono text-[13px] font-semibold">
                  {i + 1}
                </text>
              </g>
            );
          })}
          <text x={C} y={C - 4} textAnchor="middle" className="fill-ink font-sans text-[15px] font-semibold">
            {n} NOTs
          </text>
          <text x={C} y={C + 16} textAnchor="middle" className={odd ? "fill-amber font-sans text-[13px]" : "fill-mute font-sans text-[13px]"}>
            {odd ? "never at rest" : "stuck: at rest"}
          </text>
        </svg>

        <div className="min-w-0 space-y-3">
          {odd ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="One trip" value={`${n * delay} ps`} sub={`${n} × ${delay} ps`} />
                <Stat label="Period" value={`${period} ps`} sub="two trips" tone="amber" />
                <Stat label="Frequency" value={`${(1000 / period).toFixed(1)} GHz`} sub={`1 ÷ ${period} ps`} tone="amber" />
              </div>
              <p className="font-serif text-[0.9375rem] leading-normal text-mute">
                The dashed circle marks the gate that is about to flip: its output still equals its input. One trip
                around the ring flips every gate once, so the output of gate 1 needs two trips to go 0 → 1 → 0.
              </p>
            </>
          ) : (
            <p className="rounded-md border border-line-2 bg-panel-2 px-3 py-2 font-serif text-[0.9375rem] leading-normal text-body">
              With 2 NOTs, every gate already shows the opposite of its input, so nothing ever changes. This is the loop
              that <em>remembers</em> a bit, from the Memory chapter. Only an odd number of NOTs makes a clock.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="label-caps text-dim">Output of gate 1 over time</div>
        <svg viewBox={`0 0 ${W} 68`} className="mt-1 w-full" role="img" aria-label="Square wave from gate 1">
          {sim.hist.map((_, k) => (
            <line key={k} x1={hx(k)} x2={hx(k)} y1={6} y2={62} stroke="var(--color-line)" />
          ))}
          <path d={wave} fill="none" stroke="var(--color-amber)" strokeWidth={2.2} />
        </svg>
        <p className="mt-1 font-sans text-xs text-mute">
          Each thin line is one gate delay ({delay} ps). {odd ? `One full wave is 2 × ${n} × ${delay} = ${period} ps.` : "The line stays flat."}
        </p>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* The H-tree that carries the clock everywhere at once                  */
/* ------------------------------------------------------------------ */

export function ClockTree() {
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number; level: number }> = [];
  const leaves: Array<[number, number]> = [];
  const MAX = 5;
  const grow = (x: number, y: number, len: number, horizontal: boolean, level: number) => {
    const dx = horizontal ? len / 2 : 0;
    const dy = horizontal ? 0 : len / 2;
    segs.push({ x1: x - dx, y1: y - dy, x2: x + dx, y2: y + dy, level });
    if (level === MAX) {
      leaves.push([x - dx, y - dy], [x + dx, y + dy]);
      return;
    }
    grow(x - dx, y - dy, len / Math.SQRT2, !horizontal, level + 1);
    grow(x + dx, y + dy, len / Math.SQRT2, !horizontal, level + 1);
  };
  grow(150, 110, 150, true, 0);

  return (
    <Figure
      caption={
        <>
          An H-tree. The clock enters at the centre (the large dot) and splits 6 times to reach 2⁶ = 64 flip-flops (the
          small dots). Every path from the centre to a small dot has exactly the same length, so the tick arrives
          everywhere at the same moment. A real chip puts a buffer (two NOT gates in a row) at each split to give the
          signal fresh strength.
        </>
      }
    >
      <svg viewBox="0 0 300 220" className="mx-auto w-full max-w-[420px]" role="img" aria-label="H-shaped clock tree">
        {segs.map((s, i) => (
          <line
            key={i}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke="var(--color-amber)"
            strokeWidth={4.5 - s.level * 0.6}
            strokeLinecap="round"
          />
        ))}
        {leaves.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="var(--color-ink)" />
        ))}
        <circle cx={150} cy={110} r={7} fill="var(--color-amber)" stroke="var(--color-panel)" strokeWidth={2} />
      </svg>
    </Figure>
  );
}
