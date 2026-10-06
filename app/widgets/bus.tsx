/**
 * Figures for "Sharing one road: the bus" in the CPU chapter:
 * - TriStateFigure: what a tri-state output does inside (two switches), and
 *   why two talkers on one wire make a short circuit.
 * - WhoIsTalking: four registers on one 8-wire bus, each with OUT and IN.
 * - HoldOrLoad: one register bit with a load-enable multiplexer in front.
 */
import { useState, type ReactNode } from "react";

import { CircuitDefs, InputPin, Junction, OutputPin, SignalTag, Wire } from "~/components/circuit";
import { TeX } from "~/components/tex";
import { Bits, Btn, cx, Figure, Pill, Widget } from "~/components/ui";
import { binStr } from "~/lib/bits";

/* ------------------------------------------------------------------ */
/* Tri-state buffer: inside view                                        */
/* ------------------------------------------------------------------ */

/** One switch between two contacts (x, y1) and (x, y2). */
function Sw({ x, y1, y2, closed, color }: { x: number; y1: number; y2: number; closed: boolean; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y1} r={2.6} fill={color} />
      <circle cx={x} cy={y2} r={2.6} fill={color} />
      {closed ? (
        <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={3} strokeLinecap="round" />
      ) : (
        <line
          x1={x}
          y1={y1}
          x2={x + 15}
          y2={y2 - 5}
          stroke="var(--color-off)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

function Ground({ x, y, color = "var(--color-off)" }: { x: number; y: number; color?: string }) {
  return (
    <g stroke={color} strokeWidth={2} strokeLinecap="round">
      <line x1={x - 12} y1={y} x2={x + 12} y2={y} />
      <line x1={x - 7} y1={y + 5} x2={x + 7} y2={y + 5} />
      <line x1={x - 2.5} y1={y + 10} x2={x + 2.5} y2={y + 10} />
    </g>
  );
}

function Rail({ x, y, color = "var(--color-off)" }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <line x1={x - 13} y1={y} x2={x + 13} y2={y} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <text x={x - 18} y={y + 4.5} textAnchor="end" className="font-mono text-[13px] font-bold" fill={color}>
        +
      </text>
    </g>
  );
}

/**
 * One output stage: a top switch to + and a bottom switch to ground, with the
 * output node between them. `up`/`down` say which switch is closed.
 */
function Stage({ x, up, down, hot }: { x: number; up: boolean; down: boolean; hot?: boolean }) {
  const pink = "var(--color-pink)";
  const topC = hot && up ? pink : up ? "var(--color-on)" : "var(--color-off)";
  const botC = hot && down ? pink : "var(--color-off)";
  return (
    <g>
      <Rail x={x} y={40} color={up ? topC : "var(--color-off)"} />
      {hot && up ? (
        <path d={`M${x} 40 V62`} stroke={pink} strokeWidth={3.5} fill="none" />
      ) : (
        <Wire d={`M${x} 40 V62`} on={up} flow={false} />
      )}
      <Sw x={x} y1={62} y2={92} closed={up} color={topC} />
      {hot ? (
        <>
          <path d={`M${x} 92 V112`} stroke={pink} strokeWidth={up ? 3.5 : 1.5} fill="none" />
          <path d={`M${x} 112 V132`} stroke={pink} strokeWidth={down ? 3.5 : 1.5} fill="none" />
        </>
      ) : (
        <Wire d={`M${x} 92 V132`} on={up} flow={false} />
      )}
      <Sw x={x} y1={132} y2={162} closed={down} color={botC} />
      {hot && down ? (
        <path d={`M${x} 162 V184`} stroke={pink} strokeWidth={3.5} fill="none" />
      ) : (
        <Wire d={`M${x} 162 V184`} on={false} flow={false} />
      )}
      <Ground x={x} y={184} color={hot && down ? pink : "var(--color-off)"} />
    </g>
  );
}

function PanelText({ x, title, sub, tone }: { x: number; title: string; sub: string; tone: string }) {
  return (
    <g>
      <text x={x} y={18} textAnchor="middle" className="font-sans text-[13px] font-semibold" fill="var(--color-ink)">
        {title}
      </text>
      <text x={x} y={226} textAnchor="middle" className="font-sans text-[13px] font-semibold" fill={tone}>
        {sub}
      </text>
    </g>
  );
}

export function TriStateFigure() {
  // three single outputs, then two outputs sharing one wire
  const xs = [48, 186, 324];
  return (
    <Figure
      caption={
        <>
          Inside every output are two switches: the top one connects the wire to + (that's a 1), the bottom one
          connects it to ground, 0 V (that's a 0). A tri-state output can also open <em>both</em> switches and let go of
          the wire (Z). Two outputs that disagree on one wire connect + straight to ground: a short circuit.
        </>
      }
    >
      <svg
        viewBox="0 0 640 238"
        className="block w-full min-w-[560px]"
        role="img"
        aria-label="Four drawings of output switches: driving 1, driving 0, letting go (Z), and two outputs fighting"
      >
        <CircuitDefs />
        {/* separators */}
        {[146, 284, 422].map((x) => (
          <line key={x} x1={x} y1={6} x2={x} y2={232} stroke="var(--color-line)" strokeWidth={1} />
        ))}

        {/* 1: drives 1 */}
        <Stage x={xs[0]} up down={false} />
        <Junction x={xs[0]} y={112} on />
        <Wire d={`M${xs[0]} 112 H112`} on flow={false} />
        <SignalTag x={124} y={112} on />
        <PanelText x={73} title="enable 1, in 1" sub="out = 1" tone="var(--color-on)" />

        {/* 2: drives 0 */}
        <Stage x={xs[1]} up={false} down />
        <Junction x={xs[1]} y={112} on={false} />
        <Wire d={`M${xs[1]} 112 H250`} on={false} />
        <SignalTag x={262} y={112} on={false} />
        <PanelText x={215} title="enable 1, in 0" sub="out = 0" tone="var(--color-mute)" />

        {/* 3: Z */}
        <Stage x={xs[2]} up={false} down={false} />
        <circle cx={xs[2]} cy={112} r={3.5} fill="var(--color-off)" />
        <path d={`M${xs[2]} 112 H388`} stroke="var(--color-off)" strokeWidth={1.75} strokeDasharray="4 4" fill="none" />
        <SignalTag x={400} y={112} on={false} text="Z" />
        <PanelText x={353} title="enable 0" sub="out = Z (let go)" tone="var(--color-mute)" />

        {/* 4: two talkers fighting */}
        <Stage x={470} up down={false} hot />
        <Stage x={598} up={false} down hot />
        <path
          d="M470 112 H598"
          stroke="var(--color-pink)"
          strokeWidth={3.5}
          fill="none"
          markerEnd="url(#arrow-short)"
        />
        <defs>
          <marker
            id="arrow-short"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" fill="var(--color-pink)" />
          </marker>
        </defs>
        <circle cx={470} cy={112} r={4} fill="var(--color-pink)" />
        <circle cx={598} cy={112} r={4} fill="var(--color-pink)" />
        <text x={485} y={56} className="font-mono text-[13px] font-bold" fill="var(--color-ink)">
          A
        </text>
        <text x={583} y={56} textAnchor="end" className="font-mono text-[13px] font-bold" fill="var(--color-ink)">
          B
        </text>
        <rect
          x={490}
          y={124}
          width={88}
          height={22}
          rx={4}
          fill="var(--color-pink-tint)"
          stroke="var(--color-pink)"
        />
        <text x={534} y={139.5} textAnchor="middle" className="font-mono text-[13px] font-bold" fill="var(--color-pink)">
          ✗ 1 or 0?
        </text>
        <text x={534} y={104} textAnchor="middle" className="font-sans text-[12px]" fill="var(--color-pink)">
          current
        </text>
        <PanelText x={534} title="A says 1, B says 0" sub="✗ short circuit" tone="var(--color-pink)" />
      </svg>
    </Figure>
  );
}

/* ------------------------------------------------------------------ */
/* Who's talking? Four registers on one bus                             */
/* ------------------------------------------------------------------ */

const NAMES = ["A", "B", "C", "D"] as const;
const START = [5, 12, 200, 77];

function Switch({
  label,
  sub,
  on,
  tone,
  onClick,
  aria,
}: {
  label: string;
  sub: string;
  on: boolean;
  tone: "cyan" | "amber";
  onClick: () => void;
  aria: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={aria}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-9 items-center gap-2 rounded-md border px-2.5 py-1 font-sans text-sm font-semibold transition-colors select-none pointer-coarse:min-h-11",
        on
          ? tone === "cyan"
            ? "border-cyan bg-cyan-tint text-cyan halo-cyan"
            : "border-amber bg-amber-tint text-amber halo-amber"
          : "border-line-2 bg-panel text-mute hover:border-off hover:bg-panel-2 hover:text-ink",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "relative h-4 w-7 shrink-0 rounded-full border transition-colors",
          on ? "border-current bg-current" : "border-line-2 bg-panel-3",
        )}
      >
        <span
          className={cx(
            "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-panel transition-[left] duration-150",
            on ? "left-[13px]" : "left-[1px]",
          )}
        />
      </span>
      {label}
      <span className="text-xs font-normal">{sub}</span>
    </button>
  );
}

/** The little drawing between a register and the bus: a tri-state buffer (OUT) and a load arrow (IN). */
function Link2Bus({
  out,
  inn,
  short,
  below,
}: {
  out: boolean;
  inn: boolean;
  short: boolean;
  /** true when the register sits below the bus (drawing is flipped). */
  below?: boolean;
}) {
  const outC = out ? (short ? "var(--color-pink)" : "var(--color-cyan)") : "var(--color-off)";
  const inC = inn ? "var(--color-amber)" : "var(--color-off)";
  return (
    <svg width={120} height={40} viewBox="0 0 120 40" className="mx-auto block" aria-hidden>
      <g transform={below ? "translate(0 40) scale(1 -1)" : undefined}>
        {/* OUT lane: register → tri-state buffer → bus */}
        <line x1={44} y1={0} x2={44} y2={10} stroke={outC} strokeWidth={out ? 3 : 1.75} />
        <path
          d="M36 10 L52 10 L44 24 Z"
          fill={out ? (short ? "var(--color-pink-tint)" : "var(--color-cyan-tint)") : "var(--color-panel)"}
          stroke={outC}
          strokeWidth={1.75}
          strokeLinejoin="round"
        />
        {/* enable input on the buffer's side */}
        <line x1={22} y1={17} x2={39} y2={17} stroke={outC} strokeWidth={1.5} />
        <circle cx={22} cy={17} r={2.2} fill={outC} />
        {out ? (
          <line x1={44} y1={24} x2={44} y2={40} stroke={outC} strokeWidth={3} />
        ) : (
          <>
            <line x1={44} y1={24} x2={44} y2={28} stroke={outC} strokeWidth={1.75} />
            <line x1={44} y1={36} x2={44} y2={40} stroke={outC} strokeWidth={1.75} />
          </>
        )}
        {/* IN lane: bus → register */}
        <line
          x1={78}
          y1={40}
          x2={78}
          y2={6}
          stroke={inC}
          strokeWidth={inn ? 3 : 1.5}
          strokeDasharray={inn ? undefined : "3 3"}
        />
        <path d="M71 9 L78 0 L85 9 Z" fill={inC} />
      </g>
    </svg>
  );
}

export function WhoIsTalking() {
  const [vals, setVals] = useState<number[]>(START);
  const [out, setOut] = useState<boolean[]>([true, false, false, false]);
  const [inn, setInn] = useState<boolean[]>([false, true, false, false]);
  const [loaded, setLoaded] = useState<number[]>([]);
  const [log, setLog] = useState<ReactNode>(null);
  const [ticks, setTicks] = useState(0);

  const talkers = [0, 1, 2, 3].filter((i) => out[i]);
  const listeners = [0, 1, 2, 3].filter((i) => inn[i]);
  let all1 = 255;
  let any1 = 0;
  for (const t of talkers) {
    all1 &= vals[t];
    any1 |= vals[t];
  }
  // wires where one talker says 1 and another says 0
  const fight = talkers.length > 1 ? any1 & ~all1 & 255 : 0;
  const state: "z" | "ok" | "agree" | "short" =
    talkers.length === 0 ? "z" : talkers.length === 1 ? "ok" : fight ? "short" : "agree";
  const busVal = state === "ok" || state === "agree" ? all1 : null;
  const names = (ix: number[]) =>
    ix.length <= 1 ? NAMES[ix[0]] ?? "" : `${ix.slice(0, -1).map((i) => NAMES[i]).join(", ")} and ${NAMES[ix[ix.length - 1]]}`;
  const fightWires = [7, 6, 5, 4, 3, 2, 1, 0].filter((b) => (fight >> b) & 1);

  const toggle = (arr: boolean[], set: (v: boolean[]) => void, i: number) => {
    const next = arr.slice();
    next[i] = !next[i];
    set(next);
    setLoaded([]);
    setLog(null);
  };

  const tick = () => {
    setTicks((t) => t + 1);
    if (state === "z") {
      setLoaded([]);
      setLog(
        listeners.length
          ? `Tick ${ticks + 1}: nobody was talking, so the wires were floating. ${names(listeners)} would copy random garbage, so nothing was loaded.`
          : `Tick ${ticks + 1}: nobody talked and nobody listened. Nothing happened.`,
      );
      return;
    }
    if (state === "short") {
      setLoaded([]);
      setLog(
        <>
          <strong>✗ Tick {ticks + 1}: refused.</strong> The fighting wires are neither 0 nor 1, so no listener can trust
          them.
        </>,
      );
      return;
    }
    if (!listeners.length) {
      setLoaded([]);
      setLog(`Tick ${ticks + 1}: ${names(talkers)} talked, but nobody was listening. Nothing changed.`);
      return;
    }
    const v = busVal!;
    setVals((old) => old.map((x, i) => (inn[i] ? v : x)));
    setLoaded(listeners);
    setLog(
      <>
        ✓ Tick {ticks + 1}: {names(listeners)} copied <span className="font-mono">{binStr(v, 8, 4)}</span> ({v}) from{" "}
        {names(talkers)}.
      </>,
    );
  };

  const reset = () => {
    setVals(START);
    setOut([true, false, false, false]);
    setInn([false, true, false, false]);
    setLoaded([]);
    setLog(null);
    setTicks(0);
  };

  const card = (i: number) => {
    const talking = out[i];
    const listening = inn[i];
    const fighting = talking && state === "short";
    return (
      <div
        key={i}
        className={cx(
          "min-w-0 rounded-md border bg-panel px-3 py-2.5 transition-colors duration-300",
          fighting
            ? "border-pink halo-pink"
            : talking
              ? "border-cyan halo-cyan"
              : loaded.includes(i)
                ? "border-amber halo-amber"
                : "border-line-2",
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label-caps text-mute">Register {NAMES[i]}</span>
          {fighting && <Pill tone="pink">✗ fighting</Pill>}
          {talking && !fighting && <Pill tone="cyan">talking</Pill>}
          {listening && <Pill tone="amber">listening</Pill>}
        </div>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <Bits value={vals[i]} width={8} className="text-lg" />
          <span className="font-mono text-sm text-mute tabular-nums">= {vals[i]}</span>
          {loaded.includes(i) && <span className="font-sans text-xs font-semibold text-amber">← just loaded</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Switch
            label="OUT"
            sub="talk"
            tone="cyan"
            on={talking}
            aria={`Register ${NAMES[i]} OUT (talk on the bus)`}
            onClick={() => toggle(out, setOut, i)}
          />
          <Switch
            label="IN"
            sub="listen"
            tone="amber"
            on={listening}
            aria={`Register ${NAMES[i]} IN (copy the bus at the next tick)`}
            onClick={() => toggle(inn, setInn, i)}
          />
        </div>
      </div>
    );
  };

  const wire = (b: number) => {
    const bad = (fight >> b) & 1;
    const v = busVal === null ? null : (busVal >> b) & 1;
    let line = "border-t border-dashed border-off";
    let mark: ReactNode = <span className="text-dim">Z</span>;
    if (state === "short" && bad) {
      line = "border-t-[3px] border-pink";
      mark = <span className="font-bold text-pink">✗</span>;
    } else if (state === "short") {
      // this wire happens to agree: its value is fine
      const agreed = (any1 >> b) & 1;
      line = agreed ? "border-t-[3px] border-on" : "border-t border-off";
      mark = agreed ? <span className="font-bold text-on">1</span> : <span className="text-dim">0</span>;
    } else if (v !== null) {
      line = v ? "border-t-[3px] border-on" : "border-t border-off";
      mark = v ? <span className="font-bold text-on">1</span> : <span className="text-dim">0</span>;
    }
    return (
      <div key={b} className="flex h-[11px] items-center gap-2">
        <span className="w-6 shrink-0 font-mono text-[0.6875rem] leading-none text-dim">b{b}</span>
        <div className={cx("h-0 flex-1", line)} />
        <span className="w-3 shrink-0 text-center font-mono text-[0.6875rem] leading-none">{mark}</span>
      </div>
    );
  };

  let message: ReactNode;
  let msgTone = "border-line-2 bg-panel-2";
  if (state === "z") {
    message = (
      <>
        <strong>○ Nobody is talking.</strong> Every OUT is off, so no wire is connected to + or to ground. The wires
        float (state Z) at random voltages. Turn on one OUT.
      </>
    );
  } else if (state === "ok") {
    message = (
      <>
        <strong>
          ✓ {NAMES[talkers[0]]} is talking: {busVal} is on the bus.
        </strong>{" "}
        {listeners.length ? (
          <>
            {names(listeners)} {listeners.length > 1 ? "are" : "is"} listening. Press <em>Tick</em> and{" "}
            {listeners.length > 1 ? "they" : NAMES[listeners[0]]} will copy it.
          </>
        ) : (
          <>Nobody is listening yet. Turn on an IN switch, then press Tick.</>
        )}
      </>
    );
    msgTone = "border-cyan bg-cyan-tint";
  } else if (state === "agree") {
    message = (
      <>
        <strong>! {names(talkers)} are both talking.</strong> By luck they hold the same number, so no wire is fighting
        right now. A real control unit never relies on luck: it turns on exactly one OUT per tick.
      </>
    );
    msgTone = "border-amber bg-amber-tint";
  } else {
    message = (
      <>
        <strong>✗ Short circuit!</strong> {names(talkers)} are {talkers.length > 2 ? "all" : "both"} talking at once. On wire
        {fightWires.length > 1 ? "s" : ""} {fightWires.map((b) => `b${b}`).join(", ")}, one register connects the wire
        to + (a 1) while another connects it to ground (a 0). Current rushes straight from + to ground, the chip heats
        up, and the wire sits at an in-between voltage that is neither 0 nor 1. Turn one OUT off.
      </>
    );
    msgTone = "border-pink bg-pink-tint halo-pink";
  }

  return (
    <Widget
      title="Who's talking?"
      subtitle="Four registers share one 8-wire bus. OUT connects a register to the bus (it talks). IN makes it copy the bus at the next clock tick (it listens). Move a number from register to register, then try turning on two OUTs."
    >
      <div className="grid grid-cols-2 gap-x-2 sm:gap-x-3">
        {[0, 1].map((i) => (
          <div key={i} className="min-w-0">
            {card(i)}
            <Link2Bus out={out[i]} inn={inn[i]} short={state === "short"} />
          </div>
        ))}
      </div>

      <div
        className={cx(
          "rounded-md border-2 px-3 py-2 transition-colors duration-300",
          state === "short" ? "border-pink bg-pink-tint halo-pink" : "border-line-2 bg-panel-2",
        )}
      >
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="label-caps text-dim">Bus · 8 shared wires</span>
          <span className="font-mono text-sm tabular-nums">
            {state === "z" && <span className="text-dim">ZZZZ ZZZZ · nobody talking</span>}
            {(state === "ok" || state === "agree") && (
              <>
                <Bits value={busVal!} width={8} /> <span className="text-ink">= {busVal}</span>
                <span className="text-mute"> · from {names(talkers)}</span>
              </>
            )}
            {state === "short" && <span className="font-sans font-bold text-pink">✗ SHORT CIRCUIT</span>}
          </span>
        </div>
        <div className="space-y-[5px]">{[7, 6, 5, 4, 3, 2, 1, 0].map(wire)}</div>
      </div>

      <div className="grid grid-cols-2 gap-x-2 sm:gap-x-3">
        {[2, 3].map((i) => (
          <div key={i} className="min-w-0">
            <Link2Bus out={out[i]} inn={inn[i]} short={state === "short"} below />
            {card(i)}
          </div>
        ))}
      </div>

      <div
        role="status"
        aria-live="polite"
        className={cx("mt-4 rounded-md border px-3 py-2.5 font-serif text-[0.9375rem] text-body", msgTone)}
      >
        {message}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn variant="primary" onClick={tick}>
          Tick ⏵
        </Btn>
        <Btn onClick={reset}>Reset</Btn>
        <span className="ml-1 font-mono text-sm text-dim tabular-nums">ticks: {ticks}</span>
      </div>
      {log && <p className="mt-2 font-serif text-[0.9375rem] text-mute">{log}</p>}
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Hold or load? One register bit with a load-enable multiplexer        */
/* ------------------------------------------------------------------ */

export function HoldOrLoad() {
  const [bus, setBus] = useState(true);
  const [load, setLoad] = useState(false);
  const [q, setQ] = useState(false);
  const [ticked, setTicked] = useState<string | null>(null);
  const d = load ? bus : q;
  const b = (x: boolean) => (x ? 1 : 0);

  const tick = () => {
    setTicked(
      d === q
        ? `Tick: Q was ${b(q)} and D was ${b(d)}, so Q stays ${b(q)}.`
        : `Tick: Q copied D and changed from ${b(q)} to ${b(d)}.`,
    );
    setQ(d);
  };

  // geometry
  const muxTop = 62; // input 0 (Q fed back)
  const muxBot = 112; // input 1 (bus)
  const muxOut: [number, number] = [144, 87];
  const selIn = muxBot;

  return (
    <Widget
      title="Hold or load?"
      subtitle="One bit of register A. A multiplexer in front of the flip-flop chooses what it will store at the next tick: its own old value (hold) or the bus (load). Click bus and LOAD, then press Tick."
    >
      <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <svg viewBox="0 0 300 196" className="mx-auto block w-full max-w-[400px]" role="img" aria-label="Register bit with a load multiplexer">
          <CircuitDefs />
          {/* feedback: Q → mux input 0 */}
          <Wire d={`M254 87 V24 H80 V${muxTop} H100`} on={q} />
          <Junction x={254} y={87} on={q} />
          {/* bus → mux input 1 */}
          <InputPin x={30} y={selIn} on={bus} label="bus" onToggle={() => setBus((v) => !v)} />
          <Wire d={`M45 ${selIn} H100`} on={bus} />
          {/* LOAD → select */}
          <InputPin x={30} y={170} on={load} label="LOAD" onToggle={() => setLoad((v) => !v)} />
          <Wire d="M45 170 H122 V124" on={load} />
          {/* mux body */}
          <path
            d="M100 44 L144 56 L144 118 L100 130 Z"
            fill="var(--color-panel)"
            stroke="var(--color-ink)"
            strokeWidth={1.75}
            strokeLinejoin="round"
          />
          <text x={104} y={muxTop + 4} className="font-mono text-[11px]" fill={load ? "var(--color-dim)" : "var(--color-ink)"}>
            0
          </text>
          <text x={104} y={muxBot + 4} className="font-mono text-[11px]" fill={load ? "var(--color-ink)" : "var(--color-dim)"}>
            1
          </text>
          {/* the switch inside the mux */}
          <line
            x1={117}
            y1={load ? muxBot - 4 : muxTop + 4}
            x2={muxOut[0] - 3}
            y2={muxOut[1]}
            stroke={d ? "var(--color-on)" : "var(--color-ink)"}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {/* mux → D */}
          <Wire d={`M${muxOut[0]} ${muxOut[1]} H176`} on={d} />
          <SignalTag x={160} y={muxOut[1] - 15} on={d} />
          {/* flip-flop */}
          <rect x={176} y={58} width={62} height={70} rx={4} fill="var(--color-panel)" stroke="var(--color-ink)" strokeWidth={1.75} />
          <text x={183} y={91} className="font-mono text-[12px] font-bold" fill="var(--color-ink)">
            D
          </text>
          <text x={231} y={91} textAnchor="end" className="font-mono text-[12px] font-bold" fill="var(--color-ink)">
            Q
          </text>
          <path d="M199 128 L207 118 L215 128" fill="none" stroke="var(--color-ink)" strokeWidth={1.5} />
          <Wire d="M207 128 V160" on={false} />
          <text x={207} y={174} textAnchor="middle" className="fill-mute font-sans text-[11px]">
            clock tick
          </text>
          {/* Q out */}
          <Wire d="M238 87 H264" on={q} />
          <OutputPin x={278} y={87} on={q} label="Q" />
        </svg>
        <div className="space-y-3">
          <div className="rounded-md border border-line bg-panel-2 px-3 py-2 text-center">
            <TeX block>{`\\begin{aligned} D &= Q\\cdot\\overline{\\text{LOAD}} + \\text{bus}\\cdot\\text{LOAD} \\\\ &= ${b(q)}\\cdot${b(!load)} + ${b(bus)}\\cdot${b(load)} = ${b(d)} \\end{aligned}`}</TeX>
          </div>
          <p className="font-serif text-[0.9375rem] text-body">
            {load ? (
              <>
                <strong>LOAD = 1</strong>: the switch picks input 1, the <strong>bus</strong>. D = bus = {b(bus)}. At the
                next tick, Q becomes {b(bus)}.
              </>
            ) : (
              <>
                <strong>LOAD = 0</strong>: the switch picks input 0, the register's <strong>own output Q</strong>. D = Q
                = {b(q)}. A tick stores the same value again, so the register <em>ignores</em> the bus, whatever is on it.
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="primary" onClick={tick}>
              Tick ⏵
            </Btn>
            <Btn
              onClick={() => {
                setQ(false);
                setTicked(null);
              }}
            >
              Clear Q
            </Btn>
          </div>
          {ticked && <p className="font-serif text-[0.9375rem] text-mute">{ticked}</p>}
        </div>
      </div>
    </Widget>
  );
}
