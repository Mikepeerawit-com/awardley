import { useTranslations } from "next-intl";

import { Footer } from "@/components/footer";
import { CheckIcon } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";
import { WaitingListForm } from "@/components/waiting-list-form";

/**
 * The home page: a bar, a centred headline, the product itself, how it works, who it is
 * for, and the one form on the site.
 *
 * **Trust before persuasion.** The page has no logos, no customer count and no
 * testimonial, because there are no customers yet and inventing the furniture of proof
 * is the one thing a closed beta cannot afford to be caught doing. What fills that slot
 * instead is true and checkable: three facts under the hero, a real capture of the app
 * on a phone, and an example Quotes sheet that says on its face that it is an example.
 *
 * **No pricing anywhere**, which is a decision rather than an omission — the beta is
 * invite-only, and a price on a page nobody can buy from invites an argument about a
 * number that is not settled (ADR-0035).
 *
 * **One ground and one accent.** Every section is told apart by a hairline rather than
 * by a change of colour, so the only saturated thing above the fold is the button, and
 * the eye has nowhere else to go. The indigo appears three more times — behind the
 * product panel as a wash of light, on the selected Quotes in the example sheet, and in
 * the focus ring — and at no point as a stripe.
 *
 * **Why this is a component and `app/page.tsx` is three lines.** Every screen in the app
 * is an `async` Server Component and none of them is reachable from a browser test; what
 * *is* reachable is the sync presentational seam they hand their data to, which is why
 * the app's 390px guard measures components rather than pages. This site has the same
 * problem for the same reason — `getTranslations` is async — and takes the same answer.
 * `useTranslations` reads the provider rather than the request, so every part below
 * renders unchanged on the server and inside `test/home.layout.test.tsx`.
 */
export function HomeContent() {
  return (
    <>
      <SiteHeader onHome />

      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <WhoItIsFor />
        <ClosedBeta />
      </main>

      <Footer />
    </>
  );
}

/**
 * The sentence, the two doors, and the product directly under them.
 *
 * Centred rather than the two-column split this replaces. A sentence and a screenshot
 * side by side makes the reader choose which to look at first and gives the headline
 * half a measure to say itself in; stacked, the headline gets the full width of the page
 * to be read across and the product gets the full width to be looked at, and the order
 * is no longer a matter of which side of the page the reader starts on.
 *
 * The four things above the panel, and then the panel, arrive on a stagger (`rise-*`). It is opacity and 12px
 * of lift, it is over in under half a second, and `prefers-reduced-motion: reduce` in
 * `globals.css` collapses all of it. Nothing below this section animates: one authored
 * moment beats the same entrance repeated at every scroll position.
 */
function Hero() {
  const t = useTranslations("hero");
  const facts = ["bilingual", "reminders", "phone"] as const;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-landmark md:px-8 lg:pt-[4.5rem]">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-group text-center">
        <h1 className="rise rise-1 type-display text-balance">{t("headline")}</h1>

        <p className="rise rise-2 max-w-[56ch] text-lg text-pretty text-muted-foreground md:text-xl">
          {t("sub")}
        </p>

        <div className="rise rise-3 flex flex-wrap items-center justify-center gap-field">
          {/*
            The id is what the bar's own copy of this button watches: while this one is on
            screen the bar does not draw one, so the first viewport has exactly one primary
            action in it. See `components/header-cta.tsx`.
          */}
          <a
            id="hero-cta"
            href="#waiting-list"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-5 text-base font-medium text-accent-foreground transition-opacity duration-200 hover:opacity-90"
          >
            {t("cta")}
          </a>

          {/*
            Ghost rather than a second filled button. Somebody who already holds an Invite
            needs the door and nobody else can use it, so it has to be findable and must
            not compete with the one thing this page is actually for.
          */}
          <a
            href="https://app.awardley.com/login"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-5 text-base font-medium transition-colors duration-200 hover:bg-card"
          >
            {t("secondary")}
          </a>
        </div>

        {/*
          The proof slot, and everything in it is checkable today. A Trust & Authority
          page puts logos or numbers here; we have neither, and three true facts about
          what the product is beat three borrowed ones about who else uses it. Set as one
          quiet line rather than as a ticked list, because a tick implies a comparison
          against something that does not have the thing.
        */}
        <ul className="rise rise-4 flex flex-col items-center justify-center gap-y-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-3">
          {facts.map((fact, index) => (
            <li key={fact} className="flex items-center gap-3 whitespace-nowrap">
              {index > 0 ? (
                <span aria-hidden="true" className="hidden text-muted-foreground/45 sm:inline">
                  ·
                </span>
              ) : null}

              {t(`facts.${fact}`)}
            </li>
          ))}
        </ul>
      </div>

      <ProductPanel alt={t("screenshotAlt")} />
    </section>
  );
}

/**
 * The product, framed and cropped, with the sheet it is a phone-sized view of.
 *
 * The panel is a fixed height and the capture hangs off the bottom of it on purpose: a
 * phone shown whole and centred reads as an asset dropped onto a page, while one cut off
 * by its frame reads as a screen you are looking into — and the part worth seeing is the
 * top of it.
 *
 * Beside it, the Quotes sheet as HTML rather than as a second raster. It is the one
 * screen a phone capture cannot show — the comparison is a desk job — and rendering it
 * means it is real text at the reader's own size, in the reader's own language, with
 * tabular numerals that line up, on a page that has no second image to download.
 *
 * The light behind the panel is a blurred radial wash with an offset, not a halo drawn
 * at zero offset around the frame. A glow that traces the shape it sits behind is
 * decoration; this one is a source above and behind, which is why the panel has a top
 * and a bottom.
 */
function ProductPanel({ alt }: { alt: string }) {
  const t = useTranslations("sheet");

  return (
    <div className="rise rise-5 relative mt-landmark lg:mt-[3.5rem]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 inset-x-0 h-80 rounded-[50%] bg-[radial-gradient(closest-side,var(--glow),transparent)] blur-xl"
      />

      <div className="relative h-[26rem] overflow-hidden rounded-2xl border border-border bg-card lg:h-[32rem]">
        {/*
          Said out loud rather than in the alt text. The sheet is synthetic and the
          screenshot is seeded, and a page whose whole argument is that it does not invent
          proof has to label the one thing on it that could be mistaken for a customer's
          numbers.
        */}
        <p className="type-quiet absolute top-4 right-4 z-10">{t("example")}</p>

        <div className="grid h-full lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/*
            The slot for the product screenshot, at the aspect ratio of the phone the app
            is designed against, cropped to a whole element (390 × 767). The file in
            `public/` is a real capture,
            English, from local seed data with fictional names, refreshed by hand when the
            screen changes.

            A plain `<img>` rather than `next/image`: one image, known size, above the
            fold, and no optimiser worth a dependency on how the file is replaced.
          */}
          <div className="flex min-w-0 justify-center">
            <div className="w-[min(70%,280px)] translate-y-12 overflow-hidden rounded-[2rem] border-[6px] border-device-edge shadow-[0_28px_60px_-24px_rgb(0_0_0/0.45)] lg:translate-y-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/screenshot-tender.png"
                alt={alt}
                width={390}
                height={767}
                loading="eager"
                fetchPriority="high"
                className="block h-auto w-full"
              />
            </div>
          </div>

          {/*
            The sheet gets a frame of its own, on the page's ground inside the panel's
            card. Set as bare text it read as the page having written a table; framed, it
            reads as the surface the phone beside it is a narrow view of — which is the
            whole claim the panel is making.
          */}
          <div className="hidden min-w-0 flex-col justify-center py-8 pr-8 lg:flex">
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <QuotesSheet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Four Items down, three suppliers across, one Quote selected per Item, and the Bid those
 * four add up to.
 *
 * The amounts live here rather than in `messages/`, because they are the same numerals in
 * both locales and because the Bid has to be the sum of the four selected cells — a total
 * translated separately from its addends is a total that will eventually be wrong. The
 * names of the things are copy and do live in `messages/`, item names included.
 *
 * The tick is not the only thing saying which Quote was chosen: the cell carries a wash,
 * the tick carries a visually-hidden *Selected*, and a screen reader reading the row
 * hears the word rather than a colour it cannot see.
 */
function QuotesSheet() {
  const t = useTranslations("sheet");

  const rows = [
    { key: "gloves", quotes: [1840, 1795, 1910], selected: 1 },
    { key: "masks", quotes: [4250, 4480, 4390], selected: 0 },
    { key: "infusion", quotes: [1170, 1215, 1140], selected: 2 },
    { key: "thermometer", quotes: [3600, 3480, 3720], selected: 1 },
  ] as const;

  const bid = rows.reduce((total, row) => total + row.quotes[row.selected], 0);
  const suppliers = [t("supplierA"), t("supplierB"), t("supplierC")];

  return (
    <table className="w-full border-collapse text-left tabular-nums">
      <caption className="sr-only">{t("caption")}</caption>

      <thead className="bg-card">
        <tr>
          <th
            scope="col"
            className="border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground"
          >
            {t("item")}
          </th>

          {suppliers.map((supplier) => (
            <th
              key={supplier}
              scope="col"
              className="border-b border-border px-3 py-2.5 text-right text-xs font-medium text-muted-foreground"
            >
              {supplier}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.map((row, position) => (
          <tr key={row.key} className={position === 0 ? undefined : "border-t border-border"}>
            <th scope="row" className="px-4 py-2.5 text-sm font-normal">
              {t(`rows.${row.key}`)}
            </th>

            {row.quotes.map((amount, index) =>
              index === row.selected ? (
                <td
                  key={index}
                  className="bg-accent-wash px-3 py-2.5 text-right text-sm font-medium"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <CheckIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
                    <span className="sr-only">{t("selected")}</span>
                    {money(amount)}
                  </span>
                </td>
              ) : (
                <td
                  key={index}
                  className="px-3 py-2.5 text-right text-sm text-muted-foreground"
                >
                  {money(amount)}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>

      <tfoot>
        <tr className="border-t border-border">
          <th scope="row" className="px-4 py-3 text-sm font-semibold">
            {t("bid")}
          </th>

          <td colSpan={3} className="px-3 py-3 text-right text-sm font-semibold">
            {t("currency")} {money(bid)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

/**
 * Grouped and two-placed, written out rather than left to `toLocaleString`: the sheet is
 * one currency in one format, and a locale that grouped by four or swapped the separators
 * would stop the column lining up under itself.
 */
function money(amount: number): string {
  return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

/**
 * The three beats, as columns under a rule.
 *
 * Not cards: a card with its own hairline and its own icon reads as one of a set of three
 * things you could pick between, and these are three parts of one mechanism in the order
 * they happen. Not numbered either — the order is in the sentences, and 01 / 02 / 03 over
 * a three-item list is a label for something the reader can already see. And no icons
 * either: a document, a grid and a bell over three paragraphs illustrate the nouns rather
 * than the mechanism, and the rule is already saying where each column starts.
 */
function HowItWorks() {
  const t = useTranslations("how");
  const tBeats = useTranslations("beats");
  const beats = ["tender", "quotes", "assignees"] as const;

  return (
    <section id="how" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-landmark md:px-8 lg:py-[4.5rem]">
        <div className="flex max-w-[52ch] flex-col gap-label">
          <h2 className="type-heading text-balance">{t("title")}</h2>
          <p className="text-pretty text-muted-foreground">{t("intro")}</p>
        </div>

        <div className="mt-landmark grid gap-8 md:grid-cols-3">
          {beats.map((key) => (
            <article key={key} className="flex flex-col gap-label border-t border-border pt-6">
              <h3 className="type-section">{tBeats(`${key}.title`)}</h3>

              <p className="text-pretty text-muted-foreground">{tBeats(`${key}.body`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Who is on the other end of it.
 *
 * The three beats say what the product does; this says who each part of it is done by,
 * which is the question a reader at a trading company actually has — a tender is never
 * one person's job, and a page that only describes a workspace never says whose.
 */
function WhoItIsFor() {
  const t = useTranslations("who");
  const points = ["owner", "assignee", "team"] as const;

  return (
    <section className="border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-group px-5 py-landmark md:px-8 lg:grid-cols-2 lg:items-start lg:gap-landmark lg:py-[4.5rem]">
        <div className="flex flex-col gap-label">
          <h2 className="type-heading text-balance">{t("title")}</h2>
          <p className="max-w-[46ch] text-pretty text-muted-foreground">{t("body")}</p>
        </div>

        <ul className="flex flex-col">
          {points.map((point) => (
            <li key={point} className="flex flex-col gap-1 border-t border-border py-5">
              <p className="font-semibold">{t(`points.${point}.title`)}</p>
              <p className="text-pretty text-muted-foreground">{t(`points.${point}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * The one thing the page asks for, on the page's own ground.
 *
 * The coloured band this replaces made the ask the loudest thing on the site, which is
 * the wrong way round: the page has spent four sections earning the email, and a reader
 * who has arrived here has already decided. A centred column under a hairline is enough
 * to say *this is the end and this is the ask*, and it leaves the accent to the button.
 */
function ClosedBeta() {
  const t = useTranslations("beta");

  return (
    <section id="waiting-list" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-landmark md:px-8 lg:py-[4.5rem]">
        <div className="mx-auto flex max-w-xl flex-col gap-group text-center">
          <div className="flex flex-col gap-label">
            <h2 className="type-heading text-balance">{t("title")}</h2>
            <p className="text-pretty text-muted-foreground">{t("body")}</p>
          </div>

          <WaitingListForm />
        </div>
      </div>
    </section>
  );
}
