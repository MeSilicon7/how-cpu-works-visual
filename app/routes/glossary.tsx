import { useMemo, useState } from "react";
import { Link } from "react-router";

import { ChipLogo } from "~/components/logo";
import { ThemeToggle } from "~/components/theme-toggle";
import { cx } from "~/components/ui";
import { chapterIndex, chapters } from "~/lib/chapters";
import { letterOf, sortedGlossary, type Term } from "~/lib/glossary";

export const meta = () => [
  { title: "Glossary — How a Computer Works" },
  { name: "description", content: "Every technical word in the book, explained in one or two plain sentences." },
];

const letters = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

function termId(t: Term) {
  return (
    "term-" +
    t.term
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

export default function Glossary() {
  const all = useMemo(() => sortedGlossary(), []);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q
    ? all.filter((t) => `${t.term} ${t.aka ?? ""} ${t.def}`.toLowerCase().includes(q))
    : all;
  const groups = letters
    .map((l) => ({ l, items: shown.filter((t) => letterOf(t) === l) }))
    .filter((g) => g.items.length > 0);
  const present = new Set(all.map(letterOf));

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-ink">
          <ChipLogo className="h-7 w-7" />
          <span className="font-display text-base font-semibold whitespace-nowrap sm:text-lg">How a Computer Works</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/#contents"
            className="rounded-md px-3 py-2 text-sm font-semibold text-mute hover:bg-panel-2 hover:text-ink"
          >
            Contents
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-8 pb-24 sm:px-6">
        <p className="label-caps text-dim">Back matter</p>
        <h1 className="mt-2 font-display text-[clamp(2.5rem,2rem+2vw,3.5rem)] leading-tight font-semibold">Glossary</h1>
        <p className="mt-3 max-w-2xl font-serif text-lg text-mute italic">
          Every technical word in the book, in one or two plain sentences. Each entry points to the chapter that
          explains it properly.
        </p>

        <div className="sticky top-0 z-10 -mx-4 mt-8 border-b border-line bg-bg/95 px-4 pt-3 pb-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <label className="block">
            <span className="sr-only">Search the glossary</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${all.length} terms…`}
              className="w-full rounded-md border border-line-2 bg-panel px-3 py-2 font-sans text-base text-ink placeholder:text-dim focus:border-ink focus:outline-none"
            />
          </label>
          {!q && (
            <nav aria-label="Jump to letter" className="scroll-thin mt-2 flex gap-x-0.5 overflow-x-auto font-sans text-sm sm:flex-wrap sm:overflow-visible">
              {letters.map((l) =>
                present.has(l) ? (
                  <a
                    key={l}
                    href={`#letter-${l === "#" ? "num" : l}`}
                    className="min-w-7 shrink-0 rounded px-1.5 py-1 text-center font-semibold text-ink hover:bg-panel-2"
                  >
                    {l}
                  </a>
                ) : (
                  <span key={l} className="min-w-7 shrink-0 px-1.5 py-1 text-center text-dim" aria-hidden>
                    {l}
                  </span>
                ),
              )}
            </nav>
          )}
        </div>

        {groups.length === 0 && (
          <p className="mt-10 font-serif text-lg text-mute">Nothing matches “{query}”. Try a shorter word.</p>
        )}

        {groups.map((g) => (
          <section key={g.l} id={`letter-${g.l === "#" ? "num" : g.l}`} className="mt-10 scroll-mt-36">
            <h2 className="border-b-2 border-ink pb-1 font-display text-3xl font-semibold">{g.l}</h2>
            <dl>
              {g.items.map((t) => {
                const idx = chapterIndex(t.slug);
                const ch = chapters[idx];
                return (
                  <div key={t.term} id={termId(t)} className="scroll-mt-36 border-b border-line py-4">
                    <dt className="font-serif text-lg font-semibold text-ink">
                      {t.term}
                      {t.aka && <span className="ml-2 font-normal text-mute italic">({t.aka})</span>}
                    </dt>
                    <dd className="mt-1 font-serif leading-relaxed text-body">
                      {t.def}{" "}
                      {ch && (
                        <Link
                          to={`/${ch.slug}`}
                          className={cx(
                            "font-sans text-sm font-semibold whitespace-nowrap text-cyan",
                            "underline decoration-1 underline-offset-4 hover:text-ink",
                          )}
                        >
                          → Ch. {idx + 1}, {ch.title}
                        </Link>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </main>
    </div>
  );
}
