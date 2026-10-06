import { Link } from "react-router";

import { tex, TeX } from "~/components/tex";
import { Callout, DataTable, GoDeeper, KeyIdeas } from "~/components/ui";
import { chapterMeta } from "~/lib/meta";
import { TextToBytes } from "~/widgets/binary";
import {
  InternetJourney,
  IpBits,
  LatencyCalc,
  MESSAGE,
  Packetizer,
  SecretHandshake,
  SignalMedia,
} from "~/widgets/network";

export const meta = () => chapterMeta("network");

export default function Network() {
  return (
    <>
      <p>
        You type <code>{MESSAGE}</code> and tap send. A fraction of a second later, Sam's phone buzzes, maybe on the
        other side of the planet. Nobody else can read it, even though it passed through dozens of machines owned by
        strangers. Here's every step of that trip, using everything from the previous chapters.
      </p>

      <h2>1. Text becomes bytes</h2>
      <p>
        As we saw in <Link to="/binary">Binary</Link>, every character has a number, and UTF-8 turns those numbers into
        bytes. Notice the wave emoji alone takes 4 bytes:
      </p>
      <TextToBytes initial={MESSAGE} />

      <h2>2. Lock it so only Sam can read it</h2>
      <p>
        Your message will pass through Wi-Fi routers, phone companies and servers. Any of them could copy it. So modern
        chat apps use <strong>end-to-end encryption</strong>: the bytes are scrambled on your phone and only unscrambled
        on Sam's. The clever part is that you and Sam need a shared secret key, but you have never met, and everything
        you send can be overheard. The solution is beautiful maths:
      </p>
      <SecretHandshake />
      <Callout kind="math" title="Why can't the eavesdropper just work it out?">
        <p>
          Going forward is easy: <TeX>{"5^{6} \\bmod 23"}</TeX> takes a few multiplications. Going backwards (“which
          power of 5 gives 8?”) has no known shortcut; you basically have to try them all. With a 23 that's instant.
          Real systems use numbers hundreds of digits long (or elliptic curves), where trying them all would take longer
          than the age of the universe.
        </p>
        <TeX
          block
        >{tex`\text{a 256-bit key: } 2^{256} \approx 1.2 \times 10^{77} \text{ possibilities} \qquad \text{at } 10^{12} \text{ guesses/s} \to \approx 10^{57} \text{ years}`}</TeX>
      </Callout>
      <p>
        The actual scrambling uses a cipher like AES: rounds of XOR, substitutions and shifts, exactly the bitwise
        operations from <Link to="/alu">the ALU chapter</Link>. Phone CPUs even have dedicated circuits for it.
      </p>

      <h2>3. Chop it into packets</h2>
      <p>
        The internet doesn't send whole messages. It sends small <strong>packets</strong>, each with its own address
        label, like postcards. If one gets lost, only that piece needs to be resent, and many people's packets can share
        the same cables by taking turns.
      </p>
      <Packetizer />
      <p>
        The addresses are <strong>IP addresses</strong>, which, like everything else, are just numbers:
      </p>
      <IpBits />
      <Callout kind="idea" title="Names → numbers: DNS">
        <p>
          Your app knows the server as a name like <code>chat.example.com</code>. Before sending, your phone asks a{" "}
          <strong>DNS</strong> server (the internet's phone book) for the matching IP address. That's an extra small
          round trip, which is why the answer gets remembered (cached) for a while.
        </p>
      </Callout>

      <h2>4. Bits become physical signals</h2>
      <p>
        Your phone's Wi-Fi chip takes each packet and turns its bits into a radio wave. At the router it might become
        voltages on a copper cable, then pulses of laser light in a fibre under the ocean. Same bits, many costumes:
      </p>
      <SignalMedia />
      <Callout kind="math" title="How long is a Wi-Fi wave?">
        <TeX
          block
        >{tex`\lambda = \frac{c}{f} = \frac{3 \times 10^8\ \text{m/s}}{2.4 \times 10^9\ \text{Hz}} = 0.125\ \text{m} = 12.5\ \text{cm}`}</TeX>
        <p>That's why Wi-Fi antennas are a few centimetres long, a fraction of the wavelength.</p>
      </Callout>

      <h2>5. Across the internet</h2>
      <p>
        The internet is a giant mesh of <strong>routers</strong>: computers with a CPU, memory and many network ports,
        whose whole job is to look at each packet's destination address and pass it one step closer. No router knows the
        full path. Each one just has a table saying “addresses starting with these bits → send out of that port”.
      </p>
      <InternetJourney />
      <p>
        Packets that take different routes arrive out of order, and a busy router may simply throw packets away. So the
        two ends run <strong>TCP</strong> (or a similar protocol): every packet has a sequence number, the receiver
        sends back “got it” (an acknowledgement), and the sender resends anything not acknowledged in time. The receiver
        puts everything back in order before handing it to the app.
      </p>
      <DataTable
        align="left"
        head={["layer", "job", "in our story"]}
        rows={[
          ["Application", "what the bytes mean", "the chat app, encryption, “hi Sam 👋”"],
          ["Transport (TCP)", "reliable, in-order delivery", "sequence numbers, acknowledgements, resending"],
          ["Internet (IP)", "addressing and routing", "IP addresses, routers forwarding hop by hop"],
          ["Link", "one hop over one medium", "Wi-Fi radio, Ethernet voltages, fibre light"],
        ]}
      />
      <GoDeeper title="How a router chooses: matching address bits">
        <p>
          A router's forwarding table holds <em>prefixes</em>: “any address whose first 16 bits are{" "}
          <code>10001110 11111010</code> (142.250.x.x) → port 3”. For each packet, the router finds the{" "}
          <strong>longest</strong> prefix that matches the destination's bits. That's a bit-by-bit comparison, the kind
          of thing XOR and AND gates do instantly. Big routers do this in special hardware hundreds of millions of times
          per second.
        </p>
        <TeX
          block
        >{tex`142.250.74.46 = \underbrace{10001110\;11111010}_{\text{matches } 142.250.0.0/16}\;01001010\;00101110`}</TeX>
        <p>
          Routers constantly tell their neighbours which addresses they can reach (using protocols like BGP), so when a
          cable breaks, traffic flows around it within seconds. That's the internet's original design goal: no single
          point of failure.
        </p>
      </GoDeeper>

      <h2>6. The server, and Sam's phone</h2>
      <p>
        Your packets actually go to the chat company's <strong>server</strong>: a computer in a data centre with many
        CPU cores, lots of RAM and SSDs (Part 2 and 3 of this site). It can't read your message (it's encrypted), but it
        stores it until Sam's phone is reachable. Sam's phone keeps a quiet connection open to the server, so the server
        can immediately push the message down that connection, and the phone buzzes.
      </p>
      <p>
        Then everything runs in reverse on Sam's phone: radio → bits → packets reassembled in order → decrypted with the
        shared secret → UTF-8 bytes → characters → glyphs from a font → pixels in the framebuffer → light from the
        screen, exactly like the end of <Link to="/calculator">the 2 + 3 scene</Link>.
      </p>

      <h2>How long did it take?</h2>
      <LatencyCalc />
      <Callout kind="fact">
        <p>
          Even at the speed of light, crossing 10,000 km takes 50 ms in fibre. Add the route's detours, a few dozen
          routers each taking microseconds, the server, and the radio links at both ends, and a message typically
          arrives in <strong>100–300 ms</strong>. That's about the time it takes you to blink.
        </p>
      </Callout>

      <h2>The whole journey, one more time</h2>
      <p>Everything you've learned shows up in this one tap on “send”:</p>
      <ol>
        <li>
          <Link to="/transistor">Transistors</Link>, billions of them, switch in your phone's chips.
        </li>
        <li>
          They form <Link to="/logic-gates">gates</Link>, which form <Link to="/adder">adders</Link> and an{" "}
          <Link to="/alu">ALU</Link> that compute the encryption.
        </li>
        <li>
          Your message is <Link to="/binary">bytes</Link> held in <Link to="/memory">memory</Link>, all moving in step
          with the <Link to="/clock">clock</Link>.
        </li>
        <li>
          The <Link to="/cpu">CPU</Link> runs the chat app's <Link to="/machine-code">machine code</Link>: fetch,
          decode, execute, billions of times per second.
        </li>
        <li>
          Chats and photos are saved in flash <Link to="/storage">storage</Link> on both phones and the server.
        </li>
        <li>
          The network turns bits into radio and light, routers pass packets hop by hop, TCP puts them back in order.
        </li>
        <li>
          Sam's phone decodes the text and the <Link to="/graphics">graphics</Link> chip turns it into pixels, the same
          way <Link to="/video">video</Link> frames reach the screen.
        </li>
      </ol>
      <Callout kind="idea" title="No magic: just switches, and math">
        <p>
          At no point did anything “understand” your message. There were only switches turning on and off, following
          simple rules, stacked in layer after layer. Each layer only needs the one below it. That's the real secret of
          computers: <strong>simple parts, built up patiently</strong>, until the result looks like magic.
        </p>
      </Callout>

      <KeyIdeas
        items={[
          <>Text → UTF-8 bytes → encrypted with a key agreed using Diffie–Hellman maths.</>,
          <>Bytes are split into numbered packets, each addressed with a 32-bit (or 128-bit) IP address.</>,
          <>Bits travel as radio waves, voltages and laser light; routers forward packets hop by hop.</>,
          <>TCP's sequence numbers and acknowledgements fix lost and out-of-order packets.</>,
          <>Latency is set by distance and the speed of light; bandwidth by how many bits per second fit.</>,
        ]}
      />
    </>
  );
}
