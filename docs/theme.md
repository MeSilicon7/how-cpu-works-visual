# Spec: bookish "Paper + Warm Night" theme for How a Computer Works

All numbers below come from scripts I ran (WCAG 2.x contrast, sRGB compositing for alpha tints, OKLab ΔE for colour-blind simulation, font files fetched from Google Fonts and parsed). I did not edit any project files.

## 0. Decisions and constraints

| Area | Decision |
|---|---|
| Default mode | **Paper**: a warm cream page (`#f5f0e6`). Figures sit on a slightly lighter "plate" (`#fbf8f2`). |
| Night mode | **Warm night**: a warm near-black (`#1c1a17`) with parchment text (`#e2d8c6`, 12.3:1). It is never pure black or pure white. |
| Reading face | **Literata**. It was designed for e-reading, has a large x-height (0.503 em) and is easy for non-native readers. |
| Headings | **Fraunces** (variable optical size), a bookish display serif. |
| UI sans | **Atkinson Hyperlegible Next**, made for maximum legibility. |
| Mono (bits, code) | **Atkinson Hyperlegible Mono**. Its `0` is marked (3 contours, checked in the font file) and is narrower than `O`, and `1`, `l` and `I` look clearly different. That matters on a site full of binary. |
| Signal colours | **Green means "1 / current flows" and nothing else.** UI selection uses ink, not green. |
| Glow | Paper has no glow. "On" is shown as **heavier ink**: a 1px extra ring or a thicker stroke. Night allows a 2–3px soft glow at most. |
| TOC | A sticky left rail at **≥1280px** (`xl`). Below that, a compact "running head" button in the header opens a dropdown of the chapter's sections. |

**Findings that constrain the implementation:**

1. **Google Fonts strips OpenType features.** I parsed the served latin `.woff2` files:
   - Literata has only `ccmp dnom frac liga locl numr pnum rvrn tnum`. There is no `smcp`, no `c2sc` and no `onum`.
   - None of the monos has a `zero` feature.
   - So: **do not use `font-variant-caps: small-caps`** (the browser would fake it and it looks thin). Use the `label-caps` utility in §4 instead (uppercase sans, tracked). Old-style numerals are not available either.
2. **Custom-property gotcha.** A variable defined on `html` that contains `var(--x)` gets resolved *on `html`*. An element-level `--x` set later is ignored. So the glow and halo colour must be read **in the rule that paints**, not baked into an `html`-level variable. §3 is designed around this.
3. **Some tokens are only used through `var(--color-…)` in SVG attributes in `.tsx` files.** Use `@theme static` so Tailwind always emits every token. Fallback if that doesn't work: put the non-utility tokens in a plain `:root {}` block.
4. **Dark "screen" drawings need light inks in both modes.** In paper mode, deep-green "on" pixels on a near-black screen would be invisible. A `.surface-screen` class re-scopes the accent tokens to night values (§6).
5. **`app/components/theme-toggle.tsx` and `app/components/toc.tsx` already exist** (commit cb83413). This spec builds on them; the changes are listed in §2 and §5.
6. **14 of the 85 `<h2>`s are already numbered by hand** (calculator, network). So do **not** auto-number headings. Only figures get automatic numbers.

## 1. Colour tokens

### 1.1 `app/app.css`: replace the `@theme` block and add the night override

```css
@import "tailwindcss" source(".");

/* Escape hatch only. Components should rely on tokens, not this variant. */
@custom-variant night (&:where([data-theme="night"], [data-theme="night"] *));

@theme static {
  --font-serif: "Literata", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --font-display: "Fraunces", "Literata", Georgia, serif;
  --font-sans: "Atkinson Hyperlegible Next", "Segoe UI", system-ui, -apple-system, sans-serif;
  --font-mono: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* ---------- PAPER (default) ---------- */
  --color-bg: #f5f0e6;        /* page */
  --color-panel: #fbf8f2;     /* figure plate (lighter = raised) */
  --color-panel-2: #eee7da;   /* buttons, off-bit cells (darker = recessed) */
  --color-panel-3: #e5dccc;   /* hover */
  --color-line: #e0d6c4;      /* hairline rules */
  --color-line-2: #c9baa1;    /* control borders, stronger rules */
  --color-ink: #2b2620;       /* headings, UI text, strong */
  --color-body: #38322b;      /* NEW: long-form paragraph text */
  --color-mute: #594f43;      /* secondary text */
  --color-dim: #6e6354;       /* tertiary text, "0" bits */

  --color-on: #25603c;        /* deep green ink: signal = 1 */
  --color-on-2: #1b4a2f;      /* hover/pressed for on */
  --color-off: #978b79;       /* warm grey: signal = 0, off wires, slider track */
  --color-amber: #7f5212;     /* ochre ink */
  --color-cyan: #1d5689;      /* blue ink (also links, focus) */
  --color-pink: #9a2c5e;      /* carmine ink: errors/warnings */
  --color-violet: #77479a;    /* plum ink */
  --color-red: #9c3818;       /* vermilion ink: the R channel */

  /* NEW: solid washes for fills behind accent text (accent 12% over panel) */
  --color-on-tint: #e1e6dc;
  --color-amber-tint: #ece4d7;
  --color-cyan-tint: #e0e5e5;
  --color-pink-tint: #efe0e0;
  --color-violet-tint: #ebe3e7;
  --color-red-tint: #f0e1d8;

  /* NEW: UI */
  --color-focus: #1d5689;
  --color-highlight: #f2e0a0;           /* ::selection, <mark> */
  --color-scrim: rgb(43 38 32 / 0.32);  /* modal backdrop */

  /* NEW: drawings of a device screen (always dark glass) */
  --color-screen: #1f1d1a;
  --color-screen-2: #2c2925;     /* unlit pixel cell */
  --color-screen-ink: #efe9dc;   /* lit white pixel */
  --color-screen-dim: #57524a;   /* lit pixel not yet scanned */
  --color-bezel: #3d3934;
  --color-sub-r: #e5483b;        /* emitted light: same in both modes */
  --color-sub-g: #3cbf5e;
  --color-sub-b: #3d6fe0;

  /* NEW: silicon cross-sections (textbook pastels) */
  --color-si-p: #ece3f1;       --color-si-p-edge: #b9a6cc;  --color-si-hole: #7a5ea3;
  --color-si-n: #dde9f2;       --color-si-n-edge: #8fb0cc;
  --color-si-gate: #cbc3b5;    /* idle gate */
  --color-oxide: #e2dccf;      /* insulator */
  --color-float: #e7dcef;      /* flash floating gate */
  --color-metal: #9c9385;      /* contacts, pivots, hub */
  --color-metal-2: #857c6f;    /* metal that must stand out on a platter (disk arm) */
  --color-platter: #d9d3c7;    --color-platter-2: #cfc8ba;

  /* NEW: lamp */
  --color-lamp: #f8e3a0;  --color-lamp-filament: #a5560a;  --color-lamp-glow: #f2c94c;

  --animate-blink: blink 1s steps(2, start) infinite;
  @keyframes blink { to { visibility: hidden; } }
}

@layer theme {
  :root[data-theme="night"] {
    --color-bg: #1c1a17;  --color-panel: #24211d;  --color-panel-2: #2d2924;  --color-panel-3: #37322b;
    --color-line: #3b352d;  --color-line-2: #50493e;
    --color-ink: #e2d8c6;  --color-body: #d4c9b5;  --color-mute: #b9ae9b;  --color-dim: #9d927f;
    --color-on: #8ccb9c;  --color-on-2: #b5dfbf;  --color-off: #746b5e;
    --color-amber: #deb06a;  --color-cyan: #8fbfe2;  --color-pink: #eb9bbd;  --color-violet: #c3a6e6;  --color-red: #f2907e;
    /* accent 16% over panel */
    --color-on-tint: #353c31;  --color-amber-tint: #423829;  --color-cyan-tint: #353a3d;
    --color-pink-tint: #443537;  --color-violet-tint: #3d363d;  --color-red-tint: #45332d;
    --color-focus: #8fbfe2;  --color-highlight: #4a3e22;  --color-scrim: rgb(0 0 0 / 0.55);
    --color-screen: #121110;  --color-screen-2: #22201d;  --color-screen-ink: #ece5d6;  --color-screen-dim: #4d4840;  --color-bezel: #3a362f;
    --color-si-p: #2c2638;  --color-si-p-edge: #4d4268;  --color-si-hole: #a690d6;
    --color-si-n: #1f2d39;  --color-si-n-edge: #3e6688;
    --color-si-gate: #4a463f;  --color-oxide: #3d3a34;  --color-float: #352c45;
    --color-metal: #6f6a62;  --color-metal-2: #8b857a;
    --color-platter: #2b2823;  --color-platter-2: #322e28;
    --color-lamp: #f3dc94;  --color-lamp-filament: #b9650c;  --color-lamp-glow: #f5c862;
  }
}

:root { color-scheme: light; --header-h: 3.5rem; --measure: 100%; --fig-w: 46rem; --fig-wide: 62rem;
        --wire-w-off: 2; --wire-w-on: 3; --lamp-glow-alpha: 0; --plate-shadow: none; }
:root[data-theme="night"] { color-scheme: dark; --lamp-glow-alpha: 0.3;
        --plate-shadow: 0 1px 0 rgb(0 0 0 / 0.3), 0 16px 40px -28px rgb(0 0 0 / 0.7); }
@media (min-width: 40rem) { :root { --measure: 34rem; } }
@media (min-width: 80rem) { :root { --measure: 36rem; } }
```

Also delete these from the current file: the `body` background-image (dotted grid and radial glows), the `:root { color-scheme: dark }` rule, and the green `::selection`.

### 1.2 Contrast ratios (WCAG; text needs ≥7 for body and ≥4.5 for secondary)

**Paper**

| token | hex | vs bg | vs panel | vs panel-2 |
|---|---|---|---|---|
| ink | #2b2620 | **13.20** | 14.14 | 12.19 |
| body | #38322b | **11.14** | 11.94 | 10.29 |
| mute | #594f43 | **7.05** | 7.55 | 6.51 |
| dim | #6e6354 | 5.17 | 5.54 | 4.78 |
| on | #25603c | 6.56 | 7.03 | 6.06 |
| on-2 | #1b4a2f | 8.94 | 9.58 | 8.26 |
| amber | #7f5212 | 5.93 | 6.35 | 5.48 |
| cyan / focus | #1d5689 | 6.74 | 7.22 | 6.22 |
| pink | #9a2c5e | 6.38 | 6.84 | 5.90 |
| violet | #77479a | 5.87 | 6.28 | 5.42 |
| red | #9c3818 | 6.18 | 6.62 | 5.71 |
| off (graphic) | #978b79 | 2.94 | 3.15 | 2.72 |
| line / line-2 (decorative) | — | 1.27 / 1.68 | 1.36 / 1.80 | — |

**Night**

| token | hex | vs bg | vs panel | vs panel-2 |
|---|---|---|---|---|
| ink | #e2d8c6 | **12.30** | 11.35 | 10.23 |
| body | #d4c9b5 | **10.60** | 9.79 | 8.82 |
| mute | #b9ae9b | **7.93** | 7.32 | 6.59 |
| dim | #9d927f | 5.66 | 5.23 | 4.71 |
| on | #8ccb9c | 9.21 | 8.50 | 7.66 |
| on-2 | #b5dfbf | 11.80 | 10.89 | 9.81 |
| amber | #deb06a | 8.70 | 8.03 | 7.24 |
| cyan / focus | #8fbfe2 | 8.86 | 8.18 | 7.37 |
| pink | #eb9bbd | 8.23 | 7.60 | 6.85 |
| violet | #c3a6e6 | 8.20 | 7.57 | 6.82 |
| red | #f2907e | 7.50 | 6.92 | 6.23 |
| off (graphic) | #746b5e | 3.31 | 3.06 | 2.76 |
| line / line-2 (decorative) | — | 1.43 / 1.95 | 1.32 / 1.80 | — |

**Other pairs**

- **Accent text on its own `-tint`:**
  - paper: on 5.88, amber 5.34, cyan 6.01, pink 5.67, violet 5.29, red 5.50
  - night: on 6.05, amber 5.75, cyan 5.88, pink 5.50, violet 5.53, red 5.14
  - Ink on any tint: paper ≥11.7, night ≥8.07.
- **`text-bg` on a solid accent fill** (for example `bg-on text-bg`):
  - paper: on 6.56, on-2 8.94, amber 5.93, cyan 6.74, pink 6.38, violet 5.87, red 6.18
  - night: all ≥7.50
- **Opacity-modifier tints fail at `/30`:**
  - paper /30: 3.78–4.47; night /30: 3.96–4.30
  - `/20` passes (paper ≥4.69 except red at 4.43; night ≥4.94)
  - **Rule: behind accent text use `bg-X-tint` (or ≤ `/15`), never `/25` or higher.**
- **Wires:**
  - on vs off: paper 2.23, night 2.78
  - on vs panel: 7.03 / 8.50; off vs panel: 3.15 / 3.06
  - State is also coded by **stroke width** (3 vs 2), so it doesn't rely on colour alone.
- **Selection highlight:** paper ink 11.38 / body 9.61; night ink 7.42 / body 6.40.
- **Screen:**
  - screen-ink on screen: 13.90 (paper) / 15.04 (night)
  - lit vs unlit pixel: 11.96 / 12.96
  - night `on` on screen-2: 7.68 / 8.62
- **Hover backgrounds:** dim on panel-3 is only 4.32 (paper) / 4.14 (night). **Hovered elements must switch their text to ink or mute.**
- **Silicon fills:**
  - paper: cyan electrons on n 6.20; violet label on p 5.34; holes on p 4.25
  - night: 7.18 / 6.88 / 5.26
- **Disk drawing:**
  - paper: metal-2 arm on platter 2.76; amber/on target sectors on platter 4.52 / 5.00
  - night: arm on platter 4.01

**Colour-blind check** (OKLab ΔE×100 under deuteranopia/protanopia simulation; below 8 means easily confused):

- These pairs collapse: on vs pink (5.1 / 3.3), on vs amber (7.5 / 4.6), amber vs red (0.5), cyan vs violet (5.1 / 1.3).
- The pairs the UI actually relies on are safe: on vs off (19+), cyan vs on, cyan vs pink (11.8 deutan).
- **Rule: correct vs wrong, instruction vs data, and cyan vs violet must also differ by a label, glyph (✓ ✗), weight or dash pattern.**
- In normal vision, pink vs red was 5.2 in the first draft. Pink was moved towards magenta and red towards vermilion; the pair no longer flags.

## 2. Two modes in Tailwind v4

1. **CSS.** `@theme static` holds the paper values (Tailwind emits them as `:root` variables in `@layer theme`). The `:root[data-theme="night"]` block above overrides the **same variables** with higher specificity. Tailwind v4 utilities reference `var(--color-*)` and opacity modifiers compile to `color-mix(… var(--color-on) 20%, transparent)`, so **every existing class switches mode with zero component changes**. Do not use `@theme inline`.

2. **No server-rendered `data-theme`.** The `<html>` JSX gets no `data-theme` prop, so React never touches it. Keep `suppressHydrationWarning` on `<html>` anyway.

3. **No-flash boot script.** Extend `themeBootScript` in `theme-toggle.tsx`:

```ts
export const themeBootScript = `(function(){var d=document.documentElement,t;try{t=localStorage.getItem('hcw-theme')}catch(e){}if(t!=='paper'&&t!=='night'){t=matchMedia('(prefers-color-scheme: dark)').matches?'night':'paper'}d.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='night'?'#1c1a17':'#f5f0e6'})();`;
```

4. **`app/root.tsx` `<head>` order:** charset meta, viewport meta, `<meta name="theme-color" content="#f5f0e6" />`, then `<script dangerouslySetInnerHTML={{ __html: themeBootScript }} />`, then `<Meta/>`, then `<Links/>`. The script must come **after** the theme-color meta and **before** any stylesheet paints.
   - Change `<html lang="en">` to `<html lang="en" suppressHydrationWarning>`.
   - Body class: `min-h-screen bg-bg font-sans text-ink`.
   - Wrap the app in `<MotionConfig reducedMotion="user">` from `motion/react`.

5. **Toggle behaviour** (changes to `ThemeToggle`):
   - **Icons.** Render both icons and hide one with CSS so there is no hydration flash: `[data-theme="night"] .icon-moon, :root:not([data-theme="night"]) .icon-sun { display: none }`. Keep the `useState` only for `aria-label`.
   - **`apply(t)`:**
     1. Add `theme-switching` to `<html>`.
     2. Set `dataset.theme`.
     3. Update the `meta[name=theme-color]` content.
     4. Write localStorage.
     5. Remove the class after two `requestAnimationFrame`s.
     - CSS: `.theme-switching, .theme-switching * { transition: none !important; }`. This stops 200+ elements from animating their colours.
   - **Follow the OS until the user chooses:** `matchMedia('(prefers-color-scheme: dark)').addEventListener('change', …)` applies the new mode only if `localStorage.getItem('hcw-theme')` is null.
   - **Placement and size:** header right, `inline-flex h-10 w-10 items-center justify-center rounded-md text-mute hover:bg-panel-2 hover:text-ink`, keep `title` and `aria-label`.
   - **Mobile drawer:** also show a labelled row "Night mode" with a `role="switch"` and `aria-checked`, so the option is easy to find on phones.

6. **Optional, for users without JavaScript:** add `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { …same night values… } }`.

## 3. Glow handling

Components carry the class names. CSS decides what each mode does. Put this in `app.css` inside `@layer components`, so Tailwind utilities (for example a focus outline) can still override it.

```css
@layer components {
  /* filter glows: SVG shapes, text. Paper = nothing at all (no filter cost). */
  .glow-on    { --glow-c: var(--color-on); }
  .glow-amber { --glow-c: var(--color-amber); }
  .glow-cyan  { --glow-c: var(--color-cyan); }
  [data-theme="night"] :is(.glow-on, .glow-amber, .glow-cyan) {
    filter: drop-shadow(0 0 3px color-mix(in oklab, var(--glow-c) 40%, transparent));
  }

  /* box halos: HTML boxes. Paper = 1px extra ink ring (reads as a "bolder" printed border). */
  .halo        { --halo-c: currentColor; }
  .halo-on     { --halo-c: var(--color-on); }
  .halo-amber  { --halo-c: var(--color-amber); }
  .halo-cyan   { --halo-c: var(--color-cyan); }
  .halo-pink   { --halo-c: var(--color-pink); }
  .halo-violet { --halo-c: var(--color-violet); }
  :is(.halo, .halo-on, .halo-amber, .halo-cyan, .halo-pink, .halo-violet) { box-shadow: 0 0 0 1px var(--halo-c); }
  [data-theme="night"] :is(.halo, .halo-on, .halo-amber, .halo-cyan, .halo-pink, .halo-violet) {
    box-shadow: 0 0 0 1px var(--halo-c), 0 0 12px -4px color-mix(in oklab, var(--halo-c) 45%, transparent);
  }

  .plate { background: var(--color-panel); border: 1px solid var(--color-line); border-radius: 6px; box-shadow: var(--plate-shadow); }
}
```

**Migration table**

| Current | Replace with |
|---|---|
| `shadow-[0_0_14px_-2px_var(--color-X)]`, `shadow-[0_0_18px_-4px_var(--color-X)]`, `shadow-[0_0_10px_-2px_var(--color-X)]`, `shadow-[0_0_8px_var(--color-X)]`, `shadow-[0_0_14px_var(--color-X)]`, `shadow-[0_0_16px_var(--color-X)]`, `shadow-[0_0_6px_…]`, `shadow-[0_0_18px_var(--color-on)]`, `shadow-[0_0_20px_-6px_var(--color-X)]` (24 sites in ui.tsx, cpu-sim, machine-code, memory, adder, alu, binary, video, home, chapter-layout) | `halo-X` |
| `shadow-[0_0_10px_currentColor]` | `halo` |
| Glow on **solid** primary buttons: `shadow-[0_0_16px_-2px_var(--color-on)]`, `shadow-[0_0_30px_-6px_…]` | delete |
| `shadow-[inset_0_0_0_1px_rgb(61_255_160/0.5)]` (Segmented) | new selected style (§4.6) |
| Widget `shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_20px_60px_-30px_rgb(0_0_0/0.8)]` | `plate` |
| `drop-shadow-[0_0_12px_var(--color-on)]`, `drop-shadow-[0_0_20px_rgb(61_255_160/0.45)]` | `glow-on` |
| Inline `style={{filter:"drop-shadow(…)"}}` in circuit.tsx (Gate, InputPin, OutputPin, Wire) and network.tsx:270 | `className="glow-on"` / `"glow-cyan"` |
| `hover:brightness-125` (BitButton), `hover:brightness-150` (storage.tsx sectors) | BitButton: §4.6. Sectors: `hover:stroke-[var(--color-ink)] hover:[stroke-width:1.5]` |
| `focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none` (6 sites) | delete (the global outline in §7 handles focus) |

## 4. Typography

### 4.1 Fonts

Replace the `links` stylesheet in `app/root.tsx`. I verified this URL returns HTTP 200; the latin payload is **193 KB**.

```
https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400..700&family=Atkinson+Hyperlegible+Next:wght@400..700&family=Fraunces:opsz,wght@9..144,300..700&family=Literata:ital,wght@0,400..700;1,400..700&display=swap
```

Why this axis set:
- Literata **without** the `opsz` axis is pinned at its text size (12), which suits body copy. It costs 77 KB for both styles, versus 170 KB with `opsz`.
- Fraunces **with** `opsz` (65 KB) lets `font-optical-sizing: auto` pick the display cut for headings.
- No Atkinson italic is loaded; UI text is not italic.

### 4.2 Utilities

```css
@utility label-caps {            /* replaces small caps everywhere */
  font-family: var(--font-sans); font-size: 0.75rem; line-height: 1.25;
  font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase;
}
```

In dense widgets, `label-caps text-[0.6875rem]` is allowed. **Nothing may be smaller than 11px** (§7).

### 4.3 Type scale

| Role | Font | Size | Line-height | Weight | Notes |
|---|---|---|---|---|---|
| Chapter title (h1) | Fraunces | `clamp(2.375rem, 1.6rem + 3vw, 3.5rem)` | 1.05 | 600 | tracking -0.01em, `text-wrap: balance` |
| Chapter numeral | Fraunces | 3.5rem (sm: 4.5rem) | 1 | 300 | part accent colour, `aria-hidden` |
| Tagline | Literata italic | 1.1875rem (sm: 1.25rem) | 1.4 | 400 | mute |
| h2 | Fraunces | 1.5rem (≥640: 1.75rem) | 1.2 | 600 | ink |
| h3 | Literata | 1.1875rem | 1.3 | 650 | ink |
| Body | Literata | 17px below 640, **18px** from 640, 19px from 1280 | **1.65** | 400 | `--color-body` |
| Callout / Go-deeper text | Literata | 0.9444em | 1.6 | 400 | |
| Widget title | Literata | 1.0625rem | 1.35 | 600 | |
| Widget subtitle, captions | Literata | 0.9375rem | 1.5 | 400 | mute; captions italic |
| UI (buttons, controls, TOC) | Atkinson Next | 0.875rem | 1.4 | 600 / 400 | |
| Labels | Atkinson Next | 0.75rem | 1.25 | 700 | `label-caps` |
| Inline code | Atkinson Mono | 0.92em | — | 400 | |
| Bits in widgets | Atkinson Mono | unchanged | — | **1 → 700, 0 → 400** | weight difference helps colour-blind readers and print |

**Measure.** Literata's measured average character width in running text is 0.438 em. That gives:
- `--measure: 34rem` at 18px ≈ **69 characters per line**
- `36rem` at 19px ≈ **69 characters per line**
- phones: full width minus the 16px gutters (≈48 characters at 390px)

Paragraphs are **ragged right, never justified**, with no automatic hyphenation (better for non-native readers). Use `text-wrap: pretty` on paragraphs.

### 4.4 Prose CSS

Rename `.prose-cpu` to `.prose-book` and keep the existing `:not(:where(.not-prose, .not-prose *))` guards.

```css
.prose-book { font-family: var(--font-serif); font-size: 1.0625rem; line-height: 1.65; color: var(--color-body);
  max-width: var(--measure); margin-inline: auto; font-kerning: normal; }
@media (min-width: 40rem) { .prose-book { font-size: 1.125rem; } }
@media (min-width: 80rem) { .prose-book { font-size: 1.1875rem; } }
.prose-book .prose-book { font-size: inherit; max-width: none; margin-inline: 0; }  /* nested, e.g. GoDeeper */
.prose-book > * + * { margin-top: 1em; }
.prose-book p { text-wrap: pretty; }
.prose-book h2 { font: 600 1.5rem/1.2 var(--font-display); letter-spacing: -0.005em; color: var(--color-ink);
  margin-top: 2.4em; text-wrap: balance; scroll-margin-top: calc(var(--header-h) + 1.25rem); }
@media (min-width: 40rem) { .prose-book h2 { font-size: 1.75rem; } }
.prose-book h3 { font: 650 1.1875rem/1.3 var(--font-serif); color: var(--color-ink); margin-top: 1.8em;
  scroll-margin-top: calc(var(--header-h) + 1.25rem); }
.prose-book :is(h2, h3) + * { margin-top: 0.6em; }
.prose-book strong { font-weight: 650; color: var(--color-ink); }
.prose-book em { font-style: italic; color: inherit; }            /* was green, upright */
.prose-book a { color: var(--color-cyan); text-decoration: underline 1px;
  text-underline-offset: 0.18em; text-decoration-color: color-mix(in oklab, currentColor 40%, transparent); }
.prose-book a:hover { text-decoration-color: currentColor; text-decoration-thickness: 2px; }
.prose-book :is(ul, ol) { padding-left: 1.35em; }  .prose-book ul { list-style: disc; }  .prose-book ol { list-style: decimal; }
.prose-book li + li { margin-top: 0.4em; }
.prose-book li::marker { color: var(--color-dim); font-family: var(--font-sans); font-variant-numeric: tabular-nums; }
.prose-book :not(pre) > code { font-family: var(--font-mono); font-size: 0.92em; padding: 0.08em 0.3em;
  border-radius: 3px; background: var(--color-panel-2); color: var(--color-ink); }   /* no border, no green */
.prose-book hr { border: 0; text-align: center; margin-block: 2.5em; }
.prose-book hr::after { content: "⁂"; color: var(--color-dim); letter-spacing: 0.5em; }
::selection, mark { background: var(--color-highlight); color: inherit; }
/* optional drop cap: progressive enhancement only (Firefox shows plain text) */
@supports (initial-letter: 3) or (-webkit-initial-letter: 3) {
  .prose-book > p:first-child::first-letter { -webkit-initial-letter: 3; initial-letter: 3;
    font-family: var(--font-display); font-weight: 600; color: var(--color-ink); margin-right: 0.12em; }
}
```

**KaTeX:**

```css
.katex { font-size: 1.15em; color: inherit; }   /* matches KaTeX x-height (0.431 em) to Literata's (0.503 em) */
.tex-block { margin: 1.1em 0; overflow-x: auto; scrollbar-width: thin; }
.tex-block .katex-display { margin: 0; }
```

Display math is centred. Inside callouts, keep it centred within the callout.

### 4.5 Chapter title page (`chapter-layout.tsx`)

```tsx
<header className="mx-auto max-w-[var(--measure)] border-b border-line pt-12 pb-10 mb-10 sm:pt-16">
  <p className="label-caps" style={{ color: "var(--part-c)" }}>Part {roman} · {part.title}</p>
  <p aria-hidden className="mt-6 font-display text-[3.5rem] sm:text-[4.5rem] font-light leading-none tabular-nums" style={{ color: "var(--part-c)" }}>{n}</p>
  <h1 className="mt-2 font-display text-[clamp(2.375rem,1.6rem+3vw,3.5rem)] leading-[1.05] font-semibold tracking-[-0.01em] text-ink text-balance">
    <span className="sr-only">Chapter {n}: </span>{chapter.title}</h1>
  <p className="mt-4 font-serif text-[1.1875rem] sm:text-xl italic leading-snug text-mute text-pretty">{chapter.tagline}</p>
  <p className="mt-8 label-caps text-dim">In this chapter</p>
  <ul className="mt-2.5 space-y-1.5 font-serif text-[1.0625rem] text-body">
    {chapter.learn.map(l => <li key={l} className="flex gap-3"><span aria-hidden style={{color:"var(--part-c)"}}>→</span>{l}</li>)}
  </ul>
</header>
```

- Set `--part-c` on the page shell: `style={{ "--part-c": "var(--color-on|cyan|violet|amber)" }}` following the existing `partColor` map.
- If a 5th part is added for the new I/O and OS chapters, give it `pink` or `red`.
- The pill-shaped "learn" chips are removed.

### 4.6 Components in `app/components/ui.tsx`

**`Callout`**
- Markup: `<aside className={cx("callout", "callout-"+kind)}>`, then a label row `<div className="callout-label">icon + title</div>`, then the body `<div className="space-y-2.5">`.
- Colours: idea → cyan "◆ Key idea"; analogy → violet "≈ Think of it like"; math → amber "∑ The math"; warn → pink "! Watch out"; fact → on "# Real numbers".

```css
.callout { --callout-c: var(--color-cyan); margin-block: 1.75rem; padding: 0.125rem 0 0.125rem 1.125rem;
  border-left: 3px solid var(--callout-c); font-size: 0.9444em; line-height: 1.6; color: var(--color-body); }
.callout-label { /* label-caps */ font: 700 0.75rem/1.25 var(--font-sans); letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--callout-c); display: flex; gap: 0.5rem; margin-bottom: 0.375rem; }
.callout-idea{--callout-c:var(--color-cyan)} .callout-analogy{--callout-c:var(--color-violet)}
.callout-math{--callout-c:var(--color-amber)} .callout-warn{--callout-c:var(--color-pink)} .callout-fact{--callout-c:var(--color-on)}
.callout-math { border-left: 0; border-top: 2px solid var(--callout-c); border-bottom: 1px solid var(--color-line-2);
  background: var(--color-panel); padding: 0.875rem 1.125rem 1rem; }   /* boxed worked example */
```

**`GoDeeper`** (rules, not a box)
- `<details className="go-deeper group my-8 border-y border-line-2">`
- `<summary>`: `flex items-baseline gap-3 px-1 py-3.5 cursor-pointer list-none hover:bg-panel [&::-webkit-details-marker]:hidden`. It contains, in order:
  - `<span className="label-caps text-amber">Go deeper</span>`
  - title: `font-serif font-semibold text-ink`
  - `<span className="ml-auto font-sans text-xs text-dim">optional</span>`
  - `<span aria-hidden className="font-sans text-lg text-dim">` showing "+" when closed and "−" when open (use `group-open:` variants, no rotation)
- Body: `prose-book border-t border-dashed border-line-2 px-1 pt-3 pb-5 text-[0.9444em]`.

**`KeyIdeas`** ("Remember this")
- Container: `not-prose mt-14 bg-panel border-t-4 border-double border-on border-b border-b-line-2 px-6 py-5`.
- Label: `label-caps text-on`.
- List: an ordered list; numbers in `font-display text-lg font-semibold text-on w-6 text-right tabular-nums`; items `font-serif text-body`. Delete the glowing dot.

**`Widget`** (figure plate)
- Root: `<section className={cx("not-prose fig plate font-sans text-ink", wide && "fig-wide", className)}>`.
- Header: `border-b border-line px-4 pt-3.5 pb-3 sm:px-5`. It contains:
  - Row: `<span className="fig-num label-caps text-[0.6875rem] text-dim"/>`, then `<span className="label-caps text-[0.6875rem] text-dim">· </span>`, then `<span className="label-caps text-[0.6875rem] text-ink">Try it</span>`. "Try it" is ink, not green.
  - `<h4 className="mt-1 font-serif text-[1.0625rem] font-semibold">`
  - Subtitle: `mt-1 max-w-[62ch] font-serif text-[0.9375rem] leading-normal text-mute`
- Body: `p-4 sm:p-5`.
- Add the Tailwind `@container` class to the body so widget internals can migrate from viewport breakpoints to container breakpoints (`md:` → `@2xl:`, `lg:` → `@3xl:`/`@4xl:`; check each widget). Recommended, not required.

**`Figure`**
- Plate as above; the inner div becomes `plate overflow-x-auto p-4`.
- Caption: `mt-2.5 font-serif text-[0.9375rem] italic text-mute`, prefixed by the `fig-num` label.

**`DataTable`** (booktabs style)

```css
table.booktabs { width: 100%; border-collapse: collapse; font: 0.875rem/1.45 var(--font-mono); font-variant-numeric: tabular-nums;
  border-top: 1.5px solid var(--color-ink); border-bottom: 1.5px solid var(--color-ink); }
.booktabs th { font: 700 0.6875rem/1.2 var(--font-sans); letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-mute);
  padding: 0.5rem 0.75rem 0.375rem; border-bottom: 1px solid var(--color-mute); }
.booktabs td { padding: 0.375rem 0.75rem; border-bottom: 1px solid var(--color-line); color: var(--color-ink); }
.booktabs tr:last-child td { border-bottom: 0; }
.booktabs tr.hl td { background: var(--color-on-tint); font-weight: 700; }
.booktabs tr.hl td:first-child { box-shadow: inset 3px 0 0 var(--color-on); }   /* non-colour cue */
```

Highlighted rows use the `hl` class instead of `bg-on/10 text-on`. Drop `text-ink/85`.

**`Btn`**
- Base: `inline-flex min-h-9 pointer-coarse:min-h-11 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 font-sans text-sm font-semibold transition-colors duration-150 select-none active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45`
- `default`: `border-line-2 bg-panel text-ink shadow-[inset_0_-1px_0_var(--color-line-2)] hover:border-off hover:bg-panel-2`
- `default` + `active` (a UI selection, **not green**): `border-ink bg-panel-2 text-ink shadow-[inset_0_1px_2px_rgb(0_0_0/0.08)]`, plus `aria-pressed`
- `primary`: `border-on bg-on text-bg hover:border-on-2 hover:bg-on-2`
- `ghost`: `border-transparent text-mute hover:bg-panel-2 hover:text-ink`

**`Segmented`**
- Track: `inline-flex flex-wrap gap-0.5 rounded-lg border border-line bg-panel-2 p-0.5`
- Option: `rounded-md font-sans font-semibold transition-colors`
- Selected: `bg-panel text-ink shadow-[0_0_0_1px_var(--color-line-2),0_1px_0_var(--color-line-2)]`
- Unselected: `text-mute hover:text-ink hover:bg-panel-3/60`

**`BitButton`**
- On: `border-[1.5px] border-X bg-X-tint text-X font-bold halo-X`.
- Off: `border border-line-2 bg-panel text-dim font-normal`.
- Hover when clickable: off → `hover:border-off hover:text-mute`; on → `hover:border-on-2`.
- `sm` size: add `relative after:absolute after:-inset-1.5` so the touch target is at least 40px.

**`Bits`**
- 1 → `text-X font-bold`; 0 → `text-dim font-normal`.

**`Stat`** (a rule, not a box)
- Container: `border-l-2 pl-3 py-0.5`. The border uses the tone colour, or `border-line-2` when the tone is ink.
- Label: `label-caps text-[0.6875rem] text-dim`.
- Value: `mt-1 font-mono text-lg font-semibold tabular-nums`, in the tone colour.
- Sub: `text-xs text-mute`.

**`Pill`**
- `rounded-full border px-2 py-0.5 font-sans text-xs font-semibold`.
- Tones: `on` → `border-on/40 bg-on-tint text-on` (and the same pattern for each accent); `mute` → `border-line-2 text-mute`.
- Error pills prefix "✗ ", success pills prefix "✓ ".

**`Steps`**
- Number: `font-display text-lg font-semibold text-amber w-6 shrink-0 text-right tabular-nums` (no circle). Text: `text-body`.

**`Slider`**
- Pass `style={{ "--fill": `${((value-min)/(max-min))*100}%` }}`.

```css
input[type="range"].slider { appearance: none; width: 100%; height: 1.5rem; background: transparent; cursor: pointer; accent-color: var(--color-ink); }
.slider::-webkit-slider-runnable-track { height: 4px; border-radius: 999px;
  background: linear-gradient(to right, var(--color-ink) 0 var(--fill, 0%), var(--color-off) var(--fill, 0%) 100%); }
.slider::-moz-range-track { height: 4px; border-radius: 999px; background: var(--color-off); }
.slider::-moz-range-progress { height: 4px; border-radius: 999px; background: var(--color-ink); }
.slider::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; margin-top: -7px; border-radius: 999px;
  background: var(--color-panel); border: 2px solid var(--color-ink); box-shadow: 0 1px 0 var(--color-line-2); }
.slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 999px; background: var(--color-panel); border: 2px solid var(--color-ink); }
.slider:hover::-webkit-slider-thumb { background: var(--color-panel-2); }
.slider:focus-visible { outline: none; }
.slider:focus-visible::-webkit-slider-thumb, .slider:focus-visible::-moz-range-thumb { outline: 2px solid var(--color-focus); outline-offset: 2px; }
@media (pointer: coarse) { .slider::-webkit-slider-thumb { width: 24px; height: 24px; margin-top: -10px; } }
```

**`<pre>` blocks** (for example cpu-sim:220): `bg-panel-2 border-line text-ink` (was `text-on-2`).

**Text opacity:** never put alpha on a text colour. `text-ink/80`, `text-ink/85`, `text-ink/90` become `text-body`. `text-on/70`, `text-on/80` and `text-dim/60` become `text-on`, `text-mute` and `text-dim`.

## 5. Chapter page layout (`app/routes/chapter-layout.tsx`)

```tsx
<div className="min-h-screen" style={{ "--part-c": partVar } as React.CSSProperties}>
  <SiteHeader … />
  <div className="mx-auto w-full max-w-[86rem] px-4 sm:px-6 xl:grid xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-x-14 xl:px-8">
    <aside className="hidden xl:block" aria-label="Table of contents"><TocRail … /></aside>
    <main id="main" className="chapter-main min-w-0">
      <ChapterOpener />                                   {/* §4.5 */}
      <article ref={articleRef} className="prose-book" style={{ counterReset: `chap ${idx + 1} fig` }}><Outlet /></article>
      <ChapterNav />
    </main>
  </div>
  {menuOpen && <ChapterMenu … />}
</div>
```

**Column widths:**

| Viewport | Rail | Main column | Text measure | Figure width | Wide figure width |
|---|---|---|---|---|---|
| ≥1376px | 240px + 56px gap | 1016px | 36rem | 736px | 992px |
| 1280px | 240px + 56px gap | 920px | 36rem | 736px | 920px |
| 1024px (no rail) | — | 976px | 34rem | 736px | 976px |
| 768px | — | 720px | 34rem | 720px | 720px |
| <640px | — | full width | full width | bleeds to the screen edge | bleeds to the screen edge |

**Figure widths with container units.** Figures overhang the text column symmetrically and never exceed the main column:

```css
.chapter-main { container-type: inline-size; }
.prose-book > .fig { --w: min(var(--fig-w), 100cqw); width: var(--w); max-width: none;
  margin-block: 2.25rem; margin-inline: calc((100% - var(--w)) / 2); }
.prose-book > .fig-wide { --w: min(var(--fig-wide), 100cqw); }
@media (max-width: 39.999rem) {
  .prose-book > .fig { width: calc(100% + 2rem); margin-inline: -1rem; border-inline-width: 0; border-radius: 0; }
}
/* figure numbering */
.prose-book > .fig { counter-increment: fig; }
.fig-num::before { content: "Fig. " counter(chap) "." counter(fig); }
.fig:not(.prose-book > .fig) .fig-num { display: none; }   /* nested in Callout or GoDeeper: no number */
```

- Delete Widget's `lg:-mx-24 xl:-mx-40`.
- Containment check: `container-type` adds layout containment. I grepped: no `position: fixed` element lives inside chapters, so nothing breaks. The cpu-sim flying bus value uses `absolute` inside a `relative` parent, which is fine.

**Header** (`SiteHeader`)
- Wrapper: `sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-[6px]`.
- Inner: `mx-auto flex h-[var(--header-h)] max-w-[86rem] items-center gap-2 px-4 sm:px-6 xl:px-8`. It contains, in order:
  1. Logo (h-6) plus `font-display text-[1.0625rem] font-semibold` "How a Computer Works" (title hidden below `sm`).
  2. A `w-px h-5 bg-line-2` divider.
  3. Running head:
     - xl: plain text `font-sans text-sm text-mute truncate`, "Chapter 3 · Logic Gates".
     - Below xl: the section button described under "Compact TOC" below.
  4. Right side, `ml-auto`: a "Contents" button (`xl:hidden`, opens the existing drawer), then `ThemeToggle`.
- Reading progress: `<div aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 origin-left" style={{ background: "var(--part-c)", transform: `scaleX(${p})` }} />`. Here `p` is scroll progress through the article, updated with `requestAnimationFrame`.
- This **replaces the neon 14-segment bar**.

**TOC rail** (xl+). Build it from `chapters`, `parts` and `useArticleSections`.
- Nav: `sticky top-[calc(var(--header-h)+2rem)] max-h-[calc(100dvh-var(--header-h)-3rem)] overflow-y-auto overscroll-contain scroll-thin pr-2 pb-6 font-sans text-[0.875rem] leading-snug`.
- `label-caps text-dim` "Contents".
- For each part:
  - Label: `mt-5 mb-1.5 label-caps text-[0.6875rem]`, coloured with the part accent: "Part I · The Switch".
  - Chapter rows: an `<ol>` of `Link`s with `-ml-px flex gap-2.5 border-l-2 py-1 pl-2.5 pr-2 rounded-r-sm`. Number span: `w-5 text-right tabular-nums text-dim`.
  - Current chapter: `border-[var(--part-c)] text-ink font-semibold`, `aria-current="page"`.
  - Other chapters: `border-transparent text-mute hover:text-ink hover:bg-panel-2`.
- The **current chapter expands** to its sections:
  - List: `<ol className="mt-1 mb-2 ml-[1.9rem] border-l border-line">`.
  - Items: `<a href={#id} className="-ml-px block border-l-2 py-1 pl-3 pr-1 text-[0.8125rem]">`.
  - Active section: `border-ink text-ink font-semibold`, `aria-current="location"`.
  - Other sections: `border-transparent text-dim hover:text-ink`.
- Clicking a section:
  1. `preventDefault`
  2. `el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" })`
  3. `history.replaceState(null, "", "#" + id)`
- Keep the active item visible by adjusting `rail.scrollTop`. **Do not** call `scrollIntoView` on the rail item; it would also scroll the window.

**Compact TOC** (below xl, inside the header)
- Button: `flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-panel-2`, with `aria-expanded` and `aria-controls="section-menu"`.
  - Content: `font-mono text-xs text-dim` chapter number, then `truncate font-semibold text-ink` with the active section title (falls back to the chapter title), then a chevron.
- Panel: `id="section-menu" absolute inset-x-0 top-full max-h-[min(70dvh,32rem)] overflow-y-auto border-b border-line bg-bg shadow-[0_12px_24px_-16px_rgb(0_0_0/0.35)]`.
  - Inner: `mx-auto max-w-[40rem] px-4 py-3`.
  - Contents: a `label-caps` line "Chapter 3 · Logic Gates", then the section list using the rail styles but bigger (`py-2.5 text-[0.9375rem]`), then a "All chapters →" button that opens the drawer.
- Close on: section click (after scrolling), Esc, `pointerdown` outside the header, and route change. On open, focus the first item; on close, return focus to the button.

**Drawer (`ChapterMenu`)**
- Backdrop: `bg-scrim` (was `bg-black/60`).
- Sheet: `bg-bg border-l border-line`, same list styles as the rail.
- Slide in with `transform` over 200ms; no animation under reduced motion.
- Trap focus inside; close button is 40×40; include the theme switch row.

**Sticky offsets and section tracking**
- The calculator sticky bar (`calculator.tsx:56`): `top-[4.6rem]` becomes `top-[calc(var(--header-h)+0.5rem)]`.
- In `useArticleSections`, change the `top < 150` threshold to `headerEl.getBoundingClientRect().height + 24`.
- At the bottom of the page (`innerHeight + scrollY >= scrollHeight - 2`), force the last section active.

**Prev/next navigation**
- Container: `mx-auto mt-20 grid max-w-[var(--fig-w)] gap-6 border-t-2 border-ink pt-6 sm:grid-cols-2`.
- Each link: `group -m-3 block rounded-md p-3 hover:bg-panel`.
  - `label-caps text-dim`: "← Previous chapter" / "Next chapter →"
  - Title: `font-display text-xl font-semibold text-ink group-hover:underline underline-offset-4 decoration-1`
  - Tagline (next link only): `font-serif italic text-mute`
- Next is right-aligned on `sm`+. No green boxes.

**Home page** (`app/routes/home.tsx`, brief)
- Title page: `label-caps text-dim` "A hands-on illustrated book". Then an h1 in Fraunces 600 (`clamp(2.75rem, 2rem + 4vw, 4.5rem)`) with "actually" in *italic* `text-on` (no drop-shadow). Then an italic Literata subtitle. Buttons: `Btn primary` "Begin reading →" and `Btn` "Contents".
- Ladder: becomes a `plate` figure. Use an ink vertical rule. Active step: solid `bg-on text-bg`. Lit steps: `border-on text-on bg-panel`. Delete all `shadow-[…]`. **Stop the 650ms cycle under reduced motion, when the tab is hidden, and when the ladder is off-screen** (IntersectionObserver).
- "The journey" becomes a classic **Contents** page. Per part: label-caps in the part colour plus a Fraunces part title. Each chapter row uses `grid grid-cols-[2.5rem_1fr_auto] items-baseline`:
  - number: Fraunces 1.25rem, part colour
  - title: Literata 600, with an italic mute tagline below
  - a dotted leader `flex-1 border-b border-dotted border-line-2 mx-2`
  - the `scale` value in `font-mono text-[0.8125rem] text-dim`
- The three feature cards become a "How to read this book" row: three columns separated by `border-l border-line`, each using the same labels and colours as the in-chapter elements (Try it, The math, Go deeper).

## 6. Printed-figure styling

### 6.1 Wires (CSS in `@layer components`, and `circuit.tsx` `Wire`)

```css
.wire { fill: none; stroke: var(--color-off); stroke-width: var(--wire-w, var(--wire-w-off));
  stroke-linecap: round; stroke-linejoin: round; transition: stroke .2s, stroke-width .2s; }
.wire-on { stroke: var(--wire-c, var(--color-on)); stroke-width: var(--wire-w, var(--wire-w-on)); }
[data-theme="night"] .wire-on { filter: drop-shadow(0 0 2px color-mix(in oklab, var(--wire-c, var(--color-on)) 35%, transparent)); }
/* current flow: tiny beads travelling along the inked line */
.wire-flow { fill: none; stroke: var(--color-panel); stroke-width: 1.4; stroke-linecap: round;
  stroke-dasharray: 0.01 10; animation: wireflow 0.9s linear infinite; opacity: 0.95; pointer-events: none; }
[data-theme="night"] .wire-flow { stroke: color-mix(in oklab, var(--wire-c, var(--color-on)) 35%, var(--color-ink)); opacity: 0.85; }
@keyframes wireflow { to { stroke-dashoffset: -10.01; } }
```

`Wire` becomes:

```tsx
<g style={{ ...(width && { "--wire-w": width }), ...(color && { "--wire-c": color }) } as React.CSSProperties}>
  <path d={d} className={on ? "wire wire-on" : "wire"} />
  {on && flow && <path d={d} className="wire-flow" />}
</g>
```

Delete the inline stroke and filter.

- **Paper:** an "on" wire is a solid deep-green 3-unit line with paper-coloured beads drifting along it; "off" is a thin 2-unit warm-grey line.
- **Night:** the same, plus a 2px glow at 35%.
- The flow period changes from 0.7s to 0.9s, which is calmer.
- Under reduced motion the beads are hidden. Optionally add `markerEnd="url(#arrow-on)"` to show direction statically instead.

### 6.2 Symbols (`circuit.tsx`)

| Element | Spec |
|---|---|
| `Gate` | `strokeWidth 1.75`. Stroke `out ? on : dim` (was `line-2`, which is only 1.8:1 and nearly invisible on paper). Fill `out ? var(--color-on-tint) : var(--color-panel)`. `className={out ? "glow-on" : undefined}`; delete the inline filter. Label 10px (was 9px), `fill: out ? on : mute`. |
| `Junction` | r=3.5, fill `on ? on : off`. |
| `SignalTag` | Fill `var(--color-panel)`, stroke `on ? on : off`, text `on ? on : dim` in bold mono 11px. |
| `InputPin` | On: fill `on-tint`, stroke `on`, width 2, plus `glow-on`. Off: fill `panel`, stroke `off`. Value text `on : dim`; label `fill-mute` 11px. Focus: `g[role="button"]:focus { outline: none } g[role="button"]:focus-visible > rect { stroke: var(--color-focus); stroke-width: 3; }` |
| `OutputPin` | On: fill `on`, text `var(--color-bg)`, plus `glow-on`. Off: fill `panel`, stroke `off`, text `dim`. |
| Battery / ground | Stroke `ink`, 2 for the long plate and 4 for the short plate (as now). |
| Figure labels | Atkinson Mono, ≥11px *as rendered*: font-size × (rendered width ÷ viewBox width) must be ≥ 11. Otherwise use `min-w-[…] overflow-x-auto` like the MOSFET widget does. |
| Markers | Keep `arrow-on`, `arrow-cyan`, `arrow-dim`; add `arrow-ink` and `arrow-amber`. |
| Oxide hatch (optional) | `<pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line y2="5" stroke="var(--color-off)" strokeWidth="1"/></pattern>`, laid over oxide rects. |
| Any fill or stroke containing `color-mix()` | Pass it through `style={{ fill }}`, not the presentation attribute. |

### 6.3 Lamp

The glow is replaced by **printed rays**, and brightness becomes ray length plus fill strength.

```tsx
export function Lamp({ x, y, on, r = 18, label, intensity = 1 }: {…; intensity?: number}) {
  const k = on ? intensity : 0;
  return (<g>
    {on && <circle cx={x} cy={y} r={r * 2.2} fill="url(#lamp-glow)" />}           {/* night only (alpha 0 in paper) */}
    {on && Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4 + Math.PI / 8;   /* avoids 0°/90°, the wire directions */
      return <line key={i} x1={x + Math.cos(a) * (r + 5)} y1={y + Math.sin(a) * (r + 5)}
        x2={x + Math.cos(a) * (r + 7 + 6 * k)} y2={y + Math.sin(a) * (r + 7 + 6 * k)}
        stroke="var(--color-amber)" strokeWidth={1.75} strokeLinecap="round" />; })}
    <circle cx={x} cy={y} r={r} strokeWidth={2} stroke={on ? "var(--color-amber)" : "var(--color-off)"}
      style={{ fill: on ? `color-mix(in oklab, var(--color-lamp) ${30 + 70 * k}%, var(--color-panel-2))` : "var(--color-panel-2)" }} />
    {/* filament path unchanged; stroke on ? var(--color-lamp-filament) : var(--color-dim) */}
    {label && <text … className="fill-mute font-mono text-[11px]">{label}</text>}
  </g>);
}
```

In `CircuitDefs`, the glow stops become `style={{ stopColor: "var(--color-lamp-glow)", stopOpacity: "var(--lamp-glow-alpha)" }}` and `style={{ stopColor: "var(--color-lamp-glow)", stopOpacity: 0 }}`.

In `transistor.tsx:221`, the extra glow circle becomes `<Lamp … intensity={current} />`.

### 6.4 Screen surfaces

Anything drawn as a screen keeps light inks in both modes:

```css
.surface-screen { background: var(--color-screen); color: var(--color-screen-ink); color-scheme: dark;
  --color-bg: var(--color-screen); --color-panel: var(--color-screen-2); --color-ink: #ece5d6; --color-mute: #b9ae9b; --color-dim: #9d927f;
  --color-on: #8ccb9c; --color-amber: #deb06a; --color-cyan: #8fbfe2; --color-pink: #eb9bbd; --color-violet: #c3a6e6; --color-red: #f2907e; }
```

### 6.5 Hard-coded colours to migrate

| File:line | Now | Becomes |
|---|---|---|
| root.tsx `theme-color` | `#060a0f` | `#f5f0e6` (the boot script switches it) |
| transistor.tsx:236 substrate | `#1a1530` / `#3b2f63` | `var(--color-si-p)` / `var(--color-si-p-edge)` |
| transistor.tsx:238 holes | `#8b7bd8` | `var(--color-si-hole)`, stroke-width 1.2 |
| transistor.tsx:247 wells | `#0d2a3d` / `#1f5f86` | `var(--color-si-n)` / `var(--color-si-n-edge)` |
| transistor.tsx:257–258 contacts | `#5b6b7d` | `var(--color-metal)` |
| transistor.tsx:262 oxide | `#41505f` | `var(--color-oxide)` |
| transistor.tsx:258 gate fill | `rgb(255 181 71/…)` : `#4a5868` | `style={{fill: vg>0 ? `color-mix(in oklab, var(--color-amber) ${Math.round(20+55*vg/VMAX)}%, var(--color-si-gate))` : "var(--color-si-gate)"}}` |
| transistor.tsx `+` charge signs | `fill-bg` | keep `var(--color-bg)` and add `stroke="var(--color-amber)" strokeWidth={0.75} paintOrder="stroke"` |
| storage.tsx:333–335 | same silicon hexes as transistor | same tokens |
| storage.tsx:343, 362 oxide | `#41505f` | `var(--color-oxide)` |
| storage.tsx:351 floating gate | `#2a2140` | `var(--color-float)` |
| storage.tsx:370 control gate | `rgb(255 181 71/.85)` : `#4a5868` | `color-mix(in oklab, var(--color-amber) 75%, var(--color-si-gate))` : `var(--color-si-gate)` |
| storage.tsx:440 flash level fill | `rgb(76 201 255/.25)` : `rgb(167 139 250/.12)` | `var(--color-cyan-tint)` : `var(--color-violet-tint)`; the off state also gets `strokeDasharray="3 3"` |
| storage.tsx:580 platter | `#151c26`, stroke `line-2` | `var(--color-platter)`, stroke `var(--color-off)` |
| storage.tsx:595–596 sectors | `#243042` / `#1d2735` | `var(--color-platter-2)` / `var(--color-platter)` |
| storage.tsx:605 hub | `#2b3644` | `var(--color-metal)` |
| storage.tsx:608 arm | `#8796a8` | `var(--color-metal-2)` |
| storage.tsx:609 pivot | `#5b6b7d` | `var(--color-metal)` |
| storage.tsx:686 6th file colour | `#ff8a4c` | `var(--color-red)` |
| calculator.tsx:128 pressed key | `rgb(255 181 71/.25)` | `var(--color-amber-tint)`; stroke `line-2` → `off` |
| calculator.tsx:549 framebuffer | `#dfe8f1` / `#111a24` | `var(--color-screen-ink)` / `var(--color-screen-2)`; wrap the svg in `div.surface-screen rounded-md p-1` |
| calculator.tsx:612 scan-out | `#dfe8f1` / `#2a3644` / `#0d141c` | `var(--color-screen-ink)` / `var(--color-screen-dim)` / `var(--color-screen-2)`; same wrapper |
| calculator.tsx:629–631 subpixels | `bg-black`, `#ff3b3b` `#3dff6e` `#3b7bff` + inline `boxShadow` | `bg-screen surface-screen`; `var(--color-sub-r/g/b)` with `style={{background:c, color:c}} className="halo"` (no inline boxShadow) |
| graphics.tsx:111 RGB mixer | `#000` | `var(--color-screen)` |
| graphics.tsx:205, 362, 526 | `bg-black` | `bg-screen surface-screen` |
| graphics.tsx:384 rasterizer off cells | `#0e151d` | `var(--color-screen-2)` |
| graphics.tsx:402 triangle outline | `#fff` | `var(--color-screen-ink)` |
| graphics.tsx:413, 427 vertex stroke/text | `#000` | `var(--color-screen)` |
| network.tsx:257 fibre | `rgb(76 201 255/.08)` | `var(--color-cyan-tint)`; stroke `line-2` → `off` |
| network.tsx:269–270 light pulses | `#e8fbff` + drop-shadow | `fill="var(--color-cyan)" className="glow-cyan"` |
| video.tsx:465 DCT heat colours | `rgb(76 201 255/…)` / `rgb(255 92 138/…)` | `color-mix(in oklab, var(--color-cyan|pink) ${Math.round((0.15+a*0.7)*100)}%, var(--color-panel-2))` |
| video.tsx:433, 438 DCT cell text | `text-white` + black text-shadow; zero → `text-dim/60` | `text-ink heat-label`, with `.heat-label { text-shadow: 0 0 2px var(--color-bg), 0 0 1px var(--color-bg); }`; zero → `text-dim`. Ink with a page-coloured halo stays readable at every fill level; without it the worst case was 3.5:1. Raise `text-[0.55rem]` to at least `0.6875rem` where the cell size allows. |
| video.tsx:709, 719–735 | overlays drawn on a photo frame | **keep** (they sit on image content) |
| clock.tsx:229 | `rgb(255 92 138/.25)` | `var(--color-pink-tint)` |
| cpu-sim bus bar | `bg-cyan/60 shadow…` | `bg-cyan halo-cyan`; bus bit cells `bg-cyan/30 text-cyan` → `bg-cyan-tint text-cyan` |
| cpu-sim `Box` src / dst | border + glow | `border-cyan halo-cyan` / `border-on halo-on` |
| cpu-sim output digits | green text glow | `text-on glow-on` |
| cpu-sim control signals | `bg-amber/20 … shadow` | `bg-amber-tint halo-amber` |
| machine-code `bg-amber/25`; memory `bg-on/25`, `bg-on/30`, `bg-cyan/25`; storage `bg-cyan/70` (where text sits on top) | strong tints | the matching `-tint` token; keep `/70` only if no text sits on it |
| logo.tsx | green outline + glow | pins `var(--color-mute)`, body fill `panel` stroke `ink`, die `on` (keep `glow-on`, which only shows at night) |
| chapter-layout `bg-black/60` | backdrop | `bg-scrim` |
| pixel-canvas.tsx:52 grid lines | `rgba(0,0,0,.55)` over image pixels | **keep** |

## 7. Eye-comfort UX rules

1. **Contrast targets.** Body text 10–12:1, never pure black on white (21:1) or white on black. Secondary text ≥7:1, tertiary ≥4.5:1. Accent text ≥5.3:1 on every surface. Tints behind accent text use `-tint` tokens only.
2. **Focus.** One global rule:
   ```css
   :where(a, button, input, select, textarea, summary, [tabindex]):focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
   ```
   It follows `border-radius`, survives forced-colors mode, and never fights `box-shadow` halos. SVG pins use the rect-stroke rule from §6.2. Remove every `focus-visible:ring-*`.
3. **Colour meaning.** Green means signal = 1 only. UI selection uses ink: `border-ink`, `bg-panel` or `bg-panel-2`, semibold. Errors use carmine **plus** "✗". Instruction vs data and cyan vs violet must also differ by label or dash pattern.
4. **Hover.** Change background (`panel` → `panel-2`) and/or border (`line-2` → `off`). Hovered text becomes ink. No glow, no `brightness()`, no scaling, no border-width change (use the `halo` ring when a heavier border is needed, so nothing shifts). Duration 120–150ms ease-out, colours only.
5. **Paper buttons look like letterpress keys.** Panel fill, `line-2` border, 1px inset bottom edge, ink semibold text. The pressed state is `translate-y-px` plus an inset shadow. Primary is solid deep green with cream text.
6. **Minimum sizes.**
   - Text: ≥11px (0.6875rem) anywhere, including SVG text *as rendered*. Raise the current `text-[0.55rem]`, `text-[0.6rem]`, `text-[0.65rem]`, `text-[9px]` and `text-[10px]` uses (64 sites).
   - Touch targets: ≥40px on coarse pointers (`pointer-coarse:` variant, or an invisible `after:` hit area).
7. **Reduced motion.**
   ```css
   @media (prefers-reduced-motion: reduce) {
     .wire-flow { display: none; }
     *, *::before, *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
   }
   ```
   Also: `MotionConfig reducedMotion="user"`, no smooth scrolling, the home ladder stops cycling, and the details marker changes "+" to "−" with no rotation.
8. **No motion you are not looking at.** Pause looping animations (ladder, `useAnimationTime`, clocks) when off-screen or when the tab is hidden.
9. **Reading rhythm.** 60–72 characters per line, line-height 1.65, 1em between paragraphs, ragged right, `text-wrap: pretty`; headings use `balance`. No auto-hyphenation. All-caps only for labels of four words or fewer. No long italic passages; italic is for taglines, captions and emphasis.
10. **Night comfort.** `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale` in night only, which reduces halation. Body text is softened to `--color-body` (10.6:1). Glows are at most 3px at 40%.
11. **Theme switch.** No colour transitions while switching (the `.theme-switching` class); browser chrome follows via `theme-color`; OS changes are followed until the user picks a mode.
12. **High-contrast preference.**
    ```css
    @media (prefers-contrast: more) {
      :root, :root[data-theme="night"] { --color-body: var(--color-ink); --color-mute: var(--color-ink); --color-line: var(--color-line-2); }
      :root:not([data-theme="night"]) { --color-dim: #4f463b; --color-line-2: #978b79; }
      :root[data-theme="night"] { --color-dim: #c4b9a6; --color-line-2: #746b5e; }
    }
    ```
13. **Print (optional, fits the book idea).**
    ```css
    @media print { header, aside, nav { display: none } :root { color-scheme: light } details > * { display: block } }
    ```
    This assumes no `data-theme="night"` styles apply during print: the boot script should not run, or add `print-color-adjust: exact` only for figures.

## 8. Implementation order and checks

1. **`app.css`:** tokens, night block, effect variables, `label-caps`, prose, callout, plate, glow/halo, wire, slider, focus, reduced-motion and high-contrast rules.
2. **`root.tsx`:** font URL, theme-color meta and boot script, `suppressHydrationWarning`, `MotionConfig`. Then the `theme-toggle.tsx` changes.
3. **`ui.tsx`:** each component per §4.6.
4. **`circuit.tsx`** and **`logo.tsx`.**
5. **`chapter-layout.tsx`:** header, rail, compact TOC, opener, nav, drawer. Then the `toc.tsx` threshold fix.
6. **`home.tsx`.**
7. **Widgets:** work through the migration table in §6.5. Then grep for leftover old patterns: `rgb\(61 255 160`, `#[0-9a-f]{6}`, `shadow-\[0_0`, `drop-shadow`, `brightness-`, `bg-black`, `text-white`, `/[3-9]0\b`.
8. **Verify:**
   - Screenshots of a chapter, the CPU simulator and the graphics widgets in both modes at 390, 1024, 1280 and 1440px.
   - Set `localStorage.hcw-theme = "night"` and hard-reload: there must be no flash of paper.
   - Run axe or Lighthouse contrast checks in both modes.
   - Toggle reduced motion on: beads hidden, ladder static.
   - Keyboard-tab through an SVG figure: every pin shows a focus ring.