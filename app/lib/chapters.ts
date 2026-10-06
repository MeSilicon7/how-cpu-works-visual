export type PartId = "switch" | "machine" | "system" | "scenes";

export interface Part {
  id: PartId;
  title: string;
  blurb: string;
}

export interface Chapter {
  slug: string;
  part: PartId;
  title: string;
  tagline: string;
  /** Short bullet list shown under the chapter title. */
  learn: string[];
  /** The scale this chapter lives at, used on the home-page zoom ladder. */
  scale: string;
}

export const parts: Part[] = [
  {
    id: "switch",
    title: "The Switch",
    blurb: "From electricity and one transistor to a circuit that does arithmetic.",
  },
  {
    id: "machine",
    title: "The Machine",
    blurb: "Memory, a heartbeat, a CPU you can step through, how it is printed in silicon, and the code it runs.",
  },
  {
    id: "system",
    title: "The System",
    blurb: "Storage, meaning, devices and the operating system: how a CPU becomes a computer you can use.",
  },
  {
    id: "scenes",
    title: "Real Life",
    blurb: "Everything together: calculating, graphics, video and messaging.",
  },
];

export const chapters: Chapter[] = [
  {
    slug: "electricity",
    part: "switch",
    title: "Electricity Basics",
    tagline: "What actually flows in a wire, and why it needs a loop.",
    learn: [
      "What moves in a wire, and why it needs a loop",
      "Volts, amps, ohms and watts with real numbers",
      "Capacitors: why every switch takes time",
    ],
    scale: "1 amp ≈ 6 billion billion electrons per second",
  },
  {
    slug: "transistor",
    part: "switch",
    title: "The Transistor",
    tagline: "A switch with no moving parts, flipped by electricity.",
    learn: [
      "Why computers only use 0 and 1",
      "How a MOSFET turns on and off",
      "How small and fast transistors really are",
    ],
    scale: "~50 nanometres",
  },
  {
    slug: "binary",
    part: "switch",
    title: "Binary",
    tagline: "Counting, text and negative numbers using only on and off.",
    learn: [
      "Place value with powers of 2",
      "Converting decimal ↔ binary ↔ hex",
      "How letters and emoji become numbers",
    ],
    scale: "8 switches = 1 byte",
  },
  {
    slug: "logic-gates",
    part: "switch",
    title: "Logic Gates",
    tagline: "Wire a few transistors together and they start making decisions.",
    learn: ["AND, OR, NOT, XOR from switches", "Truth tables and Boolean algebra", "How real chips build gates (CMOS)"],
    scale: "4–6 transistors",
  },
  {
    slug: "adder",
    part: "switch",
    title: "The Adder",
    tagline: "Teaching a handful of gates to do arithmetic.",
    learn: [
      "Binary addition with carries",
      "Half adder and full adder circuits",
      "Chaining adders to add any size number",
    ],
    scale: "~28 transistors per bit",
  },
  {
    slug: "alu",
    part: "switch",
    title: "The ALU",
    tagline: "One circuit that can add, subtract, compare and more.",
    learn: [
      "Choosing an operation with a multiplexer",
      "Flags: zero, carry, negative",
      "Multiplication as shift-and-add",
    ],
    scale: "thousands of transistors",
  },
  {
    slug: "memory",
    part: "machine",
    title: "Memory",
    tagline: "A loop of gates that remembers a bit, then billions of them.",
    learn: ["Feedback: the latch that remembers", "Flip-flops and registers", "How RAM finds one byte among billions"],
    scale: "1 bit → 16 GB",
  },
  {
    slug: "clock",
    part: "machine",
    title: "The Clock",
    tagline: "The heartbeat that keeps billions of switches in step.",
    learn: ["What 3 GHz actually means", "Why signals need time to settle", "Why chips can't just tick faster"],
    scale: "0.3 nanoseconds per tick",
  },
  {
    slug: "cpu",
    part: "machine",
    title: "The CPU",
    tagline: "Fetch, decode, execute. Repeat forever.",
    learn: [
      "Registers, bus and control unit",
      "Watch a CPU run a program, step by step",
      "Loops and decisions with jumps",
    ],
    scale: "a working 8-bit computer",
  },
  {
    slug: "chip-making",
    part: "machine",
    title: "Making a Chip",
    tagline: "Printing 20 billion switches with light.",
    learn: [
      "From sand to a 300 mm wafer",
      "Printing patterns with light",
      "How engineers design billions of transistors without drawing them",
    ],
    scale: "300 mm wafer, 13.5 nm light",
  },
  {
    slug: "machine-code",
    part: "machine",
    title: "Machine Code",
    tagline: "How the code you write becomes patterns of bits.",
    learn: ["Compiler → assembly → machine code", "Write and run your own program", "How if and while become jumps"],
    scale: "1 line of code → bytes",
  },
  {
    slug: "functions",
    part: "machine",
    title: "Functions & the Stack",
    tagline: "How a program jumps away and always finds its way back.",
    learn: [
      "Why a jump can't come back on its own",
      "The stack: a pile of notes in RAM",
      "Recursion, stack overflow, and how interrupts return",
    ],
    scale: "1 return address = 1 byte",
  },
  {
    slug: "storage",
    part: "system",
    title: "Storage",
    tagline: "Cache, RAM, SSD and hard drives, and why speed costs size.",
    learn: [
      "The memory hierarchy, in human time",
      "How SSDs trap electrons for years",
      "Why a hard drive is a spinning record player",
    ],
    scale: "bytes → terabytes",
  },
  {
    slug: "bits-meaning",
    part: "system",
    title: "Who Decides What Bits Mean?",
    tagline: "01000001 is 65, “A”, a colour or an instruction. Who chooses?",
    learn: [
      "Why a byte has no meaning on its own",
      "The same byte as a number, a letter, a colour and an instruction",
      "How an “A” gets from your key to the glass, and why the monitor never knows it was an “A”",
    ],
    scale: "1 byte, many meanings",
  },
  {
    slug: "input-output",
    part: "system",
    title: "Input, Output & the Monitor",
    tagline: "How the CPU talks to keyboards, screens and speakers using only addresses.",
    learn: [
      "Devices are just addresses: memory-mapped I/O",
      "How the monitor knows where each colour goes",
      "How touch, mouse and sound become numbers, and back",
    ],
    scale: "148.5 million pixels per second",
  },
  {
    slug: "operating-system",
    part: "system",
    title: "The Operating System",
    tagline: "The program that runs all the other programs.",
    learn: [
      "From power button to desktop (booting)",
      "How many apps share one CPU and one RAM",
      "Why apps can't touch the hardware: kernel mode and system calls",
    ],
    scale: "250 app switches per second",
  },
  {
    slug: "calculator",
    part: "scenes",
    title: "Scene: Pressing 2 + 3",
    tagline: "One calculation, from your fingertip to glowing pixels.",
    learn: ["Keyboard matrix and scan codes", "Characters ↔ numbers", "From result to lit-up pixels"],
    scale: "every layer at once",
  },
  {
    slug: "graphics",
    part: "scenes",
    title: "Graphics",
    tagline: "Painting a screen with nothing but numbers.",
    learn: [
      "Pixels, RGB and the framebuffer",
      "How a triangle becomes pixels",
      "3D → 2D and why GPUs have thousands of cores",
    ],
    scale: "2 million pixels, 60× a second",
  },
  {
    slug: "video",
    part: "scenes",
    title: "Scene: Watching a Video",
    tagline: "Why one hour of video isn't 672 gigabytes.",
    learn: ["Frames, and the raw-size math", "Compression: colour, patterns (DCT), motion", "From download to screen"],
    scale: "~300× compression",
  },
  {
    slug: "network",
    part: "scenes",
    title: "Scene: Sending a Message",
    tagline: "How a message crosses the planet and only your friend can read it.",
    learn: ["Text → bytes → packets", "Bits as voltage, light and radio", "Routing, lost packets and encryption math"],
    scale: "10,000 km in ~0.1 s",
  },
];

export function chapterIndex(slug: string) {
  return chapters.findIndex((c) => c.slug === slug);
}

export function partOf(chapter: Chapter) {
  return parts.find((p) => p.id === chapter.part)!;
}

/** Each part's accent colour, as a CSS value. */
export const partVar: Record<PartId, string> = {
  switch: "var(--color-on)",
  machine: "var(--color-cyan)",
  system: "var(--color-violet)",
  scenes: "var(--color-amber)",
};

export const roman = ["I", "II", "III", "IV", "V", "VI"];
