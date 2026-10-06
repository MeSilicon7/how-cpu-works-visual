import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

import { ChipLogo } from "~/components/logo";
import { cx } from "~/components/ui";
import { chapterIndex, chapters, partOf, parts } from "~/lib/chapters";

const partColor: Record<string, string> = {
  switch: "bg-on",
  machine: "bg-cyan",
  storage: "bg-violet",
  scenes: "bg-amber",
};
const partText: Record<string, string> = {
  switch: "text-on",
  machine: "text-cyan",
  storage: "text-violet",
  scenes: "text-amber",
};

export default function ChapterLayout() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
  const idx = chapterIndex(slug);
  const chapter = chapters[idx];
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx < chapters.length - 1 ? chapters[idx + 1] : null;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  if (!chapter) return <Outlet />;
  const part = partOf(chapter);
  const partNo = parts.findIndex((p) => p.id === part.id) + 1;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-ink hover:text-on">
            <ChipLogo className="h-7 w-7" />
            <span className="hidden sm:inline">How a Computer Works</span>
          </Link>
          <span className="hidden text-line-2 sm:inline">/</span>
          <span className="truncate text-sm text-mute">
            <span className="font-mono text-dim">{String(idx + 1).padStart(2, "0")}</span> {chapter.title}
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="ml-auto flex items-center gap-2 rounded-lg border border-line-2 bg-panel-2 px-3 py-1.5 text-sm text-ink hover:border-dim"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Chapters
          </button>
        </div>
        {/* progress: one segment per chapter */}
        <nav aria-label="Chapter progress" className="mx-auto flex max-w-6xl gap-[3px] px-4 pb-2">
          {chapters.map((c, i) => (
            <Link
              key={c.slug}
              to={`/${c.slug}`}
              title={`${i + 1}. ${c.title}`}
              className={cx(
                "h-1.5 flex-1 rounded-full transition-all hover:opacity-100",
                i <= idx ? partColor[c.part] : "bg-line-2",
                i === idx ? "opacity-100 shadow-[0_0_10px_currentColor]" : i < idx ? "opacity-60" : "opacity-100",
              )}
            />
          ))}
        </nav>
      </header>

      {menuOpen && <ChapterMenu currentIdx={idx} onClose={() => setMenuOpen(false)} />}

      <main className="mx-auto max-w-3xl px-4 pt-12 pb-24 sm:px-6">
        <div className="mb-10">
          <div className={cx("font-mono text-xs font-semibold tracking-[0.2em] uppercase", partText[part.id])}>
            Part {partNo} · {part.title} — Chapter {idx + 1}
          </div>
          <h1 className="mt-3 text-4xl leading-tight font-extrabold tracking-tight text-ink sm:text-5xl">
            {chapter.title}
          </h1>
          <p className="mt-3 text-xl text-mute">{chapter.tagline}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {chapter.learn.map((l) => (
              <li key={l} className="rounded-full border border-line-2 bg-panel/70 px-3 py-1 text-sm text-ink/80">
                {l}
              </li>
            ))}
          </ul>
        </div>

        <article className="prose-cpu">
          <Outlet />
        </article>

        <nav className="mt-20 grid gap-3 sm:grid-cols-2" aria-label="Chapter navigation">
          {prev ? (
            <Link
              to={`/${prev.slug}`}
              className="group rounded-2xl border border-line-2 bg-panel p-5 transition hover:border-dim"
            >
              <div className="font-mono text-xs text-dim">← Previous</div>
              <div className="mt-1 font-semibold text-ink group-hover:text-on">{prev.title}</div>
            </Link>
          ) : (
            <Link to="/" className="group rounded-2xl border border-line-2 bg-panel p-5 transition hover:border-dim">
              <div className="font-mono text-xs text-dim">← Back</div>
              <div className="mt-1 font-semibold text-ink group-hover:text-on">The big map</div>
            </Link>
          )}
          {next ? (
            <Link
              to={`/${next.slug}`}
              className="group rounded-2xl border border-on/40 bg-on/[0.06] p-5 text-right transition hover:border-on"
            >
              <div className="font-mono text-xs text-on/80">Next →</div>
              <div className="mt-1 font-semibold text-ink group-hover:text-on">{next.title}</div>
              <div className="mt-0.5 text-sm text-mute">{next.tagline}</div>
            </Link>
          ) : (
            <Link
              to="/"
              className="group rounded-2xl border border-on/40 bg-on/[0.06] p-5 text-right transition hover:border-on"
            >
              <div className="font-mono text-xs text-on/80">You made it →</div>
              <div className="mt-1 font-semibold text-ink group-hover:text-on">See the whole map again</div>
            </Link>
          )}
        </nav>
      </main>
    </div>
  );
}

function ChapterMenu({ currentIdx, onClose }: { currentIdx: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="All chapters">
      <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="scroll-thin absolute top-0 right-0 h-full w-full max-w-sm overflow-y-auto border-l border-line-2 bg-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-ink">
            <ChipLogo className="h-6 w-6" /> All chapters
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-mute hover:bg-panel-2 hover:text-ink"
          >
            ✕
          </button>
        </div>
        {parts.map((p, pi) => (
          <div key={p.id} className="mb-5">
            <div className={cx("mb-2 font-mono text-[0.7rem] font-semibold tracking-widest uppercase", partText[p.id])}>
              Part {pi + 1} · {p.title}
            </div>
            <ul className="space-y-1">
              {chapters
                .map((c, i) => ({ c, i }))
                .filter(({ c }) => c.part === p.id)
                .map(({ c, i }) => (
                  <li key={c.slug}>
                    <NavLink
                      to={`/${c.slug}`}
                      className={cx(
                        "flex items-baseline gap-3 rounded-lg px-3 py-2 text-sm transition",
                        i === currentIdx ? "bg-on/10 text-on" : "text-ink/85 hover:bg-panel-2",
                      )}
                    >
                      <span className="font-mono text-xs text-dim">{String(i + 1).padStart(2, "0")}</span>
                      {c.title}
                    </NavLink>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
