/**
 * SVG building blocks for circuit diagrams. Everything is drawn in user units
 * inside a parent <svg>, so diagrams scale with their container.
 */
import type { ReactNode } from "react";

export function Wire({
  d,
  on,
  flow = true,
  width,
  color,
}: {
  d: string;
  on: boolean;
  flow?: boolean;
  width?: number;
  color?: string;
}) {
  return (
    <g>
      <path
        d={d}
        className={on ? "wire wire-on" : "wire"}
        style={{
          strokeWidth: width,
          ...(color && on ? { stroke: color, filter: `drop-shadow(0 0 3px ${color})` } : {}),
        }}
      />
      {on && flow && <path d={d} className="wire-flow" />}
    </g>
  );
}

export function Junction({ x, y, on }: { x: number; y: number; on: boolean }) {
  return <circle cx={x} cy={y} r={4} fill={on ? "var(--color-on)" : "var(--color-off)"} />;
}

export function Lamp({ x, y, on, r = 18, label }: { x: number; y: number; on: boolean; r?: number; label?: string }) {
  return (
    <g>
      {on && <circle cx={x} cy={y} r={r * 2.2} fill="url(#lamp-glow)" />}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={on ? "#fff3c4" : "var(--color-panel-2)"}
        stroke={on ? "var(--color-amber)" : "var(--color-line-2)"}
        strokeWidth={2.5}
        style={{ transition: "fill .2s" }}
      />
      <path
        d={`M${x - r * 0.45} ${y + r * 0.2} q${r * 0.15} -${r * 0.7} ${r * 0.3} 0 q${r * 0.15} -${r * 0.7} ${r * 0.3} 0 q${r * 0.15} -${r * 0.7} ${r * 0.3} 0`}
        fill="none"
        stroke={on ? "#ff9d00" : "var(--color-dim)"}
        strokeWidth={1.6}
      />
      {label && (
        <text x={x} y={y + r + 16} textAnchor="middle" className="fill-mute font-mono text-[11px]">
          {label}
        </text>
      )}
    </g>
  );
}

/** Put once inside any <svg> that uses <Lamp>. */
export function CircuitDefs() {
  return (
    <defs>
      <radialGradient id="lamp-glow">
        <stop offset="0%" stopColor="#ffd56b" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#ffd56b" stopOpacity="0" />
      </radialGradient>
      <marker
        id="arrow-on"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M0 0 L10 5 L0 10 z" fill="var(--color-on)" />
      </marker>
      <marker
        id="arrow-cyan"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M0 0 L10 5 L0 10 z" fill="var(--color-cyan)" />
      </marker>
      <marker
        id="arrow-dim"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M0 0 L10 5 L0 10 z" fill="var(--color-dim)" />
      </marker>
    </defs>
  );
}

export type GateKind = "AND" | "OR" | "NOT" | "NAND" | "NOR" | "XOR" | "XNOR" | "BUF";

/**
 * Standard gate symbol. The body is 60×40 units with its top-left at (x, y).
 * Inputs enter at (x, y+10) and (x, y+30) — or (x, y+20) for NOT/BUF.
 * Output leaves at gateOut(kind, x, y).
 */
export function Gate({
  kind,
  x,
  y,
  out,
  label = true,
  scale = 1,
}: {
  kind: GateKind;
  x: number;
  y: number;
  out: boolean;
  label?: boolean;
  scale?: number;
}) {
  const stroke = out ? "var(--color-on)" : "var(--color-line-2)";
  const fill = out ? "rgb(61 255 160 / 0.08)" : "var(--color-panel-2)";
  const bubble = kind === "NAND" || kind === "NOR" || kind === "NOT" || kind === "XNOR";
  let body: ReactNode;
  if (kind === "AND" || kind === "NAND") {
    body = <path d="M0 0 H32 A20 20 0 0 1 32 40 H0 Z" />;
  } else if (kind === "OR" || kind === "NOR" || kind === "XOR" || kind === "XNOR") {
    body = (
      <>
        <path d="M0 0 Q14 20 0 40 Q34 40 56 20 Q34 0 0 0 Z" />
        {(kind === "XOR" || kind === "XNOR") && <path d="M-7 0 Q7 20 -7 40" fill="none" />}
      </>
    );
  } else {
    body = <path d="M4 2 L48 20 L4 38 Z" />;
  }
  const bubbleX = kind === "NOT" ? 52 : kind === "AND" || kind === "NAND" ? 56 : 60;
  const name = kind === "BUF" ? "" : kind;
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      stroke={stroke}
      strokeWidth={2}
      fill={fill}
      style={{
        transition: "stroke .2s, fill .2s",
        filter: out ? "drop-shadow(0 0 4px rgb(61 255 160 / 0.45))" : undefined,
      }}
    >
      {body}
      {bubble && <circle cx={bubbleX} cy={20} r={4} />}
      {label && name && (
        <text
          x={kind === "NOT" ? 18 : 22}
          y={24}
          textAnchor="middle"
          stroke="none"
          className="font-mono text-[9px] font-bold"
          fill={out ? "var(--color-on)" : "var(--color-mute)"}
        >
          {name}
        </text>
      )}
    </g>
  );
}

/** Where a gate's output wire starts. */
export function gateOut(kind: GateKind, x: number, y: number): [number, number] {
  switch (kind) {
    case "NOT":
      return [x + 56, y + 20];
    case "BUF":
      return [x + 48, y + 20];
    case "AND":
      return [x + 52, y + 20];
    case "NAND":
      return [x + 60, y + 20];
    case "OR":
    case "XOR":
      return [x + 56, y + 20];
    case "NOR":
    case "XNOR":
      return [x + 64, y + 20];
  }
}

export function evalGate(kind: GateKind, a: boolean, b = false): boolean {
  switch (kind) {
    case "AND":
      return a && b;
    case "OR":
      return a || b;
    case "NOT":
      return !a;
    case "NAND":
      return !(a && b);
    case "NOR":
      return !(a || b);
    case "XOR":
      return a !== b;
    case "XNOR":
      return a === b;
    case "BUF":
      return a;
  }
}

/** A signal value label (0/1) drawn as a little badge on a wire. */
export function SignalTag({ x, y, on, text }: { x: number; y: number; on: boolean; text?: string }) {
  const t = text ?? (on ? "1" : "0");
  const w = Math.max(16, t.length * 8 + 8);
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - 9}
        width={w}
        height={18}
        rx={5}
        fill="var(--color-bg)"
        stroke={on ? "var(--color-on)" : "var(--color-line-2)"}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        className="font-mono text-[11px] font-bold"
        fill={on ? "var(--color-on)" : "var(--color-dim)"}
      >
        {t}
      </text>
    </g>
  );
}

/** Clickable input pin drawn inside SVG. */
export function InputPin({
  x,
  y,
  on,
  label,
  onToggle,
}: {
  x: number;
  y: number;
  on: boolean;
  label: string;
  onToggle?: () => void;
}) {
  return (
    <g
      onClick={onToggle}
      className={onToggle ? "cursor-pointer" : undefined}
      role={onToggle ? "button" : undefined}
      aria-label={onToggle ? `Toggle ${label}` : undefined}
      tabIndex={onToggle ? 0 : undefined}
      onKeyDown={(e) => {
        if (onToggle && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <rect
        x={x - 15}
        y={y - 15}
        width={30}
        height={30}
        rx={7}
        fill={on ? "rgb(61 255 160 / 0.18)" : "var(--color-bg)"}
        stroke={on ? "var(--color-on)" : "var(--color-line-2)"}
        strokeWidth={2}
        style={{ filter: on ? "drop-shadow(0 0 6px rgb(61 255 160 / .6))" : undefined }}
      />
      <text
        x={x}
        y={y + 5}
        textAnchor="middle"
        className="font-mono text-[14px] font-bold"
        fill={on ? "var(--color-on)" : "var(--color-dim)"}
      >
        {on ? 1 : 0}
      </text>
      <text x={x} y={y - 21} textAnchor="middle" className="fill-mute font-mono text-[11px] font-semibold">
        {label}
      </text>
    </g>
  );
}

/** Output indicator drawn inside SVG. */
export function OutputPin({ x, y, on, label }: { x: number; y: number; on: boolean; label: string }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={14}
        fill={on ? "var(--color-on)" : "var(--color-bg)"}
        stroke={on ? "var(--color-on)" : "var(--color-line-2)"}
        strokeWidth={2}
        style={{ filter: on ? "drop-shadow(0 0 8px var(--color-on))" : undefined }}
      />
      <text
        x={x}
        y={y + 5}
        textAnchor="middle"
        className="font-mono text-[13px] font-bold"
        fill={on ? "var(--color-bg)" : "var(--color-dim)"}
      >
        {on ? 1 : 0}
      </text>
      <text x={x} y={y - 21} textAnchor="middle" className="fill-mute font-mono text-[11px] font-semibold">
        {label}
      </text>
    </g>
  );
}
