import { useEffect, useState } from "react";

export type Theme = "paper" | "night";

const STORAGE_KEY = "hcw-theme";

/**
 * Runs before the page paints (inlined in <head>) so the saved theme is applied
 * without a flash of the wrong colours.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='paper'&&t!=='night'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'night':'paper'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='paper'}})();`;

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("paper");

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    if (t === "night" || t === "paper") setTheme(t);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "paper" ? "night" : "paper";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this visit.
    }
  };

  const night = theme === "night";
  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={night ? "Switch to paper (light) theme" : "Switch to night theme"}
      title={night ? "Paper theme" : "Night theme"}
    >
      {night ? (
        <svg viewBox="0 0 20 20" className="h-[1.1rem] w-[1.1rem]" aria-hidden>
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
      ) : (
        <svg viewBox="0 0 20 20" className="h-[1.1rem] w-[1.1rem]" aria-hidden>
          <path
            d="M15.5 12.6A6.5 6.5 0 0 1 7.4 4.5a6.5 6.5 0 1 0 8.1 8.1Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span className="sr-only">{night ? "Paper" : "Night"}</span>
    </button>
  );
}
