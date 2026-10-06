import { useState } from "react";

import { CircuitDefs } from "~/components/circuit";
import { TeX } from "~/components/tex";
import { Btn, cx, DataTable, Pill, Stat, Widget } from "~/components/ui";
import { binStr, hexStr } from "~/lib/bits";
import { renderText } from "~/lib/font";
import { useAnimationTime, useInterval } from "~/lib/hooks";

/* ------------------------------------------------------------------ */
/* 1. Keyboard matrix scanning                                           */
/* ------------------------------------------------------------------ */

const KEYS = [
  ["7", "8", "9", "+"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "="],
  ["0", ".", "C", "⌫"],
];

/** USB HID usage IDs for the numeric keypad. */
export const hidCode: Record<string, number> = {
  "1": 0x59,
  "2": 0x5a,
  "3": 0x5b,
  "4": 0x5c,
  "5": 0x5d,
  "6": 0x5e,
  "7": 0x5f,
  "8": 0x60,
  "9": 0x61,
  "0": 0x62,
  ".": 0x63,
  "+": 0x57,
  "−": 0x56,
  "=": 0x58, // keypad Enter
  C: 0x53, // Num Lock / Clear
  "⌫": 0x2a,
};

export function KeyMatrix({ initial = "2" }: { initial?: string }) {
  const [pressed, setPressed] = useState<string | null>(initial);
  const t = useAnimationTime(true);
  const activeRow = Math.floor(t * 2) % 4;
  let pr = -1;
  let pc = -1;
  KEYS.forEach((row, r) =>
    row.forEach((k, c) => {
      if (k === pressed) {
        pr = r;
        pc = c;
      }
    }),
  );
  const hit = pr === activeRow;
  const x0 = 120;
  const y0 = 40;
  const dx = 72;
  const dy = 58;

  return (
    <Widget
      title="Step 1 · Which key is down? Scanning the matrix"
      subtitle="Keys sit where row wires cross column wires. The keyboard's chip powers one row at a time and listens on the columns. Click a key to hold it down. (Scanning slowed ~1000×.)"
    >
      <svg viewBox="0 0 440 290" className="w-full" role="img" aria-label="Keyboard matrix">
        <CircuitDefs />
        <rect x={10} y={20} width={64} height={230} rx={8} fill="var(--color-panel-2)" stroke="var(--color-line-2)" />
        <text
          x={42}
          y={135}
          textAnchor="middle"
          className="fill-mute font-mono text-[11px]"
          transform="rotate(-90 42 135)"
        >
          keyboard chip
        </text>
        {KEYS.map((_, r) => {
          const y = y0 + r * dy;
          const on = r === activeRow;
          return (
            <g key={`r${r}`}>
              <path d={`M74 ${y} H${x0 + 3 * dx + 30}`} className={on ? "wire wire-on" : "wire"} />
              <text
                x={80}
                y={y - 6}
                className="font-mono text-[11px]"
                fill={on ? "var(--color-on)" : "var(--color-dim)"}
              >
                row {r}
              </text>
            </g>
          );
        })}
        {[0, 1, 2, 3].map((c) => {
          const x = x0 + c * dx + 18;
          const on = hit && c === pc;
          return (
            <g key={`c${c}`}>
              <path d={`M${x} ${y0 - 20} V265`} className={on ? "wire wire-on" : "wire"} />
              <path d={`M${x} 265 V272`} className={on ? "wire wire-on" : "wire"} />
              <text
                x={x}
                y={285}
                textAnchor="middle"
                className="font-mono text-[11px]"
                fill={on ? "var(--color-on)" : "var(--color-dim)"}
              >
                col {c}
              </text>
            </g>
          );
        })}
        <path d="M74 268 H360" stroke="var(--color-line-2)" strokeWidth={1} strokeDasharray="3 4" />
        {KEYS.map((row, r) =>
          row.map((k, c) => {
            const x = x0 + c * dx;
            const y = y0 + r * dy;
            const isDown = k === pressed;
            return (
              <g key={k} className="cursor-pointer" onClick={() => setPressed(isDown ? null : k)}>
                <rect
                  x={x - 4}
                  y={y + 6}
                  width={44}
                  height={34}
                  rx={7}
                  fill={isDown ? "var(--color-amber-tint)" : "var(--color-panel-2)"}
                  stroke={isDown ? "var(--color-amber)" : "var(--color-off)"}
                  strokeWidth={1.5}
                />
                <text
                  x={x + 18}
                  y={y + 29}
                  textAnchor="middle"
                  className="font-mono text-[15px] font-bold"
                  fill={isDown ? "var(--color-amber)" : "var(--color-ink)"}
                >
                  {k}
                </text>
                {isDown && (
                  <line
                    x1={x + 18}
                    y1={y}
                    x2={x + 18}
                    y2={y + 6}
                    stroke={hit ? "var(--color-on)" : "var(--color-amber)"}
                    strokeWidth={3}
                  />
                )}
              </g>
            );
          }),
        )}
      </svg>
      <div
        className={cx(
          "mt-2 rounded-xl border p-3 text-sm",
          hit ? "border-on/50 bg-on/10 text-ink" : "border-line bg-bg/60 text-mute",
        )}
      >
        {pressed === null
          ? "No key is held, so whichever row is powered, no column answers."
          : hit
            ? `Row ${activeRow} is powered and column ${pc} answers → the key at (row ${pr}, col ${pc}) is “${pressed}”. Its code is 0x${hexStr(hidCode[pressed])}.`
            : `Powering row ${activeRow}… no column answers. (The held key “${pressed}” is on row ${pr}.)`}
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 2. The USB report                                                     */
/* ------------------------------------------------------------------ */

export function UsbReport({ keyChar }: { keyChar: string }) {
  const code = hidCode[keyChar] ?? 0;
  const report = [0x00, 0x00, code, 0, 0, 0, 0, 0];
  const W = 560;
  const bitW = (W - 60) / 8;
  const wave = (invert: boolean) => {
    let d = "";
    for (let i = 0; i < 8; i++) {
      let bit = (code >> (7 - i)) & 1;
      if (invert) bit ^= 1;
      const y = bit ? 12 : 40;
      d += `${i === 0 ? "M" : "L"}${50 + i * bitW} ${y} L${50 + (i + 1) * bitW} ${y} `;
    }
    return d;
  };
  return (
    <Widget
      title="Step 2 · The keyboard reports to the computer over USB"
      subtitle="About 1,000 times per second the computer asks the keyboard “anything new?”. It answers with an 8-byte report."
    >
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-sm">
        {report.map((b, i) => (
          <span
            key={i}
            className={cx(
              "rounded-md border px-2 py-1",
              i === 2 ? "border-amber bg-amber-tint text-amber" : "border-line-2 text-dim",
            )}
            title={i === 0 ? "modifier keys (Shift, Ctrl…)" : i === 1 ? "reserved" : `key slot ${i - 1}`}
          >
            {hexStr(b)}
          </span>
        ))}
        <span className="ml-2 text-xs text-mute">
          byte 0: Shift/Ctrl/Alt · byte 2:{" "}
          <span className="text-amber">
            key “{keyChar}” = 0x{hexStr(code)}
          </span>{" "}
          · up to 6 keys at once
        </span>
      </div>
      <svg viewBox={`0 0 ${W} 110`} className="mt-3 w-full" role="img" aria-label="USB differential signal">
        <text x={0} y={30} className="fill-mute font-mono text-[11px]">
          D+
        </text>
        <path d={wave(false)} fill="none" stroke="var(--color-cyan)" strokeWidth={2.4} />
        <g transform="translate(0 52)">
          <text x={0} y={30} className="fill-mute font-mono text-[11px]">
            D−
          </text>
          <path d={wave(true)} fill="none" stroke="var(--color-pink)" strokeWidth={2.4} />
        </g>
        {Array.from({ length: 8 }, (_, i) => (
          <text
            key={i}
            x={50 + (i + 0.5) * bitW}
            y={106}
            textAnchor="middle"
            className="fill-ink font-mono text-[11px]"
          >
            {(code >> (7 - i)) & 1}
          </text>
        ))}
      </svg>
      <p className="mt-1 text-sm text-mute">
        USB sends bits on a <span className="text-ink">pair</span> of wires that always do the opposite of each other.
        The receiver looks at the <em>difference</em>, so noise that hits both wires equally cancels out, the same
        robustness idea as using only 0 and 1. (The byte {binStr(code, 8, 4)} is shown simplified; real USB also encodes
        changes rather than levels.)
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Interrupt → driver → OS → app                                      */
/* ------------------------------------------------------------------ */

const stackSteps = [
  {
    who: "USB controller",
    what: "Copies the report into RAM, then turns on its interrupt wire to the CPU.",
    tone: "cyan",
  },
  {
    who: "CPU",
    what: "Finishes its current instruction, saves all its registers to RAM, and jumps to the interrupt handler. It's a JMP to an address listed in a table.",
    tone: "amber",
  },
  { who: "Keyboard driver", what: "Reads the report: code 0x5A means “keypad 2 went down”.", tone: "violet" },
  {
    who: "Operating system",
    what: "Applies your keyboard layout → the character “2” (Unicode 50). Finds the window you're typing in: Calculator. Puts a “key pressed: 2” event in its queue.",
    tone: "violet",
  },
  {
    who: "CPU",
    what: "Restores the saved registers and jumps back. The interrupted program never notices.",
    tone: "amber",
  },
  { who: "Calculator app", what: "Its event loop picks up the event: the user typed “2”.", tone: "on" },
] as const;

export function SoftwareStack() {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  useInterval(() => setI((v) => (v + 1) % stackSteps.length), auto ? 1800 : null);
  const toneCls: Record<string, string> = {
    cyan: "border-cyan bg-cyan/10 text-cyan",
    amber: "border-amber bg-amber/10 text-amber",
    violet: "border-violet bg-violet/10 text-violet",
    on: "border-on bg-on/10 text-on",
  };
  return (
    <Widget
      title="Step 3 · Interrupt! The CPU drops everything (for a moment)"
      subtitle="Hardware can tap the CPU on the shoulder. Here's the relay race from wire to app, which takes a few microseconds."
    >
      <ol className="space-y-1.5">
        {stackSteps.map((s, k) => (
          <li
            key={k}
            onClick={() => {
              setI(k);
              setAuto(false);
            }}
            className={cx(
              "flex cursor-pointer gap-3 rounded-xl border px-3 py-2 transition",
              k === i ? toneCls[s.tone] : k < i ? "border-line bg-bg/40 opacity-70" : "border-line bg-bg/40 opacity-40",
            )}
          >
            <span className="w-32 shrink-0 font-mono text-xs font-bold">{s.who}</span>
            <span className={cx("text-sm", k === i ? "text-ink" : "text-mute")}>{s.what}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <Btn onClick={() => (setAuto(false), setI((v) => Math.max(0, v - 1)))}>← Back</Btn>
        <Btn variant="primary" onClick={() => (setAuto(false), setI((v) => Math.min(stackSteps.length - 1, v + 1)))}>
          Next →
        </Btn>
        <Btn onClick={() => setAuto((a) => !a)}>{auto ? "⏸ Pause" : "▶ Play"}</Btn>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Character → number                                                */
/* ------------------------------------------------------------------ */

export function CharToNumber({ a, b }: { a: number; b: number }) {
  return (
    <Widget
      title="Step 4 · The character “2” is not the number 2"
      subtitle="Keys arrive as character codes. Digit characters start at code 48, so the app subtracts 48."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {[a, b].map((d, i) => {
          const code = 48 + d;
          return (
            <div key={i} className="rounded-xl border border-line bg-bg/60 p-3 font-mono text-sm">
              <div className="mb-2 font-sans text-xs text-mute">character “{d}”</div>
              <table className="tabular-nums">
                <tbody>
                  <tr>
                    <td className="pr-3 text-dim">code</td>
                    <td className="pr-3 text-ink">
                      <span className="text-violet">{binStr(code >> 4, 4)}</span> <span>{binStr(code & 15, 4)}</span>
                    </td>
                    <td className="text-mute">{code}</td>
                  </tr>
                  <tr>
                    <td className="pr-3 text-dim">− “0”</td>
                    <td className="pr-3 text-ink">
                      <span className="text-violet">0011</span> 0000
                    </td>
                    <td className="text-mute">48</td>
                  </tr>
                  <tr className="border-t border-line-2">
                    <td className="pr-3 text-on">number</td>
                    <td className="pr-3 font-bold text-on">{binStr(d, 8, 4)}</td>
                    <td className="text-on">{d}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-mute">
        Notice the pattern: the digit characters are <span className="font-mono text-ink">0011 0000</span> to{" "}
        <span className="font-mono text-ink">0011 1001</span>. The last 4 bits <em>are</em> the number. ASCII's
        designers arranged it that way on purpose in 1963.
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 5. The addition itself                                               */
/* ------------------------------------------------------------------ */

export function AddInAlu({ a, b }: { a: number; b: number }) {
  const bits = 8;
  const cols = Array.from({ length: bits }, (_, k) => {
    const i = bits - 1 - k;
    return { i, a: (a >> i) & 1, b: (b >> i) & 1 };
  });
  const carries: number[] = [0];
  for (let i = 0; i < bits; i++) {
    const t = ((a >> i) & 1) + ((b >> i) & 1) + carries[i];
    carries.push(t >> 1);
  }
  const sum = a + b;
  return (
    <Widget
      title="Step 5 · The actual math: one ADD instruction"
      subtitle="The calculator's code says result = a + b. The compiler turned that into a single machine instruction, which sends both numbers through the ALU's adder."
    >
      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <div className="space-y-2 font-mono text-sm">
          <div className="rounded-lg border border-line bg-bg/60 px-3 py-2">
            <span className="text-dim"># app code</span>
            <div className="text-ink">result = a + b</div>
          </div>
          <div className="rounded-lg border border-line bg-bg/60 px-3 py-2">
            <span className="text-dim">; x86 machine code</span>
            <div className="text-ink">
              add eax, ebx <span className="text-amber">01 D8</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="mx-auto font-mono text-base tabular-nums">
            <tbody>
              <tr>
                <td className="pr-3 text-right text-xs text-pink">carry</td>
                {cols.map((c) => (
                  <td key={c.i} className="w-7 text-center text-xs text-pink">
                    {carries[c.i] ? 1 : ""}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="pr-3 text-right text-xs text-dim">a = {a}</td>
                {cols.map((c) => (
                  <td key={c.i} className={cx("text-center", c.a ? "text-cyan" : "text-dim")}>
                    {c.a}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line-2">
                <td className="pr-3 text-right text-xs text-dim">b = {b}</td>
                {cols.map((c) => (
                  <td key={c.i} className={cx("text-center", c.b ? "text-violet" : "text-dim")}>
                    {c.b}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="pr-3 text-right text-xs text-on">sum = {sum}</td>
                {cols.map((c) => (
                  <td key={c.i} className={cx("text-center font-bold", (sum >> c.i) & 1 ? "text-on" : "text-dim")}>
                    {(sum >> c.i) & 1}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-center text-xs text-mute">
            8 full adders, about 28 transistors each. The carry ripples through in well under a nanosecond.
          </p>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Number → characters                                                */
/* ------------------------------------------------------------------ */

export function NumberToText({ n }: { n: number }) {
  const steps: Array<{ n: number; q: number; r: number }> = [];
  let x = n;
  do {
    steps.push({ n: x, q: Math.floor(x / 10), r: x % 10 });
    x = Math.floor(x / 10);
  } while (x > 0);
  const digits = steps.map((s) => s.r).reverse();
  return (
    <Widget
      title="Step 6 · Back to characters"
      subtitle="To display the number, the app splits it into decimal digits (divide by 10, keep the remainder), then adds 48 to each digit to get its character code."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <table className="font-mono text-sm tabular-nums">
          <tbody>
            {steps.map((s, i) => (
              <tr key={i} className="border-b border-line">
                <td className="py-1 pr-2 text-ink">{s.n}</td>
                <td className="py-1 pr-2 text-dim">÷ 10 =</td>
                <td className="py-1 pr-2 text-ink">{s.q}</td>
                <td className="py-1 pr-2 text-dim">remainder</td>
                <td className="py-1 font-bold text-on">{s.r}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center gap-2">
          {digits.map((d, i) => (
            <div key={i} className="rounded-xl border border-on/40 bg-on/5 px-3 py-2 text-center font-mono">
              <div className="text-xs text-dim">
                {d} + 48 = {d + 48}
              </div>
              <div className="text-lg text-ink">{binStr(d + 48, 8, 4)}</div>
              <div className="text-2xl font-bold text-on">“{d}”</div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm text-mute">
        Same trick as Step 4, run backwards. That's the same division-by-repeated-remainders method as decimal → binary,
        only with 10 instead of 2.
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Font glyphs → framebuffer                                          */
/* ------------------------------------------------------------------ */

const SCREEN_W = 1920;
const ORIGIN = { x: 1200, y: 300 }; // where the calculator's display sits on a real screen

export function GlyphFramebuffer({ text, highlightFrom }: { text: string; highlightFrom: number }) {
  const { grid, owner, w, h } = renderText(text, 1, 1);
  const [sel, setSel] = useState<{ x: number; y: number } | null>(null);
  const pick =
    sel ??
    (() => {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) if (grid[y][x] && owner[y][x] >= highlightFrom) return { x, y };
      return { x: 0, y: 0 };
    })();
  const rx = ORIGIN.x + pick.x;
  const ry = ORIGIN.y + pick.y;
  const addr = (ry * SCREEN_W + rx) * 4;
  const lit = grid[pick.y][pick.x] === 1;
  const cell = 14;

  return (
    <Widget
      title="Step 7 · Drawing the answer into the framebuffer"
      subtitle="The font says which pixels make up each character. The app writes those pixels' colours into a region of RAM called the framebuffer. Click any pixel."
      wide
    >
      <div className="scroll-thin surface-screen overflow-x-auto rounded-md p-1.5">
        <svg viewBox={`0 0 ${w * cell} ${h * cell}`} className="mx-auto w-full max-w-3xl" style={{ minWidth: w * 8 }}>
          {grid.map((row, y) =>
            row.map((v, x) => {
              const isNew = owner[y][x] >= highlightFrom;
              const isSel = pick.x === x && pick.y === y;
              return (
                <rect
                  key={`${x}-${y}`}
                  x={x * cell + 1}
                  y={y * cell + 1}
                  width={cell - 2}
                  height={cell - 2}
                  rx={2}
                  fill={v ? (isNew ? "var(--color-on)" : "var(--color-screen-ink)") : "var(--color-screen-2)"}
                  stroke={isSel ? "var(--color-amber)" : "none"}
                  strokeWidth={2}
                  className="cursor-pointer"
                  onClick={() => setSel({ x, y })}
                />
              );
            }),
          )}
        </svg>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="rounded-xl border border-line bg-bg/60 p-3 text-sm">
          <div className="text-mute">
            Pixel ({pick.x}, {pick.y}) of the display area, which on a 1920-wide screen is at (x = {rx}, y = {ry}). Each
            pixel takes 4 bytes (red, green, blue, unused), stored row after row:
          </div>
          <div className="mt-2">
            <TeX>{`\\text{address} = (y \\times 1920 + x) \\times 4 = (${ry} \\times 1920 + ${rx}) \\times 4 = ${addr.toLocaleString("en-US").replace(/,/g, "{,}")}`}</TeX>
          </div>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {(lit ? [61, 255, 160, 255] : [17, 26, 36, 255]).map((v, i) => (
            <div key={i} className="rounded-md border border-line-2 bg-bg/60 px-2 py-1 text-center">
              <div className={["text-red", "text-on", "text-cyan", "text-dim"][i]}>{["R", "G", "B", "–"][i]}</div>
              <div className="text-ink">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Scan-out to the panel                                              */
/* ------------------------------------------------------------------ */

export function ScanOut({ text }: { text: string }) {
  const { grid, w, h } = renderText(text, 1, 1);
  const t = useAnimationTime(true);
  const rowsPerSec = 8;
  const pos = (t * rowsPerSec) % (h + 2);
  const scanRow = Math.floor(pos);
  const cell = 14;
  return (
    <Widget
      title="Step 8 · From memory to light"
      subtitle="60 times a second, the display controller reads the framebuffer row by row and sends each pixel's numbers to the screen. Slowed down a lot."
      wide
    >
      <div className="grid items-center gap-5 md:grid-cols-[1fr_auto]">
        <div className="scroll-thin surface-screen overflow-x-auto rounded-md p-1.5">
          <svg viewBox={`0 0 ${w * cell} ${h * cell}`} className="w-full" style={{ minWidth: w * 8 }}>
            {grid.map((row, y) =>
              row.map((v, x) => (
                <rect
                  key={`${x}-${y}`}
                  x={x * cell + 1}
                  y={y * cell + 1}
                  width={cell - 2}
                  height={cell - 2}
                  rx={2}
                  fill={
                    v ? (y <= scanRow ? "var(--color-screen-ink)" : "var(--color-screen-dim)") : "var(--color-screen-2)"
                  }
                  opacity={y === scanRow ? 1 : 0.95}
                />
              )),
            )}
            <rect
              x={0}
              y={Math.min(scanRow, h - 1) * cell}
              width={w * cell}
              height={cell}
              fill="var(--color-amber)"
              opacity={0.18}
            />
          </svg>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-mute">one white pixel, up close</div>
          <div className="surface-screen flex gap-1 rounded-lg border border-bezel p-2">
            {["var(--color-sub-r)", "var(--color-sub-g)", "var(--color-sub-b)"].map((c) => (
              <div key={c} className="h-16 w-4 rounded-sm" style={{ background: c }} />
            ))}
          </div>
          <div className="text-center font-mono text-[0.6875rem] text-dim">
            R 255 · G 255 · B 255
            <br />3 tiny parts per pixel
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Frames per second" value="60" sub="one full screen every 16.7 ms" />
        <Stat label="Rows per frame" value="1,080" sub="each row in ≈ 15 µs" />
        <Stat label="Bytes per second" value="≈ 500 MB" sub="1920 × 1080 × 4 × 60" tone="amber" />
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Where did the time go?                                             */
/* ------------------------------------------------------------------ */

const budget = [
  { what: "Key travels down, contacts stop bouncing", s: 5e-3 },
  { what: "Waiting for the next USB poll", s: 0.5e-3 },
  { what: "Interrupt, driver, OS, app event", s: 20e-6 },
  { what: "Character → number", s: 1e-9 },
  { what: "The ADD instruction", s: 0.3e-9 },
  { what: "Number → text, layout", s: 2e-6 },
  { what: "Drawing the glyphs", s: 100e-6 },
  { what: "Waiting for the next screen refresh", s: 8e-3 },
  { what: "Pixels physically change", s: 4e-3 },
];

function fmtS(s: number) {
  if (s < 1e-6) return `${+(s * 1e9).toPrecision(2)} ns`;
  if (s < 1e-3) return `${+(s * 1e6).toPrecision(2)} µs`;
  return `${+(s * 1e3).toPrecision(2)} ms`;
}

export function TimeBudget() {
  const total = budget.reduce((s, b) => s + b.s, 0);
  const W = 640;
  const left = 250;
  const right = 70;
  const rowH = 28;
  const top = 22;
  const H = top + budget.length * rowH + 6;
  const lo = -10;
  const hi = -1;
  const x = (s: number) => left + ((Math.log10(s) - lo) / (hi - lo)) * (W - left - right);
  const add = budget[4].s;
  return (
    <Widget
      title="Where did the ~18 milliseconds go?"
      subtitle="Typical times for each step, on a log scale (each gridline is 10× longer). The arithmetic is the tiny bar."
      wide
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Time spent in each step, log scale">
        {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((e) => (
          <g key={e}>
            <line x1={x(10 ** e)} x2={x(10 ** e)} y1={top - 4} y2={H - 2} stroke="var(--color-line)" />
            {(e === -9 || e === -6 || e === -3) && (
              <text x={x(10 ** e)} y={12} textAnchor="middle" className="fill-dim font-mono text-[11px]">
                {e === -9 ? "1 ns" : e === -6 ? "1 µs" : "1 ms"}
              </text>
            )}
          </g>
        ))}
        {budget.map((b, i) => {
          const y = top + i * rowH + 5;
          const x1 = x(b.s);
          const isAdd = i === 4;
          return (
            <g key={b.what}>
              <text
                x={left - 10}
                y={y + 13}
                textAnchor="end"
                className="text-[11px]"
                fill={isAdd ? "var(--color-on)" : "var(--color-ink)"}
              >
                {b.what}
              </text>
              <path
                d={`M${left} ${y} H${Math.max(left, x1 - 4)} a4 4 0 0 1 4 4 V${y + 14} a4 4 0 0 1 -4 4 H${left} Z`}
                fill={isAdd ? "var(--color-on)" : "var(--color-amber)"}
                opacity={0.85}
              />
              <text x={x1 + 6} y={y + 13} className="fill-mute font-mono text-[11px]">
                {fmtS(b.s)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        <Pill tone="amber">total ≈ {fmtS(total)}</Pill>
        <Pill tone="on">the addition: {((add / total) * 100).toPrecision(2)}% of the time</Pill>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-mute hover:text-ink">Show as a table</summary>
        <DataTable
          className="mt-2"
          align="left"
          head={["step", "typical time"]}
          rows={budget.map((b) => [b.what, fmtS(b.s)])}
        />
      </details>
    </Widget>
  );
}
