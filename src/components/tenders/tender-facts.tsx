import { useFormatter, useTranslations } from "next-intl";

import { deadlineReading } from "@/components/tenders/deadline-reading";
import { IndicatorLamp, toneTextClass } from "@/components/ui/indicator-lamp";
import {
  calendarDate,
  calendarDateFormat,
  daysBetween,
  instantDayFormat,
} from "@/lib/calendar-date";
import { deadlineTone, type DeadlineKind } from "@/lib/tenders/progress";
import type { Tender } from "@/lib/tenders/tenders";

/**
 * The Tender's own facts — **split in two, because they are not one kind of thing.**
 *
 * They were a single six-cell grid sitting between the header and the working sheet, and
 * every cell in it was drawn at the same weight: the owner's name, the day it arrived,
 * two deadlines, a decision date and whatever somebody typed in the notes. Two of those
 * six are the reason a reader opens this screen with any urgency and the other four are
 * reference — looked up once, or never — and the flat grid said they were equals.
 *
 * So {@link TenderDeadlines} is drawn at the top of the screen and states the two dates
 * *as a reading rather than as a value*, and {@link TenderFacts} is what is left, behind
 * a fold. Nothing has been taken off the screen; what changed is what is in front of the
 * work and what is one tap behind it.
 *
 * Rendered on the server and sync rather than `async`, for the reason the rest of this
 * seam is: an `async` Server Component cannot be reached from a browser test, and #56 was
 * what that cost. `screens.layout.test.tsx` measures the detail screen through this.
 */

/**
 * The two dates the Tender turns on, each with the lamp and the sentence the worklist row
 * already gives it.
 *
 * **The wording is the list's, to the key.** Both lines read off
 * `tenders.row.due.<kind>.*` through {@link deadlineReading}, which is the same four
 * readings the tender row and My work's rows say — so "Quotes due tomorrow" means
 * tomorrow on all three screens and there is no second ladder to drift. That is also why
 * this file adds no message keys of its own for the sentences: a fifth reading invented
 * here would be a fifth reading only this screen has.
 *
 * **Why the detail states both and the list states one.** A row on the worklist has one
 * line to spend and `rowStatus` picks the deadline worth naming; this screen has the room
 * and the reader is here to act on the Tender rather than to scan past it. Seeing that
 * quotes are due Tuesday *and* the bid is due a fortnight later is the shape of the job,
 * and the list can only ever show half of it.
 *
 * **Once the Bid is out, neither date is left.** Both deadlines are spent and what
 * remains is a person to chase, which is what `tenders.row.awaitingDecision` says — the
 * same sentence, off the same key, that a `submitted` row carries on the list. A Tender
 * whose Items have all been decided says nothing here at all: the dates are history and
 * the Outcome section below is the screen's subject by then.
 */
export function TenderDeadlines({
  tender,
  today,
  timezone,
  decided,
}: {
  tender: Tender;
  /**
   * The day it is **in the org's timezone**, resolved by the page from an injected
   * instant (ADR-0010). Never `new Date()` here: Vercel runs UTC and a server-local
   * boundary would turn this strip urgent seven hours early for everybody in Bangkok.
   */
  today: string;
  /** The org's, for dating the instant the Bid went out. */
  timezone: string;
  /** Every Item has an Outcome — there is nothing left for a date to be about. */
  decided: boolean;
}) {
  const t = useTranslations("tenders");
  const format = useFormatter();

  if (decided) return null;

  if (tender.submittedAt !== null) {
    return (
      <Strip>
        <Reading
          tone="calm"
          text={t("row.awaitingDecision", {
            date: format.dateTime(
              new Date(tender.submittedAt),
              instantDayFormat(timezone),
            ),
          })}
        />
      </Strip>
    );
  }

  return (
    <Strip>
      <Deadline kind="internal_quote" date={tender.internalQuoteDeadline} today={today} />
      <Deadline
        kind="client_submission"
        date={tender.clientSubmissionDeadline}
        today={today}
      />
    </Strip>
  );
}

/**
 * The band both readings sit in.
 *
 * A wrapping row rather than a grid: two readings side by side where there is room, one
 * above the other on a phone, and no breakpoint of its own to keep in step with anything.
 */
function Strip({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-hairline bg-card flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border px-4 py-3">
      {children}
    </div>
  );
}

function Deadline({
  kind,
  date,
  today,
}: {
  kind: DeadlineKind;
  date: string;
  today: string;
}) {
  const t = useTranslations("tenders");
  const format = useFormatter();
  const days = daysBetween(today, date);

  return (
    <Reading
      tone={deadlineTone(days)}
      text={t(`row.due.${kind}.${deadlineReading(days)}`, {
        date: format.dateTime(calendarDate(date), calendarDateFormat),
      })}
    />
  );
}

/**
 * One lamp and one sentence — the device the whole app is remembered by, at the size the
 * rows draw it.
 *
 * `min-w-0` and `break-words` for the reason every text-bearing child on this screen
 * carries them: a formatted date is short, but the reading around it is translated and a
 * `zh-Hans` line has no spaces to break at.
 */
function Reading({
  tone,
  text,
}: {
  tone: ReturnType<typeof deadlineTone>;
  text: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-[13px]">
      <IndicatorLamp tone={tone} />
      <span className={`min-w-0 break-words ${toneTextClass(tone)}`}>{text}</span>
    </span>
  );
}

/**
 * What is left once the two deadlines are drawn above: the reference facts, behind a
 * fold.
 *
 * Four cells rather than six, and the two that left are the two that were worth the space
 * they took. Nothing here is urgent and nothing here is acted on — it is what a reader
 * checks when they have a reason to, which is the definition {@link Fold} exists for.
 *
 * `notes` is the one that can be any length — it is free text somebody typed — so the
 * grid cell holding it is the one that needs `min-w-0` and `break-words`. The dates
 * cannot overflow and the owner's name is short, but they cost nothing to hold the same
 * way and the alternative is a rule that applies to one cell in four.
 */
export function TenderFacts({ tender }: { tender: Tender }) {
  const t = useTranslations("tenders");
  const format = useFormatter();
  const day = (value: string) =>
    format.dateTime(calendarDate(value), calendarDateFormat);

  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Fact label={t("owner")} value={tender.ownerName} />
      <Fact label={t("dateReceived")} value={day(tender.dateReceived)} />
      <Fact
        label={t("expectedDecisionDate")}
        value={
          tender.expectedDecisionDate ? day(tender.expectedDecisionDate) : t("notSet")
        }
      />
      <Fact label={t("notes")} value={tender.notes ?? t("notSet")} />
    </dl>
  );
}

/**
 * One fact.
 *
 * The label is `.field-label` rather than `text-xs`, which is the class the rest of the
 * app labels a value with and is held to a contrast floor on every surface it is drawn on
 * — see the note on `--ink-faint` in `globals.css`. It was the one thing on this grid
 * spelling its own label style.
 */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="field-label break-words">{label}</dt>
      <dd className="text-sm break-words">{value}</dd>
    </div>
  );
}
