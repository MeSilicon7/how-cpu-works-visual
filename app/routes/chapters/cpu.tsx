import { Link, useSearchParams } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { hexToRam } from "~/lib/cpu";
import { chapterMeta } from "~/lib/meta";
import { HoldOrLoad, TriStateFigure, WhoIsTalking } from "~/widgets/bus";
import { CpuSim, InstructionDecoder } from "~/widgets/cpu-sim";

export const meta = () => chapterMeta("cpu");

export default function Cpu() {
  const [params] = useSearchParams();
  const customRam = hexToRam(params.get("ram") ?? "");

  return (
    <>
      <p>Time to put everything together. We have every part a computer needs:</p>
      <ul>
        <li>
          an <Link to="/alu">ALU</Link> that can add, subtract and compare,
        </li>
        <li>
          <Link to="/memory">registers and RAM</Link> that remember bytes,
        </li>
        <li>
          a <Link to="/clock">clock</Link> that ticks to keep everything in step.
        </li>
      </ul>
      <p>
        What's missing is something that tells the parts <em>what to do, and when</em>. That's the job of the{" "}
        <strong>control unit</strong>, and with it we get a <strong>CPU</strong> (Central Processing Unit).
      </p>

      <h2>Programs are numbers in memory</h2>
      <p>
        In 1945 John von Neumann described the design almost every computer still uses: store the{" "}
        <strong>program</strong> in the same memory as the <strong>data</strong>. An instruction like “add the number at
        address 15” is encoded as a byte, just like the number 47 is. The CPU reads these bytes one after another and
        does what each one says.
      </p>
      <Callout kind="analogy">
        <p>
          The CPU is a cook following a recipe book. <strong>RAM</strong> is the book (recipe steps and ingredients on
          numbered lines). The <strong>program counter</strong> is a bookmark showing which line is next. The{" "}
          <strong>instruction register</strong> holds the line currently being read. The <strong>control unit</strong>{" "}
          is the cook's brain turning “add the sugar” into hand movements. The <strong>registers A and B</strong> are
          the cook's two hands.
        </p>
      </Callout>

      <h2>Meet SAP-8</h2>
      <p>
        We'll use a tiny but complete 8-bit CPU, based on the famous “Simple As Possible” teaching computer. It's small
        enough to see every wire, yet it works on exactly the same principles as the chip in your phone. Its parts:
      </p>
      <DataTable
        align="left"
        head={["part", "size", "job"]}
        rows={[
          ["Program counter (PC)", "4 bits", "Address of the next instruction. Counts up by 1 after each fetch."],
          ["Memory address register (MAR)", "4 bits", "Tells RAM which address to read or write."],
          ["RAM", "16 × 8 bits", "Holds the program and its data."],
          ["Instruction register (IR)", "8 bits", "Holds the instruction being executed."],
          ["Control unit", "logic", "Turns the opcode + step number into control signals."],
          ["Registers A and B", "8 bits each", "Working storage. The ALU always computes A ± B."],
          ["ALU + flags", "8 bits + C, Z", "Adds or subtracts; remembers carry and zero."],
          ["Output", "8 bits", "A display, so we can see results."],
          ["Bus", "8 wires", "A shared road. Only one part may “talk” at a time."],
        ]}
      />
      <h3>The instruction format</h3>
      <p>
        Every instruction is one byte. The left 4 bits are the <strong>opcode</strong> (which operation, like the ALU's
        select bits). The right 4 bits are the <strong>operand</strong>: usually a memory address 0–15.
      </p>
      <InstructionDecoder />

      <h2>Fetch → decode → execute</h2>
      <p>Every CPU ever made runs this loop, forever, as long as it's powered:</p>
      <ol>
        <li>
          <strong>Fetch</strong>: copy the PC into the memory address register, read that byte from RAM into the
          instruction register, and add 1 to the PC.
        </li>
        <li>
          <strong>Decode</strong>: the control unit looks at the opcode and works out which control signals to turn on.
        </li>
        <li>
          <strong>Execute</strong>: turn those signals on, one clock tick at a time. Each tick, exactly one part puts a
          value on the bus and one or more parts take it in.
        </li>
      </ol>
      <p>
        Each <strong>control signal</strong> is a single wire that opens a “gate” to the bus. For example{" "}
        <code>RO</code> (RAM Out) lets RAM drive the bus, and <code>AI</code> (A In) makes register A store whatever is
        on the bus at the next clock tick. Moving a byte from RAM into A takes two signals on at the same time:{" "}
        <code>RO</code> + <code>AI</code>.
      </p>

      <h2>Sharing one road: the bus</h2>
      <p>
        Why do all the parts share one set of wires? Because private roads are expensive. Imagine 8 parts, each with
        its own 8-wire road to every other part. That's <TeX>{"8 \\times 7 \\div 2 = 28"}</TeX> roads, and{" "}
        <TeX>{"28 \\times 8 = 224"}</TeX> wires. A shared <strong>bus</strong> needs just 8 wires, one per bit, and
        every part is connected to all of them.
      </p>
      <p>
        But sharing has a rule: <strong>only one part may talk at a time</strong>. To see why, remember what an output
        really is. From the <Link to="/transistor">transistor chapter</Link>: every gate output has a switch to the
        power supply (+) and a switch to ground (0 V). To send a 1, it closes the top switch. To send a 0, it closes the
        bottom one. Now connect two outputs to the same wire. If one says 1 and the other says 0, there is a path
        straight from + through both switches to ground. That's a <strong>short circuit</strong>: a big current flows,
        the chip heats up, and the wire ends up at a voltage that is neither a clean 0 nor a clean 1.
      </p>

      <h3>The third state: Z</h3>
      <p>
        The fix is a special output called a <strong>tri-state buffer</strong> (“three-state”). Besides 0 and 1, it
        has a third state, written <strong>Z</strong>: it opens <em>both</em> switches and lets go of the wire, as if
        it were unplugged. An extra input called <strong>enable</strong> decides. Enable = 1: the buffer copies its
        input to the wire. Enable = 0: Z, disconnected.
      </p>
      <TriStateFigure />
      <DataTable
        head={["enable", "input", "top switch", "bottom switch", "wire"]}
        rows={[
          ["0", "any", "open", "open", <strong key="z">Z</strong>],
          ["1", "0", "open", "closed", "0"],
          ["1", "1", "closed", "open", "1"],
        ]}
      />
      <p>
        Every part that can talk to the bus sits behind 8 of these buffers, one per bus wire, and all 8 share one enable
        wire. Those enable wires are exactly the control signals whose names end in O (for “out”):{" "}
        <code>CO</code> (program counter), <code>RO</code> (RAM), <code>IO</code> (instruction register),{" "}
        <code>AO</code> (register A) and <code>EO</code> (the ALU). That's about <TeX>{"5 \\times 8 = 40"}</TeX> buffers.
        (The stack pointer in <Link to="/functions">Functions &amp; the Stack</Link> adds one more talker.) The
        control unit's table is written so that <strong>at most one O signal is on in any tick</strong>. Try breaking
        that rule yourself:
      </p>
      <WhoIsTalking />

      <h3>How a register ignores the bus</h3>
      <p>
        Talking is solved. What about listening? Every register's inputs are wired to the bus all the time, yet when
        RAM puts a byte on the bus, only the register whose <code>…I</code> signal is on (<code>AI</code>,{" "}
        <code>BI</code>, <code>II</code>…) takes it. How does register A <em>ignore</em> a byte that's right there on
        its input wires?
      </p>
      <p>
        With the <Link to="/alu">multiplexer</Link> from the ALU chapter. A flip-flop from{" "}
        <Link to="/memory">Memory</Link> stores whatever is on its D input at every clock tick, no matter what. So we
        put a 2-way switch in front of D. When <strong>LOAD</strong> (that's <code>AI</code> for register A) is 1, the
        switch passes the bus. When it's 0, the switch feeds the flip-flop's own output Q back in, so each tick stores
        the same value again. The register “holds” by copying itself.
      </p>
      <HoldOrLoad />
      <Callout kind="math" title="The load switch, in Boolean algebra">
        <p>
          The multiplexer's rule, with Q (the old value), the bus bit and LOAD:
        </p>
        <TeX block>{tex`D = Q \cdot \overline{\text{LOAD}} + \text{bus} \cdot \text{LOAD}`}</TeX>
        <p>Say the register holds Q = 0 and the bus carries a 1.</p>
        <TeX block>{tex`\begin{aligned} \text{LOAD} = 0:&\quad D = 0 \cdot 1 + 1 \cdot 0 = 0 \\ \text{LOAD} = 1:&\quad D = 0 \cdot 0 + 1 \cdot 1 = 1 \end{aligned}`}</TeX>
        <p>
          With LOAD = 0, D is 0, so after the tick Q is still 0: the bus was ignored. With LOAD = 1, D is 1, so after
          the tick Q becomes 1: the bus was loaded.
        </p>
        <p>
          An 8-bit register is 8 of these side by side, all sharing one LOAD wire. The program counter is the same idea
          with a 3-way choice: keep Q, take Q + 1 from a small adder (count up, that's <code>CE</code>), or take the bus
          (a jump, that's <code>J</code>).
        </p>
      </Callout>
      <p>
        Tri-state buses were everywhere in early computers, and they are still used on the pins between chips. Inside
        a modern chip, designers mostly replace them with big multiplexers: a mux picks one source with select bits, so
        two sources can never fight. The rule is the same either way: <em>one talker per wire, per tick</em>.
      </p>

      <h2>Run it yourself</h2>
      {customRam && (
        <Callout kind="fact" title="Your program is loaded">
          <p>
            The program you assembled in <Link to="/machine-code">Machine Code</Link> is selected below as “Your
            program”.
          </p>
        </Callout>
      )}
      <CpuSim customRam={customRam} />
      <Callout kind="fact" title="Who put the program in memory?">
        <p>
          In the simulator above, choosing a program copies its 16 bytes into RAM. Early home computers like the Altair 8800 (1975) had
          a row of switches on the front: you set 8 switches to one byte, pressed <em>Deposit</em>, and repeated that
          for every byte of the program.
        </p>
        <p>
          Your computer does it with a program. When you press the power button, the CPU starts at a fixed address in a
          small memory chip that keeps its bytes without power. That first program copies the next one from the SSD
          into RAM and jumps to it, and that one loads the next, until the operating system is running. You'll see each
          step in <Link to="/operating-system">The Operating System</Link>, in the section on booting.
        </p>
      </Callout>
      <p>
        Start with <strong>2 + 3</strong> and press <em>Step</em> slowly. The answer appears on the display at tick 15,
        and the clock stops at tick 19: 4 instructions, each with 2 fetch ticks, 1 decode tick and 1–3 execute ticks.
        Here's the full trace:
      </p>
      <DataTable
        align="left"
        head={["tick", "phase", "signals", "what happens"]}
        rows={[
          [1, "fetch", "CO MI", "PC (0) → MAR"],
          [2, "fetch", "RO II CE", "RAM[0] = 0001 1110 → IR; PC = 1"],
          [3, "decode", "", "opcode 0001 = LDA, operand 14"],
          [4, "execute", "IO MI", "14 → MAR"],
          [5, "execute", "RO AI", "RAM[14] = 2 → A"],
          ["6–7", "fetch", "…", "RAM[1] = 0010 1111 → IR; PC = 2"],
          [8, "decode", "", "opcode 0010 = ADD, operand 15"],
          [9, "execute", "IO MI", "15 → MAR"],
          [10, "execute", "RO BI", "RAM[15] = 3 → B"],
          [11, "execute", "EO AI FI", "ALU: 2 + 3 = 5 → A; flags Z=0 C=0"],
          ["12–13", "fetch", "…", "RAM[2] = 1110 0000 → IR"],
          [14, "decode", "", "OUT"],
          [15, "execute", "AO OI", "A (5) → display"],
          ["16–17", "fetch", "…", "RAM[3] = 1111 0000 → IR"],
          [18, "decode", "", "HLT"],
          [19, "execute", "HLT", "clock stops"],
        ]}
      />
      <Callout kind="idea">
        <p>
          Nowhere in this machine is there anything that “understands” addition or the program. There are only
          registers, gates and wires. A control signal opens a path, the clock ticks, and bytes move. The{" "}
          <em>meaning</em> comes from how we arranged the bits in memory.
        </p>
      </Callout>

      <h2>Decisions and loops: jumps</h2>
      <p>
        If the PC only ever counted up, programs could only run straight through once. The magic instructions are the{" "}
        <strong>jumps</strong>:
      </p>
      <ul>
        <li>
          <code>JMP n</code> sets the PC to <TeX>{"n"}</TeX>, so the next fetch comes from somewhere else. Jump
          backwards and you have a <strong>loop</strong>.
        </li>
        <li>
          <code>JZ n</code> jumps <em>only if</em> the zero flag is 1, and <code>JC n</code> only if carry is 1. That's
          an <strong>if</strong> statement.
        </li>
      </ul>
      <p>
        Our CPU has no multiply instruction. Pick the <strong>3 × 4</strong> program above. It keeps adding 3 to a total
        and subtracting 1 from a counter, and when <code>SUB</code> produces 0 the Z flag turns on and <code>JZ</code>{" "}
        exits the loop. That's how every <code>while</code> loop and every <code>if</code> you'll ever write actually
        runs. <strong>Fibonacci</strong> uses the carry flag instead: it stops as soon as x + y no longer fits in 8
        bits, so the last number it shows is 144.
      </p>

      <h2>The control unit is just another truth table</h2>
      <p>
        How does the control unit “know” the recipe for each instruction? Its inputs are a handful of bits: the 4-bit
        opcode, the 3-bit step counter, and the 2 flags. Its outputs are the 16 control signal wires. That's a truth
        table with <TeX>{"2^{4+3+2} = 512"}</TeX> rows. As you know from the <Link to="/logic-gates">logic gates</Link>{" "}
        chapter, any truth table can be built from gates, or simply stored in a small memory chip (called{" "}
        <strong>microcode</strong>) and looked up.
      </p>
      <TeX
        block
      >{tex`\underbrace{\text{opcode}}_{4\text{ bits}} + \underbrace{\text{step}}_{3\text{ bits}} + \underbrace{\text{flags}}_{2\text{ bits}} \;\longrightarrow\; \text{lookup} \;\longrightarrow\; \underbrace{\text{HLT, MI, RI, RO, IO, II, AI, \ldots}}_{16 \text{ control wires}}`}</TeX>
      <p>So the whole CPU, control unit included, is made of the same transistors and gates from Part 1.</p>

      <h2>From SAP-8 to the chip in your laptop</h2>
      <DataTable
        align="left"
        head={["", "SAP-8", "a modern CPU"]}
        rows={[
          ["bits per register", "8", "64 (and 256–512 for vector registers)"],
          ["memory", "16 bytes", "16 GB+ (a billion times more)"],
          ["instructions", "11", "1,000+"],
          ["clock", "a few ticks per second here", "~5 billion ticks per second"],
          ["instructions per tick", "about 1/5 (one instruction every 4–6 ticks)", "4–8 (several at once)"],
          ["cores", "1", "8–24 complete CPUs on one chip"],
        ]}
      />
      <Callout kind="math" title="How fast is a real CPU, then?">
        <p>A useful formula for the time a program takes:</p>
        <TeX
          block
        >{tex`\text{time} = \text{instructions} \times \frac{\text{ticks}}{\text{instruction}} \times \frac{\text{seconds}}{\text{tick}}`}</TeX>
        <p>
          SAP-8 needs 4–6 ticks per instruction. A modern core at 5 GHz finishing 4 instructions per tick does
        </p>
        <TeX
          block
        >{tex`5 \times 10^9 \;\tfrac{\text{ticks}}{\text{s}} \times 4\;\tfrac{\text{instructions}}{\text{tick}} = 2 \times 10^{10} = 20 \text{ billion instructions per second}`}</TeX>
        <p>…per core. With 8 cores, that's 160 billion instructions every second.</p>
      </Callout>

      <GoDeeper title="Pipelining: the laundry trick">
        <p>
          Doing laundry: wash (30 min), dry (30 min), fold (30 min). Three loads one after another take 9 × 30 = 270
          min. But while load 1 is drying, load 2 can already be washing! With overlap, a new load finishes every 30
          minutes.
        </p>
        <p>
          CPUs do the same: while one instruction executes, the next is being decoded and the one after that is being
          fetched. With a 5-stage pipeline:
        </p>
        <TeX
          block
        >{tex`\text{without pipeline: } n \times 5 \text{ ticks} \qquad \text{with pipeline: } \approx n + 4 \text{ ticks}`}</TeX>
        <p>
          For a million instructions, that's nearly a 5× speed-up. The hard part is jumps: the CPU doesn't know which
          instruction comes after a <code>JZ</code> until the flag is known. Modern CPUs <em>guess</em> (branch
          prediction), and they're right more than 95% of the time. When they guess wrong, they throw away the
          half-finished work and start over.
        </p>
      </GoDeeper>

      <GoDeeper title="Multiple cores and the operating system">
        <p>
          A modern chip holds several complete CPUs called <strong>cores</strong>, each with its own registers, ALU and
          control unit, all sharing the same RAM. How 300 programs take turns on 8 cores without getting in each
          other's way is the job of the operating system, which has its own chapter:{" "}
          <Link to="/operating-system">The Operating System</Link>.
        </p>
      </GoDeeper>

      <GoDeeper title="Is SAP-8 really the same kind of machine as your phone?">
        <p>
          In one exact sense, yes. In 1936 Alan Turing showed that a very simple machine can carry out{" "}
          <em>any</em> step-by-step calculation that any other machine can, as long as it can (1) read and write
          memory and (2) choose what to do next based on what it read. Such a machine is called{" "}
          <strong>universal</strong> (or “Turing-complete”). SAP-8 has both: <code>LDA</code> and <code>STA</code>{" "}
          read and write memory, and <code>JZ</code> and <code>JC</code> choose. With enough memory, it could run
          anything your phone runs, only far, far more slowly.
        </p>
        <p>
          The proof is on this page. An <strong>emulator</strong> is a program that pretends to be a different CPU,
          one instruction at a time. The SAP-8 you just stepped through <em>is</em> an emulator: a JavaScript program
          running on your own computer's CPU, pretending to be another CPU. People run 1980s game consoles inside a web
          browser in the same way.
        </p>
        <p>
          “Enough memory” is the catch. SAP-8's RAM is 16 bytes = 128 bits, and each bit is 0 or 1, so the whole RAM
          can be in
        </p>
        <TeX block>{tex`2^{128} \approx 3.4 \times 10^{38} \text{ different states.}`}</TeX>
        <p>
          That's a huge number, but it is finite. A phone with 8 GB has about <TeX>{"6.4 \\times 10^{10}"}</TeX> bits,
          so it has far more states, but also a finite number. Strictly, every real computer is universal only until
          its memory runs out. Yours just runs out much later.
        </p>
        <p>
          Even a universal machine can't answer every question. The famous one is: “Will this program ever stop, or
          loop forever?” Suppose someone wrote a perfect checker program, <code>stops(P)</code>, that always answers
          correctly. Now write a troublemaker program T that asks the checker about <em>itself</em> and then does the
          opposite: if the checker says “T stops”, T loops forever; if it says “T loops forever”, T stops at once.
          Whatever the checker answers about T, it is wrong. So a perfect checker cannot exist. Turing proved this too.
          It's called the <strong>halting problem</strong>, and it's why no program can find every bug in other
          programs.
        </p>
      </GoDeeper>

      <KeyIdeas
        items={[
          <>A program is just bytes in memory: opcode bits + operand bits.</>,
          <>
            The CPU loops <strong>fetch → decode → execute</strong> forever. Each step takes one or more clock ticks,
            and in each tick at most one value moves over the bus.
          </>,
          <>
            The parts share one <strong>bus</strong>. Tri-state buffers let exactly one part talk (two talkers make a
            short circuit), and a load switch in front of each register decides who listens.
          </>,
          <>The control unit turns opcode + step number into control signals. It's just a lookup table.</>,
          <>
            <strong>Jumps</strong> (plus the flags) make loops and if-statements possible.
          </>,
          <>Real CPUs are the same idea, just wider, faster, pipelined, and with many cores.</>,
        ]}
      />
    </>
  );
}
