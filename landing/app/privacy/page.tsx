import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Footer } from "@/components/footer";
import { Wordmark } from "@/components/mark";

/**
 * **DRAFT FOR MIKE'S REVIEW.** Written by an agent, not a lawyer, and not yet read by
 * either. It is deliberately narrow: it covers the waiting list and Web Analytics and
 * says nothing about the app, because the app does not collect anything through this
 * site and a policy that reached for it would be describing a product nobody can use yet.
 * Terms of service wait for #178.
 *
 * Written PDPA-aware rather than PDPA-cited. Thailand's PDPA wants a reader to be able
 * to find out what is held, why, where, for how long and how to get out of it — so those
 * are the five headings, in that order, in plain sentences. There is no "we may share
 * your information with our affiliates and partners" paragraph, because we do not, and a
 * boilerplate clause that reserves a right nobody intends to use is a promise quietly
 * broken in advance.
 */
export const metadata: Metadata = { title: "Privacy" };

const sections = [
  "what",
  "why",
  "where",
  "long",
  "analytics",
  "remove",
  "controller",
] as const;

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");

  return (
    <>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-5">
          <header className="pt-group pb-landmark">
            <Link href="/">
              <Wordmark name="Awardley" />
            </Link>
          </header>

          <article className="flex flex-col gap-group pb-group">
            <h1 className="type-display">{t("title")}</h1>
            <p className="text-pretty text-muted-foreground">{t("intro")}</p>

            {sections.map((section) => (
              <section key={section} className="flex flex-col gap-label">
                <h2 className="type-section">{t(`sections.${section}.title`)}</h2>
                <p className="text-pretty text-muted-foreground">
                  {t(`sections.${section}.body`)}
                </p>
              </section>
            ))}

            <p>
              <Link href="/" className="text-signal-ink underline underline-offset-2">
                {t("back")}
              </Link>
            </p>
          </article>
        </div>
      </main>

      <Footer />
    </>
  );
}
