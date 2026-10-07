import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas, Steps } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { CapacitorFigure, ChargeBucket, CircuitSandbox, GroundFigure, RelayLab } from "~/widgets/electricity";

export const meta = () => chapterMeta("electricity");

export default function Electricity() {
  return (
    <>
      <p>
        Press a key and a letter appears. Tap a video and it plays. It can feel like magic. But inside the computer
        only one kind of thing is happening, billions of times every second: small amounts of electricity are pushed
        along wires, switched on and off, and held for a moment. This book shows you every step, from that electricity
        up to videos and messages, and nothing in it is magic.
      </p>
      <p>
        This first chapter is about electricity itself. You will meet four units (volts, amps, ohms and watts) and do
        real calculations with them. Then you will see why every switch needs a little time, which is the reason a
        computer cannot be infinitely fast. You only need multiplication and division.
      </p>

      <h2>What moves in a wire</h2>
      <p>
        Everything is made of tiny <strong>atoms</strong>. Each atom has a heavy centre with a positive electric charge,
        and light <strong>electrons</strong> around it with a negative charge. Opposite charges pull on each other, and
        equal charges push each other away.
      </p>
      <p>
        In most materials the electrons stay with their own atom. But in a <strong>metal</strong> such as copper, each
        atom lets one of its outer electrons wander freely from atom to atom. A copper wire is packed full of these{" "}
        <strong>free electrons</strong>, like a pipe that is already full of water. Materials whose charges can move
        are called <strong>conductors</strong>. Materials like plastic, glass, rubber and air, where the electrons are
        held tightly, are called <strong>insulators</strong>. That is why a wire is copper inside and plastic outside.
      </p>
      <p>
        We measure electric charge in <strong>coulombs</strong> (symbol C). One electron carries a very small charge,
        only about <TeX>{"1.6 \\times 10^{-19}"}</TeX> coulombs. Turn that around and one coulomb is the charge of about{" "}
        <TeX>{"6.24 \\times 10^{18}"}</TeX> electrons.
      </p>

      <Callout kind="math" title="Reading powers of ten">
        <p>
          Electricity uses very big and very small numbers, so we write them with powers of ten.{" "}
          <TeX>{"10^{3}"}</TeX> means 1 followed by 3 zeros: 1,000. <TeX>{"10^{18}"}</TeX> is 1 followed by 18 zeros: a
          billion billion. A negative power means “divide”: <TeX>{"10^{-3} = 1 \\div 1{,}000 = 0.001"}</TeX>. So
        </p>
        <TeX block>{tex`6.24 \times 10^{18} = 6{,}240{,}000{,}000{,}000{,}000{,}000`}</TeX>
        <p>Instead of writing all the zeros, units get a short prefix. You will meet all of these in this book:</p>
        <DataTable
          align="left"
          head={["prefix", "symbol", "means", "example"]}
          rows={[
            ["giga", "G", <TeX>{"10^{9}"}</TeX>, "3 GHz = 3 billion ticks per second"],
            ["kilo", "k", <TeX>{"10^{3}"}</TeX>, "10 kΩ = 10,000 ohms"],
            ["milli", "m", <TeX>{"10^{-3}"}</TeX>, "10 mA = 0.010 amps"],
            ["micro", "µ", <TeX>{"10^{-6}"}</TeX>, "1 µs = one millionth of a second"],
            ["nano", "n", <TeX>{"10^{-9}"}</TeX>, "1 ns = one billionth of a second"],
            ["pico", "p", <TeX>{"10^{-12}"}</TeX>, "10 ps = 10 trillionths of a second"],
            ["femto", "f", <TeX>{"10^{-15}"}</TeX>, "1 fF = a very small capacitor (later)"],
          ]}
        />
      </Callout>

      <p>
        Now the most important word. <strong>Current</strong> is how much charge passes one point of a wire each
        second. Its unit is the <strong>ampere</strong> (symbol A, usually called an “amp”). One amp means one coulomb
        passes every second:
      </p>
      <TeX block>{tex`I = \frac{Q}{t} \qquad 1\ \text{A} = 1\ \tfrac{\text{C}}{\text{s}} \approx 6.24 \times 10^{18}\ \text{electrons per second}`}</TeX>
      <p>
        Here <TeX>{"I"}</TeX> is the current, <TeX>{"Q"}</TeX> is the charge and <TeX>{"t"}</TeX> is the time. (The
        letter I comes from the old French word <em>intensité</em>.)
      </p>
      <Callout kind="math" title="Worked example: a phone charger">
        <p>A phone charger that gives 2 A moves</p>
        <TeX block>{tex`2 \times 6.24 \times 10^{18} \approx 12.5 \times 10^{18}\ \text{electrons every second.}`}</TeX>
        <p>
          If you counted one electron per second, counting just <em>one second's</em> worth would take about 400
          billion years. That is almost 30 times the age of the universe.
        </p>
      </Callout>
      <p>
        One more surprise: the electrons are <em>not used up</em>. The same electrons go round and round. A battery
        does not fill the wire with electrons (it is already full). It only gives them a push. Think of a bicycle chain:
        the chain is not used up either. It just carries the push from the pedals to the wheel.
      </p>

      <GoDeeper title="If electrons move so slowly, why does the light come on at once?">
        <p>
          How fast do the electrons actually move? In one second, all the free electrons in a length <TeX>{"v"}</TeX>{" "}
          of wire pass a point. So the current is (electrons per cubic metre) × (area of the wire) × <TeX>{"v"}</TeX> ×
          (charge of one electron):
        </p>
        <TeX block>{tex`I = n \cdot A \cdot v \cdot q \quad\Longrightarrow\quad v = \frac{I}{n \cdot A \cdot q}`}</TeX>
        <p>
          Copper has about <TeX>{"n = 8.5 \\times 10^{28}"}</TeX> free electrons per cubic metre. Take a normal wire
          with an area of 1 mm² (<TeX>{"10^{-6}\\ \\text{m}^2"}</TeX>) carrying 1 A:
        </p>
        <TeX block>{tex`v = \frac{1}{8.5 \times 10^{28} \times 10^{-6} \times 1.6 \times 10^{-19}} \approx \frac{1}{13{,}600} \approx 0.000073\ \text{m/s} \approx 0.07\ \text{mm/s}`}</TeX>
        <p>
          That is far slower than a snail. An electron would need almost 4 hours to travel one metre of wire! Yet the
          light comes on at once. Why?
        </p>
        <p>
          Because the wire is already full. Think of a long tube packed with marbles: push one marble in at one end and
          a marble falls out of the other end straight away, even though each marble only moved a tiny bit. In a wire
          the <em>push</em> travels at about 50 to 70% of the speed of light, so it crosses one metre of cable in a
          few nanoseconds. The electrons themselves just shuffle forward slowly.
        </p>
      </GoDeeper>

      <h2>Current needs a closed loop</h2>
      <p>
        A battery has two ends, marked <strong>+</strong> and <strong>−</strong>. Chemistry inside the battery pushes
        electrons out of the − end and pulls them back in at the + end. Current can only flow if there is a complete
        path from one end back to the other. That path is called a <strong>circuit</strong> (from “circle”):
      </p>
      <TeX block>{tex`\text{battery } + \;\to\; \text{wire} \;\to\; \text{lamp} \;\to\; \text{wire} \;\to\; \text{battery } -`}</TeX>
      <p>
        A <strong>switch</strong> is just a place where the loop can be opened. When it opens, there is a gap of air,
        and air is an insulator. The current stops <em>everywhere</em> in the loop at the same moment, not only after
        the gap, just like a broken bicycle chain stops turning the wheel. So an open switch means 0 A.
      </p>
      <Callout kind="warn" title="Two directions, one circuit">
        <p>
          Engineers draw current flowing from + to −. Real electrons move the other way, from − to +. In the 1700s,
          Benjamin Franklin had to guess which way the “electric fluid” moved, long before anyone knew about electrons
          (they were found in 1897). He guessed wrong, and the habit stayed. It does not change any of the math. In this
          chapter the moving dots are electrons, so they leave the − end.
        </p>
      </Callout>
      <p>
        How hard does a battery push? That is its <strong>voltage</strong>, measured in <strong>volts</strong> (V).
        The battery gives energy to every bit of charge that passes through it. One volt means each coulomb gets one{" "}
        <strong>joule</strong> of energy. (A joule, J, is a small amount of energy: lifting an apple of 100 g by one
        metre takes about one joule.)
      </p>
      <TeX block>{tex`1\ \text{V} = 1\ \tfrac{\text{J}}{\text{C}}`}</TeX>
      <DataTable
        align="left"
        head={["source", "voltage"]}
        rows={[
          ["one AA battery", "1.5 V"],
          ["a phone battery", "about 3.85 V"],
          ["a USB port", "5 V"],
          ["a car battery", "12 V"],
          ["a wall socket", "230 V (most countries) or 120 V (North America)"],
          ["the transistors inside a computer chip", "about 1 V"],
        ]}
      />

      <h2>Ground: where 0 volts lives</h2>
      <p>
        Here is something that confuses many people: a voltage is always measured <em>between two points</em>. It is
        like height. When you say “the shelf is 2 metres high”, you mean 2 metres above the floor. Without a floor to
        measure from, “2 metres high” has no meaning.
      </p>
      <p>
        So in every circuit we choose one point and call it <strong>0 V</strong>. That point is called{" "}
        <strong>ground</strong>, and it is usually the − end of the battery. After that, “this wire is at 1 V” simply
        means “this wire is 1 volt above ground”. Engineers draw ground with the symbol ⏚.
      </p>
      <GroundFigure />
      <p>
        Why the name “ground”? The first telegraph lines, in the 1830s and 1840s, used the earth itself as the return
        half of the loop: a metal plate was buried in the ground at each end. The return side really was the ground,
        and the name stayed. In a desktop computer, ground is still joined to the earth pin of the wall socket. In a
        phone it is just the − end of the battery.
      </p>
      <Callout kind="idea" title="Where 0 and 1 come from">
        <p>
          Every chip has two big power wires that reach every transistor. One is the supply, called{" "}
          <strong>VDD</strong>, at about 1 V. The other is ground, at 0 V. A <strong>1</strong> is a wire that is
          connected to the supply, so it sits near 1 V. A <strong>0</strong> is a wire connected to ground, so it sits
          near 0 V. Every 0 and 1 in this book is really a voltage, measured from ground. You will see the word “ground”
          again in the NOT gate of <Link to="/transistor">The Transistor</Link>.
        </p>
      </Callout>

      <h2>Push, flow and resistance</h2>
      <p>
        Picture water in a pipe. Three things matter, and each has an electrical twin:
      </p>
      <ul>
        <li>
          <strong>Voltage</strong> (V, in volts) is the <em>push</em>, like water pressure.
        </li>
        <li>
          <strong>Current</strong> (I, in amps) is the <em>flow</em>, like litres per second.
        </li>
        <li>
          <strong>Resistance</strong> (R) is how hard the path is to push through, like a narrow pipe. It is measured
          in <strong>ohms</strong>, written with the Greek letter Ω (omega).
        </li>
      </ul>
      <p>
        A <strong>resistor</strong> is a small part made to have a chosen resistance. A copper wire has almost none. The
        very thin wire inside an old light bulb has a lot, which is why it gets hot and glows.
      </p>
      <p>
        In 1827 Georg Ohm found the rule that links the three. It is called <strong>Ohm's law</strong>:
      </p>
      <TeX block>{tex`V = I \times R \qquad\Longleftrightarrow\qquad I = \frac{V}{R} \qquad\Longleftrightarrow\qquad R = \frac{V}{I}`}</TeX>
      <p>
        In words: push twice as hard and twice as much current flows. Make the path twice as hard and half as much
        flows. One ohm is the resistance where a push of 1 V drives a current of 1 A.
      </p>
      <Callout kind="math" title="Worked example: a battery and a resistor">
        <p>A 9 V battery is connected to a 1,000 Ω resistor. How much current flows?</p>
        <TeX block>{tex`I = \frac{V}{R} = \frac{9\ \text{V}}{1{,}000\ \Omega} = 0.009\ \text{A} = 9\ \text{mA}`}</TeX>
      </Callout>
      <Callout kind="math" title="Worked example: choosing a resistor for an LED">
        <p>
          An <strong>LED</strong> (light-emitting diode) is a tiny lamp. When it shines it takes about 2 V, but it
          does not limit its own current: connected straight to a battery, it would let a huge current through and burn
          out. So we put a resistor in the same loop. We have a 5 V supply and we want 10 mA. Which resistor?
        </p>
        <Steps>
          {[
            <>The push is shared out around the loop. The LED uses 2 V, so the resistor gets the rest: 5 V − 2 V = 3 V.</>,
            <>
              The current is the same everywhere in the loop: 10 mA = 0.010 A.
            </>,
            <>
              Ohm's law gives the resistance: <TeX>{"R = \\dfrac{V}{I} = \\dfrac{3\\ \\text{V}}{0.010\\ \\text{A}} = 300\\ \\Omega"}</TeX>.
            </>,
            <>
              Check: <TeX>{"I = 3\\ \\text{V} \\div 300\\ \\Omega = 0.010\\ \\text{A}"}</TeX>. ✓
            </>,
          ]}
        </Steps>
      </Callout>
      <p>
        Switches fit into Ohm's law too. A closed switch is a piece of metal: almost 0 Ω. An open switch is a gap of
        air: an enormous resistance, so <TeX>{"I = V \\div (\\text{huge}) \\approx 0"}</TeX>. Keep this in mind. A
        transistor will be a switch whose resistance jumps between “tiny” and “huge” when we ask it to.
      </p>

      <h2>Series and parallel</h2>
      <p>There are two basic ways to connect two parts.</p>
      <p>
        <strong>In series</strong> means one after the other, in a single row. The current has only one path, so the{" "}
        <em>same current</em> goes through both parts. The resistances add up, and the push is shared between them:
      </p>
      <TeX block>{tex`R = R_1 + R_2`}</TeX>
      <p>
        <strong>In parallel</strong> means side by side. Each part gets the <em>full</em> push of the battery, and the
        current splits between the two paths. The total current is the sum of the two. For the total resistance there
        is a special rule:
      </p>
      <TeX block>{tex`\frac{1}{R} = \frac{1}{R_1} + \frac{1}{R_2}`}</TeX>
      <p>
        Why does adding a second resistor make the total resistance <em>smaller</em>? Because it opens a second path.
        Two doors let more people out of a room than one door does, even if both doors are narrow.
      </p>
      <Callout kind="math" title="Worked example: two 100 Ω resistors on 5 V">
        <p>
          <strong>Series:</strong> <TeX>{"R = 100 + 100 = 200\\ \\Omega"}</TeX>, so{" "}
          <TeX>{"I = 5\\ \\text{V} \\div 200\\ \\Omega = 0.025\\ \\text{A} = 25\\ \\text{mA}"}</TeX>. Each resistor gets
          half the push: <TeX>{"25\\ \\text{mA} \\times 100\\ \\Omega = 2.5\\ \\text{V}"}</TeX>.
        </p>
        <p>
          <strong>Parallel:</strong> <TeX>{"\\tfrac{1}{R} = \\tfrac{1}{100} + \\tfrac{1}{100} = \\tfrac{2}{100}"}</TeX>,
          so <TeX>{"R = 50\\ \\Omega"}</TeX> and{" "}
          <TeX>{"I = 5\\ \\text{V} \\div 50\\ \\Omega = 0.1\\ \\text{A} = 100\\ \\text{mA}"}</TeX>, which is 50 mA in
          each resistor. Four times the current of the series circuit.
        </p>
      </Callout>
      <p>Now build these circuits yourself. Check the worked example, then try your own numbers:</p>
      <CircuitSandbox />
      <p>
        Switch the sandbox to <em>One lamp</em> and fill in its table. With the switches in series, the lamp lights only
        if switch A <strong>and</strong> switch B are closed. Side by side, it lights if A <strong>or</strong> B is
        closed. Write “closed” as 1 and “open” as 0 and you have just built the two most important rules of computing,
        AND and OR. They return in <Link to="/logic-gates">Logic Gates</Link>, built from transistors instead of
        fingers.
      </p>

      <h2>Power: volts times amps</h2>
      <p>
        <strong>Power</strong> is how much energy is used each second. Its unit is the <strong>watt</strong> (W): one
        watt is one joule per second. For electricity the rule is very simple:
      </p>
      <TeX block>{tex`P = V \times I`}</TeX>
      <p>
        Why? Each coulomb that passes gets <TeX>{"V"}</TeX> joules, and <TeX>{"I"}</TeX> coulombs pass every second.
        So <TeX>{"V \\times I"}</TeX> joules are used every second. The units agree:
      </p>
      <TeX block>{tex`\text{V} \times \text{A} = \frac{\text{J}}{\text{C}} \times \frac{\text{C}}{\text{s}} = \frac{\text{J}}{\text{s}} = \text{W}`}</TeX>
      <Callout kind="math" title="Worked example: where does the LED's energy go?">
        <p>Back to the LED circuit: 5 V supply, 10 mA, LED takes 2 V, resistor takes 3 V.</p>
        <TeX block>{tex`\begin{aligned}
P_{\text{LED}} &= 2\ \text{V} \times 0.010\ \text{A} = 0.020\ \text{W} = 20\ \text{mW} &&\text{(mostly light)}\\
P_{\text{resistor}} &= 3\ \text{V} \times 0.010\ \text{A} = 0.030\ \text{W} = 30\ \text{mW} &&\text{(all heat)}\\
P_{\text{supply}} &= 5\ \text{V} \times 0.010\ \text{A} = 0.050\ \text{W} = 50\ \text{mW} &&= 20 + 30\ \checkmark
\end{aligned}`}</TeX>
        <p>Energy is never lost. It only changes form: the battery's energy becomes light and heat.</p>
      </Callout>
      <Callout kind="fact" title="Real numbers: a phone and a desktop chip">
        <p>
          A phone battery says “3.85 V, 4,000 mAh”. An <strong>amp-hour</strong> (Ah) is a current of 1 A flowing for
          one hour, so 4,000 mAh = 4 Ah. The stored energy, in <strong>watt-hours</strong> (Wh, one watt for one hour),
          is
        </p>
        <TeX block>{tex`3.85\ \text{V} \times 4\ \text{Ah} = 15.4\ \text{Wh}`}</TeX>
        <p>
          If the chip, screen and radio together use 5 W, the battery lasts about{" "}
          <TeX>{"15.4 \\div 5 \\approx 3"}</TeX> hours.
        </p>
        <p>
          A desktop processor (CPU) can use 125 W, at only about 1.2 V. Ohm's law and the power rule give the current:
        </p>
        <TeX block>{tex`I = \frac{P}{V} = \frac{125\ \text{W}}{1.2\ \text{V}} \approx 104\ \text{A}`}</TeX>
        <p>
          An electric kettle (2,000 W from a 230 V socket) draws only about 9 A. The chip needs about 12 times more
          current than the kettle! No single tiny pin could carry 104 A. That is why a CPU has hundreds of pins just
          for power and ground.
        </p>
      </Callout>
      <p>
        Where does the chip's 1 V come from? The wall socket gives 230 V or 120 V. The computer's power supply turns
        that into 12 V. Then small converters on the main board, right next to the processor, turn 12 V into about 1 V.
      </p>

      <GoDeeper title="AC from the wall, DC in the chip">
        <p>
          A battery gives <strong>direct current</strong> (DC): the push is steady and always in the same direction. A
          chip needs DC, because a 1 must stay a 1.
        </p>
        <p>
          A wall socket gives <strong>alternating current</strong> (AC): the push changes direction 50 times per
          second (in most countries) or 60 times (in North America). Power stations use AC because spinning generators
          make it naturally, and because AC voltage is easy to change with a <strong>transformer</strong> (two coils of
          wire around one iron ring).
        </p>
        <p>
          The power supply in a desktop computer, or the charger of a phone, changes AC into DC. First,{" "}
          <strong>diodes</strong> (one-way valves for current) let the current through in only one direction. Then
          capacitors smooth out the bumps, and a fast switching circuit sets the output to exactly 12 V (desktop) or 5
          V (USB). Next to the processor, <strong>voltage regulators</strong> switch on and off hundreds of thousands
          of times per second and smooth the result with coils and capacitors, to make a steady 1 V or so. They change
          it many times per second, as the chip gets busier or quieter.
        </p>
        <p>Why not send 1 V all the way from the power station? Look at the same 125 W at different voltages:</p>
        <DataTable
          head={["where", "voltage", "current for 125 W"]}
          rows={[
            ["wall socket", "230 V", "0.54 A"],
            ["inside the power supply", "12 V", "10.4 A"],
            ["at the chip", "1.2 V", "104 A"],
          ]}
        />
        <p>
          Lower voltage means more amps, and more amps need thicker wires and waste more heat in them. So power travels
          at high voltage and is converted down as close to the chip as possible. (These numbers ignore the few percent
          lost in each converter.)
        </p>
      </GoDeeper>

      <h2>Capacitors: buckets of charge</h2>
      <p>
        So far, charge just flows around a loop. Now let's store some. A <strong>capacitor</strong> is two metal plates
        very close together, with an insulator between them. No current can cross the gap. But if you connect the
        plates to a battery, something happens for a moment: electrons flow onto one plate and away from the other.
        Then the flow stops, when the voltage between the plates is the same as the battery's. The capacitor now holds
        that charge, even after you disconnect the battery (for a while).
      </p>
      <CapacitorFigure />
      <p>How much charge does it hold? That depends on the voltage and on the capacitor's size:</p>
      <TeX block>{tex`Q = C \times V`}</TeX>
      <p>
        <TeX>{"C"}</TeX> is the <strong>capacitance</strong>, measured in <strong>farads</strong> (F). One farad holds
        one coulomb for every volt. A farad is enormous. Inside a chip we talk about <strong>femtofarads</strong>: one
        fF is <TeX>{"10^{-15}"}</TeX> F, a millionth of a billionth of a farad.
      </p>
      <Callout kind="analogy" title="Think of it like a bucket">
        <p>
          A capacitor is a bucket for charge. The voltage is the water level. The capacitance is how{" "}
          <em>wide</em> the bucket is. A wide bucket needs a lot of water to reach a given level. A narrow one needs
          only a little. Charge = width × level, just like <TeX>{"Q = C \\times V"}</TeX>.
        </p>
      </Callout>
      <p>
        Here is the important part: <strong>every wire and every transistor gate in a chip is a tiny capacitor</strong>.
        The gate of a transistor is a metal plate on thin glass on top of silicon: two conductors with an insulator
        between them. Every wire also lies close to other wires. So a 0 or a 1 on a wire is really a small bucket that
        is empty or full.
      </p>
      <Callout kind="math" title="Worked example: how many electrons is a 1?">
        <p>A typical wire plus the gate it drives might have about 1 fF. Charge it to 1 V:</p>
        <TeX block>{tex`Q = C \times V = 10^{-15}\ \text{F} \times 1\ \text{V} = 10^{-15}\ \text{C}`}</TeX>
        <TeX block>{tex`\frac{10^{-15}\ \text{C}}{1.6 \times 10^{-19}\ \text{C per electron}} \approx 6{,}000\ \text{electrons}`}</TeX>
        <p>
          So changing that wire from 0 to 1 means moving only about 6,000 electrons. That is a very small bucket, and
          it is why a chip can flip so fast.
        </p>
      </Callout>
      <p>
        You will meet these buckets again. A memory cell in your computer's main memory (DRAM) is exactly one tiny
        capacitor and one transistor: a full bucket is a 1, an empty one is a 0. The buckets slowly leak, so the memory
        chip has to refill them every 64 milliseconds. More in <Link to="/memory">Memory</Link>.
      </p>

      <h2>Why every switch takes time</h2>
      <p>
        Picture a gate whose output changes from 0 to 1. It connects its output wire to the 1 V supply through a
        transistor that is switched on. But an “on” transistor is not perfect metal: it still has a resistance, roughly{" "}
        10 kΩ. And the wire, with the next gate's input, is a bucket of about 1 fF. So the charge has to flow through a
        resistor into a capacitor. How long does that take?
      </p>
      <p>
        At the start the bucket is empty, so the full 1 V pushes through the resistor, and a big current flows. But as
        the bucket fills, its own voltage pushes back. Only the difference is left to push the current:
      </p>
      <TeX block>{tex`I = \frac{1\ \text{V} - V_{\text{bucket}}}{R}`}</TeX>
      <p>
        So the bucket fills fast at first, then slower, then slower still. It never quite stops slowing down. The
        voltage follows this curve:
      </p>
      <TeX block>{tex`V(t) = 1\ \text{V} \times \left(1 - e^{-t/RC}\right)`}</TeX>
      <p>
        Do not be afraid of the <TeX>{"e"}</TeX>. It is a special number, about 2.718, and{" "}
        <TeX>{"e^{-t/RC}"}</TeX> is simply the part of the bucket that is <em>still missing</em>. The key quantity is
        the <strong>time constant</strong>:
      </p>
      <TeX block>{tex`\tau = R \times C`}</TeX>
      <p>
        (<TeX>{"\\tau"}</TeX> is the Greek letter tau.) The rule is easy to remember:{" "}
        <strong>after every τ, the missing part shrinks to about 37%</strong> (a bit more than a third) of what it was.
      </p>
      <DataTable
        head={["time", "still missing", "bucket full"]}
        highlight={1}
        rows={[
          ["0", "100%", "0%"],
          ["0.69 τ", "50%", "50%  ← the next gate flips here"],
          ["1 τ", "37%", "63%"],
          ["2 τ", "13.5%", "86.5%"],
          ["3 τ", "5%", "95%"],
          ["5 τ", "0.7%", "99.3%"],
        ]}
      />
      <p>
        The next gate does not wait for a full bucket. It decides “this is a 1” once the voltage passes about half,
        0.5 V. That happens at <TeX>{"0.69\\,\\tau"}</TeX>, because <TeX>{"e^{-0.69} \\approx 0.5"}</TeX>.
      </p>
      <p>
        Why is the time <TeX>{"R \\times C"}</TeX>? A bigger <TeX>{"C"}</TeX> is a wider bucket: more charge to move.
        A bigger <TeX>{"R"}</TeX> is a narrower pipe: the charge moves more slowly. Even the units work out to
        seconds:
      </p>
      <TeX block>{tex`\Omega \times \text{F} = \frac{\text{V}}{\text{A}} \times \frac{\text{C}}{\text{V}} = \frac{\text{C}}{\text{A}} = \frac{\text{C}}{\text{C/s}} = \text{s}`}</TeX>
      <Callout kind="math" title="Worked example: one gate delay">
        <p>
          <TeX>{"R = 10\\ \\text{k}\\Omega = 10^{4}\\ \\Omega"}</TeX> and{" "}
          <TeX>{"C = 1\\ \\text{fF} = 10^{-15}\\ \\text{F}"}</TeX>:
        </p>
        <TeX block>{tex`\tau = 10^{4} \times 10^{-15} = 10^{-11}\ \text{s} = 10\ \text{ps}`}</TeX>
        <TeX block>{tex`t_{\text{flip}} = 0.69 \times 10\ \text{ps} \approx 7\ \text{ps}`}</TeX>
        <p>
          That is the “around 10 picoseconds” per gate that you will meet in <Link to="/logic-gates">Logic Gates</Link>.
          A handy shortcut: kΩ × fF = ps, because <TeX>{"10^{3} \\times 10^{-15} = 10^{-12}"}</TeX>.
        </p>
      </Callout>
      <p>
        A computer does not let every gate run whenever it likes. A <strong>clock</strong> sends a “now!” signal (a{" "}
        <em>tick</em>) to all the memory parts at regular times, and at each tick they save whatever bits are on their
        input wires. If a tick comes before a bucket has passed the half-way line, a wrong bit is saved. Try it:
      </p>
      <ChargeBucket />
      <p>
        One gate could run at more than 100 GHz. But between two ticks, a signal usually passes through a chain of
        gates, one after another, and each one has to fill the next bucket. If the slowest chain has 48 gates of about
        7 ps each, it needs <TeX>{"48 \\times 6.9 \\approx 333"}</TeX> ps, and the clock can tick at most once every
        333 ps: that is 3 GHz. This is why the clock cannot tick infinitely fast. You will see the full story in{" "}
        <Link to="/clock">The Clock</Link>.
      </p>
      <p>
        It also explains why smaller transistors make faster chips. A smaller transistor has smaller plates, so a
        smaller <TeX>{"C"}</TeX>. Halve <TeX>{"C"}</TeX> and you halve <TeX>{"\\tau"}</TeX>: the bucket fills twice as
        fast.
      </p>

      <h2>Every flip costs energy</h2>
      <p>
        Filling the bucket also costs energy. While the supply fills it to <TeX>{"V"}</TeX>, it delivers a charge{" "}
        <TeX>{"Q = C \\times V"}</TeX>, and each coulomb gets <TeX>{"V"}</TeX> joules. So the supply gives{" "}
        <TeX>{"C \\times V^2"}</TeX> joules. Half of that is stored in the bucket. The other half becomes heat in the
        transistor's resistance (whatever the resistance is). When the wire goes back to 0, the stored half is dumped
        into ground and becomes heat too. So:
      </p>
      <TeX block>{tex`\text{energy turned into heat for each } 0 \to 1 \to 0 = C \times V^2`}</TeX>
      <Callout kind="math" title="Worked example: why chips get hot">
        <p>For our 1 fF wire at 1 V:</p>
        <TeX block>{tex`C \times V^2 = 10^{-15}\ \text{F} \times (1\ \text{V})^2 = 10^{-15}\ \text{J} = 1\ \text{femtojoule}`}</TeX>
        <p>
          Tiny! But a chip has about a billion such wires, and a 3 GHz clock ticks 3 billion times per second. If every
          wire flipped on every tick:
        </p>
        <TeX block>{tex`10^{-15}\ \text{J} \times 3 \times 10^{9}\ \tfrac{1}{\text{s}} \times 10^{9}\ \text{wires} = 3{,}000\ \text{W}`}</TeX>
        <p>
          That is a room heater. Real chips use about 100 W, because on each tick only a few wires in every hundred
          actually change.
        </p>
      </Callout>
      <p>
        Notice that <TeX>{"V"}</TeX> is <em>squared</em>. Running a chip at 5 V instead of 1 V would cost{" "}
        <TeX>{"5^2 = 25"}</TeX> times more energy for every flip. That is why modern chips run at about 1 V. The{" "}
        <Link to="/transistor">next chapter</Link> turns this into the power formula for a whole chip.
      </p>

      <h2>The relay: an electric switch</h2>
      <p>
        So far, every switch in this chapter was flipped by a finger. A computer needs switches that are flipped by{" "}
        <em>electricity</em>, so that one switch can control the next. The first such switch is almost 200 years old.
      </p>
      <p>
        In 1820 Hans Christian Ørsted noticed that a wire carrying current makes a compass needle move: current makes
        magnetism. Wind the wire into a <strong>coil</strong> around a piece of iron and you get an{" "}
        <strong>electromagnet</strong>, a magnet that is on only while current flows. In the 1830s Joseph Henry and
        others used one to build the <strong>relay</strong>: the electromagnet pulls a metal arm, and the arm closes the
        contacts of a <em>second</em> circuit. When the current stops, a spring pulls the arm back. Relays were first
        used to pass telegraph messages along very long lines.
      </p>
      <RelayLab />
      <p>
        This is the big idea: <strong>the output of one relay can power the coil of the next</strong>. Electricity
        controls a switch, which controls electricity, which controls another switch. Two relays in a row make AND. Two
        side by side make OR. A relay whose contact is closed when the arm is <em>up</em> (and opens when the magnet
        pulls) makes NOT. With those three you can build any rule at all, as <Link to="/logic-gates">Logic Gates</Link>{" "}
        will show.
      </p>
      <Callout kind="fact" title="A computer made of relays">
        <p>
          In 1941 in Berlin, Konrad Zuse finished the Z3, one of the first programmable computers. It used about 2,600
          relays and did about 5 steps per second. One multiplication took about 3 seconds. Telephone exchanges of the
          same time were full of relays too: you could hear them clicking as they connected calls.
        </p>
      </Callout>

      <h2>From clicks to picoseconds</h2>
      <p>
        Relays have one big problem: the arm is a real piece of metal with weight. It takes about 5 milliseconds to
        move, so a relay can flip at most about 200 times per second. The arm also wears out, and the contacts spark.
      </p>
      <p>
        The next step was the <strong>vacuum tube</strong>: a glass bulb with the air pumped out. A hot wire inside
        throws out electrons, and a voltage on a small wire mesh lets them through or stops them. Nothing moves except
        electrons, so a tube can switch in about 1 microsecond. ENIAC (1945) used about 17,500 tubes, filled a large
        room and used 150 kilowatts. Tubes were also hot, and they burned out like light bulbs.
      </p>
      <p>
        A modern <strong>transistor</strong> switches in about 10 picoseconds. You saw why in this chapter: it only has
        to fill a tiny bucket of a few thousand electrons through a short path.
      </p>
      <Callout kind="math" title="How much faster?">
        <TeX block>{tex`\frac{5\ \text{ms}}{10\ \text{ps}} = \frac{5 \times 10^{-3}\ \text{s}}{10^{-11}\ \text{s}} = 5 \times 10^{8} = 500\ \text{million times faster}`}</TeX>
        <p>
          If one transistor flip took 1 second, one relay flip would take 500 million seconds: almost 16 years.
        </p>
      </Callout>
      <p>
        The transistor is a relay with no moving parts. The voltage on its gate does the job of the magnet, and a thin
        layer of electrons in the silicon does the job of the metal arm. How that works is the subject of the next
        chapter, <Link to="/transistor">The Transistor</Link>.
      </p>

      <KeyIdeas
        items={[
          <>
            <strong>Current</strong> is charge passing a point each second. 1 A = 1 coulomb per second, about{" "}
            <TeX>{"6.24 \\times 10^{18}"}</TeX> electrons per second. It only flows around a <strong>closed loop</strong>.
          </>,
          <>
            <strong>Voltage</strong> is a push, always measured between two points. <strong>Ground</strong> is the
            point we call 0 V. In a chip, a 1 is a wire near the supply (about 1 V) and a 0 is a wire near ground.
          </>,
          <>
            <strong>Ohm's law</strong>: <TeX>{"V = I \\times R"}</TeX>. In series, resistances add; in parallel, the
            current splits. Switches in series make AND, switches side by side make OR.
          </>,
          <>
            <strong>Power</strong>: <TeX>{"P = V \\times I"}</TeX>, in watts. A 125 W chip at 1.2 V needs about 104 A.
          </>,
          <>
            Every wire and gate is a tiny <strong>capacitor</strong> (<TeX>{"Q = C \\times V"}</TeX>). Filling it
            through a resistance takes time <TeX>{"\\tau = R \\times C"}</TeX>: 10 kΩ × 1 fF = 10 ps. The clock must
            wait for it, and each flip turns <TeX>{"C \\times V^2"}</TeX> of energy into heat.
          </>,
          <>
            A <strong>relay</strong> is a switch flipped by electricity. A transistor does the same job with no moving
            parts, about 500 million times faster.
          </>,
        ]}
      />
    </>
  );
}
