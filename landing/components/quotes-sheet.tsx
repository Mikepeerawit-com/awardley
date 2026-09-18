"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { usePanelBeat } from "@/components/ambient-stage";
import { CheckIcon } from "@/components/icons";

/**
 * Grouped and two-placed, written out rather than left to `toLocaleString`: the sheet is
 * one currency in one format, and a locale that grouped by four or swapped the separators
 * would stop the column lining up under itself.
 */
function money(amount: number): string {
  return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

/**
 * Four Items down, three suppliers across, and the amounts the sheet opens on.
 *
 * The amounts live here rather than in `messages/`, because they are the same numerals in
 * both locales and because the Bid has to be the sum of the four selected cells — a total
 * translated separately from its addends is a total that will eventually be wrong. The
 * names of the things are copy and do live in `messages/`, item names included.
 *
 * Which Quote is chosen is **derived rather than declared**: it is the lowest in the row,
 * which is the rule the product actually applies, and a hand-written index would be a
 * second opinion about the same four numbers the moment one of them changes.
 */
const ROWS = [
  { key: "gloves", quotes: [1840, 1795, 1910] },
  { key: "masks", quotes: [4250, 4480, 4390] },
  { key: "infusion", quotes: [1170, 1215, 1140] },
  { key: "thermometer", quotes: [3600, 3480, 3720] },
] as const;

/**
 * The sheet's working day, as four moves on a sixteen-second loop.
 *
 * Each move is one supplier re-quoting one Item, which is the only event this screen has;
 * the row then recounts its lowest and the Bid follows, because that is what the product
 * does with a new quote. Two of the four are undercuts and two put the earlier price back —
 * a quote that lapses and is restated at the old number is an ordinary Tuesday in a tender,
 * and it is also what closes the loop: by the fourth move the sheet is exactly where it
 * started, so the cycle has no seam and no rewind.
 */
const SCRIPT = [
  { row: 0, column: 2, amount: 1780 },
  { row: 1, column: 1, amount: 4180 },
  { row: 0, column: 2, amount: 1910 },
  { row: 1, column: 1, amount: 4480 },
] as const;

/** Three suppliers across, which is the width the arrow keys stop at. */
const COLUMNS = ROWS[0].quotes.length;

/**
 * Where each key that moves the tab stop moves it to, from the cell that has it.
 *
 * The grid pattern, and nothing invented for this sheet: left/right along the suppliers,
 * up/down along the Items, `Home`/`End` to the ends of the row. Nothing wraps — a reader
 * holding an arrow against the edge stays on the cell they can see rather than being
 * thrown to the far side of the row, which is what `clamp` below is for.
 */
const STEPS: Record<string, (row: number, column: number) => [number, number]> = {
  ArrowRight: (row, column) => [row, column + 1],
  ArrowLeft: (row, column) => [row, column - 1],
  ArrowDown: (row, column) => [row + 1, column],
  ArrowUp: (row, column) => [row - 1, column],
  Home: (row) => [row, 0],
  End: (row) => [row, COLUMNS - 1],
};

function clamp(index: number, count: number): number {
  return Math.min(Math.max(index, 0), count - 1);
}

/** The amounts after `turn` moves, and the turn each cell last changed on. */
function sheetAfter(turn: number) {
  // Widened off the `as const` literals on purpose: these are the amounts *now*, and a
  // tuple typed to the four opening numbers cannot hold a quote that has since changed.
  const quotes: number[][] = ROWS.map((row) => [...row.quotes]);

  for (let step = 1; step <= turn; step += 1) {
    const move = SCRIPT[(step - 1) % SCRIPT.length];

    quotes[move.row][move.column] = move.amount;
  }

  return quotes;
}

/** The chosen Quote: the lowest in the row, and the first of them if two ever tie. */
function chosenIn(amounts: number[]): number {
  return amounts.indexOf(Math.min(...amounts));
}

/**
 * The turn the cell at `row`/`column` last changed on, or 0 if it has not yet. It is a walk
 * back over the script rather than a record kept in state, because the script is fixed and
 * the cycle is closed: the answer is always within the last four turns.
 */
function changedAt(row: number, column: number, turn: number): number {
  for (let step = turn; step > 0 && step > turn - SCRIPT.length; step -= 1) {
    const move = SCRIPT[(step - 1) % SCRIPT.length];

    if (move.row === row && move.column === column) return step;
  }

  return 0;
}

/**
 * The Quotes sheet: the page's one piece of storytelling, and the only thing on it that
 * keeps working after the page has settled.
 *
 * It opens exactly as it always has — the twelve amounts arrive a supplier at a time, the
 * four lowest take the wash and a tick that draws itself, the Bid lands last, all of it
 * delay-driven in `globals.css` and over before the panel's first beat. What the beats then
 * run is not a decoration: a supplier re-quotes, the row's answer moves if the new number
 * is lower, and the Bid recounts. Everything the loop uses — `quote-arrive`,
 * `quote-choose`, `tick-draw` — is the assemble's own vocabulary with the stagger taken
 * out, so the sheet never learns a second gesture.
 *
 * **A cell is replayed by being remounted**, under a key carrying the turn it changed on.
 * Restarting a finished CSS animation on a live node means removing a class, forcing a
 * reflow and putting it back; a new node simply plays it, and the key is honest about why
 * it is a new node — the number in it is a different quote.
 *
 * **It keeps no clock of its own.** The turn comes from {@link usePanelBeat}, because the
 * sheet is not the only thing in the panel that moves on it — the light behind the panel
 * lifts when a quote lands, and the phone beside it takes a Reminder once a cycle. The
 * stage owns the timer, the off-screen and hidden-tab switches, and the reduced-motion
 * guard; the sheet is a pure function of the number it is handed, which under
 * `prefers-reduced-motion: reduce` is 0 forever.
 *
 * Rows the script never touches stay exactly as the assemble left them, animations and all,
 * rather than being re-rendered into the living grammar to no visible end.
 *
 * **And the reader can work it.** Every amount is a control: click one and it becomes that
 * row's answer, the wash and the tick cross to it, and the Bid recounts — which is the whole
 * of what the product does, shown by being done rather than described in another paragraph
 * of copy. Nothing new is drawn for it. A pick plays the same `quote-choose` crossing the
 * script plays, forwards on the cell that wins and backwards on the cell that loses, and
 * `quote-refresh` is deliberately *not* replayed: the number did not change, only which one
 * is the answer, and re-arriving a figure that is still the same figure would say something
 * untrue about it.
 *
 * **The amounts are buttons, not clickable cells.** A `<td>` with an `onClick` is a lie told
 * to everyone not using a mouse: no tab stop, no Enter, no role, nothing for a screen reader
 * to announce and nothing for it to announce the state of. So the cell's padding moves onto
 * a real `<button>` that fills it — 44px tall, the site's tap floor — and the state it is
 * in is `aria-pressed`, which is what a control that is either the chosen one or not
 * actually is. The floor is a minimum and not a target: from `lg`, where the sheet is a
 * hero panel read at arm's length rather than a table under a thumb, the rows take 56px
 * and the header and Bid rows follow. That is also what closes the panel's bottom — a
 * sheet sitting at its phone-sized minimum left the card half empty under it. That also retires the visually-hidden *Selected*: the same fact said twice,
 * once as text and once as state, is one of them read out at the wrong moment. The button's
 * visible text is a bare number and three columns of bare numbers are indistinguishable by
 * name, so each carries an `aria-label` naming the supplier and the Item it belongs to.
 *
 * **And it is one stop on the way to the form, not twelve.** Twelve operable cells sitting
 * between the hero and the page's only real ask — on a sheet the page itself labels
 * *Example data*, whose buttons change nothing outside it — is a tax charged to exactly the
 * readers least able to afford it. So the sheet takes the grid pattern: a roving
 * `tabindex`, one cell at `0` and the other eleven at `-1`, and the arrow keys inside. Tab
 * reaches the sheet once and leaves it once; the cells stay real buttons with their
 * `aria-pressed` and their labels, because the answer to twelve tab stops is not making the
 * sheet less operable.
 *
 * **Taking a pick takes the sheet.** The first click calls `take` on the stage and the beat
 * stops for good — the reasoning is in `components/ambient-stage.tsx`, and it is why a pick
 * never has to be reconciled with a script move arriving underneath it. An arrow key takes
 * it for the same reason and one further one: a cell is replayed by being remounted, and a
 * script move landing on the cell a keyboard reader is standing on would take the focus
 * with it. Which is why arrowing takes the sheet but merely *focusing* it does not — the
 * tab stop rests on the top-left cell, which the script never touches, so a reader tabbing
 * past the sheet on their way down the page does not silently kill the loop.
 */
export function QuotesSheet() {
  const t = useTranslations("sheet");
  const { turn, take } = usePanelBeat();

  /**
   * The rows the reader has answered for themselves, `null` where the script's own rule —
   * the lowest in the row — still holds. Kept as an override rather than as a copy of the
   * twelve amounts, so a row nobody has touched keeps deriving its answer and there is
   * never a second opinion about the same numbers sitting in state going stale.
   *
   * `from` is the index that was the answer immediately before the pick, remembered because
   * the losing cell has to play the crossing backwards and nothing else on the next render
   * can say which cell lost: `previous` is the sheet a *turn* ago, and a pick is not a turn.
   */
  const [picks, setPicks] = useState<({ index: number; from: number } | null)[]>(() =>
    ROWS.map(() => null),
  );

  const quotes = sheetAfter(turn);
  const previous = sheetAfter(turn - 1);
  const chosenAt = (position: number) => picks[position]?.index ?? chosenIn(quotes[position]);
  const bid = quotes.reduce((total, amounts, position) => total + amounts[chosenAt(position)], 0);
  const suppliers = [t("supplierA"), t("supplierB"), t("supplierC")];

  // Whether the reader has picked anywhere at all. The Bid reads it as well as the turn,
  // because a pick before the first beat still makes the total a *recount* rather than the
  // sheet's first arrival — see the footer.
  const touched = picks.some((pick) => pick !== null);

  /**
   * The cell holding the sheet's one tab stop, as `[row, column]`. It follows the focus
   * rather than being driven by it, so a click, a pick and an arrow key all leave the stop
   * where the reader last was, and shift-tabbing back into the sheet returns them there.
   */
  const [active, setActive] = useState<[number, number]>([0, 0]);

  /**
   * The sheet itself, which is how an arrow key finds the cell it is moving to. A ref on
   * the table rather than on the twelve cells: a cell is a *new node* every time its number
   * changes, so a map of the twelve would need keeping in step with the remounts, while the
   * table is mounted once and already knows where its own buttons are.
   */
  const sheet = useRef<HTMLTableElement>(null);

  const move = (event: React.KeyboardEvent<HTMLButtonElement>, row: number, column: number) => {
    const step = STEPS[event.key];

    if (step === undefined) return;

    // Before anything else: an arrow inside the sheet is the reader working it, and the
    // page must not also scroll under them while they do. Before the clamp, too, and for
    // the same reason `choose` takes the sheet on a pick that changes nothing: an arrow
    // held against the outer column is still a reader working this themselves.
    event.preventDefault();
    take();

    const [toRow, toColumn] = step(row, column);

    sheet.current
      ?.querySelector<HTMLButtonElement>(
        `[data-row="${clamp(toRow, ROWS.length)}"][data-column="${clamp(toColumn, COLUMNS)}"]`,
      )
      ?.focus();
  };

  const choose = (position: number, index: number, current: number) => {
    // Always, even on the cell that is already the answer: the reader has still taken the
    // sheet over, and finding out that it was already the lowest is a legitimate thing to
    // click for. What that click must not do is replay an animation to say nothing changed.
    take();

    // As well as through `onFocus`, which Safari does not fire for a click on a `<button>`:
    // the reader who picks with the mouse and then reaches for Tab should find the stop
    // where they last worked, on every browser.
    setActive([position, index]);

    if (index === current) return;

    setPicks((rows) =>
      rows.map((pick, row) => (row === position ? { index, from: current } : pick)),
    );
  };

  return (
    <table ref={sheet} className="w-full border-collapse text-left tabular-nums">
      <caption className="sr-only">{t("caption")}</caption>

      <thead className="bg-card">
        <tr>
          <th
            scope="col"
            className="border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground lg:py-3.5"
          >
            {t("item")}
          </th>

          {suppliers.map((supplier) => (
            <th
              key={supplier}
              scope="col"
              className="border-b border-border px-3 py-2.5 text-right text-xs font-medium text-muted-foreground lg:py-3.5"
            >
              {supplier}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {ROWS.map((row, position) => {
          const amounts = quotes[position];
          const pick = picks[position];
          const chosen = chosenAt(position);
          const wasChosen = pick ? pick.from : chosenIn(previous[position]);

          // A row is living once the script has touched it, or once the reader has. Without
          // the second half a pick in one of the two rows the script never visits would be
          // drawn with the assemble's stagger classes — the crossing would wait out a
          // `--row` delay it has no business having, and the wash would never arrive.
          const living =
            (turn > 0 && SCRIPT.some((move) => move.row === position)) || pick !== null;

          return (
            <tr key={row.key} className={position === 0 ? undefined : "border-t border-border"}>
              <th scope="row" className="px-4 py-2.5 text-sm font-normal lg:py-4">
                {t(`rows.${row.key}`)}
              </th>

              {amounts.map((amount, index) => {
                const isChosen = index === chosen;
                const changed = changedAt(position, index, turn) === turn && turn > 0;

                const motion = !living
                  ? // The assemble, unchanged: the supplier stagger, and the crossing into
                    // the wash for the four cells that are the answer.
                    isChosen
                    ? "quote-cell quote-cell-chosen"
                    : "quote-cell"
                  : [
                      changed ? "quote-refresh" : null,
                      // The wash is animated on only when the answer has actually moved to
                      // this cell; a cell that was already the answer is simply still it.
                      isChosen && index !== wasChosen ? "quote-choose-live" : null,
                      !isChosen && index === wasChosen ? "quote-unchoose" : null,
                    ]
                      .filter(Boolean)
                      .join(" ");

                // Living cells carry the chosen treatment as ordinary classes; the keyframe
                // is only the crossing into it. During the assemble the keyframe's fill is
                // the treatment, which is why those cells stay muted in their class list.
                const tone =
                  living && isChosen
                    ? "bg-accent-wash font-medium text-foreground"
                    : "text-muted-foreground";

                return (
                  <td
                    // The turn the number last changed on, so a re-quote is a new node and
                    // `quote-arrive` plays for it without a class being cycled.
                    key={`${index}-${changedAt(position, index, turn)}`}
                    // `--row` inherits from here to the tick inside, which draws itself on
                    // the same beat as the cell it is announcing.
                    style={{ "--col": index, "--row": position } as React.CSSProperties}
                    // The padding has moved onto the button, so that the 44px target is the
                    // whole cell rather than a word inside one. The cell keeps the motion
                    // and the tone, because those are what the keyframes animate.
                    className={`${motion} text-right text-sm ${tone}`}
                  >
                    {/*
                      Colour and nothing else on hover, over 150ms: a shadow is forbidden on
                      a control here, a second easing is forbidden anywhere, and something
                      that moved under the pointer would be twelve cells jostling in a table
                      whose whole point is that its columns line up. The chosen cell is left
                      out of it — it is already on the wash, and lightening the answer when
                      the pointer crosses it would read as it being about to stop being one.
                      The two properties are named rather than taken as `transition-colors`,
                      which sweeps up `outline-color` as well and would fade the focus ring
                      up over the same 150ms — a ring that arrives late on a reader who has
                      already moved.

                      The focus ring is the site's own — solid accent, 2px — turned *inwards*.
                      The sheet sits in an `overflow-hidden` frame and the button fills its
                      cell edge to edge, so the base rule's outward 2px would be drawn over
                      the neighbouring amount and clipped off entirely down the outer column:
                      a ring the reader loses on exactly the cells at the edge. Inside the
                      button it lands on the cell's own ground, which at full strength clears
                      3:1 against the `accent-wash` as readily as against the page.
                    */}
                    <button
                      type="button"
                      aria-pressed={isChosen}
                      // Three columns of bare numerals are one accessible name repeated
                      // twelve times; the supplier and the Item are what tell them apart.
                      aria-label={t("choose", {
                        supplier: suppliers[index],
                        item: t(`rows.${row.key}`),
                      })}
                      onClick={() => choose(position, index, chosen)}
                      onKeyDown={(event) => move(event, position, index)}
                      onFocus={() =>
                        setActive((current) =>
                          current[0] === position && current[1] === index
                            ? current
                            : [position, index],
                        )
                      }
                      // The sheet's one tab stop, and the eleven cells reached by arrow.
                      tabIndex={position === active[0] && index === active[1] ? 0 : -1}
                      data-row={position}
                      data-column={index}
                      className={`flex min-h-11 w-full cursor-pointer items-center justify-end gap-1.5 px-3 py-2.5 text-right transition-[color,background-color] duration-150 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 lg:min-h-14 ${
                        isChosen ? "" : "hover:bg-card hover:text-foreground"
                      }`}
                    >
                      {isChosen ? (
                        <CheckIcon
                          className={`${living ? "tick-draw-live" : "tick-draw"} h-3.5 w-3.5 shrink-0 text-accent`}
                        />
                      ) : null}

                      {money(amount)}
                    </button>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>

      <tfoot>
        <tr className="border-t border-border">
          <th scope="row" className="px-4 py-3 text-sm font-semibold lg:py-4.5">
            {t("bid")}
          </th>

          {/*
            The Bid is the one number on the sheet that is derived rather than quoted, so it
            is the last thing to appear: `.bid-arrive` in `globals.css` holds it back to
            1860ms, 60ms after the last tick has finished drawing at 1800ms. It *arrives*
            rather than counts, and it arrives again — keyed on its own value — each time a
            new quote changes what the four chosen cells add up to, because a total that did
            not move when its addends did would be the one dishonest number on the page.

            It follows a *pick* for the same reason, which is why `touched` is read here
            beside the turn: a reader can answer a row inside the six seconds before the
            first beat, and `bid-arrive` holds its figure back to 1860ms — the right pause
            for a total the sheet is assembling, and almost two seconds of nothing at all
            for one the reader has just changed by hand.
          */}
          <td colSpan={3} className="px-3 py-3 text-right text-sm font-semibold lg:py-4.5">
            <span key={bid} className={turn > 0 || touched ? "quote-refresh" : "bid-arrive"}>
              {t("currency")} {money(bid)}
            </span>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
