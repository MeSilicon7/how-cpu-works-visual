import { useMemo, useRef, useState } from "react";

import { PixelCanvas } from "~/components/pixel-canvas";
import { TeX } from "~/components/tex";
import { Btn, cx, Pill, Slider, Stat, Widget } from "~/components/ui";
import { binStr, clamp, hexStr } from "~/lib/bits";
import { useAnimationTime, useInterval } from "~/lib/hooks";
import { makeScene, pixel, type Img } from "~/lib/image";

/* ------------------------------------------------------------------ */
/* Zoom into a picture until you see pixels                              */
/* ------------------------------------------------------------------ */

export function PixelZoom() {
  const img = useMemo(() => makeScene(384, 216), []);
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState({ x: 262, y: 108 });
  const vw = img.w / zoom;
  const vh = img.h / zoom;
  const view = {
    x: clamp(focus.x + 0.5 - vw / 2, 0, img.w - vw),
    y: clamp(focus.y + 0.5 - vh / 2, 0, img.h - vh),
    w: vw,
    h: vh,
  };
  const [r, g, b] = pixel(img, focus.x, focus.y);
  return (
    <Widget
      title="Zoom in until the picture falls apart"
      subtitle="Click anywhere to pick a pixel, then zoom. Every image on every screen is a grid of tiny coloured squares."
      wide
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="relative overflow-hidden rounded-xl border border-line-2">
          <PixelCanvas
            img={img}
            view={view}
            grid={zoom >= 10}
            onPick={(x, y) => setFocus({ x, y })}
            ariaLabel="Zoomable picture"
          />
          {zoom >= 10 && (
            <div
              className="pointer-events-none absolute border-2 border-amber"
              style={{
                left: `${((focus.x - view.x) / view.w) * 100}%`,
                top: `${((focus.y - view.y) / view.h) * 100}%`,
                width: `${100 / view.w}%`,
                height: `${100 / view.h}%`,
              }}
            />
          )}
        </div>
        <div className="space-y-3">
          <Slider label="Zoom" min={1} max={48} step={1} value={zoom} onChange={setZoom} format={(v) => `${v}×`} />
          <div className="rounded-xl border border-line bg-bg/60 p-3">
            <div className="text-xs text-mute">
              Pixel at x = {focus.x}, y = {focus.y}
            </div>
            <div className="mt-2 h-14 rounded-lg border border-line-2" style={{ background: `rgb(${r},${g},${b})` }} />
            <div className="mt-2 space-y-1 font-mono text-sm">
              {(
                [
                  ["R", r, "text-red"],
                  ["G", g, "text-on"],
                  ["B", b, "text-cyan"],
                ] as const
              ).map(([n, v, c]) => (
                <div key={n} className="flex items-center gap-2">
                  <span className={c}>{n}</span>
                  <span className="w-8 text-right text-ink">{v}</span>
                  <span className="text-xs text-dim">{binStr(v, 8)}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-mute">
            This picture is {img.w} × {img.h} = {(img.w * img.h).toLocaleString()} pixels. A 1080p screen has 2,073,600.
          </p>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* RGB mixer                                                            */
/* ------------------------------------------------------------------ */

const presets: Array<[string, number, number, number]> = [
  ["white", 255, 255, 255],
  ["yellow", 255, 255, 0],
  ["cyan", 0, 255, 255],
  ["magenta", 255, 0, 255],
  ["orange", 255, 136, 0],
  ["grey", 128, 128, 128],
  ["black", 0, 0, 0],
];

export function RgbMixer() {
  const [r, setR] = useState(255);
  const [g, setG] = useState(136);
  const [b, setB] = useState(0);
  return (
    <Widget
      title="Mix any colour from three lights"
      subtitle="Screens add light. Red + green = yellow, all three at full = white, all off = black."
    >
      <div className="grid items-center gap-5 md:grid-cols-[240px_1fr]">
        <svg viewBox="0 0 240 220" className="mx-auto w-full max-w-[240px]" style={{ isolation: "isolate" }}>
          <rect width={240} height={220} rx={12} fill="var(--color-screen)" />
          <circle cx={92} cy={86} r={62} fill={`rgb(${r},0,0)`} style={{ mixBlendMode: "screen" }} />
          <circle cx={148} cy={86} r={62} fill={`rgb(0,${g},0)`} style={{ mixBlendMode: "screen" }} />
          <circle cx={120} cy={136} r={62} fill={`rgb(0,0,${b})`} style={{ mixBlendMode: "screen" }} />
        </svg>
        <div className="space-y-3">
          <Slider label={<span className="text-red">Red</span>} min={0} max={255} value={r} onChange={setR} />
          <Slider label={<span className="text-on">Green</span>} min={0} max={255} value={g} onChange={setG} />
          <Slider label={<span className="text-cyan">Blue</span>} min={0} max={255} value={b} onChange={setB} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-14 w-24 rounded-xl border border-line-2" style={{ background: `rgb(${r},${g},${b})` }} />
            <div className="font-mono text-sm">
              <div className="text-ink">
                #{hexStr(r)}
                {hexStr(g)}
                {hexStr(b)}
              </div>
              <div className="text-xs text-dim">
                {binStr(r, 8)} {binStr(g, 8)} {binStr(b, 8)}
              </div>
              <div className="text-xs text-mute">3 bytes = 24 bits</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map(([n, pr, pg, pb]) => (
              <Btn key={n} className="text-xs" onClick={() => (setR(pr), setG(pg), setB(pb))}>
                <span
                  className="inline-block h-3 w-3 rounded-sm border border-line-2"
                  style={{ background: `rgb(${pr},${pg},${pb})` }}
                />
                {n}
              </Btn>
            ))}
          </div>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* A paintable framebuffer                                               */
/* ------------------------------------------------------------------ */

const FB_W = 16;
const FB_H = 10;
const paints: Array<[number, number, number]> = [
  [255, 214, 64],
  [61, 255, 160],
  [76, 201, 255],
  [255, 92, 138],
  [255, 255, 255],
  [16, 22, 30],
];

function initialFb() {
  const fb: Array<[number, number, number]> = Array.from({ length: FB_W * FB_H }, () => [16, 22, 30]);
  const face = [
    "................",
    ".....######.....",
    "....########....",
    "...##.####.##...",
    "...##########...",
    "...##.####.##...",
    "...###....###...",
    "....########....",
    ".....######.....",
    "................",
  ];
  face.forEach((row, y) => [...row].forEach((c, x) => c === "#" && (fb[y * FB_W + x] = [255, 214, 64])));
  return fb;
}

export function FramebufferPaint() {
  const [fb, setFb] = useState(initialFb);
  const [brush, setBrush] = useState(1);
  const [sel, setSel] = useState({ x: 5, y: 3 });
  const painting = useRef(false);
  const paint = (x: number, y: number) => {
    setSel({ x, y });
    setFb((f) => f.map((c, i) => (i === y * FB_W + x ? paints[brush] : c)));
  };
  const addr = (sel.y * FB_W + sel.x) * 3;
  const rowStart = sel.y * FB_W * 3;

  return (
    <Widget
      title="Paint directly into video memory"
      subtitle="This 16 × 10 screen's framebuffer is 480 bytes of RAM: 3 bytes per pixel, row after row. Paint a pixel and watch its bytes change."
      wide
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div>
          <div
            className="surface-screen grid touch-none gap-[2px] rounded-md border border-bezel p-1.5 select-none"
            style={{ gridTemplateColumns: `repeat(${FB_W}, minmax(0, 1fr))` }}
            onPointerUp={() => (painting.current = false)}
            onPointerLeave={() => (painting.current = false)}
          >
            {fb.map((c, i) => {
              const x = i % FB_W;
              const y = Math.floor(i / FB_W);
              return (
                <div
                  key={i}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    painting.current = true;
                    paint(x, y);
                  }}
                  onPointerEnter={() => painting.current && paint(x, y)}
                  className={cx(
                    "aspect-square cursor-crosshair rounded-[2px]",
                    sel.x === x && sel.y === y && "ring-2 ring-amber",
                  )}
                  style={{ background: `rgb(${c[0]},${c[1]},${c[2]})` }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {paints.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBrush(i)}
                aria-label={`Brush colour ${i + 1}`}
                className={cx("h-8 w-8 rounded-lg border-2", brush === i ? "border-ink" : "border-line-2")}
                style={{ background: `rgb(${p[0]},${p[1]},${p[2]})` }}
              />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-bg/60 p-3 text-sm">
            <div className="text-mute">
              Selected pixel (x = {sel.x}, y = {sel.y}) starts at byte:
            </div>
            <TeX
              block
            >{`(y \\times ${FB_W} + x) \\times 3 = (${sel.y} \\times ${FB_W} + ${sel.x}) \\times 3 = ${addr}`}</TeX>
          </div>
          <div className="rounded-xl border border-line bg-bg/60 p-3">
            <div className="mb-1 text-xs text-mute">
              Memory, bytes {rowStart}–{rowStart + FB_W * 3 - 1} (row {sel.y}):
            </div>
            <div className="grid grid-cols-6 gap-x-2 gap-y-0.5 font-mono text-[0.7rem] sm:grid-cols-12">
              {Array.from({ length: FB_W * 3 }, (_, k) => {
                const px = Math.floor(k / 3);
                const ch = k % 3;
                const v = fb[sel.y * FB_W + px][ch];
                const isSel = px === sel.x;
                return (
                  <span
                    key={k}
                    className={cx(
                      "rounded px-0.5 text-center",
                      isSel ? ["bg-red-tint text-red", "bg-on-tint text-on", "bg-cyan-tint text-cyan"][ch] : "text-dim",
                    )}
                    title={`byte ${rowStart + k}: pixel ${px} ${["red", "green", "blue"][ch]}`}
                  >
                    {hexStr(v)}
                  </span>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-mute">
            The display controller doesn't know about smiley faces. It just reads these bytes in order, 60 times a
            second.
          </p>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Rasterising a triangle                                               */
/* ------------------------------------------------------------------ */

const GW = 32;
const GH = 20;
const CELL = 20;

type V = { x: number; y: number };
const edge = (a: V, b: V, p: V) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);

export function TriangleRaster() {
  const [verts, setVerts] = useState<V[]>([
    { x: 5.2, y: 16.5 },
    { x: 15.8, y: 2.4 },
    { x: 28.3, y: 14.1 },
  ]);
  const [smooth, setSmooth] = useState(true);
  const [hover, setHover] = useState<V | null>({ x: 14, y: 10 });
  const drag = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const toGrid = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: clamp(p.x / CELL, 0, GW), y: clamp(p.y / CELL, 0, GH) };
  };

  const [A, B, C] = verts;
  const area = edge(A, B, C);
  const colors: Array<[number, number, number]> = [
    [255, 92, 138],
    [61, 255, 160],
    [76, 201, 255],
  ];

  const cells = useMemo(() => {
    const out: Array<{ x: number; y: number; inside: boolean; rgb: [number, number, number] }> = [];
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const p = { x: x + 0.5, y: y + 0.5 };
        const e0 = edge(B, C, p);
        const e1 = edge(C, A, p);
        const e2 = edge(A, B, p);
        const inside = area !== 0 && (area > 0 ? e0 >= 0 && e1 >= 0 && e2 >= 0 : e0 <= 0 && e1 <= 0 && e2 <= 0);
        const w0 = e0 / area;
        const w1 = e1 / area;
        const w2 = e2 / area;
        const rgb: [number, number, number] = [0, 1, 2].map((k) =>
          Math.round(w0 * colors[0][k] + w1 * colors[1][k] + w2 * colors[2][k]),
        ) as [number, number, number];
        out.push({ x, y, inside, rgb });
      }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [A.x, A.y, B.x, B.y, C.x, C.y, area]);
  const filled = cells.filter((c) => c.inside).length;

  const hp = hover ? { x: Math.floor(hover.x) + 0.5, y: Math.floor(hover.y) + 0.5 } : null;
  const hv = hp ? [edge(B, C, hp), edge(C, A, hp), edge(A, B, hp)] : null;
  const hInside = hv ? (area > 0 ? hv.every((v) => v >= 0) : hv.every((v) => v <= 0)) : false;

  return (
    <Widget
      title="Turning a triangle into pixels"
      subtitle="Drag the three corners. For every pixel, the GPU asks “is my centre inside all three edges?” using a couple of multiplications and a subtraction per edge."
      wide
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${GW * CELL} ${GH * CELL}`}
        className="surface-screen w-full touch-none rounded-md border border-bezel select-none"
        onPointerMove={(e) => {
          const g = toGrid(e);
          if (drag.current !== null) {
            const i = drag.current;
            setVerts((vs) => vs.map((v, k) => (k === i ? g : v)));
          }
          setHover(g);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
        role="img"
        aria-label="Triangle rasterisation grid"
      >
        {cells.map((c) => (
          <rect
            key={`${c.x}-${c.y}`}
            x={c.x * CELL + 1}
            y={c.y * CELL + 1}
            width={CELL - 2}
            height={CELL - 2}
            rx={2}
            fill={c.inside ? (smooth ? `rgb(${c.rgb.join(",")})` : "var(--color-on)") : "var(--color-screen-2)"}
            opacity={c.inside ? 0.9 : 1}
          />
        ))}
        {hp && (
          <rect
            x={(hp.x - 0.5) * CELL}
            y={(hp.y - 0.5) * CELL}
            width={CELL}
            height={CELL}
            fill="none"
            stroke="var(--color-amber)"
            strokeWidth={2}
          />
        )}
        <polygon
          points={verts.map((v) => `${v.x * CELL},${v.y * CELL}`).join(" ")}
          fill="none"
          stroke="var(--color-screen-ink)"
          strokeOpacity={0.8}
          strokeWidth={1.5}
        />
        {verts.map((v, i) => (
          <g key={i}>
            <circle
              cx={v.x * CELL}
              cy={v.y * CELL}
              r={11}
              fill={`rgb(${colors[i].join(",")})`}
              stroke="var(--color-screen)"
              strokeWidth={3}
              className="cursor-grab"
              onPointerDown={(e) => {
                e.preventDefault();
                svgRef.current?.setPointerCapture(e.pointerId);
                drag.current = i;
              }}
            />
            <text
              x={v.x * CELL}
              y={v.y * CELL + 4}
              textAnchor="middle"
              className="pointer-events-none font-mono text-[11px] font-bold"
              fill="var(--color-screen)"
            >
              {"ABC"[i]}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="rounded-xl border border-line bg-bg/60 p-3 text-sm">
          <TeX>{"E_{AB}(P) = (B_x - A_x)(P_y - A_y) - (B_y - A_y)(P_x - A_x)"}</TeX>
          {hv && hp && (
            <div className="mt-2 font-mono text-xs text-mute">
              pixel centre ({hp.x}, {hp.y}): E<sub>BC</sub> = {hv[0].toFixed(1)}, E<sub>CA</sub> = {hv[1].toFixed(1)}, E
              <sub>AB</sub> = {hv[2].toFixed(1)} →{" "}
              <span className={hInside ? "text-on" : "text-pink"}>
                {hInside ? "all the same sign: inside ✓" : "a sign differs: outside"}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Btn active={smooth} onClick={() => setSmooth((s) => !s)}>
            Blend corner colours: {smooth ? "on" : "off"}
          </Btn>
          <Pill tone="on">
            {filled} of {GW * GH} pixels filled
          </Pill>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 3D → 2D projection                                                   */
/* ------------------------------------------------------------------ */

const cube = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];
const cubeEdges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

export function Projection3D() {
  const [spin, setSpin] = useState(true);
  const t = useAnimationTime(spin);
  const [tilt, setTilt] = useState(25);
  const [dist, setDist] = useState(4.5);
  const f = 260;
  const ay = t * 0.6 + 0.6;
  const ax = (tilt * Math.PI) / 180;
  const W = 420;
  const H = 300;

  const rot = (p: number[]) => {
    const [x, y, z] = p;
    const x1 = x * Math.cos(ay) + z * Math.sin(ay);
    const z1 = -x * Math.sin(ay) + z * Math.cos(ay);
    const y2 = y * Math.cos(ax) - z1 * Math.sin(ax);
    const z2 = y * Math.sin(ax) + z1 * Math.cos(ax);
    return [x1, y2, z2];
  };
  const proj = (p: number[]) => {
    const z = p[2] + dist;
    return [W / 2 + (f * p[0]) / z, H / 2 - (f * p[1]) / z, z];
  };
  const rv = cube.map(rot);
  const pv = rv.map(proj);
  const k = 6; // the vertex we show the maths for: (1, 1, 1)
  const [px, py] = pv[k];

  return (
    <Widget
      title="3D → 2D: dividing by distance"
      subtitle="A 3D scene is a list of corner points (x, y, z). To draw them, rotate each point, then divide by how far away it is: far things shrink."
      wide
    >
      <div className="grid items-center gap-4 lg:grid-cols-[1fr_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full rounded-md border border-line bg-panel-2/40"
          role="img"
          aria-label="Rotating cube"
        >
          {cubeEdges.map(([a, b], i) => {
            const depth = (rv[a][2] + rv[b][2]) / 2;
            return (
              <line
                key={i}
                x1={pv[a][0]}
                y1={pv[a][1]}
                x2={pv[b][0]}
                y2={pv[b][1]}
                stroke="var(--color-cyan)"
                strokeWidth={2.5 - depth * 0.6}
                strokeOpacity={0.8 - depth * 0.2}
                strokeLinecap="round"
              />
            );
          })}
          {pv.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === k ? 7 : 4}
              fill={i === k ? "var(--color-amber)" : "var(--color-cyan)"}
            />
          ))}
        </svg>
        <div className="space-y-3">
          <Slider label="Tilt" min={-60} max={60} value={tilt} onChange={setTilt} format={(v) => `${v}°`} />
          <Slider
            label="Camera distance d"
            min={2.2}
            max={10}
            step={0.1}
            value={dist}
            onChange={setDist}
            format={(v) => v.toFixed(1)}
          />
          <Btn onClick={() => setSpin((s) => !s)}>{spin ? "⏸ Stop spinning" : "▶ Spin"}</Btn>
          <div className="rounded-xl border border-line bg-bg/60 p-3 text-xs">
            <div className="mb-1 text-mute">
              The <span className="text-amber">amber corner</span>, starting at (1, 1, 1):
            </div>
            <div className="font-mono text-ink">
              rotated → ({rv[k][0].toFixed(2)}, {rv[k][1].toFixed(2)}, {rv[k][2].toFixed(2)})
            </div>
            <div className="mt-1">
              <TeX>{`x_{\\text{screen}} = \\dfrac{f \\cdot x}{z + d} = \\dfrac{${f} \\times ${rv[k][0].toFixed(2)}}{${rv[k][2].toFixed(2)} + ${dist.toFixed(1)}} = ${(px - W / 2).toFixed(0)}`}</TeX>
            </div>
            <div className="mt-1">
              <TeX>{`y_{\\text{screen}} = \\dfrac{f \\cdot y}{z + d} = ${(H / 2 - py).toFixed(0)}`}</TeX>
            </div>
          </div>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* CPU vs GPU race                                                      */
/* ------------------------------------------------------------------ */

const RW = 96;
const RH = 54;

function revealed(src: Img, count: number): Img {
  const data = new Uint8ClampedArray(src.data.length);
  const n = Math.min(count, RW * RH);
  for (let i = 0; i < RW * RH; i++) {
    const o = i * 4;
    if (i < n) {
      data[o] = src.data[o];
      data[o + 1] = src.data[o + 1];
      data[o + 2] = src.data[o + 2];
    } else {
      data[o] = 12;
      data[o + 1] = 18;
      data[o + 2] = 26;
    }
    data[o + 3] = 255;
  }
  return { w: RW, h: RH, data };
}

export function GpuRace() {
  const src = useMemo(() => makeScene(RW, RH), []);
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const cpuCores = 8;
  const gpuCores = 2048;
  const total = RW * RH;
  const cpuDone = tick * cpuCores >= total;
  useInterval(
    () => {
      setTick((t) => t + 1);
      if ((tick + 1) * cpuCores >= total) setRunning(false);
    },
    running ? 1000 / 60 : null,
  );
  const cpuImg = useMemo(() => revealed(src, tick * cpuCores), [src, tick]);
  const gpuImg = useMemo(() => revealed(src, tick * gpuCores), [src, tick]);
  return (
    <Widget
      title="Why GPUs have thousands of cores"
      subtitle={`Colour a ${RW} × ${RH} image (${total.toLocaleString()} pixels). Each core shades one pixel per tick. CPU: ${cpuCores} big cores. GPU: ${gpuCores.toLocaleString()} small ones.`}
      wide
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            name: `CPU · ${cpuCores} cores`,
            img: cpuImg,
            done: Math.min(total, tick * cpuCores),
            ticks: Math.ceil(total / cpuCores),
            tone: "text-cyan",
          },
          {
            name: `GPU · ${gpuCores.toLocaleString()} cores`,
            img: gpuImg,
            done: Math.min(total, tick * gpuCores),
            ticks: Math.ceil(total / gpuCores),
            tone: "text-on",
          },
        ].map((s) => (
          <div key={s.name}>
            <div className={cx("mb-1 font-mono text-sm font-semibold", s.tone)}>{s.name}</div>
            <div className="overflow-hidden rounded-xl border border-line-2">
              <PixelCanvas img={s.img} ariaLabel={s.name} />
            </div>
            <div className="mt-1 font-mono text-xs text-mute">
              {s.done.toLocaleString()} / {total.toLocaleString()} pixels · needs {s.ticks} ticks
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn
          variant="primary"
          onClick={() => {
            if (cpuDone) setTick(0);
            setRunning((r) => !r);
          }}
        >
          {running ? "⏸ Pause" : cpuDone ? "↻ Race again" : "▶ Start the race"}
        </Btn>
        <Btn onClick={() => (setTick(0), setRunning(false))}>Reset</Btn>
        <span className="font-mono text-sm text-mute">tick {tick}</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="1080p pixels per frame" value="2,073,600" />
        <Stat label="× 60 frames per second" value="124 million" sub="pixels per second" />
        <Stat label="× ~500 operations each" value="≈ 62 billion" sub="operations per second" tone="amber" />
      </div>
    </Widget>
  );
}
