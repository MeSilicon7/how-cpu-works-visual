import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, KeyIdeas, Steps } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { DramLeak, FileBlocks, FlashCell, HammingVenn, HddPlatter, HierarchyChart } from "~/widgets/storage";

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

      <h2>When a bit flips</h2>
      <p>
        Every way of storing a bit in this chapter uses something tiny: a few tens of thousands of electrons in a DRAM
        capacitor, a few hundred on a flash cell's floating gate, a magnetised spot a few nanometres wide. Tiny things
        can be disturbed.
      </p>
      <p>
        Particles from space (<strong>cosmic rays</strong>) hit the air all the time and send showers
        of smaller particles down to the ground. When one of them passes through a memory chip, it can leave a trail of
        loose charge, enough to fill or empty one tiny capacitor. A worn flash cell can leak. Electrical noise can make a
        weak signal read wrong. When a stored 0 turns into a 1, or a 1 into a 0, we call it a <strong>bit flip</strong>.
      </p>
      <Callout kind="fact" title="One flipped bit, 4,096 votes">
        <p>
          In a 2003 election in Belgium, a voting computer gave one candidate exactly <strong>4,096</strong> extra
          votes. 4,096 = <TeX>{"2^{12}"}</TeX>: exactly what a number gains when its bit 12 (counting from 0) flips from
          0 to 1. Nobody found a fault in the program, and the most likely cause was a cosmic ray. A large study of
          Google's servers (2009) found that about a third of the machines had at least one memory error per year.
        </p>
      </Callout>

      <h3>Parity: one extra bit to notice</h3>
      <p>
        The simplest guard is one extra bit, called a <strong>parity bit</strong>. Before storing a byte, the chip
        counts its 1s. If the count is odd, the parity bit is 1; if it's even, the parity bit is 0. Now the 9 bits
        together always hold an <em>even</em> number of 1s. When the byte is read back, the chip counts again. An odd
        count means something flipped.
      </p>
      <Callout kind="math" title="Parity for the letter A">
        <p>
          “A” is <code>0100 0001</code>: two 1s, an even count, so the parity bit is 0. The chip stores 9 bits:{" "}
          <code>0100 0001</code> + <code>0</code>.
        </p>
        <p>
          A cosmic ray flips bit 1 (counting from 0, from the right). The byte now reads <code>0100 0011</code>: three
          1s, plus the parity bit 0, is an odd count. <strong>Error detected!</strong>
        </p>
        <p>
          But <em>which</em> bit flipped? Any of the 9 could be guilty; parity only says “something is wrong”. And if
          two bits flip, the count is even again and the error slips through unseen.
        </p>
        <p>
          In hardware, the counting is just XOR gates from <Link to="/logic-gates">Logic Gates</Link>: XOR outputs 1
          when its inputs differ, so a chain of 7 XOR gates over 8 bits outputs 1 exactly when the number of 1s is odd.
        </p>
      </Callout>

      <h3>Hamming codes: checks that overlap</h3>
      <p>
        In 1950 Richard Hamming was tired of his weekend calculations being thrown away every time the computer noticed
        an error. He asked: if a machine can tell that something is wrong, why can't it tell <em>where</em>? His answer
        was to use several parity checks, each watching a different group of bits, arranged so that every bit is
        watched by a different set of checks. Then the pattern of failing checks names the guilty bit.
      </p>
      <p>
        The smallest version, <strong>Hamming(7,4)</strong>, stores 4 data bits with 3 check bits: 7 bits in total.
        Number the positions 1 to 7. The check bits sit at positions 1, 2 and 4. Write each position as a sum of 1, 2
        and 4, and that sum tells you which checks watch it:
      </p>
      <DataTable
        head={["position", "written as", "watched by checks", "holds"]}
        rows={[
          ["1", "1", "1", "check bit"],
          ["2", "2", "2", "check bit"],
          ["3", "1 + 2", "1, 2", "data"],
          ["4", "4", "4", "check bit"],
          ["5", "1 + 4", "1, 4", "data"],
          ["6", "2 + 4", "2, 4", "data"],
          ["7", "1 + 2 + 4", "1, 2, 4", "data"],
        ]}
      />
      <p>
        (That is just binary: 5 = 101₂ = 4 + 1.) Each check bit is chosen so that its group holds an even number of 1s.
        Now, if bit 5 flips, exactly checks 1 and 4 see an odd count. Add their numbers: 1 + 4 = 5. The failing checks
        spell out the position of the bad bit. Three yes/no checks give <TeX>{"2^3 = 8"}</TeX> possible answers:
        “no error”, or one of the 7 positions. That's why 3 check bits are enough to guard 7.
      </p>
      <HammingVenn />
      <Callout kind="math" title="Hamming(7,4) by hand: storing 1011">
        <Steps>
          {[
            <>Put the data bits 1, 0, 1, 1 into positions 3, 5, 6, 7.</>,
            <>
              Choose each check bit so its group holds an even number of 1s:
              <span className="mt-1 block">
                Check 1 watches 3, 5, 7: bits 1, 0, 1 = two 1s, already even → <strong>bit 1 = 0</strong>.
              </span>
              <span className="block">
                Check 2 watches 3, 6, 7: bits 1, 1, 1 = three 1s, needs one more → <strong>bit 2 = 1</strong>.
              </span>
              <span className="block">
                Check 4 watches 5, 6, 7: bits 0, 1, 1 = two 1s, already even → <strong>bit 4 = 0</strong>.
              </span>
            </>,
            <>
              The 7 stored bits (positions 1 to 7) are <code>0110011</code>.
            </>,
            <>
              A cosmic ray flips bit 5: the chip now reads <code>0110111</code>.
            </>,
            <>
              Count again, now including the check bit itself:
              <span className="mt-1 block">Check 1 (positions 1, 3, 5, 7): 0 + 1 + 1 + 1 = 3, odd ✗</span>
              <span className="block">Check 2 (positions 2, 3, 6, 7): 1 + 1 + 1 + 1 = 4, even ✓</span>
              <span className="block">Check 4 (positions 4, 5, 6, 7): 0 + 1 + 1 + 1 = 3, odd ✗</span>
            </>,
            <>
              Write the results as a binary number, check 4 first:
              <TeX block>{tex`\underbrace{1}_{\text{check 4}}\;\underbrace{0}_{\text{check 2}}\;\underbrace{1}_{\text{check 1}} = 101_2 = 4 + 1 = 5`}</TeX>
              Flip bit 5 back: <code>0110011</code>, and the data is 1011 again ✓.
            </>,
          ]}
        </Steps>
      </Callout>

      <h3>The same idea everywhere</h3>
      <p>
        Real hardware uses the same trick on bigger blocks. <strong>ECC memory</strong> (error-correcting code memory),
        used in servers, stores every 64 data bits with 8 check bits, 72 bits in total. Seven Hamming checks give{" "}
        <TeX>{"2^7 = 128"}</TeX> possible answers, more than enough to point at any one of the 72 positions. The eighth
        is an overall parity bit, like the 8-bit mode in the figure. The cost:
      </p>
      <TeX block>{tex`\frac{8 \text{ check bits}}{64 \text{ data bits}} = 0.125 = 12.5\% \text{ extra memory}`}</TeX>
      <p>
        For that, the memory controller fixes any single flipped bit and detects any two, on every read, in hardware.
        You never notice it happening.
      </p>
      <ul>
        <li>
          <strong>SSDs:</strong> TLC and QLC cells, with 8 or 16 charge levels, are misread quite often. So every page of
          flash carries extra check bits, using much stronger codes (called <strong>LDPC</strong>) that can fix many
          flipped bits per page. The SSD's controller does this on every read.
        </li>
        <li>
          <strong>Networks:</strong> every Ethernet and Wi-Fi frame ends with a 32-bit <strong>CRC</strong> (cyclic
          redundancy check). It doesn't fix errors, but it catches them very reliably, and the damaged frame is simply
          sent again (see <Link to="/network">Sending a Message</Link>).
        </li>
        <li>
          <strong>QR codes:</strong> at the highest error-correction level (H), a QR code can still be read with about
          30% of it damaged or covered. That's why a logo can sit in the middle of one.
        </li>
      </ul>
      <Callout kind="analogy">
        <p>
          Spelling your name on a bad phone line: “S as in Sam, A as in apple…”. The extra words carry no new
          information, but they let the listener fix a letter they misheard. Check bits are the computer's “as in”.
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

      <p>
        One puzzle is left: RAM is empty when you switch the computer on, so how does the operating system get from the
        SSD into RAM in the first place? That process is called <strong>booting</strong>, and it has its own section in{" "}
        <Link to="/operating-system">The Operating System</Link>.
      </p>

      <KeyIdeas
        items={[
          <>Fast memory is small and expensive; big storage is slow. Computers use a ladder of both.</>,
          <>Caches work because programs reuse recent data and nearby data (locality).</>,
          <>SRAM = latch (6 transistors). DRAM = leaky capacitor, refreshed every 64 ms.</>,
          <>
            Flash traps electrons on an insulated gate, so data survives power-off. Hard drives use magnetism and
            motion.
          </>,
          <>
            Bits can flip. A parity bit notices one flip; a Hamming code's overlapping checks point at the bad bit so it
            can be fixed (ECC RAM, SSDs and QR codes all do this).
          </>,
          <>A file is just a list of blocks, recorded in the file system's table.</>,
        ]}
      />
    </>
  );
}
