import { useId, type ReactNode } from "react";

export function cx(...parts: Array<string | number | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------------- Text blocks ---------------- */

type CalloutKind = "idea" | "analogy" | "math" | "warn" | "fact";

const calloutStyles: Record<CalloutKind, { border: string; label: string; icon: string; text: string }> = {
  idea: { border: "border-cyan/40", label: "Key idea", icon: "◆", text: "text-cyan" },
  analogy: { border: "border-violet/40", label: "Think of it like", icon: "≈", text: "text-violet" },
  math: { border: "border-amber/40", label: "The math", icon: "∑", text: "text-amber" },
  warn: { border: "border-pink/40", label: "Watch out", icon: "!", text: "text-pink" },
  fact: { border: "border-on/40", label: "Real numbers", icon: "#", text: "text-on" },
};

export function Callout({
  kind = "idea",
  title,
  children,
}: {
  kind?: CalloutKind;
  title?: ReactNode;
  children: ReactNode;
}) {
  const s = calloutStyles[kind];
  return (
    <aside className={cx("rounded-xl border bg-panel/80 px-5 py-4 text-[0.98rem] leading-relaxed", s.border)}>
      <div className={cx("mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase", s.text)}>
        <span aria-hidden className="font-mono">
          {s.icon}
        </span>
        {title ?? s.label}
      </div>
      <div className="space-y-2.5 text-ink/85 [&_strong]:text-ink">{children}</div>
    </aside>
  );
}

export function GoDeeper({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-line-2 bg-panel/70 open:bg-panel">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 select-none [&::-webkit-details-marker]:hidden">
        <span className="rounded-md border border-amber/40 bg-amber/10 px-2 py-0.5 font-mono text-[0.7rem] font-semibold tracking-wider text-amber uppercase">
          Go deeper
        </span>
        <span className="font-medium text-ink">{title}</span>
        <span aria-hidden className="ml-auto font-mono text-dim transition-transform group-open:rotate-90">
          ▸
        </span>
      </summary>
      <div className="prose-cpu border-t border-line px-5 pt-1 pb-5 text-[0.98rem]">{children}</div>
    </details>
  );
}

export function KeyIdeas({ items }: { items: ReactNode[] }) {
  return (
    <div className="not-prose mt-14 rounded-2xl border border-on/30 bg-gradient-to-br from-on/[0.07] to-transparent p-6">
      <div className="mb-3 font-mono text-xs font-semibold tracking-widest text-on uppercase">Remember this</div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-ink/90">
            <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-on shadow-[0_0_8px_var(--color-on)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Interactive frame ---------------- */

export function Widget({
  title,
  subtitle,
  children,
  className,
  wide,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Lets the widget extend past the text column on large screens. */
  wide?: boolean;
}) {
  return (
    <section
      className={cx(
        "not-prose relative my-8 rounded-2xl border border-line-2 bg-panel shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_20px_60px_-30px_rgb(0_0_0/0.8)]",
        wide && "lg:-mx-24 xl:-mx-40",
        className,
      )}
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-3 sm:px-5">
        <span className="rounded bg-on/10 px-1.5 py-0.5 font-mono text-[0.65rem] font-bold tracking-widest text-on uppercase">
          Try it
        </span>
        <h4 className="font-semibold text-ink">{title}</h4>
        {subtitle && <p className="w-full text-sm text-mute">{subtitle}</p>}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

/* ---------------- Controls ---------------- */

export function Btn({
  children,
  onClick,
  variant = "default",
  active,
  disabled,
  className,
  title,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "ghost";
  active?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition select-none",
        "focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-on text-bg shadow-[0_0_16px_-2px_var(--color-on)] hover:bg-on-2",
        variant === "default" &&
          (active
            ? "border border-on/60 bg-on/15 text-on"
            : "border border-line-2 bg-panel-2 text-ink hover:border-dim hover:bg-panel-3"),
        variant === "ghost" && "text-mute hover:bg-panel-2 hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  className,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cx("min-w-0", className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <label htmlFor={id} className="text-mute">
          {label}
        </label>
        <span className="font-mono text-ink tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: Array<{ value: T; label: ReactNode; title?: string }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      className={cx("inline-flex flex-wrap gap-1 rounded-xl border border-line bg-bg/60 p-1", className)}
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            o.value === value
              ? "bg-on/15 text-on shadow-[inset_0_0_0_1px_rgb(61_255_160/0.5)]"
              : "text-mute hover:bg-panel-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A clickable bit: a glowing square that shows 1 or 0. */
export function BitButton({
  on,
  onClick,
  label,
  size = "md",
  color = "on",
  disabled,
  title,
}: {
  on: boolean;
  onClick?: () => void;
  label?: ReactNode;
  size?: "sm" | "md" | "lg";
  color?: "on" | "cyan" | "amber" | "violet" | "pink";
  disabled?: boolean;
  title?: string;
}) {
  const dims = size === "sm" ? "h-7 w-7 text-sm" : size === "lg" ? "h-12 w-12 text-xl" : "h-9 w-9 text-base";
  const onCls: Record<string, string> = {
    on: "border-on bg-on/20 text-on shadow-[0_0_14px_-2px_var(--color-on)]",
    cyan: "border-cyan bg-cyan/20 text-cyan shadow-[0_0_14px_-2px_var(--color-cyan)]",
    amber: "border-amber bg-amber/20 text-amber shadow-[0_0_14px_-2px_var(--color-amber)]",
    violet: "border-violet bg-violet/20 text-violet shadow-[0_0_14px_-2px_var(--color-violet)]",
    pink: "border-pink bg-pink/20 text-pink shadow-[0_0_14px_-2px_var(--color-pink)]",
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        title={title}
        aria-pressed={on}
        className={cx(
          "rounded-lg border font-mono font-bold tabular-nums transition select-none",
          "focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none",
          onClick && !disabled ? "cursor-pointer hover:brightness-125" : "cursor-default",
          dims,
          on ? onCls[color] : "border-line-2 bg-bg/70 text-dim",
        )}
      >
        {on ? 1 : 0}
      </button>
      {label !== undefined && <span className="font-mono text-[0.65rem] text-dim">{label}</span>}
    </div>
  );
}

/** Read-only row of bits, MSB first. */
export function Bits({
  value,
  width,
  className,
  onColor = "text-on",
  groups = 4,
}: {
  value: number;
  width: number;
  className?: string;
  onColor?: string;
  groups?: number;
}) {
  const bits: number[] = [];
  for (let i = width - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  return (
    <span className={cx("font-mono tabular-nums", className)}>
      {bits.map((b, i) => (
        <span
          key={i}
          className={cx(b ? onColor : "text-dim", groups && i > 0 && (width - i) % groups === 0 && "ml-[0.35em]")}
        >
          {b}
        </span>
      ))}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "ink",
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "ink" | "on" | "amber" | "cyan" | "pink" | "violet";
}) {
  const toneCls = {
    ink: "text-ink",
    on: "text-on",
    amber: "text-amber",
    cyan: "text-cyan",
    pink: "text-pink",
    violet: "text-violet",
  }[tone];
  return (
    <div className="rounded-xl border border-line bg-bg/50 px-3.5 py-2.5">
      <div className="text-[0.7rem] font-medium tracking-wider text-dim uppercase">{label}</div>
      <div className={cx("mt-0.5 font-mono text-lg font-semibold tabular-nums", toneCls)}>{value}</div>
      {sub && <div className="text-xs text-mute">{sub}</div>}
    </div>
  );
}

export function Pill({
  children,
  tone = "mute",
  className,
}: {
  children: ReactNode;
  tone?: "mute" | "on" | "amber" | "cyan" | "pink" | "violet";
  className?: string;
}) {
  const toneCls = {
    mute: "border-line-2 text-mute",
    on: "border-on/50 text-on bg-on/10",
    amber: "border-amber/50 text-amber bg-amber/10",
    cyan: "border-cyan/50 text-cyan bg-cyan/10",
    pink: "border-pink/50 text-pink bg-pink/10",
    violet: "border-violet/50 text-violet bg-violet/10",
  }[tone];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.7rem] font-semibold",
        toneCls,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Figure({ children, caption }: { children: ReactNode; caption?: ReactNode }) {
  return (
    <figure className="not-prose my-8">
      <div className="overflow-x-auto rounded-2xl border border-line bg-panel/60 p-4">{children}</div>
      {caption && <figcaption className="mt-2 text-center text-sm text-mute">{caption}</figcaption>}
    </figure>
  );
}

/** A small table for truth tables, data tables etc. */
export function DataTable({
  head,
  rows,
  highlight,
  className,
  align = "center",
}: {
  head: ReactNode[];
  rows: ReactNode[][];
  highlight?: number | number[];
  className?: string;
  align?: "center" | "left";
}) {
  const hl = Array.isArray(highlight) ? highlight : highlight === undefined ? [] : [highlight];
  return (
    <div className={cx("overflow-x-auto scroll-thin", className)}>
      <table className="w-full border-collapse font-mono text-sm tabular-nums">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className={cx(
                  "border-b border-line-2 px-3 py-1.5 font-semibold text-mute",
                  align === "left" ? "text-left" : "text-center",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className={cx("transition-colors", hl.includes(ri) ? "bg-on/10 text-on" : "text-ink/85")}>
              {r.map((c, ci) => (
                <td
                  key={ci}
                  className={cx("border-b border-line px-3 py-1.5", align === "left" ? "text-left" : "text-center")}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Numbered sequence of reasoning steps, used for worked examples. */
export function Steps({ children }: { children: ReactNode[] }) {
  return (
    <ol className="not-prose space-y-2.5">
      {children.map((c, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-2 font-mono text-xs text-mute">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1 text-ink/90">{c}</div>
        </li>
      ))}
    </ol>
  );
}
