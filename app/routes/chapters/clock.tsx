import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { ClockCounter, GhzCalculator, SettleDemo } from "~/widgets/clock";

export const meta = () => chapterMeta("clock");

export default function Clock() {
  return (
    <>
      <p>
        A CPU has billions of transistors, all switching at slightly different speeds. If every part just reacted
        whenever its inputs changed, it would be chaos: half-finished answers racing into registers while other parts
        are still computing. The solution is a <strong>clock</strong>: one signal, sent to every flip-flop on the chip,
        that flips between 0 and 1 billions of times per second.
      </p>
      <Callout kind="analogy">
        <p>
          Think of a rowing team. Each rower is strong on their own, but the boat only flies if they all pull{" "}
          <em>at the same moment</em>. The clock is the coxswain, the person at the back of the boat who calls “stroke… stroke… stroke…”. Between calls,
          everyone gets ready. On the call, everyone moves together.
        </p>
      </Callout>

      <h2>The heartbeat</h2>
      <p>
        The clock is a square wave. Every time it rises from 0 to 1 (a <strong>rising edge</strong>), every flip-flop in
        the chip stores whatever is on its input, all at once. In between edges, the gates have time to compute the next
        values.
      </p>
      <ClockCounter />
      <p>Two numbers describe a clock, and each is just the other flipped upside down:</p>
      <TeX
        block
      >{tex`\text{frequency } f = \frac{\text{ticks}}{\text{second}} \qquad\qquad \text{period } T = \frac{1}{f}`}</TeX>
      <p>
        Frequency is measured in <strong>hertz</strong> (Hz): 1 Hz = 1 tick per second. A <strong>gigahertz</strong>{" "}
        (GHz) is a billion ticks per second.
      </p>

      <h2>How fast is 3 GHz, really?</h2>
      <Callout kind="math" title="Worked example">
        <TeX
          block
        >{tex`T = \frac{1}{3 \times 10^{9}\ \text{Hz}} = 0.000\,000\,000\,333\ \text{s} = 0.333\ \text{ns} = 333\ \text{ps}`}</TeX>
        <p>In that time, light, the fastest thing in the universe, travels only</p>
        <TeX
          block
        >{tex`d = c \times T = 3 \times 10^8\ \tfrac{\text{m}}{\text{s}} \times 3.33 \times 10^{-10}\ \text{s} = 0.1\ \text{m} = 10\ \text{cm}`}</TeX>
        <p>
          Electrical signals in chip wires move slower than light, so in one tick a signal can only cross a few
          millimetres. That's one reason chips must be small: a signal that needs two ticks just to cross the chip would
          slow everything down.
        </p>
      </Callout>
      <GhzCalculator />

      <h2>Why not just tick faster?</h2>
      <p>
        Each gate takes a few picoseconds to react (its <strong>propagation delay</strong>). A clock tick has to be long
        enough for the <em>slowest</em> path of gates between two flip-flops, called the <strong>critical path</strong>,
        to finish. If the tick comes too early, the register captures a half-computed answer. Push the clock too high
        and watch an adder fail:
      </p>
      <SettleDemo />
      <TeX
        block
      >{tex`f_{\max} = \frac{1}{t_{\text{critical path}}} \qquad \text{e.g. } \frac{1}{180\ \text{ps}} \approx 5.6\ \text{GHz}`}</TeX>
      <p>
        That's exactly what “overclocking” risks: run the clock faster than the designers tested and some rare input
        combinations produce wrong answers. You get crashes, glitches, or silently wrong maths. CPU designers spend
        enormous effort shortening the critical path, for example with the carry-lookahead adders from{" "}
        <Link to="/adder">the adder chapter</Link>.
      </p>

      <h2>The heat wall</h2>
      <p>
        Remember the power formula from <Link to="/transistor">the transistor chapter</Link>?
      </p>
      <TeX block>{tex`P \approx \alpha \cdot C \cdot V^2 \cdot f`}</TeX>
      <p>
        Power grows with frequency <TeX>{"f"}</TeX>. Running faster also needs a higher voltage, and voltage is{" "}
        <em>squared</em>. Around 2005, CPUs hit about 3–4 GHz and simply got too hot to cool. So the industry changed
        direction: instead of one faster core, put <strong>several cores</strong> on one chip, each running at a
        sensible speed.
      </p>
      <DataTable
        align="left"
        head={["year", "chip", "clock"]}
        rows={[
          ["1971", "Intel 4004 (first microprocessor)", "0.00074 GHz (740 kHz)"],
          ["1993", "Intel Pentium", "0.06 GHz"],
          ["2000", "AMD Athlon / Pentium III", "1 GHz"],
          ["2005", "Pentium 4", "3.8 GHz"],
          ["today", "desktop CPUs (boost)", "≈ 5–6 GHz, but with 8–24 cores"],
        ]}
      />

      <GoDeeper title="Where does the clock come from?">
        <p>
          A tiny sliver of <strong>quartz crystal</strong> vibrates at a precise frequency when electricity is applied
          (the same trick as a quartz watch, which uses 32,768 Hz = <TeX>{"2^{15}"}</TeX>, so 15 halvings make exactly 1
          tick per second). A computer's crystal runs at tens of MHz, typically turned into a 100 MHz reference. A
          circuit called a <strong>phase-locked loop (PLL)</strong> then multiplies that up:
        </p>
        <TeX block>{tex`100\ \text{MHz} \times 45 = 4.5\ \text{GHz}`}</TeX>
        <p>
          That multiplier changes all the time. When your laptop is idle, it drops the clock (and voltage) to save
          battery. When you open a game, it ramps up within microseconds.
        </p>
      </GoDeeper>

      <KeyIdeas
        items={[
          <>The clock is a square wave; on each rising edge, every flip-flop stores its input at once.</>,
          <>
            <TeX>{"T = 1/f"}</TeX>: at 3 GHz a tick is 0.333 ns, and light only travels 10 cm.
          </>,
          <>The tick must be longer than the slowest gate path (the critical path), or answers come out wrong.</>,
          <>Power grows with frequency and voltage², which is why we got more cores instead of 10 GHz chips.</>,
        ]}
      />
    </>
  );
}
