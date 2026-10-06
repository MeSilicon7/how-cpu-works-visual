import { useMemo, useState } from "react";

import { CircuitDefs, Lamp, Wire } from "~/components/circuit";
import { TeX } from "~/components/tex";
import { Btn, cx, Pill, Segmented, Slider, Stat, Widget } from "~/components/ui";
import { rng } from "~/lib/bits";
import { useAnimationTime } from "~/lib/hooks";

/* ------------------------------------------------------------------ */
/* Why two levels? A noisy wire carrying symbols.                      */
/* ------------------------------------------------------------------ */

const SYMBOLS = 20;
const SAMPLES = 10;

export function NoiseDemo() {
  const [levels, setLevels] = useState<2 | 10>(2);
  const [noise, setNoise] = useState(0.12);

  const { symbols, samples, decoded } = useMemo(() => {
    const r = rng(levels === 2 ? 7 : 11);
    const symbols = Array.from({ length: SYMBOLS }, () => Math.floor(r() * levels));
    const nr = rng(42);
    // Sum of 3 uniforms ≈ bell-shaped noise
    const n = () => (nr() + nr() + nr() - 1.5) / 1.5;
    const samples: number[][] = symbols.map((s) => {
      const v = s / (levels - 1);
      return Array.from({ length: SAMPLES }, () => v + n() * noise);
    });
    const decoded = samples.map((row) => {
      const mid = row[Math.floor(SAMPLES / 2)];
      return Math.max(0, Math.min(levels - 1, Math.round(mid * (levels - 1))));
    });
    return { symbols, samples, decoded };
  }, [levels, noise]);

  const errors = decoded.filter((d, i) => d !== symbols[i]).length;
  const W = 640;
  const H = 220;
  const pad = { l: 44, r: 12, t: 14, b: 26 };
  const cw = (W - pad.l - pad.r) / SYMBOLS;
  const y = (v: number) => pad.t + (1 - (v + 0.35) / 1.7) * (H - pad.t - pad.b);
  const path = samples
    .flatMap((row, i) =>
      row.map(
        (v, j) =>
          `${i === 0 && j === 0 ? "M" : "L"}${(pad.l + i * cw + (j / (SAMPLES - 1)) * cw).toFixed(1)} ${y(v).toFixed(1)}`,
      ),
    )
    .join(" ");

  return (
    <Widget
      title="Sending numbers down a noisy wire"
      subtitle="Every real wire picks up noise. Compare sending 2 voltage levels (binary) with 10 levels (one per decimal digit)."
    >
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Segmented
          value={levels}
          onChange={setLevels}
          options={[
            { value: 2, label: "2 levels (binary)" },
            { value: 10, label: "10 levels (decimal)" },
          ]}
        />
        <Slider
          className="w-56"
          label="Noise"
          min={0}
          max={0.3}
          step={0.01}
          value={noise}
          onChange={setNoise}
          format={(v) => `±${v.toFixed(2)} V`}
        />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Noisy voltage signal">
        {Array.from({ length: levels }, (_, k) => {
          const v = k / (levels - 1);
          return (
            <g key={k}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeDasharray="3 5" />
              <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" className="fill-dim font-mono text-[11px]">
                {v.toFixed(levels === 2 ? 0 : 2)}V
              </text>
            </g>
          );
        })}
        {levels === 2 && (
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={y(0.5)}
            y2={y(0.5)}
            stroke="var(--color-amber)"
            strokeOpacity={0.6}
            strokeDasharray="6 4"
          />
        )}
        <path d={path} fill="none" stroke="var(--color-cyan)" strokeWidth={1.6} />
        {symbols.map((s, i) => {
          const ok = decoded[i] === s;
          return (
            <g key={i}>
              <text
                x={pad.l + i * cw + cw / 2}
                y={H - 6}
                textAnchor="middle"
                className="font-mono text-[12px] font-bold"
                fill={ok ? "var(--color-on)" : "var(--color-pink)"}
              >
                {decoded[i]}
              </text>
              {!ok && (
                <rect
                  x={pad.l + i * cw + 1}
                  y={pad.t}
                  width={cw - 2}
                  height={H - pad.t - pad.b}
                  fill="var(--color-pink)"
                  opacity={0.12}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-mute">Sent:</span>
        <span className="font-mono tracking-[0.3em] text-ink">{symbols.join("")}</span>
        <Pill tone={errors ? "pink" : "on"}>
          {errors} wrong out of {SYMBOLS}
        </Pill>
      </div>
      <p className="mt-3 text-sm text-mute">
        With 2 levels, the receiver only asks “is it above or below the middle?” The safety gap is{" "}
        <span className="font-mono text-ink">0.5 V</span>. With 10 levels the gap shrinks to{" "}
        <span className="font-mono text-ink">0.5 ÷ 9 ≈ 0.056 V</span>, so the same noise causes mistakes.
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Logic levels: what a 3.3 V output promises and an input accepts.    */
/* ------------------------------------------------------------------ */

const SUPPLY = 3.3;
const V_IL = 0.8; // input reads 0 at or below this
const V_IH = 2.0; // input reads 1 at or above this
const V_OL = 0.4; // a 0 output is at most this
const V_OH = 2.4; // a 1 output is at least this

export function LogicLevels() {
  const [bit, setBit] = useState<0 | 1>(1);
  const [noise, setNoise] = useState(-0.3);
  const sent = bit ? V_OH : V_OL;
  // Round to whole hundredths so 2.4 − 0.4 is exactly 2.0, not 1.9999999.
  const got = Math.round(Math.min(SUPPLY, Math.max(0, sent + noise)) * 100) / 100;
  const read: 0 | 1 | null = got <= V_IL ? 0 : got >= V_IH ? 1 : null;
  const ok = read === bit;

  const W = 360;
  const H = 262;
  const top = 34;
  const bottom = 244;
  const y = (v: number) => bottom - (v / SUPPLY) * (bottom - top);
  const colA = { x: 56, w: 78 };
  const colB = { x: 248, w: 100 };
  const midL = colA.x + colA.w;
  const midR = colB.x;

  // A slightly wobbly wire from the sent voltage to the received voltage.
  const wire = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    const xx = midL + t * (midR - midL);
    const base = sent + (got - sent) * t;
    const wob = i === 0 || i === 24 ? 0 : Math.sin(i * 1.9) * 0.07;
    return `${i ? "L" : "M"}${xx.toFixed(1)} ${y(base + wob).toFixed(1)}`;
  }).join(" ");

  const band = (x: number, w: number, lo: number, hi: number, fill: string, key: string) => (
    <rect key={key} x={x} y={y(hi)} width={w} height={y(lo) - y(hi)} fill={fill} stroke="var(--color-line-2)" />
  );
  const fmtV = (v: number) => `${v.toFixed(2)} V`;

  return (
    <Widget
      title="Logic levels: the safety gap"
      subtitle="Gate A sends a bit to gate B down a wire. Gate A sends its weakest legal voltage. Add noise and see what gate B reads."
    >
      <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <Segmented
          value={bit}
          onChange={(v) => setBit(v)}
          options={[
            { value: 1, label: "Send a 1" },
            { value: 0, label: "Send a 0" },
          ]}
        />
        <Slider
          className="w-full max-w-72"
          label="Noise on the wire"
          min={-1.8}
          max={1.8}
          step={0.05}
          value={noise}
          onChange={setNoise}
          format={(v) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(2)} V`}
        />
      </div>
      <div className="grid items-center gap-5 md:grid-cols-[minmax(0,380px)_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Voltage bands for output and input">
          <defs>
            <pattern id="ll-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line y2="6" stroke="var(--color-pink)" strokeOpacity={0.45} strokeWidth="1.2" />
            </pattern>
          </defs>
          <text x={colA.x + colA.w / 2} y={18} textAnchor="middle" className="fill-ink font-sans text-[13px] font-semibold">
            A sends
          </text>
          <text x={colB.x + colB.w / 2} y={18} textAnchor="middle" className="fill-ink font-sans text-[13px] font-semibold">
            B reads
          </text>
          {/* Gate A: what an output may send */}
          {band(colA.x, colA.w, V_OH, SUPPLY, "var(--color-on-tint)", "a1")}
          {band(colA.x, colA.w, V_OL, V_OH, "var(--color-panel-2)", "am")}
          {band(colA.x, colA.w, 0, V_OL, "var(--color-panel-3)", "a0")}
          <text x={colA.x + colA.w / 2} y={y(2.85) + 5} textAnchor="middle" className="fill-on font-mono text-[15px] font-bold">
            1
          </text>
          <text x={colA.x + colA.w / 2} y={y(1.5) - 2} textAnchor="middle" className="fill-dim font-sans text-[12px]">
            never
          </text>
          <text x={colA.x + colA.w / 2} y={y(1.5) + 13} textAnchor="middle" className="fill-dim font-sans text-[12px]">
            sent
          </text>
          <text x={colA.x + colA.w / 2} y={y(0.2) + 5} textAnchor="middle" className="fill-dim font-mono text-[15px]">
            0
          </text>
          {/* Gate B: how an input reads */}
          {band(colB.x, colB.w, V_IH, SUPPLY, "var(--color-on-tint)", "b1")}
          {band(colB.x, colB.w, V_IL, V_IH, "url(#ll-hatch)", "bm")}
          {band(colB.x, colB.w, 0, V_IL, "var(--color-panel-3)", "b0")}
          <text x={colB.x + colB.w / 2} y={y(2.65) + 5} textAnchor="middle" className="fill-on font-sans text-[13px] font-bold">
            reads 1
          </text>
          <rect
            x={colB.x + 10}
            y={y(1.4) - 13}
            width={colB.w - 20}
            height={22}
            rx={4}
            fill="var(--color-panel)"
            stroke="var(--color-pink)"
            strokeOpacity={0.5}
          />
          <text x={colB.x + colB.w / 2} y={y(1.4) + 3} textAnchor="middle" className="fill-pink font-sans text-[12px] font-semibold">
            undefined
          </text>
          <text x={colB.x + colB.w / 2} y={y(0.4) + 5} textAnchor="middle" className="fill-mute font-sans text-[13px] font-bold">
            reads 0
          </text>
          {/* Voltage scale */}
          {[0, V_OL, V_IL, V_IH, V_OH, SUPPLY].map((v) => (
            <text key={v} x={colA.x - 6} y={y(v) + 4} textAnchor="end" className="fill-mute font-mono text-[12px]">
              {v.toFixed(1)}
            </text>
          ))}
          <text x={colA.x - 6} y={top - 16} textAnchor="end" className="fill-dim font-mono text-[12px]">
            volts
          </text>
          {/* Noise margins: the gap between a promise and a rule */}
          {[
            [V_IH, V_OH],
            [V_OL, V_IL],
          ].map(([lo, hi]) => (
            <g key={lo}>
              <rect
                x={midL}
                y={y(hi)}
                width={midR - midL}
                height={y(lo) - y(hi)}
                fill="var(--color-amber)"
                opacity={0.12}
              />
              <line x1={midL} x2={midR} y1={y(hi)} y2={y(hi)} stroke="var(--color-amber)" strokeDasharray="3 3" />
              <line x1={midL} x2={midR} y1={y(lo)} y2={y(lo)} stroke="var(--color-amber)" strokeDasharray="3 3" />
            </g>
          ))}
          <text x={(midL + midR) / 2} y={y(V_IH) + 16} textAnchor="middle" className="fill-amber font-sans text-[12px] font-semibold">
            0.4 V safety gap
          </text>
          <text x={(midL + midR) / 2} y={y(V_IL) - 7} textAnchor="middle" className="fill-amber font-sans text-[12px] font-semibold">
            0.4 V safety gap
          </text>
          {/* The signal */}
          <path d={wire} fill="none" stroke="var(--color-cyan)" strokeWidth={2.2} />
          <circle cx={midL} cy={y(sent)} r={5} fill="var(--color-cyan)" />
          <circle
            cx={midR}
            cy={y(got)}
            r={6.5}
            fill={ok ? "var(--color-on)" : "var(--color-pink)"}
            stroke="var(--color-panel)"
            strokeWidth={2}
          />
        </svg>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="A sends" value={fmtV(sent)} sub={bit ? "weakest legal 1" : "weakest legal 0"} tone="cyan" />
            <Stat label="B receives" value={fmtV(got)} sub={`after ${noise >= 0 ? "+" : "−"}${Math.abs(noise).toFixed(2)} V noise`} />
          </div>
          <div
            className={cx(
              "rounded-md border px-3 py-2 font-sans text-sm font-semibold",
              ok ? "border-on bg-on-tint text-on" : "border-pink bg-pink-tint text-pink",
            )}
          >
            {read === null
              ? `✗ Undefined. ${fmtV(got)} is between 0.8 V and 2.0 V, so B might read 0 or 1.`
              : ok
                ? `✓ B reads ${read}, which is correct.`
                : `✗ B reads ${read}, but A sent ${bit}. The bit flipped.`}
          </div>
          <p className="font-serif text-[0.9375rem] leading-normal text-mute">
            {ok ? (
              <>
                Now gate B drives its <em>own</em> output from its own supply: close to {bit ? "3.3 V" : "0 V"}, not the
                tired {fmtV(got)} it received. The noise does not travel any further.
              </>
            ) : (
              <>
                Any noise up to 0.4 V is always safe, because a legal output is at least 0.4 V away from the
                undefined zone. Here the noise is {Math.abs(noise).toFixed(2)} V.
              </>
            )}
          </p>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* The MOSFET cross-section.                                           */
/* ------------------------------------------------------------------ */

const VTH = 0.4;
const VMAX = 1.0;

export function MosfetWidget() {
  const [vg, setVg] = useState(0);
  const on = vg >= VTH;
  const overdrive = Math.max(0, vg - VTH);
  // Square-law model, normalised so 1.0 V gives 100 %.
  const current = (overdrive * overdrive) / ((VMAX - VTH) * (VMAX - VTH));
  const t = useAnimationTime(true);

  // Electrons pulled under the gate: more voltage, more electrons.
  const attracted = Math.round((vg / VMAX) * 22);
  const chX0 = 222;
  const chX1 = 418;
  const spacing = (chX1 - chX0) / Math.max(1, attracted);
  const speed = 20 + 160 * Math.sqrt(current);

  const holes = useMemo(() => {
    const r = rng(3);
    return Array.from({ length: 34 }, () => ({ x: 70 + r() * 500, y: 284 + r() * 18 }));
  }, []);
  const srcElectrons = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: 14 }, () => ({ dx: r() * 110, dy: r() * 40 }));
  }, []);

  return (
    <Widget
      title="Inside a transistor (MOSFET)"
      subtitle="Drag the gate voltage. Watch electrons gather under the gate and form a bridge between source and drain."
      wide
    >
      <div className="scroll-thin overflow-x-auto">
        <svg viewBox="0 0 640 340" className="w-full min-w-[540px]" role="img" aria-label="MOSFET cross-section">
          <CircuitDefs />
          {/* circuit loop: source → battery → lamp → drain */}
          <Wire d="M155 182 V40 H250" on={on} />
          <Wire d="M290 40 H382" on={on} />
          <Wire d="M418 40 H485 V182" on={on} />
          {/* battery */}
          <g>
            <line x1={258} y1={26} x2={258} y2={54} stroke="var(--color-ink)" strokeWidth={3} />
            <line x1={268} y1={32} x2={268} y2={48} stroke="var(--color-ink)" strokeWidth={5} />
            <line x1={278} y1={26} x2={278} y2={54} stroke="var(--color-ink)" strokeWidth={3} />
            <line x1={288} y1={32} x2={288} y2={48} stroke="var(--color-ink)" strokeWidth={5} />
            <line x1={250} y1={40} x2={258} y2={40} stroke="var(--color-off)" strokeWidth={3} />
            <text x={270} y={20} textAnchor="middle" className="fill-mute font-mono text-[11px]">
              battery
            </text>
          </g>
          <Lamp x={400} y={40} on={on} r={16} intensity={current} />

          {/* gate lead */}
          <line
            x1={320}
            y1={160}
            x2={320}
            y2={104}
            stroke={vg > 0 ? "var(--color-amber)" : "var(--color-off)"}
            strokeWidth={3}
          />
          <rect
            x={262}
            y={78}
            width={116}
            height={26}
            rx={6}
            fill="var(--color-bg)"
            stroke="var(--color-amber)"
            strokeOpacity={0.6}
          />
          <text x={320} y={95} textAnchor="middle" className="fill-amber font-mono text-[12px] font-bold">
            gate = {vg.toFixed(2)} V
          </text>

          {/* substrate */}
          <rect
            x={60}
            y={200}
            width={520}
            height={128}
            rx={8}
            fill="var(--color-si-p)"
            stroke="var(--color-si-p-edge)"
          />
          {holes.map((h, i) => (
            <circle key={i} cx={h.x} cy={h.y} r={3} fill="none" stroke="var(--color-si-hole)" strokeWidth={1.2} />
          ))}
          <text x={320} y={318} textAnchor="middle" className="fill-violet font-mono text-[11px]">
            p-type silicon: almost no free electrons, so it blocks current
          </text>

          {/* source / drain wells */}
          {[90, 420].map((x, k) => (
            <g key={x}>
              <path
                d={`M${x} 200 h130 v40 q0 22 -22 22 h-86 q-22 0 -22 -22 z`}
                fill="var(--color-si-n)"
                stroke="var(--color-si-n-edge)"
              />
              {srcElectrons.map((e, i) => (
                <circle key={i} cx={x + 10 + e.dx} cy={208 + e.dy} r={3} fill="var(--color-cyan)" />
              ))}
              <text x={x + 65} y={278} textAnchor="middle" className="fill-cyan font-mono text-[11px] font-semibold">
                {k === 0 ? "SOURCE" : "DRAIN"}
              </text>
            </g>
          ))}
          {/* metal contacts */}
          <rect x={125} y={182} width={60} height={18} rx={3} fill="var(--color-metal)" />
          <rect x={455} y={182} width={60} height={18} rx={3} fill="var(--color-metal)" />

          {/* oxide + gate */}
          <rect
            x={205}
            y={186}
            width={230}
            height={14}
            fill="var(--color-oxide)"
            stroke="var(--color-off)"
            strokeWidth={0.75}
          />
          <rect x={205} y={186} width={230} height={14} fill="url(#hatch)" opacity={0.6} />
          <rect
            x={212}
            y={160}
            width={216}
            height={26}
            rx={4}
            style={{
              fill:
                vg > 0
                  ? `color-mix(in oklab, var(--color-amber) ${Math.round(20 + 55 * (vg / VMAX))}%, var(--color-si-gate))`
                  : "var(--color-si-gate)",
            }}
            stroke={vg > 0 ? "var(--color-amber)" : "var(--color-off)"}
            className={vg > 0.05 ? "glow-amber" : undefined}
          />
          {Array.from({ length: Math.round((vg / VMAX) * 10) }, (_, i) => (
            <text
              key={i}
              x={226 + i * 20}
              y={178}
              className="fill-bg font-mono text-[13px] font-bold"
              stroke="var(--color-amber)"
              strokeWidth={0.75}
              paintOrder="stroke"
            >
              +
            </text>
          ))}
          <text x={320} y={156} textAnchor="middle" className="fill-mute font-mono text-[11px]">
            GATE (metal) on thin glass
          </text>

          {/* channel electrons */}
          {Array.from({ length: attracted }, (_, i) => {
            let x = chX0 + i * spacing;
            let yy = 206;
            if (on) {
              x = chX0 + ((i * spacing + t * speed) % (chX1 - chX0));
            } else {
              // Not enough to bridge: they cluster loosely and jiggle in place
              yy = 206 + Math.sin(t * 3 + i) * 1.5;
            }
            return <circle key={i} cx={x} cy={yy} r={3.2} fill="var(--color-cyan)" className="glow-cyan" />;
          })}
          {on && (
            <rect
              x={chX0 - 2}
              y={201}
              width={chX1 - chX0 + 4}
              height={10}
              rx={3}
              fill="var(--color-cyan)"
              opacity={0.12 + 0.25 * current}
            />
          )}
          {on && (
            <path
              d="M232 228 H408"
              stroke="var(--color-cyan)"
              strokeWidth={1.5}
              markerEnd="url(#arrow-cyan)"
              opacity={0.8}
            />
          )}
          {on && (
            <text x={320} y={244} textAnchor="middle" className="fill-cyan font-mono text-[11px]">
              electrons flow →
            </text>
          )}
        </svg>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Slider
            label={
              <>
                Gate voltage <TeX>{"V_{G}"}</TeX> (threshold <TeX>{"V_{th}"}</TeX> = {VTH} V)
              </>
            }
            min={0}
            max={VMAX}
            step={0.01}
            value={vg}
            onChange={setVg}
            format={(v) => `${v.toFixed(2)} V`}
          />
          <div className="relative mt-1 h-3 font-mono text-[11px] text-amber">
            <span className="absolute -translate-x-1/2" style={{ left: `${(VTH / VMAX) * 100}%` }}>
              ▲ {VTH} V
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Btn onClick={() => setVg(0)} active={vg === 0}>
            Input 0
          </Btn>
          <Btn onClick={() => setVg(1)} active={vg === 1}>
            Input 1
          </Btn>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Switch" value={on ? "ON → 1" : "OFF → 0"} tone={on ? "on" : "ink"} />
        <Stat
          label="Electrons under gate"
          value={attracted}
          sub={on ? "enough to form a bridge" : vg > 0 ? "not enough yet" : "none"}
        />
        <Stat
          label="Current (relative)"
          value={`${Math.round(current * 100)} %`}
          tone={on ? "cyan" : "ink"}
          sub={<TeX>{String.raw`\propto (V_G - V_{th})^2`}</TeX>}
        />
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* nMOS vs pMOS, and the CMOS inverter                                 */
/* ------------------------------------------------------------------ */

/** Schematic MOSFET. (x, y) = centre of the channel. Drain at top, source at bottom. */
export function MosSymbol({
  x,
  y,
  type,
  conducting,
  gateOn,
}: {
  x: number;
  y: number;
  type: "n" | "p";
  conducting: boolean;
  gateOn: boolean;
}) {
  const ch = conducting ? "var(--color-on)" : "var(--color-dim)";
  return (
    <g>
      {/* gate lead */}
      <Wire d={`M${x - 46} ${y} H${type === "p" ? x - 22 : x - 14}`} on={gateOn} flow={false} />
      {type === "p" && (
        <circle
          cx={x - 18}
          cy={y}
          r={4}
          fill="var(--color-bg)"
          stroke={gateOn ? "var(--color-on)" : "var(--color-dim)"}
          strokeWidth={2}
        />
      )}
      <line
        x1={x - 14}
        y1={y - 16}
        x2={x - 14}
        y2={y + 16}
        stroke={gateOn ? "var(--color-on)" : "var(--color-dim)"}
        strokeWidth={3}
      />
      {/* channel */}
      <line
        x1={x - 6}
        y1={y - 20}
        x2={x - 6}
        y2={y + 20}
        stroke={ch}
        strokeWidth={3}
        strokeDasharray={conducting ? undefined : "5 4"}
        className={conducting ? "glow-on" : undefined}
      />
      <path d={`M${x - 6} ${y - 14} H${x + 12} V${y - 32}`} fill="none" stroke={ch} strokeWidth={2.5} />
      <path d={`M${x - 6} ${y + 14} H${x + 12} V${y + 32}`} fill="none" stroke={ch} strokeWidth={2.5} />
      <text x={x + 20} y={y + 4} className="fill-dim font-mono text-[11px]">
        {type}MOS
      </text>
    </g>
  );
}

export function NmosPmosWidget() {
  const [input, setInput] = useState(false);
  return (
    <Widget
      title="Two flavours of switch, and the first real circuit"
      subtitle="nMOS turns ON when its gate is 1. pMOS is the opposite: ON when its gate is 0. Put one of each together and you get an inverter."
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-mute">Input:</span>
        <Segmented
          value={input ? 1 : 0}
          onChange={(v) => setInput(v === 1)}
          options={[
            { value: 0, label: "0 (0 V)" },
            { value: 1, label: "1 (1 V)" },
          ]}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.3fr]">
        {(["n", "p"] as const).map((type) => {
          const conducting = type === "n" ? input : !input;
          return (
            <div key={type} className="rounded-xl border border-line bg-bg/50 p-3">
              <div className="mb-1 text-sm font-semibold text-ink">{type}MOS</div>
              <svg viewBox="0 0 160 110" className="w-full">
                <MosSymbol x={86} y={55} type={type} conducting={conducting} gateOn={input} />
                <text x={20} y={50} className="fill-mute font-mono text-[11px]">
                  in={input ? 1 : 0}
                </text>
              </svg>
              <div className={cx("text-center font-mono text-sm", conducting ? "text-on" : "text-dim")}>
                {conducting ? "conducting (closed)" : "blocking (open)"}
              </div>
            </div>
          );
        })}
        <CmosInverter input={input} />
      </div>
    </Widget>
  );
}

function CmosInverter({ input }: { input: boolean }) {
  const out = !input;
  return (
    <div className="rounded-xl border border-on/30 bg-bg/50 p-3">
      <div className="mb-1 text-sm font-semibold text-ink">
        CMOS inverter <span className="font-normal text-mute">(a NOT gate)</span>
      </div>
      <svg viewBox="0 0 210 222" className="w-full">
        <text x={110} y={14} textAnchor="middle" className="fill-on font-mono text-[11px]">
          supply = 1
        </text>
        <line x1={80} y1={20} x2={140} y2={20} stroke="var(--color-on)" strokeWidth={3} />
        <Wire d="M110 20 V40" on={out} flow={false} />
        <MosSymbol x={98} y={72} type="p" conducting={!input} gateOn={input} />
        <Wire d="M110 104 V138" on={out} flow={false} />
        <MosSymbol x={98} y={170} type="n" conducting={input} gateOn={input} />
        <Wire d="M110 202 V206" on={false} flow={false} />
        <line x1={84} y1={206} x2={136} y2={206} stroke="var(--color-dim)" strokeWidth={3} />
        <text x={110} y={220} textAnchor="middle" className="fill-dim font-mono text-[11px]">
          ground = 0
        </text>
        {/* input wire joining both gates */}
        <Wire d="M52 72 V170 M20 121 H52" on={input} flow={false} />
        <text x={14} y={113} className="fill-mute font-mono text-[11px]">
          in
        </text>
        {/* output */}
        <Wire d="M110 121 H170" on={out} flow={false} />
        <circle
          cx={178}
          cy={121}
          r={9}
          fill={out ? "var(--color-on)" : "var(--color-bg)"}
          stroke={out ? "var(--color-on)" : "var(--color-dim)"}
          strokeWidth={2}
        />
        <text x={178} y={142} textAnchor="middle" className="fill-mute font-mono text-[11px]">
          out={out ? 1 : 0}
        </text>
      </svg>
      <p className="text-xs leading-relaxed text-mute">
        Input {input ? 1 : 0} → the {input ? "bottom (nMOS)" : "top (pMOS)"} switch closes, connecting the output to{" "}
        <span className={out ? "text-on" : "text-ink"}>{out ? "supply (1)" : "ground (0)"}</span>. The output is always
        the opposite of the input.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* How small? A logarithmic ruler.                                      */
/* ------------------------------------------------------------------ */

const sizes = [
  { name: "Human hair", m: 70e-6, tone: "var(--color-mute)" },
  { name: "Red blood cell", m: 7e-6, tone: "var(--color-pink)" },
  { name: "Bacterium", m: 1e-6, tone: "var(--color-violet)" },
  { name: "Virus", m: 100e-9, tone: "var(--color-amber)" },
  { name: "Transistor (gate pitch)", m: 48e-9, tone: "var(--color-on)" },
  { name: "Transistor fin width", m: 6e-9, tone: "var(--color-on)" },
  { name: "DNA strand width", m: 2.5e-9, tone: "var(--color-cyan)" },
  { name: "Silicon atom spacing", m: 0.235e-9, tone: "var(--color-cyan)" },
];

function fmtLen(m: number) {
  if (m >= 1e-6) return `${+(m / 1e-6).toPrecision(3)} µm`;
  return `${+(m / 1e-9).toPrecision(3)} nm`;
}

export function SizeRuler() {
  const [sel, setSel] = useState(4);
  const lo = -10;
  const hi = -4;
  const W = 640;
  const x = (m: number) => 20 + ((Math.log10(m) - lo) / (hi - lo)) * (W - 40);
  const ref = sizes[sel];
  return (
    <Widget
      title="How small is a transistor?"
      subtitle="Each tick on this ruler is 10× bigger than the one to its left. Click an item to compare it with a transistor."
    >
      <svg viewBox={`0 0 ${W} 150`} className="w-full" role="img" aria-label="Logarithmic size ruler">
        <line x1={20} x2={W - 20} y1={110} y2={110} stroke="var(--color-line-2)" strokeWidth={2} />
        {Array.from({ length: hi - lo + 1 }, (_, i) => {
          const e = lo + i;
          const px = x(10 ** e);
          const label = e >= -6 ? `${10 ** (e + 6)} µm` : `${+(10 ** (e + 9)).toPrecision(2)} nm`;
          return (
            <g key={e}>
              <line x1={px} x2={px} y1={104} y2={116} stroke="var(--color-dim)" />
              <text
                x={px}
                y={132}
                textAnchor={i === 0 ? "start" : i === hi - lo ? "end" : "middle"}
                className="fill-dim font-mono text-[11px]"
              >
                {label}
              </text>
            </g>
          );
        })}
        {sizes.map((s, i) => {
          const px = x(s.m);
          const row = i % 3;
          return (
            <g key={s.name} className="cursor-pointer" onClick={() => setSel(i)}>
              <line x1={px} x2={px} y1={110} y2={24 + row * 26} stroke={s.tone} strokeOpacity={i === sel ? 1 : 0.45} />
              <circle cx={px} cy={110} r={i === sel ? 6 : 4} fill={s.tone} />
              <text
                x={px}
                y={18 + row * 26}
                textAnchor={px < 90 ? "start" : px > W - 90 ? "end" : "middle"}
                className="font-mono text-[11px]"
                fill={s.tone}
                fontWeight={i === sel ? 700 : 400}
              >
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-2">
        {sizes.map((s, i) => (
          <Btn key={s.name} onClick={() => setSel(i)} active={i === sel} className="text-xs">
            {s.name}
          </Btn>
        ))}
      </div>
      <p className="mt-3 text-sm text-mute">
        <span className="text-ink">{ref.name}</span> ≈ <span className="font-mono text-ink">{fmtLen(ref.m)}</span>.{" "}
        {ref.m > 48e-9 ? (
          <>
            Side by side, about <span className="font-mono text-on">{Math.round(ref.m / 48e-9).toLocaleString()}</span>{" "}
            transistors fit across it <span className="font-mono text-dim">({fmtLen(ref.m)} ÷ 48 nm)</span>.
          </>
        ) : ref.m < 48e-9 ? (
          <>
            About <span className="font-mono text-on">{Math.round(48e-9 / ref.m).toLocaleString()}</span> of these would
            fit across one transistor <span className="font-mono text-dim">(48 nm ÷ {fmtLen(ref.m)})</span>.
          </>
        ) : (
          <>That's the spacing between neighbouring transistors on a modern chip.</>
        )}
      </p>
    </Widget>
  );
}
