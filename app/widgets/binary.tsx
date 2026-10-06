import { useMemo, useState } from "react";

import { TeX } from "~/components/tex";
import { BitButton, Btn, cx, DataTable, Pill, Slider, Widget } from "~/components/ui";
import { binStr, hexStr, toSigned } from "~/lib/bits";
import { useInterval } from "~/lib/hooks";

/* ------------------------------------------------------------------ */
/* n switches → 2^n patterns                                            */
/* ------------------------------------------------------------------ */

export function CombosWidget() {
  const [n, setN] = useState(3);
  const total = 2 ** n;
  return (
    <Widget
      title="How many patterns can n switches make?"
      subtitle="Each extra switch doubles the count: every old pattern appears once with the new switch off and once with it on."
    >
      <Slider label="Number of switches (bits)" min={1} max={5} value={n} onChange={setN} />
      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
        {Array.from({ length: total }, (_, v) => (
          <div key={v} className="rounded-lg border border-line bg-bg/60 px-2 py-1.5 text-center">
            <div className="flex justify-center gap-1">
              {Array.from({ length: n }, (_, i) => {
                const bit = (v >> (n - 1 - i)) & 1;
                return (
                  <span
                    key={i}
                    className={cx("h-3 w-3 rounded-full", bit ? "bg-on halo-on" : "border border-line-2 bg-bg")}
                  />
                );
              })}
            </div>
            <div className="mt-1 font-mono text-xs text-mute">{binStr(v, n)}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center text-lg">
        <TeX>{`\\underbrace{2 \\times 2 \\times \\cdots \\times 2}_{${n}\\text{ switches}} = 2^{${n}} = ${total}`}</TeX>{" "}
        <span className="text-mute">patterns</span>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Build a byte                                                         */
/* ------------------------------------------------------------------ */

export function ByteBuilder() {
  const [value, setValue] = useState(77);
  const [counting, setCounting] = useState(false);
  useInterval(() => setValue((v) => (v + 1) & 255), counting ? 350 : null);

  const bits = Array.from({ length: 8 }, (_, i) => (value >> (7 - i)) & 1);
  const terms = bits.map((b, i) => ({ b, place: 2 ** (7 - i) })).filter((t) => t.b);

  return (
    <Widget
      title="Build a byte"
      subtitle="Click the bits to switch them on and off. Each position is worth twice the one to its right."
    >
      <div className="overflow-x-auto pb-1">
        <div className="mx-auto grid w-max grid-cols-8 gap-x-2 gap-y-1.5 sm:gap-x-3">
          {bits.map((_, i) => (
            <div key={`p${i}`} className="text-center font-mono text-[0.7rem] text-dim">
              <TeX>{`2^${7 - i}`}</TeX>
            </div>
          ))}
          {bits.map((_, i) => (
            <div key={`v${i}`} className="text-center font-mono text-xs text-mute">
              {2 ** (7 - i)}
            </div>
          ))}
          {bits.map((b, i) => (
            <div key={`b${i}`} className="flex justify-center">
              <BitButton on={!!b} size="lg" onClick={() => setValue((v) => v ^ (1 << (7 - i)))} />
            </div>
          ))}
          <div className="col-span-4 mt-1 rounded-md border border-violet/40 bg-violet/10 text-center font-mono text-sm text-violet">
            hex {hexStr(value >> 4, 1)}
          </div>
          <div className="col-span-4 mt-1 rounded-md border border-violet/40 bg-violet/10 text-center font-mono text-sm text-violet">
            hex {hexStr(value & 15, 1)}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-bg/60 p-4 text-center">
        <div className="font-mono text-base break-words text-ink sm:text-lg">
          {terms.length === 0 ? (
            <span className="text-dim">nothing on</span>
          ) : (
            terms.map((t, i) => (
              <span key={t.place}>
                {i > 0 && <span className="text-dim"> + </span>}
                <span className="text-on">{t.place}</span>
              </span>
            ))
          )}
          <span className="text-dim"> = </span>
          <span className="text-2xl font-bold text-ink">{value}</span>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-sm">
          <Pill tone="on">binary {binStr(value, 8, 4)}</Pill>
          <Pill tone="mute">decimal {value}</Pill>
          <Pill tone="violet">hex 0x{hexStr(value)}</Pill>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Btn variant={counting ? "default" : "primary"} onClick={() => setCounting((c) => !c)}>
          {counting ? "⏸ Pause" : "▶ Count up"}
        </Btn>
        <Btn onClick={() => setValue((v) => (v + 1) & 255)}>+1</Btn>
        <Btn onClick={() => setValue((v) => (v + 255) & 255)}>−1</Btn>
        <Btn onClick={() => setValue(0)}>All off</Btn>
        <Btn onClick={() => setValue(255)}>All on</Btn>
        <label className="ml-auto flex items-center gap-2 text-sm text-mute">
          Type a number
          <input
            type="number"
            min={0}
            max={255}
            value={value}
            onChange={(e) => {
              const n = Math.max(0, Math.min(255, Math.floor(Number(e.target.value) || 0)));
              setValue(n);
            }}
            className="w-20 rounded-lg border border-line-2 bg-bg px-2 py-1 font-mono text-ink"
          />
        </label>
      </div>
      <p className="mt-3 text-sm text-mute">
        Press <span className="text-ink">Count up</span> and watch: the rightmost bit flips every step, the next one
        every 2 steps, the next every 4… exactly like a car's odometer, but with only two digits.
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Decimal → binary by repeated division                                */
/* ------------------------------------------------------------------ */

export function DecToBin() {
  const [n, setN] = useState(13);
  const rows = useMemo(() => {
    const out: Array<{ n: number; q: number; r: number }> = [];
    let x = n;
    if (x === 0) out.push({ n: 0, q: 0, r: 0 });
    while (x > 0) {
      out.push({ n: x, q: Math.floor(x / 2), r: x % 2 });
      x = Math.floor(x / 2);
    }
    return out;
  }, [n]);
  const bin = rows
    .map((r) => r.r)
    .reverse()
    .join("");

  return (
    <Widget
      title="Decimal → binary: keep dividing by 2"
      subtitle="Each remainder is one bit. The first remainder is the rightmost bit (the 1s place), so read them from bottom to top."
    >
      <Slider label="Number to convert" min={0} max={255} value={n} onChange={setN} />
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm tabular-nums">
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-line">
                  <td className="py-1.5 pr-3 text-right text-ink">{r.n}</td>
                  <td className="py-1.5 pr-3 text-dim">÷ 2 =</td>
                  <td className="py-1.5 pr-3 text-ink">{r.q}</td>
                  <td className="py-1.5 pr-3 text-dim">remainder</td>
                  <td className="py-1.5 font-bold text-on">{r.r}</td>
                  <td className="py-1.5 pl-3 text-xs text-dim">→ {2 ** i}s place</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-on/30 bg-on/5 px-6 py-4">
          <div className="text-xs tracking-wider text-dim uppercase">read upward ↑</div>
          <div className="font-mono text-3xl font-bold tracking-wider text-on">{bin}</div>
          <div className="font-mono text-xs text-mute">= {n} in binary</div>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Text → bytes (UTF-8)                                                  */
/* ------------------------------------------------------------------ */

export function TextToBytes({ initial = "Hi! 👋" }: { initial?: string }) {
  const [text, setText] = useState(initial);
  const chars = useMemo(() => {
    const enc = new TextEncoder();
    return Array.from(text).map((ch) => ({
      ch,
      cp: ch.codePointAt(0) ?? 0,
      bytes: Array.from(enc.encode(ch)),
    }));
  }, [text]);
  const total = chars.reduce((s, c) => s + c.bytes.length, 0);

  return (
    <Widget
      title="Type anything. See the bytes."
      subtitle="Every character has an agreed-upon number (its Unicode code point). UTF-8 turns that number into 1 to 4 bytes."
    >
      <input
        value={text}
        maxLength={24}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-xl border border-line-2 bg-bg px-4 py-3 text-xl text-ink focus:border-on focus:outline-none"
        aria-label="Text to encode"
      />
      <div className="scroll-thin mt-4 flex gap-2 overflow-x-auto pb-2">
        {chars.map((c, i) => (
          <div
            key={i}
            className={cx(
              "min-w-[88px] shrink-0 rounded-xl border bg-bg/60 p-2.5 text-center",
              c.bytes.length > 1 ? "border-amber/50" : "border-line-2",
            )}
          >
            <div className="text-2xl">{c.ch === " " ? <span className="text-dim">␣</span> : c.ch}</div>
            <div className="mt-1 font-mono text-[0.7rem] text-mute">code {c.cp}</div>
            <div className="mt-2 space-y-1">
              {c.bytes.map((b, j) => (
                <div key={j} className="rounded bg-panel-2 px-1 py-0.5 font-mono text-[0.7rem] leading-tight">
                  <div className="text-on">{binStr(b, 8)}</div>
                  <div className="text-violet">0x{hexStr(b)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill tone="on">{chars.length} characters</Pill>
        <Pill tone="amber">{total} bytes</Pill>
        <Pill tone="mute">{total * 8} bits</Pill>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Two's complement                                                     */
/* ------------------------------------------------------------------ */

export function TwosComplementWheel() {
  const [v, setV] = useState(3);
  const R = 110;
  const cx0 = 150;
  const cy0 = 140;
  return (
    <Widget
      title="The 4-bit number wheel"
      subtitle="Same 16 bit patterns, two ways to read them. Outside: unsigned 0–15. Inside: signed, where the top bit means −8."
    >
      <div className="grid items-center gap-4 sm:grid-cols-[300px_1fr]">
        <svg viewBox="0 0 300 280" className="mx-auto w-full max-w-[300px]">
          <circle cx={cx0} cy={cy0} r={R} fill="none" stroke="var(--color-line-2)" strokeWidth={2} />
          {Array.from({ length: 16 }, (_, k) => {
            const a = (k / 16) * Math.PI * 2 - Math.PI / 2;
            const x = cx0 + Math.cos(a) * R;
            const y = cy0 + Math.sin(a) * R;
            const sel = k === v;
            const s = toSigned(k, 4);
            return (
              <g key={k} className="cursor-pointer" onClick={() => setV(k)}>
                <circle
                  cx={x}
                  cy={y}
                  r={sel ? 9 : 6}
                  fill={sel ? "var(--color-on)" : k >= 8 ? "var(--color-pink)" : "var(--color-cyan)"}
                  opacity={sel ? 1 : 0.7}
                />
                <text
                  x={cx0 + Math.cos(a) * (R + 24)}
                  y={cy0 + Math.sin(a) * (R + 24) + 4}
                  textAnchor="middle"
                  className="fill-mute font-mono text-[11px]"
                >
                  {k}
                </text>
                <text
                  x={cx0 + Math.cos(a) * (R - 26)}
                  y={cy0 + Math.sin(a) * (R - 26) + 4}
                  textAnchor="middle"
                  className="font-mono text-[11px] font-bold"
                  fill={s < 0 ? "var(--color-pink)" : "var(--color-cyan)"}
                >
                  {s}
                </text>
              </g>
            );
          })}
          <text x={cx0} y={cy0 - 4} textAnchor="middle" className="fill-on font-mono text-[22px] font-bold">
            {binStr(v, 4)}
          </text>
          <text x={cx0} y={cy0 + 18} textAnchor="middle" className="fill-mute font-mono text-[11px]">
            {v} or {toSigned(v, 4)}
          </text>
        </svg>
        <div className="space-y-3 text-sm">
          <div className="flex gap-2">
            <Btn onClick={() => setV((x) => (x + 15) & 15)}>−1 (turn left)</Btn>
            <Btn onClick={() => setV((x) => (x + 1) & 15)}>+1 (turn right)</Btn>
          </div>
          <p className="text-mute">
            Going +1 from <span className="font-mono text-ink">0111</span> (7) lands on{" "}
            <span className="font-mono text-ink">1000</span>, which reads as −8 in signed mode. That's{" "}
            <span className="text-pink">overflow</span>: the result was too big to fit.
          </p>
          <p className="text-mute">
            Going −1 from <span className="font-mono text-ink">0000</span> lands on{" "}
            <span className="font-mono text-ink">1111</span>, which is −1. The adder doesn't care which reading you use.
            The same circuit adds both!
          </p>
        </div>
      </div>
    </Widget>
  );
}

export function NegateWidget() {
  const [x, setX] = useState(5);
  const flipped = ~x & 255;
  const neg = (flipped + 1) & 255;
  return (
    <Widget title="Make a number negative: flip every bit, then add 1">
      <Slider label="x" min={1} max={127} value={x} onChange={setX} />
      <DataTable
        className="mt-3"
        align="left"
        head={["step", "bits", "value"]}
        rows={[
          ["x", binStr(x, 8, 4), x],
          ["flip every bit", binStr(flipped, 8, 4), ""],
          [
            "add 1  →  −x",
            <span className="text-on">{binStr(neg, 8, 4)}</span>,
            <span className="text-on">{toSigned(neg, 8)}</span>,
          ],
          [
            "check: x + (−x)",
            <span>
              <span className="text-pink line-through">1</span> {binStr((x + neg) & 255, 8, 4)}
            </span>,
            0,
          ],
        ]}
      />
      <p className="mt-3 text-sm text-mute">
        In the last row the sum needs 9 bits, but the register only holds 8, so the leading 1 falls off the end and
        we're left with exactly <span className="font-mono text-ink">0</span>. That's why this trick works.
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Floating point                                                       */
/* ------------------------------------------------------------------ */

export function FloatWidget() {
  const [input, setInput] = useState("0.1");
  const num = Number(input);
  const valid = input.trim() !== "" && Number.isFinite(num);
  const bits = useMemo(() => {
    const dv = new DataView(new ArrayBuffer(4));
    dv.setFloat32(0, valid ? num : 0);
    return dv.getUint32(0);
  }, [num, valid]);
  const s = bits >>> 31;
  const e = (bits >>> 23) & 0xff;
  const m = bits & 0x7fffff;
  const stored = Math.fround(valid ? num : 0);
  const isNormal = e > 0 && e < 255;

  return (
    <Widget
      title="How a computer stores 0.1"
      subtitle="A 32-bit float is scientific notation in binary: a sign, an exponent (power of 2) and a fraction."
    >
      <input
        value={input}
        onChange={(ev) => setInput(ev.target.value)}
        className="w-full rounded-xl border border-line-2 bg-bg px-4 py-2 font-mono text-lg text-ink focus:border-on focus:outline-none"
        aria-label="Number"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {["0.1", "0.5", "3.75", "-2", "1000000", "0.3"].map((v) => (
          <Btn key={v} onClick={() => setInput(v)} active={input === v} className="text-xs">
            {v}
          </Btn>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto font-mono text-sm sm:text-base">
        <div className="flex w-max gap-1">
          <span className="rounded bg-pink-tint px-1.5 py-1 text-pink">{s}</span>
          <span className="rounded bg-amber-tint px-1.5 py-1 text-amber">{binStr(e, 8)}</span>
          <span className="rounded bg-cyan-tint px-1.5 py-1 text-cyan">{binStr(m, 23)}</span>
        </div>
        <div className="mt-1 flex w-max gap-1 text-[0.7rem] text-dim">
          <span className="px-1.5">sign</span>
          <span className="w-[8.5ch] px-1.5">exponent</span>
          <span className="px-1.5">fraction (23 bits)</span>
        </div>
      </div>
      {valid && isNormal ? (
        <div className="mt-3 text-sm">
          <TeX
            block
          >{`(-1)^{${s}} \\times \\left(1 + \\frac{${m}}{2^{23}}\\right) \\times 2^{${e} - 127} = ${stored.toPrecision(17).replace(/\.?0+$/, "")}`}</TeX>
        </div>
      ) : (
        <p className="mt-3 text-sm text-mute">
          {num === 0
            ? "Zero is a special pattern: all exponent bits are 0."
            : "This value is too big, too small or not a number for this demo."}
        </p>
      )}
      {valid && stored !== num && (
        <p className="mt-2 text-sm text-amber">
          {input} can't be stored exactly in binary (just as ⅓ = 0.333… never ends in decimal). The closest 32-bit value
          is {stored.toPrecision(17)}.
        </p>
      )}
    </Widget>
  );
}
