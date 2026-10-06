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
    term: "Register",
    def: "A small group of flip-flops inside the CPU that holds one value, such as 8 or 64 bits. Registers are the fastest memory a computer has.",
    slug: "memory",
  },
  {
    term: "Transistor",
    def: "A switch with no moving parts, turned on and off by a voltage on its gate. Every part of a computer is built from them.",
    slug: "transistor",
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
