"use client";

import { useEffect, useState } from "react";

/**
 * The bar's call to action, which on the home page is not there until it is needed.
 *
 * **Two of the same button in one viewport is one button too many.** The hero's primary
 * is 44px, centred, and the thing the whole page is for; a second copy of it in the bar
 * directly above says the page does not trust the first one. So on the home page this
 * one starts hidden and appears once the hero's button has scrolled off — the reader
 * never loses the ask, and never sees it twice at once.
 *
 * **Everywhere else it is simply always there**, because there is no hero button to
 * defer to: on `/privacy` and `/confirm` the bar is the only place the waiting list can
 * be reached from, and `to("#waiting-list")` on those pages is a trip home rather than
 * an in-page jump.
 *
 * `watch` is what tells the two apart, and it is also the server's answer: the first
 * paint is hidden on home and visible elsewhere, with no flash of a button that is about
 * to remove itself. An `IntersectionObserver` rather than a scroll handler, because the
 * question is *is the hero's button on screen* and that is the one question the browser
 * answers without a listener firing on every frame. `rootMargin` discounts the bar's own
 * 64px, so the swap happens as the hero button passes under it rather than after.
 *
 * If the observer finds no `#hero-cta` — a page that says it is home and has no hero,
 * which nothing does today — it shows the button rather than hiding it: a call to action
 * that has gone missing is worse than one that arrived early.
 *
 * **It fades rather than appears.** It used to swap `hidden` for `inline-flex`, which is a
 * button materialising in a bar the reader is looking at — the one moment on the page where
 * something happened *to* them rather than because of them. Now it is always laid out and
 * only its opacity and a 1px lift change, over 200ms on the site's one curve, so the hero's
 * button scrolls under the bar and this one is simply there by the time it has gone.
 *
 * Laid out, though, is not the same as present: while it is faded out it takes
 * `pointer-events-none` so it cannot be clicked through, `tabIndex={-1}` so it is not a
 * stop on the way to the nav links beside it, and `aria-hidden` so a screen reader is not
 * offered the same call to action twice in one viewport. An invisible button that is still
 * tabbable is worse than a button that snaps.
 */
export function HeaderCta({
  watch,
  href,
  label,
}: {
  watch: boolean;
  href: string;
  label: string;
}) {
  const [shown, setShown] = useState(!watch);

  useEffect(() => {
    if (!watch) return;

    const heroCta = document.getElementById("hero-cta");

    if (heroCta === null) {
      // A tick later rather than inline: a `setState` in the body of an effect is a
      // cascading render, and there is nothing to synchronise with here anyway.
      queueMicrotask(() => setShown(true));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setShown(!entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px" },
    );

    observer.observe(heroCta);

    return () => observer.disconnect();
  }, [watch]);

  return (
    <a
      href={href}
      aria-hidden={shown ? undefined : true}
      tabIndex={shown ? undefined : -1}
      className={`${shown ? "" : "pointer-events-none translate-y-1 opacity-0 "}inline-flex h-9 items-center whitespace-nowrap rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-foreground transition-[opacity,transform] duration-200 ease-(--ease-rise) hover:opacity-90`}
    >
      {label}
    </a>
  );
}
