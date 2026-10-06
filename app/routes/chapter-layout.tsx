import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, Outlet, useLocation } from "react-router";

import { ChipLogo } from "~/components/logo";
import { ThemeSwitchRow, ThemeToggle } from "~/components/theme-toggle";
import { goToSection, useArticleSections, type Section } from "~/components/toc";
import { cx } from "~/components/ui";
import { chapterIndex, chapters, partOf, parts, partVar, roman, type Chapter } from "~/lib/chapters";

export default function ChapterLayout() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
  const idx = chapterIndex(slug);
  const chapter = chapters[idx];
  const articleRef = useRef<HTMLElement>(null);
  const { sections, active, progress } = useArticleSections(articleRef, pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (!chapter) return <Outlet />;
  const part = partOf(chapter);
  const partNo = parts.findIndex((p) => p.id === part.id);
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx < chapters.length - 1 ? chapters[idx + 1] : null;

  return (
    <div className="min-h-screen" style={{ "--part-c": partVar[part.id] } as CSSProperties}>
      <SiteHeader
        chapter={chapter}
        idx={idx}
        sections={sections}
        active={active}
        progress={progress}
        onOpenMenu={() => setMenuOpen(true)}
      />

      <div className="mx-auto w-full max-w-[86rem] px-4 sm:px-6 xl:grid xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-x-14 xl:px-8">
        <aside className="hidden xl:block" aria-label="Table of contents">
          <TocRail currentIdx={idx} sections={sections} active={active} />
        </aside>

        <main id="main" className="chapter-main min-w-0 pb-24">
          <header className="mx-auto mb-10 max-w-[var(--measure)] border-b border-line pt-12 pb-10 sm:pt-16">
            <p className="label-caps" style={{ color: "var(--part-c)" }}>
              Part {roman[partNo]} · {part.title}
            </p>
            <p
              aria-hidden
              className="mt-6 font-display text-[3.5rem] leading-none font-light tabular-nums sm:text-[4.5rem]"
              style={{ color: "var(--part-c)" }}
            >
              {idx + 1}
            </p>
            <h1 className="mt-2 font-display text-[clamp(2.375rem,1.6rem+3vw,3.5rem)] leading-[1.05] font-semibold tracking-[-0.01em] text-balance text-ink">
              <span className="sr-only">Chapter {idx + 1}: </span>
              {chapter.title}
            </h1>
            <p className="mt-4 font-serif text-[1.1875rem] leading-snug text-pretty text-mute italic sm:text-xl">
              {chapter.tagline}
            </p>
            <p className="label-caps mt-8 text-dim">In this chapter</p>
            <ul className="mt-2.5 space-y-1.5 font-serif text-[1.0625rem] text-body">
              {chapter.learn.map((l) => (
                <li key={l} className="flex gap-3">
                  <span aria-hidden style={{ color: "var(--part-c)" }}>
                    →
                  </span>
                  {l}
                </li>
              ))}
            </ul>
          </header>

          <article ref={articleRef} className="prose-book" style={{ counterReset: `chap ${idx + 1} fig` }}>
            <Outlet />
          </article>

          <nav
            className="mx-auto mt-20 grid max-w-[var(--fig-w)] gap-6 border-t-2 border-ink pt-6 sm:grid-cols-2"
            aria-label="Chapter navigation"
          >
            {prev ? (
              <Link to={`/${prev.slug}`} className="group -m-3 block rounded-md p-3 hover:bg-panel">
                <div className="label-caps text-dim">← Previous chapter</div>
                <div className="mt-1 font-display text-xl font-semibold text-ink decoration-1 underline-offset-4 group-hover:underline">
                  {prev.title}
                </div>
              </Link>
            ) : (
              <Link to="/" className="group -m-3 block rounded-md p-3 hover:bg-panel">
                <div className="label-caps text-dim">← Back to</div>
                <div className="mt-1 font-display text-xl font-semibold text-ink decoration-1 underline-offset-4 group-hover:underline">
                  The contents
                </div>
              </Link>
            )}
            <Link
              to={next ? `/${next.slug}` : "/"}
              className="group -m-3 block rounded-md p-3 hover:bg-panel sm:text-right"
            >
              <div className="label-caps text-dim">{next ? "Next chapter →" : "You finished the book →"}</div>
              <div className="mt-1 font-display text-xl font-semibold text-ink decoration-1 underline-offset-4 group-hover:underline">
                {next ? next.title : "Back to the contents"}
              </div>
              {next && <div className="mt-0.5 font-serif text-mute italic">{next.tagline}</div>}
            </Link>
          </nav>
        </main>
      </div>

      {menuOpen && (
        <ChapterMenu currentIdx={idx} sections={sections} active={active} onClose={() => setMenuOpen(false)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header with running head, section menu and reading progress          */
/* ------------------------------------------------------------------ */

function SiteHeader({
  chapter,
  idx,
  sections,
  active,
  progress,
  onOpenMenu,
}: {
  chapter: Chapter;
  idx: number;
  sections: Section[];
  active: string | null;
  progress: number;
  onOpenMenu: () => void;
}) {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const activeTitle = sections.find((s) => s.id === active)?.title;

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <header
      ref={headerRef}
      data-site-header
      className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-[6px]"
    >
      <div className="mx-auto flex h-[var(--header-h)] max-w-[86rem] items-center gap-2 px-4 sm:px-6 xl:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-ink">
          <ChipLogo className="h-6 w-6" />
          <span className="hidden font-display text-[1.0625rem] font-semibold sm:inline">How a Computer Works</span>
        </Link>
        <span aria-hidden className="mx-1 hidden h-5 w-px bg-line-2 sm:block" />
        <span className="hidden min-w-0 truncate font-sans text-sm text-mute xl:block">
          Chapter {idx + 1} · {chapter.title}
        </span>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="section-menu"
          className="flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-panel-2 xl:hidden"
        >
          <span className="font-mono text-xs text-dim">{idx + 1}</span>
          <span className="truncate font-semibold text-ink">{activeTitle ?? chapter.title}</span>
          <svg
            viewBox="0 0 12 12"
            className={cx("h-3 w-3 shrink-0 text-dim transition-transform", open && "rotate-180")}
            aria-hidden
          >
            <path d="M2 4.5 6 8l4-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-semibold text-mute hover:bg-panel-2 hover:text-ink xl:hidden"
            aria-haspopup="dialog"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
              <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">Contents</span>
          </button>
          <ThemeToggle />
        </div>
      </div>
      <div
        aria-hidden
        className="absolute inset-x-0 -bottom-px h-0.5 origin-left"
        style={{ background: "var(--part-c)", transform: `scaleX(${progress})` }}
      />

      {open && (
        <div
          id="section-menu"
          className="absolute inset-x-0 top-full max-h-[min(70dvh,32rem)] overflow-y-auto border-b border-line bg-bg shadow-[0_12px_24px_-16px_rgb(0_0_0/0.35)] xl:hidden"
        >
          <div className="mx-auto max-w-[40rem] px-4 py-3">
            <p className="label-caps text-dim">
              Chapter {idx + 1} · {chapter.title}
            </p>
            <ol className="mt-2 border-l border-line">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setOpen(false);
                      goToSection(s.id);
                    }}
                    aria-current={s.id === active ? "location" : undefined}
                    className={cx(
                      "-ml-px block border-l-2 py-2.5 pr-1 pl-3 font-sans text-[0.9375rem]",
                      s.id === active
                        ? "border-ink font-semibold text-ink"
                        : "border-transparent text-mute hover:text-ink",
                    )}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenMenu();
              }}
              className="mt-3 rounded-md px-3 py-2 text-sm font-semibold text-cyan hover:bg-panel-2"
            >
              All chapters →
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Book-level table of contents                                         */
/* ------------------------------------------------------------------ */

function ChapterList({
  currentIdx,
  sections,
  active,
  onNavigate,
  big,
}: {
  currentIdx: number;
  sections: Section[];
  active: string | null;
  onNavigate?: () => void;
  big?: boolean;
}) {
  return (
    <>
      {parts.map((p, pi) => (
        <div key={p.id}>
          <p className="label-caps mt-5 mb-1.5 text-[0.6875rem]" style={{ color: partVar[p.id] }}>
            Part {roman[pi]} · {p.title}
          </p>
          <ol>
            {chapters
              .map((c, i) => ({ c, i }))
              .filter(({ c }) => c.part === p.id)
              .map(({ c, i }) => {
                const current = i === currentIdx;
                return (
                  <li key={c.slug}>
                    <Link
                      to={`/${c.slug}`}
                      onClick={onNavigate}
                      aria-current={current ? "page" : undefined}
                      className={cx(
                        "-ml-px flex gap-2.5 rounded-r-sm border-l-2 pr-2 pl-2.5",
                        big ? "py-2" : "py-1",
                        current
                          ? "font-semibold text-ink"
                          : "border-transparent text-mute hover:bg-panel-2 hover:text-ink",
                      )}
                      style={current ? { borderColor: partVar[p.id] } : undefined}
                    >
                      <span className="w-5 shrink-0 text-right text-dim tabular-nums">{i + 1}</span>
                      <span className="min-w-0">{c.title}</span>
                    </Link>
                    {current && sections.length > 0 && (
                      <ol className="mt-1 mb-2 ml-[1.9rem] border-l border-line">
                        {sections.map((s) => (
                          <li key={s.id}>
                            <a
                              href={`#${s.id}`}
                              data-section={s.id}
                              onClick={(e) => {
                                e.preventDefault();
                                onNavigate?.();
                                goToSection(s.id);
                              }}
                              aria-current={s.id === active ? "location" : undefined}
                              className={cx(
                                "-ml-px block border-l-2 py-1 pr-1 pl-3",
                                big ? "text-[0.9375rem]" : "text-[0.8125rem]",
                                s.id === active
                                  ? "border-ink font-semibold text-ink"
                                  : "border-transparent text-dim hover:text-ink",
                              )}
                            >
                              {s.title}
                            </a>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
          </ol>
        </div>
      ))}
    </>
  );
}

function TocRail({ currentIdx, sections, active }: { currentIdx: number; sections: Section[]; active: string | null }) {
  const navRef = useRef<HTMLElement>(null);
  // Keep the active section visible inside the rail without scrolling the page.
  useEffect(() => {
    const nav = navRef.current;
    const item = nav?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!nav || !item) return;
    const top = item.offsetTop - nav.offsetTop;
    if (top < nav.scrollTop + 40 || top > nav.scrollTop + nav.clientHeight - 60) {
      nav.scrollTop = top - nav.clientHeight / 2;
    }
  }, [active]);
  return (
    <nav
      ref={navRef}
      className="scroll-thin sticky top-[calc(var(--header-h)+2rem)] max-h-[calc(100dvh-var(--header-h)-3rem)] overflow-y-auto overscroll-contain pt-10 pr-2 pb-6 font-sans text-[0.875rem] leading-snug"
    >
      <Link to="/" className="label-caps text-dim hover:text-ink">
        Contents
      </Link>
      <ChapterList currentIdx={currentIdx} sections={sections} active={active} />
      <p className="label-caps mt-5 mb-1.5 text-[0.6875rem] text-dim">Back matter</p>
      <Link to="/glossary" className="block py-1 pl-[2.6rem] text-mute hover:bg-panel-2 hover:text-ink">
        Glossary
      </Link>
    </nav>
  );
}

function ChapterMenu({
  currentIdx,
  sections,
  active,
  onClose,
}: {
  currentIdx: number;
  sections: Section[];
  active: string | null;
  onClose: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sheet = sheetRef.current;
    sheet?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && sheet) {
        const items = Array.from(sheet.querySelectorAll<HTMLElement>("a, button"));
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="All chapters">
      <button type="button" aria-label="Close contents" className="absolute inset-0 bg-scrim" onClick={onClose} />
      <div
        ref={sheetRef}
        className="scroll-thin absolute top-0 right-0 h-full w-full max-w-sm overflow-y-auto border-l border-line bg-bg p-5 font-sans text-[0.9375rem] shadow-2xl"
      >
        <div className="mb-2 flex items-center justify-between">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-2 font-display text-lg font-semibold text-ink"
          >
            <ChipLogo className="h-6 w-6" /> Contents
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-md text-mute hover:bg-panel-2 hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="border-y border-line py-1">
          <ThemeSwitchRow />
        </div>
        <ChapterList currentIdx={currentIdx} sections={sections} active={active} onNavigate={onClose} big />
        <p className="label-caps mt-5 mb-1.5 text-[0.6875rem] text-dim">Back matter</p>
        <Link
          to="/glossary"
          onClick={onClose}
          className="block py-2 pl-[2.6rem] text-mute hover:bg-panel-2 hover:text-ink"
        >
          Glossary
        </Link>
      </div>
    </div>
  );
}
