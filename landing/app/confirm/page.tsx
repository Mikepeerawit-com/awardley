import type { Metadata } from "next";
import Link from "next/link";

import { ConfirmPanel } from "@/components/confirm-panel";
import { Footer } from "@/components/footer";
import { Wordmark } from "@/components/mark";
import { confirmStep, type ConfirmStatus } from "@/lib/confirm";
import { readSettings } from "@/lib/env";

export const metadata: Metadata = { title: "Awardley" };

/**
 * The other half of double opt-in — and **opening this page is not it**.
 *
 * A GET verifies the token and writes nothing. Outlook Safe Links, Gmail's link checker
 * and most corporate mail gateways fetch every URL in a message before a human sees it,
 * so a page that added the contact on load would collect the addresses of everybody
 * whose employer scans their mail and nobody who actually chose to be on the list. The
 * deliberate act double opt-in exists to capture is the press, so the press is a POST to
 * a Server Action — a scanner follows links, it does not submit forms. `lib/confirm.ts`
 * holds both steps so the two cannot verify a token differently.
 *
 * **Three endings, not two.** `ok` is the list. `expired` — malformed, forged or stale,
 * told apart nowhere a reader can see — is the dead end back to the form. `failed` is a
 * good token and a provider that would not answer, and it is deliberately not the
 * expired page: telling somebody their link is stale when it has hours left sends them
 * back for a second email that will hit the same outage. It keeps the button.
 */
export default async function ConfirmPage({ searchParams }: PageProps<"/confirm">) {
  const token = String((await searchParams).token ?? "");

  return (
    <>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-5">
          <header className="pt-group pb-landmark">
            <Link href="/">
              <Wordmark name="Awardley" />
            </Link>
          </header>

          <ConfirmPanel token={token} initial={await inspect(token)} />
        </div>
      </main>

      <Footer />
    </>
  );
}

async function inspect(token: string): Promise<ConfirmStatus> {
  const { settings, error } = readSettings();

  if (settings === null) {
    console.error(`confirm: ${error}`);

    // Not `expired`: the reader's link is fine, this deployment is not.
    return "failed";
  }

  return confirmStep("inspect", token, settings, Date.now());
}
