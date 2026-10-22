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
        is <strong>ASCII</strong> (first version 1963; lowercase letters were added in 1967): <code>A</code> = 65, <code>B</code> = 66, … <code>a</code> = 97,{" "}
        <code>0</code> (the digit character) = 48, space = 32. Today we use <strong>Unicode</strong>, which extends the
        list to over 150,000 characters: every language, plus emoji. <strong>UTF-8</strong> is the rule for packing
        those numbers into bytes: English letters, digits and punctuation (the old ASCII ones) take 1 byte; letters like é or
        Ж take 2; most Asian scripts such as हिन्दी or 中文 take 3; emoji take 4.
      </p>
      <TextToBytes />
      <Callout kind="math" title="A neat pattern">
        <p>
          <code>A</code> = 65 = <code>0100 0001</code> and <code>a</code> = 97 = <code>0110 0001</code>. They differ by{" "}
          <TeX>{"97 - 65 = 32 = 2^5"}</TeX>, exactly one bit: the only difference is the 32s place, called <em>bit 5</em> because we count positions from 0
          on the right. Converting between upper and lower case is just flipping that one bit!
        </p>
        <p>
          And the <em>character</em> <code>7</code> is code 55, not the number 7. To get the number, a program subtracts
          48: <TeX>{"55 - 48 = 7"}</TeX>. We'll see this happen in the <Link to="/calculator">2 + 3 scene</Link>.
        </p>
      </Callout>

      <Callout kind="idea" title="But how does the computer know 01000001 is ‘A’?">
        <p>
          <strong>Short answer: it doesn't.</strong> A byte in memory is just 8 tiny switches, on or off. There is no
          label next to it that says “this is a letter”. The same <code>0100 0001</code> can be the number 65, the
          letter A, the brightness of one colour in a photo, or an instruction for the processor.
        </p>
        <p>
          <strong>The code that reads the byte decides.</strong> A text editor has been written to treat each byte as a
          character code, so it looks up 65 in its font and draws an A. A calculator program reading the very same byte
          would use it as the number 65. The meaning is in the program, not in the bits. The full story, from your
          finger on the key to the A on the screen, is in <Link to="/bits-meaning">Who Decides What Bits Mean?</Link>
        </p>
      </Callout>
      <GoDeeper title="UTF-8: how a byte says “I'm part of a bigger character”">
        <p>
          A program reading UTF-8 text sees one long row of bytes. Some characters use 1 byte and some use 4. So how
          does it know where one character ends and the next begins? The <strong>first few bits of every byte</strong>{" "}
          tell it:
        </p>
        <DataTable
          align="left"
          head={["byte looks like", "it means", "bits for the code", "largest code"]}
          rows={[
            [<code>0xxxxxxx</code>, "a whole character (old ASCII)", "7", "127"],
            [<code>110xxxxx</code>, "start of a 2-byte character", <span className="whitespace-nowrap">5 + 6 = 11</span>, "2,047"],
            [<code>1110xxxx</code>, "start of a 3-byte character", <span className="whitespace-nowrap">4 + 6 + 6 = 16</span>, "65,535"],
            [<code>11110xxx</code>, "start of a 4-byte character", <span className="whitespace-nowrap">3 + 6 + 6 + 6 = 21</span>, "2,097,151"],
            [<code>10xxxxxx</code>, "continuation: “I am the next part of this character”", "6 each", "—"],
          ]}
        />
        <p>
          The <code>x</code> places carry the character's number. (Unicode stops at 1,114,111, so 21 bits are more than
          enough.) The number of 1s at the front of a start byte is the number of bytes in the character.
        </p>
        <Callout kind="math" title="Worked example: é">
          <p>
            The letter <code>é</code> has Unicode number 233.
          </p>
          <ol>
            <li>233 is bigger than 127, so 1 byte is not enough. It is smaller than 2,047, so 2 bytes are enough.</li>
            <li>
              Write 233 with 11 bits: <code className="whitespace-nowrap">00011 101001</code>.
            </li>
            <li>
              Put the first 5 bits after <code>110</code>: <code className="whitespace-nowrap">110 00011</code> = <code>C3</code> in hex.
            </li>
            <li>
              Put the last 6 bits after <code>10</code>: <code className="whitespace-nowrap">10 101001</code> = <code>A9</code> in hex.
            </li>
          </ol>
          <p>
            So é is stored as the two bytes <code>C3 A9</code>. Type é into the box above to check. Reading works
            backwards: the reader sees <code>110</code>, so it knows to take 2 bytes. It removes the marker bits, joins{" "}
            <code>00011</code> and <code>101001</code>, and gets 233 again.
          </p>
        </Callout>
        <p>This design has two nice side effects:</p>
        <ul>
          <li>
            Plain English text uses only <code>0xxxxxxx</code> bytes, so every old ASCII file is already valid UTF-8.
          </li>
          <li>
            If a program jumps into the middle of a text, it can find the start of the next character by skipping any
            bytes that begin with <code>10</code>.
          </li>
        </ul>
        <p>
          But a program that reads <code>C3 A9</code> with an old one-byte table shows two characters, “Ã©”, instead of
          é. That kind of garbled text has a name, <em>mojibake</em>, and it happens because the reader used the wrong
          rule. See <Link to="/bits-meaning">Who Decides What Bits Mean?</Link>
        </p>
      </GoDeeper>
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
              1,000 bytes <span className="whitespace-nowrap">(a kibibyte, KiB, is 1,024 = 2¹⁰)</span>
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
          <code>0.000110011001100…</code>), so it gets rounded. Add two rounded numbers and the tiny errors show up. Most languages use 64-bit floats
          by default (52 fraction bits, exponent − 1023), and with those <code>0.1 + 0.2</code> gives <code>0.30000000000000004</code>. Not a bug, just
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
            The bits carry no label: the program that reads them decides what they mean.
          </>,
          <>Negative numbers use two's complement, so subtraction is just addition.</>,
        ]}
      />
    </>
  );
}
