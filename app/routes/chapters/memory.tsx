import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { DFlipFlop, MasterSlave, RamGrid, RomSquares, SrLatch } from "~/widgets/memory";

export const meta = () => chapterMeta("memory");

export default function Memory() {
  return (
    <>
      <p>
        Everything we've built so far has a problem: it <strong>forgets instantly</strong>. An adder's output depends
        only on its inputs <em>right now</em>. Change the inputs and the old answer is gone. That's fine for a
        calculator, but a computer needs to remember things: the number you just typed, the next instruction, the photo
        you're editing.
      </p>
      <p>
        The trick that turns forgetful gates into memory is beautifully simple:{" "}
        <strong>feed a gate's output back into its own input</strong>.
      </p>

      <h2>A loop that remembers</h2>
      <p>
        Imagine two NOT gates in a circle: the output of the first feeds the second, whose output feeds back into the
        first. If the first outputs 1, the second outputs 0, which keeps the first at 1. Forever. The loop is{" "}
        <em>stable</em> in two ways (1-0 or 0-1), and it stays in whichever one it's in. That's one bit of memory! We
        just need a way to <em>push</em> it into the state we want.
      </p>
      <p>Replace the NOT gates with NOR gates, and the spare inputs become “set” and “reset” buttons:</p>
      <SrLatch />
      <Callout kind="idea">
        <p>
          While S and R are both 0, each NOR gate behaves like a NOT gate, and the pair holds its value. A brief 1 on S
          forces Q to 1; a brief 1 on R forces it to 0. The circuit doesn't just compute, it{" "}
          <strong>has a state</strong>. This idea, outputs depending on the past and not just the present, is what
          separates a calculator from a computer.
        </p>
      </Callout>
      <DataTable
        head={["S", "R", "Q after", "meaning"]}
        rows={[
          [0, 0, "Q (unchanged)", "hold / remember"],
          [1, 0, 1, "set"],
          [0, 1, 0, "reset"],
          [1, 1, "—", "not allowed"],
        ]}
      />

      <h2>Flip-flops: remember on the beat</h2>
      <p>
        In a CPU, billions of bits change every second. To keep things orderly, we want memory that only updates at a
        precise moment: when the <Link to="/clock">clock</Link> ticks. Put two latches in a row (a “master” and a “slave”),
        letting only one of them listen at a time, and you get a <strong>D flip-flop</strong>, with just two inputs:
      </p>
      <ul>
        <li>
          <strong>D</strong> (data): the bit you want to store.
        </li>
        <li>
          <strong>CLK</strong> (clock): at the instant it rises from 0 to 1, the flip-flop copies D into Q.
        </li>
      </ul>
      <DFlipFlop />
      <p>
        Between clock ticks, D can wobble around as much as it likes while circuits compute. Q only “takes a photo” of
        it on the rising edge. This is what lets a whole CPU move in lock-step.
      </p>

      <GoDeeper title="Inside the D flip-flop: why it listens only at the edge">
        <p>
          <strong>Step 1: why S = R = 1 is “not allowed”.</strong> In the SR latch, S = R = 1 forces both NOR gates to
          output 0, so Q and not Q are both 0. They no longer disagree, as their names promise. Worse, when S and R both
          drop back to 0 at the same moment, each gate sees 0 and 0, and <em>both</em> try to switch to 1. Whichever gate
          is a few picoseconds faster wins, and nobody can say in advance which one it will be. This is called a{" "}
          <strong>race</strong>. So good circuits make sure S = R = 1 can never happen.
        </p>
        <p>
          <strong>Step 2: the gated D latch.</strong> Use one data wire D and make R always the opposite of S. Add an{" "}
          <em>enable</em> wire E, with an AND gate in front of each input:
        </p>
        <TeX block>{tex`S = D \cdot E \qquad\qquad R = \overline{D} \cdot E`}</TeX>
        <ul>
          <li>
            E = 1: if D = 1, then S = 1 and R = 0, so Q becomes 1. If D = 0, then R = 1, so Q becomes 0. Q simply follows
            D. The latch is <strong>open</strong> (engineers say “transparent”).
          </li>
          <li>E = 0: S = R = 0, so the latch holds its bit. It is closed.</li>
        </ul>
        <p>
          S and R can never both be 1 now, so the race is gone. But there is a new problem. If E is the clock, the latch
          stays open for the whole time the clock is 1, which is half of every tick. Any change on D runs straight through
          to Q during that time. For a counter, whose output +1 is fed back into D, the value could race around the loop
          and count up several times in one tick.
        </p>
        <p>
          <strong>Step 3: master and slave.</strong> Put two gated D latches in a row and give them <em>opposite</em>{" "}
          enables. The first (the master) is open while the clock is 0. The second (the slave) is open while the clock
          is 1. At every moment one of them is closed, so D can never run straight through to Q. Only at the rising
          edge, when the master closes and the slave opens, does one value move across.
        </p>
        <MasterSlave />
        <p>
          <strong>How many transistors?</strong> Built from NAND gates, each latch needs 4 NAND gates, or{" "}
          <TeX>{"4 \\times 4 = 16"}</TeX> transistors. Two latches plus a NOT gate for the clock come to{" "}
          <TeX>{"2 \\times 16 + 2 = 34"}</TeX>. Real chips use a smarter design with tiny transistor switches (called{" "}
          <em>transmission gates</em>) instead of whole gates. It needs about 20 transistors, the number we use for RAM
          below.
        </p>
        <p>
          <strong>Setup and hold time.</strong> At the rising edge, the master needs a moment to close firmly. So D must
          be steady for a short time <em>before</em> the edge (the <strong>setup time</strong>, typically a few tens of
          picoseconds in a modern chip) and a short time <em>after</em> it (the <strong>hold time</strong>, often even
          shorter). If D changes inside that window, the flip-flop can get stuck halfway between 0 and 1 for a moment. This
          is one more reason why the answer must be ready a little before each tick, as{" "}
          <Link to="/clock">The Clock</Link> explains.
        </p>
      </GoDeeper>

      <h2>Registers: a row of flip-flops</h2>
      <p>
        Put 8 flip-flops side by side, all sharing the same clock wire, and you can store a whole byte in one tick.
        That's a <strong>register</strong>. A 64-bit CPU's registers are 64 flip-flops wide. Registers are the fastest
        memory there is, because they sit right next to the ALU, but a CPU core only has a few dozen of them.
      </p>

      <h2>RAM: billions of registers, and how to find one</h2>
      <p>
        <strong>RAM</strong> (Random Access Memory) is a huge grid of stored bytes. “Random access” means you can jump
        straight to any byte by its <strong>address</strong>, a number like a house number. The address goes into a{" "}
        <strong>decoder</strong>: a circuit with one output wire per row, built so that exactly one wire turns on.
      </p>
      <RamGrid />
      <Callout kind="math" title="How many address bits do you need?">
        <p>
          With <TeX>{"n"}</TeX> address bits you can name <TeX>{"2^n"}</TeX> different locations. Our toy RAM has 4
          address bits → <TeX>{"2^4 = 16"}</TeX> bytes. For a 16 GB laptop:
        </p>
        <TeX
          block
        >{tex`16\text{ GB} = 16 \times 2^{30} = 2^4 \times 2^{30} = 2^{34} \text{ bytes} \;\Rightarrow\; 34 \text{ address bits}`}</TeX>
        <p>
          And 16 GB is <TeX>{"2^{34} \\times 8 \\approx 137"}</TeX> <em>billion</em> bits, each one a tiny storage cell.
        </p>
      </Callout>

      <h2>Why your RAM isn't made of flip-flops</h2>
      <p>
        A flip-flop costs roughly 20 transistors. Building 16 GB that way would need about{" "}
        <TeX>{"137 \\times 10^9 \\times 20 \\approx 2.7"}</TeX> <em>trillion</em> transistors, over a hundred times more
        than a whole CPU. So computers use two kinds of memory cell:
      </p>
      <DataTable
        align="left"
        head={["", "SRAM (static)", "DRAM (dynamic)"]}
        rows={[
          ["one bit is", "6 transistors in a loop (a latch)", "1 transistor + 1 tiny capacitor"],
          ["speed", "very fast (≈1 ns)", "slower (≈50–100 ns)"],
          ["size per bit", "big", "tiny, about 10× denser"],
          ["catch", "expensive", "the capacitor leaks: must be refreshed every 64 ms"],
          ["used for", "registers and CPU caches", "main memory (your “16 GB of RAM”)"],
        ]}
      />
      <p>
        DRAM stores a bit as a little bucket of electrons, which slowly leak away. Memory chips quietly read and
        re-write every row about 15 times per second, forever. You'll see this leak in action in the{" "}
        <Link to="/storage">Storage chapter</Link>. Both kinds lose everything when the power goes off, which is why we
        also need storage.
      </p>

      <GoDeeper title="Real RAM chips use a 2D grid">
        <p>
          A decoder with one wire per byte would be absurd for billions of bytes. Instead, cells are arranged in a
          square grid, and the address is split in two: some bits pick the <strong>row</strong>, the rest pick the{" "}
          <strong>column</strong>. With <TeX>{"2^{16}"}</TeX> rows and <TeX>{"2^{16}"}</TeX> columns you address{" "}
          <TeX>{"2^{32}"}</TeX> cells while needing only <TeX>{"2 \\times 65{,}536"}</TeX> decoder outputs instead of 4
          billion.
        </p>
        <TeX
          block
        >{tex`\text{address} = \underbrace{1011\ldots}_{\text{row}}\;\underbrace{0110\ldots}_{\text{column}}`}</TeX>
        <p>
          Reading a DRAM row is destructive (the tiny capacitors dump their charge into the sense amplifiers), so the
          chip immediately writes the row back. Modern RAM also reads many bytes at once (a 64-byte “cache line”),
          because the next byte you need is very likely right next to this one.
        </p>
      </GoDeeper>

      <h2>ROM: wired, not written</h2>
      <p>
        RAM can be written again and again. But some bits never need to change: the first program a computer runs when
        you switch it on, the dot patterns of letters in a simple font, or the CPU's own list of steps for each
        instruction. These live in <strong>ROM</strong> (read-only memory).
      </p>
      <p>
        A ROM is built from parts you already know. The address goes into a <strong>decoder</strong> (from{" "}
        <Link to="/logic-gates">Logic Gates</Link>), which switches on exactly one row wire. Each row crosses a few column
        wires, one for each output bit. At every crossing, the chip makers either put a transistor or leave the spot
        empty. Where there is a transistor, the active row switches its column on. Where there is none, the column stays
        0. The pattern of transistors <em>is</em> the data, and it is fixed when the chip is made.
      </p>
      <RomSquares />
      <Callout kind="idea" title="A truth table frozen in hardware">
        <p>
          A ROM is a truth table you can hold in your hand: address in, stored bits out. <em>Any</em> truth table with{" "}
          <TeX>{"n"}</TeX> input bits and <TeX>{"m"}</TeX> output bits fits in a ROM with <TeX>{"2^n"}</TeX> rows of{" "}
          <TeX>{"m"}</TeX> bits. Instead of designing a squaring circuit out of gates, you can simply write down all the
          answers.
        </p>
      </Callout>
      <Callout kind="math" title="How big is a ROM?">
        <TeX block>{tex`\text{size} = 2^{n} \text{ rows} \times m \text{ bits}`}</TeX>
        <ul>
          <li>
            Our squares ROM: <TeX>{"2^3 \\times 6 = 8 \\times 6 = 48"}</TeX> bits.
          </li>
          <li>
            The control unit of SAP-8 in <Link to="/cpu">The CPU</Link> has 4 opcode bits + 3 step bits + 2 flag bits ={" "}
            9 inputs, and 16 control wires out: <TeX>{"2^9 \\times 16 = 512 \\times 16 = 8{,}192"}</TeX> bits.
          </li>
          <li>
            Every extra input bit doubles the size. 20 input bits would need <TeX>{"2^{20}"}</TeX>, about a million,
            rows.
          </li>
        </ul>
      </Callout>
      <p>ROMs, and tables that work like them, appear all over a computer:</p>
      <ul>
        <li>
          <strong>Microcode</strong>: the recipe of control signals for each instruction (see{" "}
          <Link to="/cpu">The CPU</Link>).
        </li>
        <li>
          <strong>Firmware</strong>: the first program that runs at power-on and wakes up the rest of the machine (see{" "}
          <Link to="/operating-system">The Operating System</Link>).
        </li>
        <li>
          <strong>Fonts</strong>: the dot pattern of every letter in a simple bitmap font (see{" "}
          <Link to="/bits-meaning">Who Decides What Bits Mean?</Link>).
        </li>
      </ul>
      <p>
        Today most “ROM” chips are really <strong>flash memory</strong>, which keeps its bits without power but can be
        rewritten slowly. That is how a “firmware update” works. You'll meet flash in{" "}
        <Link to="/storage">Storage</Link>.
      </p>

      <KeyIdeas
        items={[
          <>
            <strong>Feedback</strong> (an output looping back to an input) turns gates into memory.
          </>,
          <>An SR latch holds a bit; a D flip-flop stores D on the clock's rising edge.</>,
          <>A register = flip-flops side by side. RAM = a grid of storage cells + an address decoder.</>,
          <>
            <TeX>{"n"}</TeX> address bits → <TeX>{"2^n"}</TeX> locations. 34 bits address 16 GB.
          </>,
          <>Caches use fast SRAM (6 transistors/bit). Main memory uses dense, leaky DRAM (1 transistor + capacitor).</>,
          <>
            A <strong>ROM</strong> is a truth table frozen in hardware: a decoder plus a grid with or without a transistor
            at each crossing.
          </>,
        ]}
      />
    </>
  );
}
