import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CurrencyConversionForm } from "@/components/admin/currency-conversion-form";
import { Measure } from "@/components/ui/screen-body";
import { ScreenHeader } from "@/components/ui/screen-header";
import { currentUser } from "@/lib/auth/session";
import { asPercent } from "@/lib/org/fx-buffer";
import { getOrgSettings } from "@/lib/org/org";

/**
 * Where the org says how much is added to the market exchange rate when a supplier's
 * foreign price is turned into the organisation's Reporting Currency — the FX Buffer,
 * which until this screen could only be changed with SQL against production. The third
 * screen in Settings' **Organisation** group.
 *
 * Hidden from non-admins with `notFound()` rather than a redirect, for the reason the
 * other two do it: a page that says "you are not allowed here" also says that here
 * exists. The real gate is in the server action, because that is the public endpoint.
 *
 * The setting is read through `getOrgSettings`, which is the same read every Quote's
 * `freezeRate` goes through — so what this screen shows and what the next Quote freezes
 * cannot come from two different places.
 */
export default async function CurrencyConversionPage() {
  const store = await cookies();
  const user = await currentUser(store);
  const { fxBufferPct, reportingCurrency, plan } = await getOrgSettings(store);

  // Two refusals with one shape, because they are the same sentence said about two
  // different things: this screen is not this reader's, and this screen is not this
  // organisation's (#179). `notFound()` for both, for the reason the admin check already
  // gives — a page that says "you are not allowed here" also says that here exists, and
  // an upgrade prompt on a settings screen is an advertisement where a setting was. The
  // real gate is `setFxBuffer`, which refuses the same two ways on the public endpoint.
  if (!user?.isOrgAdmin || !plan.moneyLayer) notFound();

  const t = await getTranslations("currencyConversion");

  return (
    <>
      <ScreenHeader heading={t("title")}>
        {/* The organisation's own Reporting Currency, not a Tender's: this screen sets
            what the *next* Quote freezes against, and the currency it is converted into
            is the one the next Tender will open in (ADR-0036). A Tender already open
            keeps whatever it was stamped with, and nothing on this page changes it. */}
        <p className="type-quiet">{t("description", { currency: reportingCurrency })}</p>
      </ScreenHeader>

      <Measure>
        <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
          <CurrencyConversionForm percent={asPercent(fxBufferPct)} />
        </section>
      </Measure>

      {/* The promise the setting makes to history, said out loud on the screen that can
          break it — including the one exception, because an Org Admin who met it as a
          surprise would have been told something false here. ADR-0018: correcting the day
          a Quote claims re-freezes that Quote against the new date. */}
      <Measure>
        <p className="type-quiet">{t("affects")}</p>
      </Measure>
    </>
  );
}
