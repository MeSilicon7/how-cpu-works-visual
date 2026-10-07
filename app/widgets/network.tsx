import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { TeX } from "~/components/tex";
import { Btn, cx, DataTable, Pill, Segmented, Slider, Stat, Widget } from "~/components/ui";
import { binStr, hexStr } from "~/lib/bits";
import { useAnimationTime } from "~/lib/hooks";

export const MESSAGE = "hi Sam 👋";
const enc = new TextEncoder();
const dec = new TextDecoder();

/* ------------------------------------------------------------------ */
/* Modular exponentiation (small numbers only)                          */
/* ------------------------------------------------------------------ */

function modPow(base: number, exp: number, mod: number) {
  let r = 1;
  let b = base % mod;
  let e = exp;
  while (e > 0) {
    if (e & 1) r = (r * b) % mod;
    b = (b * b) % mod;
    e >>= 1;
  }
  return r;
}

/** Toy key stream from the shared secret. NOT real cryptography. */
export function keyStream(secret: number, n: number) {
  const out: number[] = [];
  let x = (secret * 2654435761) >>> 0;
  for (let i = 0; i < n; i++) {
    x = (Math.imul(x ^ (x >>> 15), 2246822519) + 0x9e3779b9 + i) >>> 0;
    out.push((x >>> 24) & 255);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Diffie–Hellman + a toy cipher                                        */
/* ------------------------------------------------------------------ */

export function SecretHandshake() {
  const p = 23;
  const g = 5;
  const [a, setA] = useState(6);
  const [b, setB] = useState(15);
  const A = modPow(g, a, p);
  const B = modPow(g, b, p);
  const sYou = modPow(B, a, p);
  const sSam = modPow(A, b, p);
  const bytes = Array.from(enc.encode(MESSAGE));
  const key = keyStream(sYou, bytes.length);
  const cipher = bytes.map((m, i) => m ^ key[i]);

  return (
    <Widget
      title="Agreeing on a secret in public (Diffie–Hellman)"
      subtitle="You and Sam each pick a private number and send only a “mixed” public number. Both end up with the same secret. An eavesdropper who sees everything sent cannot easily work it out."
      wide
    >
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-cyan/40 bg-cyan/5 p-3">
          <div className="text-sm font-semibold text-cyan">You</div>
          <Slider label="your private number a" min={1} max={22} value={a} onChange={setA} />
          <div className="mt-2 text-sm">
            <TeX>{`A = g^{a} \\bmod p = 5^{${a}} \\bmod 23 = ${A}`}</TeX>
          </div>
          <div className="mt-2 text-sm">
            <TeX>{`\\text{secret} = B^{a} \\bmod p = ${B}^{${a}} \\bmod 23 = \\mathbf{${sYou}}`}</TeX>
          </div>
        </div>
        <div className="rounded-xl border border-pink/40 bg-pink/5 p-3">
          <div className="text-sm font-semibold text-pink">Eavesdropper sees</div>
          <ul className="mt-1 space-y-1 font-mono text-sm text-ink">
            <li>p = 23, g = 5 (public)</li>
            <li>A = {A}</li>
            <li>B = {B}</li>
          </ul>
          <p className="mt-2 text-xs text-mute">
            To get the secret they'd need a or b: “which power of 5 gives {A} (mod 23)?”. Easy for 23 by trying them
            all; hopeless when p has 600+ digits.
          </p>
        </div>
        <div className="rounded-xl border border-violet/40 bg-violet/5 p-3">
          <div className="text-sm font-semibold text-violet">Sam</div>
          <Slider label="Sam's private number b" min={1} max={22} value={b} onChange={setB} />
          <div className="mt-2 text-sm">
            <TeX>{`B = g^{b} \\bmod p = 5^{${b}} \\bmod 23 = ${B}`}</TeX>
          </div>
          <div className="mt-2 text-sm">
            <TeX>{`\\text{secret} = A^{b} \\bmod p = ${A}^{${b}} \\bmod 23 = \\mathbf{${sSam}}`}</TeX>
          </div>
        </div>
      </div>
      <div className="mt-3 text-center">
        <Pill tone={sYou === sSam ? "on" : "pink"}>both get {sYou} — because (gᵇ)ᵃ = (gᵃ)ᵇ = gᵃᵇ</Pill>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-bg/60 p-3">
        <div className="mb-2 text-xs text-mute">
          Toy encryption: mix each byte with a key byte (made from the secret {sYou}) using XOR. Sam XORs with the same
          key to get it back, because <TeX>{"(m \\oplus k) \\oplus k = m"}</TeX>.
        </div>
        <table className="font-mono text-[0.7rem] tabular-nums">
          <tbody>
            {[
              ["message", bytes, "text-ink"],
              ["⊕ key", key, "text-amber"],
              ["= sent", cipher, "text-pink"],
            ].map(([label, row, cls]) => (
              <tr key={label as string}>
                <td className="pr-3 whitespace-nowrap text-dim">{label as string}</td>
                {(row as number[]).map((v, i) => (
                  <td key={i} className={cx("px-1", cls as string)}>
                    {hexStr(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Chopping the message into packets                                    */
/* ------------------------------------------------------------------ */

export function Packetizer() {
  const [size, setSize] = useState(4);
  const bytes = Array.from(enc.encode(MESSAGE));
  const key = keyStream(2, bytes.length);
  const cipher = bytes.map((m, i) => m ^ key[i]);
  const packets: number[][] = [];
  for (let i = 0; i < cipher.length; i += size) packets.push(cipher.slice(i, i + size));
  return (
    <Widget
      title="Chop it into packets"
      subtitle="The (encrypted) bytes are split into packets. Each gets a header, like an envelope: who it's from, who it's for, its number in the sequence, and a checksum."
      wide
    >
      <Slider
        label="Payload bytes per packet"
        min={2}
        max={12}
        value={size}
        onChange={setSize}
        format={(v) => `${v} bytes`}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {packets.map((pl, i) => {
          const sum = pl.reduce((s, v) => s + v, 0);
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-line-2 bg-bg/60">
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 border-b border-line bg-panel-2 px-3 py-2 font-mono text-[0.7rem]">
                <span className="text-dim">from</span>
                <span className="text-cyan">192.168.1.20</span>
                <span className="text-dim">to</span>
                <span className="text-violet">142.250.74.46</span>
                <span className="text-dim">sequence #</span>
                <span className="text-ink">
                  {i + 1} of {packets.length}
                </span>
                <span className="text-dim">length</span>
                <span className="text-ink">{pl.length} bytes</span>
                <span className="text-dim">checksum</span>
                <span className="text-amber">{sum % 256}</span>
              </div>
              <div className="px-3 py-2 font-mono text-xs text-pink">{pl.map((v) => hexStr(v)).join(" ")}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-mute">
        Checksum (simplified): add up the payload bytes, keep the remainder after dividing by 256. The receiver does the
        same sum; if it doesn't match, a bit got flipped on the way and the packet is thrown away. Real links use a
        stronger check: Wi-Fi and Ethernet add a 32-bit <strong className="text-ink">CRC</strong> to every frame, which
        catches almost any pattern of flipped bits (see{" "}
        <Link to="/storage#bit-flips" className="text-cyan underline decoration-1 underline-offset-2 hover:decoration-2">
          when a bit flips
        </Link>{" "}
        in Storage). Real packets carry up to ~1,500 bytes; a photo becomes a few thousand of them.
      </p>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* An IP address is a 32-bit number                                     */
/* ------------------------------------------------------------------ */

export function IpBits() {
  const [ip, setIp] = useState([142, 250, 74, 46]);
  return (
    <Widget title="An IP address is just a 32-bit number" subtitle="Written as 4 bytes in decimal, separated by dots.">
      <div className="flex flex-wrap items-center gap-2">
        {ip.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={255}
              value={v}
              onChange={(e) => {
                const n = Math.max(0, Math.min(255, Math.floor(Number(e.target.value) || 0)));
                setIp((x) => x.map((y, j) => (j === i ? n : y)));
              }}
              className="w-16 rounded-lg border border-line-2 bg-bg px-2 py-1 font-mono text-ink"
              aria-label={`Byte ${i + 1}`}
            />
            {i < 3 && <span className="font-mono text-xl text-dim">.</span>}
          </div>
        ))}
      </div>
      <div className="mt-3 overflow-x-auto font-mono text-sm">
        {ip.map((v, i) => (
          <span key={i} className={cx("mr-2", ["text-cyan", "text-violet", "text-amber", "text-on"][i])}>
            {binStr(v, 8)}
          </span>
        ))}
      </div>
      <div className="mt-2 text-sm text-mute">
        = the single number{" "}
        <span className="font-mono text-ink">{((ip[0] * 256 + ip[1]) * 256 + ip[2]) * 256 + ip[3]}</span>. There are{" "}
        <TeX>{"2^{32} \\approx 4.3"}</TeX> billion possible addresses, fewer than the number of devices online, which is
        why IPv6 uses 128 bits (<TeX>{"2^{128} \\approx 3.4 \\times 10^{38}"}</TeX>).
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Bits as voltage, light and radio                                     */
/* ------------------------------------------------------------------ */

export function SignalMedia() {
  const [medium, setMedium] = useState<"copper" | "fiber" | "radio">("radio");
  const byte = 0x68; // 'h'
  const bits = Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1);
  const t = useAnimationTime(true);
  const W = 640;
  const H = 130;
  const bw = (W - 40) / 8;

  let content: React.ReactNode;
  if (medium === "copper") {
    const d = bits
      .map((b, i) => `${i ? "L" : "M"}${20 + i * bw} ${b ? 30 : 100} L${20 + (i + 1) * bw} ${b ? 30 : 100}`)
      .join(" ");
    content = <path d={d} fill="none" stroke="var(--color-amber)" strokeWidth={3} className="glow-amber" />;
  } else if (medium === "fiber") {
    content = (
      <>
        <rect
          x={10}
          y={52}
          width={W - 20}
          height={26}
          rx={13}
          fill="var(--color-cyan-tint)"
          stroke="var(--color-off)"
        />
        {bits.map((b, i) =>
          b ? (
            <ellipse
              key={i}
              cx={20 + (i + 0.5) * bw}
              cy={65}
              rx={bw * 0.32}
              ry={9}
              fill="var(--color-cyan)"
              className="glow-cyan"
            />
          ) : null,
        )}
      </>
    );
  } else {
    const pts: string[] = [];
    for (let px = 0; px <= W - 40; px += 2) {
      const i = Math.min(7, Math.floor(px / bw));
      const phase = bits[i] ? 0 : Math.PI;
      const y = 65 + 40 * Math.sin((px / bw) * Math.PI * 2 * 3 + phase - t * 4);
      pts.push(`${px ? "L" : "M"}${20 + px} ${y.toFixed(1)}`);
    }
    content = <path d={pts.join(" ")} fill="none" stroke="var(--color-violet)" strokeWidth={2.4} />;
  }

  return (
    <Widget
      title="The letter “h” on three kinds of link"
      subtitle="Byte 0110 1000 has to become something physical. Every link in the journey uses a different trick."
      wide
    >
      <Segmented
        value={medium}
        onChange={setMedium}
        options={[
          { value: "radio", label: "Wi-Fi / 5G (radio)" },
          { value: "copper", label: "Ethernet (copper)" },
          { value: "fiber", label: "Fibre (light)" },
        ]}
      />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full rounded-xl border border-line bg-bg/60"
        role="img"
        aria-label={`Signal on ${medium}`}
      >
        {bits.map((_, i) => (
          <line
            key={i}
            x1={20 + i * bw}
            x2={20 + i * bw}
            y1={10}
            y2={H - 22}
            stroke="var(--color-line)"
            strokeDasharray="2 4"
          />
        ))}
        {content}
        {bits.map((b, i) => (
          <text
            key={i}
            x={20 + (i + 0.5) * bw}
            y={H - 6}
            textAnchor="middle"
            className="font-mono text-[12px] font-bold"
            fill={b ? "var(--color-on)" : "var(--color-dim)"}
          >
            {b}
          </text>
        ))}
      </svg>
      <p className="mt-2 text-sm text-mute">
        {medium === "radio" &&
          "A radio wave wiggles billions of times per second. To send a 1 or a 0, the transmitter flips the wave's timing (its phase). Real Wi-Fi changes amplitude and phase together to send several bits per wiggle."}
        {medium === "copper" &&
          "On a copper cable, bits are voltage levels, just like inside the chip. Two twisted wires carry opposite signals, so noise cancels (like USB)."}
        {medium === "fiber" &&
          "In an optical fibre, a laser flashes on and off billions of times per second. The light bounces along a glass thread about as thick as a hair (the core that carries the light is ten times thinner), for up to ~100 km before it needs boosting."}
      </p>
      <DataTable
        className="mt-2"
        align="left"
        head={["link", "carrier", "signal speed", "typical bandwidth"]}
        rows={[
          ["Wi-Fi", "radio, 2.4 / 5 / 6 GHz", "≈ 300,000 km/s", "100–1,000 Mbit/s"],
          ["Ethernet", "voltage on copper", "≈ 200,000 km/s", "1,000 Mbit/s"],
          ["Fibre", "laser light in glass", "≈ 200,000 km/s", "up to terabits/s (backbone)"],
        ]}
      />
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* The journey across the internet                                      */
/* ------------------------------------------------------------------ */

type NodeId = "you" | "wifi" | "isp1" | "r1" | "r2" | "r3" | "r4" | "srv" | "isp2" | "sam";

const nodes: Record<NodeId, { x: number; y: number; label: string; kind: "device" | "router" | "server" }> = {
  you: { x: 36, y: 150, label: "Your phone", kind: "device" },
  wifi: { x: 112, y: 150, label: "Wi-Fi router", kind: "router" },
  isp1: { x: 192, y: 150, label: "Your ISP", kind: "router" },
  r1: { x: 282, y: 72, label: "Router", kind: "router" },
  r2: { x: 282, y: 228, label: "Router", kind: "router" },
  r3: { x: 382, y: 72, label: "Router", kind: "router" },
  r4: { x: 382, y: 228, label: "Router", kind: "router" },
  srv: { x: 472, y: 150, label: "Chat server", kind: "server" },
  isp2: { x: 562, y: 150, label: "Cell tower", kind: "router" },
  sam: { x: 644, y: 150, label: "Sam's phone", kind: "device" },
};

const links: Array<[NodeId, NodeId]> = [
  ["you", "wifi"],
  ["wifi", "isp1"],
  ["isp1", "r1"],
  ["isp1", "r2"],
  ["r1", "r3"],
  ["r2", "r4"],
  ["r1", "r2"],
  ["r4", "r3"],
  ["r3", "srv"],
  ["r4", "srv"],
  ["srv", "isp2"],
  ["isp2", "sam"],
];

const pathA: NodeId[] = ["you", "wifi", "isp1", "r1", "r3", "srv", "isp2", "sam"];
const pathB: NodeId[] = ["you", "wifi", "isp1", "r2", "r4", "r3", "srv", "isp2", "sam"];
const SPEED = 170; // px per second in the animation

function pathLen(p: NodeId[]) {
  let l = 0;
  for (let i = 1; i < p.length; i++)
    l += Math.hypot(nodes[p[i]].x - nodes[p[i - 1]].x, nodes[p[i]].y - nodes[p[i - 1]].y);
  return l;
}

function pointAt(p: NodeId[], dist: number) {
  let d = dist;
  for (let i = 1; i < p.length; i++) {
    const a = nodes[p[i - 1]];
    const b = nodes[p[i]];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= seg) return { x: a.x + ((b.x - a.x) * d) / seg, y: a.y + ((b.y - a.y) * d) / seg };
    d -= seg;
  }
  const last = nodes[p[p.length - 1]];
  return { x: last.x, y: last.y };
}

interface Flight {
  seq: number;
  path: NodeId[];
  start: number;
  /** distance along path where it is dropped, if lost */
  dropAt?: number;
  retry?: boolean;
}

export function InternetJourney() {
  const bytes = useMemo(() => Array.from(enc.encode(MESSAGE)), []);
  const N = 4;
  const chunk = Math.ceil(bytes.length / N);
  const payloads = Array.from({ length: N }, (_, i) => bytes.slice(i * chunk, (i + 1) * chunk));
  const [lossy, setLossy] = useState(true);
  const [runId, setRunId] = useState(0);
  const [running, setRunning] = useState(false);
  const t = useAnimationTime(running);
  const [t0, setT0] = useState(0);
  const elapsed = running || runId ? t - t0 : 0;

  const plan = useMemo(() => {
    const flights: Flight[] = [];
    for (let i = 0; i < N; i++) {
      const path = i % 2 === 0 ? pathA : pathB;
      const f: Flight = { seq: i, path, start: i * 0.45 };
      if (lossy && i === 2) {
        // dropped half-way between the two top routers
        f.dropAt = pathLen(pathA.slice(0, 4)) + 50;
      }
      flights.push(f);
    }
    if (lossy) {
      // Sam's phone notices #3 is missing; the sender's timer runs out and it resends.
      const lastArrival = Math.max(
        ...flights.filter((f) => f.dropAt === undefined).map((f) => f.start + pathLen(f.path) / SPEED),
      );
      flights.push({ seq: 2, path: pathA, start: lastArrival + 0.6, retry: true });
    }
    return flights;
  }, [lossy]);

  const arrivals = plan
    .filter((f) => f.dropAt === undefined)
    .map((f) => ({ seq: f.seq, at: f.start + pathLen(f.path) / SPEED, retry: !!f.retry }))
    .sort((a, b) => a.at - b.at);
  const arrived = arrivals.filter((a) => a.at <= elapsed);
  const got = new Set(arrived.map((a) => a.seq));
  const complete = got.size === N;
  const doneTime = arrivals.length ? arrivals[arrivals.length - 1].at : 0;
  const finished = elapsed > doneTime + 0.3;

  const log: string[] = [];
  plan.forEach((f) => {
    if (f.dropAt !== undefined && elapsed > f.start + f.dropAt / SPEED)
      log.push(`✗ packet #${f.seq + 1} lost (a router's queue was full)`);
  });
  arrived.forEach((a) => log.push(`✓ packet #${a.seq + 1} arrived${a.retry ? " (resent)" : ""}`));
  if (lossy && got.size >= N - 1 && !got.has(2) && elapsed > (arrivals.find((a) => !a.retry && a.seq === 3)?.at ?? 99))
    log.push("⚠ #3 missing: no acknowledgement, so your phone resends it");
  if (complete && finished) log.push(`✓ all ${N} in order → decrypt → “${MESSAGE}”`);

  // Stop the animation clock once everything has arrived.
  useEffect(() => {
    if (running && finished && elapsed > doneTime + 1) setRunning(false);
  }, [running, finished, elapsed, doneTime]);

  const send = () => {
    setT0(t);
    setRunId((r) => r + 1);
    setRunning(true);
  };

  return (
    <Widget
      title="Across the internet, packet by packet"
      subtitle="Press send. Each packet finds its own way; routers just pass it to the next hop toward its address. Packets can arrive out of order, or not at all."
      wide
    >
      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="primary" onClick={send}>
          {runId ? "↻ Send again" : `Send “${MESSAGE}”`}
        </Btn>
        <Btn active={lossy} onClick={() => setLossy((v) => !v)}>
          Unreliable network: {lossy ? "on" : "off"}
        </Btn>
        <span className="font-mono text-xs text-dim">slowed down ~2,000×</span>
      </div>
      <svg
        viewBox="0 0 680 300"
        className="mt-3 w-full rounded-xl border border-line bg-bg/60"
        role="img"
        aria-label="Network map with travelling packets"
      >
        {links.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="var(--color-line-2)"
            strokeWidth={2}
          />
        ))}
        {(Object.keys(nodes) as NodeId[]).map((id) => {
          const n = nodes[id];
          return (
            <g key={id}>
              {n.kind === "device" ? (
                <rect
                  x={n.x - 11}
                  y={n.y - 18}
                  width={22}
                  height={36}
                  rx={5}
                  fill="var(--color-panel-3)"
                  stroke={id === "you" ? "var(--color-cyan)" : "var(--color-violet)"}
                  strokeWidth={2}
                />
              ) : n.kind === "server" ? (
                <rect
                  x={n.x - 16}
                  y={n.y - 20}
                  width={32}
                  height={40}
                  rx={4}
                  fill="var(--color-panel-3)"
                  stroke="var(--color-amber)"
                  strokeWidth={2}
                />
              ) : (
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={13}
                  fill="var(--color-panel-3)"
                  stroke="var(--color-dim)"
                  strokeWidth={2}
                />
              )}
              <text
                x={n.x}
                y={n.y + (n.kind === "router" ? 28 : 34)}
                textAnchor="middle"
                className="fill-mute text-[11px]"
              >
                {n.label}
              </text>
            </g>
          );
        })}
        {runId > 0 &&
          plan.map((f, k) => {
            const travelled = (elapsed - f.start) * SPEED;
            if (travelled < 0) return null;
            const total = pathLen(f.path);
            if (f.dropAt !== undefined && travelled > f.dropAt) {
              const p = pointAt(f.path, f.dropAt);
              const fade = Math.max(0, 1 - (travelled - f.dropAt) / 120);
              return (
                <text
                  key={k}
                  x={p.x}
                  y={p.y + 5}
                  textAnchor="middle"
                  className="font-mono text-[18px] font-bold"
                  fill="var(--color-pink)"
                  opacity={0.3 + fade * 0.7}
                >
                  ✗
                </text>
              );
            }
            if (travelled > total) return null;
            const p = pointAt(f.path, travelled);
            return (
              <g key={k}>
                <rect
                  x={p.x - 14}
                  y={p.y - 9}
                  width={28}
                  height={18}
                  rx={4}
                  fill={f.retry ? "var(--color-amber)" : "var(--color-cyan)"}
                  className="glow-cyan"
                />
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  className="font-mono text-[11px] font-bold"
                  fill="var(--color-bg)"
                >
                  #{f.seq + 1}
                </text>
              </g>
            );
          })}
      </svg>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-line bg-bg/60 p-3">
          <div className="mb-2 text-xs font-semibold tracking-wider text-mute uppercase">Sam's phone: reassembly</div>
          <div className="grid grid-cols-4 gap-2">
            {payloads.map((pl, i) => (
              <div
                key={i}
                className={cx(
                  "rounded-lg border p-2 text-center font-mono text-[0.6875rem]",
                  got.has(i) ? "border-on/60 bg-on/10 text-on" : "border-dashed border-line-2 text-dim",
                )}
              >
                <div className="text-xs font-bold">#{i + 1}</div>
                {got.has(i) ? pl.map((v) => hexStr(v)).join(" ") : "waiting"}
              </div>
            ))}
          </div>
          <div className="mt-3 text-center text-2xl">
            {complete && finished ? (
              <span className="text-ink">{dec.decode(new Uint8Array(bytes))}</span>
            ) : (
              <span className="text-dim">…</span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-bg/60 p-3">
          <div className="mb-2 text-xs font-semibold tracking-wider text-mute uppercase">Event log</div>
          <ul className="space-y-1 font-mono text-xs">
            {log.length === 0 && <li className="text-dim">Press send.</li>}
            {log.map((l, i) => (
              <li key={i} className={l.startsWith("✗") ? "text-pink" : l.startsWith("⚠") ? "text-amber" : "text-on"}>
                {l}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* How long does it take? Latency + bandwidth                           */
/* ------------------------------------------------------------------ */

export function LatencyCalc() {
  const [km, setKm] = useState(10000);
  const [mbps, setMbps] = useState(50);
  const [mb, setMb] = useState(3);
  const oneWay = (km / 200000) * 1000; // ms in fibre
  const transfer = ((mb * 8) / mbps) * 1000;
  return (
    <Widget
      title="Two numbers decide how fast it feels"
      subtitle="Latency: how long one bit takes to get there. Bandwidth: how many bits per second fit through."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Slider
          label="Distance to Sam"
          min={10}
          max={20000}
          step={10}
          value={km}
          onChange={setKm}
          format={(v) => `${v.toLocaleString()} km`}
        />
        <Slider
          label="Your connection"
          min={1}
          max={1000}
          value={mbps}
          onChange={setMbps}
          format={(v) => `${v} Mbit/s`}
        />
        <Slider
          label="Size (e.g. a photo)"
          min={0.01}
          max={50}
          step={0.01}
          value={mb}
          onChange={setMb}
          format={(v) => `${v} MB`}
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-bg/60 p-3 text-sm">
          <TeX
            block
          >{`\\text{latency} = \\frac{${km.toLocaleString().replace(/,/g, "{,}")}\\text{ km}}{200{,}000\\text{ km/s}} = ${oneWay.toFixed(1)}\\text{ ms}`}</TeX>
          <p className="text-xs text-mute">
            Light in glass travels at about ⅔ of its speed in vacuum. Real routes add detours and router delays, often
            doubling this.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-bg/60 p-3 text-sm">
          <TeX
            block
          >{`\\text{transfer} = \\frac{${mb} \\text{ MB} \\times 8 \\tfrac{\\text{bits}}{\\text{byte}}}{${mbps}\\text{ Mbit/s}} = ${transfer >= 1000 ? (transfer / 1000).toFixed(2) + "\\text{ s}" : transfer.toFixed(1) + "\\text{ ms}"}`}</TeX>
          <p className="text-xs text-mute">
            A short text message is a few hundred bytes, so for chat, latency is what you feel.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="One way" value={`${oneWay.toFixed(0)} ms`} tone="cyan" />
        <Stat label="There and back (round trip)" value={`${(oneWay * 2).toFixed(0)} ms`} />
        <Stat label="Total for the photo" value={`${((oneWay + transfer) / 1000).toFixed(2)} s`} tone="amber" />
      </div>
    </Widget>
  );
}
