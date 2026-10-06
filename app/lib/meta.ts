import { chapters } from "./chapters";

export function chapterMeta(slug: string) {
  const c = chapters.find((ch) => ch.slug === slug);
  if (!c) return [{ title: "How a Computer Works" }];
  return [{ title: `${c.title} — How a Computer Works` }, { name: "description", content: c.tagline }];
}
