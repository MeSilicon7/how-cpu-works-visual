export function ChipLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <g stroke="var(--color-mute)" strokeWidth="1.6" strokeLinecap="round">
        {[9, 14, 18, 23].map((p) => (
          <g key={p}>
            <line x1={p} y1={2} x2={p} y2={6} />
            <line x1={p} y1={26} x2={p} y2={30} />
            <line x1={2} y1={p} x2={6} y2={p} />
            <line x1={26} y1={p} x2={30} y2={p} />
          </g>
        ))}
      </g>
      <rect
        x="6"
        y="6"
        width="20"
        height="20"
        rx="3"
        fill="var(--color-panel)"
        stroke="var(--color-ink)"
        strokeWidth="1.6"
      />
      <rect x="11" y="11" width="10" height="10" rx="1.5" fill="var(--color-on)" className="glow-on" />
    </svg>
  );
}
