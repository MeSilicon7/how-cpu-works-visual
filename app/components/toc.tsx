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

/**
 * Collects the chapter's top-level <h2> headings (giving them ids so they can be
 * linked to) and tracks which one the reader is currently in.
 */
export function useArticleSections(articleRef: RefObject<HTMLElement | null>, key: string) {
  const [sections, setSections] = useState<Section[]>([]);
  const [active, setActive] = useState<string | null>(null);

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
      let current: string | null = list[0]?.id ?? null;
      for (const h of headings) {
        if (h.getBoundingClientRect().top < 150) current = h.id;
        else break;
      }
      setActive(current);
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

  return { sections, active };
}
