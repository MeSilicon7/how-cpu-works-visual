import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

import { chapters } from "./lib/chapters";

export default [
  index("routes/home.tsx"),
  route("glossary", "routes/glossary.tsx"),
  layout(
    "routes/chapter-layout.tsx",
    chapters.map((c) => route(c.slug, `routes/chapters/${c.slug}.tsx`)),
  ),
] satisfies RouteConfig;
