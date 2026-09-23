import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * **The Settings screens, in two groups**, and the one place they are written down (#132).
 *
 * The three screens an Org Admin runs the organisation from were three loose rows in the
 * app menu with no collective name, and a member who was not an Org Admin opened that menu
 * and found Sign out. Settings is the name; these two groups are what is in it.
 *
 * - **Preferences** is what this app is set up as *for you*, and every member has it. It
 *   holds the language they read in — moved here off the app bar, which is what makes
 *   Settings worth opening for somebody who administers nothing.
 * - **Organisation** is what a change affects *everybody*, and only an Org Admin has it.
 *
 * **The split is the point of the grouping**, and it is why the two are labelled rather
 * than run together as one list of five: an Org Admin should be able to see at a glance
 * which of their changes land on their colleagues' screens.
 *
 * **Preferences carries no heading of its own**, because a group of one whose heading is
 * its only row's name is that word said twice. The row *is* the group. Organisation has
 * four rows and so has something for a heading to say.
 */
const groups = [
  {
    heading: null,
    orgAdminOnly: false,
    screens: [{ href: "/settings", label: "preferences.title" }],
  },
  {
    heading: "nav.organisation",
    orgAdminOnly: true,
    screens: [
      { href: "/settings/people", label: "nav.people" },
      { href: "/settings/group-robot", label: "nav.groupRobot" },
      {
        href: "/settings/currency-conversion",
        label: "nav.currencyConversion",
        // The one screen the plan decides on rather than the role (#179, ADR-0040). The
        // FX Buffer is the FX side of the money layer — it exists to turn a supplier's
        // foreign price into a Landed Cost — so an organisation that did not buy the
        // money has nothing to set here, and the page itself refuses with `notFound()`
        // for the same reason the other Organisation screens refuse a non-admin.
        //
        // Marked on the *screen* rather than as a group, because it is the only one of
        // the four that goes: a group of three is what an Org Admin on the free tier has,
        // not a group withheld.
        moneyLayerOnly: true,
      },
      // Last, and deliberately **not** marked `moneyLayerOnly` (#180). It is the one
      // Organisation screen the plan does not decide on, because it is where the plan is
      // bought: withholding it from a free organisation would hide the upgrade behind the
      // upgrade, and the row above it — withheld from exactly that organisation — is what
      // sends somebody looking for this one.
      { href: "/settings/billing", label: "nav.billing" },
    ],
  },
] as const satisfies readonly {
  heading: string | null;
  orgAdminOnly: boolean;
  screens: readonly { href: string; label: string; moneyLayerOnly?: boolean }[];
}[];

/**
 * **The frame every Settings screen is drawn in**, and the reason there is a component
 * here rather than two lines of markup in `(app)/settings/layout.tsx`: the shared screen
 * record in `@/test/screens` has to compose the same frame the router assembles, and a
 * copy of it there is a copy that drifts from what a reader gets — which is the fault
 * that file's own docblock warns about.
 *
 * **It spans the region rather than sitting in the measure column** (ADR-0022): it is
 * navigation, which is scanned rather than read along, so it is one of the things that
 * ADR names as spanning. On a phone it is a block above the screen it leads to, because a
 * 390px viewport has no room for a column beside anything; from `md` it is the column the
 * ticket asks for, and the screen's own body sits to the right of it.
 *
 * **A group an Org Admin does not have is not drawn at all** — not drawn-and-disabled and
 * not drawn-and-empty. A greyed row is an advertisement for a screen somebody cannot open,
 * and an empty labelled box is worse: it says the group exists and that this reader's is
 * broken. The screens behind it refuse a non-admin on their own account too, with
 * `notFound()`, so the URL is no way in either — this decides what is *drawn* and never
 * what is *allowed*.
 *
 * **The column itself stays, though, for a member who has only Preferences in it.**
 * Dropping it was written and taken out again: with one row left it looked like furniture,
 * naming the screen the reader was already on directly above that screen's own heading.
 * But a settings column whose current row repeats the page's title is the ordinary shape
 * of a settings column — the repetition is *where you are*, not noise — and taking it away
 * would mean a member's Settings and an Org Admin's were two different kinds of screen
 * rather than one screen with a group withheld. What the ticket withholds is the group.
 *
 * **Nothing is marked as the current screen**, for the reason `app-nav.tsx` gives and
 * more strongly here: the screen's own `ScreenHeader` heading is the first thing beside
 * this column and says in words which of these five is open. Marking it would mean reading
 * the path, which turns this into a Client Component — and a Client Component cannot be
 * composed in the shared screen record, which is where every layout guard it inherits
 * lives. If a reader is ever seen losing their place among five labelled rows, this is
 * the thing to add.
 */
export function SettingsFrame({
  isOrgAdmin,
  moneyLayer,
  children,
}: {
  isOrgAdmin: boolean;
  /** Whether the organisation's plan includes the money — see `groups` above. */
  moneyLayer: boolean;
  children: ReactNode;
}) {
  return (
    // A block above the screen on a phone, a column beside it from `md`. 390px has no
    // room for a column next to anything, and a monitor has no reason to stack.
    <div className="flex flex-col gap-landmark md:flex-row">
      <SettingsNav isOrgAdmin={isOrgAdmin} moneyLayer={moneyLayer} />
      <div className="flex min-w-0 flex-1 flex-col gap-landmark">{children}</div>
    </div>
  );
}

/**
 * The column itself. Exported for the suite that asks what is in it for whom; everything
 * that draws a Settings screen goes through {@link SettingsFrame}.
 */
export function SettingsNav({
  isOrgAdmin,
  moneyLayer,
}: {
  isOrgAdmin: boolean;
  moneyLayer: boolean;
}) {
  const t = useTranslations();
  // Two filters of the same kind, in the order the column is built: which groups this
  // reader has, then which screens this organisation's plan has inside them. A screen
  // withheld by the plan is withheld the way a group withheld by the role is — not drawn
  // at all, never greyed — because a row leading to a `notFound()` is an advertisement
  // for a screen nobody here can open.
  const drawn = groups
    .filter((group) => isOrgAdmin || !group.orgAdminOnly)
    .map((group) => ({
      ...group,
      screens: group.screens.filter(
        (screen) => moneyLayer || !("moneyLayerOnly" in screen && screen.moneyLayerOnly),
      ),
    }));

  return (
    <nav
      aria-label={t("nav.settingsGroups")}
      className="flex shrink-0 flex-col gap-group md:w-56"
    >
      {drawn.map((group) => (
        <div key={group.heading ?? "preferences"} className="flex flex-col gap-1">
          {group.heading ? (
            <h2 className="text-muted-foreground px-3 pb-1 text-xs font-medium tracking-wide">
              {t(group.heading)}
            </h2>
          ) : null}
          {group.screens.map((screen) => (
            // `prefetch={false}`, as everywhere else a link is on every screen of a
            // destination: this column is drawn beside all five, so its prefetches fire
            // five times over and are discarded. See the note in `tender-row.tsx`.
            <Link
              key={screen.href}
              href={screen.href}
              prefetch={false}
              className="hover:bg-muted flex min-h-11 items-center rounded-control px-3 text-sm font-medium transition-colors"
            >
              {t(screen.label)}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
