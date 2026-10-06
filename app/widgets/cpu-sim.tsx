import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Btn, cx, Pill, Segmented, Slider, Widget } from "~/components/ui";
import { binStr } from "~/lib/bits";
import {
  allSignals,
  disassemble,
  findProgram,
  initCpu,
  microStep,
  opByCode,
  programs,
  signalInfo,
  stackSignals,
  stepInstruction,
  type CpuState,
  type Program,
  type Unit,
} from "~/lib/cpu";
import { useInterval } from "~/lib/hooks";

type Role = "src" | "dst" | null;

function Box({
  unit,
  title,
  role,
  children,
  className,
  boxRef,
  badge,
}: {
  unit: Unit;
  title: ReactNode;
  role: Role;
  children: ReactNode;
  className?: string;
  boxRef?: (el: HTMLDivElement | null) => void;
  badge?: ReactNode;
}) {
  return (
    <div
      ref={boxRef}
      data-unit={unit}
      className={cx(
        "relative rounded-md border bg-panel px-3 py-2 transition-colors duration-300",
        role === "src" && "border-cyan halo-cyan",
        role === "dst" && "border-on halo-on",
        !role && "border-line-2",
        className,
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[0.7rem] font-semibold tracking-wider text-mute uppercase">{title}</span>
        {role === "src" && <Pill tone="cyan">→ bus</Pill>}
        {role === "dst" && <Pill tone="on">bus →</Pill>}
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function BitsView({ value, width, split, dim }: { value: number; width: number; split?: number; dim?: boolean }) {
  return (
    <div className="flex gap-[3px] font-mono">
      {Array.from({ length: width }, (_, k) => {
        const i = width - 1 - k;
        const on = (value >> i) & 1;
        return (
          <span
            key={i}
            className={cx(
              "flex h-6 w-5 items-center justify-center rounded text-xs font-bold",
              on ? (dim ? "bg-on/10 text-on" : "bg-on-tint text-on") : "bg-panel-2 text-dim",
              split !== undefined && k === split && "ml-1.5",
            )}
          >
            {on}
          </span>
        );
      })}
    </div>
  );
}

const phaseOrder = [
  { key: "fetch", label: "Fetch", color: "text-cyan border-cyan bg-cyan-tint" },
  {
    key: "decode",
    label: "Decode",
    color: "text-amber border-amber bg-amber/10",
  },
  { key: "execute", label: "Execute", color: "text-on border-on bg-on/10" },
] as const;

interface Flight {
  key: number;
  value: number | null;
  xs: number[];
  ys: number[];
}

export function CpuSim({
  customRam,
  programIds,
  initial,
  title = "SAP-8: a complete computer you can step through",
  subtitle = "Each press of Step is one tick of the clock. Watch the highlighted parts: cyan puts a value on the bus, green takes it in.",
}: {
  customRam?: number[] | null;
  /** Which programs to offer, in order (default: the CPU chapter's set). */
  programIds?: string[];
  /** The program loaded first. */
  initial?: string;
  title?: string;
  subtitle?: string;
}) {
  const idsKey = programIds?.join(",");
  const allPrograms: Program[] = useMemo(() => {
    const base = programIds ? programIds.map((id) => findProgram(id)).filter((p): p is Program => !!p) : programs;
    return customRam
      ? [
          {
            id: "custom",
            name: "Your program",
            code: "(assembled in the Machine Code chapter)",
            explain: "This is the program you wrote. Step through it and see if it does what you expected!",
            ram: customRam,
            data: [],
          },
          ...base,
        ]
      : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customRam, idsKey]);
  const [progId, setProgId] = useState(() =>
    initial && allPrograms.some((p) => p.id === initial) ? initial : allPrograms[0].id,
  );
  const prog = allPrograms.find((p) => p.id === progId) ?? allPrograms[0];
  const [hist, setHist] = useState<CpuState[]>(() => [initCpu(prog.ram)]);
  const s = hist[hist.length - 1];
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(3);

  const load = (id: string) => {
    const p = allPrograms.find((x) => x.id === id)!;
    setProgId(id);
    setHist([initCpu(p.ram)]);
    setRunning(false);
  };
  const push = (next: CpuState) => setHist((h) => [...h.slice(-400), next]);
  const tick = () => push(microStep(s));
  const instr = () => push(stepInstruction(s));
  const back = () => setHist((h) => (h.length > 1 ? h.slice(0, -1) : h));
  const reset = () => {
    setHist([initCpu(prog.ram)]);
    setRunning(false);
  };
  const toggleBit = (addr: number, bit: number) => {
    const ram = s.ram.slice();
    ram[addr] ^= 1 << bit;
    push({ ...s, ram });
  };

  useInterval(
    () => {
      if (s.halted) {
        setRunning(false);
        return;
      }
      push(microStep(s));
    },
    running ? 1000 / speed : null,
  );

  // ---- flying bus value ----
  const gridRef = useRef<HTMLDivElement>(null);
  const busRef = useRef<HTMLDivElement>(null);
  const boxes = useRef(new Map<string, HTMLElement>());
  const reg = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) boxes.current.set(key, el);
      else boxes.current.delete(key);
    },
    [],
  );
  const [flight, setFlight] = useState<Flight | null>(null);

  useEffect(() => {
    const l = s.last;
    if (!l.src || !l.dst.length || l.bus === null || !gridRef.current) {
      setFlight(null);
      return;
    }
    const grid = gridRef.current.getBoundingClientRect();
    const keyFor = (u: Unit) => (u === "ram" ? `ram-${s.mar}` : u);
    const from = boxes.current.get(keyFor(l.src));
    const to = boxes.current.get(keyFor(l.dst[0]));
    if (!from || !to) return;
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const ax = a.left + a.width / 2 - grid.left;
    const ay = a.top + a.height / 2 - grid.top;
    const bx = b.left + b.width / 2 - grid.left;
    const by = b.top + b.height / 2 - grid.top;
    const bus = busRef.current?.getBoundingClientRect();
    if (bus && bus.width > 0) {
      const mx = bus.left + bus.width / 2 - grid.left;
      setFlight({
        key: s.ticks,
        value: l.bus,
        xs: [ax, mx, mx, bx],
        ys: [ay, ay, by, by],
      });
    } else {
      setFlight({ key: s.ticks, value: l.bus, xs: [ax, bx], ys: [ay, by] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.ticks, s.last]);

  const role = (u: Unit): Role => (s.last.src === u ? "src" : s.last.dst.includes(u) ? "dst" : null);
  const op = opByCode.get(s.ir >> 4);
  const sub = s.last.signals.includes("SU") || op?.name === "SUB";
  const aluRaw = sub ? s.a - s.b : s.a + s.b;
  const flightDur = Math.min(0.7, 0.9 / speed);
  // The stack pointer only appears where a chapter uses the stack (or a program moves SP).
  const showStack = allPrograms.some((p) => p.stack) || s.sp !== 15;
  const signals = showStack ? allSignals : allSignals.filter((sig) => !stackSignals.includes(sig));

  // Highlight the micro-step position in the current instruction
  const stepLabels = ["fetch 1", "fetch 2", "decode", "exec 1", "exec 2", "exec 3"];
  const doneT = s.last.t;

  return (
    <Widget title={title} subtitle={subtitle} wide>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          size="sm"
          value={progId}
          onChange={load}
          options={allPrograms.map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[auto_1fr]">
        <pre className="scroll-thin overflow-x-auto rounded-md border border-line bg-panel-2 px-3 py-2 font-mono text-xs leading-relaxed text-ink">
          {prog.code}
        </pre>
        <p className="self-center text-sm text-mute">{prog.explain}</p>
      </div>

      {/* narration */}
      <div className="mt-4 rounded-xl border border-line-2 bg-panel-2/60 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {phaseOrder.map((p) => (
            <span
              key={p.key}
              className={cx(
                "rounded-md border px-2 py-0.5 font-mono text-[0.7rem] font-bold tracking-wider uppercase transition",
                s.last.phase === p.key ? p.color : "border-line-2 text-dim",
              )}
            >
              {p.label}
            </span>
          ))}
          {s.halted && <Pill tone="pink">HALTED</Pill>}
          <span className="ml-auto font-mono text-[0.7rem] text-dim">
            tick {s.ticks} · {s.instructions} instructions done
          </span>
        </div>
        <div className="mt-2 font-semibold text-ink">{s.last.title}</div>
        <p className="mt-0.5 min-h-[3em] text-sm leading-relaxed text-body">{s.last.note}</p>
      </div>

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn variant="primary" onClick={tick} disabled={s.halted || running}>
          Step (1 tick)
        </Btn>
        <Btn onClick={instr} disabled={s.halted || running}>
          Step instruction
        </Btn>
        <Btn onClick={() => setRunning((r) => !r)} disabled={s.halted}>
          {running ? "⏸ Pause" : "▶ Run"}
        </Btn>
        <Btn onClick={back} disabled={hist.length < 2 || running}>
          ← Back
        </Btn>
        <Btn onClick={reset}>Reset</Btn>
        <Slider
          className="ml-auto w-40"
          label="Speed"
          min={1}
          max={20}
          value={speed}
          onChange={setSpeed}
          format={(v) => `${v} ticks/s`}
        />
      </div>

      {/* the machine */}
      <div ref={gridRef} className="relative mt-4 grid gap-3 lg:grid-cols-[1fr_56px_1fr]">
        {/* LEFT: PC, MAR, RAM */}
        <div className="space-y-3">
          <div className={cx("grid grid-cols-2 gap-3", showStack && "sm:grid-cols-3")}>
            <Box unit="pc" title="Program counter" role={role("pc")} boxRef={reg("pc")}>
              <BitsView value={s.pc} width={4} />
              <div className="mt-1 font-mono text-xs text-mute">next address: {s.pc}</div>
            </Box>
            <Box unit="mar" title="Memory address" role={role("mar")} boxRef={reg("mar")}>
              <BitsView value={s.mar} width={4} />
              <div className="mt-1 font-mono text-xs text-mute">pointing at: {s.mar}</div>
            </Box>
            {showStack && (
              <Box unit="sp" title="Stack pointer" role={role("sp")} boxRef={reg("sp")}>
                <BitsView value={s.sp} width={4} />
                <div className="mt-1 font-mono text-xs text-mute">next free: {s.sp}</div>
              </Box>
            )}
          </div>
          <Box
            unit="ram"
            title="RAM · 16 bytes"
            role={role("ram")}
            badge={<span className="text-[0.6875rem] text-dim">click bits to edit</span>}
          >
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full font-mono text-xs tabular-nums">
                <tbody>
                  {s.ram.map((byte, addr) => {
                    const isMar = addr === s.mar;
                    const isPc = addr === s.pc;
                    const onStack = showStack && addr > s.sp;
                    const isData = prog.data.includes(addr) || onStack;
                    return (
                      <tr
                        key={addr}
                        ref={reg(`ram-${addr}`)}
                        className={cx(
                          "transition-colors",
                          isMar && "bg-violet-tint",
                          isMar && role("ram") === "src" && "bg-cyan-tint",
                          isMar && role("ram") === "dst" && "bg-on-tint",
                        )}
                      >
                        <td
                          className={cx(
                            "w-6 py-[1px] pl-1 text-right text-pink",
                            onStack && "border-l-2 border-violet",
                          )}
                        >
                          {isPc ? "▶" : ""}
                        </td>
                        {showStack && (
                          <td className="w-6 py-[1px] text-center text-[0.6875rem] font-bold text-violet">
                            {addr === s.sp ? "SP" : ""}
                          </td>
                        )}
                        <td className="w-10 px-1 py-[1px] text-dim">{binStr(addr, 4)}</td>
                        <td className="w-5 py-[1px] pr-2 text-right text-mute">{addr}</td>
                        <td className="py-[1px]">
                          <span className="inline-flex gap-[2px]">
                            {Array.from({ length: 8 }, (_, k) => {
                              const bit = 7 - k;
                              const on = (byte >> bit) & 1;
                              return (
                                <button
                                  key={bit}
                                  type="button"
                                  onClick={() => toggleBit(addr, bit)}
                                  disabled={running}
                                  className={cx(
                                    "h-[18px] w-[14px] rounded-[3px] text-[0.6875rem] leading-none font-bold transition hover:ring-1 hover:ring-dim",
                                    on
                                      ? isData
                                        ? "bg-amber-tint text-amber"
                                        : "bg-on-tint text-on"
                                      : "bg-panel-2 text-dim",
                                    k === 4 && "ml-1",
                                  )}
                                  aria-label={`Toggle bit ${bit} of address ${addr}`}
                                >
                                  {on}
                                </button>
                              );
                            })}
                          </span>
                        </td>
                        <td className={cx("px-2 py-[1px] whitespace-nowrap", isData ? "text-amber" : "text-ink")}>
                          {isData ? byte : disassemble(byte)}
                        </td>
                        <td className="hidden py-[1px] pr-1 whitespace-nowrap text-dim sm:table-cell">
                          {showStack && addr === s.sp ? (
                            <span className="font-semibold text-violet">◀ next free stack slot</span>
                          ) : onStack ? (
                            <span className="text-violet">on the stack</span>
                          ) : (
                            (prog.comments?.[addr] ?? "")
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-3 text-[0.6875rem] text-dim">
              <span>
                <span className="text-pink">▶</span> program counter
              </span>
              <span>
                <span className="text-violet">▇</span> address register
              </span>
              <span>
                <span className="text-on">green</span> instruction · <span className="text-amber">amber</span> data
              </span>
              {showStack && (
                <span>
                  <span className="text-violet">▏</span> stack (fills from address 15 toward 0)
                </span>
              )}
            </div>
          </Box>
        </div>

        {/* BUS */}
        <div
          ref={busRef}
          className="relative hidden flex-col items-center rounded-xl border border-line-2 bg-bg/60 py-2 lg:flex"
        >
          <span className="font-mono text-[0.6875rem] tracking-widest text-dim">BUS</span>
          <div
            className={cx(
              "my-2 w-2 flex-1 rounded-full transition-all",
              s.last.bus !== null ? "bg-cyan halo-cyan" : "bg-line-2",
            )}
          />
          <div className="flex flex-col gap-[2px] font-mono">
            {Array.from({ length: 8 }, (_, k) => {
              const on = s.last.bus !== null && (s.last.bus >> (7 - k)) & 1;
              return (
                <span
                  key={k}
                  className={cx(
                    "flex h-4 w-6 items-center justify-center rounded text-[0.6875rem] font-bold",
                    on ? "bg-cyan-tint text-cyan" : "bg-panel-2 text-dim",
                  )}
                >
                  {s.last.bus === null ? "·" : on ? 1 : 0}
                </span>
              );
            })}
          </div>
          <div
            className={cx(
              "my-2 w-2 flex-1 rounded-full transition-all",
              s.last.bus !== null ? "bg-cyan halo-cyan" : "bg-line-2",
            )}
          />
        </div>

        {/* RIGHT: IR, control, A, ALU, B, flags, out */}
        <div className="space-y-3">
          <Box unit="ir" title="Instruction register" role={role("ir")} boxRef={reg("ir")}>
            <div className="flex flex-wrap items-center gap-3">
              <BitsView value={s.ir} width={8} split={4} />
              <span className="font-mono text-sm text-ink">{s.ticks ? disassemble(s.ir) : "—"}</span>
            </div>
            <div className="mt-1 flex gap-6 font-mono text-[0.6875rem] text-dim">
              <span>opcode = {binStr(s.ir >> 4, 4)}</span>
              <span>operand = {s.ir & 15}</span>
            </div>
          </Box>
          <Box unit="control" title="Control unit" role={role("control")} boxRef={reg("control")}>
            <div className="mb-1.5 flex flex-wrap gap-1">
              {stepLabels.map((l, i) => (
                <span
                  key={l}
                  className={cx(
                    "rounded px-1.5 py-0.5 font-mono text-[0.6875rem]",
                    i === doneT ? "bg-amber text-bg" : i < doneT ? "bg-amber-tint text-amber" : "bg-panel-2 text-dim",
                  )}
                >
                  {l}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {signals.map((sig) => {
                const on = s.last.signals.includes(sig);
                return (
                  <span
                    key={sig}
                    title={signalInfo[sig]}
                    className={cx(
                      "rounded border px-1.5 py-0.5 font-mono text-[0.6875rem] font-bold transition",
                      on ? "border-amber bg-amber-tint text-amber halo-amber" : "border-line-2 text-dim",
                    )}
                  >
                    {sig}
                  </span>
                );
              })}
            </div>
            <div className="mt-1 min-h-[1.2em] text-[0.7rem] text-mute">
              {s.last.signals.map((sig) => signalInfo[sig]).join(" · ")}
            </div>
          </Box>
          <div className="grid grid-cols-2 gap-3">
            <Box unit="a" title="Register A" role={role("a")} boxRef={reg("a")}>
              <BitsView value={s.a} width={8} />
              <div className="mt-1 font-mono text-xs text-mute">= {s.a}</div>
            </Box>
            <Box unit="b" title="Register B" role={role("b")} boxRef={reg("b")}>
              <BitsView value={s.b} width={8} />
              <div className="mt-1 font-mono text-xs text-mute">= {s.b}</div>
            </Box>
          </div>
          <div className="grid grid-cols-[1.4fr_1fr] gap-3">
            <Box unit="alu" title="ALU" role={role("alu")} boxRef={reg("alu")}>
              <BitsView value={aluRaw & 255} width={8} dim={role("alu") !== "src"} />
              <div className="mt-1 font-mono text-xs text-mute">
                A {sub ? "−" : "+"} B = {aluRaw}
                {(aluRaw > 255 || aluRaw < 0) && <span className="text-pink"> → {aluRaw & 255}</span>}
              </div>
            </Box>
            <Box unit="flags" title="Flags" role={role("flags")} boxRef={reg("flags")}>
              <div className="flex gap-2">
                {[
                  { k: "C", on: s.c },
                  { k: "Z", on: s.z },
                ].map((f) => (
                  <span
                    key={f.k}
                    className={cx(
                      "flex h-7 w-9 items-center justify-center rounded-md font-mono text-sm font-bold",
                      f.on ? "bg-amber text-bg" : "bg-panel-2 text-dim",
                    )}
                  >
                    {f.k}={f.on ? 1 : 0}
                  </span>
                ))}
              </div>
            </Box>
          </div>
          <Box unit="out" title="Output display" role={role("out")} boxRef={reg("out")}>
            <div className="flex items-end gap-4">
              <div
                className={cx(
                  "min-w-[3ch] font-mono text-4xl font-bold tabular-nums",
                  s.out === null ? "text-dim" : "text-on drop-halo-on",
                )}
              >
                {s.out ?? "–"}
              </div>
              <div className="scroll-thin flex-1 overflow-x-auto pb-1 font-mono text-xs text-mute">
                {s.outputs.length > 0 ? s.outputs.join(", ") : "nothing printed yet"}
              </div>
            </div>
          </Box>
        </div>

        {flight && (
          <motion.div
            key={flight.key}
            className="pointer-events-none absolute top-0 left-0 z-10 rounded-md border border-cyan bg-bg px-1.5 py-0.5 font-mono text-xs font-bold text-cyan halo-cyan"
            initial={{ x: flight.xs[0], y: flight.ys[0], opacity: 0 }}
            animate={{ x: flight.xs, y: flight.ys, opacity: [0, 1, 1, 0.9] }}
            transition={{ duration: flightDur, ease: "easeInOut" }}
            style={{ translateX: "-50%", translateY: "-50%" }}
          >
            {flight.value !== null ? binStr(flight.value, 8) : ""}
          </motion.div>
        )}
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* One instruction byte, decoded                                         */
/* ------------------------------------------------------------------ */

export function InstructionDecoder() {
  const [byte, setByte] = useState(0x2f);
  const op = opByCode.get(byte >> 4);
  return (
    <Widget
      title="Decode an instruction byte"
      subtitle="The left 4 bits pick the operation. The right 4 bits are the operand: an address or a small number."
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {Array.from({ length: 8 }, (_, k) => {
          const bit = 7 - k;
          const on = (byte >> bit) & 1;
          return (
            <button
              key={bit}
              type="button"
              onClick={() => setByte((b) => b ^ (1 << bit))}
              className={cx(
                "h-12 w-10 rounded-lg border font-mono text-xl font-bold transition",
                k < 4
                  ? on
                    ? "border-amber bg-amber-tint text-amber"
                    : "border-amber/30 bg-bg text-dim"
                  : on
                    ? "border-cyan bg-cyan-tint text-cyan"
                    : "border-cyan/30 bg-bg text-dim",
                k === 4 && "ml-3",
              )}
            >
              {on}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-center gap-20 font-mono text-xs">
        <span className="text-amber">opcode</span>
        <span className="text-cyan">operand</span>
      </div>
      <div className="mt-4 rounded-xl border border-line bg-bg/60 p-3 text-center">
        <div className="font-mono text-2xl text-ink">{disassemble(byte)}</div>
        <div className="mt-1 text-sm text-mute">
          {op ? op.describe.replace(/\bn\b/g, String(byte & 15)) : "Not an instruction in our CPU."}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {opByCode.size > 0 &&
          [...opByCode.values()]
            .filter((o) => !o.stack)
            .map((o) => (
              <button
                key={o.name}
                type="button"
                onClick={() => setByte((o.code << 4) | (byte & 15))}
                className={cx(
                  "rounded-lg border px-2 py-1 text-left font-mono text-xs transition",
                  op?.name === o.name
                    ? "border-amber bg-amber/10 text-amber"
                    : "border-line-2 text-mute hover:text-ink",
                )}
              >
                <span className="text-dim">{binStr(o.code, 4)}</span> {o.name}
                <div className="truncate text-[0.6875rem] text-dim">{o.short}</div>
              </button>
            ))}
      </div>
    </Widget>
  );
}
