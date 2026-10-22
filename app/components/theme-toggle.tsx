import { useEffect, useState } from "react";

import { cx } from "./ui";

export type Theme = "paper" | "night";

const STORAGE_KEY = "hcw-theme";
const META = { paper: "#f5f0e6", night: "#1c1a17" } as const;

/**
 * Runs before the page paints (inlined in <head>) so the saved theme is applied
 * without a flash of the wrong colours.
 */
export const themeBootScript = `(function(){var d=document.documentElement,t;try{t=localStorage.getItem('${STORAGE_KEY}')}catch(e){}if(t!=='paper'&&t!=='night'){t=matchMedia('(prefers-color-scheme: dark)').matches?'night':'paper'}d.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='night'?'${META.night}':'${META.paper}'})();`;

function apply(t: Theme, remember: boolean) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.dataset.theme = t;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = META[t];
  if (remember) {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // Storage can be unavailable (private mode); the switch still works for this visit.
    }
  }
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
}

/** Current theme, kept in sync with the <html data-theme> attribute. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("paper");
  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === "night" ? "night" : "paper");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    // Follow the operating system until the reader picks a theme themselves.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onOs = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(STORAGE_KEY);
      } catch {
        saved = null;
      }
      if (!saved) apply(mq.matches ? "night" : "paper", false);
    };
    mq.addEventListener("change", onOs);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", onOs);
    };
  }, []);
  const toggle = () => apply(theme === "paper" ? "night" : "paper", true);
  return { theme, toggle };
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" className="icon-moon h-[1.15rem] w-[1.15rem]" aria-hidden>
      <path
        d="M15.5 12.6A6.5 6.5 0 0 1 7.4 4.5a6.5 6.5 0 1 0 8.1 8.1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" className="icon-sun h-[1.15rem] w-[1.15rem]" aria-hidden>
      <circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line
            key={i}
            x1={10 + Math.cos(a) * 6}
            y1={10 + Math.sin(a) * 6}
            x2={10 + Math.cos(a) * 8}
            y2={10 + Math.sin(a) * 8}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/** Icon button for the header. Both icons render; CSS shows the right one, so there is no flash. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const night = theme === "night";
  return (
    <button
      type="button"
      onClick={toggle}
      className={cx(
        "inline-flex h-10 w-10 items-center justify-center rounded-md text-mute transition-colors hover:bg-panel-2 hover:text-ink",
        className,
      )}
      aria-label={night ? "Switch to paper (light) theme" : "Switch to night theme"}
      title={night ? "Paper theme" : "Night theme"}
    >
      <MoonIcon />
      <SunIcon />
    </button>
  );
}

/** A labelled switch row, for the chapter drawer on phones. */
export function ThemeSwitchRow() {
  const { theme, toggle } = useTheme();
  const night = theme === "night";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={night}
      onClick={toggle}
      className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold text-ink hover:bg-panel-2"
    >
      <span className="flex items-center gap-2.5">
        <MoonIcon />
        <SunIcon />
        Night mode
      </span>
      <span
        aria-hidden
        className={cx(
          "relative h-6 w-10 rounded-full border transition-colors",
          night ? "border-on bg-on" : "border-line-2 bg-panel-2",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-[1.125rem] w-[1.125rem] rounded-full bg-panel shadow-[0_1px_0_var(--color-line-2)] transition-all",
            night ? "left-[1.125rem]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
