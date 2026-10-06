import { useEffect, useState, type RefObject } from "react";

export interface Section {
  id: string;
  title: string;
}

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "section"
  );
}

function headerHeight() {
  const h = document.querySelector<HTMLElement>("[data-site-header]");
  return (h?.getBoundingClientRect().height ?? 56) + 24;
}

/**
 * Collects the chapter's top-level <h2> headings (giving them ids so they can be
 * linked to), tracks which one the reader is in, and how far through the
 * article they are (0–1).
 */
export function useArticleSections(articleRef: RefObject<HTMLElement | null>, key: string) {
  const [sections, setSections] = useState<Section[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;
    const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>(":scope > h2"));
    const used = new Set<string>();
    const list = headings.map((h) => {
      let id = h.id || slugify(h.textContent ?? "");
      let n = 2;
      while (used.has(id)) id = `${id}-${n++}`;
      used.add(id);
      h.id = id;
      return { id, title: (h.textContent ?? "").trim() };
    });
    setSections(list);

    let raf = 0;
    const update = () => {
      raf = 0;
      const limit = headerHeight();
      let current: string | null = list[0]?.id ?? null;
      for (const h of headings) {
        if (h.getBoundingClientRect().top < limit) current = h.id;
        else break;
      }
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2 && list.length)
        current = list[list.length - 1].id;
      setActive(current);
      const r = root.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      setProgress(total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [articleRef, key]);

  return { sections, active, progress };
}

/** Smoothly scroll to a section (instantly if the reader prefers less motion). */
export function goToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}
