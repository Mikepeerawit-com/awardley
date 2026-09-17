import { useTranslations } from "next-intl";

import { Footer } from "@/components/footer";
import {
  BellIcon,
  CheckCircleIcon,
  CheckIcon,
  DocumentIcon,
  SheetIcon,
} from "@/components/icons";
import { SiteHeader } from "@/components/site-header";
import { WaitingListForm } from "@/components/waiting-list-form";

/**
 * The shop window, rebuilt (#194): a bar, a hero with the product framed beside it, how
 * it works, who it is for, and the closed-beta band with the one form on the site.
 *
 * **Trust before persuasion.** The page has no logos, no customer count and no
 * testimonial, because there are no customers yet and inventing the furniture of proof
 * is the one thing a closed beta cannot afford to be caught doing. What fills that slot
 * instead is true and checkable: three facts under the hero, three beats that describe
 * the mechanism, and a screenshot of the actual screen.
 *
 * **No pricing anywhere**, which is a decision rather than an omission — the beta is
 * invite-only, and a price on a page nobody can buy from invites an argument about a
 * number that is not settled (ADR-0035).
 *
 * **One accent hue, spent once per band.** The CTA carries it as ground; everything else
 * that wears it — the badge dot, the eyebrow, the icon tiles, the ticks — carries it as
 * ink at small sizes, so the eye still lands on the button. The two navy surfaces are
 * the only places the ground changes, and both of them are about the product rather than
 * about the page.
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
 * The sentence and the product, side by side.
 *
 * Six-and-six rather than the seven-and-five it was: the panel is now the thing that
 * says what this is, and a column that has to hold a phone at a readable size cannot be
 * the narrow one.
 *
 * The children arrive on a stagger (`rise-*`). It is opacity and 12px of lift, it is
 * over in under half a second, and `prefers-reduced-motion: reduce` in `globals.css`
 * collapses all of it — a hero that animates is a hero that was worth waiting for, and a
 * hero that is still animating when you reach for the button is an obstacle.
 */
function Hero() {
  const t = useTranslations("hero");
  const facts = ["bilingual", "reminders", "phone"] as const;

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-landmark px-5 py-landmark md:px-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center lg:py-[5.5rem]">
      <div className="flex flex-col gap-group">
        <p className="rise rise-1 inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
          {t("badge")}
        </p>

        <h1 className="rise rise-1 type-display text-balance">{t("headline")}</h1>

        <p className="rise rise-2 max-w-[44ch] text-lg text-pretty text-muted-foreground lg:text-xl">
          {t("sub")}
        </p>

        <div className="rise rise-3 flex flex-wrap items-center gap-field">
          <a
            href="#waiting-list"
            className="inline-flex min-h-12 items-center justify-center rounded-control bg-accent px-6 text-base font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90"
          >
            {t("cta")}
          </a>

          {/*
            Outline rather than a second filled button. Somebody who already holds an
            Invite needs the door and nobody else can use it, so it has to be findable
            and must not compete with the one thing this page is actually for.
          */}
          <a
            href="https://app.awardley.com/login"
            className="inline-flex min-h-12 items-center justify-center rounded-control border border-border bg-transparent px-6 text-base font-semibold transition-colors duration-200 hover:bg-card"
          >
            {t("secondary")}
          </a>
        </div>

        {/*
          The proof slot, and everything in it is checkable today. A Trust & Authority
          page puts logos or numbers here; we have neither, and three true sentences
          about what the product is beat three borrowed ones about who else uses it.
        */}
        <ul className="rise rise-4 flex flex-wrap gap-x-group gap-y-label text-sm text-muted-foreground">
          {facts.map((fact) => (
            <li key={fact} className="inline-flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 shrink-0 text-accent" />
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
 * The product, framed and cropped.
 *
 * The panel is a fixed height and the capture hangs off the bottom of it on purpose: a
 * phone shown whole and centred reads as an asset dropped onto a page, while one cut off
 * by its frame reads as a screen you are looking into — and the part worth seeing is the
 * top of it. Navy in both themes, because the screenshot is a light screen and a light
 * screenshot on a light panel has no edge.
 */
function ProductPanel({ alt }: { alt: string }) {
  return (
    <div className="rise rise-2 brand-surface relative h-[26rem] overflow-hidden rounded-surface bg-brand shadow-surface lg:h-[34rem]">
      {/* One soft light above the phone, so the navy has a top and a bottom. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(30rem_18rem_at_50%_-6%,var(--brand-glow),transparent_70%)]"
      />

      {/*
        The slot for the product screenshot, at the aspect ratio of the phone the app is
        designed against (390 × 844). The file in `public/` is a real capture, English,
        from local seed data with fictional names, refreshed by hand when the screen
        changes.

        A plain `<img>` rather than `next/image`: one image, known size, above the fold,
        and no optimiser worth a dependency on how the file is replaced.
      */}
      <div className="relative mx-auto w-[min(72%,290px)] translate-y-8 overflow-hidden rounded-[2.25rem] border-[6px] border-white/15 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.65)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/screenshot-tender.png"
          alt={alt}
          width={390}
          height={844}
          loading="eager"
          fetchPriority="high"
          className="block h-auto w-full"
        />
      </div>
    </div>
  );
}

/**
 * The three beats, as cards rather than as columns under a rule.
 *
 * A card with its own hairline and its own icon reads as one of a set of three things
 * you could pick between; the ruled columns this replaces read as one paragraph broken
 * into three, which is not what a mechanism looks like. The step numerals stay, because
 * they are the only thing saying these happen in an order.
 */
function HowItWorks() {
  const t = useTranslations("how");
  const tBeats = useTranslations("beats");
  const beats = [
    { key: "tender", Icon: DocumentIcon },
    { key: "quotes", Icon: SheetIcon },
    { key: "assignees", Icon: BellIcon },
  ] as const;

  return (
    <section id="how" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-landmark md:px-8 lg:py-[4.5rem]">
        <div className="flex max-w-[52ch] flex-col gap-label">
          <p className="type-eyebrow text-accent">{t("eyebrow")}</p>
          <h2 className="type-heading text-balance">{t("title")}</h2>
          <p className="text-pretty text-muted-foreground">{t("intro")}</p>
        </div>

        <div className="mt-landmark grid gap-group md:grid-cols-3">
          {beats.map(({ key, Icon }, index) => (
            <article
              key={key}
              className="flex flex-col gap-label rounded-surface border border-border bg-card p-6 transition duration-200 hover:-translate-y-0.5 hover:border-accent-edge md:p-8"
            >
              <span className="mb-label inline-flex h-10 w-10 items-center justify-center rounded-control bg-accent-wash text-accent">
                <Icon className="h-5 w-5" />
              </span>

              <p className="type-quiet tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </p>

              <h3 className="text-lg font-semibold">{tBeats(`${key}.title`)}</h3>

              <p className="text-pretty text-muted-foreground">
                {tBeats(`${key}.body`)}
              </p>
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
      <div className="mx-auto grid w-full max-w-6xl gap-landmark px-5 py-landmark md:px-8 lg:grid-cols-2 lg:items-start lg:py-[4.5rem]">
        <div className="flex flex-col gap-label">
          <h2 className="type-heading text-balance">{t("title")}</h2>
          <p className="max-w-[46ch] text-pretty text-muted-foreground">{t("body")}</p>
        </div>

        <ul className="flex flex-col gap-group">
          {points.map((point) => (
            <li key={point} className="flex gap-field">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-wash text-accent">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>

              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-semibold">{t(`points.${point}.title`)}</p>
                <p className="text-pretty text-muted-foreground">
                  {t(`points.${point}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Edge to edge and navy, so the one place on this site that asks something of the reader
 * is the one place the ground changes. Its bottom edge is the footer's top hairline —
 * two rules touching would draw as one thick line, so the band draws neither.
 */
function ClosedBeta() {
  const t = useTranslations("beta");

  return (
    <section
      id="waiting-list"
      className="brand-surface scroll-mt-20 bg-brand text-brand-foreground"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-group px-5 py-landmark md:px-8 lg:grid-cols-2 lg:items-start lg:gap-landmark lg:py-[4.5rem]">
        <div className="flex flex-col gap-label">
          <p className="type-eyebrow text-white/70">{t("eyebrow")}</p>
          <h2 className="type-heading text-balance">{t("title")}</h2>
          <p className="max-w-[46ch] text-pretty text-white/80">{t("body")}</p>
        </div>

        <WaitingListForm />
      </div>
    </section>
  );
}
