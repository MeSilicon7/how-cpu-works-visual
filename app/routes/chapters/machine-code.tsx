import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { AssemblerEditor, LayersView, TinyCompiler, WalkTheString } from "~/widgets/machine-code";

export const meta = () => chapterMeta("machine-code");

export default function MachineCode() {
  return (
    <>
      <p>
        The CPU only understands bytes like <code>0010 1111</code>. But nobody writes programs in binary. You write{" "}
        <code>print(2 + 3)</code> or <code>total = price * 3</code>. So how does that become something a CPU can run?
        Through a chain of translators, each one a program itself.
      </p>

      <h2>Four levels of the same program</h2>
      <LayersView />
      <ol>
        <li>
          <strong>Your code</strong> (Python, JavaScript, C, Swift…) is written for humans to read.
        </li>
        <li>
          A <strong>compiler</strong> translates it into <strong>assembly</strong>: a list of the CPU's own
          instructions, written with readable names like <code>LDA</code> and <code>ADD</code>.
        </li>
        <li>
          An <strong>assembler</strong> turns each assembly line into its bit pattern by looking up the opcode table,
          giving <strong>machine code</strong>, and that gets loaded into RAM.
        </li>
        <li>In RAM, each 1 or 0 is a stored charge, and when it's read it becomes a voltage on 8 wires of the bus.</li>
      </ol>
      <Callout kind="idea">
        <p>
          Compilers and assemblers aren't magic either. They're ordinary programs that read text and write bytes. The
          very first assemblers were written by hand in machine code, and every compiler since has been built using an
          earlier one. It's translators on top of translators, layer after layer, until you reach the transistors.
        </p>
      </Callout>

      <h2>Build a compiler</h2>
      <p>A real compiler works in stages. Here is a complete (but tiny) one for arithmetic:</p>
      <ol>
        <li>
          <strong>Lexing</strong>: chop the text into <em>tokens</em> (numbers and operators), skipping spaces.
        </li>
        <li>
          <strong>Parsing</strong>: arrange the tokens into a <em>tree</em> that shows what's computed first.{" "}
          <code>7 + 5 − 2</code> means <code>(7 + 5) − 2</code>.
        </li>
        <li>
          <strong>Code generation</strong>: walk the tree and emit instructions. Put the numbers in memory, load the
          first into A, then ADD or SUB each next one.
        </li>
        <li>
          <strong>Assembling</strong>: turn each instruction into its byte.
        </li>
      </ol>
      <TinyCompiler />
      <p>
        Try <code>200 + 100</code> or <code>10 − 20</code>. Our CPU only has 8-bit registers, so the answer wraps
        around: 300 becomes 300 − 256 = 44. Real programs hit the same problem with bigger numbers. It's called{" "}
        <strong>integer overflow</strong>. In 2014 YouTube had to switch its view counter from 32-bit to 64-bit numbers
        because “Gangnam Style” was about to pass 2,147,483,647 views. That's <code>2³¹ − 1</code>, the largest signed
        32-bit number.
      </p>

      <h2>Write assembly by hand</h2>
      <p>
        Now you're the compiler. Here's the full instruction set of our CPU again: <code>NOP</code>, <code>LDA n</code>,{" "}
        <code>ADD n</code>, <code>SUB n</code>, <code>STA n</code>, <code>LDI n</code>, <code>JMP n</code>,{" "}
        <code>JC n</code>, <code>JZ n</code>, <code>OUT</code>, <code>HLT</code>. The starter program counts down from
        5. Change it, break it, then run it on the CPU.
      </p>
      <AssemblerEditor />

      <h2>How if and while become jumps</h2>
      <p>
        There are no <code>if</code> or <code>while</code> instructions in a CPU. A compiler builds them out of three
        things: an ALU operation that sets a flag, a <strong>conditional jump</strong>, and an{" "}
        <strong>unconditional jump</strong> back to the top.
      </p>
      <div className="not-prose grid gap-3 md:grid-cols-2">
        <pre className="scroll-thin overflow-x-auto rounded-xl border border-line bg-panel p-4 font-mono text-sm leading-relaxed text-ink">
          <span className="text-dim"># Python</span>
          {"\n"}product = 0{"\n"}y = 4{"\n"}
          <span className="text-amber">while</span> y != 0:{"\n"} product = product + 3{"\n"} y = y - 1{"\n"}
          print(product)
        </pre>
        <pre className="scroll-thin overflow-x-auto rounded-xl border border-line bg-panel p-4 font-mono text-sm leading-relaxed text-ink">
          <span className="text-dim">; SAP-8 assembly</span>
          {"\n"}
          <span className="text-dim">0:</span> LDA 14 <span className="text-dim">; A = product</span>
          {"\n"}
          <span className="text-dim">1:</span> ADD 13 <span className="text-dim">; + 3</span>
          {"\n"}
          <span className="text-dim">2:</span> STA 14 <span className="text-dim">; product = A</span>
          {"\n"}
          <span className="text-dim">3:</span> LDA 15 <span className="text-dim">; A = y</span>
          {"\n"}
          <span className="text-dim">4:</span> SUB 12 <span className="text-dim">; − 1 (sets Z if 0)</span>
          {"\n"}
          <span className="text-dim">5:</span> STA 15 <span className="text-dim">; y = A</span>
          {"\n"}
          <span className="text-dim">6:</span> <span className="text-amber">JZ 8</span>{" "}
          <span className="text-dim">; y == 0? leave loop</span>
          {"\n"}
          <span className="text-dim">7:</span> <span className="text-amber">JMP 0</span>{" "}
          <span className="text-dim">; go round again</span>
          {"\n"}
          <span className="text-dim">8:</span> LDA 14{"\n"}
          <span className="text-dim">9:</span> OUT{"\n"}
          <span className="text-dim">10:</span> HLT
        </pre>
      </div>
      <p>
        That's the “3 × 4” program in the <Link to="/cpu">CPU chapter</Link>. (The compiler did one sneaky thing: it
        checks the condition at the bottom of the loop, which works fine as long as y starts above 0.) Every{" "}
        <code>if</code>, <code>for</code> and <code>while</code> in every app you use comes down to this: flags and
        jumps. A <strong>function call</strong> needs one more thing: a way to jump back to the place it was called
        from. That is the job of the <strong>stack</strong>, in the next chapter,{" "}
        <Link to="/functions">Functions &amp; the Stack</Link>.
      </p>

      <h2>Where do variables live?</h2>
      <p>
        Look at the 3 × 4 program again. The Python version talks about <code>product</code> and <code>y</code>. The
        assembly never uses those names. It says <code>LDA 14</code> and <code>STA 15</code>. Where did the names go?
      </p>
      <p>
        A <strong>variable</strong> is a memory address that the compiler has given a name. While it translates, the
        compiler keeps a list called the <strong>symbol table</strong>: each name, and the address it picked for it.
        Every time your code says <code>product</code>, the compiler looks it up and writes 14.
      </p>
      <DataTable
        head={["name in the code", "address the compiler picked", "value at the start"]}
        rows={[
          [<code key="p">product</code>, "14", "0"],
          [<code key="y">y</code>, "15", "4"],
          ["the constant 3", "13", "3"],
          ["the constant 1", "12", "1"],
        ]}
      />
      <p>
        When compiling is finished, the table is thrown away (or kept in a separate file to help with debugging). The
        CPU never sees the word “product”. It only ever sees 14.
      </p>

      <h3>Three ways to say where a number is</h3>
      <p>
        An instruction can give its number in different ways, called <strong>addressing modes</strong>. You have
        already used two of them:
      </p>
      <DataTable
        align="left"
        head={["mode", "example", "what the instruction holds", "A gets"]}
        rows={[
          ["immediate", <code key="i">LDI 5</code>, "the number itself", "5"],
          ["direct", <code key="d">LDA 14</code>, "an address", "the number stored at address 14"],
          [
            "indirect",
            <code key="n">mov al, [rbx]</code>,
            "the name of a register that holds an address",
            "the number stored at the address that is in rbx",
          ],
        ]}
      />
      <p>
        The last row is x86 assembly. A variable that holds an <em>address</em> is called a <strong>pointer</strong>,
        because it points at another place in memory. SAP-8 has no indirect mode, so it can't follow a pointer in one
        instruction, but every real CPU can. Pointers are what let one short loop work through a long list: change the
        pointer, and the same instructions read a different place. You will meet a very important pointer in the next
        chapter: the stack pointer.
      </p>

      <h3>Lists: base + i × size</h3>
      <p>
        An <strong>array</strong> (a list) is a row of items that all have the same size, stored one after another in
        memory. To find item number i, the code needs only two things: the address of the first item (the{" "}
        <strong>base</strong>) and the size of one item in bytes.
      </p>
      <TeX block>{tex`\text{address of item } i = \text{base} + i \times \text{size}`}</TeX>
      <Callout kind="math" title="Finding an item in a list">
        <p>A list of whole numbers starts at address 1000. Each number takes 4 bytes (32 bits). Where is item 3?</p>
        <TeX block>{tex`1000 + 3 \times 4 = 1012`}</TeX>
        <p>
          And item 0 is at <TeX>{"1000 + 0 \\times 4 = 1000"}</TeX>, the base itself. That's why most programming
          languages number list items from 0: the index means “how many items to skip”.
        </p>
        <p>
          The screen works the same way. In <Link to="/graphics">Graphics</Link> you'll see that the picture on the
          screen is one long list of pixels in memory, row after row, 4 bytes per pixel. On a screen 1920 pixels wide,
          pixel (x = 10, y = 2) comes after 2 full rows plus 10 pixels:
        </p>
        <TeX block>{tex`\begin{aligned} (2 \times 1920 + 10) \times 4 &= 3850 \times 4 \\ &= 15{,}400 \end{aligned}`}</TeX>
        <p>So that pixel's 4 bytes start 15,400 bytes after the beginning of the screen's memory.</p>
      </Callout>
      <p>
        <strong>Text</strong> is a list too. Each letter is stored as its code from the{" "}
        <Link to="/binary">Binary</Link> chapter, and a 0 marks the end. So “hi” is three bytes: 104, 105, 0. To show
        it, a loop starts at the base, reads an item, stops if it is 0, otherwise shows it and moves on to the next
        item.
      </p>
      <WalkTheString />
      <p>
        Change the item size and step again. The loop is the same; only the “× size” changes. Real programs use all
        three sizes. Standard Python, for example, stores each piece of text with 1, 2 or 4 bytes per letter, picking
        the smallest size that fits the biggest letter in it.
      </p>

      <h2>Real machine code</h2>
      <p>
        Real CPUs follow exactly the same idea, with longer instructions. Here's “add two registers” on the three most
        common kinds of processor:
      </p>
      <DataTable
        align="left"
        head={["CPU family", "used in", "assembly", "machine code (hex)"]}
        rows={[
          ["x86-64", "most PCs and servers", "add eax, ebx", "01 D8 (two bytes)"],
          ["ARM64", "phones, Apple Silicon Macs", "add x0, x1, x2", "8B020020 (one 32-bit word)"],
          ["RISC-V", "microcontrollers, new chips", "add a0, a1, a2", "00C58533 (one 32-bit word)"],
        ]}
      />
      <p>
        Different families use different encodings, which is why an app compiled for an Intel PC won't run directly on
        an ARM phone. The compiler has to translate the same code into each machine's language.
      </p>

      <GoDeeper title="Compiled vs interpreted languages">
        <p>
          <strong>C, C++, Rust, Go and Swift</strong> are compiled <em>ahead of time</em>: you get a file of machine
          code (an <code>.exe</code> or an app) that the CPU runs directly.
        </p>
        <p>
          <strong>Python</strong> is usually <em>interpreted</em>: the Python interpreter is a machine-code program that
          first turns your code into simpler instructions called <em>bytecode</em>,
          then runs them one by one. That's flexible but slower: one line of Python might take
          hundreds of machine instructions.
        </p>
        <p>
          <strong>JavaScript and Java</strong> use a <em>just-in-time (JIT) compiler</em>: start interpreting, notice
          which parts run a lot, and compile those to machine code on the fly while the program runs.
        </p>
        <p>
          Either way, by the time anything happens, it's machine code running on the CPU through the fetch → decode →
          execute loop.
        </p>
      </GoDeeper>

      <h2>So what is software, physically?</h2>
      <p>We can now answer a question that sounds like philosophy but has a very physical answer.</p>
      <p>
        The <strong>hardware</strong> is fixed. Once a chip leaves the factory (see{" "}
        <Link to="/chip-making">Making a Chip</Link>), its transistors and wires never change. The same CPU runs a
        game, a web browser and a calculator without a single wire moving.
      </p>
      <p>
        <strong>Software</strong> is a pattern of bits stored in memory: charges in the cells of your SSD or your RAM.
        When the program counter points at those bits, they travel into the instruction register, and the control unit
        turns them into control signals that steer the fixed hardware: which register talks on the bus, which one
        listens, add or subtract. Software doesn't change the machine. It steers it, one instruction at a time.
      </p>
      <p>
        So <strong>installing</strong> an app means copying bytes onto your SSD. <strong>Opening</strong> it means
        that a program called the <strong>loader</strong>, part of the{" "}
        <Link to="/operating-system">operating system</Link>, copies those bytes into RAM and jumps to the first
        instruction. <strong>Deleting</strong> it means marking those bytes as free space.
      </p>

      <h3>What's inside a program file</h3>
      <p>
        A program file is more than machine code. It starts with a <strong>header</strong>, a few bytes that describe
        the rest, and then come the code and the data (for example, the text the program will show). The very first
        bytes are a <strong>magic number</strong>: a fixed pattern that says what kind of file this is. Here is the
        start of a Linux program file:
      </p>
      <DataTable
        align="left"
        head={["bytes", "what they say", "example"]}
        rows={[
          ["0–3", "magic number: “I am a program”", "7F 45 4C 46 (“.ELF” as text)"],
          ["4", "32-bit or 64-bit code", "2 means 64-bit"],
          ["18–19", "which CPU family the code is for", "62 = x86-64, 183 = ARM64"],
          ["24–31", "the entry address: where to start running", "the address of the first instruction"],
          ["after that", "where the code and the data start in the file", "positions, counted in bytes"],
        ]}
      />
      <p>
        Windows programs start with 4D 5A (“MZ”) instead. Photos, PDFs and music files have magic numbers too. You'll
        see them in <Link to="/bits-meaning">Who Decides What Bits Mean?</Link>. The CPU-family field is why an app
        built for an Intel PC won't run on an ARM phone: the loader reads “x86-64”, sees that this CPU speaks ARM, and
        refuses. And if it tried anyway, the ARM decoder would read the x86 bytes as completely different
        instructions. (Apple's Rosetta 2 gets around this by translating x86 machine code into ARM machine code, just
        like a compiler.)
      </p>

      <h3>Tiny computers everywhere</h3>
      <p>
        Your laptop contains more computers than the one you think of. The keyboard, the SSD, the battery, the charger,
        the webcam and the monitor each have their own small CPU, a little RAM, and a program stored in flash memory.
        Many of these are <strong>microcontrollers</strong>: a whole small computer on one chip. Their programs are
        called <strong>firmware</strong>, and a typical laptop holds a dozen or more of them. A “firmware update” works
        exactly like installing an app: new bytes are copied into that flash, and the hardware stays the same.
      </p>

      <KeyIdeas
        items={[
          <>Code → (compiler) → assembly → (assembler) → machine code → bits in RAM → voltages.</>,
          <>A compiler lexes text into tokens, parses them into a tree, and generates instructions.</>,
          <>Loops and if-statements are built from flags, conditional jumps and plain jumps.</>,
          <>
            A variable is a name for a memory address. Item i of a list is at <strong>base + i × size</strong>, and a{" "}
            <strong>pointer</strong> is a variable that holds an address.
          </>,
          <>Each CPU family has its own instruction encoding, but the idea is identical to our tiny CPU.</>,
          <>
            Software is a pattern of bits that steers hardware that never changes. A program file is a header (magic
            number, CPU family, entry address) plus code and data.
          </>,
        ]}
      />
    </>
  );
}
