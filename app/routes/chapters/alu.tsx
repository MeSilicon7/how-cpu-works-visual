import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas, Steps } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { AluWidget, MuxWidget, ShiftAddMultiply } from "~/widgets/alu";

export const meta = () => chapterMeta("alu");

export default function Alu() {
  return (
    <>
      <p>
        We can add and subtract. A CPU also needs to compare numbers, combine bits with AND/OR/XOR, shift them, and
        more. The part of the CPU that does all of this is the <strong>ALU</strong>, the{" "}
        <strong>Arithmetic Logic Unit</strong>. Think of it as the calculator inside the processor.
      </p>
      <p>
        Here's the surprising design: the ALU doesn't “decide” which operation to do and then do it. It does{" "}
        <em>all of them at once</em>, every time, and then picks one answer. To pick, we need one more building block.
      </p>

      <h2>The multiplexer: choosing with gates</h2>
      <p>
        A <strong>multiplexer</strong> (“mux”) has several data inputs, some <em>select</em> bits, and one output. The
        select bits decide which input gets copied to the output. Here's the smallest one, built from the gates you
        already know:
      </p>
      <MuxWidget />
      <p>
        With 1 select bit we choose between 2 inputs. With 3 select bits we can choose between <TeX>{"2^3 = 8"}</TeX>{" "}
        inputs, which is enough for 8 operations. Those 3 bits are called the <strong>operation code</strong> or{" "}
        <strong>opcode</strong>. Hold on to that word: in a few chapters, the opcode will come straight out of your
        program's machine code.
      </p>

      <h2>Build an ALU</h2>
      <p>
        Wire up an adder, a subtractor, 8 AND gates, 8 OR gates, 8 XOR gates, 8 NOT gates and some shifting wires, all
        fed by the same inputs A and B. Then put a multiplexer on the outputs:
      </p>
      <AluWidget />
      <Callout kind="idea">
        <p>
          <strong>Bitwise operations</strong> like AND, OR and XOR just use 8 copies of the gate, one per bit position,
          side by side. <strong>Shifting</strong> uses no gates at all: it's only wires, connecting bit 0 to bit 1, bit
          1 to bit 2, and so on. Moving every digit one place left multiplies by the base. In decimal that's ×10; in
          binary it's ×2.
        </p>
        <TeX block>{tex`13 = 00001101_2 \xrightarrow{\;\ll 1\;} 00011010_2 = 26 = 13 \times 2`}</TeX>
      </Callout>

      <h2>Flags: little notes about the result</h2>
      <p>
        Next to the result, the ALU sets a few single-bit <strong>flags</strong>. They look minor, but they're how a
        computer makes decisions:
      </p>
      <ul>
        <li>
          <strong>Z (zero)</strong> is 1 if the result is 0. It's a NOR of all 8 result bits:{" "}
          <TeX>{"Z = \\overline{r_7 + r_6 + \\cdots + r_0}"}</TeX>.
        </li>
        <li>
          <strong>C (carry)</strong> is the adder's last carry-out. After an add it means “the answer didn't fit in
          8 bits”; after a subtract our CPU uses it to mean “had to borrow” (the answer went below 0).
        </li>
        <li>
          <strong>N (negative)</strong> is a copy of the top bit, which is the sign in two's complement.
        </li>
        <li>
          <strong>V (overflow)</strong> is 1 if a signed answer went out of the −128 to 127 range.
        </li>
      </ul>
      <Callout kind="math" title="How a computer asks “are these equal?”">
        <p>It subtracts them and checks the zero flag:</p>
        <TeX block>{tex`A = B \iff A - B = 0 \iff Z = 1`}</TeX>
        <p>
          And “is A smaller than B?” is “did <TeX>{"A - B"}</TeX> need to borrow?” (the carry flag). Every{" "}
          <code>if</code> statement you'll ever write ends up as an ALU subtraction plus a peek at a flag. You'll see
          this in action in the <Link to="/cpu">CPU chapter</Link>.
        </p>
      </Callout>

      <h2>Multiplication: shift and add</h2>
      <p>
        Remember long multiplication from school? For <TeX>{"23 \\times 45"}</TeX> you multiply 23 by each digit of 45,
        shift each result left by its place, then add them up. In binary it's even easier, because each digit is 0 or 1:
        multiplying by 1 means “copy A”, and multiplying by 0 means “nothing”. So multiplication is just shifts and
        additions, which the ALU already knows how to do.
      </p>
      <ShiftAddMultiply />
      <TeX block>{tex`13 \times 11 = 13 \times (1 + 2 + 8) = 13 + 26 + 104 = 143`}</TeX>
      <p>
        Early computers did multiplication exactly like this, one step per bit. Modern CPUs have dedicated multiplier
        circuits that add all the shifted copies at once in a tree of adders. A 64-bit multiply takes about 3 clock
        ticks.
      </p>

      <GoDeeper title="Division: repeated subtraction (long division)">
        <p>
          Division is long division in binary. At each step, ask: “does the divisor fit?” (subtract and check the borrow
          flag). If yes, write a 1 in the quotient and keep the difference. If no, write 0. Then shift and repeat.
        </p>
        <TeX
          block
        >{tex`143 \div 11:\quad 143 - 11\times 2^3 = 55 \;(\text{fits} \to 1),\; 55 - 11\times2^2 = 11 \;(1),\; 11 - 22 < 0 \;(0),\; 11 - 11 = 0 \;(1)`}</TeX>
        <p>
          Quotient bits <code>1101</code> = 13, remainder 0. Division is slow even in modern chips, around 10–40 ticks,
          so programmers and compilers avoid it when they can. Dividing by a power of 2 is just a shift right!
        </p>
      </GoDeeper>

      <GoDeeper title="Numbers bigger than the register: add with carry">
        <p>
          Our ALU works on 8 bits, so one register holds only 0 to 255. How can an 8-bit computer work out 200 + 100 =
          300? The same way you add long numbers at school: one column at a time, carrying into the next column. The
          only difference is that each “column” is a whole byte.
        </p>
        <p>
          Store each number in two bytes, a <strong>high byte</strong> and a <strong>low byte</strong>, so that the value
          is high × 256 + low. For example, 300 = 1 × 256 + 44, which we write as [1, 44].
        </p>
        <Callout kind="math" title="200 + 100 with 8-bit pieces">
          <Steps>
            {[
              <>
                Add the low bytes first: <TeX>{"200 + 100 = 300"}</TeX>. That doesn't fit in 8 bits.{" "}
                <TeX>{"300 = 256 + 44"}</TeX>, so the result byte is <strong>44</strong> and the carry flag C becomes{" "}
                <strong>1</strong>.
              </>,
              <>
                Add the high bytes, plus the carry: <TeX>{"0 + 0 + 1 = 1"}</TeX>.
              </>,
              <>
                The answer is [1, 44] = <TeX>{"1 \\times 256 + 44 = 300"}</TeX>. ✓
              </>,
            ]}
          </Steps>
        </Callout>
        <p>
          Real CPUs have an instruction for step 2 called <strong>ADC</strong>, “add with carry”. It adds two bytes{" "}
          <em>and</em> the carry flag left over from the previous addition. One ADD followed by as many ADCs as you like
          can add numbers of any size. Old 8-bit chips like the 6502 (inside the Apple II and the NES game console)
          worked exactly like this. Here is how far each register size reaches on its own:
        </p>
        <DataTable
          head={["bits", "biggest whole number", "roughly"]}
          rows={[
            ["8", "255", ""],
            ["16", "65,535", ""],
            ["32", "4,294,967,295", "4.29 billion"],
            ["64", "18,446,744,073,709,551,615", <TeX>{"1.8 \\times 10^{19}"}</TeX>],
          ]}
        />
        <p>
          A 64-bit CPU adds 64-bit numbers in one step, so it needs ADC much less often. But some jobs use far bigger
          numbers. The encryption behind the padlock in your browser can use keys of 2,048 bits, which is{" "}
          <TeX>{"2048 \\div 64 = 32"}</TeX> words of 64 bits. Multiplying two such numbers the school way multiplies
          every word of one by every word of the other: <TeX>{"32 \\times 32 = 1{,}024"}</TeX> word multiplications,
          plus all the additions with carry. That is why encryption is real work, even for a fast chip.
        </p>
      </GoDeeper>

      <GoDeeper title="Where do cos, sin and √ come from?">
        <p>
          The ALU can add, subtract, shift, multiply and divide. There is no “cosine circuit” inside it. Yet a calculator
          shows cos 0.5 straight away. The trick is to write the hard function as a recipe that uses only the easy
          operations.
        </p>
        <p>
          <strong>Cosine as a long sum.</strong> Mathematicians found that (with the angle <TeX>{"x"}</TeX> measured in
          radians, where 0.5 radians ≈ 28.6°)
        </p>
        <TeX block>{tex`\cos x = 1 - \frac{x^2}{2} + \frac{x^4}{24} - \frac{x^6}{720} + \cdots`}</TeX>
        <p>
          The numbers underneath follow a pattern: <TeX>{"2 = 1 \\times 2"}</TeX>,{" "}
          <TeX>{"24 = 1 \\times 2 \\times 3 \\times 4"}</TeX> and <TeX>{"720 = 1 \\times 2 \\times \\cdots \\times 6"}</TeX>.
          Each new term is much smaller than the one before, so a few terms are enough.
        </p>
        <Callout kind="math" title="cos 0.5 with four terms">
          <TeX block>{tex`\begin{aligned} \cos 0.5 &\approx 1 - 0.125 + 0.0026042 \\ &\phantom{\approx 1} - 0.0000217 \\ &= 0.8775825 \end{aligned}`}</TeX>
          <p>
            The true value is 0.8775826. Four terms already give 6 correct decimal places, and each term needs only a
            few multiplications and one division. Sine works the same way:{" "}
            <TeX>{"\\sin x = x - x^3/6 + x^5/120 - \\cdots"}</TeX>
          </p>
        </Callout>
        <p>
          <strong>Square roots by guessing better.</strong> To find <TeX>{"\\sqrt{2}"}</TeX>, start with any guess{" "}
          <TeX>{"g"}</TeX>. If <TeX>{"g"}</TeX> is too big, then <TeX>{"2/g"}</TeX> is too small, so their average is a
          better guess. This is <strong>Newton's method</strong>:
        </p>
        <TeX block>{tex`g_{\text{new}} = \frac{g + 2/g}{2}`}</TeX>
        <p>Starting from the guess 1, the first four rounds give:</p>
        <TeX block>{tex`\begin{aligned} &1 \to 1.5 \to 1.41667 \\ &\to 1.4142157 \to 1.4142136 \end{aligned}`}</TeX>
        <p>
          The true value is 1.4142136, so four rounds are enough. The number of correct digits roughly doubles every
          round. Modern processors have a square-root instruction that runs steps like these in hardware.
        </p>
        <p>
          <strong>Two more tricks</strong> that real chips and programs use:
        </p>
        <ul>
          <li>
            <strong>Lookup tables.</strong> If a program needs the same few values again and again, it computes them once
            and keeps them in memory. The DCT used to compress video (see{" "}
            <Link to="/video">Watching a Video</Link>) needs only 64 cosine values, so it simply reads them from a table.
          </li>
          <li>
            <strong>CORDIC.</strong> To turn an arrow to any angle, turn it by smaller and smaller fixed steps: 45°, then
            26.6°, 14.0°, 7.1°, and so on, each time to the left or to the right. These angles are chosen so that every
            step needs only shifts and additions, with no multiplier at all. Each step adds about one correct bit, which
            is why simple chips and many pocket calculators use it.
          </li>
        </ul>
        <p>
          For sine and cosine, programs on a PC usually call a math library. It first shrinks the angle into a small
          range, then works out a short sum like the one above, with carefully tuned numbers. You'll see these functions
          at work when <Link to="/graphics">Graphics</Link> rotates a shape.
        </p>
      </GoDeeper>

      <GoDeeper title="What's in a real ALU?">
        <ul>
          <li>
            <strong>64-bit</strong> integer units, several per core, so multiple additions can happen per tick.
          </li>
          <li>
            A separate <strong>floating-point unit (FPU)</strong> for numbers like 3.14, using the format from the
            binary chapter.
          </li>
          <li>
            <strong>Vector (SIMD)</strong> units that do the same operation on 8 or 16 numbers at once. Great for
            images, audio and AI.
          </li>
        </ul>
        <p>
          But underneath, it's the same story: adders, bitwise gates, shifters, and multiplexers choosing between them
          based on an opcode.
        </p>
      </GoDeeper>

      <KeyIdeas
        items={[
          <>The ALU computes every operation in parallel, then a multiplexer picks one.</>,
          <>
            The <strong>opcode</strong> bits are the multiplexer's select lines: 3 bits → 8 operations.
          </>,
          <>Bitwise ops are rows of gates; shifts are just wiring (×2 or ÷2).</>,
          <>Flags (Zero, Carry, Negative, Overflow) let a computer compare numbers and make decisions.</>,
          <>Multiplication = shifts + additions. Division = shifts + subtractions.</>,
        ]}
      />
    </>
  );
}
