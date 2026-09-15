import { cookies, headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { WorkingSheet } from "@/components/comparison/working-sheet";
import { Screen } from "@/components/screen";
import { AssigneeControls } from "@/components/tenders/assignee-controls";
import { OutcomePanel } from "@/components/tenders/outcome-panel";
import { OutstandingBand } from "@/components/tenders/outstanding-band";
import { SourcingList } from "@/components/tenders/sourcing-list";
import { TenderDeadlines, TenderFacts } from "@/components/tenders/tender-facts";
import {
  TenderSections,
  type TenderSectionLink,
} from "@/components/tenders/tender-sections";
import { ImageCountBadge } from "@/components/images/image-count-badge";
import { Button } from "@/components/ui/button";
import { Fold } from "@/components/ui/fold";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Section } from "@/components/ui/section";
import { currentUser } from "@/lib/auth/session";
import { todayIn } from "@/lib/calendar-date";
import { runInstantFromHeaders } from "@/lib/run-instant";
import { tenderOutcome } from "@/lib/tenders/outcome";
import { loadTenderScreen } from "@/lib/tenders/tender-screen";
import { ownsTender } from "@/lib/tenders/viewer";

/**
 * Screen 5: the Tender detail — the comparison working sheet for the Owner, and the
 * Items with your own sourcing on them for everybody else (ADR-0020).
 *
 * The Tender's own facts sit above both, and for the Owner everything that decides
 * anything sits in the sheet — one row per Tender Item, undecided Items open, every
 * competing Quote ranked cheapest-first in THB underneath. The layout is wide on purpose
 * and it is one design at every width: the Item's blocks wrap into a column where there is
 * no room for a row, and below 768px the quote table reflows into stacked cards (ADR-0009,
 * #30). Nothing else about the screen changes, and nothing on it scrolls sideways.
 *
 * Everybody else gets {@link SourcingList} in the sheet's place and no Outcome panel:
 * their own Quotes, their own refusals, and no money anywhere. The page never works out
 * which of the two it is drawing — the loader hands it one shape or the other, and
 * `screen` is how it says which.
 *
 * ## The screen has parts now, and a way between them
 *
 * **This was the longest screen in the app and it was one column.** Measured off the
 * contact sheet at 390px: 4786px, against 1100px for the tender list and 844px for My
 * work — five and a half screenfuls with two headings in it, neither of which agreed with
 * the other about what a heading looks like. A reader who arrived from a Reminder with a
 * specific question had exactly one way to answer it, and that was to thumb past
 * everything else.
 *
 * Three things changed and none of them took anything off the screen:
 *
 * 1. **Every part is a {@link Section} with a heading and an anchor**, so the screen has
 *    a middle heading level a reader and a screen reader can both navigate by. The
 *    working sheet and the sourcing list drew no `<h2>` at all before this.
 * 2. **{@link TenderSections} pins the list of those parts to the top**, so a reader who
 *    wants the Outcome does not scroll four thousand pixels to reach it.
 * 3. **What is read once, or never, is behind a {@link Fold}** — the reference facts.
 *    The test is whether the reader arrived with the question: what do I owe, what do
 *    these Items cost and when is this due are what they came for; who owns it and what
 *    the notes say are what they look up. The Assignees were behind a fold too until
 *    ADR-0033 moved assignment onto the Item: an Item with nobody sourcing it is work
 *    outstanding, and work outstanding does not go behind a bar.
 *
 * **The two deadlines were promoted out of the facts grid** to sit above the work as a
 * reading rather than a value — see {@link TenderDeadlines}. They were two of six cells
 * all drawn at one weight, and they are the two the screen turns on.
 *
 * **The order is what the reader arrived for, then what they might ask, then what they
 * look up.** Deadlines, what you personally owe, the Items, the Outcome, the pictures
 * nobody has placed, who is on each Item, and then the fold. Assignees sits after the
 * work because it is about who does it rather than what it is — but it stopped being a
 * fold when ADR-0033 made "nobody is on this Item" a fact the Owner must see without
 * opening anything.
 */
export default async function TenderPage({ params }: PageProps<"/tenders/[id]">) {
  const { id } = await params;
  const store = await cookies();
  const user = await currentUser(store);

  if (!user) redirect("/login");

  // One batch, not six reads in a row: `loadTenderScreen` holds the ordering and the
  // reason for it. The signed URLs among the Reference Images are minted on this render
  // and good for the hour, which is why this screen cannot be cached beyond the request
  // that drew it.
  const view = await loadTenderScreen(id, user.id, store);
  const { tender, members, timezone, referenceImages, unassignedImages, outstandingForYou } =
    view;

  // Another org's Tender and a deleted one are the same answer through RLS, and the
  // same answer is the right one to give.
  if (!tender) notFound();

  const t = await getTranslations("tenders");
  // The day it is **in the org's timezone**, resolved once here from an injected instant
  // (ADR-0010) and handed down — never reached for in the middle. Vercel runs UTC, so a
  // server-local boundary would light this screen's deadlines seven hours early. The
  // tender list resolves it exactly this way and for exactly this reason.
  const today = todayIn(timezone, runInstantFromHeaders(await headers()));
  const isComparison = view.screen === "comparison";
  const hasUnassigned = unassignedImages.length > 0;

  // Built here rather than inside the bar, because which parts exist is this page's
  // answer: the Outcome panel is the Owner's alone (ADR-0020) and the unplaced pictures
  // are drawn only when there are some. A bar that assumed the full set would link to two
  // anchors most readers do not have. Each entry carries the *key* its heading draws, so
  // the two cannot come to call one place by two names.
  //
  // **The folds are not in it, and leaving them out is what keeps the bar honest.** A
  // `Fold` is a 44px bar whether it is open or shut, so the scroll a jump link saves you
  // on one is nothing — and `density.layout.test.tsx` priced the alternative exactly: with
  // the two folds listed, this screen as an Assignee reads it went from 8 control rows to
  // 10 in `en` and 9 in `zh-Hans`, which is a navigation control added to a 1932px screen
  // that had no distance in it to cover. Only the {@link Section}s are destinations, and
  // `TenderSections` draws nothing below two of them — so the Owner's 4786px screen gets
  // the bar and the Assignee's short one does not.
  const sections: TenderSectionLink[] = [
    { id: "items", label: isComparison ? "tenders.sections.items" : "tenders.yourItems.title" },
    ...(isComparison ? [{ id: "outcome", label: "tenders.outcome.title" }] : []),
    ...(hasUnassigned
      ? [{ id: "unassigned-images", label: "tenders.sections.unassignedImages" }]
      : []),
    { id: "assignees", label: "tenders.assignees.title" },
  ];

  return (
    <Screen
      location={{
        kind: "record",
        backHref: "/tenders",
        reference: tender.reference,
        detail: tender.clientName,
      }}
    >
      {/* No reference in the eyebrow and no way back in the actions: the app bar
          carries both on every screen about one record (#73), and drawing the same
          journey twice spends a row of a 390px phone on something already on screen. */}
      <ScreenHeader
        heading={tender.clientName}
        actions={
          <Button
            variant="outline"
            className="h-11"
            nativeButton={false}
            render={<Link href={`/tenders/${tender.id}/edit`} />}
          >
            {t("edit")}
          </Button>
        }
      >
        <p className="type-quiet break-words">{tender.title}</p>
      </ScreenHeader>

      <TenderSections sections={sections} />

      {/* The two dates the Tender turns on, stated as a reading rather than as a value
          and in the same words the worklist row uses. Drawn above everything the reader
          might do, because every one of those acts is against a clock. */}
      <TenderDeadlines
        tender={tender}
        today={today}
        timezone={timezone}
        decided={tenderOutcome(tender.items) !== null}
      />

      {/* First thing under the dates, because arriving from a reminder is the most
          common way this screen is opened and "what do I owe" is the question that
          arrival is asking. It draws nothing at all when the reader owes nothing. */}
      <OutstandingBand tenderId={tender.id} items={outstandingForYou} />

      {/* The one branch on this page, and it is a branch on the *shape* rather than on a
          permission: ADR-0020 gives the comparison sheet, the money and the Outcome panel
          to the Owner, and `loadTenderScreen` answers a shape with none of them in it for
          everybody else. Neither arm can draw what it was not handed, which is why the
          rule is a discriminant here and not an `isOwner` threaded through four
          components. */}
      {view.screen === "comparison" ? (
        <>
          <Section id="items" title={t("sections.items")}>
            <WorkingSheet
              tenderId={tender.id}
              items={view.sheet.items}
              photos={view.sheet.photos}
              referenceImages={referenceImages}
            />
          </Section>

          <Section id="outcome" title={t("outcome.title")}>
            <OutcomePanel tender={tender} timezone={timezone} />
          </Section>
        </>
      ) : (
        <Section id="items" title={t("yourItems.title")}>
          <SourcingList
            tenderId={tender.id}
            items={view.items}
            photos={view.photos}
            referenceImages={referenceImages}
          />
        </Section>
      )}

      {/* Unassigned images are shown on the Tender rather than held back until somebody
          places them: they are the ones with work outstanding, and the placing itself
          happens on the edit screen, where the pictures can be looked at. A Section
          rather than a Fold, because an unplaced picture *is* work — the fold is for what
          is read once or never, and this is a thing somebody still has to do. */}
      {hasUnassigned ? (
        <Section id="unassigned-images" title={t("sections.unassignedImages")}>
          <div className="flex items-start">
            <ImageCountBadge
              openLabel={t("referenceImages.openCount", {
                label: t("referenceImages.unassigned"),
                count: unassignedImages.length,
              })}
              images={unassignedImages}
            />
          </div>
        </Section>
      ) : null}

      {/* The four reference facts the deadlines left behind. Shut, because none of them
          is why anybody opened this screen. */}
      <Fold id="tender-facts" title={t("sections.facts")}>
        <TenderFacts tender={tender} />
      </Fold>

      {/* A Section and not a Fold since ADR-0033: assignment is per Item, and an Item
          nobody is on — Nobody Sourcing — is work outstanding, which is exactly what a
          shut bar would hide. One block per Item, each stating who is on it or that
          nobody is, with the control that fixes it directly underneath — so noticing
          and putting somebody on are one act on one screen. */}
      <Section id="assignees" title={t("assignees.title")}>
        <div className="flex min-w-0 flex-col gap-group">
          {tender.items.map((item) => (
            <div key={item.id} className="flex min-w-0 flex-col gap-field">
              <h3 className="type-subhead min-w-0 break-words">{item.productName}</h3>
              <AssigneeControls
                tenderId={tender.id}
                itemId={item.id}
                itemName={item.productName}
                assignees={item.assignees}
                members={members}
                callerId={user.id}
                // The same sentence the loader asked, asked again rather than a second
                // copy of it written out: `ownsTender` is where "is this reader the
                // Owner" lives, here and in `mayCorrectQuote` both.
                isOwner={ownsTender({ ownerUserId: tender.ownerUserId, callerId: user.id })}
              />
            </div>
          ))}
        </div>
      </Section>
    </Screen>
  );
}
