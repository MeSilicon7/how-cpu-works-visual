# How a Computer Works: an illustrated, hands-on book

An interactive, beginner-friendly book that explains how a computer works, from electricity and a single
transistor up to watching a video and sending a message across the internet. It is written for a curious
reader who feels computers are “magic”: every chapter has figures you can click, the arithmetic worked out
with real numbers, and optional “Go deeper” sections.

## The chapters

| Part                 | Chapters                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| I · The Switch       | Electricity Basics · The Transistor · Binary · Logic Gates · The Adder · The ALU                                                |
| II · The Machine     | Memory · The Clock · The CPU (a working 8-bit CPU you can step through) · Making a Chip · Machine Code · Functions & the Stack |
| III · The System     | Storage · Who Decides What Bits Mean? · Input, Output & the Monitor · The Operating System                                     |
| IV · Scenes          | Pressing 2 + 3 (keyboard → pixels) · Graphics · Watching a Video (real DCT compression) · Sending a Message                   |

Highlights:

- **SAP-8 CPU simulator**: fetch → decode → execute one clock tick at a time, with the bus value moving
  between registers and every control signal shown. From the Functions chapter on it has a stack
  (`CALL`, `RET`, `PUSH`, `POP`).
- **Who decides what bits mean?**: one byte seen through many lenses (number, letter, colour, pixels,
  instruction), a local file X-ray that finds the format from its magic number, and the whole path of
  the letter “A” from the key to the pixels.
- **Machine code chapter**: a tiny compiler (tokens → tree → assembly → bytes) and an assembler. “Run it on
  the CPU” loads your program into the simulator via `/cpu?ram=<hex>`.
- **Video chapter**: a real JPEG-style codec (YCbCr, 8×8 DCT, quantisation, zig-zag, run-length) plus
  motion-vector search, running live on procedurally generated pixels.
- **Network chapter**: Diffie–Hellman with small numbers, packets with checksums, and an animated internet
  map with lost and out-of-order packets.

## Reading experience

- Two themes: **paper** (warm cream, the default) and **warm night**, chosen from the system setting
  until the reader picks one with the toggle. The choice is remembered.
- Book typography (Literata, Fraunces, Atkinson Hyperlegible), numbered figures, booktabs tables and
  margin-style callouts.
- A side table of contents that follows the section you are reading (a drop-down on small screens), a
  reading-progress line, and previous/next chapter links.
- Respects “reduce motion”, higher-contrast settings and print.

## Tech

- [React Router](https://reactrouter.com/) v8 (framework mode, SSR) on Cloudflare Workers
- Tailwind CSS v4 (paper and night theme tokens live in `app/app.css`)
- [KaTeX](https://katex.org/) for maths, [Motion](https://motion.dev/) for the CPU bus animation
- Everything else (circuits, charts, canvases) is hand-built SVG/canvas. No image assets.

## Project layout

```
app/
  routes.ts                 route config: home + one route per chapter inside a shared layout
  routes/home.tsx           landing page and chapter map
  routes/chapter-layout.tsx header, side table of contents, chapter menu, prev/next
  routes/chapters/*.tsx     chapter text
  widgets/*.tsx             interactive widgets, one file per chapter
  components/               shared UI (callouts, sliders, bits), circuit SVG parts, KaTeX, pixel canvas
  lib/                      the "engines": chapter list, CPU emulator, assembler/compiler, ALU,
                            JPEG-style codec, procedural images, bitmap fonts, hooks
```

## Development

```bash
bun install
bun run dev        # http://localhost:5173
bun run typecheck
bun run build
bun run deploy     # build + wrangler deploy
```
