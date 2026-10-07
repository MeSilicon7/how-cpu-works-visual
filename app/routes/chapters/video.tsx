import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { ChromaDemo, DctExplorer, Flipbook, MotionDemo, RawSizeCalc, Wave1D } from "~/widgets/video";

export const meta = () => chapterMeta("video");

export default function Video() {
  return (
    <>
      <p>
        You tap play and a video starts almost instantly, in HD, over Wi-Fi, without stuttering. That should be
        impossible. As we're about to calculate, an hour of raw HD video is <strong>hundreds of gigabytes</strong>. The
        reason it works is some of the most beautiful maths in computing: <strong>compression</strong>.
      </p>

      <h2>A video is a flipbook</h2>
      <Flipbook />
      <p>
        Each frame is an ordinary picture, a framebuffer full of pixels (see <Link to="/graphics">Graphics</Link>).
        Above roughly 20 frames per second, your brain stops seeing separate pictures and sees smooth motion.
      </p>

      <h2>The problem: raw video is enormous</h2>
      <Callout kind="math" title="One hour of 1080p at 30 fps, uncompressed">
        <TeX
          block
        >{tex`\underbrace{1920 \times 1080}_{2{,}073{,}600 \text{ pixels}} \times \underbrace{3}_{\text{bytes}} = 6{,}220{,}800 \text{ bytes per frame} \approx 6.2\text{ MB}`}</TeX>
        <TeX
          block
        >{tex`6{,}220{,}800 \times 30\ \tfrac{\text{frames}}{\text{s}} \times 3600\ \text{s} = 671{,}846{,}400{,}000 \text{ bytes} \approx 672\text{ GB}`}</TeX>
        <p>
          To stream that live you'd need <TeX>{"6.2\\text{ MB} \\times 30 \\times 8 \\approx 1.5"}</TeX> gigabits per
          second, faster than almost any home internet. Yet a typical HD stream uses about 5 megabits per second: 300
          times less.
        </p>
      </Callout>
      <RawSizeCalc />
      <p>
        Compression isn't one trick. It's several, stacked on top of each other, each exploiting something about real
        pictures or human eyes. Let's do them one at a time, on real pixels.
      </p>

      <h2>Trick 1: your eyes care more about brightness than colour</h2>
      <p>
        Your visual system is wired to pick out fine detail in <em>light and dark</em> far better than fine detail in{" "}
        <em>colour</em>. Edges and textures come mostly from brightness. So video first converts each pixel from RGB
        into one brightness value and two colour values:
      </p>
      <TeX block>{tex`Y = 0.299R + 0.587G + 0.114B`}</TeX>
      <TeX block>{tex`C_b = 128 + 0.5B - 0.169R - 0.331G \qquad C_r = 128 + 0.5R - 0.419G - 0.081B`}</TeX>
      <p>
        (The weights in <TeX>{"Y"}</TeX> show that our eyes are most sensitive to green and least to blue.) Then it
        keeps brightness at full resolution but stores colour only once per 2 × 2 block of pixels:
      </p>
      <ChromaDemo />
      <Callout kind="math" title="Saving: 50%, almost invisibly">
        <TeX
          block
        >{tex`\underbrace{1}_{Y} + \underbrace{\tfrac{1}{4} + \tfrac{1}{4}}_{C_b,\ C_r \text{ shared by 4 pixels}} = 1.5 \text{ bytes per pixel, instead of } 3`}</TeX>
      </Callout>

      <h2>Trick 2: describe patterns, not pixels</h2>
      <p>
        Neighbouring pixels are usually similar: a blue sky is blue, then a bit less blue, then a bit less. Writing
        every pixel down wastes space. The <strong>Discrete Cosine Transform (DCT)</strong> rewrites a group of pixels
        as a <em>recipe</em>: how much of a flat average, how much of a slow wave, how much of a faster wave… Start with
        one row of 8 pixels:
      </p>
      <Wave1D />
      <p>
        Video codecs do the same in 2D on 8 × 8 blocks: 64 pixels become 64 amounts of 64 wave patterns (horizontal
        waves, vertical waves and checkerboards). Then comes the step that actually throws data away:{" "}
        <strong>quantisation</strong>. Each amount is divided by a number from a table and rounded. Small numbers in the
        table (top-left, smooth patterns) keep detail; big numbers (bottom-right, fine wiggles your eye barely notices)
        crush most values to zero.
      </p>
      <DctExplorer />
      <Callout kind="math" title="Quantisation by hand">
        <p>Say a wave amount is 37 and the table says 16:</p>
        <TeX
          block
        >{tex`37 \div 16 = 2.31 \to \text{round} \to 2 \qquad\text{decode: } 2 \times 16 = 32 \quad (\text{error } 5)`}</TeX>
        <p>A fine-detail amount of 9 with a table value of 99:</p>
        <TeX block>{tex`9 \div 99 = 0.09 \to 0 \qquad\text{decode: } 0 \quad (\text{gone, but you can't see it})`}</TeX>
        <p>
          Zeros are nearly free to store. Reading the block in <strong>zig-zag</strong> order (smooth patterns first)
          bunches the zeros at the end, so “and the remaining 50 are zero” costs a few bits. Turn the quality slider
          down to see the famous blocky look of over-compressed video.
        </p>
      </Callout>

      <h2>Trick 3: only send what changed</h2>
      <p>
        In most videos, consecutive frames are nearly identical: the background stays still and only a few things move.
        So instead of compressing every frame from scratch, the encoder describes the next frame in terms of the
        previous one:
      </p>
      <MotionDemo />
      <ul>
        <li>
          <strong>I-frames</strong> (keyframes) are compressed on their own, like a JPEG. One every couple of seconds,
          so you can jump around in the video.
        </li>
        <li>
          <strong>P-frames</strong> say “copy these blocks from the last frame, move those ones by this arrow, and add
          this small correction”.
        </li>
        <li>
          <strong>B-frames</strong> can even borrow from a <em>future</em> frame (the encoder reorders frames to make
          this possible).
        </li>
      </ul>

      <h2>Trick 4: short codes for common things</h2>
      <p>
        Finally, the leftover numbers are packed with <strong>entropy coding</strong>: values that appear often get
        short bit patterns, rare ones get long ones. It's the same idea as Morse code, where the most common letter, E,
        is a single dot. (The “≈ bits” estimate in the explorer above assumes this step.)
      </p>
      <GoDeeper title="Huffman codes, and how the decoder knows where a code ends">
        <p>
          The classic way to give common values short codes is <strong>Huffman coding</strong>, invented in 1952 by
          David Huffman, then a student. Try it on the word ABRACADABRA: 11 letters, but only 5 different ones, and A
          appears 5 times.
        </p>
        <DataTable
          head={["letter", "count", "fixed 3-bit code", "Huffman code"]}
          rows={[
            ["A", "5", "000", "0"],
            ["B", "2", "001", "110"],
            ["R", "2", "010", "111"],
            ["C", "1", "011", "100"],
            ["D", "1", "100", "101"],
          ]}
        />
        <p>
          (A fixed code needs 3 bits per letter, because 2 bits give only 4 patterns and we have 5 letters.) Count the
          bits for the whole word (count × code length, for A, B, R, C and D):
        </p>
        <TeX block>{tex`\begin{aligned} \text{Huffman: }& 5 \times 1 + 2 \times 3 + 2 \times 3 \\ & + 1 \times 3 + 1 \times 3 = 23 \text{ bits} \end{aligned}`}</TeX>
        <TeX block>{tex`\text{fixed: } 11 \times 3 = 33 \text{ bits}`}</TeX>
        <TeX block>{tex`\text{ASCII: } 11 \times 8 = 88 \text{ bits}`}</TeX>
        <p>
          <strong>How the codes are chosen.</strong> Huffman's recipe: keep joining the two rarest items into one group.
          C (1) + D (1) make a group of 2. B (2) + R (2) make 4. Those two groups make 6. Finally 6 + A (5) = 11. Now
          undo the joins from the last one: at each split, one side gets a 0 and the other a 1. A was joined last, so it
          gets the shortest code, a single 0; everything else starts with 1. Rare letters were joined early, so they end
          up with longer codes.
        </p>
        <p>
          <strong>How the decoder knows where a code ends.</strong> Here is the word encoded:
        </p>
        <div className="not-prose flex flex-wrap gap-x-2.5 gap-y-1 font-mono text-[0.9em]">
          {"ABRACADABRA".split("").map((ch, i) => (
            <span key={i} className="flex flex-col items-center">
              <span className="font-sans text-dim">{ch}</span>
              <span className="text-ink">{({ A: "0", B: "110", R: "111", C: "100", D: "101" } as Record<string, string>)[ch]}</span>
            </span>
          ))}
        </div>
        <p>
          Stored, it is just <code>01101110100010101101110</code>: 23 bits in a row.
        </p>
        <p>
          The real data has no spaces. The trick is that no code is the beginning of another code (the codes are{" "}
          <strong>prefix-free</strong>). The decoder reads one bit at a time: “0” is a complete code, so that's an A.
          “1” is not a code yet, “11” is not a code yet, “110” is B. And so on. It never needs a separator. Morse code is
          different: E is · and A is ·−, so ·− could mean “A” or “E then T” (T is −). That's why Morse needs a pause
          between letters.
        </p>
        <p>
          <strong>Could any code do better?</strong> Claude Shannon showed in 1948 that a value that appears with
          chance <TeX>{"p"}</TeX> needs about <TeX>{"\\log_2(1/p)"}</TeX> bits on average, and no code can beat that.
          For A (5 of 11) that's <TeX>{"\\log_2(11/5) \\approx 1.14"}</TeX> bits; for C (1 of 11) it's{" "}
          <TeX>{"\\log_2 11 \\approx 3.46"}</TeX> bits. Adding it up for the whole word gives about{" "}
          <strong>22.4 bits</strong>, so Huffman's 23 is very close to perfect.
        </p>
        <p>
          The decoder must use the same table as the encoder: video standards fix their tables in advance, and other
          formats send the table at the start. Modern codecs also use a cleverer cousin, <em>arithmetic coding</em>,
          which can spend less than one bit on a very common value. And the files on your computer use the same idea:
          ZIP and PNG first replace repeats with short notes like “go back 7 letters and copy 4” (the second ABRA), then
          Huffman-code what's left.
        </p>
      </GoDeeper>

      <h2>All the tricks together</h2>
      <DataTable
        align="left"
        head={["step", "what it exploits", "typical saving"]}
        rows={[
          ["Colour subsampling", "eyes see brightness detail better than colour detail", "2×"],
          ["DCT + quantisation", "pictures are mostly smooth; fine detail is hard to see", "10–20×"],
          ["Motion compensation", "frames repeat most of the previous frame", "5–10×"],
          ["Entropy coding", "some values are far more common than others", "1.5–2×"],
        ]}
      />
      <p>
        Multiply them: <TeX>{"2 \\times 15 \\times 7 \\times 1.5 \\approx 300"}</TeX>. That's how 672 GB becomes about 2
        GB. Real codecs (H.264, H.265, AV1) add dozens of refinements: variable block sizes, predicting blocks from
        their neighbours, smoothing filters across block edges. But these four ideas are the core.
      </p>

      <h2>From the server to your eyes</h2>
      <ol>
        <li>
          The video was compressed once, in advance, at several qualities, and cut into chunks a few seconds long.
        </li>
        <li>
          Your player downloads chunks over the internet (next chapter: <Link to="/network">how the bytes travel</Link>
          ). If your connection slows down, it switches to a lower-quality version of the next chunk. This is “adaptive
          streaming”, and why video sometimes goes blurry for a moment.
        </li>
        <li>
          Chunks wait in a <strong>buffer</strong> in RAM, a few seconds ahead of what you're watching.
        </li>
        <li>
          A <strong>hardware decoder</strong> inside the GPU, a block of circuits built just for this, undoes every
          step: entropy decoding → multiply back by the quantisation table → inverse DCT → apply motion vectors →
          upscale colour → convert YCbCr back to RGB.
        </li>
        <li>The finished frame lands in the framebuffer, and the display shows it at the next refresh.</li>
      </ol>
      <Callout kind="fact">
        <p>
          Decoding 4K video means running about <TeX>{"3840 \\times 2160 \\times 60 \\approx 500"}</TeX> million pixels
          per second through all those steps. A general-purpose CPU would burn a lot of power doing it, but dedicated
          decoder circuits do it using about a watt. That's why your phone can play video for hours.
        </p>
      </Callout>

      <GoDeeper title="The 2D DCT formula, explained">
        <p>
          For an 8 × 8 block of pixel values <TeX>{"f(x, y)"}</TeX> (with 128 subtracted so they're centred on 0):
        </p>
        <TeX
          block
        >{tex`F(u,v) = \tfrac{1}{4}\, C(u)\, C(v) \sum_{x=0}^{7} \sum_{y=0}^{7} f(x,y) \cos\!\left[\frac{(2x+1)u\pi}{16}\right] \cos\!\left[\frac{(2y+1)v\pi}{16}\right]`}</TeX>
        <p>
          where <TeX>{"C(0) = 1/\\sqrt{2}"}</TeX> and <TeX>{"C(k) = 1"}</TeX> otherwise. In words: for each pattern{" "}
          <TeX>{"(u, v)"}</TeX>, multiply every pixel by that pattern's value at the same spot and add everything up. If
          the block “looks like” the pattern, the sum is big; if not, the positives and negatives cancel. That's a
          measure of similarity. The inverse DCT is almost the same formula, adding the patterns back up weighted by{" "}
          <TeX>{"F(u, v)"}</TeX>. No information is lost until the rounding step.
        </p>
        <p>
          The <TeX>{"(2x+1)/16"}</TeX> part samples each cosine at the centres of 8 equal slots, and the{" "}
          <TeX>{"u"}</TeX> controls how many half-waves fit across the block (0 = flat, 7 = the fastest wiggle).
        </p>
      </GoDeeper>

      <GoDeeper title="And the sound?">
        <p>
          Sound is air pressure wiggling. A microphone turns it into a voltage, which is measured (sampled) 48,000 times
          per second with 16 bits each:
        </p>
        <TeX
          block
        >{tex`\begin{aligned} &48{,}000 \times 16 \text{ bits} \times 2 \text{ channels} \\ &= 1{,}536{,}000 \text{ bits/s} \approx 1.5\text{ Mbit/s} \end{aligned}`}</TeX>
        <p>
          Audio codecs like AAC use the same playbook: transform into frequencies, then drop what your ears can't hear
          (quiet sounds right next to loud ones in pitch are masked). Result: about 128 kbit/s, 12× smaller. Every audio
          and video chunk carries timestamps so the player keeps lips and voices in sync.
        </p>
        <p>
          How a microphone's voltage becomes those 48,000 numbers a second, and how numbers move a speaker again, is
          explained in <Link to="/input-output">Input, Output & the Monitor</Link>.
        </p>
      </GoDeeper>

      <KeyIdeas
        items={[
          <>A video is a sequence of frames: raw 1080p is ~6 MB per frame and ~672 GB per hour.</>,
          <>Brightness at full resolution, colour at quarter resolution: 2× smaller, nearly invisible.</>,
          <>The DCT turns 8×8 pixels into wave amounts; quantisation rounds the fine ones to zero.</>,
          <>Motion vectors reuse the previous frame, so only changes are sent.</>,
          <>Together: ~300× smaller. A hardware decoder in the GPU undoes it all in real time.</>,
        ]}
      />
    </>
  );
}
