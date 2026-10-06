/**
 * SVG building blocks for circuit diagrams, drawn like figures in a printed
 * book. Everything is in user units inside a parent <svg>, so diagrams scale
 * with their container. Colours come from theme tokens, so the same drawing
 * works on paper and at night.
 */
import type { CSSProperties, ReactNode } from "react";

/**
 * A wire. "On" is a heavier ink line with small beads flowing along it;
 * "off" is a thin warm-grey line. Pass `color` (a CSS colour, e.g.
 * "var(--color-cyan)") to ink an on-wire in another colour.
 */
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
  const style = {
    ...(width !== undefined && { "--wire-w": width }),
    ...(color && { "--wire-c": color }),
  } as CSSProperties;
  return (
    <g style={style}>
      <path d={d} className={on ? "wire wire-on" : "wire"} />
      {on && flow && <path d={d} className="wire-flow" />}
    </g>
  );
}

export function Junction({ x, y, on }: { x: number; y: number; on: boolean }) {
  return <circle cx={x} cy={y} r={3.5} fill={on ? "var(--color-on)" : "var(--color-off)"} />;
}

/**
 * A light bulb. When lit it gets printed rays; `intensity` (0–1) sets how
 * long the rays are and how strongly the glass is filled.
 */
export function Lamp({
  x,
  y,
  on,
  r = 18,
  label,
  intensity = 1,
}: {
  x: number;
  y: number;
  on: boolean;
  r?: number;
  label?: string;
  intensity?: number;
}) {
  const k = on ? Math.max(0, Math.min(1, intensity)) : 0;
  return (
    <g>
      {on && <circle cx={x} cy={y} r={r * 2.2} fill="url(#lamp-glow)" />}
      {on &&
        Array.from({ length: 8 }, (_, i) => {
          // Offset by 22.5° so rays never sit on top of horizontal/vertical wires.
          const a = (i * Math.PI) / 4 + Math.PI / 8;
          return (
            <line
              key={i}
              x1={x + Math.cos(a) * (r + 5)}
              y1={y + Math.sin(a) * (r + 5)}
              x2={x + Math.cos(a) * (r + 7 + 6 * k)}
              y2={y + Math.sin(a) * (r + 7 + 6 * k)}
              stroke="var(--color-amber)"
              strokeWidth={1.75}
              strokeLinecap="round"
            />
          );
        })}
      <circle
        cx={x}
        cy={y}
        r={r}
        strokeWidth={2}
        stroke={on ? "var(--color-amber)" : "var(--color-off)"}
        style={{
          fill: on
            ? `color-mix(in oklab, var(--color-lamp) ${Math.round(30 + 70 * k)}%, var(--color-panel-2))`
            : "var(--color-panel-2)",
          transition: "fill .2s",
        }}
      />
      <path
        d={`M${x - r * 0.45} ${y + r * 0.2} q${r * 0.15} -${r * 0.7} ${r * 0.3} 0 q${r * 0.15} -${r * 0.7} ${r * 0.3} 0 q${r * 0.15} -${r * 0.7} ${r * 0.3} 0`}
        fill="none"
        stroke={on ? "var(--color-lamp-filament)" : "var(--color-dim)"}
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

function Arrow({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill={color} />
    </marker>
  );
}

/** Put once inside any <svg> that uses <Lamp> or the arrow markers. */
export function CircuitDefs() {
  return (
    <defs>
      <radialGradient id="lamp-glow">
        <stop offset="0%" style={{ stopColor: "var(--color-lamp-glow)", stopOpacity: "var(--lamp-glow-alpha)" }} />
        <stop offset="100%" style={{ stopColor: "var(--color-lamp-glow)", stopOpacity: 0 }} />
      </radialGradient>
      <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line y2="5" stroke="var(--color-off)" strokeWidth="1" />
      </pattern>
      <Arrow id="arrow-on" color="var(--color-on)" />
      <Arrow id="arrow-cyan" color="var(--color-cyan)" />
      <Arrow id="arrow-dim" color="var(--color-dim)" />
      <Arrow id="arrow-ink" color="var(--color-ink)" />
      <Arrow id="arrow-amber" color="var(--color-amber)" />
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
  const stroke = out ? "var(--color-on)" : "var(--color-dim)";
  const fill = out ? "var(--color-on-tint)" : "var(--color-panel)";
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
      strokeWidth={1.75}
      fill={fill}
      className={out ? "glow-on" : undefined}
      style={{ transition: "stroke .2s, fill .2s" }}
    >
      {body}
      {bubble && <circle cx={bubbleX} cy={20} r={4} />}
      {label && name && (
        <text
          x={kind === "NOT" ? 18 : 22}
          y={24}
          textAnchor="middle"
          stroke="none"
          className="font-mono text-[10px] font-bold"
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
        rx={4}
        fill="var(--color-panel)"
        stroke={on ? "var(--color-on)" : "var(--color-off)"}
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
      aria-pressed={onToggle ? on : undefined}
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
        rx={6}
        fill={on ? "var(--color-on-tint)" : "var(--color-panel)"}
        stroke={on ? "var(--color-on)" : "var(--color-off)"}
        strokeWidth={2}
        className={on ? "glow-on" : undefined}
      />
      <text
        x={x}
        y={y + 5}
        textAnchor="middle"
        className={on ? "font-mono text-[14px] font-bold" : "font-mono text-[14px]"}
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
        fill={on ? "var(--color-on)" : "var(--color-panel)"}
        stroke={on ? "var(--color-on)" : "var(--color-off)"}
        strokeWidth={2}
        className={on ? "glow-on" : undefined}
      />
      <text
        x={x}
        y={y + 5}
        textAnchor="middle"
        className={on ? "font-mono text-[13px] font-bold" : "font-mono text-[13px]"}
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
