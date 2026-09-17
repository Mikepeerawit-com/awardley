import { useTranslations } from "next-intl";

import { Footer } from "@/components/footer";
import { Wordmark } from "@/components/mark";
import { WaitingListForm } from "@/components/waiting-list-form";

/**
 * The four parts #183 asks for, in this order: hero, three beats, the closed-beta band
 * with the form, the footer.
 *
 * **No pricing anywhere**, which is a decision rather than an omission — the beta is
 * invite-only, and a price on a page nobody can buy from invites an argument about a
 * number that is not settled.
 *
 * **This is a shop window (#194), not a memo.** The page is set at a wide measure and
 * built out of four full-width bands: a hero that puts the sentence and the product
 * beside each other, the product itself framed and peeking out of a panel rather than
 * floating on the paper, the three beats side by side as columns under a rule, and a
 * closed-beta band that runs edge to edge so the one form on the site is the one place
 * the page changes colour. The restraint that is left is where it counts — one hue, one
 * control wearing it, and no second button anywhere to argue with the first.
 *
 * **Why this is a component and `app/page.tsx` is three lines.** Every screen in the app
 * is an `async` Server Component and none of them is reachable from a browser test; what
 * *is* reachable is the sync presentational seam they hand their data to, which is why
 * the app's 390px guard measures components rather than pages. This site has the same
 * problem for the same reason — `getTranslations` is async — and takes the same answer.
 * `useTranslations` reads the provider rather than the request, so this renders
 * unchanged on the server and inside `test/home.layout.test.tsx`.
 */
export function HomeContent() {
  const t = useTranslations();

  const beats = ["tender", "quotes", "assignees"] as const;

  return (
    <>
      <main className="flex-1">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-group px-5 py-field md:px-8">
          <Wordmark name={t("site.name")} />

          {/*
            The only link off this site, and it stays quiet for the reason the footer
            gives: during the closed beta most people who press it cannot get in, and a
            button that looks like a way in would be a lie. `min-h-11` because it is a
            tap target on a phone before it is anything else.
          */}
          <a
            href="https://app.awardley.com/login"
            className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t("footer.signIn")}
          </a>
        </header>

        <section className="mx-auto grid w-full max-w-6xl gap-landmark px-5 py-landmark md:px-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:py-[5rem]">
          <div className="flex flex-col gap-group">
            <div className="flex flex-col gap-label">
              <p className="type-eyebrow font-mono text-ink-faint">{t("hero.eyebrow")}</p>
              <h1 className="type-display text-balance">{t("hero.headline")}</h1>
            </div>

            <p className="max-w-[36ch] text-xl text-muted-foreground text-pretty">
              {t("hero.sub")}
            </p>

            {/*
              A link, not a button. The submit in the closed-beta band is the only
              control on this site wearing the signal hue (ADR-0019), and a second thing
              shaped like a button would be a second thing to decide between. This one
              carries the hue as *ink* and jumps to the form the hue actually belongs to.
            */}
            <a
              href="#waiting-list"
              className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-signal-ink hover:underline"
            >
              {t("hero.cta")}
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.5 8h11" />
                <path d="m9 3.5 4.5 4.5L9 12.5" />
              </svg>
            </a>
          </div>

          {/*
            The product, framed and cropped. The panel is a fixed height and the capture
            hangs off the bottom of it on purpose: a phone shown whole and centred reads
            as an asset dropped onto a page, while one cut off by its frame reads as a
            screen you are looking into — and the part worth seeing is the top of it.
          */}
          <div className="relative h-[26rem] overflow-hidden rounded-surface border border-hairline bg-card px-landmark pt-landmark shadow-surface lg:h-[34rem]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--signal-wash),transparent_60%)]"
            />

            {/*
              The slot for the product screenshot, at the aspect ratio of the phone the
              app is designed against (390 × 844). The file in `public/` is a real capture,
              English, from local seed data with fictional names, refreshed by hand when the
              screen changes.

              A plain `<img>` rather than `next/image`: one image, known size, above the
              fold, and no optimiser worth a dependency on how the file is replaced.
            */}
            <div className="relative mx-auto w-[min(100%,300px)] translate-y-6 overflow-hidden rounded-[2rem] border-[6px] border-foreground/15 shadow-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/screenshot-tender.png"
                alt={t("hero.screenshotAlt")}
                width={390}
                height={844}
                loading="eager"
                fetchPriority="high"
                className="block h-auto w-full"
              />
            </div>
          </div>
        </section>

        <section className="border-t border-hairline">
          <div className="mx-auto grid w-full max-w-6xl gap-group px-5 py-landmark md:grid-cols-3 md:gap-landmark md:px-8 lg:py-[4rem]">
            {beats.map((beat, index) => (
              <article
                key={beat}
                className="flex flex-col gap-label border-t border-hairline-soft pt-group md:border-t-0 md:border-l md:pt-0 md:pl-group md:first:border-l-0 md:first:pl-0"
              >
                {/* The numeral is the only thing holding the three together as a set. */}
                <p className="font-mono text-sm text-ink-faint">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="type-section">{t(`beats.${beat}.title`)}</h2>
                <p className="text-pretty text-muted-foreground">
                  {t(`beats.${beat}.body`)}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/*
          Edge to edge rather than a card, so the one place on this site that asks
          something of the reader is the one place the ground changes. Its bottom edge is
          the footer's top hairline — two rules touching would draw as one thick line.
        */}
        <section
          id="waiting-list"
          className="scroll-mt-group border-t border-hairline bg-muted"
        >
          <div className="mx-auto grid w-full max-w-6xl gap-group px-5 py-landmark md:px-8 lg:grid-cols-2 lg:items-start lg:gap-landmark lg:py-[4rem]">
            <div className="flex flex-col gap-label">
              <h2 className="type-section">{t("beta.title")}</h2>
              <p className="text-pretty text-muted-foreground">{t("beta.body")}</p>
            </div>

            <WaitingListForm />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
