import { useState } from "react";

import {
  CircuitDefs,
  evalGate,
  Gate,
  gateOut,
  InputPin,
  Junction,
  Lamp,
  OutputPin,
  SignalTag,
  Wire,
  type GateKind,
} from "~/components/circuit";
import { TeX } from "~/components/tex";
import { BitButton, DataTable, Segmented, Widget } from "~/components/ui";
import { MosSymbol } from "./transistor";

/* ------------------------------------------------------------------ */
/* Gates made of plain switches                                         */
/* ------------------------------------------------------------------ */

function Switch({
  x,
  y,
  closed,
  label,
  onToggle,
  on,
}: {
  x: number;
  y: number;
  closed: boolean;
  label: string;
  onToggle: () => void;
  on: boolean;
}) {
  const color = on ? "var(--color-on)" : "var(--color-ink)";
  return (
    <g
      className="cursor-pointer"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-label={`Toggle ${label}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <rect x={x - 6} y={y - 36} width={56} height={50} fill="transparent" />
      <circle cx={x} cy={y} r={4} fill={color} />
      <circle cx={x + 44} cy={y} r={4} fill={closed ? color : "var(--color-ink)"} />
      <line
        x1={x}
        y1={y}
        x2={closed ? x + 44 : x + 38}
        y2={closed ? y : y - 22}
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        style={{ transition: "all .15s" }}
      />
      <text
        x={x + 22}
        y={y - 28}
        textAnchor="middle"
        className="font-mono text-[11px] font-bold"
        fill={closed ? "var(--color-on)" : "var(--color-mute)"}
      >
        {label}
      </text>
    </g>
  );
}

function Battery({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x - 14} y1={y} x2={x + 14} y2={y} stroke="var(--color-ink)" strokeWidth={3} />
      <line x1={x - 8} y1={y + 8} x2={x + 8} y2={y + 8} stroke="var(--color-ink)" strokeWidth={5} />
      <line x1={x - 14} y1={y + 16} x2={x + 14} y2={y + 16} stroke="var(--color-ink)" strokeWidth={3} />
      <line x1={x - 8} y1={y + 24} x2={x + 8} y2={y + 24} stroke="var(--color-ink)" strokeWidth={5} />
    </g>
  );
}

export function SwitchGates() {
  const [kind, setKind] = useState<"AND" | "OR" | "NOT">("AND");
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const ta = () => setA((v) => !v);
  const tb = () => setB((v) => !v);

  let lamp = false;
  let svg: React.ReactNode;
  if (kind === "AND") {
    lamp = a && b;
    svg = (
      <>
        <Wire d="M40 92 V40 H100" on={lamp} />
        <Switch x={100} y={40} closed={a} label={`A = ${a ? 1 : 0}`} onToggle={ta} on={lamp} />
        <Wire d="M144 40 H190" on={lamp} />
        <Switch x={190} y={40} closed={b} label={`B = ${b ? 1 : 0}`} onToggle={tb} on={lamp} />
        <Wire d="M234 40 H300 V92" on={lamp} />
        <Wire d="M300 128 V170 H40 V120" on={lamp} />
      </>
    );
  } else if (kind === "OR") {
    lamp = a || b;
    svg = (
      <>
        <Wire d="M40 92 V60 H80" on={lamp} />
        <Wire d="M80 60 V30 H120" on={a} />
        <Wire d="M80 60 V95 H120" on={b} />
        <Switch x={120} y={30} closed={a} label={`A = ${a ? 1 : 0}`} onToggle={ta} on={a} />
        <Switch x={120} y={95} closed={b} label={`B = ${b ? 1 : 0}`} onToggle={tb} on={b} />
        <Wire d="M164 30 H220 V60" on={a} />
        <Wire d="M164 95 H220 V60" on={b} />
        <Wire d="M220 60 H300 V92" on={lamp} />
        <Wire d="M300 128 V170 H40 V120" on={lamp} />
        <Junction x={80} y={60} on={lamp} />
        <Junction x={220} y={60} on={lamp} />
      </>
    );
  } else {
    lamp = !a;
    svg = (
      <>
        <Wire d="M40 92 V40 H140" on={lamp} />
        <Switch x={140} y={40} closed={!a} label={`A = ${a ? 1 : 0} (pushes it open)`} onToggle={ta} on={lamp} />
        <Wire d="M184 40 H300 V92" on={lamp} />
        <Wire d="M300 128 V170 H40 V120" on={lamp} />
      </>
    );
  }

  const rule = {
    AND: "The lamp lights only if A AND B are both closed. The switches are in a row (series), so current must pass through both.",
    OR: "The lamp lights if A OR B (or both) is closed. The switches sit side by side (parallel), giving current two possible paths.",
    NOT: "The lamp lights when A is NOT pressed. Pressing A breaks the circuit. The output is the opposite of the input.",
  }[kind];

  return (
    <Widget
      title="Logic with plain switches"
      subtitle="Click the switches (or the buttons). 1 = switch closed, lamp on = output 1."
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: "AND", label: "AND (series)" },
            { value: "OR", label: "OR (parallel)" },
            { value: "NOT", label: "NOT" },
          ]}
        />
      </div>
      <div className="grid items-center gap-4 sm:grid-cols-[1.4fr_1fr]">
        <svg viewBox="0 0 360 190" className="w-full" role="img" aria-label={`${kind} circuit made from switches`}>
          <CircuitDefs />
          <Battery x={40} y={96} />
          {svg}
          <Lamp x={300} y={110} on={lamp} r={17} />
        </svg>
        <div className="space-y-3">
          <div className="flex gap-3">
            <BitButton on={a} onClick={ta} label="A" size="lg" />
            {kind !== "NOT" && <BitButton on={b} onClick={tb} label="B" size="lg" />}
            <div className="ml-2 flex items-center font-mono text-2xl text-dim">→</div>
            <BitButton on={lamp} label="lamp" size="lg" color="amber" />
          </div>
          <p className="text-sm text-mute">{rule}</p>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* The gate playground                                                  */
/* ------------------------------------------------------------------ */

const gateInfo: Record<string, { expr: string; english: string }> = {
  NOT: { expr: "\\text{out} = \\overline{A}", english: "Flip it: 1 becomes 0, 0 becomes 1." },
  AND: { expr: "\\text{out} = A \\cdot B", english: "1 only if A and B are both 1." },
  OR: { expr: "\\text{out} = A + B", english: "1 if at least one input is 1." },
  NAND: { expr: "\\text{out} = \\overline{A \\cdot B}", english: "NOT AND: 0 only if both are 1." },
  NOR: { expr: "\\text{out} = \\overline{A + B}", english: "NOT OR: 1 only if both are 0." },
  XOR: { expr: "\\text{out} = A \\oplus B", english: "eXclusive OR: 1 if the inputs are different." },
  XNOR: {
    expr: "\\text{out} = \\overline{A \\oplus B}",
    english: "1 if the inputs are the same (an equality checker!).",
  },
};

export function GatePlayground() {
  const [kind, setKind] = useState<GateKind>("AND");
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const single = kind === "NOT";
  const out = evalGate(kind, a, b);
  const [ox, oy] = gateOut(kind, 130, 40);

  const rows = single
    ? [0, 1].map((x) => [x, evalGate(kind, !!x) ? 1 : 0])
    : [0, 1, 2, 3].map((r) => {
        const ra = (r >> 1) & 1;
        const rb = r & 1;
        return [ra, rb, evalGate(kind, !!ra, !!rb) ? 1 : 0];
      });
  const hl = single ? (a ? 1 : 0) : (a ? 2 : 0) + (b ? 1 : 0);

  return (
    <Widget title="Gate playground" subtitle="Pick a gate, click the inputs, and find your row in the truth table.">
      <Segmented
        size="sm"
        value={kind}
        onChange={setKind}
        options={(["NOT", "AND", "OR", "NAND", "NOR", "XOR", "XNOR"] as GateKind[]).map((g) => ({
          value: g,
          label: g,
        }))}
      />
      <div className="mt-4 grid items-center gap-6 md:grid-cols-[1.3fr_1fr]">
        <div>
          <svg viewBox="0 0 320 130" className="w-full" role="img" aria-label={`${kind} gate`}>
            {single ? (
              <>
                <InputPin x={32} y={60} on={a} label="A" onToggle={() => setA((v) => !v)} />
                <Wire d="M47 60 H130" on={a} />
              </>
            ) : (
              <>
                <InputPin x={32} y={36} on={a} label="A" onToggle={() => setA((v) => !v)} />
                <InputPin x={32} y={96} on={b} label="B" onToggle={() => setB((v) => !v)} />
                <Wire d="M47 36 H100 V50 H130" on={a} />
                <Wire d="M47 96 H100 V70 H130" on={b} />
              </>
            )}
            <Gate kind={kind} x={130} y={40} out={out} scale={1} />
            <Wire d={`M${ox} ${oy} H262`} on={out} />
            <OutputPin x={278} y={60} on={out} label="out" />
          </svg>
          <div className="mt-2 text-center text-lg">
            <TeX>{gateInfo[kind].expr}</TeX>
          </div>
          <p className="mt-1 text-center text-sm text-mute">{gateInfo[kind].english}</p>
        </div>
        <DataTable head={single ? ["A", "out"] : ["A", "B", "out"]} rows={rows} highlight={hl} />
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* CMOS NAND at transistor level                                        */
/* ------------------------------------------------------------------ */

export function CmosNand() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  const pa = !a;
  const pb = !b;
  const na = a;
  const nb = b;
  const out = pa || pb; // pulled up if either pMOS conducts
  const pulledDown = na && nb;

  return (
    <Widget
      title="A real NAND gate: 4 transistors"
      subtitle="Two pMOS on top (parallel) can connect the output to 1. Two nMOS on the bottom (series) can connect it to 0. Exactly one side is ever connected."
    >
      <div className="grid items-center gap-4 md:grid-cols-[1.2fr_1fr]">
        <svg viewBox="0 0 340 310" className="w-full max-w-md" role="img" aria-label="CMOS NAND gate">
          <text x={170} y={14} textAnchor="middle" className="fill-on font-mono text-[11px]">
            supply (1)
          </text>
          <line x1={90} y1={22} x2={270} y2={22} stroke="var(--color-on)" strokeWidth={3} />
          <Wire d="M122 22 V38" on={out && pa} flow={false} />
          <Wire d="M242 22 V38" on={out && pb} flow={false} />
          <MosSymbol x={110} y={70} type="p" conducting={pa} gateOn={a} />
          <MosSymbol x={230} y={70} type="p" conducting={pb} gateOn={b} />
          <text
            x={58}
            y={60}
            textAnchor="end"
            className="font-mono text-[11px] font-bold"
            fill={a ? "var(--color-on)" : "var(--color-mute)"}
          >
            A={a ? 1 : 0}
          </text>
          <text
            x={178}
            y={60}
            textAnchor="end"
            className="font-mono text-[11px] font-bold"
            fill={b ? "var(--color-on)" : "var(--color-mute)"}
          >
            B={b ? 1 : 0}
          </text>
          <Wire d="M122 102 V130 H242 V102" on={out} flow={false} />
          <Wire d="M172 130 V143" on={out} flow={false} />
          <Wire d="M242 130 H292" on={out} flow={false} />
          <Junction x={172} y={130} on={out} />
          <circle
            cx={304}
            cy={130}
            r={11}
            fill={out ? "var(--color-on)" : "var(--color-bg)"}
            stroke={out ? "var(--color-on)" : "var(--color-dim)"}
            strokeWidth={2}
          />
          <text x={304} y={155} textAnchor="middle" className="fill-mute font-mono text-[11px]">
            out={out ? 1 : 0}
          </text>
          <MosSymbol x={160} y={175} type="n" conducting={na} gateOn={a} />
          <Wire d="M172 207 V208" on={false} flow={false} />
          <MosSymbol x={160} y={240} type="n" conducting={nb} gateOn={b} />
          <text
            x={108}
            y={171}
            textAnchor="end"
            className="font-mono text-[11px] font-bold"
            fill={a ? "var(--color-on)" : "var(--color-mute)"}
          >
            A={a ? 1 : 0}
          </text>
          <text
            x={108}
            y={236}
            textAnchor="end"
            className="font-mono text-[11px] font-bold"
            fill={b ? "var(--color-on)" : "var(--color-mute)"}
          >
            B={b ? 1 : 0}
          </text>
          <line
            x1={140}
            y1={290}
            x2={204}
            y2={290}
            stroke={pulledDown ? "var(--color-cyan)" : "var(--color-dim)"}
            strokeWidth={3}
          />
          <line
            x1={172}
            y1={272}
            x2={172}
            y2={290}
            stroke={pulledDown ? "var(--color-cyan)" : "var(--color-dim)"}
            strokeWidth={2.5}
          />
          <text x={172} y={306} textAnchor="middle" className="fill-dim font-mono text-[11px]">
            ground (0)
          </text>
        </svg>
        <div className="space-y-4">
          <div className="flex gap-3">
            <BitButton on={a} onClick={() => setA((v) => !v)} label="A" size="lg" />
            <BitButton on={b} onClick={() => setB((v) => !v)} label="B" size="lg" />
            <div className="ml-2 flex items-center font-mono text-2xl text-dim">→</div>
            <BitButton on={out} label="out" size="lg" />
          </div>
          <p className="text-sm text-mute">
            {pulledDown ? (
              <>
                Both nMOS are on, so there's a complete path from the output down to{" "}
                <span className="text-cyan">ground</span>. Both pMOS are off. Output ={" "}
                <span className="font-mono text-ink">0</span>.
              </>
            ) : (
              <>
                At least one pMOS is on (its input is 0), connecting the output up to the{" "}
                <span className="text-on">supply</span>. The nMOS chain is broken somewhere. Output ={" "}
                <span className="font-mono text-on">1</span>.
              </>
            )}
          </p>
          <p className="text-xs text-dim">Green channel = transistor conducting. Dashed = blocking.</p>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* XOR built from three gates                                           */
/* ------------------------------------------------------------------ */

export function XorBuild() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const or = a || b;
  const nand = !(a && b);
  const out = or && nand;
  return (
    <Widget
      title="Building XOR out of simpler gates"
      subtitle="“A or B, but not both” = (A OR B) AND (A NAND B). Click A and B to watch every wire."
    >
      <svg viewBox="0 0 430 160" className="w-full" role="img" aria-label="XOR from OR, NAND and AND">
        <InputPin x={30} y={40} on={a} label="A" onToggle={() => setA((v) => !v)} />
        <InputPin x={30} y={122} on={b} label="B" onToggle={() => setB((v) => !v)} />
        <Wire d="M45 40 H80 V30 H150" on={a} />
        <Wire d="M80 40 V110 H150" on={a} />
        <Wire d="M45 122 H100 V130 H150" on={b} />
        <Wire d="M100 122 V50 H150" on={b} />
        <Junction x={80} y={40} on={a} />
        <Junction x={100} y={122} on={b} />
        <Gate kind="OR" x={150} y={20} out={or} />
        <Gate kind="NAND" x={150} y={100} out={nand} />
        <Wire d="M206 40 H260 V70 H300" on={or} />
        <Wire d="M210 120 H260 V90 H300" on={nand} />
        <SignalTag x={236} y={40} on={or} />
        <SignalTag x={236} y={120} on={nand} />
        <Gate kind="AND" x={300} y={60} out={out} />
        <Wire d="M352 80 H384" on={out} />
        <OutputPin x={400} y={80} on={out} label="A XOR B" />
      </svg>
      <div className="mt-2 grid gap-2 text-center font-mono text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-bg/50 py-1.5">
          A OR B = <span className={or ? "text-on" : "text-dim"}>{or ? 1 : 0}</span>
        </div>
        <div className="rounded-lg border border-line bg-bg/50 py-1.5">
          A NAND B = <span className={nand ? "text-on" : "text-dim"}>{nand ? 1 : 0}</span>
        </div>
        <div className="rounded-lg border border-on/40 bg-on/5 py-1.5">
          both → <span className={out ? "text-on" : "text-dim"}>{out ? 1 : 0}</span>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* NAND is universal                                                    */
/* ------------------------------------------------------------------ */

export function NandUniversal() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(true);
  const n1 = !(a && a);
  const nab = !(a && b);
  const and = !(nab && nab);
  const na = !a;
  const nb = !b;
  const or = !(na && nb);
  return (
    <Widget
      title="Everything from NAND"
      subtitle="Each circuit below uses only NAND gates, yet behaves like NOT, AND and OR."
    >
      <div className="mb-3 flex gap-3">
        <BitButton on={a} onClick={() => setA((v) => !v)} label="A" />
        <BitButton on={b} onClick={() => setB((v) => !v)} label="B" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-line bg-bg/50 p-2">
          <div className="text-center text-sm font-semibold text-ink">
            NOT A = <span className={n1 ? "text-on" : "text-dim"}>{n1 ? 1 : 0}</span>
          </div>
          <svg viewBox="0 0 160 80" className="w-full">
            <Wire d="M10 40 H30 V30 H50 M30 40 V50 H50" on={a} />
            <Gate kind="NAND" x={50} y={20} out={n1} />
            <Wire d="M110 40 H150" on={n1} />
            <text x={10} y={30} className="fill-mute font-mono text-[11px]">
              A
            </text>
          </svg>
          <div className="text-center text-xs text-mute">feed A into both inputs</div>
        </div>
        <div className="rounded-xl border border-line bg-bg/50 p-2">
          <div className="text-center text-sm font-semibold text-ink">
            A AND B = <span className={and ? "text-on" : "text-dim"}>{and ? 1 : 0}</span>
          </div>
          <svg viewBox="0 0 200 80" className="w-full">
            <Wire d="M5 30 H30" on={a} />
            <Wire d="M5 50 H30" on={b} />
            <Gate kind="NAND" x={30} y={20} out={nab} />
            <Wire d="M90 40 H100 V30 H120 M100 40 V50 H120" on={nab} />
            <Gate kind="NAND" x={120} y={20} out={and} />
            <Wire d="M180 40 H196" on={and} />
          </svg>
          <div className="text-center text-xs text-mute">NAND, then NOT it</div>
        </div>
        <div className="rounded-xl border border-line bg-bg/50 p-2">
          <div className="text-center text-sm font-semibold text-ink">
            A OR B = <span className={or ? "text-on" : "text-dim"}>{or ? 1 : 0}</span>
          </div>
          <svg viewBox="0 0 200 110" className="w-full">
            <Wire d="M5 20 H15 V10 H30 M15 20 V30 H30" on={a} />
            <Wire d="M5 90 H15 V80 H30 M15 90 V100 H30" on={b} />
            <Gate kind="NAND" x={30} y={0} out={na} scale={1} />
            <Gate kind="NAND" x={30} y={70} out={nb} />
            <Wire d="M90 20 H105 V45 H120" on={na} />
            <Wire d="M90 90 H105 V65 H120" on={nb} />
            <Gate kind="NAND" x={120} y={35} out={or} />
            <Wire d="M180 55 H196" on={or} />
          </svg>
          <div className="text-center text-xs text-mute">NOT both inputs, then NAND</div>
        </div>
      </div>
    </Widget>
  );
}
