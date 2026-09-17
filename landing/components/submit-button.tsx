"use client";

import { useFormStatus } from "react-dom";

/**
 * The one submit button this site has, in the one place it is written down.
 *
 * **Its own component because `useFormStatus` reads the nearest enclosing `<form>`** and
 * returns `false` for a component that renders the form itself — so neither the waiting
 * list nor the confirm panel can draw its own button and still know whether it is
 * pending. Both needed the same hook, the same disabled rule and the same class string,
 * and two copies of that is two places for a focus ring to drift.
 *
 * The pending label is a prop rather than a spinner: the button is the only thing on the
 * page that can say the press was received, and a reader on a phone in China may be
 * waiting on it for a while.
 *
 * It asks for `bg-accent` and nothing about the surface under it. There is one ground on
 * this site and one accent, and both are `light-dark()` pairs in `globals.css`, so the
 * same string draws deep indigo on paper and a lighter indigo on the near-black reading
 * without this component knowing which it is on.
 *
 * `className` is prefixed rather than appended, so a caller that needs one layout
 * utility of its own — the waiting-list row needs `shrink-0`, because its button sits
 * beside a flexible field and must not be squeezed — renders exactly the string it
 * rendered before this component existed.
 */
export function SubmitButton({
  label,
  pending,
  className,
}: {
  label: string;
  pending: string;
  className?: string;
}) {
  const status = useFormStatus();

  return (
    <button
      type="submit"
      disabled={status.pending}
      className={`${className === undefined ? "" : `${className} `}h-11 rounded-lg bg-accent px-5 text-base font-medium text-accent-foreground outline-none transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-70`}
    >
      {status.pending ? pending : label}
    </button>
  );
}
