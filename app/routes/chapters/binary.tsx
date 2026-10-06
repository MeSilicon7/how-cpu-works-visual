import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import {
  ByteBuilder,
  CombosWidget,
  DecToBin,
  FloatWidget,
  NegateWidget,
  TextToBytes,
  TwosComplementWheel,
} from "~/widgets/binary";

export const meta = () => chapterMeta("binary");

export default function Binary() {
  return (
    <>
      <p>
        A transistor gives us one switch with two states: off and on, <code>0</code> and <code>1</code>. One switch on
        its own can only answer yes/no questions. To store a number like 77, a letter, or the colour of a pixel, we need
        to <strong>group switches together</strong> and agree on what each pattern means.
      </p>

      <h2>More switches, more patterns</h2>
      <p>
        One bit (<strong>b</strong>inary dig<strong>it</strong>) has 2 patterns. Two bits have 4: <code>00</code>,{" "}
        <code>01</code>, <code>10</code>, <code>11</code>. Every extra bit doubles the count.
      </p>
      <CombosWidget />
      <TeX block>{tex`\text{patterns with } n \text{ bits} = 2^n`}</TeX>
      <p>
        This one formula explains a lot of numbers you've seen. A group of <strong>8 bits</strong> is called a{" "}
        <strong>byte</strong>, and it has <TeX>{"2^8 = 256"}</TeX> patterns. That's why old games had 256 colours and
        why a byte holds the numbers 0 to 255.
      </p>

      <h2>Place value: you already know how this works</h2>
      <p>In normal decimal (base 10), each position is worth 10× the one to its right. The number 472 really means:</p>
      <TeX block>{tex`472 = 4\times100 + 7\times10 + 2\times1 = 4\times10^2 + 7\times10^1 + 2\times10^0`}</TeX>
      <p>
        Binary is the same idea, but each position is worth <strong>2×</strong> the one to its right, and the only
        digits are 0 and 1. So the places are 1, 2, 4, 8, 16, 32, 64, 128…
      </p>
      <TeX block>{tex`1001101_2 = 1\cdot64 + 0\cdot32 + 0\cdot16 + 1\cdot8 + 1\cdot4 + 0\cdot2 + 1\cdot1 = 77`}</TeX>
      <ByteBuilder />
      <Callout kind="idea">
        <p>
          A number doesn't “live” in decimal or binary. 77 is just an amount. Decimal and binary are two ways of{" "}
          <em>writing</em> it down. Humans like base 10 because we have ten fingers; chips like base 2 because they have
          switches.
        </p>
      </Callout>

      <h2>Going the other way: decimal → binary</h2>
      <p>
        To turn a decimal number into binary, divide by 2 over and over. Each division tells you whether the number is
        odd (remainder 1) or even (remainder 0), and that's exactly the bit in the 1s place. Then you “shift” to the
        next place by keeping the half and repeating.
      </p>
      <DecToBin />

      <h2>Hexadecimal: binary's shorthand</h2>
      <p>
        Long rows of 0s and 1s are hard for humans to read. Since <TeX>{"2^4 = 16"}</TeX>, every group of 4 bits has
        exactly 16 patterns, and we can give each one a single symbol: 0–9, then A–F for 10–15. That's{" "}
        <strong>hexadecimal</strong> (base 16). One byte = two hex digits.
      </p>
      <DataTable
        head={["binary", "hex", "decimal", "", "binary", "hex", "decimal"]}
        rows={Array.from({ length: 8 }, (_, i) => [
          i.toString(2).padStart(4, "0"),
          i.toString(16).toUpperCase(),
          i,
          "",
          (i + 8).toString(2).padStart(4, "0"),
          (i + 8).toString(16).toUpperCase(),
          i + 8,
        ])}
      />
      <p>
        You'll see hex everywhere: colours on web pages (<code>#FF8800</code> = red 255, green 136, blue 0), memory
        addresses, and error codes. Programmers write it with a <code>0x</code> in front, like <code>0x4D</code> = 77.
      </p>

      <h2>Text is numbers too</h2>
      <p>
        Computers can't store a letter directly. Everyone just agrees on a numbered list of characters. The classic list
        is <strong>ASCII</strong> (1963): <code>A</code> = 65, <code>B</code> = 66, … <code>a</code> = 97,{" "}
        <code>0</code> (the digit character) = 48, space = 32. Today we use <strong>Unicode</strong>, which extends the
        list to over 150,000 characters: every language, plus emoji. <strong>UTF-8</strong> is the rule for packing
        those numbers into bytes: common letters take 1 byte, emoji take 4.
      </p>
      <TextToBytes />
      <Callout kind="math" title="A neat pattern">
        <p>
          <code>A</code> = 65 = <code>0100 0001</code> and <code>a</code> = 97 = <code>0110 0001</code>. They differ by{" "}
          <TeX>{"97 - 65 = 32 = 2^5"}</TeX>, exactly one bit. Converting between upper and lower case is just flipping
          bit 5!
        </p>
        <p>
          And the <em>character</em> <code>7</code> is code 55, not the number 7. To get the number, a program subtracts
          48: <TeX>{"55 - 48 = 7"}</TeX>. We'll see this happen in the <Link to="/calculator">2 + 3 scene</Link>.
        </p>
      </Callout>

      <h2>Bigger units</h2>
      <p>Since everything is powers of 2, memory sizes come in powers of 2 as well:</p>
      <DataTable
        align="left"
        head={["unit", "size", "what fits"]}
        rows={[
          ["1 bit", "0 or 1", "a yes/no answer"],
          ["1 byte", "8 bits", "one letter, or a number 0–255"],
          [
            <>1 kilobyte (KB)</>,
            <>
              ≈ 1,000 bytes <span className="whitespace-nowrap">(really 1,024 = 2¹⁰)</span>
            </>,
            "a short email",
          ],
          [<>1 megabyte (MB)</>, <>≈ 1 million bytes</>, "a photo (compressed), a minute of music"],
          [<>1 gigabyte (GB)</>, <>≈ 1 billion bytes</>, "an hour of HD video (compressed)"],
          [<>1 terabyte (TB)</>, <>≈ 1 trillion bytes</>, "hundreds of thousands of photos"],
        ]}
      />
      <Callout kind="math" title="Why 32-bit computers maxed out at 4 GB of RAM">
        <p>Each byte of memory has a numbered address. With 32-bit addresses there are</p>
        <TeX block>{tex`2^{32} = 4{,}294{,}967{,}296 \text{ addresses} \approx 4 \text{ GB}`}</TeX>
        <p>
          With 64-bit addresses: <TeX>{"2^{64} \\approx 1.8 \\times 10^{19}"}</TeX> bytes. That's 18 billion gigabytes,
          enough for a long time.
        </p>
      </Callout>

      <GoDeeper title="Negative numbers: two's complement">
        <p>
          How do you store −5 with only 0s and 1s? The trick computers use is called <strong>two's complement</strong>:
          make the top bit worth a <em>negative</em> amount. In 8 bits, the places become −128, 64, 32, 16, 8, 4, 2, 1.
          So <code>1111 1011</code> means
        </p>
        <TeX block>{tex`-128 + 64 + 32 + 16 + 8 + 0 + 2 + 1 = -5`}</TeX>
        <TwosComplementWheel />
        <p>
          To negate any number: flip every bit, then add 1. Why does that work? Flipping gives{" "}
          <TeX>{"x + \\bar{x} = 1111\\,1111 = 255"}</TeX>, so <TeX>{"\\bar{x} + 1 = 256 - x"}</TeX>. And 256 is exactly
          the amount that “falls off” an 8-bit register, so <TeX>{"256 - x"}</TeX> behaves just like <TeX>{"-x"}</TeX>.
        </p>
        <NegateWidget />
        <p>
          The beautiful part is that subtraction comes for free. <TeX>{"a - b = a + (-b)"}</TeX>, so the same adder
          circuit (next chapters) can do both.
        </p>
      </GoDeeper>

      <GoDeeper title="Fractions: floating point, and why 0.1 + 0.2 ≠ 0.3">
        <p>
          For numbers like 3.75 or 0.000001, computers use <strong>floating point</strong>, which is scientific notation
          in base 2. Just like <TeX>{"6.02 \\times 10^{23}"}</TeX>, a float stores a fraction and a power:
        </p>
        <TeX
          block
        >{tex`\text{value} = (-1)^{\text{sign}} \times \left(1 + \frac{\text{fraction}}{2^{23}}\right) \times 2^{\,\text{exponent} - 127}`}</TeX>
        <FloatWidget />
        <p>
          Since <TeX>{"0.1 = \\tfrac{1}{10}"}</TeX> and 10 isn't a power of 2, 0.1 in binary repeats forever (
          <code>0.000110011001100…</code>), so it gets rounded. Add two rounded numbers and the tiny errors show up. In
          most programming languages, <code>0.1 + 0.2</code> gives <code>0.30000000000000004</code>. Not a bug, just
          binary.
        </p>
      </GoDeeper>

      <KeyIdeas
        items={[
          <>
            <TeX>{"n"}</TeX> bits make <TeX>{"2^n"}</TeX> patterns. A byte (8 bits) makes 256.
          </>,
          <>Binary is place value with powers of 2: 1, 2, 4, 8, 16, 32, 64, 128…</>,
          <>Hex is shorthand: every 4 bits → one digit 0–F.</>,
          <>
            Text, colours, sound and video are <strong>all just numbers</strong> by agreement (ASCII, Unicode, RGB…).
          </>,
          <>Negative numbers use two's complement, so subtraction is just addition.</>,
        ]}
      />
    </>
  );
}
