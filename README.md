# How a Computer Works: from transistor to video, visually

An interactive, beginner-friendly website that explains how a computer works, from a single transistor up
to watching a video and sending a message across the internet. Every chapter has hands-on widgets, worked
maths, and optional “Go deeper” sections.

## The journey

| Part            | Chapters                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| 1 · The Switch  | Transistor · Binary · Logic Gates · The Adder · The ALU                                              |
| 2 · The Machine | Memory · The Clock · The CPU (a working 8-bit CPU you can step through) · Machine Code               |
| 3 · Storage     | Cache, DRAM, SSD flash cells, hard drives and file systems                                           |
| 4 · Real Life   | Pressing 2 + 3 (keyboard → pixels) · Graphics · Watching a Video (real DCT compression) · Sending a Message |

Highlights:

- **SAP-8 CPU simulator**: fetch → decode → execute one clock tick at a time, with the bus value flying
  between registers and every control signal shown.
- **Machine code chapter**: a tiny compiler (tokens → tree → assembly → bytes) and an assembler. “Run it on
  the CPU” loads your program into the simulator via `/cpu?ram=<hex>`.
- **Video chapter**: a real JPEG-style codec (YCbCr, 8×8 DCT, quantisation, zig-zag, run-length) plus
  motion-vector search, running live on procedurally generated pixels.
- **Network chapter**: Diffie–Hellman with small numbers, packets with checksums, and an animated internet
  map with lost and out-of-order packets.

## Tech

- [React Router](https://reactrouter.com/) v8 (framework mode, SSR) on Cloudflare Workers
- Tailwind CSS v4 (dark “circuit board” theme tokens live in `app/app.css`)
- [KaTeX](https://katex.org/) for maths, [Motion](https://motion.dev/) for the CPU bus animation
- Everything else (circuits, charts, canvases) is hand-built SVG/canvas. No image assets.

## Project layout

```
app/
  routes.ts                 route config: home + one route per chapter inside a shared layout
  routes/home.tsx           landing page and chapter map
  routes/chapter-layout.tsx header, progress bar, chapter menu, prev/next
  routes/chapters/*.tsx     chapter text
  widgets/*.tsx             interactive widgets, one file per chapter
  components/               shared UI (callouts, sliders, bits), circuit SVG parts, KaTeX, pixel canvas
  lib/                      the "engines": chapter list, CPU emulator, assembler/compiler, ALU,
                            JPEG-style codec, procedural images, 5×7 font, hooks
```

## Development

```bash
bun install
bun run dev        # http://localhost:5173
bun run typecheck
bun run build
bun run deploy     # build + wrangler deploy
```
