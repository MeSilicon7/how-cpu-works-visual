import { useState } from "react";

import { Gate, InputPin, Junction, OutputPin, Wire } from "~/components/circuit";
import { TeX } from "~/components/tex";
import { BitButton, Btn, cx, Pill, Slider, Widget } from "~/components/ui";
import { alu, aluOps, type AluOp } from "~/lib/alu";
import { binStr, toSigned } from "~/lib/bits";

/* ------------------------------------------------------------------ */
/* 2-to-1 multiplexer                                                    */
/* ------------------------------------------------------------------ */

export function MuxWidget() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [s, setS] = useState(false);
  const ns = !s;
  const g1 = a && ns;
  const g2 = b && s;
  const out = g1 || g2;
  return (
    <Widget
      title="The multiplexer: a digital railway switch"
      subtitle="The select bit S chooses which input reaches the output. S = 0 → A passes through. S = 1 → B passes through."
    >
      <div className="grid items-center gap-4 md:grid-cols-[1.5fr_1fr]">
        <svg viewBox="0 0 440 200" className="w-full" role="img" aria-label="2-to-1 multiplexer">
          <InputPin x={30} y={50} on={a} label="A" onToggle={() => setA((v) => !v)} />
          <InputPin x={30} y={115} on={s} label="S" onToggle={() => setS((v) => !v)} />
          <InputPin x={30} y={180} on={b} label="B" onToggle={() => setB((v) => !v)} />
          <Wire d="M45 50 H220" on={a} />
          <Wire d="M45 115 H90" on={s} />
          <Gate kind="NOT" x={90} y={95} out={ns} />
          <Wire d="M146 115 H170 V70 H220" on={ns} />
          <Wire d="M70 115 V160 H220" on={s} />
          <Junction x={70} y={115} on={s} />
          <Wire d="M45 180 H220" on={b} />
          <Gate kind="AND" x={220} y={40} out={g1} />
          <Gate kind="AND" x={220} y={150} out={g2} />
          <Wire d="M272 60 H300 V105 H330" on={g1} />
          <Wire d="M272 170 H300 V125 H330" on={g2} />
          <Gate kind="OR" x={330} y={95} out={out} />
          <Wire d="M386 115 H398" on={out} />
          <OutputPin x={414} y={115} on={out} label="out" />
        </svg>
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-line bg-bg/60 p-3 text-center">
            <TeX>{"\\text{out} = A\\cdot\\overline{S} + B\\cdot S"}</TeX>
          </div>
          <p className="text-mute">
            S = <span className="font-mono text-ink">{s ? 1 : 0}</span> → the{" "}
            <span className="text-ink">{s ? "bottom" : "top"}</span> AND gate is enabled, so the output copies{" "}
            <span className="font-mono text-on">{s ? "B" : "A"}</span> ={" "}
            <span className="font-mono text-on">{out ? 1 : 0}</span>. The other AND is forced to 0.
          </p>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 8-bit ALU                                                             */
/* ------------------------------------------------------------------ */

function ByteInput({
  name,
  value,
  onChange,
  color,
}: {
  name: string;
  value: number;
  onChange: (v: number) => void;
  color: "cyan" | "violet";
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-5 font-mono text-mute">{name}</span>
      {Array.from({ length: 8 }, (_, k) => {
        const i = 7 - k;
        return (
          <BitButton
            key={i}
            size="sm"
            color={color}
            on={!!((value >> i) & 1)}
            onClick={() => onChange(value ^ (1 << i))}
          />
        );
      })}
      <input
        type="number"
        min={0}
        max={255}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(255, Math.floor(Number(e.target.value) || 0))))}
        className="ml-1 w-16 rounded-md border border-line-2 bg-bg px-1.5 py-0.5 font-mono text-sm text-ink"
        aria-label={`${name} value`}
      />
    </div>
  );
}

export function AluWidget() {
  const [a, setA] = useState(100);
  const [b, setB] = useState(60);
  const [op, setOp] = useState<AluOp>("ADD");
  const sel = aluOps.find((o) => o.op === op)!;
  const r = alu(op, a, b);
  const usesB = !["NOT", "SHL", "SHR"].includes(op);

  return (
    <Widget
      title="An 8-bit ALU"
      subtitle="Every operation unit computes its answer at the same time. The 3-bit operation code drives a multiplexer that picks one answer."
      wide
    >
      <div className="space-y-2">
        <ByteInput name="A" value={a} onChange={setA} color="cyan" />
        <ByteInput name="B" value={b} onChange={setB} color="violet" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {aluOps.map((o) => {
          const res = alu(o.op, a, b);
          const active = o.op === op;
          return (
            <button
              key={o.op}
              type="button"
              onClick={() => setOp(o.op)}
              className={cx(
                "rounded-xl border p-2.5 text-left transition",
                active
                  ? "border-on bg-on/10 shadow-[0_0_20px_-6px_var(--color-on)]"
                  : "border-line-2 bg-bg/60 opacity-60 hover:opacity-100",
              )}
            >
              <div className="flex items-baseline justify-between">
                <span className={cx("font-semibold", active ? "text-on" : "text-ink")}>{o.op}</span>
                <span className="font-mono text-[0.7rem] text-amber">op {binStr(o.code, 3)}</span>
              </div>
              <div className="font-mono text-[0.7rem] text-mute">{o.symbol}</div>
              <div className={cx("mt-1 font-mono text-sm", active ? "text-ink" : "text-dim")}>
                {binStr(res.value, 8, 4)} <span className="text-dim">= {res.value}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-center gap-2 font-mono text-xs text-mute">
        <span>all 8 results</span>
        <span className="text-amber">→ multiplexer (op = {binStr(sel.code, 3)}) →</span>
        <span>one output</span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className="overflow-x-auto rounded-xl border border-line bg-bg/60 p-4 font-mono">
          <table className="mx-auto text-base tabular-nums sm:text-lg">
            <tbody>
              <tr>
                <td className="pr-4 text-right text-xs text-dim">A</td>
                <td className="tracking-[0.3em] text-cyan">{binStr(a, 8)}</td>
                <td className="pl-4 text-sm text-dim">{a}</td>
              </tr>
              {usesB && (
                <tr>
                  <td className="pr-4 text-right text-xs text-amber">{op}</td>
                  <td className="tracking-[0.3em] text-violet">{binStr(b, 8)}</td>
                  <td className="pl-4 text-sm text-dim">{b}</td>
                </tr>
              )}
              {!usesB && (
                <tr>
                  <td className="pr-4 text-right text-xs text-amber">{op}</td>
                  <td className="text-sm text-dim">{sel.describe}</td>
                  <td />
                </tr>
              )}
              <tr>
                <td />
                <td>
                  <div className="my-1 h-px bg-line-2" />
                </td>
                <td />
              </tr>
              <tr>
                <td className="pr-4 text-right text-xs text-on">out</td>
                <td className="font-bold tracking-[0.3em] text-on">{binStr(r.value, 8)}</td>
                <td className="pl-4 text-sm text-ink">
                  {r.value}
                  {r.n && <span className="text-dim"> / {toSigned(r.value, 8)}</span>}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-center text-xs text-mute">{sel.describe}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: "Z", name: "Zero", on: r.z, why: "result is 0" },
            {
              k: "C",
              name: "Carry",
              on: r.c,
              why:
                op === "SUB" ? "had to borrow (A < B)" : op.startsWith("SH") ? "a 1 fell off the end" : "answer > 255",
            },
            { k: "N", name: "Negative", on: r.n, why: "top bit is 1" },
            { k: "V", name: "Overflow", on: r.v, why: "signed answer didn't fit" },
          ].map((f) => (
            <div
              key={f.k}
              className={cx("rounded-xl border p-2.5", f.on ? "border-amber bg-amber/10" : "border-line-2 bg-bg/60")}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cx(
                    "flex h-6 w-6 items-center justify-center rounded-md font-mono text-sm font-bold",
                    f.on ? "bg-amber text-bg" : "bg-panel-3 text-dim",
                  )}
                >
                  {f.k}
                </span>
                <span className={cx("text-sm font-medium", f.on ? "text-amber" : "text-mute")}>{f.name}</span>
              </div>
              <div className="mt-1 text-[0.7rem] leading-tight text-dim">{f.why}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="self-center text-xs text-dim">Try:</span>
        <Btn className="text-xs" onClick={() => (setA(200), setB(100), setOp("ADD"))}>
          200 + 100 (overflow)
        </Btn>
        <Btn className="text-xs" onClick={() => (setA(42), setB(42), setOp("SUB"))}>
          42 − 42 (zero → equal!)
        </Btn>
        <Btn className="text-xs" onClick={() => (setA(5), setB(9), setOp("SUB"))}>
          5 − 9 (negative)
        </Btn>
        <Btn className="text-xs" onClick={() => (setA(13), setOp("SHL"))}>
          13 &lt;&lt; 1
        </Btn>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Shift-and-add multiplication                                          */
/* ------------------------------------------------------------------ */

export function ShiftAddMultiply() {
  const [a, setA] = useState(13);
  const [b, setB] = useState(11);
  const [step, setStep] = useState(4);
  const rows = Array.from({ length: 4 }, (_, i) => {
    const bit = (b >> i) & 1;
    return { i, bit, partial: bit ? a << i : 0 };
  });
  const total = rows.slice(0, step).reduce((s, r) => s + r.partial, 0);

  const set = (fn: () => void) => {
    fn();
    setStep(0);
  };

  return (
    <Widget
      title="Multiplying = shifting + adding"
      subtitle="For each 1-bit in B, add a copy of A shifted left by that bit's position. Each shift left is ×2."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="A" min={0} max={15} value={a} onChange={(v) => set(() => setA(v))} />
        <Slider label="B" min={0} max={15} value={b} onChange={(v) => set(() => setB(v))} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="mx-auto font-mono text-sm tabular-nums sm:text-base">
          <tbody>
            <tr>
              <td className="pr-3 text-right text-xs text-dim">A</td>
              <td className="text-right tracking-[0.25em] text-cyan">{binStr(a, 4)}</td>
              <td className="pl-3 text-xs text-dim">{a}</td>
            </tr>
            <tr className="border-b border-line-2">
              <td className="pr-3 text-right text-xs text-dim">× B</td>
              <td className="text-right tracking-[0.25em] text-violet">{binStr(b, 4)}</td>
              <td className="pl-3 text-xs text-dim">{b}</td>
            </tr>
            {rows.map((r) => {
              const shown = r.i < step;
              return (
                <tr key={r.i} className={cx("transition-opacity", shown ? "opacity-100" : "opacity-25")}>
                  <td className="pr-3 text-right text-xs text-dim">
                    bit {r.i} = <span className={r.bit ? "text-violet" : "text-dim"}>{r.bit}</span>
                  </td>
                  <td className={cx("text-right tracking-[0.25em]", r.bit ? "text-ink" : "text-dim")}>
                    {binStr(r.partial, 8)}
                  </td>
                  <td className="pl-3 text-xs whitespace-nowrap text-dim">
                    {r.bit ? `${a} × ${2 ** r.i} = ${r.partial}` : "skip (0)"}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-line-2">
              <td className="pr-3 text-right text-xs text-on">sum</td>
              <td className="text-right font-bold tracking-[0.25em] text-on">{binStr(total, 8)}</td>
              <td className="pl-3 text-sm text-on">{total}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn variant="primary" onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={step >= 4}>
          Next bit →
        </Btn>
        <Btn onClick={() => setStep(0)}>Reset</Btn>
        {step >= 4 && (
          <Pill tone="on">
            {a} × {b} = {a * b} ✓
          </Pill>
        )}
      </div>
    </Widget>
  );
}
