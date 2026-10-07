import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas, Steps } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import {
  AddressMap,
  BeTheMonitor,
  GammaCurve,
  LinkCalc,
  MouseSensor,
  PanelDrivers,
  PollVsInterrupt,
  SoundSampler,
  TouchGrid,
  UartFrame,
  Voltmeter,
} from "~/widgets/input-output";

export const meta = () => chapterMeta("input-output");

export default function InputOutput() {
  return (
    <>
      <p>
        Everything so far has happened inside the machine: a CPU reading and writing numbers in memory. But you don't
        live inside RAM. You press keys, touch glass, look at a screen and listen to music. So how do bytes physically
        get <em>into</em> the CPU, and back <em>out</em> as light and sound? And the question many readers ask: when
        the computer has the binary for the letter A, how does the monitor know it means “A”? The short answer
        surprises people: <strong>it doesn't</strong>. In this chapter we follow the wires and see how a monitor turns
        a stream of plain numbers into light without knowing anything about letters, and how keyboards, mice, touch
        screens, microphones and speakers turn the real world into numbers and back.
      </p>
      <p>
        In <Link to="/bits-meaning">Who Decides What Bits Mean?</Link> we followed an A from your finger to the{" "}
        <strong>framebuffer</strong>, the block of memory that holds the colour of every pixel. A font turned the
        number 65 into pixel colours, and from then on the A was gone. This chapter picks up the story there, at the
        cable.
      </p>

      <h2>The CPU has no “draw” instruction</h2>
      <p>
        Look at the instructions of any CPU, including the SAP-8 from <Link to="/cpu">The CPU</Link>: load, store,
        add, jump, compare. There is no “draw a pixel”, no “beep”, no “read the keyboard”. A CPU can only do one thing
        with the outside world: <strong>read or write a byte at an address</strong>. So engineers use a trick. They
        make some addresses lead to a device instead of to RAM.
      </p>
      <p>
        Every device has a few tiny storage places of its own, called <strong>device registers</strong>. Think of them
        as mailboxes. Most devices have three kinds:
      </p>
      <ul>
        <li>
          a <strong>status</strong> mailbox, which the device fills: “I have a new key for you” or “I am busy”;
        </li>
        <li>
          a <strong>command</strong> mailbox, which the CPU fills: “start printing”, “switch the light on”;
        </li>
        <li>
          a <strong>data</strong> mailbox, which holds the byte itself: the key code, or the next byte to send.
        </li>
      </ul>
      <p>
        In <Link to="/memory">Memory</Link> we met the <strong>address decoder</strong>: a circuit that looks at the
        address wires and switches on exactly one row of RAM. Here we use the same idea one level up. A decoder looks
        at the top address bits and decides which <em>chip</em> answers. If the address falls in the RAM part, RAM
        answers. If it falls in the device part, a device's mailbox answers. This is called{" "}
        <strong>memory-mapped I/O</strong> (I/O means input/output). Here is the map of a small 64 KB toy computer:
      </p>
      <DataTable
        align="left"
        head={["address", "goes to", "size"]}
        rows={[
          [<code>0x0000–0xDFFF</code>, "RAM", "56 KB"],
          [<code>0xE000–0xEFFF</code>, "ROM: the start-up program", "4 KB"],
          [<code>0xF000</code>, "keyboard data (the key code)", "1 byte"],
          [<code>0xF001</code>, "keyboard status (1 = a new key is waiting)", "1 byte"],
          [<code>0xF100–0xF107</code>, "screen: 8 rows of 8 LEDs, one bit per LED", "8 bytes"],
        ]}
      />
      <p>
        How does the decoder recognise the device page? Look at the addresses in binary.{" "}
        <code>0xF000</code> is <code>1111 0000 0000 0000</code>. Every address from <code>0xF000</code> to{" "}
        <code>0xFFFF</code> starts with four 1s, and no other address does. So one AND gate is enough:
      </p>
      <TeX block>{tex`\text{I/O select} = A_{15} \cdot A_{14} \cdot A_{13} \cdot A_{12}`}</TeX>
      <p>
        Here <TeX>{"A_{15}"}</TeX> is the top address wire and the dot means AND (from{" "}
        <Link to="/logic-gates">Logic Gates</Link>). Try it: write a byte to the screen, read the keyboard, write to
        ROM and watch it refuse.
      </p>
      <AddressMap />
      <Callout kind="math" title="How big is the device page?">
        <p>
          The top 4 bits are fixed at 1111. The other 12 bits can be anything, so the page holds
        </p>
        <TeX block>{tex`2^{12} = 4{,}096 \text{ addresses} \qquad (\texttt{0xF000} \text{ to } \texttt{0xFFFF})`}</TeX>
        <p>
          That is <TeX>{"4{,}096 / 65{,}536 = 1/16"}</TeX> of the address space. RAM gets{" "}
          <TeX>{"0\\text{xE000} = 57{,}344"}</TeX> bytes, which is 56 × 1,024 = 56 KB.
        </p>
      </Callout>
      <p>
        To the CPU, “store 0x3C at 0xF102” is exactly the same instruction as storing into RAM. Nothing in the CPU
        knows that a screen is out there. The only difference is where the wires lead. Real machines do the same:
      </p>
      <ul>
        <li>
          The <em>nand2tetris</em> teaching computer puts its screen at addresses 16384–24575. That is 8,192 words of
          16 bits = 131,072 bits, one bit per pixel of a 512 × 256 screen.
        </li>
        <li>
          Ben Eater's breadboard 6502 computer puts its input/output chip at address <code>0x6000</code>.
        </li>
        <li>
          Your laptop's graphics card, network chip and SSD also have their mailboxes at addresses in a huge address
          space.
        </li>
      </ul>
      <p>
        The SAP-8 CPU has a special <code>OUT</code> instruction that copies register A to its one display. That is a
        one-device version of the same idea. A CPU cannot have a special instruction for every device that will ever
        be invented, so real CPUs reuse load and store.
      </p>

      <h3>Drivers: knowing the mailboxes</h3>
      <p>
        Every device model has its own map: which address is the status mailbox, which bit means “ready”, which number
        means “start”. One printer might want the number 1 written at its command address. Another might want 0x80 at
        a different address. A <strong>driver</strong> is the small program that knows one device's map. That is why a
        new printer often needs a new driver: the CPU and the operating system are the same, but the mailboxes are
        different. Drivers are part of the <Link to="/operating-system">operating system</Link>.
      </p>
      <p>
        Some device families agreed on one shared map. Every USB keyboard follows the same “keyboard class” rules, so
        one driver works for all of them. That is why you can plug in any keyboard and it just works.
      </p>
      <GoDeeper title="Another way: I/O ports on x86">
        <p>
          Intel's x86 CPUs also have a second, separate set of addresses just for devices, called{" "}
          <strong>ports</strong>, with two special instructions: <code>IN</code> (read a port) and <code>OUT</code>{" "}
          (write a port). An extra wire on the bus tells the chips “this address is a port, not memory”. On old PCs the
          keyboard controller lived at port <code>0x60</code>: the instruction <code>IN AL, 0x60</code> read the last
          key code. Today almost all new devices use memory-mapped I/O, but the ports are still there for old
          programs.
        </p>
      </GoDeeper>

      <h2>Getting the CPU's attention</h2>
      <p>
        A key arrives whenever <em>you</em> decide to press it. The CPU has no idea when that will be. How does it find
        out? There are two answers.
      </p>
      <p>
        <strong>Polling</strong> means asking again and again. The CPU runs a small loop: read the status mailbox; if
        it is 0, go back and read it again; if it is 1, read the data mailbox. In the toy assembly language of{" "}
        <Link to="/machine-code">Machine Code</Link> it looks like this:
      </p>
      <pre className="not-prose scroll-thin overflow-x-auto rounded-md border border-line bg-panel px-4 py-3 font-mono text-sm leading-relaxed text-ink">
        <code>{`wait: LDA 0xF001   ; read the keyboard status
      JZ  wait     ; 0 means nothing yet: ask again
      LDA 0xF000   ; 1 means a key is waiting: read its code`}</code>
      </pre>
      <p>
        Polling is simple, but most of the questions get the answer “no”. <strong>Interrupts</strong> turn it around:
        the device tells the CPU. It has a wire, the <strong>interrupt request</strong> line, that goes straight into
        the CPU's control unit. When the device has news, it pulls that wire to 1. Then:
      </p>
      <Steps>
        {[
          <>The CPU finishes the instruction it is doing now.</>,
          <>
            It pushes the program counter and the flags onto the stack, exactly like a function call in{" "}
            <Link to="/functions">Functions & the Stack</Link>. Now it can find its way back.
          </>,
          <>
            It looks up the device's number in the <strong>vector table</strong>, a small table in memory whose entry k
            holds the address of the code for device k. That code is called the <strong>interrupt handler</strong>.
          </>,
          <>It jumps there and runs the handler, which reads the data mailbox (the key code) and stores it.</>,
          <>A special return instruction pops the flags and the program counter. The interrupted program continues as if nothing happened.</>,
        ]}
      </Steps>
      <p>
        So an interrupt is a <strong>function call made by hardware</strong>. The program never asked for it, but the
        stack makes it safe. Compare the two:
      </p>
      <PollVsInterrupt />
      <Callout kind="math" title="How much polling is wasted?">
        <p>
          Say the CPU checks the keyboard 1,000 times a second, and you type 5 keys a second (a fast typist). Only 5
          checks find a key:
        </p>
        <TeX block>{tex`\frac{1{,}000 - 5}{1{,}000} = \frac{995}{1{,}000} = 99.5\% \text{ of the checks are wasted}`}</TeX>
        <p>
          Checking less often wastes less, but then a key can wait longer. At 10 checks a second, a key waits up to{" "}
          <TeX>{"1/10 \\text{ s} = 100 \\text{ ms}"}</TeX>, which you would feel. One check is cheap, but a computer has
          dozens of devices, and a CPU that is always checking can never go to sleep to save battery.
        </p>
      </Callout>

      <h3>DMA: let the device copy</h3>
      <p>
        Interrupts are perfect for small news like a key. But what about a 3 MB photo coming from the SSD? Copying it
        through the CPU would mean about 3,000,000 loads and 3,000,000 stores. Instead, many devices can write into RAM
        by themselves. This is called <strong>DMA</strong>, direct memory access. The CPU writes a few numbers into the
        SSD controller's mailboxes, “copy these blocks, to RAM address X, this many bytes, go!”, and goes back to
        other work. The SSD controller copies the bytes straight into RAM and raises <em>one</em> interrupt at the end:
        “done”. The CPU gives about 4 instructions instead of millions.
      </p>

      <h2>The wires between: buses</h2>
      <p>
        A <strong>bus</strong> is a set of wires, plus the rules for using them, that carries bytes between chips. There
        are two basic designs:
      </p>
      <ul>
        <li>
          <strong>Parallel</strong>: 8 data wires side by side, one whole byte per clock tick. Old printer cables
          worked like this.
        </li>
        <li>
          <strong>Serial</strong>: one wire (or one pair), one bit after another.
        </li>
      </ul>
      <p>
        Parallel looks 8 times faster, yet almost every fast link today is serial. The reason is timing. At high speed,
        8 wires never arrive at exactly the same moment: one is a little longer, one picks up a little noise. The bits
        of one byte drift apart, and the receiver mixes up bits from different bytes.
      </p>
      <Callout kind="math" title="Why a centimetre matters">
        <p>
          A fast link sends 16 billion bits per second on one wire pair. One bit lasts
        </p>
        <TeX block>{tex`\frac{1}{16 \times 10^{9}} \text{ s} = 62.5 \text{ ps (picoseconds)}`}</TeX>
        <p>
          Signals on a circuit board travel about 15 cm per nanosecond, so in 62.5 ps a bit moves only about{" "}
          <TeX>{"15 \\times 0.0625 \\approx 0.94"}</TeX> cm. If one wire of a parallel bus were 1 cm longer than the
          others, its bit would arrive a whole bit late. With a single serial pair there is nothing to drift apart.
        </p>
      </Callout>
      <p>
        Fast serial links use a <strong>differential pair</strong>: two wires side by side that always carry opposite
        voltages. The receiver looks only at the <em>difference</em> between them. Noise from outside usually hits
        both wires equally, so it cancels out.
      </p>
      <p>
        The simplest serial link is the <strong>UART</strong> (universal asynchronous receiver-transmitter), the
        “serial port”. It has no clock wire at all. Both sides agree on the speed in advance, measured in{" "}
        <strong>baud</strong> (here, bits per second). The receiver waits for the start bit, then reads each bit in the
        middle of its time slot. Notice the idea: <em>the position in time tells the receiver what each bit means</em>.
        We will meet it again in the monitor.
      </p>
      <UartFrame />
      <DataTable
        align="left"
        head={["link", "wires for data", "speed", "about"]}
        rows={[
          ["UART at 9,600 baud", "1 wire each way", "9,600 bit/s", "960 bytes/s"],
          ["USB 2.0", "1 pair (both ways, taking turns)", "480 Mbit/s", "60 MB/s"],
          ["PCIe 4.0, 1 lane", "1 pair each way", "16 GT/s", "1.97 GB/s each way"],
          ["PCIe 4.0 ×16 (graphics card)", "16 pairs each way", "16 × 16 GT/s", "31.5 GB/s each way"],
        ]}
      />
      <Callout kind="math" title="From wire speed to bytes">
        <p>
          <strong>UART:</strong> each byte needs 1 start + 8 data + 1 stop = 10 bits, so
        </p>
        <TeX block>{tex`9{,}600 \tfrac{\text{bits}}{\text{s}} \div 10 \tfrac{\text{bits}}{\text{byte}} = 960 \tfrac{\text{bytes}}{\text{s}}`}</TeX>
        <p>
          <strong>PCIe 4.0:</strong> “GT/s” means billions of transfers (bits on the wire) per second. Every 128 data
          bits travel with 2 extra bits that mark where each block starts (“128b/130b”), so
        </p>
        <TeX block>{tex`16 \times 10^9 \times \tfrac{128}{130} \div 8 \approx 1.97 \text{ GB/s per lane}, \qquad 16 \text{ lanes} \approx 31.5 \text{ GB/s}`}</TeX>
        <p>That is about 33 million times faster than the 9,600-baud serial port.</p>
      </Callout>
      <p>
        Even the fastest buses end in the same place: mailboxes at addresses, interrupts, and DMA. A graphics card is
        “just” a device with a lot of mailboxes and a lot of memory.
      </p>

      <h2>Keyboard and mouse</h2>
      <p>
        A keyboard is a tiny computer of its own. Its chip scans a grid of key switches about 1,000 times a second (you
        can watch it in <Link to="/calculator">Scene: Pressing 2 + 3</Link>). When a key goes down, it sends a code for
        the key's <em>position</em>, not a letter. The key in the A position sends USB code <code>0x04</code> on every
        keyboard in the world. The operating system's layout table then turns 0x04 into “a”, or “A” with Shift, or “q”
        on a French keyboard. The <Link to="/bits-meaning">previous chapter</Link> tells that part of the story.
      </p>
      <p>
        An <strong>optical mouse</strong> is more surprising. Underneath it is a small light and a tiny camera, often
        about 30 × 30 pixels. The light shines across the desk at a low angle, so every small bump in the surface casts
        a shadow. The camera takes thousands of pictures a second (1,000 to 10,000 or more). A chip compares each
        picture with the one before and finds how far the pattern moved.
      </p>
      <MouseSensor />
      <p>
        The movement is counted in <strong>counts</strong>. A mouse with 1,600 counts per inch (CPI) reports 1,600
        counts when you move it 2.54 cm. About once every millisecond it sends a tiny <strong>report</strong> over USB:
        one byte for the buttons, then <strong>dx</strong> (how far right) and <strong>dy</strong> (how far toward
        you). Both are <strong>signed bytes</strong>: two's complement numbers from <Link to="/binary">Binary</Link>, so
        they can be negative.
      </p>
      <Callout kind="math" title="A mouse report, worked out">
        <p>Counts per centimetre at 1,600 CPI:</p>
        <TeX block>{tex`\frac{1{,}600 \text{ counts}}{2.54 \text{ cm}} \approx 630 \text{ counts per cm}`}</TeX>
        <p>
          You move the mouse a little to the left: 3 counts in one millisecond. In two's complement,{" "}
          <TeX>{"-3"}</TeX> is <TeX>{"256 - 3 = 253"}</TeX> = <code>1111 1101</code> = <code>0xFD</code>. The operating
          system then moves the pointer, with a speed setting of 2 and a screen 1,920 pixels wide:
        </p>
        <TeX block>{tex`x \leftarrow \operatorname{clamp}(x + dx \cdot \text{speed},\ 0,\ 1919) = \operatorname{clamp}(1000 + (-3)\cdot 2,\ 0,\ 1919) = 994`}</TeX>
        <p>
          (<em>clamp</em> means “keep it between 0 and 1919”, so the pointer cannot leave the screen.) A signed byte
          holds at most +127, so one report can say at most 127 counts. At 1,000 reports a second that is{" "}
          <TeX>{"127 \\times 1000 / 630 \\approx 202"}</TeX> cm per second, faster than anyone moves a mouse.
        </p>
      </Callout>

      <h2>Touch screens</h2>
      <p>
        A phone's touch screen has two layers of see-through wires on the glass, made of a clear metal oxide (indium
        tin oxide). One layer runs across in rows, the other runs down in columns. Wherever a row crosses a column, the
        two wires form a tiny <strong>capacitor</strong>: two conductors close together that can hold a little electric
        charge. <strong>Capacitance</strong> is how much charge they hold for a given voltage.
      </p>
      <p>
        The touch chip sends a small voltage pulse along one row and measures how much charge arrives at each column.
        Your finger is mostly salty water, which conducts electricity, and it is connected to your large body. Near the
        finger, some of the electric field goes into you instead of into the column wire, so less charge arrives. The
        drop is the signal. The chip pulses every row in turn, like the keyboard scanning its grid, and gets one number
        for every crossing.
      </p>
      <Callout kind="fact">
        <p>
          A large tablet might have 30 columns × 50 rows = <strong>1,500 crossings</strong>. Scanned 120 times a
          second, that is <TeX>{"1{,}500 \\times 120 = 180{,}000"}</TeX> measurements every second, all by the touch
          chip, before the CPU hears anything.
        </p>
      </Callout>
      <p>
        The wires are about 4 to 5 mm apart, but a finger is wider than that, so it changes several crossings at once,
        some more and some less. The chip uses this to find the finger <em>between</em> the wires with a{" "}
        <strong>weighted average</strong>: each wire's position counts as much as its signal.
      </p>
      <Callout kind="math" title="Finding a finger between wires">
        <p>Column wires 4, 5 and 6 measure signals 20, 60 and 40 (all the others measure 0):</p>
        <TeX block>{tex`x = \frac{4 \cdot 20 + 5 \cdot 60 + 6 \cdot 40}{20 + 60 + 40} = \frac{80 + 300 + 240}{120} = \frac{620}{120} \approx 5.17`}</TeX>
        <p>
          The finger is a bit past wire 5, toward wire 6, because wire 6 measured more than wire 4. With wires 4 mm
          apart, 0.17 of a spacing is about <TeX>{"0.17 \\times 4 \\approx 0.7"}</TeX> mm. The chip knows your finger's
          position much more precisely than the grid of wires.
        </p>
      </Callout>
      <TouchGrid />
      <p>
        Two fingers make two separate hills of signal, and the chip takes one weighted average for each hill. That is
        how pinch-to-zoom works. In the end the touch chip sends the same kind of thing a mouse sends: a few numbers
        saying where, over USB or a similar serial bus, with an interrupt.
      </p>

      <h2>The monitor only counts</h2>
      <p>
        Now the big question: how does a monitor know which colour goes where? Inside the computer, a circuit in the
        graphics chip called the <strong>display engine</strong> reads the framebuffer in order: row 0 from left to
        right, then row 1, and so on to the last row. It sends the colours down the cable, then starts again from the
        top, 60 times a second (see <Link to="/graphics">Graphics</Link> for the framebuffer itself).
      </p>
      <p>
        Look at what travels down the cable. No addresses. No “this is pixel (500, 300)”. No letters. Only three
        numbers per pixel, red, green and blue, one pixel after another, at a fixed rhythm. So the monitor finds each
        pixel's place in the only way left: <strong>it counts</strong>.
      </p>
      <p>
        The rhythm is set by the <strong>pixel clock</strong>, a signal that ticks once per pixel. The monitor counts
        the ticks, starting from 0 at the top-left corner. For a 1080p screen (1,920 × 1,080 pixels), each row is
        actually 2,200 ticks long: 1,920 visible pixels and 280 invisible ones. And each frame is 1,125 rows: 1,080
        visible and 45 invisible. These invisible parts are the <strong>blanking</strong> margins. With tick number{" "}
        <TeX>{"n"}</TeX>, the monitor's whole job is:
      </p>
      <TeX block>{tex`x = n \bmod 2200, \qquad y = \left\lfloor \frac{n}{2200} \right\rfloor, \qquad \text{visible if } x < 1920 \text{ and } y < 1080`}</TeX>
      <p>
        Here <TeX>{"n \\bmod 2200"}</TeX> (“n modulo 2200”) is the remainder after dividing by 2,200, and{" "}
        <TeX>{"\\lfloor\\ \\rfloor"}</TeX> means “round down to a whole number”. Dividing tells you how many full rows
        have gone by; the remainder tells you how far along the current row you are.
      </p>
      <Callout kind="math" title="Where does tick number 1,000,000 go?">
        <TeX block>{tex`1{,}000{,}000 \div 2{,}200 = 454 \text{ remainder } 1{,}200 \quad (454 \times 2{,}200 = 998{,}800)`}</TeX>
        <p>
          So <TeX>{"y = 454"}</TeX> and <TeX>{"x = 1200"}</TeX>. Both are inside the visible area (1,200 &lt; 1,920
          and 454 &lt; 1,080), so the colour of tick 1,000,000 lights pixel (1200, 454). Tick 2,000 would land at{" "}
          <TeX>{"x = 2000"}</TeX>, in the blank margin, so the monitor ignores it.
        </p>
      </Callout>
      <p>
        Counting alone is fragile: if the monitor ever misses one tick, every pixel after it lands in the wrong place.
        So two extra signals are sent in the blank margins. <strong>H-sync</strong> (horizontal sync) is a pulse that
        means “a new row is starting”. <strong>V-sync</strong> (vertical sync) means “a new frame is starting: back to
        the top-left”. They let the monitor re-check its counters on every row. Try being the monitor yourself:
      </p>
      <BeTheMonitor />
      <Callout kind="math" title="148.5 million pixels per second">
        <p>Ticks in one 1080p frame, including the margins, times 60 frames a second:</p>
        <TeX block>{tex`2{,}200 \times 1{,}125 \times 60 = 148{,}500{,}000 \text{ ticks per second} = 148.5 \text{ MHz}`}</TeX>
        <p>
          One pixel arrives every <TeX>{"1 / 148{,}500{,}000 \\text{ s} \\approx 6.7"}</TeX> nanoseconds. Only{" "}
          <TeX>{"\\frac{1920 \\times 1080}{2200 \\times 1125} = \\frac{2{,}073{,}600}{2{,}475{,}000} \\approx 84\\%"}</TeX>{" "}
          of the ticks are visible pixels.
        </p>
      </Callout>
      <GoDeeper title="Why old TVs needed sync: the electron beam">
        <p>
          Old TVs and monitors were <strong>CRTs</strong> (cathode-ray tubes). At the back, an electron gun shot a
          thin beam of electrons at the glass, and wherever it hit, a coating glowed. Magnets bent the beam so it swept
          across the screen one row at a time, left to right, top to bottom, while the signal made it stronger or
          weaker.
        </p>
        <p>
          At the end of each row, the beam had to fly back to the left edge, and at the end of the frame, back to the
          top. That took time, and nothing could be drawn during it. That is where the blank margins come from. The
          sync pulses told the TV's sweep circuits exactly when to start each jump back.
        </p>
        <p>
          Flat panels have no beam, but the agreement survived, because it costs little and it keeps every device
          compatible. Today HDMI uses the blank time to send sound and other small packets of data.
        </p>
      </GoDeeper>

      <h2>Down the cable</h2>
      <p>
        An HDMI cable carries this stream on four fast differential pairs: one for red, one for green, one for blue,
        and one for the clock. Each colour byte does not travel as 8 bits but as a 10-bit code word. This coding is
        called <strong>TMDS</strong> (transition-minimised differential signalling), and the two extra bits do two jobs:
      </p>
      <ul>
        <li>
          They allow a code that has fewer flips between 0 and 1. Every flip on a fast wire sends out a little radio
          noise, so fewer flips means a quieter cable.
        </li>
        <li>
          They keep the number of 1s and 0s balanced over time, so the wire's average voltage does not slowly drift.
        </li>
      </ul>
      <p>
        During the blank margins, the link sends special 10-bit code words that never appear in pixel data. They carry
        the H-sync and V-sync signals (on the blue pair), and they help the receiver find where each 10-bit word
        starts. The monitor turns each 10-bit word back into the original byte with a small table of gates.
      </p>
      <Callout kind="math" title="How fast is the HDMI cable for 1080p at 60 Hz?">
        <TeX block>{tex`148.5 \text{ million ticks/s} \times 10 \text{ bits} = 1.485 \text{ Gbit/s on each colour pair}`}</TeX>
        <TeX block>{tex`3 \text{ pairs} \times 1.485 \text{ Gbit/s} = 4.455 \text{ Gbit/s in total}`}</TeX>
        <p>
          The visible colour data alone is <TeX>{"1920 \\times 1080 \\times 24 \\text{ bits} \\times 60 \\approx 2.99"}</TeX>{" "}
          Gbit/s. The cable carries about 1.5 times more, because of the blank margins (16% of the ticks) and the 10-bit
          code (10/8 = 1.25).
        </p>
      </Callout>
      <LinkCalc />
      <p>
        How does the computer know your monitor is 1,920 × 1,080 at all? An HDMI cable also has a slow side channel.
        When you plug in a monitor, the computer reads a small table from a memory chip inside it, called the{" "}
        <strong>EDID</strong>, which lists the resolutions and timings the monitor accepts. After that, the two sides
        just follow the agreed timing. DisplayPort and USB-C cables pack the pixels into small packets instead, but the
        monitor ends up with the same thing: colours, in order, at an agreed rhythm.
      </p>

      <h2>Inside the panel</h2>
      <p>
        At the edge of the panel sits a chip called the <strong>timing controller</strong>. It receives the stream,
        decodes the 10-bit words, and collects one row of colours. Then two sets of drivers put that row onto the
        glass:
      </p>
      <PanelDrivers />
      <ul>
        <li>
          The <strong>row drivers</strong> (also called gate drivers) switch on one row of tiny transistors at a time.
          These transistors are printed directly onto the glass, one for each subpixel.
        </li>
        <li>
          The <strong>column drivers</strong> (also called source drivers) set the voltage of every subpixel in that
          row at once. A 1080p panel has <TeX>{"1{,}920 \\times 3 = 5{,}760"}</TeX> columns, one for each red, green
          and blue subpixel, and each column has its own DAC: a circuit that turns a number into a voltage (we build one
          later in this chapter).
        </li>
        <li>
          When the row switches off, each subpixel keeps its voltage on a tiny <strong>capacitor</strong>, the same
          trick as a DRAM cell in <Link to="/memory">Memory</Link>. So the picture stays lit until the next frame
          rewrites that row, and does not flicker.
        </li>
      </ul>
      <Callout kind="math" title="How long does each row get?">
        <TeX block>{tex`\frac{1}{1{,}125 \text{ rows} \times 60 \text{ frames/s}} = \frac{1}{67{,}500} \text{ s} \approx 14.8\ \mu\text{s}`}</TeX>
        <p>
          (μs = microsecond, a millionth of a second.) In those 14.8 μs, 5,760 voltages must settle at once. Then the
          next row gets its turn. The same row comes round again after{" "}
          <TeX>{"1/60 \\text{ s} \\approx 16.7"}</TeX> ms.
        </p>
      </Callout>
      <p>
        What the voltage does next depends on the kind of panel. On an LCD it twists liquid crystals that let more or
        less of a white backlight through a coloured filter. On an OLED it sets the current through a tiny
        light-emitting diode. The Go-deeper box “How does a pixel actually make light?” in{" "}
        <Link to="/graphics">Graphics</Link> explains both.
      </p>

      <h3>Why 128 is not half as bright</h3>
      <p>
        You might expect the number 128 (half of 255) to give half the light. It does not. Screens follow an agreed
        curve called <strong>gamma</strong>: light is roughly the number, scaled to 0–1, raised to the power 2.2.
      </p>
      <Callout kind="math" title="The gamma curve">
        <TeX block>{tex`\text{light} \approx \left(\frac{128}{255}\right)^{2.2} \approx 0.22 = 22\%`}</TeX>
        <p>Going the other way, to get 50% of the light you need</p>
        <TeX block>{tex`255 \times 0.5^{1/2.2} \approx 186`}</TeX>
      </Callout>
      <p>
        Why such a strange rule? Your eyes notice small changes in dark shades much more than the same changes in
        bright ones. So the 256 numbers are spent unevenly: many of them on dark shades, where you would notice the
        steps, and fewer on bright shades. The happy result is that 22% of the light <em>looks</em> about half as
        bright to you.
      </p>
      <GammaCurve />
      <p>
        Now look at everything the monitor has done: count ticks, decode 10-bit words, set voltages row by row. Not
        once did it need to know whether the pixels were a letter, a photo or a game. It sees only an endless stream
        of red, green and blue numbers, in an agreed order.
      </p>

      <h2>Real world in: the ADC</h2>
      <p>
        Keys and mouse reports are already numbers. But much of the world is smooth: a microphone's voltage can be
        0.62 V, or 0.6213 V, or anything in between. Something that can take any value is called{" "}
        <strong>analog</strong>. A computer needs <strong>digital</strong> values: whole numbers from a fixed list. The
        circuit that turns one into the other is an <strong>ADC</strong> (analog-to-digital converter).
      </p>
      <p>
        Its key part is a <strong>comparator</strong>. It has two inputs and one output: the output is 1 if input A has
        a higher voltage than input B, and 0 otherwise. Inside are a few transistors arranged so that even a tiny
        difference pushes the output all the way to 1 or to 0. The comparator is the bridge between the smooth world
        and the world of bits.
      </p>
      <p>
        One comparator answers one yes/no question. To get 8 bits, the ADC plays the game “guess my number between 0
        and 255”. The best strategy in that game is to always guess the middle of what is left. Each answer halves the
        range, so 8 questions are always enough (<TeX>{"2^8 = 256"}</TeX>). This kind of ADC is called a{" "}
        <strong>successive approximation</strong> ADC.
      </p>
      <Callout kind="math" title="Measuring 0.62 V on a 0–1 V scale">
        <p>Each test voltage is “the bits found so far, plus the next bit”, divided by 256.</p>
        <DataTable
          head={["step", "test", "0.62 ≥ test?", "bit"]}
          rows={[
            ["1", "128/256 = 0.500 V", "yes", "b7 = 1"],
            ["2", "192/256 = 0.750 V", "no", "b6 = 0"],
            ["3", "160/256 = 0.625 V", "no (just!)", "b5 = 0"],
            ["4", "144/256 = 0.563 V", "yes", "b4 = 1"],
            ["5", "152/256 = 0.594 V", "yes", "b3 = 1"],
            ["6", "156/256 = 0.609 V", "yes", "b2 = 1"],
            ["7", "158/256 = 0.617 V", "yes", "b1 = 1"],
            ["8", "159/256 = 0.621 V", "no", "b0 = 0"],
          ]}
        />
        <p>
          The answer is <code>1001 1110</code> = 128 + 16 + 8 + 4 + 2 = <strong>158</strong>. Read back,{" "}
          <TeX>{"158 / 256 \\approx 0.617"}</TeX> V: within 1/256 of a volt of the real 0.62 V.
        </p>
      </Callout>
      <Voltmeter />

      <h2>Real world out: the DAC</h2>
      <p>
        Where did those test voltages come from? From the opposite circuit, a <strong>DAC</strong> (digital-to-analog
        converter). Its idea is simple. Each bit controls a switch, and each switch lets through a current worth a fixed
        share of the full scale: bit 7 is worth 1/2, bit 6 is worth 1/4, and so on down to bit 0, worth 1/256. All the
        currents flow into one wire, where they add up.
      </p>
      <Callout kind="math" title="The number 158 becomes a voltage">
        <p>
          158 = <code>1001 1110</code>, so the switches for bits 7, 4, 3, 2 and 1 are on:
        </p>
        <TeX block>{tex`\tfrac{1}{2} + \tfrac{1}{16} + \tfrac{1}{32} + \tfrac{1}{64} + \tfrac{1}{128} = \tfrac{128 + 16 + 8 + 4 + 2}{256} = \tfrac{158}{256} \approx 0.617 \text{ V}`}</TeX>
        <p>(on a 1 V full scale). It is the same place-value idea as binary numbers, done with currents.</p>
      </Callout>
      <p>
        DACs are everywhere output happens. Every column driver of the monitor contains one, turning a colour number
        into the voltage that sets a subpixel's brightness. Your headphone socket has one, turning sound numbers into a
        voltage that drives a speaker.
      </p>

      <h2>Sound is just numbers</h2>
      <p>
        Sound is air pressure wiggling back and forth very quickly. A microphone has a thin skin that moves with the
        air and turns the movement into a voltage. An ADC then measures that voltage at regular moments, called{" "}
        <strong>samples</strong>. A common choice is <strong>48,000 samples a second</strong>, each one a 16-bit
        signed number: <TeX>{"2^{16} = 65{,}536"}</TeX> levels, from −32,768 to +32,767.
      </p>
      <p>
        The pitch of a sound is how many wiggles happen each second, measured in hertz (Hz). The note A that orchestras
        tune to is 440 Hz. A computer can make that note from nothing but a formula. The <em>sin</em> function from
        mathematics makes the smooth up-and-down shape; it goes between −1 and +1 and repeats every{" "}
        <TeX>{"2\\pi"}</TeX>:
      </p>
      <TeX block>{tex`s[n] = 32767 \cdot \sin\!\left(2\pi \cdot 440 \cdot \frac{n}{48000}\right) = 0,\ 1886,\ 3766,\ 5634,\ \ldots`}</TeX>
      <p>
        Each wiggle gets <TeX>{"48{,}000 / 440 \\approx 109"}</TeX> samples. To play it, a DAC turns each number back
        into a voltage, an amplifier makes it stronger, and a coil in the speaker pushes a paper cone that moves the
        air. Then the air wiggles at 440 Hz, and you hear the note.
      </p>
      <SoundSampler />
      <p>
        Why 48,000 samples a second? A wiggle needs <em>more than 2 samples</em> (one near the top, one near the
        bottom), or the numbers cannot tell it apart from a slower wiggle. This rule is called the{" "}
        <strong>Nyquist</strong> limit. People hear up to about 20,000 Hz, so we need more than{" "}
        <TeX>{"2 \\times 20{,}000 = 40{,}000"}</TeX> samples a second. Music CDs use 44,100; video uses 48,000.
      </p>
      <Callout kind="math" title="How big is a song?">
        <p>CD audio: 44,100 samples a second, 16 bits each, 2 channels (left and right):</p>
        <TeX block>{tex`44{,}100 \times 16 \times 2 = 1{,}411{,}200 \text{ bits per second}`}</TeX>
        <p>A 3-minute song is 180 seconds:</p>
        <TeX block>{tex`1{,}411{,}200 \times 180 \div 8 = 31{,}752{,}000 \text{ bytes} \approx 31.8 \text{ MB}`}</TeX>
        <p>
          That is why music is usually compressed (MP3, AAC), using tricks like the ones in{" "}
          <Link to="/video">Scene: Watching a Video</Link>.
        </p>
      </Callout>
      <GoDeeper title="Aliasing: the wagon wheel that spins backwards">
        <p>
          In old films, a wagon's wheels sometimes seem to turn slowly backwards. The film takes 24 pictures a second.
          If a spoke moves almost all the way to the next spoke's position between two pictures, each picture shows
          the spokes a little <em>behind</em> where they were, and your brain sees a slow backwards turn.
        </p>
        <p>
          Sampled sound does the same. Try the “7,000 Hz at 8,000/s” button in the figure above. The samples of a
          7,000 Hz wave taken 8,000 times a second are exactly the samples of a 1,000 Hz wave, upside down:
        </p>
        <TeX block>{tex`\sin\!\left(2\pi \cdot 7000 \cdot \tfrac{n}{8000}\right) = \sin\!\left(2\pi n - 2\pi \cdot 1000 \cdot \tfrac{n}{8000}\right) = -\sin\!\left(2\pi \cdot 1000 \cdot \tfrac{n}{8000}\right)`}</TeX>
        <p>
          (because adding a whole number of turns, <TeX>{"2\\pi n"}</TeX>, changes nothing). Once the numbers are
          stored, nobody can tell which sound it was. That is why every ADC for sound has a filter in front of it that
          removes all pitches above half the sample rate <em>before</em> sampling.
        </p>
      </GoDeeper>

      <h2>What the monitor never knows</h2>
      <p>
        Back to the question from the start: how does the monitor know what the binary means? It doesn't, and it never
        needs to. The monitor knows only an agreement: “colours, in rows, starting at the top-left, 2,200 ticks per
        row, 1,125 rows per frame, at this rhythm”. The letter A existed as the number 65 inside the app. A font turned
        it into pixel colours in the framebuffer (that was <Link to="/bits-meaning">the previous chapter</Link>). The
        display engine sent those colours down the cable, and the monitor counted ticks and set voltages. A photo of an
        A and a typed A arrive at the monitor in exactly the same way.
      </p>
      <p>
        Every device in this chapter works the same way at its edge. Something physical changes a voltage, or a
        voltage changes something physical, and numbers travel in between:
      </p>
      <DataTable
        align="left"
        head={["device", "the physical side", "the numbers"]}
        rows={[
          ["keyboard", "a switch closes in a grid", "a key position code, e.g. 0x04"],
          ["mouse", "a camera sees the desk move", "signed dx and dy, 1,000 times a second"],
          ["touch screen", "a finger steals charge", "crossing signals → weighted average"],
          ["microphone", "air pushes a thin skin", "48,000 samples a second, via an ADC"],
          ["monitor", "voltages on capacitors set the light", "R, G, B for each tick of a 148.5 MHz clock"],
          ["speaker", "a coil pushes a cone", "samples turned into a voltage by a DAC"],
        ]}
      />
      <p>
        One question is left. Many programs want the keyboard and the screen at the same time. Who decides which
        program gets the key you just pressed, and which one may draw where? That is the job of the{" "}
        <Link to="/operating-system">operating system</Link>, in the next chapter.
      </p>

      <KeyIdeas
        items={[
          <>
            The CPU only reads and writes bytes at addresses. A decoder sends some addresses to a device's mailboxes
            instead of RAM: <strong>memory-mapped I/O</strong>. A <strong>driver</strong> is the code that knows one
            device's mailboxes.
          </>,
          <>
            <strong>Polling</strong> asks again and again and mostly wastes the checks. An <strong>interrupt</strong>{" "}
            is a function call made by hardware. <strong>DMA</strong> lets a device copy big blocks into RAM by itself.
          </>,
          <>
            Fast links are <strong>serial</strong>: one bit after another at an agreed rhythm (UART 960 bytes/s, PCIe
            ×16 about 31.5 GB/s).
          </>,
          <>
            A mouse sends <strong>signed</strong> dx and dy. A touch screen finds your finger between its wires with a{" "}
            <strong>weighted average</strong>.
          </>,
          <>
            The monitor knows nothing about letters. It counts pixel-clock ticks (148.5 MHz for 1080p at 60 Hz) and
            puts tick <TeX>{"n"}</TeX> at <TeX>{"x = n \\bmod 2200"}</TeX>, <TeX>{"y = \\lfloor n / 2200 \\rfloor"}</TeX>.
            Sync pulses keep the count honest.
          </>,
          <>
            An <strong>ADC</strong> measures a voltage by binary search with a comparator; a <strong>DAC</strong> adds
            currents worth 1/2, 1/4, … to make a voltage. Sound is 48,000 such numbers a second.
          </>,
        ]}
      />
    </>
  );
}
