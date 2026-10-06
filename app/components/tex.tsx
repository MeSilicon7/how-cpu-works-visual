import katex from "katex";
import { useMemo } from "react";

/** Raw-string tag so TeX can be written without escaping backslashes. */
export const tex = String.raw;

export function TeX({ children, block }: { children: string; block?: boolean }) {
  const html = useMemo(
    () =>
      katex.renderToString(children, {
        displayMode: !!block,
        throwOnError: false,
        strict: false,
      }),
    [children, block],
  );
  if (block) {
    return <div className="tex-block not-prose" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
