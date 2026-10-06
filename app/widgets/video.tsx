import { useMemo, useRef, useState } from "react";

import { PixelCanvas } from "~/components/pixel-canvas";
import { TeX } from "~/components/tex";
import { Btn, cx, Pill, Segmented, Slider, Stat, Widget } from "~/components/ui";
import { fmt } from "~/lib/bits";
import {
  blockBits,
  compressImage,
  dct8,
  idct8,
  LUMA_Q,
  planesToImg,
  readBlock,
  runLength,
  scaleTable,
  subsample,
  toPlanes,
  ZIGZAG,
} from "~/lib/codec";
import { useAnimationTime } from "~/lib/hooks";
import { cloneImg, drawBall, makeScene, type Img } from "~/lib/image";

const VW = 192;
const VH = 112;
const BALL: [number, number, number] = [255, 92, 138];

function useScene() {
  return useMemo(() => makeScene(VW, VH), []);
}

/* ------------------------------------------------------------------ */
/* 1. A video is a flipbook                                              */
/* ------------------------------------------------------------------ */

function ballAt(time: number) {
  const x = 14 + ((time * 46) % 164);
  const y = 74 - 46 * Math.abs(Math.sin(time * 2.6));
  return { x, y };
}

export function Flipbook() {
  const bg = useScene();
  const [fps, setFps] = useState(24);
  const [playing, setPlaying] = useState(true);
  const t = useAnimationTime(playing);
  const frame = Math.floor(t * fps);
  const frameImg = useMemo(() => {
    const img = cloneImg(bg);
    const { x, y } = ballAt(frame / fps);
    drawBall(img, x, y, 9, BALL);
    return img;
  }, [bg, frame, fps]);
  return (
    <Widget
      title="A video is a flipbook"
      subtitle="Show still pictures fast enough and your brain sees motion. Drag the frame rate down to see the trick fall apart."
    >
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="self-start overflow-hidden rounded-xl border border-line-2">
          <PixelCanvas img={frameImg} ariaLabel="Animated frames" />
        </div>
        <div className="space-y-3">
          <Slider label="Frames per second" min={1} max={60} value={fps} onChange={setFps} format={(v) => `${v} fps`} />
          <div className="flex flex-wrap gap-1.5">
            {[2, 12, 24, 30, 60].map((f) => (
              <Btn key={f} className="text-xs" active={fps === f} onClick={() => setFps(f)}>
                {f} fps
              </Btn>
            ))}
          </div>
          <Btn onClick={() => setPlaying((p) => !p)}>{playing ? "⏸ Pause" : "▶ Play"}</Btn>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Frame number" value={frame} />
            <Stat label="Each frame shown" value={`${(1000 / fps).toFixed(0)} ms`} />
          </div>
          <p className="text-xs text-mute">
            Films use 24 fps, TV and most online video 30, games and smooth video 60+.
          </p>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Raw size calculator                                               */
/* ------------------------------------------------------------------ */

const resolutions = [
  { id: "720p", w: 1280, h: 720, mbps: 3 },
  { id: "1080p", w: 1920, h: 1080, mbps: 5 },
  { id: "4K", w: 3840, h: 2160, mbps: 16 },
] as const;

function fmtBytes(b: number) {
  if (b >= 1e12) return `${(b / 1e12).toFixed(2)} TB`;
  if (b >= 1e9) return `${(b / 1e9).toFixed(b >= 1e11 ? 0 : 1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  return `${(b / 1e3).toFixed(1)} KB`;
}

export function RawSizeCalc() {
  const [res, setRes] = useState<(typeof resolutions)[number]["id"]>("1080p");
  const [fps, setFps] = useState(30);
  const [minutes, setMinutes] = useState(60);
  const r = resolutions.find((x) => x.id === res)!;
  const perFrame = r.w * r.h * 3;
  const raw = perFrame * fps * minutes * 60;
  const streamed = ((r.mbps * 1e6) / 8) * minutes * 60;
  return (
    <Widget
      title="How big would video be with no compression?"
      subtitle="Pick a video. Every pixel needs 3 bytes, every frame needs every pixel."
    >
      <div className="flex flex-wrap items-end gap-4">
        <Segmented value={res} onChange={setRes} options={resolutions.map((x) => ({ value: x.id, label: x.id }))} />
        <Segmented value={fps} onChange={setFps} options={[24, 30, 60].map((f) => ({ value: f, label: `${f} fps` }))} />
        <Slider
          className="w-48"
          label="Length"
          min={1}
          max={180}
          value={minutes}
          onChange={setMinutes}
          format={(v) => `${v} min`}
        />
      </div>
      <div className="mt-4 rounded-xl border border-line bg-bg/60 p-3 text-sm">
        <TeX
          block
        >{`\\underbrace{${r.w} \\times ${r.h}}_{\\text{pixels}} \\times \\underbrace{3}_{\\text{bytes}} \\times \\underbrace{${fps}}_{\\text{fps}} \\times \\underbrace{${minutes * 60}}_{\\text{seconds}} = ${fmt(raw).replace(/,/g, "{,}")} \\text{ bytes}`}</TeX>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Raw (uncompressed)" value={fmtBytes(raw)} tone="pink" sub={`${fmtBytes(perFrame)} per frame`} />
        <Stat label={`Streamed at ~${r.mbps} Mbit/s`} value={fmtBytes(streamed)} tone="on" sub="typical online video" />
        <Stat label="Compression" value={`≈ ${Math.round(raw / streamed)} : 1`} tone="amber" sub="raw ÷ streamed" />
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Trick 1: colour detail is cheap                                    */
/* ------------------------------------------------------------------ */

function planeAsImg(plane: Float32Array, kind: "y" | "cb" | "cr", w: number, h: number): Img {
  const neutral = new Float32Array(w * h).fill(128);
  if (kind === "y") return planesToImg({ w, h, y: plane, cb: neutral, cr: neutral });
  const mid = new Float32Array(w * h).fill(150);
  return kind === "cb"
    ? planesToImg({ w, h, y: mid, cb: plane, cr: neutral })
    : planesToImg({ w, h, y: mid, cb: neutral, cr: plane });
}

export function ChromaDemo() {
  const img = useScene();
  const planes = useMemo(() => toPlanes(img), [img]);
  const [f, setF] = useState(2);
  const views = useMemo(
    () => ({
      y: planeAsImg(planes.y, "y", VW, VH),
      cb: planeAsImg(planes.cb, "cb", VW, VH),
      cr: planeAsImg(planes.cr, "cr", VW, VH),
    }),
    [planes],
  );
  const rebuilt = useMemo(
    () =>
      planesToImg({
        w: VW,
        h: VH,
        y: planes.y,
        cb: subsample(planes.cb, VW, VH, f),
        cr: subsample(planes.cr, VW, VH, f),
      }),
    [planes, f],
  );
  const bpp = 1 + 2 / (f * f);
  return (
    <Widget
      title="Split brightness from colour"
      subtitle="Convert RGB into Y (brightness) + two colour-difference channels. Then store colour at lower resolution. Can you see the difference?"
      wide
    >
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["Y: brightness", views.y],
            ["Cb: blue vs yellow", views.cb],
            ["Cr: red vs green", views.cr],
          ] as const
        ).map(([label, im]) => (
          <div key={label}>
            <div className="mb-1 font-mono text-[0.7rem] text-mute">{label}</div>
            <div className="overflow-hidden rounded-lg border border-line-2">
              <PixelCanvas img={im} ariaLabel={label} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 font-mono text-[0.7rem] text-mute">original</div>
          <div className="overflow-hidden rounded-lg border border-line-2">
            <PixelCanvas img={img} ariaLabel="Original" />
          </div>
        </div>
        <div>
          <div className="mb-1 font-mono text-[0.7rem] text-mute">
            full brightness + colour averaged over {f}×{f} squares
          </div>
          <div className="overflow-hidden rounded-lg border border-line-2">
            <PixelCanvas img={rebuilt} ariaLabel="Rebuilt with subsampled colour" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Segmented
          value={f}
          onChange={setF}
          options={[
            { value: 1, label: "no averaging" },
            { value: 2, label: "2×2 (standard)" },
            { value: 4, label: "4×4" },
            { value: 8, label: "8×8 (extreme)" },
          ]}
        />
        <Pill tone="amber">{bpp.toFixed(bpp % 1 ? 2 : 0)} bytes per pixel instead of 3</Pill>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Trick 2 in 1D: any 8 numbers = a recipe of 8 waves                  */
/* ------------------------------------------------------------------ */

const dct1 = (s: number[]) =>
  Array.from({ length: 8 }, (_, k) => {
    let sum = 0;
    for (let n = 0; n < 8; n++) sum += s[n] * Math.cos(((2 * n + 1) * k * Math.PI) / 16);
    return sum * Math.sqrt(2 / 8) * (k === 0 ? Math.SQRT1_2 : 1);
  });
const basis1 = (k: number, n: number) =>
  Math.sqrt(2 / 8) * (k === 0 ? Math.SQRT1_2 : 1) * Math.cos(((2 * n + 1) * k * Math.PI) / 16);

export function Wave1D() {
  const scene = useScene();
  const photoRow = useMemo(() => {
    const p = toPlanes(scene);
    return Array.from({ length: 8 }, (_, i) => Math.round(p.y[56 * VW + 124 + i]));
  }, [scene]);
  const presets: Record<string, number[]> = {
    "photo row": photoRow,
    smooth: [60, 70, 85, 100, 115, 130, 140, 150],
    edge: [40, 40, 40, 40, 210, 210, 210, 210],
    stripes: [200, 50, 200, 50, 200, 50, 200, 50],
  };
  const [samples, setSamples] = useState<number[]>(presets.smooth);
  const [k, setK] = useState(2);
  const dragging = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const centred = samples.map((v) => v - 128);
  const coef = dct1(centred);
  const recon = Array.from({ length: 8 }, (_, n) => {
    let s = 0;
    for (let j = 0; j < k; j++) s += coef[j] * basis1(j, n);
    return s + 128;
  });
  const W = 400;
  const H = 200;
  const bw = W / 8;
  const yv = (v: number) => H - (Math.max(0, Math.min(255, v)) / 255) * (H - 10);

  const setFromPointer = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const i = Math.max(0, Math.min(7, Math.floor(p.x / bw)));
    const v = Math.round(Math.max(0, Math.min(255, ((H - p.y) / (H - 10)) * 255)));
    setSamples((s) => s.map((x, j) => (j === i ? v : x)));
  };

  return (
    <Widget
      title="Any 8 numbers = a recipe of 8 waves"
      subtitle="Here are 8 pixel brightnesses in a row (drag the bars). The DCT finds how much of each wave to mix to rebuild them exactly. Use fewer waves and see what's lost."
      wide
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {Object.entries(presets).map(([name, v]) => (
          <Btn key={name} className="text-xs" onClick={() => setSamples(v)}>
            {name}
          </Btn>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-none rounded-xl border border-line-2 bg-bg/60"
            onPointerDown={(e) => {
              dragging.current = true;
              svgRef.current?.setPointerCapture(e.pointerId);
              setFromPointer(e);
            }}
            onPointerMove={(e) => dragging.current && setFromPointer(e)}
            onPointerUp={() => (dragging.current = false)}
            role="img"
            aria-label="Eight samples and their reconstruction"
          >
            {samples.map((v, i) => (
              <g key={i}>
                <rect
                  x={i * bw + 6}
                  y={yv(v)}
                  width={bw - 12}
                  height={H - yv(v)}
                  fill={`rgb(${v},${v},${v})`}
                  opacity={0.9}
                  rx={3}
                />
                <rect
                  x={i * bw + 4}
                  y={yv(recon[i]) - 2}
                  width={bw - 8}
                  height={4}
                  rx={2}
                  fill="var(--color-amber)"
                  className="glow-amber"
                />
              </g>
            ))}
            <path
              d={recon.map((v, i) => `${i ? "L" : "M"}${i * bw + bw / 2} ${yv(v)}`).join(" ")}
              fill="none"
              stroke="var(--color-amber)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          </svg>
          <div className="mt-1 flex justify-between font-mono text-[0.7rem] text-dim">
            <span>bars = real pixels (drag them)</span>
            <span className="text-amber">
              amber = rebuilt from {k} wave{k > 1 ? "s" : ""}
            </span>
          </div>
          <Slider
            className="mt-3"
            label="Waves used"
            min={1}
            max={8}
            value={k}
            onChange={setK}
            format={(v) => `${v} of 8`}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {coef.map((c, j) => {
            const used = j < k;
            const pts = Array.from({ length: 33 }, (_, i) => {
              const n = (i / 32) * 8 - 0.5;
              const y = Math.cos(((2 * n + 1) * j * Math.PI) / 16);
              return `${i ? "L" : "M"}${(i / 32) * 80} ${30 - y * 22}`;
            }).join(" ");
            return (
              <div
                key={j}
                className={cx(
                  "rounded-lg border p-1.5 transition",
                  used ? "border-amber/60 bg-amber/5" : "border-line opacity-50",
                )}
              >
                <svg viewBox="0 0 80 60" className="w-full">
                  <line x1={0} x2={80} y1={30} y2={30} stroke="var(--color-line)" />
                  <path d={pts} fill="none" stroke={used ? "var(--color-amber)" : "var(--color-dim)"} strokeWidth={2} />
                </svg>
                <div className="text-center font-mono text-[0.6875rem] text-mute">wave {j}</div>
                <div className={cx("text-center font-mono text-xs", Math.abs(c) < 8 ? "text-dim" : "text-ink")}>
                  × {c.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-sm text-mute">
        For smooth rows, almost all the “recipe” is in the first two or three waves; the rest are near zero. Real photos
        are mostly smooth, so most of those numbers can be thrown away. Sharp edges and stripes need the fast wiggly
        waves, which is why heavily compressed video looks blurry or “ringy” around edges.
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 5. The full 2D DCT explorer                                           */
/* ------------------------------------------------------------------ */

function Matrix8({
  values,
  color,
  title,
  fmtV = (v) => v.toFixed(0),
  dimZero,
  onHover,
  hl,
  dataCells,
}: {
  values: number[];
  color: (v: number, i: number) => string;
  title: string;
  fmtV?: (v: number) => string;
  dimZero?: boolean;
  onHover?: (i: number | null) => void;
  hl?: number | null;
  /** Cells show real pixel brightness, so pick ink by luminance. */
  dataCells?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-[0.7rem] font-semibold tracking-wider text-mute uppercase">{title}</div>
      <div className="grid grid-cols-8 gap-[2px]" onMouseLeave={() => onHover?.(null)}>
        {values.map((v, i) => {
          const zero = dimZero && Math.round(v) === 0;
          return (
            <div
              key={i}
              onMouseEnter={() => onHover?.(i)}
              className={cx(
                "flex aspect-square items-center justify-center rounded-[3px] font-mono text-[0.6875rem] leading-none tracking-tighter tabular-nums",
                zero ? "text-dim" : dataCells ? undefined : "heat-label text-ink",
                hl === i && "ring-2 ring-amber",
              )}
              style={{
                background: zero ? "var(--color-panel-2)" : color(v, i),
                // Cells painted with real pixel brightness pick dark or light ink for contrast.
                color: dataCells && !zero ? (v >= 128 ? "#1f1d1a" : "#efe9dc") : undefined,
              }}
            >
              {fmtV(v)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function basisImg(u: number, v: number): Img {
  const coef = new Array(64).fill(0);
  coef[v * 8 + u] = u === 0 && v === 0 ? 400 : 300;
  const px = idct8(coef);
  const data = new Uint8ClampedArray(64 * 4);
  px.forEach((p, i) => {
    const g = Math.max(0, Math.min(255, p + 128));
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = g;
    data[i * 4 + 3] = 255;
  });
  return { w: 8, h: 8, data };
}

const coefColor = (v: number) => {
  const a = Math.min(1, Math.abs(v) / 120);
  const pct = Math.round((0.15 + a * 0.7) * 100);
  return `color-mix(in oklab, var(--color-${v >= 0 ? "cyan" : "pink"}) ${pct}%, var(--color-panel-2))`;
};
const grey = (v: number) => {
  const g = Math.max(0, Math.min(255, v));
  return `rgb(${g},${g},${g})`;
};

export function DctExplorer() {
  const img = useScene();
  const planes = useMemo(() => toPlanes(img), [img]);
  const [quality, setQuality] = useState(50);
  const [blk, setBlk] = useState({ bx: 15, by: 6 });
  const [view, setView] = useState<"compressed" | "original">("compressed");
  const [hover, setHover] = useState<number | null>(null);
  const comp = useMemo(() => compressImage(img, quality), [img, quality]);
  const table = useMemo(() => scaleTable(LUMA_Q, quality), [quality]);

  const pixels = readBlock(planes.y, VW, blk.bx, blk.by);
  const coef = dct8(pixels.map((p) => p - 128));
  const q = coef.map((c, i) => Math.round(c / table[i]));
  const rec = idct8(q.map((v, i) => v * table[i])).map((v) => v + 128);
  const rle = runLength(q);
  const zz = ZIGZAG.map((i) => q[i]);
  let lastNz = 63;
  while (lastNz >= 0 && zz[lastNz] === 0) lastNz--;
  const trailing = 63 - lastNz;
  const nonzero = q.filter((v) => v !== 0).length;
  const bits = blockBits(q);
  const hoverImg = useMemo(() => (hover === null ? null : basisImg(hover % 8, Math.floor(hover / 8))), [hover]);

  return (
    <Widget
      title="JPEG-style compression, for real"
      subtitle="This runs an actual compressor on the picture: split into 8×8 blocks → DCT → divide by a quality table and round → most numbers become 0. Click any block to look inside."
      wide
    >
      <div className="grid gap-5">
        <div>
          <div className="relative overflow-hidden rounded-xl border border-line-2">
            <PixelCanvas
              img={view === "compressed" ? comp.img : img}
              onPick={(x, y) => setBlk({ bx: Math.floor(x / 8), by: Math.floor(y / 8) })}
              ariaLabel="Picture split into 8 by 8 blocks"
            />
            <div
              className="pointer-events-none absolute border-2 border-amber halo-amber"
              style={{
                left: `${((blk.bx * 8) / VW) * 100}%`,
                top: `${((blk.by * 8) / VH) * 100}%`,
                width: `${(8 / VW) * 100}%`,
                height: `${(8 / VH) * 100}%`,
              }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Segmented
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "compressed", label: "compressed" },
                { value: "original", label: "original" },
              ]}
            />
            <Slider
              className="min-w-48 flex-1"
              label="Quality"
              min={1}
              max={100}
              value={quality}
              onChange={setQuality}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="Raw size" value={fmtBytes(comp.raw)} />
            <Stat label="Compressed ≈" value={fmtBytes(comp.bytes)} tone="on" />
            <Stat label="Ratio" value={`${(comp.raw / comp.bytes).toFixed(0)} : 1`} tone="amber" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 @3xl:grid-cols-4">
          <Matrix8 title="1 · pixels (brightness)" values={pixels} color={grey} dataCells />
          <Matrix8 title="2 · DCT: wave amounts" values={coef} color={coefColor} onHover={setHover} hl={hover} />
          <Matrix8
            title={`3 · ÷ table, round (${nonzero} left)`}
            values={q}
            color={coefColor}
            dimZero
            onHover={setHover}
            hl={hover}
          />
          <Matrix8 title="4 · rebuilt pixels" values={rec} color={grey} dataCells />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-bg/60 p-3">
          <div className="w-16 overflow-hidden rounded border border-line-2">
            {hoverImg ? (
              <PixelCanvas img={hoverImg} ariaLabel="DCT basis pattern" />
            ) : (
              <div className="flex aspect-square items-center justify-center text-[0.6875rem] text-dim">hover</div>
            )}
          </div>
          <div className="w-40 text-xs text-mute">
            {hover === null ? (
              "Hover a number in grid 2 or 3 to see the 8×8 wave pattern it measures."
            ) : (
              <>
                Pattern ({hover % 8}, {Math.floor(hover / 8)}):{" "}
                {hover === 0 ? "the block's average brightness" : "a wave this block contains"}. Table divides it by{" "}
                <span className="font-mono text-ink">{table[hover]}</span>.
              </>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-bg/60 p-3">
          <div className="text-[0.7rem] font-semibold tracking-wider text-mute uppercase">
            5 · read in zig-zag order, write runs of zeros compactly ≈ {bits} bits (vs {64 * 8} raw)
          </div>
          <div className="scroll-thin mt-1.5 flex flex-wrap gap-1 font-mono text-[0.7rem]">
            {rle.map((p, i) =>
              p === "EOB" ? (
                <span key={i} className="rounded bg-amber-tint px-1.5 py-0.5 text-amber">
                  END: the last {trailing} are all 0
                </span>
              ) : (
                <span key={i} className="rounded bg-panel-3 px-1.5 py-0.5 text-ink">
                  {p.run > 0 && <span className="text-dim">{p.run}×0, </span>}
                  {p.value}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Trick 3: only send what moved                                      */
/* ------------------------------------------------------------------ */

const MB = 16;

function sad(a: Img, b: Img, ax: number, ay: number, bx: number, by: number) {
  let s = 0;
  for (let y = 0; y < MB; y++)
    for (let x = 0; x < MB; x++) {
      const i = ((ay + y) * VW + ax + x) * 4;
      const j = ((by + y) * VW + bx + x) * 4;
      s +=
        Math.abs(a.data[i] - b.data[j]) +
        Math.abs(a.data[i + 1] - b.data[j + 1]) +
        Math.abs(a.data[i + 2] - b.data[j + 2]);
    }
  return s;
}

export function MotionDemo() {
  const bg = useScene();
  const [dx, setDx] = useState(9);
  const [dy, setDy] = useState(-5);
  const [show, setShow] = useState<"a" | "b">("b");
  const start = { x: 70, y: 66 };
  const frames = useMemo(() => {
    const a = cloneImg(bg);
    drawBall(a, start.x, start.y, 10, BALL);
    const b = cloneImg(bg);
    drawBall(b, start.x + dx, start.y + dy, 10, BALL);
    return { a, b };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bg, dx, dy]);

  const analysis = useMemo(() => {
    const { a, b } = frames;
    const cols = VW / MB;
    const rows = VH / MB;
    const blocks: Array<{ x: number; y: number; changed: boolean; mv?: { x: number; y: number }; bits: number }> = [];
    const lt = scaleTable(LUMA_Q, 50);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = c * MB;
        const y = r * MB;
        const same = sad(a, b, x, y, x, y);
        if (same < 200) {
          blocks.push({ x, y, changed: false, bits: 1 });
          continue;
        }
        // search frame A for the best match of this block of frame B
        let best = { sad: same, x: 0, y: 0 };
        for (let oy = -14; oy <= 14; oy++)
          for (let ox = -14; ox <= 14; ox++) {
            const sx = x + ox;
            const sy = y + oy;
            if (sx < 0 || sy < 0 || sx + MB > VW || sy + MB > VH) continue;
            const s = sad(a, b, sx, sy, x, y);
            if (s < best.sad) best = { sad: s, x: ox, y: oy };
          }
        // cost of the leftover difference, using the same DCT + quantise trick
        let bits = 12; // motion vector
        for (let sub = 0; sub < 4; sub++) {
          const ox = x + (sub % 2) * 8;
          const oy = y + Math.floor(sub / 2) * 8;
          const resid: number[] = [];
          for (let yy = 0; yy < 8; yy++)
            for (let xx = 0; xx < 8; xx++) {
              const i = ((oy + yy) * VW + ox + xx) * 4;
              const j = ((oy + yy + best.y) * VW + ox + xx + best.x) * 4;
              const yb = 0.299 * b.data[i] + 0.587 * b.data[i + 1] + 0.114 * b.data[i + 2];
              const ya = 0.299 * a.data[j] + 0.587 * a.data[j + 1] + 0.114 * a.data[j + 2];
              resid.push(yb - ya);
            }
          const q = dct8(resid).map((cf, k) => Math.round(cf / lt[k]));
          bits += blockBits(q);
        }
        blocks.push({ x, y, changed: true, mv: { x: best.x, y: best.y }, bits });
      }
    const pBytes = Math.ceil(blocks.reduce((s, bl) => s + bl.bits, 0) / 8);
    const iBytes = compressImage(b, 50).bytes;
    return { blocks, pBytes, iBytes };
  }, [frames]);
  const changed = analysis.blocks.filter((b) => b.changed);

  return (
    <Widget
      title="Most of the next frame is already on screen"
      subtitle="Frame 2 is cut into 16×16 blocks. Blocks that didn't change are just “copy”. For blocks that did, the encoder searches frame 1 for the best match and sends an arrow (motion vector) plus a tiny correction."
      wide
    >
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="relative self-start overflow-hidden rounded-xl border border-line-2">
            <PixelCanvas img={show === "a" ? frames.a : frames.b} ariaLabel={show === "a" ? "Frame 1" : "Frame 2"} />
            <svg viewBox={`0 0 ${VW} ${VH}`} className="pointer-events-none absolute inset-0 h-full w-full">
              <defs>
                <marker
                  id="mv-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0 L10 5 L0 10 z" fill="#fff" />
                </marker>
              </defs>
              {analysis.blocks.map((bl) => (
                <rect
                  key={`${bl.x}-${bl.y}`}
                  x={bl.x + 0.25}
                  y={bl.y + 0.25}
                  width={MB - 0.5}
                  height={MB - 0.5}
                  fill={bl.changed ? "rgb(255 181 71 / 0.12)" : "rgb(0 0 0 / 0.35)"}
                  stroke={bl.changed ? "var(--color-amber)" : "rgb(255 255 255 / 0.12)"}
                  strokeWidth={bl.changed ? 0.8 : 0.3}
                />
              ))}
              {changed.map(
                (bl) =>
                  bl.mv &&
                  (bl.mv.x !== 0 || bl.mv.y !== 0) && (
                    <line
                      key={`v${bl.x}-${bl.y}`}
                      x1={bl.x + MB / 2 + bl.mv.x}
                      y1={bl.y + MB / 2 + bl.mv.y}
                      x2={bl.x + MB / 2}
                      y2={bl.y + MB / 2}
                      stroke="#fff"
                      strokeWidth={0.9}
                      markerEnd="url(#mv-arrow)"
                    />
                  ),
              )}
            </svg>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Segmented
              size="sm"
              value={show}
              onChange={setShow}
              options={[
                { value: "a", label: "frame 1" },
                { value: "b", label: "frame 2" },
              ]}
            />
            <span className="text-xs text-mute">
              dark = “copy from last frame” · amber = changed · arrows = motion vectors
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <Slider label="Ball moves right" min={-12} max={12} value={dx} onChange={setDx} format={(v) => `${v} px`} />
          <Slider label="Ball moves down" min={-12} max={12} value={dy} onChange={setDy} format={(v) => `${v} px`} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Blocks changed" value={`${changed.length} / ${analysis.blocks.length}`} tone="amber" />
            <Stat label="Blocks copied" value={analysis.blocks.length - changed.length} />
            <Stat label="Full frame (I-frame)" value={fmtBytes(analysis.iBytes)} sub="compressed on its own" />
            <Stat
              label="Changes only (P-frame)"
              value={fmtBytes(analysis.pBytes)}
              tone="on"
              sub={`${(analysis.iBytes / Math.max(1, analysis.pBytes)).toFixed(0)}× smaller`}
            />
          </div>
        </div>
      </div>
    </Widget>
  );
}
