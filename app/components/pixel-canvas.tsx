import { useEffect, useRef } from "react";

import type { Img } from "~/lib/image";

/**
 * Draws an RGBA image scaled up with crisp (nearest-neighbour) pixels.
 * `view` selects the source rectangle (for zooming).
 */
export function PixelCanvas({
  img,
  className,
  view,
  grid,
  onPick,
  ariaLabel,
  aspect,
}: {
  img: Img;
  className?: string;
  view?: { x: number; y: number; w: number; h: number };
  grid?: boolean;
  onPick?: (x: number, y: number) => void;
  ariaLabel?: string;
  /** CSS aspect ratio; defaults to the view's ratio. */
  aspect?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const v = view ?? { x: 0, y: 0, w: img.w, h: img.h };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const src = document.createElement("canvas");
    src.width = img.w;
    src.height = img.h;
    src.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.w, img.h), 0, 0);

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(src, v.x, v.y, v.w, v.h, 0, 0, canvas.width, canvas.height);
      if (grid) {
        const sx = canvas.width / v.w;
        const sy = canvas.height / v.h;
        if (sx >= 6) {
          ctx.strokeStyle = "rgba(0,0,0,0.55)";
          ctx.lineWidth = Math.max(1, dpr);
          ctx.beginPath();
          for (let i = 0; i <= v.w; i++) {
            const x = Math.round((i - (v.x % 1)) * sx) + 0.5;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
          }
          for (let j = 0; j <= v.h; j++) {
            const y = Math.round((j - (v.y % 1)) * sy) + 0.5;
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
          }
          ctx.stroke();
        }
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [img, v.x, v.y, v.w, v.h, grid]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ aspectRatio: String(aspect ?? v.w / v.h), width: "100%", imageRendering: "pixelated" }}
      onClick={(e) => {
        if (!onPick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const px = Math.floor(v.x + ((e.clientX - rect.left) / rect.width) * v.w);
        const py = Math.floor(v.y + ((e.clientY - rect.top) / rect.height) * v.h);
        onPick(Math.max(0, Math.min(img.w - 1, px)), Math.max(0, Math.min(img.h - 1, py)));
      }}
    />
  );
}
