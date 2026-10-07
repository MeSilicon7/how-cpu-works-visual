import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { TeX } from "~/components/tex";
import { BitButton, Btn, cx, DataTable, Pill, Segmented, Stat, Widget } from "~/components/ui";
import { binStr, fmt, hexStr, toSigned } from "~/lib/bits";
import { disassemble, opByCode } from "~/lib/cpu";
import { boldRows, glyph8, MISSING_GLYPH, pictureFor, rowsToGrid } from "~/lib/font8";

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                  */
/* ------------------------------------------------------------------ */

const hx = (n: number) => hexStr(n, 2);

/** A byte written as two groups of 4 bits: 1s bold in ink, 0s dim. */
function ByteBits({ v, className, width = 8 }: { v: number; className?: string; width?: number }) {
  const s = binStr(v, width);
  return (
    <span className={cx("font-mono tabular-nums", className)}>
      {[...s].map((c, i) => (
        <span
          key={i}
          className={cx(c === "1" ? "font-bold text-ink" : "font-normal text-dim", i > 0 && i % 4 === 0 && "ml-[0.3em]")}
        >
          {c}
        </span>
      ))}
    </span>
  );
}

/** Seven-segment geometry (viewBox 0 0 72 108), segments a–g plus the decimal point. */
const SEG_POLYS: Record<string, string> = {
  a: "12,4 52,4 56,8 52,12 12,12 8,8",
  b: "56,10 60,14 60,48 56,52 52,48 52,14",
  c: "56,56 60,60 60,94 56,98 52,94 52,60",
  d: "12,96 52,96 56,100 52,104 12,104 8,100",
  e: "8,56 12,60 12,94 8,98 4,94 4,60",
  f: "8,10 12,14 12,48 8,52 4,48 4,14",
  g: "12,50 52,50 56,54 52,58 12,58 8,54",
};
const SEG_NAMES = ["a", "b", "c", "d", "e", "f", "g"] as const;
const SEG_LABEL_POS: Record<string, [number, number]> = {
  a: [32, 24],
  b: [44, 34],
  c: [44, 80],
  d: [32, 92],
  e: [20, 80],
  f: [20, 34],
  g: [32, 70],
};

/** A 7-segment display. `pattern` bits: bit 0 = a … bit 6 = g, bit 7 = decimal point. */
function SevenSeg({
  pattern,
  className,
  labels,
  showDp,
}: {
  pattern: number;
  className?: string;
  labels?: boolean;
  showDp?: boolean;
}) {
  return (
    <svg viewBox="0 0 72 108" className={className} role="img" aria-label="seven-segment display">
      {SEG_NAMES.map((s, i) => {
        const on = (pattern >> i) & 1;
        return (
          <polygon
            key={s}
            points={SEG_POLYS[s]}
            fill={on ? "var(--color-sub-r)" : "var(--color-screen-2)"}
            stroke={on ? "none" : "var(--color-bezel)"}
            strokeWidth={0.8}
          />
        );
      })}
      {showDp && (
        <circle
          cx={66}
          cy={100}
          r={4}
          fill={(pattern >> 7) & 1 ? "var(--color-sub-r)" : "var(--color-screen-2)"}
          stroke={(pattern >> 7) & 1 ? "none" : "var(--color-bezel)"}
          strokeWidth={0.8}
        />
      )}
      {labels &&
        SEG_NAMES.map((s) => (
          <text
            key={s}
            x={SEG_LABEL_POS[s][0]}
            y={SEG_LABEL_POS[s][1]}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-screen-dim font-mono"
            fontSize={9}
          >
            {s}
          </text>
        ))}
    </svg>
  );
}

/** An 8×8 glyph drawn as printed ink squares (a font table, not a screen). */
function GlyphGrid({
  rows,
  cell = 18,
  className,
  highlightRow,
}: {
  rows: number[];
  cell?: number;
  className?: string;
  highlightRow?: number;
}) {
  const grid = rowsToGrid(rows);
  return (
    <svg
      viewBox={`0 0 ${8 * cell} ${8 * cell}`}
      className={className}
      role="img"
      aria-label="8 by 8 pixel glyph"
    >
      <rect x={0} y={0} width={8 * cell} height={8 * cell} fill="var(--color-panel)" />
      {highlightRow !== undefined && (
        <rect x={0} y={highlightRow * cell} width={8 * cell} height={cell} fill="var(--color-highlight)" />
      )}
      {grid.map((row, y) =>
        row.map((v, x) => (
          <rect
            key={`${x}-${y}`}
            x={x * cell + 1}
            y={y * cell + 1}
            width={cell - 2}
            height={cell - 2}
            rx={1.5}
            fill={v ? "var(--color-ink)" : "none"}
            stroke={v ? "none" : "var(--color-line-2)"}
            strokeWidth={0.75}
          />
        )),
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 1. One byte, many readers                                            */
/* ------------------------------------------------------------------ */

const CONTROL_NAMES: Record<number, string> = {
  0: "NUL (“nothing”)",
  7: "BEL (ring a bell)",
  8: "Backspace",
  9: "Tab",
  10: "New line",
  13: "Carriage return",
  27: "Escape",
  127: "Delete",
};

function usbKeyName(v: number): string | null {
  if (v >= 0x04 && v <= 0x1d) return `the ${String.fromCharCode(65 + v - 4)} key`;
  if (v >= 0x1e && v <= 0x26) return `the ${v - 0x1d} key`;
  if (v === 0x27) return "the 0 key";
  if (v >= 0x3a && v <= 0x45) return `the F${v - 0x39} key`;
  if (v >= 0x59 && v <= 0x61) return `keypad ${v - 0x58}`;
  const named: Record<number, string> = {
    0x28: "Enter",
    0x29: "Escape",
    0x2a: "Backspace",
    0x2b: "Tab",
    0x2c: "the space bar",
    0x2d: "the - key",
    0x2e: "the = key",
    0x2f: "the [ key",
    0x30: "the ] key",
    0x31: "the \\ key",
    0x33: "the ; key",
    0x34: "the ' key",
    0x35: "the ` key",
    0x36: "the , key",
    0x37: "the . key",
    0x38: "the / key",
    0x39: "Caps Lock",
    0x46: "Print Screen",
    0x47: "Scroll Lock",
    0x48: "Pause",
    0x49: "Insert",
    0x4a: "Home",
    0x4b: "Page Up",
    0x4c: "Delete",
    0x4d: "End",
    0x4e: "Page Down",
    0x4f: "the → arrow",
    0x50: "the ← arrow",
    0x51: "the ↓ arrow",
    0x52: "the ↑ arrow",
    0x53: "Num Lock",
    0x54: "keypad /",
    0x55: "keypad *",
    0x56: "keypad −",
    0x57: "keypad +",
    0x58: "keypad Enter",
    0x62: "keypad 0",
    0x63: "keypad .",
    0xe0: "left Ctrl",
    0xe1: "left Shift",
    0xe2: "left Alt",
    0xe3: "left Windows / ⌘",
    0xe4: "right Ctrl",
    0xe5: "right Shift",
    0xe6: "right Alt",
    0xe7: "right Windows / ⌘",
  };
  return named[v] ?? null;
}

function Lens({ n, who, rule, children }: { n: number; who: ReactNode; rule: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-md border border-line bg-bg/50 p-3">
      <div className="label-caps text-dim">
        <span className="text-mute">{n}</span> · {who}
      </div>
      <div className="mt-2 flex min-h-12 items-center gap-3">{children}</div>
      <div className="mt-2 font-serif text-[0.875rem] leading-snug text-mute">{rule}</div>
    </div>
  );
}

const BYTE_PRESETS = [
  { label: "‘A’", v: 65 },
  { label: "‘a’", v: 97 },
  { label: "‘0’", v: 48 },
  { label: "47", v: 47 },
  { label: "193", v: 193 },
  { label: "255", v: 255 },
];

export function ByteLenses() {
  const [v, setV] = useState(65);
  const signed = toSigned(v, 8);
  const bits = Array.from({ length: 8 }, (_, i) => (v >> (7 - i)) & 1);
  const op = opByCode.get(v >> 4);
  const key = usbKeyName(v);

  let letter: ReactNode;
  let letterRule: ReactNode;
  if (v >= 33 && v <= 126) {
    letter = <span className="font-mono text-3xl font-bold text-ink">{String.fromCharCode(v)}</span>;
    letterRule = <>Row {v} of the ASCII table. The table was written by people in 1963.</>;
  } else if (v === 32) {
    letter = <span className="font-sans text-lg font-semibold text-ink">a space</span>;
    letterRule = <>Row 32 of the ASCII table: the empty space between words.</>;
  } else if (v < 32 || v === 127) {
    letter = <span className="font-sans text-lg font-semibold text-ink">{CONTROL_NAMES[v] ?? "a control code"}</span>;
    letterRule = <>Rows 0–31 and 127 are commands for old printers and terminals, not visible letters.</>;
  } else {
    letter = <span className="font-sans text-lg font-semibold text-ink">no letter</span>;
    letterRule =
      v >= 160 ? (
        <>
          ASCII stops at 127. In UTF-8 this byte is only one piece of a longer letter. (An old European table,
          Latin-1, says “{String.fromCharCode(v)}”.)
        </>
      ) : (
        <>ASCII stops at 127. In UTF-8 this byte is only one piece of a longer letter.</>
      );
  }

  return (
    <Widget
      wide
      title="One byte, eight readers"
      subtitle="Click the bits. The byte is the same for every reader below; each one just applies a different rule to it."
    >
      <div className="flex flex-col items-center gap-3">
        <div className="scroll-thin max-w-full overflow-x-auto pb-1">
          <div className="grid w-max grid-cols-8 gap-x-1.5 gap-y-1 sm:gap-x-2.5">
            {bits.map((_, i) => (
              <div key={`p${i}`} className="text-center font-mono text-[0.6875rem] text-dim">
                {2 ** (7 - i)}
              </div>
            ))}
            {bits.map((b, i) => (
              <div key={`b${i}`} className="flex justify-center">
                <BitButton
                  on={!!b}
                  size="lg"
                  onClick={() => setV((x) => x ^ (1 << (7 - i)))}
                  title={`bit ${7 - i}`}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="mr-1 text-sm text-mute">Try:</span>
          {BYTE_PRESETS.map((p) => (
            <Btn key={p.v} active={v === p.v} onClick={() => setV(p.v)} className="font-mono">
              {p.label}
            </Btn>
          ))}
        </div>
        <div className="font-mono text-sm text-mute">
          in hex: <span className="font-semibold text-ink">0x{hx(v)}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 @xl:grid-cols-2 @4xl:grid-cols-4">
        <Lens n={1} who="as a whole number" rule={<>Add up the place values of the 1s. This is what ADD does.</>}>
          <span className="font-mono text-3xl font-bold text-ink tabular-nums">{v}</span>
        </Lens>
        <Lens
          n={2}
          who="as a signed number"
          rule={
            <>
              Two's complement: the left bit is worth −128 instead of +128.
              {v >= 128 && (
                <>
                  {" "}
                  Here: −128 + {v - 128} = {signed}.
                </>
              )}
            </>
          }
        >
          <span className={cx("font-mono text-3xl font-bold tabular-nums", signed < 0 ? "text-pink" : "text-ink")}>
            {signed > 0 ? `+${signed}` : signed}
          </span>
        </Lens>
        <Lens n={3} who="as a letter" rule={letterRule}>
          {letter}
        </Lens>
        <Lens
          n={4}
          who="as a brightness"
          rule={
            <>
              0 = black, 255 = full light: {v}/255 = {Math.round((v / 255) * 100)}%. One byte per colour in a photo.
            </>
          }
        >
          <span
            className="h-12 w-12 shrink-0 rounded-sm border border-line-2"
            style={{ background: `rgb(${v} ${v} ${v})` }}
            aria-hidden
          />
          <span className="font-mono text-lg font-semibold text-ink tabular-nums">
            {Math.round((v / 255) * 100)}%
          </span>
        </Lens>
        <Lens n={5} who="as 8 pixels" rule={<>Each bit is one dot: 1 = ink, 0 = paper. One row of a letter in a font.</>}>
          <div className="flex gap-0.5" aria-label={`pixels ${binStr(v, 8)}`}>
            {bits.map((b, i) => (
              <span
                key={i}
                className={cx("h-6 w-6 rounded-[2px]", b ? "bg-ink" : "border border-line-2 bg-panel")}
              />
            ))}
          </div>
        </Lens>
        <Lens
          n={6}
          who="as a SAP-8 instruction"
          rule={
            <>
              Left 4 bits <span className="font-mono">{binStr(v >> 4, 4)}</span> pick the operation (
              {op ? op.name : "none"}), right 4 bits <span className="font-mono">{binStr(v & 15, 4)}</span> are its
              number. {op ? op.describe.replace(/\bn\b/g, String(v & 15)) : "SAP-8 has no instruction 1101."}
            </>
          }
        >
          <span className="font-mono text-2xl font-bold text-ink">{disassemble(v)}</span>
        </Lens>
        <Lens
          n={7}
          who="as a USB key code"
          rule={<>The list every USB keyboard uses to say which key position went down.</>}
        >
          <span className="font-sans text-lg font-semibold text-ink">{key ?? "no key"}</span>
        </Lens>
        <Lens
          n={8}
          who="as display segments"
          rule={<>Bits 0–6 switch on segments a–g of a digit display, bit 7 the dot. (More on this below.)</>}
        >
          <span className="surface-screen inline-flex rounded-md border border-bezel p-1.5">
            <SevenSeg pattern={v} showDp className="h-12 w-8" />
          </span>
          <span className="font-mono text-sm text-mute">
            lit: {SEG_NAMES.filter((_, i) => (v >> i) & 1).join(" ") || "none"}
            {(v >> 7) & 1 ? " + dot" : ""}
          </span>
        </Lens>
      </div>

      <p className="mt-4 border-t border-line pt-3 text-center font-serif text-[0.9375rem] text-body">
        The bits <span className="font-mono">{binStr(v, 8, 4)}</span> never changed. Eight readers, eight meanings.{" "}
        <span className="text-ink">The meaning is in the reader, not in the byte.</span>
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 2. File X-ray                                                        */
/* ------------------------------------------------------------------ */

const fromHex = (h: string) => (h.replace(/\s+/g, "").match(/../g) ?? []).map((x) => parseInt(x, 16));
/** One byte per character (character codes 0–255). */
const latin1 = (s: string) => [...s].map((c) => c.charCodeAt(0) & 255);

const TINY_PNG = fromHex(
  "89504e470d0a1a0a0000000d4948445200000002000000020802000000fdd49a730000001449444154789c63f8cfc0c000c20cffffffff0f001fee05fbb0b897c90000000049454e44ae426082",
);

interface Sample {
  id: string;
  name: string;
  bytes: number[];
  /** True if `bytes` is the whole file (so the right app can open it). */
  whole?: boolean;
}

function buildSamples(): Sample[] {
  const enc = new TextEncoder();
  const exeHead = [
    ...fromHex("4d5a90000300000004000000ffff0000b8000000000000004000000000000000"),
    ...new Array(28).fill(0),
    0x80,
    0,
    0,
    0,
    ...fromHex("0e1fba0e00b409cd21b8014ccd21"),
    ...latin1("This program cannot be run in DOS mode.\r\r\n$"),
  ];
  return [
    { id: "png", name: "photo.png", bytes: TINY_PNG, whole: true },
    {
      id: "jpg",
      name: "holiday.jpg",
      bytes: fromHex(
        "ffd8ffe000104a46494600010101004800480000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432",
      ),
    },
    {
      id: "gif",
      name: "funny.gif",
      bytes: [...latin1("GIF89a"), ...fromHex("2c01c8 00f7 0000 000000 ffffff 21ff0b"), ...latin1("NETSCAPE2.0")],
    },
    {
      id: "pdf",
      name: "report.pdf",
      bytes: latin1("%PDF-1.7\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    },
    {
      id: "docx",
      name: "letter.docx",
      bytes: [
        ...fromHex("504b0304140006000800000021009c8e5a2b5a01000020050000130000"),
        ...latin1("[Content_Types].xml"),
        ...fromHex("a2040228a000020000000000000000"),
      ],
    },
    {
      id: "mp3",
      name: "song.mp3",
      bytes: [
        ...latin1("ID3"),
        ...fromHex("04000000000f76"),
        ...latin1("TIT2"),
        ...fromHex("0000000a000003"),
        ...latin1("My song"),
        ...latin1("TPE1"),
        ...fromHex("0000000b000003"),
        ...latin1("The Bits"),
      ],
    },
    {
      id: "mp4",
      name: "video.mp4",
      bytes: fromHex(
        "000000206674797069736f6d0000020069736f6d69736f3261766331 6d70343100000008667265650a2d4b836d646174",
      ),
    },
    {
      id: "elf",
      name: "game (Linux)",
      bytes: fromHex(
        "7f454c4602010100000000000000000003003e0001000000601000000000000040000000000000003836000000000000",
      ),
    },
    { id: "exe", name: "setup.exe", bytes: exeHead },
    { id: "txt", name: "notes.txt", bytes: Array.from(enc.encode("Hi! Grüße, Привет, こんにちは 👋\nBuy milk.\n")) },
    { id: "liar", name: "cat.txt", bytes: TINY_PNG, whole: true },
  ];
}

interface Mark {
  from: number;
  to: number;
  tone: "amber" | "cyan" | "violet";
  label: ReactNode;
}
interface Verdict {
  format: string;
  /** Which formats a file name extension may honestly use. */
  exts: string[];
  /** Browser MIME type, if a browser can show it as a picture. */
  image?: string;
  rule: ReactNode;
  marks: Mark[];
  facts: ReactNode[];
}

const be32 = (b: number[], i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const le16 = (b: number[], i: number) => b[i] | (b[i + 1] << 8);
const str = (b: number[], from: number, to: number) => String.fromCharCode(...b.slice(from, to));
const startsWith = (b: number[], sig: number[], at = 0) => sig.every((x, i) => b[at + i] === x);
const hexList = (b: number[], from: number, to: number) => b.slice(from, to).map(hx).join(" ");

function identify(b: number[]): Verdict {
  const magic = (n: number, at = 0): Mark => ({
    from: at,
    to: at + n,
    tone: "amber",
    label: <>magic number</>,
  });
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    const v: Verdict = {
      format: "PNG image",
      exts: ["png"],
      image: "image/png",
      rule: <>starts with 89 50 4E 47 0D 0A 1A 0A (“.PNG” and some line-ending bytes)</>,
      marks: [magic(8)],
      facts: [],
    };
    if (b.length >= 24 && str(b, 12, 16) === "IHDR") {
      v.marks.push(
        { from: 16, to: 20, tone: "cyan", label: <>width</> },
        { from: 20, to: 24, tone: "violet", label: <>height</> },
      );
      v.facts.push(
        <>
          The PNG rules say: bytes 16–19 are the <span className="text-cyan">width</span>: {hexList(b, 16, 20)} ={" "}
          <b>{fmt(be32(b, 16))}</b> pixels. Bytes 20–23 are the <span className="text-violet">height</span>:{" "}
          {hexList(b, 20, 24)} = <b>{fmt(be32(b, 20))}</b> pixels.
        </>,
      );
    }
    return v;
  }
  if (startsWith(b, [0xff, 0xd8, 0xff]))
    return {
      format: "JPEG photo",
      exts: ["jpg", "jpeg", "jfif"],
      image: "image/jpeg",
      rule: <>starts with FF D8 FF</>,
      marks: [magic(3)],
      facts: str(b, 6, 10) === "JFIF" || str(b, 6, 10) === "Exif" ? [<>Bytes 6–9 spell “{str(b, 6, 10)}”, a second label inside the header.</>] : [],
    };
  if (str(b, 0, 6) === "GIF87a" || str(b, 0, 6) === "GIF89a")
    return {
      format: "GIF image",
      exts: ["gif"],
      image: "image/gif",
      rule: <>starts with “{str(b, 0, 6)}” (47 49 46 38 …)</>,
      marks: [
        magic(6),
        { from: 6, to: 8, tone: "cyan", label: <>width</> },
        { from: 8, to: 10, tone: "violet", label: <>height</> },
      ],
      facts: [
        <>
          GIF stores the size with the small byte first: width = {hexList(b, 6, 8)} → 0x{hx(b[7])}
          {hx(b[6])} = <b>{le16(b, 6)}</b>, height = {hexList(b, 8, 10)} → 0x{hx(b[9])}
          {hx(b[8])} = <b>{le16(b, 8)}</b> pixels. (PNG uses the opposite order. Another human choice.)
        </>,
      ],
    };
  if (str(b, 0, 5) === "%PDF-")
    return {
      format: "PDF document",
      exts: ["pdf"],
      rule: <>starts with “%PDF-” (25 50 44 46 2D)</>,
      marks: [magic(5), { from: 5, to: 8, tone: "cyan", label: <>version</> }],
      facts: [<>After the magic number comes the version of the PDF rules: {str(b, 5, 8)}.</>],
    };
  if (startsWith(b, [0x50, 0x4b, 0x03, 0x04])) {
    const n = le16(b, 26);
    const name = b.length >= 30 + n ? str(b, 30, 30 + n) : "";
    const office = name.startsWith("[Content_Types]") || name.startsWith("word/") || name.startsWith("_rels/");
    return {
      format: office ? "ZIP box holding an Office document" : "ZIP archive",
      exts: office ? ["docx", "xlsx", "pptx", "zip"] : ["zip", "docx", "xlsx", "pptx", "jar", "apk", "epub", "odt"],
      rule: <>starts with “PK” 03 04 (PK are the initials of Phil Katz, who made ZIP)</>,
      marks: [magic(4), ...(name ? [{ from: 30, to: 30 + n, tone: "cyan" as const, label: <>first file inside</> }] : [])],
      facts: name
        ? [
            <>
              Bytes 30 onwards name the first file packed inside: “{name}”.
              {office && <> That name means it is a Word, Excel or PowerPoint file: they are ZIP boxes full of XML text.</>}
            </>,
          ]
        : [],
    };
  }
  if (str(b, 0, 3) === "ID3")
    return {
      format: "MP3 audio (with an ID3 tag)",
      exts: ["mp3"],
      rule: <>starts with “ID3” (49 44 33), a label block for song title and artist</>,
      marks: [magic(3)],
      facts: str(b, 10, 14) === "TIT2" ? [<>“TIT2” at byte 10 means: the song title follows.</>] : [],
    };
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && b.length > 2)
    return { format: "MP3 audio", exts: ["mp3"], rule: <>starts with FF {hx(b[1])} (an audio frame start)</>, marks: [magic(2)], facts: [] };
  if (str(b, 4, 8) === "ftyp") {
    const brand = str(b, 8, 12);
    const kind =
      brand === "qt  "
        ? "QuickTime video (.mov)"
        : brand === "M4A "
          ? "AAC audio (.m4a)"
          : brand === "heic" || brand === "mif1"
            ? "HEIC photo"
            : brand === "avif"
              ? "AVIF image"
              : "MP4 video";
    return {
      format: kind,
      exts: ["mp4", "m4v", "m4a", "mov", "heic", "avif", "3gp"],
      rule: <>bytes 4–7 spell “ftyp” (file type)</>,
      marks: [magic(4, 4), { from: 8, to: 12, tone: "cyan", label: <>brand</> }],
      facts: [
        <>
          Bytes 0–3 ({hexList(b, 0, 4)} = {be32(b, 0)}) are the length of this first block. Bytes 8–11 name the exact
          flavour: “{brand.trim()}”.
        </>,
      ],
    };
  }
  if (str(b, 0, 4) === "RIFF") {
    const t = str(b, 8, 12);
    return {
      format: t === "WAVE" ? "WAV audio" : t === "WEBP" ? "WebP image" : t === "AVI " ? "AVI video" : "RIFF file",
      exts: t === "WAVE" ? ["wav"] : t === "WEBP" ? ["webp"] : ["avi"],
      image: t === "WEBP" ? "image/webp" : undefined,
      rule: <>starts with “RIFF”, and bytes 8–11 say “{t}”</>,
      marks: [magic(4), { from: 8, to: 12, tone: "cyan", label: <>type</> }],
      facts: [],
    };
  }
  if (startsWith(b, [0x7f, 0x45, 0x4c, 0x46]))
    return {
      format: "Linux program (ELF)",
      exts: ["", "so", "elf", "o", "bin"],
      rule: <>starts with 7F “ELF”</>,
      marks: [magic(4), { from: 4, to: 5, tone: "cyan", label: <>32/64-bit</> }],
      facts: [<>Byte 4 = {b[4]}: {b[4] === 2 ? "a 64-bit program" : "a 32-bit program"}.</>],
    };
  if (str(b, 0, 2) === "MZ") {
    const at = b.findIndex((_, i) => str(b, i, i + 12) === "This program");
    return {
      format: "Windows program",
      exts: ["exe", "dll", "sys", "scr"],
      rule: <>starts with “MZ” (4D 5A), the initials of Mark Zbikowski, who designed the format in the early 1980s</>,
      marks: [magic(2), ...(at > 0 ? [{ from: at, to: at + 39, tone: "cyan" as const, label: <>old message</> }] : [])],
      facts:
        at > 0
          ? [<>At byte {at}: “This program cannot be run in DOS mode.” A message kept for 1980s computers that cannot run it.</>]
          : [],
    };
  }
  if (startsWith(b, [0xcf, 0xfa, 0xed, 0xfe]))
    return { format: "macOS program", exts: ["", "dylib"], rule: <>starts with CF FA ED FE</>, marks: [magic(4)], facts: [] };
  if (startsWith(b, [0xca, 0xfe, 0xba, 0xbe]))
    return {
      format: "Java program or macOS program",
      exts: ["class", ""],
      rule: <>starts with CA FE BA BE. Two different formats chose the same “word”, so the reader must check more bytes</>,
      marks: [magic(4)],
      facts: [],
    };
  if (startsWith(b, [0x1f, 0x8b])) return { format: "GZIP archive", exts: ["gz", "tgz"], rule: <>starts with 1F 8B</>, marks: [magic(2)], facts: [] };
  if (startsWith(b, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]))
    return { format: "7-Zip archive", exts: ["7z"], rule: <>starts with “7z” BC AF 27 1C</>, marks: [magic(6)], facts: [] };
  if (str(b, 0, 4) === "Rar!") return { format: "RAR archive", exts: ["rar"], rule: <>starts with “Rar!”</>, marks: [magic(4)], facts: [] };
  if (str(b, 0, 4) === "OggS") return { format: "Ogg audio", exts: ["ogg", "oga", "opus"], rule: <>starts with “OggS”</>, marks: [magic(4)], facts: [] };
  if (str(b, 0, 4) === "fLaC") return { format: "FLAC audio", exts: ["flac"], rule: <>starts with “fLaC”</>, marks: [magic(4)], facts: [] };
  if (str(b, 0, 16) === "SQLite format 3\0")
    return { format: "SQLite database", exts: ["db", "sqlite", "sqlite3"], rule: <>starts with “SQLite format 3”</>, marks: [magic(16)], facts: [] };
  if (str(b, 0, 2) === "BM" && b.length > 26)
    return { format: "BMP image", exts: ["bmp"], image: "image/bmp", rule: <>starts with “BM”</>, marks: [magic(2)], facts: [] };
  if (startsWith(b, [0x00, 0x61, 0x73, 0x6d]))
    return { format: "WebAssembly program", exts: ["wasm"], rule: <>starts with 00 “asm”</>, marks: [magic(4)], facts: [] };
  if (str(b, 0, 4) === "8BPS") return { format: "Photoshop image", exts: ["psd"], rule: <>starts with “8BPS”</>, marks: [magic(4)], facts: [] };

  // No magic number: is it text?
  const bom = startsWith(b, [0xef, 0xbb, 0xbf]);
  const body = bom ? b.slice(3) : b;
  let cut = body.length;
  // Don't punish a letter that was cut in half at the end of what we read.
  for (let i = Math.max(0, body.length - 3); i < body.length; i++) if (body[i] >= 0xc0) cut = i;
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(body.slice(0, cut)));
  const bad = [...decoded].filter((c) => c === "�" || (c.charCodeAt(0) < 32 && !"\n\r\t".includes(c))).length;
  if (b.length > 0 && bad === 0)
    return {
      format: "Plain text (UTF-8)",
      exts: ["txt", "md", "csv", "html", "htm", "css", "js", "ts", "tsx", "json", "xml", "svg", "py", "c", "h", "java", "log", "ini", "yml", "yaml", "rtf", "sh"],
      rule: bom ? (
        <>starts with EF BB BF, a mark that says “UTF-8 text”</>
      ) : (
        <>
          has <b>no</b> magic number. The reader guesses: every byte follows the UTF-8 rules and there are no control
          codes, so it is probably text
        </>
      ),
      marks: bom ? [magic(3)] : [],
      facts: [],
    };
  return {
    format: "Unknown",
    exts: [],
    rule: <>matches none of the starts this page knows. Without the right rules, the bytes are just numbers</>,
    marks: [],
    facts: [],
  };
}

type ReadAs = "hex" | "text" | "numbers" | "pixels" | "code";

const PRINTABLE = (c: number) => c >= 32 && c < 127;

export function FileXray() {
  const samples = useMemo(buildSamples, []);
  const [sampleId, setSampleId] = useState("png");
  const [own, setOwn] = useState<{ name: string; size: number; bytes: number[]; file: File } | null>(null);
  const [readAs, setReadAs] = useState<ReadAs>("hex");
  const [more, setMore] = useState(false);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sample = samples.find((s) => s.id === sampleId) ?? samples[0];
  const bytes = own ? own.bytes : sample.bytes;
  const name = own ? own.name : sample.name;
  const size = own ? own.size : sample.whole ? sample.bytes.length : null;
  const verdict = useMemo(() => identify(bytes), [bytes]);
  const shown = bytes.slice(0, more ? 256 : 64);

  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  const extLies = verdict.exts.length > 0 && ext !== "" && !verdict.exts.includes(ext);

  // Let the right reader (the browser's own image decoder) open it, locally.
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgOk, setImgOk] = useState(true);
  useEffect(() => {
    setImgOk(true);
    if (!verdict.image) {
      setImgUrl(null);
      return;
    }
    let blob: Blob | null = null;
    if (own) blob = own.file;
    else if (sample.whole) blob = new Blob([new Uint8Array(sample.bytes)], { type: verdict.image });
    if (!blob) {
      setImgUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [own, sample, verdict.image]);

  function load(file: File) {
    setErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer;
      setOwn({ name: file.name, size: file.size, bytes: Array.from(new Uint8Array(buf)), file });
      setReadAs("hex");
    };
    reader.onerror = () => setErr("Your browser could not read that file.");
    // Only the first 4 KB: enough for every header on this page.
    reader.readAsArrayBuffer(file.slice(0, 4096));
  }

  const markAt = (i: number) => verdict.marks.find((m) => i >= m.from && i < m.to);
  const toneCls = { amber: "bg-amber-tint text-amber font-bold", cyan: "bg-cyan-tint text-cyan font-bold", violet: "bg-violet-tint text-violet font-bold" };

  const groups: number[][] = [];
  for (let i = 0; i < shown.length; i += 8) groups.push(shown.slice(i, i + 8));

  return (
    <Widget
      wide
      title="File X-ray: what is really inside a file?"
      subtitle="Pick a sample, or drop any file from your computer. Your file never leaves your computer: this page reads its first 4 KB inside your browser and sends nothing anywhere."
    >
      <div className="flex flex-wrap gap-1.5">
        {samples.map((s) => (
          <Btn
            key={s.id}
            active={!own && sampleId === s.id}
            onClick={() => {
              setOwn(null);
              setSampleId(s.id);
            }}
            className="font-mono text-xs"
          >
            {s.name}
          </Btn>
        ))}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) load(f);
        }}
        className={cx(
          "mt-3 flex flex-wrap items-center gap-3 rounded-md border border-dashed px-3 py-2.5 text-sm transition-colors",
          drag ? "border-ink bg-panel-2 text-ink" : "border-line-2 text-mute",
        )}
      >
        <Btn onClick={() => inputRef.current?.click()}>Choose your own file…</Btn>
        <span>or drop one here.</span>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) load(f);
            e.target.value = "";
          }}
        />
        {own && (
          <span className="font-mono text-xs text-ink">
            {own.name} · {fmt(own.size)} bytes
          </span>
        )}
        {err && <span className="text-pink">✗ {err}</span>}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Segmented<ReadAs>
          size="sm"
          value={readAs}
          onChange={setReadAs}
          options={[
            { value: "hex", label: "The bytes (hex)" },
            { value: "text", label: "Read as text" },
            { value: "numbers", label: "as numbers" },
            { value: "pixels", label: "as pixels" },
            { value: "code", label: "as SAP-8 code" },
          ]}
        />
        {bytes.length > 64 && (
          <Btn variant="ghost" onClick={() => setMore((m) => !m)} className="text-xs">
            {more ? "Show first 64 bytes" : `Show first ${Math.min(256, bytes.length)} bytes`}
          </Btn>
        )}
      </div>

      <div className="mt-2 rounded-md border border-line bg-bg/50 p-3">
        {readAs === "hex" && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[0.8125rem] leading-6 tabular-nums">
            {groups.map((g, gi) => (
              <div key={gi} className="flex gap-2.5 whitespace-nowrap">
                <span className="text-dim">{hexStr(gi * 8, 4)}</span>
                <span className="flex gap-1">
                  {g.map((x, i) => {
                    const m = markAt(gi * 8 + i);
                    return (
                      <span key={i} className={cx("rounded-[3px] px-0.5", m ? toneCls[m.tone] : x === 0 ? "text-dim" : "text-ink")}>
                        {hx(x)}
                      </span>
                    );
                  })}
                </span>
                <span className="text-mute">
                  {g.map((x, i) => {
                    const m = markAt(gi * 8 + i);
                    return (
                      <span key={i} className={cx(m && toneCls[m.tone])}>
                        {PRINTABLE(x) ? String.fromCharCode(x) : "·"}
                      </span>
                    );
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
        {readAs === "text" && (
          <>
            <div className="font-mono text-sm break-all whitespace-pre-wrap text-ink">
              {new TextDecoder("utf-8").decode(new Uint8Array(shown)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "□")}
            </div>
            <p className="mt-2 font-serif text-sm text-mute">
              A text editor uses the UTF-8 rules on every byte. � means “these bytes break the UTF-8 rules”, □ means “a
              control code”. For a text file this is right; for anything else it is nonsense.
            </p>
          </>
        )}
        {readAs === "numbers" && (
          <>
            <div className="font-mono text-sm break-words text-ink tabular-nums">{shown.join(" ")}</div>
            <p className="mt-2 font-serif text-sm text-mute">
              The same bytes, written in decimal. A program could add them up, but the total would mean nothing.
            </p>
          </>
        )}
        {readAs === "pixels" && (
          <>
            <div className="grid w-full max-w-md grid-cols-16 gap-px" aria-label="bytes as grey pixels">
              {shown.map((x, i) => (
                <span key={i} className="aspect-square" style={{ background: `rgb(${x} ${x} ${x})` }} />
              ))}
            </div>
            <p className="mt-2 font-serif text-sm text-mute">
              Each byte as one grey dot (0 = black, 255 = white), 16 per row. Even for a photo this is noise: the real
              picture is packed by rules this view doesn't know.
            </p>
          </>
        )}
        {readAs === "code" && (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 font-mono text-sm @md:grid-cols-4">
              {shown.slice(0, 16).map((x, i) => (
                <div key={i} className="flex gap-2 whitespace-nowrap">
                  <span className="w-5 text-right text-dim">{i}</span>
                  <span className="text-mute">{hx(x)}</span>
                  <span className="text-ink">{disassemble(x)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 font-serif text-sm text-mute">
              If SAP-8's program counter pointed at these bytes, it would run them as instructions. They are valid
              instructions. They just do nothing useful.
            </p>
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 @2xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-2 font-serif text-[0.9375rem] text-body">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="label-caps text-dim">The bytes say</span>
            <span className="font-sans text-lg font-semibold text-ink">{verdict.format}</span>
          </div>
          <p>
            <span className="text-amber">Rule used:</span> the file {verdict.rule}.
          </p>
          {verdict.facts.map((f, i) => (
            <p key={i}>{f}</p>
          ))}
          <p className="text-mute">
            The name says: <span className="font-mono text-ink">{ext ? `.${ext}` : "(no extension)"}</span>
            {size !== null && <> · size: {fmt(size)} bytes</>}
            {!own && !sample.whole && <> · only the start of the file is shown</>}
          </p>
          {extLies && (
            <p className="rounded-md border border-pink bg-pink-tint px-3 py-2 text-pink">
              ✗ The name and the bytes disagree! The name says .{ext}, the bytes say {verdict.format}. Renaming a file
              changes no byte. An app that checks the magic number will still open it correctly; an app that trusts
              the name will show garbage.
            </p>
          )}
        </div>
        {imgUrl && imgOk && (
          <div className="flex flex-col items-center gap-1.5">
            <div className="label-caps text-dim">Opened by the right reader</div>
            <img
              src={imgUrl}
              alt={`${name}, decoded by your browser`}
              onError={() => setImgOk(false)}
              className="h-28 w-28 rounded-sm border border-line-2 object-contain [image-rendering:pixelated]"
            />
            <div className="max-w-40 text-center text-xs text-mute">your browser's {verdict.format.split(" ")[0]} decoder</div>
          </div>
        )}
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Seven-segment decoder: a lookup table                             */
/* ------------------------------------------------------------------ */

const SEG_DIGITS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
const SEG_HEX = [...SEG_DIGITS, 0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71];

export function SevenSegDecoder() {
  const [n, setN] = useState(5);
  const [rom, setRom] = useState<"dec" | "hex">("dec");
  const table = rom === "dec" ? [...SEG_DIGITS, 0, 0, 0, 0, 0, 0] : SEG_HEX;
  const out = table[n];
  const unused = rom === "dec" && n > 9;
  const b = [0, 1, 2, 3].map((i) => (n >> i) & 1);
  const nb0 = 1 - b[0];
  const nb2 = 1 - b[2];
  const eVal = nb0 & (nb2 | b[1]);

  return (
    <Widget
      wide
      title="The 7-segment decoder: 4 wires in, 7 wires out"
      subtitle="Set the 4 input bits. A tiny ROM looks up the pattern stored for that number and switches on the matching segments. Nothing in it “knows” what a 5 is."
    >
      <div className="grid gap-6 @3xl:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-4">
          <div>
            <div className="label-caps mb-1.5 text-center text-dim">Input: 4 bits</div>
            <div className="flex gap-2">
              {[3, 2, 1, 0].map((i) => (
                <BitButton
                  key={i}
                  on={!!((n >> i) & 1)}
                  label={`b${i} (${2 ** i})`}
                  onClick={() => setN((x) => x ^ (1 << i))}
                />
              ))}
            </div>
            <div className="mt-1.5 text-center font-mono text-sm text-mute">
              = <span className="font-bold text-ink">{n}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <div className="label-caps text-dim">7 wires out</div>
              {SEG_NAMES.map((s, i) => {
                const on = (out >> i) & 1;
                return (
                  <div key={s} className="flex items-center gap-2 font-mono text-sm">
                    <span className="w-3 text-mute">{s}</span>
                    <span className={cx("h-[3px] w-10 rounded-full", on ? "bg-on" : "h-[1.5px] bg-off")} />
                    <span className={on ? "font-bold text-on" : "text-dim"}>{on}</span>
                  </div>
                );
              })}
            </div>
            <div className="surface-screen rounded-lg border border-bezel p-3">
              <SevenSeg pattern={out} labels className="h-40 w-28" />
            </div>
          </div>
          <Segmented
            size="sm"
            value={rom}
            onChange={setRom}
            options={[
              { value: "dec", label: "ROM for 0–9" },
              { value: "hex", label: "ROM for 0–F (hex)" },
            ]}
          />
        </div>

        <div className="min-w-0">
          <div className="label-caps mb-1 text-dim">The ROM: one stored byte per input number</div>
          <div className="scroll-thin overflow-x-auto">
            <table className="booktabs text-[0.8125rem]">
              <thead>
                <tr>
                  <th>in</th>
                  <th>address</th>
                  <th>stored bits (g f e d c b a)</th>
                  <th>hex</th>
                  <th>shows</th>
                </tr>
              </thead>
              <tbody>
                {table.map((p, i) => (
                  <tr
                    key={i}
                    className={cx("cursor-pointer", i === n && "hl")}
                    onClick={() => setN(i)}
                  >
                    <td className="text-center">{i}</td>
                    <td className="text-center">{binStr(i, 4)}</td>
                    <td className="text-center">
                      <ByteBits v={p} width={7} />
                    </td>
                    <td className="text-center">{hx(p)}</td>
                    <td className="text-center text-mute">
                      {rom === "dec" && i > 9 ? "not used" : i.toString(16).toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-line bg-bg/50 p-3 font-serif text-[0.9375rem] text-body">
        {unused ? (
          <p>
            Inputs 10–15 never happen for a decimal digit, so the people who filled this ROM stored 00 there (nothing
            lit). Engineers call such rows <b>don't care</b>. Switch to the hex ROM: same wires, different stored
            bytes, and now 10–15 show A b C d E F.
          </p>
        ) : (
          <>
            <p>
              Address {binStr(n, 4)} → stored byte 0x{hx(out)} = <ByteBits v={out} width={7} /> → segments{" "}
              <b>{SEG_NAMES.filter((_, i) => (out >> i) & 1).join(", ")}</b> light up.
            </p>
            {rom === "dec" && (
              <p className="mt-2">
                You can also build any one column of the table from gates. Segment e is lit only for 0, 2, 6 and 8:{" "}
                <span className="font-mono text-sm">
                  e = NOT b0 AND (NOT b2 OR b1) = {nb0} AND ({nb2} OR {b[1]}) ={" "}
                  <span className={eVal ? "font-bold text-on" : "text-dim"}>{eVal}</span>
                </span>
                .
              </p>
            )}
          </>
        )}
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 3b. The instruction decoder: how the CPU "knows" 0100 means STA     */
/* ------------------------------------------------------------------ */

export function OpcodeDecoder() {
  const [code, setCode] = useState(0b0100);
  const op = opByCode.get(code);
  const bits = [7, 6, 5, 4].map((b, i) => ({ name: `b${b}`, v: (code >> (3 - i)) & 1 }));
  const terms = bits.map((x) => (x.v ? x.name : `NOT ${x.name}`));
  return (
    <Widget
      title="Inside the decoder: one AND gate per pattern"
      subtitle="The top 4 bits of the instruction register go into 16 detector gates. Each gate fires for exactly one pattern. Flip the bits."
    >
      <div className="grid gap-5 @xl:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-2">
          <div className="label-caps text-dim">Opcode bits</div>
          <div className="flex gap-2">
            {bits.map((x, i) => (
              <BitButton key={x.name} on={!!x.v} label={x.name} onClick={() => setCode((c) => c ^ (1 << (3 - i)))} />
            ))}
          </div>
          <div className="mt-2 text-center font-serif text-[0.9375rem] text-body">
            The gate for this pattern:
            <div className="mt-1 font-mono text-sm text-ink">{terms.join(" AND ")}</div>
            <div className="mt-1 font-mono text-sm text-mute">
              = {bits.map(() => "1").join(" AND ")} = <span className="font-bold text-on">1</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-sm @md:grid-cols-4 @xl:grid-cols-2">
          {Array.from({ length: 16 }, (_, i) => {
            const o = opByCode.get(i);
            const on = i === code;
            return (
              <button
                type="button"
                key={i}
                onClick={() => setCode(i)}
                className={cx(
                  "flex items-center gap-2 rounded-sm px-1.5 py-0.5 text-left transition-colors hover:bg-panel-2",
                  on && "bg-on-tint",
                )}
              >
                <span className={cx("h-2.5 w-2.5 shrink-0 rounded-full", on ? "bg-on halo-on" : "border border-line-2")} />
                <span className="text-dim">{binStr(i, 4)}</span>
                <span className={on ? "font-bold text-on" : "text-mute"}>{o ? o.name : "—"}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-4 border-t border-line pt-3 font-serif text-[0.9375rem] text-body">
        {op ? (
          <>
            Only the <b>{op.name}</b> line is 1. It switches on the {op.name} recipe in the control unit's ROM: {op.describe}
          </>
        ) : (
          <>Pattern 1101 has no recipe in SAP-8. Its line goes nowhere, so the CPU does nothing for it.</>
        )}{" "}
        Nobody “understands” the opcode. A wire is simply 1 or 0.
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Follow the 'A' from the key to the glass                          */
/* ------------------------------------------------------------------ */

/** US key positions (row by row) and their USB usage IDs. */
const KB: Array<Array<[string, number]>> = [
  [
    ["Q", 0x14],
    ["W", 0x1a],
    ["E", 0x08],
    ["R", 0x15],
    ["T", 0x17],
    ["Y", 0x1c],
    ["U", 0x18],
    ["I", 0x0c],
    ["O", 0x12],
    ["P", 0x13],
  ],
  [
    ["A", 0x04],
    ["S", 0x16],
    ["D", 0x07],
    ["F", 0x09],
    ["G", 0x0a],
    ["H", 0x0b],
    ["J", 0x0d],
    ["K", 0x0e],
    ["L", 0x0f],
    [";", 0x33],
  ],
  [
    ["Z", 0x1d],
    ["X", 0x1b],
    ["C", 0x06],
    ["V", 0x19],
    ["B", 0x05],
    ["N", 0x11],
    ["M", 0x10],
  ],
];

type LayoutId = "us" | "fr" | "ru";
const LAYOUTS: Record<LayoutId, { name: string; short: string; plain: string[]; shift: string[] }> = {
  us: { name: "English (US)", short: "US", plain: ["qwertyuiop", "asdfghjkl;", "zxcvbnm"], shift: ["QWERTYUIOP", "ASDFGHJKL:", "ZXCVBNM"] },
  fr: { name: "French (AZERTY)", short: "French", plain: ["azertyuiop", "qsdfghjklm", "wxcvbn,"], shift: ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN?"] },
  ru: { name: "Russian (ЙЦУКЕН)", short: "Russian", plain: ["йцукенгшщз", "фывапролдж", "ячсмить"], shift: ["ЙЦУКЕНГШЩЗ", "ФЫВАПРОЛДЖ", "ЯЧСМИТЬ"] },
};
const charAt = (layout: LayoutId, r: number, c: number, shift: boolean) =>
  [...(shift ? LAYOUTS[layout].shift : LAYOUTS[layout].plain)[r]][c];

type FontId = "classic" | "bold" | "picture";
function glyphFor(code: number, font: FontId): { rows: number[]; missing: boolean } {
  if (font === "picture") return { rows: pictureFor(code).rows, missing: false };
  const g = glyph8(code);
  const rows = g ?? MISSING_GLYPH;
  return { rows: font === "bold" ? boldRows(rows) : rows, missing: !g };
}

const STAGES = ["Key", "Layout", "Number", "Font", "Framebuffer", "Monitor"] as const;
const SCREEN_W = 1920;
/** The crop of the screen we draw: 48 × 24 pixels from the top-left corner. */
const CROP_W = 48;
const CROP_H = 24;
const X0 = 32;
const Y0 = 16;
const BEFORE = "Hi! ";

function cpLabel(code: number) {
  return `U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
}

export function FollowTheA() {
  const [pos, setPos] = useState<[number, number]>([1, 0]);
  const [layout, setLayout] = useState<LayoutId>("us");
  const [shift, setShift] = useState(true);
  const [font, setFont] = useState<FontId>("classic");
  const [stage, setStage] = useState(0);
  const [pick, setPick] = useState<[number, number] | null>(null);

  const [r, c] = pos;
  const usage = KB[r][c][1];
  const ch = charAt(layout, r, c, shift);
  const code = ch.codePointAt(0)!;
  const utf8 = Array.from(new TextEncoder().encode(ch));
  const { rows, missing } = glyphFor(code, font);
  const lit = rows.reduce((n, row) => n + binStr(row, 8).split("1").length - 1, 0);

  // The framebuffer crop: earlier text "Hello" on line 0 and "Hi! " + the new glyph on line 2.
  const fb = useMemo(() => {
    const px = Array.from({ length: CROP_H }, () => new Array<number>(CROP_W).fill(0));
    const own = Array.from({ length: CROP_H }, () => new Array<boolean>(CROP_W).fill(false));
    const put = (text: string, x0: number, y0: number, mine = false) =>
      [...text].forEach((t, i) => {
        const g = glyphFor(t.codePointAt(0)!, font).rows;
        g.forEach((row, y) => {
          for (let x = 0; x < 8; x++) {
            const X = x0 + i * 8 + x;
            if (X >= CROP_W) continue;
            px[y0 + y][X] = (row >> (7 - x)) & 1;
            own[y0 + y][X] = mine;
          }
        });
      });
    put("Hello", 0, 0);
    put(BEFORE, 0, Y0);
    put(ch, X0, Y0, true);
    return { px, own };
  }, [font, ch]);

  const firstLit = (() => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((rows[y] >> (7 - x)) & 1) return [X0 + x, Y0 + y] as [number, number];
    return [X0, Y0] as [number, number];
  })();
  const [px, py] = pick ?? firstLit;
  const pickLit = fb.px[py][px] === 1;
  const addr = (py * SCREEN_W + px) * 4;

  const choose = (rr: number, cc: number) => {
    setPos([rr, cc]);
    setPick(null);
  };

  const before = [...BEFORE].map((t) => t.codePointAt(0)!);
  const beforeBytes = Array.from(new TextEncoder().encode(BEFORE));

  return (
    <Widget
      wide
      title="Follow the ‘A’: from your finger to the glass"
      subtitle="Six stages, each one a lookup in a table. Change the key, the layout, Shift or the font: every stage after it changes too. Use Next to walk through."
    >
      {/* controls that feed the whole chain */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-mute">
          Layout
          <Segmented<LayoutId>
            size="sm"
            value={layout}
            onChange={(v) => {
              setLayout(v);
              setPick(null);
            }}
            options={(Object.keys(LAYOUTS) as LayoutId[]).map((k) => ({ value: k, label: LAYOUTS[k].short }))}
          />
        </label>
        <Btn active={shift} onClick={() => (setShift((s) => !s), setPick(null))} className="text-xs">
          ⇧ Shift {shift ? "held" : "not held"}
        </Btn>
        <label className="flex items-center gap-2 text-sm text-mute">
          Font
          <Segmented<FontId>
            size="sm"
            value={font}
            onChange={(v) => {
              setFont(v);
              setPick(null);
            }}
            options={[
              { value: "classic", label: "Classic" },
              { value: "bold", label: "Bold" },
              { value: "picture", label: "Picture" },
            ]}
          />
        </label>
      </div>

      {/* stage strip */}
      <ol className="mt-4 flex flex-wrap items-center gap-1 font-sans text-xs">
        {STAGES.map((s, i) => (
          <li key={s} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setStage(i)}
              aria-current={stage === i ? "step" : undefined}
              className={cx(
                "rounded-md border px-2 py-1 font-semibold transition-colors pointer-coarse:py-2",
                stage === i ? "border-ink bg-panel-2 text-ink" : "border-line text-mute hover:bg-panel-2 hover:text-ink",
              )}
            >
              {i + 1} · {s}
            </button>
            {i < STAGES.length - 1 && <span className="text-dim" aria-hidden>→</span>}
          </li>
        ))}
      </ol>

      <div className="mt-3 min-h-[19rem] rounded-md border border-line bg-bg/50 p-3 sm:p-4">
        {stage === 0 && (
          <div className="space-y-3">
            <p className="font-serif text-[0.9375rem] text-body">
              Click a key. Under it, a switch closes. The keyboard's own chip knows only <b>where</b> that switch is,
              so it sends a <b>position number</b> from the USB list, not a letter.
            </p>
            <div className="scroll-thin overflow-x-auto pb-1">
              <div className="w-max space-y-1">
                {KB.map((row, ri) => (
                  <div key={ri} className="flex gap-1" style={{ paddingLeft: `${ri * 0.6}rem` }}>
                    {row.map(([, id], ci) => {
                      const sel = ri === r && ci === c;
                      const up = charAt(layout, ri, ci, true);
                      const lo = charAt(layout, ri, ci, false);
                      const two = up !== lo.toUpperCase();
                      return (
                        <button
                          type="button"
                          key={ci}
                          title={`usage ID 0x${hx(id)}`}
                          onClick={() => choose(ri, ci)}
                          className={cx(
                            "relative flex h-9 w-8 flex-col items-center justify-center rounded-md border font-sans text-sm leading-none font-semibold transition-colors sm:h-10 sm:w-10",
                            sel
                              ? "border-ink bg-panel-2 text-ink shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)]"
                              : "border-line-2 bg-panel text-ink shadow-[inset_0_-2px_0_var(--color-line-2)] hover:bg-panel-2",
                          )}
                        >
                          {two ? (
                            <>
                              <span className="text-[0.6875rem] text-mute">{up}</span>
                              <span>{lo}</span>
                            </>
                          ) : (
                            up
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-sm">
              <span className="text-mute">USB report:</span>
              {[shift ? 0x02 : 0, 0, usage, 0, 0, 0, 0, 0].map((x, i) => (
                <span
                  key={i}
                  className={cx(
                    "rounded-[3px] border px-1.5 py-0.5",
                    i === 2 ? "border-amber bg-amber-tint font-bold text-amber" : i === 0 && shift ? "border-cyan bg-cyan-tint font-bold text-cyan" : "border-line text-dim",
                  )}
                >
                  {hx(x)}
                </span>
              ))}
            </div>
            <p className="font-serif text-[0.9375rem] text-body">
              <span className="text-amber">Byte 2 = 0x{hx(usage)} = {usage}</span>: “key number {usage} in the standard
              list went down”. In that list, number 4 is simply the key in the place where US keyboards print A.
              {shift && <span className="text-cyan"> Byte 0 = 02: “the left Shift key is also down”.</span>} The
              keyboard sends exactly these bytes whatever is printed on the key.
            </p>
          </div>
        )}

        {stage === 1 && (
          <div className="space-y-3">
            <p className="font-serif text-[0.9375rem] text-body">
              The operating system looks up position 0x{hx(usage)} in a <b>keyboard layout table</b>: a file chosen in
              your settings. Here is the row for this key in three tables:
            </p>
            <DataTable
              highlight={(["us", "fr", "ru"] as LayoutId[]).indexOf(layout)}
              head={["layout table", "without Shift", "with Shift"]}
              rows={(["us", "fr", "ru"] as LayoutId[]).map((l) => {
                const a = charAt(l, r, c, false);
                const b = charAt(l, r, c, true);
                return [
                  LAYOUTS[l].name,
                  <span className={cx(l === layout && !shift && "underline decoration-2 underline-offset-4")}>
                    {a} = {a.codePointAt(0)}
                  </span>,
                  <span className={cx(l === layout && shift && "underline decoration-2 underline-offset-4")}>
                    {b} = {b.codePointAt(0)}
                  </span>,
                ];
              })}
            />
            <p className="font-serif text-[0.9375rem] text-body">
              Same position number, different tables, different characters. With the {LAYOUTS[layout].name} table
              {shift ? " and Shift held" : " and no Shift"}, position 0x{hx(usage)} becomes the character{" "}
              <b className="font-mono">“{ch}”</b> with Unicode number{" "}
              <b className="font-mono">
                {code} ({cpLabel(code)})
              </b>
              .
            </p>
          </div>
        )}

        {stage === 2 && (
          <div className="space-y-3">
            <p className="font-serif text-[0.9375rem] text-body">
              The app adds the character to your text. Inside the app, text is <b>only a list of numbers</b>:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[...before, code].map((n, i) => {
                const mine = i === before.length;
                const t = String.fromCodePoint(n);
                return (
                  <div
                    key={i}
                    className={cx(
                      "min-w-14 rounded-md border px-2 py-1 text-center",
                      mine ? "border-amber bg-amber-tint" : "border-line",
                    )}
                  >
                    <div className={cx("font-mono text-xs", mine ? "text-amber" : "text-dim")}>{t === " " ? "space" : `“${t}”`}</div>
                    <div className={cx("font-mono text-lg font-semibold tabular-nums", mine ? "text-amber" : "text-ink")}>{n}</div>
                  </div>
                );
              })}
            </div>
            <p className="font-serif text-[0.9375rem] text-body">
              Saved in a file or sent in a chat message, UTF-8 packs these numbers into bytes:{" "}
              <span className="font-mono text-sm">
                {beforeBytes.map(hx).join(" ")} <b className="text-amber">{utf8.map(hx).join(" ")}</b>
              </span>
              {utf8.length > 1 && <> (UTF-8 needs {utf8.length} bytes for {code}, because it is bigger than 127)</>}.
            </p>
            <p className="font-serif text-[0.9375rem] text-mute">
              Notice what is missing: nothing so far knows what “{ch}” <i>looks like</i>. A search, a spell-checker or
              a chat server works with the number {code} and never draws anything.
            </p>
          </div>
        )}

        {stage === 3 && (
          <div className="grid gap-4 @2xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-3">
              {font === "picture" ? (
                <p className="font-serif text-[0.9375rem] text-body">
                  The app asks the font for glyph number {code}. This made-up <b>picture font</b> stores a picture in
                  every row, so glyph {code} is a <b>{pictureFor(code).name}</b>. The real Wingdings font works like this:
                  it draws code 74 (“J”) as a smiley ☺.
                </p>
              ) : (
                <p className="font-serif text-[0.9375rem] text-body">
                  To draw, the app asks the <b>font</b>: another table. In this 8×8 font every glyph is 8 bytes, one per
                  row, stored in code order. So glyph {code} starts at
                  <span className="mx-1 inline-block">
                    <TeX>{`${code} \\times 8 = ${fmt(code * 8).replace(/,/g, "{,}")}`}</TeX>
                  </span>
                  bytes from the start of the table.
                  {missing && <> This font has no glyph for {code}, so it draws its “missing” box.</>}
                  {font === "bold" && <> The bold font file stores different bytes for the same code.</>}
                </p>
              )}
              <div className="font-mono text-sm">
                {rows.map((row, y) => (
                  <div key={y} className="flex items-center gap-3 leading-6">
                    <span className="w-24 text-right text-dim">
                      {font === "picture" ? `row ${y}` : `byte ${fmt(code * 8 + y)}`}
                    </span>
                    <span className="w-6 text-ink">{hx(row)}</span>
                    <ByteBits v={row} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="label-caps text-dim">1 = ink, 0 = paper</div>
              <GlyphGrid rows={rows} className="w-36 sm:w-44" />
              <div className="text-xs text-mute">
                {lit} of 64 pixels inked
              </div>
            </div>
          </div>
        )}

        {stage === 4 && (
          <div className="space-y-3">
            <p className="font-serif text-[0.9375rem] text-body">
              Now the app (with the graphics chip) copies the glyph into the <b>framebuffer</b>, the part of memory that
              holds one colour for every pixel on the screen. Below is the top-left corner of a 1920-pixel-wide screen.
              The new glyph goes at x = {X0}, y = {Y0}. Click any pixel.
            </p>
            <div className="scroll-thin overflow-x-auto">
              <div className="surface-screen w-max min-w-full rounded-md border border-bezel p-2">
                <FramebufferCrop px={fb.px} own={fb.own} pick={[px, py]} onPick={(x, y) => setPick([x, y])} />
              </div>
            </div>
            <div className="grid gap-3 @2xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="font-serif text-[0.9375rem] text-body">
                Pixel (x = {px}, y = {py}). Each pixel takes 4 bytes (red, green, blue, unused), stored row after row:
                <div className="mt-1.5 overflow-x-auto">
                  <TeX>{`\\text{address} = (y \\times 1920 + x) \\times 4 = (${py} \\times 1920 + ${px}) \\times 4 = ${fmt(addr).replace(/,/g, "{,}")}`}</TeX>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                {(pickLit ? [255, 255, 255, 0] : [0, 0, 0, 0]).map((x, i) => (
                  <div key={i} className="rounded-md border border-line-2 px-2 py-1 text-center">
                    <div className={["text-red", "text-on", "text-cyan", "text-dim"][i]}>{["R", "G", "B", "–"][i]}</div>
                    <div className="text-ink">{hx(x)}</div>
                  </div>
                ))}
              </div>
            </div>
            <pre className="scroll-thin overflow-x-auto rounded-md border border-line bg-panel px-3 py-2 font-mono text-[0.8125rem] leading-relaxed text-ink">
              {`for row in 0..7:     bits = glyph[row]        (e.g. row 0 = ${binStr(rows[0], 8)})
  for col in 0..7:   ink  = bit number (7 − col) of bits
    address = ((${Y0} + row) × 1920 + (${X0} + col)) × 4
    memory[address] = ink ? FF FF FF : 00 00 00`}
            </pre>
          </div>
        )}

        {stage === 5 && (
          <div className="space-y-3">
            <p className="font-serif text-[0.9375rem] text-body">
              60 times a second the <b>display controller</b> reads the framebuffer from the first byte to the last and
              sends every pixel's colour down the cable. Here is screen row {Y0}, the top row of your glyph, as it
              leaves:
            </p>
            <div className="scroll-thin overflow-x-auto">
              <div className="flex w-max gap-px" aria-label={`row ${Y0} of the screen`}>
                {fb.px[Y0].map((v, x) => (
                  <span
                    key={x}
                    className={cx(
                      "h-5 w-2.5 sm:w-3",
                      v ? "bg-screen-ink" : "bg-screen-2",
                      fb.own[Y0][x] && "outline outline-1 outline-amber",
                    )}
                  />
                ))}
                <span className="ml-2 self-center font-mono text-xs text-dim">… 1,872 more pixels in this row</span>
              </div>
            </div>
            <div className="font-mono text-xs break-words text-mute">
              {fb.px[Y0].slice(X0, X0 + 8).map((v, i) => (
                <span key={i} className={v ? "font-bold text-ink" : "text-dim"}>
                  {v ? "FFFFFF" : "000000"}{" "}
                </span>
              ))}
              <span className="text-dim">← the 8 colours of glyph row 0</span>
            </div>
            <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
              <Stat label="Pixels in your glyph" value="64" sub="8 × 8 colours" />
              <Stat label="White ones" value={lit} sub={`and ${64 - lit} black`} />
              <Stat label="Pixels per frame" value="2,073,600" sub="1920 × 1080" />
              <Stat label="Letters the monitor knows" value="0" tone="pink" sub="it only gets colours" />
            </div>
            <p className="font-serif text-[0.9375rem] text-body">
              The monitor gets colours and nothing else. No 0x{hx(usage)}, no {code}, no “{ch}”. It cannot tell your
              letter from a photo of a letter. How it turns those colours into light is the next chapter,{" "}
              <Link to="/input-output" className="text-cyan underline underline-offset-2">
                Input, Output &amp; the Monitor
              </Link>
              .
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Btn onClick={() => setStage((s) => Math.max(0, s - 1))} disabled={stage === 0}>
          ← Back
        </Btn>
        <div className="hidden min-w-0 flex-1 truncate text-center font-mono text-xs text-mute @2xl:block">
          0x{hx(usage)} → “{ch}” {code} → glyph {font === "picture" ? `#${code}` : `@ ${fmt(code * 8)}`} → {lit} white
          pixels → light
        </div>
        <Btn variant="primary" onClick={() => setStage((s) => Math.min(STAGES.length - 1, s + 1))} disabled={stage === STAGES.length - 1}>
          Next →
        </Btn>
      </div>
    </Widget>
  );
}

function FramebufferCrop({
  px,
  own,
  pick,
  onPick,
}: {
  px: number[][];
  own: boolean[][];
  pick: [number, number];
  onPick: (x: number, y: number) => void;
}) {
  const cell = 10;
  const ox = 22;
  const oy = 18;
  const W = ox + CROP_W * cell;
  const H = oy + CROP_H * cell;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full max-w-[600px] min-w-[460px]" role="img" aria-label="framebuffer pixels">
      {[0, 8, 16, 24, 32, 40].map((x) => (
        <text key={`x${x}`} x={ox + x * cell + 1} y={12} className="fill-screen-dim font-mono" fontSize={11}>
          {x}
        </text>
      ))}
      {[0, 8, 16].map((y) => (
        <text key={`y${y}`} x={0} y={oy + y * cell + 9} className="fill-screen-dim font-mono" fontSize={11}>
          {y}
        </text>
      ))}
      {px.map((row, y) =>
        row.map((v, x) => (
          <rect
            key={`${x}-${y}`}
            x={ox + x * cell + 0.5}
            y={oy + y * cell + 0.5}
            width={cell - 1}
            height={cell - 1}
            fill={v ? "var(--color-screen-ink)" : own[y][x] ? "var(--color-screen-dim)" : "var(--color-screen-2)"}
            className="cursor-pointer"
            onClick={() => onPick(x, y)}
          />
        )),
      )}
      <rect
        x={ox + X0 * cell - 1}
        y={oy + Y0 * cell - 1}
        width={8 * cell + 2}
        height={8 * cell + 2}
        fill="none"
        stroke="var(--color-amber)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <rect
        x={ox + pick[0] * cell - 1}
        y={oy + pick[1] * cell - 1}
        width={cell + 2}
        height={cell + 2}
        fill="none"
        stroke="var(--color-cyan)"
        strokeWidth={2.5}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 5. The whole chain, at a glance (static)                             */
/* ------------------------------------------------------------------ */

const CHAIN: Array<{ what: string; value: string; kind: "position" | "character" | "pixels" | "light" }> = [
  { what: "a switch closes", value: "row 2, key 1", kind: "position" },
  { what: "USB position code", value: "0x04", kind: "position" },
  { what: "layout table + Shift", value: "→ 65", kind: "character" },
  { what: "the text in the app", value: "65", kind: "character" },
  { what: "saved or sent", value: "byte 0x41", kind: "character" },
  { what: "font table, byte 520", value: "30 78 CC …", kind: "pixels" },
  { what: "framebuffer", value: "64 colours", kind: "pixels" },
  { what: "cable to the monitor", value: "colours only", kind: "pixels" },
  { what: "the glass", value: "light", kind: "light" },
];
const KIND_STYLE = {
  position: { label: "a position", cls: "border-amber text-amber", bg: "bg-amber-tint" },
  character: { label: "a character", cls: "border-cyan text-cyan", bg: "bg-cyan-tint" },
  pixels: { label: "only pixels", cls: "border-violet text-violet", bg: "bg-violet-tint" },
  light: { label: "light", cls: "border-line-2 text-ink", bg: "bg-panel-2" },
};

export function AChain() {
  return (
    <figure className="not-prose fig my-8">
      <div className="plate p-4">
        <ol className="flex flex-wrap items-stretch gap-x-1 gap-y-2">
          {CHAIN.map((s, i) => {
            const k = KIND_STYLE[s.kind];
            return (
              <li key={i} className="flex items-center gap-1">
                <div className={cx("min-w-[6.5rem] rounded-md border-l-[3px] px-2.5 py-1.5", k.cls, k.bg)}>
                  <div className="label-caps text-[0.6875rem]">{k.label}</div>
                  <div className="font-mono text-sm font-bold">{s.value}</div>
                  <div className="font-sans text-xs text-mute">{s.what}</div>
                </div>
                {i < CHAIN.length - 1 && (
                  <span className="text-dim" aria-hidden>
                    →
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <figcaption className="mt-2.5 font-serif text-[0.9375rem] text-mute italic">
        <span className="fig-num label-caps text-[0.6875rem] text-dim not-italic" />
        One ‘A’, nine steps. The same idea (“A”) is first a key position, then a character code, then only pixel
        colours. Each arrow is a lookup in a table that people wrote.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* "Hi!" three ways (static table with real colour and code)            */
/* ------------------------------------------------------------------ */

export function HiThreeWays() {
  const bytes = [0x48, 0x69, 0x21];
  return (
    <DataTable
      align="left"
      head={["reader", "what it sees in 48 69 21"]}
      rows={[
        ["text (ASCII)", <span className="font-bold">“Hi!”</span>],
        [
          "one RGB colour",
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-4 w-8 rounded-sm border border-line-2" style={{ background: "rgb(72 105 33)" }} />
            red 72, green 105, blue 33: a dark olive green
          </span>,
        ],
        ["SAP-8 program", bytes.map((b) => disassemble(b)).join(" · ")],
        ["three whole numbers", bytes.join(", ")],
      ]}
    />
  );
}

export { Pill };
