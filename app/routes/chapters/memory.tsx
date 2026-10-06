import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { DFlipFlop, RamGrid, SrLatch } from "~/widgets/memory";

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
        precise moment: when the <Link to="/clock">clock</Link> ticks. Add a few gates in front of the latch and you get
        a <strong>D flip-flop</strong>, with just two inputs:
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
        ]}
      />
    </>
  );
}
