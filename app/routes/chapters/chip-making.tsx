import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { CodeToCells, MetalFloors, MooresLaw, PrintLayerWidget, SandToWafer, WaferYield } from "~/widgets/chip-making";

export const meta = () => chapterMeta("chip-making");

export default function ChipMaking() {
  return (
    <>
      <p>
        In the last few chapters you built a computer out of ideas. Transistors make gates, gates make adders and
        memory, and a clock and a control unit turn them into a <Link to="/cpu">CPU</Link>. But the CPU in your phone has
        about <strong>20 billion</strong> transistors on a piece of silicon smaller than your fingernail. How do people
        actually <em>make</em> that?
      </p>
      <p>
        Not by hand. If someone placed one transistor every second, day and night, 20 billion would take them more than
        600 years. Instead, a factory <strong>prints</strong> them, using light, a little like printing a photograph.
        Every transistor in one layer is printed at the same moment. Then the factory prints the next layer on top, and the
        next, many times over. This chapter follows a chip from a pile of sand to the part you can hold in your hand. Then
        it looks at the math that decides how much a chip costs, and why the number of transistors keeps growing.
      </p>

      <h2>From sand to wafer</h2>
      <p>
        Ordinary sand is mostly <strong>silicon dioxide</strong>: silicon atoms joined to oxygen atoms. Heat it with
        carbon and the oxygen is pulled away, which leaves rough silicon. Then chemists clean it again and again, until
        it is <strong>99.9999999%</strong> pure. People in the industry call this “nine nines”.
      </p>
      <Callout kind="math" title="How pure is “nine nines”?">
        <TeX block>{tex`100\% - 99.9999999\% = 0.0000001\% = \frac{1}{1{,}000{,}000{,}000}`}</TeX>
        <p>
          So at most 1 atom in a billion is something other than silicon. Imagine all 8 billion people on Earth as
          atoms. At this purity, only
        </p>
        <TeX block>{tex`8{,}000{,}000{,}000 \times \frac{1}{1{,}000{,}000{,}000} = 8`}</TeX>
        <p>
          of them would be “wrong”. Why so pure? In <Link to="/transistor">The Transistor</Link> we changed silicon on
          purpose by adding about 1 foreign atom per million (doping). The factory wants to put those atoms in exactly
          the right places, so the starting silicon must have about 1,000 times fewer foreign atoms by accident.
        </p>
      </Callout>
      <p>
        Next, the pure silicon is melted at 1,414 °C. A small piece of perfect crystal, the <em>seed</em>, is dipped into
        the liquid and pulled up very slowly while it turns. The silicon atoms freeze onto the seed in the same neat
        pattern, so the result is <strong>one single crystal</strong>: a cylinder about 30 cm across in which every atom
        sits in the same grid. A perfect grid matters because electrons move smoothly through it. A boundary between two
        crystals would disturb the transistors built on top.
      </p>
      <p>
        A saw made of thin wire slices the cylinder into discs called <strong>wafers</strong>. A standard wafer is 300 mm
        across and about 0.8 mm thick, polished until it is flatter than a mirror. Each chip-to-be on the wafer is
        called a <strong>die</strong> (plural: dies).
      </p>
      <SandToWafer />
      <Callout kind="math" title="How many chips fit on one wafer?">
        <p>The wafer is a circle with a radius of 150 mm, so its area is</p>
        <TeX block>{tex`\pi r^2 = 3.1416 \times 150^2 \approx 70{,}686 \text{ mm}^2 \approx 707 \text{ cm}^2`}</TeX>
        <p>
          A die of 1 cm × 1 cm is 100 mm². Dividing gives 70,686 ÷ 100 ≈ 707, but square dies do not fill a round
          edge: the squares that stick out past the edge are wasted. Counting only the whole squares gives{" "}
          <strong>657 dies</strong>. You can see them in the wafer figure later in this chapter.
        </p>
      </Callout>

      <h2>Printing with light</h2>
      <p>
        Now we need to draw billions of tiny shapes on the wafer. The method mixes two ideas you already know:
      </p>
      <ul>
        <li>
          A <strong>stencil</strong>: spray paint through a card with holes cut in it, and paint lands only where the
          holes are.
        </li>
        <li>
          A <strong>photograph</strong>: light changes a special chemical, and afterwards you can see where the light
          landed.
        </li>
      </ul>
      <p>
        The stencil is called a <strong>mask</strong>: a plate of glass with a pattern of chrome on it. Chrome blocks
        light; the clear glass lets it through. The light-sensitive chemical is called <strong>photoresist</strong>, or
        just <strong>resist</strong>. The whole method is called <strong>photolithography</strong>, from Greek words
        meaning “writing on stone with light”. Each layer of the chip goes around the same loop:
      </p>
      <ol>
        <li>
          <strong>Coat</strong> the wafer with a thin film of resist.
        </li>
        <li>
          <strong>Expose</strong>: shine ultraviolet light through the mask. Where the light lands, the resist changes.
        </li>
        <li>
          <strong>Develop</strong>: wash the wafer. The changed resist dissolves, leaving openings shaped like the
          mask's holes.
        </li>
        <li>
          Change the wafer, but only in the openings. Either <strong>dope</strong> it (fire in atoms that turn silicon
          n-type or p-type), <strong>etch</strong> it (eat material away with chemicals or a gas), or{" "}
          <strong>deposit</strong> (lay down a thin film of new material).
        </li>
        <li>
          <strong>Strip</strong> off the leftover resist, and start again with the next mask.
        </li>
      </ol>
      <p>
        Try it. Four masks are enough to print the 4-transistor NAND gate from <Link to="/logic-gates">Logic Gates</Link>
        . Watch the side view too: it shows the layers piling up.
      </p>
      <PrintLayerWidget />
      <p>
        Look at what the masks did. Nobody placed a transistor anywhere. A transistor simply <em>appeared</em> wherever a
        gate stripe (mask 3) crossed a gap between two islands (masks 1 and 2). The pattern on the masks decides
        everything. And because the light falls on the whole pattern at once, printing a layer with a billion shapes
        takes about as long as printing one with ten.
      </p>
      <Callout kind="fact">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            A modern chip needs about <strong>60 to 80 masks</strong>, sometimes more, so the wafer goes around the loop
            dozens of times.
          </li>
          <li>
            From bare wafer to finished chips takes about <strong>3 months</strong> in the factory.
          </li>
          <li>
            The printing machine does not light up the whole wafer in one flash. It flashes an area about the size of
            one or a few dies, steps to the next spot, and flashes again: roughly a hundred flashes cover a wafer.
          </li>
        </ul>
      </Callout>
      <GoDeeper title="Real factories print the gate before the islands">
        <p>
          Our widget dopes the islands first and adds the gates afterwards. That is how the very first chips were made,
          and it is easy to follow. But it has a problem: the gate must land <em>exactly</em> over the gap between two
          islands. If the gate mask is shifted by a few nanometres, the transistor is ruined.
        </p>
        <p>
          Since the late 1960s factories do it the other way around. They print the gate first, and then dope the
          islands. The gate itself blocks the dopant atoms, like an extra stencil, so the channel under the gate stays
          undoped and the islands end exactly at the gate's edges. This trick is called a <strong>self-aligned gate</strong>
          . Our side view would look the same at the end; only the order of the steps changes.
        </p>
      </GoDeeper>

      <h2>Light with a tiny wavelength</h2>
      <p>
        Light is a wave. The distance from one wave crest to the next is its <strong>wavelength</strong>. Visible light
        has a wavelength of about 400 to 700 nanometres (nm; a nanometre is a millionth of a millimetre). Here is the
        problem: light blurs at the edges of a shadow, and you cannot easily print details much smaller than the
        wavelength of the light you print with. It is like painting with a brush: you cannot paint a line thinner than
        your brush.
      </p>
      <p>
        On a modern chip, neighbouring transistor gates are only about <strong>48 nm</strong> apart. That spacing is
        called the <strong>pitch</strong>. So the light has to be very, very short:
      </p>
      <DataTable
        align="left"
        head={["light", "wavelength", "compared with a 48 nm pitch"]}
        rows={[
          ["visible (green)", "about 530 nm", "about 11× too long: hopeless"],
          ["deep ultraviolet (DUV)", "193 nm", "4× too long: only works with clever tricks"],
          ["extreme ultraviolet (EUV)", "13.5 nm", "shorter than the pitch: works in one flash"],
        ]}
      />
      <p>
        With deep-ultraviolet light, factories use tricks. They put a thin layer of water between the lens and the
        wafer, which lets the lens focus more sharply. They also print one layer in two to four separate passes, each
        pass placing only some of the lines. This works, but every extra pass costs time and money and adds chances for
        mistakes. <strong>Extreme ultraviolet (EUV)</strong> light is 193 ÷ 13.5 ≈ 14 times shorter, so it can print
        these patterns directly.
      </p>
      <Callout kind="math" title="How small is a 48 nm gap?">
        <p>
          Silicon atoms sit about 0.235 nm apart. Across a 48 nm gap there are only
        </p>
        <TeX block>{tex`\frac{48 \text{ nm}}{0.235 \text{ nm}} \approx 204 \text{ atoms}`}</TeX>
        <p>
          The factory is drawing shapes that are a couple of hundred atoms wide, on a disc 300 mm across, and every one
          of the dozens of layers has to line up with the layers below to within a few nanometres.
        </p>
      </Callout>
      <GoDeeper title="How fine can light draw? The Rayleigh rule">
        <p>Engineers use a simple rule for the smallest half-pitch (half the distance from line to line) a lens can print:</p>
        <TeX block>{tex`\text{smallest half-pitch} \approx k_1 \cdot \frac{\lambda}{NA}`}</TeX>
        <ul>
          <li>
            <TeX>{"\\lambda"}</TeX> (the Greek letter lambda) is the wavelength of the light.
          </li>
          <li>
            <TeX>{"NA"}</TeX> (numerical aperture) says how wide a cone of light the lens can gather. Bigger is sharper.
          </li>
          <li>
            <TeX>{"k_1"}</TeX> is a measure of how clever the process is. In practice it is about 0.3.
          </li>
        </ul>
        <p>Deep UV with water under the lens (λ = 193 nm, NA = 1.35):</p>
        <TeX block>{tex`0.3 \times \frac{193}{1.35} \approx 43 \text{ nm} \;\Rightarrow\; \text{pitch} \approx 86 \text{ nm}`}</TeX>
        <p>EUV with mirrors (λ = 13.5 nm, NA = 0.33):</p>
        <TeX block>{tex`0.3 \times \frac{13.5}{0.33} \approx 12 \text{ nm} \;\Rightarrow\; \text{pitch} \approx 25 \text{ nm}`}</TeX>
        <p>
          So one deep-UV flash can print lines about 86 nm apart, which is not enough for a 48 nm pitch. That is why it
          needs several passes. One EUV flash can reach about 25 nm.
        </p>
      </GoDeeper>
      <GoDeeper title="How do you make 13.5 nm light?">
        <p>
          No lamp makes EUV light, so the machine makes its own. Tiny droplets of molten tin fly through a vacuum
          chamber, about <strong>50,000 droplets every second</strong>. A powerful laser hits each droplet twice: a weak
          pulse flattens it into a little pancake, and a strong pulse turns it into a glowing gas (a <em>plasma</em>)
          hotter than the surface of the Sun. That plasma gives off EUV light.
        </p>
        <p>
          EUV light is absorbed by almost everything, even air and glass. So the whole light path is in a vacuum, and
          there are no lenses. Instead the light is steered by curved <strong>mirrors</strong>, each made of dozens of
          very thin alternating layers of two materials (molybdenum and silicon). Even the best of these mirrors reflects
          only about 70% of the light. With about ten mirrors in the path:
        </p>
        <TeX block>{tex`0.7^{10} \approx 0.028`}</TeX>
        <p>
          Only about 3% of the light reaches the wafer, which is why the source must be so strong. A single EUV machine
          is as big as a bus, costs well over 100 million dollars, and only one company in the world builds them (ASML,
          in the Netherlands).
        </p>
      </GoDeeper>

      <h2>Many floors of wiring</h2>
      <p>
        Billions of transistors are useless until they are connected. So after the transistors are finished, the factory
        builds the wiring <em>on top</em> of them. It lays down a layer of glass (an insulator), cuts trenches and holes
        into it, fills them with copper, and polishes the surface flat. Then it does the same again for the next floor.
        A modern chip has <strong>10 to 20 floors</strong> of copper wire. Short vertical plugs called{" "}
        <strong>vias</strong> join one floor to the next.
      </p>
      <MetalFloors />
      <Callout kind="analogy">
        <p>
          Think of a city where the houses (transistors) are all on the ground, and the roads are built on many levels
          above them, like stacked motorways. Vias are the ramps between levels. Roads on different levels can cross
          without meeting, and that is the whole point.
        </p>
      </Callout>
      <p>
        Why so many floors? On one floor, two wires cannot cross: they would touch and short-circuit. You saw this in
        the NAND widget, where the output wire had to cross gate B and was kept apart by glass. With billions of
        connections, you need many floors so that wires can pass over and under each other.
      </p>
      <p>
        The floors are not all the same. The lowest floors have the thinnest wires, packed tightly, for short hops between
        neighbouring gates. Higher floors have thicker wires for long distances and for carrying power across the chip.
        Thicker is better for long wires because a wire's resistance falls as its cross-section grows: a wire twice as
        wide and twice as tall has <TeX>{"2 \\times 2 = 4"}</TeX> times the area, so only a quarter of the resistance.
      </p>

      <h2>Nobody draws 20 billion transistors</h2>
      <p>
        Masks with billions of shapes are not drawn by hand. Engineers write <em>code</em> that describes what the circuit
        should do, in a <strong>hardware description language</strong> (HDL) such as Verilog. Here is the whole full
        adder from <Link to="/adder">The Adder</Link>:
      </p>
      <pre>
        <code>{`assign sum  = a ^ b ^ cin;
assign cout = (a & b) | (cin & (a ^ b));`}</code>
      </pre>
      <p>Then a chain of design programs turns the code into masks:</p>
      <ol>
        <li>
          <strong>Synthesis</strong> turns the code into a network of logic gates.
        </li>
        <li>
          Each gate is replaced by a <strong>standard cell</strong>: a ready-made, tested layout for one gate (NAND, NOR,
          XOR, flip-flop and so on), drawn once by experts, just like the NAND you printed. A cell library has a few
          hundred to a few thousand of them.
        </li>
        <li>
          <strong>Placement</strong> puts millions of cells into neat rows.
        </li>
        <li>
          <strong>Routing</strong> draws the wires on the metal floors to connect them.
        </li>
      </ol>
      <CodeToCells />
      <Callout kind="idea" title="But how does the software know where to put things?">
        <p>
          It follows rules and tries many options. The cell library tells it the size of each cell, where its pins are
          and how long its signal takes to pass through. The software tries arrangements that keep wires short, and it
          checks every path against the clock from <Link to="/clock">The Clock</Link>: each signal must arrive before
          the next tick. If a path is too slow, it moves cells closer, picks bigger and faster cells, or reports the
          problem to the engineers.
        </p>
      </Callout>
      <p>
        There is a second reason why 20 billion is less scary than it sounds: <strong>most of a chip is copies</strong>.
        A CPU core is designed once and placed 8 or 16 times. A graphics chip contains thousands of identical small
        cores. And a large share of a CPU is cache memory, which is one tiny cell repeated an enormous number of times.
      </p>
      <Callout kind="math" title="One cell, copied 268 million times">
        <p>
          A cache is made of SRAM, with 6 transistors per bit (see <Link to="/memory">Memory</Link>). A desktop CPU
          often has 32 MB of cache:
        </p>
        <TeX block>{tex`32 \times 1{,}048{,}576 \text{ bytes} \times 8 \;\tfrac{\text{bits}}{\text{byte}} = 268{,}435{,}456 \text{ bits}`}</TeX>
        <TeX block>{tex`268{,}435{,}456 \text{ bits} \times 6 \;\tfrac{\text{transistors}}{\text{bit}} \approx 1.6 \text{ billion transistors}`}</TeX>
        <p>
          That is 1.6 billion transistors from one 6-transistor design, copied about 268 million times.
        </p>
      </Callout>
      <p>
        Before anything is printed, the design is tested for months in simulation, on computers that pretend to be the
        new chip. That is worth it: a full set of masks for a modern chip costs many millions of dollars, and a mistake
        found after printing means making new masks.
      </p>

      <h2>Dust, defects and yield</h2>
      <p>
        A transistor is a few hundred atoms wide, and a speck of dust is thousands of times bigger. If a speck lands on
        the wafer during printing, the wires and transistors under it come out wrong. One broken transistor out of
        billions can be enough to make the chip give wrong answers. Any such flaw is called a <strong>defect</strong>.
      </p>
      <p>
        So chip factories are the cleanest places people build. The air is filtered all the time: a cubic metre of
        ordinary room air holds millions of dust specks, while the air around the wafers holds only a few. Workers wear
        full-body suits, wafers travel between machines in sealed boxes, and the printing rooms use yellow light,
        because yellow light does not affect the resist.
      </p>
      <p>
        Even so, some defects always land. The share of dies on a wafer that work is called the <strong>yield</strong>.
        If defects land at random, a simple formula predicts it:
      </p>
      <TeX block>{tex`Y = e^{-D \cdot A}`}</TeX>
      <ul>
        <li>
          <TeX>{"D"}</TeX> is the <strong>defect density</strong>: how many defects land on each cm² of wafer, on
          average. A good factory reaches about 0.1 per cm².
        </li>
        <li>
          <TeX>{"A"}</TeX> is the area of one die in cm².
        </li>
        <li>
          <TeX>{"D \\cdot A"}</TeX> is the average number of defects that land on one die.
        </li>
        <li>
          <TeX>{"e \\approx 2.718"}</TeX> is a special number that shows up whenever things happen at random. Your
          calculator has an <TeX>{"e^x"}</TeX> button.
        </li>
      </ul>
      <Callout kind="math" title="Small chip versus big chip">
        <p>
          <strong>A phone-sized chip</strong>, 1 cm × 1 cm, with <TeX>{"D = 0.1"}</TeX> per cm²:
        </p>
        <TeX block>{tex`Y = e^{-0.1 \times 1} = e^{-0.1} \approx 0.905 = 90.5\%`}</TeX>
        <p>
          With 657 dies on the wafer, about <TeX>{"657 \\times 0.905 \\approx 594"}</TeX> of them work.
        </p>
        <p>
          <strong>A big chip</strong>, 2 cm × 2 cm = 4 cm². Only 150 whole dies fit on the wafer, and
        </p>
        <TeX block>{tex`Y = e^{-0.1 \times 4} = e^{-0.4} \approx 0.670 = 67\%`}</TeX>
        <p>
          so only about <TeX>{"150 \\times 0.670 \\approx 100"}</TeX> of them work. A big die is more likely to be hit,
          and each hit throws away more silicon.
        </p>
      </Callout>
      <WaferYield />
      <GoDeeper title="Where does e^(−D·A) come from?">
        <p>
          Call the average number of defects per die <TeX>{"\\lambda = D \\cdot A"}</TeX>. Now cut the die, in your
          mind, into <TeX>{"n"}</TeX> tiny pieces. Each piece is hit with a small chance <TeX>{"\\lambda / n"}</TeX>, so
          it stays clean with chance <TeX>{"1 - \\lambda / n"}</TeX>. The die works only if <em>every</em> piece stays
          clean, so we multiply <TeX>{"n"}</TeX> of those chances together:
        </p>
        <TeX block>{tex`Y = \left(1 - \frac{\lambda}{n}\right)^{n}`}</TeX>
        <p>
          Try it with <TeX>{"\\lambda = 0.1"}</TeX>:
        </p>
        <DataTable
          head={["pieces n", "chance all clean"]}
          rows={[
            ["1", <TeX>{"0.9^{1} = 0.9"}</TeX>],
            ["10", <TeX>{"0.99^{10} \\approx 0.90438"}</TeX>],
            ["1,000", <TeX>{"0.9999^{1000} \\approx 0.90483"}</TeX>],
            ["e^(−0.1)", <TeX>{"\\approx 0.90484"}</TeX>],
          ]}
        />
        <p>
          The more pieces you cut, the closer the answer gets to <TeX>{"e^{-0.1}"}</TeX>. That limit is exactly what{" "}
          <TeX>{"e"}</TeX> means, and it is why the yield formula has an <TeX>{"e"}</TeX> in it. (Mathematicians call
          this a Poisson distribution.)
        </p>
      </GoDeeper>

      <h2>Big chips, chiplets and binning</h2>
      <p>The yield formula decides prices. Suppose one finished wafer costs the chip company $10,000:</p>
      <DataTable
        align="left"
        head={["", "small die (1 cm²)", "big die (4 cm²)"]}
        rows={[
          ["whole dies on the wafer", "657", "150"],
          ["yield", "90.5%", "67%"],
          ["good dies", "about 594", "about 100"],
          ["cost per good die", "$10,000 ÷ 594 ≈ $16.84", "$10,000 ÷ 100 ≈ $100"],
        ]}
      />
      <p>
        The big die has 4 times the area but costs about <strong>6 times</strong> as much. And the gap grows quickly as
        dies get bigger, because the yield shrinks exponentially. That is why the largest chips are so expensive, and it
        led to two clever ideas.
      </p>
      <p>
        <strong>Chiplets.</strong> Instead of one huge die, make several small ones and join them side by side inside
        one package, with very short wires between them. Four 1 cm² chiplets cost about 4 × $16.84 ≈ $67 instead of
        $100 for one 4 cm² die (joining them costs a little extra). Many AMD processors are built this way, Apple's M1
        Ultra is two dies joined together, and so is Nvidia's B200.
      </p>
      <p>
        <strong>Binning.</strong> Every die is tested. Suppose a design has 8 cores, and a defect has broken one of them.
        The chip is not thrown away: the broken core is switched off, and the chip is sold as a cheaper 6-core model.
        In the same way, dies that happen to run fast at a low voltage are sold as the top speed grade. Sorting chips
        into groups like this is called <strong>binning</strong>, because the chips are sorted into different “bins”.
        One company even goes the other way and uses a whole wafer as one giant chip, with spare cores to replace the
        ones that defects break.
      </p>
      <GoDeeper title="From die to the chip you can hold">
        <ol>
          <li>
            <strong>Wafer test.</strong> A probe card with thousands of tiny needles touches each die on the wafer and
            runs quick tests. Bad dies are marked.
          </li>
          <li>
            <strong>Dicing.</strong> A thin diamond saw (or a laser) cuts the wafer into separate dies.
          </li>
          <li>
            <strong>Packaging.</strong> Each good die is flipped over and joined to a small circuit board, the{" "}
            <em>package</em>, through thousands of tiny solder balls. The package spreads those connections out to pins
            or balls big enough to solder onto a motherboard.
          </li>
          <li>
            <strong>Heat spreader.</strong> A metal lid goes on top to carry heat from the die to the cooler.
          </li>
          <li>
            <strong>Final test and binning.</strong> Each finished chip is tested again, at different speeds and
            temperatures, and sorted into its model.
          </li>
        </ol>
        <p>The square “chip” you can see on a circuit board is mostly package. The die inside is often much smaller.</p>
      </GoDeeper>

      <h2>Moore's law</h2>
      <p>
        In 1965 an engineer named Gordon Moore (who later co-founded Intel) noticed that the number of transistors on a
        chip was doubling every year. In 1975 he changed his estimate to <strong>every two years</strong>. It is not a law
        of nature, like gravity. It is an observation that the whole industry then used as a plan: every company knew
        roughly what everyone else would make next, and worked to keep up.
      </p>
      <Callout kind="math" title="Doubling, 26 times">
        <p>
          The first microprocessor, the Intel 4004 from 1971, had 2,300 transistors. Doubling every 2 years means
        </p>
        <TeX block>{tex`N(\text{year}) = 2{,}300 \times 2^{(\text{year} - 1971)/2}`}</TeX>
        <p>
          From 1971 to 2023 is 52 years, which is 26 doublings:
        </p>
        <TeX block>{tex`2{,}300 \times 2^{26} = 2{,}300 \times 67{,}108{,}864 \approx 154 \text{ billion}`}</TeX>
        <p>
          The biggest chips of 2023 really did have between about 100 and 200 billion transistors. AMD's MI300X, from
          that year, has about 153 billion. A simple rule from the 1970s predicted it almost exactly.
        </p>
      </Callout>
      <p>
        Doubling every 2 years adds up fast: every 10 years it is <TeX>{"2^5 = 32"}</TeX> times more. To fit such huge
        changes on one chart, the chart below uses a <strong>log scale</strong>: each grid line is 10 times the one
        below it, not 10 more. On a log scale, steady doubling becomes a straight line.
      </p>
      <MooresLaw />
      <p>
        The dashed line follows the <em>biggest</em> chips of each time quite well. Chips for phones sit below it on
        purpose: a phone has little room for a big die, little battery power, and little space for heat, so its chip is
        kept small and cheap.
      </p>

      <h2>Why the shrinking is slowing</h2>
      <p>
        For decades, each new factory generation made transistors smaller, so more fit on the same area, and each one
        also became faster and used less power. That has become much harder:
      </p>
      <ul>
        <li>
          <strong>Atoms do not shrink.</strong> The gaps are already only about 200 atoms wide, and the thinnest parts of
          a transistor are just a few nanometres. When a barrier is only a few atoms thick, some electrons slip straight
          through it, so the switch leaks current even when it is off, and the chip gets hot.
        </li>
        <li>
          <strong>The names stopped meaning sizes.</strong> Factories in the mid-2020s make chips called “3 nm” and
          “2 nm”, but these are just names for new generations. No part of those transistors is actually 2 nm long.
        </li>
        <li>
          <strong>It costs much more.</strong> A new leading-edge factory costs tens of billions of dollars, and each
          step forward needs more masks and more machines.
        </li>
      </ul>
      <p>
        So engineers now also grow <em>upwards</em> and <em>outwards</em>: transistors whose gate wraps all the way
        around the channel to control it better, memory dies stacked on top of logic dies, and chiplets joined side by
        side. Transistor counts still grow, but each step comes more slowly and costs more. Whatever happens next, the
        idea at the bottom stays the same as in the widget you played with: a pattern, printed with light, layer after
        layer, all the transistors at once.
      </p>

      <KeyIdeas
        items={[
          <>
            Chips start as sand, purified to <strong>nine nines</strong>, grown into one crystal and sliced into 300 mm
            wafers. Each wafer holds hundreds of dies.
          </>,
          <>
            <strong>Photolithography</strong> repeats one loop per layer: coat with resist, expose through a mask,
            develop, then dope, etch or deposit, then strip. A chip needs 60–80+ masks.
          </>,
          <>
            Light cannot print details much smaller than its wavelength, so modern chips use <strong>EUV</strong> light
            with a wavelength of 13.5 nm.
          </>,
          <>
            Transistors sit at the bottom; <strong>10–20 floors</strong> of copper wire above them, joined by vias, let
            wires cross without touching.
          </>,
          <>
            Engineers write <strong>code</strong>; software turns it into gates, standard cells, placed rows and routed
            wires. Much of a chip is copies of a few designs.
          </>,
          <>
            Yield <TeX>{"Y = e^{-D \\cdot A}"}</TeX> falls fast as dies get bigger, which makes big chips expensive and
            explains <strong>chiplets</strong> and <strong>binning</strong>.
          </>,
          <>
            <strong>Moore's law</strong>: transistor counts doubled about every 2 years, from 2,300 in 1971 to over 100
            billion today. It is slowing because atoms do not shrink.
          </>,
        ]}
      />
    </>
  );
}
