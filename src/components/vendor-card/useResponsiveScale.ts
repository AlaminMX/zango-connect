import { useEffect, useRef, useState } from "react";

/**
 * Watches `containerRef`'s width and returns the scale factor needed to fit
 * a `naturalWidth`-wide element inside it — used to preview the fixed
 * 1600×900 card responsively without ever changing its real DOM size
 * (which would break pixel-perfect PNG export).
 */
export function useResponsiveScale(naturalWidth: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => {
      const width = node.getBoundingClientRect().width;
      if (width > 0) setScale(width / naturalWidth);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [naturalWidth]);

  return { containerRef, scale };
}
