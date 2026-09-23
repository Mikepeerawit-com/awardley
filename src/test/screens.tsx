import { NextIntlClientProvider, useFormatter, useTranslations } from "next-intl";

import "@/app/globals.css";

import { AppHeader, type AppLocation } from "@/components/app-header";
import { BottomNav } from "@/components/app-nav";
import { BillingPortalForm } from "@/components/admin/billing-portal-form";
import { BillingSubscribeForm } from "@/components/admin/billing-subscribe-form";
import { BillingTrialForm } from "@/components/admin/billing-trial-form";
import { CurrencyConversionForm } from "@/components/admin/currency-conversion-form";
import { GroupRobotForm } from "@/components/admin/group-robot-form";
import { InviteForm } from "@/components/admin/invite-form";
import { MembershipList } from "@/components/admin/membership-list";
import { AuthScreen } from "@/components/auth/auth-screen";
import { ChooseLanguageOptions } from "@/components/auth/choose-language-options";
import { LoginForm } from "@/components/auth/login-form";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { SignupForm } from "@/components/auth/signup-form";
import { WorkingSheet } from "@/components/comparison/working-sheet";
import { ImageCountBadge } from "@/components/images/image-count-badge";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { EditQuoteForm } from "@/components/quotes/edit-quote-form";
import { ItemBrief } from "@/components/quotes/item-brief";
import { NoSupplierFoundForm } from "@/components/quotes/no-supplier-found-form";
import { QuoteList } from "@/components/quotes/quote-list";
import { SettingsFrame } from "@/components/settings/settings-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AssigneeControls } from "@/components/tenders/assignee-controls";
import { EditTenderForm } from "@/components/tenders/edit-tender-form";
import { MyWorkList } from "@/components/tenders/my-work-list";
import { NewTenderForm } from "@/components/tenders/new-tender-form";
import { OutstandingBand } from "@/components/tenders/outstanding-band";
import { ReferenceImageGallery } from "@/components/tenders/reference-image-gallery";
import { ReferenceImageUploader } from "@/components/tenders/reference-image-uploader";
import { SourcingList } from "@/components/tenders/sourcing-list";
import {
  AddTenderItemForm,
  EditTenderItemForm,
} from "@/components/tenders/tender-item-forms";
import {
  TenderDeadlines,
  TenderFacts,
} from "@/components/tenders/tender-facts";
import { ReduceBar } from "@/components/tenders/reduce-bar";
import { TenderGroup } from "@/components/tenders/tender-group";
import { TenderSections } from "@/components/tenders/tender-sections";
import { QuoteForm } from "@/components/quotes/quote-form";
import { Button } from "@/components/ui/button";
import { Fold } from "@/components/ui/fold";
import { Section } from "@/components/ui/section";
import {
  Measure,
  type MeasureWidth,
  ScreenBody,
} from "@/components/ui/screen-body";
import { ScreenError } from "@/components/ui/screen-error";
import { ScreenHeader } from "@/components/ui/screen-header";
import { ScreenSkeleton } from "@/components/ui/screen-skeleton";
import { instantDayFormat } from "@/lib/calendar-date";
// A type only, and it has to stay one: the module is `server-only`, so a value
// imported from it would throw the moment a browser test loaded this file.
import type { SheetItem } from "@/lib/comparison/sheet";
import type { QuotePhoto } from "@/lib/images/quote-photos";
import type { ReferenceImage } from "@/lib/images/reference-images";
import type { Member, Membership, OwnerOption } from "@/lib/org/members";
import { blankQuote, quoteAsSubmitted } from "@/lib/quotes/quote-form";
import type { NoSupplierFound, Quote } from "@/lib/quotes/quotes";
import type { MyWorkRow } from "@/lib/tenders/my-work";
import type { OutstandingItem, SourcingItem } from "@/lib/tenders/tender-screen";
import type { Tender, TenderItem } from "@/lib/tenders/tenders";
import { yourQuotes } from "@/lib/tenders/viewer";
import type { WorklistRow } from "@/lib/tenders/worklist";
import en from "@/messages/en.json";
import zhHans from "@/messages/zh-Hans.json";

/**
 * **Every screen, composed the way its page composes it** — the fixtures, and nothing
 * that measures or captures them.
 *
 * This began at the top of `screens.layout.test.tsx` and moved here when #78 gave it a
 * second reader. Two things now render these: the layout guard, which measures them and
 * asserts, and the contact sheet, which photographs them for somebody to look at. They
 * have to be the *same* screens or the sheet stops being evidence about the thing under
 * test — so there is one copy, and adding a screen here adds it to both.
 *
 * **This record is the seam every layout guard is built on, and since #131 that is a
 * promise rather than a happy accident.** A screen added below inherits all of them with
 * nothing else to remember: no sideways scroll at 390px in both locales, the region at the
 * desk, the bar and the body sharing a left edge, the one-row app bar, and a contrast walk
 * over every word in both themes. What used to sit outside it — a hand-maintained table of
 * per-screen widths in `screens.layout.test.tsx`, kept honest by a reconciliation test —
 * has moved *into* each entry as `measure`, so there is one place to add a screen and one
 * place to state what it commits to.
 *
 * Each entry is a screen as the router really assembles it: the page's own `AppHeader` —
 * carrying the location shape that screen really draws, since #73 — then the page's body
 * underneath, inside `ScreenBody` — the wrapper every page draws it in — and the bottom
 * bar `(app)/layout.tsx` draws beneath every one of them since #96. An org admin is used
 * throughout, because that is the fullest menu and the worst case for the bar.
 *
 * The bottom bar is **not** in any of them, and that is the point: it belongs to
 * `(app)/layout.tsx` rather than to a page, so {@link Screen} draws it once for all of
 * them — including the two that replace a page. A `loading.tsx` or an `error.tsx` keeps
 * it, and a fallback that took the way out with it would strand somebody on a screen that
 * could not load.
 *
 * `OutcomePanel` is the one part of the detail screen missing: it is an `async` Server
 * Component that awaits `tenderVerdict`, so it cannot be rendered in a browser at all.
 * Making it drawable here means giving it the same sync seam as the rest, which is a
 * change to that component rather than to this file.
 *
 * The mocks these components need are **not** here. `vi.mock` is hoisted per file and
 * cannot be shared, so each renderer declares its own block — which is why the two look
 * duplicated and are not.
 */

/** Both locales, in the order everything downstream lists them. */
export const locales = [
  ["en", en],
  ["zh-Hans", zhHans],
] as const;

export type Locale = (typeof locales)[number][0];
export type Messages = typeof en;

/**
 * Each screen, as its page composes it under the `(app)` layout.
 *
 * **`measure` is the width that screen's prose and its form fields commit to**, in the
 * pixels a reader gets — the narrower column inside the region (ADR-0022). It is declared
 * here, beside the composition it is a claim about, because it is the one thing the region
 * rule leaves varying: the region is a single number stated once in the guard, and this is
 * not. Stated in pixels rather than as the `MeasureWidth` handed to `ScreenBody`, so that
 * the number asserted comes from somewhere other than the code under test — a declaration
 * that read the same token the component does could only ever agree with itself.
 *
 * A function, not a const: the fixtures it reads are declared at the bottom of the file,
 * the way this repo's other layout suites arrange them, and a top-level object would
 * touch them before they exist.
 */
export function screens(m: Messages) {
  /**
   * The Owner's edit screen, drawn at rest or with either kind of fold on it down.
   *
   * A function rather than three literals because the records differ by a prop apiece,
   * and the reason there are three at all is that a `<details>` the reader has not opened
   * is invisible to `checkVisibility()` and therefore to every guard in the `layout`
   * project (ADR-0026).
   *
   * **An options object rather than positional booleans.** There are two axes since
   * ADR-0031 put each existing Item behind a fold of its own, and `editingATender(false,
   * true)` at a call site says nothing about which fold is which.
   */
  const editingATender = ({
    addingItem = false,
    openingItems = false,
  }: { addingItem?: boolean; openingItems?: boolean } = {}) => (
    <Body location={editBar}>
      <ScreenHeader eyebrow={tender.reference} heading={m.tenders.edit}>
        <p className="type-quiet">{m.tenders.editDescription}</p>
      </ScreenHeader>

      <Measure>
        <EditTenderForm tenderId={tender.id} members={ownerChoices} defaults={tender} />
      </Measure>

      <Measure>
        <Section id="items" title={m.tenders.item.plural}>
          <p className="type-quiet">{m.tenders.item.hint}</p>

          {/* All three Items, and `removable` on every one — the Tender has more than
              one, so the destructive Remove is drawn per row. A fixture with a single
              Item would compose the one shape of this screen that has no Remove on it
              at all — and, since ADR-0031, the one shape that arrives with a fold open.
              `openingItems` opens all three rather than one: the forms are interchangeable
              only until somebody makes them not, and a record that opened one would pass
              in silence while two went unwalked. */}
          {tender.items.map((item) => (
            <EditTenderItemForm
              key={item.id}
              tenderId={tender.id}
              item={item}
              members={members}
              callerId={tender.ownerUserId}
              isOwner
              removable
              defaultOpen={openingItems}
            />
          ))}

          <AddTenderItemForm tenderId={tender.id} defaultOpen={addingItem} />
        </Section>
      </Measure>

      {/* Outside the measure, as the page draws it: the gallery is a grid of tiles
          scanned rather than a line of prose read along. */}
      <Section id="reference-images" title={m.tenders.referenceImages.title}>
        {/* Uncapped, which is the widest the picker ever is: the record measures the
            shape a paid organisation gets, and an allowance changes no pixel of it. */}
        <ReferenceImageUploader tenderId={tender.id} allowance={null} />
        <ReferenceImageGallery
          tenderId={tender.id}
          images={referenceImages}
          items={tender.items}
        />
      </Section>
    </Body>
  );

  return {
    // The screen an Assignee actually opens (ADR-0021): their own Items, each linking
    // straight to the quote form. Composed at 390px, which is the width it is designed
    // for rather than one it merely has to survive.
    "my work": {
      measure: 768,
      body: (
        <Body>
          <ScreenHeader heading={m.myWork.title}>
            <p className="type-quiet break-words">
              {m.myWork.description}
            </p>
          </ScreenHeader>
          <MyWorkList items={myWorkRows} />
        </Body>
      ),
    },
    // The same screen with the work done, which is a screen in its own right rather than
    // the one above with rows removed: it draws one sentence and no list at all, and the
    // list reaching zero is the requirement this destination is built around.
    "my work, finished": {
      measure: 768,
      body: (
        <Body>
          <ScreenHeader heading={m.myWork.title}>
            <p className="type-quiet break-words">
              {m.myWork.description}
            </p>
          </ScreenHeader>
          <MyWorkList items={[]} />
        </Body>
      ),
    },
    "the tender list": {
      measure: 768,
      body: (
        <Body>
          <ScreenHeader
            heading={m.tenders.title}
            actions={<Button className="h-11">{m.tenders.record}</Button>}
          >
            <p className="type-quiet break-words">
              {m.tenders.description}
            </p>
          </ScreenHeader>
          {/*
            The reduce bar in its **widest and busiest** state, because every state
            narrower than this one is a subset of it and a record that drew the resting
            bar would confer its guards on almost none of the controls.

            Three things are true of it at once here, and each pulls a different way:
            the filter is active, so the count and Clear are drawn; no View matches it,
            so the fine controls are unfolded and every chip is measured; and it has a
            missed submission the filter rejected, so the alarm notice is drawn under it
            — the one part of this screen that is allowed to say a filter has a cost.

            `revealMissed` is on because that is the notice's **longer** sentence in
            `zh-Hans` — "不受此筛选限制，正在显示" against "被此筛选隐藏" — and its Hide
            link is geometrically identical to the Show link it replaces. Recording the
            wider of two states measures both; recording the narrower measures one.
          */}
          <ReduceBar
            filter={{
              mine: true,
              text: "gloves",
              progress: ["sourcing", "quoted"],
              notYetSourced: true,
              revealMissed: true,
            }}
            matched={2}
            onList={47}
            suppressedMissed={1}
          />
          {/* The pinned alarm band and an ordinary Progress group, which are the two
              shapes the list has. The band is the wider of the two — it carries a hint
              paragraph and a count inside a bordered box — so measuring only the plain
              group would miss the case that actually pushes. */}
          <TenderGroup
            section={{ group: "submission_missed", tenders: [deadRow] }}
            timezone="Asia/Bangkok"
          />
          <TenderGroup
            section={{ group: "sourcing", tenders: [ordinaryRow, unbrokenRow] }}
            timezone="Asia/Bangkok"
          />
        </Body>
      ),
    },
    // ── The Owner's two forms, which until #143 no record held ──────────────────────
    //
    // Both are real routes carrying real forms, and neither was in this file — so neither
    // was in a single guard this record confers. It is the fault #135 found on the working
    // sheet, one ticket later and on two more screens, and ADR-0019 already carries the
    // lesson: a contrast claim, a focus ring, a tap floor and a region width are each a
    // claim about a *list of surfaces*, and the list is only as long as the screens
    // somebody measured.
    "recording a tender": {
      measure: 768,
      body: (
        <Body>
          <ScreenHeader heading={m.tenders.record}>
            <p className="type-quiet">{m.tenders.recordDescription}</p>
          </ScreenHeader>
          <Measure>
            {/* The Owner recording it defaults to themselves, and the form opens on one
                Item row — both the state a reader really arrives at. The per-row Remove
                beside a second row is one press away and so is on no screen at rest;
                `target.layout.test.tsx` presses the button and measures it there. */}
            <NewTenderForm members={ownerChoices} defaultOwnerId="user-somchai" />
          </Measure>
        </Body>
      ),
    },
    "a tender": {
      measure: 768,
      body: (
        <Body location={tenderBar}>
          <ScreenHeader
            heading={tender.clientName}
            actions={
              <Button variant="outline" className="h-11">
                {m.tenders.edit}
              </Button>
            }
          >
            <p className="type-quiet break-words">{tender.title}</p>
          </ScreenHeader>
          {/* The bar the page builds from the parts it actually drew. `outcome` is in
              this list and the panel it points at is not in this fixture, for the reason
              the file header gives — the panel is `async`. That is a gap in what can be
              *photographed*, not a wrong list: the page draws both for an Owner, and it
              is the bar's width in five links across two scripts that this record is
              here to measure. */}
          <TenderSections sections={ownerSections} />
          {/* The two dates the Tender turns on, against a fixed day so the reading is a
              property of the fixture rather than of the morning somebody ran the suite —
              see {@link fixtureToday}. One lit and one hollow, which is the pair. */}
          <TenderDeadlines
            tender={tender}
            today={fixtureToday}
            timezone="Asia/Bangkok"
            decided={false}
          />
          {/* The two Items the Owner has neither priced nor given up on, both named with
              nothing in them to break at — which is the row this band has that can be any
              width, because a product name is whatever the client called it. */}
          <OutstandingBand
            tenderId={tender.id}
            items={yourOutstanding(tender.ownerUserId)}
          />
          {/* The densest thing in the app, and until #135 the one screen no shared guard
              could see: it was measured only by its own suite, on a bare page, in one
              locale and one theme. `--money-red` and `--money-green` are drawn here and
              nowhere else, so a Margin that went unreadable in the dark was a defect with
              no test standing anywhere near it. */}
          <Section id="items" title={m.tenders.sections.items}>
            <WorkingSheet
              tenderId={tender.id}
              items={sheetItems}
              photos={quotePhotos}
              referenceImages={referenceImages}
              reportingCurrency={tender.reportingCurrency}
              // The record is the paid shape, which is the one every guard in this file
              // was written against: the money is what makes this the densest screen in
              // the app, and a fixture drawn without it would measure a shorter page than
              // any Owner on a plan with it ever sees.
              moneyLayer
            />
          </Section>
          {/* The fold **shut**, as the page draws it and as a reader arriving from a
              Reminder really meets this screen. What is behind it is measured by
              `"a tender with its folds open"` below rather than here — see the note on
              that entry for why the two are separate records instead of one compromise. */}
          <Fold id="tender-facts" title={m.tenders.sections.facts}>
            <TenderFacts tender={tender} />
          </Fold>
          {/* A Section since ADR-0033, one block per Item: an Item nobody is sourcing
              is work outstanding, which is exactly what a shut bar would hide. */}
          <Section id="assignees" title={m.tenders.assignees.title}>
            <div className="flex min-w-0 flex-col gap-group">
              {tender.items.map((item) => (
                <div key={item.id} className="flex min-w-0 flex-col gap-field">
                  <h3 className="type-subhead min-w-0 break-words">
                    {item.productName}
                  </h3>
                  <AssigneeControls
                    tenderId={tender.id}
                    itemId={item.id}
                    itemName={item.productName}
                    assignees={item.assignees}
                    members={members}
                    callerId="user-somchai"
                    isOwner
                  />
                </div>
              ))}
            </div>
          </Section>
        </Body>
      ),
    },
    /**
     * The same screen with both folds open — the state a reader reaches by tapping one.
     *
     * **A record of its own rather than a flag on the one above**, for the reason
     * `"a tender somebody else owns"` is one: it is markup no other screen draws in that
     * arrangement, and the two answer different questions. The entry above answers *what
     * does a reader arrive at*, which is what the contact sheet is for and what the
     * density budget prices. This one answers *does what is behind the fold hold up* —
     * and it has to exist, because a `checkVisibility()` of a closed `<details>` is
     * `false`, so every shared guard that walks these records is blind to the contents
     * otherwise. {@link TenderFacts} is drawn nowhere else in the app at all, so without
     * this its four cells would have no contrast, tap-target or 390px guard standing
     * anywhere near them.
     *
     * The Owner's copy, because it is the fuller of the two: three Assignees with a Remove
     * on every row, and the picker for adding a fourth.
     *
     * **The whole screen, not just the two folds.** A record holding the folds alone was
     * written and taken out again: it draws no prose and no form field, so it reaches for
     * no {@link Measure}, and `screens.layout.test.tsx` asserts the set of measure columns
     * is exactly `[measure]` rather than at most one — so the fixture needed an empty
     * `Measure` put in it purely to satisfy a guard. That is the shape `app-header.tsx`
     * refuses when it declines to teach `overflowing` an exception: a check with a hole cut
     * in it for the case in front of you. The screen entire costs four more photographs and
     * owes the guards nothing.
     */
    "a tender with its folds open": {
      measure: 768,
      body: (
        <Body location={tenderBar}>
          <ScreenHeader
            heading={tender.clientName}
            actions={
              <Button variant="outline" className="h-11">
                {m.tenders.edit}
              </Button>
            }
          >
            <p className="type-quiet break-words">{tender.title}</p>
          </ScreenHeader>
          <TenderSections sections={ownerSections} />
          <TenderDeadlines
            tender={tender}
            today={fixtureToday}
            timezone="Asia/Bangkok"
            decided={false}
          />
          <OutstandingBand
            tenderId={tender.id}
            items={yourOutstanding(tender.ownerUserId)}
          />
          <Section id="items" title={m.tenders.sections.items}>
            <WorkingSheet
              tenderId={tender.id}
              items={sheetItems}
              photos={quotePhotos}
              referenceImages={referenceImages}
              reportingCurrency={tender.reportingCurrency}
              // The record is the paid shape, which is the one every guard in this file
              // was written against: the money is what makes this the densest screen in
              // the app, and a fixture drawn without it would measure a shorter page than
              // any Owner on a plan with it ever sees.
              moneyLayer
            />
          </Section>
          <Fold id="tender-facts" title={m.tenders.sections.facts} defaultOpen>
            <TenderFacts tender={tender} />
          </Fold>
          <Section id="assignees" title={m.tenders.assignees.title}>
            <div className="flex min-w-0 flex-col gap-group">
              {tender.items.map((item) => (
                <div key={item.id} className="flex min-w-0 flex-col gap-field">
                  <h3 className="type-subhead min-w-0 break-words">
                    {item.productName}
                  </h3>
                  <AssigneeControls
                    tenderId={tender.id}
                    itemId={item.id}
                    itemName={item.productName}
                    assignees={item.assignees}
                    members={members}
                    callerId="user-somchai"
                    isOwner
                  />
                </div>
              ))}
            </div>
          </Section>
        </Body>
      ),
    },
    // The same route, drawn for somebody who does not own the Tender (ADR-0020, #92).
    // A screen in its own right rather than a variant of the one above: it has the sheet
    // and the Outcome panel taken out and a list of your own sourcing put in, and that
    // list is markup no other screen draws.
    "a tender somebody else owns": {
      measure: 768,
      body: (
        <Body location={tenderBar}>
          <ScreenHeader
            heading={tender.clientName}
            actions={
              <Button variant="outline" className="h-11">
                {m.tenders.edit}
              </Button>
            }
          >
            <p className="type-quiet break-words">{tender.title}</p>
          </ScreenHeader>
          {/* Three links rather than the Owner's five: no Outcome section, because
              ADR-0020 gives that panel to the Owner alone and the page builds this bar
              from the parts it drew. */}
          <TenderSections sections={assigneeSections} />
          <TenderDeadlines
            tender={tender}
            today={fixtureToday}
            timezone="Asia/Bangkok"
            decided={false}
          />
          {/* The one Item this reader still owes, which is the whole of what the band
              says to somebody who has already priced two of the three. */}
          <OutstandingBand
            tenderId={tender.id}
            items={yourOutstanding("user-nok")}
          />
          <Section id="items" title={m.tenders.yourItems.title}>
            <SourcingList
              tenderId={tender.id}
              items={yourSourcing("user-nok")}
              photos={quotePhotos}
              referenceImages={referenceImages}
            />
          </Section>
          {/* Shut, as the page draws it. What is inside is measured on
              `"a tender with its folds open"`. */}
          <Fold id="tender-facts" title={m.tenders.sections.facts}>
            <TenderFacts tender={tender} />
          </Fold>
          {/* The non-Owner's copy of the per-Item blocks: no picker, and a Remove only
              on their own row. */}
          <Section id="assignees" title={m.tenders.assignees.title}>
            <div className="flex min-w-0 flex-col gap-group">
              {tender.items.map((item) => (
                <div key={item.id} className="flex min-w-0 flex-col gap-field">
                  <h3 className="type-subhead min-w-0 break-words">
                    {item.productName}
                  </h3>
                  <AssigneeControls
                    tenderId={tender.id}
                    itemId={item.id}
                    itemName={item.productName}
                    assignees={item.assignees}
                    members={members}
                    callerId="user-nok"
                    isOwner={false}
                  />
                </div>
              ))}
            </div>
          </Section>
        </Body>
      ),
    },
    // The Owner's other form, and the densest screen in the app after the working sheet:
    // the Tender's own fields, one form per Item, an uploader, a gallery of the client's
    // pictures with a picker on every one, and the Assignee controls under all of it.
    //
    // **Three records off one body, unlike the Tender detail's pair.** That screen's
    // folds-open twin is written out in full because it is a different screen — the
    // Owner's rather than the Assignee's, with the working sheet in place of the sourcing
    // list. These three differ in one prop each, so a second and third copy of sixty
    // lines would be a hundred and twenty lines that could drift apart while all three
    // kept passing.
    //
    // **The screen as it is arrived at**: every Item shut behind its product name
    // (ADR-0031) and the add-an-item fold shut under them, which is what a reader who
    // came to correct one thing scrolls past.
    "editing a tender": { measure: 768, body: editingATender() },
    // **The same screen with the add-an-item fold open**, and it exists for the reason
    // ADR-0026 gives: a shut `<details>` fails `checkVisibility()`, so with the fold down
    // the contrast walk, the tap floor and the 390px measure all stop at its summary bar
    // and four inputs and a submit go unwalked.
    "editing a tender, adding an item": {
      measure: 768,
      body: editingATender({ addingItem: true }),
    },
    // **And with all three existing Items open**, for the same reason again and about the
    // forms ADR-0031 folded: three Save buttons, three Removes and twelve inputs that
    // every guard walked before the fold went in front of them, and would silently stop
    // walking now. All three, because a record that opened one would leave two unwalked.
    "editing a tender, with every item open": {
      measure: 768,
      body: editingATender({ openingItems: true }),
    },
    "sourcing an item": {
      measure: 768,
      body: (
        <Body location={itemBar}>
          {/* The brief, with the client's pictures in it — the block #75 put above the
              form so an Assignee can check they are pricing the right thing. */}
          <ItemBrief
            productName={gloves.productName}
            quantity={gloves.quantity}
            unit={gloves.unit}
            description={gloves.description}
            internalQuoteDeadline={tender.internalQuoteDeadline}
          />
          <QuoteList
            tenderId={tender.id}
            tenderItemId={gloves.id}
            quotes={gloveQuotes}
            photos={new Map()}
            // The Owner is reading, and a Quote is correctable by whoever sourced it or by
            // them (`mayCorrectQuote`) — so every row draws its edit and delete controls,
            // which is the crowded case and the one worth measuring at 390px.
            callerId={tender.ownerUserId}
            ownerUserId={tender.ownerUserId}
            selectedQuoteId={selectedGloveQuoteId}
            reportingCurrency={tender.reportingCurrency}
            photoAllowance={null}
            // Every Quote on the Item, both Assignees' — the Owner's view, and the widest
            // this list gets. What a non-Owner reads is the screen below rather than this
            // one with rows removed: it counts the list differently and carries a form this
            // one does not (#94).
            yourQuotesOnly={false}
          />
          <Measure>
            <QuoteForm
              tenderId={tender.id}
              tenderItemId={gloves.id}
              defaults={blankQuote({
                unit: gloves.unit,
                today: "2026-08-12",
                reportingCurrency: tender.reportingCurrency,
              })}
              reportingCurrency={tender.reportingCurrency}
              photoAllowance={null}
            />
          </Measure>
        </Body>
      ),
    },
    // The same route, drawn for an Assignee who does not own the Tender (ADR-0020, #93):
    // their own Quotes and nobody else's, counted in words that say whose they are. This
    // is the screen the reduction is really for — an Assignee opens it several times per
    // Item off a run of supplier calls, and it is the one place they type anything — so
    // it is composed whole here, down to the form and the refusal box the Owner's copy
    // above leaves out.
    "sourcing an item on a tender somebody else owns": {
      measure: 768,
      body: (
        <Body location={itemBar}>
          <ItemBrief
            productName={gloves.productName}
            quantity={gloves.quantity}
            unit={gloves.unit}
            description={gloves.description}
            internalQuoteDeadline={tender.internalQuoteDeadline}
            // What the client sent, narrowed to this Item as `loadItemSourcingScreen`
            // narrows it — an Assignee shows their supplier the picture of the thing they
            // are being asked to price, and a picture of another Item is not it. The badge
            // draws nothing at all when there are none, so no guard is written here.
            images={
              <ReferenceImages label={gloves.productName} images={imagesOn(gloves.id)} />
            }
          />

          <section className="flex flex-col gap-field">
            {/* "2 quotes from you", never "2 quotes recorded": the heading counts this
                reader's own work rather than making a claim about the Item that ADR-0020
                has just decided they do not get told. */}
            <YourQuotesHeading count={yourGloveQuotes.length} />
            <QuoteList
              tenderId={tender.id}
              tenderItemId={gloves.id}
              quotes={yourGloveQuotes}
              photos={quotePhotos}
              callerId="user-nok"
              ownerUserId={tender.ownerUserId}
              // The Owner picked somebody else's Quote, so the loader drops the id rather
              // than pointing it at a row this reader was never handed.
              selectedQuoteId={null}
              yourQuotesOnly
              reportingCurrency={tender.reportingCurrency}
              photoAllowance={null}
            />
          </section>

          <Measure>
            <section className="flex flex-col gap-field">
              <div className="flex flex-col gap-label">
                <h2 className="type-subhead">{m.quotes.add}</h2>
                <p className="type-quiet">{m.quotes.addHint}</p>
              </div>
              <QuoteForm
                tenderId={tender.id}
                tenderItemId={gloves.id}
                defaults={blankQuote({
                unit: gloves.unit,
                today: "2026-08-12",
                reportingCurrency: tender.reportingCurrency,
              })}
                reportingCurrency={tender.reportingCurrency}
                photoAllowance={null}
              />
            </section>
          </Measure>

          {/* The third state, in the dashed box the page gives it: an Assignee saying
              they could not source this at all. It draws the form rather than a record,
              because nobody has given up on the gloves — this reader has not, and the two
              colleagues who could have have both priced them instead. A colleague's note,
              when there is one, is shown as fact and is measured on the Tender detail. */}
          <Measure>
            <section className="border-border rounded-surface border border-dashed p-4">
              <NoSupplierFoundForm
                tenderId={tender.id}
                tenderItemId={gloves.id}
                mine={null}
                others={refusalsOn(gloves.id).filter(
                  (refusal) => refusal.userId !== "user-nok",
                )}
                reportingCurrency={tender.reportingCurrency}
              />
            </section>
          </Measure>
        </Body>
      ),
    },
    "correcting a quote": {
      measure: 768,
      body: (
        <Body location={itemBar}>
          <ScreenHeader
            eyebrow={`${tender.reference} · Nitrile examination glove, powder-free, size M`}
            heading={m.quotes.editTitle}
          >
            <SourcedBy name={gloveQuotes[0].sourcedByName} />
          </ScreenHeader>
          <Measure>
            <EditQuoteForm
              tenderId={tender.id}
              tenderItemId={gloves.id}
              quoteId={gloveQuotes[0].id}
              // A non-THB Quote, so the read-only currency cell is drawn carrying a real
              // currency rather than the reporting one it would default to.
              currency={gloveQuotes[0].currency}
              defaults={quoteAsSubmitted(gloveQuotes[0])}
              reportingCurrency={tender.reportingCurrency}
            />
          </Measure>
        </Body>
      ),
    },
    // ── Settings: one destination, two groups, five screens ────────────────────────
    //
    // The three Org Admin screens arrived here in #131. Nothing measured them before: each
    // is an `async` Server Component behind an `isOrgAdmin` gate, and the record they were
    // missing from is the one every layout guard is built on — so the three screens whose
    // left edge ADR-0022 is most visibly about were the three nothing could see. They are
    // also where the second measure in the app is drawn, which is what keeps the
    // per-screen half of that guard a claim rather than one number repeated.
    //
    // #132 put them behind one destination and gave them a sub-navigation column, so they
    // are composed through `SettingsBody` now — the frame the router really assembles.
    // Preferences is the fourth, and it is here **twice**: an Org Admin's, whose column
    // carries both groups, and a member's, whose column carries Preferences alone. That
    // second one is the screen story 6 of #129 is about, and the only composition in the
    // app that differs by who is looking — which is why it is a screen in its own right
    // here rather than a case inside another suite.
    "the Preferences screen": {
      measure: 672,
      body: <SettingsBody>{preferences(m)}</SettingsBody>,
    },
    "the Preferences screen, for a member who is not an Org Admin": {
      measure: 672,
      body: <SettingsBody isOrgAdmin={false}>{preferences(m)}</SettingsBody>,
    },
    "the People screen": {
      measure: 672,
      body: (
        <SettingsBody>
          <ScreenHeader heading={m.people.title}>
            <p className="type-quiet">{m.people.description}</p>
          </ScreenHeader>

          <Measure>
            <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
              <h2 className="type-subhead">{m.people.invite.title}</h2>
              <InviteForm />
            </section>
          </Measure>

          <section className="flex flex-col gap-field">
            <h2 className="type-subhead">{m.people.members}</h2>
            <MembershipList members={memberships} />
          </section>
        </SettingsBody>
      ),
    },
    "the WeCom group screen": {
      measure: 672,
      body: (
        <SettingsBody>
          <ScreenHeader heading={m.groupRobot.title}>
            <p className="type-quiet">{m.groupRobot.description}</p>
          </ScreenHeader>

          <Measure>
            <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
              {/* Set up, which is the fuller of the two shapes: it draws the sentence
                  saying when it was last changed and the control that removes it, neither
                  of which exists on an org that has never saved one. */}
              <GroupRobotForm configured updatedAt="2026-08-20T09:15:00Z" />
            </section>
          </Measure>
        </SettingsBody>
      ),
    },
    "the converting-foreign-prices screen": {
      measure: 672,
      body: (
        <SettingsBody>
          <ScreenHeader heading={m.currencyConversion.title}>
            <p className="type-quiet">{m.currencyConversion.description}</p>
          </ScreenHeader>

          <Measure>
            <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
              <CurrencyConversionForm percent={2.5} />
            </section>
          </Measure>

          <Measure>
            <p className="type-quiet">{m.currencyConversion.affects}</p>
          </Measure>
        </SettingsBody>
      ),
    },
    // Plan and payment, twice, and for the reason Preferences is twice: it is the one
    // screen in Settings whose *body* differs by the organisation looking at it rather
    // than by the reader, and neither half contains the other. An organisation that has
    // never paid is offered two things and told one; an organisation whose card has just
    // stopped working is offered one thing and told four, including the two longest
    // sentences on the screen. A single fixture would leave whichever half it dropped
    // unmeasured at 390px, and the dropped half is where the prose is.
    "the plan and payment screen": {
      measure: 672,
      body: (
        <SettingsBody>
          <ScreenHeader heading={m.billing.title}>
            <p className="type-quiet">{m.billing.description}</p>
          </ScreenHeader>

          <Measure>
            <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
              <p className="text-sm">{m.billing.plan.free}</p>
            </section>
          </Measure>

          <Measure>
            <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
              <BillingTrialForm />
            </section>
          </Measure>

          {/* Four, which is the org the People screen above is drawn for — two fixtures
              naming two different-sized organisations would photograph as two products. */}
          <Measure>
            <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
              <BillingSubscribeForm live={4} />
            </section>
          </Measure>
        </SettingsBody>
      ),
    },
    "the plan and payment screen, for an organisation whose last payment failed": {
      measure: 672,
      body: (
        <SettingsBody>
          <ScreenHeader heading={m.billing.title}>
            <p className="type-quiet">{m.billing.description}</p>
          </ScreenHeader>

          <Measure>
            <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
              <p className="text-sm">{m.billing.plan.paid}</p>
              {/* The trial this organisation converted from, still said out loud — the
                  date is kept after it lapses precisely so this line can exist. */}
              <BillingTrialEnded endedAt="2026-08-20T09:15:00Z" />
              {/* Paying for fewer people than are in the org, which is the gap the two
                  numbers exist to show and the widest this sentence gets. */}
              <BillingPaidFor paid={3} live={4} />
              <p className="text-destructive text-sm">{m.billing.pastDue}</p>
            </section>
          </Measure>

          <Measure>
            <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
              <BillingPortalForm />
            </section>
          </Measure>
        </SettingsBody>
      ),
    },
    // The two screens that stand in for the others, and are screens in their own right:
    // whoever taps a link on a phone sees the first of these before anything else, and
    // sees the second instead of a blank page when the fetch behind it fails (#57).
    // Neither is wrapped in `Body` — a route-level `loading.tsx` and `error.tsx` replace
    // the page, so each has to draw the page's own wrapper itself, and does.
    "the loading fallback": {
      measure: 768,
      body: (
        <>
          <AppHeader />
          <ScreenSkeleton />
        </>
      ),
    },
    // A digest of the length Next really mints, since it is the one string on this screen
    // that nobody chose the width of.
    "a screen that threw": {
      measure: 768,
      body: (
        <>
          <AppHeader />
          <ScreenError digest="3990102495" retry={() => {}} />
        </>
      ),
    },
  };
}

/**
 * **The screens reached before signing in**, which the record above cannot hold.
 *
 * They have no `(app)` shell — no app bar, no bottom bar, and a `main` of their own at
 * `max-w-sm` rather than the region — so they are composed through {@link SignedOut}
 * instead of {@link Screen}, and the width and region guards leave them to
 * `auth-screen.layout.test.tsx`. What they share with everything else is the palette, the
 * type and the controls, which is exactly what the colour, keyboard and motion suites ask
 * about — so those three walk this record and the one above, and neither has a screen the
 * other cannot see.
 *
 * **All four, since #135.** Only the sign-in screen was ever measured, hand-composed twice
 * over in two suites, and the reason given was that `LoginForm` is the busiest of the
 * three forms. That is true of a *width* — the busiest column is the one that pushes — and
 * it is not true of a colour: `/signup` draws a currency picker and hinted fields that no
 * other screen has, and `/choose-language` draws no field at all and two full-width
 * buttons instead. A palette that failed on either would have failed unwatched.
 *
 * Each is a fragment rather than a whole page, for the reason the record above gives:
 * whoever is drawing it decides the theme and the locale.
 *
 * **`body` on each entry, the way {@link screens} carries one**, though there is nothing
 * beside it here and no `measure` for a signed-out screen to commit to. The three suites
 * that walk both records walk them in the same line of code, and a record that answered a
 * bare node would make each of them write the difference out — which is five places to get
 * it wrong, to save one word.
 */
export function signedOutScreens(m: Messages) {
  return {
    "the sign-in screen": {
      body: (
        <AuthScreen title={m.login.title} description={m.login.description}>
          <LoginForm />
        </AuthScreen>
      ),
    },
    // Where somebody invited into the org lands from their email link, and the only
    // screen in the app with two password fields on it.
    "the set-a-password screen": {
      body: (
        <AuthScreen title={m.setPassword.title} description={m.setPassword.description}>
          <SetPasswordForm />
        </AuthScreen>
      ),
    },
    // The screen an organisation is created through (ADR-0039). The longest signed-out
    // form there is, the only one with a select on it, and the only one carrying hints
    // under fields.
    "the sign-up screen": {
      body: (
        <AuthScreen title={m.signup.title} description={m.signup.description}>
          <SignupForm />
        </AuthScreen>
      ),
    },
    // Asked before anything else, and drawn in both languages at once because whoever is
    // reading it cannot yet be assumed to read either (ADR-0011). No field on it at all,
    // which makes it the one signed-out screen that is nothing but controls.
    "the choose-a-language screen": {
      body: (
        <AuthScreen title={m.chooseLanguage.title}>
          <ChooseLanguageOptions />
        </AuthScreen>
      ),
    },
  };
}

/**
 * A signed-out screen, in the box the real `body` gives it.
 *
 * {@link Screen}'s two lines minus the shell: the same {@link Ground}, so the theme is
 * carried the same way, and the same full-height flex column, because `AuthScreen` takes
 * `flex-1` inside it and centres itself in what that gives — which it can only do if
 * something above it has a height.
 */
export function SignedOut({
  locale,
  messages,
  theme = "light",
  children,
}: {
  locale: Locale;
  messages: Messages;
  theme?: Theme;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Bangkok">
      <Ground locale={locale} theme={theme}>
        <div className="flex min-h-dvh flex-col">{children}</div>
      </Ground>
    </NextIntlClientProvider>
  );
}

/**
 * A screen wrapped in the provider every one of them needs, inside the box the real
 * `body` gives it.
 *
 * Both renderers need exactly this and nothing more, so the wrapping lives here rather
 * than being retyped either side.
 *
 * **The full-height flex column is `body`, and the bottom bar is what it is here for.**
 * `app/layout.tsx` gives `body` a full-height flex column and every screen's wrapper takes
 * `flex-1` inside it; `min-h-dvh` is that height stated against the viewport, since this
 * div has no `html` above it to inherit one from. Without the column the `flex-1` measures
 * nothing and the bar lands directly under the last row of a short screen instead of at
 * the foot of the phone, where a thumb finds it — and the bar is drawn here, once, exactly
 * as `(app)/layout.tsx` draws it beneath every page.
 *
 * **`theme` is a parameter of this wrapper and not of any one suite**, so that a screen
 * added to the record above is measured in both themes by whatever already measures it,
 * and neither theme is a parallel seam somebody has to remember. It defaults to light,
 * which is what every suite predating a theme was measuring anyway.
 */
export function Screen({
  locale,
  messages,
  theme = "light",
  children,
}: {
  locale: Locale;
  messages: Messages;
  theme?: Theme;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Bangkok">
      <Ground locale={locale} theme={theme}>
        <div className="flex min-h-dvh flex-col">
          {children}
          <BottomNav />
        </div>
      </Ground>
    </NextIntlClientProvider>
  );
}

/** The two themes the token file answers. */
export const themes = ["light", "dark"] as const;

export type Theme = (typeof themes)[number];

/**
 * The ground a screen is drawn on, carrying the theme the way the real root carries it.
 *
 * The class is what `.dark` in `globals.css` selects on, and the two utilities are what
 * `@layer base` gives the real `body` — stated again here because a wrapper that only set
 * the class would redefine every token and then paint them onto nothing, leaving a dark
 * screen on a white page.
 *
 * Exported for the signed-out screens, which have no `(app)` shell around them and so
 * cannot reach it through {@link Screen}: it is the same ground either way, which is the
 * point of it being one component.
 */
export function Ground({
  locale,
  theme,
  children,
}: {
  /**
   * **What makes `:lang(zh)` match, and therefore what makes half the type system real**
   * (#153).
   *
   * `app/layout.tsx` writes `lang` on `<html>` and the whole per-script half of
   * `globals.css` hangs off it — the display, section, subhead, group and quiet tiers each
   * have a second rule under `:lang(zh)`, and `.field-label` has had one since ADR-0019.
   * This ground had no `lang` at all, so *nothing* in the layout project or the contact
   * sheet had ever matched one of them: both locales were drawn with the Latin rules and
   * told apart only by which strings they held. A contact sheet somebody eyeballs
   * `zh-Hans` on first, under an ADR whose standing instruction is to judge that script
   * first, was photographing the other script's type.
   *
   * It is the same fault ADR-0019 keeps finding one layer out each time — the values were
   * never wrong, the list of things anybody measured was too short — and the fix is the
   * same shape: it is a parameter of the shared wrapper, so a screen added to the record
   * gets it from whatever already draws it.
   */
  locale: Locale;
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <div
      lang={locale}
      className={`${theme === "dark" ? "dark " : ""}bg-background text-foreground`}
    >
      {children}
    </div>
  );
}

/**
 * A whole `(app)` page: its own app bar, then the wrapper it draws its body inside.
 *
 * **`Screen`'s two lines, exactly.** It drew its own copy of the wrapper's markup until
 * #97, which was a copy that could drift from the component every page really uses — and
 * the thing #97 changed is exactly that markup, so a suite measuring the copy would have
 * measured nothing. `ScreenBody` and `AppHeader` are both sync and reach for nothing, so
 * this composes them and there is nothing left standing in for anything: `Screen` stopped
 * reading the session in #132, when the bar stopped varying by who was looking at it.
 *
 * `location` is a prop rather than something chosen here, because since #73 each page
 * draws the bar shape that names *where it is* — the list gets the wordmark, a Tender and
 * the sourcing screen get the record form with a reference and a client name in it.
 * Composing the wrong one would measure a screen the router never assembles.
 *
 * **`measure` is one value and reaches the body alone**, exactly as `Screen` hands it:
 * nothing about a width reaches the bar any more, because there is one region and it is
 * written on both sides rather than passed (ADR-0022).
 */
export function Body({
  measure,
  location,
  children,
}: {
  measure?: MeasureWidth;
  location?: AppLocation;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Nothing about the reader is handed in since #132: the app menu holds `Settings`
          and `Sign out` for everybody, so there is one bar rather than an admin's and a
          member's, and this composition is the one every member gets. */}
      <AppHeader location={location} />
      <ScreenBody measure={measure}>
        {children}
      </ScreenBody>
    </>
  );
}

/**
 * A **Settings** screen, in the frame `(app)/settings/layout.tsx` really draws round it.
 *
 * The five screens under Settings share a layout rather than each composing their own, so
 * a fixture that drew only the page's own body would measure a screen the router never
 * assembles — with no sub-navigation column beside it and therefore none of the width it
 * takes off the measure at the desk.
 *
 * **The frame is {@link SettingsFrame}, imported rather than retyped**, for the reason at
 * the head of this file: a copy of the layout's markup here is a copy that drifts from
 * what a reader gets, and a padding changed in the real layout would fail nothing. What
 * is left is the two things the layout states about a Settings screen — the measure, and
 * who is looking.
 *
 * `isOrgAdmin` is the one thing that varies, and it varies for the reader rather than for
 * the screen: it decides whether the Organisation group is drawn in the column, which is
 * the whole of what #132 changed about what a member who administers nothing can see.
 */
export function SettingsBody({
  isOrgAdmin = true,
  moneyLayer = true,
  children,
}: {
  isOrgAdmin?: boolean;
  /**
   * Whether the organisation's plan has the money layer, which decides whether Foreign
   * prices is a fourth row in the column (#179). On by default for the reason
   * `isOrgAdmin` is: the widest column is the one worth measuring, and it is the one a
   * paid organisation's Administrator really gets.
   */
  moneyLayer?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Body measure="42rem">
      <SettingsFrame isOrgAdmin={isOrgAdmin} moneyLayer={moneyLayer}>
        {children}
      </SettingsFrame>
    </Body>
  );
}

/**
 * The Preferences screen's own body, which is in the record twice — once inside an Org
 * Admin's column and once inside a member's — and is the same screen both times. Only the
 * column around it differs, which is the whole of what the two entries are contrasting.
 */
function preferences(m: Messages) {
  return (
    <>
      <ScreenHeader heading={m.preferences.title}>
        <p className="type-quiet">{m.preferences.description}</p>
      </ScreenHeader>

      <Measure>
        <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
          <h2 className="type-subhead">{m.localeSwitcher.label}</h2>
          <LocaleSwitcher />
        </section>

        {/* `system` because it is what a member who has never opened this screen holds,
            and because it is the widest of the three in both scripts — 跟随系统 is four Han
            glyphs against two. A fixture pinned to a shorter answer would measure the easy
            case of a row that has to fit three thumb-sized targets at 390px. */}
        <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
          <h2 className="type-subhead">{m.themeSwitcher.label}</h2>
          <ThemeSwitcher current="system" />
        </section>
      </Measure>
    </>
  );
}

/**
 * The heading the sourcing screen draws over one reader's own Quotes: "2 quotes from
 * you", never "2 quotes recorded".
 *
 * A component rather than a string read off `m`, because it is a counted sentence —
 * `{count, plural, …}` — and the raw message pasted into the markup would draw its ICU
 * source rather than the words a reader sees, which is a different screen to measure and
 * a worse one to photograph. {@link ReferenceImages} is here for the same reason.
 */
function YourQuotesHeading({ count }: { count: number }) {
  const t = useTranslations("quotes");

  return (
    <h2 className="type-subhead">{t("yours.recorded", { count })}</h2>
  );
}

/**
 * "Sourced by Nok Wattanapong", as the correct-a-Quote page draws it under its heading.
 *
 * A component for the reason {@link YourQuotesHeading} is one: it is a message with a
 * value in it, and the raw ICU pasted into the markup would draw its own source rather
 * than the words a reader sees.
 */
function SourcedBy({ name }: { name: string }) {
  const t = useTranslations("quotes");

  return (
    <p className="type-quiet break-words">{t("sourcedBy", { name })}</p>
  );
}

/**
 * The day a free trial ran out, as the Billing screen says it.
 *
 * A component for the reason {@link YourQuotesHeading} is one — the message carries a
 * value — and it formats the instant rather than taking a formatted string, because the
 * whole point of `instantDayFormat` is that a moment's *day* is a question only the org's
 * timezone answers, and a fixture that pre-rendered the date would measure a screen
 * nobody's timezone produces.
 */
function BillingTrialEnded({ endedAt }: { endedAt: string }) {
  const t = useTranslations("billing");
  const format = useFormatter();

  return (
    <p className="type-quiet">
      {t("trial.ended", {
        date: format.dateTime(new Date(endedAt), instantDayFormat("Asia/Bangkok")),
      })}
    </p>
  );
}

/** How many people the plan pays for against how many are here, the same way. */
function BillingPaidFor({ paid, live }: { paid: number; live: number }) {
  const t = useTranslations("billing");

  return <p className="type-quiet">{t("people", { paid, live })}</p>;
}

/** The client's own pictures for one Item, as the sourcing page hands them to the brief. */
function ReferenceImages({
  label,
  images,
}: {
  label: string;
  images: ReferenceImage[];
}) {
  const t = useTranslations("tenders.referenceImages");

  return (
    <ImageCountBadge
      openLabel={t("openCount", { label, count: images.length })}
      images={images}
    />
  );
}

/** The two record bars, carrying the unbroken strings a client really supplies. */
const tenderBar = {
  kind: "record",
  backHref: "/tenders",
  reference: "TR-2026-0142",
  detail: "ChulalongkornMemorialHospitalProcurementDepartment",
} as const;

/**
 * The same bar one screen further in: the edit screen's back goes to the Tender it is
 * editing rather than to the list, and that is the whole of what differs.
 */
const editBar = { ...tenderBar, backHref: "/tenders/8f14e45f" } as const;

export const itemBar = {
  kind: "record",
  backHref: "/tenders/8f14e45f",
  reference: "TR-2026-0142",
  detail:
    "ChulalongkornMemorialHospitalProcurementDepartment · Nitrile examination glove, powder-free, size M",
} as const;

/* ============================ fixtures ============================ */

const members: Member[] = [
  { id: "user-somchai", name: "Somchai Prasertkul" },
  { id: "user-nok", name: "Nok Wattanapong" },
  { id: "user-wei", name: "Wei Zhang" },
  // Not on this Tender, so the enrol-yourself picker has somebody left to name.
  { id: "user-ploy", name: "Ploy Sirikanya" },
];

/**
 * The Owner picker's options on both of the Owner's forms.
 *
 * `ownerOptions` builds these in the app and is `server-only`, so they are written out
 * here rather than computed — the same reason `SheetItem` is a type import at the head of
 * this file.
 *
 * **Every one of them current, and the `former` label deliberately not composed.** A
 * Tender whose Owner has since been disabled draws that Owner as *"… (no longer a
 * member)"*, which is the longest string the picker can hold — but `NativeSelect` is
 * `w-full min-w-0`, so an option's text is not a width this record could measure either
 * way. Composing a departed Owner here would buy a longer string that changes no
 * rectangle, and would cost the fixture its agreement with `tender`, whose Owner is one
 * of the four members above.
 */
const ownerChoices: OwnerOption[] = members.map((member) => ({
  ...member,
  former: false,
}));

/**
 * The org as the People screen reads it: one Org Admin, one ordinary member, one already
 * Disabled, and one with no `wecom_userid` recorded.
 *
 * The four together are the widest that screen gets — both badges are drawn, and the Test
 * Mention control is drawn in both of its states — which is what a row measured at 390px
 * has to hold. The names are the same colleagues the pickers elsewhere in this file name,
 * because two fixtures naming two different orgs would photograph as two products.
 */
const memberships: Membership[] = [
  {
    id: "user-somchai",
    name: "Somchai Prasertkul",
    email: "somchai@taihue.example",
    wecomUserid: "SomchaiP",
    isOrgAdmin: true,
    disabledAt: null,
  },
  {
    id: "user-nok",
    name: "Nok Wattanapong",
    email: "nok@taihue.example",
    wecomUserid: "NokW",
    isOrgAdmin: false,
    disabledAt: null,
  },
  {
    id: "user-wei",
    name: "Wei Zhang",
    email: "wei@taihue.example",
    // Nobody has recorded one, so the Test Mention control is drawn in the state that
    // cannot be pressed — which is the half of that row an org with a new colleague in it
    // actually sees.
    wecomUserid: null,
    isOrgAdmin: false,
    disabledAt: null,
  },
  {
    id: "user-ploy",
    name: "Ploy Sirikanya",
    email: "ploy@taihue.example",
    wecomUserid: "PloyS",
    isOrgAdmin: false,
    disabledAt: "2026-07-30T02:11:00Z",
  },
];

const rowBase = {
  id: "",
  dateReceived: "2026-08-01",
  internalQuoteDeadline: "2026-08-20",
  clientSubmissionDeadline: "2026-08-28",
  expectedDecisionDate: null,
  ownerUserId: "user-somchai",
  notes: null,
  submittedAt: null,
  itemCount: 12,
  progress: "sourcing",
  dueDeadlines: ["internal_quote"],
  status: { kind: "due", tone: "signal", deadline: "internal_quote", days: 1 },
  notYetSourced: 0,
  assigneeUserIds: [],
  reference: "",
  clientName: "",
  title: "",
  ownerName: "",
  // A worklist row states two dates and a Progress and no money at all, so the currency
  // rides along on the shape without being drawn. It is the Tender's all the same.
  reportingCurrency: "THB",
} satisfies WorklistRow;

const ordinaryRow: WorklistRow = {
  ...rowBase,
  id: "8f14e45f-ceea-4d67-b4a7-4c5e2f6a1b90",
  reference: "TR-2026-0142",
  clientName: "Bangkok Metropolitan Administration",
  title: "Medical consumables, Q3 2026",
  ownerName: "Somchai P.",
};

/** Nothing invented: Thai procurement references run this long without a break. */
const unbrokenRow: WorklistRow = {
  ...rowBase,
  id: "1c9d3b77-0a52-4c1e-9f88-2b6d4e7a5c31",
  reference: "TR20260142MOPHDMSCENTRALPROCUREMENT0098",
  clientName: "ChulalongkornMemorialHospitalProcurementDepartment",
  title: "NitrileExaminationGlovesPowderFreeSizeMediumNonSterile",
  ownerName: "Somchai Prasertkul",
};

/** The pinned group's one row, carrying the longest sentence the list ever says. */
const deadRow: WorklistRow = {
  ...rowBase,
  id: "2b7a1c05-6e39-4f21-8a4d-9c0e3f5b7d12",
  reference: "TR20260142MOPHDMSCENTRALPROCUREMENT0098",
  clientName: "ChulalongkornMemorialHospitalProcurementDepartment",
  title: "NitrileExaminationGlovesPowderFreeSizeMediumNonSterile",
  ownerName: "Somchai Prasertkul",
  progress: "new",
  dueDeadlines: [],
  status: { kind: "submission_missed", tone: "alarm", days: 128 },
};

/**
 * The Tender's Items — several of them, because a Tender with one on it is not the case
 * the Assignee's reduced screens are for (#94).
 *
 * Everything below that is about an Item is derived from these rather than written out
 * again beside them: a `SourcingItem` is one of these carrying one reader's own work, and
 * the outstanding band names two of them. Held once, they cannot come to disagree about
 * what the client asked for.
 */
/**
 * Three on every Item, and the Owner one of them — the competing shape (ADR-0033).
 *
 * Two non-Owner Assignees are what make ADR-0020's reduction visible at all — it hides
 * a colleague's price, and an Item with one Assignee has no colleague to hide — and the
 * Owner is here because only an Assignee may enter a Quote (`CONTEXT.md`, **Assignee**).
 * Without that, the Owner's sourcing screen draws a form the page would have refused
 * them, and precedence is settled: a user who is both sees everything.
 */
const itemAssignees = [
  { id: "user-somchai", name: "Somchai Prasertkul" },
  { id: "user-nok", name: "Nok Wattanapong" },
  { id: "user-wei", name: "Wei Zhang" },
];

const items: TenderItem[] = [
  {
    id: "item-gloves",
    productName: "NitrileExaminationGlovesPowderFreeSizeMediumNonSterile",
    description:
      "Non-sterile, TFDA registration number to be quoted alongside every line.",
    quantity: 40000,
    unit: "piece",
    outcome: null,
    outcomeAt: null,
    assignees: itemAssignees,
  },
  {
    id: "item-masks",
    productName: "SurgicalFaceMaskThreePlyTypeIIRWithEarloopsNonSterile",
    description: null,
    quantity: 2000,
    unit: "box of 50",
    outcome: null,
    outcomeAt: null,
    assignees: itemAssignees,
  },
  {
    id: "item-syringes",
    productName: "Disposable syringe, 5ml, luer lock",
    description: null,
    quantity: 12000,
    unit: "piece",
    outcome: null,
    outcomeAt: null,
    assignees: itemAssignees,
  },
  /* The Item every offer on which the Owner ruled out (#167), and the only reason this
     fixture has a fourth: the banner that says so is drawn on an Item whose quote table
     is gone, which no arrangement of the three above can reach — the gloves and the
     syringes are the two the ranked table is measured on, and the masks are folded away
     behind a selection.

     The client's line is explicit about two things — sterile, and wrapped one to a pad —
     and that is what makes ruling out on **fit** plausible here rather than an Owner
     being difficult. Sourced by all three Assignees, so the outstanding band is unchanged
     by it: they went and found offers, and what the Item needs now is more of them. That
     nothing on their screens says so is ADR-0032's accepted silence and #168's. */
  {
    id: "item-pads",
    productName: "Alcohol prep pad, 70% isopropyl, individually wrapped, sterile",
    description: "Sterile, one pad per sachet. Bulk tubs are not acceptable.",
    quantity: 100000,
    unit: "piece",
    outcome: null,
    outcomeAt: null,
    assignees: itemAssignees,
  },
];

/** The Item both sourcing screens are about, named rather than indexed at five sites. */
const gloves = items[0];

/**
 * My work's rows: three Items one Assignee has not answered for, at the three urgencies
 * the row can carry.
 *
 * Built from `items` rather than written out again, so the product names here and the
 * ones the sourcing screens draw cannot come to disagree. Two of the three are the
 * unbroken runs a client really supplies — a row that has to break a 53-character product
 * name *and* a reference with no space in it is the case that pushes this screen sideways
 * at 390px, and it is the ordinary case rather than the invented one.
 *
 * The alarm row is a deadline already gone by, which is the reading `sourcingDeadlineStatus`
 * gives an Item its own Assignee is late on. Its lamp and its sentence are the loudest
 * thing here and they are drawn together, so a screen that lost one would be measured
 * with the other still in it.
 */
const myWorkRows: MyWorkRow[] = [
  {
    itemId: items[0].id,
    tenderId: "8f14e45f-ceea-4d67-b4a7-4c5e2f6a1b90",
    productName: items[0].productName,
    clientName: "ChulalongkornMemorialHospitalProcurementDepartment",
    reference: "TR20260142MOPHDMSCENTRALPROCUREMENT0098",
    internalQuoteDeadline: "2026-08-07",
    status: { tone: "alarm", days: -5 },
  },
  {
    itemId: items[1].id,
    tenderId: "8f14e45f-ceea-4d67-b4a7-4c5e2f6a1b90",
    productName: items[1].productName,
    clientName: "Bangkok Metropolitan Administration",
    reference: "TR-2026-0142",
    internalQuoteDeadline: "2026-08-13",
    status: { tone: "signal", days: 1 },
  },
  {
    itemId: items[2].id,
    tenderId: "1c9d3b77-0a52-4c1e-9f88-2b6d4e7a5c31",
    productName: items[2].productName,
    clientName: "Siriraj Hospital, Faculty of Medicine",
    reference: "TR-2026-0151",
    internalQuoteDeadline: "2026-09-30",
    status: { tone: "calm", days: 49 },
  },
];

/**
 * The day the Tender detail's two deadlines are read against.
 *
 * **Fixed, and it has to be.** `TenderDeadlines` states "Quotes due tomorrow" or "Quotes
 * were due 20 Aug" depending on the day it is asked, and a fixture that asked the real
 * clock would photograph a different sentence every morning and change the width of the
 * thing the layout guard is measuring. ADR-0010 already bans a bare `new Date()` under
 * `src/` and says why; a fixture has a boundary too, and this is it.
 *
 * **2026-08-19 is chosen so the pair is not one tone twice.** The Tender's Internal Quote
 * Deadline is the 20th — one day out, inside the rolling window, so that line is lit and
 * reads "Quotes due tomorrow" — and its Client Submission Deadline is the 28th, nine days
 * out and therefore hollow. A day on which both were calm would photograph half the
 * component and let a signal-on-card contrast fault through unmeasured.
 */
export const fixtureToday = "2026-08-19";

/**
 * The Tender detail's parts, as its page composes the list for each of the two readers.
 *
 * Written out here rather than imported from the page, because the page is an `async`
 * Server Component behind `currentUser` and is reachable by no browser test — the same
 * reason every other screen in this file is assembled by hand. What keeps the two honest
 * is that both name the parts by **message key**, so a section renamed in `en.json` is
 * renamed on the bar in the app and in the photograph together.
 */
const ownerSections = [
  { id: "items", label: "tenders.sections.items" },
  { id: "outcome", label: "tenders.outcome.title" },
  { id: "assignees", label: "tenders.assignees.title" },
];

/**
 * Two entries since ADR-0033 turned the Assignees into a Section, which is exactly the
 * floor {@link TenderSections} draws a bar for — so the Assignee's screen gains the bar
 * it used to be one part short of. Their screen also stopped being short in the same
 * change: the per-Item assignee blocks put real distance under the bar, which is what a
 * jump link is for.
 */
const assigneeSections = [
  { id: "items", label: "tenders.yourItems.title" },
  { id: "assignees", label: "tenders.assignees.title" },
];

export const tender: Tender = {
  id: "8f14e45f-ceea-4d67-b4a7-4c5e2f6a1b90",
  reference: "TR-2026-0142",
  clientName: "ChulalongkornMemorialHospitalProcurementDepartment",
  title: "Medical consumables and disposables, fiscal year 2026 Q3",
  dateReceived: "2026-08-01",
  internalQuoteDeadline: "2026-08-20",
  clientSubmissionDeadline: "2026-08-28",
  expectedDecisionDate: null,
  ownerUserId: "user-somchai",
  ownerName: "Somchai Prasertkul",
  submittedAt: null,
  // What this Tender opened in (ADR-0036), and what every converted figure on the
  // contact sheet is drawn in. THB rather than anything else because the fixture prices
  // below are the ones #27 measured in baht, and this is a rename rather than a
  // re-pricing: the digits and the currency they were computed in both stay put.
  reportingCurrency: "THB",
  // Free text somebody typed, which is the fact on this grid that can be any length.
  notes:
    "Client asked for the TFDA registration numbers alongside every line, and confirmation that gloves are non-sterile.",
  items,
};

/**
 * Every Quote on the Tender, from each of its Assignees — the Item's whole record, which
 * is what the Owner is handed and what the two reduced screens are a subset of (ADR-0020).
 *
 * **Five on each undecided Item, because five is what a Tender carries.** The number is
 * the Owner's, given during the triage session on
 * [#151](https://github.com/Mikepeerawit-com/tender-tracker/issues/151) and the only
 * source there is — nothing is in production, so no query answers this. It was three and
 * two until [#157](https://github.com/Mikepeerawit-com/tender-tracker/issues/157) raised
 * it, which is why ADR-0030 could state its headline share as arithmetic on measured card
 * heights and can now state it as a measurement. The masks stay at two: a decided Item is
 * folded away on the sheet, so what it holds is a count on a chip rather than a column of
 * cards, and inventing rows behind a fold nobody opens would lengthen the run without
 * lengthening the screen.
 *
 * **The pads carry five too, and every one of them is ruled out.** Five is the number that
 * makes that Item worth drawing: it is ADR-0032's own arithmetic — five cards at 232–350px
 * becoming five lines — and the count the banner above them reads aloud. It is also the
 * one place in this record where five Quotes cost the screen almost nothing, which is the
 * whole of what ruling out is for.
 *
 * More than one person's on the Item both sourcing screens draw, because that is the only
 * arrangement in which the reduction is a visible thing at all: the Owner's copy of the
 * gloves screen lists five, and an Assignee's lists the two that are theirs. A fixture
 * with one Quote on it would photograph the same screen twice.
 *
 * **The awkward rows are meant to stay the minority.** Every Quote below that carries
 * something the sheet has to mark — a Stale Rate, an Alternative, a unit the Item is not
 * counted in — says so where it sits, and the ones added to reach five deliberately draw
 * none of those marks. An Item on which every row is exceptional is not the Item the Owner
 * reads.
 *
 * Every rate is frozen into the row as a real one is, and the THB figure is
 * `unitPrice × fxRateApplied` — the product the database computes, so that nothing here
 * is a number the app could not have produced.
 */
const everyQuote: Quote[] = [
  {
    id: "q1a",
    tenderItemId: "item-gloves",
    supplierName: "Shanghai Kindly Medical Instruments Co., Ltd.",
    unitPrice: 0.42,
    currency: "CNY",
    quotedUnit: "piece",
    unitPriceReporting: 2.124864,
    fxRateMid: 4.96,
    fxRateApplied: 5.0592,
    fxRateAsOf: "2026-08-11",
    fxRateIsStale: false,
    leadTimeDays: 30,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-12",
    sourcedByUserId: "user-nok",
    sourcedByName: "Nok Wattanapong",
    ruledOut: null,
  },
  /* An alternative, which is the widest row either quote list has: it carries a second
     product name under the supplier's — what the supplier actually priced, in their
     words, and therefore a string nobody here chose the length of. */
  {
    id: "q1b",
    tenderItemId: "item-gloves",
    supplierName: "Top Glove (Thailand) Co., Ltd.",
    unitPrice: 2.35,
    currency: "THB",
    quotedUnit: "piece",
    // A THB Quote stores both rates as 1 and is not converted at all.
    unitPriceReporting: 2.35,
    fxRateMid: 1,
    fxRateApplied: 1,
    fxRateAsOf: "2026-08-13",
    fxRateIsStale: false,
    leadTimeDays: 21,
    matchType: "alternative",
    alternativeProductName:
      "NitrileExaminationGlovePowderFreeSizeMediumBlueTFDARegistered",
    detailNotes: null,
    quotedAt: "2026-08-13",
    sourcedByUserId: "user-nok",
    sourcedByName: "Nok Wattanapong",
    ruledOut: null,
  },
  /* The other Assignee's, on the same Item — the row the Owner reads and the reduced
     screen never receives. It is here to be subtracted. */
  {
    id: "q1c",
    tenderItemId: "item-gloves",
    supplierName: "GuangzhouImproveMedicalInstrumentsCoLtd",
    unitPrice: 0.062,
    currency: "USD",
    quotedUnit: "piece",
    unitPriceReporting: 2.074272,
    fxRateMid: 32.8,
    fxRateApplied: 33.456,
    // A Stale Rate, and the cheapest row on the Item — which is the pair `tooCloseToCall`
    // exists for: it leads the next Quote by 2.4%, and a lead that narrow can be an
    // artifact of two rates frozen a week apart rather than a real difference in price.
    // It is what makes the working sheet draw a banner at all on this fixture.
    fxRateAsOf: "2026-08-04",
    fxRateIsStale: true,
    leadTimeDays: 45,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-11",
    sourcedByUserId: "user-wei",
    sourcedByName: "Wei Zhang",
    ruledOut: null,
  },
  /* Two ordinary Quotes, and ordinary is what they are for.

     The three above are each here because of something they carry — the Stale Rate, the
     Alternative, the second Assignee's row — and a fixture made only of those would draw
     an Item on which every row is exceptional. Real Items are mostly rows like these:
     an exact match, in the Item's own unit, at a rate frozen the same week as the rest,
     from a supplier nobody has quoted twice. They are priced above the pair the
     `tooCloseToCall` banner is about, so the lead it warns on stays the 2.4% between
     `q1c` and `q1a` and this Item still raises exactly the banner it did at three. */
  {
    id: "q1d",
    tenderItemId: "item-gloves",
    supplierName: "Zhejiang Yuanjin Medical Products Co., Ltd.",
    unitPrice: 0.45,
    currency: "CNY",
    quotedUnit: "piece",
    unitPriceReporting: 2.27664,
    fxRateMid: 4.96,
    fxRateApplied: 5.0592,
    fxRateAsOf: "2026-08-11",
    fxRateIsStale: false,
    leadTimeDays: 28,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-12",
    sourcedByUserId: "user-wei",
    sourcedByName: "Wei Zhang",
    ruledOut: null,
  },
  {
    id: "q1e",
    tenderItemId: "item-gloves",
    supplierName: "Ansell (Thailand) Ltd.",
    unitPrice: 2.31,
    currency: "THB",
    quotedUnit: "piece",
    unitPriceReporting: 2.31,
    fxRateMid: 1,
    fxRateApplied: 1,
    fxRateAsOf: "2026-08-14",
    fxRateIsStale: false,
    leadTimeDays: 14,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-14",
    sourcedByUserId: "user-wei",
    sourcedByName: "Wei Zhang",
    ruledOut: null,
  },
  {
    id: "q2a",
    tenderItemId: "item-masks",
    supplierName: "AnhuiZhongkeMedicalDevicesManufacturingCoLtd",
    unitPrice: 62.5,
    currency: "CNY",
    quotedUnit: "box of 50",
    unitPriceReporting: 316.2,
    fxRateMid: 4.96,
    fxRateApplied: 5.0592,
    fxRateAsOf: "2026-08-11",
    fxRateIsStale: false,
    leadTimeDays: 25,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-12",
    sourcedByUserId: "user-wei",
    sourcedByName: "Wei Zhang",
    ruledOut: null,
  },
  {
    id: "q2b",
    tenderItemId: "item-masks",
    supplierName: "Bangkok Safety Supplies Co., Ltd.",
    unitPrice: 340,
    currency: "THB",
    quotedUnit: "box of 50",
    unitPriceReporting: 340,
    fxRateMid: 1,
    fxRateApplied: 1,
    fxRateAsOf: "2026-08-14",
    fxRateIsStale: false,
    leadTimeDays: 7,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-14",
    sourcedByUserId: "user-wei",
    sourcedByName: "Wei Zhang",
    ruledOut: null,
  },
  {
    id: "q3a",
    tenderItemId: "item-syringes",
    supplierName: "Zhejiang Kangfu Medical Devices Co., Ltd.",
    unitPrice: 1.15,
    currency: "CNY",
    quotedUnit: "piece",
    unitPriceReporting: 5.81808,
    fxRateMid: 4.96,
    fxRateApplied: 5.0592,
    fxRateAsOf: "2026-08-11",
    fxRateIsStale: false,
    leadTimeDays: 35,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-12",
    sourcedByUserId: "user-wei",
    sourcedByName: "Wei Zhang",
    ruledOut: null,
  },
  /* The Owner's own, and the only Item they have priced — which is what leaves them
     owing the two the outstanding band names on their screen.

     It is also **priced by the box against an Item the client buys by the piece**, which
     is the one thing the comparison sheet refuses to rank rather than quietly dividing by
     a hundred to get a comparable figure (ADR-0009). That refusal is the Item's
     `unit_mismatch` banner, and the only surface in the app drawn in `--destructive` over
     its own wash — so it is the one this fixture has to draw for #135's sweep to have
     seen it in the dark. */
  {
    id: "q3b",
    tenderItemId: "item-syringes",
    supplierName: "Siam Pharma Supply Co., Ltd.",
    unitPrice: 540,
    currency: "THB",
    quotedUnit: "box of 100",
    unitPriceReporting: 540,
    fxRateMid: 1,
    fxRateApplied: 1,
    fxRateAsOf: "2026-08-14",
    fxRateIsStale: false,
    leadTimeDays: 10,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-14",
    sourcedByUserId: "user-somchai",
    sourcedByName: "Somchai Prasertkul",
    ruledOut: null,
  },
  /* Three ordinary Quotes, for the reason the two on the gloves are ordinary — and here
     they are also what keeps the refusal above readable as a refusal. An Item whose only
     rows are the mismatched one and the one it poisons reads as a broken Item; an Item
     with four rankable Quotes on it that the sheet still declines to rank reads as the
     deliberate act ADR-0009 made it. The unit mismatch is unaffected by their number:
     one Quote in a unit the Item is not counted in stops the whole Item being ranked. */
  {
    id: "q3c",
    tenderItemId: "item-syringes",
    supplierName: "Jiangsu Zhengkang Medical Apparatus Co., Ltd.",
    unitPrice: 1.08,
    currency: "CNY",
    quotedUnit: "piece",
    unitPriceReporting: 5.463936,
    fxRateMid: 4.96,
    fxRateApplied: 5.0592,
    fxRateAsOf: "2026-08-11",
    fxRateIsStale: false,
    leadTimeDays: 40,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-12",
    sourcedByUserId: "user-wei",
    sourcedByName: "Wei Zhang",
    ruledOut: null,
  },
  {
    id: "q3d",
    tenderItemId: "item-syringes",
    supplierName: "Nipro (Thailand) Corporation Ltd.",
    unitPrice: 6.15,
    currency: "THB",
    quotedUnit: "piece",
    unitPriceReporting: 6.15,
    fxRateMid: 1,
    fxRateApplied: 1,
    fxRateAsOf: "2026-08-14",
    fxRateIsStale: false,
    leadTimeDays: 12,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-14",
    sourcedByUserId: "user-somchai",
    sourcedByName: "Somchai Prasertkul",
    ruledOut: null,
  },
  /* A second **Frozen Rate** in USD, and a live one. `q1c`'s is the app's other USD row
     and it is a **Stale Rate** — the last rate this app had stored, kept because
     Frankfurter could not be reached (`CONTEXT.md`), which is a fact about that morning
     and not about the rate's age. With only that row on file, stale would read as how
     this fixture stores dollars; with this one beside it, it reads as the exception it
     is. */
  {
    id: "q3e",
    tenderItemId: "item-syringes",
    supplierName: "Shandong Weigao Group Medical Polymer Co., Ltd.",
    unitPrice: 0.17,
    currency: "USD",
    quotedUnit: "piece",
    unitPriceReporting: 5.70486,
    fxRateMid: 32.9,
    fxRateApplied: 33.558,
    fxRateAsOf: "2026-08-12",
    fxRateIsStale: false,
    leadTimeDays: 35,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-13",
    sourcedByUserId: "user-wei",
    sourcedByName: "Wei Zhang",
    ruledOut: null,
  },
  /* **Ruled out** (ADR-0032), and so the one Quote in this record the sheet draws as a
     stub rather than a card — which is the whole of what that decision buys and cannot be
     judged from a fixture that has none. A card is 232-350px and this is a line, and the
     contact sheet is where the difference is looked at on a device.

     On the syringes rather than the gloves, for two reasons. The gloves are the Item both
     sourcing screens draw, and a Quote added there lengthens two screens that are about
     something else. And the syringes keep their `stop` banner this way: they are
     unrankable because `q3a` is priced by the box, so ruling *that* one out would take the
     app's only `--destructive` surface out of the record. Five still compete here, which is
     the count the note above is about. */
  {
    id: "q3f",
    tenderItemId: "item-syringes",
    supplierName: "GuangzhouImproveMedicalInstrumentsCoLtd",
    unitPrice: 0.16,
    currency: "USD",
    quotedUnit: "piece",
    unitPriceReporting: 5.36928,
    fxRateMid: 32.9,
    fxRateApplied: 33.558,
    fxRateAsOf: "2026-08-12",
    fxRateIsStale: false,
    leadTimeDays: 40,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-13",
    sourcedByUserId: "user-somchai",
    sourcedByName: "Somchai Prasertkul",
    // The run with nowhere to break, on the line that has least room for one: a stub is a
    // chip and a name, and `Button`'s `whitespace-nowrap` would take the page sideways.
    ruledOut: {
      byUserId: "user-somchai",
      at: "2026-08-15T02:30:00Z",
      note: "Luer slip, not the luer lock the client specified",
    },
  },
  /* The pads: five offers, three Assignees, and the Owner judged none of them fit.

     Ordinary rows on purpose — no Stale Rate, no Alternative, no odd unit. A stub draws a
     chip and a supplier name and nothing else, so a mark on any of these would be a mark
     nobody can see, and the awkward rows are meant to stay the minority. What each one
     carries instead is its own reason, in the note, on **fit** every time: the two things
     the client's line is explicit about are the two things these suppliers got wrong.
     None is ruled out on price, which is the constraint ADR-0032 pins.

     Entry order is what the sheet draws them in, because a stub has left the ordering the
     rows above are in. */
  {
    id: "q4a",
    tenderItemId: "item-pads",
    supplierName: "Siam Pharma Supply Co., Ltd.",
    unitPrice: 0.55,
    currency: "THB",
    quotedUnit: "piece",
    unitPriceReporting: 0.55,
    fxRateMid: 1,
    fxRateApplied: 1,
    fxRateAsOf: "2026-08-14",
    fxRateIsStale: false,
    leadTimeDays: 14,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-14",
    sourcedByUserId: "user-somchai",
    sourcedByName: "Somchai Prasertkul",
    ruledOut: {
      byUserId: "user-somchai",
      at: "2026-08-16T03:10:00Z",
      note: "Non-sterile. The client's line says sterile and this one does not.",
    },
  },
  {
    id: "q4b",
    tenderItemId: "item-pads",
    supplierName: "Jiangsu Zhengkang Medical Apparatus Co., Ltd.",
    unitPrice: 0.1,
    currency: "CNY",
    quotedUnit: "piece",
    unitPriceReporting: 0.50592,
    fxRateMid: 4.96,
    fxRateApplied: 5.0592,
    fxRateAsOf: "2026-08-14",
    fxRateIsStale: false,
    leadTimeDays: 35,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-14",
    sourcedByUserId: "user-nok",
    sourcedByName: "Nok Wattanapong",
    ruledOut: {
      byUserId: "user-somchai",
      at: "2026-08-16T03:12:00Z",
      note: "70% ethanol, not the isopropyl the line specifies.",
    },
  },
  {
    id: "q4c",
    tenderItemId: "item-pads",
    supplierName: "Hangzhou Sunmed Medical Instruments Co., Ltd.",
    unitPrice: 0.09,
    currency: "CNY",
    quotedUnit: "piece",
    unitPriceReporting: 0.455328,
    fxRateMid: 4.96,
    fxRateApplied: 5.0592,
    fxRateAsOf: "2026-08-14",
    fxRateIsStale: false,
    leadTimeDays: 35,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-15",
    sourcedByUserId: "user-wei",
    sourcedByName: "Wei Zhang",
    ruledOut: {
      byUserId: "user-somchai",
      at: "2026-08-16T03:14:00Z",
      note: "Tub of 200, not individually wrapped.",
    },
  },
  {
    id: "q4d",
    tenderItemId: "item-pads",
    supplierName: "Bangkok Medline Co., Ltd.",
    unitPrice: 0.62,
    currency: "THB",
    quotedUnit: "piece",
    unitPriceReporting: 0.62,
    fxRateMid: 1,
    fxRateApplied: 1,
    fxRateAsOf: "2026-08-15",
    fxRateIsStale: false,
    leadTimeDays: 10,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-15",
    sourcedByUserId: "user-nok",
    sourcedByName: "Nok Wattanapong",
    ruledOut: {
      byUserId: "user-somchai",
      at: "2026-08-16T03:15:00Z",
      note: "Pad is 30 × 30 mm; the client asked for 65 × 30.",
    },
  },
  {
    id: "q4e",
    tenderItemId: "item-pads",
    supplierName: "Zhende Medical Co., Ltd.",
    unitPrice: 0.011,
    currency: "USD",
    quotedUnit: "piece",
    unitPriceReporting: 0.369138,
    fxRateMid: 32.9,
    fxRateApplied: 33.558,
    fxRateAsOf: "2026-08-15",
    fxRateIsStale: false,
    leadTimeDays: 45,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-15",
    sourcedByUserId: "user-wei",
    sourcedByName: "Wei Zhang",
    ruledOut: {
      byUserId: "user-somchai",
      at: "2026-08-16T03:17:00Z",
      note: "Photographs show a bulk tub, whatever the line says.",
    },
  },
];

/** One Item's Quotes in entry order — unranked, the way `listQuotes` leaves them. */
function quotesOn(tenderItemId: string): Quote[] {
  return everyQuote.filter((quote) => quote.tenderItemId === tenderItemId);
}

/** The gloves Item's whole record: the Owner's list, and the Quote the edit screen corrects. */
const gloveQuotes = quotesOn(gloves.id);

/**
 * The Item's Selected Quote: the Owner picked Wei's, neither of Nok's.
 *
 * Which is why the reduced screen is handed `null` in its place —
 * `loadItemSourcingScreen` drops a selection naming a Quote the reader was not given,
 * because an id pointing into a list it is not in is a dangling reference and the row it
 * warns about is not on the screen.
 */
const selectedGloveQuoteId = "q1c";

/**
 * The same Item narrowed to one Assignee, asked through the predicate the loaders narrow
 * with rather than written out by hand — so this fixture cannot draw somebody a row the
 * real screen would have taken away.
 */
const yourGloveQuotes = yourQuotes(gloveQuotes, "user-nok");

/**
 * Who said they could not source what.
 *
 * Keyed by Item because a `NoSupplierFound` does not carry one: it is read per Item and is
 * one Assignee's own within it. Assignees compete rather than divide (ADR-0004), so one of
 * them failing is a fact about their suppliers and never a verdict on the Item — which is
 * why the masks carry a refusal and two Quotes at once.
 */
const refusals = new Map<string, NoSupplierFound[]>([
  [
    "item-masks",
    [
      {
        userId: "user-nok",
        name: "Nok Wattanapong",
        note: "Discontinued by the manufacturer; the two importers left both quote a minimum order of ten thousand.",
        createdAt: "2026-08-13T04:00:00Z",
      },
    ],
  ],
]);

function refusalsOn(tenderItemId: string): NoSupplierFound[] {
  return refusals.get(tenderItemId) ?? [];
}

/**
 * What one reader still owes on this Tender: an Item they have neither Quoted nor given
 * up on, which is what an {@link OutstandingItem} is.
 *
 * Worked out here rather than listed, because the band and the sourcing below it are two
 * views of the same facts: a band naming an Item whose Quotes are drawn a few inches
 * under it is a screen the loader would never hand anybody. Nothing on this fixture is
 * decided and nothing is submitted, so the two conditions `outstandingFor` also applies
 * are not asked here.
 */
function yourOutstanding(callerId: string): OutstandingItem[] {
  return items
    .filter(
      (item) =>
        yourQuotes(quotesOn(item.id), callerId).length === 0 &&
        !refusalsOn(item.id).some((refusal) => refusal.userId === callerId),
    )
    .map((item) => ({ id: item.id, productName: item.productName }));
}

/**
 * The Tender's Items as one Assignee meets them on the reduced detail screen: their own
 * Quotes, their own refusal, and nothing of anybody else's — the shape `loadTenderScreen`
 * hands that screen, built the way it builds it.
 *
 * It is also the three states an Item is in there, each carrying the string on it nobody
 * chose the width of. For Nok: one Item with two Quotes on it — a supplier's full
 * registered name beside a price and a photo count — one given up on with a note they
 * typed, and one untouched. The refusal note is the only free text on the screen, and the
 * supplier names beside it are the only other strings the client and the supplier chose
 * the length of.
 */
function yourSourcing(callerId: string): SourcingItem[] {
  return items.map((item) => ({
    id: item.id,
    productName: item.productName,
    quantity: item.quantity,
    unit: item.unit,
    yourQuotes: yourQuotes(quotesOn(item.id), callerId),
    yourNoSupplierFound:
      refusalsOn(item.id).find((refusal) => refusal.userId === callerId) ?? null,
  }));
}

/**
 * The Tender's Items as the **comparison working sheet** reads them — the Owner's half of
 * the detail screen (ADR-0020), and the only place in the app a money direction hue is
 * drawn at all.
 *
 * Built from the same `items` and the same Quotes as everything else here, through
 * {@link sheetItem}, so the sheet and the sourcing screens cannot come to disagree about
 * what the client asked for or what anybody quoted. What is stated below is only the four
 * facts a `SheetItem` carries that a `TenderItem` does not: whether the Item is decided,
 * and the two prices with the confirmation between them.
 *
 * **Between them the four Items draw every surface this screen can reach**, which is
 * what makes them worth composing rather than listing:
 *
 * - **The gloves are undecided**, so the Item opens and the ranked quote table is drawn —
 *   the rank-1 chip in signal, the Alternative's flag tint and chip, the Stale Rate
 *   marking, and the photo and reference-image badges. That stale rate on the cheapest row
 *   is also what raises the `warn` banner: a 2.4% lead frozen a week apart is a lead the
 *   sheet declines to trust. The landed cost is Confirmed and the selling price is above
 *   it, so the Margin is a **gain** — green in `en`, and red in `zh-Hans` (ADR-0023).
 * - **The masks are decided**, on the Quote whose supplier is the unbroken run — which is
 *   what puts a 44-character token with nowhere to break in the narrowest column on the
 *   screen. Their landed cost is Unconfirmed, so the Margin is drawn **provisional** in
 *   flag ink rather than in a direction (ADR-0014), and Nok's refusal puts the second
 *   sourcing chip beside the first.
 * - **The syringes are undecided and unrankable** — the Owner quoted them by the box
 *   against an Item the client buys by the piece — so they carry the `stop` banner, the
 *   one surface in the app drawn in `--destructive` over its own wash. Sold under what
 *   they cost, so the Margin is a **loss**, and therefore the other hue of the pair on the
 *   same screen as the gain.
 * - **Every offer on the pads is ruled out**, so that Item has no quote table at all: the
 *   `all_ruled_out` banner, five stubs under it, and empty pricing fields — which is the
 *   only place in this record the pricing half is drawn with nothing typed into it, and
 *   the honest state for an Item with no offer left to cost. It is also the Item that does
 *   **not** fold despite having no decision to make on it, which is the rule ADR-0032
 *   states and the reason it is worth photographing: an Owner scrolling past sees the one
 *   Item that needs going back to an Assignee.
 *
 * A screen with one Margin on it would photograph as a screen with one hue on it, and the
 * risk #129 leaves open — a gain and a passed deadline both red in `zh-Hans` — can only be
 * judged where both directions are on screen at once.
 */
const sheetItems: SheetItem[] = [
  sheetItem(items[0], {
    selectedQuoteId: null,
    landedCostPerUnit: 2.08,
    landedCostConfirmedAt: "2026-08-14T04:00:00Z",
    sellingPricePerUnit: 2.6,
  }),
  sheetItem(items[1], {
    selectedQuoteId: "q2a",
    landedCostPerUnit: 316.2,
    // Nothing added for shipping, duty or handling yet (ADR-0014), which is what makes
    // the Margin beside it provisional rather than a direction.
    landedCostConfirmedAt: null,
    sellingPricePerUnit: 372,
  }),
  sheetItem(items[2], {
    // Two numbers somebody typed while deciding, on an Item nothing has been chosen on:
    // the Margin is what they are moving the selling price to find, and it recomputes as
    // they type. Unrankable is not the same as unpriceable.
    selectedQuoteId: null,
    landedCostPerUnit: 5.82,
    landedCostConfirmedAt: "2026-08-14T05:00:00Z",
    sellingPricePerUnit: 5.4,
  }),
  sheetItem(items[3], {
    // Nothing, and every field of it deliberately: a landed cost is built from an offer,
    // and there is no offer left standing to build one from. Typing a figure here would
    // be the Owner costing a Quote they have ruled out.
    selectedQuoteId: null,
    landedCostPerUnit: null,
    landedCostConfirmedAt: null,
    sellingPricePerUnit: null,
  }),
];

/**
 * One Item as the sheet reads it: the Item, its Quotes, and the pricing stated beside it.
 *
 * The Quotes and the sourcing record are **derived rather than repeated** — `quotesOn` and
 * `refusalsOn` are the same two functions every other fixture in this file asks — so a
 * Quote added above appears on the sheet without anybody remembering to add it twice, and
 * a count here cannot drift from the rows it is counting.
 */
function sheetItem(
  item: TenderItem,
  pricing: Pick<
    SheetItem,
    | "selectedQuoteId"
    | "landedCostPerUnit"
    | "landedCostConfirmedAt"
    | "sellingPricePerUnit"
  >,
): SheetItem {
  const quotes = quotesOn(item.id);

  return {
    id: item.id,
    productName: item.productName,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    quotes,
    sourcing: { quoteCount: quotes.length, noSupplierFound: refusalsOn(item.id) },
    ...pricing,
  };
}

/**
 * Three photos on one of this reader's own Quotes, so the badge draws a count rather than
 * nothing — and none on the others, which is the map the loader really answers: a Quote
 * with no photos is absent from it rather than present and empty.
 */
const quotePhotos = new Map<string, QuotePhoto[]>([
  [
    "q1a",
    [1, 2, 3].map((n) => ({
      id: `p${n}`,
      url: "",
      uploadedAt: "2026-08-12T07:00:00Z",
      uploadedByName: "Nok Wattanapong",
    })),
  ],
]);

/** The client's own pictures for one Item, as both loaders hand them over. */
function imagesOn(tenderItemId: string): ReferenceImage[] {
  return referenceImages.filter((image) => image.tenderItemId === tenderItemId);
}

/** What the client sent, placed on the Item it is of. */
const referenceImages: ReferenceImage[] = [
  {
    id: "ref-1",
    tenderItemId: "item-gloves",
    url: "",
    uploadedAt: "2026-08-02T03:00:00Z",
    uploadedByName: "Somchai Prasertkul",
  },
];
