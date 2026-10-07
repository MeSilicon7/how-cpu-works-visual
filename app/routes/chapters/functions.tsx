import type { ReactNode } from "react";
import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, Figure, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { CpuSim } from "~/widgets/cpu-sim";
import { CallStackTower, FrameAnatomy, InterruptDemo, StackPlayground, WayBack } from "~/widgets/functions";

export const meta = () => chapterMeta("functions");

/** A block of program text: Python, or a traceback. */
function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="not-prose scroll-thin overflow-x-auto rounded-md border border-line bg-panel px-4 py-3 font-mono text-sm leading-relaxed text-ink">
      {children}
    </pre>
  );
}

/** SAP-8 assembly: address, instruction, comment. */
function Asm({ lines }: { lines: Array<[number, string, string?]> }) {
  return (
    <pre className="not-prose scroll-thin overflow-x-auto rounded-md border border-line bg-panel px-4 py-3 font-mono text-sm leading-relaxed text-ink">
      {lines.map(([addr, ins, note], k) => (
        <span key={k}>
          <span className="text-dim">{String(addr).padStart(2, " ")}:</span> {ins.padEnd(8, " ")}
          {note && <span className="text-dim">; {note}</span>}
          {"\n"}
        </span>
      ))}
    </pre>
  );
}

export default function Functions() {
  return (
    <>
      <p>
        When you write <code>print("hello")</code>, you are using a <strong>function</strong>: a piece of code with a
        name, written once and used from many places. Every app is built from thousands of functions, and they call
        each other millions of times every second. Each call is a jump to another part of memory. And each time, the
        program must come back to exactly the right spot, or everything falls apart. In the{" "}
        <Link to="/cpu">CPU chapter</Link> a jump could go anywhere, but it could never come back. This chapter adds
        one small idea, the <strong>stack</strong>, and four new instructions. With them, the CPU can always find its
        way back.
      </p>

      <h2>Going there and coming back</h2>
      <p>Here is a tiny Python program with one function. The function is used twice:</p>
      <Code>
        {"def show_double(x):\n    print(x + x)\n\nshow_double(3)\nshow_double(5)"}
      </Code>
      <p>
        It should print 6, then 10. A compiler puts the code of <code>show_double</code> in memory only{" "}
        <em>once</em>, say at address 7. Each call then needs a jump to address 7. That part is easy:{" "}
        <code>JMP 7</code>. The hard part is the end of the function. When it has printed its answer, where should it
        jump?
      </p>
      <ul>
        <li>After the first call (at address 1), it must go back to address 2.</li>
        <li>After the second call (at address 3), it must go back to address 4.</li>
      </ul>
      <p>
        But the function is the same bytes both times, and its last instruction can hold only one fixed address. If it
        ends with <code>JMP 2</code>, the first call works and the second goes to the wrong place. With{" "}
        <code>JMP 4</code> it is the other way round. The real problem is that <em>a jump forgets</em>. When{" "}
        <code>JMP 7</code> runs, the program counter is simply overwritten with 7. Nothing remembers where the jump
        came from.
      </p>
      <p>
        The fix is to write down the way back <em>before</em> jumping. This address is called the{" "}
        <strong>return address</strong>: the address of the instruction right after the call.
      </p>
      <Callout kind="analogy" title="A bookmark">
        <p>
          You are reading page 112 of a book, and a footnote says “see page 340”. Before you turn to page 340, you put
          a bookmark in page 112. When you have read the note, the bookmark tells you where to go back. The book never
          changes; the bookmark is what remembers. A return address is the CPU's bookmark.
        </p>
      </Callout>

      <h2>One note is not enough</h2>
      <p>
        So, before the jump, write the return address on a note. At the end of the function, read the note and jump
        there. That works for <code>show_double</code>. But functions often call <em>other</em> functions:
      </p>
      <Code>{"def g():\n    return 5\n\ndef f():\n    return g() + 1\n\nprint(f())"}</Code>
      <p>
        The main program calls <code>f</code>, and <code>f</code> calls <code>g</code>. With only one note:
      </p>
      <ol>
        <li>The main program calls f. The note says “back to 1” (in the main program).</li>
        <li>
          f calls g. The note now says “back to 5” (in f). The “back to 1” is rubbed out.
        </li>
        <li>g returns. The note says 5, so we go back into f. Good.</li>
        <li>
          f returns. The note <em>still</em> says 5, so f jumps back into itself. The way back to the main program is
          gone for ever.
        </li>
      </ol>
      <p>
        One note is not enough. We need a <em>pile</em> of notes. Each call puts a new note on top, and each return
        takes the top note off. The newest note always belongs to the function that is running right now. Try both
        ideas:
      </p>
      <WayBack />
      <p>
        In “Two callers”, pick <strong>end with JMP 2</strong> and press Run: it prints 6, 10, 10, 10… and never
        stops. <strong>End with JMP 4</strong> stops too early. Only the note gets both calls right. In “A call inside
        a call”, one note loses the way back to the main program, and the pile of notes works.
      </p>

      <h2>The stack: a pile of notes</h2>
      <p>
        This pile of notes is called the <strong>stack</strong>. It needs no new kind of memory. It is an area of
        ordinary RAM, plus one new register, the <strong>stack pointer</strong> (<strong>SP</strong>), which remembers
        where the top of the pile is.
      </p>
      <p>
        In our CPU, SAP-8, the stack starts at the last address, 15. SP is a 4-bit register. It starts at 15, and it
        always points at the <strong>next free slot</strong>. Two actions use it:
      </p>
      <ul>
        <li>
          <strong>PUSH</strong> (put a value on the pile): write the value at address SP, then count SP down by 1.
        </li>
        <li>
          <strong>POP</strong> (take the top value off): count SP up by 1, then read the value at address SP.
        </li>
      </ul>
      <p>
        The last value pushed is always the first one popped. This rule is called <strong>last in, first out</strong>{" "}
        (LIFO). It works like a pile of plates: you put a clean plate on top, and you take the top plate first.
      </p>
      <Callout kind="math" title="Push 3, push 7, pop, pop">
        <p>Start with SP = 15. The stack is empty.</p>
        <DataTable
          align="left"
          head={["action", "what happens", "SP after"]}
          rows={[
            ["push 3", "RAM[15] ← 3", "15 − 1 = 14"],
            ["push 7", "RAM[14] ← 7", "14 − 1 = 13"],
            ["pop", "SP ← 13 + 1 = 14, then A ← RAM[14] = 7", "14"],
            ["pop", "SP ← 14 + 1 = 15, then A ← RAM[15] = 3", "15"],
          ]}
        />
        <p>The 7 came out first, and SP is back at 15: the stack is empty again.</p>
      </Callout>
      <StackPlayground />
      <p>
        Notice two things. First, POP erases nothing. The old number stays in memory, but it no longer counts as part
        of the pile, and the next PUSH will write over it. Second, if you keep pushing, the pile grows into the program
        at addresses 0–5 and overwrites it. Remember that: it comes back later as a <em>stack overflow</em>.
      </p>
      <p>
        One more word about direction. Programmers say the stack “grows down”, because each push uses a smaller
        address. In our pictures address 0 is at the top, so on screen the pile grows <em>upward</em>, like real
        plates. Both say the same thing: the addresses get smaller.
      </p>
      <Callout kind="idea" title="SP is a pointer">
        <p>
          Look at what SP holds. It is not a value from the program; it is an <em>address</em>. The CPU never thinks
          “the top of the pile”. It thinks “address SP”. A number that is used as an address is called a{" "}
          <strong>pointer</strong>, and SP is the first pointer built into our hardware. In the{" "}
          <Link to="/machine-code">Machine Code</Link> chapter, the variable <code>product</code> always lived at the
          same address, 14. A PUSH writes to “the address that is in SP”, and that address changes while the program
          runs.
        </p>
      </Callout>

      <h2>Four new instructions</h2>
      <p>
        Now we can teach SAP-8 to call functions. The opcodes 1001 to 1100 (9 to 12) were unused, so we give them four
        new instructions:
      </p>
      <DataTable
        align="left"
        head={["opcode", "instruction", "meaning"]}
        rows={[
          ["1001", "CALL n", "push the return address, then jump to n"],
          ["1010", "RET", "pop the top of the stack into the PC"],
          ["1011", "PUSH", "push register A"],
          ["1100", "POP", "pop the top of the stack into A"],
        ]}
      />
      <p>
        The hardware needs only a little more. SP is a 4-bit <strong>counter</strong> that can count both up and down.
        It gets three new control wires: <code>SPO</code> puts SP on the bus, <code>SPI</code> counts it up by 1, and{" "}
        <code>SPD</code> counts it down by 1. (So the control unit now has 16 + 3 = 19 output wires.) Here are the
        recipes for the execute ticks, after the usual fetch and decode:
      </p>
      <DataTable
        align="left"
        head={["instruction", "tick", "signals", "what moves"]}
        rows={[
          ["CALL n", "1", "SPO MI", "SP → memory address register (MAR)"],
          ["", "2", "CO RI", "PC → RAM[MAR]: the return address is saved"],
          ["", "3", "SPD IO J", "SP − 1, and n → PC"],
          ["RET", "1", "SPI", "SP + 1"],
          ["", "2", "SPO MI", "SP → MAR"],
          ["", "3", "RO J", "RAM[MAR] → PC: back where we came from"],
          ["PUSH", "1", "SPO MI", "SP → MAR"],
          ["", "2", "AO RI SPD", "A → RAM[MAR], and SP − 1"],
          ["POP", "1", "SPI", "SP + 1"],
          ["", "2", "SPO MI", "SP → MAR"],
          ["", "3", "RO AI", "RAM[MAR] → A"],
        ]}
      />
      <p>
        But how does CALL <em>know</em> the return address? It doesn't have to work it out. Remember the fetch step:
        the CPU reads the instruction, and the PC counts up by 1. So while CALL is executing, the PC already points at
        the next instruction, which is exactly the way back. CALL's second tick just copies the PC into memory.
      </p>
      <Callout kind="idea">
        <p>
          CALL is just “push the PC, then jump”. RET is just “pop into the PC”. A function call is two things you
          already know: a jump, and a note on a pile.
        </p>
      </Callout>

      <h2>Watch a call in SAP-8</h2>
      <p>
        Here is <code>show_double</code> again, now in SAP-8 assembly with CALL and RET. The function keeps x in
        address 13 while it works.
      </p>
      <Asm
        lines={[
          [0, "LDI 3", "x = 3"],
          [1, "CALL 7", "show_double(3)"],
          [2, "LDI 5", "x = 5"],
          [3, "CALL 7", "show_double(5)"],
          [4, "HLT", "stop"],
          [7, "STA 13", "show_double: temp = x"],
          [8, "ADD 13", "A = x + x"],
          [9, "OUT", "print it"],
          [10, "RET", "go back"],
        ]}
      />
      <CpuSim
        programIds={["double-twice", "eat-yourself"]}
        initial="double-twice"
        title="SAP-8 with a stack: one function, two callers"
        subtitle="Step through “Call a function twice”. Watch the stack pointer box, the SP marker in RAM, and address 15, where the return address is saved."
      />
      <p>Step through it tick by tick. These are the moments that matter:</p>
      <DataTable
        align="left"
        head={["tick", "instruction", "what happens", "SP"]}
        rows={[
          [9, "CALL 7", "PC (2) is written to RAM[15]: the way back", 15],
          [10, "CALL 7", "SP = 14 and PC = 7: into the function", 14],
          [25, "OUT", "the display shows 6", 14],
          [29, "RET", "SP counts up to 15", 15],
          [31, "RET", "PC ← RAM[15] = 2: back after the first call", 15],
          [40, "CALL 7", "PC (4) is written to RAM[15]", 15],
          [41, "CALL 7", "SP = 14 and PC = 7", 14],
          [56, "OUT", "the display shows 10", 14],
          [62, "RET", "PC ← RAM[15] = 4: back after the second call", 15],
          [66, "HLT", "the clock stops", 15],
        ]}
      />
      <p>
        The same RET went back to 2 the first time and to 4 the second time. It knows nothing; it simply uses whatever
        is on top of the stack. Both calls used address 15, because the first RET had already freed it.
      </p>
      <Callout kind="math" title="What does a call cost?">
        <p>
          CALL takes 2 fetch ticks + 1 decode tick + 3 execute ticks = 6 ticks. RET also takes 6. So every call and
          return costs 12 ticks on top of the function's own work. This program makes two calls:
        </p>
        <TeX block>{tex`2 \times (6 + 6) = 24 \text{ of its } 66 \text{ ticks} \approx 36\%`}</TeX>
        <p>
          About a third of the time goes into calling and returning. Real CPUs make calls much cheaper (they even
          predict where each RET will go), but a call is never quite free.
        </p>
      </Callout>

      <h3>A call inside a call</h3>
      <p>
        Nested calls work the same way. Here is the program from “A call inside a call” above, in SAP-8 code. I ran it
        on the same simulator:
      </p>
      <Asm
        lines={[
          [0, "CALL 4", "main program: call f"],
          [1, "OUT", "show the answer"],
          [2, "HLT", "stop"],
          [3, "1", "the number 1"],
          [4, "CALL 7", "f: first call g"],
          [5, "ADD 3", "then add 1"],
          [6, "RET", "f is done"],
          [7, "LDI 5", "g: A = 5"],
          [8, "RET", "g is done"],
        ]}
      />
      <DataTable
        align="left"
        head={["tick", "instruction", "the stack", "SP"]}
        rows={[
          [0, "(start)", "empty", 15],
          [6, "CALL 4 (main → f)", "RAM[15] = 1", 14],
          [12, "CALL 7 (f → g)", "RAM[15] = 1, RAM[14] = 5", 13],
          [22, "RET (g → f)", "takes the 5", 14],
          [34, "RET (f → main)", "takes the 1", 15],
          [38, "OUT", "shows 6", 15],
        ]}
      />
      <p>
        SP goes 15 → 14 → 13 → 14 → 15. Each return takes exactly the note that its own call put there, because a
        function always finishes before the function that called it. That is why “last in, first out” is exactly the
        right shape for function calls.
      </p>

      <h2>Each call gets its own frame</h2>
      <p>
        Real functions need more than a way back. They have <strong>arguments</strong>: the inputs, like the x in{" "}
        <code>show_double(x)</code>. They have <strong>local variables</strong>: variables that belong to one call
        only, like <code>temp</code>. And they often borrow registers, so they save the caller's values first and put
        them back at the end. All of this goes on the stack too. The part of the stack that belongs to one call is
        called its <strong>stack frame</strong>.
      </p>
      <p>
        A function makes room for its whole frame in one step: it subtracts the frame's size from SP. When it returns,
        it adds the size back. Nothing is cleaned up. The bytes simply stop counting, just like the old values in the
        PUSH and POP figure.
      </p>
      <Figure caption="One stack frame on a 64-bit computer, for a function with 2 arguments and 4 local variables. Writing past the end of the local variables runs into the saved register, and then into the way back.">
        <FrameAnatomy />
      </Figure>
      <Callout kind="math" title="How big is a frame?">
        <p>
          On a 64-bit computer, an address is 8 bytes, and so is an ordinary whole number. For a function with 2
          arguments and 4 local variables:
        </p>
        <TeX
          block
        >{tex`\underbrace{8}_{\text{return address}} + \underbrace{8}_{\text{saved register}} + \underbrace{2 \times 8}_{\text{arguments}} + \underbrace{4 \times 8}_{\text{local variables}} = 64 \text{ bytes}`}</TeX>
        <p>
          Small functions often use 16 to 64 bytes. A function with a big local array can use much more. Below, we use
          64 bytes as a typical size.
        </p>
      </Callout>
      <p>
        This answers a question you might not have thought to ask: how can two calls of the same function have
        different values in the same variable? Because a local variable has no fixed address. The compiler turns it
        into “SP plus some number”, for example “temp is 16 bytes past SP”. Each call has its own SP, so each call's{" "}
        <code>temp</code> is in a different place. Compare this with <code>product</code> in Machine Code, which
        always lived at address 14.
      </p>
      <p>
        The answer that a function returns usually travels back in a register. In SAP-8 it is register A:{" "}
        <code>show_double</code> leaves x + x in A. PCs use a register called <code>rax</code>, and ARM phones use one
        called <code>x0</code>.
      </p>

      <h2>Recursion: a function calling itself</h2>
      <p>
        A function may call <em>any</em> function, even itself. This is called <strong>recursion</strong>. It sounds
        like a trick that cannot work, but with a stack it is completely normal: each call gets its own frame, with
        its own copy of every variable.
      </p>
      <p>
        The classic example is the <strong>factorial</strong>, written 4! and said “four factorial”: multiply all the
        whole numbers from 1 up to 4. So 4! = 4 × 3 × 2 × 1 = 24. Notice that 4! = 4 × 3!. A recursive function uses
        exactly that idea:
      </p>
      <Code>
        {
          "def fact(n):\n    if n == 1:\n        return 1\n    smaller = fact(n - 1)\n    return n * smaller\n\nanswer = fact(4)\nprint(answer)"
        }
      </Code>
      <p>
        Line 2 is the <strong>base case</strong>, the stop rule: fact(1) answers at once, with no more calls. Without
        it, the function would call itself for ever.
      </p>
      <Callout kind="math" title="fact(4), step by step">
        <p>Going in, each call has to wait for a smaller one:</p>
        <TeX
          block
        >{tex`\text{fact}(4) = 4 \times \text{fact}(3),\quad \text{fact}(3) = 3 \times \text{fact}(2),\quad \text{fact}(2) = 2 \times \text{fact}(1),\quad \text{fact}(1) = 1`}</TeX>
        <p>Coming back out, each answer is used by the call that is waiting below it:</p>
        <TeX
          block
        >{tex`\text{fact}(1) = 1 \;\to\; \text{fact}(2) = 2 \times 1 = 2 \;\to\; \text{fact}(3) = 3 \times 2 = 6 \;\to\; \text{fact}(4) = 4 \times 6 = 24`}</TeX>
        <p>At the deepest point there are 4 frames of fact on the stack, each with its own n: 4, 3, 2 and 1.</p>
      </Callout>
      <CallStackTower />
      <p>
        Now set n to 7. Our toy stack has 18 slots, and each fact frame needs 3, so only 6 frames fit. fact(7) needs
        7. The code is correct, and it still crashes: it simply goes too deep for this stack. Then try “factorial, no
        stop rule”. Now n goes 4, 3, 2, 1, 0, −1, … and nothing stops it until the stack runs out.
      </p>
      <p>
        Recursion is everywhere, because many things contain smaller copies of themselves. A folder contains folders,
        which contain more folders. A web page is a tree of boxes inside boxes. The tree that the compiler built in{" "}
        <Link to="/machine-code">Machine Code</Link> is handled the same way: to work out (7 + 5) − 2, first work out
        the smaller tree 7 + 5.
      </p>
      <GoDeeper title="Why some recursion is very slow">
        <p>
          In the Fibonacci numbers, each number is the sum of the two before it: 0, 1, 1, 2, 3, 5, 8, … A recursive
          version is very short:
        </p>
        <Code>{"def fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)"}</Code>
        <p>
          But it is terribly slow, because it works out the same answers again and again. fib(30) calls fib(29) and
          fib(28), but fib(29) <em>also</em> calls fib(28), and so on, all the way down. Each call of fib(n) makes 1
          call plus all the calls of fib(n − 1) and fib(n − 2). Counting them gives a famous result, where F(31) =
          1,346,269 is the 31st Fibonacci number:
        </p>
        <TeX
          block
        >{tex`\text{calls}(30) = 2 \times F(31) - 1 = 2 \times 1{,}346{,}269 - 1 = 2{,}692{,}537`}</TeX>
        <p>
          That is nearly 2.7 million calls to get the answer 832,040. The fix is to remember each answer the first
          time it is found (this is called <strong>memoisation</strong>). Then each of the 31 values, fib(0) to
          fib(30), is worked out only once.
        </p>
      </GoDeeper>

      <h2>Stack overflow</h2>
      <p>
        The stack is not endless. The operating system gives each program a fixed amount of memory for it, and every
        call that has not yet returned uses one frame. If calls go too deep, the stack runs out. This is called a{" "}
        <strong>stack overflow</strong>.
      </p>
      <Callout kind="math" title="How deep can a real program go?">
        <p>
          On Linux, a program normally gets 8 MiB of stack. (1 MiB, a <em>mebibyte</em>, is 2²⁰ = 1,048,576 bytes.)
          With frames of 64 bytes:
        </p>
        <TeX
          block
        >{tex`\frac{8 \times 1{,}048{,}576 \text{ bytes}}{64 \text{ bytes per frame}} = \frac{8{,}388{,}608}{64} = 131{,}072 \text{ calls deep}`}</TeX>
        <p>
          Windows gives a program 1 MiB by default, so the same program fits only 1,048,576 ÷ 64 = 16,384 calls deep.
        </p>
      </Callout>
      <p>
        That is plenty for normal code: even 1,000 functions waiting for each other is rare. But a recursion with no
        stop rule never stops, so it hits the limit, however big the stack is.
      </p>
      <Callout kind="fact" title="What happens at the limit">
        <p>
          Just past the end of the stack, the operating system leaves a strip of memory that the program is not
          allowed to touch. The first push into it makes the hardware stop the program and hand control to the
          operating system, which ends it. On Linux you see <code>Segmentation fault</code>; on Windows, a stack
          overflow error. Python stops you earlier, at 1,000 calls deep, with{" "}
          <code>RecursionError: maximum recursion depth exceeded</code>. The programmers' question-and-answer website
          Stack Overflow is named after this error.
        </p>
      </Callout>

      <h3>SAP-8 has no guard</h3>
      <p>
        Our little CPU has no operating system to protect it. When its stack overflows, it just keeps writing, over
        whatever is in the way. This program shows it:
      </p>
      <Asm
        lines={[
          [0, "LDI 0", "x = 0"],
          [1, "CALL 2", "f()"],
          [2, "ADD 6", "f: x = x + 1"],
          [3, "OUT", "print x"],
          [4, "CALL 2", "f() again: no stop rule!"],
          [5, "HLT", "stop (never reached)"],
          [6, "1", "the number 1"],
        ]}
      />
      <p>
        f adds 1, prints, and calls itself again. Every call pushes one more return address: at 15, then 14, 13, and
        so on.
      </p>
      <CpuSim
        programIds={["eat-yourself"]}
        title="When the stack eats the program"
        subtitle="Press Run and turn the speed up. Watch the violet stack area grow toward the program at the top of memory."
      />
      <DataTable
        align="left"
        head={["call", "return address written to", "what was there", "what you see"]}
        rows={[
          ["1–9", "addresses 15, 14, …, 7", "empty memory", "1, 2, 3, …, 9"],
          ["10", "address 6", "the number 1 (now 5)", "14 (that is 9 + 5)"],
          ["11", "address 5", "HLT (now 5)", "19"],
          ["12", "address 4", "the CALL instruction itself", "24, then nothing more"],
        ]}
      />
      <p>
        From the second call on, the return address is always 5: the instruction after the <code>CALL 2</code> at
        address 4. As a number, 5 is <code>0000 0101</code>. As an instruction, its opcode is <code>0000</code>: NOP,
        “do nothing”. So the stack first turned the program's data into the wrong number, and then turned its
        instructions into NOPs. After printing 24 (at tick 196) the CPU runs into the NOPs. Its 4-bit PC goes from 15
        back to 0, like a car's odometer, and a few more CALLs finish the job. In the end every byte except the first
        is a NOP, and the machine runs for ever doing nothing. The stack has eaten the program.
      </p>
      <GoDeeper title="Buffer overflow: the attack that overwrites the way back">
        <p>
          In a frame, the local variables sit close to the return address. Suppose a function keeps a person's name
          in a local array of 16 bytes, and it copies whatever arrives into it without checking the length. If 40
          bytes arrive, the extra bytes spill past the end of the array, toward bigger addresses: over the other
          variables, over the saved register, and over the return address.
        </p>
        <p>
          When the function finishes, RET does what it always does: it pops the return address and jumps there. But
          now an attacker chose those bytes, so the CPU jumps wherever the attacker wanted. For decades this was one
          of the most common ways to break into computers; the Morris worm used it in 1988. Today compilers put a
          secret “canary” value before the return address and check it before RET. Operating systems refuse to run
          code from the stack, and they put the stack at a random address each time. And languages like Python, Java
          and Rust check every array position, so the spill cannot happen at all.
        </p>
      </GoDeeper>

      <h2>Interrupts: calls made by hardware</h2>
      <p>
        Your CPU is busy running a program when you press a key. How does it find out? It could stop every few
        instructions to ask the keyboard “anything new?”, but it would waste most of its time on an answer that is
        nearly always “no”. Instead, the keyboard's controller chip tells the CPU, by pulling a wire to 1. This wire
        is the <strong>interrupt request line</strong> (<strong>IRQ</strong>).
      </p>
      <p>
        The IRQ wire is one more input to the control unit. Between two instructions, the control unit checks it. If
        it is 1, the CPU makes a function call that no instruction asked for. This is an <strong>interrupt</strong>:
      </p>
      <ol>
        <li>The CPU finishes the instruction it is on.</li>
        <li>It pushes the PC (where the program was going next) and the flags onto the stack.</li>
        <li>
          It jumps to a small function written for this device, the <strong>interrupt handler</strong>. The handler's
          address comes from a table in memory, the <strong>interrupt vector table</strong>, which has one entry for
          each kind of interrupt. (On a PC the table has 256 entries.)
        </li>
        <li>
          The handler pushes any registers it is going to use, does its work (for example, it reads the key code),
          and pops them again.
        </li>
        <li>
          It ends with a special return, <strong>return from interrupt</strong> (RTI; on a PC it is called IRET),
          which pops the flags and the PC. The program carries on as if nothing had happened.
        </li>
      </ol>
      <p>
        Why save the flags too? Imagine the program has just done a SUB, and its next instruction is a JZ. If the
        handler does arithmetic of its own, it changes the zero flag. When the program continues, its JZ would decide
        using the wrong flag. A normal call happens at a moment the program chose. An interrupt can happen between{" "}
        <em>any</em> two instructions, so it must leave <em>everything</em> exactly as it found it.
      </p>
      <InterruptDemo />
      <p>
        Run it and press a key. The output goes 1, 2, 3, 65 (A), 4, 5…: the main program carries on counting as if
        nothing happened. Now pick “forgets to save A” and try again. The handler loads the key code into A and never
        puts the old value back, so the main program now counts on from the key code. Real bugs like this are very
        hard to find, because they only appear when a key is pressed at exactly the wrong moment.
      </p>
      <Callout kind="math" title="How much time does a key press cost?">
        <p>
          Suppose the work for one key press takes 2,000 instructions, on a core that does 20 billion instructions per
          second (the number from the CPU chapter). One microsecond (µs) is a millionth of a second.
        </p>
        <TeX
          block
        >{tex`\frac{2{,}000 \text{ instructions}}{20{,}000{,}000{,}000 \text{ instructions per second}} = 0.0000001 \text{ s} = 0.1\ \mu\text{s}`}</TeX>
        <p>
          A fast typist presses about 10 keys a second: 10 × 0.1 µs = 1 µs of work every second. The keyboard uses
          one millionth of the CPU's time. That is the point of interrupts: the CPU never sits waiting for you.
        </p>
      </Callout>
      <p>
        Keys are only the start. A <strong>timer</strong> chip interrupts the CPU many times every second, and that is
        how the operating system lets programs take turns (see <Link to="/operating-system">The Operating System</Link>
        ). Disks, network cards and USB devices use interrupts too (see{" "}
        <Link to="/input-output">Input, Output & the Monitor</Link>). And when you press 2 + 3 in the{" "}
        <Link to="/calculator">calculator scene</Link>, each key press arrives in exactly this way.
      </p>

      <h2>Stacks in real computers</h2>
      <p>Every CPU you own works like this. Only the details differ:</p>
      <DataTable
        align="left"
        head={["CPU", "stack pointer", "call / return", "notes"]}
        rows={[
          ["SAP-8", "SP, 4 bits", "CALL / RET", "a return address is 1 byte"],
          [
            "6502 (Apple II, Commodore 64, NES)",
            "S, 8 bits",
            "JSR / RTS",
            "the stack is addresses 256–511; S points at the next free slot, like ours",
          ],
          [
            "x86-64 (most PCs)",
            "rsp, 64 bits",
            "call / ret",
            "a return address is 8 bytes; rsp points at the last value pushed instead of the next free slot",
          ],
          [
            "ARM64 (phones, Apple Silicon Macs)",
            "sp, 64 bits",
            "bl / ret",
            "bl puts the return address in a register, not on the stack",
          ],
        ]}
      />
      <p>
        ARM's choice is interesting. Its call instruction, <code>bl</code> (“branch with link”), does not touch the
        stack at all. It writes the return address into one register, <code>x30</code>, called the{" "}
        <strong>link register</strong>. That is exactly the “one note” from the start of this chapter. It is faster,
        because a register is quicker than memory, but it has the same problem. So any ARM function that calls another
        function first pushes <code>x30</code> onto the stack itself, and pops it before it returns. The compiler adds
        those two instructions for you.
      </p>
      <p>
        You can even see the stack. When a Python program crashes, it prints a <strong>traceback</strong>: a list of
        the frames on the stack at that moment, oldest first. This version of fact has a bug in its stop rule:
      </p>
      <Code>
        {
          "def fact(n):\n    if n == 1:\n        return 1 / 0  # a bug!\n    smaller = fact(n - 1)\n    return n * smaller\n\nanswer = fact(3)"
        }
      </Code>
      <p>Python 3.13 prints this (slightly shortened):</p>
      <Code>
        {
          'Traceback (most recent call last):\n  File "fact.py", line 7, in <module>\n    answer = fact(3)\n  File "fact.py", line 4, in fact\n    smaller = fact(n - 1)\n  File "fact.py", line 4, in fact\n    smaller = fact(n - 1)\n  File "fact.py", line 3, in fact\n    return 1 / 0  # a bug!\nZeroDivisionError: division by zero'
        }
      </Code>
      <p>
        Read it from the top. The main program (<code>&lt;module&gt;</code>) called fact(3) at line 7. fact(3) called
        fact(2) at line 4. fact(2) called fact(1) at line 4, and fact(1) crashed at line 3. That is the call-stack
        tower, printed as text. Every programming tool can show this list while a program runs. It is called the{" "}
        <strong>call stack</strong>.
      </p>

      <h2>Next: memory that lasts</h2>
      <p>
        Everything in this chapter lives in RAM: the program, its variables, and the stack with every frame and every
        return address. The top of the stack is used so often that a real CPU nearly always finds it in its fastest
        memory, the <em>cache</em>. But RAM has a weakness. Pull the plug, and it all vanishes. The next chapter,{" "}
        <Link to="/storage">Storage</Link>, climbs the whole ladder of memories, from the tiny, fast ones inside the
        CPU to the huge, slow ones that keep your photos for years.
      </p>

      <KeyIdeas
        items={[
          <>
            A plain jump forgets where it came from. To come back, a call first saves the{" "}
            <strong>return address</strong>: the address of the instruction right after the call.
          </>,
          <>
            The <strong>stack</strong> is a pile of values in RAM, plus one register, the{" "}
            <strong>stack pointer</strong>, which holds an address (a <strong>pointer</strong>). PUSH writes at SP, then
            counts down. POP counts up, then reads. Last in, first out.
          </>,
          <>
            <strong>CALL</strong> = push the PC, then jump. <strong>RET</strong> = pop into the PC. The PC already
            points past the CALL, so the return address costs nothing to find.
          </>,
          <>
            Each call gets a <strong>stack frame</strong>: return address, arguments, saved registers and local
            variables. That is why calls never mix up each other's variables, and why <strong>recursion</strong>{" "}
            works.
          </>,
          <>
            The stack has a fixed size. 8 MiB holds 131,072 frames of 64 bytes. Going too deep, or forgetting the stop
            rule, causes a <strong>stack overflow</strong>.
          </>,
          <>
            An <strong>interrupt</strong> is a call made by hardware: finish the instruction, push the PC and the flags,
            jump to the handler. Return from interrupt pops them back.
          </>,
        ]}
      />
    </>
  );
}
