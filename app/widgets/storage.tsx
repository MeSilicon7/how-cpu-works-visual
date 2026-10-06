import { useId, useMemo, useRef, useState, type ReactNode } from "react";

import { TeX } from "~/components/tex";
import { BitButton, Btn, cx, DataTable, Pill, Segmented, Slider, Stat, Widget } from "~/components/ui";
import { useAnimationTime } from "~/lib/hooks";

/* ------------------------------------------------------------------ */
/* The memory hierarchy, on a log scale and in human time                */
/* ------------------------------------------------------------------ */

interface Level {
  name: string;
  size: string;
  latency: number; // seconds
  tech: string;
}

const levels: Level[] = [
  { name: "Register", size: "~1 KB", latency: 0.3e-9, tech: "flip-flops inside the core" },
  { name: "L1 cache", size: "64 KB", latency: 1e-9, tech: "SRAM, 6 transistors per bit" },
  { name: "L2 cache", size: "1–2 MB", latency: 4e-9, tech: "SRAM" },
  { name: "L3 cache", size: "32 MB", latency: 12e-9, tech: "SRAM, shared by all cores" },
  { name: "RAM", size: "16 GB", latency: 80e-9, tech: "DRAM: capacitor + transistor" },
  { name: "SSD", size: "1 TB", latency: 80e-6, tech: "flash: trapped electrons" },
  { name: "Hard drive", size: "4 TB", latency: 8e-3, tech: "magnetised spots on a spinning disk" },
  { name: "Internet (far away)", size: "∞", latency: 150e-3, tech: "a server on another continent" },
];

const CYCLE = 0.3e-9; // one tick of a ~3.3 GHz CPU

export function humanTime(s: number): string {
  const units: Array<[number, string]> = [
    [365 * 24 * 3600, "year"],
    [30 * 24 * 3600, "month"],
    [24 * 3600, "day"],
    [3600, "hour"],
    [60, "minute"],
    [1, "second"],
  ];
  for (const [u, name] of units) {
    if (s >= u * 0.95) {
      const v = s / u;
      const r = v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
      return `${r} ${name}${r === 1 ? "" : "s"}`;
    }
  }
  return `${s.toFixed(2)} seconds`;
}

export function realTime(s: number): string {
  if (s < 1e-6) return `${+(s * 1e9).toPrecision(2)} ns`;
  if (s < 1e-3) return `${+(s * 1e6).toPrecision(2)} µs`;
  if (s < 1) return `${+(s * 1e3).toPrecision(3)} ms`;
  return `${s} s`;
}

export function HierarchyChart() {
  const [mode, setMode] = useState<"human" | "real">("human");
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const rowH = 34;
  const left = 132;
  const right = 120;
  const top = 26;
  const H = top + levels.length * rowH + 8;
  const lo = -10; // 0.1 ns
  const hi = 0; // 1 s
  const x = (s: number) => left + ((Math.log10(s) - lo) / (hi - lo)) * (W - left - right);
  const ticks = [
    { e: -9, label: "1 ns" },
    { e: -6, label: "1 µs" },
    { e: -3, label: "1 ms" },
    { e: 0, label: "1 s" },
  ];

  return (
    <Widget
      title="The speed ladder"
      subtitle="How long does it take to fetch one piece of data from each place? Bars use a log scale: each labelled gridline is 1,000× slower than the one before."
      wide
    >
      <Segmented
        size="sm"
        value={mode}
        onChange={setMode}
        options={[
          { value: "human", label: "If 1 CPU tick = 1 second" },
          { value: "real", label: "Real time" },
        ]}
      />
      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Memory latency by level, log scale">
          {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((e) => (
            <line
              key={e}
              x1={x(10 ** e)}
              x2={x(10 ** e)}
              y1={top - 6}
              y2={H - 4}
              stroke="var(--color-line)"
              strokeWidth={ticks.some((t) => t.e === e) ? 1 : 0.5}
              opacity={ticks.some((t) => t.e === e) ? 1 : 0.5}
            />
          ))}
          {ticks.map((t) => (
            <text key={t.e} x={x(10 ** t.e)} y={14} textAnchor="middle" className="fill-dim font-mono text-[11px]">
              {t.label}
            </text>
          ))}
          {levels.map((l, i) => {
            const y = top + i * rowH + (rowH - 18) / 2;
            const x1 = x(l.latency);
            const dim = hover !== null && hover !== i;
            const label = mode === "human" ? humanTime(l.latency / CYCLE) : realTime(l.latency);
            return (
              <g
                key={l.name}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover(i)}
                className="cursor-default"
              >
                <rect x={0} y={top + i * rowH} width={W} height={rowH} fill="transparent" />
                <text x={left - 10} y={y + 13} textAnchor="end" className="fill-ink text-[12px]">
                  {l.name}
                </text>
                <path
                  d={`M${left} ${y} H${x1 - 4} a4 4 0 0 1 4 4 V${y + 14} a4 4 0 0 1 -4 4 H${left} Z`}
                  fill="var(--color-violet)"
                  opacity={dim ? 0.3 : 0.9}
                  style={{ transition: "opacity .15s" }}
                />
                <text x={x1 + 8} y={y + 13} className="fill-mute font-mono text-[11px]">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-2 right-2 w-60 rounded-xl border border-line-2 bg-panel-2/95 p-3 text-xs shadow-xl backdrop-blur">
            <div className="font-semibold text-ink">{levels[hover].name}</div>
            <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-mute">
              <span>real time</span>
              <span className="font-mono text-ink">{realTime(levels[hover].latency)}</span>
              <span>CPU ticks</span>
              <span className="font-mono text-ink">{Math.round(levels[hover].latency / CYCLE).toLocaleString()}</span>
              <span>human scale</span>
              <span className="font-mono text-ink">{humanTime(levels[hover].latency / CYCLE)}</span>
              <span>typical size</span>
              <span className="font-mono text-ink">{levels[hover].size}</span>
              <span>made of</span>
              <span className="text-ink">{levels[hover].tech}</span>
            </div>
          </div>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-mute hover:text-ink">Show as a table</summary>
        <DataTable
          className="mt-2"
          align="left"
          head={["level", "typical size", "latency", "CPU ticks", "if 1 tick = 1 s"]}
          rows={levels.map((l) => [
            l.name,
            l.size,
            realTime(l.latency),
            Math.round(l.latency / CYCLE).toLocaleString(),
            humanTime(l.latency / CYCLE),
          ])}
        />
      </details>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* DRAM: leaky buckets that must be refreshed                            */
/* ------------------------------------------------------------------ */

const TAU = 0.144; // seconds of simulated time: charge halves after 100 ms
const SIM_PER_REAL = 0.02; // 1 real second = 20 ms simulated
const REFRESH = 0.064;

export function DramLeak() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const t = useAnimationTime(true);
  const simNow = t * SIM_PER_REAL;
  const state = useRef({ written: [1, 0, 1, 1], charge: [1, 0, 1, 1], at: 0, lastRefresh: 0, flash: -1 });
  const st = state.current;

  // Advance the model to "now" (deterministic given the time).
  const charges = st.charge.map((q) => q * Math.exp(-(simNow - st.at) / TAU));
  if (autoRefresh && simNow - st.lastRefresh >= REFRESH) {
    st.charge = charges.map((q) => (q > 0.5 ? 1 : 0));
    st.at = simNow;
    st.lastRefresh = simNow;
    st.flash = simNow;
  }
  const now = st.charge.map((q) => q * Math.exp(-(simNow - st.at) / TAU));
  const reads = now.map((q) => (q > 0.5 ? 1 : 0));
  const lost = reads.some((r, i) => r !== st.written[i]);
  const flashing = simNow - st.flash < 0.008;

  const write = () => {
    st.charge = [...st.written];
    st.at = simNow;
    st.lastRefresh = simNow;
    st.flash = simNow;
  };
  const refreshNow = () => {
    st.charge = now.map((q) => (q > 0.5 ? 1 : 0));
    st.at = simNow;
    st.lastRefresh = simNow;
    st.flash = simNow;
  };

  return (
    <Widget
      title="DRAM: each bit is a tiny leaky bucket"
      subtitle="A 1 is a capacitor full of charge; a 0 is an empty one. Charge leaks away, so the chip must read and rewrite every row before it drops below the halfway line. Time is slowed down 50×."
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="flex items-end justify-around gap-3 rounded-xl border border-line bg-bg/60 p-4">
          {now.map((q, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className={cx(
                  "relative h-32 w-12 overflow-hidden rounded-b-lg border-2 border-t-0 transition-colors",
                  flashing ? "border-on" : "border-line-2",
                )}
              >
                <div className="absolute bottom-0 left-0 w-full bg-cyan/70" style={{ height: `${q * 100}%` }} />
                <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-amber" />
              </div>
              <div className="font-mono text-xs text-dim">wrote {st.written[i]}</div>
              <div
                className={cx(
                  "font-mono text-lg font-bold",
                  reads[i] !== st.written[i] ? "text-pink" : reads[i] ? "text-on" : "text-mute",
                )}
              >
                reads {reads[i]}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:w-52">
          <Stat label="Simulated time" value={`${(simNow * 1000).toFixed(0)} ms`} />
          <Stat
            label="Since last refresh"
            value={`${((simNow - st.lastRefresh) * 1000).toFixed(0)} ms`}
            tone={simNow - st.lastRefresh > 0.09 ? "pink" : "ink"}
          />
          <Btn active={autoRefresh} onClick={() => setAutoRefresh((v) => !v)}>
            Auto-refresh every 64 ms: {autoRefresh ? "ON" : "OFF"}
          </Btn>
          <div className="flex gap-2">
            <Btn onClick={refreshNow} className="flex-1">
              Refresh now
            </Btn>
            <Btn onClick={write} className="flex-1">
              Rewrite 1011
            </Btn>
          </div>
        </div>
      </div>
      <p className={cx("mt-3 text-sm", lost ? "text-pink" : "text-mute")}>
        {lost
          ? "Data lost! A capacitor drained below the halfway line, so a 1 now reads as 0. Turn auto-refresh back on and rewrite."
          : autoRefresh
            ? "Each refresh reads every cell (above the dashed line = 1) and refills it. The data survives indefinitely."
            : "Refresh is off… watch the buckets drain. When one crosses the dashed line, that bit is gone."}
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Flash (SSD): electrons trapped on a floating gate                     */
/* ------------------------------------------------------------------ */

const GRAY3 = ["111", "110", "100", "101", "001", "000", "010", "011"];

export function FlashCell() {
  const [mode, setMode] = useState<"slc" | "tlc">("slc");
  const [level, setLevel] = useState(0); // 0..7 in TLC, 0 or 7 in SLC
  const [read, setRead] = useState<string | null>(null);
  const t = useAnimationTime(true);
  const anim = useRef({ from: 0, to: 0, start: 0 });
  const a = anim.current;
  const progress = Math.min(1, (t - a.start) / 0.9);
  const shownLevel = a.from + (a.to - a.from) * progress;
  const electrons = Math.round(shownLevel * 3);
  const moving = progress < 1 && a.from !== a.to;

  const go = (to: number) => {
    anim.current = { from: shownLevel, to, start: t };
    setLevel(to);
    setRead(null);
  };
  const vth = 0.5 + level * 0.5; // threshold voltage rises with trapped electrons

  const doRead = () => {
    if (mode === "slc") setRead(level > 3 ? "0" : "1");
    else setRead(GRAY3[level]);
  };

  return (
    <Widget
      title="Inside an SSD: a transistor with a trap"
      subtitle="A flash cell is a MOSFET with an extra, fully insulated “floating gate”. A high voltage forces electrons through the insulation. They stay trapped for years, even with the power off."
      wide
    >
      <Segmented
        size="sm"
        value={mode}
        onChange={(m) => {
          setMode(m);
          go(0);
        }}
        options={[
          { value: "slc", label: "1 bit per cell (SLC)" },
          { value: "tlc", label: "3 bits per cell (TLC)" },
        ]}
      />
      <div className="mt-4 grid items-center gap-4 md:grid-cols-[1.3fr_1fr]">
        <svg viewBox="0 0 420 250" className="w-full" role="img" aria-label="Flash memory cell cross-section">
          {/* substrate and wells */}
          <rect
            x={20}
            y={160}
            width={380}
            height={80}
            rx={8}
            fill="var(--color-si-p)"
            stroke="var(--color-si-p-edge)"
          />
          <path
            d="M40 160 h90 v26 q0 16 -16 16 h-58 q-16 0 -16 -16 z"
            fill="var(--color-si-n)"
            stroke="var(--color-si-n-edge)"
          />
          <path
            d="M290 160 h90 v26 q0 16 -16 16 h-58 q-16 0 -16 -16 z"
            fill="var(--color-si-n)"
            stroke="var(--color-si-n-edge)"
          />
          <text x={85} y={226} textAnchor="middle" className="fill-cyan font-mono text-[11px]">
            source
          </text>
          <text x={335} y={226} textAnchor="middle" className="fill-cyan font-mono text-[11px]">
            drain
          </text>
          {/* tunnel oxide */}
          <rect
            x={120}
            y={150}
            width={180}
            height={10}
            fill="var(--color-oxide)"
            stroke="var(--color-off)"
            strokeWidth={0.75}
          />
          {/* floating gate */}
          <rect
            x={128}
            y={112}
            width={164}
            height={38}
            rx={4}
            fill="var(--color-float)"
            stroke="var(--color-violet)"
            strokeWidth={1.5}
          />
          <text x={298} y={128} className="fill-violet font-mono text-[11px]">
            ← floating gate
          </text>
          <text x={298} y={140} className="fill-violet font-mono text-[11px]">
            (sealed in glass)
          </text>
          {/* inter-gate oxide */}
          <rect
            x={120}
            y={92}
            width={180}
            height={10}
            fill="var(--color-oxide)"
            stroke="var(--color-off)"
            strokeWidth={0.75}
          />
          {/* control gate */}
          <rect
            x={128}
            y={56}
            width={164}
            height={36}
            rx={4}
            style={{
              fill: moving
                ? "color-mix(in oklab, var(--color-amber) 75%, var(--color-si-gate))"
                : "var(--color-si-gate)",
            }}
            stroke={moving ? "var(--color-amber)" : "var(--color-off)"}
          />
          <text x={210} y={50} textAnchor="middle" className="fill-mute font-mono text-[11px]">
            control gate {moving && a.to > a.from ? "(+20 V: program!)" : moving ? "(erase)" : ""}
          </text>
          {/* electrons */}
          {Array.from({ length: electrons }, (_, i) => {
            const cx0 = 140 + (i % 10) * 15.5;
            const cy0 = 122 + Math.floor(i / 10) * 11;
            return <circle key={i} cx={cx0} cy={cy0} r={4} fill="var(--color-cyan)" className="glow-cyan" />;
          })}
          {moving &&
            Array.from({ length: 4 }, (_, i) => {
              const p = ((t * 2 + i / 4) % 1) * (a.to > a.from ? 1 : -1);
              const yy = a.to > a.from ? 175 - Math.abs(p) * 50 : 125 + Math.abs(p) * 50;
              return <circle key={`m${i}`} cx={170 + i * 25} cy={yy} r={3.5} fill="var(--color-cyan)" opacity={0.9} />;
            })}
          <text x={210} y={180} textAnchor="middle" className="fill-dim font-mono text-[11px]">
            channel
          </text>
        </svg>
        <div className="space-y-3">
          {mode === "slc" ? (
            <div className="flex flex-wrap gap-2">
              <Btn variant="primary" onClick={() => go(7)}>
                Program (store 0)
              </Btn>
              <Btn onClick={() => go(0)}>Erase (store 1)</Btn>
            </div>
          ) : (
            <Slider
              label="Charge level"
              min={0}
              max={7}
              value={level}
              onChange={(v) => go(v)}
              format={(v) => `level ${v} → bits ${GRAY3[v]}`}
            />
          )}
          <Btn onClick={doRead}>Read the cell</Btn>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Trapped electrons" value={level * 3} sub="(really: hundreds)" tone="cyan" />
            <Stat label="Turn-on voltage" value={`${vth.toFixed(1)} V`} sub="more electrons → higher" />
          </div>
          {read !== null && (
            <div className="rounded-xl border border-on/40 bg-on/10 p-3 text-sm">
              Read result: <span className="font-mono text-lg font-bold text-on">{read}</span>
              <div className="mt-1 text-xs text-mute">
                {mode === "slc"
                  ? level > 3
                    ? "Trapped electrons cancel the gate's push, so the read voltage can't open the channel. No current → 0."
                    : "No trapped electrons, so the read voltage opens the channel. Current flows → 1."
                  : "The controller tries several read voltages to find which of the 8 charge bands the cell is in."}
              </div>
            </div>
          )}
        </div>
      </div>
      {mode === "tlc" && (
        <div className="mt-4">
          <svg viewBox="0 0 640 90" className="w-full" role="img" aria-label="Eight charge levels">
            {GRAY3.map((bits, i) => {
              const cx0 = 50 + i * 77;
              const on = i === level;
              return (
                <g key={bits}>
                  <path
                    d={`M${cx0 - 30} 60 Q${cx0} ${on ? 4 : 20} ${cx0 + 30} 60`}
                    fill={on ? "var(--color-cyan-tint)" : "var(--color-violet-tint)"}
                    stroke={on ? "var(--color-cyan)" : "var(--color-violet)"}
                    strokeDasharray={on ? undefined : "3 3"}
                  />
                  <text
                    x={cx0}
                    y={78}
                    textAnchor="middle"
                    className="font-mono text-[12px]"
                    fill={on ? "var(--color-cyan)" : "var(--color-mute)"}
                  >
                    {bits}
                  </text>
                  {i > 0 && (
                    <line
                      x1={cx0 - 38}
                      x2={cx0 - 38}
                      y1={10}
                      y2={62}
                      stroke="var(--color-amber)"
                      strokeDasharray="3 3"
                      opacity={0.6}
                    />
                  )}
                </g>
              );
            })}
            <line x1={10} x2={630} y1={60} y2={60} stroke="var(--color-line-2)" />
          </svg>
          <p className="text-sm text-mute">
            8 distinguishable charge levels = <TeX>{"\\log_2 8 = 3"}</TeX> bits per cell. Neighbouring levels differ by
            only one bit (a Gray code), so a small read error damages just one bit. The dashed lines are the 7 read
            voltages.
          </p>
        </div>
      )}
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Hard drive: seek + wait for the sector to spin around                  */
/* ------------------------------------------------------------------ */

const TRACKS = 6;
const SECTORS = 24;
const SLOWMO = 600; // animation runs 600× slower than reality

interface Req {
  track: number;
  sector: number;
  t0: number;
  fromR: number;
  seekEnd: number;
  waitEnd: number;
  readEnd: number;
  seekMs: number;
  waitMs: number;
  readMs: number;
}

export function HddPlatter() {
  const [rpm, setRpm] = useState(7200);
  const t = useAnimationTime(true);
  const spin = useRef({ t0: 0, a0: 0 });
  const omega = ((rpm / 60) * 360) / SLOWMO; // degrees per animation second
  const angle = spin.current.a0 + omega * (t - spin.current.t0);
  const [req, setReq] = useState<Req | null>(null);
  const [headTrack, setHeadTrack] = useState(2);

  const cx0 = 160;
  const cy0 = 160;
  const rIn = 40;
  const rOut = 145;
  const trackR = (k: number) => rIn + ((k + 0.5) / TRACKS) * (rOut - rIn);

  const changeRpm = (v: number) => {
    spin.current = { t0: t, a0: angle };
    setRpm(v);
    setReq(null);
  };

  const request = (track: number, sector: number) => {
    const seekMs = track === headTrack ? 0 : 2 + 1.2 * Math.abs(track - headTrack);
    const seekEnd = t + (seekMs / 1000) * SLOWMO;
    const angleAtSeek = angle + omega * (seekEnd - t);
    // Sector k spans platter angles [k*15°, (k+1)*15°); the head sits at screen angle 0.
    // Spinning clockwise, the sector's far edge reaches the head first.
    const target = -(sector + 1) * (360 / SECTORS);
    const waitDeg = (((target - angleAtSeek) % 360) + 360) % 360;
    const waitEnd = seekEnd + waitDeg / omega;
    const readEnd = waitEnd + 360 / SECTORS / omega;
    const msPerDeg = 60000 / rpm / 360;
    setReq({
      track,
      sector,
      t0: t,
      fromR: trackR(headTrack),
      seekEnd,
      waitEnd,
      readEnd,
      seekMs,
      waitMs: waitDeg * msPerDeg,
      readMs: (360 / SECTORS) * msPerDeg,
    });
    setHeadTrack(track);
  };

  let headR = trackR(headTrack);
  let phase: "idle" | "seek" | "wait" | "read" | "done" = "idle";
  if (req) {
    if (t < req.seekEnd) {
      phase = "seek";
      const p = (t - req.t0) / Math.max(1e-6, req.seekEnd - req.t0);
      headR = req.fromR + (trackR(req.track) - req.fromR) * (0.5 - Math.cos(Math.PI * p) / 2);
    } else if (t < req.waitEnd) phase = "wait";
    else if (t < req.readEnd) phase = "read";
    else phase = "done";
  }
  const elapsedMs = req ? Math.min(req.readEnd, t) - req.t0 : 0;
  const simMs = (elapsedMs / SLOWMO) * 1000;
  const total = req ? req.seekMs + req.waitMs + req.readMs : 0;

  const sectorPath = (track: number, k: number) => {
    const r0 = rIn + (track / TRACKS) * (rOut - rIn) + 1;
    const r1 = rIn + ((track + 1) / TRACKS) * (rOut - rIn) - 1;
    const a0 = ((k * 360) / SECTORS + 0.6) * (Math.PI / 180);
    const a1 = (((k + 1) * 360) / SECTORS - 0.6) * (Math.PI / 180);
    const p = (r: number, a: number) => `${(cx0 + r * Math.cos(a)).toFixed(1)} ${(cy0 + r * Math.sin(a)).toFixed(1)}`;
    return `M${p(r0, a0)} L${p(r1, a0)} A${r1} ${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`;
  };

  return (
    <Widget
      title="A hard drive: a record player for bits"
      subtitle="Click any sector to read it. The arm must swing to the right track (seek), then wait for the sector to spin around under the head. Slowed down 600×."
      wide
    >
      <div className="grid items-center gap-4 md:grid-cols-[auto_1fr]">
        <svg viewBox="0 0 360 320" className="mx-auto w-full max-w-[360px]" role="img" aria-label="Hard drive platter">
          <circle cx={cx0} cy={cy0} r={rOut + 6} fill="var(--color-platter)" stroke="var(--color-off)" />
          <g transform={`rotate(${angle} ${cx0} ${cy0})`}>
            {Array.from({ length: TRACKS }, (_, tr) =>
              Array.from({ length: SECTORS }, (_, k) => {
                const isTarget = req && req.track === tr && req.sector === k;
                return (
                  <path
                    key={`${tr}-${k}`}
                    d={sectorPath(tr, k)}
                    fill={
                      isTarget
                        ? phase === "read" || phase === "done"
                          ? "var(--color-on)"
                          : "var(--color-amber)"
                        : (tr + k) % 2
                          ? "var(--color-platter-2)"
                          : "var(--color-platter)"
                    }
                    className="cursor-pointer hover:stroke-[var(--color-ink)] hover:[stroke-width:1.5]"
                    onClick={() => request(tr, k)}
                  />
                );
              }),
            )}
          </g>
          <circle cx={cx0} cy={cy0} r={rIn - 6} fill="var(--color-metal)" stroke="var(--color-off)" />
          <circle cx={cx0} cy={cy0} r={6} fill="var(--color-dim)" />
          {/* arm */}
          <line
            x1={cx0 + headR}
            y1={cy0}
            x2={330}
            y2={300}
            stroke="var(--color-metal-2)"
            strokeWidth={6}
            strokeLinecap="round"
          />
          <circle cx={330} cy={300} r={12} fill="var(--color-metal)" />
          <rect
            x={cx0 + headR - 5}
            y={cy0 - 7}
            width={10}
            height={14}
            rx={2}
            fill={phase === "read" ? "var(--color-on)" : "var(--color-ink)"}
            className={phase === "read" ? "glow-on" : undefined}
          />
        </svg>
        <div className="space-y-3">
          <Segmented
            size="sm"
            value={rpm}
            onChange={changeRpm}
            options={[
              { value: 5400, label: "5,400 RPM" },
              { value: 7200, label: "7,200 RPM" },
              { value: 15000, label: "15,000 RPM" },
            ]}
          />
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["Seek", req?.seekMs, "seek"],
                ["Rotation wait", req?.waitMs, "wait"],
                ["Read", req?.readMs, "read"],
              ] as const
            ).map(([label, ms, ph]) => (
              <div
                key={label}
                className={cx(
                  "rounded-xl border p-2.5",
                  phase === ph ? "border-amber bg-amber/10" : "border-line bg-bg/50",
                )}
              >
                <div className="text-[0.6875rem] tracking-wider text-dim uppercase">{label}</div>
                <div className="font-mono text-sm text-ink">{ms === undefined ? "—" : `${ms.toFixed(2)} ms`}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-line bg-bg/60 p-3 text-sm">
            {req ? (
              <>
                <span className="text-mute">Elapsed (real drive time): </span>
                <span className="font-mono text-lg text-ink">{simMs.toFixed(2)} ms</span>
                {phase === "done" && (
                  <div className="mt-1 text-on">
                    Done in {total.toFixed(1)} ms. An SSD would take ~0.08 ms; RAM ~0.00008 ms.
                  </div>
                )}
              </>
            ) : (
              <span className="text-mute">Click a sector on the platter.</span>
            )}
          </div>
          <div className="text-sm text-mute">
            <TeX>{`\\text{one turn} = \\frac{60\\text{ s}}{${rpm.toLocaleString()}} = ${(60000 / rpm).toFixed(2)}\\text{ ms} \\qquad \\text{average wait} = \\tfrac{1}{2}\\text{ turn} = ${(30000 / rpm).toFixed(2)}\\text{ ms}`}</TeX>
          </div>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* A tiny file system                                                    */
/* ------------------------------------------------------------------ */

const BLOCKS = 40;
const fileColors = [
  "var(--color-cyan)",
  "var(--color-amber)",
  "var(--color-pink)",
  "var(--color-on)",
  "var(--color-violet)",
  "var(--color-red)",
];

interface FsFile {
  name: string;
  blocks: number[];
  color: string;
}

function allocate(files: FsFile[], n: number): number[] | null {
  const used = new Set(files.flatMap((f) => f.blocks));
  const free: number[] = [];
  for (let i = 1; i < BLOCKS && free.length < n; i++) if (!used.has(i)) free.push(i);
  return free.length === n ? free : null;
}

export function FileBlocks() {
  const [files, setFiles] = useState<FsFile[]>(() => [
    { name: "photo.jpg", blocks: [1, 2, 3, 4, 5, 6, 7], color: fileColors[0] },
    { name: "notes.txt", blocks: [8], color: fileColors[1] },
    { name: "song.mp3", blocks: [9, 10, 11, 12, 13], color: fileColors[2] },
  ]);
  const [size, setSize] = useState(6);
  const [counter, setCounter] = useState(1);
  const [hover, setHover] = useState<string | null>(null);
  const owner = useMemo(() => {
    const m = new Map<number, FsFile>();
    files.forEach((f) => f.blocks.forEach((b) => m.set(b, f)));
    return m;
  }, [files]);
  const freeCount = BLOCKS - 1 - owner.size;

  const save = () => {
    const blocks = allocate(files, size);
    if (!blocks) return;
    const used = new Set(files.map((f) => f.color));
    const color = fileColors.find((c) => !used.has(c)) ?? fileColors[counter % fileColors.length];
    setFiles((f) => [...f, { name: `file${counter}.dat`, blocks, color }]);
    setCounter((c) => c + 1);
  };

  return (
    <Widget
      title="Where does a file actually go?"
      subtitle="A drive is just numbered blocks. The file system keeps a table (stored in block 0) saying which blocks belong to which file."
    >
      <div className="mx-auto grid max-w-xl grid-cols-10 gap-1">
        {Array.from({ length: BLOCKS }, (_, i) => {
          const f = owner.get(i);
          const isTable = i === 0;
          return (
            <div
              key={i}
              onMouseEnter={() => f && setHover(f.name)}
              onMouseLeave={() => setHover(null)}
              className={cx(
                "flex aspect-square items-center justify-center rounded-md border font-mono text-[0.6875rem] transition",
                isTable ? "border-ink bg-ink/20 text-ink" : f ? "text-bg" : "border-line-2 text-dim",
                f && hover && hover !== f.name && "opacity-30",
              )}
              style={f ? { background: f.color, borderColor: f.color } : undefined}
            >
              {isTable ? "table" : i}
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="overflow-x-auto rounded-xl border border-line bg-bg/60 p-3">
          <div className="mb-1 text-[0.6875rem] font-semibold tracking-wider text-mute uppercase">
            The table (block 0)
          </div>
          <table className="w-full font-mono text-xs">
            <tbody>
              {files.map((f) => (
                <tr key={f.name} onMouseEnter={() => setHover(f.name)} onMouseLeave={() => setHover(null)}>
                  <td className="py-0.5 pr-2">
                    <span
                      className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle"
                      style={{ background: f.color }}
                    />
                    <span className="text-ink">{f.name}</span>
                  </td>
                  <td className="py-0.5 pr-2 text-mute">blocks {f.blocks.join(", ")}</td>
                  <td className="py-0.5 text-right">
                    <button
                      type="button"
                      className="text-pink hover:underline"
                      onClick={() => setFiles((all) => all.filter((x) => x.name !== f.name))}
                    >
                      delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-2 sm:w-52">
          <Slider
            label="New file size"
            min={1}
            max={12}
            value={size}
            onChange={setSize}
            format={(v) => `${v} blocks`}
          />
          <Btn variant="primary" onClick={save} disabled={files.length >= 6 || size > freeCount} className="w-full">
            Save a new file
          </Btn>
          <Pill tone="mute">{freeCount} free blocks</Pill>
        </div>
      </div>
      <p className="mt-3 text-sm text-mute">
        Delete a file in the middle, then save a bigger one: it gets split across the gaps. That's{" "}
        <span className="text-ink">fragmentation</span>. Notice that “delete” only erases the table entry. The old bytes
        stay on the disk until something overwrites them, which is why deleted files can sometimes be recovered.
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Cosmic ray: a Hamming(7,4) code drawn as three overlapping circles  */
/* ------------------------------------------------------------------ */

// Positions 1–7. Check bits sit at 1, 2 and 4; data bits at 3, 5, 6 and 7.
// Check c watches every position whose number contains c (as a sum of 1, 2, 4).
// Position 0 is the optional "overall" parity bit of the 8-bit (ECC) version.
const H_POS = [1, 2, 3, 4, 5, 6, 7];
const H_DATA = [3, 5, 6, 7];
const H_CHECKS = [1, 2, 4];
const hWatched = (check: number) => H_POS.filter((p) => p & check);

const H_W = 380;
const H_H = 335;
const H_R = 95;
const H_CIRCLES = [
  { check: 1, x: 140, y: 124, lx: 66, ly: 34, anchor: "end" as const },
  { check: 2, x: 240, y: 124, lx: 314, ly: 34, anchor: "start" as const },
  { check: 4, x: 190, y: 210.6, lx: 272, ly: 300, anchor: "start" as const },
];
// Centre of each bit's cell: chosen so each cell sits inside exactly the circles that watch it.
const H_CELL: Record<number, [number, number]> = {
  0: [52, 286],
  1: [99.1, 100.4],
  2: [280.9, 100.4],
  3: [190, 87.4],
  4: [190, 257.9],
  5: [130.7, 187.1],
  6: [249.3, 187.1],
  7: [190, 152.9],
};

function hammingEncode(data: number[]): number[] {
  const w = Array<number>(8).fill(0);
  H_DATA.forEach((p, i) => (w[p] = data[i]));
  for (const c of H_CHECKS) w[c] = hWatched(c).reduce((s, p) => (p === c ? s : s ^ w[p]), 0);
  w[0] = H_POS.reduce((s, p) => s ^ w[p], 0);
  return w;
}

type HVerdict = "none" | "fix" | "fixOverall" | "detect";

export function HammingVenn() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [data, setData] = useState([1, 0, 1, 1]);
  const [flips, setFlips] = useState<boolean[]>(() => Array(8).fill(false));
  const [ecc, setEcc] = useState(false);

  const stored = hammingEncode(data);
  const shown = ecc ? [0, ...H_POS] : H_POS;
  const got = stored.map((b, i) => b ^ (flips[i] ? 1 : 0));
  const nFlips = shown.filter((p) => flips[p]).length;

  const ones = (c: number) => hWatched(c).reduce((s, p) => s + got[p], 0);
  const fails = H_CHECKS.filter((c) => ones(c) % 2 === 1);
  const syndrome = fails.reduce((s, c) => s + c, 0);
  const allOnes = shown.reduce((s, p) => s + got[p], 0);
  const overallOdd = allOnes % 2 === 1;

  let verdict: HVerdict = "none";
  if (!ecc) verdict = syndrome ? "fix" : "none";
  else if (syndrome === 0) verdict = overallOdd ? "fixOverall" : "none";
  else verdict = overallOdd ? "fix" : "detect";

  const fixed = [...got];
  if (verdict === "fix") fixed[syndrome] ^= 1;
  if (verdict === "fixOverall") fixed[0] ^= 1;
  const out = H_DATA.map((p) => fixed[p]);
  const dataOk = verdict !== "detect" && out.every((b, i) => b === data[i]);

  const flip = (p: number) => setFlips((f) => f.map((v, i) => (i === p ? !v : v)));
  const clear = () => setFlips(Array(8).fill(false));
  const zapRandom = () => {
    const p = shown[Math.floor(Math.random() * shown.length)];
    flip(p);
  };
  const setDataBit = (i: number) => {
    setData((d) => d.map((v, j) => (j === i ? 1 - v : v)));
    clear();
  };

  // The region the failing circles point at: inside every failing circle, outside every passing one.
  let region: ReactNode = <rect x={0} y={0} width={H_W} height={H_H} fill="var(--color-highlight)" />;
  for (const c of H_CIRCLES)
    if (syndrome & c.check) region = <g clipPath={`url(#${uid}-c${c.check})`}>{region}</g>;
  const blamed = verdict === "fix" || verdict === "detect" ? syndrome : verdict === "fixOverall" ? 0 : -1;

  const listOf = (xs: number[]) =>
    xs.length === 1 ? `${xs[0]}` : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
  const who = fails.length === 1 ? `Only check ${fails[0]} complains` : `Checks ${listOf(fails)} complain`;
  const sum =
    fails.length > 1 ? (
      <>
        : {fails.join(" + ")} = <strong className="text-ink">{syndrome}</strong>
      </>
    ) : null;
  const where =
    fails.length === 3
      ? "The only spot inside all three circles"
      : fails.length === 2
        ? "The only spot inside both of those circles and outside the third"
        : "The only spot inside that circle and outside the other two";
  let story: ReactNode;
  if (nFlips === 0) story = "Every circle holds an even number of 1s. No check complains, so there is nothing to fix.";
  else if (verdict === "none")
    story = `No check complains, but ${nFlips} bits are wrong: the flips hid each other. The chip hands over wrong data and nobody notices.`;
  else if (verdict === "fixOverall")
    story = "Only the overall bit flipped. The three circles are happy, so the data is fine.";
  else if (verdict === "detect")
    story = (
      <>
        The circles point at bit {syndrome}, but the overall bit says an <em>even</em> number of bits changed, so at
        least two flipped. The chip can't tell which ones, so it reports an error instead of using wrong data.
      </>
    );
  else if (dataOk)
    story = (
      <>
        {who}
        {sum}. {where} is bit {syndrome}, so the chip flips it back.
      </>
    );
  else
    story = (
      <>
        {who}
        {sum}. {where} is bit {syndrome}
        {flips[syndrome]
          ? ". The chip flips it back, but other flipped bits stay wrong."
          : ", but that bit was fine! The chip “fixes” it and hands over wrong data."}{" "}
        {!ecc && "Hamming(7,4) can fix one flip, but two fool it. Try the 8-bit version."}
      </>
    );

  return (
    <Widget
      title="Cosmic ray: find and fix a flipped bit"
      subtitle="Four data bits (squares) are stored with three check bits (round). Each circle is one check, and it wants an even number of 1s inside it. Click any bit to flip it, the way a cosmic ray might."
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <div className="label-caps mb-1.5 text-dim">Data to store</div>
          <div className="flex gap-3">
            {H_DATA.map((p, i) => (
              <BitButton
                key={p}
                size="sm"
                on={data[i] === 1}
                onClick={() => setDataBit(i)}
                label={`bit ${p}`}
                title={`Data bit stored at position ${p}`}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pb-5">
          <Btn onClick={zapRandom}>↯ Random cosmic ray</Btn>
          <Btn onClick={clear} disabled={nFlips === 0}>
            Undo flips
          </Btn>
        </div>
      </div>
      <Segmented
        className="mt-1"
        size="sm"
        value={ecc ? "ecc" : "h74"}
        onChange={(v) => {
          setEcc(v === "ecc");
          clear();
        }}
        options={[
          { value: "h74", label: "7 bits: fixes 1 flip" },
          { value: "ecc", label: "8 bits: also detects 2 (like ECC RAM)" },
        ]}
      />

      <div className="mt-4 grid items-start gap-5 @2xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
        <div>
          <svg
            viewBox={`0 0 ${H_W} ${H_H}`}
            className="mx-auto w-full max-w-[26rem]"
            role="group"
            aria-label="Three overlapping check circles with seven bits inside them"
          >
            <defs>
              {H_CIRCLES.map((c) => (
                <clipPath key={c.check} id={`${uid}-c${c.check}`}>
                  <circle cx={c.x} cy={c.y} r={H_R} />
                </clipPath>
              ))}
              <mask id={`${uid}-m`} maskUnits="userSpaceOnUse" x={0} y={0} width={H_W} height={H_H}>
                <rect x={0} y={0} width={H_W} height={H_H} fill="white" />
                {H_CIRCLES.filter((c) => !(syndrome & c.check)).map((c) => (
                  <circle key={c.check} cx={c.x} cy={c.y} r={H_R} fill="black" />
                ))}
              </mask>
            </defs>

            {syndrome > 0 && <g mask={`url(#${uid}-m)`}>{region}</g>}

            {H_CIRCLES.map((c) => {
              const bad = fails.includes(c.check);
              return (
                <g key={c.check}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={H_R}
                    fill={bad ? "var(--color-pink)" : "none"}
                    fillOpacity={bad ? 0.06 : 0}
                    stroke={bad ? "var(--color-pink)" : "var(--color-mute)"}
                    strokeWidth={bad ? 2.5 : 1.25}
                    strokeDasharray={bad ? "8 5" : undefined}
                  />
                  <text
                    x={c.lx}
                    y={c.ly}
                    textAnchor={c.anchor}
                    className={cx("font-sans text-[13px] font-bold", bad ? "fill-pink" : "fill-ink")}
                  >
                    check {c.check}
                  </text>
                  <text
                    x={c.lx}
                    y={c.ly + 16}
                    textAnchor={c.anchor}
                    className={cx("font-sans text-[12px]", bad ? "fill-pink font-semibold" : "fill-mute")}
                  >
                    {bad ? "odd ✗" : "even ✓"}
                  </text>
                </g>
              );
            })}

            {ecc && (
              <text x={H_CELL[0][0]} y={H_CELL[0][1] + 40} textAnchor="middle" className="fill-mute font-sans text-[12px]">
                overall
              </text>
            )}

            {shown.map((p) => {
              const [x, y] = H_CELL[p];
              const isData = H_DATA.includes(p);
              const v = got[p];
              const zapped = flips[p];
              const isBlamed = blamed === p;
              const shape = (pad: number, props: Record<string, unknown>) =>
                isData || p === 0 ? (
                  <rect x={x - 16 - pad} y={y - 21 - pad} width={32 + 2 * pad} height={42 + 2 * pad} rx={5 + pad} {...props} />
                ) : (
                  <circle cx={x} cy={y} r={22 + pad} {...props} />
                );
              return (
                <g
                  key={p}
                  role="button"
                  tabIndex={0}
                  aria-pressed={zapped}
                  aria-label={`${p === 0 ? "Overall parity bit" : isData ? `Data bit ${p}` : `Check bit ${p}`}, now ${v}${zapped ? ", flipped" : ""}. Flip it.`}
                  className="cursor-pointer"
                  onClick={() => flip(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      flip(p);
                    }
                  }}
                >
                  <rect x={x - 25} y={y - 28} width={50} height={56} rx={8} fill="transparent" />
                  {zapped &&
                    shape(4.5, {
                      fill: "none",
                      stroke: "var(--color-pink)",
                      strokeWidth: 1.5,
                      strokeDasharray: "3 3",
                    })}
                  {shape(0, {
                    fill: zapped ? "var(--color-pink-tint)" : "var(--color-panel)",
                    stroke: zapped ? "var(--color-pink)" : isBlamed ? "var(--color-amber)" : "var(--color-line-2)",
                    strokeWidth: zapped || isBlamed ? 2 : 1.25,
                  })}
                  <text x={x} y={y - 6} textAnchor="middle" className="fill-dim font-sans text-[12px]">
                    {p === 0 ? "all" : p}
                  </text>
                  <text
                    x={x}
                    y={y + 14}
                    textAnchor="middle"
                    className={cx(
                      "font-mono text-[18px] tabular-nums",
                      zapped ? "fill-pink font-bold" : v ? "fill-on font-bold" : "fill-dim",
                    )}
                  >
                    {v}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="mt-1 text-center font-sans text-xs text-mute">
            Small number = the bit's position. Shaded = where the complaining circles point.
          </p>
        </div>

        <div className="space-y-3 font-sans text-sm">
          <div>
            <div className="label-caps mb-1.5 text-dim">Read back from memory</div>
            <div className="flex flex-wrap gap-1">
              {shown.map((p) => (
                <div
                  key={p}
                  className={cx(
                    "flex w-8 flex-col items-center rounded border py-0.5",
                    flips[p] ? "border-pink bg-pink-tint" : "border-line bg-panel",
                  )}
                >
                  <span className="text-[0.6875rem] text-dim">{p === 0 ? "all" : p}</span>
                  <span
                    className={cx(
                      "font-mono text-base tabular-nums",
                      flips[p] ? "font-bold text-pink" : got[p] ? "font-bold text-on" : "text-dim",
                    )}
                  >
                    {got[p]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <table className="w-full border-y border-line-2 text-left">
            <tbody>
              {H_CHECKS.map((c) => {
                const n = ones(c);
                const bad = n % 2 === 1;
                return (
                  <tr key={c} className="border-b border-line last:border-0">
                    <td className="py-1 pr-2 font-semibold whitespace-nowrap text-ink">check {c}</td>
                    <td className="py-1 pr-2 font-mono text-xs whitespace-nowrap text-mute">
                      {hWatched(c).join(" ")}
                    </td>
                    <td className="py-1 pr-2 whitespace-nowrap text-mute">
                      {n} one{n === 1 ? "" : "s"}
                    </td>
                    <td className={cx("py-1 text-right whitespace-nowrap", bad ? "font-semibold text-pink" : "text-mute")}>
                      {bad ? "odd ✗" : "even ✓"}
                    </td>
                  </tr>
                );
              })}
              {ecc && (
                <tr>
                  <td className="py-1 pr-2 font-semibold whitespace-nowrap text-ink">overall</td>
                  <td className="py-1 pr-2 font-mono text-xs whitespace-nowrap text-mute">all 8</td>
                  <td className="py-1 pr-2 whitespace-nowrap text-mute">{allOnes} ones</td>
                  <td
                    className={cx(
                      "py-1 text-right whitespace-nowrap",
                      overallOdd ? "font-semibold text-pink" : "text-mute",
                    )}
                  >
                    {overallOdd ? "odd ✗" : "even ✓"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <p className="font-serif text-[0.9375rem] leading-snug text-body">{story}</p>

          <div
            className={cx(
              "rounded-md border px-3 py-2",
              verdict === "detect"
                ? "border-amber bg-amber-tint"
                : dataOk
                  ? "border-line-2 bg-panel-2"
                  : "border-pink bg-pink-tint halo-pink",
            )}
          >
            <div className="label-caps text-dim">Data handed to the CPU</div>
            {verdict === "detect" ? (
              <div className="mt-0.5 font-semibold text-amber">None: “memory error” reported ⚠</div>
            ) : (
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-lg tracking-[0.15em] tabular-nums">
                  {out.map((b, i) => (
                    <span key={i} className={b ? "font-bold text-on" : "text-dim"}>
                      {b}
                    </span>
                  ))}
                </span>
                {dataOk ? (
                  <span className="font-semibold text-ink">✓ same as stored</span>
                ) : (
                  <span className="font-semibold text-pink">✗ wrong (stored {data.join("")})</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Widget>
  );
}
