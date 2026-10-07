/**
 * Widgets for the "Making a Chip" chapter: printing a NAND gate layer by
 * layer, from code to standard cells, wafer yield, and Moore's law.
 */
import { useId, useMemo, useState, type ReactNode } from "react";

import { CircuitDefs, Gate, Junction, Wire } from "~/components/circuit";
import { TeX } from "~/components/tex";
import { BitButton, Btn, cx, DataTable, Figure, Segmented, Slider, Stat, Widget } from "~/components/ui";
import { fmt, rng } from "~/lib/bits";

/** A unique id that is safe inside url(#…). */
/** Round to 0.01 so the server and the browser print identical SVG numbers. */
const r2 = (v: number) => Math.round(v * 100) / 100;

function useSvgId() {
  return "chip" + useId().replace(/[^a-zA-Z0-9]/g, "");
}

/* ================================================================== */
/* 1. Print a layer: four masks make a CMOS NAND gate                  */
/* ================================================================== */

/** [row, col, rows, cols] in grid squares. */
type Box = readonly [number, number, number, number];
type Cell = readonly [number, number];

const G = 12; // squares per side
const C = 24; // px per square
const GW = G * C;
const GX = 46; // grid left
const GY = 10; // grid top
const SY = 322; // side view top
const SI = SY + 104; // silicon surface in the side view
const VB_W = GX + GW + 60;
const VB_H = SI + 54;

// Mask 1: n-type. A wide band on top (the pMOS live in it) and three islands below (nMOS source/drain).
const N_BOXES: Box[] = [
  [1, 0, 4, 12],
  [8, 1, 2, 2],
  [8, 4, 2, 4],
  [8, 9, 2, 2],
];
// Mask 2: p-type islands inside the n band (pMOS source/drain).
const P_BOXES: Box[] = [
  [2, 1, 2, 2],
  [2, 4, 2, 4],
  [2, 9, 2, 2],
];
// Mask 3: two gate stripes. Where a stripe crosses a gap between islands, there is a transistor.
const GATE_BOXES: Box[] = [
  [1, 3, 10, 1],
  [1, 8, 10, 1],
];
// Mask 4: metal wires.
const METAL_BOXES: Box[] = [
  [0, 0, 1, 12], // VDD rail
  [11, 0, 1, 12], // GND rail
  [0, 1, 3, 1], // VDD → left p island
  [0, 10, 3, 1], // VDD → right p island
  [9, 1, 3, 1], // GND → left n island
  [5, 0, 1, 4], // input A → gate A
  [5, 8, 1, 4], // input B → gate B
  [2, 5, 6, 1], // OUT: middle p island …
  [7, 5, 1, 7], // … across (over gate B, insulated) …
  [7, 9, 3, 1], // … down to the right n island
];
/** Where metal reaches down through the glass and touches the layer below. */
const CONTACTS: Cell[] = [
  [2, 1],
  [2, 10],
  [9, 1],
  [2, 5],
  [9, 9],
  [5, 3],
  [5, 8],
];

interface LayerDef {
  title: string;
  verb: string;
  boxes: Box[];
  process: ReactNode;
  done: ReactNode;
}

const LAYERS: LayerDef[] = [
  {
    title: "n-type silicon",
    verb: "Dope",
    boxes: N_BOXES,
    process: (
      <>
        <strong>Dope:</strong> fire phosphorus atoms at the wafer. The resist stops them. In the openings they sink into
        the silicon and turn it <span className="text-cyan">n-type</span>.
      </>
    ),
    done: (
      <>
        Layer 1 is finished: a wide n-type band at the top (the pMOS transistors will live here) and three n-type
        islands at the bottom (for the nMOS transistors).
      </>
    ),
  },
  {
    title: "p-type islands",
    verb: "Dope",
    boxes: P_BOXES,
    process: (
      <>
        <strong>Dope:</strong> fire boron atoms. In the openings the silicon turns{" "}
        <span className="text-violet">p-type</span>: three p islands inside the n-type band.
      </>
    ),
    done: (
      <>
        Layer 2 is finished. Both rows now have three islands, with a narrow gap between neighbours. Each gap will become
        the channel of one transistor.
      </>
    ),
  },
  {
    title: "gates",
    verb: "Deposit",
    boxes: GATE_BOXES,
    process: (
      <>
        <strong>Deposit:</strong> grow a very thin film of glass in the two open stripes, then lay gate material on top
        of it.
      </>
    ),
    done: (
      <>
        Layer 3 is finished. Wherever a gate stripe crosses a gap between two islands there is now a transistor: 2 pMOS
        at the top and 2 nMOS at the bottom.
      </>
    ),
  },
  {
    title: "metal wires",
    verb: "Deposit",
    boxes: METAL_BOXES,
    process: (
      <>
        <strong>Deposit:</strong> fill the openings with copper. At each contact (⊠) the copper reaches down through the
        glass and touches the island or gate below it. Everywhere else, the glass keeps it apart.
      </>
    ),
    done: (
      <>
        All four layers are done! The supply (VDD = 1), ground (GND = 0), inputs A and B and the output OUT are wired
        up. This is the 4-transistor NAND gate from Logic Gates. Try it below.
      </>
    ),
  },
];

const TOTAL_STEPS = LAYERS.length * 5;

interface Vis {
  n: boolean;
  p: boolean;
  gate: boolean;
  metal: boolean;
  glass: boolean;
}

const ALL_VIS: Vis = { n: true, p: true, gate: true, metal: true, glass: true };

function stateOf(k: number) {
  const layer = k === 0 ? -1 : Math.min(LAYERS.length - 1, Math.floor((k - 1) / 5));
  const step = k === 0 ? 0 : ((k - 1) % 5) + 1;
  const has = (l: number) => k >= 5 * (l + 1) || (layer === l && step >= 4);
  return {
    layer,
    step,
    vis: { n: has(0), p: has(1), gate: has(2), metal: has(3), glass: layer === 3 } as Vis,
    resist: layer >= 0 && step >= 1 && step <= 4,
    exposing: step === 2,
    open: step === 3 || step === 4,
  };
}

function boxRect(b: Box, ox: number, oy: number, inset = 0) {
  return {
    x: ox + b[1] * C + inset,
    y: oy + b[0] * C + inset,
    width: b[3] * C - 2 * inset,
    height: b[2] * C - 2 * inset,
  };
}

function colsInRow(boxes: Box[], row: number) {
  return Array.from({ length: G }, (_, c) =>
    boxes.some(([r, c0, h, w]) => row >= r && row < r + h && c >= c0 && c < c0 + w),
  );
}

/** Runs of consecutive true flags, as [start, end) pairs. */
function runs(flags: boolean[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let start = -1;
  flags.forEach((f, i) => {
    if (f && start < 0) start = i;
    if (!f && start >= 0) {
      out.push([start, i]);
      start = -1;
    }
  });
  if (start >= 0) out.push([start, flags.length]);
  return out;
}

/** Polylines given in grid units ([col, row] points) → an SVG path in px. */
function gridPath(lines: Array<Array<[number, number]>>) {
  return lines
    .map((pts) => pts.map(([c, r], i) => `${i ? "L" : "M"}${GX + c * C} ${GY + r * C}`).join(" "))
    .join(" ");
}

function MetalArt({ ox, oy }: { ox: number; oy: number }) {
  return (
    <g>
      {/* outline pass, then fill pass: touching wires merge into one shape */}
      {METAL_BOXES.map((b, i) => (
        <rect
          key={`o${i}`}
          {...boxRect(b, ox, oy, 3)}
          fill="var(--color-metal-2)"
          stroke="var(--color-metal-2)"
          strokeWidth={2.5}
        />
      ))}
      {METAL_BOXES.map((b, i) => (
        <rect key={`f${i}`} {...boxRect(b, ox, oy, 3)} fill="var(--color-metal)" />
      ))}
      {CONTACTS.map(([r, c]) => {
        const x = ox + c * C + 6;
        const y = oy + r * C + 6;
        return (
          <g key={`${r}-${c}`} stroke="var(--color-ink)" strokeWidth={1}>
            <rect x={x} y={y} width={12} height={12} fill="var(--color-metal-2)" />
            <path d={`M${x} ${y} l12 12 m0 -12 l-12 12`} />
          </g>
        );
      })}
    </g>
  );
}

const LETTERS: Array<{ x: number; y: number; t: "n" | "p"; layer: "sub" | "n" | "p" }> = [
  { x: 1.5, y: 6.6, t: "p", layer: "sub" },
  { x: 10.5, y: 6.6, t: "p", layer: "sub" },
  { x: 6.5, y: 1.6, t: "n", layer: "n" },
  { x: 2.5, y: 9.1, t: "n", layer: "n" },
  { x: 6.5, y: 9.1, t: "n", layer: "n" },
  { x: 10.5, y: 9.1, t: "n", layer: "n" },
  { x: 2.5, y: 3.1, t: "p", layer: "p" },
  { x: 6.5, y: 3.1, t: "p", layer: "p" },
  { x: 9.5, y: 3.1, t: "p", layer: "p" },
];

/** Top view of the cell with the finished layers in `vis`. */
function CellArt({ vis, ox, oy, detail }: { vis: Vis; ox: number; oy: number; detail: boolean }) {
  return (
    <g>
      <rect x={ox} y={oy} width={GW} height={GW} fill="var(--color-si-p)" stroke="var(--color-si-p-edge)" />
      {vis.n &&
        N_BOXES.map((b, i) => (
          <rect
            key={i}
            {...boxRect(b, ox, oy)}
            fill="var(--color-si-n)"
            stroke="var(--color-si-n-edge)"
            strokeWidth={1.25}
          />
        ))}
      {vis.p &&
        P_BOXES.map((b, i) => (
          <rect
            key={i}
            {...boxRect(b, ox, oy, 1)}
            rx={2}
            fill="var(--color-si-p)"
            stroke="var(--color-si-p-edge)"
            strokeWidth={1.75}
          />
        ))}
      {detail && (
        <g stroke="var(--color-line-2)" strokeWidth={0.6} strokeOpacity={0.7}>
          {Array.from({ length: G - 1 }, (_, i) => (
            <g key={i}>
              <line x1={ox + (i + 1) * C} x2={ox + (i + 1) * C} y1={oy} y2={oy + GW} />
              <line y1={oy + (i + 1) * C} y2={oy + (i + 1) * C} x1={ox} x2={ox + GW} />
            </g>
          ))}
        </g>
      )}
      {detail &&
        LETTERS.filter((l) => (l.layer === "sub" ? !vis.n || l.y > 5 : vis[l.layer])).map((l, i) => (
          <text
            key={i}
            x={ox + l.x * C}
            y={oy + l.y * C + 4}
            textAnchor="middle"
            className="font-mono text-[12px] font-semibold"
            fill={l.t === "n" ? "var(--color-cyan)" : "var(--color-violet)"}
          >
            {l.t}
          </text>
        ))}
      {vis.gate &&
        GATE_BOXES.map((b, i) => {
          const r = boxRect(b, ox, oy);
          return (
            <rect
              key={i}
              x={r.x + 4}
              y={r.y + 3}
              width={r.width - 8}
              height={r.height - 6}
              rx={2}
              fill="var(--color-si-gate)"
              stroke="var(--color-off)"
            />
          );
        })}
      {vis.metal && <MetalArt ox={ox} oy={oy} />}
    </g>
  );
}

const RESIST_FILL = "color-mix(in oklab, var(--color-amber) 30%, var(--color-panel))";

function SideView({ row, st, uv }: { row: number; st: ReturnType<typeof stateOf>; uv: string }) {
  const { vis, layer: L } = st;
  const n = colsInRow(N_BOXES, row);
  const p = colsInRow(P_BOXES, row);
  const gate = colsInRow(GATE_BOXES, row);
  const metal = colsInRow(METAL_BOXES, row);
  const contacts = CONTACTS.filter(([r]) => r === row).map(([, c]) => c);
  const hole = L >= 0 ? colsInRow(LAYERS[L].boxes, row) : colsInRow([], row);
  const deep = row >= 1 && row <= 4;
  const x = (c: number) => GX + c * C;
  const rTop = L === 3 ? SI - 52 : SI - 18;
  const rBot = L === 3 ? SI - 40 : SI;
  const well = (c0: number, c1: number, d: number) => {
    const x0 = x(c0);
    const w = (c1 - c0) * C;
    const r = Math.min(6, w / 4);
    return `M${x0} ${SI} h${w} v${d - r} q0 ${r} ${-r} ${r} h${-(w - 2 * r)} q${-r} 0 ${-r} ${-r} z`;
  };

  // Labels in the right margin, highest priority first; drop any that would collide.
  const want: Array<[number, string]> = [];
  if (st.resist) want.push([(rTop + rBot) / 2 + 4, "resist"]);
  if (st.step === 4 && L <= 1) want.push([SI - 26, L === 0 ? "P atoms" : "B atoms"]);
  if (vis.metal) want.push([SI - 42, "metal"]);
  if (vis.glass) want.push([SI - 22, "glass"]);
  if (vis.gate) want.push([SI - 7, "gate"]);
  want.push([SI + 28, "silicon"]);
  const labels: Array<[number, string]> = [];
  for (const w of want) if (labels.every((l) => Math.abs(l[0] - w[0]) >= 12)) labels.push(w);

  return (
    <g>
      <text x={GX} y={SY + 8} className="fill-dim font-sans text-[11px] font-semibold tracking-[0.08em] uppercase">
        Side view, cut along the dashed line
      </text>
      {/* silicon */}
      <rect x={GX} y={SI} width={GW} height={46} fill="var(--color-si-p)" stroke="var(--color-si-p-edge)" />
      {vis.n &&
        runs(n).map(([a, b]) => (
          <path
            key={a}
            d={well(a, b, deep ? 34 : 20)}
            fill="var(--color-si-n)"
            stroke="var(--color-si-n-edge)"
            strokeWidth={1.25}
          />
        ))}
      {vis.p &&
        runs(p).map(([a, b]) => (
          <path
            key={a}
            d={well(a, b, 16)}
            fill="var(--color-si-p)"
            stroke="var(--color-si-p-edge)"
            strokeWidth={1.5}
          />
        ))}
      {vis.n &&
        runs(n)
          .filter(([a, b]) => b - a >= 2)
          .map(([a, b]) =>
            deep ? (
              <text
                key={a}
                x={x(3) + C / 2}
                y={SI + 30}
                textAnchor="middle"
                className="font-mono text-[12px] font-semibold"
                fill="var(--color-cyan)"
              >
                n
              </text>
            ) : (
              <text
                key={a}
                x={(x(a) + x(b)) / 2}
                y={SI + 14}
                textAnchor="middle"
                className="font-mono text-[12px] font-semibold"
                fill="var(--color-cyan)"
              >
                n
              </text>
            ),
          )}
      {vis.p &&
        runs(p).map(([a, b]) => (
          <text
            key={a}
            x={(x(a) + x(b)) / 2}
            y={SI + 12}
            textAnchor="middle"
            className="font-mono text-[12px] font-semibold"
            fill="var(--color-violet)"
          >
            p
          </text>
        ))}
      {!vis.n && (
        <text
          x={x(6)}
          y={SI + 28}
          textAnchor="middle"
          className="font-mono text-[12px] font-semibold"
          fill="var(--color-violet)"
        >
          p
        </text>
      )}
      {/* insulating glass under the metal floor */}
      {vis.glass && (
        <g>
          <rect x={GX} y={SI - 40} width={GW} height={40} fill="var(--color-oxide)" stroke="var(--color-off)" strokeWidth={0.75} />
          <rect x={GX} y={SI - 40} width={GW} height={40} fill="url(#hatch)" opacity={0.35} />
        </g>
      )}
      {vis.gate &&
        gate.map(
          (g, c) =>
            g && (
              <g key={c}>
                <rect x={x(c) + 4} y={SI - 4} width={C - 8} height={4} fill="var(--color-oxide)" stroke="var(--color-off)" strokeWidth={0.75} />
                <rect x={x(c) + 4} y={SI - 18} width={C - 8} height={14} rx={2} fill="var(--color-si-gate)" stroke="var(--color-off)" />
              </g>
            ),
        )}
      {vis.metal && (
        <g fill="var(--color-metal)" stroke="var(--color-metal-2)" strokeWidth={1.25}>
          {contacts.map((c) => (
            <rect key={`c${c}`} x={x(c) + C / 2 - 4} y={SI - 41} width={8} height={41} />
          ))}
          {runs(metal).map(([a, b]) => (
            <rect key={a} x={x(a) + 3} y={SI - 52} width={(b - a) * C - 6} height={12} rx={1.5} />
          ))}
        </g>
      )}
      {/* resist film */}
      {st.resist &&
        runs(hole.map((h) => !(st.open && h))).map(([a, b]) => (
          <rect
            key={`r${a}`}
            x={x(a)}
            y={rTop}
            width={(b - a) * C}
            height={rBot - rTop}
            style={{ fill: RESIST_FILL }}
            stroke="var(--color-amber)"
            strokeWidth={1}
          />
        ))}
      {st.exposing &&
        runs(hole).map(([a, b]) => (
          <rect key={`e${a}`} x={x(a)} y={rTop} width={(b - a) * C} height={rBot - rTop} fill={`url(#${uv})`} />
        ))}
      {/* dopant atoms on their way in */}
      {st.step === 4 &&
        L <= 1 &&
        hole.map(
          (h, c) =>
            h && (
              <g key={`d${c}`} fill={L === 0 ? "var(--color-cyan)" : "var(--color-violet)"}>
                <circle cx={x(c) + 7} cy={SI - 32} r={2.2} />
                <circle cx={x(c) + 16} cy={SI - 25} r={2.2} />
                <circle cx={x(c) + 10} cy={SI + 6} r={2.2} />
              </g>
            ),
        )}
      {/* the mask and the light */}
      {st.exposing && (
        <g>
          {Array.from({ length: Math.floor(GW / 16) }, (_, i) => {
            const xx = GX + 8 + i * 16;
            return (
              <path
                key={i}
                d={`M${xx} ${SY + 15} V${SY + 27} M${xx - 3} ${SY + 23} L${xx} ${SY + 27} L${xx + 3} ${SY + 23}`}
                stroke="var(--color-violet)"
                strokeWidth={1.4}
                fill="none"
              />
            );
          })}
          {runs(hole.map((h) => !h)).map(([a, b]) => (
            <rect key={`m${a}`} x={x(a)} y={SY + 30} width={(b - a) * C} height={7} fill="var(--color-metal-2)" />
          ))}
          {hole.map(
            (h, c) =>
              h && (
                <path
                  key={`l${c}`}
                  d={`M${x(c) + C / 2} ${SY + 40} V${rTop - 3} M${x(c) + C / 2 - 3} ${rTop - 7} L${x(c) + C / 2} ${rTop - 3} L${x(c) + C / 2 + 3} ${rTop - 7}`}
                  stroke="var(--color-violet)"
                  strokeWidth={1.4}
                  fill="none"
                />
              ),
          )}
          <text x={GX - 6} y={SY + 25} textAnchor="end" className="fill-violet font-mono text-[12px]">
            light
          </text>
          <text x={GX - 6} y={SY + 38} textAnchor="end" className="fill-mute font-mono text-[12px]">
            mask
          </text>
        </g>
      )}
      {labels.map(([y, t]) => (
        <text key={t} x={GX + GW + 6} y={y} className="fill-mute font-mono text-[12px]">
          {t}
        </text>
      ))}
    </g>
  );
}

function Swatch({ fill, stroke, hatch, children }: { fill: string; stroke: string; hatch?: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
        <rect x="0.5" y="0.5" width="13" height="13" rx="2" style={{ fill }} stroke={stroke} />
        {hatch && <rect x="0.5" y="0.5" width="13" height="13" rx="2" fill={`url(#${hatch})`} />}
      </svg>
      {children}
    </span>
  );
}

export function PrintLayerWidget() {
  const [k, setK] = useState(0);
  const [slice, setSlice] = useState<2 | 9>(9);
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  const [zoom, setZoom] = useState<1 | 8 | 64>(1);
  const uid = useSvgId();
  const st = stateOf(k);
  const L = st.layer;
  const layer = L >= 0 ? LAYERS[L] : null;
  const complete = k === TOTAL_STEPS;
  const showSignals = complete && zoom === 1;
  const out = !(a && b);
  const zoomed = complete && zoom > 1;

  const go = (next: number) => {
    setK(Math.max(0, Math.min(TOTAL_STEPS, next)));
    if (next < TOTAL_STEPS) setZoom(1);
  };
  const finishLayer = () => go(k === 0 ? 5 : st.step === 5 ? k + 5 : 5 * (L + 1));

  const stepNames = layer ? ["Coat", "Expose", "Develop", layer.verb, "Strip"] : [];
  const maskNo = L + 1;
  let text: ReactNode;
  if (k === 0) {
    text = (
      <>
        A bare piece of wafer: plain <span className="text-violet">p-type</span> silicon, as in the transistor chapter.
        The grid squares are only there to help you count. Press <strong>Next step</strong> to print the first layer.
      </>
    );
  } else if (st.step === 1) {
    text =
      L === 3 ? (
        <>
          <strong>Coat:</strong> first the whole wafer gets a layer of insulating glass, and small contact holes are etched
          through it (that takes one more mask, which we skip). Then a fresh film of light-sensitive{" "}
          <strong>resist</strong> is spread over everything.
        </>
      ) : (
        <>
          <strong>Coat:</strong> spin a thin film of light-sensitive <strong>resist</strong> over the whole wafer. Now
          nothing can reach the silicon.
        </>
      );
  } else if (st.step === 2) {
    text = (
      <>
        <strong>Expose:</strong> shine ultraviolet light through mask {maskNo}. The chrome on the mask blocks the light;
        only its holes let light through. Where the light lands, the resist changes chemically.
      </>
    );
  } else if (st.step === 3) {
    text = (
      <>
        <strong>Develop:</strong> wash the wafer. Only the resist that the light changed dissolves, so openings appear in
        exactly the shape of the mask's holes.
      </>
    );
  } else if (st.step === 4) {
    text = layer!.process;
  } else {
    text = (
      <>
        <strong>Strip:</strong> dissolve the leftover resist. {layer!.done}
      </>
    );
  }

  const nets = {
    vdd: gridPath([
      [[0, 0.5], [12, 0.5]],
      [[1.5, 0.5], [1.5, 2.5]],
      [[10.5, 0.5], [10.5, 2.5]],
    ]),
    gnd: gridPath([
      [[0, 11.5], [12, 11.5]],
      [[1.5, 11.5], [1.5, 9.5]],
    ]),
    a: gridPath([
      [[0, 5.5], [3.5, 5.5]],
      [[3.5, 1.2], [3.5, 10.8]],
    ]),
    b: gridPath([
      [[8.5, 5.5], [12, 5.5]],
      [[8.5, 1.2], [8.5, 10.8]],
    ]),
    out: gridPath([
      [[5.5, 2.5], [5.5, 7.5], [12, 7.5]],
      [[9.5, 7.5], [9.5, 9.5]],
    ]),
  };
  const fets = [
    { col: 3, row: 2, on: !a, name: "pMOS A" },
    { col: 8, row: 2, on: !b, name: "pMOS B" },
    { col: 3, row: 8, on: a, name: "nMOS A" },
    { col: 8, row: 8, on: b, name: "nMOS B" },
  ];
  const pin = (row: number, label: string, value: boolean | null, side: "l" | "r") => (
    <text
      x={side === "l" ? GX - 6 : GX + GW + 6}
      y={GY + (row + 0.5) * C + 4}
      textAnchor={side === "l" ? "end" : "start"}
      className="font-mono text-[12px] font-semibold"
      fill={value ? "var(--color-on)" : "var(--color-mute)"}
    >
      {label}
      {value !== null && `=${value ? 1 : 0}`}
    </text>
  );

  return (
    <Widget
      wide
      title="Print a NAND gate, one layer at a time"
      subtitle="Four masks, and the same five steps for each one. The big square is a top view of a tiny patch of the wafer; the strip below shows a side view of the same patch."
    >
      <div className="grid gap-5 @3xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
        <div className="scroll-thin overflow-x-auto">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="mx-auto w-full max-w-[25rem] min-w-[330px]"
            role="img"
            aria-label="Top view and side view of a NAND gate being printed on silicon"
          >
            <CircuitDefs />
            <defs>
              <mask id={`${uid}-open`} maskUnits="userSpaceOnUse" x={GX - 12} y={GY - 12} width={GW + 24} height={GW + 24}>
                <rect x={GX - 12} y={GY - 12} width={GW + 24} height={GW + 24} fill="white" />
                {layer?.boxes.map((bx, i) => <rect key={i} {...boxRect(bx, GX, GY)} fill="black" />)}
              </mask>
              <pattern id={`${uid}-uv`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="var(--color-violet-tint)" />
                <line y2="6" stroke="var(--color-violet)" strokeWidth="1.6" />
              </pattern>
              {complete && (
                <pattern id={`${uid}-tile`} x={GX} y={GY} width={GW / zoom} height={GW / zoom} patternUnits="userSpaceOnUse">
                  <g transform={`scale(${1 / zoom})`}>
                    <CellArt vis={ALL_VIS} ox={0} oy={0} detail={false} />
                  </g>
                </pattern>
              )}
            </defs>

            {zoomed ? (
              <g>
                <rect x={GX} y={GY} width={GW} height={GW} fill={`url(#${uid}-tile)`} stroke="var(--color-line-2)" />
                <text x={GX} y={SY + 8} className="fill-dim font-sans text-[11px] font-semibold tracking-[0.08em] uppercase">
                  Zoomed out
                </text>
                {(zoom === 8
                  ? [
                      "8 × 8 = 64 copies of your NAND cell.",
                      "64 × 4 = 256 transistors.",
                      "Each one was printed by the same",
                      "four masks, at the same moment.",
                    ]
                  : [
                      "64 × 64 = 4,096 copies of the cell,",
                      "4,096 × 4 = 16,384 transistors.",
                      "A phone chip has about 20 billion:",
                      "about 1.2 million times this picture.",
                    ]
                ).map((line, i) => (
                  <text key={i} x={GX} y={SY + 34 + i * 20} className="fill-body font-serif text-[13px]">
                    {line}
                  </text>
                ))}
              </g>
            ) : (
              <g>
                <CellArt vis={st.vis} ox={GX} oy={GY} detail />

                {/* resist on top, with openings once developed */}
                {st.resist && (
                  <rect
                    x={GX}
                    y={GY}
                    width={GW}
                    height={GW}
                    style={{ fill: RESIST_FILL }}
                    fillOpacity={0.94}
                    stroke="var(--color-amber)"
                    strokeWidth={1.25}
                    mask={st.open ? `url(#${uid}-open)` : undefined}
                  />
                )}
                {st.exposing && (
                  <g>
                    {layer!.boxes.map((bx, i) => (
                      <rect key={i} {...boxRect(bx, GX, GY)} fill={`url(#${uid}-uv)`} />
                    ))}
                    <rect
                      x={GX - 8}
                      y={GY - 8}
                      width={GW + 16}
                      height={GW + 16}
                      fill="var(--color-metal-2)"
                      fillOpacity={0.93}
                      mask={`url(#${uid}-open)`}
                    />
                    <text x={GX + GW + 12} y={GY + 14} className="fill-mute font-mono text-[12px]">
                      mask
                    </text>
                    <text x={GX + GW + 12} y={GY + 28} className="fill-violet font-mono text-[12px]">
                      light
                    </text>
                  </g>
                )}

                {/* the transistors and signals, once the gate works */}
                {showSignals && (
                  <g>
                    {fets.map((f) => (
                      <rect
                        key={f.name}
                        x={GX + f.col * C - 1}
                        y={GY + f.row * C - 1}
                        width={C + 2}
                        height={2 * C + 2}
                        rx={4}
                        fill="none"
                        stroke={f.on ? "var(--color-on)" : "var(--color-dim)"}
                        strokeWidth={f.on ? 2.5 : 1.25}
                        strokeDasharray={f.on ? undefined : "3 3"}
                      />
                    ))}
                    <Wire d={nets.vdd} on flow={false} width={2.5} />
                    <Wire d={nets.gnd} on={false} flow={false} width={2} />
                    <Wire d={nets.a} on={a} flow={false} width={2.5} />
                    <Wire d={nets.b} on={b} flow={false} width={2.5} />
                    <Wire d={nets.out} on={out} flow={false} width={2.5} />
                  </g>
                )}
                {st.vis.metal && (
                  <g>
                    {pin(0, "VDD", showSignals ? true : null, "r")}
                    {pin(5, "B", showSignals ? b : null, "r")}
                    {pin(7, "OUT", showSignals ? out : null, "r")}
                    {pin(11, "GND", showSignals ? false : null, "r")}
                    {pin(5, "A", showSignals ? a : null, "l")}
                  </g>
                )}

                {/* where the side view is cut */}
                <line
                  x1={GX - 4}
                  x2={GX + GW + 4}
                  y1={GY + (slice + 0.5) * C}
                  y2={GY + (slice + 0.5) * C}
                  stroke="var(--color-ink)"
                  strokeWidth={1.25}
                  strokeDasharray="5 4"
                />
                <text x={GX - 8} y={GY + (slice + 0.5) * C + 4} textAnchor="end" className="fill-ink font-mono text-[12px]">
                  cut
                </text>

                <SideView row={slice} st={st} uv={`${uid}-uv`} />
              </g>
            )}
          </svg>
        </div>

        <div className="min-w-0 space-y-4">
          {/* progress */}
          <div>
            <div className="flex flex-wrap gap-1.5">
              {LAYERS.map((l, i) => {
                const done = k >= 5 * (i + 1);
                const current = i === L && !done;
                return (
                  <span
                    key={l.title}
                    className={cx(
                      "rounded-md border px-2 py-0.5 text-xs",
                      current
                        ? "border-ink bg-panel-2 font-semibold text-ink"
                        : done
                          ? "border-line-2 text-mute"
                          : "border-line text-dim",
                    )}
                  >
                    {done ? "✓ " : ""}Mask {i + 1}: {l.title}
                  </span>
                );
              })}
            </div>
            {layer && (
              <ol className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 font-sans text-sm">
                {stepNames.map((name, i) => (
                  <li key={name} className="flex items-center gap-1">
                    {i > 0 && (
                      <span aria-hidden className="text-dim">
                        →
                      </span>
                    )}
                    <span
                      className={cx(
                        i + 1 === st.step
                          ? "rounded bg-amber-tint px-1.5 font-semibold text-ink"
                          : i + 1 < st.step
                            ? "px-1.5 text-mute"
                            : "px-1.5 text-dim",
                      )}
                    >
                      {i + 1}. {name}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <p className="min-h-[7.5rem] font-serif text-[0.9375rem] leading-relaxed text-body">{text}</p>

          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => go(k - 1)} disabled={k === 0}>
              ◂ Back
            </Btn>
            <Btn variant="primary" onClick={() => go(k + 1)} disabled={complete}>
              Next step ▸
            </Btn>
            <Btn onClick={finishLayer} disabled={complete}>
              Finish this layer ⏭
            </Btn>
            <Btn variant="ghost" onClick={() => go(0)} disabled={k === 0}>
              Start over
            </Btn>
          </div>

          {!zoomed && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-mute">Side view through:</span>
              <Segmented
                size="sm"
                value={slice}
                onChange={setSlice}
                options={[
                  { value: 2, label: "top row (pMOS)" },
                  { value: 9, label: "bottom row (nMOS)" },
                ]}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 font-sans text-xs text-mute">
            <Swatch fill="var(--color-si-p)" stroke="var(--color-si-p-edge)">
              p-type silicon
            </Swatch>
            <Swatch fill="var(--color-si-n)" stroke="var(--color-si-n-edge)">
              n-type silicon
            </Swatch>
            <Swatch fill="var(--color-si-gate)" stroke="var(--color-off)">
              gate
            </Swatch>
            <Swatch fill="var(--color-metal)" stroke="var(--color-metal-2)">
              metal (copper)
            </Swatch>
            <Swatch fill={RESIST_FILL} stroke="var(--color-amber)">
              resist
            </Swatch>
            <Swatch fill="var(--color-violet-tint)" stroke="var(--color-violet)" hatch={`${uid}-uv`}>
              resist hit by light
            </Swatch>
            <span>⊠ contact (metal touches what is below)</span>
          </div>

          {complete && (
            <div className="space-y-3 border-t border-line pt-4">
              <div className="label-caps text-dim">Your printed gate</div>
              <div className="flex flex-wrap items-center gap-3">
                <BitButton on={a} onClick={() => setA((v) => !v)} label="A" />
                <BitButton on={b} onClick={() => setB((v) => !v)} label="B" />
                <span aria-hidden className="font-mono text-xl text-dim">
                  →
                </span>
                <BitButton on={out} label="OUT" />
                <DataTable
                  className="ml-2"
                  head={["A", "B", "OUT"]}
                  highlight={(a ? 2 : 0) + (b ? 1 : 0)}
                  rows={[
                    [0, 0, 1],
                    [0, 1, 1],
                    [1, 0, 1],
                    [1, 1, 0],
                  ].map((r) => r.map((v, i) => <span key={i} className={cx("font-mono", v ? "font-bold text-ink" : "text-dim")}>{v}</span>))}
                />
              </div>
              <p className="font-serif text-[0.9375rem] text-mute">
                {a && b ? (
                  <>
                    Both nMOS (bottom) are switched on, so OUT is joined to GND through both of them. Both pMOS are off. OUT
                    = <span className="font-mono text-ink">0</span>.
                  </>
                ) : (
                  <>
                    {!a && !b ? "Both pMOS (top) are" : `The pMOS for input ${!a ? "A" : "B"} is`} switched on, joining OUT
                    to VDD. The nMOS chain at the bottom is broken. OUT = <span className="font-mono text-on">1</span>.
                  </>
                )}
                {zoom === 1 && " A solid green box marks a transistor that is switched on; a dashed box, one that is off."}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-mute">Zoom out:</span>
                <Segmented
                  size="sm"
                  value={zoom}
                  onChange={setZoom}
                  options={[
                    { value: 1, label: "1 gate" },
                    { value: 8, label: "64 gates" },
                    { value: 64, label: "4,096 gates" },
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Widget>
  );
}

/* ================================================================== */
/* Static figure: from sand to wafer                                    */
/* ================================================================== */

export function SandToWafer() {
  const label = "fill-ink font-sans text-[13px] font-semibold";
  const sub = "fill-mute font-sans text-[12px]";
  const sand = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 40 }, () => {
      const u = r();
      const x = 20 + u * 100;
      const top = 112 - 46 * Math.sin(u * Math.PI);
      return { x: r2(x), y: r2(top + 6 + r() * (118 - top - 8)) };
    });
  }, []);
  return (
    <Figure caption="From sand to a chip. Sand is purified, grown into one perfect crystal, sliced into thin wafers, and each wafer holds hundreds of chips (dies).">
      <svg viewBox="0 0 640 170" className="w-full min-w-[560px]" role="img" aria-label="Sand, crystal, wafer, die">
        <CircuitDefs />
        {/* sand */}
        <path
          d="M14 120 Q70 40 126 120 Z"
          fill="var(--color-amber-tint)"
          stroke="var(--color-amber)"
          strokeWidth={1.25}
        />
        {sand.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={1.4} fill="var(--color-amber)" />
        ))}
        <text x={70} y={142} textAnchor="middle" className={label}>
          sand
        </text>
        <text x={70} y={158} textAnchor="middle" className={sub}>
          silicon + oxygen
        </text>
        <path d="M134 90 H170" stroke="var(--color-ink)" strokeWidth={1.5} markerEnd="url(#arrow-ink)" />

        {/* crystal */}
        <g stroke="var(--color-metal-2)" strokeWidth={1.25}>
          <path d="M190 34 V112 A40 10 0 0 0 270 112 V34" fill="var(--color-platter-2)" />
          <ellipse cx={230} cy={34} rx={40} ry={10} fill="var(--color-platter)" />
          <path d="M230 24 V10" stroke="var(--color-dim)" />
        </g>
        <text x={230} y={142} textAnchor="middle" className={label}>
          one big crystal
        </text>
        <text x={230} y={158} textAnchor="middle" className={sub}>
          30 cm across
        </text>
        <path d="M286 90 H322" stroke="var(--color-ink)" strokeWidth={1.5} markerEnd="url(#arrow-ink)" />

        {/* wafer */}
        <circle cx={392} cy={72} r={52} fill="var(--color-platter)" stroke="var(--color-metal-2)" strokeWidth={1.25} />
        {Array.from({ length: 9 }, (_, i) =>
          Array.from({ length: 9 }, (_, j) => {
            const x = 392 - 45 + i * 10;
            const y = 72 - 45 + j * 10;
            const far = Math.max(Math.hypot(x - 392, y - 72), Math.hypot(x + 10 - 392, y + 10 - 72), Math.hypot(x + 10 - 392, y - 72), Math.hypot(x - 392, y + 10 - 72));
            return far <= 50 ? (
              <rect key={`${i}-${j}`} x={x + 0.8} y={y + 0.8} width={8.4} height={8.4} fill="var(--color-si-n)" stroke="var(--color-si-n-edge)" strokeWidth={0.6} />
            ) : null;
          }),
        )}
        <text x={392} y={142} textAnchor="middle" className={label}>
          wafer
        </text>
        <text x={392} y={158} textAnchor="middle" className={sub}>
          300 mm wide, 0.8 mm thick
        </text>
        <path d="M452 90 H488" stroke="var(--color-ink)" strokeWidth={1.5} markerEnd="url(#arrow-ink)" />

        {/* die */}
        <rect x={510} y={40} width={80} height={80} rx={2} fill="var(--color-si-n)" stroke="var(--color-si-n-edge)" strokeWidth={1.5} />
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i} stroke="var(--color-si-n-edge)" strokeWidth={0.6}>
            <line x1={510 + (i + 1) * 10} x2={510 + (i + 1) * 10} y1={46} y2={114} />
            <line y1={40 + (i + 1) * 10} y2={40 + (i + 1) * 10} x1={516} x2={584} />
          </g>
        ))}
        <rect x={520} y={50} width={30} height={30} fill="var(--color-metal)" opacity={0.55} />
        <rect x={556} y={86} width={24} height={24} fill="var(--color-metal)" opacity={0.55} />
        <text x={550} y={142} textAnchor="middle" className={label}>
          one die (chip)
        </text>
        <text x={550} y={158} textAnchor="middle" className={sub}>
          about 1 cm × 1 cm
        </text>
      </svg>
    </Figure>
  );
}

/* ================================================================== */
/* Static figure: many floors of wiring                                */
/* ================================================================== */

export function MetalFloors() {
  const L = 24;
  const R = 520;
  type Floor = { y: number; h: number; end?: { w: number; pitch: number; from: number }; along?: Array<[number, number]> };
  const floors: Floor[] = [
    { y: 216, h: 8, end: { w: 8, pitch: 20, from: 34 } },
    { y: 194, h: 9, along: [[30, 150], [168, 300], [318, 420], [438, 514]] },
    { y: 166, h: 12, end: { w: 14, pitch: 38, from: 40 } },
    { y: 136, h: 14, along: [[36, 250], [276, 512]] },
    { y: 96, h: 22, end: { w: 34, pitch: 86, from: 44 } },
    { y: 44, h: 32, along: [[30, 514]] },
  ];
  const vias: Array<[number, number, number, number]> = [
    // [x, top, bottom, width]
    [42, 203, 216, 5],
    [178, 203, 216, 5],
    [338, 203, 216, 5],
    [458, 203, 216, 5],
    [50, 178, 194, 6],
    [278, 178, 194, 6],
    [392, 178, 194, 6],
    [60, 150, 166, 8],
    [326, 150, 166, 8],
    [64, 118, 136, 12],
    [408, 118, 136, 12],
    [64, 76, 96, 16],
    [326, 76, 96, 16],
  ];
  const gates = [40, 80, 120, 160, 200, 240, 280, 320, 360, 400, 440, 480];
  return (
    <Figure caption="A slice through the top of a chip (not to scale). The transistors sit on the silicon at the bottom. Floors of copper wire are stacked above them in glass, joined by vias. The lowest floors have the thinnest wires, for short hops between neighbours. Six floors are drawn here; real chips have 10 to 20.">
      <svg viewBox="0 0 640 284" className="w-full min-w-[560px]" role="img" aria-label="Cross-section of metal layers above transistors">
        {/* glass */}
        <rect x={L} y={30} width={R - L} height={210} fill="var(--color-oxide)" />
        <rect x={L} y={30} width={R - L} height={210} fill="url(#chip-floors-hatch)" opacity={0.4} />
        <defs>
          <pattern id="chip-floors-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line y2="6" stroke="var(--color-off)" strokeWidth="0.75" />
          </pattern>
        </defs>
        {/* silicon + transistors */}
        <rect x={L} y={240} width={R - L} height={40} fill="var(--color-si-p)" stroke="var(--color-si-p-edge)" />
        {gates.map((x, i) => (
          <g key={x}>
            {i % 2 === 0 && (
              <path
                d={`M${x - 14} 240 h48 v12 q0 5 -5 5 h-38 q-5 0 -5 -5 z`}
                fill="var(--color-si-n)"
                stroke="var(--color-si-n-edge)"
              />
            )}
            <rect x={x + 4} y={228} width={12} height={12} rx={1.5} fill="var(--color-si-gate)" stroke="var(--color-off)" />
            <rect x={x + 8} y={224} width={4} height={4} fill="var(--color-metal)" />
          </g>
        ))}
        {/* metal floors */}
        {floors.map((f, i) => (
          <g key={i} fill="var(--color-metal)" stroke="var(--color-metal-2)" strokeWidth={1}>
            {f.end &&
              Array.from({ length: Math.floor((R - 14 - f.end.from) / f.end.pitch) + 1 }, (_, j) => (
                <rect key={j} x={f.end!.from + j * f.end!.pitch} y={f.y} width={f.end!.w} height={f.h} rx={1} />
              ))}
            {f.along?.map(([x0, x1]) => (
              <rect key={x0} x={x0} y={f.y} width={x1 - x0} height={f.h} rx={1} />
            ))}
          </g>
        ))}
        <g fill="var(--color-metal-2)">
          {vias.map(([x, t, b, w], i) => (
            <rect key={i} x={x - w / 2} y={t} width={w} height={b - t} />
          ))}
        </g>
        {/* labels */}
        {floors.map((f, i) => (
          <g key={i}>
            <line x1={R + 4} x2={R + 14} y1={f.y + f.h / 2} y2={f.y + f.h / 2} stroke="var(--color-line-2)" />
            <text x={R + 18} y={f.y + f.h / 2 + 4} className="fill-mute font-mono text-[12px]">
              floor {i + 1}
            </text>
          </g>
        ))}
        <text x={R + 18} y={248} className="fill-ink font-sans text-[12px] font-semibold">
          transistors
        </text>
        <text x={R + 18} y={264} className="fill-mute font-sans text-[12px]">
          on the silicon
        </text>
        <text x={L} y={20} className="fill-mute font-sans text-[12px]">
          thick wires for long distances and power ↑
        </text>
        <text x={R} y={20} textAnchor="end" className="fill-mute font-sans text-[12px]">
          glass between the floors
        </text>
      </svg>
    </Figure>
  );
}

/* ================================================================== */
/* 2. From code to cells                                                */
/* ================================================================== */

type Stage = "code" | "gates" | "cells" | "wires";

const CELLS = [
  { name: "XOR2", x: 70, w: 100, t: 10 },
  { name: "AND2", x: 170, w: 60, t: 6 },
  { name: "XOR2", x: 230, w: 100, t: 10 },
  { name: "AND2", x: 330, w: 60, t: 6 },
  { name: "OR2", x: 390, w: 60, t: 6 },
];
const ROW_TOP = 70;
const ROW_BOT = 166;
const PIN_Y = ROW_TOP + 8;

function CellRow({ withPins }: { withPins: boolean }) {
  const pins = [90, 115, 150, 185, 200, 218, 250, 275, 310, 345, 360, 378, 405, 420, 438];
  return (
    <g>
      <rect x={60} y={ROW_TOP - 8} width={400} height={8} fill="var(--color-metal)" stroke="var(--color-metal-2)" />
      <rect x={60} y={ROW_BOT} width={400} height={8} fill="var(--color-metal)" stroke="var(--color-metal-2)" />
      <text x={56} y={ROW_TOP - 1} textAnchor="end" className="fill-mute font-mono text-[12px]">
        VDD
      </text>
      <text x={56} y={ROW_BOT + 8} textAnchor="end" className="fill-mute font-mono text-[12px]">
        GND
      </text>
      {CELLS.map((c, i) => (
        <g key={i}>
          <rect x={c.x} y={ROW_TOP} width={c.w} height={ROW_BOT - ROW_TOP} fill="var(--color-panel-2)" stroke="var(--color-line-2)" />
          <rect x={c.x + 5} y={ROW_TOP + 14} width={c.w - 10} height={16} fill="var(--color-si-n)" stroke="var(--color-si-n-edge)" strokeWidth={0.75} />
          <rect x={c.x + 5} y={ROW_BOT - 30} width={c.w - 10} height={16} fill="var(--color-si-p)" stroke="var(--color-si-p-edge)" strokeWidth={0.75} />
          {Array.from({ length: c.t / 2 }, (_, j) => (
            <rect
              key={j}
              x={c.x + ((j + 1) * c.w) / (c.t / 2 + 1) - 2}
              y={ROW_TOP + 10}
              width={4}
              height={ROW_BOT - ROW_TOP - 20}
              fill="var(--color-si-gate)"
              stroke="var(--color-off)"
              strokeWidth={0.75}
            />
          ))}
          <rect x={c.x + c.w / 2 - 20} y={(ROW_TOP + ROW_BOT) / 2 - 10} width={40} height={20} rx={3} fill="var(--color-panel)" stroke="var(--color-line-2)" />
          <text x={c.x + c.w / 2} y={(ROW_TOP + ROW_BOT) / 2 + 4} textAnchor="middle" className="fill-ink font-mono text-[12px] font-semibold">
            {c.name}
          </text>
        </g>
      ))}
      {withPins &&
        pins.map((x) => (
          <rect key={x} x={x - 3} y={PIN_Y - 3} width={6} height={6} fill="var(--color-metal-2)" stroke="var(--color-ink)" strokeWidth={0.75} />
        ))}
    </g>
  );
}

export function CodeToCells() {
  const [stage, setStage] = useState<Stage>("code");
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [cin, setCin] = useState(true);
  const x1 = a !== b;
  const ab = a && b;
  const sum = x1 !== cin;
  const cxv = x1 && cin;
  const cout = ab || cxv;
  const v = (bit: boolean) => (bit ? 1 : 0);

  const tracks: Array<{ d: string; on: boolean; ends: Array<[number, number]> }> = [
    { d: "M20 14 H185 M90 14 V78 M185 14 V78", on: a, ends: [[90, 14], [185, 14]] },
    { d: "M20 28 H200 M115 28 V78 M200 28 V78", on: b, ends: [[115, 28], [200, 28]] },
    { d: "M20 42 H360 M275 42 V78 M360 42 V78", on: cin, ends: [[275, 42], [360, 42]] },
    { d: "M150 78 V56 H345 M250 56 V78 M345 56 V78", on: x1, ends: [[150, 56], [250, 56], [345, 56]] },
    { d: "M218 78 V14 H420 V78", on: ab, ends: [[218, 14], [420, 14]] },
    { d: "M378 78 V42 H405 V78", on: cxv, ends: [[378, 42], [405, 42]] },
    { d: "M310 78 V28 H500", on: sum, ends: [[310, 28]] },
    { d: "M438 78 V14 H470 V200 H500", on: cout, ends: [[438, 14]] },
  ];

  const captions: Record<Stage, ReactNode> = {
    code: (
      <>
        An engineer writes what the circuit should <em>do</em>. <code>^</code> means XOR, <code>&amp;</code> means AND,{" "}
        <code>|</code> means OR. These two lines are the full adder from The Adder chapter.
      </>
    ),
    gates: (
      <>
        <strong>Synthesis:</strong> a program reads the code and works out a network of gates that does the same thing. For
        a whole CPU core this step produces millions of gates.
      </>
    ),
    cells: (
      <>
        <strong>Placement:</strong> each gate becomes a <strong>standard cell</strong>, a ready-made layout like the NAND you
        printed. All cells are the same height, so they line up in rows and share the VDD and GND rails. Wider cells hold
        more transistors.
      </>
    ),
    wires: (
      <>
        <strong>Routing:</strong> a program draws the wires on the metal floors above the cells. Horizontal pieces run on
        one floor and vertical pieces on another, so wires can cross without touching. Green wires carry a 1.
      </>
    ),
  };

  return (
    <Widget
      title="From two lines of code to cells and wires"
      subtitle="Step through what the design software does with a full adder. Change the inputs to check that every stage computes the same answer."
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Segmented
          value={stage}
          onChange={setStage}
          options={[
            { value: "code", label: "1 · Code" },
            { value: "gates", label: "2 · Gates" },
            { value: "cells", label: "3 · Cells" },
            { value: "wires", label: "4 · Wires" },
          ]}
        />
        <div className="flex items-start gap-2">
          <BitButton size="sm" on={a} onClick={() => setA((x) => !x)} label="a" />
          <BitButton size="sm" on={b} onClick={() => setB((x) => !x)} label="b" />
          <BitButton size="sm" on={cin} onClick={() => setCin((x) => !x)} label="cin" />
          <span aria-hidden className="pt-1 font-mono text-dim">
            →
          </span>
          <BitButton size="sm" on={sum} label="sum" />
          <BitButton size="sm" on={cout} label="cout" />
        </div>
      </div>

      {stage === "code" ? (
        <pre className="scroll-thin overflow-x-auto rounded-md border border-line bg-bg px-4 py-3 font-mono text-[0.875rem] leading-relaxed text-ink">
          <span className="text-dim">{"// a full adder, written in Verilog\n"}</span>
          <span className="text-violet">module</span>
          {" full_adder(input a, b, cin, output sum, cout);\n"}
          {"  "}
          <span className="text-violet">assign</span>
          {" sum  = a ^ b ^ cin;\n"}
          {"  "}
          <span className="text-violet">assign</span>
          {" cout = (a & b) | (cin & (a ^ b));\n"}
          <span className="text-violet">endmodule</span>
          {"\n\n"}
          <span className="text-dim">
            {`// with a=${v(a)}, b=${v(b)}, cin=${v(cin)}:\n`}
            {`//   sum  = ${v(a)} ^ ${v(b)} ^ ${v(cin)} = ${v(sum)}\n`}
            {`//   cout = (${v(a)} & ${v(b)}) | (${v(cin)} & ${v(x1)}) = ${v(ab)} | ${v(cxv)} = ${v(cout)}`}
          </span>
        </pre>
      ) : (
        <div className="scroll-thin overflow-x-auto">
          <svg viewBox="0 0 540 210" className="w-full min-w-[520px]" role="img" aria-label={`Full adder: ${stage}`}>
            <CircuitDefs />
            {stage === "gates" && (
              <g>
                <Wire d="M28 50 H110 M80 50 V120 H110" on={a} />
                <Wire d="M28 70 H110 M95 70 V140 H110" on={b} />
                <Wire d="M28 190 H230 V50 H260 M230 110 H260" on={cin} />
                <Wire d="M166 60 H200 V30 H260 M200 60 V90 H260" on={x1} />
                <Wire d="M162 130 H370 V140 H410" on={ab} />
                <Wire d="M312 100 H390 V120 H410" on={cxv} />
                <Wire d="M316 40 H500" on={sum} />
                <Wire d="M466 130 H500" on={cout} />
                <Junction x={80} y={50} on={a} />
                <Junction x={95} y={70} on={b} />
                <Junction x={230} y={110} on={cin} />
                <Junction x={200} y={60} on={x1} />
                <Gate kind="XOR" x={110} y={40} out={x1} label={false} />
                <Gate kind="AND" x={110} y={110} out={ab} label={false} />
                <Gate kind="XOR" x={260} y={20} out={sum} label={false} />
                <Gate kind="AND" x={260} y={80} out={cxv} label={false} />
                <Gate kind="OR" x={410} y={110} out={cout} label={false} />
                {[
                  [132, 64, "XOR"],
                  [131, 134, "AND"],
                  [282, 44, "XOR"],
                  [281, 104, "AND"],
                  [430, 134, "OR"],
                ].map(([x, y, t]) => (
                  <text key={`${x}`} x={x} y={y} textAnchor="middle" className="fill-mute font-mono text-[11px] font-bold">
                    {t}
                  </text>
                ))}
                {(
                  [
                    [50, "a", a],
                    [70, "b", b],
                    [190, "cin", cin],
                  ] as const
                ).map(([y, t, on]) => (
                  <text key={t} x={22} y={y + 4} textAnchor="end" className="font-mono text-[12px] font-semibold" fill={on ? "var(--color-on)" : "var(--color-mute)"}>
                    {t}
                  </text>
                ))}
                <text x={506} y={44} className="font-mono text-[12px] font-semibold" fill={sum ? "var(--color-on)" : "var(--color-mute)"}>
                  sum
                </text>
                <text x={506} y={134} className="font-mono text-[12px] font-semibold" fill={cout ? "var(--color-on)" : "var(--color-mute)"}>
                  cout
                </text>
                <text x={270} y={204} textAnchor="middle" className="fill-dim font-sans text-[12px]">
                  5 gates: 2 XOR, 2 AND, 1 OR
                </text>
              </g>
            )}
            {(stage === "cells" || stage === "wires") && (
              <g transform="translate(0 12)">
                <CellRow withPins={stage === "wires"} />
                {stage === "cells" && (
                  <text x={260} y={190} textAnchor="middle" className="fill-dim font-sans text-[12px]">
                    the same 5 gates as standard cells, side by side in one row
                  </text>
                )}
              </g>
            )}
            {stage === "wires" && (
              <g transform="translate(0 12)">
                {tracks.map((t, i) => (
                  <Wire key={i} d={t.d} on={t.on} flow={false} width={2} />
                ))}
                {tracks.flatMap((t, i) =>
                  t.ends.map(([x, y]) => (
                    <rect key={`${i}-${x}-${y}`} x={x - 2.5} y={y - 2.5} width={5} height={5} fill="var(--color-ink)" />
                  )),
                )}
                {(
                  [
                    [14, "a", a],
                    [28, "b", b],
                    [42, "cin", cin],
                  ] as const
                ).map(([y, t, on]) => (
                  <text key={t} x={16} y={y + 4} textAnchor="end" className="font-mono text-[12px] font-semibold" fill={on ? "var(--color-on)" : "var(--color-mute)"}>
                    {t}
                  </text>
                ))}
                <text x={504} y={32} className="font-mono text-[12px] font-semibold" fill={sum ? "var(--color-on)" : "var(--color-mute)"}>
                  sum
                </text>
                <text x={504} y={192} className="font-mono text-[12px] font-semibold" fill={cout ? "var(--color-on)" : "var(--color-mute)"}>
                  cout
                </text>
              </g>
            )}
          </svg>
        </div>
      )}
      <p className="mt-3 font-serif text-[0.9375rem] text-mute">{captions[stage]}</p>
    </Widget>
  );
}

/* ================================================================== */
/* 3. Wafer yield                                                       */
/* ================================================================== */

const WAFER_R = 150; // mm
const WAFER_CM2 = (Math.PI * WAFER_R * WAFER_R) / 100;
const MAX_DEFECTS = Math.ceil(WAFER_CM2); // enough for 1 defect per cm²

function dieGrid(area: number) {
  const s = Math.sqrt(area);
  const n = Math.ceil(WAFER_R / s) + 1;
  const R2 = WAFER_R * WAFER_R;
  let best: { ox: number; oy: number; full: Array<[number, number]>; partial: Array<[number, number]> } | null = null;
  for (const ox of [0, 0.5]) {
    for (const oy of [0, 0.5]) {
      const full: Array<[number, number]> = [];
      const partial: Array<[number, number]> = [];
      for (let i = -n; i <= n; i++) {
        for (let j = -n; j <= n; j++) {
          const x0 = (i + ox) * s - s / 2;
          const y0 = (j + oy) * s - s / 2;
          const fx = Math.max(Math.abs(x0), Math.abs(x0 + s));
          const fy = Math.max(Math.abs(y0), Math.abs(y0 + s));
          if (fx * fx + fy * fy <= R2) {
            full.push([i, j]);
          } else {
            const nx = Math.min(Math.max(0, x0), x0 + s);
            const ny = Math.min(Math.max(0, y0), y0 + s);
            if (nx * nx + ny * ny < R2) partial.push([i, j]);
          }
        }
      }
      if (!best || full.length > best.full.length) best = { ox, oy, full, partial };
    }
  }
  return { s, ...best! };
}

const dieKey = (i: number, j: number) => (i + 1000) * 4000 + (j + 1000);

function fmtSmall(y: number) {
  return y >= 0.01 ? y.toFixed(3) : y.toPrecision(2);
}
function fmtPct(y: number) {
  const p = y * 100;
  return p >= 1 ? p.toFixed(1) : p.toPrecision(2);
}

export function WaferYield() {
  const [area, setArea] = useState(100);
  const [density, setDensity] = useState(0.1);
  const [price, setPrice] = useState(10000);
  const [seed, setSeed] = useState(1);
  const uid = useSvgId();

  const defects = useMemo(() => {
    const r = rng(seed * 7919 + 17);
    return Array.from({ length: MAX_DEFECTS }, () => {
      const rad = WAFER_R * Math.sqrt(r());
      const th = 2 * Math.PI * r();
      return [r2(rad * Math.cos(th)), r2(rad * Math.sin(th))] as const;
    });
  }, [seed]);

  const grid = useMemo(() => dieGrid(area), [area]);
  const nDef = Math.round(density * WAFER_CM2);

  const { good, bad, partial, hit } = useMemo(() => {
    const { s, ox, oy, full } = grid;
    const fullKeys = new Set(full.map(([i, j]) => dieKey(i, j)));
    const hit = new Set<number>();
    for (let d = 0; d < nDef; d++) {
      const [x, y] = defects[d];
      const i = Math.floor((x + s / 2) / s - ox);
      const j = Math.floor((y + s / 2) / s - oy);
      const key = dieKey(i, j);
      if (fullKeys.has(key)) hit.add(key);
    }
    const g = Math.min(0.6, s * 0.08);
    const rect = ([i, j]: [number, number]) => {
      const x0 = (i + ox) * s - s / 2 + g;
      const y0 = (j + oy) * s - s / 2 + g;
      const w = (s - 2 * g).toFixed(2);
      return `M${x0.toFixed(2)} ${y0.toFixed(2)}h${w}v${w}h-${w}z`;
    };
    let good = "";
    let bad = "";
    for (const d of full) {
      if (hit.has(dieKey(d[0], d[1]))) bad += rect(d);
      else good += rect(d);
    }
    return { good, bad, partial: grid.partial.map(rect).join(""), hit };
  }, [grid, defects, nDef]);

  const gross = grid.full.length;
  const nBad = hit.size;
  const nGood = gross - nBad;
  const A = area / 100; // cm²
  const lambda = density * A;
  const Y = Math.exp(-lambda);
  const expected = gross * Y;
  const side = Math.sqrt(area);

  return (
    <Widget
      wide
      title="Dust on a wafer: how many chips survive?"
      subtitle="Each pink dot is a defect. Any die that gets a dot is broken and turns grey. Make the dies bigger, or the factory dirtier, and watch the good dies disappear."
    >
      <div className="grid gap-6 @3xl:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <div>
          <svg viewBox="-156 -156 312 312" className="mx-auto w-full max-w-[21rem]" role="img" aria-label="A 300 mm wafer covered with dies and defects">
            <defs>
              <pattern id={`${uid}-bad`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line y2="3" stroke="var(--color-panel)" strokeWidth="0.7" />
              </pattern>
            </defs>
            <circle r={WAFER_R} fill="var(--color-panel-2)" stroke="var(--color-line-2)" strokeWidth={1.2} />
            <path d={partial} fill="none" stroke="var(--color-line-2)" strokeWidth={0.6} strokeDasharray="1.5 1.5" />
            <path d={good} style={{ fill: "color-mix(in oklab, var(--color-cyan) 42%, var(--color-panel))" }} />
            <path d={bad} fill="var(--color-off)" />
            {area >= 60 && <path d={bad} fill={`url(#${uid}-bad)`} />}
            {defects.slice(0, nDef).map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={2} fill="var(--color-pink)" stroke="var(--color-panel)" strokeWidth={0.7} />
            ))}
            <circle cy={WAFER_R} r={3} fill="var(--color-panel)" stroke="var(--color-line-2)" strokeWidth={0.8} />
          </svg>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 font-sans text-xs text-mute">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: "color-mix(in oklab, var(--color-cyan) 42%, var(--color-panel))" }} />
              ✓ good die
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-[2px] bg-off" />✗ broken die
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-pink" />
              defect
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-[2px] border border-dashed border-line-2" />
              cut off by the edge
            </span>
          </div>
          <p className="mt-1 text-center font-sans text-xs text-dim">300 mm wafer, drawn to scale</p>
        </div>

        <div className="min-w-0 space-y-4">
          <Slider
            label="Die size A"
            min={10}
            max={800}
            step={10}
            value={area}
            onChange={setArea}
            format={(x) => `${x} mm² (${Math.sqrt(x).toFixed(1)} × ${Math.sqrt(x).toFixed(1)} mm)`}
          />
          <Slider
            label="Defect density D"
            min={0.05}
            max={1}
            step={0.05}
            value={density}
            onChange={setDensity}
            format={(x) => `${x.toFixed(2)} per cm²`}
          />
          <Slider
            label="Price of one processed wafer"
            min={2000}
            max={20000}
            step={1000}
            value={price}
            onChange={setPrice}
            format={(x) => `$${fmt(x)}`}
          />
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => setArea(100)} active={area === 100}>
              Phone chip ≈ 100 mm²
            </Btn>
            <Btn onClick={() => setArea(800)} active={area === 800}>
              Huge AI chip ≈ 800 mm²
            </Btn>
            <Btn variant="ghost" onClick={() => setSeed((s) => s + 1)}>
              ↻ New wafer
            </Btn>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <Stat label="Whole dies" value={fmt(gross)} sub={`${side.toFixed(1)} mm squares`} />
            <Stat label="✗ Hit by a defect" value={fmt(nBad)} sub={`${fmt(nDef)} defects on the wafer`} tone="pink" />
            <Stat label="✓ Good dies" value={fmt(nGood)} sub={`yield ${gross ? ((nGood / gross) * 100).toFixed(1) : "0"}%`} tone="cyan" />
            <Stat
              label="Cost per good chip"
              value={nGood ? `$${(price / nGood).toFixed(2)}` : "—"}
              sub={nGood ? `$${fmt(price)} ÷ ${fmt(nGood)}` : "no good chips at all!"}
            />
          </div>

          <div className="rounded-md border border-line bg-bg px-4 py-2">
            <TeX block>
              {`Y = e^{-D\\cdot A} = e^{-${density.toFixed(2)}\\,\\times\\,${A.toFixed(2)}} = e^{-${lambda.toFixed(3)}} \\approx ${fmtSmall(Y)} = ${fmtPct(Y)}\\%`}
            </TeX>
            <p className="pb-2 font-serif text-[0.9375rem] text-mute">
              <span className="font-mono text-ink">D·A = {lambda.toFixed(3)}</span> is the average number of defects that
              land on one die ({density.toFixed(2)} per cm² × {A.toFixed(2)} cm²). The formula predicts{" "}
              <span className="font-mono text-ink">
                {fmt(gross)} × {fmtSmall(Y)} ≈ {fmt(Math.round(expected))}
              </span>{" "}
              good dies. This wafer has <span className="font-mono text-ink">{fmt(nGood)}</span>; every real wafer comes out a
              little different.
            </p>
          </div>
        </div>
      </div>
    </Widget>
  );
}

/* ================================================================== */
/* 4. Moore's law                                                       */
/* ================================================================== */

interface ChipPoint {
  name: string;
  short: string;
  year: number;
  count: number;
  shown: string;
  use: string;
  /** label placement relative to the point */
  lx: number;
  ly: number;
  anchor: "start" | "middle" | "end";
}

const CHIPS: ChipPoint[] = [
  { name: "Intel 4004", short: "4004", year: 1971, count: 2300, shown: "2,300", use: "a desk calculator; the first CPU on one chip", lx: 0, ly: -12, anchor: "middle" },
  { name: "MOS 6502", short: "6502", year: 1975, count: 3510, shown: "about 3,500", use: "the Apple II, Commodore 64 and Nintendo NES", lx: 9, ly: 4, anchor: "start" },
  { name: "Intel 8086", short: "8086", year: 1978, count: 29000, shown: "about 29,000", use: "the ancestor of today's PC processors", lx: -9, ly: 4, anchor: "end" },
  { name: "Intel 386", short: "386", year: 1985, count: 275000, shown: "about 275,000", use: "PCs", lx: -9, ly: 4, anchor: "end" },
  { name: "Intel 486", short: "486", year: 1989, count: 1.18e6, shown: "about 1.2 million", use: "PCs", lx: -9, ly: 4, anchor: "end" },
  { name: "Intel Pentium", short: "Pentium", year: 1993, count: 3.1e6, shown: "about 3.1 million", use: "PCs", lx: 4, ly: 17, anchor: "start" },
  { name: "Intel Pentium II", short: "Pentium II", year: 1997, count: 7.5e6, shown: "about 7.5 million", use: "PCs", lx: 9, ly: 4, anchor: "start" },
  { name: "Intel Pentium 4", short: "Pentium 4", year: 2000, count: 42e6, shown: "about 42 million", use: "PCs", lx: 9, ly: 4, anchor: "start" },
  { name: "Intel Core 2 Duo", short: "Core 2 Duo", year: 2006, count: 291e6, shown: "about 291 million", use: "laptops and desktops (2 cores)", lx: 9, ly: 4, anchor: "start" },
  { name: "Apple A7", short: "A7", year: 2013, count: 1e9, shown: "about 1 billion", use: "the iPhone 5s", lx: 9, ly: 4, anchor: "start" },
  { name: "Apple A12", short: "A12", year: 2018, count: 6.9e9, shown: "about 6.9 billion", use: "the iPhone XS", lx: -9, ly: 4, anchor: "end" },
  { name: "Apple M1", short: "M1", year: 2020, count: 16e9, shown: "about 16 billion", use: "the MacBook Air and other Macs", lx: 0, ly: 18, anchor: "middle" },
  { name: "Nvidia H100", short: "H100", year: 2022, count: 80e9, shown: "about 80 billion", use: "AI data centres", lx: 9, ly: 4, anchor: "start" },
  { name: "Apple A17 Pro", short: "A17 Pro", year: 2023, count: 19e9, shown: "about 19 billion", use: "the iPhone 15 Pro", lx: 9, ly: 4, anchor: "start" },
  { name: "Nvidia B200", short: "B200", year: 2024, count: 208e9, shown: "about 208 billion", use: "AI data centres (two dies joined in one package)", lx: 0, ly: -15, anchor: "middle" },
];

const DECADE_WORDS = [
  "1 thousand",
  "10 thousand",
  "100 thousand",
  "1 million",
  "10 million",
  "100 million",
  "1 billion",
  "10 billion",
  "100 billion",
  "1 trillion",
];

function words(n: number) {
  const units: Array<[number, string]> = [
    [1e12, "trillion"],
    [1e9, "billion"],
    [1e6, "million"],
  ];
  for (const [u, w] of units) if (n >= u) return `${+(n / u).toPrecision(3)} ${w}`;
  return fmt(Math.round(n));
}

export function MooresLaw() {
  const [sel, setSel] = useState(CHIPS.length - 1);
  const [T, setT] = useState(2);
  const [table, setTable] = useState(false);
  const uid = useSvgId();
  const W = 640;
  const H = 384;
  const pad = { l: 100, r: 20, t: 22, b: 44 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;
  const y0 = 1968;
  const y1 = 2027;
  const X = (yr: number) => r2(pad.l + ((yr - y0) / (y1 - y0)) * pw);
  const Yc = (n: number) => r2(pad.t + ((12 - Math.log10(n)) / 9) * ph);
  const line = (yr: number) => 2300 * 2 ** ((yr - 1971) / T);
  const linePath = Array.from({ length: 55 }, (_, i) => 1971 + i)
    .map((yr, i) => `${i ? "L" : "M"}${X(yr).toFixed(1)} ${Yc(line(yr)).toFixed(1)}`)
    .join(" ");
  const chip = CHIPS[sel];
  const expo = (chip.year - 1971) / T;
  const pred = line(chip.year);
  const ratio = chip.count / pred;

  return (
    <Widget
      title="Fifty years of doubling"
      subtitle="Transistors on one chip, from 1971 to today. Each grid line up is 10 times more than the one below. Point at (or tap) a chip to see its numbers."
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-mute">Dashed line doubles every</span>
        <Segmented
          size="sm"
          value={T}
          onChange={setT}
          options={[
            { value: 1.5, label: "1.5 years" },
            { value: 2, label: "2 years" },
            { value: 3, label: "3 years" },
          ]}
        />
      </div>
      <div className="scroll-thin overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px]" role="img" aria-label="Transistor counts on a log scale from 1971 to 2024">
          <defs>
            <clipPath id={`${uid}-plot`}>
              <rect x={pad.l} y={pad.t} width={pw} height={ph} />
            </clipPath>
          </defs>
          {/* grid */}
          {DECADE_WORDS.map((w, i) => {
            const y = Yc(10 ** (3 + i));
            return (
              <g key={w}>
                <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--color-line)" />
                <text x={pad.l - 8} y={y + 4} textAnchor="end" className="fill-dim font-mono text-[12px] tabular-nums">
                  {w}
                </text>
              </g>
            );
          })}
          {[1970, 1980, 1990, 2000, 2010, 2020].map((yr) => (
            <g key={yr}>
              <line x1={X(yr)} x2={X(yr)} y1={pad.t} y2={H - pad.b} stroke="var(--color-line)" />
              <text x={X(yr)} y={H - pad.b + 18} textAnchor="middle" className="fill-dim font-mono text-[12px] tabular-nums">
                {yr}
              </text>
            </g>
          ))}
          <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--color-line-2)" />
          <line x1={pad.l} x2={pad.l} y1={pad.t} y2={H - pad.b} stroke="var(--color-line-2)" />
          <text x={W - pad.r} y={H - 6} textAnchor="end" className="fill-mute font-sans text-[12px]">
            year
          </text>
          <text x={pad.l} y={14} className="fill-mute font-sans text-[12px]">
            transistors on one chip (log scale)
          </text>

          {/* doubling line + key */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-amber)"
            strokeWidth={1.75}
            strokeDasharray="6 4"
            clipPath={`url(#${uid}-plot)`}
          />
          <line x1={pad.l + 12} x2={pad.l + 40} y1={pad.t + 18} y2={pad.t + 18} stroke="var(--color-amber)" strokeWidth={1.75} strokeDasharray="6 4" />
          <text x={pad.l + 46} y={pad.t + 22} className="fill-mute font-sans text-[12px]">
            doubling every {T} years, starting from the 4004's 2,300
          </text>

          {/* chips */}
          {CHIPS.map((c, i) => {
            const cxp = X(c.year);
            const cyp = Yc(c.count);
            const active = i === sel;
            return (
              <g
                key={c.name}
                tabIndex={0}
                role="button"
                aria-label={`${c.name}, ${c.year}: ${c.shown} transistors`}
                aria-pressed={active}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setSel(i)}
                onFocus={() => setSel(i)}
                onClick={() => setSel(i)}
              >
                <circle cx={cxp} cy={cyp} r={13} fill="transparent" />
                {active && <circle cx={cxp} cy={cyp} r={9} fill="none" stroke="var(--color-ink)" strokeWidth={1.25} />}
                <circle cx={cxp} cy={cyp} r={5} fill="var(--color-cyan)" stroke="var(--color-panel)" strokeWidth={2} />
                <text
                  x={cxp + c.lx}
                  y={cyp + c.ly}
                  textAnchor={c.anchor}
                  className={cx("font-sans text-[12px]", active ? "fill-ink font-bold" : "fill-mute")}
                >
                  {c.short}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 rounded-md border border-line bg-bg px-4 py-3" aria-live="polite">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="font-serif text-[1.0625rem] font-semibold text-ink">
            {chip.name} ({chip.year})
          </span>
          <span className="font-mono text-ink tabular-nums">{chip.shown} transistors</span>
        </div>
        <div className="font-serif text-[0.9375rem] text-mute">Used in {chip.use}.</div>
        <div className="mt-1.5 font-serif text-[0.9375rem] text-body">
          The dashed line predicts{" "}
          <TeX>{`2{,}300 \\times 2^{(${chip.year} - 1971) \\div ${T}} = 2{,}300 \\times 2^{${+expo.toFixed(2)}} \\approx \\text{${words(pred)}}`}</TeX>
          .{" "}
          {ratio >= 0.8 && ratio <= 1.25
            ? "The real chip is very close to the line."
            : ratio < 0.8
              ? `The line is ${(1 / ratio).toFixed(1)}× higher than the real chip.`
              : `The real chip has ${ratio.toFixed(1)}× more than the line.`}
        </div>
      </div>

      <div className="mt-3">
        <Btn variant="ghost" onClick={() => setTable((t) => !t)}>
          {table ? "Hide the table" : "Show the numbers as a table"}
        </Btn>
        {table && (
          <DataTable
            className="mt-2"
            align="left"
            head={["year", "chip", "used in", "transistors"]}
            highlight={sel}
            rows={CHIPS.map((c) => [
              <span className="font-mono tabular-nums">{c.year}</span>,
              c.name,
              c.use,
              <span className="font-mono tabular-nums">{c.shown}</span>,
            ])}
          />
        )}
      </div>
    </Widget>
  );
}
