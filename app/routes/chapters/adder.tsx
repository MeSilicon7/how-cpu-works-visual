import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { FullAdder, HalfAdder, LongAddition, RippleAdder, SubtractWidget } from "~/widgets/adder";

export const meta = () => chapterMeta("adder");

export default function Adder() {
  return (
    <>
      <p>
        We have switches (transistors), a way to write numbers with them (binary), and circuits that make decisions
        (gates). Now for the moment where it all clicks: we'll build a circuit that <strong>adds two numbers</strong>.
        No software, no magic. Just gates doing exactly what their truth tables say.
      </p>

      <h2>Step 1: how do we add binary by hand?</h2>
      <p>
        Binary addition works exactly like the column addition you learned in school, only simpler because there are
        just four facts to memorise:
      </p>
      <TeX
        block
      >{tex`0+0 = 0 \qquad 0+1 = 1 \qquad 1+0 = 1 \qquad 1+1 = 10_2 \;(\text{write } 0,\ \text{carry } 1)`}</TeX>
      <p>
        And when a carry comes in from the column to the right, we also need <TeX>{"1 + 1 + 1 = 3 = 11_2"}</TeX> (write
        1, carry 1). Step through an example:
      </p>
      <LongAddition />

      <h2>Step 2: one column = one small circuit</h2>
      <p>
        Look at just the rightmost column. It takes two bits, <TeX>{"A"}</TeX> and <TeX>{"B"}</TeX>, and produces two
        bits: a <strong>sum</strong> bit to write down and a <strong>carry</strong> bit to pass left. Write the truth
        table and compare it with the gates from the previous chapter:
      </p>
      <HalfAdder />
      <Callout kind="idea">
        <p>
          The sum column (<code>0, 1, 1, 0</code>) is exactly <strong>XOR</strong>. The carry column (
          <code>0, 0, 0, 1</code>) is exactly <strong>AND</strong>. So addition of two bits is <em>literally</em> two
          logic gates:
        </p>
        <TeX block>{tex`\text{Sum} = A \oplus B \qquad\qquad \text{Carry} = A \cdot B`}</TeX>
        <p>
          This circuit is called a <strong>half adder</strong>. “Half” because it can't accept a carry coming in from
          the right.
        </p>
      </Callout>

      <h2>Step 3: the full adder</h2>
      <p>
        Every column except the first has <em>three</em> bits to add: A, B, and the carry from the right. The trick: add
        A and B with one half adder, then add the carry-in to that result with a second half adder. If either step
        produced a carry, the column carries out, so an OR gate combines them.
      </p>
      <FullAdder />
      <Callout kind="math" title="Check it with algebra">
        <p>Try A = 1, B = 1, Carry-in = 1 (that's 1 + 1 + 1 = 3 = 11₂):</p>
        <TeX block>{tex`\text{Sum} = 1 \oplus 1 \oplus 1 = 0 \oplus 1 = 1`}</TeX>
        <TeX block>{tex`\text{Carry} = (1\cdot1) + 1\cdot(1 \oplus 1) = 1 + 1\cdot 0 = 1`}</TeX>
        <p>
          Carry 1, Sum 1 → <code>11</code> = 3. ✓ The circuit has been doing arithmetic all along, using nothing but
          AND, OR and XOR.
        </p>
      </Callout>

      <h2>Step 4: chain them to add big numbers</h2>
      <p>
        To add 4-bit numbers, put four full adders side by side: one per column. Each adder's carry-out wire connects to
        the carry-in of the adder on its left, just like the carries you wrote in step 1. Change the inputs and watch
        the carry ripple:
      </p>
      <RippleAdder />
      <p>
        A 64-bit CPU does exactly this with 64 full adders (well, a faster variant, see below). When your spreadsheet
        adds two numbers, this is the physical event: voltages ripple through a row of XOR, AND and OR gates, and the
        sum appears on the output wires.
      </p>
      <Callout kind="fact">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            A full adder takes about <strong>28 transistors</strong> in standard CMOS.
          </li>
          <li>
            A 64-bit adder: <TeX>{"64 \\times 28 \\approx 1{,}800"}</TeX> transistors. That's less than one
            ten-millionth of a modern chip.
          </li>
          <li>
            A modern CPU core can do several 64-bit additions <strong>every clock tick</strong>, billions of times per
            second.
          </li>
        </ul>
      </Callout>

      <h2>Subtraction for free</h2>
      <p>
        Remember two's complement from the <Link to="/binary">binary chapter</Link>? To make −B you flip all its bits
        and add 1. So:
      </p>
      <TeX block>{tex`A - B = A + (-B) = A + \overline{B} + 1`}</TeX>
      <p>
        Flipping bits is just a NOT (or an XOR with 1) on each B wire, and the “+1” goes in through the first adder's
        carry-in, which is otherwise unused. One extra gate per bit turns our adder into an adder/subtractor.
      </p>
      <SubtractWidget />

      <GoDeeper title="Why the ripple is too slow, and the carry-lookahead fix">
        <p>
          Each full adder needs about 2 gate delays before its carry-out is ready, and every adder must wait for the one
          to its right. For a 64-bit ripple adder:
        </p>
        <TeX block>{tex`64 \text{ bits} \times 2 \text{ gate delays} \times 10\text{ ps} \approx 1.3\text{ ns}`}</TeX>
        <p>
          But a 4 GHz CPU ticks every <TeX>{"1/(4\\times10^9) = 0.25\\text{ ns}"}</TeX>. The ripple adder is 5× too
          slow! The fix is to <em>predict</em> carries instead of waiting for them. For each column define:
        </p>
        <ul>
          <li>
            <strong>Generate</strong> <TeX>{"g_i = A_i \\cdot B_i"}</TeX>: this column makes a carry on its own.
          </li>
          <li>
            <strong>Propagate</strong> <TeX>{"p_i = A_i \\oplus B_i"}</TeX>: this column passes an incoming carry
            through.
          </li>
        </ul>
        <p>Then each carry can be written directly from the inputs, without waiting:</p>
        <TeX
          block
        >{tex`c_1 = g_0 + p_0 c_0 \qquad c_2 = g_1 + p_1 g_0 + p_1 p_0 c_0 \qquad c_3 = g_2 + p_2 g_1 + p_2 p_1 g_0 + p_2 p_1 p_0 c_0`}</TeX>
        <p>
          All of these can be computed at the same time with more gates. Arranged as a tree, the delay grows like{" "}
          <TeX>{"\\log_2(64) = 6"}</TeX> levels instead of 64 steps. Real CPUs spend extra transistors to buy speed like
          this all the time.
        </p>
      </GoDeeper>

      <KeyIdeas
        items={[
          <>
            Adding two bits: <strong>Sum = A XOR B</strong>, <strong>Carry = A AND B</strong> (the half adder).
          </>,
          <>A full adder handles a carry-in too: two half adders + an OR gate.</>,
          <>Chain one full adder per bit, carry-out → carry-in, to add numbers of any size.</>,
          <>Subtraction reuses the same adder: A − B = A + NOT(B) + 1.</>,
          <>Arithmetic in a computer is nothing more than gates following their truth tables.</>,
        ]}
      />
    </>
  );
}
