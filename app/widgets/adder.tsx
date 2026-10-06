import { useEffect, useMemo, useState } from "react";

import { Gate, InputPin, Junction, OutputPin, SignalTag, Wire } from "~/components/circuit";
import { TeX } from "~/components/tex";
import { BitButton, Btn, cx, DataTable, Pill, Slider, Widget } from "~/components/ui";
import { binStr } from "~/lib/bits";
import { useInterval } from "~/lib/hooks";

/* ------------------------------------------------------------------ */
/* Column addition by hand                                              */
/* ------------------------------------------------------------------ */

export function LongAddition({ bits = 8 }: { bits?: number }) {
  const max = 2 ** bits - 1;
  const [a, setA] = useState(45);
  const [b, setB] = useState(27);
  const [col, setCol] = useState(0); // how many columns (from the right) are done
  const [playing, setPlaying] = useState(false);

  const steps = useMemo(() => {
    const out: Array<{ a: number; b: number; cin: number; s: number; cout: number }> = [];
    let c = 0;
    for (let i = 0; i < bits; i++) {
      const ai = (a >> i) & 1;
      const bi = (b >> i) & 1;
      const t = ai + bi + c;
      out.push({ a: ai, b: bi, cin: c, s: t & 1, cout: t >> 1 });
      c = t >> 1;
    }
    return out;
  }, [a, b, bits]);

  useInterval(
    () =>
      setCol((c) => {
        if (c >= bits) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      }),
    playing ? 700 : null,
  );

  const reset = (na: number, nb: number) => {
    setA(na);
    setB(nb);
    setCol(0);
    setPlaying(false);
  };

  const finalCarry = steps[bits - 1].cout;
  const cur = col > 0 && col <= bits ? steps[col - 1] : null;
  const cells = (row: (i: number) => React.ReactNode, cls?: (i: number) => string) =>
    Array.from({ length: bits }, (_, k) => {
      const i = bits - 1 - k;
      return (
        <div key={i} className={cx("flex h-8 w-7 items-center justify-center sm:w-9", cls?.(i))}>
          {row(i)}
        </div>
      );
    });

  return (
    <Widget
      title="Adding binary by hand"
      subtitle="Same method you learned in school: go column by column from the right, and carry when a column overflows."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="A" min={0} max={max} value={a} onChange={(v) => reset(v, b)} />
        <Slider label="B" min={0} max={max} value={b} onChange={(v) => reset(a, v)} />
      </div>
      <div className="mt-5 overflow-x-auto">
        <div className="mx-auto w-max font-mono text-lg">
          <div className="flex items-center">
            <div className="w-20 pr-2 text-right text-xs text-pink">carry</div>
            <div className="flex h-8 w-7 sm:w-9" />
            {cells((i) => {
              // The carry produced by column i-1 is written above column i.
              if (i === 0) return null;
              return col >= i && steps[i - 1].cout ? <span className="text-sm text-pink">1</span> : null;
            })}
          </div>
          <div className="flex items-center">
            <div className="w-20 pr-2 text-right text-xs text-dim">A = {a}</div>
            <div className="flex h-8 w-7 sm:w-9" />
            {cells(
              (i) => steps[i].a,
              (i) => cx(col === i + 1 && "rounded-t-md bg-amber/15", steps[i].a ? "text-ink" : "text-dim"),
            )}
          </div>
          <div className="flex items-center">
            <div className="w-20 pr-2 text-right text-xs text-dim">B = {b}</div>
            <div className="flex h-8 w-7 items-center justify-center text-dim sm:w-9">+</div>
            {cells(
              (i) => steps[i].b,
              (i) => cx(col === i + 1 && "bg-amber/15", steps[i].b ? "text-ink" : "text-dim"),
            )}
          </div>
          <div className="ml-20 h-px bg-line-2" />
          <div className="flex items-center">
            <div className="w-20 pr-2 text-right text-xs text-on">sum</div>
            <div className="flex h-8 w-7 items-center justify-center sm:w-9">
              {col >= bits && finalCarry ? <span className="font-bold text-pink">1</span> : null}
            </div>
            {cells(
              (i) => (col > i ? steps[i].s : ""),
              (i) => cx(col === i + 1 && "rounded-b-md bg-amber/15", "font-bold text-on"),
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 min-h-12 rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-sm">
        {cur ? (
          <span>
            <span className="text-mute">
              Column {col} (the {2 ** (col - 1)}s place):{" "}
            </span>
            <span className="font-mono text-ink">
              {cur.a} + {cur.b}
              {cur.cin ? <span className="text-pink"> + carry 1</span> : null} = {cur.a + cur.b + cur.cin}
            </span>
            <span className="text-mute"> = </span>
            <span className="font-mono text-ink">{binStr(cur.a + cur.b + cur.cin, 2)}</span>
            <span className="text-mute"> in binary → write </span>
            <span className="font-mono font-bold text-on">{cur.s}</span>
            {cur.cout ? (
              <>
                <span className="text-mute">, carry </span>
                <span className="font-mono font-bold text-pink">1</span>
              </>
            ) : (
              <span className="text-mute">, no carry</span>
            )}
            {col === bits && (
              <span className="text-mute">
                . Done: {a} + {b} = <span className="font-mono text-on">{a + b}</span>
              </span>
            )}
          </span>
        ) : (
          <span className="text-mute">Press Step to add the rightmost column.</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="primary" onClick={() => setCol((c) => Math.min(bits, c + 1))} disabled={col >= bits}>
          Step →
        </Btn>
        <Btn onClick={() => (col >= bits ? (setCol(0), setPlaying(true)) : setPlaying((p) => !p))}>
          {playing ? "⏸ Pause" : "▶ Play"}
        </Btn>
        <Btn onClick={() => reset(a, b)}>Reset</Btn>
        <Btn onClick={() => reset(255, 1)} className="ml-auto">
          Try 255 + 1
        </Btn>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Half adder                                                            */
/* ------------------------------------------------------------------ */

export function HalfAdder() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(true);
  const s = a !== b;
  const c = a && b;
  const row = (a ? 2 : 0) + (b ? 1 : 0);
  return (
    <Widget
      title="The half adder: XOR + AND"
      subtitle="Compare the truth table of 1-bit addition with the gates from the last chapter. The sum column is XOR, the carry column is AND."
    >
      <div className="grid items-center gap-5 md:grid-cols-[1.2fr_1fr]">
        <svg viewBox="0 0 330 170" className="w-full" role="img" aria-label="Half adder circuit">
          <InputPin x={30} y={40} on={a} label="A" onToggle={() => setA((v) => !v)} />
          <InputPin x={30} y={130} on={b} label="B" onToggle={() => setB((v) => !v)} />
          <Wire d="M45 40 H150" on={a} />
          <Wire d="M80 40 V110 H150" on={a} />
          <Wire d="M45 130 H150" on={b} />
          <Wire d="M110 130 V60 H150" on={b} />
          <Junction x={80} y={40} on={a} />
          <Junction x={110} y={130} on={b} />
          <Gate kind="XOR" x={150} y={30} out={s} />
          <Gate kind="AND" x={150} y={100} out={c} />
          <Wire d="M206 50 H270" on={s} />
          <Wire d="M202 120 H270" on={c} />
          <OutputPin x={286} y={50} on={s} label="Sum" />
          <OutputPin x={286} y={120} on={c} label="Carry" />
        </svg>
        <DataTable
          head={["A", "B", "A+B", "Carry", "Sum"]}
          highlight={row}
          rows={[0, 1, 2, 3].map((r) => {
            const ra = r >> 1;
            const rb = r & 1;
            return [ra, rb, ra + rb, ra & rb, ra ^ rb];
          })}
        />
      </div>
      <p className="mt-3 text-center text-sm text-mute">
        {a ? 1 : 0} + {b ? 1 : 0} = <span className="font-mono text-ink">{(a ? 1 : 0) + (b ? 1 : 0)}</span> ={" "}
        <span className="font-mono text-ink">
          <span className={c ? "text-pink" : "text-dim"}>{c ? 1 : 0}</span>
          <span className={s ? "text-on" : "text-dim"}>{s ? 1 : 0}</span>
        </span>{" "}
        in binary (carry, sum)
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Full adder                                                            */
/* ------------------------------------------------------------------ */

export function FullAdder() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [cin, setCin] = useState(true);
  const p = a !== b;
  const g = a && b;
  const s = p !== cin;
  const pc = p && cin;
  const cout = g || pc;
  const total = +a + +b + +cin;
  return (
    <Widget
      title="The full adder: three bits in, two bits out"
      subtitle="A middle column has to add A, B and the carry coming in from the right. Two half adders and an OR gate do it."
      wide
    >
      <div className="scroll-thin overflow-x-auto">
        <svg viewBox="0 0 540 270" className="w-full min-w-[500px]" role="img" aria-label="Full adder circuit">
          <InputPin x={30} y={40} on={a} label="A" onToggle={() => setA((v) => !v)} />
          <InputPin x={30} y={120} on={b} label="B" onToggle={() => setB((v) => !v)} />
          <InputPin x={30} y={240} on={cin} label="Carry in" onToggle={() => setCin((v) => !v)} />
          {/* first half adder */}
          <Wire d="M45 40 H140" on={a} />
          <Wire d="M80 40 V100 H140" on={a} />
          <Wire d="M45 120 H140" on={b} />
          <Wire d="M100 120 V60 H140" on={b} />
          <Junction x={80} y={40} on={a} />
          <Junction x={100} y={120} on={b} />
          <Gate kind="XOR" x={140} y={30} out={p} />
          <Gate kind="AND" x={140} y={90} out={g} />
          {/* second half adder */}
          <Wire d="M196 50 H250 V160 H300" on={p} />
          <Wire d="M250 160 V220 H300" on={p} />
          <Junction x={250} y={160} on={p} />
          <Wire d="M45 240 H300" on={cin} />
          <Wire d="M270 240 V180 H300" on={cin} />
          <Junction x={270} y={240} on={cin} />
          <Gate kind="XOR" x={300} y={150} out={s} />
          <Gate kind="AND" x={300} y={210} out={pc} />
          {/* outputs */}
          <Wire d="M356 170 H366" on={s} />
          <OutputPin x={380} y={170} on={s} label="Sum" />
          <Wire d="M192 110 H430" on={g} />
          <Wire d="M352 230 H405 V130 H430" on={pc} />
          <Gate kind="OR" x={430} y={100} out={cout} />
          <Wire d="M486 120 H496" on={cout} />
          <OutputPin x={512} y={120} on={cout} label="Carry out" />
          <SignalTag x={222} y={50} on={p} />
          <SignalTag x={300} y={110} on={g} />
          <SignalTag x={380} y={230} on={pc} />
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm">
        <span className="font-mono text-ink">
          {+a} + {+b} + {+cin} = {total} = <span className={cout ? "text-pink" : "text-dim"}>{+cout}</span>
          <span className={s ? "text-on" : "text-dim"}>{+s}</span>
          <span className="text-dim">₂</span>
        </span>
        <Pill tone="on">Sum = A ⊕ B ⊕ Cin</Pill>
        <Pill tone="pink">Carry = A·B + Cin·(A ⊕ B)</Pill>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Ripple-carry adder                                                    */
/* ------------------------------------------------------------------ */

const N = 4;

export function RippleAdder() {
  const [a, setA] = useState(11);
  const [b, setB] = useState(7);
  const [settled, setSettled] = useState(N);

  // Restart the ripple whenever the inputs change.
  useEffect(() => setSettled(0), [a, b]);
  useInterval(() => setSettled((s) => s + 1), settled < N ? 550 : null);

  const stages = useMemo(() => {
    const out: Array<{ a: number; b: number; cin: number; s: number; cout: number }> = [];
    let c = 0;
    for (let i = 0; i < N; i++) {
      const ai = (a >> i) & 1;
      const bi = (b >> i) & 1;
      const t = ai + bi + c;
      out.push({ a: ai, b: bi, cin: c, s: t & 1, cout: t >> 1 });
      c = t >> 1;
    }
    return out;
  }, [a, b]);

  const sum = a + b;
  const done = settled >= N;

  return (
    <Widget
      title="A 4-bit ripple-carry adder"
      subtitle="Four full adders in a row. Each one's carry-out feeds the next one's carry-in, so the carry “ripples” from right to left."
      wide
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { name: "A", v: a, set: setA, color: "cyan" as const },
          { name: "B", v: b, set: setB, color: "violet" as const },
        ].map((inp) => (
          <div key={inp.name} className="flex items-center gap-2">
            <span className="w-6 font-mono text-mute">{inp.name}</span>
            {Array.from({ length: N }, (_, k) => {
              const i = N - 1 - k;
              return (
                <BitButton
                  key={i}
                  on={!!((inp.v >> i) & 1)}
                  color={inp.color}
                  onClick={() => inp.set(inp.v ^ (1 << i))}
                  size="sm"
                />
              );
            })}
            <span className="ml-2 font-mono text-ink">= {inp.v}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <div className="flex w-max min-w-full items-stretch justify-center gap-0">
          {/* final carry out */}
          <div className="flex w-14 flex-col items-center justify-center">
            <div className="font-mono text-[0.65rem] text-dim">overflow</div>
            <div
              className={cx(
                "mt-1 flex h-9 w-9 items-center justify-center rounded-lg border font-mono font-bold",
                done && stages[N - 1].cout ? "border-pink bg-pink/20 text-pink" : "border-line-2 text-dim",
              )}
            >
              {done ? stages[N - 1].cout : "?"}
            </div>
          </div>
          {Array.from({ length: N }, (_, k) => {
            const i = N - 1 - k;
            const st = stages[i];
            const ready = settled > i;
            const active = settled === i && !done;
            return (
              <div key={i} className="flex items-center">
                {/* carry arrow from this stage to the left */}
                <div className="flex w-10 flex-col items-center">
                  <span className={cx("font-mono text-[0.65rem]", ready && st.cout ? "text-pink" : "text-dim")}>
                    {ready ? `c=${st.cout}` : "c=?"}
                  </span>
                  <span className={cx("font-mono text-lg leading-none", ready && st.cout ? "text-pink" : "text-dim")}>
                    ←
                  </span>
                </div>
                <div
                  className={cx(
                    "flex w-24 flex-col items-center rounded-xl border px-2 py-2 transition-all",
                    active
                      ? "border-amber bg-amber/10 shadow-[0_0_20px_-6px_var(--color-amber)]"
                      : ready
                        ? "border-on/50 bg-on/5"
                        : "border-line-2 bg-bg/60",
                  )}
                >
                  <div className="flex gap-2 font-mono text-sm">
                    <span className={st.a ? "text-cyan" : "text-dim"}>{st.a}</span>
                    <span className="text-dim">+</span>
                    <span className={st.b ? "text-violet" : "text-dim"}>{st.b}</span>
                  </div>
                  <div className="my-1 font-mono text-[0.65rem] tracking-wider text-mute uppercase">full adder {i}</div>
                  <div className={cx("font-mono text-xs", ready ? "text-ink" : "text-dim")}>
                    {active ? "computing…" : ready ? `${st.a}+${st.b}+${st.cin}` : "waiting"}
                  </div>
                  <div
                    className={cx(
                      "mt-1.5 flex h-8 w-8 items-center justify-center rounded-lg border font-mono font-bold",
                      ready
                        ? st.s
                          ? "border-on bg-on/20 text-on"
                          : "border-line-2 text-ink"
                        : "border-line-2 text-dim",
                    )}
                  >
                    {ready ? st.s : "?"}
                  </div>
                  <div className="mt-0.5 font-mono text-[0.6rem] text-dim">
                    S{i} ({2 ** i}s)
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex w-12 flex-col items-center justify-center">
            <span className="font-mono text-[0.65rem] text-dim">c=0</span>
            <span className="font-mono text-lg leading-none text-dim">←</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Btn onClick={() => setSettled(0)}>↻ Replay ripple</Btn>
        <div className="font-mono text-sm text-mute">
          {done ? (
            <>
              {a} + {b} = <span className="text-ink">{binStr(sum, 5)}</span>₂ = <span className="text-on">{sum}</span>
              {sum > 15 && (
                <span className="text-pink">
                  {" "}
                  (the 5th bit is the carry out; a 4-bit register would keep only {sum & 15})
                </span>
              )}
            </>
          ) : (
            <>
              Carry is rippling… stage {settled} of {N}
            </>
          )}
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Subtraction with the same adder                                      */
/* ------------------------------------------------------------------ */

export function SubtractWidget() {
  const [a, setA] = useState(9);
  const [b, setB] = useState(3);
  const nb = ~b & 15;
  const raw = a + nb + 1;
  const result = raw & 15;
  const signed = result & 8 ? result - 16 : result;
  return (
    <Widget
      title="Subtracting with an adder"
      subtitle="A − B = A + (flip B) + 1. Flip B with XOR gates, and set the first carry-in to 1."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="A" min={0} max={15} value={a} onChange={setA} />
        <Slider label="B" min={0} max={15} value={b} onChange={setB} />
      </div>
      <DataTable
        className="mt-3"
        align="left"
        head={["", "bits", "meaning"]}
        rows={[
          ["A", binStr(a, 4), a],
          ["flip B", binStr(nb, 4), `${b} with every bit inverted`],
          ["carry-in", "0001", "the +1"],
          [
            "sum",
            <span>
              {raw > 15 && <span className="text-pink line-through">1</span>}
              <span className="text-on">{binStr(result, 4)}</span>
            </span>,
            <span className="text-on">
              {a} − {b} = {a - b}
              {a - b < 0 ? ` (reads as ${signed} in two's complement)` : ""}
            </span>,
          ],
        ]}
      />
      <p className="mt-2 text-sm text-mute">
        <TeX>{"\\overline{B} + 1 = 16 - B"}</TeX>, and the 16 overflows away, leaving <TeX>{"A - B"}</TeX>.
      </p>
    </Widget>
  );
}
