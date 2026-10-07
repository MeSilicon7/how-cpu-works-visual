/*
 * Widgets for the chapter "The Operating System".
 *
 * Every widget is deterministic: no Math.random()/Date.now() during render.
 * Movement (registers flying between the CPU and the process table, bytes
 * flying from the SSD into RAM) uses motion's shared-layout animation, which
 * MotionConfig turns off when the reader asks for reduced motion.
 */
import { motion, MotionConfig } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { BitButton, Btn, cx, Segmented, Slider, Stat, Widget } from "~/components/ui";
import { binStr, clamp, fmt, hexStr } from "~/lib/bits";
import { useInterval, useReducedMotion } from "~/lib/hooks";

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

type Ink = "amber" | "cyan" | "violet" | "pink" | "ink";

const INK: Record<Ink, { text: string; border: string; tint: string; halo: string }> = {
  amber: { text: "text-amber", border: "border-amber", tint: "bg-amber-tint", halo: "halo-amber" },
  cyan: { text: "text-cyan", border: "border-cyan", tint: "bg-cyan-tint", halo: "halo-cyan" },
  violet: { text: "text-violet", border: "border-violet", tint: "bg-violet-tint", halo: "halo-violet" },
  pink: { text: "text-pink", border: "border-pink", tint: "bg-pink-tint", halo: "halo-pink" },
  ink: { text: "text-ink", border: "border-ink", tint: "bg-panel-2", halo: "halo" },
};

const hx = (n: number, digits = 8) => `0x${hexStr(n, digits)}`;

/** How long a "flying" element takes to travel. */
const FLY = { duration: 0.7, ease: [0.4, 0, 0.2, 1] as const };

function Panel({
  title,
  children,
  className,
  right,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <div className={cx("min-w-0 rounded-md border border-line-2 bg-panel p-3", className)}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="label-caps text-[0.6875rem] text-dim">{title}</span>
        {right && <span className="ml-auto">{right}</span>}
      </div>
      {children}
    </div>
  );
}

/** True while the element is at least partly on screen. */
function useInView(ref: RefObject<Element | null>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

function fmtMs(ms: number) {
  if (ms < 1) return `${fmt(ms * 1000)} µs`;
  if (ms < 1000) return `${fmt(ms, ms < 10 && ms % 1 ? 1 : 0)} ms`;
  return `${fmt(ms / 1000, ms % 1000 ? 1 : 0)} s`;
}

/* ------------------------------------------------------------------ */
/* 1. Boot chain: copy bytes into RAM, then JMP                         */
/* ------------------------------------------------------------------ */

type BootRow = "flash" | "devices" | "boot" | "app" | "kernel";

interface BootStage {
  label: string;
  title: string;
  pc: number | null;
  at: BootRow | null;
  who: string;
  inRam: BootRow[];
  freed?: BootRow[];
  copy?: BootRow;
  reset?: boolean;
  checks?: string[];
  move?: [string, string];
  text: ReactNode;
}

const BOOT_STAGES: BootStage[] = [
  {
    label: "Off",
    title: "Power off",
    pc: null,
    at: null,
    who: "nothing (no power)",
    inRam: [],
    text: (
      <>
        Everything is off. RAM forgets everything without power, so it holds nothing useful. Only two places keep their
        bytes: the <strong>SSD</strong>, and a small <strong>flash chip</strong> on the motherboard that holds the{" "}
        <strong>firmware</strong>.
      </>
    ),
  },
  {
    label: "Reset",
    title: "Reset: every flip-flop gets a known value",
    pc: 0xfffffff0,
    at: "flash",
    who: "nothing yet (held in reset)",
    inRam: [],
    reset: true,
    text: (
      <>
        You press the button. A small circuit holds the CPU's <strong>RESET</strong> wire at 1 until the voltages are
        steady. Reset forces every flip-flop to a fixed value. In SAP-8 that meant PC = 0. A PC's processor is wired so
        that reset gives <strong>PC = 0xFFFFFFF0</strong>: the <strong>reset vector</strong>.
      </>
    ),
  },
  {
    label: "Firmware",
    title: "The firmware runs, straight from flash",
    pc: 0xfff80000,
    at: "flash",
    who: "firmware (UEFI)",
    inRam: [],
    checks: ["RAM tested", "screen found", "keyboard found", "SSD found, bootloader file found"],
    text: (
      <>
        The address decoder sends 0xFFFFFFF0 to the flash chip, not to RAM. So the very first instruction comes from
        the firmware. It is a <code>JMP</code> into the rest of the firmware, which checks the hardware and looks on the
        SSD for a bootloader file.
      </>
    ),
  },
  {
    label: "Bootloader",
    title: "Firmware: copy the bootloader, then jump",
    pc: 0x7e5f0000,
    at: "boot",
    who: "bootloader",
    inRam: ["boot"],
    copy: "boot",
    move: ["copy BOOTX64.EFI → RAM at 0x7E5F0000", "JMP 0x7E5F0000"],
    text: (
      <>
        The firmware copies the bootloader's bytes from the SSD into RAM. Then it runs one ordinary jump, and the
        firmware's work is done.
      </>
    ),
  },
  {
    label: "Kernel",
    title: "Bootloader: copy the kernel, then jump",
    pc: 0x01000000,
    at: "kernel",
    who: "kernel",
    inRam: ["boot", "kernel"],
    copy: "kernel",
    move: ["copy kernel (≈ 15 MB) → RAM at 0x01000000", "JMP 0x01000000"],
    text: (
      <>
        The bootloader is a small program with one job: find the kernel file, copy it into RAM, and jump to it.
        Copying about 15 MB at about 3 GB/s takes only about 5 ms.
      </>
    ),
  },
  {
    label: "Set-up",
    title: "The kernel prepares the machine",
    pc: 0x01a3c0f0,
    at: "kernel",
    who: "kernel",
    inRam: ["kernel"],
    freed: ["boot"],
    checks: [
      "interrupt table: timer → scheduler, keyboard → keyboard driver, …",
      "process table (empty) and page tables",
      "drivers for the screen, SSD, keyboard and network",
      "timer set to interrupt 250 times a second",
    ],
    text: (
      <>
        The kernel fills in its tables and starts its drivers. It does not need the bootloader any more, so that part
        of RAM is marked free.
      </>
    ),
  },
  {
    label: "First app",
    title: "Kernel: copy the first program, then jump",
    pc: 0x2a400000,
    at: "app",
    who: "first program (init)",
    inRam: ["kernel", "app"],
    freed: ["boot"],
    copy: "app",
    move: ["copy init → RAM at 0x2A400000", "jump into init"],
    text: (
      <>
        The kernel's <strong>loader</strong> copies the first program and jumps into it. On Linux it is called{" "}
        <code>init</code> and gets process number 1. It starts everything else: background services, the login screen,
        then your desktop. Every app you open later is loaded the same way.
      </>
    ),
  },
];

const MAP_ROWS: Array<{ id: BootRow; addr: string; name: string; ink: Ink }> = [
  { id: "flash", addr: "0xFF000000", name: "Firmware flash chip", ink: "amber" },
  { id: "devices", addr: "0xFE000000", name: "Device registers", ink: "ink" },
  { id: "boot", addr: "0x7E5F0000", name: "Bootloader", ink: "cyan" },
  { id: "app", addr: "0x2A400000", name: "First program", ink: "ink" },
  { id: "kernel", addr: "0x01000000", name: "Kernel", ink: "violet" },
];

const SSD_FILES: Array<{ id: BootRow; file: string; note: string; ink: Ink }> = [
  { id: "boot", file: "\\EFI\\BOOT\\BOOTX64.EFI", note: "the bootloader", ink: "cyan" },
  { id: "kernel", file: "kernel", note: "≈ 15 MB", ink: "violet" },
  { id: "app", file: "init", note: "the first program", ink: "ink" },
];

function BytesChip({ ink, layoutId, className }: { ink: Ink; layoutId?: string; className?: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      transition={FLY}
      layoutCrossfade={false}
      className={cx(
        "inline-flex items-center rounded border bg-panel px-1.5 font-mono text-[0.6875rem] leading-5 font-bold",
        INK[ink].border,
        INK[ink].text,
        className,
      )}
    >
      bytes
    </motion.span>
  );
}

export function BootChain() {
  const uid = useId();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const stage = BOOT_STAGES[i];
  const last = BOOT_STAGES.length - 1;

  useInterval(
    () => {
      if (i >= last) setPlaying(false);
      else setI(i + 1);
    },
    playing ? 2600 : null,
  );

  const inRam = (r: BootRow) => stage.inRam.includes(r);
  const freed = (r: BootRow) => !!stage.freed?.includes(r);

  return (
    <Widget
      title="From power button to desktop"
      subtitle="Step through a PC starting up. Watch the RAM fill up stage by stage, and watch the PC (program counter) jump into each newly copied piece."
      wide
    >
      <MotionConfig reducedMotion="user">
        <div className="flex flex-wrap items-center gap-2">
          <Btn onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
            ← Back
          </Btn>
          <Btn variant="primary" onClick={() => setI(Math.min(last, i + 1))} disabled={i === last}>
            Next step →
          </Btn>
          <Btn
            onClick={() => {
              if (i === last) setI(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? "Pause" : "Play all"}
          </Btn>
        </div>
        <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Boot stages">
          {BOOT_STAGES.map((s, k) => (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => setI(k)}
                aria-current={k === i ? "step" : undefined}
                className={cx(
                  "rounded-md border px-2 py-1 text-xs transition-colors",
                  k === i
                    ? "border-ink bg-panel-2 font-semibold text-ink"
                    : k < i
                      ? "border-line-2 text-ink hover:bg-panel-2"
                      : "border-line text-dim hover:bg-panel-2 hover:text-ink",
                )}
              >
                <span className="font-mono tabular-nums">{k + 1}</span> {s.label}
              </button>
            </li>
          ))}
        </ol>

        <div className="mt-4 grid gap-3 @3xl:grid-cols-[11rem_minmax(0,1fr)_14rem]">
          {/* CPU */}
          <Panel title="CPU">
            <div className="label-caps text-[0.6875rem] text-dim">PC</div>
            <div className="font-mono text-xl font-semibold text-ink tabular-nums">
              {stage.pc === null ? "—" : hx(stage.pc)}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={cx(
                  "inline-block h-3.5 w-3.5 rounded-full border-2",
                  stage.reset ? "border-on bg-on halo-on" : "border-off bg-panel-2",
                )}
              />
              <span className="text-mute">
                RESET wire = <span className={cx("font-mono", stage.reset ? "font-bold text-on" : "text-dim")}>{stage.reset ? 1 : 0}</span>
              </span>
            </div>
            <div className="mt-2 text-sm text-mute">
              Running: <span className="text-ink">{stage.who}</span>
            </div>
          </Panel>

          {/* Address map */}
          <Panel title="Addresses (high at the top)">
            <div className="space-y-1.5">
              {MAP_ROWS.map((r) => {
                const isRam = r.id !== "flash" && r.id !== "devices";
                const lit = r.id === "flash" || (isRam && inRam(r.id) && !freed(r.id));
                const status =
                  r.id === "flash"
                    ? "keeps its bytes with power off"
                    : r.id === "devices"
                      ? "not RAM: these go to devices"
                      : freed(r.id)
                        ? "free again"
                        : inRam(r.id)
                          ? "copied from the SSD"
                          : "RAM: empty";
                return (
                  <div key={r.id}>
                    {r.id === "boot" && (
                      <div className="mt-2 mb-1 ml-[5.25rem] label-caps text-[0.6875rem] text-dim">RAM</div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="w-[4.75rem] shrink-0 text-right font-mono text-[0.6875rem] text-dim tabular-nums">
                        {r.addr}
                      </span>
                      <div
                        className={cx(
                          "flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border px-2.5 py-1 transition-colors duration-500",
                          lit
                            ? cx(INK[r.ink].border, INK[r.ink].tint)
                            : r.id === "devices"
                              ? "border-line-2 bg-panel-2"
                              : "border-dashed border-line-2 bg-panel",
                          stage.at === r.id && "halo",
                        )}
                      >
                        <span className={cx("text-sm font-semibold", lit ? INK[r.ink].text : "text-mute")}>
                          {r.name}
                        </span>
                        <span className="text-xs text-mute">{status}</span>
                        {isRam && inRam(r.id) && !freed(r.id) && (
                          <BytesChip ink={r.ink} layoutId={`${uid}-chip-${r.id}`} className="ml-auto" />
                        )}
                      </div>
                      <div className="w-12 shrink-0">
                        {stage.at === r.id && (
                          <motion.div
                            layoutId={`${uid}-pc`}
                            transition={FLY}
      layoutCrossfade={false}
                            className="inline-flex items-center rounded border border-ink bg-panel px-1 font-mono text-xs font-bold text-ink"
                          >
                            ◀ PC
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-2">
                <span className="w-[4.75rem] shrink-0 text-right font-mono text-[0.6875rem] text-dim">0x00000000</span>
                <span className="text-xs text-dim">… the rest of RAM: empty</span>
              </div>
            </div>
          </Panel>

          {/* SSD */}
          <Panel title="SSD (keeps files with power off)">
            <ul className="space-y-1.5">
              {SSD_FILES.map((f) => {
                const active = stage.copy === f.id;
                const copied = inRam(f.id) || freed(f.id);
                return (
                  <li
                    key={f.id}
                    className={cx(
                      "rounded-md border px-2 py-1.5",
                      active ? cx(INK[f.ink].border, "bg-panel-2") : "border-line",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 font-mono text-xs break-all text-ink">
                        {f.file}
                      </span>
                      <span className="relative inline-flex">
                        <BytesChip ink={f.ink} />
                        {!copied && (
                          <BytesChip ink={f.ink} layoutId={`${uid}-chip-${f.id}`} className="absolute inset-0" />
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-mute">
                      {f.note}
                      {active && <span className="font-semibold text-ink"> · copying into RAM →</span>}
                    </div>
                  </li>
                );
              })}
              <li className="px-2 text-xs text-dim">… your apps, photos and music</li>
            </ul>
          </Panel>
        </div>

        <div className="mt-4 rounded-md border border-line bg-panel-2 p-3.5" aria-live="polite">
          <div className="font-serif font-semibold text-ink">
            <span className="font-mono text-amber tabular-nums">{i + 1}.</span> {stage.title}
          </div>
          <p className="mt-1 font-serif text-[0.9375rem] leading-relaxed text-body">{stage.text}</p>
          {stage.checks && (
            <ul className="mt-2 grid gap-1 text-sm text-ink">
              {stage.checks.map((c) => (
                <li key={c} className="flex gap-2">
                  <span aria-hidden className="font-bold">
                    ✓
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          )}
          {stage.move && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 font-mono text-sm">
              <span className="label-caps text-[0.6875rem] text-cyan">the same move</span>
              <code className="rounded border border-line-2 bg-panel px-1.5 py-0.5 text-ink">{stage.move[0]}</code>
              <span aria-hidden className="text-dim">
                then
              </span>
              <code className="rounded border border-ink bg-panel px-1.5 py-0.5 font-bold text-ink">{stage.move[1]}</code>
            </div>
          )}
        </div>
      </MotionConfig>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 2. The juggling CPU: timer interrupts and context switches            */
/* ------------------------------------------------------------------ */

type AppId = "music" | "browser" | "chat";
type PState = "running" | "ready" | "waiting";
interface Regs {
  pc: number;
  a: number;
  sp: number;
}

const JAPPS: Array<{ id: AppId; name: string; ink: Ink; letter: string }> = [
  { id: "music", name: "Music", ink: "violet", letter: "M" },
  { id: "browser", name: "Browser", ink: "cyan", letter: "B" },
  { id: "chat", name: "Chat", ink: "amber", letter: "C" },
];
const appInfo = (id: AppId) => JAPPS.find((a) => a.id === id)!;

interface Sim {
  tick: number;
  running: AppId | null;
  state: Record<AppId, PState>;
  regs: Record<AppId, Regs>;
  timeline: Array<AppId | null>;
  musicBuf: number;
  stutters: number;
  pending: string;
  chatText: string;
  keyAt: number | null;
  lastWait: number | null;
  keys: number;
  browserBusy: boolean;
  event: string;
}

const SIM0: Sim = {
  tick: 0,
  running: "browser",
  state: { music: "waiting", browser: "running", chat: "waiting" },
  regs: {
    music: { pc: 0x2140, a: 17, sp: 0x6ff0 },
    browser: { pc: 0x51a8, a: 3, sp: 0x8fc0 },
    chat: { pc: 0x7304, a: 104, sp: 0xbfe8 },
  },
  timeline: [],
  musicBuf: 3,
  stutters: 0,
  pending: "",
  chatText: "",
  keyAt: null,
  lastWait: null,
  keys: 0,
  browserBusy: true,
  event: "The browser is running. The timer will interrupt it soon.",
};

const ORDER: AppId[] = ["music", "browser", "chat"];

function pickNext(state: Record<AppId, PState>, after: AppId | null): AppId | null {
  const start = after ? ORDER.indexOf(after) + 1 : 0;
  for (let k = 0; k < ORDER.length; k++) {
    const id = ORDER[(start + k) % ORDER.length];
    if (state[id] === "ready") return id;
  }
  return null;
}

/** One time slice: the running app works, then the timer (maybe) interrupts. */
function simStep(s: Sim, timerOn: boolean): Sim {
  const state = { ...s.state };
  const regs = { ...s.regs };
  let { musicBuf, stutters, pending, chatText, keyAt, lastWait } = s;
  const ran = s.running;
  let keeps = false;

  if (ran) {
    const r = regs[ran];
    regs[ran] = {
      pc: (r.pc + 0x24 + ((s.tick * 13) % 7) * 4) & 0xffff,
      a: (r.a * 5 + 7 + s.tick) & 0xff,
      sp: (r.sp + ((s.tick % 3) - 1) * 16) & 0xffff,
    };
    if (ran === "music") {
      musicBuf = 4;
      state.music = "waiting";
    } else if (ran === "chat") {
      chatText = (chatText + pending).slice(-20);
      if (keyAt !== null) lastWait = s.tick - keyAt;
      pending = "";
      keyAt = null;
      state.chat = "waiting";
    } else if (s.browserBusy) {
      keeps = true;
    } else {
      state.browser = "waiting";
    }
  }
  // The sound chip plays one slice of music from the buffer.
  if (ran !== "music") {
    if (musicBuf > 0) musicBuf -= 1;
    else stutters += 1;
  }
  if (state.music === "waiting" && musicBuf <= 1) state.music = "ready";

  let next: AppId | null;
  let event: string;
  const nm = (id: AppId | null) => (id ? appInfo(id).name : "");
  if (ran && keeps && !timerOn) {
    next = ran;
    event = `The timer is off, so nothing can interrupt ${nm(ran)}. It keeps the CPU.`;
  } else {
    if (ran && keeps) state[ran] = "ready";
    next = pickNext(state, ran);
    if (!next) {
      event = ran
        ? `${nm(ran)} has nothing more to do and waits. Nobody is ready, so the kernel runs HLT: the core sleeps.`
        : "Nobody is ready. The core keeps sleeping until the next interrupt.";
    } else if (next === ran) {
      event = `Timer interrupt → the kernel checks: nobody else is ready, so ${nm(ran)} keeps going.`;
    } else if (ran && keeps) {
      event = `Timer interrupt → the kernel saves ${nm(ran)}'s registers in its row, loads ${nm(next)}'s, and “returns” into ${nm(next)}.`;
    } else if (ran) {
      event = `${nm(ran)} finished its work and asked to wait (a system call) → the kernel loads ${nm(next)}'s registers and runs it.`;
    } else {
      event = `An interrupt wakes the core → ${nm(next)} is ready, so the kernel loads its registers and runs it.`;
    }
  }
  if (next) state[next] = "running";
  return {
    ...s,
    tick: s.tick + 1,
    running: next,
    state,
    regs,
    timeline: [...s.timeline, ran].slice(-24),
    musicBuf,
    stutters,
    pending,
    chatText,
    keyAt,
    lastWait,
    event,
  };
}

const SLICES = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 4, 10, 20, 50, 100, 200, 500];
const SWITCH_MS = 0.002; // a context switch costs about 2 µs
const KEYS = "hello! ";

function RegCard({ id, regs, layoutId }: { id: AppId; regs: Regs; layoutId: string }) {
  const a = appInfo(id);
  return (
    <motion.div
      layoutId={layoutId}
      transition={FLY}
      layoutCrossfade={false}
      className={cx(
        "inline-flex flex-wrap gap-x-2.5 rounded border px-1.5 py-0.5 font-mono text-xs text-ink tabular-nums",
        INK[a.ink].border,
        INK[a.ink].tint,
      )}
    >
      <span>
        <span className="text-mute">PC</span> {hexStr(regs.pc, 4)}
      </span>
      <span>
        <span className="text-mute">A</span> {regs.a}
      </span>
      <span>
        <span className="text-mute">SP</span> {hexStr(regs.sp, 4)}
      </span>
    </motion.div>
  );
}

function StateTag({ state }: { state: PState }) {
  return (
    <span
      className={cx(
        "inline-flex w-[5.5rem] justify-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        state === "running" && "border-ink bg-panel-2 text-ink",
        state === "ready" && "border-line-2 text-mute",
        state === "waiting" && "border-dashed border-line-2 font-normal text-dim",
      )}
    >
      {state === "running" ? "▶ running" : state}
    </span>
  );
}

export function JugglingCpu() {
  const uid = useId();
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box);
  const [sim, setSim] = useState<Sim>(SIM0);
  const [playing, setPlaying] = useState(true);
  const [timerOn, setTimerOn] = useState(true);
  const [si, setSi] = useState(8);

  // Reduced motion: start paused and let the reader step.
  useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);

  useInterval(() => setSim((s) => simStep(s, timerOn)), playing && inView ? 1100 : null);

  const pressKey = () =>
    setSim((s) => {
      const c = KEYS[s.keys % KEYS.length];
      const state = { ...s.state };
      let running = s.running;
      let event = s.event;
      if (state.chat === "waiting") state.chat = "ready";
      if (running === null) {
        running = "chat";
        state.chat = "running";
        event = "Keyboard interrupt → it wakes the sleeping core, and the kernel runs Chat at once.";
      }
      return { ...s, pending: s.pending + c, keyAt: s.keyAt ?? s.tick, keys: s.keys + 1, state, running, event };
    });

  const toggleBusy = () =>
    setSim((s) => {
      const busy = !s.browserBusy;
      const state = { ...s.state };
      let running = s.running;
      if (busy && state.browser === "waiting") {
        state.browser = "ready";
        if (running === null) {
          running = "browser";
          state.browser = "running";
        }
      }
      return { ...s, browserBusy: busy, state, running };
    });

  const slice = SLICES[si];
  const perSec = 1000 / slice;
  const lost = SWITCH_MS / (slice + SWITCH_MS);
  const wait = 2 * slice;
  const lostPct = lost * 100;
  const feel = wait < 50 ? "feels instant" : wait < 150 ? "a lag you can notice" : "jerky: letters come in bursts";

  const cells = Array.from({ length: 24 }, (_, k) => {
    const idx = sim.timeline.length - 24 + k;
    return idx >= 0 ? sim.timeline[idx] : undefined;
  });

  return (
    <Widget
      title="One core, three apps, taking turns"
      subtitle="Each box in the timeline is one time slice. At the end of each slice the timer interrupts, and the kernel may swap the registers of one app for another's. Watch the coloured register cards move between the CPU and the process table."
      wide
    >
      <MotionConfig reducedMotion="user">
        <div ref={box}>
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="primary" onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : "Play"}
            </Btn>
            <Btn onClick={() => setSim((s) => simStep(s, timerOn))}>Next slice →</Btn>
            <Btn active={timerOn} onClick={() => setTimerOn((t) => !t)}>
              Timer interrupt: {timerOn ? "on" : "off"}
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => {
                setSim(SIM0);
                setTimerOn(true);
              }}
            >
              Reset
            </Btn>
            <span className="ml-auto font-mono text-xs text-dim tabular-nums">slice #{sim.tick}</span>
          </div>

          <div className="mt-4 grid gap-3 @2xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
            <Panel title="Core 0">
              <div className="flex items-center gap-2 text-sm">
                <motion.span
                  key={sim.tick}
                  aria-hidden
                  initial={{ opacity: timerOn && sim.tick > 0 ? 1 : 0.25 }}
                  animate={{ opacity: 0.25 }}
                  transition={{ duration: 0.9 }}
                  className={cx(
                    "inline-block h-3.5 w-3.5 rounded-full border-2",
                    timerOn ? "border-on bg-on" : "border-off bg-panel-2",
                  )}
                />
                <span className="text-mute">
                  Timer: <span className="text-ink">{timerOn ? "interrupts every slice" : "switched off"}</span>
                </span>
              </div>
              <div className="mt-3 label-caps text-[0.6875rem] text-dim">Running now</div>
              <div className="mt-1 min-h-[3.5rem]">
                {sim.running ? (
                  <>
                    <div className={cx("text-sm font-semibold", INK[appInfo(sim.running).ink].text)}>
                      {appInfo(sim.running).name}
                    </div>
                    <div className="mt-1">
                      <RegCard
                        key={sim.running}
                        id={sim.running}
                        regs={sim.regs[sim.running]}
                        layoutId={`${uid}-${sim.running}`}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-mute">
                    nobody: <code className="text-ink">HLT</code>, the core sleeps until the next interrupt
                  </div>
                )}
              </div>
            </Panel>

            <Panel title="Process table (in kernel memory)">
              <div className="grid grid-cols-[4.25rem_auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2">
                {JAPPS.map((a) => (
                  <div key={a.id} className="contents">
                    <span className={cx("text-sm font-semibold", INK[a.ink].text)}>{a.name}</span>
                    <StateTag state={sim.state[a.id]} />
                    <div className="min-h-7">
                      {sim.running === a.id ? (
                        <span className="text-xs text-dim">registers are in the CPU now</span>
                      ) : (
                        <RegCard id={a.id} regs={sim.regs[a.id]} layoutId={`${uid}-${a.id}`} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <p className="mt-3 min-h-[3rem] font-serif text-[0.9375rem] leading-snug text-body" aria-live="polite">
            {sim.event}
          </p>

          <div className="mt-2">
            <div className="mb-1 flex justify-between gap-2 text-xs text-dim">
              <span>← earlier</span>
              <span>each box = one slice of {fmtMs(slice)}</span>
              <span>now →</span>
            </div>
            <div className="flex h-8 gap-px" role="img" aria-label="Which app ran in each recent time slice">
              {cells.map((who, k) => (
                <div
                  key={k}
                  className={cx(
                    "flex min-w-0 flex-1 items-center justify-center rounded-sm border font-mono text-[0.6875rem] font-bold",
                    who === undefined && "border-line bg-panel",
                    who === null && "border-dashed border-line-2 bg-panel font-normal text-dim",
                    who && cx(INK[appInfo(who).ink].border, INK[appInfo(who).ink].tint, INK[appInfo(who).ink].text),
                  )}
                >
                  {who === null ? "·" : who ? appInfo(who).letter : ""}
                </div>
              ))}
            </div>
            <div className="mt-1 text-xs text-dim">M = Music · B = Browser · C = Chat · “·” = idle (core asleep)</div>
          </div>

          <div className="mt-4 grid gap-3 @2xl:grid-cols-3">
            <Panel title="Chat: waits for your keys">
              <Btn onClick={pressKey}>Type a key</Btn>
              <div className="mt-2 font-mono text-sm text-ink">
                “{sim.chatText}
                <span className="text-dim underline decoration-dotted">{sim.pending}</span>”
              </div>
              <div className="mt-1 text-xs text-mute">
                {sim.pending
                  ? `${sim.pending.length} key${sim.pending.length > 1 ? "s" : ""} waiting for Chat's turn`
                  : sim.lastWait !== null
                    ? `your last key waited ${sim.lastWait} slice${sim.lastWait === 1 ? "" : "s"}`
                    : "uses 0% CPU while waiting"}
              </div>
            </Panel>
            <Panel title="Browser: a greedy app">
              <Btn active={sim.browserBusy} onClick={toggleBusy}>
                {sim.browserBusy ? "Busy: never stops" : "Idle: waiting"}
              </Btn>
              <div className="mt-2 text-xs text-mute">
                A busy app never gives up the CPU by itself. Only the timer can take it away. Try turning the timer
                off.
              </div>
            </Panel>
            <Panel title="Music: needs a turn often">
              <div className="flex items-center gap-1" aria-label={`sound buffer: ${sim.musicBuf} of 4 slices`}>
                {Array.from({ length: 4 }, (_, k) => (
                  <span
                    key={k}
                    className={cx(
                      "h-4 w-6 rounded-sm border",
                      k < sim.musicBuf ? "border-violet bg-violet-tint" : "border-dashed border-line-2",
                    )}
                  />
                ))}
                <span className="ml-1 text-xs text-mute">sound buffer</span>
              </div>
              <div className={cx("mt-2 text-xs", sim.musicBuf === 0 ? "font-semibold text-pink" : "text-mute")}>
                {sim.musicBuf === 0 ? "✗ buffer empty: you hear a click! " : "The sound chip empties one box per slice. "}
                Stutters: <span className="font-mono tabular-nums">{sim.stutters}</span>
              </div>
            </Panel>
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <Slider
              label="Length of one time slice"
              min={0}
              max={SLICES.length - 1}
              value={si}
              onChange={setSi}
              format={(v) => fmtMs(SLICES[v])}
            />
            <div className="mt-3 grid grid-cols-1 gap-3 @lg:grid-cols-3">
              <Stat label="Switches per second" value={fmt(perSec)} sub="one per slice" />
              <Stat
                label="Time lost to switching"
                value={`${lostPct >= 1 ? fmt(lostPct) : lostPct.toPrecision(2)}%`}
                sub="each switch ≈ 2 µs"
                tone={lostPct > 5 ? "pink" : "ink"}
              />
              <Stat
                label="Worst wait for your key"
                value={fmtMs(wait)}
                sub={`2 other apps go first: ${feel}`}
                tone={wait >= 150 ? "pink" : "ink"}
              />
            </div>
          </div>
        </div>
      </MotionConfig>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 3. The mode bit: user mode, traps and system calls                    */
/* ------------------------------------------------------------------ */

type Layer = "app" | "lib" | "kernel" | "driver" | "device";
type ModeAction = "add" | "screen" | "hlt" | "syscall";

interface MStep {
  at: Layer;
  mode: 0 | 1;
  pc: string;
  regs?: Array<[string, string, string]>;
  text: ReactNode;
  result?: "ok" | "trap" | "stopped";
  device?: string;
}

const LAYERS: Array<{ id: Layer; name: string; sub: string }> = [
  { id: "app", name: "Chat app", sub: "your code" },
  { id: "lib", name: "Library", sub: "print(): still part of the app" },
  { id: "kernel", name: "Kernel", sub: "checks every request" },
  { id: "driver", name: "Terminal driver", sub: "knows the device's registers" },
  { id: "device", name: "Device registers", sub: "the hardware" },
];

const SYS_REGS: Array<[string, string, string]> = [
  ["RAX", "1", "which service: 1 = write"],
  ["RDI", "1", "where to: file 1, the app's output"],
  ["RSI", "0x00403A7C", "where the bytes “hi” are"],
  ["RDX", "2", "how many bytes"],
];

const MODE_ACTIONS: Record<ModeAction, { label: string; steps: MStep[] }> = {
  add: {
    label: "ADD (maths)",
    steps: [
      {
        at: "app",
        mode: 0,
        pc: "0x00401A30",
        result: "ok",
        text: (
          <>
            The app runs <code>ADD</code>. Before doing it, the control unit checks one rule: is this instruction
            allowed when mode = 0? <code>ADD</code> is not on the forbidden list, so yes. Maths, loops and jumps inside
            the app's own memory are always allowed, and they run at full speed.
          </>
        ),
      },
    ],
  },
  screen: {
    label: "Write to the screen",
    steps: [
      {
        at: "app",
        mode: 0,
        pc: "0x00401A34",
        text: (
          <>
            The app tries <code>STORE</code> to address 0xFE000000, where the screen's registers are. It wants to draw
            without asking anyone.
          </>
        ),
      },
      {
        at: "kernel",
        mode: 1,
        pc: "trap handler",
        result: "trap",
        text: (
          <>
            The memory hardware finds that this address is “kernel only” for this app. The CPU refuses: a{" "}
            <strong>trap</strong>. In one step it saves the PC, sets mode = 1, and jumps to the kernel's trap handler,
            at an address the kernel chose at boot.
          </>
        ),
      },
      {
        at: "kernel",
        mode: 1,
        pc: "trap handler",
        result: "stopped",
        text: (
          <>
            The kernel sees that an app touched memory that is not its own, and stops that app (“Segmentation fault”).
            The screen and all other apps are untouched.
          </>
        ),
      },
    ],
  },
  hlt: {
    label: "HLT (stop the CPU)",
    steps: [
      {
        at: "app",
        mode: 0,
        pc: "0x00401A36",
        text: (
          <>
            The app runs <code>HLT</code>. If this worked, it would stop the whole core, and every other app with it.
          </>
        ),
      },
      {
        at: "kernel",
        mode: 1,
        pc: "trap handler",
        result: "stopped",
        text: (
          <>
            <code>HLT</code> is a <strong>privileged</strong> instruction: the control unit allows it only when mode =
            1. Mode is 0, so instead of halting, the CPU traps into the kernel. The kernel stops the app.
          </>
        ),
      },
    ],
  },
  syscall: {
    label: "System call: write",
    steps: [
      {
        at: "app",
        mode: 0,
        pc: "0x00401A38",
        text: (
          <>
            The app calls <code>print("hi")</code>. That is an ordinary function call (<code>CALL</code>) into a
            library, code that came with the app.
          </>
        ),
      },
      {
        at: "lib",
        mode: 0,
        pc: "0x00405F10",
        regs: SYS_REGS,
        text: (
          <>
            The library writes the request into registers. In Linux this request is written{" "}
            <code>write(1, "hi", 2)</code>: service number 1 means “write”.
          </>
        ),
      },
      {
        at: "kernel",
        mode: 1,
        pc: "kernel entry",
        regs: SYS_REGS,
        text: (
          <>
            The library runs <code>SYSCALL</code>. In one step the CPU saves the return address, sets mode = 1 and
            jumps to the kernel's entry address. The app cannot choose where it lands: that is what makes it a safe
            door.
          </>
        ),
      },
      {
        at: "kernel",
        mode: 1,
        pc: "kernel: write",
        regs: SYS_REGS,
        text: (
          <>
            The kernel checks the request. Is 1 a real service? Yes: write. Is file 1 open for this app? Yes. Are the 2
            bytes at 0x00403A7C inside this app's own memory? Yes. All ✓.
          </>
        ),
      },
      {
        at: "driver",
        mode: 1,
        pc: "driver",
        regs: SYS_REGS,
        device: "hi",
        text: (
          <>
            The kernel gives the 2 bytes to the driver, and the driver writes them into the device's registers. Only
            kernel code may do this.
          </>
        ),
      },
      {
        at: "app",
        mode: 0,
        pc: "0x00401A3C",
        regs: [["RAX", "2", "result: 2 bytes written"]],
        device: "hi",
        result: "ok",
        text: (
          <>
            <code>SYSRET</code> sets mode = 0 and jumps back to just after the <code>SYSCALL</code>. The app gets its
            answer in RAX, and it never touched the hardware itself.
          </>
        ),
      },
    ],
  },
};

export function ModeBit() {
  const [action, setAction] = useState<ModeAction>("syscall");
  const [k, setK] = useState(0);
  const steps = MODE_ACTIONS[action].steps;
  const step = steps[Math.min(k, steps.length - 1)];
  const trapped = step.result === "trap" || step.result === "stopped";

  return (
    <Widget
      title="The mode bit and the one safe door"
      subtitle="Pick what the app tries to do, then step through it. Watch the mode bit: 0 = user mode (apps), 1 = kernel mode."
    >
      <Segmented
        size="sm"
        value={action}
        onChange={(v) => {
          setAction(v);
          setK(0);
        }}
        options={(Object.keys(MODE_ACTIONS) as ModeAction[]).map((a) => ({ value: a, label: MODE_ACTIONS[a].label }))}
      />

      <div className="mt-4 grid gap-3 @xl:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
        <Panel title="Who is running">
          <div className="space-y-1.5">
            {LAYERS.map((l) => {
              const here = step.at === l.id;
              return (
                <div key={l.id}>
                  {l.id === "kernel" && (
                    <div className="my-2 flex items-center gap-2 text-xs font-semibold text-ink">
                      <span className="h-0 flex-1 border-t-2 border-dashed border-ink" />
                      the wall: crossed only by SYSCALL or a trap
                      <span className="h-0 flex-1 border-t-2 border-dashed border-ink" />
                    </div>
                  )}
                  <div
                    className={cx(
                      "flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors",
                      l.id === "lib" && "ml-4",
                      l.id === "driver" && "ml-4",
                      here
                        ? trapped
                          ? "border-pink bg-pink-tint halo-pink"
                          : "border-ink bg-panel-2 halo"
                        : "border-line bg-panel",
                    )}
                  >
                    <span aria-hidden className={cx("w-3 font-bold", here ? "text-ink" : "text-transparent")}>
                      ▶
                    </span>
                    <span className="text-sm font-semibold text-ink">{l.name}</span>
                    <span className="text-xs text-mute">{l.sub}</span>
                    {l.id === "device" && (
                      <span
                        className={cx(
                          "ml-auto rounded border px-1.5 font-mono text-xs",
                          step.device ? "border-ink font-bold text-ink" : "border-line text-dim",
                        )}
                      >
                        {step.device ? `“${step.device}”` : "empty"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="CPU">
          <div className="flex items-center gap-3">
            <BitButton on={step.mode === 1} size="lg" />
            <div>
              <div className="text-sm font-semibold text-ink">mode bit = {step.mode}</div>
              <div className="text-xs text-mute">
                {step.mode === 1 ? "kernel mode: everything allowed" : "user mode: privileged things trap"}
              </div>
            </div>
          </div>
          <div className="mt-3 label-caps text-[0.6875rem] text-dim">PC</div>
          <div className="font-mono text-sm text-ink">{step.pc}</div>
          {step.regs && (
            <div className="mt-2 space-y-1">
              {step.regs.map(([r, v, m]) => (
                <div key={r} className="text-xs">
                  <span className="font-mono text-mute">{r}</span>{" "}
                  <span className="font-mono font-semibold text-ink">{v}</span>
                  <div className="text-mute">{m}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div
        className={cx(
          "mt-3 rounded-md border p-3",
          trapped ? "border-pink bg-pink-tint" : "border-line bg-panel-2",
        )}
        aria-live="polite"
      >
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-mute">
          <span className="font-mono tabular-nums">
            step {k + 1} of {steps.length}
          </span>
          {step.result === "ok" && <span className="font-semibold text-ink">✓ allowed</span>}
          {step.result === "trap" && <span className="font-semibold text-pink">✗ trap</span>}
          {step.result === "stopped" && <span className="font-semibold text-pink">✗ app stopped</span>}
        </div>
        <p className="font-serif text-[0.9375rem] leading-relaxed text-body">{step.text}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Btn onClick={() => setK(Math.max(0, k - 1))} disabled={k === 0}>
          ← Back
        </Btn>
        <Btn variant="primary" onClick={() => setK(Math.min(steps.length - 1, k + 1))} disabled={k >= steps.length - 1}>
          Next step →
        </Btn>
        <Btn variant="ghost" onClick={() => setK(0)}>
          Start over
        </Btn>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Two apps, one RAM: page tables, page faults and swap               */
/* ------------------------------------------------------------------ */

type VmApp = "chat" | "browser";
type Owner = VmApp | "kernel" | "photos";

const FRAME0 = 0x1f0;
const VM_APPS: Array<{ id: VmApp; name: string; ink: Ink; value: number }> = [
  { id: "chat", name: "Chat", ink: "amber", value: 42 },
  { id: "browser", name: "Browser", ink: "cyan", value: 99 },
];
const OWNER: Record<Owner, { name: string; ink: Ink }> = {
  chat: { name: "Chat", ink: "amber" },
  browser: { name: "Browser", ink: "cyan" },
  kernel: { name: "Kernel", ink: "violet" },
  photos: { name: "Photos", ink: "ink" },
};
const VM_PAGES: Array<{ page: number; what: string; sample: number }> = [
  { page: 0x00403, what: "data", sample: 0x00403a7c },
  { page: 0x00404, what: "more data", sample: 0x00404010 },
  { page: 0x7fffe, what: "stack", sample: 0x7fffeff0 },
];

interface VmFrame {
  owner: Owner | null;
  page: number | null;
  data: { off: number; v: number } | null;
  used: number;
}
interface Pte {
  page: number;
  frame: number | null; // null: the page is on the SSD
  what: string;
}
interface Access {
  addr: number;
  frame: number | null;
  kind: "ok" | "swapin" | "segfault";
  note?: string;
}
interface Vm {
  frames: VmFrame[];
  tables: Record<VmApp, Pte[]>;
  ssd: Array<{ owner: Owner; page: number; data: VmFrame["data"] }>;
  crashed: Record<VmApp, boolean>;
  photos: boolean;
  clock: number;
  last: Record<VmApp, Access | null>;
  hot: number | null;
  msg: string | null;
}

function vmInit(): Vm {
  const f = (owner: Owner | null, page: number | null, used: number): VmFrame => ({ owner, page, data: null, used });
  return {
    frames: [
      f("kernel", null, 0),
      f("kernel", null, 0),
      f("chat", 0x00403, 10),
      f("browser", 0x00404, 2),
      f("kernel", null, 0),
      f("chat", 0x00404, 1),
      f(null, null, 0),
      f("browser", 0x00403, 11),
      f("chat", 0x7fffe, 8),
      f("browser", 0x7fffe, 9),
      f(null, null, 0),
      f(null, null, 0),
    ],
    tables: {
      chat: [
        { page: 0x00403, frame: 2, what: "data" },
        { page: 0x00404, frame: 5, what: "more data" },
        { page: 0x7fffe, frame: 8, what: "stack" },
      ],
      browser: [
        { page: 0x00403, frame: 7, what: "data" },
        { page: 0x00404, frame: 3, what: "more data" },
        { page: 0x7fffe, frame: 9, what: "stack" },
      ],
    },
    ssd: [],
    crashed: { chat: false, browser: false },
    photos: false,
    clock: 20,
    last: { chat: null, browser: null },
    hot: null,
    msg: null,
  };
}

/** Find a free frame, or push the least recently used page out to the SSD. */
function grabFrame(vm: Vm): { vm: Vm; idx: number; evicted: string | null } {
  const free = vm.frames.findIndex((f) => f.owner === null);
  if (free >= 0) return { vm, idx: free, evicted: null };
  let best = -1;
  vm.frames.forEach((f, i) => {
    if (f.owner && f.owner !== "kernel" && (best < 0 || f.used < vm.frames[best].used)) best = i;
  });
  const victim = vm.frames[best];
  const frames = vm.frames.slice();
  frames[best] = { owner: null, page: null, data: null, used: 0 };
  const ssd = [...vm.ssd, { owner: victim.owner!, page: victim.page!, data: victim.data }];
  let tables = vm.tables;
  if (victim.owner === "chat" || victim.owner === "browser") {
    const o = victim.owner;
    tables = { ...tables, [o]: tables[o].map((p) => (p.frame === best ? { ...p, frame: null } : p)) };
  }
  return {
    vm: { ...vm, frames, ssd, tables },
    idx: best,
    evicted: `${OWNER[victim.owner!].name}'s page ${hx(victim.page ?? 0, 5)}`,
  };
}

function vmAccess(vm: Vm, app: VmApp, addr: number, v: number): Vm {
  if (vm.crashed[app]) return vm;
  const page = addr >>> 12;
  const off = addr & 0xfff;
  const pte = vm.tables[app].find((p) => p.page === page);
  if (!pte) {
    return {
      ...vm,
      crashed: { ...vm.crashed, [app]: true },
      last: { ...vm.last, [app]: { addr, frame: null, kind: "segfault" } },
      hot: null,
      msg: null,
    };
  }
  let cur = vm;
  let kind: Access["kind"] = "ok";
  let note: string | undefined;
  let idx = pte.frame;
  if (idx === null) {
    const g = grabFrame(cur);
    cur = g.vm;
    const at = g.idx;
    kind = "swapin";
    note = g.evicted ? `To make room, ${g.evicted} went out to the SSD.` : undefined;
    const slotI = cur.ssd.findIndex((s) => s.owner === app && s.page === page);
    const frames = cur.frames.slice();
    frames[at] = { owner: app, page, data: slotI >= 0 ? cur.ssd[slotI].data : null, used: 0 };
    cur = {
      ...cur,
      frames,
      ssd: cur.ssd.filter((_, i) => i !== slotI),
      tables: { ...cur.tables, [app]: cur.tables[app].map((p) => (p.page === page ? { ...p, frame: at } : p)) },
    };
    idx = at;
  }
  const frames = cur.frames.slice();
  frames[idx] = { ...frames[idx], data: { off, v }, used: cur.clock };
  return {
    ...cur,
    frames,
    clock: cur.clock + 1,
    hot: idx,
    msg: null,
    last: { ...cur.last, [app]: { addr, frame: idx, kind, note } },
  };
}

function vmUnmap(vm: Vm, app: VmApp, page: number): Vm {
  const pte = vm.tables[app].find((p) => p.page === page);
  if (!pte) return vm;
  const frames = vm.frames.slice();
  if (pte.frame !== null) frames[pte.frame] = { owner: null, page: null, data: null, used: 0 };
  return {
    ...vm,
    frames,
    ssd: vm.ssd.filter((s) => !(s.owner === app && s.page === page)),
    tables: { ...vm.tables, [app]: vm.tables[app].filter((p) => p.page !== page) },
    msg: `The kernel removed page ${hx(page, 5)} from ${OWNER[app].name}'s table and freed its frame.`,
  };
}

function vmRestart(vm: Vm, app: VmApp): Vm {
  // Forget everything the app had, then give it fresh pages.
  let cur: Vm = {
    ...vm,
    frames: vm.frames.map((f) => (f.owner === app ? { owner: null, page: null, data: null, used: 0 } : f)),
    ssd: vm.ssd.filter((s) => s.owner !== app),
    crashed: { ...vm.crashed, [app]: false },
    last: { ...vm.last, [app]: null },
    tables: { ...vm.tables, [app]: [] },
  };
  const notes: string[] = [];
  for (const p of VM_PAGES) {
    const g = grabFrame(cur);
    cur = g.vm;
    if (g.evicted) notes.push(g.evicted);
    const frames = cur.frames.slice();
    frames[g.idx] = { owner: app, page: p.page, data: null, used: cur.clock };
    cur = {
      ...cur,
      frames,
      clock: cur.clock + 1,
      tables: { ...cur.tables, [app]: [...cur.tables[app], { page: p.page, frame: g.idx, what: p.what }] },
    };
  }
  return {
    ...cur,
    hot: null,
    msg: `${OWNER[app].name} restarted with a fresh page table.${notes.length ? ` To make room, ${notes.join(" and ")} went to the SSD.` : ""}`,
  };
}

function vmPhotos(vm: Vm, open: boolean): Vm {
  if (!open) {
    return {
      ...vm,
      photos: false,
      frames: vm.frames.map((f) => (f.owner === "photos" ? { owner: null, page: null, data: null, used: 0 } : f)),
      ssd: vm.ssd.filter((s) => s.owner !== "photos"),
      hot: null,
      msg: "Photos closed. The kernel took back all its frames.",
    };
  }
  let cur: Vm = { ...vm, photos: true };
  const notes: string[] = [];
  let freeUsed = 0;
  for (let k = 0; k < 5; k++) {
    const g = grabFrame(cur);
    cur = g.vm;
    if (g.evicted) notes.push(g.evicted);
    else freeUsed++;
    const frames = cur.frames.slice();
    frames[g.idx] = { owner: "photos", page: 0x00500 + k, data: null, used: cur.clock };
    cur = { ...cur, frames, clock: cur.clock + 1 };
  }
  return {
    ...cur,
    hot: null,
    msg: `Photos needed 5 frames. ${freeUsed} were free${notes.length ? `; for the rest, the kernel pushed ${notes.join(" and ")} out to the SSD` : ""}.`,
  };
}

function parseAddr(s: string): number | null {
  const t = s.trim().replace(/^0x/i, "");
  if (!/^[0-9a-f]{1,8}$/i.test(t)) return null;
  return parseInt(t, 16) >>> 0;
}

function BitRun({ bits }: { bits: string }) {
  return (
    <>
      {bits.split("").map((b, i) => (
        <span
          key={i}
          className={cx(b === "1" ? "font-bold text-ink" : "font-normal text-dim", i > 0 && i % 4 === 0 && "ml-[0.35em]")}
        >
          {b}
        </span>
      ))}
    </>
  );
}

function VmAppPanel({
  app,
  vm,
  text,
  setText,
  onStore,
  onUnmap,
  onRestart,
}: {
  app: (typeof VM_APPS)[number];
  vm: Vm;
  text: string;
  setText: (s: string) => void;
  onStore: (addr: number) => void;
  onUnmap: (page: number) => void;
  onRestart: () => void;
}) {
  const inputId = useId();
  const addr = parseAddr(text);
  const page = addr === null ? null : addr >>> 12;
  const off = addr === null ? null : addr & 0xfff;
  const bits = addr === null ? "" : binStr(addr, 32);
  const last = vm.last[app.id];
  const crashed = vm.crashed[app.id];
  const table = vm.tables[app.id];
  const tone = INK[app.ink];

  return (
    <div className={cx("min-w-0 rounded-md border bg-panel p-3", crashed ? "border-pink" : tone.border)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cx("font-semibold", tone.text)}>{app.name}</span>
        <span className="text-xs text-mute">stores the number {app.value}</span>
        {crashed && <span className="ml-auto text-xs font-semibold text-pink">✗ stopped</span>}
      </div>

      <label htmlFor={inputId} className="mt-2 block text-xs text-mute">
        Virtual address (what the app uses)
      </label>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <input
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="w-[8.5rem] rounded-md border border-line-2 bg-panel-2 px-2 py-1 font-mono text-sm text-ink focus-visible:outline-2 focus-visible:outline-focus"
        />
        {[...VM_PAGES.map((p) => ({ label: p.what, a: p.sample })), { label: "address 0", a: 0x00000010 }].map(
          (p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setText(hx(p.a))}
              className="rounded border border-line px-1.5 py-0.5 text-xs text-mute hover:border-off hover:bg-panel-2 hover:text-ink"
            >
              {p.label}
            </button>
          ),
        )}
      </div>

      {addr === null ? (
        <div className="mt-2 text-xs text-pink">Type up to 8 hex digits, like 0x00403A7C.</div>
      ) : (
        <div className="mt-2 scroll-thin overflow-x-auto">
          <div className="flex min-w-max items-start gap-2 font-mono text-xs">
            <div>
              <div className={cx("border-b-2 pb-0.5", tone.border)}>
                <BitRun bits={bits.slice(0, 20)} />
              </div>
              <div className="mt-0.5 text-[0.6875rem] text-mute">page {hx(page!, 5)}</div>
            </div>
            <div>
              <div className="border-b-2 border-line-2 pb-0.5">
                <BitRun bits={bits.slice(20)} />
              </div>
              <div className="mt-0.5 text-[0.6875rem] text-mute">offset {hx(off!, 3)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 label-caps text-[0.6875rem] text-dim">{app.name}'s page table</div>
      <div className="mt-1 space-y-0.5 font-mono text-xs">
        {table.length === 0 && <div className="text-dim">(empty)</div>}
        {table.map((p) => {
          const match = p.page === page;
          return (
            <div
              key={p.page}
              className={cx(
                "flex items-center gap-2 rounded px-1.5 py-0.5",
                match ? cx("border", tone.border, tone.tint) : "border border-transparent",
              )}
            >
              <span className="text-ink">{hx(p.page, 5)}</span>
              <span className="text-dim">→</span>
              <span className={p.frame === null ? "text-pink" : "font-semibold text-ink"}>
                {p.frame === null ? "on the SSD" : `frame ${hx(FRAME0 + p.frame, 3)}`}
              </span>
              <span className="font-sans text-dim">{p.what}</span>
              <button
                type="button"
                onClick={() => onUnmap(p.page)}
                title="Delete this entry"
                aria-label={`Delete page ${hx(p.page, 5)} from ${app.name}'s table`}
                className="ml-auto rounded px-1.5 font-sans text-dim hover:bg-panel-3 hover:text-pink"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="primary" disabled={crashed || addr === null} onClick={() => addr !== null && onStore(addr)}>
          Store {app.value} at this address
        </Btn>
        {crashed && <Btn onClick={onRestart}>Restart {app.name}</Btn>}
      </div>

      <div className="mt-2 min-h-[3.25rem] text-sm" aria-live="polite">
        {last?.kind === "segfault" && (
          <p className="text-pink">
            ✗ Page fault: page {hx(last.addr >>> 12, 5)} is not in {app.name}'s table at all. The kernel stops{" "}
            {app.name}: <strong>“Segmentation fault”</strong>. The other app keeps running.
          </p>
        )}
        {last && last.kind !== "segfault" && last.frame !== null && (
          <div className="text-body">
            {last.kind === "swapin" && (
              <p className="mb-1 text-ink">
                Page fault! The page was on the SSD. The kernel copied it back into frame {hx(FRAME0 + last.frame, 3)}{" "}
                (≈ 80 µs, about 1,000× slower than RAM), fixed the table, and ran the store again. {last.note}
              </p>
            )}
            <p className="font-mono text-xs">
              {hx(FRAME0 + last.frame, 3)} × 4096 + {hx(last.addr & 0xfff, 3)} ={" "}
              <span className="font-bold text-ink">{hx(((FRAME0 + last.frame) << 12) | (last.addr & 0xfff), 6)}</span>
              <span className="font-sans text-mute">
                {" "}
                ✓ stored {app.value} {last.kind === "ok" ? "(≈ 80 ns)" : ""}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TwoAppsOneRam() {
  const [vm, setVm] = useState<Vm>(vmInit);
  const [texts, setTexts] = useState<Record<VmApp, string>>({ chat: "0x00403A7C", browser: "0x00403A7C" });

  return (
    <Widget
      title="Two apps, one RAM"
      subtitle="Both apps use the same virtual address, 0x00403A7C. Press both Store buttons and see where the numbers really land. Then try: address 0, the ✕ next to a table entry, and Open Photos."
      wide
    >
      <div className="grid gap-3 @3xl:grid-cols-2">
        {VM_APPS.map((a) => (
          <VmAppPanel
            key={a.id}
            app={a}
            vm={vm}
            text={texts[a.id]}
            setText={(s) => setTexts((t) => ({ ...t, [a.id]: s }))}
            onStore={(addr) => setVm((v) => vmAccess(v, a.id, addr, a.value))}
            onUnmap={(page) => setVm((v) => vmUnmap(v, a.id, page))}
            onRestart={() => setVm((v) => vmRestart(v, a.id))}
          />
        ))}
      </div>

      <div className="mt-3 grid gap-3 @3xl:grid-cols-[minmax(0,1fr)_14rem]">
        <Panel title="Physical RAM: 12 frames of 4 KiB">
          <div className="grid grid-cols-3 gap-1.5 @md:grid-cols-4 @2xl:grid-cols-6">
            {vm.frames.map((f, i) => {
              const o = f.owner ? OWNER[f.owner] : null;
              return (
                <div
                  key={i}
                  className={cx(
                    "min-w-0 rounded border px-1.5 py-1 font-mono text-xs transition-colors",
                    f.owner === "photos"
                      ? "border-off bg-panel-2"
                      : o
                        ? cx(INK[o.ink].border, INK[o.ink].tint)
                        : "border-dashed border-line-2 bg-panel",
                    vm.hot === i && INK[o?.ink ?? "ink"].halo,
                  )}
                >
                  <div className="flex justify-between gap-1">
                    <span className="font-semibold text-ink">{hexStr(FRAME0 + i, 3)}</span>
                    <span className={cx("truncate font-sans", o ? INK[o.ink].text : "text-dim")}>
                      {o ? o.name : "free"}
                    </span>
                  </div>
                  <div className="truncate text-mute">{f.page !== null ? `page ${hexStr(f.page, 5)}` : " "}</div>
                  <div className="truncate font-bold text-ink">
                    {f.data ? (
                      <>
                        {f.data.v} <span className="font-normal text-dim">at {hexStr(f.data.off, 3)}</span>
                      </>
                    ) : (
                      " "
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="SSD: swap area">
          {vm.ssd.length === 0 ? (
            <div className="text-sm text-dim">empty</div>
          ) : (
            <ul className="space-y-1 font-mono text-xs">
              {vm.ssd.map((s) => (
                <li key={`${s.owner}-${s.page}`} className="flex gap-2">
                  <span className={INK[OWNER[s.owner].ink].text}>{OWNER[s.owner].name}</span>
                  <span className="text-ink">page {hexStr(s.page, 5)}</span>
                  {s.data && <span className="text-dim">({s.data.v})</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn active={vm.photos} onClick={() => setVm((v) => vmPhotos(v, !v.photos))}>
              {vm.photos ? "Close Photos" : "Open Photos"}
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => {
                setVm(vmInit());
                setTexts({ chat: "0x00403A7C", browser: "0x00403A7C" });
              }}
            >
              Reset
            </Btn>
          </div>
        </Panel>
      </div>
      <p className="mt-3 min-h-[1.5rem] font-serif text-[0.9375rem] text-mute" aria-live="polite">
        {vm.msg ?? "A real 16 GiB RAM has 4,194,304 frames. This toy has 12."}
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 5. The loader: from double-click to the first instruction             */
/* ------------------------------------------------------------------ */

const ELF_HEADER = [
  0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x3e,
  0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x10, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00,
];

type Region = "stack" | "heap" | "data" | "code";

interface LoadStep {
  label: string;
  bytes?: number[]; // header bytes to highlight
  regions: Region[];
  lazy: boolean;
  state: string;
  pc: string;
  sp: string;
  text: ReactNode;
}

const LOAD_STEPS: LoadStep[] = [
  {
    label: "Double-click",
    regions: [],
    lazy: true,
    state: "—",
    pc: "—",
    sp: "—",
    text: (
      <>
        You double-click the Chat icon. The desktop program asks the kernel (with a system call) to start a new process
        from the file <code>chat</code> on the SSD.
      </>
    ),
  },
  {
    label: "Check the header",
    bytes: [0, 1, 2, 3, 4, 18],
    regions: [],
    lazy: true,
    state: "—",
    pc: "—",
    sp: "—",
    text: (
      <>
        The loader reads the first bytes. <code>7F 45 4C 46</code> is “\x7FELF”: a program in Linux's format (Windows
        would expect <code>4D 5A</code>, “MZ”). <code>02</code> means 64-bit, and <code>3E</code> means “for x86-64
        CPUs”. ✓ The file is a program this computer can run.
      </>
    ),
  },
  {
    label: "New process",
    regions: [],
    lazy: true,
    state: "new",
    pc: "—",
    sp: "—",
    text: (
      <>
        The kernel adds a row to the process table (process number 4127) and makes an <em>empty</em> page table: a
        brand-new address space where nothing is mapped yet.
      </>
    ),
  },
  {
    label: "Map the code",
    regions: ["code"],
    lazy: true,
    state: "new",
    pc: "—",
    sp: "—",
    text: (
      <>
        The header lists the pieces of the file and where each one goes. The code (8 KiB, two pages) goes at
        0x00401000. The table entries say “this page comes from the file”, but nothing is copied yet (striped).
      </>
    ),
  },
  {
    label: "Map the data",
    regions: ["code", "data"],
    lazy: true,
    state: "new",
    pc: "—",
    sp: "—",
    text: (
      <>
        The data (starting values like the text “hi”) goes at 0x00403000. The address 0x00403A7C from earlier is in
        this page.
      </>
    ),
  },
  {
    label: "Stack and heap",
    regions: ["code", "data", "heap", "stack"],
    lazy: true,
    state: "new",
    pc: "—",
    sp: "0x7FFFEFF0",
    text: (
      <>
        The kernel makes a stack near the top (allowed to grow to 8 MiB) and sets SP just below its top, to
        0x7FFFEFF0. Above the data it starts an empty <strong>heap</strong>, for memory the app asks for later.
      </>
    ),
  },
  {
    label: "Set the PC",
    bytes: [24, 25, 26, 27, 28, 29, 30, 31],
    regions: ["code", "data", "heap", "stack"],
    lazy: true,
    state: "ready",
    pc: "0x00401000",
    sp: "0x7FFFEFF0",
    text: (
      <>
        The <strong>entry point</strong> is in the header at byte 24: <code>00 10 40 00 00 00 00 00</code>. The bytes
        are stored smallest first, so read backwards it says 0x00401000. The kernel writes this into the saved PC and
        marks the process <em>ready</em>.
      </>
    ),
  },
  {
    label: "First instruction",
    regions: ["code", "data", "heap", "stack"],
    lazy: false,
    state: "running",
    pc: "0x00401000",
    sp: "0x7FFFEFF0",
    text: (
      <>
        The scheduler gives Chat its first turn: “return from interrupt” lands at 0x00401000. That page is not in RAM
        yet, so the fetch causes a page fault. The kernel copies just that 4 KiB page from the SSD, fixes the table,
        and the CPU tries again. Chat is running.
      </>
    ),
  },
];

const REGIONS: Array<{ id: Region | "gap" | "null"; addr: string; name: string; ink: Ink | null }> = [
  { id: "stack", addr: "0x7FFFF000", name: "stack (grows down ↓)", ink: "ink" },
  { id: "gap", addr: "", name: "… nothing mapped: any access here is a page fault …", ink: null },
  { id: "heap", addr: "0x00405000", name: "heap (grows up ↑, empty for now)", ink: "violet" },
  { id: "data", addr: "0x00403000", name: "data, from the file", ink: "amber" },
  { id: "code", addr: "0x00401000", name: "code, from the file", ink: "cyan" },
  { id: "null", addr: "0x00000000", name: "never mapped, so address 0 always faults", ink: null },
];

export function LoaderDemo() {
  const [k, setK] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = LOAD_STEPS.length - 1;
  const step = LOAD_STEPS[k];
  useInterval(
    () => {
      if (k >= last) setPlaying(false);
      else setK(k + 1);
    },
    playing ? 2400 : null,
  );
  const launch = () => {
    setK(1);
    setPlaying(true);
  };

  return (
    <Widget
      title="The loader at work"
      subtitle="Double-click the icon (or step with the buttons) to watch the kernel turn a file into a running process."
      wide
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onDoubleClick={launch}
          onKeyDown={(e) => {
            if (e.key === "Enter") launch();
          }}
          title="Double-click to open"
          className="flex w-[4.5rem] flex-col items-center gap-1 rounded-md p-1.5 hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-focus"
        >
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-amber bg-amber-tint font-display text-xl font-bold text-amber"
          >
            C
          </span>
          <span className="text-xs text-ink">chat</span>
        </button>
        <Btn onClick={() => setK(Math.max(0, k - 1))} disabled={k === 0}>
          ← Back
        </Btn>
        <Btn variant="primary" onClick={() => setK(Math.min(last, k + 1))} disabled={k === last}>
          Next step →
        </Btn>
        <Btn
          variant="ghost"
          onClick={() => {
            setK(0);
            setPlaying(false);
          }}
        >
          Start over
        </Btn>
      </div>

      <div className="mt-4 grid gap-3 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <Panel title="The file “chat”: first 32 bytes (hex)">
            <div className="scroll-thin overflow-x-auto">
              <div className="grid min-w-max grid-cols-[2rem_repeat(16,1.25rem)] gap-x-0.5 gap-y-1 font-mono text-xs">
                {[0, 16].map((row) => (
                  <div key={row} className="contents">
                    <span className="text-dim">{hexStr(row, 2)}:</span>
                    {ELF_HEADER.slice(row, row + 16).map((b, j) => {
                      const hl = step.bytes?.includes(row + j);
                      return (
                        <span
                          key={j}
                          className={cx(
                            "rounded-sm text-center",
                            hl ? "border border-amber bg-amber-tint font-bold text-amber" : b ? "text-ink" : "text-dim",
                          )}
                        >
                          {hexStr(b, 2)}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 text-xs text-mute">… followed by about 12 KiB more: the code and the data.</div>
          </Panel>
          <Panel title="Process table row">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs @md:grid-cols-4">
              <span>
                <span className="text-mute">PID</span> <span className="text-ink">{k >= 2 ? 4127 : "—"}</span>
              </span>
              <span>
                <span className="text-mute">state</span> <span className="font-bold text-ink">{step.state}</span>
              </span>
              <span>
                <span className="text-mute">PC</span> <span className="text-ink">{step.pc}</span>
              </span>
              <span>
                <span className="text-mute">SP</span> <span className="text-ink">{step.sp}</span>
              </span>
            </div>
          </Panel>
        </div>

        <Panel title="Chat's new address space (virtual)">
          {k < 2 ? (
            <div className="flex min-h-[6rem] items-center justify-center text-sm text-dim @3xl:min-h-[12rem]">
              no process yet
            </div>
          ) : (
            <div className="space-y-1">
              {REGIONS.map((r) => {
                const shown = r.id === "gap" || r.id === "null" || step.regions.includes(r.id as Region);
                const isLazy = r.id === "code" && step.lazy;
                return (
                  <div key={r.id} className="flex items-center gap-2">
                    <span className="w-[4.75rem] shrink-0 text-right font-mono text-[0.6875rem] text-dim">{r.addr}</span>
                    <div
                      className={cx(
                        "min-h-9 min-w-0 flex-1 rounded border px-2 py-1 text-xs transition-colors",
                        !r.ink && "border-transparent text-dim italic",
                        r.ink && !shown && "border-dashed border-line text-dim",
                        r.ink && shown && cx(INK[r.ink].border, INK[r.ink].tint, "text-ink"),
                      )}
                      style={
                        isLazy && shown
                          ? {
                              backgroundImage:
                                "repeating-linear-gradient(135deg, transparent 0 6px, var(--color-line-2) 6px 7px)",
                            }
                          : undefined
                      }
                    >
                      {r.ink && !shown ? "" : r.name}
                      {r.id === "code" && shown && (
                        <span className="text-mute">{isLazy ? " · not in RAM yet" : " · first page now in RAM"}</span>
                      )}
                      {step.pc !== "—" && r.id === "code" && <span className="ml-1 font-bold">◀ PC</span>}
                      {step.sp !== "—" && r.id === "stack" && <span className="ml-1 font-bold">◀ SP</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-3 rounded-md border border-line bg-panel-2 p-3" aria-live="polite">
        <div className="font-serif font-semibold text-ink">
          <span className="font-mono text-amber tabular-nums">{k + 1}.</span> {step.label}
        </div>
        <p className="mt-1 font-serif text-[0.9375rem] leading-relaxed text-body">{step.text}</p>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 6. The desktop dispatcher: focus, hit-testing, compositing, ports     */
/* ------------------------------------------------------------------ */

type WinId = "browser" | "music" | "chat";
interface Win {
  id: WinId;
  name: string;
  ink: Ink;
  x: number;
  y: number;
  w: number;
  h: number;
  port: number;
}
const SW = 1920;
const SH = 1080;
const WINS0: Record<WinId, Win> = {
  browser: { id: "browser", name: "Browser", ink: "cyan", x: 100, y: 80, w: 900, h: 600, port: 50877 },
  music: { id: "music", name: "Music", ink: "violet", x: 920, y: 140, w: 720, h: 460, port: 61002 },
  chat: { id: "chat", name: "Chat", ink: "amber", x: 420, y: 400, w: 800, h: 600, port: 51234 },
};
const MESSAGES = ["Ana: are you there?", "Ana: dinner at 7?", "Ana: :)", "Ana: see you!"];

interface Hit {
  x: number;
  y: number;
  tests: Array<{ id: WinId; inside: boolean }>;
  winner: WinId | null;
}
interface Desk {
  wins: Record<WinId, Win>;
  order: WinId[]; // back → front
  focus: WinId | null;
  queues: Record<WinId, string[]>;
  typed: Record<WinId, string>;
  inbox: string[];
  pieces: number;
  songData: number;
  hit: Hit | null;
  lastKey: { k: string; to: WinId | null } | null;
  packets: Array<{ n: number; port: number; to: WinId | null }>;
  n: number;
}
const DESK0: Desk = {
  wins: WINS0,
  order: ["browser", "music", "chat"],
  focus: "chat",
  queues: { browser: [], music: [], chat: [] },
  typed: { browser: "", music: "", chat: "" },
  inbox: [],
  pieces: 3,
  songData: 0,
  hit: null,
  lastKey: null,
  packets: [],
  n: 0,
};

const pushQ = (q: Desk["queues"], id: WinId, ev: string) => ({ ...q, [id]: [...q[id], ev].slice(-4) });

function hitTest(d: Desk, x: number, y: number): Hit {
  const tests: Hit["tests"] = [];
  let winner: WinId | null = null;
  for (const id of [...d.order].reverse()) {
    const w = d.wins[id];
    const inside = x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h;
    tests.push({ id, inside });
    if (inside) {
      winner = id;
      break;
    }
  }
  return { x, y, tests, winner };
}

function WinContent({ id, d, small }: { id: WinId; d: Desk; small?: boolean }) {
  const typed = d.typed[id];
  const caret = !small && d.focus === id ? "▏" : "";
  if (id === "chat") {
    return (
      <div className="space-y-0.5">
        {d.inbox.slice(-2).map((m, i) => (
          <div key={i} className="truncate">
            {m}
          </div>
        ))}
        <div className="truncate text-ink">
          &gt; {typed}
          {caret}
        </div>
      </div>
    );
  }
  if (id === "browser") {
    return (
      <div className="space-y-1">
        <div className="truncate rounded-sm border border-screen-dim px-1 text-ink">
          {typed || "example.com"}
          {caret}
        </div>
        {Array.from({ length: Math.min(4, d.pieces) }, (_, i) => (
          <div key={i} className="h-1.5 rounded-sm bg-cyan/40" style={{ width: `${90 - i * 17}%` }} />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="truncate">Now playing</div>
      <div className="h-1.5 rounded-sm bg-screen-dim">
        <div className="h-1.5 rounded-sm bg-violet" style={{ width: `${20 + ((d.songData * 9) % 80)}%` }} />
      </div>
      <div className="truncate text-ink">
        search: {typed}
        {caret}
      </div>
    </div>
  );
}

export function DesktopDispatcher() {
  const [d, setD] = useState<Desk>(DESK0);
  const [tab, setTab] = useState<"input" | "pixels" | "network">("input");
  const [paint, setPaint] = useState(4);
  const desk = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: WinId; dx: number; dy: number } | null>(null);

  const toScreen = (e: PointerEvent) => {
    const r = desk.current!.getBoundingClientRect();
    return {
      x: clamp(Math.round(((e.clientX - r.left) / r.width) * SW), 0, SW - 1),
      y: clamp(Math.round(((e.clientY - r.top) / r.height) * SH), 0, SH - 1),
    };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const p = toScreen(e);
    const h = hitTest(d, p.x, p.y);
    const onTitle = !!(e.target as HTMLElement).closest("[data-titlebar]");
    setD((prev) => {
      if (!h.winner) return { ...prev, focus: null, hit: h };
      const w = prev.wins[h.winner];
      return {
        ...prev,
        order: [...prev.order.filter((i) => i !== h.winner), h.winner],
        focus: h.winner,
        queues: pushQ(prev.queues, h.winner, `click (${p.x - w.x}, ${p.y - w.y})`),
        hit: h,
      };
    });
    if (h.winner && onTitle) {
      const w = d.wins[h.winner];
      drag.current = { id: h.winner, dx: p.x - w.x, dy: p.y - w.y };
      desk.current?.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
    desk.current?.focus({ preventScroll: true });
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g) return;
    const p = toScreen(e);
    setD((prev) => {
      const w = prev.wins[g.id];
      return {
        ...prev,
        wins: {
          ...prev.wins,
          [g.id]: { ...w, x: clamp(p.x - g.dx, 200 - w.w, SW - 200), y: clamp(p.y - g.dy, 0, SH - 80) },
        },
      };
    });
  };
  const endDrag = () => {
    drag.current = null;
  };

  const sendKey = (k: string) =>
    setD((prev) => {
      const f = prev.focus;
      if (!f) return { ...prev, lastKey: { k, to: null } };
      const typed = k === "Backspace" ? prev.typed[f].slice(0, -1) : (prev.typed[f] + k).slice(-24);
      return {
        ...prev,
        typed: { ...prev.typed, [f]: typed },
        queues: pushQ(prev.queues, f, k === "Backspace" ? "key ⌫" : `key '${k}'`),
        lastKey: { k, to: f },
      };
    });
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1 || e.key === "Backspace") {
      e.preventDefault();
      sendKey(e.key);
    }
  };

  const sendPacket = (port: number) =>
    setD((prev) => {
      const to = (Object.values(prev.wins).find((w) => w.port === port)?.id ?? null) as WinId | null;
      let next: Desk = { ...prev, n: prev.n + 1, packets: [...prev.packets, { n: prev.n + 1, port, to }].slice(-4) };
      if (to) next = { ...next, queues: pushQ(next.queues, to, `packet → port ${port}`) };
      if (to === "chat") next.inbox = [...prev.inbox, MESSAGES[prev.inbox.length % MESSAGES.length]].slice(-4);
      if (to === "browser") next.pieces = prev.pieces + 1;
      if (to === "music") next.songData = prev.songData + 1;
      return next;
    });

  // Which layers are painted (only matters on the "pixels" tab).
  const layerShown = (k: number) => tab !== "pixels" || paint >= k + 1;
  const ports = Object.values(d.wins).sort((a, b) => a.port - b.port);

  return (
    <Widget
      title="Who gets the key, the click, the packet and the pixels?"
      subtitle="Click a window, then type: keys go to the focused window. Drag windows by their title bars. Use the tabs to see how the screen image is built and where network packets go."
      wide
    >
      <Segmented
        size="sm"
        value={tab}
        onChange={setTab}
        options={[
          { value: "input", label: "Keys & clicks" },
          { value: "pixels", label: "Pixels" },
          { value: "network", label: "Network" },
        ]}
      />
      <div className="mt-3 grid gap-4 @3xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="surface-screen rounded-lg border-4 border-bezel p-0">
            <div
              ref={desk}
              tabIndex={0}
              role="application"
              aria-label="A toy desktop with three windows. Click a window to focus it, then type."
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onKeyDown}
              className="relative aspect-video w-full cursor-default overflow-hidden rounded select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              style={
                layerShown(0)
                  ? {
                      backgroundImage:
                        "repeating-linear-gradient(45deg, var(--color-screen) 0 14px, color-mix(in oklab, var(--color-screen-2) 55%, var(--color-screen)) 14px 28px)",
                    }
                  : { background: "var(--color-screen)" }
              }
            >
              {d.order.map((id, z) => {
                const w = d.wins[id];
                if (!layerShown(z + 1)) return null;
                const focused = d.focus === id;
                return (
                  <div
                    key={id}
                    className={cx(
                      "absolute flex flex-col overflow-hidden rounded border bg-panel text-[0.6875rem] leading-tight",
                      focused ? cx(INK[w.ink].border, INK[w.ink].halo) : "border-screen-dim",
                    )}
                    style={{
                      left: `${(w.x / SW) * 100}%`,
                      top: `${(w.y / SH) * 100}%`,
                      width: `${(w.w / SW) * 100}%`,
                      height: `${(w.h / SH) * 100}%`,
                      zIndex: z + 1,
                    }}
                  >
                    <div
                      data-titlebar
                      className={cx(
                        "flex cursor-grab touch-none items-center gap-1 border-b border-screen-dim px-1.5 py-0.5 font-semibold active:cursor-grabbing",
                        INK[w.ink].text,
                      )}
                    >
                      <span className="truncate">{w.name}</span>
                      {focused && <span className="ml-auto shrink-0 font-normal text-mute">focus</span>}
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden px-1.5 py-1 text-mute">
                      <WinContent id={id} d={d} />
                    </div>
                  </div>
                );
              })}
              {d.hit && tab === "input" && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 font-mono text-base leading-none font-bold text-pink"
                  style={{ left: `${(d.hit.x / SW) * 100}%`, top: `${(d.hit.y / SH) * 100}%` }}
                >
                  +
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-mute">Keys (or use your keyboard):</span>
            {["h", "i", "!", " "].map((k) => (
              <Btn key={k} onClick={() => sendKey(k)} className="min-w-9 font-mono">
                {k === " " ? "space" : k}
              </Btn>
            ))}
            <Btn onClick={() => sendKey("Backspace")} className="font-mono">
              ⌫
            </Btn>
          </div>
        </div>

        <div className="min-w-0 text-sm">
          {tab === "input" && (
            <div className="space-y-3">
              <div>
                <div className="label-caps text-[0.6875rem] text-dim">Focus</div>
                <div className="text-ink">
                  {d.focus ? (
                    <>
                      Keys go to <span className={cx("font-semibold", INK[d.wins[d.focus].ink].text)}>{d.wins[d.focus].name}</span>
                    </>
                  ) : (
                    "No window has the focus: keys are not delivered"
                  )}
                </div>
                {d.lastKey && (
                  <div className="text-xs text-mute">
                    last key '{d.lastKey.k === " " ? "space" : d.lastKey.k === "Backspace" ? "⌫" : d.lastKey.k}' →{" "}
                    {d.lastKey.to ? d.wins[d.lastKey.to].name : "dropped"}
                  </div>
                )}
              </div>
              <div>
                <div className="label-caps text-[0.6875rem] text-dim">Last click: hit test, front to back</div>
                {d.hit ? (
                  <div>
                    <div className="font-mono text-xs text-ink">
                      screen ({d.hit.x}, {d.hit.y})
                    </div>
                    <ol className="mt-1 space-y-0.5 text-xs">
                      {d.hit.tests.map((t) => (
                        <li key={t.id} className={t.inside ? "font-semibold text-ink" : "text-mute"}>
                          {t.inside ? "✓" : "✗"} {d.wins[t.id].name}: inside its rectangle?{" "}
                          {t.inside ? "yes → it gets the click" : "no"}
                        </li>
                      ))}
                      {!d.hit.winner && <li className="text-mute">→ nobody: the click hits the wallpaper</li>}
                    </ol>
                    {d.hit.winner && (
                      <div className="mt-1 font-mono text-xs text-mute">
                        in {d.wins[d.hit.winner].name}'s own coordinates: ({d.hit.x - d.wins[d.hit.winner].x},{" "}
                        {d.hit.y - d.wins[d.hit.winner].y})
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-mute">Click anywhere on the screen.</div>
                )}
              </div>
              <div>
                <div className="label-caps text-[0.6875rem] text-dim">Event queues</div>
                <div className="mt-1 space-y-1">
                  {(["chat", "browser", "music"] as WinId[]).map((id) => (
                    <div key={id} className="flex gap-2 text-xs">
                      <span className={cx("w-14 shrink-0 font-semibold", INK[d.wins[id].ink].text)}>
                        {d.wins[id].name}
                      </span>
                      <span className="min-w-0 font-mono text-ink">
                        {d.queues[id].length ? d.queues[id].join(" · ") : <span className="text-dim">empty</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "pixels" && (
            <div className="space-y-3">
              <p className="font-serif text-[0.9375rem] text-body">
                Each app draws only into its own private image in RAM. The compositor paints them onto the real
                screen image, back to front.
              </p>
              <ol className="space-y-1.5">
                <li className={cx("flex items-baseline gap-2 text-xs", paint >= 1 ? "text-ink" : "text-dim")}>
                  <span className="w-4 font-mono">1</span>
                  <span className="font-semibold">Wallpaper</span>
                  <span className="font-mono text-mute">1920 × 1080</span>
                  {paint >= 1 && <span className="ml-auto">✓</span>}
                </li>
                {d.order.map((id, z) => {
                  const w = d.wins[id];
                  const done = paint >= z + 2;
                  return (
                    <li key={id} className={cx("flex items-baseline gap-2 text-xs", done ? "text-ink" : "text-dim")}>
                      <span className="w-4 font-mono">{z + 2}</span>
                      <span className={cx("font-semibold", done && INK[w.ink].text)}>{w.name}</span>
                      <span className="font-mono text-mute">
                        {w.w} × {w.h} × 4 B = {fmt(w.w * w.h * 4)} B
                      </span>
                      {done && <span className="ml-auto">✓</span>}
                    </li>
                  );
                })}
              </ol>
              <div className="flex flex-wrap gap-2">
                <Btn variant="primary" onClick={() => setPaint((p) => Math.min(4, p + 1))} disabled={paint >= 4}>
                  Paint next layer
                </Btn>
                <Btn onClick={() => setPaint(0)}>Clear the screen</Btn>
              </div>
              <div className="font-mono text-xs text-mute">
                screen image: 1920 × 1080 × 4 B = {fmt(1920 * 1080 * 4)} B, rebuilt up to 60 times a second
              </div>
            </div>
          )}

          {tab === "network" && (
            <div className="space-y-3">
              <div>
                <div className="label-caps text-[0.6875rem] text-dim">Port table (kept by the kernel)</div>
                <div className="mt-1 space-y-0.5 font-mono text-xs">
                  {ports.map((w) => (
                    <div key={w.id} className="flex gap-2">
                      <span className="text-ink">port {w.port}</span>
                      <span className="text-dim">→</span>
                      <span className={cx("font-sans font-semibold", INK[w.ink].text)}>{w.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...ports.map((w) => w.port), 40000].map((p) => (
                  <Btn key={p} onClick={() => sendPacket(p)} className="font-mono">
                    → {p}
                  </Btn>
                ))}
              </div>
              <div>
                <div className="label-caps text-[0.6875rem] text-dim">Packets that arrived</div>
                {d.packets.length === 0 ? (
                  <div className="text-xs text-mute">Send a packet with the buttons above.</div>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {d.packets.map((p) => (
                      <li key={p.n} className={p.to ? "text-ink" : "text-pink"}>
                        <span className="font-mono">port {p.port}</span> →{" "}
                        {p.to ? `${d.wins[p.to].name} ✓` : "no app is listening: dropped ✗"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-xs text-mute">
                The focus doesn't matter here: a packet for Chat reaches Chat even when it is behind other windows.
              </p>
            </div>
          )}
        </div>
      </div>
    </Widget>
  );
}
