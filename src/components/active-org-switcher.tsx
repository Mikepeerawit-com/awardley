"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { switchOrg } from "@/app/actions/org";
// A type only, and it has to stay one: the module is `server-only`, so a value imported
// from it would throw the moment a browser test loaded this file.
import type { HeldOrg } from "@/lib/org/active-org";

type ActiveOrg = { orgs: HeldOrg[]; activeOrgId: string };

/**
 * Which organisations the reader holds, and which one they are looking at.
 *
 * **Context rather than a prop, and it is the one place in this app that needed one.** The
 * bar is drawn by each page rather than by `(app)/layout.tsx` — a layout cannot see the
 * params of the page beneath it, so a bar rendered there could never name which Tender
 * this is — and the switcher belongs on the bar. That leaves two ways to get this answer
 * to it: thread it down through every page that draws a header, or put it where the header
 * can reach up for it. Threading loses on the first page somebody adds and forgets, which
 * would not be a broken screen, it would be a control silently missing for the one person
 * it exists for.
 *
 * **`AppHeader` stays synchronous, which is why this is not simply read where it is
 * used.** That file says at length why it is sync: `app-header.layout.test.tsx` renders it
 * in a real browser at 390px, and a Server Component cannot be awaited there. An async
 * child would take the bar out of the suite that measures it.
 *
 * The default is an empty list rather than a thrown error, so a bar rendered outside the
 * provider — the layout suite's, the contact sheet's — draws exactly the bar it drew
 * before: the switcher is absent, which is also what it is for everybody who holds one
 * Membership.
 */
const ActiveOrgContext = createContext<ActiveOrg>({ orgs: [], activeOrgId: "" });

export function ActiveOrgProvider({
  orgs,
  activeOrgId,
  children,
}: ActiveOrg & { children: ReactNode }) {
  return (
    <ActiveOrgContext.Provider value={{ orgs, activeOrgId }}>
      {children}
    </ActiveOrgContext.Provider>
  );
}

/**
 * The way from one organisation into another — and, for almost everybody, nothing at all.
 *
 * **It renders for nobody today**, which is deliberate rather than unfinished. Every
 * person in every org holds exactly one Membership, `current_org_id()` resolves it without
 * a choice having been made, and a switcher over one option is a control that teaches the
 * reader the menu is full of things that do nothing. It appears the day somebody is
 * invited into a second organisation and not before.
 *
 * **A global mode, and the menu says so by showing which one is on.** The glossary is
 * explicit that the Active Org is per person rather than per tab: two tabs showing two
 * organisations is the thing it exists to prevent, and a reader who cannot see which of
 * them they are in is one who will enter a Quote into the wrong one. So this is a radio
 * group with a tick beside the current org, not a list of links.
 *
 * **The spinner is the same answer `LocaleSwitcher` gives**, for the same reason: the
 * switch revalidates every route in the app, which is the slowest thing either control
 * does, and #57 found that greying a control out is read as the control being broken
 * rather than busy. The sentence is `sr-only` beside it, where it costs no pixels.
 *
 * Which row spins is state of its own rather than something derived from `isPending`,
 * which says only that *a* transition is running and not which organisation it is for.
 */
export function ActiveOrgSwitcher() {
  const { orgs, activeOrgId } = useContext(ActiveOrgContext);
  const t = useTranslations("orgSwitcher");
  const [isPending, startTransition] = useTransition();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  // One organisation is not a choice, it is where you are. The menu it would otherwise sit
  // at the top of is two rows long for everybody, and #132's whole argument was that a
  // menu of things that do nothing teaches people to stop opening it.
  if (orgs.length < 2) return null;

  return (
    <>
      <Menu.RadioGroup
        value={activeOrgId}
        // The whole group rather than each row: a switch is one transition, and a menu in
        // which one row is inert and the others are not invites a second press that would
        // queue a second full revalidation behind the first.
        disabled={isPending}
        onValueChange={(value) => {
          const orgId = String(value);

          if (orgId === activeOrgId) return;

          setSwitchingTo(orgId);
          startTransition(() => switchOrg(orgId));
        }}
      >
        {/* Inside the group, which is where Base UI wires it: `Menu.GroupLabel` registers
            its id with the nearest group so the rows are announced as belonging to
            something named. Outside one it has no context to register with. */}
        <Menu.GroupLabel className="text-ink-faint px-3 py-1.5 text-xs font-medium">
          {t("label")}
        </Menu.GroupLabel>
        {orgs.map((org) => (
          <Menu.RadioItem
            key={org.id}
            value={org.id}
            className="flex min-h-11 w-full cursor-default items-center gap-2 rounded-md px-3 text-sm outline-none select-none data-[disabled]:opacity-60 data-[highlighted]:bg-muted"
          >
            {/* The tick keeps its space whether or not it is drawn, so the names stay in
                one column and the menu does not shift by a glyph's width as the answer
                changes. */}
            <span className="flex size-4 shrink-0 items-center justify-center">
              <Menu.RadioItemIndicator>
                <Check className="size-4" />
              </Menu.RadioItemIndicator>
              {isPending && switchingTo === org.id ? (
                <Loader2 aria-hidden className="size-3.5 animate-spin" />
              ) : null}
            </span>
            <span className="min-w-0 truncate">{org.name}</span>
          </Menu.RadioItem>
        ))}
      </Menu.RadioGroup>
      {/* Mounted always, with the sentence appearing inside it, rather than mounted when
          there is something to say. A live region inserted at the same moment it gains its
          text is one several screen readers never announce, because they have nothing to
          compare it against. */}
      <span role="status" className="sr-only">
        {isPending ? t("switching") : ""}
      </span>
      <div role="separator" className="bg-border my-1 h-px" />
    </>
  );
}
