import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import {
  AChain,
  ByteLenses,
  FileXray,
  FollowTheA,
  HiThreeWays,
  OpcodeDecoder,
  SevenSegDecoder,
} from "~/widgets/bits-meaning";
import { CpuSim } from "~/widgets/cpu-sim";

export const meta = () => chapterMeta("bits-meaning");

export default function BitsMeaning() {
  return (
    <>
      <p>
        Once people learn that a computer stores everything as 0s and 1s, they often ask the same question. The letter
        ‘A’ is stored as <code>0100 0001</code>. Fine. But how does the computer <em>know</em> that those bits are an
        ‘A’, and not the number 65? And how does the monitor know that it should draw an ‘A’? This chapter answers that
        question completely, with no step skipped. The short answer surprises most people: the computer never knows.
        The meaning is not stored in the bits. It comes from whatever <em>reads</em> them.
      </p>

      <h2>A byte means nothing alone</h2>
      <p>
        Let's open a computer and look at one byte of RAM, say the byte at address 200. It is eight tiny storage cells
        (see <Link to="/memory">Memory</Link>). Two of them hold a charge and six don't: <code>0100 0001</code>. What
        is it? The number 65? The letter ‘A’? A shade of grey? An instruction for the CPU?
      </p>
      <p>
        The byte itself cannot tell you. There is no ninth “type” bit that says “this one is a letter”. There is no
        label, no colour, no hidden note. A memory chip stores bits and nothing else, and the same eight cells could
        hold any of those things. The meaning comes from <strong>whatever reads the byte</strong>: which circuit,
        which program, which rule.
      </p>
      <Callout kind="analogy">
        <p>
          Someone writes the digits <b>1225</b> on a piece of paper. Is it a PIN code? A price, $12.25? A date,
          December 25th? A hotel room on the 12th floor? The paper doesn't know. The ink is the same in every case.
          The person reading it decides, from the situation: at a cash machine it's a PIN, on a shop shelf it's a
          price.
        </p>
      </Callout>
      <Callout kind="idea" title="The whole chapter in three lines">
        <p>Bits have no meaning by themselves. Meaning comes from three places:</p>
        <ol className="ml-5 list-decimal space-y-1">
          <li>
            <b>Agreements people made:</b> codes and standards like ASCII, Unicode and USB.
          </li>
          <li>
            <b>Which circuit or program reads the bits:</b> an ADD treats them as a number, a font lookup as a
            character, the CPU's fetch as an instruction.
          </li>
          <li>
            <b>Labels people add:</b> file names like <code>.jpg</code> and “magic numbers” at the start of files.
          </li>
        </ol>
        <p>The rest of this chapter shows each one, with real numbers.</p>
      </Callout>

      <h2>One byte, many readers</h2>
      <p>
        Here is the same byte read by eight different readers. Each reader is a rule. Flip a bit and watch every
        reading change at the same moment, because the readers all look at the same eight bits.
      </p>
      <ByteLenses />
      <p>
        Try <code>193</code> = <code>1100 0001</code>. As a whole number it is 193. As a signed number it is −63. Is
        one of them wrong? No. They are two different rules applied to the same bits, and the computer will follow
        whichever rule the program asks for.
      </p>
      <Callout kind="math" title="0100 0001, four ways">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            Whole number: the 1s sit in the 64s place and the 1s place, so <TeX>{"64 + 1 = 65"}</TeX>.
          </li>
          <li>
            Signed: the left bit is 0, so nothing changes: +65. For <code>1100 0001</code> the left bit is worth −128:{" "}
            <TeX>{"-128 + 64 + 1 = -63"}</TeX>.
          </li>
          <li>
            Brightness: <TeX>{"65 / 255 \\approx 0.25"}</TeX>, so about 25% of full light, a dark grey.
          </li>
          <li>
            SAP-8 instruction: the left four bits <code>0100</code> = 4 = STA, the right four bits <code>0001</code> =
            1. So it is <code>STA 1</code>: “store register A into address 1”.
          </li>
        </ul>
      </Callout>
      <p>Longer data works the same way. Here are three bytes, <code>48 69 21</code> in hex, read by four readers:</p>
      <HiThreeWays />

      <h2>Codes are human agreements</h2>
      <p>
        So where do rules like “65 means A” come from? From people. Long before computers, people made codes to send
        letters as simple signals:
      </p>
      <ul>
        <li>
          <strong>Morse code</strong> (1840s) sends letters as short and long beeps. E, the most common letter in
          English, got the shortest code: one short beep, “·”.
        </li>
        <li>
          <strong>Braille</strong> (1820s) uses 6 dots, each raised or flat. That gives <TeX>{"2^6 = 64"}</TeX>{" "}
          patterns, enough for letters, digits and punctuation.
        </li>
        <li>
          <strong>ASCII</strong> (1963) uses 7 bits: <TeX>{"2^7 = 128"}</TeX> codes. A committee of engineers decided
          that A is 65.
        </li>
        <li>
          <strong>Unicode</strong> (1991 onwards) gives a number to more than 150,000 characters from every
          writing system, plus emoji. <strong>UTF-8</strong> is the agreed way to pack those numbers into bytes (see{" "}
          <Link to="/binary">Binary</Link>).
        </li>
      </ul>
      <p>
        Why 65, and not 1? The committee chose numbers that made machines simpler. Written in 7 bits, 65 is{" "}
        <code>100 0001</code>: the left part <code>10</code> says “capital letters” and the right part{" "}
        <code>0 0001</code> says “letter number 1”. B is <TeX>{"64 + 2 = 66"}</TeX> and Z is{" "}
        <TeX>{"64 + 26 = 90"}</TeX>. Small letters start at 96, so a is 97. Digits start at 48, so the character ‘7’
        is <TeX>{"48 + 7 = 55"}</TeX>. Physics did not decide any of this. A meeting did.
      </p>
      <Callout kind="idea">
        <p>
          Two computers understand each other only because <b>both use the same published table</b>. When I send you
          the byte 65 and your computer shows ‘A’, that is not because 65 “is” A. It is because your computer and mine
          follow the same agreement.
        </p>
      </Callout>
      <p>
        What happens when the two sides use different tables? You have probably seen it. The letter é has the Unicode
        number 233, and UTF-8 stores it as two bytes, <code>C3 A9</code>. An old program that uses the Latin-1 table
        (one byte = one letter) reads <code>C3</code> as ‘Ã’ and <code>A9</code> as ‘©’. So “café” arrives as “cafÃ©”.
        The bytes arrived perfectly; the reader used the wrong table. This garbled text has a Japanese name,{" "}
        <strong>mojibake</strong>, “changed characters”.
      </p>

      <h2>Reader one: the instruction</h2>
      <p>
        Inside the CPU, the reader is the <strong>instruction</strong>. An ADD instruction always treats its inputs as
        whole numbers. It has no choice: the <Link to="/adder">adder</Link> circuit is wired to add place values, and
        it never asks what the bits are “for”.
      </p>
      <p>
        A different instruction can read the very same bits with a different rule. Real CPUs have
        <strong> floating-point</strong> instructions, which read 4 bytes as a fraction written in scientific
        notation (see the “Fractions” section in <Link to="/binary">Binary</Link>). The 4 bytes{" "}
        <code>41 20 00 00</code> mean 1,092,616,192 to an integer ADD, and exactly 10.0 to a floating-point add.
      </p>
      <Callout kind="math" title="One pattern, 1,092,616,192 or 10.0">
        <p>
          The bits are <code>0 10000010 01000000000000000000000</code>.
        </p>
        <p>
          As a whole number, add the place values: <TeX>{"2^{30} + 2^{24} + 2^{21} = 1{,}092{,}616{,}192"}</TeX>.
        </p>
        <p>
          As a float, split into three fields. Sign = 0 (positive). Exponent = <code>10000010</code> = 130, and the
          rule says subtract 127: <TeX>{"130 - 127 = 3"}</TeX>. Fraction = <code>01</code> followed by zeros ={" "}
          <TeX>{"0.25"}</TeX>. So
        </p>
        <TeX block>{tex`(1 + 0.25) \times 2^{3} = 1.25 \times 8 = 10.0`}</TeX>
      </Callout>
      <p>
        Printing is the same story. To show the byte 65 on screen, a program can call one of two{" "}
        <Link to="/functions">functions</Link>:
      </p>
      <ul>
        <li>
          <strong>“Print as a number”</strong> divides by 10: <TeX>{"65 \\div 10 = 6"}</TeX> remainder 5. It turns
          each digit into its character code by adding 48: <TeX>{"6 + 48 = 54"}</TeX> and{" "}
          <TeX>{"5 + 48 = 53"}</TeX>. Then it draws characters 54 and 53, which are “6” and “5”. You see{" "}
          <b>65</b>. (The <Link to="/calculator">calculator scene</Link> does exactly this.)
        </li>
        <li>
          <strong>“Print as a letter”</strong> does no maths. It draws character 65 directly. You see <b>A</b>.
        </li>
      </ul>
      <p>
        Same byte, two different pieces of code, two different screens. In Python you choose with{" "}
        <code>print(65)</code> or <code>print(chr(65))</code>.
      </p>

      <h2>Reader two: the program's types</h2>
      <p>
        So who chooses the right instruction? The programmer, with help from the <strong>compiler</strong> (the
        program that turns code into <Link to="/machine-code">machine code</Link>). In the C language, these two lines
        put exactly the same byte, <code>0x41</code>, into memory:
      </p>
      <pre>
        <code>{"int  x = 65;    // a whole number\nchar c = 'A';   // a character"}</code>
      </pre>
      <p>
        The words <code>int</code> and <code>char</code> are <strong>types</strong>: notes for the compiler. Later,
        when you write <code>x + 1</code>, the compiler reads its note and picks an ADD. When you print{" "}
        <code>c</code>, it picks the “print as a letter” code. After compiling, the notes are thrown away. The machine
        code has only instructions and addresses; the byte in memory is still just <code>0100 0001</code>.
      </p>
      <Callout kind="warn" title="But Python knows the type!">
        <p>
          Some languages, like Python, do keep a small label next to each value while the program runs, for example
          “this is text”. But look closely: that label is <em>more bits</em>, written by Python's own code, and it
          means something only because Python's own code checks it. It is the same idea one level up: a reader
          (Python) following its own rule. Still no magic.
        </p>
      </Callout>

      <h2>Reader three: the program counter</h2>
      <p>
        Here is the most surprising reader. How does the CPU know whether a byte is an instruction or a piece of data?
        It doesn't. A byte <strong>becomes an instruction</strong> the moment the program counter (PC) points at it
        (see <Link to="/cpu">The CPU</Link>). In SAP-8, the number 47 = <code>0010 1111</code> <em>is</em>{" "}
        <code>ADD 15</code>, if the PC ever lands on it.
      </p>
      <p>
        This tiny program is meant to show the letter A. Address 0 says <code>LDA 2</code> (load the byte at address
        2), address 1 says <code>OUT</code>, and address 2 holds the data: 65, the letter A. But the programmer forgot
        the <code>HLT</code> at the end. Step through it and watch what happens after the 65 appears.
      </p>
      <CpuSim
        programIds={["forgot-hlt"]}
        initial="forgot-hlt"
        title="Forgot the HLT: the CPU runs the letter ‘A’"
        subtitle="Address 2 holds the letter A (65), meant as data. After OUT shows 65, nothing tells the CPU to stop, so the PC moves on to address 2 and fetches 65 as an instruction."
      />
      <Callout kind="math" title="What the CPU did, step by step">
        <ol className="ml-5 list-decimal space-y-1.5">
          <li>
            Address 0, <code>LDA 2</code>: register A = 65. Address 1, <code>OUT</code>: the display shows 65. So far,
            so good.
          </li>
          <li>
            The PC is now 2. The CPU fetches the byte there, 65 = <code>0100 0001</code>, and decodes it like any
            other instruction: <code>0100</code> = STA, <code>0001</code> = address 1. So it runs <code>STA 1</code>{" "}
            and writes 65 into address 1, <b>on top of its own OUT instruction</b>.
          </li>
          <li>
            Addresses 3 to 15 hold 0, and 0 = <code>0000 0000</code> = <code>NOP</code> (“do nothing”). The CPU runs
            13 NOPs.
          </li>
          <li>
            The PC has only 4 bits, so after 15 it wraps around to 0. <code>LDA 2</code> again, then address 1, which
            is now 65 = <code>STA 1</code> instead of <code>OUT</code>. The display never changes again, and the CPU
            loops forever.
          </li>
        </ol>
      </Callout>
      <p>
        This is not just a toy problem. Many real attacks work this way: an attacker hides machine code inside data
        (a long message, a picture) and then tricks the program into jumping there. Modern CPUs help the{" "}
        <Link to="/operating-system">operating system</Link> defend against this: each region of memory carries a
        “never run this as code” flag, so a jump into data stops the program instead.
      </p>

      <h2>Reader four: the file format</h2>
      <p>
        A file on a disk is just a long list of bytes (see <Link to="/storage">Storage</Link>). Nothing in the bytes
        says “I am a photo”. So how does your computer know? In two steps:
      </p>
      <ol>
        <li>
          The <strong>file name</strong> ends in an <strong>extension</strong>, like <code>.jpg</code>. It is only part
          of the name, a hint so the operating system knows which app to open.
        </li>
        <li>
          The app then checks the <strong>first bytes</strong> of the file. Most formats begin with a fixed pattern
          called a <strong>magic number</strong>, chosen by the people who designed the format. After it comes a{" "}
          <strong>header</strong>: bytes at agreed places that give the width, the length, the version and so on.
        </li>
      </ol>
      <DataTable
        align="left"
        head={["format", "first bytes (hex)", "the same bytes as text"]}
        rows={[
          ["PNG image", "89 50 4E 47 0D 0A 1A 0A", "‰PNG…"],
          ["JPEG photo", "FF D8 FF", "(not text)"],
          ["GIF image", "47 49 46 38", "GIF8"],
          ["PDF document", "25 50 44 46", "%PDF"],
          ["ZIP, and .docx / .xlsx / .pptx", "50 4B 03 04", "PK…"],
          ["MP4 video", "(4 bytes) 66 74 79 70", "….ftyp"],
          ["Linux program", "7F 45 4C 46", "…ELF"],
          ["Windows program", "4D 5A", "MZ"],
        ]}
      />
      <FileXray />
      <p>
        Try the sample called <code>cat.txt</code>. Its name says “text”, but its bytes start with{" "}
        <code>89 50 4E 47</code>: it is the PNG with a new name. Renaming a file changes no byte at all. A text
        editor would show garbage, because it applies the text rules to picture bytes. An image app that checks the
        magic number opens it perfectly.
      </p>
      <Callout kind="fact" title="Why PNG starts with such strange bytes">
        <p>
          The PNG designers chose the 8 bytes so that common accidents would break them in a visible way. 89 has its
          top bit set, so a connection that drops the 8th bit changes it. <code>0D 0A</code> and <code>0A</code> are
          the Windows and Unix “new line” codes, so a program that “fixes” line endings changes them.{" "}
          <code>1A</code> told the old MS-DOS <code>type</code> command to stop printing. A damaged PNG is caught at
          byte 1, not in the middle of your picture.
        </p>
      </Callout>
      <Callout kind="math" title="Reading a header: the size of a PNG">
        <p>
          The PNG rules say: after the 8-byte magic number comes a block named <code>IHDR</code>, and bytes 16–19 hold
          the width, biggest byte first. In the sample, bytes 16–19 are <code>00 00 00 02</code>:
        </p>
        <TeX block>{tex`0 \times 256^3 + 0 \times 256^2 + 0 \times 256 + 2 = 2 \text{ pixels}`}</TeX>
        <p>
          A photo 1,920 pixels wide would have <code>00 00 07 80</code> there: <TeX>{"7 \\times 256 + 128 = 1920"}</TeX>.
        </p>
      </Callout>

      <h2>Meaning wired into hardware</h2>
      <p>
        We keep saying “the CPU decodes the instruction”. But how does a circuit “know” that <code>0100</code> means
        STA? It uses a <strong>decoder</strong>: one AND gate for each pattern (see{" "}
        <Link to="/logic-gates">Logic Gates</Link>). The STA gate has a NOT in front of every input that must be 0:
      </p>
      <TeX block>{tex`\text{STA} = \overline{b_7} \cdot b_6 \cdot \overline{b_5} \cdot \overline{b_4}`}</TeX>
      <p>
        This gate outputs 1 only for <code>0100</code>, and for no other pattern. That is all “knowing” means here.
      </p>
      <OpcodeDecoder />
      <p>
        The STA wire then picks the STA recipe in the control unit (<Link to="/cpu">The CPU</Link> showed that this
        recipe book is just another table). Tables like this are often stored in a <strong>ROM</strong>, read-only
        memory (see <Link to="/memory">Memory</Link>). A ROM is a <strong>truth table frozen in hardware</strong>:
        an address goes in, the bits stored at that address come out. People decided what to store.
      </p>
      <p>
        The simplest example you can see is a <strong>7-segment display</strong>, the kind on microwave ovens and
        alarm clocks. Each digit is 7 bars, called a to g. A small decoder turns a 4-bit number into 7 on/off wires:
      </p>
      <SevenSegDecoder />
      <Callout kind="math" title="Why 0101 shows a 5">
        <p>
          The ROM stores <code>0x6D</code> at address <code>0101</code> (5). In binary that is{" "}
          <code>110 1101</code>, read as g f e d c b a: g = 1, f = 1, e = 0, d = 1, c = 1, b = 0, a = 1. So bars a, c,
          d, f and g light up, and our eyes see a “5”.
        </p>
        <p>
          Any one bar can also be built from gates. Bar e is lit only for 0, 2, 6 and 8, which gives{" "}
          <TeX>{"e = \\overline{b_0} \\cdot (\\overline{b_2} + b_1)"}</TeX>. Check 4 = <code>0100</code>:{" "}
          <TeX>{"1 \\cdot (0 + 0) = 0"}</TeX>, dark. Check 6 = <code>0110</code>: <TeX>{"1 \\cdot (0 + 1) = 1"}</TeX>,
          lit.
        </p>
      </Callout>
      <p>
        The “meaning” of <code>0101</code> as the shape 5 is literally wired in, by people who filled in a table.
        Change the ROM and the same wires show A b C d E F. Hold on to this idea, because the trip of the letter A is
        a chain of exactly such tables.
      </p>

      <h2>Follow one ‘A’ to the glass</h2>
      <p>
        Now we can answer the second half of the question: how does an ‘A’ get from your finger to the screen, and
        does the monitor “know” it is an A? Walk through the six stages. Every number is real.
      </p>
      <FollowTheA />

      <h3>The keyboard sends a position, not a letter</h3>
      <p>
        The A key does not send 65. The keyboard only knows <em>where</em> a switch closed, and it sends a number
        from the USB list of key positions: <strong>0x04</strong>, “the key in the place where US keyboards print
        A”. The operating system's <strong>keyboard layout</strong> table turns 0x04 into ‘a’ (97), or with Shift
        into ‘A’ (65). With a French table the same key gives ‘q’ (113) or ‘Q’ (81). With a Russian table it gives
        ‘ф’ (1092) or ‘Ф’ (1060). Same wire signal, different table. Changing the keyboard language in your settings
        only swaps the table. (How the key is scanned and how its bytes travel over the cable is in{" "}
        <Link to="/input-output">Input, Output &amp; the Monitor</Link>.)
      </p>

      <h3>Inside the app, it is a number</h3>
      <p>
        Your text editor, your chat app and the web page all keep text as a list of numbers. Searching, sorting,
        spell-checking and sending a message all work on the 65, never on a picture of an A. Saved to a file, the 65
        becomes the byte <code>41</code>.
      </p>

      <h3>The font turns a number into dots</h3>
      <p>
        Only when the text must be <em>seen</em> does anything look up a shape. A <strong>font</strong> is itself a
        table. In the simple 8×8 font of the figure, every character has 8 bytes, one per row, stored in code order.
        So the glyph (the drawing) for code 65 starts at byte <TeX>{"65 \\times 8 = 520"}</TeX>, and its 8 bytes are{" "}
        <code>30 78 CC CC FC CC CC 00</code>. The first row, <code>30</code> = <code>0011 0000</code>, says “ink in
        columns 2 and 3”: the top of the A. A font is bytes whose agreed meaning is “pixels”.
      </p>
      <Callout kind="fact" title="The mystery “J” in emails">
        <p>
          The Wingdings font stores a smiling face ☺ in row 74, the row where normal fonts keep the letter J. Some
          email programs turn a typed <code>:)</code> into code 74 drawn with Wingdings. When the reader's computer
          draws code 74 with a normal font, the smiley arrives as a plain <b>J</b>. The byte was right. The table was
          different.
        </p>
      </Callout>

      <h3>The framebuffer holds only colours</h3>
      <p>
        Next, the app (helped by the graphics chip) copies those dots into the <strong>framebuffer</strong>, the
        part of memory that holds one colour for every pixel of the screen (see <Link to="/graphics">Graphics</Link>).
        With 4 bytes per pixel and a screen 1,920 pixels wide, pixel (x, y) lives at
      </p>
      <TeX block>{tex`\text{address} = (y \times 1920 + x) \times 4`}</TeX>
      <p>
        For the top-left corner of our glyph at x = 32, y = 16 that is{" "}
        <TeX>{"(16 \\times 1920 + 32) \\times 4 = 123{,}008"}</TeX>. Every inked dot becomes white,{" "}
        <code>FF FF FF</code>, and every other dot black, <code>00 00 00</code>.{" "}
        <strong>From here on, the ‘A’ is gone.</strong> The framebuffer has no idea that 64 of its pixels once came
        from a letter. Finally, the display controller streams all the colours to the monitor, 60 times a second.
      </p>
      <AChain />

      <h2>What the monitor knows</h2>
      <p>
        Nothing about letters. A 1920 × 1080 monitor receives 3 bytes (red, green, blue) for each pixel, 60 times a
        second:
      </p>
      <TeX block>{tex`1920 \times 1080 \times 3 \times 60 = 373{,}248{,}000 \text{ bytes per second} \approx 373 \text{ MB/s}`}</TeX>
      <p>
        That is all it ever gets: colours. (The framebuffer's fourth, unused byte per pixel is not sent.) A typed ‘A’
        and a photo of an ‘A’ arrive as the same kind of data. The monitor cannot tell them apart, and it doesn't
        need to.
      </p>
      <p>You can prove this with things you do every day:</p>
      <ul>
        <li>
          You can copy text from a document, but not from a <b>screenshot</b> of it. The app still has the list of
          65s. The screenshot has only pixels.
        </li>
        <li>
          To get text back from a picture, a program must <em>guess</em> the letters by looking at the shapes. This
          is called <strong>OCR</strong> (optical character recognition), and it can make mistakes, exactly because
          the letters are gone.
        </li>
        <li>
          A <b>screen reader</b>, which reads the screen aloud for blind people, asks the app for its numbers. It
          never looks at the pixels.
        </li>
      </ul>
      <Callout kind="idea">
        <p>
          So nobody, anywhere, “knows” that <code>0100 0001</code> is an A. The keyboard knows a position. A table
          maps the position to 65. The app keeps 65. A font table maps 65 to dots. Memory holds colours. The monitor
          shows colours. Each step is a simple lookup that people agreed on, and together they feel like magic.
        </p>
      </Callout>

      <GoDeeper title="Which byte comes first? (endianness)">
        <p>
          A number bigger than 255 needs several bytes, and someone must decide their order. The 4-byte number{" "}
          <code>0x12345678</code> is stored in memory on most PCs and phones (x86 and ARM chips) as{" "}
          <code>78 56 34 12</code>: smallest byte first. This is called <strong>little-endian</strong>. Networks send
          the same number as <code>12 34 56 78</code>, biggest byte first, called <strong>big-endian</strong>.
        </p>
        <p>
          You saw both in the File X-ray: PNG stores its width biggest byte first, GIF smallest byte first. Neither is
          better. It is one more human agreement, and a program that reads with the wrong order gets a wildly wrong
          number: <code>00 00 00 02</code> read backwards is <TeX>{"2 \\times 256^3 = 33{,}554{,}432"}</TeX>.
        </p>
      </GoDeeper>

      <GoDeeper title="Old PCs: text mode and the character ROM">
        <p>
          Early PCs did not draw letters in software. In <strong>text mode</strong> the screen was a grid of 80 × 25
          character cells, and each cell took 2 bytes in memory: a character code and a colour code. The whole screen
          fitted in <TeX>{"80 \\times 25 \\times 2 = 4{,}000"}</TeX> bytes, starting at address <code>0xB8000</code>{" "}
          on colour cards. Writing the bytes <code>41 07</code> there put a light grey ‘A’ in the top-left corner.
        </p>
        <p>
          The video card had its own <strong>character ROM</strong>: a font table just like the one in this chapter.
          As the screen was drawn, line by line, the hardware looked up the right row of the right glyph, again and
          again, 60 or 70 times a second. So in those machines the hardware did turn codes into dots, but still by
          looking them up in a table that people had filled in. The 8×8 font used in this chapter's figures is based
          on IBM's classic PC design.
        </p>
      </GoDeeper>

      <GoDeeper title="Real fonts: outlines, not dots">
        <p>
          The fonts on your phone are not 8×8 grids. A modern font file (TrueType or OpenType) contains several
          tables. The <code>cmap</code> table maps a character code, like 65, to a glyph number. The glyph itself is
          stored as points joined by curves, measured in “font units”, often 2,048 units for the full letter height.
        </p>
        <p>
          To draw at 16 pixels high, every point is scaled by <TeX>{"16 / 2048 = 1/128"}</TeX>, so a point at x =
          1,024 units lands at x = 8 pixels. Then, for each pixel, the computer asks “is this pixel inside the
          outline?”: the same inside test used for triangles in <Link to="/graphics">Graphics</Link>. A pixel that is
          half covered becomes 50% grey, which makes edges look smooth (<strong>anti-aliasing</strong>). The finished
          dots are kept in a cache and reused for every other ‘A’ of the same size.
        </p>
      </GoDeeper>

      <KeyIdeas
        items={[
          <>
            Bits have <strong>no meaning on their own</strong>. There is no type bit and no label inside a byte.
          </>,
          <>
            The <strong>reader decides</strong>: the instruction (ADD or float), the program and its types, the program
            counter (code or data), the file format.
          </>,
          <>
            Codes are <strong>human agreements</strong>: ASCII, Unicode, UTF-8, USB key codes, file formats. Both sides
            must use the same table.
          </>,
          <>
            “Meaning” in hardware is <strong>just tables</strong>: decoders, ROMs, keyboard layouts and fonts, all
            filled in by people.
          </>,
          <>
            The monitor only ever receives <strong>colours</strong>. The ‘A’ stops being a letter at the font lookup.
          </>,
        ]}
      />
    </>
  );
}
