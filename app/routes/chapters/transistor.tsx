import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { LogicLevels, MosfetWidget, NmosPmosWidget, NoiseDemo, SizeRuler } from "~/widgets/transistor";

export const meta = () => chapterMeta("transistor");

export default function Transistor() {
  return (
    <>
      <p>
        Your phone, laptop, game console and the servers behind every website all come down to one tiny part, repeated
        billions of times: <strong>a switch</strong>. Not a switch you flip with your finger, but one that{" "}
        <em>electricity</em> flips. Billions of times per second, with no moving parts.
      </p>
      <p>
        That switch is the <strong>transistor</strong>. Everything else in this site (adding numbers, remembering
        photos, playing video, sending messages) is built by wiring transistors together in clever patterns.
      </p>

      <h2>A quick electricity recap</h2>
      <p>
        We need three words from <Link to="/electricity">Electricity Basics</Link>. In the water-pipe picture:
      </p>
      <ul>
        <li>
          <strong>Voltage (V)</strong>, in volts, is the <em>push</em>, like water pressure.
        </li>
        <li>
          <strong>Current (I)</strong>, in amperes, is how much charge flows past each second, like litres per second.
        </li>
        <li>
          <strong>Resistance (R)</strong>, in ohms (Ω), is how hard the path is, like a narrow pipe. Ohm's law links
          the three: <TeX>{"V = I \\times R"}</TeX>.
        </li>
      </ul>
      <p>
        A switch is a resistance that jumps between “huge” (open: almost no current) and “tiny” (closed: current flows
        freely). A transistor is exactly that kind of switch, but it is flipped by a voltage instead of a finger.
      </p>

      <h2>Why only 0 and 1?</h2>
      <p>
        Inside a chip, a wire at roughly <strong>1 volt</strong> means <code>1</code>, and a wire at{" "}
        <strong>0 volts</strong> means <code>0</code>. Why not use 10 voltage levels and count in normal decimal digits?
        Because real wires are noisy. Nearby wires, heat and radio waves all nudge the voltage a little. Try it:
      </p>
      <NoiseDemo />
      <p>
        With only two levels, a signal can be pushed around a lot and still be read correctly. That robustness is the
        reason computers use <strong>binary</strong>: base 2, with only the digits 0 and 1. (The next chapter is all
        about binary.)
      </p>

      <h3>Logic levels: the written rules</h3>
      <p>
        “Above or below the middle” is a good start, but engineers write the rule down more carefully, as{" "}
        <strong>logic levels</strong>: exact voltages that every chip promises to respect. Here are the standard numbers
        for chips that run on 3.3 V, which are common on circuit boards:
      </p>
      <ul>
        <li>
          <strong>Inputs:</strong> 0.8 V or less is read as <code>0</code>. 2.0 V or more is read as <code>1</code>.
          Anything in between is <em>undefined</em>: the chip might read it either way, so nobody is allowed to send it.
        </li>
        <li>
          <strong>Outputs:</strong> a <code>0</code> is always 0.4 V or less. A <code>1</code> is always 2.4 V or
          more.
        </li>
      </ul>
      <p>
        Notice the gap between the two rules. Even a weak 1 leaves at 2.4 V, but the next chip only needs 2.0 V to
        read a 1. So noise can pull the wire down by 0.4 V and nothing goes wrong. The same gap protects a 0. This gap
        is called the <strong>noise margin</strong>.
      </p>
      <Callout kind="math" title="The two noise margins">
        <TeX block>{tex`\text{for a 1: } 2.4\text{ V} - 2.0\text{ V} = 0.4\text{ V} \qquad \text{for a 0: } 0.8\text{ V} - 0.4\text{ V} = 0.4\text{ V}`}</TeX>
        <p>Any noise smaller than 0.4 V can never change what the next chip reads.</p>
      </Callout>
      <LogicLevels />
      <p>
        The second half of the trick: <strong>every gate makes a fresh signal</strong>. When a gate receives a tired
        2.1 V, it does not pass 2.1 V along. Its output is connected straight to its own supply or to ground, so it
        sends out nearly 3.3 V or nearly 0 V again. The noise is wiped clean at every step instead of adding up. That is
        why a chain of a billion gates still works. Inside a modern processor the supply is only about 1 V, so all these
        numbers are smaller, but the rules work the same way.
      </p>

      <h2>Silicon: a material we can control</h2>
      <p>
        Transistors are made from <strong>silicon</strong>, the same element as sand. Pure silicon is a poor conductor:
        its electrons are locked in place holding atoms together. But if you sprinkle in a tiny amount of another
        element (called <em>doping</em>), you can change that:
      </p>
      <ul>
        <li>
          Add <strong>phosphorus</strong> → each phosphorus atom brings one <em>extra</em> electron that is free to
          move. This is <strong>n-type</strong> silicon (n for the extra negative electrons; the crystal as a whole stays neutral).
        </li>
        <li>
          Add <strong>boron</strong> → each boron atom leaves a <em>missing</em> electron, a “hole”. This is{" "}
          <strong>p-type</strong> silicon (p for positive).
        </li>
      </ul>
      <p>
        How tiny is “tiny amount”? Typically around one dopant atom for every million or so silicon atoms. That is
        enough to completely change how the material behaves.
      </p>

      <h2>The MOSFET: a switch controlled by a voltage</h2>
      <p>
        The transistor in almost every chip today is the <strong>MOSFET</strong> (metal–oxide–semiconductor field-effect
        transistor). It has three connections:
      </p>
      <ul>
        <li>
          <strong>Source</strong> and <strong>drain</strong>: two islands of n-type silicon. Current wants to flow
          between them.
        </li>
        <li>
          <strong>Gate</strong>: a metal plate sitting on top, separated from the silicon by an ultra-thin layer of
          glass (oxide). No current flows into the gate. It only <em>pushes with voltage</em>.
        </li>
      </ul>
      <p>
        Between source and drain is p-type silicon, which has almost no free electrons, so normally nothing flows. The
        switch is <strong>off</strong>. Now put a positive voltage on the gate. Positive attracts negative, so electrons
        are pulled up to the surface right under the gate. Once the voltage passes a <strong>threshold</strong>, there
        are enough electrons to form a continuous bridge (a <em>channel</em>). Current flows, and the switch is{" "}
        <strong>on</strong>.
      </p>
      <MosfetWidget />
      <Callout kind="idea">
        <p>
          <strong>The output of one transistor can drive the gate of another.</strong> That's the whole trick. A voltage
          controls a switch, which controls a voltage, which controls another switch. Chain them and you can build any
          logic you like, and that is exactly what the next chapters do.
        </p>
      </Callout>

      <GoDeeper title="How much current flows? The square law">
        <p>
          Once the channel forms, a simple model says the current grows with the <em>square</em> of how far the gate
          voltage is above the threshold:
        </p>
        <TeX block>{tex`I_D \approx \tfrac{1}{2}\,k\,(V_G - V_{th})^2`}</TeX>
        <p>
          Here <TeX>{"k"}</TeX> depends on the transistor's size and material. With{" "}
          <TeX>{"V_{th} = 0.4\\text{ V}"}</TeX>:
        </p>
        <ul>
          <li>
            <TeX>{"V_G = 0.7\\text{ V}"}</TeX> → overdrive <TeX>{"0.3"}</TeX> → current{" "}
            <TeX>{"\\propto 0.3^2 = 0.09"}</TeX>
          </li>
          <li>
            <TeX>{"V_G = 1.0\\text{ V}"}</TeX> → overdrive <TeX>{"0.6"}</TeX> → current{" "}
            <TeX>{"\\propto 0.6^2 = 0.36"}</TeX>, which is <strong>4×</strong> as much.
          </li>
        </ul>
        <p>
          Real nanometre-scale transistors bend this rule a bit, but the idea holds: more gate voltage means a stronger
          channel. More current means the next gate's wire charges up faster, so the circuit runs faster.
        </p>
      </GoDeeper>

      <h2>Two flavours: nMOS and pMOS</h2>
      <p>
        What we just built is an <strong>nMOS</strong> transistor: it turns on when the gate is <code>1</code>. Swap
        every n-type region for p-type and vice versa and you get a <strong>pMOS</strong> transistor, which does the
        opposite: it turns on when the gate is <code>0</code>.
      </p>
      <p>
        Chips use both, always in pairs. That's called <strong>CMOS</strong> (complementary MOS). Here's the simplest
        CMOS circuit, made of just two transistors:
      </p>
      <NmosPmosWidget />
      <p>
        Notice something clever. For either input, <em>exactly one</em> of the two transistors is on. While the input is steady,
        there is no direct path from supply to ground, so almost no current is wasted while the circuit sits still. That's why your
        phone can hold billions of transistors without melting. We'll use this circuit again in{" "}
        <Link to="/logic-gates">Logic Gates</Link>, where it becomes the <strong>NOT gate</strong>.
      </p>

      <GoDeeper title="Where does a chip's power go? P = C·V²·f">
        <p>
          Each time a wire flips from 0 to 1, a tiny amount of charge has to be pushed onto it, like filling a small
          bucket. The power spent doing this is roughly
        </p>
        <TeX block>{tex`P \approx \alpha \cdot C \cdot V^2 \cdot f`}</TeX>
        <ul>
          <li>
            <TeX>{"C"}</TeX>: the wire's <em>capacitance</em> (how big the bucket is)
          </li>
          <li>
            <TeX>{"V"}</TeX>: the supply voltage
          </li>
          <li>
            <TeX>{"f"}</TeX>: how many times per second things flip (the clock frequency)
          </li>
          <li>
            <TeX>{"\\alpha"}</TeX>: the fraction of wires that actually flip each tick
          </li>
        </ul>
        <p>
          The voltage is <strong>squared</strong>. Lowering it from 1.2 V to 0.9 V changes power by{" "}
          <TeX>{"(0.9/1.2)^2 = 0.5625"}</TeX>, a 44% saving from one change. That's why chip designers fight for every
          tenth of a volt, and why a chip runs hotter when you push its clock speed up.
        </p>
      </GoDeeper>

      <h2>How small, how many, how fast?</h2>
      <SizeRuler />
      <Callout kind="fact">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>How many:</strong> a modern phone chip has about <strong>20 billion</strong> transistors. The
            biggest AI chips have over <strong>200 billion</strong>.
          </li>
          <li>
            <strong>How small:</strong> transistors sit about <strong>48 nm</strong> apart, and the thinnest parts are
            just a few nanometres, only about 20–30 silicon atoms across.
          </li>
          <li>
            <strong>How fast:</strong> a transistor can switch in a few <strong>picoseconds</strong> (trillionths of a
            second).
          </li>
        </ul>
      </Callout>
      <Callout kind="math" title="Feel the size of 20 billion">
        <p>If you counted one transistor every second, without sleeping, how long would 20 billion take?</p>
        <TeX block>
          {tex`\frac{20{,}000{,}000{,}000 \text{ s}}{60 \times 60 \times 24 \times 365 \text{ s/year}} = \frac{2\times10^{10}}{31{,}536{,}000} \approx 634 \text{ years}`}
        </TeX>
        <p>
          Nobody places them one at a time. A factory prints all of them at once, layer by layer, using light.{" "}
          <Link to="/chip-making">Making a Chip</Link> shows how.
        </p>
      </Callout>

      <Callout kind="analogy" title="A little history">
        <p>
          The first transistor was built at Bell Labs in <strong>1947</strong>, about the size of your thumb. Before
          that, computers used glass vacuum tubes: ENIAC (1945) had about 17,500 of them, filled a room, and used 150
          kilowatts. The MOSFET came in 1959, and since then the number of transistors on a chip has doubled roughly
          every two years (each transistor takes about half the area). Your phone does more than a billion times more work than ENIAC.
        </p>
      </Callout>

      <KeyIdeas
        items={[
          <>
            A transistor is a <strong>switch flipped by voltage</strong>: gate above threshold → on (1); below → off
            (0).
          </>,
          <>
            Computers use <strong>two levels</strong> because they survive noise. There is a safety gap between what an
            output sends and what an input needs (0.4 V for 3.3 V chips), and every gate sends out a fresh, clean signal. The next chapter shows
            how to count with them.
          </>,
          <>
            Chips use nMOS + pMOS pairs (<strong>CMOS</strong>), so almost no power is wasted while nothing is
            switching.
          </>,
          <>One transistor's output can control another's gate. Chaining them is how all computation is built.</>,
        ]}
      />
    </>
  );
}
