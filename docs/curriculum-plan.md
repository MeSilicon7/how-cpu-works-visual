# Final merged plan: "How a CPU works" curriculum

## 0. Merge decisions

- **Logic gates already have a chapter** (`logic-gates`). What the user is really missing is how gates *recognise a pattern*, which is the hardware root of "how does the computer know 0100 means STA". I add a **Decoders** section to Logic Gates. The hardware half of the new meaning chapter builds on it.
- **Functions & the stack become a new chapter, not a section.** Both reviewers rated it "must". Interrupts, context switches, booting and the loader all reuse push/pop, so it must come before the I/O and OS chapters. Both reviewers also wanted variables, arrays and pointers; they go into Machine Code as a section, just before it.
- **Making a Chip becomes a new chapter** (both reviewers rated it "should"). The course gives it one sentence today, yet it is the biggest "it's magic" gap after the user's own question. It goes right after The CPU, whose last section ("From SAP-8 to the chip in your laptop") leads straight into it.
- **No other new chapters.** Error correction becomes a full section in Storage. Sound and ADC/DAC go into the I/O chapter. AI, Huffman, Turing and HTTP become Go-deeper boxes. Algorithms is deferred.
- **One stack convention for the whole course.** Use the 6502 / Ben Eater style: SP points at the next free slot. PUSH: `RAM[SP] ← x; SP ← SP − 1`. POP: `SP ← SP + 1; x ← RAM[SP]`. SP starts at 15 in SAP-8.
- I checked every number below with arithmetic (node). This covers the ADC result 158, CRC remainder 001, Huffman 23 bits and entropy 2.04, the 440 Hz samples, 148.5 MHz, gamma, Hamming, page split, yield and Moore.

---

## 1. Course map: 20 chapters in 4 parts

`chapters.ts`: rename part id `storage` → `system`, title "The System".

**Part 1: The Switch** (blurb: "From electricity and one transistor to a circuit that does arithmetic.")

| # | slug | title | tagline | status |
|---|---|---|---|---|
| 1 | `electricity` | Electricity Basics | What actually flows in a wire, and why it needs a loop. | new (decided) |
| 2 | `transistor` | The Transistor | A switch with no moving parts, flipped by electricity. | existing |
| 3 | `binary` | Binary | Counting, text and negative numbers using only on and off. | existing |
| 4 | `logic-gates` | Logic Gates | Wire a few transistors together and they start making decisions. | existing |
| 5 | `adder` | The Adder | Teaching a handful of gates to do arithmetic. | existing |
| 6 | `alu` | The ALU | One circuit that can add, subtract, compare and more. | existing |

**Part 2: The Machine** (blurb: "Memory, a heartbeat, a CPU you can step through, how it is printed in silicon, and the code it runs.")

| # | slug | title | tagline | status |
|---|---|---|---|---|
| 7 | `memory` | Memory | A loop of gates that remembers a bit, then billions of them. | existing |
| 8 | `clock` | The Clock | The heartbeat that keeps billions of switches in step. | existing |
| 9 | `cpu` | The CPU | Fetch, decode, execute. Repeat forever. | existing |
| 10 | `chip-making` | Making a Chip | Printing 20 billion switches with light. | new (extra) |
| 11 | `machine-code` | Machine Code | How the code you write becomes patterns of bits. | existing |
| 12 | `functions` | Functions & the Stack | How a program jumps away and always finds its way back. | new (extra) |

**Part 3: The System** (blurb: "Storage, meaning, devices and the operating system: how a CPU becomes a computer you can use.")

| # | slug | title | tagline | status |
|---|---|---|---|---|
| 13 | `storage` | Storage | Cache, RAM, SSD and hard drives, and why speed costs size. | existing |
| 14 | `bits-meaning` | Who Decides What Bits Mean? | 01000001 is 65, 'A', a colour or an instruction. Who chooses? | new (decided) |
| 15 | `input-output` | Input, Output & the Monitor | How the CPU talks to keyboards, screens and speakers using only addresses. | new (decided) |
| 16 | `operating-system` | The Operating System | The program that runs all the other programs. | new (decided) |

**Part 4: Real Life** (unchanged)

| # | slug | title | tagline | status |
|---|---|---|---|---|
| 17 | `calculator` | Scene: Pressing 2 + 3 | One calculation, from your fingertip to glowing pixels. | existing |
| 18 | `graphics` | Graphics | Painting a screen with nothing but numbers. | existing |
| 19 | `video` | Scene: Watching a Video | Why one hour of video isn't 672 gigabytes. | existing |
| 20 | `network` | Scene: Sending a Message | How a message crosses the planet and only your friend can read it. | existing |

**Why this order:**
- `bits-meaning` comes after Storage, so files already exist.
- It ends with "the A is now pixel colours in the framebuffer", and `input-output` picks up the thread at the cable.
- `operating-system` comes last because it needs interrupts (I/O), the stack (Functions) and devices.
- The calculator scene now sits *after* these chapters, so it can link back to them instead of hand-waving.

---

## 2. New chapters: detailed outlines

### 2.1 `electricity`: Electricity Basics (Part 1, chapter 1)

**learn:** "What moves in a wire, and why it needs a loop" · "Volts, amps, ohms and watts with real numbers" · "Capacitors: why every switch takes time"
**scale:** "1 amp = 6 billion billion electrons per second"

**Sections**

1. **What moves in a wire**
   - Metals have loose electrons. Current is how much charge passes a point each second.
   - 1 ampere = 1 coulomb per second ≈ 6.24 × 10¹⁸ electrons per second. A 2 A phone charger moves about 12.5 × 10¹⁸ electrons per second.
2. **It only flows in a closed loop**
   - The path is: battery + → wire → device → back to battery −.
   - An open switch breaks the loop, so 0 A flows.
   - **Ground** is just the name for the return side, and we call it 0 V. "1 V" means "1 volt above ground". This explains the "ground" in the NOT-gate widget.
3. **Push, flow, resistance: Ohm's law**
   - This section moves here from Transistor's "Electricity in 60 seconds". Keep the water analogy.
   - V = I × R.
   - Worked example: a 5 V supply, an LED that uses 2 V, and a target of 10 mA → R = (5 − 2) / 0.01 = **300 Ω**.
4. **Series and parallel**
   - Series: R = R₁ + R₂, and the same current goes through both. Two 100 Ω in series on 5 V → 200 Ω → 25 mA.
   - Parallel: 1/R = 1/R₁ + 1/R₂, and the current splits. Two 100 Ω in parallel → 50 Ω → 100 mA.
   - Preview: switches in series only light the lamp if *both* are closed (AND). Switches in parallel light it if *either* is closed (OR). Link to Logic Gates.
5. **Power: P = V × I**
   - LED: 2 V × 10 mA = 20 mW. The resistor burns 3 V × 10 mA = 30 mW as heat.
   - Phone battery: 3.85 V × 4 Ah = 15.4 Wh. A chip drawing 5 W empties it in about 3 hours.
   - A desktop CPU uses 125 W at about 1.2 V, which is **about 104 A**. That is why a CPU has hundreds of power pins.
   - Where the 1 V comes from: wall AC (230/120 V) → power supply → 12 V DC → regulators on the board → about 1 V at the chip.
6. **Capacitors: little buckets of charge**
   - A capacitor is two plates with an insulator between them. It stores charge Q = C × V.
   - Every wire and every transistor gate is a tiny capacitor. Example: 1 fF at 1 V holds 10⁻¹⁵ / 1.6×10⁻¹⁹ ≈ **6,000 electrons**.
   - Filling one takes time: V(t) = V·(1 − e^(−t/RC)). The time constant τ = R × C. The capacitor reaches 63% after 1τ and 95% after 3τ. The next gate "sees a 1" at about 50%, which takes 0.69τ.
   - Worked example: 10 kΩ × 1 fF = 10 ps. That is exactly the "~10 ps gate delay" in Logic Gates, and the reason the clock can't tick infinitely fast.
   - Smaller transistors have a smaller C, so the bucket fills faster and the chip runs faster.
   - Every fill-and-dump of the bucket wastes energy as heat (about C·V² per cycle). This sets up P = α·C·V²·f in Transistor.
   - Preview: a DRAM cell is one of these buckets, slowly leaking (Memory, Storage).
7. **The first electric switch: the relay**
   - Current in a coil makes a magnet. The magnet pulls a metal arm, and the arm closes *another* circuit: a switch flipped by electricity (1830s telegraph).
   - Two relays in series make AND; in parallel they make OR. Zuse's Z3 (1941) used about 2,600 relays at about 5 Hz.
   - Speed ladder: relay about 5 ms → vacuum tube about 1 µs → transistor about 10 ps. That is about 500 million times faster than a relay.
   - Bridge sentence: "The transistor is a relay with no moving parts. Next chapter."

**Widgets**
1. **Circuit sandbox**
   - Parts: a battery (1.5–12 V slider), two resistors (10–1,000 Ω sliders), two switches, and a series/parallel toggle.
   - Live readouts: total R, current (I = V/R), the current in each branch, and P for each part.
   - Electron dots move along the wires with speed proportional to I. Opening the loop freezes them and shows "0 A".
   - A lamp mode replaces the resistors with a bulb. A truth table fills in as the student flips the switches (series = AND, parallel = OR).
2. **Fill the bucket (RC)**
   - Sliders: R (1–100 kΩ) and C (0.1–10 fF).
   - A V(t) curve shows marks at τ, 63% and a dashed 50% "next gate flips here" line. Readout: "next gate flips after 0.69·R·C = x ps".
   - A clock-period slider draws the next tick as a vertical line. If the tick comes before the 50% crossing, the result turns red: "wrong answer, the bucket wasn't full". This links to the Clock chapter.
3. **Relay to gate**
   - A coil, a hinged arm and a lamp, drawn in SVG. Pressing the input switch powers the coil, and the arm snaps shut with a short animation.
   - A "two relays" mode toggles between series and parallel, with a truth table.
   - Below it, a log-scale speed bar: relay, tube, transistor.

**Go deeper**
- "If electrons crawl, why is the light instant?"
  - Drift speed in a 1 mm² copper wire carrying 1 A ≈ 0.07 mm/s.
  - The *push* travels at 50–70% of light speed, like a pipe already full of water.
- "AC from the wall, DC in the chip": why the power supply converts, and what a regulator does.

---

### 2.2 `chip-making`: Making a Chip (Part 2, after The CPU)

**learn:** "From sand to a 300 mm wafer" · "Printing patterns with light (photolithography)" · "How engineers design 20 billion transistors without drawing them"
**scale:** "300 mm wafer, 13.5 nm light"

**Sections**

1. **From sand to wafer**
   - Sand is purified to 99.9999999% silicon ("nine nines") and grown into one giant crystal. The crystal is sliced into 300 mm wafers about 0.8 mm thick.
   - Wafer area = π × 150² ≈ 70,686 mm². About 640 chips of 100 mm² fit, after losing the round edge.
2. **Printing with light**
   - The basic idea is a stencil plus a photograph.
   - The loop:
     1. Coat the wafer with light-sensitive "resist".
     2. Shine light through a mask (the stencil).
     3. Wash away the parts the light hit.
     4. Then **dope** (change the silicon), **etch** (cut) or **deposit** (add material), but only where the wafer is uncovered.
     5. Strip the resist and repeat.
   - A modern chip needs 60–80+ masks and about 3 months in the factory.
   - Why EUV: you can't easily print lines finer than the light's wavelength. Deep-UV light is 193 nm and needs tricks for a 48 nm pitch. EUV light is 13.5 nm.
   - A 48 nm gap is only a couple of hundred silicon atoms wide.
3. **Many floors of wiring**
   - The transistors sit at the bottom. Above them are 10–20 layers of copper wires, joined by vertical "vias".
   - It is like a city with many floors of roads.
4. **Nobody draws 20 billion transistors**
   - Engineers describe the circuit in a hardware language. The full adder from The Adder is two lines:
     ```
     assign sum  = a ^ b ^ cin;
     assign cout = (a & b) | (cin & (a ^ b));
     ```
   - Software turns this into gates and picks pre-designed **standard cells** (NAND, flip-flop). It places millions of them and routes the wires.
   - Most of a chip is copies of a few blocks: SRAM cells, identical cores, thousands of GPU cores.
5. **Dust, defects and yield**
   - One speck of dust can kill a chip. Yield ≈ e^(−D·A).
   - With D = 0.1 defects/cm² and a 1 cm² die: e^(−0.1) ≈ 90%, so about 580 good chips out of 640.
   - With a 4 cm² die: about 143 dies × e^(−0.4) ≈ 67%, so about 96 good chips.
   - Big chips get expensive fast, which is why chiplets exist.
   - **Binning:** a chip with one bad core is sold as a cheaper model.
6. **Moore's law**
   - The 4004 (1971) had 2,300 transistors. 2,300 × 2²⁶ (26 doublings by 2023) ≈ **154 billion**, which matches today's biggest chips.
   - Why it is slowing: atoms are not getting smaller.

**Widgets**
1. **Print a layer**
   - A 12×12 cell "wafer square" with three predefined masks: doped regions, gate lines and metal wires. Together they form the NAND from Logic Gates.
   - Buttons step through Coat → Expose → Develop → Etch/Dope → Strip. Each step recolours the cells, and each layer stacks on the last.
   - After 3 layers, inputs A and B become clickable and the output follows the NAND truth table.
   - "Zoom out" tiles the cell thousands of times onto a wafer.
2. **Wafer yield**
   - A drawn 300 mm wafer with sliders for die size (10–800 mm²) and defect density (0.05–1 /cm²).
   - Random defect dots appear, and dies hit by a dot turn grey.
   - Live readouts: gross dies, good dies, yield %, and cost per good chip (assume a fixed wafer price, e.g. a slider).
3. **Moore's law plot**
   - A log-scale chart of transistor counts from 1971 to today, against a "doubling every 2 years" line. Hovering a point shows the chip and year.

**Go deeper**
- "How do you make 13.5 nm light?"
  - A laser hits tiny tin droplets about 50,000 times a second.
  - The machine uses mirrors, not lenses, because glass absorbs EUV.
- "From die to the chip you can hold": dicing, bonding to a package, the heat spreader, and testing.

---

### 2.3 `functions`: Functions & the Stack (Part 2, after Machine Code)

**learn:** "Why a jump can't come back on its own" · "The stack: a pile of notes in RAM" · "Recursion, stack overflow, and how interrupts return"
**scale:** "1 return address = 1 byte"

**Sections**

1. **The problem: going there and coming back**
   - One "double it" routine is used from two places. A plain `JMP 7` can't know which caller to return to.
   - Analogy (bookish): you put a bookmark in your book before you look up a footnote.
2. **The stack: a pile of notes in RAM**
   - The stack is a region at the top of RAM plus a **stack pointer** register (SP).
   - PUSH: write at SP, then SP − 1. POP: SP + 1, then read.
   - Last in, first out, like a pile of plates.
   - SP is just a number used as an address: the first *pointer* the student meets. The previous chapter's new section introduced pointers.
3. **CALL and RET**
   - CALL n = push (PC), then PC ← n. RET = PC ← pop.
   - Worked SAP-8 program (fits in 16 bytes):
     ```
     0: LDI 3
     1: CALL 7
     2: LDI 5
     3: CALL 7
     4: HLT
     7: STA 13   ; x = A
     8: ADD 13   ; A = 2x
     9: OUT
     10: RET
     ```
   - Trace: CALL at address 1 pushes 2 into RAM[15] and sets SP = 14. RET pops 2, and OUT shows **6**. The second CALL pushes 4, and OUT shows **10**. One routine, two different ways back.
   - Nested trace: main → f → g makes SP go 15 → 14 → 13 and back again.
4. **Stack frames: arguments and local variables**
   - Each call gets its own slice of the stack: return address + arguments + saved registers + local variables (typically 16–64 bytes).
   - That is why two calls of the same function don't overwrite each other's variables.
5. **Recursion: a function that calls itself**
   - fact(4) → fact(3) → fact(2) → fact(1) puts 4 frames on the stack. They unwind with results 1 → 2 → 6 → 24.
6. **Stack overflow**
   - Linux gives a program about 8 MiB of stack. At 64 bytes per frame that is 8·2²⁰/64 = **131,072** nested calls. Windows gives 1 MiB, which is 16,384 calls.
   - Infinite recursion runs out of stack and crashes.
   - SAP-8 demo: `7: CALL 7` pushes 8 into addresses 15, 14, … 8. The next push overwrites address 7, the CALL instruction itself. The stack has eaten the program.
7. **Interrupts are calls the hardware makes**
   - A device pulls a wire. The CPU finishes its instruction, pushes PC and the flags, and jumps through a table to the handler. "Return from interrupt" pops them.
   - This fixes the hand-wave in the 2 + 3 scene ("saves its registers… jumps back"). It also sets up the I/O and OS chapters.

**Widgets**
1. **Call-stack tower**
   - Left: short code (main → greet → add) with a PC arrow. Right: a RAM column (addresses 0–15, or 0xF0–0xFF in a "big" mode) with an SP arrow and the stack region shaded.
   - Each Step animates the return address flying into the stack on CALL and back into the PC on RET.
   - A **"no stack"** toggle makes RET jump to one fixed saved address, so the program returns to the wrong place.
   - A **fact(n) depth slider** grows frames until they collide with the code area, which flashes red: "stack overflow".
2. **SAP-8 with CALL/RET** (an extension of the existing `CpuSim`)
   - Add an SP register box and the new instructions.
   - New presets: "double it twice" (the program above) and "eat yourself" (`CALL 7` overflow).
   - The bus animation shows the PC value being written to RAM[SP].

**Go deeper**
- "Buffer overflow: the attack that overwrites the way back." Writing past a local array overwrites the saved return address, so RET jumps wherever the attacker chose.
- "Why naive recursion can be slow": fib(30) makes 2·F(31) − 1 = **2,692,537** calls. Remembering past answers (memoisation) brings it down to 31.

---

### 2.4 `bits-meaning`: Who Decides What Bits Mean? (Part 3, after Storage)

**learn:** "Why a byte has no meaning on its own" · "The same byte as a number, a letter, a colour and an instruction" · "How an 'A' gets from your key to the glass, and why the monitor never knows it was an 'A'"
**scale:** "1 byte, many meanings"

**Sections**

1. **A byte on its own means nothing**
   - Opening puzzle: RAM address 200 holds `0100 0001`. Is it 65? 'A'? A colour? An instruction?
   - **Answer first:** the computer never "knows". The byte is 8 charged or uncharged cells. There is no 9th "type" bit and no label. The meaning comes from *whatever code or circuit reads it*.
   - Analogy: the digits 1225 written on paper could be a PIN, a price, a date (12/25) or a room number. The paper doesn't know; the reader decides.
2. **Codes are agreements people made**
   - Morse: E = "·" (the most common letter gets the shortest code). Braille: 6 dots → 2⁶ = 64 patterns. ASCII (1963): 7 bits → 128 characters. Unicode: 150,000+ characters.
   - Physics doesn't decide any of this; committees do. Two computers understand each other only because both use the same published table.
3. **One byte, many glasses**
   - `0100 0001` read different ways:

     | reading | value |
     |---|---|
     | unsigned | 65 |
     | signed | +65 |
     | ASCII | 'A' |
     | blue brightness | 65/255 ≈ 25% |
     | 8 black/white pixels | pixels 2 and 8 lit (.X.....X) |
     | SAP-8 instruction | opcode 0100 = STA, operand 0001 → "STA 1" |

   - Contrast: `1100 0001` = 193 unsigned but −63 signed.
   - Fun example: the text "Hi!" = 0x48 0x69 0x21.
     - As one colour it is rgb(72, 105, 33), a dark olive green.
     - As a SAP-8 program it is STA 8, JMP 9, LDA 1.
4. **Who decides #1: the instruction that reads it**
   - ADD always treats its bytes as whole numbers. A float instruction treats the same 4 bytes as a fraction: 0x41200000 = **10.0** as a float, but **1,092,616,192** as an integer.
   - Printing 65 two ways:
     - "Print as number" divides: 65 ÷ 10 = 6 remainder 5. It adds 48 to each digit → bytes 54, 53 → it draws "6" and "5".
     - "Print as letter" looks up glyph 65 → it draws "A".
     - Same byte, two different subroutines, two different screens.
5. **Who decides #2: the programmer and the compiler (types)**
   - `int x = 65;` and `char c = 'A';` store the *same* byte 0x41.
   - A type is a note *for the compiler*, so it picks the right instructions later. The types are gone from the machine code.
   - When the wrong table is used: 'é' = U+00E9 → UTF-8 bytes C3 A9 → read with the old Latin-1 table → "Ã©". This garbled text is called mojibake.
6. **Who decides #3: the program counter (code or data?)**
   - A byte *becomes* an instruction only when the PC points at it.
   - From the CPU chapter: the number 47 = `0010 1111` **is** "ADD 15".
   - Forget the HLT, and SAP-8 runs straight into its data and executes the numbers as garbage instructions.
   - Many real security bugs work this way. Modern OSes mark data pages "not code" (link to the OS chapter).
7. **Who decides #4: file formats, headers and magic numbers**
   - A file is just a list of bytes. The extension (.jpg) is only a hint so the OS knows which app to open. The app then checks the **first bytes** (the magic number) and reads the header.

     | format | first bytes | as text |
     |---|---|---|
     | PNG | 89 50 4E 47 | ".PNG" |
     | JPEG | FF D8 FF | |
     | PDF | 25 50 44 46 | "%PDF" |
     | ZIP | 50 4B | "PK" |
     | GIF | 47 49 46 38 | "GIF8" |
     | Linux program | 7F 45 4C 46 | ".ELF" |
     | Windows program | 4D 5A | "MZ" |

   - In a PNG, width is at bytes 16–19 and height at bytes 20–23 (after the 8-byte signature and the "IHDR" chunk start).
   - Rename photo.jpg → photo.txt: no byte changes, but a text editor shows garbage because it applies the wrong rule.
8. **Meaning wired into hardware: decoders and lookup tables**
   - How does the CPU "know" 0100 means STA? A gate fires only for that pattern: STA = NOT b7 AND b6 AND NOT b5 AND NOT b4. Link to the new Decoders section in Logic Gates.
   - Its output picks the STA recipe in the control ROM (link to the new ROM section in Memory).
   - A **ROM is a truth table frozen in hardware**: address in, stored bits out. People filled it in.
   - Simplest display: the **7-segment decoder**, 4 bits in, 7 wires out.
     - Patterns (gfedcba): 0→0x3F, 1→0x06, 2→0x5B, 5→0x6D (= 1101101, segments a, c, d, f, g), 8→0x7F, 9→0x6F.
     - Segment e is lit only for 0, 2, 6 and 8, so e = NOT b0 AND (NOT b2 OR b1). Check: 4 = 0100 → 0, and 6 = 0110 → 1.
     - The "meaning" of 0101 as the shape 5 is literally wired in. This also answers how SAP-8's Output display shows "5".
9. **Following one 'A' from your finger to the glass**
   - **(a) Keyboard.**
     - The A key does *not* send 65. It sends a position code: USB usage ID **0x04** ("the key in the A position").
     - The OS's keyboard layout table turns 0x04 into 'a' (97), or with Shift into 'A' (65).
     - With an AZERTY layout the same key types 'Q' (81). With a Russian layout it types 'ф' (1092).
     - Same wire signal, different table.
   - **(b) Inside the app.** The text is just the number 65 in a list of numbers.
   - **(c) Font lookup.** A font file is itself a table.
     - Simple bitmap font (8×8): the glyph for code 65 starts at 65 × 8 = **520**. Its 8 row bytes are 0x18 0x24 0x42 0x42 0x7E 0x42 0x42 0x00, and each 1 bit is an inked pixel. The font is bytes whose meaning is "pixels".
     - Real outline fonts (TrueType/OpenType): a `cmap` table maps code point 65 → a glyph number. The glyph is stored as points joined by curves, in font units (e.g. 2048 per letter height). At 16 px the scale is 16/2048 = 1/128, so a point at x = 1024 lands at x = 8 px.
   - **(d) Rasterise.** For each pixel, the computer asks "is this inside the outline?", the same edge test as triangles in Graphics. A half-covered pixel becomes 50% grey (anti-aliasing). The drawn 'A' is cached and reused.
   - **(e) Framebuffer.** Pixel (x, y) is at base + (y × width + x) × 4. Black ink = 00 00 00 and paper = FF FF FF. **From here on, 'A' is gone: only pixel colours remain.**
   - **(f) Out.** The display engine reads the framebuffer → cable → monitor → subpixel brightness. The next chapter explains this part.
10. **What the monitor knows: nothing about letters**
    - It receives 1920 × 1080 × 3 bytes, 60 times a second, which is about 373 MB/s of colours.
    - A photo of an A and a typed A are identical to it.
    - Proof from daily life: you can copy text from a document but not from a screenshot (without OCR). The app still has the 65s; the screen only has pixels. Screen readers read the app's numbers, not the pixels.
    - Closing chain diagram: switch → 0x04 → layout + Shift → 65 → font table → outline → pixels → framebuffer → cable → light.

**Widgets**
1. **One byte, many glasses (lens switcher)**
   - A row of 8 editable bytes (presets: "A", "Hi!", 47, 0x41200000).
   - Lens buttons: unsigned, signed, ASCII/UTF-8 text, RGB colours (groups of 3), 1-bit pixel rows, SAP-8 disassembly (use `disassemble()` from `app/lib/cpu.ts`) and float32 (groups of 4).
   - The bytes never change; a banner says "same bits, different reader".
2. **File X-ray**
   - Built-in sample files generated in the browser: a tiny 2×2 PNG, plus headers for PDF and ZIP.
   - An optional "drop your own file" read locally with FileReader (never uploaded).
   - Shows a hex + ASCII dump of the first 32 bytes. The magic number is highlighted and named, and PNG width/height are decoded from bytes 16–23.
   - "Open as text / as numbers / as pixels" buttons show three wrong readings of one right file.
3. **7-segment decoder**
   - 4 clickable input bits. Shows the ROM row (gfedcba hex), the lit segments, and each segment's formula with its current value highlighted.
   - Inputs 10–15 show "not used (don't care)".
4. **Follow the 'A'**
   - A pipeline of boxes: key position 0x04 → layout table (dropdown QWERTY/AZERTY/Russian, plus a Shift toggle) → code point → font lookup → 8×8 pixel grid → framebuffer bytes → mini screen.
   - Font dropdown: normal / bold / symbol. The symbol font draws a different shape for the *same* 65.
   - Optional "outline font" tab: glyph control points over a 16×16 pixel grid, with each pixel's coverage percentage.
   - Changing any box updates everything to its right. The last box is labelled "the monitor sees: 64 colours, no letter".

Also reuse `CpuSim` with a new preset, "Forgot the HLT", for section 6.

**Go deeper**
- "Endianness: which byte comes first?" 0x12345678 is stored as 78 56 34 12 on x86/ARM. The network uses the opposite order. It is another human agreement.
- "Old PCs: text mode and the character ROM." Each screen cell was 2 bytes (character code + colour), so 80 × 25 × 2 = **4,000 bytes** filled the whole screen. A ROM on the video card drew the glyphs on the fly.

**Key ideas**
- Bits have no meaning on their own.
- The reader decides: the instruction, the PC, the compiler, the file format.
- Standards are human agreements.
- Hardware meaning is just tables (decoders, ROMs, fonts, layouts).
- The monitor only ever receives colours.

---

### 2.5 `input-output`: Input, Output & the Monitor (Part 3)

**learn:** "Devices are just addresses: memory-mapped I/O" · "How the monitor knows where each colour goes" · "How touch, mouse and sound become numbers, and back"
**scale:** "148.5 million pixels per second"

**Sections**

1. **The CPU has no "draw" instruction**
   - Each device has a few tiny registers, like mailboxes: status, command and data.
   - **Memory-mapped I/O:** the address decoder from Memory sends some addresses to a device instead of RAM.
   - Example map (64 KB):

     | address | goes to |
     |---|---|
     | 0x0000–0xEFFF | RAM |
     | 0xF000 | keyboard data |
     | 0xF001 | keyboard status |
     | 0xF100 | screen |

   - The decoder is one gate: "I/O selected" = A15 AND A14 AND A13 AND A12.
   - Real examples: nand2tetris puts the screen at 16384–24575 (8,192 words × 16 bits = 512 × 256 pixels). Ben Eater's 6502 puts I/O at 0x6000.
   - Alternative: x86 port I/O (IN/OUT; the keyboard controller is at port 0x60).
   - SAP-8's OUT/OI is a one-device version of the same idea.
   - A **driver** is just the program that knows one device's register map. That is why a new printer needs a new driver.
2. **Getting the CPU's attention**
   - **Polling:** loop { read status; if 1, read data }. Checking 1,000 times a second while you type 5 keys a second wastes 995 of 1,000 checks.
   - **Interrupts:** the device pulls a wire. The CPU pushes PC and flags (from Functions & the Stack), looks up handler k in the vector table, runs it, then returns.
   - **DMA:** for a 3 MB photo, the CPU writes one command ("copy these blocks to RAM address X"). The SSD writes into RAM by itself and raises one interrupt when done, instead of the CPU doing 3 million copies.
3. **The wires between: buses**
   - Parallel vs serial, and why serial won at high speed: parallel wires drift out of step.
   - UART: 1 start + 8 data + 1 stop = 10 bits per byte, so 9,600 baud = 960 bytes/s.
   - USB 2.0: 480 Mbit/s.
   - PCIe 4.0: 16 GT/s per lane with 128b/130b encoding ≈ 1.97 GB/s per lane; a ×16 graphics card slot ≈ 31.5 GB/s.
   - Present these in one table.
4. **Input devices**
   - **Keyboard:** a tiny computer that sends key *positions* (link to the 2 + 3 scene and to bits-meaning's layout table).
   - **Optical mouse:** a tiny camera takes 1,000–10,000 pictures a second of the desk, and a chip finds how far the texture moved.
     - At 1,600 counts per inch, that is ≈ 630 counts per cm.
     - The mouse sends a report every 1 ms: a button byte plus dx and dy as **signed bytes** (two's complement, from Binary).
     - The OS computes x ← clamp(x + dx·speed, 0, 1919).
   - **Capacitive touch:** a grid of see-through electrodes, e.g. 30 × 50 = 1,500 crossings, scanned 120 times a second = 180,000 measurements per second.
     - A finger changes the capacitance near it.
     - Position finer than the grid comes from a weighted average. Electrodes at 4, 5 and 6 mm reading 20, 60 and 40 → x = (4·20 + 5·60 + 6·40)/120 ≈ **5.17 mm**.
5. **The monitor, part 1: it counts**
   - The monitor never gets addresses. A **pixel clock** ticks once per pixel.
   - 1080p60 timing: 2,200 × 1,125 ticks per frame (including invisible blank margins) × 60 = **148.5 MHz**, so one pixel every 6.7 ns.
   - x = n mod 2200 and y = ⌊n / 2200⌋. The pixel is visible if x < 1920 and y < 1080.
   - **H-sync** means "new row" and **V-sync** means "back to the top-left".
   - HDMI: 3 data pairs (R, G, B) + 1 clock pair. Each byte is sent as 10 bits (TMDS), which keeps enough 0→1 changes for the receiver to stay in time. 148.5 M × 10 = 1.485 Gbit/s per pair, **4.455 Gbit/s** in total.
6. **The monitor, part 2: inside the panel**
   - A timing controller buffers one row.
   - **Row (gate) drivers** switch on one row of transistors at a time, giving each row ≈ 1/(1,125 × 60) ≈ **14.8 µs**.
   - **Column (source) drivers** set all 1920 × 3 = 5,760 subpixel voltages at once, using a DAC per column.
   - Each subpixel keeps its voltage on a tiny capacitor until the next refresh, the same trick as a DRAM cell. That is why the picture doesn't flicker.
   - Gamma: value 128 gives only (128/255)^2.2 ≈ **22%** light, and 50% light needs ≈ 186.
   - Close the loop: the monitor sees only an endless stream of R, G, B numbers in an agreed order.
7. **Real world in, real world out: ADC, DAC and sound**
   - A **comparator** outputs 1 if voltage A > voltage B. It is the bridge between the smooth world and the digital one.
   - **ADC by binary search:** 8 comparisons give 8 bits. Measuring 0.62 V on a 1 V scale gives `1001 1110` = **158**, and 158/256 = 0.617 V.
   - **DAC:** each bit switches on a current worth 1/2, 1/4, … 1/256 of full scale, and the currents add up. That voltage moves a speaker cone or sets a pixel's brightness.
   - **Sound:** the air pressure wiggles. A microphone turns them into a voltage, sampled 48,000 times a second at 16 bits (65,536 levels).
     - A 440 Hz tone as numbers: s[n] = 32767·sin(2π·440·n/48000) = 0, 1886, 3766, 5634, …
     - Nyquist: you need more than 2 samples per wiggle, and 2 × 20 kHz = 40 kHz < 48 kHz.
     - CD audio = 44,100 × 16 × 2 = 1,411,200 bit/s, so 3 minutes ≈ 31.8 MB raw.
   - Every sensor is "something that changes a voltage": light (camera), finger (touch), heat (thermometer), air (microphone).

**Widgets**
1. **Address map explorer**
   - A 64 KB address bar coloured by chip (RAM / keyboard / screen / ROM).
   - Type an address and watch the decoder gates light one chip-select. Writing a byte into the screen region lights pixels on an 8×8 LED panel.
   - A polling vs interrupt toggle, with a "wasted checks" counter, while simulated key presses arrive at random.
2. **Be the monitor (slow-motion cable)**
   - A 16 × 9 toy screen fed one RGB value per tick from a serial stream. A clock LED blinks, x/y counters step, and H-sync/V-sync pulses show on a timeline.
   - A **"drop one clock tick"** button shifts the whole picture by one pixel: proof that position comes only from counting.
   - Resolution and refresh sliders compute the pixel clock and Gbit/s live. A gamma toggle shows value vs perceived brightness.
3. **Touch grid** (with a Mouse tab)
   - Drag a soft finger blob over an 8×8 electrode grid. Each electrode shows a signal bar, the weighted-average formula updates live, and a crosshair lands between electrodes.
   - Mouse tab: two speckle images shifted by (dx, dy), the search that finds the shift, and the signed-byte report.
4. **Binary-search voltmeter** (with a Sound tab)
   - Set a mystery voltage, press Compare 8 times, and watch each bit set while the remaining range halves on a vertical bar.
   - Sound tab: frequency, sample-rate and bit-depth sliders, with sample dots and the rebuilt staircase. Push past half the sample rate to see aliasing.
   - A Play button uses Web Audio to play the exact number list shown.

**Go deeper**
- "Why old TVs needed sync: the electron beam." A CRT's beam really did sweep row by row. Sync told it when to jump back.
- "Why 128 isn't half as bright: gamma." Eyes notice changes in dark tones more than in bright ones, so the codes are spent unevenly.
- "Aliasing: the wagon wheel that spins backwards."
- Move the Graphics GoDeeper "How does a pixel actually make light?" (LCD/OLED physics) here, or link to it from section 6.

---

### 2.6 `operating-system`: The Operating System (Part 3, last)

**learn:** "From power button to desktop (booting)" · "How many apps share one CPU and one RAM" · "Why apps can't touch the hardware: kernel mode and system calls"
**scale:** "250 app switches per second"

**Sections**

1. **The OS is just a program**
   - Its core, the **kernel**, starts first, owns the hardware, and manages the other programs.
   - Three jobs: **share** the CPU and RAM, **guard** the apps from each other, and give apps **simple doors** to the devices.
2. **Booting: from power button to desktop**
   - This absorbs the Storage GoDeeper.
   - Reset: a power-good circuit holds the reset wire for a few milliseconds, so every flip-flop goes to a known value. In SAP-8 that is PC = 0. On x86 it is PC = 0xFFFFFFF0, an address the decoder sends to the **firmware flash chip**, not RAM.
   - Firmware (UEFI) checks RAM and finds the SSD. Then it copies the bootloader → kernel → first program → login screen.
   - Every stage is the same move: **copy bytes into RAM, then JMP to them**.
   - Chicken and egg: the firmware was written into flash at the factory.
3. **Many apps, one core: taking turns**
   - A hardware timer (a counter, like in the Clock chapter) interrupts 250 times a second, i.e. every 4 ms.
   - A 4 ms slice at 4 GHz = 16 million ticks of work.
   - **Context switch:** push app A's registers into its record in the **process table**. Load B's saved registers, including its PC and SP. "Return from interrupt" lands inside B.
   - A switch costs about 2 µs, so the overhead is ≈ 0.05%.
   - The **scheduler** decides who goes next: take turns (round-robin) plus priorities, so music doesn't stutter.
   - Process states: running / ready / waiting. Most of the 300 processes are *waiting* and use 0% CPU.
   - When everyone is waiting, the OS runs "halt until interrupt" and the core sleeps. This is how batteries last.
4. **Walls between apps: kernel mode and system calls**
   - The CPU has a 1-bit **mode** flip-flop: kernel or user. In user mode, device addresses and dangerous instructions cause a trap.
   - A **system call** is the controlled door. The app puts a number in a register (Linux x86-64: read = 0, write = 1) and runs `syscall`, which flips the mode bit and jumps to a fixed kernel address in one step.
   - The kernel checks the request, does the work through the driver, and flips back.
   - Example: `print("hi")` → library → `write(1, "hi", 2)` → kernel → driver → device registers.
5. **Every app thinks it owns the memory: virtual memory**
   - On every load and store, the **MMU** translates the address using a table the OS fills in.
   - Memory is cut into 4 KiB pages (2¹²). For example, 0x00403A7C → page 0x403, offset 0xA7C. The table maps page 0x403 → frame 0x1F2, giving physical address **0x1F2A7C**.
   - 16 GB / 4 KiB = 4,194,304 frames.
   - Two apps both use 0x1000 and land in different frames.
   - An unmapped page causes a **page fault**, which shows up as "Segmentation fault". Only that app dies.
   - **Swap:** when RAM is full, pages go to the SSD, which is about 1,000× slower (≈ 80 µs vs ≈ 80 ns). That is why a full RAM makes the computer crawl.
6. **Launching an app: the loader**
   - Double-click → the OS checks the file's header (7F 'ELF' or 'MZ').
   - It sets up a fresh address space, maps the code and data, makes a stack (e.g. 8 MiB) and a heap, and jumps to the entry address written in the header.
   - Copying a 50 MB app at about 3 GB/s takes ≈ 17 ms. Real OSes load pages lazily, only when they are first touched.
7. **Who gets the key, the click, the packet and the screen?**
   - An app is a loop: wait for an event → handle it → redraw → sleep.
   - **Focus:** keys go to the focused window's queue. **Hit-test:** clicks go to the topmost window containing (x, y).
   - **Compositing:** each app draws into its own private image (800 × 600 × 4 B = 1.92 MB). The compositor stacks them back to front into the real framebuffer.
   - **Ports:** every packet carries a 16-bit port number (0–65,535), and the OS table says "port 51234 → chat app". The IP address finds the device; the port finds the app.
   - One pattern explains all of these: **the OS keeps a table and routes things**.

**Widgets**
1. **Boot chain**
   - A timeline: reset → firmware → bootloader → kernel → app.
   - A RAM map fills up at each stage, and a PC arrow jumps into the newly copied region.
   - Last step: drag an app icon onto RAM and watch the loader copy the header, code and data, set SP, and jump.
2. **Juggling CPU (scheduler)**
   - 3 apps (Music, Browser, Chat), each with saved PC/A/B in a process-table row. A timer ticks on an axis, and at each switch the registers visibly fly out and in.
   - A time-slice slider shows overhead % against how jerky a "typing" app feels.
   - "Turn off the timer" lets one greedy app freeze the others. A "sleep" state shows waiting apps using 0%.
3. **Two apps, one RAM (with a Mode tab)**
   - Two app panels write to the same virtual address. The page-table view in the middle splits the bits into page | offset and draws arrows to two different physical frames.
   - Deleting an entry → the next access gives a red "Segmentation fault". Filling RAM pushes a page out to the SSD.
   - Mode tab: an app tries ADD (allowed), a direct write to the screen address (trapped, red), and a syscall write (the mode light turns to kernel, then back). The mode bit is drawn as one glowing flip-flop.
4. **Desktop dispatcher**
   - 3 draggable, overlapping windows. Click one to focus it, then type and watch key events fly into its queue. Clicks show the hit-test order.
   - "Show buffers" reveals each app's private image and the compositor stacking them.
   - A network panel sends packets with different ports, and the port table routes each one.

**Go deeper**
- "Why page tables have levels." A flat table for 48-bit addresses would be 2³⁶ entries × 8 B = 512 GiB. Instead there are 4 levels of 512 entries (9 bits each) + a 12-bit offset. The TLB cache makes translation almost free.
- "Two cores, one counter: race conditions." Both cores run LDA / ADD / STA on count = 5 at the same moment, and the result is 6, not 7. Fixes: atomic instructions and locks.
- "The heap: malloc and free." A memory leak is forgetting to free; fragmentation is the holes left between blocks.

---

## 3. Small additions to existing chapters

**Transistor (`transistor`)**
- *"Electricity in 60 seconds"* → shrink to a 3-line recap plus a link to Electricity Basics. Ohm's law and its worked example move there.
- *"Why only 0 and 1?"*: add logic levels.
  - For 3.3 V logic, an input ≤ 0.8 V reads 0 and ≥ 2.0 V reads 1. Outputs guarantee ≤ 0.4 V and ≥ 2.4 V, which leaves a 0.4 V noise margin on each side.
  - Every gate restores a weak signal to a clean 0 or 1, which is why a billion gates in a row still work (ties to NoiseDemo).
- *"How small, how many, how fast?"*: replace the one-sentence factory line with a link to Making a Chip.

**Binary (`binary`)**
- *Callout under "Text is numbers too": "But how does the computer know 01000001 is 'A'?"*
  - Short answer: it doesn't. The code that reads it decides.
  - Link to Who Decides What Bits Mean?
- *GoDeeper "UTF-8: how a byte says 'I'm part of a bigger character'"*
  - Lead-byte patterns 0xxxxxxx / 110xxxxx / 1110xxxx / 11110xxx, and continuation bytes 10xxxxxx.
  - 'é' → C3 A9.

**Logic Gates (`logic-gates`)**: this directly answers the user's "logic gate" prompt
- *New section "Decoders: a gate that recognises one pattern"*, after "Combining gates".
  - An AND gate with NOTs on some inputs fires for exactly one pattern. The 0100 detector is NOT b7 AND b6 AND NOT b5 AND NOT b4.
  - A 2-to-4 decoder gives one output wire per pattern. The same circuit picks a RAM row (Memory) and recognises opcodes (CPU).
  - Small widget: pick a target pattern, toggle the input bits, and see the NOT bubbles and whether the output fires.
- In the existing GoDeeper "Any truth table → a circuit", link forward to the 7-segment decoder in bits-meaning.

**The ALU (`alu`)**
- *GoDeeper "Numbers bigger than the register: add with carry"*
  - 300 = [1, 44]. Add the low bytes first: 200 + 100 → 44 with carry 1. Then the high bytes: 0 + 0 + 1 = 1.
  - ADC instruction. Ranges: 8 → 255, 16 → 65,535, 32 → ~4.29 billion, 64 → ~1.8 × 10¹⁹.
  - A 2048-bit encryption key = 32 words of 64 bits, so a multiply takes ~1,024 word multiplies.
- *GoDeeper "Where do cos, sin and √ come from?"*
  - cos 0.5 ≈ 1 − 0.125 + 0.0026042 − 0.0000217 = 0.8775825 (the true value is 0.8775826).
  - Newton's √2: 1 → 1.5 → 1.41667 → 1.4142157 → 1.4142136.
  - Lookup tables (the DCT needs only 64 cosines) and CORDIC (shift + add). Link from Graphics and Video.

**Memory (`memory`)**
- *New short section "ROM: memory that's wired, not written"*
  - A truth table frozen in hardware: a decoder plus a grid with or without a transistor at each crossing. Size = 2ⁿ rows × m bits.
  - It is used for microcode (CPU), firmware (OS boot) and fonts (bits-meaning).
- *GoDeeper "Inside the D flip-flop: why it listens only at the edge"*
  - Why S = R = 1 is forbidden: a race.
  - Gated D latch, then master–slave: two latches with opposite clocks pass data only at 0 → 1.
  - About 20 transistors, which matches the chapter's figure.
  - Setup/hold time links to the Clock chapter.

**The Clock (`clock`)**
- *GoDeeper "Ring of NOTs and the clock tree"*, after "Where does the clock come from?".
  - 3 NOTs at 10 ps → period 60 ps ≈ 16.7 GHz. A PLL uses a tunable version locked to the quartz.
  - One gate drives about 4 inputs, so 10⁹ flip-flops need log₄(10⁹) ≈ 15 buffer levels in an H-shaped tree.
  - Clock gating saves power.
- In "Why not just tick faster?", link "gates need time" to the RC section of Electricity.

**The CPU (`cpu`)**
- *New section "Sharing one road: the bus"*, after "Fetch → decode → execute".
  - Two outputs fighting on one wire make a short circuit. A tri-state buffer adds a third state Z (disconnected). Truth table: (x, 0) → Z; (0, 1) → 0; (1, 1) → 1.
  - SAP-8's CO/RO/IO/AO/EO are the enables (about 40 buffers), and only one is on per tick. Modern chips mostly use muxes instead.
  - Load-enable: a mux before D (D = LOAD ? bus : Q) is how register A *ignores* the bus. The PC = register + incrementer + jump mux.
  - Widget "Who's talking?": 4 registers, each with OUT and IN switches. Two OUTs on at once makes the bus flash red.
- *Callout in "Run it yourself"*: "Who put the program in memory?" Link to OS → Booting.
- *GoDeeper "Multiple cores and the operating system"* → trim to 2 sentences and link to the OS chapter.
- *New GoDeeper "Is SAP-8 really the same kind of machine as your phone?"*
  - Universality: memory + a conditional jump can simulate any computer, given enough memory. Emulators prove it.
  - SAP-8 has 2¹²⁸ ≈ 3.4 × 10³⁸ memory states.
  - Some things no program can decide (the halting problem, one-paragraph sketch).

**Machine Code (`machine-code`)**
- *Fix the sentence* "Every if, for, while and function call… comes down to flags and jumps" → "…flags and jumps. Function calls also need a way back: the stack (next chapter)."
- *New section "Where do variables live?"*, before "Real machine code".
  - A variable name is an address the compiler remembers (symbol table): product → 14.
  - Addressing modes: immediate (LDI 5), direct (LDA 14), indirect (the address is in a register = a **pointer**).
  - Arrays: base + i × size. An int array at 1000 puts a[3] at 1000 + 3 × 4 = 1012, which is why indexes start at 0.
  - Strings: "hi" = 104, 105, 0. The framebuffer pixel (10, 2) on a 1920-wide screen is at (2 × 1920 + 10) × 4 = 15,400.
  - Optional SAP-8 opcode D `LDP n`: A ← RAM[RAM[n]] (load via pointer).
  - Widget "Walk the string": cells holding "hi Sam\0", a pointer arrow, a 3-line loop, and an item-size slider (1/2/4) recomputing base + i × size.
- *Closing section "So what is software, physically?"*
  - Hardware wiring never changes. Software is a pattern of bits steering it through the control unit. Installing = copying bytes.
  - An executable = header (magic number, CPU type, entry address) + code + data. That is why an x86 app won't run on ARM.
  - Firmware, and the dozen tiny computers (microcontrollers) inside a laptop: keyboard, SSD, monitor, charger.

**Storage (`storage`)**
- *New section "When a bit flips: parity, Hamming and ECC"*, after "Flash wears out".
  - Parity: 'A' = 0100 0001 has two 1s → parity bit 0. It detects one flip but can't say which bit.
  - Hamming(7,4): data 1011 → codeword 0110011. Flip bit 5 → 0110111, and the syndrome 101₂ = 5 points to it.
  - ECC RAM uses (72,64): 12.5% extra, fixes 1 flip and detects 2. SSDs use stronger codes (LDPC). CRC-32 protects Ethernet/Wi-Fi frames, and QR codes survive 30% damage (level H).
  - Widget "Cosmic ray": a 3-circle Venn diagram of the codeword. Click a bit to flip it; the failing circles point to it and it is fixed. Flipping two bits shows the limit.
- *GoDeeper "What happens when you press the power button?"* → replace with a one-line link to OS → Booting.

**Scene: Pressing 2 + 3 (`calculator`)**
- Step 3 "Interrupt": say *where* the registers go (pushed on the stack) and link to Functions & the Stack and to I/O.
- Step 7 "Drawing the digits": link to bits-meaning's font section. ("The same lookup works for any letter.")

**Graphics (`graphics`)**
- *GoDeeper "How AI runs on this: a neuron is multiply, add, compare"*, after "Why GPUs exist".
  - Inputs (1, 0.5), weights (0.8, −0.4), bias 0.1 → 0.7.
  - A layer = a grid of weights × a list of inputs.
  - A 7 B-weight model at 2 bytes each = 14 GB. It needs ≈ 1.4 × 10¹⁰ multiply-adds per word piece. At 1 TB/s memory that is ≈ 14 ms per token ≈ 70 tokens/s.
  - Learning means nudging every weight slightly, repeated billions of times.
- In "How does a pixel actually make light?", link to I/O → inside the panel (or move the box there).

**Scene: Watching a Video (`video`)**
- *GoDeeper under "Trick 4": "Huffman codes, and how the decoder knows where a code ends"*
  - ABRACADABRA: A = 0, B/R/C/D = 3 bits each → 23 bits vs 33 (fixed 3-bit) vs 88 (ASCII). The entropy limit is ≈ 22.4 bits.
  - Prefix-free: no code starts another, so no separators are needed (Morse needs gaps).
  - ZIP and PNG = LZ77 + Huffman.
- "And the sound?" → link to I/O → sound.

**Scene: Sending a Message (`network`)**
- *Callout in step 6, "Which app gets it? Ports"*: 16-bit port numbers, HTTPS on 443. The IP finds the phone; the port finds the app. Link to OS.
- The Packetizer checksum line: add "real links use CRC" with a link to Storage → bit flips.
- *GoDeeper "And when you open a web page?"*
  - `GET /index.html` is plain text. HTML → a tree (like the compiler's parse tree) → layout boxes → glyphs → framebuffer.
  - A typical page is ~2 MB over ~70 requests.

---

## 4. Implementation notes (for whoever builds this)

- `app/lib/chapters.ts`
  - Add 6 chapters with `learn` and `scale` as above.
  - Rename `PartId` `"storage"` → `"system"` and update blurbs.
  - Order the array as in section 1.
- `app/lib/cpu.ts`
  - Opcodes 9–D are free (E = OUT, F = HLT). Add CALL = 9, RET = A, PUSH = B, POP = C, and optionally LDP = D.
  - Add a 4-bit `sp` register (initial 15) and new control signals for SP-out / SP-up / SP-down.
  - CALL recipe: SP → MAR; PC → RAM; SP − 1; operand → PC.
  - Update `asm.ts` mnemonics and add the presets "double it twice", "eat yourself" and "forgot the HLT".
- `app/lib/font.ts` has no letters (only 0–9, + − =, h i H, space, !).
  - Add A–Z, or add a separate 8×8 table (`font8.ts`) for bits-meaning, where each row is one byte. 'A' = 18 24 42 42 7E 42 42 00.
- Browser features:
  - File X-ray reads dropped files locally only (FileReader, no upload).
  - The Sound tab uses Web Audio.
  - The Moore's law plot should use the dataviz conventions.

## 5. Considered and deferred

| item | decision |
|---|---|
| "Algorithms & data structures" chapter | Defer. It is a good future chapter after Functions; nothing in the current plan depends on it. |
| "Scene: Asking an AI" | Graphics GoDeeper now; it could grow into a scene later. |
| Turing machines / halting problem | CPU GoDeeper only. |
| Separate "When bits go wrong" chapter | Section in Storage instead. |
| Separate Sound chapter | Section in I/O instead. |
| HTTP/HTML web page | Network GoDeeper only. |
| Clock tree, master–slave flip-flop | GoDeepers only. |