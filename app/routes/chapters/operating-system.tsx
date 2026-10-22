import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas, Steps } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { BootChain, DesktopDispatcher, JugglingCpu, LoaderDemo, ModeBit, TwoAppsOneRam } from "~/widgets/operating-system";

export const meta = () => chapterMeta("operating-system");

export default function Chapter() {
  return (
    <>
      <p>
        Press the power button and, a few seconds later, you see a desktop. Click an icon and an app appears. Music
        plays while you type a message and a web page loads, all at the same time, on a chip that (as we saw in{" "}
        <Link to="/cpu">The CPU</Link>) can only follow one list of instructions per core. So who decides which program
        runs? Who put the program into memory in the first place? And why can't one broken app crash the whole
        machine? All three questions have the same answer: a program called the <strong>operating system</strong>.
      </p>

      <h2>Just another program</h2>
      <p>
        The operating system (<strong>OS</strong>) is Windows, macOS, Linux, Android or iOS. It feels like part of the
        machine, but it is a program: bytes in memory, run by the same fetch–decode–execute loop as the 2 + 3 program
        in SAP-8. Its most important part is the <strong>kernel</strong> (like the kernel, the seed, inside a nut). The
        kernel is the first real program to start, it stays in memory until you switch off, and it is the only program
        allowed to touch the hardware directly. The rest of the OS (the desktop, the file browser, the settings) is made
        of ordinary apps. In this chapter, “the OS” mostly means the kernel.
      </p>
      <p>The kernel has three jobs:</p>
      <ul>
        <li>
          <strong>Share.</strong> There are hundreds of programs but only a few cores and one RAM. The kernel decides
          who gets a core, for how long, and which part of RAM.
        </li>
        <li>
          <strong>Guard.</strong> One app must not read another app's passwords, or crash the whole machine. The
          kernel builds walls between them.
        </li>
        <li>
          <strong>Give simple doors.</strong> An app should not need to know how your particular SSD or Wi-Fi chip
          works. It asks the kernel “save this file” or “send these bytes”, and the kernel's{" "}
          <Link to="/input-output">drivers</Link> do the rest.
        </li>
      </ul>
      <Callout kind="analogy">
        <p>
          The kernel is the front desk of a busy hotel. Guests (apps) each get a room (memory) and a turn at the shared
          facilities (the CPU). They may not enter each other's rooms. For anything outside their room, they must call
          the front desk. Even the room numbers on the doors are given out by the desk, as we will see.
        </p>
      </Callout>

      <h2>Booting: power button to desktop</h2>
      <p>
        Here is the puzzle. When the power is off, RAM is empty: DRAM forgets everything without power (see{" "}
        <Link to="/storage">Storage</Link>). But the CPU can only run instructions that are in memory. So when you press
        the power button, where does the very first instruction come from?
      </p>
      <h3>Step 1: reset</h3>
      <p>
        Pressing the button switches on the power supply. A small circuit holds the CPU's <strong>reset</strong> wire
        at 1 until all the voltages are steady. While reset is 1, every flip-flop in the CPU is forced to a fixed value.
        In SAP-8, reset sets PC = 0, so the first fetch comes from address 0. A PC's processor is wired so that reset
        sets PC = 0xFFFFFFF0, which is 16 bytes below the 4 GiB mark. This fixed starting address is called the{" "}
        <strong>reset vector</strong>.
      </p>
      <h3>Step 2: firmware</h3>
      <p>
        At address 0xFFFFFFF0 there is no RAM. The address decoder (the same kind of circuit as in{" "}
        <Link to="/memory">Memory</Link>) sends this address to a small <strong>flash chip</strong> on the motherboard.
        Flash keeps its bytes without power. This chip holds the <strong>firmware</strong> (on PCs it is called UEFI;
        older PCs had a “BIOS”). The firmware checks the RAM, finds the screen, the keyboard and the SSD, and looks on
        the SSD for the next program.
      </p>
      <p>
        That answers the chicken-and-egg question. The very first program was not loaded by another program: it was
        written into the flash chip at the factory, before the chip was soldered onto the board.
      </p>
      <h3>Step 3: copy, then jump</h3>
      <p>From here, the same move repeats three times:</p>
      <Steps>
        {[
          <>
            The firmware copies the <strong>bootloader</strong> file from the SSD into RAM, then jumps to it.
          </>,
          <>
            The bootloader is a small program with one job: it copies the <strong>kernel</strong> file from the SSD
            into RAM, then jumps to it.
          </>,
          <>
            The kernel sets itself up, copies the <strong>first program</strong> into RAM, then jumps to it. That
            program starts all the others: background helpers, the login screen, and finally your desktop.
          </>,
        ]}
      </Steps>
      <BootChain />
      <Callout kind="idea" title="Booting is not magic">
        <p>
          Each stage is a program that knows where the next stage is stored. It copies those bytes into RAM and runs
          one <code>JMP</code>, the same instruction as in SAP-8. The name comes from the phrase “to pull yourself up
          by your bootstraps”: each small program lifts in a bigger one.
        </p>
      </Callout>
      <Callout kind="math" title="So why does booting take seconds?">
        <p>Copying the kernel is fast. A kernel file of about 15 MB, read from an SSD at about 3 GB/s, takes</p>
        <TeX block>{tex`\frac{15{,}000{,}000\ \text{B}}{3{,}000{,}000{,}000\ \text{B/s}} = 0.005\ \text{s} = 5\ \text{ms}`}</TeX>
        <p>
          Most of the 5–20 seconds go to the firmware testing the hardware, and to the OS starting hundreds of small
          background programs, each loaded with the same copy-then-jump.
        </p>
      </Callout>
      <Callout kind="fact" title="Phones boot the same way">
        <p>
          A phone's main chip has a tiny <em>boot ROM</em> inside it, written when the chip was made. It loads the first
          bootloader from flash, but only after checking its digital signature (a mathematical seal, see{" "}
          <Link to="/network">Sending a Message</Link>), so nobody can swap in a fake OS. Each stage checks the next
          one the same way. This is called <strong>secure boot</strong>.
        </p>
      </Callout>

      <h2>Many apps, one core</h2>
      <p>
        After booting, your computer runs a few hundred programs. A running program is called a{" "}
        <strong>process</strong>: the program's bytes, plus its own memory, plus its saved state. (One app can be
        several processes: browsers often use one per tab.) But a core runs only one list of instructions at a time. How
        do hundreds of processes share a few cores?
      </p>
      <p>They take turns, very fast. And the turns are forced by hardware.</p>
      <h3>The timer interrupt</h3>
      <p>
        Each core has a <strong>timer</strong>: a counter, like the ones in <Link to="/clock">The Clock</Link>, that
        counts down at a fixed speed. During boot, the kernel writes a starting number into it. For example, if the
        timer counts 100 million times a second and the kernel writes 400,000, the counter reaches 0 after 4 ms. Then
        it pulls the core's interrupt wire and starts again from 400,000.
      </p>
      <p>
        As we saw in <Link to="/functions">Functions &amp; the Stack</Link>, an interrupt is a function call made by
        hardware: the core finishes its current instruction, saves the PC and flags on the stack, and jumps to the
        handler that the kernel chose for the timer. That handler is part of the kernel. So whatever an app is doing,
        even an endless loop, the kernel gets control back 250 times every second.
      </p>
      <Callout kind="math" title="How long is 4 ms for a CPU?">
        <TeX block>{tex`\frac{1\ \text{s}}{250} = 0.004\ \text{s} = 4\ \text{ms}`}</TeX>
        <p>A core running at 4 GHz does 4 billion ticks every second, so one 4 ms turn is</p>
        <TeX block>{tex`0.004\ \text{s} \times 4{,}000{,}000{,}000\ \tfrac{\text{ticks}}{\text{s}} = 16{,}000{,}000\ \text{ticks}`}</TeX>
        <p>
          Long enough for millions of instructions, and short enough that you never notice the gaps. (Linux often uses
          250 timer ticks per second; other systems use between about 64 and 1,000.)
        </p>
      </Callout>
      <h3>The context switch</h3>
      <p>
        When the timer handler runs, the kernel may decide it's another process's turn. Swapping one process for
        another is called a <strong>context switch</strong>:
      </p>
      <Steps>
        {[
          <>
            <strong>Save.</strong> The kernel copies all of process A's registers (PC, SP, A, flags and the rest; a
            modern core has about 20 main registers) into A's row of a table in kernel memory, the{" "}
            <strong>process table</strong>.
          </>,
          <>
            <strong>Choose.</strong> The <strong>scheduler</strong>, a function in the kernel, picks who goes next. Say
            B.
          </>,
          <>
            <strong>Load.</strong> The kernel copies B's saved registers from B's row back into the CPU, including B's
            SP and B's PC. It also tells the memory hardware to use B's page table (more about that soon).
          </>,
          <>
            <strong>Return.</strong> It runs “return from interrupt”. The registers now belong to B, so the return
            lands inside B, exactly where B was stopped last time. B carries on as if nothing had happened.
          </>,
        ]}
      </Steps>
      <JugglingCpu />
      <Callout kind="idea">
        <p>
          A process never knows it was paused. Its registers are put back exactly as they were, like a bookmark put
          back in a book. Turn the timer off in the figure to see why the timer must be hardware: a busy app never gives
          the CPU back by itself, so Chat and Music would wait forever.
        </p>
      </Callout>
      <Callout kind="math" title="What does a switch cost?">
        <p>
          A context switch takes about 2 µs (saving, loading, and the caches warming up again). With 4 ms slices, the
          part of the time lost to switching is
        </p>
        <TeX block>{tex`\frac{2\ \mu\text{s}}{4\ \text{ms}} = \frac{0.000002}{0.004} = 0.0005 = 0.05\%`}</TeX>
        <p>
          Try the slider. With 10 µs slices, the core spends 2 / (10 + 2) ≈ 17% of its time just switching. With 500
          ms slices, switching is free, but a key you type can wait 2 × 500 ms = 1 second. A few milliseconds is a good
          middle.
        </p>
      </Callout>

      <h2>The scheduler: who goes next?</h2>
      <p>
        Most of the time, most processes have nothing to do. Every process is in one of three <strong>states</strong>:
      </p>
      <DataTable
        align="left"
        head={["state", "meaning", "example"]}
        rows={[
          ["running", "on a core right now", "the browser loading a page"],
          ["ready", "wants a core, waiting for its turn", "a game computing the next picture"],
          ["waiting", "waiting for something: a key, a packet, the SSD, a timer", "the chat app, until you type"],
        ]}
      />
      <p>
        A waiting process is not in the queue at all, so it uses 0% of the CPU. When its event arrives (for example, an
        interrupt from the keyboard), the kernel marks it ready again.
      </p>
      <p>
        The simplest rule for choosing is <strong>round-robin</strong>: take turns in a circle. Real schedulers add{" "}
        <strong>priorities</strong>. A process that was waiting for you (you just pressed a key) gets to go soon, so
        typing feels instant. Music is never allowed to starve, because an empty sound buffer is a click you can hear.
      </p>
      <p>
        When every process is waiting, the kernel runs <code>HLT</code> (“halt until interrupt”): the core stops
        fetching and sleeps until the next interrupt wakes it. Windows shows this time as the “System Idle Process”,
        often at 95% or more. Sleeping cores use very little power, which is how a laptop battery lasts all day.
      </p>
      <Callout kind="math" title="How can 50 apps run on 8 cores?">
        <p>
          <strong>Usually, most are waiting.</strong> Of a few hundred processes, only a handful are ready at any
          moment. If 5 are ready and you have 8 cores, each one gets a whole core, and 3 cores sleep.
        </p>
        <p>
          <strong>Worst case: all 50 are busy.</strong> Then each core shares about
        </p>
        <TeX block>{tex`\frac{50\ \text{apps}}{8\ \text{cores}} = 6.25 \approx 6\ \text{apps per core}`}</TeX>
        <p>
          Each app runs for 4 ms, then waits while the other 5 have their turn: 5 × 4 ms = 20 ms. Each gets about 1/6
          of a core, or 4 GHz ÷ 6 ≈ 670 million ticks per second. Everything is slower, but nothing stops. In total,
          the kernel hands out 8 × 250 = 2,000 turns every second.
        </p>
      </Callout>
      <GoDeeper title="Two cores, one counter: race conditions">
        <p>
          With 8 cores, two processes (or two parts of one program) really do run at the same moment. Suppose both want
          to add 1 to a shared number <code>count</code> = 5, using SAP-8 style code: <code>LDA count</code>,{" "}
          <code>ADD one</code>, <code>STA count</code>. If their steps happen to interleave:
        </p>
        <DataTable
          align="left"
          head={["time", "core 1", "core 2", "count in RAM"]}
          rows={[
            ["1", "LDA count → A = 5", "", "5"],
            ["2", "", "LDA count → A = 5", "5"],
            ["3", "ADD one → A = 6", "", "5"],
            ["4", "", "ADD one → A = 6", "5"],
            ["5", "STA count → 6", "", "6"],
            ["6", "", "STA count → 6", "6"],
          ]}
        />
        <p>
          Two additions, but the count went from 5 to 6, not 7. This bug is called a <strong>race condition</strong>,
          and it may happen only once in a million runs. The fixes: <em>atomic</em> instructions, which read, add and
          write in one step that no other core can split, and <em>locks</em>, a shared flag that says “I'm using this,
          wait your turn”.
        </p>
      </GoDeeper>

      <h2>Walls: kernel mode and system calls</h2>
      <p>
        The scheduler only works if apps can't switch off the timer. The process table only works if apps can't
        overwrite it. So the CPU itself must stop apps from doing certain things. It does this with one extra
        flip-flop: the <strong>mode bit</strong>.
      </p>
      <ul>
        <li>
          Mode = 1 is <strong>kernel mode</strong>. Every instruction and every address is allowed. Only kernel code
          runs like this.
        </li>
        <li>
          Mode = 0 is <strong>user mode</strong>. All apps run like this. Some instructions are{" "}
          <strong>privileged</strong> (forbidden in user mode): <code>HLT</code>, turning interrupts off, changing the
          timer, changing page tables. And device addresses are out of reach.
        </li>
      </ul>
      <p>
        How does the CPU “know” an instruction is forbidden? It's one more pattern for the control unit's decoder (see{" "}
        <Link to="/logic-gates">Logic Gates</Link>): a gate recognises the privileged opcodes, and
      </p>
      <TeX block>{tex`\text{trap} = \text{privileged} \cdot \overline{\text{mode}}`}</TeX>
      <p>
        If that wire is 1, the instruction is not done. Instead the CPU makes a <strong>trap</strong>: like an
        interrupt, it saves the PC, sets mode = 1, and jumps to a handler the kernel chose at boot. The kernel then
        decides what to do. Usually, it stops the app.
      </p>
      <p>
        But apps do need the hardware: to save a file, draw a window, send a message. So they ask the kernel through a{" "}
        <strong>system call</strong>, the one controlled door. Here is <code>print("hi")</code> on Linux:
      </p>
      <Steps>
        {[
          <>
            Your code calls <code>print("hi")</code>, a normal function in a library that came with the app.
          </>,
          <>
            The library puts numbers into registers: which service (1 means “write”), where to (file 1, the app's
            output), where the bytes are (the address of “hi”) and how many (2). Programmers write this as{" "}
            <code>write(1, "hi", 2)</code>.
          </>,
          <>
            It runs the <code>SYSCALL</code> instruction. In one step, the CPU saves the return address, sets mode = 1,
            and jumps to the kernel's entry address. The app cannot choose where it lands.
          </>,
          <>
            The kernel checks the request, then asks the driver to do the work. The driver writes the device's
            registers (see <Link to="/input-output">Input, Output &amp; the Monitor</Link>).
          </>,
          <>
            <code>SYSRET</code> sets mode = 0 and returns to the app, with the answer in a register (2 = “2 bytes
            written”).
          </>,
        ]}
      </Steps>
      <ModeBit />
      <Callout kind="idea">
        <p>
          Every file you save, every packet you send and every window you open goes through system calls. Linux has a
          few hundred of them, each with a number: <code>read</code> = 0, <code>write</code> = 1, and so on. That
          numbered list is the whole “menu” an app can order from.
        </p>
      </Callout>
      <Callout kind="fact">
        <p>
          Real chips have more than one bit for this. x86 processors (the kind in most PCs and laptops) have four levels (“rings” 0 to 3), and ARM chips
          have four “exception levels”. But operating systems mostly use just two: one for the kernel, one for apps.
        </p>
      </Callout>

      <h2>Every app gets its own memory</h2>
      <p>
        Two apps are running. Both were built to keep their data at address 0x00403A7C. How can that work? Because the
        addresses an app uses are not the real RAM addresses. Between the core and RAM sits a small piece of hardware,
        the <strong>MMU</strong> (memory management unit). On every load, every store and every instruction fetch, it
        translates the app's <strong>virtual address</strong> into a <strong>physical address</strong> (the real place
        in RAM). It uses a table that the kernel fills in for each process: the <strong>page table</strong>.
      </p>
      <p>
        A table with one entry per byte would be far too big. So memory is cut into <strong>pages</strong> of 4 KiB:
      </p>
      <TeX block>{tex`4\ \text{KiB} = 2^{12} = 4{,}096\ \text{bytes}`}</TeX>
      <p>
        The page table says, for each page the app uses, which <strong>frame</strong> (a 4 KiB slot of real RAM) holds
        it. Inside a page nothing moves: byte 0xA7C of the page is byte 0xA7C of the frame.
      </p>
      <p>
        Because 4,096 is exactly <TeX>{"2^{12}"}</TeX>, splitting an address costs nothing in hardware. The low 12 bits
        are the <strong>offset</strong> inside the page, and the bits above them are the <strong>page number</strong>.
        No division needed, just wires. It's the same as reading the decimal number 7,384 as “thousand number 7,
        position 384 inside it”.
      </p>
      <Callout kind="math" title="Translating 0x00403A7C, step by step">
        <p>Write the 32-bit address in binary and cut it after 20 bits:</p>
        <TeX block>{tex`\texttt{0x00403A7C} = \underbrace{0000\,0000\,0100\,0000\,0011}_{\text{page: top 20 bits}}\;\underbrace{1010\,0111\,1100}_{\text{offset: low 12 bits}}`}</TeX>
        <TeX block>{tex`\text{page} = \texttt{0x00403A7C} \gg 12 = \texttt{0x403} \qquad \text{offset} = \texttt{0x00403A7C} \;\&\; \texttt{0xFFF} = \texttt{0xA7C}`}</TeX>
        <p>
          (Zeros at the front don't change a number, so 0x00403 and 0x403 are the same page.) The MMU looks up page
          0x403 in this app's page table and finds frame 0x1F2. Then:
        </p>
        <TeX block>{tex`\text{physical} = \text{frame} \times 4096 + \text{offset} = \texttt{0x1F2} \times \texttt{0x1000} + \texttt{0xA7C} = \texttt{0x1F2A7C}`}</TeX>
        <p>
          Multiplying by 0x1000 in hex just adds three zeros: 0x1F2000 + 0xA7C = 0x1F2A7C. In decimal: 498 × 4,096 +
          2,684 = 2,042,492.
        </p>
      </Callout>
      <p>
        The other app's page table maps <em>its</em> page 0x403 to a different frame, for example 0x1F7. Same virtual
        address, different real place. Neither app can even name the other's memory: no virtual address in its table
        leads there.
      </p>
      <TwoAppsOneRam />
      <Callout kind="idea" title="The page table is also the wall">
        <p>
          Each page-table entry has a few permission bits next to the frame number: “present”, “writable”, “user mode
          may use this”. The kernel's own pages and the device addresses are marked “kernel only”. That's why the “Write
          to the screen” try in the mode-bit figure trapped.
        </p>
      </Callout>
      <Callout kind="fact">
        <p>
          16 GiB of RAM is <TeX>{"2^{34}"}</TeX> bytes, so it holds <TeX>{"2^{34} / 2^{12} = 2^{22} = 4{,}194{,}304"}</TeX>{" "}
          frames. And on a 64-bit PC, each app gets its own virtual space of <TeX>{"2^{47}"}</TeX> bytes = 128 TiB,
          thousands of times more than any real RAM. Only the pages it actually uses get a frame.
        </p>
      </Callout>
      <GoDeeper title="Why page tables have levels">
        <p>
          A 64-bit PC uses 48-bit virtual addresses. With 4 KiB pages, that leaves 48 − 12 = 36 bits of page number:{" "}
          <TeX>{"2^{36} = 68{,}719{,}476{,}736"}</TeX> possible pages. A flat table with one 8-byte entry for each would
          be <TeX>{"2^{36} \\times 8\\ \\text{B} = 2^{39}\\ \\text{B} = 512\\ \\text{GiB}"}</TeX> for every process: far
          bigger than your RAM.
        </p>
        <p>
          So the 36 bits are cut into four pieces of 9 bits. Each piece picks one entry in a small table of{" "}
          <TeX>{"2^9 = 512"}</TeX> entries × 8 B = 4,096 B, exactly one page. The first table says where the second
          table is, and so on: 9 + 9 + 9 + 9 + 12 = 48 bits. Tables for unused areas simply don't exist, so a small
          program needs only a handful of 4 KiB tables.
        </p>
        <p>
          But now one memory access needs four extra table reads! To avoid that, the MMU keeps a small cache of recent
          translations, the <strong>TLB</strong> (translation lookaside buffer). Programs use the same pages again and
          again (locality, from <Link to="/storage">Storage</Link>), so the TLB answers almost every time and
          translation is nearly free.
        </p>
      </GoDeeper>

      <h2>Page faults and swap</h2>
      <p>
        What if the MMU finds no entry for a page, or an entry marked “not present”? It can't translate, so it makes a{" "}
        <strong>page fault</strong>: a trap into the kernel. The kernel looks at its own records and decides:
      </p>
      <ul>
        <li>
          <strong>The app has no right to this page</strong>, for example a bug that uses address 0. The kernel stops
          the app. On Linux and macOS you see “Segmentation fault”, on Windows “Access violation”. Only that app dies,
          because the other apps' pages were never reachable from it.
        </li>
        <li>
          <strong>The page is valid but not in RAM right now.</strong> The kernel brings it in, fills in the table
          entry, and runs the same instruction again. The app never notices, except for the time it took.
        </li>
      </ul>
      <p>
        The second case makes <strong>swap</strong> possible. When RAM is full, the kernel picks a page that nobody
        has used for a while, copies it to a file on the SSD (the swap file), and marks its entry “not present”. Now
        that frame is free for someone else. If the owner touches the page again: page fault, and the kernel copies it
        back. Try it in the figure above: press <em>Open Photos</em>, then let Chat store at a “more data” address.
      </p>
      <Callout kind="math" title="Why a full RAM makes the computer crawl">
        <p>
          A RAM access takes about 80 ns. Reading a page back from an SSD takes about 80 µs = 80,000 ns: 1,000 times
          slower (see <Link to="/storage">Storage</Link>). If just 1 access in 1,000 needs the SSD, the average access
          takes
        </p>
        <TeX block>{tex`0.999 \times 80\ \text{ns} + 0.001 \times 80{,}000\ \text{ns} = 79.92 + 80 \approx 160\ \text{ns}`}</TeX>
        <p>
          Twice as slow on average. At 1 in 100, it's 0.99 × 80 + 0.01 × 80,000 ≈ 879 ns: 11 times slower. That is the
          moment your computer starts to crawl and you hear yourself say “I have too many tabs open”.
        </p>
      </Callout>

      <h2>Launching an app: the loader</h2>
      <p>
        Now we can answer “who put the program into memory?” You double-click an icon. The desktop program asks the
        kernel, with a system call, to start a new process from that file. The kernel's <strong>loader</strong> then:
      </p>
      <Steps>
        {[
          <>
            Reads the first bytes, the <strong>header</strong>. On Linux they are <code>7F 45 4C 46</code> (“\x7FELF”),
            on Windows <code>4D 5A</code> (“MZ”), on macOS <code>CF FA ED FE</code>: the magic numbers from{" "}
            <Link to="/bits-meaning">Who Decides What Bits Mean?</Link> The header also says which CPU the code is for,
            and gives the <strong>entry point</strong>: the address of the first instruction.
          </>,
          <>
            Makes a new process: a new row in the process table and an empty page table, a fresh{" "}
            <strong>address space</strong>.
          </>,
          <>Maps the code and the data: page-table entries that point at the pieces of the file.</>,
          <>
            Makes a stack (Linux allows it to grow to 8 MiB) and an empty <strong>heap</strong> for memory the app asks
            for later.
          </>,
          <>
            Sets the saved PC to the entry point and SP to the top of the stack, and marks the process ready. The
            scheduler then starts it like any other: “return from interrupt” lands on its first instruction.
          </>,
        ]}
      </Steps>
      <LoaderDemo />
      <Callout kind="math" title="Copy everything, or only what's needed?">
        <p>Copying a whole 50 MB app at 3 GB/s would take</p>
        <TeX block>{tex`\frac{50{,}000{,}000\ \text{B}}{3{,}000{,}000{,}000\ \text{B/s}} \approx 0.017\ \text{s} = 17\ \text{ms}`}</TeX>
        <p>
          That's quick, but many apps are much bigger, and most of an app's code is never used in a given session. So
          real loaders are lazy. The 50 MB is about 50,000,000 / 4,096 ≈ 12,200 pages, and each one is copied only at
          its first page fault, if that ever happens.
        </p>
      </Callout>
      <Callout kind="idea" title="The whole chain">
        <p>
          Factory → firmware → bootloader → kernel → loader → your app. Every link does the same thing: copy bytes into
          RAM, then jump to them.
        </p>
      </Callout>
      <GoDeeper title="The heap: malloc and free">
        <p>
          The stack is for function calls (see <Link to="/functions">Functions &amp; the Stack</Link>). But some data
          has a size you only know later, like a photo the user opens. For this, the app asks for memory from the{" "}
          <strong>heap</strong>. In the C language, <code>malloc(3000000)</code> returns the address of a free block
          of 3 MB, and <code>free(address)</code> gives it back. A library inside the app keeps a list of the free and
          used blocks. When the heap is too small, it asks the kernel for more pages, with a system call.
        </p>
        <p>Two classic problems:</p>
        <ul>
          <li>
            <strong>Memory leak:</strong> forgetting to call <code>free</code>. The app's memory grows and grows. (When
            the app quits, the kernel takes back all its frames anyway.)
          </li>
          <li>
            <strong>Fragmentation:</strong> the free space is cut into small holes. With two free holes of 10 KB each,
            a request for 15 KB fails, even though 20 KB is free in total.
          </li>
        </ul>
      </GoDeeper>

      <h2>Keys, clicks, packets and pixels</h2>
      <p>
        One more puzzle. You have three windows open and you press “h”. Which app gets it? You click where two windows
        overlap. Which app gets the click? A packet arrives from the internet. For which app? And who decides what the
        screen shows where windows overlap?
      </p>
      <p>First, an app with a window is a simple loop:</p>
      <pre className="not-prose scroll-thin overflow-x-auto rounded-md border border-line bg-panel px-4 py-3 font-mono text-[0.8125rem] leading-relaxed text-ink sm:text-sm">
        {`loop forever:
  wait for an event   ← sleeps here (waiting)
  handle it           ← e.g. add the letter
  redraw the window`}
      </pre>
      <p>
        The kernel and the <strong>window system</strong> (a part of the OS that manages windows) put events into each
        app's queue:
      </p>
      <ul>
        <li>
          <strong>Keys go to the focus.</strong> The OS remembers which window has the <strong>focus</strong>, usually
          the last one you clicked. When the keyboard interrupt delivers a key code, the OS adds it to that window's
          queue.
        </li>
        <li>
          <strong>Clicks go by hit-testing.</strong> The OS keeps the windows in a list from front to back. For a click
          at (x, y) it asks each window, front first: is x between your left and right edges, and y between your top
          and bottom? The first window that says yes gets the click, in its own coordinates (x − left, y − top).
        </li>
        <li>
          <strong>Pixels are composited.</strong> Apps don't draw on the screen. Each app draws into its own private
          image in RAM. The <strong>compositor</strong> paints these images into the real screen image (the{" "}
          <Link to="/graphics">framebuffer</Link>) from back to front, so the front windows cover the back ones.
        </li>
        <li>
          <strong>Packets go by port number.</strong> Every network packet carries a 16-bit <strong>port</strong>{" "}
          number, from 0 to 65,535. When the chat app opened its connection, the kernel noted “port 51234 → Chat”. The
          IP address (your computer's address on the internet) finds your computer; the port finds the app.
        </li>
      </ul>
      <DesktopDispatcher />
      <Callout kind="math" title="Pixels in RAM">
        <p>Each pixel takes 4 bytes (red, green, blue, and how see-through it is). One 800 × 600 window needs</p>
        <TeX block>{tex`800 \times 600 \times 4\ \text{B} = 1{,}920{,}000\ \text{B} \approx 1.92\ \text{MB}`}</TeX>
        <p>The whole 1920 × 1080 screen image is</p>
        <TeX block>{tex`1920 \times 1080 \times 4\ \text{B} = 8{,}294{,}400\ \text{B} \approx 8.3\ \text{MB}`}</TeX>
        <p>
          Rebuilt 60 times a second, that's about 498 MB of pixels per second, so the compositor usually gets help from
          the graphics chip.
        </p>
      </Callout>

      <h2>One pattern: tables and routing</h2>
      <p>
        Look back over this chapter. Almost everything the OS does is the same trick: keep a table, look something up,
        send it to the right place.
      </p>
      <DataTable
        align="left"
        head={["table", "look up by", "find", "used for"]}
        rows={[
          ["interrupt table", "interrupt number", "handler address", "timer → scheduler, keys → driver"],
          ["process table", "process number", "saved registers, state", "taking turns"],
          ["page tables", "process + page number", "frame + permissions", "private memory, walls"],
          ["system call table", "call number (1)", "kernel function (write)", "the safe doors"],
          ["file system table", "file name", "blocks on the SSD", "files (Storage)"],
          ["window list", "front-to-back order", "focus, hit-test winner", "keys, clicks, pixels"],
          ["port table", "port number", "process", "network packets"],
        ]}
      />
      <p>
        None of these tables is magic. Each one is bytes in RAM, filled in by the kernel and read by code, or by
        hardware like the MMU and the interrupt wiring. It's the same kind of lookup you have seen since the control
        unit in <Link to="/cpu">The CPU</Link>.
      </p>
      <p>
        That completes the system: a CPU, memory, storage, devices, and the program that manages them all. In the next
        part we follow real events through every layer at once, starting with{" "}
        <Link to="/calculator">pressing 2 + 3</Link>.
      </p>

      <KeyIdeas
        items={[
          <>
            The OS is a program. Its core, the <strong>kernel</strong>, starts first, owns the hardware, and shares the
            CPU and RAM among all the other programs.
          </>,
          <>
            Booting is a chain of <strong>copy bytes into RAM, then JMP</strong>: reset vector → firmware → bootloader
            → kernel → first program. The first link was written into flash at the factory.
          </>,
          <>
            A <strong>timer interrupt</strong> gives the kernel control about 250 times a second. A{" "}
            <strong>context switch</strong> saves one process's registers in the process table and loads another's. It
            costs about 0.05% of the time.
          </>,
          <>
            Processes are <strong>running</strong>, <strong>ready</strong> or <strong>waiting</strong>. Waiting ones
            use 0% CPU, which is why hundreds of processes fit on a few cores.
          </>,
          <>
            The <strong>mode bit</strong> separates kernel mode from user mode. Apps reach the hardware only through{" "}
            <strong>system calls</strong>, which enter the kernel at a fixed address.
          </>,
          <>
            The <strong>MMU</strong> translates every address through the process's page table: page = address ≫ 12,
            offset = the low 12 bits. Same virtual address, different frames. No entry → <strong>page fault</strong>.
          </>,
          <>
            The OS keeps tables and routes things: keys to the focus, clicks by hit-test, packets by port, pixels
            through the compositor.
          </>,
        ]}
      />
    </>
  );
}
