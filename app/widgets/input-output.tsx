/**
 * Widgets for the "Input, Output & the Monitor" chapter: how bytes get in
 * and out of the CPU, how a monitor turns a stream of numbers into light,
 * and how the smooth real world becomes numbers (and back).
 */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { CircuitDefs, Wire } from "~/components/circuit";
import { PixelCanvas } from "~/components/pixel-canvas";
import { TeX } from "~/components/tex";
import { Bits, Btn, cx, DataTable, Figure, Pill, Segmented, Slider, Stat, Widget } from "~/components/ui";
import { binStr, clamp, fmt, hexStr, rng } from "~/lib/bits";
import { useAnimationTime, useInterval, useMounted, useReducedMotion } from "~/lib/hooks";
import type { Img } from "~/lib/image";

type RGB = [number, number, number];
/** Real emitted light (pixel data), so a literal colour is allowed here. */
const rgb = (c: RGB) => `rgb(${c[0]} ${c[1]} ${c[2]})`;

/** A digital signal shown as a small lamp, its name and its value (0/1). */
function SignalLine({ on, label, formula }: { on: boolean; label: ReactNode; formula?: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        aria-hidden
        className={cx(
          "mt-1 inline-block h-3 w-3 shrink-0 rounded-full border-[1.5px]",
          on ? "border-on bg-on halo-on" : "border-off bg-panel",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={cx("font-sans text-sm", on ? "font-semibold text-ink" : "text-mute")}>{label}</span>
          <span className={cx("font-mono text-sm tabular-nums", on ? "font-bold text-on" : "text-dim")}>
            = {on ? 1 : 0}
          </span>
        </div>
        {formula && <div className="font-mono text-xs text-dim">{formula}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. The address map: one set of wires, four kinds of chip             */
/* ------------------------------------------------------------------ */

type Chip = "ram" | "rom" | "kbd" | "screen" | "none";

const CHIPS: Record<Chip, { name: string; range: string; box: string; text: string; halo: string }> = {
  ram: {
    name: "RAM",
    range: "0x0000–0xDFFF",
    box: "border-cyan bg-cyan-tint",
    text: "text-cyan",
    halo: "halo-cyan",
  },
  rom: {
    name: "ROM",
    range: "0xE000–0xEFFF",
    box: "border-violet bg-violet-tint",
    text: "text-violet",
    halo: "halo-violet",
  },
  kbd: {
    name: "Keyboard",
    range: "0xF000–0xF001",
    box: "border-amber bg-amber-tint",
    text: "text-amber",
    halo: "halo-amber",
  },
  screen: {
    name: "Screen",
    range: "0xF100–0xF107",
    box: "border-red bg-red-tint",
    text: "text-red",
    halo: "halo",
  },
  none: { name: "nothing", range: "", box: "border-line-2 bg-panel-2", text: "text-mute", halo: "" },
};

function chipOf(a: number): Chip {
  if (a <= 0xdfff) return "ram";
  if (a <= 0xefff) return "rom";
  if (a === 0xf000 || a === 0xf001) return "kbd";
  if (a >= 0xf100 && a <= 0xf107) return "screen";
  return "none";
}

const ROM_START = [0xa9, 0x00, 0x8d, 0x00, 0xf1];
const romByte = (a: number) => (a - 0xe000 < ROM_START.length ? ROM_START[a - 0xe000] : (a * 73 + 41) & 0xff);
const SMILEY = [0x3c, 0x42, 0xa5, 0x81, 0xa5, 0x99, 0x42, 0x3c];
/** USB "usage IDs": the code for the key in each position (not a letter code). */
const TOY_KEYS: Array<[string, number]> = [
  ["A", 0x04],
  ["B", 0x05],
  ["C", 0x06],
  ["D", 0x07],
  ["E", 0x08],
  ["F", 0x09],
];

type BusLog = { id: number; op: "WRITE" | "READ"; addr: number; val: number; chip: Chip; note: string };

const PRESETS: Array<[number, string]> = [
  [0x1234, "RAM"],
  [0xe000, "ROM"],
  [0xf000, "key data"],
  [0xf001, "key status"],
  [0xf103, "screen row 3"],
  [0xf500, "unused"],
];

function ChipCard({ chip, active, children }: { chip: Chip; active: boolean; children: ReactNode }) {
  const c = CHIPS[chip];
  return (
    <div
      className={cx(
        "min-w-0 rounded-md border p-3 transition-colors",
        active ? cx(c.box, c.halo) : "border-line bg-panel",
      )}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className={cx("label-caps", active ? c.text : "text-mute")}>{c.name}</span>
        {active ? (
          <span className={cx("font-sans text-xs font-semibold", c.text)}>◀ selected</span>
        ) : (
          <span className="font-mono text-xs text-dim">{c.range}</span>
        )}
      </div>
      <div className="space-y-2 font-sans text-sm text-mute">{children}</div>
    </div>
  );
}

export function AddressMap() {
  const inputId = useId();
  const [addr, setAddr] = useState(0xf102);
  const [text, setText] = useState("F102");
  const [val, setVal] = useState(0x3c);
  const [ram, setRam] = useState<Record<number, number>>({ 0x1234: 0x2a });
  const [screen, setScreen] = useState<number[]>(() => Array(8).fill(0));
  const [kbd, setKbd] = useState({ data: 0x00, status: 0 });
  const [log, setLog] = useState<BusLog[]>([]);
  const nextId = useRef(1);

  const chip = chipOf(addr);
  const bit = (b: number) => (addr >> b) & 1;
  const top3 = bit(15) === 1 && bit(14) === 1 && bit(13) === 1;
  const ramSel = !top3;
  const romSel = top3 && bit(12) === 0;
  const ioSel = top3 && bit(12) === 1;

  const goTo = (a: number) => {
    setAddr(a);
    setText(hexStr(a, 4));
  };
  const push = (e: Omit<BusLog, "id">) => setLog((l) => [{ ...e, id: nextId.current++ }, ...l].slice(0, 4));

  const write = () => {
    let note = "";
    if (chip === "ram") {
      setRam((m) => ({ ...m, [addr]: val }));
      note = "RAM stores the byte";
    } else if (chip === "rom") note = "ROM ignores writes: its bits were fixed at the factory";
    else if (chip === "kbd") note = "the keyboard's mailboxes can only be read, so nothing happens";
    else if (chip === "screen") {
      const row = addr - 0xf100;
      setScreen((s) => s.map((r, i) => (i === row ? val : r)));
      note = `screen row ${row} changes: each 1 bit lights one LED`;
    } else note = "no chip is connected here, so the byte is lost";
    push({ op: "WRITE", addr, val, chip, note });
  };

  const read = () => {
    let v = 0xff;
    let note = "";
    if (chip === "ram") {
      v = ram[addr] ?? 0;
      note = "RAM sends back the stored byte";
    } else if (chip === "rom") {
      v = romByte(addr);
      note = "a byte of the start-up program";
    } else if (chip === "kbd") {
      if (addr === 0xf000) {
        v = kbd.data;
        setKbd((k) => ({ ...k, status: 0 }));
        note = "the key code; reading it sets the status back to 0";
      } else {
        v = kbd.status;
        note = v ? "1 = a new key is waiting" : "0 = no new key";
      }
    } else if (chip === "screen") {
      v = screen[addr - 0xf100];
      note = "the screen sends back what is in that row";
    } else note = "nobody drives the data wires; this toy reads 0xFF";
    push({ op: "READ", addr, val: v, chip, note });
  };

  const drawSmiley = () => {
    setScreen(SMILEY);
    push({ op: "WRITE", addr: 0xf100, val: SMILEY[0], chip: "screen", note: "8 writes, to 0xF100 … 0xF107: a smiley" });
  };

  // Decoder drawing coordinates
  const inY = [24, 52, 80, 108];
  const andOut = ioSel;

  return (
    <Widget
      wide
      title="The address map: one set of wires, four kinds of chip"
      subtitle="Pick an address and a byte, then press Write or Read, like a STORE or LOAD instruction. The decoder looks at the top address bits and wakes up exactly one chip."
    >
      <div className="space-y-6">
        {/* The 64 KB bar */}
        <div>
          <div className="label-caps mb-1 text-dim">The 64 KB address space, drawn to scale</div>
          <div className="relative pt-6">
            <div
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center transition-[left] duration-300"
              style={{ left: `${(addr / 0xffff) * 100}%` }}
            >
              <span className="font-mono text-xs font-bold text-ink">0x{hexStr(addr, 4)}</span>
              <span aria-hidden className="text-[0.6875rem] leading-none text-ink">
                ▼
              </span>
            </div>
            <div className="flex h-9 overflow-hidden rounded border border-line-2 font-sans text-sm font-semibold">
              <div className="flex items-center justify-center bg-cyan-tint text-cyan" style={{ width: "87.5%" }}>
                RAM
              </div>
              <div className="border-l border-line-2 bg-violet-tint" style={{ width: "6.25%" }} />
              <div className="border-l border-line-2 bg-amber-tint" style={{ width: "6.25%" }} />
            </div>
            <div className="mt-1 flex justify-between font-mono text-xs text-dim">
              <span>0x0000</span>
              <span>0x4000</span>
              <span>0x8000</span>
              <span>0xC000</span>
              <span>0xFFFF</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-sans text-xs text-mute">
            <span>
              <span className="font-semibold text-cyan">RAM</span> 0x0000–0xDFFF · 56 KB
            </span>
            <span>
              <span className="font-semibold text-violet">ROM</span> 0xE000–0xEFFF · start-up code
            </span>
            <span>
              <span className="font-semibold text-amber">I/O page</span> 0xF000–0xFFFF · the devices' mailboxes
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="grid gap-5 @2xl:grid-cols-2">
          <div>
            <label htmlFor={inputId} className="label-caps text-dim">
              Address
            </label>
            <div className="mt-1.5 flex items-center gap-1 font-mono text-lg">
              <span className="text-dim">0x</span>
              <input
                id={inputId}
                value={text}
                onChange={(e) => {
                  const t = e.target.value
                    .replace(/[^0-9a-fA-F]/g, "")
                    .slice(0, 4)
                    .toUpperCase();
                  setText(t);
                  if (t.length) setAddr(parseInt(t, 16));
                }}
                inputMode="text"
                spellCheck={false}
                className="w-24 rounded-md border border-line-2 bg-panel px-2 py-1 font-mono text-lg text-ink tabular-nums"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESETS.map(([a, l]) => (
                <Btn key={a} active={addr === a} onClick={() => goTo(a)} className="text-xs">
                  <span className="font-mono">{hexStr(a, 4)}</span>
                  <span className="font-normal text-mute">{l}</span>
                </Btn>
              ))}
            </div>
          </div>
          <div>
            <div className="label-caps text-dim">Data byte (for Write)</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {Array.from({ length: 8 }, (_, i) => 7 - i).map((b) => {
                const on = ((val >> b) & 1) === 1;
                return (
                  <button
                    key={b}
                    type="button"
                    aria-pressed={on}
                    aria-label={`bit ${b}`}
                    onClick={() => setVal((v) => v ^ (1 << b))}
                    className={cx(
                      "h-9 w-8 rounded-md font-mono text-base tabular-nums transition-colors pointer-coarse:h-11",
                      on
                        ? "border-[1.5px] border-on bg-on-tint font-bold text-on"
                        : "border border-line-2 bg-panel text-dim hover:border-off",
                      b === 4 && "mr-1.5",
                    )}
                  >
                    {on ? 1 : 0}
                  </button>
                );
              })}
              <span className="ml-2 font-mono text-sm text-mute">
                = 0x{hexStr(val)} = {val}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn variant="primary" onClick={write}>
                Write (store)
              </Btn>
              <Btn onClick={read}>Read (load)</Btn>
            </div>
          </div>
        </div>

        {/* The decoder */}
        <div className="grid items-start gap-5 @2xl:grid-cols-2">
          <div>
            <div className="label-caps text-dim">The 16 address wires</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[3, 2, 1, 0].map((g) => {
                const nib = (addr >> (g * 4)) & 0xf;
                return (
                  <div key={g} className="flex flex-col items-center">
                    <span
                      className={cx(
                        "rounded border px-2 py-0.5 text-base",
                        g === 3 ? "border-ink bg-panel-2" : "border-line bg-panel",
                      )}
                    >
                      <Bits value={nib} width={4} />
                    </span>
                    <span className={cx("mt-0.5 font-mono text-xs", g === 3 ? "font-semibold text-ink" : "text-dim")}>
                      A{g * 4 + 3}–A{g * 4}
                    </span>
                  </div>
                );
              })}
            </div>
            <svg viewBox="0 0 320 136" className="mt-3 w-full max-w-[26rem]" role="img" aria-label="Four-input AND gate">
              <CircuitDefs />
              {inY.map((y, i) => {
                const b = 15 - i;
                const on = bit(b) === 1;
                return (
                  <g key={b}>
                    <text x={6} y={y + 5} className="font-mono text-[13px]" fill="var(--color-mute)">
                      A{b}
                    </text>
                    <rect
                      x={44}
                      y={y - 11}
                      width={22}
                      height={22}
                      rx={4}
                      fill={on ? "var(--color-on-tint)" : "var(--color-panel)"}
                      stroke={on ? "var(--color-on)" : "var(--color-off)"}
                      strokeWidth={1.5}
                    />
                    <text
                      x={55}
                      y={y + 5}
                      textAnchor="middle"
                      className={cx("font-mono text-[13px]", on && "font-bold")}
                      fill={on ? "var(--color-on)" : "var(--color-dim)"}
                    >
                      {on ? 1 : 0}
                    </text>
                    <Wire d={`M66 ${y} H150`} on={on} />
                  </g>
                );
              })}
              <g
                stroke={andOut ? "var(--color-on)" : "var(--color-dim)"}
                fill={andOut ? "var(--color-on-tint)" : "var(--color-panel)"}
                strokeWidth={1.75}
                className={andOut ? "glow-on" : undefined}
              >
                <path d="M150 8 H190 A58 58 0 0 1 190 124 H150 Z" />
              </g>
              <text
                x={184}
                y={71}
                textAnchor="middle"
                className="font-mono text-[13px] font-bold"
                fill={andOut ? "var(--color-on)" : "var(--color-mute)"}
              >
                AND
              </text>
              <Wire d="M248 66 H282" on={andOut} />
              <circle
                cx={294}
                cy={66}
                r={11}
                fill={andOut ? "var(--color-on)" : "var(--color-panel)"}
                stroke={andOut ? "var(--color-on)" : "var(--color-off)"}
                strokeWidth={2}
              />
              <text
                x={294}
                y={71}
                textAnchor="middle"
                className="font-mono text-[13px] font-bold"
                fill={andOut ? "var(--color-bg)" : "var(--color-dim)"}
              >
                {andOut ? 1 : 0}
              </text>
              <text x={294} y={98} textAnchor="middle" className="font-sans text-[13px]" fill="var(--color-mute)">
                I/O
              </text>
              <text x={294} y={114} textAnchor="middle" className="font-sans text-[13px]" fill="var(--color-mute)">
                select
              </text>
            </svg>
          </div>
          <div className="space-y-2.5">
            <div className="label-caps text-dim">Chip-select wires (exactly one is 1)</div>
            <SignalLine on={ramSel} label="RAM select" formula="NOT (A15 AND A14 AND A13)" />
            <SignalLine on={romSel} label="ROM select" formula="A15 AND A14 AND A13 AND (NOT A12)" />
            <SignalLine on={ioSel} label="I/O select" formula="A15 AND A14 AND A13 AND A12" />
            <div className="ml-5 space-y-2 border-l border-line pl-3">
              <SignalLine on={chip === "kbd"} label="keyboard" formula="I/O, and the low bits say F000 or F001" />
              <SignalLine on={chip === "screen"} label="screen" formula="I/O, and the low bits say F100 … F107" />
            </div>
            {chip === "none" && (
              <p className="font-serif text-[0.9375rem] text-mute">
                This address is in the I/O page, but no device's mailbox is here. Real computers leave many gaps
                like this.
              </p>
            )}
          </div>
        </div>

        {/* The chips */}
        <div className="grid gap-3 @lg:grid-cols-2 @4xl:grid-cols-4">
          <ChipCard chip="ram" active={chip === "ram"}>
            <p>57,344 bytes you can read and write.</p>
            {chip === "ram" && (
              <p className="font-mono text-ink">
                RAM[0x{hexStr(addr, 4)}] = 0x{hexStr(ram[addr] ?? 0)}
              </p>
            )}
          </ChipCard>
          <ChipCard chip="rom" active={chip === "rom"}>
            <p>4,096 bytes of start-up code, fixed when the chip was made.</p>
            {chip === "rom" && <p className="font-mono text-ink">ROM[0x{hexStr(addr, 4)}] = 0x{hexStr(romByte(addr))}</p>}
          </ChipCard>
          <ChipCard chip="kbd" active={chip === "kbd"}>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
              <div className={cx("rounded border px-1.5 py-1", addr === 0xf000 ? "border-ink" : "border-line")}>
                <div className="text-dim">F000 data</div>
                <div className="text-sm text-ink">0x{hexStr(kbd.data)}</div>
              </div>
              <div className={cx("rounded border px-1.5 py-1", addr === 0xf001 ? "border-ink" : "border-line")}>
                <div className="text-dim">F001 status</div>
                <div className={cx("text-sm", kbd.status ? "font-bold text-on" : "text-dim")}>{kbd.status}</div>
              </div>
            </div>
            <div className="text-xs">Press a key (it sends the key's position code):</div>
            <div className="flex flex-wrap gap-1">
              {TOY_KEYS.map(([k, code]) => (
                <Btn
                  key={k}
                  className="min-w-9 px-2 text-xs"
                  title={`key code 0x${hexStr(code)}`}
                  onClick={() => setKbd({ data: code, status: 1 })}
                >
                  {k}
                </Btn>
              ))}
            </div>
          </ChipCard>
          <ChipCard chip="screen" active={chip === "screen"}>
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-[3px] pt-[5px] font-mono text-[0.6875rem] leading-[14px] text-dim">
                {screen.map((_, r) => (
                  <span key={r} className={cx(addr === 0xf100 + r && "font-bold text-ink")}>
                    F10{r}
                  </span>
                ))}
              </div>
              <div className="surface-screen rounded-md p-[5px]" role="img" aria-label="8 by 8 LED panel">
                <div className="grid grid-cols-8 gap-[3px]">
                  {screen.flatMap((row, r) =>
                    Array.from({ length: 8 }, (_, c) => {
                      const on = ((row >> (7 - c)) & 1) === 1;
                      return (
                        <span
                          key={`${r}-${c}`}
                          className="block h-[14px] w-[14px] rounded-full transition-colors"
                          style={{ background: on ? "var(--color-sub-r)" : "var(--color-screen-2)" }}
                        />
                      );
                    }),
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <Btn className="px-2 text-xs" onClick={drawSmiley}>
                Draw a smiley
              </Btn>
              <Btn className="px-2 text-xs" onClick={() => setScreen(Array(8).fill(0))}>
                Clear
              </Btn>
            </div>
          </ChipCard>
        </div>

        {/* Bus log */}
        <div>
          <div className="label-caps text-dim">What happened on the bus</div>
          {log.length === 0 ? (
            <p className="mt-1 font-serif text-[0.9375rem] text-mute">
              Nothing yet. Press <strong className="text-ink">Write</strong> to store 0x3C at 0xF102: row 2 of the LED
              screen lights up, because that address leads to the screen, not to RAM.
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1.5" aria-live="polite">
              {log.map((e, i) => (
                <li
                  key={e.id}
                  className={cx(
                    "flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 rounded px-2 py-1 text-sm",
                    i === 0 ? "bg-panel-2 text-ink" : "text-mute",
                  )}
                >
                  <span className="font-mono font-semibold">
                    {e.op === "WRITE"
                      ? `WRITE 0x${hexStr(e.val)} → 0x${hexStr(e.addr, 4)}`
                      : `READ 0x${hexStr(e.addr, 4)} → 0x${hexStr(e.val)}`}
                  </span>
                  <span className={cx("font-sans text-xs font-semibold", CHIPS[e.chip].text)}>{CHIPS[e.chip].name}</span>
                  <span className="font-serif text-[0.9375rem]">{e.note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Polling vs interrupts                                             */
/* ------------------------------------------------------------------ */

function keyTimes(seed: number): number[] {
  const r = rng(seed);
  const out: number[] = [];
  let guard = 0;
  while (out.length < 5 && guard++ < 500) {
    const t = 0.04 + r() * 0.92;
    if (out.every((u) => Math.abs(u - t) > 0.07)) out.push(t);
  }
  return out.sort((a, b) => a - b);
}

const SWEEP_SECONDS = 4;

export function PollVsInterrupt() {
  const [mode, setMode] = useState<"poll" | "irq">("poll");
  const [rate, setRate] = useState(1000);
  const [seed, setSeed] = useState(3);
  const [play, setPlay] = useState(true);
  const reduced = useReducedMotion();
  const mounted = useMounted();
  const t = useAnimationTime(mounted && !reduced && play);
  // Simulated time 0..1 s. Before the animation starts (or with reduced motion) show the whole second.
  const s = t === 0 ? 1 : Math.min(1, (t / SWEEP_SECONDS) % 1.15);

  const keys = useMemo(() => keyTimes(seed), [seed]);
  const found = keys.map((k) => Math.ceil(k * rate - 1e-9) / rate);

  const pressed = keys.filter((k) => k <= s).length;
  const checks = Math.min(rate, Math.floor(s * rate + 1e-9));
  const usefulSet = new Set(found.filter((f) => f <= s + 1e-9).map((f) => Math.round(f * rate)));
  const useful = usefulSet.size;
  const wasted = checks - useful;
  const waits = keys.map((k, i) => (found[i] <= s + 1e-9 ? (found[i] - k) * 1000 : null)).filter((w) => w !== null);
  const longest = waits.length ? Math.max(...waits) : 0;

  const x0 = 112;
  const x1 = 584;
  const X = (u: number) => x0 + u * (x1 - x0);

  let wastedPath = "";
  let futurePath = "";
  if (mode === "poll") {
    for (let i = 1; i <= rate; i++) {
      if (usefulSet.has(i)) continue;
      const x = X(i / rate).toFixed(2);
      if (i / rate <= s + 1e-9) wastedPath += `M${x} 72V94`;
      else futurePath += `M${x} 72V94`;
    }
  }

  return (
    <Widget
      title="Asking again and again, or being told"
      subtitle="Five key presses arrive at random moments during one second. With polling, the CPU keeps reading the keyboard's status mailbox. With interrupts, the keyboard pulls a wire when it has something."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "poll", label: "Polling" },
            { value: "irq", label: "Interrupts" },
          ]}
        />
        {mode === "poll" && (
          <Segmented
            size="sm"
            value={rate}
            onChange={setRate}
            options={[
              { value: 10, label: "10 checks/s" },
              { value: 100, label: "100/s" },
              { value: 1000, label: "1,000/s" },
            ]}
          />
        )}
        <div className="ml-auto flex gap-2">
          <Btn onClick={() => setSeed((v) => v + 1)}>New typing</Btn>
          {!reduced && <Btn onClick={() => setPlay((p) => !p)}>{play ? "Pause" : "Play"}</Btn>}
        </div>
      </div>

      <div className="scroll-thin mt-4 overflow-x-auto">
        <svg viewBox="0 0 600 150" className="w-full min-w-[520px]" role="img" aria-label="Timeline of one second">
          <text x={6} y={40} className="font-sans text-[13px]" fill="var(--color-mute)">
            key presses
          </text>
          {keys.map((k, i) => {
            const done = k <= s;
            return (
              <rect
                key={i}
                x={X(k) - 7}
                y={26}
                width={14}
                height={16}
                rx={3}
                fill={done ? "var(--color-amber-tint)" : "var(--color-panel)"}
                stroke={done ? "var(--color-amber)" : "var(--color-line-2)"}
                strokeWidth={1.5}
              />
            );
          })}
          <text x={6} y={88} className="font-sans text-[13px]" fill="var(--color-mute)">
            {mode === "poll" ? "CPU checks" : "interrupt wire"}
          </text>
          {mode === "poll" ? (
            <>
              <path d={futurePath} stroke="var(--color-line)" strokeWidth={1} />
              <path d={wastedPath} stroke="var(--color-off)" strokeWidth={1} />
              {[...usefulSet].map((i) => (
                <line
                  key={i}
                  x1={X(i / rate)}
                  x2={X(i / rate)}
                  y1={60}
                  y2={98}
                  stroke="var(--color-on)"
                  strokeWidth={3}
                  className="glow-on"
                />
              ))}
            </>
          ) : (
            <>
              <path d={`M${x0} 94 H${x1}`} stroke="var(--color-off)" strokeWidth={1.5} fill="none" />
              {keys.map((k, i) => {
                const done = k <= s;
                const x = X(k);
                return (
                  <path
                    key={i}
                    d={`M${x - 4} 94 V66 H${x + 4} V94`}
                    fill="none"
                    stroke={done ? "var(--color-on)" : "var(--color-line-2)"}
                    strokeWidth={done ? 2.5 : 1.5}
                    className={done ? "glow-on" : undefined}
                  />
                );
              })}
            </>
          )}
          <path d={`M${x0} 116 H${x1}`} stroke="var(--color-line-2)" strokeWidth={1} />
          {[0, 0.25, 0.5, 0.75, 1].map((u) => (
            <g key={u}>
              <path d={`M${X(u)} 112 V120`} stroke="var(--color-line-2)" />
              <text x={X(u)} y={138} textAnchor="middle" className="font-mono text-[13px]" fill="var(--color-dim)">
                {u === 0 ? "0" : u === 1 ? "1 s" : `${u}`}
              </text>
            </g>
          ))}
          {s < 1 && <path d={`M${X(s)} 18 V116`} stroke="var(--color-ink)" strokeWidth={1.25} strokeDasharray="3 3" />}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 @xl:grid-cols-4">
        <Stat label="Keys pressed" value={pressed} tone="amber" />
        {mode === "poll" ? (
          <>
            <Stat label="Checks made" value={fmt(checks)} />
            <Stat label="Wasted checks" value={fmt(wasted)} tone="pink" sub={checks ? `${fmt((wasted / checks) * 100, 1)}%` : ""} />
            <Stat label="Longest wait" value={`${fmt(longest, longest < 10 ? 1 : 0)} ms`} />
          </>
        ) : (
          <>
            <Stat label="Interrupts" value={pressed} tone="on" />
            <Stat label="Wasted checks" value="0" tone="pink" />
            <Stat label="Longest wait" value="µs" sub="a few millionths of a second" />
          </>
        )}
      </div>
      <p className="mt-3 font-serif text-[0.9375rem] text-mute">
        {mode === "poll"
          ? rate === 10
            ? "Only 10 checks a second wastes little, but a key may wait up to 100 ms (a tenth of a second) before anyone notices it. You would feel that delay."
            : `Green lines are checks that found a key. Every grey line is a check that found nothing${rate === 1000 ? " (at 1,000 a second they blur into a grey band)" : ""}. Faster checking means shorter waits, but more waste.`
          : "No checks at all. Each green pulse is the keyboard pulling the interrupt wire. The CPU stops what it is doing, runs the keyboard's handler, and goes back to work."}
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 3. The optical mouse                                                 */
/* ------------------------------------------------------------------ */

const DESK = 40;
const FRAME = 16;
const BASE = 12;

function makeDesk(): number[] {
  const r = rng(11);
  let a = Array.from({ length: DESK * DESK }, () => r());
  for (let pass = 0; pass < 2; pass++) {
    const b = new Array<number>(DESK * DESK).fill(0);
    for (let y = 0; y < DESK; y++)
      for (let x = 0; x < DESK; x++) {
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= DESK || yy >= DESK) continue;
            sum += a[yy * DESK + xx];
            n++;
          }
        b[y * DESK + x] = sum / n;
      }
    a = b;
  }
  const lo = Math.min(...a);
  const hi = Math.max(...a);
  return a.map((v) => Math.round(30 + ((v - lo) / (hi - lo)) * 200));
}

function deskFrame(desk: number[], ox: number, oy: number): number[] {
  const f: number[] = [];
  for (let y = 0; y < FRAME; y++) for (let x = 0; x < FRAME; x++) f.push(desk[(oy + y) * DESK + ox + x]);
  return f;
}

function greyImg(f: number[]): Img {
  const data = new Uint8ClampedArray(FRAME * FRAME * 4);
  f.forEach((v, i) => {
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  });
  return { w: FRAME, h: FRAME, data };
}

const SHIFTS = [-3, -2, -1, 0, 1, 2, 3];

export function MouseSensor() {
  const desk = useMemo(makeDesk, []);
  const [dx, setDx] = useState(-3);
  const [dy, setDy] = useState(1);
  const [left, setLeft] = useState(false);
  const f1 = useMemo(() => deskFrame(desk, BASE, BASE), [desk]);
  const f2 = useMemo(() => deskFrame(desk, BASE + dx, BASE + dy), [desk, dx, dy]);
  const img1 = useMemo(() => greyImg(f1), [f1]);
  const img2 = useMemo(() => greyImg(f2), [f2]);

  // The chip's search: for every possible shift (u, v), how different are the pictures?
  const scores = useMemo(() => {
    const out: number[][] = [];
    for (const v of SHIFTS) {
      const row: number[] = [];
      for (const u of SHIFTS) {
        let sum = 0;
        let n = 0;
        for (let y = 0; y < FRAME; y++)
          for (let x = 0; x < FRAME; x++) {
            const yy = y + v;
            const xx = x + u;
            if (yy < 0 || xx < 0 || yy >= FRAME || xx >= FRAME) continue;
            sum += Math.abs(f2[y * FRAME + x] - f1[yy * FRAME + xx]);
            n++;
          }
        row.push(sum / n);
      }
      out.push(row);
    }
    return out;
  }, [f1, f2]);
  const flat = scores.flat();
  const lo = Math.min(...flat);
  const hi = Math.max(...flat);
  const bestIdx = flat.indexOf(lo);
  const bu = SHIFTS[bestIdx % 7];
  const bv = SHIFTS[Math.floor(bestIdx / 7)];

  const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");
  const px = clamp(1000 + bu * 2, 0, 1919);
  const py = clamp(500 + bv * 2, 0, 1079);

  const pad = (label: string, title: string, on: () => void, disabled: boolean) => (
    <Btn className="w-10 px-0" title={title} onClick={on} disabled={disabled}>
      {label}
    </Btn>
  );

  return (
    <Widget
      wide
      title="Inside an optical mouse: a camera that compares pictures"
      subtitle="The mouse's camera photographs the desk, then photographs it again 1 ms later. Move the mouse with the arrows. The chip tries every small shift and keeps the one where the two pictures match best."
    >
      <div className="grid gap-6 @3xl:grid-cols-[auto_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-32 @lg:w-36">
              <div className="label-caps mb-1 text-dim">Picture 1</div>
              <PixelCanvas img={img1} grid className="w-full rounded-sm border border-line-2" ariaLabel="first desk picture" />
            </div>
            <div className="w-32 @lg:w-36">
              <div className="label-caps mb-1 text-dim">1 ms later</div>
              <PixelCanvas img={img2} grid className="w-full rounded-sm border border-line-2" ariaLabel="second desk picture" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="grid grid-cols-3 gap-1">
              <span />
              {pad("↑", "move away from you", () => setDy((v) => v - 1), dy <= -3)}
              <span />
              {pad("←", "move left", () => setDx((v) => v - 1), dx <= -3)}
              <Btn className="w-10 px-0 text-xs" title="no movement" onClick={() => (setDx(0), setDy(0))}>
                0
              </Btn>
              {pad("→", "move right", () => setDx((v) => v + 1), dx >= 3)}
              <span />
              {pad("↓", "move toward you", () => setDy((v) => v + 1), dy >= 3)}
              <span />
            </div>
            <div className="space-y-2 font-sans text-sm text-mute">
              <div>
                Real move: <span className="font-mono text-ink">dx {signed(dx)}, dy {signed(dy)}</span>
              </div>
              <Btn active={left} onClick={() => setLeft((v) => !v)}>
                Left button {left ? "held" : "up"}
              </Btn>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-6 @xl:grid-cols-[auto_minmax(0,1fr)]">
          <div>
            <div className="label-caps mb-1 text-dim">Difference for each guess (small = match)</div>
            <div className="inline-grid grid-cols-[2rem_repeat(7,2.1rem)] gap-px font-mono text-xs tabular-nums">
              <span className="self-end pb-0.5 text-center text-[0.6875rem] text-dim">dy\dx</span>
              {SHIFTS.map((u) => (
                <span key={u} className="text-center text-dim">
                  {signed(u)}
                </span>
              ))}
              {scores.map((row, j) => (
                <div key={j} className="contents">
                  <span className="self-center text-center text-dim">{signed(SHIFTS[j])}</span>
                  {row.map((sc, i) => {
                    const q = hi > lo ? (sc - lo) / (hi - lo) : 1;
                    const best = j * 7 + i === bestIdx;
                    return (
                      <span
                        key={i}
                        className={cx(
                          "grid h-8 place-items-center rounded-[3px] text-ink",
                          best ? "border-2 border-ink font-bold" : "border border-transparent",
                        )}
                        style={{
                          background: `color-mix(in oklab, var(--color-cyan) ${Math.round((1 - q) * 32)}%, var(--color-panel-2))`,
                        }}
                        title={`dx ${signed(SHIFTS[i])}, dy ${signed(SHIFTS[j])}`}
                      >
                        {best ? "✓" : Math.round(sc)}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="mt-1.5 font-sans text-sm text-ink">
              Best match: dx = {signed(bu)}, dy = {signed(bv)} {bu === dx && bv === dy ? "✓" : ""}
            </p>
          </div>

          <div className="min-w-0 space-y-2">
            <div className="label-caps text-dim">The 3-byte report sent over USB</div>
            {[
              { name: "buttons", v: left ? 1 : 0, note: left ? "bit 0 = left button down" : "no buttons down" },
              { name: "dx", v: bu & 0xff, note: `${signed(bu)} as a signed byte` },
              { name: "dy", v: bv & 0xff, note: `${signed(bv)} as a signed byte` },
            ].map((r, i) => (
              <div key={r.name} className="flex flex-wrap items-baseline gap-x-3 rounded border border-line bg-panel px-2.5 py-1.5">
                <span className="w-16 font-sans text-xs text-dim">
                  byte {i} · {r.name}
                </span>
                <Bits value={r.v} width={8} className="text-base" />
                <span className="font-mono text-xs text-mute">0x{hexStr(r.v)}</span>
                <span className="font-sans text-xs text-mute">{r.note}</span>
              </div>
            ))}
            <p className="font-serif text-[0.9375rem] text-mute">
              The operating system moves the pointer (speed 2, starting at 1000, 500):{" "}
              <span className="font-mono text-ink">
                x = {px}, y = {py}
              </span>
              . A negative dx means left; a positive dy means toward you, so the pointer goes down.
            </p>
          </div>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 4. The touch grid                                                    */
/* ------------------------------------------------------------------ */

const TN = 8;
const T0 = 40;
const TG = 40;
const tx = (i: number) => T0 + i * TG;

function touchSignals(fx: number, fy: number): number[][] {
  const out: number[][] = [];
  for (let j = 0; j < TN; j++) {
    const row: number[] = [];
    for (let i = 0; i < TN; i++) {
      const d2 = (i - fx) ** 2 + (j - fy) ** 2;
      const v = Math.round(50 * Math.exp(-d2 / (2 * 0.6 * 0.6)));
      row.push(v < 3 ? 0 : v);
    }
    out.push(row);
  }
  return out;
}

function centroidTex(name: string, sums: number[]): { tex: string; value: number | null } {
  const terms = sums.map((s, i) => [i, s] as const).filter(([, s]) => s > 0);
  const total = terms.reduce((a, [, s]) => a + s, 0);
  if (!total) return { tex: `${name} = \\text{no touch}`, value: null };
  const top = terms.reduce((a, [i, s]) => a + i * s, 0);
  const value = top / total;
  const num = terms.map(([i, s]) => `${i}\\cdot${s}`).join(" + ");
  const den = terms.map(([, s]) => `${s}`).join(" + ");
  return {
    tex: `${name} = \\frac{${num}}{${den}} = \\frac{${top}}{${total}} = ${value.toFixed(2)}`,
    value,
  };
}

export function TouchGrid() {
  const [finger, setFinger] = useState<[number, number]>([5.2, 3.35]);
  const [drag, setDrag] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const sig = useMemo(() => touchSignals(finger[0], finger[1]), [finger]);
  const colSums = Array.from({ length: TN }, (_, i) => sig.reduce((a, row) => a + row[i], 0));
  const rowSums = sig.map((row) => row.reduce((a, b) => a + b, 0));
  const maxSum = Math.max(1, ...colSums, ...rowSums);
  const cx_ = centroidTex("x", colSums);
  const cy_ = centroidTex("y", rowSums);

  const toGrid = (e: ReactPointerEvent<SVGSVGElement>): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    const ux = ((e.clientX - r.left) / r.width) * 400;
    const uy = ((e.clientY - r.top) / r.height) * 420;
    return [clamp((ux - T0) / TG, -0.3, 7.3), clamp((uy - T0) / TG, -0.3, 7.3)];
  };
  const onKey = (e: ReactKeyboardEvent<SVGSVGElement>) => {
    const step = e.shiftKey ? 0.5 : 0.1;
    const m: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const d = m[e.key];
    if (!d) return;
    e.preventDefault();
    setFinger(([x, y]) => [clamp(x + d[0], -0.3, 7.3), clamp(y + d[1], -0.3, 7.3)]);
  };

  const fxp = tx(finger[0]);
  const fyp = tx(finger[1]);

  return (
    <Widget
      wide
      title="Finding a finger between the wires"
      subtitle="Drag the finger (or focus the grid and use the arrow keys). Each crossing of a row wire and a column wire measures how much charge the finger steals. The chip adds up each column and each row, then takes a weighted average."
    >
      <div className="grid items-start gap-6 @3xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
        <svg
          ref={svgRef}
          viewBox="0 0 400 420"
          className="w-full cursor-grab touch-none rounded-md border border-line bg-panel-2 select-none focus-visible:outline-2 focus-visible:outline-focus active:cursor-grabbing"
          role="slider"
          aria-label="Finger position on the touch grid"
          aria-valuetext={`finger at column ${finger[0].toFixed(1)}, row ${finger[1].toFixed(1)}`}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDrag(true);
            setFinger(toGrid(e));
          }}
          onPointerMove={(e) => drag && setFinger(toGrid(e))}
          onPointerUp={() => setDrag(false)}
          onPointerCancel={() => setDrag(false)}
        >
          {Array.from({ length: TN }, (_, i) => (
            <g key={i}>
              <path d={`M${tx(i)} 22 V318`} stroke="var(--color-line-2)" strokeWidth={2} />
              <path d={`M22 ${tx(i)} H318`} stroke="var(--color-line-2)" strokeWidth={2} />
              <text x={tx(i)} y={16} textAnchor="middle" className="font-mono text-[14px]" fill="var(--color-dim)">
                {i}
              </text>
              <text x={9} y={tx(i) + 5} textAnchor="middle" className="font-mono text-[14px]" fill="var(--color-dim)">
                {i}
              </text>
            </g>
          ))}
          <circle
            cx={fxp}
            cy={fyp}
            r={36}
            fill="var(--color-amber)"
            fillOpacity={0.13}
            stroke="var(--color-amber)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          {sig.map((row, j) =>
            row.map((v, i) =>
              v > 0 ? (
                <circle
                  key={`${i}-${j}`}
                  cx={tx(i)}
                  cy={tx(j)}
                  r={3 + 12 * Math.sqrt(v / 50)}
                  fill="var(--color-cyan-tint)"
                  stroke="var(--color-cyan)"
                  strokeWidth={1.5}
                />
              ) : (
                <circle key={`${i}-${j}`} cx={tx(i)} cy={tx(j)} r={2.5} fill="var(--color-off)" />
              ),
            ),
          )}
          {cx_.value !== null && cy_.value !== null && (
            <g stroke="var(--color-ink)" strokeWidth={1.75} fill="none">
              <path d={`M${tx(cx_.value) - 16} ${tx(cy_.value)} h32 M${tx(cx_.value)} ${tx(cy_.value) - 16} v32`} />
              <circle cx={tx(cx_.value)} cy={tx(cy_.value)} r={6} />
            </g>
          )}
          {/* column totals */}
          {colSums.map((s, i) => {
            const h = (s / maxSum) * 42;
            return (
              <g key={`c${i}`}>
                <rect x={tx(i) - 9} y={408 - h} width={18} height={h} fill="var(--color-cyan-tint)" stroke="var(--color-cyan)" />
                {s > 0 && (
                  <text x={tx(i)} y={404 - h} textAnchor="middle" className="font-mono text-[13px]" fill="var(--color-ink)">
                    {s}
                  </text>
                )}
              </g>
            );
          })}
          <path d="M22 408.5 H318" stroke="var(--color-line-2)" />
          {/* row totals */}
          {rowSums.map((s, j) => {
            const w = (s / maxSum) * 28;
            return (
              <g key={`r${j}`}>
                <rect x={334} y={tx(j) - 9} width={w} height={18} fill="var(--color-cyan-tint)" stroke="var(--color-cyan)" />
                {s > 0 && (
                  <text x={338 + w} y={tx(j) + 5} className="font-mono text-[13px]" fill="var(--color-ink)">
                    {s}
                  </text>
                )}
              </g>
            );
          })}
          <path d="M333.5 22 V318" stroke="var(--color-line-2)" />
        </svg>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-sans text-sm">
            <span className="flex items-center gap-2 text-mute">
              <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full border border-dashed border-amber" />
              real finger (the chip cannot see this)
            </span>
            <span className="flex items-center gap-2 text-mute">
              <span aria-hidden className="font-mono text-base leading-none text-ink">⊕</span>
              where the chip says it is
            </span>
          </div>
          <div>
            <div className="label-caps mb-1 text-dim">Across: the column totals (bottom bars)</div>
            <div className="scroll-thin overflow-x-auto">
              <TeX block>{cx_.tex}</TeX>
            </div>
          </div>
          <div>
            <div className="label-caps mb-1 text-dim">Down: the row totals (bars on the right)</div>
            <div className="scroll-thin overflow-x-auto">
              <TeX block>{cy_.tex}</TeX>
            </div>
          </div>
          {cx_.value !== null && cy_.value !== null && (
            <p className="font-serif text-[0.9375rem] text-mute">
              The real finger is at {finger[0].toFixed(2)}, {finger[1].toFixed(2)} (in wire spacings). The chip's
              answer is off by only{" "}
              {Math.hypot(cx_.value - finger[0], cy_.value - finger[1]).toFixed(2)} of a spacing. With wires 4 mm
              apart, the finger is{" "}
              <span className="font-mono text-ink">
                {(cx_.value * 4).toFixed(1)} mm, {(cy_.value * 4).toFixed(1)} mm
              </span>{" "}
              from the corner, much finer than the 4 mm grid.
            </p>
          )}
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Be the monitor: a slow-motion cable                               */
/* ------------------------------------------------------------------ */

/** Toy timing: 16 × 9 visible pixels inside 20 × 11 ticks (like 1920 × 1080 inside 2200 × 1125). */
const MW = 16;
const MH = 9;
const HT = 20;
const VT = 11;
const HS_START = 17;
const HS_END = 19;

const SKY: RGB = [44, 78, 150];
const GROUND: RGB = [58, 140, 76];
const SUN: RGB = [250, 204, 70];
const LETTER: RGB = [242, 238, 228];
const HOUSE: RGB = [206, 68, 54];
const A_ROWS = [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X"];

function toyPixel(x: number, y: number): RGB {
  if (y >= 7) return GROUND;
  const ax = x - 2;
  const ay = y - 1;
  if (ax >= 0 && ax < 5 && ay >= 0 && ay < 6 && A_ROWS[ay][ax] === "X") return LETTER;
  if (x >= 12 && x <= 13 && y >= 1 && y <= 2) return SUN;
  if (x >= 9 && x <= 10 && y >= 5 && y <= 6) return HOUSE;
  return SKY;
}
const PIC: RGB[] = Array.from({ length: MW * MH }, (_, i) => toyPixel(i % MW, Math.floor(i / MW)));

type Tok = {
  n: number;
  tx: number;
  ty: number;
  c: RGB | null;
  hs: boolean;
  vs: boolean;
  missed: boolean;
  /** where the monitor put it (−1 if missed) */
  px: number;
  py: number;
};
type Mon = {
  T: number;
  rx: number;
  ry: number;
  phs: boolean;
  pvs: boolean;
  screen: RGB[];
  hist: Tok[];
  drop: null | "sync" | "nosync";
};

const initMon = (): Mon => ({ T: 0, rx: 0, ry: 0, phs: false, pvs: false, screen: PIC.slice(), hist: [], drop: null });

/** Send k ticks down the cable. The monitor only counts; with sync on, the sync pulses reset its counters. */
function advance(m: Mon, k: number, sync: boolean, missFirst = false): Mon {
  let { T, rx, ry, phs, pvs, drop } = m;
  const screen = m.screen.slice();
  const hist = m.hist.slice();
  for (let s = 0; s < k; s++) {
    const tx = T % HT;
    const ty = Math.floor(T / HT) % VT;
    const c = tx < MW && ty < MH ? PIC[ty * MW + tx] : null;
    const hs = tx >= HS_START && tx < HS_END;
    const vs = ty === VT - 1;
    const missed = missFirst && s === 0;
    let px = -1;
    let py = -1;
    if (missed) {
      drop = sync ? "sync" : "nosync";
    } else {
      if (sync) {
        if (hs && !phs) rx = HS_START; // "H-sync starts at x = 17": that's the agreement
        if (vs && !pvs) ry = VT - 1; // "V-sync is row 10"
      }
      phs = hs;
      pvs = vs;
      px = rx;
      py = ry;
      if (rx < MW && ry < MH) screen[ry * MW + rx] = c ?? [0, 0, 0];
      rx++;
      if (rx >= HT) {
        rx = 0;
        ry = (ry + 1) % VT;
      }
    }
    hist.push({ n: T, tx, ty, c, hs, vs, missed, px, py });
    T++;
  }
  return { T, rx, ry, phs, pvs, screen, hist: hist.slice(-24), drop };
}

const SPEEDS = {
  slow: { ms: 450, k: 1 },
  medium: { ms: 90, k: 1 },
  fast: { ms: 60, k: 10 },
} as const;
type Speed = keyof typeof SPEEDS;

const HATCH_SCREEN = "repeating-linear-gradient(135deg, var(--color-screen-dim) 0 1px, transparent 1px 5px)";

function Wave({ y, hi, cells, x0, w }: { y: number; hi: boolean[]; cells: number; x0: number; w: number }) {
  const off = cells - hi.length;
  let d = "";
  hi.forEach((h, i) => {
    const x = x0 + (off + i) * w;
    const yy = h ? y : y + 16;
    d += `${i === 0 ? "M" : "L"}${x} ${yy} H${x + w} `;
  });
  return d ? <path d={d} fill="none" stroke="var(--color-on)" strokeWidth={2} /> : null;
}

export function BeTheMonitor() {
  const [mon, setMon] = useState<Mon>(initMon);
  const [sync, setSync] = useState(true);
  const [speed, setSpeed] = useState<Speed>("medium");
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(true);
  }, []);
  useInterval(() => setMon((m) => advance(m, SPEEDS[speed].k, sync)), playing ? SPEEDS[speed].ms : null);

  const last = mon.hist[mon.hist.length - 1];
  const sentVisible = last && last.c !== null;
  const painted = last && !last.missed && last.px < MW && last.py < MH && last.px >= 0;

  const cellW = 21;
  const x0 = 88;
  const cells = 24;
  const off = cells - mon.hist.length;

  return (
    <Widget
      wide
      title="Be the monitor: colours arrive in order, and it counts"
      subtitle="A toy screen of 16 × 9 pixels, with the same kind of timing as a real 1080p monitor: each row has 4 extra blank ticks and each frame 2 extra blank rows. Watch the counters, then press “Drop one tick”."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </Btn>
        <Btn onClick={() => setMon((m) => advance(m, 1, sync))}>+1 tick</Btn>
        <Segmented
          size="sm"
          value={speed}
          onChange={setSpeed}
          options={[
            { value: "slow", label: "slow" },
            { value: "medium", label: "medium" },
            { value: "fast", label: "fast" },
          ]}
        />
        <Btn onClick={() => setMon((m) => advance(m, 1, sync, true))}>Drop one tick</Btn>
        <Segmented
          size="sm"
          value={sync ? "on" : "off"}
          onChange={(v) => setSync(v === "on")}
          options={[
            { value: "on", label: "sync wires on" },
            { value: "off", label: "sync off" },
          ]}
        />
        <Btn variant="ghost" onClick={() => setMon(initMon())}>
          Reset
        </Btn>
      </div>

      <div className="mt-5 grid gap-6 @3xl:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="space-y-5">
          <div>
            <div className="label-caps mb-1.5 text-dim">In the computer: the framebuffer</div>
            <div className="grid w-full max-w-[15rem] grid-cols-16 gap-px rounded-sm border border-line-2 bg-line-2">
              {PIC.map((c, i) => {
                const here = last && last.c !== null && last.tx === i % MW && last.ty === Math.floor(i / MW);
                return (
                  <span
                    key={i}
                    className="relative block aspect-square"
                    style={{
                      background: rgb(c),
                      outline: here ? "2px solid var(--color-ink)" : undefined,
                      outlineOffset: here ? 0 : undefined,
                      zIndex: here ? 1 : undefined,
                    }}
                  />
                );
              })}
            </div>
            <p className="mt-1 font-sans text-xs text-mute">
              The display engine reads these, row by row, and sends them in order.
            </p>
          </div>

          <div className="rounded-md border border-line bg-panel-2 p-3">
            <div className="label-caps mb-2 text-dim">On the cable, this tick</div>
            <div className="flex items-center justify-between gap-2 font-mono text-sm">
              <span className="text-mute">tick n</span>
              <span className="text-lg font-semibold text-ink tabular-nums">{last ? fmt(last.n) : "–"}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 font-mono text-sm">
              {last && last.c ? (
                <>
                  <span
                    aria-hidden
                    className="inline-block h-6 w-6 shrink-0 rounded-sm border border-line-2"
                    style={{ background: rgb(last.c) }}
                  />
                  <span className="text-ink">
                    <span className="text-red">{last.c[0]}</span>, <span className="text-on">{last.c[1]}</span>,{" "}
                    <span className="text-cyan">{last.c[2]}</span>
                  </span>
                </>
              ) : (
                <span className="font-sans text-mute">{last ? "blank margin: no picture data" : "nothing sent yet"}</span>
              )}
            </div>
            <div className="mt-2 space-y-1">
              <SignalLine on={!!last?.hs} label="H-sync" />
              <SignalLine on={!!last?.vs} label="V-sync" />
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <div className="label-caps mb-1.5 text-dim">The monitor</div>
            <div className="surface-screen max-w-[34rem] rounded-lg p-2.5">
              <div className="grid grid-cols-20 gap-px">
                {Array.from({ length: HT * VT }, (_, i) => {
                  const x = i % HT;
                  const y = Math.floor(i / HT);
                  const vis = x < MW && y < MH;
                  const here = last && !last.missed && last.px === x && last.py === y;
                  return (
                    <span
                      key={i}
                      className="relative block aspect-square"
                      style={{
                        background: vis ? rgb(mon.screen[y * MW + x]) : HATCH_SCREEN,
                        outline: here ? "2px solid var(--color-amber)" : undefined,
                        zIndex: here ? 1 : undefined,
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-1.5 font-sans text-xs text-mute">
                16 × 9 visible pixels · striped = blank margin, never shown
              </div>
            </div>
          </div>
          <div className="rounded-md border border-line bg-panel p-3 font-sans text-sm text-mute">
            <div className="label-caps mb-1.5 text-dim">The monitor's whole “brain”</div>
            {last && !last.missed ? (
              <p className="text-ink">
                Counters: <span className="font-mono font-semibold">x = {last.px}</span>,{" "}
                <span className="font-mono font-semibold">y = {last.py}</span> →{" "}
                {painted ? (
                  <>
                    x &lt; 16 and y &lt; 9, so paint pixel ({last.px}, {last.py}) ✓
                  </>
                ) : (
                  <>in the blank margin: nothing to paint</>
                )}
              </p>
            ) : (
              <p className="font-semibold text-pink">{last ? "✗ This tick was missed. The counters did not move." : "Waiting for the first tick."}</p>
            )}
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              <li>After each tick: x + 1. When x reaches 20: x = 0 and y + 1. When y reaches 11: y = 0.</li>
              <li>{sync ? "When H-sync starts: x = 17. When V-sync starts: y = 10. (An agreed rule.)" : "Sync is off: it only counts, and never checks."}</li>
            </ul>
            {last && sentVisible && !last.missed && (last.px !== last.tx || last.py !== last.ty) && (
              <p className="mt-1.5 font-semibold text-pink">
                ✗ The computer sent pixel ({last.tx}, {last.ty}) but the monitor put it at ({last.px}, {last.py}).
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="scroll-thin mt-5 overflow-x-auto">
        <svg viewBox="0 0 600 134" className="w-full min-w-[520px]" role="img" aria-label="The last 24 ticks on the cable">
          <defs>
            <pattern id="io-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line y2="5" stroke="var(--color-off)" strokeWidth="1" />
            </pattern>
          </defs>
          {["clock", "colour", "H-sync", "V-sync"].map((l, i) => (
            <text key={l} x={4} y={[24, 56, 92, 122][i]} className="font-sans text-[13px]" fill="var(--color-mute)">
              {l}
            </text>
          ))}
          {mon.hist.map((tk, i) => {
            const x = x0 + (off + i) * cellW;
            return (
              <g key={tk.n}>
                <path
                  d={`M${x} 28 V12 H${x + cellW / 2} V28 H${x + cellW}`}
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeWidth={1.25}
                />
                <rect
                  x={x + 1.5}
                  y={40}
                  width={cellW - 3}
                  height={24}
                  rx={2}
                  fill={tk.c ? rgb(tk.c) : "url(#io-hatch)"}
                  stroke={tk.missed ? "var(--color-pink)" : "var(--color-line-2)"}
                  strokeWidth={tk.missed ? 2 : 1}
                  strokeDasharray={tk.missed ? "3 2" : undefined}
                />
                {tk.missed && (
                  <text x={x + cellW / 2} y={57} textAnchor="middle" className="font-sans text-[14px] font-bold" fill="var(--color-pink)">
                    ✗
                  </text>
                )}
              </g>
            );
          })}
          <Wave y={78} hi={mon.hist.map((t) => t.hs)} cells={cells} x0={x0} w={cellW} />
          <Wave y={108} hi={mon.hist.map((t) => t.vs)} cells={cells} x0={x0} w={cellW} />
          <text x={592} y={8} textAnchor="end" className="font-sans text-[12px]" fill="var(--color-dim)">
            newest →
          </text>
        </svg>
      </div>

      <p className="mt-3 font-serif text-[0.9375rem] text-mute" aria-live="polite">
        {mon.drop === "sync" ? (
          <>
            The monitor missed one tick, so the rest of that row landed one pixel too far left. At the next H-sync pulse
            it reset its x counter, and every row after that is fine again. Now switch the sync wires off and drop a
            tick again.
          </>
        ) : mon.drop === "nosync" ? (
          <>
            With no sync pulses, nothing tells the monitor it is wrong. From the missed tick on, every colour lands one
            pixel too far left, in this frame and in every frame after it. The right edge now shows the black blank
            margin. Press Reset to repair it.
          </>
        ) : (
          <>
            The monitor drew a letter A, but it never received “A”. It received {MW * MH} colours per frame, plus blank
            ticks, and it knows where each colour goes only by counting.
          </>
        )}
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 6. The real numbers: pixel clock and cable speed                     */
/* ------------------------------------------------------------------ */

const MODES = [
  { id: "720p", w: 1280, h: 720, ht: 1650, vt: 750 },
  { id: "1080p", w: 1920, h: 1080, ht: 2200, vt: 1125 },
  { id: "4K", w: 3840, h: 2160, ht: 4400, vt: 2250 },
] as const;
type ModeId = (typeof MODES)[number]["id"];

const texNum = (n: number) => fmt(n).replace(/,/g, "{,}");

export function LinkCalc() {
  const [mode, setMode] = useState<ModeId>("1080p");
  const [hz, setHz] = useState(60);
  const m = MODES.find((x) => x.id === mode)!;
  const clk = m.ht * m.vt * hz;
  const pair = clk * 10;
  const total = clk * 30;
  const visible = (m.w * m.h) / (m.ht * m.vt);
  const verdict =
    total <= 10.2e9
      ? { tone: "cyan" as const, text: "fits HDMI 1.4 (up to 10.2 Gbit/s)" }
      : total <= 18e9
        ? { tone: "amber" as const, text: "needs HDMI 2.0 (up to 18 Gbit/s)" }
        : {
            tone: "pink" as const,
            text: "too fast for this code: HDMI 2.1 switches to a more efficient code and up to 48 Gbit/s",
          };

  return (
    <Widget
      title="Real monitors: how fast must the cable go?"
      subtitle="Each mode below uses the standard TV timing, including the blank margins. HDMI sends every colour byte as 10 bits on its own wire pair."
    >
      <div className="flex flex-wrap gap-3">
        <Segmented
          value={mode}
          onChange={setMode}
          options={MODES.map((x) => ({ value: x.id, label: `${x.id} (${x.w}×${x.h})` }))}
        />
        <Segmented
          value={hz}
          onChange={setHz}
          options={[
            { value: 60, label: "60 Hz" },
            { value: 120, label: "120 Hz" },
          ]}
        />
      </div>
      <div className="scroll-thin mt-3 overflow-x-auto">
        <TeX block>{`\\underbrace{${texNum(m.ht)}}_{\\text{ticks per row}} \\times \\underbrace{${texNum(m.vt)}}_{\\text{rows}} \\times \\underbrace{${hz}}_{\\text{frames/s}} = ${texNum(clk)}\\ \\tfrac{\\text{ticks}}{\\text{s}}`}</TeX>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 @xl:grid-cols-4">
        <Stat label="Pixel clock" value={`${fmt(clk / 1e6, clk % 1e6 === 0 ? 0 : clk % 1e5 === 0 ? 1 : 2)} MHz`} tone="on" />
        <Stat label="One pixel every" value={`${fmt(1e9 / clk, 2)} ns`} />
        <Stat label="Each wire pair" value={`${fmt(pair / 1e9, 3)} Gbit/s`} sub="clock × 10 bits" />
        <Stat label="All 3 pairs" value={`${fmt(total / 1e9, 3)} Gbit/s`} sub="R, G and B" tone="amber" />
      </div>
      <p className="mt-3 font-serif text-[0.9375rem] text-mute">
        Only {fmt(visible * 100, 1)}% of the ticks carry visible pixels ({fmt(m.w)} × {fmt(m.h)} out of {fmt(m.ht)} ×{" "}
        {fmt(m.vt)}). This mode <Pill tone={verdict.tone}>{verdict.text}</Pill>
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Gamma: why 128 is not half as bright                              */
/* ------------------------------------------------------------------ */

const STRIPES = "repeating-linear-gradient(to bottom, rgb(255 255 255) 0 1px, rgb(0 0 0) 1px 2px)";

export function GammaCurve() {
  const [v, setV] = useState(128);
  const light = Math.pow(v / 255, 2.2);
  const looks = light > 0.008856 ? 116 * Math.cbrt(light) - 16 : 903.3 * light;
  const X = (n: number) => 50 + (n / 255) * 256;
  const Y = (l: number) => 196 - l * 176;
  let curve = "";
  for (let i = 0; i <= 64; i++) {
    const n = (i / 64) * 255;
    curve += `${i ? "L" : "M"}${X(n).toFixed(1)} ${Y(Math.pow(n / 255, 2.2)).toFixed(1)} `;
  }
  const g = (n: number): RGB => [n, n, n];

  return (
    <Widget
      title="Number in, light out"
      subtitle="Slide the number that the cable carries for one subpixel. The panel does not make light in proportion to it: it follows a curve agreed in the sRGB standard."
    >
      <div className="grid items-start gap-6 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
        <div>
          <Slider label="Number sent (0–255)" min={0} max={255} value={v} onChange={setV} />
          <svg viewBox="0 0 320 236" className="mt-3 w-full max-w-[26rem]" role="img" aria-label="Gamma curve">
            <path d={`M50 196 H306 M50 196 V18`} stroke="var(--color-line-2)" fill="none" />
            <path d={`M${X(0)} ${Y(0)} L${X(255)} ${Y(1)}`} stroke="var(--color-off)" strokeDasharray="4 4" fill="none" />
            <path d={curve} stroke="var(--color-amber)" strokeWidth={2.5} fill="none" />
            <path
              d={`M${X(v)} 196 V${Y(light)} H50`}
              stroke="var(--color-ink)"
              strokeDasharray="3 3"
              strokeWidth={1.25}
              fill="none"
            />
            <circle cx={X(v)} cy={Y(light)} r={5} fill="var(--color-amber)" stroke="var(--color-panel)" strokeWidth={1.5} />
            {[0, 128, 255].map((n) => (
              <text key={n} x={X(n)} y={214} textAnchor="middle" className="font-mono text-[13px]" fill="var(--color-dim)">
                {n}
              </text>
            ))}
            {[0, 0.5, 1].map((l) => (
              <text key={l} x={44} y={Y(l) + 5} textAnchor="end" className="font-mono text-[13px]" fill="var(--color-dim)">
                {l * 100}%
              </text>
            ))}
            <text x={178} y={232} textAnchor="middle" className="font-sans text-[13px]" fill="var(--color-mute)">
              number sent
            </text>
            <text x={60} y={14} className="font-sans text-[13px]" fill="var(--color-mute)">
              light out
            </text>
            <text x={X(150) - 10} y={Y(150 / 255) + 4} textAnchor="end" className="font-sans text-[12px]" fill="var(--color-dim)">
              a straight line
            </text>
          </svg>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Stat label="Light out" value={`${fmt(light * 100, 1)}%`} tone="amber" sub={`(${v} ÷ 255)^2.2`} />
            <Stat label="Looks like" value={`${fmt(looks, 0)}%`} sub="of full brightness, to your eye" />
          </div>
        </div>
        <div className="surface-screen rounded-lg p-3">
          <div className="grid grid-cols-3 gap-2 font-sans text-xs">
            {[
              { bg: STRIPES, label: "stripes: 50% light" },
              { bg: rgb(g(186)), label: "number 186" },
              { bg: rgb(g(128)), label: "number 128" },
            ].map((p) => (
              <div key={p.label}>
                <div className="h-20 rounded-sm" style={{ background: p.bg }} />
                <div className="mt-1 text-mute">{p.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 h-10 rounded-sm" style={{ background: rgb(g(v)) }} />
          <div className="mt-1 font-sans text-xs text-mute">your number: {v}</div>
          <p className="mt-2 font-serif text-[0.875rem] text-mute">
            Half of the stripe lines are white and half are black, so together they give exactly 50% of the light.
            Lean back from your screen: the stripes should look closer to 186 than to 128.
          </p>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 8. The ADC: a binary-search voltmeter                                */
/* ------------------------------------------------------------------ */

type AdcStep = { b: number; test: number; tv: number; yes: boolean; code: number };

function sar(vin: number): AdcStep[] {
  let code = 0;
  const out: AdcStep[] = [];
  for (let b = 7; b >= 0; b--) {
    const test = code | (1 << b);
    const tv = test / 256;
    const yes = vin >= tv;
    if (yes) code = test;
    out.push({ b, test, tv, yes, code });
  }
  return out;
}

export function Voltmeter() {
  const [mv, setMv] = useState(620);
  const [steps, setSteps] = useState(0);
  const vin = mv / 1000;
  const seq = useMemo(() => sar(vin), [vin]);
  const code = steps ? seq[steps - 1].code : 0;
  const lo = code / 256;
  const hi = lo + Math.pow(2, 8 - steps) / 256;
  const next = steps < 8 ? seq[steps] : null;
  const Y = (v: number) => 280 - v * 260;
  const cmpOut = next ? vin >= next.tv : false;
  const testY = next ? Y(next.tv) : null;

  return (
    <Widget
      title="An ADC plays “guess my number” with a voltage"
      subtitle="Set the voltage coming in. The ADC can only ask one kind of question: “is the input at least this test voltage?” Each answer is one bit and halves the range that is left."
    >
      <Slider
        label="Input voltage"
        min={0}
        max={1000}
        value={mv}
        onChange={(v) => {
          setMv(v);
          setSteps(0);
        }}
        format={(v) => `${(v / 1000).toFixed(3)} V`}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="primary" disabled={steps >= 8} onClick={() => setSteps((s) => Math.min(8, s + 1))}>
          {steps >= 8 ? "Done" : `Compare (step ${steps + 1} of 8)`}
        </Btn>
        <Btn disabled={steps >= 8} onClick={() => setSteps(8)}>
          All 8 steps
        </Btn>
        <Btn variant="ghost" onClick={() => setSteps(0)}>
          Start again
        </Btn>
      </div>

      <div className="mt-4 grid items-start gap-5 @2xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <svg viewBox="0 0 380 300" className="w-full" role="img" aria-label="Voltage scale and comparator">
          <CircuitDefs />
          <rect x={70} y={20} width={40} height={260} fill="url(#hatch)" stroke="var(--color-line-2)" />
          <rect
            x={70}
            y={Y(hi)}
            width={40}
            height={Y(lo) - Y(hi)}
            fill="var(--color-cyan-tint)"
            stroke="var(--color-cyan)"
            strokeWidth={1.5}
            style={{ transition: "y .3s, height .3s" }}
          />
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <path d={`M64 ${Y(v)} H70`} stroke="var(--color-line-2)" />
              <text x={60} y={Y(v) + 5} textAnchor="end" className="font-mono text-[13px]" fill="var(--color-dim)">
                {v === 0 ? "0 V" : v === 1 ? "1 V" : v}
              </text>
            </g>
          ))}
          <path d={`M66 ${Y(vin)} H114`} stroke="var(--color-amber)" strokeWidth={3} />
          <path d={`M114 ${Y(vin)} H160 V128 H200`} stroke="var(--color-amber)" strokeWidth={2} fill="none" />
          {testY !== null && (
            <>
              <path d={`M66 ${testY} H114`} stroke="var(--color-ink)" strokeWidth={1.75} strokeDasharray="4 3" />
              <path d={`M114 ${testY} H176 V172 H200`} stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
            </>
          )}
          <path d="M200 106 L200 194 L272 150 Z" fill="var(--color-panel)" stroke="var(--color-ink)" strokeWidth={1.75} />
          <text x={208} y={133} className="font-mono text-[15px] font-bold" fill="var(--color-amber)">
            +
          </text>
          <text x={208} y={177} className="font-mono text-[15px] font-bold" fill="var(--color-ink)">
            −
          </text>
          <Wire d="M272 150 H314" on={cmpOut} />
          <circle
            cx={328}
            cy={150}
            r={13}
            fill={cmpOut ? "var(--color-on)" : "var(--color-panel)"}
            stroke={cmpOut ? "var(--color-on)" : "var(--color-off)"}
            strokeWidth={2}
          />
          <text
            x={328}
            y={155}
            textAnchor="middle"
            className="font-mono text-[13px] font-bold"
            fill={cmpOut ? "var(--color-bg)" : "var(--color-dim)"}
          >
            {next ? (cmpOut ? 1 : 0) : "–"}
          </text>
          <text x={328} y={126} textAnchor="middle" className="font-sans text-[13px]" fill="var(--color-mute)">
            in ≥ test?
          </text>
          <text x={198} y={222} className="font-mono text-[13px]" fill="var(--color-amber)">
            + input {vin.toFixed(3)} V
          </text>
          <text x={198} y={242} className="font-mono text-[13px]" fill="var(--color-ink)">
            − test {next ? `${next.tv.toFixed(3)} V` : "(done)"}
          </text>
          {next && (
            <text x={198} y={262} className="font-mono text-[13px]" fill="var(--color-dim)">
              = {next.test}/256, from a DAC
            </text>
          )}
          <text x={198} y={92} className="font-sans text-[13px]" fill="var(--color-mute)">
            comparator
          </text>
        </svg>

        <div className="min-w-0 space-y-3">
          <div>
            <div className="label-caps mb-1 text-dim">The 8 bits</div>
            <div className="flex gap-1">
              {seq.map((st, i) => {
                const done = i < steps;
                const isNext = i === steps;
                return (
                  <div key={st.b} className="flex flex-col items-center gap-0.5">
                    <span
                      className={cx(
                        "grid h-9 w-8 place-items-center rounded-md border font-mono text-base",
                        done
                          ? st.yes
                            ? "border-on bg-on-tint font-bold text-on"
                            : "border-line-2 bg-panel text-dim"
                          : isNext
                            ? "border-amber bg-amber-tint font-bold text-amber halo-amber"
                            : "border-line bg-panel-2 text-dim",
                      )}
                    >
                      {done ? (st.yes ? 1 : 0) : isNext ? "?" : "·"}
                    </span>
                    <span className="font-mono text-[0.6875rem] text-dim">{1 << st.b}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {steps > 0 && (
            <DataTable
              head={["step", "test", "input ≥ test?", "bit"]}
              highlight={steps - 1}
              rows={seq.slice(0, steps).map((st, i) => [
                <span className="font-mono">{i + 1}</span>,
                <span className="font-mono">
                  {st.test}/256 = {st.tv.toFixed(3)} V
                </span>,
                st.yes ? "yes → keep it" : "no → remove it",
                <span className={cx("font-mono", st.yes ? "font-bold text-on" : "text-dim")}>
                  b{st.b} = {st.yes ? 1 : 0}
                </span>,
              ])}
            />
          )}
          <p className="font-serif text-[0.9375rem] text-mute">
            {steps === 0 ? (
              <>The whole range, 0 to 1 V, is still possible. Press Compare.</>
            ) : steps < 8 ? (
              <>
                The answer is now somewhere between {lo.toFixed(3)} V and {hi.toFixed(3)} V (the blue part of the bar).
                That range is {fmt((hi - lo) * 1000, 1)} mV tall.
              </>
            ) : (
              <>
                Result: <Bits value={code} width={8} className="text-ink" /> = <strong className="text-ink">{code}</strong>.
                Read back: {code} ÷ 256 = {(code / 256).toFixed(3)} V, less than 1/256 V (0.004 V) below the real{" "}
                {vin.toFixed(3)} V.
              </>
            )}
          </p>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Sound as numbers                                                  */
/* ------------------------------------------------------------------ */

const FS_OPTIONS = [8000, 16000, 44100, 48000];
const fFromSlider = (v: number) => Math.round(50 * Math.pow(400, v / 1000));
const sliderFromF = (f: number) => Math.round((1000 * Math.log(f / 50)) / Math.log(400));

export function SoundSampler() {
  const [sv, setSv] = useState(() => sliderFromF(440));
  const [fs, setFs] = useState(48000);
  const [bits, setBits] = useState(16);
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(
    () => () => {
      try {
        srcRef.current?.stop();
      } catch {
        /* already stopped */
      }
      void ctxRef.current?.close();
      ctxRef.current = null;
    },
    [],
  );

  const f = fFromSlider(sv);
  const A = Math.pow(2, bits - 1) - 1;
  const sample = (n: number) => Math.round(A * Math.sin((2 * Math.PI * f * n) / fs));
  const fa = Math.abs(f - fs * Math.round(f / fs));
  const aliasing = f > fs / 2;
  const win = Math.min(0.04, 3 / Math.max(fa, 25));
  const N = Math.floor(win * fs);

  const X = (t: number) => 76 + (t / win) * 514;
  const Y = (q: number) => 108 - q * 84;
  let truePath = "";
  const P = Math.min(4000, Math.max(600, Math.ceil(win * f * 40)));
  for (let i = 0; i <= P; i++) {
    const t = (i / P) * win;
    truePath += `${i ? "L" : "M"}${X(t).toFixed(1)} ${Y(Math.sin(2 * Math.PI * f * t)).toFixed(1)}`;
  }
  let stair = "";
  for (let n = 0; n <= N; n++) {
    const t = n / fs;
    const y = Y(sample(n) / A).toFixed(1);
    const tEnd = Math.min(win, (n + 1) / fs);
    stair += `${n ? "V" + y : "M" + X(t).toFixed(1) + " " + y}H${X(tEnd).toFixed(1)}`;
  }
  const first = Array.from({ length: 8 }, (_, n) => sample(n));

  const play = () => {
    const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext ?? w.webkitAudioContext;
    if (!AC) return;
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = new AC();
      ctxRef.current = ctx;
    }
    void ctx.resume();
    try {
      srcRef.current?.stop();
    } catch {
      /* not started */
    }
    const len = fs; // one second
    const buf = ctx.createBuffer(1, len, fs);
    const ch = buf.getChannelData(0);
    for (let n = 0; n < len; n++) ch[n] = sample(n) / A;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    const t0 = ctx.currentTime;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.08, t0 + 0.03);
    gain.gain.setValueAtTime(0.08, t0 + 0.95);
    gain.gain.linearRampToValueAtTime(0, t0 + 1);
    src.connect(gain).connect(ctx.destination);
    src.onended = () => setPlaying(false);
    src.start();
    srcRef.current = src;
    setPlaying(true);
  };
  const stop = () => {
    try {
      srcRef.current?.stop();
    } catch {
      /* not started */
    }
    setPlaying(false);
  };

  return (
    <Widget
      wide
      title="Sound as a list of numbers"
      subtitle="The smooth line is the air pressure. The dots are the samples: the numbers that get stored. The steps show what a DAC rebuilds from those numbers. Press Play to hear exactly these numbers."
    >
      <div className="grid gap-4 @2xl:grid-cols-[minmax(0,1fr)_auto]">
        <Slider
          label="Pitch (how many wiggles per second)"
          min={0}
          max={1000}
          value={sv}
          onChange={setSv}
          format={() => `${fmt(f)} Hz`}
        />
        <div className="flex flex-wrap items-end gap-2">
          <Btn
            onClick={() => {
              setSv(sliderFromF(440));
              setFs(48000);
              setBits(16);
            }}
          >
            440 Hz, the note A
          </Btn>
          <Btn
            onClick={() => {
              setSv(sliderFromF(7000));
              setFs(8000);
            }}
          >
            7,000 Hz at 8,000/s
          </Btn>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="font-sans text-sm text-mute">Samples per second</span>
          <Segmented size="sm" value={fs} onChange={setFs} options={FS_OPTIONS.map((x) => ({ value: x, label: fmt(x) }))} />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-sans text-sm text-mute">Bits per sample</span>
          <Segmented size="sm" value={bits} onChange={setBits} options={[3, 4, 8, 16].map((x) => ({ value: x, label: `${x}` }))} />
        </div>
      </div>

      <div className="scroll-thin mt-4 overflow-x-auto">
        <svg viewBox="0 0 600 214" className="w-full min-w-[520px]" role="img" aria-label="Sound wave and its samples">
          <path d="M76 108 H590" stroke="var(--color-line-2)" />
          <path d="M76 24 V192" stroke="var(--color-line-2)" />
          {[1, 0, -1].map((q) => (
            <text key={q} x={70} y={Y(q) + 5} textAnchor="end" className="font-mono text-[13px]" fill="var(--color-dim)">
              {q === 0 ? "0" : `${q > 0 ? "+" : "−"}${fmt(A)}`}
            </text>
          ))}
          <path d={truePath} stroke="var(--color-off)" strokeWidth={1.25} fill="none" />
          <path d={stair} stroke="var(--color-cyan)" strokeWidth={2} fill="none" />
          {N <= 120 &&
            Array.from({ length: N + 1 }, (_, n) => (
              <circle key={n} cx={X(n / fs)} cy={Y(sample(n) / A)} r={3.2} fill="var(--color-cyan)" stroke="var(--color-panel)" />
            ))}
          <text x={76} y={210} className="font-mono text-[13px]" fill="var(--color-dim)">
            0
          </text>
          <text x={590} y={210} textAnchor="end" className="font-mono text-[13px]" fill="var(--color-dim)">
            {(win * 1000).toFixed(2)} ms
          </text>
          <text x={333} y={210} textAnchor="middle" className="font-sans text-[13px]" fill="var(--color-mute)">
            time ({fmt(N + 1)} samples shown)
          </text>
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        <Stat label="Samples per wave" value={fmt(fs / f, 1)} sub={`${fmt(fs)} ÷ ${fmt(f)}`} />
        <Stat label="Highest safe pitch" value={`${fmt(fs / 2)} Hz`} sub="half the sample rate" />
        <Stat label="Levels" value={fmt(Math.pow(2, bits))} sub={`2^${bits}`} />
        <Stat label="Data rate" value={`${fmt(fs * bits)} bit/s`} sub="one channel" />
      </div>

      <div className="mt-3 space-y-2">
        <p className="font-serif text-[0.9375rem] text-mute">
          {aliasing ? (
            <>
              <Pill tone="pink">✗ Too fast</Pill> {fmt(f)} Hz is above half the sample rate ({fmt(fs / 2)} Hz). Fewer
              than 2 samples land on each wiggle, and the dots trace a slower wave instead: you will hear about{" "}
              <strong className="text-ink">{fmt(fa)} Hz</strong>. This is called aliasing.
            </>
          ) : (
            <>
              <Pill tone="cyan">✓ OK</Pill> More than 2 samples per wiggle, so the numbers hold the pitch correctly.
              {bits <= 4 && " With so few levels the steps are coarse: you will hear a buzzy, rough tone."}
            </>
          )}
        </p>
        <p className="font-sans text-sm text-mute">
          First samples:{" "}
          <span className="font-mono text-ink">
            {first.map((x) => (x < 0 ? `−${fmt(-x)}` : fmt(x))).join(", ")}, …
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Btn variant="primary" onClick={playing ? stop : play}>
            {playing ? "■ Stop" : "▶ Play these numbers (1 s)"}
          </Btn>
          <span className="font-sans text-xs text-dim">Quiet, but check your volume first.</span>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Static figures                                                       */
/* ------------------------------------------------------------------ */

/** The letter 'A' (0x41) on a serial (UART) line, lowest bit first. */
export function UartFrame() {
  const byte = 0x41;
  const cells = [
    { l: "start", v: 0 },
    ...Array.from({ length: 8 }, (_, i) => ({ l: `b${i}`, v: (byte >> i) & 1 })),
    { l: "stop", v: 1 },
  ];
  const cw = 44;
  const c0 = 110;
  const Yv = (v: number) => (v ? 36 : 76);
  let d = `M66 ${Yv(1)} H${c0}`;
  cells.forEach((c, i) => {
    d += ` V${Yv(c.v)} H${c0 + (i + 1) * cw}`;
  });
  d += ` V${Yv(1)} H594`;
  return (
    <Figure
      caption={
        <>
          The letter A (0x41 = 0100 0001) leaving a serial port at 9,600 baud. The wire rests at 1. A 0 start bit says
          “a byte begins now”, then the 8 data bits follow, lowest bit first, then a 1 stop bit. There is no clock
          wire: both sides agreed on the speed before they started.
        </>
      }
    >
      <svg viewBox="0 0 600 150" className="w-full min-w-[520px]" role="img" aria-label="UART frame for the letter A">
        {cells.map((c, i) => {
          const x = c0 + i * cw;
          return (
            <g key={i}>
              {c.v === 1 && <rect x={x} y={28} width={cw} height={56} fill="var(--color-on-tint)" />}
              <path d={`M${x} 24 V88`} stroke="var(--color-line-2)" strokeDasharray="2 3" />
              <text
                x={x + cw / 2}
                y={106}
                textAnchor="middle"
                className={cx("font-mono text-[14px]", c.v === 1 && "font-bold")}
                fill={c.v ? "var(--color-on)" : "var(--color-dim)"}
              >
                {c.v}
              </text>
              <text x={x + cw / 2} y={124} textAnchor="middle" className="font-mono text-[13px]" fill="var(--color-mute)">
                {c.l}
              </text>
            </g>
          );
        })}
        <path d={`M${c0 + cells.length * cw} 24 V88`} stroke="var(--color-line-2)" strokeDasharray="2 3" />
        <path d={d} fill="none" stroke="var(--color-ink)" strokeWidth={2.25} strokeLinejoin="round" />
        <text x={58} y={Yv(1) + 5} textAnchor="end" className="font-mono text-[13px]" fill="var(--color-mute)">
          1
        </text>
        <text x={58} y={Yv(0) + 5} textAnchor="end" className="font-mono text-[13px]" fill="var(--color-mute)">
          0
        </text>
        <text x={88} y={124} textAnchor="middle" className="font-sans text-[13px]" fill="var(--color-dim)">
          idle
        </text>
        <path d={`M${c0 + cw} 134 v6 h${cw} v-6`} stroke="var(--color-amber)" fill="none" strokeWidth={1.5} />
        <text x={c0 + 2 * cw + 8} y={146} className="font-sans text-[13px]" fill="var(--color-amber)">
          1 bit lasts 1/9600 s ≈ 104 µs
        </text>
      </svg>
    </Figure>
  );
}

const PANEL_LEVELS = [
  [90, 40, 20, 95, 85, 30, 30, 60, 95, 20, 25, 30],
  [95, 90, 85, 60, 20, 15, 20, 50, 90, 95, 90, 85],
  [30, 70, 30, 30, 70, 30, 30, 70, 30, 30, 70, 30],
  [25, 60, 25, 25, 60, 25, 25, 60, 25, 25, 60, 25],
];
const SUB = ["var(--color-sub-r)", "var(--color-sub-g)", "var(--color-sub-b)"];

/** A panel's row and column drivers (4 rows × 4 pixels drawn). */
export function PanelDrivers() {
  const colX = (k: number) => 150 + k * 29 + Math.floor(k / 3) * 4;
  const rowY = (r: number) => 88 + r * 58;
  const ON_ROW = 1;
  const status = ["holds", "ON now", "waits", "waits"];
  return (
    <Figure
      caption={
        <>
          Inside a flat panel (only 4 rows and 4 pixels drawn). The row drivers switch on one row of tiny transistors at
          a time. While a row is on, the column drivers put a voltage on every subpixel of that row at once, one DAC per
          column. When the row switches off, a tiny capacitor in each subpixel keeps the voltage, and so the light,
          until that row's turn comes again one frame later. Rows below the active one still show the previous frame.
        </>
      }
    >
      <svg viewBox="0 0 560 330" className="w-full min-w-[520px]" role="img" aria-label="Panel row and column drivers">
        <CircuitDefs />
        <rect x={8} y={8} width={110} height={56} rx={6} fill="var(--color-panel-2)" stroke="var(--color-line-2)" />
        <text x={63} y={32} textAnchor="middle" className="font-sans text-[13px]" fill="var(--color-ink)">
          timing
        </text>
        <text x={63} y={50} textAnchor="middle" className="font-sans text-[13px]" fill="var(--color-ink)">
          controller
        </text>
        <path d="M118 36 H134" stroke="var(--color-ink)" strokeWidth={1.5} markerEnd="url(#arrow-ink)" />
        <path d="M63 64 V80" stroke="var(--color-ink)" strokeWidth={1.5} markerEnd="url(#arrow-ink)" />
        <rect x={138} y={8} width={366} height={56} rx={6} fill="var(--color-panel-2)" stroke="var(--color-line-2)" />
        <text x={321} y={28} textAnchor="middle" className="font-sans text-[13px]" fill="var(--color-ink)">
          column drivers: one DAC per column
        </text>
        {Array.from({ length: 12 }, (_, k) => (
          <path
            key={k}
            d={`M${colX(k) - 6} 40 H${colX(k) + 6} L${colX(k)} 54 Z`}
            fill="var(--color-amber-tint)"
            stroke="var(--color-amber)"
            strokeWidth={1.25}
          />
        ))}
        <rect x={8} y={84} width={110} height={238} rx={6} fill="var(--color-panel-2)" stroke="var(--color-line-2)" />
        {["row", "drivers:", "one row", "at a time"].map((t, i) => (
          <text key={t} x={63} y={182 + i * 18} textAnchor="middle" className="font-sans text-[13px]" fill="var(--color-ink)">
            {t}
          </text>
        ))}
        <rect x={134} y={74} width={374} height={250} rx={4} fill="var(--color-screen)" />
        {Array.from({ length: 12 }, (_, k) => (
          <path key={k} d={`M${colX(k)} 56 V318`} stroke="var(--color-amber)" strokeWidth={1.25} />
        ))}
        {PANEL_LEVELS.map((row, r) => {
          const on = r === ON_ROW;
          const y = rowY(r);
          return (
            <g key={r}>
              <Wire d={`M118 ${y} H504`} on={on} flow={false} />
              {row.map((lvl, k) => (
                <g key={k}>
                  <rect
                    x={colX(k) - 11}
                    y={y + 7}
                    width={22}
                    height={42}
                    rx={2}
                    style={{ fill: `color-mix(in oklab, ${SUB[k % 3]} ${lvl}%, var(--color-screen-2))` }}
                    stroke={on ? "var(--color-screen-ink)" : "none"}
                    strokeWidth={1.25}
                  />
                  <rect
                    x={colX(k) - 3.5}
                    y={y - 3.5}
                    width={7}
                    height={7}
                    fill={on ? "var(--color-on)" : "var(--color-off)"}
                  />
                </g>
              ))}
              <text
                x={514}
                y={y + 32}
                className={cx("font-sans text-[13px]", on && "font-bold")}
                fill={on ? "var(--color-on)" : "var(--color-mute)"}
              >
                {status[r]}
              </text>
            </g>
          );
        })}
      </svg>
    </Figure>
  );
}
