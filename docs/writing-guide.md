# Design & writing guide for "How a Computer Works" (the bookish redesign)

React Router v8 framework mode, Tailwind v4, Bun.
The site is an interactive *book* for a complete beginner who feels computers are "magic". English is
probably not the reader's first language.

The new theme is already implemented in the shared files. Read these before you start:
- app/app.css (tokens + component CSS), app/components/ui.tsx, app/components/circuit.tsx,
  app/components/tex.tsx, app/components/pixel-canvas.tsx, app/lib/hooks.ts, app/lib/bits.ts
- one finished, well-styled widget for reference: look at how app/components/circuit.tsx and ui.tsx
  express "on/off", and at app/routes/chapters/logic-gates.tsx for chapter structure.
- the full theme spec (background reasoning, contrast numbers): docs/theme.md
- the curriculum plan with detailed chapter outlines: docs/curriculum-plan.md

## Shared files
- Shared files: app/app.css, app/root.tsx, app/routes.ts, app/lib/chapters.ts, app/lib/meta.ts,
  app/routes/chapter-layout.tsx, app/routes/home.tsx, app/components/*. A change there affects every
  chapter, so make it deliberately and check several chapters afterwards. Chapter-specific helpers go in
  the chapter's own widget file.
- When several people or agents work at once, give each one its own chapter and widget files.

## Colour: the "printed figure" look
Paper (cream) is the default; a warm night mode swaps every token automatically. So:
- NEVER hard-code colours (#hex, rgb(), bg-black, text-white, bg-white) in UI or diagrams. Use tokens:
  Tailwind classes (`bg-panel`, `text-ink`, `border-line-2`, `text-on`, `bg-on-tint` …) or in SVG
  `fill="var(--color-…)"` / `stroke="var(--color-…)"`.
  Exceptions: pixel/image data drawn into a canvas (photos, procedurally generated scenes) and real
  emitted light (use `var(--color-sub-r/g/b)` for red/green/blue subpixels).
- Tokens:
  - surfaces: `bg` (page), `panel` (figure plate, raised), `panel-2` (buttons, off cells, recessed),
    `panel-3` (hover); rules: `line` (hairline), `line-2` (stronger)
  - text: `ink` (headings, UI, strong), `body` (paragraphs), `mute` (secondary), `dim` (tertiary, "0" bits)
  - signals: `on` = deep-green ink and it means ONLY "signal is 1 / current flows". `off` = warm grey
    for 0 / off wires. `on-2` = darker on (hover).
  - accents (ink colours): `amber` (ochre), `cyan` (blue ink; also links), `pink` (carmine; errors),
    `violet` (plum), `red` (vermilion; the R channel).
  - tints for backgrounds behind accent text: `on-tint`, `amber-tint`, `cyan-tint`, `pink-tint`,
    `violet-tint`, `red-tint`. Behind text use these, never `bg-X/25` or stronger opacity.
    (Opacity ≤ /15 is ok for large empty areas.)
  - device screens (always dark glass): `screen`, `screen-2` (unlit pixel), `screen-ink` (lit pixel),
    `screen-dim`, `bezel`. Wrap any drawing of a screen in a container with class `surface-screen`
    (it re-maps the accent tokens to light inks so they stay readable on the dark glass).
  - silicon drawings: `si-p`, `si-p-edge`, `si-hole`, `si-n`, `si-n-edge`, `si-gate`, `oxide`, `float`,
    `metal`, `metal-2`, `platter`, `platter-2`; lamp: `lamp`, `lamp-filament`, `lamp-glow`.
  - UI: `focus`, `highlight`, `scrim`.
- No neon glows. Remove every `shadow-[0_0_…var(--color-x)]`, `drop-shadow(...)`, `style={{filter: …}}`,
  `brightness-*` and inline `boxShadow` glows. Instead:
  - HTML boxes that are "active/lit": add class `halo-on` / `halo-cyan` / `halo-amber` / `halo-pink` /
    `halo-violet` (a 1px extra ink ring on paper, a soft glow at night), or plain `halo` (currentColor).
  - SVG shapes or text that are "lit": class `glow-on` / `glow-amber` / `glow-cyan` (does nothing on
    paper, a 3px soft glow at night).
- UI selection (a chosen tab/option/button) is shown with ink (`border-ink`, `bg-panel-2`, semibold) —
  NOT green. Green is reserved for signal = 1.
- Colour must never be the only cue: pair correct/wrong with ✓/✗, instruction vs data with a label,
  on/off wires also differ by stroke width (the Wire component does this).
- Hover: change background (`hover:bg-panel-2`) and/or border (`hover:border-off`); hovered text becomes ink.

## Typography
- Fonts: `font-serif` (Literata, reading), `font-display` (Fraunces, headings), `font-sans` (Atkinson
  Hyperlegible Next, UI), `font-mono` (Atkinson Hyperlegible Mono, bits/code/numbers).
- Inside widgets: UI labels `font-sans`, bits/numbers `font-mono tabular-nums`, explanatory sentences
  `font-serif text-[0.9375rem] text-mute` or `text-body`. Small-caps style labels: the `label-caps`
  utility (uppercase sans, tracked), e.g. `<div className="label-caps text-dim">Output</div>`.
- Bits: a 1 is `font-bold` in its colour, a 0 is `font-normal text-dim`.
- MINIMUM text size is 11px everywhere, including SVG text as rendered (font-size × rendered width ÷
  viewBox width ≥ 11). No `text-[0.55rem]`/`text-[0.6rem]`/`text-[0.65rem]`/`text-[9px]`/`text-[10px]` in
  HTML; use `text-[0.6875rem]` or `text-xs`. If an SVG is too small on phones, wrap it in
  `<div className="scroll-thin overflow-x-auto">` and give the svg a `min-w-[520px]`.
- Never put opacity on text colours (`text-ink/80` etc.); use `text-body`, `text-mute` or `text-dim`.

## Components (import from ~/components/ui unless noted)
- `Widget({title, subtitle?, wide?})` — every interactive figure. It is auto-numbered "Fig. N.M · Try it".
  Use `wide` for figures that need more than ~46rem.
- `Callout({kind: "idea"|"analogy"|"math"|"warn"|"fact", title?})` — margin notes; "math" is a boxed
  worked example. `GoDeeper({title})` — optional, collapsed section. `KeyIdeas({items})` — numbered
  "Remember this" summary at the very end of a chapter.
- `Btn({variant: "default"|"primary"|"ghost", active?})`, `Slider({label, min, max, step?, value,
  onChange, format?})`, `Segmented({options, value, onChange, size?})`, `BitButton({on, onClick?,
  label?, size?, color?: "on"|"cyan"|"amber"|"violet"|"pink"})`, `Bits({value, width})`,
  `Stat({label, value, sub?, tone?})`, `Pill({tone?})`, `Figure({caption})` (static figure),
  `DataTable({head, rows, highlight?, align?})` (book-style table), `Steps`.
- `TeX` + `tex` from ~/components/tex: `<TeX>{"2^8 = 256"}</TeX>` inline, `<TeX block>{tex\`...\`}</TeX>`.
- Circuits (~/components/circuit): `Wire({d, on, flow?, width?, color?})`, `Junction`, `Lamp({x,y,on,r?,
  label?, intensity?})`, `CircuitDefs` (gradients, hatch pattern `url(#hatch)`, markers `arrow-on`,
  `arrow-cyan`, `arrow-dim`, `arrow-ink`, `arrow-amber`), `Gate({kind,x,y,out})`, `gateOut`, `evalGate`,
  `SignalTag`, `InputPin` (clickable, keyboard accessible), `OutputPin`.
- `PixelCanvas({img, view?, grid?, onPick?})` (~/components/pixel-canvas) for pixel images; images are
  `{w, h, data: Uint8ClampedArray}` (see ~/lib/image).
- Hooks (~/lib/hooks): `useInterval(cb, ms|null)`, `useAnimationTime(running)` (seconds, rAF),
  `useReducedMotion()`, `useMounted()`. Bits helpers (~/lib/bits): `binStr`, `hexStr`, `toSigned`,
  `fmt`, `rng(seed)` (deterministic random — use it so the server render and browser match), `clamp`.
- Animations: respect `useReducedMotion()` (show a still frame or step-by-step instead), and avoid
  `Math.random()`/`Date.now()` during render (hydration mismatch) — use `rng(seed)` or effects.

## Chapter file conventions (app/routes/chapters/<slug>.tsx)
```tsx
import { Link } from "react-router";
import { tex, TeX } from "~/components/tex";
import { Callout, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { SomeWidget } from "~/widgets/<slug>";

export const meta = () => chapterMeta("<slug>");

export default function Chapter() {
  return (
    <>
      <p>Opening paragraph…</p>
      <h2>Short section title</h2>
      …
      <KeyIdeas items={[…]} />
    </>
  );
}
```
- Top-level `<h2>`s become entries in the side table of contents: keep them short (≤ 6 words), do not
  number them. Use `<h3>` for sub-sections.
- The chapter title, tagline and "In this chapter" list come from app/lib/chapters.ts automatically —
  don't repeat a title at the top. Start with a strong opening paragraph (it gets a drop cap).
- Link to other chapters with `<Link to="/slug">`. Slugs, in book order: electricity, transistor, binary,
  logic-gates, adder, alu, memory, clock, cpu, chip-making, machine-code, functions, storage,
  bits-meaning, input-output, operating-system, calculator, graphics, video, network.
- Typical chapter: 8–12 `<h2>` sections, 3–5 interactive widgets, several Callouts (at least one "math"
  worked example per big idea), 1–3 GoDeeper boxes, KeyIdeas at the end.

## Writing style
- Plain English for a reader whose first language is not English: short sentences, common words, no
  idioms ("rabbit hole", "all the way down", "under the hood"), no rare words without a definition.
  Define every technical term the first time it appears (bold it).
- Explain the *why*, then show the *math* with real numbers. Every number must be correct: recompute
  with `node -e` before writing it. Show units. Prefer worked examples over formulas alone.
- Answer the "but HOW does it know?" question at every step — no hand-waving, no "magic".
- A warm, bookish voice: like a good textbook author talking to a curious student.

## Checking your work
1. `bun run typecheck` must report no errors.
2. Run `bun run dev` and screenshot every figure of the page (each widget is a `<section>` inside
   `<main>`) in both themes and LOOK at them: paper at 1280 px, night at 1280 px, and paper at 390 px
   (phone). With Playwright, set the theme before loading the page with
   `localStorage.setItem("hcw-theme", "paper" | "night")` in an init script, open all `<details>` (Go
   deeper boxes), and collect console errors. Check horizontal overflow
   (`document.documentElement.scrollWidth` must equal `clientWidth`). Fix overlaps, clipped labels,
   unreadable text, layout overflow and errors.
3. Re-read your text once as the beginner reader: is every step explained, every term defined?
