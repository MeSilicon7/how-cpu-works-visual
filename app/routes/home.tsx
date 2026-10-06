import { useState } from "react";
import { Link } from "react-router";

import type { Route } from "./+types/home";
import { ChipLogo } from "~/components/logo";
import { cx } from "~/components/ui";
import { chapters, parts } from "~/lib/chapters";
import { useInterval } from "~/lib/hooks";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "How a Computer Works — from transistor to video, visually" },
    {
      name: "description",
      content:
        "An interactive, beginner-friendly journey from a single transistor to a working CPU, storage, graphics, video and the internet — with all the math under the hood.",
    },
  ];
}

const ladder = [
  { label: "A message reaches your friend", sub: "networking", slug: "network" },
  { label: "A video plays", sub: "compression math", slug: "video" },
  { label: "Pixels light up", sub: "graphics", slug: "graphics" },
  { label: "Files are saved", sub: "storage", slug: "storage" },
  { label: "Your code becomes bits", sub: "machine code", slug: "machine-code" },
  { label: "A CPU runs instructions", sub: "fetch · decode · execute", slug: "cpu" },
  { label: "Bits are remembered", sub: "memory + clock", slug: "memory" },
  { label: "Gates do arithmetic", sub: "adder + ALU", slug: "adder" },
  { label: "Switches make decisions", sub: "logic gates", slug: "logic-gates" },
  { label: "One switch: on or off", sub: "transistor", slug: "transistor" },
];

const partAccent: Record<string, { text: string; border: string; bg: string }> = {
  switch: { text: "text-on", border: "hover:border-on/60", bg: "bg-on" },
  machine: { text: "text-cyan", border: "hover:border-cyan/60", bg: "bg-cyan" },
  storage: { text: "text-violet", border: "hover:border-violet/60", bg: "bg-violet" },
  scenes: { text: "text-amber", border: "hover:border-amber/60", bg: "bg-amber" },
};

export default function Home() {
  // The glow climbs the ladder from the transistor (bottom) to the message (top).
  const [level, setLevel] = useState(ladder.length - 1);
  useInterval(() => setLevel((l) => (l <= 0 ? ladder.length - 1 : l - 1)), 650);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <ChipLogo className="h-8 w-8" />
        <span className="font-semibold">How a Computer Works</span>
        <Link
          to="/transistor"
          className="ml-auto rounded-lg border border-line-2 bg-panel-2 px-3 py-1.5 text-sm hover:border-on hover:text-on"
        >
          Start →
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div>
          <div className="font-mono text-xs font-semibold tracking-[0.25em] text-on uppercase">
            No magic. Just switches and math.
          </div>
          <h1 className="mt-4 text-5xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
            How a computer <span className="text-on drop-shadow-[0_0_20px_rgb(61_255_160/0.45)]">actually</span> works
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-mute">
            When you press a key, watch a video, or send “hi” to a friend, billions of tiny switches flip on and off.
            This is a hands-on journey from <strong className="text-ink">one transistor</strong> all the way up to{" "}
            <strong className="text-ink">video and the internet</strong>. Every step has something you can click, and
            all the math is shown, one line at a time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/transistor"
              className="rounded-xl bg-on px-5 py-3 font-semibold text-bg shadow-[0_0_30px_-6px_var(--color-on)] hover:bg-on-2"
            >
              Start with the transistor →
            </Link>
            <a
              href="#map"
              className="rounded-xl border border-line-2 bg-panel-2 px-5 py-3 font-semibold text-ink hover:border-dim"
            >
              See the full map
            </a>
          </div>
          <p className="mt-6 text-sm text-dim">
            For curious beginners. If you can multiply and divide, you can follow every equation here.
          </p>
        </div>

        <div className="relative rounded-3xl border border-line-2 bg-panel/80 p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between font-mono text-[0.7rem] tracking-widest text-dim uppercase">
            <span>Zoom out ↑</span>
            <span className="hidden sm:inline">Every layer is built from the one below</span>
          </div>
          <ol className="relative">
            <span aria-hidden className="absolute top-3 bottom-3 left-[15px] w-[2px] bg-line-2" />
            {ladder.map((row, i) => {
              const active = i === level;
              const lit = i >= level;
              return (
                <li key={row.slug + i}>
                  <Link
                    to={`/${row.slug}`}
                    className={cx(
                      "relative flex items-center gap-4 rounded-xl py-2 pr-3 pl-0 transition-colors",
                      active ? "bg-on/10" : "hover:bg-panel-2",
                    )}
                  >
                    <span
                      className={cx(
                        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-mono text-[0.65rem] font-bold transition-all",
                        active
                          ? "border-on bg-on text-bg shadow-[0_0_18px_var(--color-on)]"
                          : lit
                            ? "border-on bg-bg text-on"
                            : "border-line-2 bg-bg text-dim",
                      )}
                    >
                      {ladder.length - i}
                    </span>
                    <span className="min-w-0">
                      <span className={cx("block font-medium transition-colors", lit ? "text-ink" : "text-mute")}>
                        {row.label}
                      </span>
                      <span className="block font-mono text-xs text-dim">{row.sub}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section id="map" className="mx-auto max-w-6xl scroll-mt-6 px-4 pb-16">
        <h2 className="text-3xl font-bold tracking-tight">The journey</h2>
        <p className="mt-2 max-w-2xl text-mute">
          14 chapters in four parts. Read them in order: each one uses only ideas from the chapters before it.
        </p>
        <div className="mt-10 space-y-12">
          {parts.map((p, pi) => {
            const accent = partAccent[p.id];
            return (
              <div key={p.id}>
                <div className="flex items-baseline gap-3">
                  <span className={cx("font-mono text-sm font-semibold tracking-widest uppercase", accent.text)}>
                    Part {pi + 1}
                  </span>
                  <h3 className="text-xl font-semibold">{p.title}</h3>
                </div>
                <p className="mt-1 text-mute">{p.blurb}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {chapters
                    .map((c, i) => ({ c, i }))
                    .filter(({ c }) => c.part === p.id)
                    .map(({ c, i }) => (
                      <Link
                        key={c.slug}
                        to={`/${c.slug}`}
                        className={cx(
                          "group relative overflow-hidden rounded-2xl border border-line-2 bg-panel p-5 transition",
                          accent.border,
                        )}
                      >
                        <span className={cx("absolute top-0 left-0 h-full w-1 opacity-60", accent.bg)} />
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-mono text-xs text-dim">{String(i + 1).padStart(2, "0")}</span>
                          <span className="font-mono text-[0.7rem] text-dim">{c.scale}</span>
                        </div>
                        <div className="mt-1 text-lg font-semibold text-ink">{c.title}</div>
                        <div className="mt-1 text-sm text-mute">{c.tagline}</div>
                      </Link>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              tag: "Try it",
              cls: "text-on border-on/40 bg-on/10",
              title: "Click everything",
              body: "Flip switches, step a CPU one micro-operation at a time, drag triangle corners, and drop packets on the internet.",
            },
            {
              tag: "The math",
              cls: "text-amber border-amber/40 bg-amber/10",
              title: "Real numbers, worked out",
              body: "Every claim comes with the arithmetic: why 3 GHz means 0.33 ns, and why an hour of video would be 672 GB uncompressed.",
            },
            {
              tag: "Go deeper",
              cls: "text-cyan border-cyan/40 bg-cyan/10",
              title: "Optional rabbit holes",
              body: "Two's complement, floating point, the DCT formula, Diffie–Hellman. Open them when you're ready; skip them if you're not.",
            },
          ].map((f) => (
            <div key={f.tag} className="rounded-2xl border border-line-2 bg-panel p-5">
              <span
                className={cx("rounded-md border px-2 py-0.5 font-mono text-[0.7rem] font-semibold uppercase", f.cls)}
              >
                {f.tag}
              </span>
              <div className="mt-3 font-semibold">{f.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-mute">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
