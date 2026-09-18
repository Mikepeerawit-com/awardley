"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * When the assemble in `globals.css` is over, read off its own clock rather than guessed:
 * the Bid is held back to 1860ms and takes 360ms to arrive. Nothing in the panel may move
 * before that, or it would be telling two stories at once.
 */
const ASSEMBLED_AT = 1860 + 360;

/** One beat every four seconds: four beats, sixteen seconds, and time to read each one. */
const STEP_MS = 4000;

/**
 * The beat the panel keeps, and the number every living thing inside it is a function of —
 * together with the one thing that can end it.
 *
 * `take` is how a living part says *the reader is working this themselves now*; `taken` is
 * that, remembered. The default is the state of a panel with no stage around it — turn
 * zero, nobody having touched anything, and a `take` that goes nowhere — which is what a
 * layout test renders and what the sheet sits at under `prefers-reduced-motion: reduce`.
 */
const PanelBeat = createContext<{ turn: number; taken: boolean; take: () => void }>({
  turn: 0,
  taken: false,
  take: () => {},
});

/**
 * The panel's current turn, whether the reader has taken it over, and the way to say so.
 * The turn is zero until the assemble has finished; it never rewinds, and once `take` has
 * been called it never advances again either.
 */
export function usePanelBeat() {
  return useContext(PanelBeat);
}

/**
 * The product panel's wrapper: the clock the living parts run on, and the switch the
 * ambient loops are wired to.
 *
 * **One clock, because there is one story.** Three things inside the panel happen on the
 * same beat — a supplier re-quotes on the sheet, the light behind the panel lifts because
 * something landed, and once a cycle a Reminder arrives on the phone. Given a timer each
 * they would drift apart over a few minutes and the panel would be telling three stories
 * at slightly wrong times, so the stage counts and they read the count.
 *
 * The first beat waits out the assemble as well as the step, which is the only thing that
 * makes turn 0 different from the rest; after that it is four seconds a beat, scheduled
 * from the last one rather than from an interval, so pausing is a cleared timeout and
 * resuming is a fresh four seconds — never a burst of moves that came due in a background
 * tab.
 *
 * **Stopping.** The capture's pan and the glow's breath are CSS animations, so they need no
 * script to run — what they need a script for is stopping. A loop is the one kind of motion
 * that never ends on its own: left alone it keeps compositing behind a section the reader
 * scrolled past an hour ago, and in a background tab it keeps a phone's GPU awake for a
 * page nobody is looking at. So the stage watches itself and marks `stage-still` whenever
 * the panel is off screen or the tab is hidden, and `globals.css` pauses the animations on
 * that class — paused, not removed, so they resume mid-stroke rather than jumping back to
 * the start. The clock reads the same flag, so the sheet stops where the loops stop.
 *
 * **Yielding.** Stopping for the tab and the scroll position is politeness; stopping for the
 * reader is the point. The beat exists to show the mechanism working on its own, and the
 * moment somebody works it themselves that demonstration is over: a script that keeps
 * re-quoting underneath their hands is the page arguing with them, and a cell that changes
 * while they are reading the total they just made is the one thing that would make the
 * sheet look fake. So `take` is one-way. It is not a pause with a timeout behind it —
 * a beat that came back after ten quiet seconds would be exactly the argument, only later —
 * and the turn freezes where it stood rather than rewinding, because the numbers on screen
 * are the numbers that turn produced.
 *
 * What does *not* stop is the ambience: the capture still pans, the glow still breathes, the
 * edge light still crosses. Those are texture rather than story — nothing in them is a claim
 * about the reader's sheet — and a panel that went utterly rigid the instant it was touched
 * would read as broken, not as attentive. Only the beat yields, and `stage-still` still owns
 * the loops.
 *
 * Under `prefers-reduced-motion: reduce` nothing is created at all: the stylesheet has
 * already taken the animations away, so there is nothing left to pause and no observer
 * worth the listener, and the clock never starts — turn stays 0 and the panel sits at its
 * assembled state.
 *
 * `threshold: 0` matches `components/reveal.tsx` — any part of the panel on screen counts
 * as being looked at, which is the honest reading for something 26rem tall.
 *
 * **`clock={false}` is the same switch without the story.** The page has one other place
 * with an ambient light in it — the one behind the questions above the ask — and it needs
 * exactly the half of this that stops a loop: an observer, the tab's visibility, and the
 * `stage-still` class. What it must not have is a second beat. Two clocks counting
 * different turns is precisely the drift the panel is built to avoid, and a beat nothing
 * reads is a timer waking a phone up for nothing. So the flag skips the counter and the
 * provider keeps handing out turn 0, which is the value every reader of it already treats
 * as *nothing has happened yet*.
 */
export function AmbientStage({
  className,
  clock = true,
  children,
}: {
  className?: string;
  clock?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [still, setStill] = useState(false);
  const [turn, setTurn] = useState(0);
  const [taken, setTaken] = useState(false);

  // Stable, because it is handed down through context: a fresh function each render would
  // remake the provider value on every beat and re-render everything reading it.
  const take = useCallback(() => setTaken(true), []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const node = ref.current;

    if (node === null) return;

    // The two reasons to stop are independent and arrive from different places, so they are
    // read together each time rather than kept as two pieces of state that can disagree.
    let onScreen = true;

    const sync = () => setStill(!onScreen || document.hidden);

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );

    observer.observe(node);
    document.addEventListener("visibilitychange", sync);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    // Read here as well as in the observer, because `still` is only ever set by an observer
    // that reduced motion stops us from creating — left to that flag alone the clock would
    // run happily for a reader who asked for none of this.
    if (!clock) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (still) return;

    // The one stop that has no matching start: cleared here, the timeout is never scheduled
    // again, because nothing sets `taken` back.
    if (taken) return;

    const id = setTimeout(
      () => setTurn((current) => current + 1),
      turn === 0 ? ASSEMBLED_AT + STEP_MS : STEP_MS,
    );

    return () => clearTimeout(id);
  }, [clock, still, taken, turn]);

  // Held together rather than written inline, so a render that changed none of the three
  // hands the same object back and the parts reading it are not re-rendered for nothing.
  const beat = useMemo(() => ({ turn, taken, take }), [turn, taken, take]);

  return (
    <div ref={ref} className={[className, still ? "stage-still" : null].filter(Boolean).join(" ")}>
      <PanelBeat.Provider value={beat}>{children}</PanelBeat.Provider>
    </div>
  );
}
