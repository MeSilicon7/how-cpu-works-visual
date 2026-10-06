import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { CmosNand, GatePlayground, NandUniversal, SwitchGates, XorBuild } from "~/widgets/gates";

export const meta = () => chapterMeta("logic-gates");

export default function LogicGates() {
  return (
    <>
      <p>
        One transistor is a switch. A few transistors wired together can make a <strong>decision</strong>: look at some
        input bits and produce an output bit according to a fixed rule. That little circuit is called a{" "}
        <strong>logic gate</strong>. Gates are the alphabet of every chip. Adders, memory and whole CPUs are just words
        and sentences written in gates.
      </p>

      <h2>Logic from switches</h2>
      <p>
        Before thinking about transistors, let's use ordinary switches and a lamp. How you wire the switches decides the
        rule:
      </p>
      <SwitchGates />
      <p>
        In a chip, the switches are transistors and the “fingers” pressing them are voltages coming from other gates.
        The lamp is the input of the next gate. That's how gates get chained.
      </p>

      <h2>The standard gates and their truth tables</h2>
      <p>
        Engineers drew a symbol for each common rule. A <strong>truth table</strong> lists every possible input
        combination and the output for each one. With 2 inputs there are <TeX>{"2^2 = 4"}</TeX> rows, so the table is a
        complete description of the gate.
      </p>
      <GatePlayground />

      <h2>Boolean algebra: math with only 0 and 1</h2>
      <p>
        In 1854 George Boole invented an algebra where variables can only be true (1) or false (0). In 1937 a student
        named Claude Shannon noticed it describes switch circuits <em>perfectly</em>, and that's the foundation of
        digital design. The notation looks like normal algebra:
      </p>
      <DataTable
        align="left"
        head={["operation", "written", "acts like", "examples"]}
        rows={[
          ["AND", <TeX>{"A \\cdot B"}</TeX>, "multiplication", <TeX>{"1\\cdot1=1,\\; 1\\cdot0=0"}</TeX>],
          ["OR", <TeX>{"A + B"}</TeX>, "addition, but capped at 1", <TeX>{"0+1=1,\\; 1+1=1"}</TeX>],
          ["NOT", <TeX>{"\\overline{A}"}</TeX>, "flip", <TeX>{"\\overline{0}=1,\\; \\overline{1}=0"}</TeX>],
          ["XOR", <TeX>{"A \\oplus B"}</TeX>, "addition, ignoring the carry", <TeX>{"1\\oplus1=0"}</TeX>],
        ]}
      />
      <p>Some rules that are always true, which you can check against the playground above:</p>
      <TeX
        block
      >{tex`A \cdot 1 = A \qquad A \cdot 0 = 0 \qquad A + 0 = A \qquad A + 1 = 1 \qquad A \cdot \overline{A} = 0 \qquad A + \overline{A} = 1`}</TeX>
      <Callout kind="idea">
        <p>
          Look at XOR's truth table again: <code>0⊕0=0</code>, <code>0⊕1=1</code>, <code>1⊕0=1</code>,{" "}
          <code>1⊕1=0</code>. That's exactly the last digit of adding two bits (1 + 1 = 10 in binary, last digit 0). And
          AND gives you the carry. Remember this. It's how the <Link to="/adder">adder</Link> works.
        </p>
      </Callout>

      <h2>How a real chip builds a gate</h2>
      <p>
        In <Link to="/transistor">the transistor chapter</Link> we built a NOT gate from one pMOS and one nMOS. The same
        idea, a pull-up network and a pull-down network, builds every gate. Here's NAND, the workhorse of chip design:
      </p>
      <CmosNand />
      <p>
        Notice the mirror symmetry: the pMOS pair is in <strong>parallel</strong> (like OR) and the nMOS pair is in{" "}
        <strong>series</strong> (like AND). The output is 0 only when <em>both</em> nMOS conduct, meaning A AND B are 1.
        That's “NOT (A AND B)”, which is NAND.
      </p>
      <DataTable
        align="left"
        head={["gate", "transistors in CMOS", "built as"]}
        rows={[
          ["NOT", "2", "1 pMOS + 1 nMOS"],
          ["NAND, NOR", "4", "2 pMOS + 2 nMOS"],
          ["AND, OR", "6", "NAND / NOR followed by NOT"],
          ["XOR", "8–12", "a few gates combined"],
        ]}
      />
      <Callout kind="warn" title="Funny but true">
        <p>
          In CMOS, a NAND gate is <em>cheaper</em> than an AND gate. AND is “NAND + NOT”, which costs 2 extra
          transistors. Chip designers think in NANDs and NORs.
        </p>
      </Callout>

      <h2>Combining gates</h2>
      <p>
        Gates can feed other gates. Here's XOR (“one or the other, but not both”) assembled from three simpler gates:
      </p>
      <XorBuild />
      <TeX block>{tex`A \oplus B = (A + B)\cdot\overline{(A \cdot B)}`}</TeX>
      <p>
        Every gate adds a tiny delay, around <strong>10 picoseconds</strong> in a modern chip, before its output catches
        up with its inputs. A signal passing through 3 gates takes about 30 ps. That doesn't sound like much, but it
        ends up limiting how fast a CPU can run (more in <Link to="/clock">The Clock</Link>).
      </p>

      <GoDeeper title="Any truth table → a circuit (sum of products)">
        <p>
          Here's a recipe that turns <em>any</em> truth table into gates, no cleverness needed:
        </p>
        <ol>
          <li>Find every row where the output is 1.</li>
          <li>For each such row, AND the inputs together, putting a NOT on any input that is 0 in that row.</li>
          <li>OR all those terms together.</li>
        </ol>
        <p>For XOR, the output is 1 in rows (A=0, B=1) and (A=1, B=0), giving:</p>
        <TeX block>{tex`A \oplus B = \overline{A}\cdot B \;+\; A\cdot\overline{B}`}</TeX>
        <p>
          This proves something huge: <strong>with AND, OR and NOT you can build any logic function at all</strong>.
          Addition, comparison, “is this pixel inside the triangle?”: if you can write down the truth table, you can
          build the circuit.
        </p>
      </GoDeeper>

      <GoDeeper title="NAND is universal (and De Morgan's laws)">
        <p>
          Even better: you only need <em>one</em> type of gate. NAND alone can make NOT, AND and OR, and therefore
          anything:
        </p>
        <NandUniversal />
        <p>
          The OR trick uses <strong>De Morgan's laws</strong>, which say you can swap AND ↔ OR if you flip everything:
        </p>
        <TeX
          block
        >{tex`\overline{A \cdot B} = \overline{A} + \overline{B} \qquad\qquad \overline{A + B} = \overline{A}\cdot\overline{B}`}</TeX>
        <p>
          So <TeX>{"A + B = \\overline{\\overline{A}\\cdot\\overline{B}}"}</TeX> = NAND of (NOT A) and (NOT B). In plain
          words: “it's not the case that both are off” means the same as “at least one is on”.
        </p>
      </GoDeeper>

      <KeyIdeas
        items={[
          <>A logic gate is a few transistors that compute a fixed rule on input bits.</>,
          <>
            Switches in <strong>series</strong> → AND. In <strong>parallel</strong> → OR. A switch that breaks the
            circuit → NOT.
          </>,
          <>A truth table lists every input combination, so it completely describes a gate.</>,
          <>
            With AND, OR and NOT (or NAND alone) you can build <strong>any</strong> logic function.
          </>,
          <>XOR gives the sum digit of 1-bit addition, AND gives the carry. That's next.</>,
        ]}
      />
    </>
  );
}
