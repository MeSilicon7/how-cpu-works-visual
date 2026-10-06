import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { DramLeak, FileBlocks, FlashCell, HddPlatter, HierarchyChart } from "~/widgets/storage";

export const meta = () => chapterMeta("storage");

export default function Storage() {
  return (
    <>
      <p>
        Pull the plug and everything in RAM vanishes: every register, every cache, every byte of DRAM. Yet your photos
        are still there tomorrow. That's because computers have a whole <strong>ladder</strong> of places to keep data,
        each one bigger, cheaper, slower and more permanent than the one before.
      </p>

      <h2>Why not just one perfect memory?</h2>
      <p>
        Physics and money force a trade-off. Fast memory has to sit very close to the CPU and uses lots of transistors
        per bit, so there can't be much of it. Huge, cheap memory uses tricks like trapped electrons or magnetism, which
        are slow to read. No technology is fast, huge, cheap and permanent all at once, so computers use <em>all</em> of
        them:
      </p>
      <HierarchyChart />
      <Callout kind="math" title="The human-scale trick">
        <p>
          The “if 1 tick = 1 second” view multiplies every time by the same factor. A tick at 3.3 GHz is about 0.3 ns,
          so the factor is
        </p>
        <TeX block>{tex`\frac{1\text{ s}}{0.3\times10^{-9}\text{ s}} \approx 3.3 \times 10^{9}`}</TeX>
        <p>
          RAM: <TeX>{"80\\text{ ns} \\times 3.3\\times10^9 \\approx 264\\text{ s}"}</TeX> ≈ 4½ minutes. Hard drive:{" "}
          <TeX>{"8\\text{ ms} \\times 3.3\\times10^9 \\approx 2.7\\times10^7\\text{ s}"}</TeX> ≈ 10 months. To the CPU,
          waiting for a hard drive is like waiting most of a year for a letter.
        </p>
      </Callout>

      <h2>Caches: keep the useful stuff close</h2>
      <p>
        If RAM takes 250 ticks, how does a CPU ever get anything done? <strong>Caches</strong>. Each core keeps small,
        fast copies of recently used memory. When the CPU asks for an address, it checks L1 first, then L2, then L3, and
        only goes to RAM if all of them miss. This works because programs are predictable:
      </p>
      <ul>
        <li>
          <strong>Time:</strong> if you used something just now, you'll probably use it again soon (a loop counter, the
          current pixel row).
        </li>
        <li>
          <strong>Space:</strong> if you used address 1000, you'll probably want 1001 next (the next letter, the next
          pixel). So caches fetch 64 bytes at a time.
        </li>
      </ul>
      <Callout kind="math" title="Why a 95% hit rate is a huge deal">
        <p>Average time per memory access = (chance of hit × hit time) + (chance of miss × miss time):</p>
        <TeX block>{tex`0.95 \times 1\text{ ns} + 0.05 \times 80\text{ ns} = 0.95 + 4 = 4.95\text{ ns}`}</TeX>
        <p>
          That's 16× faster than going to RAM every time (80 ns), with a cache holding less than 0.001% of the data.
          Real CPUs hit L1 more than 95% of the time.
        </p>
      </Callout>
      <Callout kind="analogy">
        <p>
          Registers are what's in your hands. L1 is your desk. L2 is the drawer. L3 is the bookshelf. RAM is the library
          down the street. The SSD is the warehouse across town. The internet is a library on another continent. You
          keep what you're working on as close as possible.
        </p>
      </Callout>

      <h2>How each level physically holds a bit</h2>
      <h3>Caches: SRAM</h3>
      <p>
        Exactly the latch from the <Link to="/memory">memory chapter</Link>: two inverters looping into each other plus
        two access transistors, 6 transistors per bit. It's fast and needs no refreshing, but it's big, so a CPU fits
        only tens of megabytes.
      </p>

      <h3>Main memory: DRAM</h3>
      <p>
        One transistor and one microscopic capacitor per bit, holding a few tens of thousands of electrons. Tiny, so a
        stick of RAM holds billions of them. But capacitors leak:
      </p>
      <DramLeak />

      <h3>SSDs and USB sticks: flash memory</h3>
      <p>
        To keep data with the power off, we need something that stays put on its own. Flash memory adds a second,
        completely insulated gate to a transistor. A strong voltage (around 20 V) pushes electrons through the thin
        insulation by <strong>quantum tunnelling</strong>. Once there, they're trapped, surrounded by glass, for 10
        years or more.
      </p>
      <FlashCell />
      <p>
        Trapped electrons push back against the control gate, so the transistor needs a higher voltage to turn on.
        Reading a cell means asking “does it conduct at this voltage?”. Store 8 different amounts of charge and one cell
        holds 3 bits; 16 amounts (QLC) holds 4 bits. More levels make the drive cheaper per gigabyte but slower and less
        durable.
      </p>
      <Callout kind="warn" title="Flash wears out">
        <p>
          Every program/erase cycle slightly damages the insulation. A TLC cell survives roughly{" "}
          <strong>1,000–3,000</strong> cycles. The SSD's own little processor (its <em>controller</em>) spreads writes
          evenly across all cells (<em>wear levelling</em>) and keeps spare cells in reserve. In practice a modern SSD
          outlives the computer it's in.
        </p>
      </Callout>

      <h3>Hard drives: magnetism on a spinning platter</h3>
      <p>
        A hard drive stores bits as tiny magnetised regions on a metal-coated disk spinning at thousands of RPM. A read
        head floating a few nanometres above the surface senses which way each region points. It's cheap per terabyte,
        but every read needs physical movement:
      </p>
      <HddPlatter />
      <Callout kind="math" title="Rotational latency at 7,200 RPM">
        <TeX
          block
        >{tex`\frac{7200 \text{ turns}}{60 \text{ s}} = 120 \tfrac{\text{turns}}{\text{s}} \;\Rightarrow\; \frac{1}{120} \text{ s} = 8.33\text{ ms per turn}`}</TeX>
        <p>
          On average the sector you want is half a turn away: <TeX>{"4.17\\text{ ms}"}</TeX>. Add an average seek of
          about 4 ms and a random read costs ~8 ms. An SSD has no moving parts and answers in ~0.08 ms, about{" "}
          <strong>100× faster</strong>.
        </p>
      </Callout>

      <h2>Files: a table of contents for blocks</h2>
      <p>
        A drive doesn't know what a “photo” is. It only stores numbered blocks (typically 4,096 bytes each). The{" "}
        <strong>file system</strong> (NTFS on Windows, APFS on Macs, ext4 on Linux) is a set of tables, also stored on
        the drive, that maps names like <code>holiday.jpg</code> to lists of block numbers.
      </p>
      <FileBlocks />

      <h2>A gigabyte isn't always a gigabyte</h2>
      <p>
        Drive makers count in powers of 10 (1 GB = 10⁹ bytes). Operating systems often count in powers of 2 (1 GiB = 2³⁰
        = 1,073,741,824 bytes). That's why a brand-new “1 TB” drive shows up smaller:
      </p>
      <TeX
        block
      >{tex`\frac{10^{12}\text{ bytes}}{2^{30}\ \tfrac{\text{bytes}}{\text{GiB}}} = \frac{1{,}000{,}000{,}000{,}000}{1{,}073{,}741{,}824} \approx 931\text{ GiB}`}</TeX>
      <p>Nothing is missing. It's the same number of bytes, counted with a different ruler.</p>

      <h2>Putting it together: opening a photo</h2>
      <DataTable
        align="left"
        head={["step", "what happens", "rough time"]}
        rows={[
          ["1", "You tap the photo. The OS looks up its block numbers in the file-system table.", "µs"],
          ["2", "The SSD controller reads the flash cells (trapped electrons → bits).", "~0.1 ms per block"],
          ["3", "The compressed bytes are copied into DRAM.", "~1 ms for 3 MB"],
          ["4", "The CPU decompresses them, pulling 64-byte chunks through L3 → L2 → L1 → registers.", "a few ms"],
          [
            "5",
            <>
              The finished pixels are written to the screen's memory, then drawn (see{" "}
              <Link to="/graphics">Graphics</Link>).
            </>,
            "next screen refresh",
          ],
        ]}
      />

      <GoDeeper title="What happens when you press the power button?">
        <p>
          RAM is empty at power-on, so where does the first instruction come from? The CPU is wired to start fetching
          from a fixed address that points into a small <strong>firmware</strong> chip (UEFI/BIOS) on the motherboard,
          which keeps its contents with the power off. The firmware tests the hardware, finds the SSD, and loads the
          first part of the operating system (the <em>bootloader</em>) into RAM. Then it jumps to it, a plain{" "}
          <code>JMP</code> just like in our CPU. The bootloader loads the rest of the OS, and a few seconds later you
          see your desktop. This chain is called <strong>booting</strong>, from “pulling yourself up by your
          bootstraps”.
        </p>
      </GoDeeper>

      <KeyIdeas
        items={[
          <>Fast memory is small and expensive; big storage is slow. Computers use a ladder of both.</>,
          <>Caches work because programs reuse recent data and nearby data (locality).</>,
          <>SRAM = latch (6 transistors). DRAM = leaky capacitor, refreshed every 64 ms.</>,
          <>
            Flash traps electrons on an insulated gate, so data survives power-off. Hard drives use magnetism and
            motion.
          </>,
          <>A file is just a list of blocks, recorded in the file system's table.</>,
        ]}
      />
    </>
  );
}
