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
 * The whole page is one column at one measure. There is no two-column breakpoint even on
 * a desk: three beats side by side would be three short paragraphs pretending to be a
 * feature grid, and the sentence each of them is built around is the point.
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
        <div className="mx-auto w-full max-w-3xl px-5">
          <header className="pt-group pb-landmark">
            <Wordmark name={t("site.name")} />
          </header>

          <section className="flex flex-col gap-group pb-landmark md:flex-row md:items-center md:justify-between md:gap-landmark">
            <div className="flex flex-col gap-group">
              <h1 className="type-display text-balance">{t("hero.headline")}</h1>
              <p className="text-lg text-muted-foreground text-pretty">{t("hero.sub")}</p>
            </div>

            {/*
              The slot for the product screenshot, at the aspect ratio of the phone the
              app is designed against (390 × 844). The file in `public/` is a real capture,
              English, from local seed data with fictional names, refreshed by hand when the
              screen changes. Beside the headline from `md` up, below it on a phone.

              A plain `<img>` rather than `next/image`: one image, known size, above the
              fold, and no optimiser worth a dependency on how the file is replaced.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/screenshot-tender.png"
              alt={t("hero.screenshotAlt")}
              width={390}
              height={844}
              className="mx-auto h-auto w-full max-w-[280px] shrink-0 rounded-surface border border-hairline shadow-surface md:mx-0"
            />
          </section>

          <section className="flex flex-col gap-landmark pb-landmark">
            {beats.map((beat) => (
              <article key={beat} className="flex flex-col gap-label">
                <h2 className="type-section">{t(`beats.${beat}.title`)}</h2>
                <p className="text-pretty text-muted-foreground">
                  {t(`beats.${beat}.body`)}
                </p>
              </article>
            ))}
          </section>

          <section className="rounded-surface border border-hairline bg-card px-5 py-group shadow-surface">
            <div className="flex flex-col gap-group">
              <div className="flex flex-col gap-label">
                <h2 className="type-section">{t("beta.title")}</h2>
                <p className="text-pretty text-muted-foreground">{t("beta.body")}</p>
              </div>

              <WaitingListForm />
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
