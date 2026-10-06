import { useState } from "react";
import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, cx, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import {
  AddInAlu,
  CharToNumber,
  GlyphFramebuffer,
  KeyMatrix,
  NumberToText,
  ScanOut,
  SoftwareStack,
  TimeBudget,
  UsbReport,
} from "~/widgets/calculator";

export const meta = () => chapterMeta("calculator");

function DigitPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 w-4 font-mono text-sm text-mute">{label}</span>
      {Array.from({ length: 10 }, (_, d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={cx(
            "h-8 w-8 rounded-lg border font-mono text-sm font-bold transition",
            d === value ? "border-amber bg-amber/20 text-amber" : "border-line-2 text-mute hover:text-ink",
          )}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

export default function Calculator() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);
  const sum = a + b;
  const text = `${a}+${b}=${sum}`;

  return (
    <>
      <p>
        You open the calculator app, type <code>{a}</code> <code>+</code> <code>{b}</code> <code>=</code>, and{" "}
        <code>{sum}</code> appears. It feels instant, and nothing about it seems mysterious. But that one moment uses{" "}
        <em>every</em> chapter so far. Let's follow it from your fingertip to the light leaving the screen.
      </p>

      <div className="not-prose sticky top-[4.6rem] z-30 my-6 rounded-2xl border border-amber/40 bg-panel/95 p-3 backdrop-blur">
        <div className="mb-2 text-xs font-semibold tracking-wider text-amber uppercase">
          Your calculation: {a} + {b} = {sum}
        </div>
        <div className="flex flex-col gap-1.5">
          <DigitPicker label="a" value={a} onChange={setA} />
          <DigitPicker label="b" value={b} onChange={setB} />
        </div>
      </div>

      <h2>1. Your finger closes a switch</h2>
      <p>
        Under each key are two thin metal contacts. Pressing the key touches them together, closing a circuit (exactly
        the switches from <Link to="/logic-gates">Logic Gates</Link>). A full keyboard has over 100 keys, but giving
        each one its own wire would be a mess, so the keys sit on a <strong>grid</strong> of row and column wires:
      </p>
      <KeyMatrix key={a} initial={String(a)} />
      <Callout kind="math" title="Why a grid?">
        <p>
          A grid of <TeX>{"r"}</TeX> rows and <TeX>{"c"}</TeX> columns handles <TeX>{"r \\times c"}</TeX> keys with only{" "}
          <TeX>{"r + c"}</TeX> wires. A 104-key keyboard fits in an 8 × 13 grid: 21 wires instead of 104. The keyboard's
          chip scans all rows about 1,000 times per second, so even a quick tap is caught.
        </p>
        <p>
          Metal contacts also <em>bounce</em> for a few milliseconds when they hit, quickly flickering between 0 and 1.
          The chip waits until the signal has been steady for ~5 ms before believing it (“debouncing”).
        </p>
      </Callout>

      <h2>2. The keyboard sends a code</h2>
      <p>
        The keyboard's chip is itself a tiny CPU running a small program. It turns the row and column it found into a
        standard code number (USB's code for the keypad <code>{a}</code>) and sends it to the computer as bits on the
        USB wires.
      </p>
      <UsbReport keyChar={String(a)} />

      <h2>3. Interrupt: the CPU drops everything</h2>
      <p>
        Your CPU is busy doing a hundred other things. It doesn't check the keyboard itself. A separate chip, the USB
        controller, asks the keyboard about 1,000 times per second, and when a new key arrives it raises an{" "}
        <strong>interrupt</strong>: a wire straight into the CPU's control unit. Between two
        instructions, the CPU notices, saves its work, and jumps to a small piece of the operating system.
      </p>
      <SoftwareStack />
      <p>
        The same chain runs for <code>+</code>, <code>{b}</code> and <code>=</code>. Four keypresses, four interrupts,
        four events in the calculator's queue.
      </p>

      <h2>4. From character to number</h2>
      <p>
        The calculator receives <em>characters</em>. As we saw in <Link to="/binary">Binary</Link>, the character “{a}”
        is stored as code {48 + a}, not as the number {a}. Before it can do maths, the app converts:
      </p>
      <CharToNumber a={a} b={b} />
      <GoDeeper title="What about multi-digit numbers like 427?">
        <p>As each digit key arrives, the app shifts the old value one decimal place left and adds the new digit:</p>
        <TeX block>{tex`\text{value} \leftarrow \text{value} \times 10 + (\text{code} - 48)`}</TeX>
        <p>
          Typing 4, 2, 7: <TeX>{"0 \\to 0\\times10+4 = 4 \\to 4\\times10+2 = 42 \\to 42\\times10+7 = 427"}</TeX>. It's
          place value, built up one digit at a time.
        </p>
      </GoDeeper>

      <h2>5. The addition</h2>
      <p>
        Finally, the moment the whole site has been building to. When you press <code>=</code>, the app runs{" "}
        <code>result = a + b</code>, which the compiler long ago turned into one ADD instruction. The CPU fetches it,
        decodes it, and the ALU's adder does exactly what you watched in <Link to="/adder">The Adder</Link>:
      </p>
      <AddInAlu a={a} b={b} />

      <h2>6. From number back to characters</h2>
      <NumberToText n={sum} />

      <h2>7. Drawing the digits</h2>
      <p>
        A character code still isn't something you can see. A <strong>font</strong> is a lookup table from character to
        shape. Here it's a 5 × 7 grid of pixels per character; real fonts store outlines (curves) that get filled in at
        any size. The app (with help from the graphics chip) writes the colour of every pixel of “{sum}” into the{" "}
        <strong>framebuffer</strong>, a region of memory where each pixel's colour is stored as numbers.
      </p>
      <GlyphFramebuffer key={text} text={text} highlightFrom={text.indexOf("=") + 1} />

      <h2>8. Memory becomes light</h2>
      <p>
        The screen doesn't know anything about calculators. The GPU's display controller reads the framebuffer 60 or more times
        per second and sends every pixel's red, green and blue numbers down the cable. The monitor just receives those
        colours and sets each pixel. Each pixel has three tiny parts (red, green, blue): little lights on an OLED
        screen, or coloured shutters over a white backlight on an LCD. We'll dig into that in <Link to="/graphics">Graphics</Link>.
      </p>
      <ScanOut text={text} />

      <h2>Where did the time go?</h2>
      <TimeBudget />
      <Callout kind="idea">
        <p>
          From your finger to the light took about <strong>18 milliseconds</strong>. The arithmetic itself took about{" "}
          <strong>0.3 nanoseconds</strong>, roughly <TeX>{"18\\text{ ms} / 0.3\\text{ ns} = 60{,}000{,}000"}</TeX> times
          less. Nearly all the time is spent on <em>physical</em> things: a key moving, waiting for the next USB poll,
          waiting for the next screen refresh. In that same 18 ms, the CPU could have done tens of millions of other
          additions, and it probably did, for other apps.
        </p>
      </Callout>

      <KeyIdeas
        items={[
          <>A keypress is a switch closing in a row/column grid, found by scanning.</>,
          <>The key travels as a code over USB, then an interrupt hands it to the OS and the app.</>,
          <>Characters ≠ numbers: the app converts with “− 48” on the way in and “+ 48” on the way out.</>,
          <>The maths is one ADD instruction: a fast adder (with carry-lookahead) finishes in a fraction of a nanosecond.</>,
          <>A font turns characters into pixels; the framebuffer holds them; the display turns numbers into light.</>,
        ]}
      />
    </>
  );
}
