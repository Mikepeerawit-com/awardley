import { useTranslations } from "next-intl";

import { AmbientStage } from "@/components/ambient-stage";
import { Footer } from "@/components/footer";
import { PanelGlow } from "@/components/panel-glow";
import { PhoneNotice } from "@/components/phone-notice";
import { QuotesSheet } from "@/components/quotes-sheet";
import { Reveal } from "@/components/reveal";
import { SiteHeader } from "@/components/site-header";
import {
  BilingualSpecimen,
  ItemSpecimen,
  ReminderSpecimen,
  RuleOutSpecimen,
} from "@/components/specimens";
import { LostTrace, MissedTrace, StaleTrace } from "@/components/traces";
import { WaitingListForm } from "@/components/waiting-list-form";

/**
 * The home page: a bar, a centred headline, the product itself, what goes wrong without
 * it, how it works, who it is for, the four questions a reader has with their hand on the
 * form, and the one form on the site.
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
 *
 * That rule holds for the one client component the page reaches for as well. `Reveal` is
 * `"use client"` but it is not `async`, and everything it is handed is a string or a node —
 * a server component cannot pass a function across that boundary, so it takes no callback,
 * no render prop and no formatter.
 */
export function HomeContent() {
  return (
    <>
      <SiteHeader onHome />

      <main className="flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <WhoItIsFor />
        <Questions />
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
 * The four things above the panel, and then the panel, arrive on a stagger (`rise-*`). It is
 * opacity and 12px of lift, the last of them has settled by 720ms, and
 * `prefers-reduced-motion: reduce` in `globals.css` collapses all of it. The page then hands
 * over to the sheet inside the panel, which takes until about 2.2s to say what the product
 * does; the two sections between the panel and the form borrow the same entrance once each
 * as they are scrolled to, and the ask does not. Nothing outside the product panel ever
 * repeats; inside it everything runs on one sixteen-second beat, and the panel keeps the
 * page alive while the reader is still.
 */
function Hero() {
  const t = useTranslations("hero");
  const facts = ["bilingual", "reminders", "device"] as const;

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
 * That is the rule the rest of the page keeps as well, and it is about *images* rather than
 * about surfaces: the capture below is the only raster on the site, and the three specimens
 * under the how-it-works beats ({@link ItemSpecimen} and the two beside it) are HTML for the
 * same reasons the sheet is. Showing more of the product costs the page nothing as long as
 * none of it arrives over the network.
 *
 * The light behind the panel is {@link PanelGlow}, which is where the reasoning for its
 * shape and its two kinds of motion is written down.
 *
 * **The sheet joins at `md`, not at `lg`.** A tablet held in landscape is a desk, and the
 * argument the panel makes — *this narrow screen is a view of that wide one* — does not
 * survive the wide one being absent for a third of the widths the page is read at. What
 * changes with it is the panel's height (30rem, so four Item names may wrap to three lines
 * and still clear the "Example data" caption). The split is the same 5fr / 7fr from `md`
 * up rather than a narrower column first: at 4fr the capture was small enough that the
 * screenshot no longer filled its own frame, and a device with an empty bezel under it is
 * not a crop of anything.
 *
 * Things in here move while the reader does not, and all of them on one clock. Two are
 * ambient and need no beat — the capture pans as if somebody were idly scrolling it, and
 * the light behind the panel breathes, both CSS loops in `globals.css`. The rest are
 * events on the panel's own sixteen-second beat, counted by {@link AmbientStage}: the
 * sheet takes a new quote, the light lifts because one landed, and once a cycle a Reminder
 * arrives on the phone as what a Reminder actually is — an email. All of it stops the
 * moment the panel is off screen or the tab is hidden.
 */
function ProductPanel({ alt }: { alt: string }) {
  const t = useTranslations("sheet");

  return (
    <AmbientStage className="rise rise-5 relative mt-landmark lg:mt-[3.5rem]">
      <PanelGlow />

      <div className="relative h-[26rem] overflow-hidden rounded-2xl border border-border bg-card md:h-[30rem] lg:h-[32rem]">
        {/*
          The light that crosses the panel's top hairline, twenty seconds each way. Two
          elements because the travel has to be clipped by something that is not the panel:
          the outer is the length of the edge and hides what has left it, the inner is the
          lit segment. `aria-hidden` and a pixel tall — there is nothing here to announce,
          and nothing to read. The reasoning for the gesture is in `globals.css`.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px overflow-hidden"
        >
          <div className="edge-light h-full w-[45%] bg-[linear-gradient(90deg,transparent,var(--edge-light),transparent)]" />
        </div>

        {/*
          Said out loud rather than in the alt text. The sheet is synthetic and the
          screenshot is seeded, and a page whose whole argument is that it does not invent
          proof has to label the one thing on it that could be mistaken for a customer's
          numbers.
        */}
        <p className="type-quiet absolute top-4 right-4 z-10">{t("example")}</p>

        <div className="grid h-full md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
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
            {/*
              The frame is a fixed height at each width, which is what makes the capture a
              *crop* rather than a picture: the screenshot is taller than the frame at every
              size the panel is read at, so there is always something above and below the
              part being shown — which is the whole of what the pan is panning through. Left
              to its content the frame simply grew to the image and there was nothing to
              scroll; the heights are set a step past the panel's own, so the device is still
              cut off by the panel's bottom edge on purpose.
            */}
            <div className="relative h-[26rem] w-[min(70%,280px)] translate-y-12 overflow-hidden rounded-[2rem] border-[6px] border-device-edge shadow-[0_28px_60px_-24px_rgb(0_0_0/0.45)] md:h-[30rem] md:w-[min(100%,280px)] md:translate-y-16 lg:h-[31rem] lg:translate-y-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/screenshot-tender.png"
                alt={alt}
                width={390}
                height={767}
                loading="eager"
                fetchPriority="high"
                className="capture-pan block h-auto w-full"
              />

              {/*
                Sits on the frame rather than on the capture, because that is where a phone
                puts one: the screenshot is what pans, and a notification pinned to the top
                of the screen does not slide away with the content under it.
              */}
              <PhoneNotice />
            </div>
          </div>

          {/*
            The sheet gets a frame of its own, on the page's ground inside the panel's
            card. Set as bare text it read as the page having written a table; framed, it
            reads as the surface the phone beside it is a narrow view of — which is the
            whole claim the panel is making.
          */}
          <div className="hidden min-w-0 flex-col justify-center py-8 pr-5 md:flex lg:pr-8">
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <QuotesSheet />
            </div>

            {/*
              One line, because a sheet that can be worked has to say so once — a reader who
              never learns the amounts are clickable is reading a picture. It sits under the
              frame rather than over it, where a caption for a thing goes, and it is quiet
              type: it is an instruction about the demonstration, not part of the argument.
              It lives inside the `md:` column with the sheet, so it is absent on the phone
              layout along with the thing it describes.
            */}
            <p className="type-quiet mt-3">{t("hint")}</p>
          </div>
        </div>
      </div>
    </AmbientStage>
  );
}

/**
 * What the reader is doing today, said before the product says anything.
 *
 * The page opened with the answer — a headline, a screen and a sheet — which is the right
 * order for somebody who already knows they have this problem and the wrong one for
 * everybody else. A reader at a trading company does not arrive looking for a tender
 * workspace; they arrive with a bid due on Thursday and six places the tender is currently
 * in. This section is the page saying that back to them, and it is the only part of the
 * site that describes something other than Awardley.
 *
 * **Three failures rather than three complaints.** Each row is a thing that actually goes
 * wrong and is checkable against the reader's own last tender — a price that moved, an
 * Item nobody chased, a record that was never kept. Named that way they are also, in order,
 * exactly what the three beats under the next heading answer, so the section that follows
 * reads as a reply rather than as a brochure. Nothing here names a competitor: the thing
 * being replaced is a habit, and a page that picks a fight with a spreadsheet loses it.
 *
 * **The heading carries the section on its own.** There was a paragraph under it setting
 * the scene in prose, and it said in forty-five words what the three rows underneath then
 * said again in detail — the reader was being told the same thing twice, once vaguely.
 * The rows are the argument; the heading is the only line they need over them.
 *
 * A third shape, deliberately. The beats are columns and the roles are rows in a column
 * beside a heading; these are definition rows across the full measure, label left and
 * sentence right, which is the shape a list of failures wants — the title is the thing the
 * reader recognises and the body is the detail they only need if they did.
 *
 * **Each row now ends in the artefact it is about.** This was three titles and three
 * sentences and nothing to look at, sitting between two sections that both show the product
 * — the reader was being asked to take the only part of the page they can check against
 * their own week entirely on trust. So every row gets a trace under its sentence: the two
 * versions of a price that moved, the count that does not reach four on the morning of the
 * bid, the award with the who and the why gone. The row reads title, sentence, evidence, the
 * same pairing `HowItWorks` makes between a beat and its specimen, and paired the same way —
 * in an array, so a trace is *which row it is* rather than the third thing in a list that
 * happens to line up.
 *
 * **They are traces and not specimens, and the difference is the section.** This is the one
 * block that describes something other than Awardley, so what it shows must be the failure
 * rather than the fix: `card` ground where a specimen is white, muted ink throughout, and
 * never the accent, the wash or the tick, which on this site mean the product working. The
 * reasoning is argued in full in `components/traces.tsx`. Read in sequence the two sections
 * now change colour as well as subject — grey and unfinished here, white and ticked under
 * the next heading — which is an argument the page was previously only making in words.
 *
 * The plate goes under the sentence, inside the right-hand cell, at `max-w-sm`: the row keeps
 * its two-column shape and does not gain a third column. A trace set beside the sentence
 * rather than under it would read as a caption for the paragraph; under it, and narrower than
 * the measure, it reads as the scrap both the title and the sentence are about.
 *
 * **The example data is labelled once, for the row**, exactly as it is over the how-it-works
 * columns and pinned to the product panel's corner — the same `sheet.example` string, quiet
 * and right-aligned. Three markers under three traces would be the page saying the same thing
 * three times, and leaving it off would be the one section with invented figures in it that
 * does not admit to them.
 */
function Problem() {
  const t = useTranslations("problem");
  const tSheet = useTranslations("sheet");

  // Paired here rather than inside the loop, for the reason the beats are: the trace is
  // which point it is, so the row renders a title, a sentence, and the piece of evidence
  // both of them are about.
  const points = [
    { key: "stale", Trace: StaleTrace },
    { key: "missed", Trace: MissedTrace },
    { key: "lost", Trace: LostTrace },
  ] as const;

  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-landmark md:px-8 lg:py-[4.5rem]">
        <Reveal className="max-w-[52ch]">
          <h2 className="type-heading text-balance">{t("title")}</h2>
        </Reveal>

        <Reveal delay={1} className="mt-landmark flex flex-col gap-label">
          <p className="type-quiet text-right">{tSheet("example")}</p>

          {points.map(({ key, Trace }) => (
            <article
              key={key}
              className="grid gap-1 border-t border-border py-5 md:grid-cols-[minmax(0,26ch)_minmax(0,1fr)] md:gap-8"
            >
              <h3 className="font-semibold text-pretty">{t(`points.${key}.title`)}</h3>

              <div>
                <p className="text-pretty text-muted-foreground">{t(`points.${key}.body`)}</p>

                {/*
                  `field` rather than `label` between the sentence and the plate, for the
                  reason the how-it-works column puts `group` under its specimen: at the 8px
                  that binds a heading to its paragraph the trace read as the paragraph's
                  own last line, and it is the thing the paragraph is about. `sm` is a
                  measure a two-column plate can be read at rather than a width — the row's
                  right-hand cell is over 60ch on a desk, and a trace stretched across it
                  would be a table.
                */}
                <div className="mt-field max-w-sm">
                  <Trace />
                </div>
              </div>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/**
 * The three beats, as columns under a rule, each showing the thing it is about.
 *
 * Not cards: a card with its own hairline and its own icon reads as one of a set of three
 * things you could pick between, and these are three parts of one mechanism in the order
 * they happen. Not numbered either — the order is in the sentences, and 01 / 02 / 03 over
 * a three-item list is a label for something the reader can already see. And no icons
 * either: a document, a grid and a bell over three paragraphs illustrate the nouns rather
 * than the mechanism, and the rule is already saying where each column starts.
 *
 * **What replaces the paragraphs is the product, not a picture of it.** This was 130 words
 * in three prose columns with nothing whatever to look at — the longest stretch of unbroken
 * reading on the site, sitting directly under the one section that shows the app working.
 * Each column now opens with a specimen: an Item as the record holds it, a quote ruled out
 * beside the quote that won it, and the Reminder that goes out. They are one worked example
 * — the same Item and the same two suppliers as the sheet in the panel above — so the
 * section reads as one tender moving through the product rather than as three features.
 * The reasoning for their frame and for their being HTML is in `components/specimens.tsx`.
 *
 * With a specimen under each title the body has one job left, which is the sentence the
 * specimen cannot say out loud, so each is one line. The intro that sat under the heading
 * (*Three things, in the order they happen*) is gone with them: it described the shape of
 * something the reader is now looking at.
 *
 * **The example data is labelled once, for the row.** It is the same `sheet.example` string
 * the product panel pins to its own corner, set quiet and right-aligned over the three
 * columns — the page's rule is that anything which could be mistaken for a customer's
 * numbers says so on its face, and one marker over three specimens is that rule kept
 * without it being said three times.
 *
 * The heading and the columns arrive once, the first time the section is scrolled to, one
 * step apart on the hero's own stagger — a scroll reveal in the page's existing grammar
 * rather than a second one. The `mx-auto` measure around them is deliberately not the thing
 * that moves: the section's width is layout and must be settled before anything animates.
 * Nothing inside a specimen animates at all; the page has one beat and it belongs to the
 * product panel.
 */
function HowItWorks() {
  const t = useTranslations("how");
  const tBeats = useTranslations("beats");
  const tSheet = useTranslations("sheet");

  // Paired here rather than inside the loop, because the specimen is which beat it is: the
  // column renders a title, a line and the piece of the product both of them are about.
  const beats = [
    { key: "tender", Specimen: ItemSpecimen },
    { key: "quotes", Specimen: RuleOutSpecimen },
    { key: "assignees", Specimen: ReminderSpecimen },
  ] as const;

  return (
    <section id="how" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-landmark md:px-8 lg:py-[4.5rem]">
        <Reveal className="max-w-[52ch]">
          <h2 className="type-heading text-balance">{t("title")}</h2>
        </Reveal>

        <Reveal delay={1} className="mt-landmark flex flex-col gap-label">
          <p className="type-quiet text-right">{tSheet("example")}</p>

          <div className="grid gap-8 md:grid-cols-3">
            {beats.map(({ key, Specimen }) => (
              /*
                Spaced by name rather than by one gap: `group` under the specimen, `label`
                between the heading and its line. The heading and the line are one block and
                belong 8px apart, but the plate above them is evidence rather than more of
                the sentence — at the same 8px it read as the paragraph's first line instead
                of the thing the paragraph is about.
              */
              <article key={key} className="flex flex-col border-t border-border pt-6">
                <Specimen />

                <h3 className="type-section mt-group">{tBeats(`${key}.title`)}</h3>

                <p className="mt-label text-pretty text-muted-foreground">
                  {tBeats(`${key}.body`)}
                </p>
              </article>
            ))}
          </div>
        </Reveal>
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
 *
 * **The heading carries the section on its own**, as it does in the problem block and for
 * the same reason. There was a lead paragraph here saying that a tender is never one
 * person's job and that each of them gets their own part of it; the three rows beside it
 * then said exactly that, three times, with the person named each time. The rows are the
 * argument and the heading is the only line they need over them — and this section sat
 * between two that had both just lost a paragraph, so it was the last place on the page
 * still explaining a list before the list.
 *
 * **What the heading column gained instead is the section's thesis, drawn.** That thesis is
 * *one record, several people* — not three products for three roles — so the plate under the
 * heading is deliberately one plate for the whole section rather than one per row. A specimen
 * beside each of the three would have argued the opposite of what the three rows say: that
 * the owner, the colleague and the team each get a surface of their own. They do not. They
 * get this one, and {@link BilingualSpecimen} is it: the Item named once across the divider
 * and its numerals read twice under it, with only the labels translated, so the last row's
 * claim — *in English or 中文, looking at the same record* — is checkable in the same eyeful
 * that makes it.
 *
 * It sits in the heading column rather than beside the list because that is where the claim
 * is made; the list keeps its shape, its hairlines and its three rows exactly as before. And
 * it carries the page's example-data marker, the same quiet right-aligned `sheet.example`
 * line the product panel and the problem rows carry, because the gloves and the 1,795.00 on
 * it are the invented tender and every invented figure on this site says so on its face.
 */
function WhoItIsFor() {
  const t = useTranslations("who");
  const tSheet = useTranslations("sheet");
  const points = ["owner", "assignee", "team"] as const;

  return (
    <section className="border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-group px-5 py-landmark md:px-8 lg:grid-cols-2 lg:items-start lg:gap-landmark lg:py-[4.5rem]">
        <Reveal className="max-w-[52ch]">
          <h2 className="type-heading text-balance">{t("title")}</h2>

          {/*
            `group` under the heading rather than `label`, because the plate is evidence and
            not the heading's second line — the same distinction the how-it-works column
            makes above its specimen. `sm` keeps the two language columns at a width each of
            them can be read at, inside a measure set for a 36px heading.
          */}
          <div className="mt-group max-w-sm">
            <p className="type-quiet mb-label text-right">{tSheet("example")}</p>

            <BilingualSpecimen />
          </div>
        </Reveal>

        {/*
          The `ul` stays a `ul` with the `li`s as its only children — the reveal wraps it
          rather than replacing it, because a list that has had a `div` inserted between it
          and its items is no longer a list of three things to anything reading the page
          out loud.
        */}
        <Reveal delay={1}>
          <ul className="flex flex-col">
            {points.map((point) => (
              <li key={point} className="flex flex-col gap-1 border-t border-border py-5">
                <p className="font-semibold">{t(`points.${point}.title`)}</p>
                <p className="text-pretty text-muted-foreground">{t(`points.${point}.body`)}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * The four objections, answered before the field that needs them answered.
 *
 * Everything above this point is the page talking. A reader about to type an address into
 * a form is not thinking about any of it — they are thinking *do my suppliers have to sign
 * up for something*, *what happens to the sheet we already use*, *can my colleague read
 * it*, and *where does this end up*. Those are the four, they are the ones that come back
 * from actual conversations, and each is answered in a single sentence whose first words
 * are the answer, so a reader skimming the questions gets all four without reading one.
 *
 * **What is not here is a price.** The cost question is the fifth one every reader has and
 * the page still does not answer it, because the beta is invite-only and a number on a page
 * nobody can buy from starts an argument about a figure that is not settled (ADR-0035). The
 * data answer is held to the same line: it says what is true today — one database behind
 * the login and one email address on this side — and claims nothing about walls between
 * companies that the app does not yet have. That the sheet above is invented is said on
 * the sheet's own face (`sheet.example`), which is the right place for it and not here.
 *
 * Immediately above the ask rather than further up, because an FAQ read early is trivia and
 * an FAQ read with a cursor in a field is the last thing standing between a reader and the
 * button.
 *
 * The light behind it is the panel's, in the one other place on the page that wants one.
 * {@link AmbientStage} is here for its `stage-still` switch and nothing else — `clock`
 * is off, because the page has one beat and it belongs to the product.
 */
function Questions() {
  const t = useTranslations("faq");
  const items = ["suppliers", "spreadsheet", "language", "data"] as const;

  return (
    <section className="border-t border-border">
      <AmbientStage clock={false} className="relative">
        {/*
          Sat low and wide behind the questions, the same radial and the same eighteen-second
          drift as the one behind the product panel. The page had a light at the top and
          none in the half a reader is in when they decide, and a second light is not a
          second gesture: it is the one the page already makes, made once more.
        */}
        <div
          aria-hidden="true"
          className="glow-drift pointer-events-none absolute inset-x-0 top-1/4 h-80 rounded-[50%] bg-[radial-gradient(closest-side,var(--glow),transparent)] blur-xl"
        />

        <div className="relative mx-auto w-full max-w-6xl px-5 py-landmark md:px-8 lg:py-[4.5rem]">
          <Reveal className="flex max-w-[52ch] flex-col gap-label">
            <h2 className="type-heading text-balance">{t("title")}</h2>
          </Reveal>

          <Reveal delay={1} className="mt-landmark grid gap-8 md:grid-cols-2 md:gap-x-8 md:gap-y-2">
            {items.map((item) => (
              <article key={item} className="flex flex-col gap-label border-t border-border py-6">
                <h3 className="font-semibold text-pretty">{t(`items.${item}.q`)}</h3>

                <p className="text-pretty text-muted-foreground">{t(`items.${item}.a`)}</p>
              </article>
            ))}
          </Reveal>
        </div>
      </AmbientStage>
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

          {/*
            Nothing in this section animates, heading included. The ask is the one thing on
            the page that must simply be there — a reader may arrive at it by following a
            link straight to `#waiting-list`, and a field waiting on an observer to decide
            whether it may be seen is a field that can be missed. A heading fading in above
            a form that is already sitting under it inverts the section besides: the thing
            being introduced would be on screen before its introduction.
          */}
          <WaitingListForm />
        </div>
      </div>
    </section>
  );
}
