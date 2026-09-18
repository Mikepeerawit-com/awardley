"use client";

import { usePanelBeat } from "@/components/ambient-stage";

/**
 * The light behind the product panel: a slow breath, and a lift each time a quote lands.
 *
 * A blurred radial wash with an offset, not a halo drawn at zero offset around the frame.
 * A glow that traces the shape it sits behind is decoration; this one is a source above and
 * behind, which is why the panel has a top and a bottom.
 *
 * **Two elements, because there are two kinds of motion and they must not interrupt each
 * other.** The outer one drifts — 4% sideways and a breath of opacity over 18s, continuous,
 * `--ease-drift`, the ambient half. The inner one carries the gradient and is remounted on
 * every beat so that `glow-beat` plays for it without a class being cycled: that is an
 * event, it takes `--ease-rise`, and it says *something just happened on the sheet*. Nested
 * this way round the drift is never remounted, so an 18s breath is not restarted every four
 * seconds; opacity and transform simply compose down the pair.
 *
 * Before the first beat there is no lift at all — a page that has only just loaded has had
 * nothing happen to it yet — which is also the state a reader who asked for reduced motion
 * stays in, since the stage never advances the turn for them.
 */
export function PanelGlow() {
  const { turn } = usePanelBeat();

  return (
    <div
      aria-hidden="true"
      className="glow-drift pointer-events-none absolute -top-28 inset-x-0 h-80"
    >
      <div
        key={turn}
        className={`${turn > 0 ? "glow-beat " : ""}h-full rounded-[50%] bg-[radial-gradient(closest-side,var(--glow),transparent)] blur-xl`}
      />
    </div>
  );
}
