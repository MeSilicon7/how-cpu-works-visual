import { useId, type CSSProperties, type ReactNode } from "react";

export function cx(...parts: Array<string | number | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Accent colours that every component understands. */
export type Tone = "on" | "amber" | "cyan" | "pink" | "violet";

/* ---------------- Text blocks ---------------- */

type CalloutKind = "idea" | "analogy" | "math" | "warn" | "fact";

const calloutStyles: Record<CalloutKind, { label: string; icon: string }> = {
  idea: { label: "Key idea", icon: "◆" },
  analogy: { label: "Think of it like", icon: "≈" },
  math: { label: "The math", icon: "∑" },
  warn: { label: "Watch out", icon: "!" },
  fact: { label: "Real numbers", icon: "#" },
};

/** A margin note in the text: a coloured rule, a small-caps label and the note. */
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
    <aside className={cx("callout", `callout-${kind}`)}>
      <div className="callout-label">
        <span aria-hidden>{s.icon}</span>
        {title ?? s.label}
      </div>
      <div className="space-y-2.5">{children}</div>
    </aside>
  );
}

/** An optional section, closed by default, set between two rules. */
export function GoDeeper({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <details className="group go-deeper my-8 border-y border-line-2">
      <summary className="flex cursor-pointer list-none items-baseline gap-3 px-1 py-3.5 select-none hover:bg-panel [&::-webkit-details-marker]:hidden">
        <span className="label-caps shrink-0 text-amber">Go deeper</span>
        <span className="font-serif font-semibold text-ink">{title}</span>
        <span className="ml-auto shrink-0 font-sans text-xs text-dim">optional</span>
        <span aria-hidden className="w-4 shrink-0 text-center font-sans text-lg leading-none text-dim">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <div className="prose-book border-t border-dashed border-line-2 px-1 pt-3 pb-5 text-[0.9444em]">{children}</div>
    </details>
  );
}

/** "Remember this": the chapter's numbered summary. */
export function KeyIdeas({ items }: { items: ReactNode[] }) {
  return (
    <div className="not-prose mt-14 border-t-4 border-b border-double border-t-on border-b-line-2 bg-panel px-6 py-5">
      <div className="label-caps mb-3 text-on">Remember this</div>
      <ol className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 font-serif text-body">
            <span className="w-6 shrink-0 text-right font-display text-lg leading-[1.45] font-semibold text-on tabular-nums">
              {i + 1}
            </span>
            <span className="min-w-0 leading-relaxed [&_strong]:font-semibold [&_strong]:text-ink">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------- Interactive figure ---------------- */

/** An interactive figure, drawn like a plate in a printed book. */
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
  /** Lets the figure extend past the text column on large screens. */
  wide?: boolean;
}) {
  return (
    <section className={cx("not-prose fig plate relative font-sans text-ink", wide && "fig-wide", className)}>
      <header className="border-b border-line px-4 pt-3.5 pb-3 sm:px-5">
        <div className="label-caps text-[0.6875rem] text-dim">
          <span className="fig-num" />
          <span className="text-ink">Try it</span>
        </div>
        <h4 className="mt-1 font-serif text-[1.0625rem] leading-snug font-semibold text-ink">{title}</h4>
        {subtitle && (
          <p className="mt-1 max-w-[62ch] font-serif text-[0.9375rem] leading-normal text-mute">{subtitle}</p>
        )}
      </header>
      <div className="@container p-4 sm:p-5">{children}</div>
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
      aria-pressed={variant === "default" && active !== undefined ? active : undefined}
      className={cx(
        "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 font-sans text-sm font-semibold transition-colors duration-150 select-none pointer-coarse:min-h-11",
        "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "border-on bg-on text-bg hover:border-on-2 hover:bg-on-2",
        variant === "default" &&
          (active
            ? "border-ink bg-panel-2 text-ink shadow-[inset_0_1px_2px_rgb(0_0_0/0.08)]"
            : "border-line-2 bg-panel text-ink shadow-[inset_0_-1px_0_var(--color-line-2)] hover:border-off hover:bg-panel-2"),
        variant === "ghost" && "border-transparent text-mute hover:bg-panel-2 hover:text-ink",
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
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className={cx("min-w-0", className)}>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
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
        style={{ "--fill": `${fill}%` } as CSSProperties}
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
      className={cx("inline-flex flex-wrap gap-0.5 rounded-lg border border-line bg-panel-2 p-0.5", className)}
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
            "rounded-md font-sans font-semibold transition-colors",
            size === "sm" ? "px-2.5 py-1 text-xs pointer-coarse:py-2" : "px-3 py-1.5 text-sm pointer-coarse:py-2.5",
            o.value === value
              ? "bg-panel text-ink shadow-[0_0_0_1px_var(--color-line-2),0_1px_0_var(--color-line-2)]"
              : "text-mute hover:bg-panel-3/60 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const toneOn: Record<Tone, string> = {
  on: "border-on bg-on-tint text-on halo-on",
  cyan: "border-cyan bg-cyan-tint text-cyan halo-cyan",
  amber: "border-amber bg-amber-tint text-amber halo-amber",
  violet: "border-violet bg-violet-tint text-violet halo-violet",
  pink: "border-pink bg-pink-tint text-pink halo-pink",
};

/** A clickable bit: a small inked square that shows 1 or 0. */
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
  color?: Tone;
  disabled?: boolean;
  title?: string;
}) {
  const dims = size === "sm" ? "h-7 w-7 text-sm" : size === "lg" ? "h-12 w-12 text-xl" : "h-9 w-9 text-base";
  const clickable = !!onClick && !disabled;
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        title={title}
        aria-pressed={on}
        className={cx(
          "relative rounded-md font-mono tabular-nums transition-colors select-none",
          size === "sm" && "after:absolute after:-inset-1.5",
          clickable ? "cursor-pointer" : "cursor-default",
          dims,
          on
            ? cx("border-[1.5px] font-bold", toneOn[color])
            : cx("border border-line-2 bg-panel font-normal text-dim", clickable && "hover:border-off hover:text-mute"),
        )}
      >
        {on ? 1 : 0}
      </button>
      {label !== undefined && <span className="font-mono text-[0.6875rem] text-dim">{label}</span>}
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
          className={cx(
            b ? cx(onColor, "font-bold") : "font-normal text-dim",
            groups && i > 0 && (width - i) % groups === 0 && "ml-[0.35em]",
          )}
        >
          {b}
        </span>
      ))}
    </span>
  );
}

const statBorder: Record<string, string> = {
  ink: "border-line-2",
  on: "border-on",
  amber: "border-amber",
  cyan: "border-cyan",
  pink: "border-pink",
  violet: "border-violet",
};
const statText: Record<string, string> = {
  ink: "text-ink",
  on: "text-on",
  amber: "text-amber",
  cyan: "text-cyan",
  pink: "text-pink",
  violet: "text-violet",
};

/** A labelled number, set off by a thin rule. */
export function Stat({
  label,
  value,
  sub,
  tone = "ink",
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "ink" | Tone;
}) {
  return (
    <div className={cx("min-w-0 border-l-2 py-0.5 pl-3", statBorder[tone])}>
      <div className="label-caps text-[0.6875rem] text-dim">{label}</div>
      <div className={cx("mt-1 font-mono text-lg font-semibold tabular-nums", statText[tone])}>{value}</div>
      {sub && <div className="text-xs text-mute">{sub}</div>}
    </div>
  );
}

const pillTone: Record<string, string> = {
  mute: "border-line-2 text-mute",
  on: "border-on/40 bg-on-tint text-on",
  amber: "border-amber/40 bg-amber-tint text-amber",
  cyan: "border-cyan/40 bg-cyan-tint text-cyan",
  pink: "border-pink/40 bg-pink-tint text-pink",
  violet: "border-violet/40 bg-violet-tint text-violet",
};

export function Pill({
  children,
  tone = "mute",
  className,
}: {
  children: ReactNode;
  tone?: "mute" | Tone;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-sans text-xs font-semibold",
        pillTone[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A static (non-interactive) figure with a caption. */
export function Figure({ children, caption }: { children: ReactNode; caption?: ReactNode }) {
  return (
    <figure className="not-prose fig my-8">
      <div className="plate overflow-x-auto p-4">{children}</div>
      {caption && (
        <figcaption className="mt-2.5 font-serif text-[0.9375rem] text-mute italic">
          <span className="fig-num label-caps text-[0.6875rem] text-dim not-italic" />
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** A book-style table: rules above and below, no boxes. */
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
    <div className={cx("not-prose scroll-thin overflow-x-auto", className)}>
      <table className="booktabs">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={align === "left" ? "text-left" : "text-center"}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className={cx("transition-colors", hl.includes(ri) && "hl")}>
              {r.map((c, ci) => (
                <td key={ci} className={align === "left" ? "text-left" : "text-center"}>
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
          <span className="w-6 shrink-0 text-right font-display text-lg leading-[1.45] font-semibold text-amber tabular-nums">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1 text-body">{c}</div>
        </li>
      ))}
    </ol>
  );
}
