/**
 * The glossary at the back of the book. Each entry is a plain-English
 * definition plus the chapter where the idea is explained properly.
 */
export interface Term {
  term: string;
  /** Other names or the full form of an abbreviation. */
  aka?: string;
  def: string;
  /** The chapter that explains it. */
  slug: string;
}

export const glossary: Term[] = [
  {
    term: "Electric charge",
    def: "A property of particles such as electrons. Moving charge is what we call electricity. It is measured in coulombs.",
    slug: "electricity",
  },
  {
    term: "Coulomb",
    aka: "C",
    def: "The unit of electric charge. One coulomb is the charge of about 6.24 × 10¹⁸ electrons.",
    slug: "electricity",
  },
  {
    term: "Current",
    aka: "I",
    def: "How much charge flows past a point each second. It is measured in amperes.",
    slug: "electricity",
  },
  {
    term: "Ampere",
    aka: "amp, A",
    def: "The unit of current: one coulomb per second, about 6.24 × 10¹⁸ electrons passing each second.",
    slug: "electricity",
  },
  {
    term: "Voltage",
    aka: "V",
    def: "The “push” that makes charge flow, measured between two points. It is measured in volts. When a wire is “at 1 V” we mean 1 volt above ground.",
    slug: "electricity",
  },
  {
    term: "Volt",
    def: "The unit of voltage. One volt gives one joule of energy to each coulomb of charge that moves through it.",
    slug: "electricity",
  },
  {
    term: "Resistance",
    aka: "R",
    def: "How strongly something resists the flow of current. It is measured in ohms.",
    slug: "electricity",
  },
  {
    term: "Ohm",
    aka: "Ω",
    def: "The unit of resistance. A 1 Ω resistor lets 1 ampere flow when 1 volt pushes across it.",
    slug: "electricity",
  },
  {
    term: "Ohm's law",
    def: "V = I × R: voltage equals current times resistance. If you know two of them, you can work out the third.",
    slug: "electricity",
  },
  {
    term: "Ground",
    def: "The return side of a circuit, which we call 0 volts. Every other voltage in the computer is measured from ground.",
    slug: "electricity",
  },
  {
    term: "Circuit",
    def: "A closed loop that current can flow around: from the source, through the parts, and back again. Open the loop anywhere and the current stops.",
    slug: "electricity",
  },
  {
    term: "Series",
    def: "Parts connected one after the other, so the same current goes through all of them. Two switches in series act like AND.",
    slug: "electricity",
  },
  {
    term: "Parallel",
    def: "Parts connected side by side, so the current splits between them. Two switches in parallel act like OR.",
    slug: "electricity",
  },
  {
    term: "Power",
    aka: "P",
    def: "How fast energy is used: P = V × I, measured in watts.",
    slug: "electricity",
  },
  {
    term: "Watt",
    aka: "W",
    def: "The unit of power: one joule of energy per second.",
    slug: "electricity",
  },
  {
    term: "Capacitor",
    def: "Two conductors separated by an insulator. It stores charge, like a little bucket: Q = C × V. Every wire and every transistor gate is a tiny capacitor.",
    slug: "electricity",
  },
  {
    term: "Time constant",
    aka: "RC, τ",
    def: "τ = R × C, the time a capacitor needs to fill to about 63% through a resistor. It is why a switch can never flip instantly.",
    slug: "electricity",
  },
  {
    term: "Relay",
    def: "A switch flipped by electricity: current in a coil makes a magnet that pulls a metal contact closed. Early computers were built from them.",
    slug: "electricity",
  },
  {
    term: "Transistor",
    def: "A switch with no moving parts, turned on and off by the voltage on its gate. Every part of a computer is built from them.",
    slug: "transistor",
  },
  {
    term: "Semiconductor",
    def: "A material such as silicon that conducts electricity much better or much worse depending on small changes, such as added atoms or a nearby voltage.",
    slug: "transistor",
  },
  {
    term: "Silicon",
    def: "The element computer chips are made of. Pure silicon barely conducts; adding a tiny amount of other atoms (doping) changes that.",
    slug: "transistor",
  },
  {
    term: "Doping",
    def: "Adding a tiny amount of another element to silicon to give it extra free electrons (n-type) or missing electrons, called holes (p-type).",
    slug: "transistor",
  },
  {
    term: "n-type silicon",
    def: "Silicon doped with atoms such as phosphorus, which bring extra free electrons. The crystal as a whole stays electrically neutral.",
    slug: "transistor",
  },
  {
    term: "p-type silicon",
    def: "Silicon doped with atoms such as boron, which leave “holes” where an electron is missing. Holes move like positive charges.",
    slug: "transistor",
  },
  {
    term: "MOSFET",
    def: "Metal–oxide–semiconductor field-effect transistor: the kind of transistor in every modern chip. A voltage on its gate opens or closes a channel between source and drain.",
    slug: "transistor",
  },
  {
    term: "Gate (of a transistor)",
    def: "The control terminal of a MOSFET. The voltage on it decides whether current can flow between source and drain. Not the same as a logic gate.",
    slug: "transistor",
  },
  {
    term: "Source and drain",
    def: "The two ends of a transistor's channel. When the transistor is on, current flows between them.",
    slug: "transistor",
  },
  {
    term: "Threshold voltage",
    def: "The gate voltage at which a transistor switches from off to on.",
    slug: "transistor",
  },
  {
    term: "nMOS and pMOS",
    def: "The two kinds of MOSFET. An nMOS turns on when its gate is high (1); a pMOS turns on when its gate is low (0).",
    slug: "transistor",
  },
  {
    term: "CMOS",
    def: "Complementary MOS: circuits built from nMOS and pMOS pairs, arranged so that while the inputs are steady one of each pair is off. This saves a lot of power.",
    slug: "transistor",
  },
  {
    term: "Logic level",
    def: "The voltage ranges that count as 0 or 1. For 3.3 V logic an input below 0.8 V reads as 0 and above 2.0 V reads as 1.",
    slug: "transistor",
  },
  {
    term: "Picosecond",
    aka: "ps",
    def: "One trillionth of a second (10⁻¹² s). A modern logic gate switches in a few picoseconds.",
    slug: "transistor",
  },
  {
    term: "Bit",
    aka: "binary digit",
    def: "The smallest piece of information: a single 0 or 1. In hardware it is one wire or one storage cell that is either low or high voltage.",
    slug: "binary",
  },
  {
    term: "Byte",
    def: "A group of 8 bits. It can hold 2⁸ = 256 different patterns, for example the numbers 0 to 255.",
    slug: "binary",
  },
  {
    term: "Binary",
    def: "Writing numbers with only two digits, 0 and 1. Each place is worth twice the one to its right: 1, 2, 4, 8, 16…",
    slug: "binary",
  },
  {
    term: "Hexadecimal",
    aka: "hex",
    def: "Base 16, using the digits 0–9 and A–F. One hex digit stands for exactly 4 bits, so a byte is two hex digits, such as 0x41.",
    slug: "binary",
  },
  {
    term: "Kilobyte",
    aka: "KB",
    def: "1,000 bytes. A kibibyte (KiB) is 1,024 = 2¹⁰ bytes. In the same way, MB, GB and TB grow by 1,000 each step.",
    slug: "binary",
  },
  {
    term: "ASCII",
    def: "An old, agreed list that gives each English letter, digit and symbol a number from 0 to 127. For example, A = 65 and space = 32.",
    slug: "binary",
  },
  {
    term: "Unicode",
    def: "The worldwide list that gives a number to every character in every writing system, plus emoji: over 150,000 characters.",
    slug: "binary",
  },
  {
    term: "UTF-8",
    def: "The usual way to store Unicode numbers as bytes. ASCII characters take 1 byte; other characters take 2, 3 or 4.",
    slug: "binary",
  },
  {
    term: "Two's complement",
    def: "The way computers store negative whole numbers: the top bit counts as negative. In 8 bits it covers −128 to 127. To negate, flip every bit and add 1.",
    slug: "binary",
  },
  {
    term: "Floating point",
    aka: "float",
    def: "Scientific notation in base 2, used for fractions and very large or small numbers. A float stores a sign, an exponent and a fraction.",
    slug: "binary",
  },
  {
    term: "Overflow",
    def: "When the answer is too big (or too small) to fit in the bits available. The extra part is lost and the result wraps around.",
    slug: "adder",
  },
  {
    term: "Logic gate",
    def: "A tiny circuit, made of a few transistors, that computes one output bit from its input bits. AND, OR and NOT are the basic ones.",
    slug: "logic-gates",
  },
  {
    term: "AND gate",
    def: "Outputs 1 only if all its inputs are 1.",
    slug: "logic-gates",
  },
  {
    term: "OR gate",
    def: "Outputs 1 if at least one input is 1.",
    slug: "logic-gates",
  },
  {
    term: "NOT gate",
    aka: "inverter",
    def: "Outputs the opposite of its one input. Also called an inverter.",
    slug: "logic-gates",
  },
  {
    term: "NAND gate",
    def: "NOT-AND: outputs 0 only when all inputs are 1. Any logic circuit at all can be built from NAND gates alone.",
    slug: "logic-gates",
  },
  {
    term: "NOR gate",
    def: "NOT-OR: outputs 1 only when all inputs are 0.",
    slug: "logic-gates",
  },
  {
    term: "XOR gate",
    def: "Exclusive OR: outputs 1 when the inputs are different. It is the “sum” part of an adder.",
    slug: "logic-gates",
  },
  {
    term: "Truth table",
    def: "A table listing every possible input and the output for each. It completely describes what a logic circuit does.",
    slug: "logic-gates",
  },
  {
    term: "De Morgan's laws",
    def: "Two rules for flipping logic: NOT (A AND B) = (NOT A) OR (NOT B), and NOT (A OR B) = (NOT A) AND (NOT B).",
    slug: "logic-gates",
  },
  {
    term: "Decoder",
    def: "A circuit with one output wire for each input pattern; exactly one output is 1. It is how hardware “recognises” a pattern, such as a memory address or an opcode.",
    slug: "logic-gates",
  },
  {
    term: "Half adder",
    def: "Adds two bits: sum = A XOR B, carry = A AND B.",
    slug: "adder",
  },
  {
    term: "Full adder",
    def: "Adds two bits plus a carry coming in from the right, giving a sum bit and a carry going out.",
    slug: "adder",
  },
  {
    term: "Carry",
    def: "The 1 that moves to the next column when a column's sum is too big, just as in written addition.",
    slug: "adder",
  },
  {
    term: "Ripple-carry adder",
    def: "Full adders in a row, each one passing its carry to the next. Simple, but the carry has to “ripple” through every stage.",
    slug: "adder",
  },
  {
    term: "Carry-lookahead adder",
    def: "A faster adder that works out all the carries at once, using “generate” and “propagate” signals, instead of waiting for them to ripple.",
    slug: "adder",
  },
  {
    term: "ALU",
    aka: "arithmetic logic unit",
    def: "The part of the CPU that does arithmetic (add, subtract) and logic (AND, OR, shifts) on numbers.",
    slug: "alu",
  },
  {
    term: "Opcode",
    def: "Short for operation code: the bits that tell the ALU or the CPU which operation to do.",
    slug: "alu",
  },
  {
    term: "Flags",
    def: "Single bits that describe the last result: Z (it was zero), C (carry or borrow), N (negative), V (signed overflow). Conditional jumps read them.",
    slug: "alu",
  },
  {
    term: "Multiplexer",
    aka: "mux",
    def: "A circuit that picks one of several inputs and passes it to the output, controlled by select bits. Like a railway switch for data.",
    slug: "alu",
  },
  {
    term: "Bitwise operation",
    def: "An operation done on each bit position separately, such as AND-ing two bytes bit by bit.",
    slug: "alu",
  },
  {
    term: "Shift",
    def: "Moving all the bits left or right by one place. A left shift multiplies by 2; a right shift divides by 2.",
    slug: "alu",
  },
  {
    term: "SIMD",
    def: "Single instruction, multiple data: one instruction that does the same operation on many numbers at once.",
    slug: "alu",
  },
  {
    term: "FPU",
    def: "Floating-point unit: the part of a CPU that does arithmetic on floating-point numbers.",
    slug: "alu",
  },
  {
    term: "Latch",
    def: "A small circuit that remembers one bit by feeding its output back into its own input.",
    slug: "memory",
  },
  {
    term: "Flip-flop",
    aka: "D flip-flop",
    def: "A memory circuit for one bit that only takes in a new value at the moment the clock ticks. Two latches in a row (master and slave) make a D flip-flop.",
    slug: "memory",
  },
  {
    term: "Feedback",
    def: "Connecting a circuit's output back to its own input. It is what lets a circuit remember.",
    slug: "memory",
  },
  {
    term: "Register",
    def: "A small group of flip-flops inside the CPU that holds one value, such as 8 or 64 bits. Registers are the fastest memory a computer has.",
    slug: "memory",
  },
  {
    term: "RAM",
    aka: "random-access memory",
    def: "Random-access memory: the computer's main working memory. Any byte can be read or written directly by giving its address. It forgets everything when the power goes off.",
    slug: "memory",
  },
  {
    term: "Address",
    def: "The number that says which memory location to read or write, like a house number.",
    slug: "memory",
  },
  {
    term: "ROM",
    aka: "read-only memory",
    def: "Read-only memory: memory whose contents are fixed when the chip is made (or rarely changed). It is a frozen truth table: an address in, stored bits out.",
    slug: "memory",
  },
  {
    term: "SRAM",
    aka: "static RAM",
    def: "Static RAM: each bit is a small latch of about 6 transistors. Fast, but large, so it is used for caches and registers.",
    slug: "storage",
  },
  {
    term: "DRAM",
    aka: "dynamic RAM",
    def: "Dynamic RAM: each bit is one transistor and one tiny capacitor. Dense and cheap, but the charge leaks, so it must be refreshed many times a second.",
    slug: "storage",
  },
  {
    term: "Clock",
    def: "A signal that switches between 0 and 1 at a steady rate. Each tick tells every flip-flop in the chip to take in its new value at the same moment.",
    slug: "clock",
  },
  {
    term: "Hertz",
    aka: "Hz",
    def: "The unit of frequency: once per second. 3 gigahertz (GHz) means 3 billion clock ticks per second.",
    slug: "clock",
  },
  {
    term: "Rising edge",
    def: "The moment the clock goes from 0 to 1. Most flip-flops take in new data at this moment.",
    slug: "clock",
  },
  {
    term: "Propagation delay",
    def: "The time a signal needs to pass through a gate or a chain of gates.",
    slug: "clock",
  },
  {
    term: "Critical path",
    def: "The slowest chain of gates between two flip-flops. The clock cannot tick faster than this path allows.",
    slug: "clock",
  },
  {
    term: "Quartz crystal",
    def: "A tiny piece of quartz that vibrates at a very steady frequency. It is the timekeeper the clock is built from.",
    slug: "clock",
  },
  {
    term: "PLL",
    aka: "phase-locked loop",
    def: "Phase-locked loop: a circuit that makes a fast, adjustable clock that stays locked in step with the slow quartz crystal.",
    slug: "clock",
  },
  {
    term: "Core",
    def: "One complete CPU. A modern chip has several cores, so it can run several programs at the same time.",
    slug: "clock",
  },
  {
    term: "CPU",
    aka: "processor",
    def: "Central processing unit: the part of the computer that runs instructions, one after another, using its registers, ALU and control unit.",
    slug: "cpu",
  },
  {
    term: "Instruction",
    def: "One basic command for the CPU, such as “add the byte at address 15 to A”. A program is a list of instructions in memory.",
    slug: "cpu",
  },
  {
    term: "Operand",
    def: "The part of an instruction that says what to work on: a number or an address.",
    slug: "cpu",
  },
  {
    term: "Program counter",
    aka: "PC",
    def: "The register that holds the address of the next instruction to fetch.",
    slug: "cpu",
  },
  {
    term: "Instruction register",
    aka: "IR",
    def: "The register that holds the instruction the CPU is working on now.",
    slug: "cpu",
  },
  {
    term: "Control unit",
    def: "The part of the CPU that reads the opcode and, tick by tick, turns on the right control signals. It is basically a lookup table.",
    slug: "cpu",
  },
  {
    term: "Control signal",
    def: "A wire from the control unit that tells one part what to do this tick, such as “A register, take in the bus value”.",
    slug: "cpu",
  },
  {
    term: "Bus",
    def: "A set of shared wires that carries a value from one part of the computer to another. Only one part may put a value on it at a time.",
    slug: "cpu",
  },
  {
    term: "Tri-state buffer",
    def: "A switch that either drives a wire with 0 or 1 or disconnects completely (the “Z” state). It lets many parts share one bus.",
    slug: "cpu",
  },
  {
    term: "Fetch–decode–execute",
    def: "The loop every CPU runs forever: fetch the next instruction from memory, decode what it means, execute it.",
    slug: "cpu",
  },
  {
    term: "Jump",
    def: "An instruction that loads a new address into the program counter, so the program continues somewhere else. A conditional jump only does this if a flag is set.",
    slug: "cpu",
  },
  {
    term: "Microcode",
    def: "The table inside the control unit that lists, for each instruction, which control signals to turn on at each step.",
    slug: "cpu",
  },
  {
    term: "Wafer",
    def: "A thin, polished disc of very pure silicon, usually 300 mm wide. Hundreds of chips are made on it at once.",
    slug: "chip-making",
  },
  {
    term: "Die",
    def: "One chip cut from a wafer.",
    slug: "chip-making",
  },
  {
    term: "Photolithography",
    def: "Printing a chip's patterns with light: light shines through a mask onto a light-sensitive coating, and the exposed areas are then etched or filled.",
    slug: "chip-making",
  },
  {
    term: "Mask",
    def: "A plate with one layer of the chip's pattern on it, used like a stencil in photolithography.",
    slug: "chip-making",
  },
  {
    term: "EUV",
    aka: "extreme ultraviolet",
    def: "Extreme ultraviolet light, with a wavelength of 13.5 nm, used to print the smallest features of modern chips.",
    slug: "chip-making",
  },
  {
    term: "Yield",
    def: "The fraction of chips on a wafer that work. Bigger chips have a lower yield, because each one is more likely to contain a defect.",
    slug: "chip-making",
  },
  {
    term: "Moore's law",
    def: "The observation that the number of transistors on a chip doubled roughly every two years for decades.",
    slug: "chip-making",
  },
  {
    term: "Standard cell",
    def: "A ready-made, tested layout of a small circuit, such as a NAND gate or a flip-flop. Chip designs are built from thousands of types of them.",
    slug: "chip-making",
  },
  {
    term: "HDL",
    aka: "hardware description language",
    def: "Hardware description language, such as Verilog: code that describes a circuit. Tools turn it into gates and then into a chip layout.",
    slug: "chip-making",
  },
  {
    term: "Machine code",
    def: "Instructions as the raw bytes the CPU reads. It is the only language a CPU understands.",
    slug: "machine-code",
  },
  {
    term: "Assembly language",
    aka: "assembly",
    def: "Machine code written with short names, such as ADD 15 instead of 0010 1111. An assembler turns it into bytes.",
    slug: "machine-code",
  },
  {
    term: "Assembler",
    def: "A program that turns assembly language into machine code.",
    slug: "machine-code",
  },
  {
    term: "Compiler",
    def: "A program that translates code in a language like C or Rust into machine code, ahead of time.",
    slug: "machine-code",
  },
  {
    term: "Interpreter",
    def: "A program that reads code (often after turning it into bytecode) and does what it says, step by step, instead of producing machine code first.",
    slug: "machine-code",
  },
  {
    term: "Bytecode",
    def: "Simple instructions for a virtual machine, not for a real CPU. Python and Java turn your code into bytecode first.",
    slug: "machine-code",
  },
  {
    term: "Token",
    def: "One meaningful piece of source code, such as a number, a name or a +. Splitting text into tokens is called lexing.",
    slug: "machine-code",
  },
  {
    term: "Pointer",
    def: "A value that is the address of something else in memory.",
    slug: "machine-code",
  },
  {
    term: "Array",
    def: "Items of the same size stored one after another in memory. Item i is at base + i × size, which is why counting starts at 0.",
    slug: "machine-code",
  },
  {
    term: "Function",
    def: "A named piece of code that can be used (called) from many places, and then returns to where it was called from.",
    slug: "functions",
  },
  {
    term: "Stack",
    def: "An area of memory used last-in, first-out, like a pile of plates. The CPU keeps return addresses and local variables there.",
    slug: "functions",
  },
  {
    term: "Stack pointer",
    aka: "SP",
    def: "The register that holds the address of the top of the stack.",
    slug: "functions",
  },
  {
    term: "Return address",
    def: "The address of the instruction after a CALL, saved on the stack so RET knows where to go back to.",
    slug: "functions",
  },
  {
    term: "Stack frame",
    def: "The part of the stack that belongs to one function call: its return address, arguments and local variables.",
    slug: "functions",
  },
  {
    term: "Recursion",
    def: "A function that calls itself, usually on a smaller part of the problem, until it reaches a simple case.",
    slug: "functions",
  },
  {
    term: "Stack overflow",
    def: "When the stack grows past the memory set aside for it, usually because a function keeps calling itself without stopping.",
    slug: "functions",
  },
  {
    term: "Interrupt",
    def: "A signal that makes the CPU pause what it is doing, save its place on the stack, and run a handler. When the handler returns, the program continues.",
    slug: "functions",
  },
  {
    term: "Cache",
    def: "A small, fast memory close to the CPU that keeps copies of recently used data, so the CPU waits less for slow RAM.",
    slug: "storage",
  },
  {
    term: "SSD",
    aka: "solid-state drive",
    def: "Solid-state drive: storage made of flash memory chips, with no moving parts.",
    slug: "storage",
  },
  {
    term: "Flash memory",
    def: "Memory that keeps its data without power by trapping electrons in an insulated “floating gate” inside each cell.",
    slug: "storage",
  },
  {
    term: "Hard disk",
    aka: "HDD",
    def: "Storage that records bits as tiny magnetic areas on spinning platters, read and written by a moving head.",
    slug: "storage",
  },
  {
    term: "File system",
    def: "The system that organises a drive into named files and folders, and records which blocks belong to which file.",
    slug: "storage",
  },
  {
    term: "Wear levelling",
    def: "Spreading writes evenly over all of an SSD's flash cells, because each cell can only be erased a limited number of times.",
    slug: "storage",
  },
  {
    term: "Parity bit",
    def: "An extra bit that makes the number of 1s even. If one bit flips, the count becomes odd and the error is detected.",
    slug: "storage",
  },
  {
    term: "Hamming code",
    def: "A way of adding check bits so that a single flipped bit can be found and corrected, not just detected.",
    slug: "storage",
  },
  {
    term: "ECC",
    aka: "error-correcting code",
    def: "Error-correcting code: extra bits stored with data so errors can be fixed automatically. ECC RAM fixes any single flipped bit.",
    slug: "storage",
  },
  {
    term: "Firmware",
    def: "Software stored in a chip on the device itself, such as the startup program on a motherboard or the controller code inside an SSD.",
    slug: "operating-system",
  },
  {
    term: "Character encoding",
    def: "An agreed table between numbers and characters, such as ASCII or UTF-8. The same bytes can mean different text under a different encoding.",
    slug: "bits-meaning",
  },
  {
    term: "Font",
    def: "A table that gives the shape (glyph) of each character, for example as a small grid of pixels or as curves.",
    slug: "bits-meaning",
  },
  {
    term: "Glyph",
    def: "The drawn shape of one character in a particular font.",
    slug: "bits-meaning",
  },
  {
    term: "File format",
    def: "The agreed layout of the bytes in a type of file, such as PNG or MP3. It tells programs what each byte means.",
    slug: "bits-meaning",
  },
  {
    term: "Magic number",
    def: "A few fixed bytes at the start of a file that identify its format. Every PNG file starts with 89 50 4E 47.",
    slug: "bits-meaning",
  },
  {
    term: "Seven-segment display",
    def: "A digit display made of 7 light bars. A small decoder circuit turns a 4-bit number into the 7 on/off signals.",
    slug: "bits-meaning",
  },
  {
    term: "I/O",
    aka: "input/output",
    def: "Input/output: how data gets into and out of the computer, through keyboards, screens, network cards, drives and so on.",
    slug: "input-output",
  },
  {
    term: "Memory-mapped I/O",
    def: "Giving a device's control registers memory addresses, so the CPU talks to the device with ordinary load and store instructions.",
    slug: "input-output",
  },
  {
    term: "Device driver",
    aka: "driver",
    def: "Part of the operating system that knows how to control one kind of device.",
    slug: "input-output",
  },
  {
    term: "Polling",
    def: "Asking a device again and again whether it has something new.",
    slug: "input-output",
  },
  {
    term: "DMA",
    aka: "direct memory access",
    def: "Direct memory access: a helper circuit copies data between a device and RAM by itself, so the CPU doesn't have to move every byte.",
    slug: "input-output",
  },
  {
    term: "USB",
    def: "Universal Serial Bus: the common cable and set of rules for connecting keyboards, mice, drives and more.",
    slug: "input-output",
  },
  {
    term: "PCIe",
    def: "PCI Express: the very fast connection between the CPU and devices such as graphics cards and SSDs.",
    slug: "input-output",
  },
  {
    term: "Refresh rate",
    def: "How many times per second the screen shows a new image, such as 60 Hz.",
    slug: "input-output",
  },
  {
    term: "Pixel clock",
    def: "The rate at which pixel colours are sent to the screen. For 1920 × 1080 at 60 Hz it is 148.5 million pixels per second, including the blank margins.",
    slug: "input-output",
  },
  {
    term: "ADC",
    aka: "analog-to-digital converter",
    def: "Analog-to-digital converter: turns a voltage, such as a microphone signal, into a number.",
    slug: "input-output",
  },
  {
    term: "DAC",
    aka: "digital-to-analog converter",
    def: "Digital-to-analog converter: turns a number into a voltage, for example to drive a speaker.",
    slug: "input-output",
  },
  {
    term: "Sample rate",
    def: "How many times per second a sound is measured. 48,000 samples per second (48 kHz) is common.",
    slug: "input-output",
  },
  {
    term: "Nyquist limit",
    def: "To record a frequency you must sample more than twice as fast. Sampling at 48 kHz can capture sounds up to 24 kHz.",
    slug: "input-output",
  },
  {
    term: "Gamma",
    def: "The curve between a pixel's number and its real brightness. Screens use it so that equal steps in the number look like equal steps to our eyes.",
    slug: "input-output",
  },
  {
    term: "Operating system",
    aka: "OS",
    def: "The software that manages the computer: it starts programs, shares the CPU and memory between them, and controls the hardware.",
    slug: "operating-system",
  },
  {
    term: "Kernel",
    def: "The core of the operating system. It runs with full control of the hardware and decides which program runs and what memory it may use.",
    slug: "operating-system",
  },
  {
    term: "Booting",
    aka: "boot",
    def: "Starting the computer: the CPU runs firmware, which loads a bootloader, which loads the kernel into RAM and jumps to it.",
    slug: "operating-system",
  },
  {
    term: "Bootloader",
    def: "A small program that loads the operating system's kernel from the drive into RAM and then jumps to it.",
    slug: "operating-system",
  },
  {
    term: "Process",
    def: "A running program, with its own memory and its own saved registers.",
    slug: "operating-system",
  },
  {
    term: "Context switch",
    def: "Saving the registers of the program that is running and loading another program's, so the CPU can switch between them.",
    slug: "operating-system",
  },
  {
    term: "Scheduler",
    def: "The part of the kernel that decides which process runs next, and for how long.",
    slug: "operating-system",
  },
  {
    term: "System call",
    aka: "syscall",
    def: "A request from a program to the kernel, for example to read a file. A special instruction switches the CPU into kernel mode to handle it.",
    slug: "operating-system",
  },
  {
    term: "Kernel mode",
    aka: "user mode",
    def: "The CPU mode in which every instruction is allowed. Programs run in user mode, where dangerous instructions are blocked.",
    slug: "operating-system",
  },
  {
    term: "Virtual memory",
    def: "Giving each program its own private range of addresses. The hardware translates them to real RAM addresses using page tables.",
    slug: "operating-system",
  },
  {
    term: "Page",
    def: "A fixed-size block of memory, usually 4 KiB, used by virtual memory.",
    slug: "operating-system",
  },
  {
    term: "Page table",
    def: "The table that says, for each page of a program's addresses, where it really is in RAM.",
    slug: "operating-system",
  },
  {
    term: "Page fault",
    def: "What happens when a program uses an address whose page isn't in RAM: the CPU interrupts and the kernel fixes it, for example by loading the page from disk.",
    slug: "operating-system",
  },
  {
    term: "Swap",
    def: "Space on a drive where the operating system puts memory pages that don't fit in RAM.",
    slug: "operating-system",
  },
  {
    term: "Keyboard matrix",
    def: "The grid of row and column wires under a keyboard. Pressing a key connects one row to one column, and scanning finds which.",
    slug: "calculator",
  },
  {
    term: "Framebuffer",
    def: "The area of memory that holds the colour of every pixel on the screen.",
    slug: "graphics",
  },
  {
    term: "Pixel",
    def: "One dot of the image. On a screen each pixel has red, green and blue parts.",
    slug: "graphics",
  },
  {
    term: "Subpixel",
    def: "One of the three small red, green or blue parts of a screen pixel.",
    slug: "graphics",
  },
  {
    term: "RGB",
    def: "Red, green, blue: describing a colour by how bright each of the three is, usually 0 to 255 each.",
    slug: "graphics",
  },
  {
    term: "GPU",
    def: "Graphics processing unit: a chip with thousands of simple cores that do the same calculation on many pixels or numbers at once.",
    slug: "graphics",
  },
  {
    term: "Vertex",
    aka: "vertices",
    def: "A corner point of a triangle in a 3D model.",
    slug: "graphics",
  },
  {
    term: "Rasterisation",
    def: "Working out which pixels a triangle covers.",
    slug: "graphics",
  },
  {
    term: "Shader",
    def: "A small program the GPU runs for every vertex or every pixel, for example to work out its colour.",
    slug: "graphics",
  },
  {
    term: "Double buffering",
    def: "Drawing the next frame into a second framebuffer while the screen shows the first, then swapping them.",
    slug: "graphics",
  },
  {
    term: "LCD",
    def: "Liquid-crystal display: a white backlight shines through liquid crystals that act as tiny shutters, then through coloured filters.",
    slug: "graphics",
  },
  {
    term: "OLED",
    def: "Organic light-emitting diode display: every subpixel makes its own light.",
    slug: "graphics",
  },
  {
    term: "Compression",
    def: "Storing data in fewer bits. Lossless compression gets back the exact original; lossy compression throws away details people won't notice.",
    slug: "video",
  },
  {
    term: "Codec",
    def: "Coder–decoder: the rules (and the program or chip) that compress and decompress video or sound, such as H.264.",
    slug: "video",
  },
  {
    term: "DCT",
    aka: "discrete cosine transform",
    def: "Discrete cosine transform: rewrites an 8×8 block of pixels as a mix of 64 wave patterns, so the fine detail can be stored with fewer bits.",
    slug: "video",
  },
  {
    term: "Quantisation",
    def: "Dividing numbers by a step size and rounding, which throws away small details. It is where most of the compression happens.",
    slug: "video",
  },
  {
    term: "YCbCr",
    def: "Describing colour as brightness (Y) plus two colour differences (Cb, Cr), because our eyes notice brightness detail more than colour detail.",
    slug: "video",
  },
  {
    term: "I-frame, P-frame, B-frame",
    def: "Video frame types: an I-frame is a complete picture; P- and B-frames store only the changes from other frames.",
    slug: "video",
  },
  {
    term: "Motion vector",
    def: "An arrow saying “this block looks like that block in the previous frame, moved by this much”.",
    slug: "video",
  },
  {
    term: "Entropy coding",
    def: "Giving shorter codes to common values and longer codes to rare ones, such as Huffman coding.",
    slug: "video",
  },
  {
    term: "Huffman coding",
    def: "A way of building shortest codes from how often each symbol appears. No code is the start of another, so no separators are needed.",
    slug: "video",
  },
  {
    term: "Packet",
    def: "A small chunk of data with a header saying where it comes from and where it is going. Messages travel across the internet as packets.",
    slug: "network",
  },
  {
    term: "IP address",
    def: "The number that identifies a device on the internet, such as 142.250.72.14.",
    slug: "network",
  },
  {
    term: "Router",
    def: "A device that passes packets on towards their destination, choosing the next hop from a table.",
    slug: "network",
  },
  {
    term: "TCP",
    def: "Transmission Control Protocol: the rules that number packets, re-send lost ones and put them back in order.",
    slug: "network",
  },
  {
    term: "DNS",
    def: "Domain Name System: the internet's phone book, which turns a name like example.com into an IP address.",
    slug: "network",
  },
  {
    term: "Server",
    def: "A computer that waits for requests from other computers and answers them.",
    slug: "network",
  },
  {
    term: "Port",
    def: "A 16-bit number that says which program on a computer a packet is for. Web servers using HTTPS listen on port 443.",
    slug: "network",
  },
  {
    term: "Checksum",
    def: "A number calculated from data and sent with it, so the receiver can check that nothing changed on the way.",
    slug: "network",
  },
  {
    term: "CRC",
    def: "Cyclic redundancy check: a strong checksum computed with polynomial division. It protects Ethernet and Wi-Fi frames.",
    slug: "network",
  },
  {
    term: "Encryption",
    def: "Scrambling data with a key so that only someone with the right key can read it.",
    slug: "network",
  },
  {
    term: "Diffie–Hellman key exchange",
    def: "A way for two people to agree on a secret key over a public channel, using arithmetic that is easy forwards and very hard backwards.",
    slug: "network",
  },
  {
    term: "Latency",
    def: "The delay before data arrives, for example the 100–300 ms a message takes to cross the world and back.",
    slug: "network",
  },
  {
    term: "Bandwidth",
    def: "How much data a link can carry per second.",
    slug: "network",
  },
];

/** Entries sorted A–Z, ignoring case and leading symbols. */
export function sortedGlossary() {
  const key = (t: Term) => t.term.replace(/^[^A-Za-z0-9]+/, "").toLowerCase();
  return [...glossary].sort((a, b) => key(a).localeCompare(key(b)));
}

/** The letter an entry is filed under ("#" for numbers). */
export function letterOf(t: Term) {
  const c = t.term.replace(/^[^A-Za-z0-9]+/, "")[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(c) ? c : "#";
}
