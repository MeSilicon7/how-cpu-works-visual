import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { FramebufferPaint, GpuRace, PixelZoom, Projection3D, RgbMixer, TriangleRaster } from "~/widgets/graphics";

export const meta = () => chapterMeta("graphics");

export default function Graphics() {
  return (
    <>
      <p>
        A photo, a game, this very page: everything you see on a screen is made of the same thing. It's a rectangle of
        tiny dots called <strong>pixels</strong> (picture elements), and each one is just three numbers. Graphics is the
        art of computing those numbers, millions of them, dozens of times per second.
      </p>

      <h2>Pixels</h2>
      <PixelZoom />
      <p>
        A Full HD screen is 1920 pixels wide and 1080 tall: <TeX>{"1920 \\times 1080 = 2{,}073{,}600"}</TeX> pixels. A
        4K screen has four times as many, about 8.3 million. Your eyes blur them together into smooth shapes because
        each one is smaller than you can resolve from normal viewing distance.
      </p>

      <h2>Colour is three numbers</h2>
      <p>
        Your eyes have three kinds of colour sensors (cone cells), most sensitive to red, green and blue. So a screen
        only needs three lights per pixel to fool them into seeing any colour. Each light's brightness is stored as one
        byte, 0 to 255:
      </p>
      <RgbMixer />
      <TeX
        block
      >{tex`256 \times 256 \times 256 = 2^{8} \times 2^{8} \times 2^{8} = 2^{24} = 16{,}777{,}216 \text{ colours}`}</TeX>
      <Callout kind="idea">
        <p>
          The hex colour codes in web design are exactly these bytes. <code>#FF8800</code> is <code>FF</code> = 255 red,{" "}
          <code>88</code> = 136 green, <code>00</code> = 0 blue: orange. The binary chapter's hexadecimal shorthand at
          work.
        </p>
      </Callout>

      <h2>The framebuffer: the screen lives in memory</h2>
      <p>
        Somewhere in memory there's a block of bytes holding the colour of every pixel, row by row. It's called the{" "}
        <strong>framebuffer</strong>. To change what's on screen, a program just writes different numbers into it. The
        display hardware does the rest, copying it to the panel over and over.
      </p>
      <FramebufferPaint />
      <Callout kind="math" title="How big is a framebuffer?">
        <TeX
          block
        >{tex`1920 \times 1080 \text{ pixels} \times 4 \tfrac{\text{bytes}}{\text{pixel}} = 8{,}294{,}400 \text{ bytes} \approx 8.3\text{ MB}`}</TeX>
        <p>Refreshing it 60 times per second means reading</p>
        <TeX block>{tex`8.3\text{ MB} \times 60 \approx 500\ \text{MB every second}`}</TeX>
        <p>
          just to keep the picture on screen, even if nothing changes. (4 bytes per pixel rather than 3, because
          computers like sizes that are powers of 2. The spare byte is often used for transparency.)
        </p>
      </Callout>

      <h2>Drawing shapes: rasterisation</h2>
      <p>
        Games and apps don't store pictures of everything. They describe shapes with a few numbers and let the computer
        work out which pixels to colour. That's called <strong>rasterisation</strong>. And the favourite shape is the{" "}
        <strong>triangle</strong>: three points are always flat, and every 3D model, from a character's face to a whole
        city, is a mesh of thousands or millions of triangles.
      </p>
      <TriangleRaster />
      <Callout kind="math" title="The edge test, in plain words">
        <p>
          For an edge from A to B, the formula <TeX>{"E_{AB}(P)"}</TeX> is positive if point P is on one side of the
          line and negative on the other (it's a 2D “cross product”). A pixel is inside the triangle when it's on the
          inner side of all three edges, so all three values have the same sign.
        </p>
        <p>
          Bonus: divide each edge value by the triangle's total, and you get three weights that add up to 1. They say
          how close the pixel is to each corner, which is perfect for blending colours, as with the{" "}
          <em>Blend corner colours</em> switch. GPUs use the same weights to stretch photos (textures) across triangles.
        </p>
        <TeX
          block
        >{tex`\text{colour}(P) = w_A \cdot \text{colour}_A + w_B \cdot \text{colour}_B + w_C \cdot \text{colour}_C, \qquad w_A + w_B + w_C = 1`}</TeX>
      </Callout>

      <h2>From 3D to a flat screen</h2>
      <p>
        A 3D world is stored as points with three coordinates (x, y, z). The screen is flat. The trick artists
        discovered in the Renaissance: objects look smaller in proportion to how far away they are. Twice as far → half
        the size. In maths, divide by the depth:
      </p>
      <TeX block>{tex`x_{\text{screen}} = \frac{f \cdot x}{z}, \qquad y_{\text{screen}} = \frac{f \cdot y}{z}`}</TeX>
      <p>
        where <TeX>{"f"}</TeX> is a zoom factor (like a camera lens). Before projecting, each point is turned with a bit
        of trigonometry (<TeX>{"x' = x\\cos\\theta + z\\sin\\theta"}</TeX>, and so on) to rotate the object or move the
        camera.
      </p>
      <Projection3D />

      <h2>Why GPUs exist</h2>
      <p>
        Here's the problem. For every frame, every pixel needs its own calculation (is it inside a triangle, what
        colour, how is it lit?), and a CPU has only a handful of cores. But each pixel's maths doesn't depend on its
        neighbours, so you could do them all <em>at the same time</em>. A <strong>GPU</strong> (graphics processing
        unit) is built for exactly that: thousands of small, simple cores, all running the same little program (a{" "}
        <strong>shader</strong>) on different pixels.
      </p>
      <GpuRace />
      <DataTable
        align="left"
        head={["", "CPU", "GPU"]}
        rows={[
          ["cores", "8–24 big, clever ones", "thousands of small, simple ones"],
          ["good at", "one task with lots of decisions (your app's logic)", "the same maths on millions of items"],
          ["throughput", "~1 trillion operations/s", "~50–100 trillion operations/s"],
        ]}
      />
      <p>
        That “same maths on millions of numbers” pattern turned out to be useful far beyond games. Training and running
        AI models is mostly multiplying huge grids of numbers, which is why AI runs on GPUs.
      </p>

      <h2>The graphics pipeline, all together</h2>
      <ol>
        <li>
          <strong>Vertices</strong>: the app sends the corners of all the triangles (x, y, z).
        </li>
        <li>
          <strong>Transform</strong>: the GPU rotates them and divides by depth (3D → 2D).
        </li>
        <li>
          <strong>Rasterise</strong>: for each triangle, find the pixels inside it (edge tests).
        </li>
        <li>
          <strong>Shade</strong>: run a small program per pixel to choose its colour (blending, textures, lighting).
        </li>
        <li>
          <strong>Write</strong> the colours into the framebuffer.
        </li>
        <li>
          <strong>Display</strong>: the screen controller sends the framebuffer to the panel, 60–240 times a second.
        </li>
      </ol>

      <GoDeeper title="Double buffering: why games don't flicker">
        <p>
          If a program drew straight into the framebuffer while the screen was reading it, you'd see half-finished
          frames. So GPUs keep <strong>two</strong> framebuffers. The screen shows the <em>front</em> one while the GPU
          draws the next frame into the <em>back</em> one. When it's done, they swap, ideally exactly between two screen
          refreshes (“v-sync”). If the swap happens mid-refresh, the top half of the screen shows the old frame and the
          bottom half the new one: a visible <em>tear</em>.
        </p>
      </GoDeeper>

      <GoDeeper title="How does a pixel actually make light?">
        <ul>
          <li>
            <strong>LCD</strong>: a white backlight shines through liquid crystals. A voltage twists each crystal, which
            changes how much light passes through a polarising filter, then through a red, green or blue colour filter.
          </li>
          <li>
            <strong>OLED</strong>: each subpixel is a tiny light-emitting diode made of organic material. More current →
            brighter. Black pixels are simply off, which is why OLED blacks are perfect.
          </li>
        </ul>
        <p>
          Either way, a transistor sits behind every single subpixel, controlling it. A 4K screen has{" "}
          <TeX>{"3840 \\times 2160 \\times 3 \\approx 25"}</TeX> million of them, spread across the glass.
        </p>
      </GoDeeper>

      <KeyIdeas
        items={[
          <>A screen is a grid of pixels; each pixel is 3 numbers (red, green, blue), 0–255 each.</>,
          <>The framebuffer is ordinary memory holding every pixel's colour; the display copies it 60× a second.</>,
          <>Shapes are drawn by testing each pixel against triangle edges (rasterisation).</>,
          <>3D → 2D is “divide by distance”. Far things shrink.</>,
          <>
            GPUs use thousands of simple cores because every pixel's maths is independent. Next: how{" "}
            <Link to="/video">video</Link> squeezes all these pixels down.
          </>,
        ]}
      />
    </>
  );
}
