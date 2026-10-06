import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, GoDeeper, KeyIdeas } from "~/components/ui";
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
          <strong>C (carry)</strong> is 1 if the answer didn't fit (the adder's last carry-out).
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
