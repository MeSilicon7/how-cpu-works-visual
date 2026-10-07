import { useEffect, useRef, useState, type ReactNode } from "react";

import { CircuitDefs, Junction, Lamp, Wire } from "~/components/circuit";
import { Btn, cx, DataTable, Figure, Pill, Segmented, Slider, Stat, Widget } from "~/components/ui";
import { clamp } from "~/lib/bits";
import { useReducedMotion } from "~/lib/hooks";

/* ------------------------------------------------------------------ */
/* Small helpers                                                        */
/* ------------------------------------------------------------------ */

/** Charge of one electron, in coulombs. */
const E_CHARGE = 1.602176634e-19;

/** Round to `n` significant digits, with thousands separators. */
function sig(x: number, n = 3) {
  if (x === 0) return "0";
  const v = Number(x.toPrecision(n));
  return v.toLocaleString("en-US", { maximumFractionDigits: 6 });
}
function fmtAmps(i: number) {
  if (i === 0) return "0 A";
  if (i < 1) return `${sig(i * 1000)} mA`;
  return `${sig(i)} A`;
}
function fmtWatts(p: number) {
  if (p === 0) return "0 W";
  if (p < 1) return `${sig(p * 1000)} mW`;
  return `${sig(p)} W`;
}
function fmtOhms(r: number) {
  if (!Number.isFinite(r)) return "∞";
  if (r >= 1000) return `${sig(r / 1000)} kΩ`;
  return `${sig(r)} Ω`;
}
function fmtVolts(v: number) {
  return `${sig(v)} V`;
}

type Pt = readonly [number, number];

function polyLen(pts: Pt[]) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}

function pointAt(pts: Pt[], dist: number): Pt {
  let d = dist;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (d <= seg) {
      const k = seg ? d / seg : 0;
      return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
    }
    d -= seg;
  }
  return pts[pts.length - 1];
}

const toD = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");

/** Activate an SVG "button" with Enter or Space as well as a click. */
function keyActivate(fn: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };
}

/**
 * Moves several streams of dots. Each stream has its own speed (user units
 * per second); the returned numbers are how far each stream has travelled.
 * Nothing moves while `running` is false, so the server render and the first
 * browser render agree.
 */
function useFlow(speeds: number[], running: boolean) {
  const [dist, setDist] = useState<number[]>(() => speeds.map(() => 0));
  const speedRef = useRef(speeds);
  useEffect(() => {
    speedRef.current = speeds;
  });
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last: number | null = null;
    const loop = (now: number) => {
      if (last !== null) {
        const dt = Math.min(0.1, (now - last) / 1000);
        setDist((prev) => speedRef.current.map((s, i) => ((prev[i] ?? 0) + s * dt) % 100000));
      }
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  return dist;
}

/** Electron dots along a path, skipping the boxes where parts are drawn. */
function ElectronDots({
  pts,
  offset,
  skip,
  spacing = 24,
}: {
  pts: Pt[];
  offset: number;
  skip: Array<[number, number, number, number]>;
  spacing?: number;
}) {
  const len = polyLen(pts);
  const o = ((offset % spacing) + spacing) % spacing;
  const dots: Pt[] = [];
  for (let d = o; d < len; d += spacing) {
    const p = pointAt(pts, d);
    if (skip.some(([x0, y0, x1, y1]) => p[0] > x0 && p[0] < x1 && p[1] > y0 && p[1] < y1)) continue;
    dots.push(p);
  }
  return (
    <g>
      {dots.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r={3.8}
          fill="var(--color-cyan)"
          stroke="var(--color-panel)"
          strokeWidth={1.5}
        />
      ))}
    </g>
  );
}

/** A battery drawn upright: + (long plate) on top. Leads connect at y0 and y1. */
function BatterySymbol({
  x,
  y0,
  y1,
  label,
  on = false,
}: {
  x: number;
  y0: number;
  y1: number;
  label: string;
  on?: boolean;
}) {
  const mid = (y0 + y1) / 2;
  const plates = [mid - 15, mid - 5, mid + 5, mid + 15];
  return (
    <g>
      <line x1={x} y1={y0} x2={x} y2={plates[0]} className={on ? "wire wire-on" : "wire"} />
      <line x1={x} y1={plates[3]} x2={x} y2={y1} className={on ? "wire wire-on" : "wire"} />
      {plates.map((py, i) => (
        <line
          key={i}
          x1={x - (i % 2 ? 10 : 18)}
          x2={x + (i % 2 ? 10 : 18)}
          y1={py}
          y2={py}
          stroke="var(--color-ink)"
          strokeWidth={i % 2 ? 5 : 2.5}
        />
      ))}
      <text x={x + 24} y={plates[0] + 4} className="fill-ink font-mono text-[14px] font-bold">
        +
      </text>
      <text x={x + 24} y={plates[3] + 5} className="fill-ink font-mono text-[14px] font-bold">
        −
      </text>
      <text x={x - 24} y={mid + 5} textAnchor="end" className="fill-ink font-mono text-[14px] font-bold">
        {label}
      </text>
    </g>
  );
}

function GroundSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="var(--color-ink)" strokeWidth={2} strokeLinecap="round">
      <line x1={x - 11} x2={x + 11} y1={y} y2={y} />
      <line x1={x - 7} x2={x + 7} y1={y + 5} y2={y + 5} />
      <line x1={x - 3} x2={x + 3} y1={y + 10} y2={y + 10} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Circuit sandbox                                                   */
/* ------------------------------------------------------------------ */

const LAMP_R = 120; // ohms: a small 12 V, 1.2 W bulb

/** Clickable knife switch between (x, y) and (x + 50, y). */
function SwitchPart({
  x,
  y,
  closed,
  live,
  label,
  labelBelow,
  onToggle,
}: {
  x: number;
  y: number;
  closed: boolean;
  live: boolean;
  label: string;
  labelBelow?: boolean;
  onToggle: () => void;
}) {
  const c = live ? "var(--color-on)" : "var(--color-ink)";
  return (
    <g
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      aria-pressed={closed}
      aria-label={`Switch ${label}: ${closed ? "closed" : "open"}. Click to flip.`}
      onClick={onToggle}
      onKeyDown={keyActivate(onToggle)}
    >
      <rect x={x - 10} y={y - 32} width={70} height={labelBelow ? 66 : 46} fill="transparent" />
      <rect x={x + 4} y={y - 4} width={42} height={8} fill="var(--color-panel)" />
      <circle cx={x} cy={y} r={4.5} fill={c} />
      <circle cx={x + 50} cy={y} r={4.5} fill={closed ? c : "var(--color-ink)"} />
      <line
        x1={x}
        y1={y}
        x2={closed ? x + 50 : x + 43}
        y2={closed ? y : y - 24}
        stroke={c}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <text
        x={x + 25}
        y={labelBelow ? y + 27 : y - 30}
        textAnchor="middle"
        className="font-sans text-[13px] font-bold"
        fill={closed ? "var(--color-ink)" : "var(--color-mute)"}
      >
        {label} {closed ? "closed" : "open"}
      </text>
    </g>
  );
}

/** Zig-zag resistor from (x, y) to (x + 80, y). */
function ResistorPart({
  x,
  y,
  live,
  label,
  labelBelow,
}: {
  x: number;
  y: number;
  live: boolean;
  label: string;
  labelBelow?: boolean;
}) {
  const d = `M${x} ${y} h10 l5 -9 l10 18 l10 -18 l10 18 l10 -18 l10 18 l5 -9 h10`;
  return (
    <g>
      <rect x={x + 8} y={y - 5} width={64} height={10} fill="var(--color-panel)" />
      <Wire d={d} on={live} flow={false} />
      <text
        x={x + 40}
        y={labelBelow ? y + 30 : y - 18}
        textAnchor="middle"
        className="fill-ink font-mono text-[13px] font-semibold"
      >
        {label}
      </text>
    </g>
  );
}

/** Speed of the electron dots (user units / s). Not to scale: it only grows with the current. */
function dotSpeed(i: number) {
  if (i <= 0) return 0;
  const x = Math.log10(i * 1000); // current in mA, as a power of ten
  return clamp(12 + ((x + 0.5) / 4) * 110, 8, 130);
}

type Topology = "series" | "parallel";
type Parts = "resistors" | "lamp";

export function CircuitSandbox() {
  const [topo, setTopo] = useState<Topology>("series");
  const [parts, setParts] = useState<Parts>("resistors");
  const [v, setV] = useState(5);
  const [r1, setR1] = useState(100);
  const [r2, setR2] = useState(100);
  const [a, setA] = useState(true);
  const [b, setB] = useState(true);
  const [seen, setSeen] = useState<Record<string, boolean>>({ "11": true });
  const reduced = useReducedMotion();

  const key = (x: boolean, y: boolean) => `${x ? 1 : 0}${y ? 1 : 0}`;
  const toggleA = () => {
    setA(!a);
    setSeen((s) => ({ ...s, [key(!a, b)]: true }));
  };
  const toggleB = () => {
    setB(!b);
    setSeen((s) => ({ ...s, [key(a, !b)]: true }));
  };
  const changeTopo = (t: Topology) => {
    setTopo(t);
    setSeen({ [key(a, b)]: true });
  };
  const changeParts = (p: Parts) => {
    setParts(p);
    setSeen({ [key(a, b)]: true });
  };

  const lampMode = parts === "lamp";
  // Resistance of each branch element (switches count as 0 Ω when closed).
  const ra = lampMode ? 0 : r1;
  const rb = lampMode ? 0 : r2;
  const rl = lampMode ? LAMP_R : 0;

  let i1 = 0;
  let i2 = 0;
  let iTot = 0;
  let rTot = Infinity;
  if (topo === "series") {
    if (a && b) {
      rTot = ra + rb + rl;
      iTot = v / rTot;
    }
    i1 = i2 = iTot;
  } else {
    const anyPath = a || b;
    if (anyPath) {
      if (lampMode) {
        rTot = rl;
        iTot = v / rTot;
        // Two closed switches share the current equally.
        i1 = a ? iTot / (a && b ? 2 : 1) : 0;
        i2 = b ? iTot / (a && b ? 2 : 1) : 0;
      } else {
        i1 = a ? v / ra : 0;
        i2 = b ? v / rb : 0;
        iTot = i1 + i2;
        rTot = a && b ? 1 / (1 / ra + 1 / rb) : a ? ra : rb;
      }
    }
  }
  const flowing = iTot > 0;
  const lampOn = lampMode && flowing;
  const pLamp = lampOn ? iTot * iTot * LAMP_R : 0;

  /* ---- geometry (viewBox 580 × 292) ---- */
  const BX = 70; // battery x
  const TOP = 48;
  const BOT = 252;
  const RIGHT = 530;
  const N1 = 140;
  const N2 = 440;
  const MID = 150; // branch 2 in parallel
  const SW = 170; // switch start x
  const RS = 280; // resistor start x
  const LX = 320; // lamp centre x (bottom rail)

  const swBox = (y: number): [number, number, number, number] => [SW - 2, y - 30, SW + 52, y + 6];
  const rBox = (y: number): [number, number, number, number] => [RS + 6, y - 12, RS + 74, y + 12];
  const lampBox: [number, number, number, number] = [LX - 20, BOT - 20, LX + 20, BOT + 20];

  // Electron paths: they leave the − end (bottom) and return to + (top).
  type Stream = { pts: Pt[]; current: number; skip: Array<[number, number, number, number]> };
  let streams: Stream[];
  if (topo === "series") {
    const skip = [swBox(TOP), swBox(BOT)];
    if (lampMode) skip.push(lampBox);
    else skip.push(rBox(TOP), rBox(BOT));
    streams = [
      {
        pts: [
          [BX, 168],
          [BX, BOT],
          [RIGHT, BOT],
          [RIGHT, TOP],
          [BX, TOP],
          [BX, 126],
        ],
        current: iTot,
        skip,
      },
    ];
  } else {
    streams = [
      {
        pts: [
          [BX, 168],
          [BX, BOT],
          [RIGHT, BOT],
          [RIGHT, TOP],
          [N2, TOP],
        ],
        current: iTot,
        skip: lampMode ? [lampBox] : [],
      },
      {
        pts: [
          [N2, TOP],
          [N1, TOP],
        ],
        current: i1,
        skip: lampMode ? [swBox(TOP)] : [swBox(TOP), rBox(TOP)],
      },
      {
        pts: [
          [N2, TOP],
          [N2, MID],
          [N1, MID],
          [N1, TOP],
        ],
        current: i2,
        skip: lampMode ? [swBox(MID)] : [swBox(MID), rBox(MID)],
      },
      {
        pts: [
          [N1, TOP],
          [BX, TOP],
          [BX, 126],
        ],
        current: iTot,
        skip: [],
      },
    ];
  }
  const speeds = streams.map((s) => dotSpeed(s.current));
  const dist = useFlow([0, 0, 0, 0].map((_, k) => speeds[k] ?? 0), !reduced && flowing);

  const r1Label = `R₁ = ${fmtOhms(r1)}`;
  const r2Label = `R₂ = ${fmtOhms(r2)}`;

  let drawing: ReactNode;
  if (topo === "series") {
    drawing = (
      <>
        <Wire d={toD([[BX, 126], [BX, TOP], [RIGHT, TOP], [RIGHT, BOT], [BX, BOT], [BX, 168]])} on={flowing} flow={false} />
        <SwitchPart x={SW} y={TOP} closed={a} live={flowing} label="A" onToggle={toggleA} />
        <SwitchPart x={SW} y={BOT} closed={b} live={flowing} label="B" labelBelow onToggle={toggleB} />
        {!lampMode && <ResistorPart x={RS} y={TOP} live={flowing} label={r1Label} />}
        {!lampMode && <ResistorPart x={RS} y={BOT} live={flowing} label={r2Label} labelBelow />}
      </>
    );
  } else {
    drawing = (
      <>
        <Wire d={toD([[BX, 126], [BX, TOP], [N1, TOP]])} on={flowing} flow={false} />
        <Wire d={toD([[N2, TOP], [RIGHT, TOP], [RIGHT, BOT], [BX, BOT], [BX, 168]])} on={flowing} flow={false} />
        <Wire d={toD([[N1, TOP], [N2, TOP]])} on={i1 > 0} flow={false} />
        <Wire d={toD([[N1, TOP], [N1, MID], [N2, MID], [N2, TOP]])} on={i2 > 0} flow={false} />
        <SwitchPart x={SW} y={TOP} closed={a} live={i1 > 0} label="A" onToggle={toggleA} />
        <SwitchPart x={SW} y={MID} closed={b} live={i2 > 0} label="B" labelBelow onToggle={toggleB} />
        {!lampMode && <ResistorPart x={RS} y={TOP} live={i1 > 0} label={r1Label} />}
        {!lampMode && <ResistorPart x={RS} y={MID} live={i2 > 0} label={r2Label} labelBelow />}
        <Junction x={N1} y={TOP} on={flowing} />
        <Junction x={N2} y={TOP} on={flowing} />
      </>
    );
  }

  /* ---- numbers ---- */
  const rows: ReactNode[][] = [];
  const cell = (s: string, strong?: boolean) => (
    <span className={cx("font-mono tabular-nums", strong ? "font-semibold text-ink" : "text-body")}>{s}</span>
  );
  if (lampMode) {
    rows.push(["lamp (120 Ω)", cell(fmtAmps(iTot)), cell(fmtVolts(flowing ? v : 0)), cell(fmtWatts(pLamp))]);
  } else {
    const v1 = i1 * r1;
    const v2 = i2 * r2;
    rows.push([<>R₁</>, cell(fmtAmps(i1)), cell(fmtVolts(v1)), cell(fmtWatts(v1 * i1))]);
    rows.push([<>R₂</>, cell(fmtAmps(i2)), cell(fmtVolts(v2)), cell(fmtWatts(v2 * i2))]);
  }
  rows.push([
    <span className="font-semibold text-ink">battery</span>,
    cell(fmtAmps(iTot), true),
    cell(fmtVolts(v), true),
    cell(fmtWatts(v * iTot), true),
  ]);

  let eq: string[];
  if (!flowing) {
    eq = [
      topo === "series"
        ? "A switch is open, so the loop is broken: I = 0 A everywhere."
        : "Both switches are open: no path at all, so I = 0 A.",
    ];
  } else if (lampMode) {
    eq = [`I = V ÷ R = ${fmtVolts(v)} ÷ 120 Ω = ${fmtAmps(iTot)}`];
  } else if (topo === "series") {
    eq = [`R = R₁ + R₂ = ${fmtOhms(r1)} + ${fmtOhms(r2)} = ${fmtOhms(rTot)}`, `I = V ÷ R = ${fmtVolts(v)} ÷ ${fmtOhms(rTot)} = ${fmtAmps(iTot)}`];
  } else {
    eq = [
      a ? `I₁ = V ÷ R₁ = ${fmtVolts(v)} ÷ ${fmtOhms(r1)} = ${fmtAmps(i1)}` : "I₁ = 0 (switch A is open)",
      b ? `I₂ = V ÷ R₂ = ${fmtVolts(v)} ÷ ${fmtOhms(r2)} = ${fmtAmps(i2)}` : "I₂ = 0 (switch B is open)",
      `I = I₁ + I₂ = ${fmtAmps(iTot)}`,
    ];
  }

  const truth = [
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ] as const;
  const rule = (x: boolean, y: boolean) => (topo === "series" ? x && y : x || y);
  const allSeen = truth.every(([x, y]) => seen[key(x, y)]);
  const hl = (a ? 2 : 0) + (b ? 1 : 0);

  return (
    <Widget
      wide
      title="A circuit sandbox"
      subtitle="Click the switches, move the sliders and read the numbers. The blue dots are electrons: they leave the − end of the battery and come back to the + end."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          value={topo}
          onChange={changeTopo}
          options={[
            { value: "series", label: "In a row (series)" },
            { value: "parallel", label: "Side by side (parallel)" },
          ]}
        />
        <Segmented
          size="sm"
          value={parts}
          onChange={changeParts}
          options={[
            { value: "resistors", label: "Two resistors" },
            { value: "lamp", label: "One lamp" },
          ]}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="min-w-0">
          <div className="scroll-thin overflow-x-auto">
            <svg
              viewBox="0 0 580 292"
              className="w-full min-w-[520px]"
              role="img"
              aria-label={`${topo} circuit, current ${fmtAmps(iTot)}`}
            >
              <CircuitDefs />
              {drawing}
              <BatterySymbol x={BX} y0={126} y1={168} label={`${sig(v)} V`} on={flowing} />
              {lampMode && (
                <g>
                  <rect x={LX - 20} y={BOT - 4} width={40} height={8} fill="var(--color-panel)" />
                  <Lamp x={LX} y={BOT} on={lampOn} r={16} intensity={Math.sqrt(pLamp / 1.2)} />
                </g>
              )}
              {streams.map((s, k) => (
                <ElectronDots key={`${topo}-${k}`} pts={s.pts} offset={dist[k] ?? 0} skip={s.skip} />
              ))}
              {/* current read-out on the right-hand wire */}
              <g>
                <rect
                  x={RIGHT - 46}
                  y={136}
                  width={92}
                  height={30}
                  rx={5}
                  fill="var(--color-panel)"
                  stroke={flowing ? "var(--color-on)" : "var(--color-off)"}
                  strokeWidth={1.5}
                />
                <text
                  x={RIGHT}
                  y={156}
                  textAnchor="middle"
                  className="font-mono text-[14px] font-bold"
                  fill={flowing ? "var(--color-on)" : "var(--color-mute)"}
                >
                  {fmtAmps(iTot)}
                </text>
              </g>
            </svg>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Btn active={a} onClick={toggleA}>
              Switch A: {a ? "closed" : "open"}
            </Btn>
            <Btn active={b} onClick={toggleB}>
              Switch B: {b ? "closed" : "open"}
            </Btn>
            <span className="font-sans text-xs text-dim">Dot speed shows more or less current. It is not to scale.</span>
          </div>
        </div>

        <div className="space-y-4">
          <Slider
            label="Battery voltage V"
            min={1.5}
            max={12}
            step={0.5}
            value={v}
            onChange={setV}
            format={(x) => `${x.toFixed(1)} V`}
          />
          {!lampMode ? (
            <>
              <Slider label="Resistor R₁" min={10} max={1000} step={10} value={r1} onChange={setR1} format={fmtOhms} />
              <Slider label="Resistor R₂" min={10} max={1000} step={10} value={r2} onChange={setR2} format={fmtOhms} />
            </>
          ) : (
            <p className="font-serif text-[0.9375rem] text-mute">
              The lamp's thin wire has a resistance of about 120 Ω. The switches are just metal, so they count as
              0 Ω when closed.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Total resistance"
              value={Number.isFinite(rTot) ? fmtOhms(rTot) : "∞ (open)"}
              sub={
                !Number.isFinite(rTot)
                  ? "no closed path"
                  : lampMode
                    ? "just the lamp"
                    : topo === "series"
                      ? "R₁ + R₂"
                      : a && b
                        ? "1 ÷ (1/R₁ + 1/R₂)"
                        : "only one path is closed"
              }
            />
            <Stat label="Current I" value={fmtAmps(iTot)} tone={flowing ? "on" : "ink"} sub="I = V ÷ R" />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="min-w-0">
          <div className="mb-2 space-y-0.5 rounded-md border border-line bg-panel-2 px-3 py-2 font-mono text-sm text-ink tabular-nums">
            {eq.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <DataTable
            head={["part", "current I", "voltage V", "power P = V × I"]}
            rows={rows}
            highlight={rows.length - 1}
          />
        </div>
        {lampMode ? (
          <div className="min-w-0">
            <div className="label-caps mb-2 text-dim">Fill in the table: try all four switch settings</div>
            <DataTable
              head={["A", "B", "lamp"]}
              highlight={hl}
              rows={truth.map(([x, y]) => {
                const s = seen[key(x, y)];
                const out = rule(x, y);
                return [
                  <span className={x ? "font-bold text-on" : "text-dim"}>{x ? "1 closed" : "0 open"}</span>,
                  <span className={y ? "font-bold text-on" : "text-dim"}>{y ? "1 closed" : "0 open"}</span>,
                  s ? (
                    <span className={out ? "font-bold text-amber" : "text-dim"}>{out ? "1 on" : "0 off"}</span>
                  ) : (
                    <span className="text-dim">?</span>
                  ),
                ];
              })}
            />
            <p className="mt-3 font-serif text-[0.9375rem] text-mute">
              {allSeen ? (
                topo === "series" ? (
                  <>
                    <strong className="text-ink">You found AND.</strong> The lamp is on only if A <em>and</em> B are
                    both closed, because the current must pass through both.
                  </>
                ) : (
                  <>
                    <strong className="text-ink">You found OR.</strong> The lamp is on if A <em>or</em> B (or both)
                    is closed, because either path is enough.
                  </>
                )
              ) : (
                <>Flip the switches until every “?” is filled in. Then look for the rule.</>
              )}
            </p>
          </div>
        ) : (
          <div className="font-serif text-[0.9375rem] text-mute">
            <p>
              Things to try: set both resistors to 100 Ω and a 5 V battery. In series you get 25 mA; side by side you
              get 100 mA. Then open one switch in each layout and see what happens to the other resistor.
            </p>
            <p className="mt-2">
              The power column always adds up: the battery gives exactly what the parts turn into heat.
            </p>
          </div>
        )}
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Static figure: voltages measured from ground                         */
/* ------------------------------------------------------------------ */

function VoltTag({ x, y, text, tone = "on" }: { x: number; y: number; text: string; tone?: "on" | "dim" }) {
  const w = text.length * 8.4 + 16;
  return (
    <g>
      <rect
        x={x}
        y={y - 13}
        width={w}
        height={26}
        rx={5}
        fill="var(--color-panel)"
        stroke={tone === "on" ? "var(--color-on)" : "var(--color-off)"}
        strokeWidth={1.5}
      />
      <text
        x={x + w / 2}
        y={y + 5}
        textAnchor="middle"
        className="font-mono text-[14px] font-bold"
        fill={tone === "on" ? "var(--color-on)" : "var(--color-mute)"}
      >
        {text}
      </text>
    </g>
  );
}

export function GroundFigure() {
  // Two equal resistors in series on a 5 V battery, drawn upright on the right.
  const zig = (x: number, y: number) =>
    `M${x} ${y} v10 l9 5 l-18 10 l18 10 l-18 10 l18 10 l-18 10 l9 5 v10`;
  return (
    <Figure
      caption={
        <>
          The same loop, labelled with voltages. We choose the − end of the battery and call it <strong>0 V</strong>{" "}
          (ground, the ⏚ symbol). Every other point is measured from there, like heights measured from the floor. The
          push is used up step by step: 2.5 V in each resistor.
        </>
      }
    >
      <svg viewBox="0 0 560 260" className="mx-auto w-full max-w-[560px] min-w-[460px]" role="img" aria-label="A loop with voltages 5 V, 2.5 V and 0 V">
        <Wire d="M90 104 V40 H330 V60" on flow={false} />
        <Wire d={zig(330, 60)} on flow={false} />
        <Wire d="M330 140 V150" on flow={false} />
        <Wire d={zig(330, 150)} on flow={false} />
        <Wire d="M330 230 V236 H90 V146" on flow={false} />
        <Wire d="M210 236 V244" on flow={false} />
        <GroundSymbol x={210} y={246} />
        <text x={186} y={258} textAnchor="end" className="fill-mute font-sans text-[13px]">
          ground
        </text>
        <BatterySymbol x={90} y0={104} y1={146} label="5 V" on />
        <Junction x={330} y={145} on />
        <text x={350} y={104} className="fill-ink font-mono text-[13px]">
          100 Ω
        </text>
        <text x={350} y={194} className="fill-ink font-mono text-[13px]">
          100 Ω
        </text>
        <VoltTag x={190} y={40} text="5 V" />
        <VoltTag x={360} y={145} text="2.5 V" />
        <VoltTag x={250} y={236} text="0 V" tone="dim" />
        {/* a height ruler */}
        <g>
          <line x1={500} x2={500} y1={40} y2={236} stroke="var(--color-line-2)" strokeWidth={2} />
          {[
            [40, "5 V"],
            [145, "2.5 V"],
            [236, "0 V"],
          ].map(([y, t]) => (
            <g key={t as string}>
              <line x1={494} x2={506} y1={y as number} y2={y as number} stroke="var(--color-ink)" strokeWidth={2} />
              <text x={488} y={(y as number) + 5} textAnchor="end" className="fill-mute font-mono text-[13px]">
                {t}
              </text>
            </g>
          ))}
          <text
            x={524}
            y={138}
            textAnchor="middle"
            className="fill-dim font-sans text-[12px]"
            transform="rotate(-90 524 138)"
          >
            height above ground
          </text>
        </g>
      </svg>
    </Figure>
  );
}

/* ------------------------------------------------------------------ */
/* Static figure: a capacitor, and a transistor gate is one             */
/* ------------------------------------------------------------------ */

export function CapacitorFigure() {
  const minus = [110, 126, 142, 198, 214, 230];
  return (
    <Figure
      caption={
        <>
          Left: a capacitor is two metal plates with an insulator between them. The battery has pulled charge off the
          top plate (+) and piled electrons onto the bottom plate (−). Right: a transistor's gate has the same shape,
          so every gate is a tiny capacitor.
        </>
      }
    >
      <svg viewBox="0 0 600 230" className="mx-auto w-full min-w-[480px]" role="img" aria-label="A capacitor next to a transistor gate">
        {/* left: battery and capacitor */}
        <Wire d="M60 96 V40 H170 V80" on={false} />
        <Wire d="M60 138 V200 H170 V160" on={false} />
        <BatterySymbol x={60} y0={96} y1={138} label="1 V" />
        <rect x={100} y={80} width={140} height={10} rx={2} fill="var(--color-metal)" />
        <rect x={100} y={150} width={140} height={10} rx={2} fill="var(--color-metal)" />
        <rect x={100} y={90} width={140} height={60} fill="var(--color-oxide)" />
        <rect x={100} y={90} width={140} height={60} fill="url(#cap-hatch)" />
        <defs>
          <pattern id="cap-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line y2="6" stroke="var(--color-line-2)" strokeWidth="1" />
          </pattern>
        </defs>
        {minus.map((x) => (
          <g key={x}>
            <text x={x} y={76} textAnchor="middle" className="fill-amber font-mono text-[14px] font-bold">
              +
            </text>
            <circle cx={x} cy={170} r={4} fill="var(--color-cyan)" />
          </g>
        ))}
        <text x={250} y={89} className="fill-mute font-sans text-[12px]">
          metal plate
        </text>
        <text x={250} y={124} className="fill-mute font-sans text-[12px]">
          insulator
        </text>
        <text x={250} y={159} className="fill-mute font-sans text-[12px]">
          metal plate
        </text>
        <text x={170} y={194} textAnchor="middle" className="fill-cyan font-sans text-[12px] font-semibold">
          extra electrons
        </text>

        {/* equals sign */}
        <text x={352} y={128} textAnchor="middle" className="fill-dim font-display text-[30px]">
          ≈
        </text>

        {/* right: a transistor gate */}
        <rect x={400} y={70} width={150} height={26} rx={3} fill="var(--color-si-gate)" stroke="var(--color-off)" />
        <rect x={400} y={96} width={150} height={12} fill="var(--color-oxide)" />
        <rect x={400} y={96} width={150} height={12} fill="url(#cap-hatch)" />
        <rect x={386} y={108} width={178} height={70} rx={4} fill="var(--color-si-p)" stroke="var(--color-si-p-edge)" />
        <line x1={475} x2={475} y1={40} y2={70} className="wire" />
        <text x={475} y={34} textAnchor="middle" className="fill-mute font-sans text-[12px]">
          from the previous gate
        </text>
        <text x={475} y={88} textAnchor="middle" className="fill-ink font-sans text-[12px] font-semibold">
          gate: metal plate
        </text>
        <text x={475} y={128} textAnchor="middle" className="fill-mute font-sans text-[12px]">
          ↑ thin glass: insulator
        </text>
        <text x={475} y={160} textAnchor="middle" className="fill-violet font-sans text-[12px] font-semibold">
          silicon: the other plate
        </text>
        <text x={475} y={208} textAnchor="middle" className="fill-dim font-sans text-[12px]">
          (see The Transistor)
        </text>
      </svg>
    </Figure>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Fill the bucket: charging a capacitor through a resistor          */
/* ------------------------------------------------------------------ */

const R_STEPS = [1, 2, 5, 10, 20, 50, 100]; // kΩ
const C_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10]; // fF
const T_MAX = 100; // ps shown on the chart

export function ChargeBucket() {
  const [ri, setRi] = useState(3);
  const [ci, setCi] = useState(3);
  const [period, setPeriod] = useState(15);
  const [hover, setHover] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(1);
  const reduced = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);

  const R = R_STEPS[ri];
  const C = C_STEPS[ci];
  const tau = R * C; // kΩ × fF = ps
  const t50 = Math.LN2 * tau;
  const volt = (t: number) => 1 - Math.exp(-t / tau);
  const vTick = volt(period);
  const ok = vTick >= 0.5;
  const tNow = playing ? prog * period : period;
  const vNow = volt(tNow);
  const fullElectrons = (C * 1e-15 * 1) / E_CHARGE;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let start: number | null = null;
    const loop = (now: number) => {
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / 2500);
      setProg(p);
      if (p < 1) raf = requestAnimationFrame(loop);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  /* chart geometry (viewBox 600 × 260) */
  const X0 = 56;
  const X1 = 586;
  const Y0 = 24;
  const Y1 = 206;
  const xs = (t: number) => X0 + (Math.min(t, T_MAX) / T_MAX) * (X1 - X0);
  const ys = (v: number) => Y1 - v * (Y1 - Y0);

  const samples: number[] = [];
  for (let k = 0; k <= 300; k++) samples.push((k / 300) * T_MAX);
  for (let k = 1; k <= 60; k++) {
    const t = (k / 10) * tau;
    if (t < T_MAX) samples.push(t);
  }
  samples.sort((p, q) => p - q);
  const curve = samples.map((t, k) => `${k ? "L" : "M"}${xs(t).toFixed(1)} ${ys(volt(t)).toFixed(1)}`).join(" ");

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const el = svgRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 600;
    if (x < X0 || x > X1) return setHover(null);
    setHover(((x - X0) / (X1 - X0)) * T_MAX);
  };

  const tickX = xs(period);
  const tickTone = ok ? "var(--color-ink)" : "var(--color-pink)";
  const t50Label = `flips after ${sig(t50, 2)} ps`;
  const t50LabelLeft = xs(t50) > X1 - 130;

  /* bucket drawing (viewBox 250 × 260) */
  const pipeW = 14 - 4.5 * Math.log10(R); // 14 → 5 units: a narrow pipe = big resistance
  const bucketW = 44 + 22 * Math.log10(C / 0.1); // 44 → 88 units: a wide bucket = big capacitance
  const BCX = 196; // bucket centre x
  const bx0 = BCX - bucketW / 2;
  const BT = 70; // bucket top
  const BB = 210; // bucket bottom
  const level = BB - vNow * (BB - BT);

  return (
    <Widget
      wide
      title="Fill the bucket: why a switch takes time"
      subtitle="A gate's output fills the next gate's input (a tiny capacitor) through a transistor (a resistor). Change R and C, then set when the next clock tick comes."
    >
      <div className="grid gap-5 md:grid-cols-[230px_1fr]">
        <div>
          <svg viewBox="0 0 250 262" className="mx-auto w-full max-w-[260px]" role="img" aria-label={`Bucket ${Math.round(vNow * 100)} percent full`}>
            {/* supply tank: always full (1 V) */}
            <rect x={6} y={70} width={50} height={140} rx={3} fill="var(--color-cyan-tint)" stroke="var(--color-line-2)" />
            <rect x={6} y={70} width={50} height={140} rx={3} fill="var(--color-cyan)" opacity={0.28} />
            <text x={31} y={58} textAnchor="middle" className="fill-ink font-sans text-[13px] font-semibold">
              supply
            </text>
            <text x={31} y={146} textAnchor="middle" className="fill-ink font-mono text-[14px] font-bold">
              1 V
            </text>
            {/* pipe */}
            <rect
              x={56}
              y={BB - 8 - pipeW}
              width={bx0 - 56}
              height={pipeW}
              fill="var(--color-cyan)"
              opacity={0.45}
            />
            <line x1={56} x2={bx0} y1={BB - 8 - pipeW} y2={BB - 8 - pipeW} stroke="var(--color-ink)" strokeWidth={1.5} />
            <line x1={56} x2={bx0} y1={BB - 8} y2={BB - 8} stroke="var(--color-ink)" strokeWidth={1.5} />
            <text x={86} y={BB + 22} textAnchor="middle" className="fill-ink font-mono text-[13px] font-semibold">
              R = {R} kΩ
            </text>
            <text x={86} y={BB + 40} textAnchor="middle" className="fill-mute font-sans text-[12px]">
              narrow pipe
            </text>
            {/* bucket */}
            <rect x={bx0} y={level} width={bucketW} height={BB - level} fill="var(--color-cyan)" opacity={0.45} />
            <path
              d={`M${bx0} ${BT} V${BB} H${bx0 + bucketW} V${BT}`}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth={2}
            />
            <line
              x1={bx0 - 6}
              x2={bx0 + bucketW + 6}
              y1={(BT + BB) / 2}
              y2={(BT + BB) / 2}
              stroke="var(--color-amber)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text x={BCX} y={BT - 30} textAnchor="middle" className="fill-ink font-mono text-[13px] font-semibold">
              C = {C} fF
            </text>
            <text x={BCX} y={BT - 13} textAnchor="middle" className="fill-mute font-sans text-[12px]">
              next gate
            </text>
            <text x={BCX} y={BB + 22} textAnchor="middle" className="fill-ink font-mono text-[13px] font-bold">
              {vNow.toFixed(2)} V
            </text>
            <text x={BCX} y={BB + 40} textAnchor="middle" className="fill-mute font-sans text-[12px]">
              {Math.round(vNow * 100)}% full
            </text>
          </svg>
        </div>

        <div className="min-w-0">
          <div className="scroll-thin overflow-x-auto">
            <svg
              ref={svgRef}
              viewBox="0 0 600 262"
              className="w-full min-w-[520px] touch-none"
              role="img"
              aria-label={`Voltage of the next gate over time. Time constant ${sig(tau)} picoseconds.`}
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => setHover(null)}
            >
              {/* grid */}
              {[0, 0.5, 1].map((v) => (
                <g key={v}>
                  <line
                    x1={X0}
                    x2={X1}
                    y1={ys(v)}
                    y2={ys(v)}
                    stroke={v === 0.5 ? "var(--color-amber)" : "var(--color-line)"}
                    strokeWidth={v === 0.5 ? 1.5 : 1}
                    strokeDasharray={v === 0.5 ? "6 5" : undefined}
                  />
                  <text x={X0 - 8} y={ys(v) + 4} textAnchor="end" className="fill-mute font-mono text-[13px]">
                    {v} V
                  </text>
                </g>
              ))}
              {[0, 20, 40, 60, 80, 100].map((t) => (
                <g key={t}>
                  <line x1={xs(t)} x2={xs(t)} y1={Y1} y2={Y1 + 5} stroke="var(--color-line-2)" />
                  <text x={xs(t)} y={Y1 + 21} textAnchor="middle" className="fill-mute font-mono text-[13px]">
                    {t}
                  </text>
                </g>
              ))}
              <text x={(X0 + X1) / 2} y={Y1 + 44} textAnchor="middle" className="fill-dim font-sans text-[13px]">
                time after the switch flips (picoseconds, ps)
              </text>

              {/* the clock tick */}
              <line x1={tickX} x2={tickX} y1={Y0 - 4} y2={Y1} stroke={tickTone} strokeWidth={2} />
              {/* the curve */}
              <path d={curve} fill="none" stroke="var(--color-cyan)" strokeWidth={2.25} />

              {/* τ and 3τ marks */}
              {[
                [tau, "τ"],
                [3 * tau, "3τ"],
              ].map(([t, name]) =>
                (t as number) <= T_MAX && (t as number) >= 4 ? (
                  <g key={name as string}>
                    <circle
                      cx={xs(t as number)}
                      cy={ys(volt(t as number))}
                      r={4}
                      fill="var(--color-cyan)"
                      stroke="var(--color-panel)"
                      strokeWidth={2}
                    />
                    <text
                      x={xs(t as number) + 7}
                      y={ys(volt(t as number)) + 17}
                      className="fill-ink font-mono text-[13px] font-semibold"
                      stroke="var(--color-panel)"
                      strokeWidth={4}
                      paintOrder="stroke"
                    >
                      {name}
                    </text>
                  </g>
                ) : null,
              )}

              {/* 50% crossing */}
              {t50 <= T_MAX && (
                <g>
                  <circle cx={xs(t50)} cy={ys(0.5)} r={5} fill="var(--color-amber)" stroke="var(--color-panel)" strokeWidth={2} />
                  <text
                    x={t50LabelLeft ? xs(t50) - 9 : xs(t50) + 9}
                    y={ys(0.5) + 20}
                    textAnchor={t50LabelLeft ? "end" : "start"}
                    className="fill-amber font-sans text-[13px] font-semibold"
                    stroke="var(--color-panel)"
                    strokeWidth={5}
                    paintOrder="stroke"
                  >
                    {t50Label}
                  </text>
                </g>
              )}

              <circle cx={tickX} cy={ys(vTick)} r={5} fill={tickTone} stroke="var(--color-panel)" strokeWidth={2} />
              <text
                x={tickX > X1 - 70 ? tickX - 6 : tickX + 6}
                y={Y0 + 6}
                textAnchor={tickX > X1 - 70 ? "end" : "start"}
                className="font-sans text-[13px] font-bold"
                fill={tickTone}
              >
                tick {ok ? "✓" : "✗"}
              </text>

              {/* slow-motion cursor */}
              {playing && (
                <line x1={xs(tNow)} x2={xs(tNow)} y1={Y0} y2={Y1} stroke="var(--color-cyan)" strokeWidth={1.5} strokeDasharray="3 3" />
              )}

              {/* hover read-out */}
              {hover !== null && (
                <g pointerEvents="none">
                  <line x1={xs(hover)} x2={xs(hover)} y1={Y0} y2={Y1} stroke="var(--color-dim)" strokeWidth={1} />
                  <circle cx={xs(hover)} cy={ys(volt(hover))} r={4} fill="var(--color-ink)" />
                  {(() => {
                    const text = `${sig(hover, 2)} ps: ${volt(hover).toFixed(2)} V`;
                    const w = text.length * 7.9 + 14;
                    const left = xs(hover) + w + 10 > X1;
                    const bx = left ? xs(hover) - w - 8 : xs(hover) + 8;
                    const by = ys(volt(hover)) > Y0 + 60 ? ys(volt(hover)) - 40 : ys(volt(hover)) + 12;
                    return (
                      <g>
                        <rect x={bx} y={by} width={w} height={24} rx={4} fill="var(--color-panel)" stroke="var(--color-line-2)" />
                        <text x={bx + 7} y={by + 17} className="fill-ink font-mono text-[13px]">
                          {text}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}
            </svg>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 font-sans text-xs text-mute">
            <span className="flex items-center gap-1.5">
              <svg width="22" height="8" aria-hidden>
                <line x1="0" x2="22" y1="4" y2="4" stroke="var(--color-amber)" strokeWidth="1.5" strokeDasharray="6 5" />
              </svg>
              0.5 V: the next gate flips from 0 to 1 here
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="10" height="10" aria-hidden>
                <circle cx="5" cy="5" r="4" fill="var(--color-cyan)" />
              </svg>
              τ = 63% full, 3τ = 95% full
            </span>
            <span>Point at the curve to read it.</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Slider
          label="Resistance R (the “on” transistor)"
          min={0}
          max={R_STEPS.length - 1}
          value={ri}
          onChange={setRi}
          format={(k) => `${R_STEPS[k]} kΩ`}
        />
        <Slider
          label="Capacitance C (the next gate)"
          min={0}
          max={C_STEPS.length - 1}
          value={ci}
          onChange={setCi}
          format={(k) => `${C_STEPS[k]} fF`}
        />
        <Slider
          className="sm:col-span-2"
          label="Next clock tick comes after"
          min={1}
          max={T_MAX}
          value={period}
          onChange={setPeriod}
          format={(t) => `${t} ps  (a ${sig(1000 / t)} GHz clock)`}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Time constant" value={`τ = ${sig(tau)} ps`} sub={`τ = R × C = ${R} kΩ × ${C} fF`} />
        <Stat label="Next gate flips after" value={`${sig(t50, 2)} ps`} tone="amber" sub="0.69 × τ" />
        <Stat
          label="Electrons when full"
          value={`≈ ${sig(fullElectrons, 2)}`}
          sub={`C × 1 V ÷ 1.6 × 10⁻¹⁹ C`}
        />
        <Stat
          label="Fastest clock, 1 gate"
          value={`${sig(1000 / t50, 2)} GHz`}
          sub={`1 ÷ ${sig(t50, 2)} ps`}
        />
      </div>

      <div
        className={cx(
          "mt-4 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2.5",
          ok ? "border-line-2 bg-panel-2" : "border-pink bg-pink-tint",
        )}
        aria-live="polite"
      >
        <Pill tone={ok ? "on" : "pink"}>{ok ? "✓ correct" : "✗ wrong answer"}</Pill>
        <span className={cx("min-w-0 flex-1 font-serif text-[0.9375rem]", ok ? "text-body" : "text-pink")}>
          {ok ? (
            <>
              At the tick the bucket is {Math.round(vTick * 100)}% full ({vTick.toFixed(2)} V), past the 0.5 V line. The
              next gate reads a <strong>1</strong>, as it should.
            </>
          ) : (
            <>
              At the tick the bucket is only {Math.round(vTick * 100)}% full ({vTick.toFixed(2)} V). The next gate
              still reads a <strong>0</strong>, so the computer stores a wrong bit. Move the tick later (a slower clock)
              or make R or C smaller.
            </>
          )}
        </span>
        {!reduced && (
          <Btn
            onClick={() => {
              setProg(0);
              setPlaying(true);
            }}
            disabled={playing}
          >
            ▶ Fill in slow motion
          </Btn>
        )}
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Relay to gate                                                     */
/* ------------------------------------------------------------------ */

const ARM_LEN = 104;
const OPEN_DEG = 15;

/** 0 = arm up (open), 1 = arm down (closed). Moves slowly so you can see the click. */
function useArm(target: boolean, reduced: boolean) {
  const [pos, setPos] = useState(target ? 1 : 0);
  const posRef = useRef(pos);
  useEffect(() => {
    const goal = target ? 1 : 0;
    if (reduced) {
      posRef.current = goal;
      setPos(goal);
      return;
    }
    let raf = 0;
    let last: number | null = null;
    const step = (now: number) => {
      const dt = last === null ? 0 : (now - last) / 1000;
      last = now;
      const speed = target ? 1 / 0.4 : 1 / 0.25; // slow motion: a real arm takes about 5 ms
      let p = posRef.current + (goal > posRef.current ? 1 : -1) * speed * dt;
      p = clamp(p, 0, 1);
      posRef.current = p;
      setPos(p);
      if (p !== goal) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);
  return pos;
}

function zigzag(ax: number, ay: number, bx: number, by: number, n = 7, amp = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  let d = `M${ax} ${ay}`;
  for (let k = 1; k < n; k++) {
    const f = k / n;
    const s = k % 2 ? amp : -amp;
    d += ` L${(ax + dx * f + nx * s).toFixed(1)} ${(ay + dy * f + ny * s).toFixed(1)}`;
  }
  return `${d} L${bx} ${by}`;
}

/**
 * One relay. (px, py) is where the output wire meets the hinge post.
 * The output leaves the fixed contact at (px + 110, py). The coil's input
 * switch sits below-left, fed from a "+5 V" connection; the coil returns to ground.
 */
function Relay({
  px,
  py,
  name,
  input,
  pos,
  live,
  onToggle,
}: {
  px: number;
  py: number;
  name: string;
  input: boolean;
  pos: number;
  live: boolean;
  onToggle: () => void;
}) {
  const ease = pos * pos;
  const ang = (OPEN_DEG * (1 - ease) * Math.PI) / 180;
  const P: Pt = [px, py - 8];
  const tip: Pt = [P[0] + ARM_LEN * Math.cos(ang), P[1] - ARM_LEN * Math.sin(ang)];
  const att: Pt = [P[0] + 86 * Math.cos(ang), P[1] - 86 * Math.sin(ang)];
  const yi = py + 66; // input wire level
  const coilOn = input;
  const armColor = live ? "var(--color-on)" : "var(--color-metal-2)";
  const coilStroke = coilOn ? "var(--color-on)" : "var(--color-off)";
  return (
    <g>
      {/* magnetic field */}
      {coilOn && (
        <g fill="none" stroke="var(--color-violet)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.9}>
          <path d={`M${px + 52} ${py + 2} C ${px + 14} ${py + 2}, ${px + 14} ${py + 60}, ${px + 52} ${py + 60}`} />
          <path d={`M${px + 52} ${py + 2} C ${px + 90} ${py + 2}, ${px + 90} ${py + 60}, ${px + 52} ${py + 60}`} />
        </g>
      )}
      {/* iron core and coil */}
      <rect x={px + 45} y={py + 3} width={14} height={56} rx={2} fill="var(--color-metal)" />
      <rect
        x={px + 35}
        y={py + 12}
        width={34}
        height={38}
        rx={4}
        fill="var(--color-panel-2)"
        stroke={coilStroke}
        strokeWidth={1.5}
      />
      {[0, 1, 2, 3, 4, 5, 6].map((k) => (
        <line
          key={k}
          x1={px + 35}
          x2={px + 69}
          y1={py + 15 + k * 5}
          y2={py + 19 + k * 5}
          stroke={coilStroke}
          strokeWidth={coilOn ? 2 : 1.5}
        />
      ))}
      {/* coil leads: input on the left, ground on the right */}
      <Wire d={`M${px - 10} ${yi} H${px + 40} V${py + 50}`} on={coilOn} flow={false} />
      <Wire d={`M${px + 64} ${py + 50} V${py + 72}`} on={coilOn} flow={false} />
      <GroundSymbol x={px + 64} y={py + 73} />
      {/* input switch + supply */}
      <Wire d={`M${px - 66} ${yi} H${px - 50}`} on={coilOn} flow={false} />
      <circle cx={px - 68} cy={yi} r={4} fill="var(--color-panel)" stroke="var(--color-ink)" strokeWidth={1.5} />
      <text x={px - 76} y={yi + 5} textAnchor="end" className="fill-ink font-mono text-[13px] font-semibold">
        +5 V
      </text>
      <g
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        aria-pressed={input}
        aria-label={`Input ${name}: ${input ? "on" : "off"}. Click to flip.`}
        onClick={onToggle}
        onKeyDown={keyActivate(onToggle)}
      >
        <rect x={px - 58} y={yi - 44} width={56} height={56} fill="transparent" />
        <circle cx={px - 50} cy={yi} r={4} fill={coilOn ? "var(--color-on)" : "var(--color-ink)"} />
        <circle cx={px - 10} cy={yi} r={4} fill={coilOn ? "var(--color-on)" : "var(--color-ink)"} />
        <line
          x1={px - 50}
          y1={yi}
          x2={input ? px - 10 : px - 15}
          y2={input ? yi : yi - 20}
          stroke={coilOn ? "var(--color-on)" : "var(--color-ink)"}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <text
          x={px - 30}
          y={yi - 28}
          textAnchor="middle"
          className="font-mono text-[13px] font-bold"
          fill={input ? "var(--color-on)" : "var(--color-mute)"}
        >
          {name} = {input ? 1 : 0}
        </text>
      </g>
      {/* spring and its anchor */}
      <line x1={px + 74} x2={px + 98} y1={py - 48} y2={py - 48} stroke="var(--color-metal-2)" strokeWidth={4} strokeLinecap="round" />
      <path d={zigzag(px + 86, py - 48, att[0], att[1])} fill="none" stroke="var(--color-dim)" strokeWidth={1.5} />
      {/* hinge post, fixed contact, arm */}
      <line x1={px} y1={py} x2={px} y2={py - 8} stroke={armColor} strokeWidth={5} />
      <rect x={px + 98} y={py - 5} width={12} height={8} rx={1.5} fill={live ? "var(--color-on)" : "var(--color-metal)"} />
      <line x1={P[0]} y1={P[1]} x2={tip[0]} y2={tip[1]} stroke={armColor} strokeWidth={5} strokeLinecap="round" />
      <circle cx={P[0]} cy={P[1]} r={4.5} fill="var(--color-panel)" stroke={armColor} strokeWidth={2} />
    </g>
  );
}

type RelayMode = "one" | "series" | "parallel";

export function RelayLab() {
  const [mode, setMode] = useState<RelayMode>("one");
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const reduced = useReducedMotion();
  const posA = useArm(a, reduced);
  const posB = useArm(b, reduced);
  const closedA = posA >= 1;
  const closedB = posB >= 1;

  const lit = mode === "one" ? closedA : mode === "series" ? closedA && closedB : closedA || closedB;
  const logic = mode === "one" ? a : mode === "series" ? a && b : a || b;

  const RY = 84;
  const BY = mode === "parallel" ? 336 : 196;
  const LAMP_X = 560;
  const lampY = (RY + BY) / 2;
  const H = BY + 14;

  let body: ReactNode;
  if (mode === "one") {
    const px = 250;
    body = (
      <>
        <Wire d={`M60 ${RY} H${px}`} on={lit} flow={false} />
        <Wire d={`M${px + 110} ${RY} H${LAMP_X} V${lampY - 17}`} on={lit} flow={false} />
        <Relay px={px} py={RY} name="A" input={a} pos={posA} live={lit} onToggle={() => setA(!a)} />
      </>
    );
  } else if (mode === "series") {
    const pa = 220;
    const pb = 410;
    body = (
      <>
        <Wire d={`M60 ${RY} H${pa}`} on={lit} flow={false} />
        <Wire d={`M${pa + 110} ${RY} H${pb}`} on={lit} flow={false} />
        <Wire d={`M${pb + 110} ${RY} H${LAMP_X} V${lampY - 17}`} on={lit} flow={false} />
        <Relay px={pa} py={RY} name="A" input={a} pos={posA} live={lit} onToggle={() => setA(!a)} />
        <Relay px={pb} py={RY} name="B" input={b} pos={posB} live={lit} onToggle={() => setB(!b)} />
      </>
    );
  } else {
    const px = 270;
    const yB = 232;
    const n1 = 140;
    const n2 = 440;
    body = (
      <>
        <Wire d={`M60 ${RY} H${n1}`} on={lit} flow={false} />
        <Wire d={`M${n1} ${RY} H${px}`} on={closedA} flow={false} />
        <Wire d={`M${n1} ${RY} V${yB} H${px}`} on={closedB} flow={false} />
        <Wire d={`M${px + 110} ${RY} H${n2}`} on={closedA} flow={false} />
        <Wire d={`M${px + 110} ${yB} H${n2} V${RY}`} on={closedB} flow={false} />
        <Wire d={`M${n2} ${RY} H${LAMP_X} V${lampY - 17}`} on={lit} flow={false} />
        <Junction x={n1} y={RY} on={lit} />
        <Junction x={n2} y={RY} on={lit} />
        <Relay px={px} py={RY} name="A" input={a} pos={posA} live={closedA} onToggle={() => setA(!a)} />
        <Relay px={px} py={yB} name="B" input={b} pos={posB} live={closedB} onToggle={() => setB(!b)} />
      </>
    );
  }

  const rows =
    mode === "one"
      ? [
          [0, 0],
          [1, 1],
        ].map(([x, out]) => [x, out])
      : [0, 1, 2, 3].map((r) => {
          const x = (r >> 1) & 1;
          const y = r & 1;
          return [x, y, mode === "series" ? x & y : x | y];
        });
  const hl = mode === "one" ? (a ? 1 : 0) : (a ? 2 : 0) + (b ? 1 : 0);
  const bit = (v: number, lamp?: boolean) => (
    <span className={v ? cx("font-bold", lamp ? "text-amber" : "text-on") : "text-dim"}>{v}</span>
  );

  return (
    <Widget
      wide
      title="The relay: a switch flipped by electricity"
      subtitle="Click the input switch. Current in the coil makes a magnet, the magnet pulls the arm down, and the arm closes a second circuit with a lamp. The movement is shown in slow motion."
    >
      <Segmented
        value={mode}
        onChange={(m) => setMode(m)}
        options={[
          { value: "one", label: "One relay" },
          { value: "series", label: "Two in a row" },
          { value: "parallel", label: "Two side by side" },
        ]}
      />
      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[1fr_230px]">
        <div className="scroll-thin overflow-x-auto">
          <svg
            viewBox={`0 0 600 ${H}`}
            className="w-full min-w-[540px]"
            role="img"
            aria-label={`Relay circuit, lamp ${lit ? "on" : "off"}`}
          >
            <CircuitDefs />
            {body}
            <Wire d={`M${LAMP_X} ${lampY + 17} V${BY} H60 V${(RY + BY) / 2 + 21}`} on={lit} flow={false} />
            <Wire d={`M60 ${(RY + BY) / 2 - 21} V${RY}`} on={lit} flow={false} />
            <BatterySymbol x={60} y0={(RY + BY) / 2 - 21} y1={(RY + BY) / 2 + 21} label="9 V" on={lit} />
            <Lamp x={LAMP_X} y={lampY} on={lit} r={16} />
            <text x={LAMP_X - 26} y={lampY + 5} textAnchor="end" className="fill-mute font-sans text-[13px]">
              lamp
            </text>
          </svg>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Btn active={a} onClick={() => setA(!a)}>
              Input A = {a ? 1 : 0}
            </Btn>
            {mode !== "one" && (
              <Btn active={b} onClick={() => setB(!b)}>
                B = {b ? 1 : 0}
              </Btn>
            )}
          </div>
          <DataTable
            head={mode === "one" ? ["A", "lamp"] : ["A", "B", "lamp"]}
            highlight={hl}
            rows={rows.map((r) => r.map((v, k) => bit(v, k === r.length - 1)))}
          />
          <p className="font-serif text-[0.9375rem] text-mute">
            {mode === "one" && "The lamp copies the input. But the input circuit and the lamp circuit never touch: only the magnet links them."}
            {mode === "series" && "The lamp's current must pass through both arms, so it lights only if A AND B are 1."}
            {mode === "parallel" && "The lamp's current can take either arm, so it lights if A OR B (or both) is 1."}
            {logic !== lit && <span className="text-ink"> The arm is still moving…</span>}
          </p>
        </div>
      </div>
      <p className="mt-3 font-sans text-xs text-dim">
        “+5 V” and ⏚ are the two ends of a small 5 V battery that powers the coils, drawn the way engineers draw it.
      </p>
      <SpeedLadder />
    </Widget>
  );
}

/* A log-scale bar chart: switches per second for relay, tube, transistor. */
function SpeedLadder() {
  const rows = [
    { name: "Relay", time: "about 5 ms per flip", rate: 200, label: "200 per second" },
    { name: "Vacuum tube", time: "about 1 µs per flip", rate: 1e6, label: "1 million per second" },
    { name: "Transistor", time: "about 10 ps per flip", rate: 1e11, label: "100 billion per second" },
  ];
  const X0 = 170;
  const X1 = 745;
  const xs = (lg: number) => X0 + (lg / 12) * (X1 - X0);
  const ticks: Array<[number, string]> = [
    [0, "1"],
    [3, "1,000"],
    [6, "1 million"],
    [9, "1 billion"],
    [12, "1 trillion"],
  ];
  return (
    <div className="mt-6 border-t border-line pt-4">
      <div className="label-caps mb-1 text-dim">How many times per second can each switch flip?</div>
      <p className="mb-2 font-serif text-[0.9375rem] text-mute">
        Each grid line is 10 times more than the one before it (a <em>log scale</em>). On a normal scale the relay
        bar would be far too thin to see.
      </p>
      <div className="scroll-thin overflow-x-auto">
        <svg viewBox="0 0 760 200" className="w-full min-w-[600px]" role="img" aria-label="Relay 200, vacuum tube 1 million, transistor 100 billion switches per second">
          {Array.from({ length: 13 }, (_, k) => (
            <line
              key={k}
              x1={xs(k)}
              x2={xs(k)}
              y1={14}
              y2={160}
              stroke={k % 3 === 0 ? "var(--color-line-2)" : "var(--color-line)"}
              strokeWidth={1}
            />
          ))}
          {ticks.map(([k, t]) => (
            <text
              key={k}
              x={xs(k)}
              y={178}
              textAnchor={k === 0 ? "start" : k === 12 ? "end" : "middle"}
              className="fill-mute font-mono text-[14px]"
            >
              {t}
            </text>
          ))}
          {rows.map((r, i) => {
            const y = 26 + i * 46;
            const end = xs(Math.log10(r.rate));
            const inside = end > 420;
            return (
              <g key={r.name}>
                <title>{`${r.name}: ${r.time}, ${r.label}`}</title>
                <text x={0} y={y + 6} className="fill-ink font-sans text-[15px] font-semibold">
                  {r.name}
                </text>
                <text x={0} y={y + 24} className="fill-mute font-sans text-[14px]">
                  {r.time}
                </text>
                <path
                  d={`M${X0} ${y - 2} H${end - 4} Q${end} ${y - 2} ${end} ${y + 2} V${y + 14} Q${end} ${y + 18} ${end - 4} ${y + 18} H${X0} Z`}
                  fill="var(--color-cyan)"
                />
                <text
                  x={inside ? end - 8 : end + 8}
                  y={y + 13}
                  textAnchor={inside ? "end" : "start"}
                  className="font-mono text-[14px] font-semibold"
                  fill={inside ? "var(--color-panel)" : "var(--color-ink)"}
                  stroke={inside ? undefined : "var(--color-panel)"}
                  strokeWidth={inside ? undefined : 5}
                  paintOrder="stroke"
                >
                  {r.label}
                </text>
              </g>
            );
          })}
          <text x={X1} y={197} textAnchor="end" className="fill-dim font-sans text-[13px]">
            flips per second →
          </text>
        </svg>
      </div>
    </div>
  );
}
