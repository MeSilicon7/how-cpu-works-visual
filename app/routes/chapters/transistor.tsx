import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { MosfetWidget, NmosPmosWidget, NoiseDemo, SizeRuler } from "~/widgets/transistor";

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

      <h2>Electricity in 60 seconds</h2>
      <p>You only need three words. Think of water in a pipe:</p>
      <ul>
        <li>
          <strong>Voltage (V)</strong> is the <em>push</em>, like water pressure. Measured in volts.
        </li>
        <li>
          <strong>Current (I)</strong> is how much electric charge flows past each second, like litres per second.
          Measured in amperes (amps).
        </li>
        <li>
          <strong>Resistance (R)</strong> is how hard the path is to push through, like a narrow pipe. Measured in ohms
          (Ω).
        </li>
      </ul>
      <p>They're linked by one famous rule, Ohm's law:</p>
      <TeX block>{tex`V = I \times R \quad\Longleftrightarrow\quad I = \frac{V}{R}`}</TeX>
      <Callout kind="math" title="Worked example">
        <p>
          Push <TeX>{"1\\text{ V}"}</TeX> through a <TeX>{"10{,}000\\ \\Omega"}</TeX> resistor:
        </p>
        <TeX block>{tex`I = \frac{1\text{ V}}{10{,}000\ \Omega} = 0.0001\text{ A} = 0.1\text{ mA}`}</TeX>
        <p>
          Make the resistance enormous (an <em>open</em> switch) and the current drops to almost zero. Make it tiny (a{" "}
          <em>closed</em> switch) and current flows freely. A transistor is a resistor that can jump between “huge” and
          “tiny” on command.
        </p>
      </Callout>

      <h2>Why only 0 and 1?</h2>
      <p>
        Inside a chip, a wire at roughly <strong>1 volt</strong> means <code>1</code>, and a wire at{" "}
        <strong>0 volts</strong> means <code>0</code>. Why not use 10 voltage levels and count in normal decimal digits?
        Because real wires are noisy. Nearby wires, heat and radio waves all nudge the voltage a little. Try it:
      </p>
      <NoiseDemo />
      <p>
        With only two levels, a signal can be pushed around a lot and still be read correctly. Every time it passes
        through a gate, it gets “cleaned up” back to a perfect 0 or 1. That robustness is the reason computers use{" "}
        <strong>binary</strong>: base 2, with only the digits 0 and 1. (The next chapter is all about binary.)
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
          move. This is <strong>n-type</strong> silicon (n for negative).
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
        Notice something clever. For either input, <em>exactly one</em> of the two transistors is on. There's never a
        direct path from supply to ground, so almost no current is wasted while the circuit sits still. That's why your
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
          A factory builds all of them at once, on a chip smaller than your fingernail, by printing patterns with light,
          a bit like photography.
        </p>
      </Callout>

      <Callout kind="analogy" title="A little history">
        <p>
          The first transistor was built at Bell Labs in <strong>1947</strong>, about the size of your thumb. Before
          that, computers used glass vacuum tubes: ENIAC (1945) had about 17,500 of them, filled a room, and used 150
          kilowatts. The MOSFET came in 1959, and since then engineers have shrunk it roughly in half every couple of
          years. Your phone does more than a billion times more work than ENIAC.
        </p>
      </Callout>

      <KeyIdeas
        items={[
          <>
            A transistor is a <strong>switch flipped by voltage</strong>: gate above threshold → on (1); below → off
            (0).
          </>,
          <>
            Computers use <strong>two levels</strong> because they survive noise. The next chapter shows how to count
            with them.
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
