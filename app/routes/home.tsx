import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import type { Route } from "./+types/home";
import { ChipLogo } from "~/components/logo";
import { ThemeToggle } from "~/components/theme-toggle";
import { cx } from "~/components/ui";
import { chapters, parts, partVar, roman } from "~/lib/chapters";
import { useReducedMotion } from "~/lib/hooks";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "How a Computer Works — an illustrated, hands-on book" },
    {
      name: "description",
      content:
        "A beginner-friendly, interactive book: from electricity and a single transistor to a working CPU, storage, the operating system, graphics, video and the internet — with all the math under the hood.",
    },
  ];
}

const ladder = [
  { label: "A message reaches your friend", sub: "networking", slug: "network" },
  { label: "A video plays", sub: "compression math", slug: "video" },
  { label: "Pixels light up", sub: "graphics, the monitor", slug: "graphics" },
  { label: "Many apps share one machine", sub: "the operating system", slug: "operating-system" },
  { label: "Bits get a meaning", sub: "text, colours, files", slug: "bits-meaning" },
  { label: "Your code becomes bits", sub: "machine code, the stack", slug: "machine-code" },
  { label: "A CPU runs instructions", sub: "fetch · decode · execute", slug: "cpu" },
  { label: "Bits are remembered", sub: "memory + clock", slug: "memory" },
  { label: "Gates do arithmetic", sub: "adder + ALU", slug: "adder" },
  { label: "Switches make decisions", sub: "logic gates", slug: "logic-gates" },
  { label: "One switch: on or off", sub: "transistor", slug: "transistor" },
  { label: "Electrons move in a loop", sub: "electricity", slug: "electricity" },
];

/** The highlight climbs the ladder, but only while it's on screen and motion is welcome. */
function useClimb(count: number) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLOListElement>(null);
  const [level, setLevel] = useState(count - 1);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (reduced || !visible) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setLevel((l) => (l <= 0 ? count - 1 : l - 1));
    }, 900);
    return () => clearInterval(id);
  }, [reduced, visible, count]);
  return { ref, level: reduced ? -1 : level };
}

export default function Home() {
  const { ref, level } = useClimb(ladder.length);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <ChipLogo className="h-7 w-7" />
        <span className="font-display text-base font-semibold whitespace-nowrap sm:text-lg">How a Computer Works</span>
        <div className="ml-auto flex items-center gap-1">
          <a
            href="#contents"
            className="rounded-md px-3 py-2 text-sm font-semibold text-mute hover:bg-panel-2 hover:text-ink"
          >
            Contents
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* Title page */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
        <div>
          <p className="label-caps text-dim">A hands-on illustrated book</p>
          <h1 className="mt-4 font-display text-[clamp(2.75rem,2rem+4vw,4.5rem)] leading-[1.02] font-semibold tracking-[-0.015em] text-balance">
            How a computer <em className="text-on">actually</em> works
          </h1>
          <p className="mt-6 max-w-xl font-serif text-xl leading-relaxed text-mute italic">
            From a single transistor to watching a video and sending a message. No magic: just switches, and math you
            can follow one line at a time.
          </p>
          <p className="mt-5 max-w-xl font-serif text-lg leading-relaxed text-body">
            When you press a key, watch a video, or send “hi” to a friend, billions of tiny switches flip on and off.
            This book walks you up from <strong className="text-ink">electricity</strong> to{" "}
            <strong className="text-ink">video and the internet</strong>. Every chapter has figures you can click, and
            every claim comes with the arithmetic.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/electricity"
              className="inline-flex items-center rounded-md border border-on bg-on px-5 py-3 font-semibold text-bg hover:border-on-2 hover:bg-on-2"
            >
              Begin reading →
            </Link>
            <a
              href="#contents"
              className="inline-flex items-center rounded-md border border-line-2 bg-panel px-5 py-3 font-semibold text-ink shadow-[inset_0_-1px_0_var(--color-line-2)] hover:border-off hover:bg-panel-2"
            >
              Contents
            </a>
          </div>
          <p className="mt-6 font-serif text-[0.9375rem] text-mute">
            For curious beginners. If you can multiply and divide, you can follow every equation here.
          </p>
        </div>

        <figure className="plate p-4 sm:p-6">
          <figcaption className="mb-3 flex items-baseline justify-between gap-3">
            <span className="label-caps text-[0.6875rem] text-dim">Zoom out ↑</span>
            <span className="hidden font-serif text-sm text-mute italic sm:inline">
              every layer is built from the one below
            </span>
          </figcaption>
          <ol ref={ref} className="relative">
            <span aria-hidden className="absolute top-4 bottom-4 left-[15px] w-px bg-ink/40" />
            {ladder.map((row, i) => {
              const active = i === level;
              const lit = level >= 0 && i >= level;
              return (
                <li key={row.slug + i}>
                  <Link
                    to={`/${row.slug}`}
                    className={cx(
                      "relative flex items-center gap-4 rounded-md py-1.5 pr-3 transition-colors",
                      active ? "bg-on-tint" : "hover:bg-panel-2",
                    )}
                  >
                    <span
                      className={cx(
                        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold transition-colors",
                        active
                          ? "border-on bg-on text-bg"
                          : lit
                            ? "border-on bg-panel text-on"
                            : "border-line-2 bg-panel text-dim",
                      )}
                    >
                      {ladder.length - i}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cx("block font-serif font-semibold", lit || level < 0 ? "text-ink" : "text-mute")}
                      >
                        {row.label}
                      </span>
                      <span className="block font-sans text-xs text-dim">{row.sub}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </figure>
      </section>

      {/* Contents */}
      <section id="contents" className="mx-auto max-w-4xl scroll-mt-6 px-4 pb-16 sm:px-6">
        <div className="border-t-2 border-ink pt-6">
          <h2 className="font-display text-4xl font-semibold">Contents</h2>
          <p className="mt-2 max-w-2xl font-serif text-lg text-mute italic">
            {chapters.length} chapters in {parts.length} parts. Read them in order: each one only uses ideas from the
            chapters before it.
          </p>
        </div>
        <div className="mt-10 space-y-12">
          {parts.map((p, pi) => (
            <div key={p.id}>
              <p className="label-caps" style={{ color: partVar[p.id] }}>
                Part {roman[pi]}
              </p>
              <h3 className="mt-1 font-display text-2xl font-semibold">{p.title}</h3>
              <p className="mt-1 font-serif text-mute italic">{p.blurb}</p>
              <ol className="mt-4 border-t border-line">
                {chapters
                  .map((c, i) => ({ c, i }))
                  .filter(({ c }) => c.part === p.id)
                  .map(({ c, i }) => (
                    <li key={c.slug} className="border-b border-line">
                      <Link
                        to={`/${c.slug}`}
                        className="group grid grid-cols-[2.5rem_1fr] items-baseline gap-x-2 py-3 hover:bg-panel sm:grid-cols-[2.5rem_1fr_auto]"
                      >
                        <span
                          className="text-right font-display text-xl font-semibold tabular-nums"
                          style={{ color: partVar[p.id] }}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0 pl-2">
                          <span className="font-serif text-lg font-semibold text-ink decoration-1 underline-offset-4 group-hover:underline">
                            {c.title}
                          </span>
                          <span className="block font-serif text-mute italic">{c.tagline}</span>
                        </span>
                        <span className="hidden pr-2 font-mono text-[0.8125rem] text-dim sm:block">{c.scale}</span>
                      </Link>
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* How to read this book */}
      <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
        <div className="border-t-2 border-ink pt-6">
          <h2 className="font-display text-2xl font-semibold">How to read this book</h2>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-3 md:gap-0">
          {[
            {
              tag: "Try it",
              color: "var(--color-ink)",
              title: "Click everything",
              body: "Every figure is alive: flip switches, step a CPU one clock tick at a time, drag a triangle's corners, lose a packet on the internet.",
            },
            {
              tag: "The math",
              color: "var(--color-amber)",
              title: "Real numbers, worked out",
              body: "Every claim comes with the arithmetic: why 3 GHz means 0.33 ns, and why an hour of video would be 672 GB without compression.",
            },
            {
              tag: "Go deeper",
              color: "var(--color-amber)",
              title: "Optional deep dives",
              body: "Two's complement, floating point, the DCT formula, Diffie–Hellman. Open them when you're ready; skip them if you're not.",
            },
          ].map((f, i) => (
            <div key={f.tag} className={cx("md:px-6", i > 0 && "md:border-l md:border-line", i === 0 && "md:pl-0")}>
              <p className="label-caps" style={{ color: f.color }}>
                {f.tag}
              </p>
              <p className="mt-2 font-serif text-lg font-semibold text-ink">{f.title}</p>
              <p className="mt-1 font-serif leading-relaxed text-body">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
