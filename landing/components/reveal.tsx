"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A section arriving once, the first time it is scrolled to, in the hero's own grammar.
 *
 * **Content is visible by default and is only ever hidden after hydration.** The server
 * renders this as a plain `div` with no motion class at all, which is the state a reader
 * with JavaScript off, a crawler, and the printed page all keep. Hiding is applied by the
 * first `IntersectionObserver` callback and *only* to a block that is off screen at that
 * moment — so nothing that a reader can already see is ever taken away from them, which
 * is the failure mode every scroll-reveal on the web is famous for.
 *
 * That is what the three states are for. `pending` is the server's answer and the one
 * before the observer has spoken. `out` is a block that was off screen when we first
 * looked, and is the only state that hides anything. `in` adds `rise` and the hero's own
 * stagger, then disconnects — this happens once per page, not once per scroll direction,
 * because a section that re-animates every time it passes the fold is a page that will not
 * settle.
 *
 * `threshold: 0` with no `rootMargin` is deliberate and load-bearing: it means *any* part
 * of the block being in the viewport counts as in, so a section half-caught at the bottom
 * of the first screen is revealed rather than faded out from under the reader.
 *
 * Under `prefers-reduced-motion: reduce` the observer is never created and the state stays
 * `pending` for the life of the page. The global collapse in `globals.css` would flatten
 * the animation anyway; not starting is cheaper and leaves nothing to collapse.
 */
export function Reveal({
  className,
  delay = 0,
  children,
}: {
  className?: string;
  /** A step on the hero's stagger: 0, 1 or 2, being `rise-1`, `rise-2` and `rise-3`. */
  delay?: 0 | 1 | 2;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"pending" | "out" | "in">("pending");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const node = ref.current;

    if (node === null) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setState("out");
          return;
        }

        setState("in");
        observer.disconnect();
      },
      { threshold: 0, rootMargin: "0px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const motion =
    state === "in" ? `rise rise-${delay + 1}` : state === "out" ? "reveal-out" : "";

  return (
    <div ref={ref} className={[className, motion].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
