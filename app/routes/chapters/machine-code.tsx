import { Link } from "react-router";

import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { AssemblerEditor, LayersView, TinyCompiler } from "~/widgets/machine-code";

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
        <code>if</code>, <code>for</code>, <code>while</code> and function call in every app you use comes down to this:
        flags and jumps.
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

      <KeyIdeas
        items={[
          <>Code → (compiler) → assembly → (assembler) → machine code → bits in RAM → voltages.</>,
          <>A compiler lexes text into tokens, parses them into a tree, and generates instructions.</>,
          <>Loops and if-statements are built from flags, conditional jumps and plain jumps.</>,
          <>Each CPU family has its own instruction encoding, but the idea is identical to our tiny CPU.</>,
        ]}
      />
    </>
  );
}
