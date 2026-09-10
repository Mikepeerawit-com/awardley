# The visual system is built for a Chinese reader on a phone

The app shipped on stock shadcn tokens — every colour `oklch(… 0 0)`, pure greyscale — and on `Geist({ subsets: ["latin"] })`. Both are defaults nobody chose, and both are wrong for who actually reads this app: an Assignee who taps a Group Robot link and lands in the WeCom in-app webview on a phone, reading `zh-Hans`. This records the two decisions taken in the redesign of 29 August 2026, because both are pervasive, both look arbitrary from the code, and both had a real alternative.

## The CJK face is declared, and drawn by the device

`subsets: ["latin"]` means the working language of this app has no chosen typeface at all: every Chinese glyph falls back to whatever the handset happens to carry, mixed inline with Geist for the numerals. The decision is to **name the fallback stack deliberately** — PingFang SC, Hiragino Sans GB, Source Han Sans SC, Noto Sans SC, Microsoft YaHei — and to pick the Latin face to sit beside it rather than in front of it.

**Web-loading a CJK face was the alternative, and it was rejected on delivery, not on taste.** A CJK face cannot be subset the way a Latin one can; it is megabytes, and it would be fetched over a phone network inside a webview, on the exact path a reminder link takes. A screen that has not painted is worse than a screen painted in PingFang.

**The cost, accepted deliberately:** the Chinese glyphs differ between an iPhone and an Android handset, so the two do not render identically. That is the price of the page appearing at all on the connection these users have.

The Latin and numeral face is IBM Plex Sans and IBM Plex Mono, chosen for x-height and stroke weight that sit level with PingFang rather than fighting it — which is precisely what Geist-by-default was doing.

## Colour says one of three things, and never says it alone

Three hues carry meaning, and each is allowed to say one thing:

- **Signal** (teal) — something is expected of the person reading. Primary actions, the Selected Quote, rank 1, the outstanding-for-you band.
- **Alarm** (red) — **time, and only time.** A Submission Missed, a passed deadline, an Item still Not Yet Sourced after the Internal Quote Deadline.
- **Flag** (amber) — a property of a Quote or a figure rather than a state: an Alternative, an Unconfirmed Landed Cost, a ranking too close to call.

**Alarm never touches a money figure**, and that is the surprising rule a future reader will want the reason for. (Still true; the second half of this paragraph is answered by ADR-0023 — see the amendment at the foot of this file.) In Chinese financial convention **red is up and green is down** — the inverse of the Western reading. A red negative Margin would be read as a gain by half the people using this daily. Keeping alarm to deadlines sidesteps the inversion rather than picking a side of it, which is the only move available in an app that ships `en` and `zh-Hans` from one component tree.

**Colour never carries the only copy of a meaning.** The indicator lamp has a shape and a labelled sentence as well as a hue, so the screen survives being read in greyscale, by someone colour-blind, or in sunlight.

## Consequences

- **Labels get one rule per script, not one rule stretched over both.** Latin field labels are uppercase with 0.055em tracking; Chinese has no case and tracking damages it, so CJK labels are sentence-case at a larger size. Anywhere a label is styled, both rules exist.
- **The token file is no longer stock.** Replacing zero-chroma tokens touches every screen at once, which is why this is written down rather than discovered by whoever next runs `shadcn add`.
- **Judge new screens in `zh-Hans` first.** The type scale was set for PingFang and checked against IBM Plex, not the reverse. The current mismatch happened by doing it the other way round.
- **Nothing in the schema moves.** This is a rendering decision end to end, exactly as ADR-0009 was.

## Amendment, 4 September 2026 — the values moved, the meanings did not ([#130](https://github.com/Mikepeerawit-com/tender-tracker/issues/130))

The app was repainted whole, as the first increment of the redesign in [#129](https://github.com/Mikepeerawit-com/tender-tracker/issues/129). Everything this ADR decided still stands; two of the things it *recorded* are now false, and both are recorded here rather than edited above, so that the reasoning that produced them survives its own answer.

**The Latin and numeral face is Fira Sans and Fira Code**, not IBM Plex Sans and IBM Plex Mono. The pairing is taken the way its own note states it — *code for data, sans for labels* — and deliberately not the other reading of it, which puts the monospace on headings: a terminal face set above Han body text is a different app from this one. The reason for the choice is the one this ADR already gives, applied again rather than replaced: a Latin face is picked to sit *beside* PingFang, and it is picked because nothing is fetched for the script the app is actually read in.

**The hues moved, and what each is allowed to say did not.** Signal, alarm, flag and ink mean exactly what they mean above. Two of the moves had a reason beyond taste and are the ones worth having written down:

- **Signal went from teal to blue**, decided against the money colours arriving in [#134](https://github.com/Mikepeerawit-com/tender-tracker/issues/134) rather than on its own. A Margin drawn in green beside a rank-1 chip drawn in teal is two greens on one screen meaning two different things, and the reader has to know which is which before either helps. Blue is unambiguous against both green and red, and it keeps signal reading as *act on this* rather than as *good news*.
- **The ground went from a cool near-white to a warm paper.** This ADR chose "not cream" and the repaint reverses it, for the hue underneath: blue over a cool near-white is the ground of every dashboard, and warm paper under blue ink is a working sheet — which is what this app is.

**`--ink-faint` is materially darker than it was, and `--input` darker still. Both are fixes rather than tastes.** At its old value `--ink-faint` drew 10.5px field labels and reference codes at 3.1:1, under the floor for text that size; primary buttons sat at 4.1:1; and the hairline round a text field — which is how a reader knows it *is* a field, and therefore information rather than decoration under WCAG 1.4.11 — sat at 1.3:1 against the ground. All three were invisible for as long as nobody measured them.

`src/app/contrast.layout.test.tsx` is what measures them now. It walks every screen in `@/test/screens` **and the signed-out ones**, in both locales, **both themes** and at **both widths** — the phone in the webview and the Owner's desk, because an element the phone does not draw is an element the walk cannot see. It composites the washes the way the compositor does, holds every word to 4.5:1 (3:1 where the text is large enough for WCAG to allow it), and every field's boundary to 3:1. The rules that merely divide rows are deliberately *not* held to that: they separate what position already separates, and a 3:1 rule between every row would draw a spreadsheet.

It names no token and compares no pixel: the values stay free to move, and what is pinned is that whatever they move to stays readable.

**The `.dark` block was repainted in the same pass**, though nothing turns it on yet. (Something does now — see the second amendment at the foot of this file.) A theme nothing switches on is exactly the one that goes stale, and it is measured by the same guard as the light one, so it is a deliberate answer rather than a leftover. The theme is a parameter of the **shared screen wrapper** rather than of the suite that happens to want it, so a screen added to the record is measured in both themes by whatever already measures it; and the guard asserts that the ground it measured really is the theme it asked for, because a `.dark` that stopped applying would otherwise measure the light palette twice and report the dark one green. Two things in it were quietly wrong and are now fixed: `--destructive` aliased `--alarm` there while the light block went to some trouble to keep them apart, and the hairlines were white at 12% rather than a stated colour.

**Unchanged, and load-bearing:** no CJK webfont is fetched and the stack is declared in full and drawn by the device; the `var()` fallbacks name the Latin family so that anything rendering without `next/font` keeps the whole stack (`src/app/type.layout.test.tsx` is that condition, asserted); colour never carries the only copy of a meaning; alarm is time and only time, and no Margin is given an alarm tone. **Judge new screens in `zh-Hans` first** still holds — read it now as *checked against Fira*.

## Amendment, 4 September 2026 — the inversion is answered rather than sidestepped ([#134](https://github.com/Mikepeerawit-com/tender-tracker/issues/134))

This ADR's money rule had two halves, and only one of them survives.

**Alarm still never touches a money figure**, exactly as stated above. What is no longer true is the sentence after it — that keeping alarm to deadlines *"sidesteps the inversion rather than picking a side of it, which is the only move available in an app that ships `en` and `zh-Hans` from one component tree"*. There was a third move, and ADR-0023 takes it: a change figure carries its own hue, and **the hue is chosen by the locale the screen is rendered in** — red for a gain in `zh-Hans`, green for a gain in `en`. One component tree, two conventions, no reader preference.

The direction hues are **their own tokens**, `--money-red` and `--money-green`, precisely so that this ADR's reservation of alarm for time and only time survives the change: re-hueing alarm must not repaint every gain in the app. And they are named by hue rather than by meaning — the one place in the token file where that is right, because here the value is the fixed thing and the meaning is what moves with the language.

**Colour never carrying the only copy of a meaning is what makes it safe**, and it is load-bearing here rather than a courtesy: every directed figure also draws a triangle and an explicit sign, both identical in the two locales. That is what a greyscale print, a phone in sunlight, a colour-blind reader — and a screenshot pasted into a WeCom group and opened by somebody reading the other convention — are left with.

## Amendment, 4 September 2026 — something turns it on ([#133](https://github.com/Mikepeerawit-com/tender-tracker/issues/133))

The paragraph above bets that a theme nothing switches on goes stale unless the same guard walks it. The bet paid: #133 gave a member the switch — System, light or dark, from Settings → Preferences — and the palette it turns on is the one measured here all along, so turning it on needed no new legibility argument and no repaint.

Two things in this ADR's account of the guard have moved with it. **Dark is now reached two ways** rather than one: the `.dark` class the server writes when a reader has pinned it, and a `prefers-color-scheme` media query under `.theme-system` for a reader who left it to their device. The declarations are stated once and expanded into both by Tailwind's `@variant`, so the repaint rule above — a hue may change, what it is allowed to say may not — is unaffected by there being two readings.

**And the walk in `contrast.layout.test.tsx` is no longer the only browser seam that cares about a theme.** It still measures both palettes on every screen, which is the claim that matters; what it cannot say is *which* palette a given reader gets, because it applies the class itself. `theme.layout.test.tsx` is where that half lives, emulating an operating system's preference over CDP. See [ADR-0024](0024-the-theme-is-the-readers-not-the-devices.md) for why the choice is remembered on the user rather than the device.

## Amendment, 4 September 2026 — the dark theme swept, and two rules the visual system had never stated ([#135](https://github.com/Mikepeerawit-com/tender-tracker/issues/135))

The amendment above bets that a theme walked by the same guard as the light one is a deliberate answer rather than a leftover. The sweep that cashes the bet found three faults, and **not one of them was in the dark palette.** That is the finding worth writing down: what was broken was never the values, it was which surfaces anybody had thought to measure.

**The comparison working sheet was outside `@/test/screens`, and therefore outside every shared guard.** It was measured only by its own suite, on a bare page, in one locale and one theme — so `--money-red` and `--money-green`, which [#134](https://github.com/Mikepeerawit-com/tender-tracker/issues/134) had just introduced, were drawn on no screen anything could see. It is in the record now, inside the Owner's Tender detail where the router really puts it, and it brought two faults with it:

- **The sheet pushed a 390px phone sideways** on the unbroken product names a client really supplies. Its own suite composes names with spaces in them, so the row that has to break had never met a word that could not. `min-w-0` was already there and does not help on its own — `items-start` sizes each child to its own longest word, so the hold needs `max-w-full` beside `break-words`.
- **`--ink-faint` was under the floor again**, at 4.48:1, and in the *light* theme. The amendment above calls it "the lightest ink that clears 4.5:1 on both the paper and a sheet"; there is a third surface, the `muted/40` wash the sheet's header and totals bar are drawn on, and it is darker than either. The value moved to `oklch(0.535 0.018 265)`. **The lesson is the one this ADR keeps relearning: a token's contrast claim is a claim about a list of surfaces, and the list is only as long as the screens somebody measured.**

**The focus ring is now part of the visual system, and it is signal at full strength.** It had never been decided: the fields and buttons carried shadcn's `ring-ring/50` and a link carried whatever the browser drew, tinted by an `outline-ring/50` on `*`. Half strength measures 2.6:1 on the paper and 2.3:1 on the dark ground — under WCAG 1.4.11's 3:1 in **both** themes, which is why this is a decision about the system rather than a patch to the dark block. Signal is the hue for *something is expected of the person reading*, and a control holding the caret is the clearest case of that in the app, so it is drawn at the strength that says so: `:focus-visible { outline: 2px solid var(--ring) }` in `@layer base`, with each component's own ring taken to full opacity.

**Reduced motion is answered once, for everything.** `prefers-reduced-motion` is set by people for whom movement causes nausea, migraine or vertigo, so it is not a taste and it is not a per-component courtesy: `ScreenSkeleton` was the only thing in the app that honoured it, and every `transition-colors` and both pending spinners ran against it. One unlayered block in `globals.css` now takes animation and transition duration to zero — unlayered because a rule in an earlier cascade layer loses to a Tailwind utility in a later one however specific it is. The skeleton's own `motion-reduce:animate-none` went with it: a rule stated twice has one place a reader will look and one place they will not.

**Three suites walk the screen records now, not one.** The amendment above says `contrast.layout.test.tsx` "is what measures them"; it is now what measures the *words*. `focus.layout.test.tsx` tabs every control on every screen in both themes and holds whatever focus changed to 3:1 — Tab rather than `focus()`, because `:focus-visible` is a claim about how focus arrived. `motion.layout.test.tsx` emulates the preference over CDP and asserts nothing moves, paired with a suite asserting the app *does* move without it, so the guard cannot pass by measuring an app with no motion in it (ADR-0016). The compositing they share lives in `src/test/colour.ts` rather than in three copies.

**And the signed-out screens are a record rather than one screen somebody remembered.** Only the sign-in screen was ever measured, hand-composed in two suites, on the reasoning that `LoginForm` is the busiest of the three forms. True of a *width*; false of a colour. All four are in `signedOutScreens` now, and `/choose-language` grew a component so that what is measured is the page rather than a copy of its markup.

**One thing deliberately not changed.** The criterion this ticket was written to says *"text and hairlines meeting contrast on the dark ground"*, and `--border` is still not held to 3:1 — in either theme. That is this ADR's existing rule, not an oversight: the rules between rows separate what position already separates, and holding every one of them to 3:1 draws a spreadsheet. What *is* held to it is the boundary of a field, which is how a reader knows it is a field. If that is ever reopened, it is a decision about the visual system and belongs in an amendment here rather than in a guard.

## Amendment, 4 September 2026 — the tap floor is part of the visual system, and it was never measured ([#142](https://github.com/Mikepeerawit-com/tender-tracker/issues/142))

The amendment above put the focus ring into this system on the reasoning that it *"had never been decided"* — every control carried whatever shadcn or the browser drew, and nobody had said what the app meant. The 44px tap floor is the same fault one layer out: it *had* been decided, in `buildspec_2`, and it was never made anything a build could check.

`buildspec_2` states it twice, and both times as a thing a person does — *"judge at 390px on a real phone, not a narrowed desktop window — tap targets are floored at 44px, which a resized browser will not surface"*, and then, in the list of what is left to the eye, *"44px tap targets and the density feel"*. `docs/simplification-scope.md` is why that is not enough, and it is the same argument that put `density.layout.test.tsx` in the repo at all: **no colleague tests this work before it ships**, so a rule whose only enforcement is a judgement nobody is rostered to make is a rule the app drifts away from silently. It had. Four controls on the Assignee's own screens were drawn 28px high, through five repaints, and nothing in the build could say so.

**What was broken is again not the values — it is which surfaces anybody had thought to measure.** The chrome was never at fault. `AppNav`, `AppMenu`, `AppHeader`, `ThemeSwitcher` and `LocaleSwitcher` each carry an explicit `min-h-11` or `size-11` *and* a suite asserting it, and each of those suites names the 44px floor in its own comment. What had no guard was the page body — the region the Assignee actually works in — and there the floor was reached by remembering to write `className="h-11"` beside `size="sm"`. `SourcingList` remembers; `WorkingSheet` remembers. `QuoteRowControls`, `QuotePhotos`, `ReferenceImageGallery` and `AssigneeControls` did not, and there was no way to tell. **A floor that is opt-in per call site is a floor the next call site is free to miss**, which is why the answer is a property of every screen rather than four more `h-11`s and a note asking people to be careful.

`src/app/target.layout.test.tsx` is what measures it now. It walks the same records as the contrast, focus and motion suites, holds every drawn control to 44px in both dimensions, and measures **the box the control was drawn at** rather than the class it was given — a control handed `h-11` and squeezed by its parent fails, and a control handed nothing that got there on padding passes.

Three choices in it are the reverse of the neighbouring suites' and are made deliberately:

- **At 390px alone.** The floor is a claim about a thumb. A mouse is not a thumb and a 28px button under a pointer is not the same fault, so measuring the desk would assert a rule nobody wrote.
- **In both locales**, where `focus.layout.test.tsx` stands in `en`. That suite asks a colour question and a ring does not change width with the script. This one is geometry end to end, and a Han glyph is about twice the width of a Latin letter — the reason `density.layout.test.tsx` budgets the two locales separately rather than taking the larger.
- **In one theme**, where the contrast walk takes both. A theme changes what a control is painted in and nothing about the box it is painted in; walking both would re-measure identical rectangles. `light` is named rather than defaulted, so that the day the themes differ in geometry is a day somebody has to come here and say so.

**The floor is `buildspec_2`'s 44, not WCAG's 24, and the spacing exception is deliberately not implemented.** WCAG 2.2 SC 2.5.8 lets an undersized target pass when nothing else comes within 24px of it. This app's number is the larger one and it is a floor on the target rather than on the gap, so a control that would need the exception is a control to make bigger.

**One thing deliberately not reached**, stated the way the amendment above states its own: controls that exist only after an interaction — the image lightbox, and the Remove on a photo picked but not yet saved — are drawn by no screen at rest and are in no record this walks. `QuoteForm`'s held-photo Remove is the live one, and it was fixed alongside the four on the strength of being the same control rather than on the strength of being measured.

**Two neighbouring faults this walk did not fix, and both are the same shape as the one it did.** [#143](https://github.com/Mikepeerawit-com/tender-tracker/issues/143): `/tenders/new` and `/tenders/[id]/edit` are not in `@/test/screens` and are therefore outside *every* shared guard — which is precisely what the amendment above found of the working sheet, one ticket after writing the lesson down. [#144](https://github.com/Mikepeerawit-com/tender-tracker/issues/144): fifteen submit buttons answer a press with `disabled:opacity-50` and no word, which on the phone network this system was designed around is the case that produces a second press — and which the reduced-motion block above makes into a rule rather than a taste, since a reader who asked for stillness gets a spinner that does not spin.

## Amendment, 10 September 2026 — the scale has a display tier, and it is two scales ([#153](https://github.com/Mikepeerawit-com/tender-tracker/issues/153))

[ADR-0028](0028-a-corner-says-what-kind-of-thing-it-is.md) named this as the next lever and deliberately did not take it: *"a display tier and more weight contrast is the obvious next lever… it moves every screen in both scripts."* It does, and this is that move.

**What was wrong was not any one size — it was that three tiers is a navigation aid and not a voice.** [ADR-0026](0026-the-tender-detail-has-parts.md) built the scale to let a reader find their way down a long screen, which is exactly what it did: a `text-2xl` `<h1>` over a `text-base` `<h2>` over a 10.5px field label, far enough apart to be told apart at arm's length. What it could not do is make any of them *sound* like anything. A 24px title over a 16px heading over 14px body, with every weight in the app sitting between 400 and 600, is one voice at several volumes — the screen's own name barely louder than a section heading, and nothing quiet at all. The supporting sentence under a title was `text-muted-foreground text-sm`: body size, body weight, receding by colour alone.

**Six tiers now, named for the job rather than for the size, and stated once in `globals.css`.** `.type-display` is the screen's own name; `.type-section` is what `Section` draws; `.type-subhead` is a labelled block inside a part; `.type-group` is the name of a run of rows or of a fold; `.type-quiet` is prose that supports the line above it; and `.field-label` was already there and is the bottom of the same scale. Body is `text-sm` and is deliberately not a class: it is the tier the others are measured against, it is what a component gets for writing nothing, and naming it would mean editing a hundred and twenty call sites to say what they already say.

Three of those tiers existed before they had names, which is the fault this ADR keeps finding in a different place each time: `text-sm font-medium` was written for a heading twelve times, `text-[13px] font-semibold` four times across three components, and supporting prose had grown a *second* size — eighteen places at `text-xs` doing the same job as the thirteen-pixel one, with no CJK reading between them. The quiet tier swallowed both sizes rather than being joined by a seventh. **A tier chosen per component is a tier the next component is free to choose differently**, which is the same argument [#142](https://github.com/Mikepeerawit-com/tender-tracker/issues/142) made about the 44px tap floor and [#135](https://github.com/Mikepeerawit-com/tender-tracker/issues/135) made about the focus ring. The pattern is now three for three.

**It is two scales, not one scale with a footnote.** This ADR's standing instruction is *judge new screens in `zh-Hans` first*, and the reason is that PingFang has no case and its glyphs sit on a fixed body, so size and weight do not behave the way they do in Latin. `.field-label` had encoded one instance of that since this ADR was written. There are five now, and they split in both directions:

- **Han needs fewer pixels at the top of a scale and more at the bottom.** A Latin glyph spends most of its size on the space above the x-height where a Han glyph fills its em box, so 30px of PingFang is optically larger than 30px of Fira Sans: the display tier is 30px in `en` and comes *down* to 27px in `zh-Hans` — which also buys back the width a 50-character product name needs at 390px. At the other end a stroke has to survive being drawn at all, which is the 11.5px floor `.field-label` has had all along and which nothing in the scale goes below in `zh-Hans`.
- **Negative tracking is a Latin device**, so every CJK rule takes it back to zero, for the reason the field label already gave: tracking crowds glyphs that are already on a fixed body.
- **Leading goes the other way.** Han is denser per line and wants more air between lines, so every tier that carries a sentence opens up in `zh-Hans` — the quiet tier by the most, because it is the tier that is actually read along.

**Each script's ladder is the top three weights its own face really has, and the display tier is alone at the top of both.** Latin reads 700 / 600 / 400 — the 700 is the first this app has ever drawn, and `layout.tsx` fetches one more Latin `woff2` for it. `zh-Hans` reads 600 / 500 / 400, because PingFang has a Semibold and nothing above it: asking Han for 700 gets either the same face back or a synthesised bold that smears the strokes on an Android handset. **The first cut of this spent 600 on every heading in `zh-Hans`**, which left the working language with a display tier the same weight as a section heading — size contrast only, in the one script this ADR says to judge first, against a criterion that asks for *weight, not just size*. Stepping the lower tiers *down* to Medium is the lever PingFang actually offers, and it is the one taken.

Going the *other* way, into a Light for the quiet tier, was considered and rejected twice over: it is a second Latin font file on the WeCom webview's phone network for one line of prose, and PingFang Light at 13px is a stroke that disappears on a handset in daylight. **A tier that recedes in `en` and does not in `zh-Hans` is precisely the mismatch this ADR exists to stop**, so the quiet tier recedes by size, leading and ink, and states all three in one place rather than leaving each call site to do it by colour. This is the one thing #153 asked for that is answered differently from the way it was asked; it is written down here rather than quietly not done.

**What each tier is allowed to say, in the pattern this ADR uses for the hues.** A screen has exactly one display tier on it — `ScreenHeader`'s `<h1>`, or `ItemBrief`'s product name on the one screen whose name *is* the thing being priced — and a second one is a screen with two names. The quiet tier is prose that supports the line above it, not every muted string in the app: the muted `<span>`s that sit inline on a baseline row beside body text stayed as they were, because dropping them to 13px would break the row rather than quieten it. The line is prose against metadata, and it is drawn at the tag. The sizes are free to move; the list of jobs is not.

**Nothing needed a new legibility argument, and that is a fact about the guards rather than about the scale.** `contrast.layout.test.tsx` decides which side of WCAG's 24px line a size falls on, and it was asked rather than assumed: the display tier crosses *upward* into the 3:1 allowance in both scripts, and everything else is under it and was already held to 4.5:1, which is size-independent — so a scale whose only downward moves are below 24px cannot lose contrast by moving. The quiet tier keeps `--muted-foreground` rather than taking `--ink-faint`, which is the lightest ink that clears 4.5:1 anywhere in this app ([#135](https://github.com/Mikepeerawit-com/tender-tracker/issues/135)) and is the field labels' tier: a sentence is read along rather than glanced at, and takes the darker of the two quiet inks.

**Nothing in this project could see the CJK half of any of it, and that is the finding worth keeping.** The ground `@/test/screens` draws round a screen under test carried no `lang` attribute at all. `:lang(zh)` matches against one, so every guard in the `layout` project — and the contact sheet somebody is instructed by this ADR to eyeball in `zh-Hans` first — was drawing both locales in the Latin script's type and telling them apart only by which strings they held. `.field-label`'s split had been unmeasured and unphotographed since the day this ADR was written. It is the same shape as the working sheet in [#135](https://github.com/Mikepeerawit-com/tender-tracker/issues/135) and the page body in [#142](https://github.com/Mikepeerawit-com/tender-tracker/issues/142): **the values were never wrong, the list of things anybody measured was too short.** `lang` is a parameter of the shared ground now, so a screen added to the record gets it from whatever already draws it.

**And the scale has a check that can fail** (ADR-0016). `type.layout.test.tsx` used to assert the stack alone; it now also holds the shape of the table — that the tiers descend, that every neighbouring pair takes a real step in size *or* weight, that the display tier is alone at the top of each script's weight ladder, that Han is asked for no weight PingFang does not have and given no tracking, and that **every tier really does read differently in the two scripts**. It pins the shape and not one pixel: every size and weight above stays free to move, and a tier that quietly loses its `:lang(zh)` rule fails here rather than on somebody's phone. Deleting one rule was tried, and four assertions fail.

**A bigger heading is a wider heading**, and the screen records are what say it is not a wider *page*: `screens.layout.test.tsx` walks all twenty in both locales and both themes at 390px, and the region and the measure at the desk, while the contrast walk takes those and the four signed-out ones. The one thing that had to change to survive it is that `AuthScreen`'s `<h1>` gained the `break-words` it had never needed at 24px.

**Unchanged, and load-bearing:** no CJK webfont is fetched, and the extra Latin weight is affordable for exactly the reason a Han one is not — Latin can be subset and Han cannot. The `var()` fallbacks still name the Latin family, and `type.layout.test.tsx` still asserts it. `:lang(zh)` still matches `lang="zh-Hans"` by prefix, so every split follows the locale the app is already rendering in with nothing to pass down.

**What this deliberately does not reach.** Grouping distances are read against the type they separate, so the spacing rhythm is [#154](https://github.com/Mikepeerawit-com/tender-tracker/issues/154)'s and follows this rather than preceding it. And the screens are taller than they were — the display tier and the quiet tier's leading both add height — which is a fact `screen-length.measure.tsx` reports and no guard pins, exactly as [ADR-0030](0030-the-sheet-is-long-because-the-owner-reads-every-quote.md) left it.

## Amendment, 10 September 2026 — the gaps say what belongs with what ([#154](https://github.com/Mikepeerawit-com/tender-tracker/issues/154))

[ADR-0028](0028-a-corner-says-what-kind-of-thing-it-is.md) closed by naming three passes and taking one: *"Gaps are still a fairly uniform 12 and 16px. Grouping distances that say what belongs with what would be the third pass, after type."* The amendment above is the second. This is the third, and it is the last of the three.

**The fault is the one this project has now found three times in three different scales, and it is not a fault in any number.** Almost every stack in the app was `gap-3` or `gap-4`. A label sat 8px from its field, two unrelated fields 12px apart, a section heading 12px above the first thing under it, and two whole sections of a screen 16px apart. **Those distances are close enough that they separate nothing** — which is why a screen still read as one undifferentiated column after [#149](https://github.com/Mikepeerawit-com/tender-tracker/issues/149) gave it headings. The headings said where the parts were and the spacing did not agree with them, so the reader had a table of contents and no paragraphs.

That is exactly what ADR-0028 found in the radius scale — 68 of the app's 84 rounded corners were `rounded-lg` — and what #153 found in the type scale, where `text-sm font-medium` had been written for a heading twelve times. **A scale whose steps mean nothing is a scale every call site picks the middle of**, and the answer each time has been the same one: not more numbers, names.

### Four steps, each named for what is on either side of it

| step | separates | px |
| --- | --- | --- |
| `label` | a label from the field it names, and anything else that is one thing written on two lines | 8 |
| `field` | one field from the next, one row of a run from the next, and a heading from the block it names | 14 |
| `group` | one group from the next, inside one part of a screen | 24 |
| `landmark` | one landmark from the next, and the last one from the bottom of the page | 40 |

Stated once in `globals.css`, in a `@theme` block beside the radius aliases, so that they are ordinary Tailwind utilities and a call site says which boundary it is drawing: `gap-field`, `mt-group`, `pb-landmark`. **They are steps the numeric scale already had** — 8, 14, 24 and 40 are `2`, `3.5`, `6` and `10` — which is ADR-0028's line arriving intact a third time: *the visual system did not need more numbers, it needed the numbers to mean something.* What changed is which of them get used. The old rhythm lived inside 8–16 and spent three steps on it; this one spends the whole range, and every rung is about 1.7× the one below.

**A landmark is not a matter of taste here — it is what the accessibility tree already says it is.** The region's own children are the screen's `header`, the jump `nav` and every `Section`, each a named landmark a screen reader will list and [ADR-0026](0026-the-tender-detail-has-parts.md)'s jump bar links to. A group is a thing *inside* one: a card, a `<fieldset>`, a run of rows. So the four steps are the four levels of nesting a screen really has, one distance per level, and nothing has to decide which of two numbers the middle of a screen wanted. `ScreenBody` states the region's rhythm and **no screen hands in its own any more** — `/tenders/new` did, at `gap-6`, which is this ticket's own fault arriving one layer up. `ScreenGap` and the prop that carried it are gone.

This is the one place #154 is answered differently from the way it was asked. It puts *"two sections of one screen"* at the between-groups step; here a `Section` is a landmark and takes the step above, and what takes the group step is two blocks inside one part — the Language card and the Appearance card on Preferences, which were the pair really sitting 16px apart. The reading is the accessibility tree's rather than the ticket's wording, and it is written down here rather than quietly substituted.

### One scale, not two, and the claim that makes that safe

This ADR's standing instruction is to judge in `zh-Hans` first, and #153 answered it by splitting the type scale in two: Han fills its em box, so every tier carrying a sentence opens its leading up in `zh-Hans`. **The spacing scale is deliberately not split, and the reason is arithmetic rather than taste.** A gap has no glyphs in it. What the script changes is the rhythm *inside* the blocks a gap separates, and that is already answered where it lives — so the question is whether the most `zh-Hans` moves a line of type by is smaller than the closest two steps of this scale are apart. It is: at most 3.4px against 6px, so a gap that separates in Fira Sans separates in PingFang. A second reading per script would be four more numbers to keep in step for a difference no reader could see.

`spacing.layout.test.tsx` holds that as a measurement rather than as a sentence, against the same probe `type.layout.test.tsx` uses — which is why that probe moved into `@/test/layout` and is `typeTier` now, for the reason that file gives about every question it answers: two copies of it would be two suites quietly disagreeing about what they measured. **The day the type scale opens Han's leading far enough to close the margin, that suite goes red and this becomes two scales**, and the warning arrives there rather than on somebody's phone.

That the two locales' before-and-after deltas below are *identical, screen for screen*, is what one scale looks like from the outside.

### And the scale has a check that can fail (ADR-0016)

`spacing.layout.test.tsx` pins the shape and not one pixel, the way the type suite does: that the four steps ascend in the order they are stated, that each is at least **1.6×** the one below, and that each one really draws — a `gap-*` utility that was never generated computes to `normal`, and a suite asserting only ratios would pass a scale with nothing in it at all.

**1.6 comes from the failure rather than from taste.** The scale being replaced ran 8 / 12 / 16, ratios of 1.5 and 1.33; 1.6 is the floor that fails on both of those joints and passes on the one that replaced them. It was confirmed by producing the failure — putting 12 and 16 back turns the rung assertion red, naming which pair it is and what they separate — and a fifth step squeezed between two of these would fail there rather than quietly refilling the crowded middle this ticket was raised to empty.

### What it cost, measured

Every screen in `@/test/screens`, at 390px, in both locales, from `npm run screen-length` before and after. **The screens are taller, and that is the trade being made** — stated rather than discovered: parts that finally separate take room to separate in.

| Screen | `en` before | after | Δ | `zh-Hans` before | after | Δ |
|---|---|---|---|---|---|---|
| my work | 572 | 580 | +8 | 577 | 585 | +8 |
| my work, finished | 155 | 163 | +8 | 143 | 151 | +8 |
| the tender list | 1,506 | 1,558 | +52 | 1,358 | 1,410 | +52 |
| recording a tender | 1,422 | 1,414 | -8 | 1,403 | 1,395 | -8 |
| a tender | 4,200 | 4,292 | +92 | 4,103 | 4,195 | +92 |
| a tender with its folds open | 4,719 | 4,825 | +106 | 4,628 | 4,734 | +106 |
| a tender somebody else owns | 1,506 | 1,552 | +46 | 1,489 | 1,535 | +46 |
| editing a tender | 2,132 | 2,192 | +60 | 2,136 | 2,196 | +60 |
| editing a tender, adding an item | 2,443 | 2,509 | +66 | 2,447 | 2,513 | +66 |
| editing a tender, with every item open | 3,101 | 3,185 | +84 | 3,105 | 3,189 | +84 |
| sourcing an item | 2,241 | 2,305 | +64 | 2,232 | 2,296 | +64 |
| sourcing an item on a tender somebody else owns | 2,557 | 2,639 | +82 | 2,513 | 2,595 | +82 |
| correcting a quote | 1,030 | 1,076 | +46 | 973 | 1,019 | +46 |
| the Preferences screen | 619 | 639 | +20 | 629 | 649 | +20 |
| the Preferences screen, for a member who is not an Org Admin | 431 | 451 | +20 | 441 | 461 | +20 |
| the People screen | 1,468 | 1,502 | +34 | 1,478 | 1,512 | +34 |
| the WeCom group screen | 661 | 673 | +12 | 658 | 670 | +12 |
| the converting-foreign-prices screen | 869 | 889 | +20 | 758 | 778 | +20 |
| the loading fallback | 368 | 386 | +18 | 368 | 386 | +18 |
| a screen that threw | 201 | 201 | +0 | 150 | 150 | +0 |
| the sign-in screen | 391 | 419 | +28 | 397 | 425 | +28 |
| the set-a-password screen | 399 | 427 | +28 | 405 | 433 | +28 |
| the first-admin setup screen | 748 | 770 | +22 | 704 | 726 | +22 |
| the choose-a-language screen | 269 | 303 | +34 | 270 | 304 | +34 |
| **All twenty-four** | **34,008** | **34,950** | **+942** | **33,365** | **34,307** | **+942** |

**Twenty-four screens, and it took a change to that tool to say so.** `screen-length.measure.tsx` walked `screens()` alone — the twenty behind the login — and the four `signedOutScreens()` were not in any reading it had ever produced. This ticket moves `AuthScreen`, all three of its forms and the language options, so those four move too, and a report that omitted them would have understated the change while claiming to cover the record. **It is the same shape a third time**: the working sheet was outside every shared guard in [#135](https://github.com/Mikepeerawit-com/tender-tracker/issues/135), the page body was in [#142](https://github.com/Mikepeerawit-com/tender-tracker/issues/142), and the CJK half of the type scale was in #153 — *the values were never wrong, the list of things anybody measured was too short.* The tool walks both lists now.

**+2.8%, and it does not give back what #149 took off.** That ticket took the Tender detail from 4786px to 4200; this puts 92 of them back, so the screen is still 494px shorter than it was and the 92 buys the separation between its seven parts. The three that move most are the three with the most structure to separate — the Owner's Tender detail with its folds open (+106), the same screen shut (+92), and the edit screen with every Item open (+84). On the Owner's sheet the largest single item is the run of competing Quotes, which below 768px is one stacked card each and had them 8px apart; they are a step of the scale apart now, because telling one offer from the next is what that screen is for.

**The only screen that got *shorter* is `/tenders/new`, and not because it kept a rhythm of its own.** It gave that up — its region went from the `gap-6` it handed in to the app's 40px, which costs it 16. What more than paid for it is that the form's own stack came *down*: 32px between the Tender's fields and its Items is the group step's 24 now, and the field grids inside came from 16 to 14. A screen whose parts were already separated had been spending its height on separating fields.

**The page's bottom padding is in none of those numbers**, because what is measured is `main` and the padding is on the wrapper outside it. It moved too: 24px was the last thing on a screen sitting closer to the bottom bar than two fields of one form sit to each other, and it is a landmark distance now — which `spacing.layout.test.tsx` pins, because `p-6 pb-landmark` only reads that way while Tailwind emits the shorthand ahead of the longhand.

### What this deliberately does not reach

**Horizontal distance.** Every step above is the vertical rhythm of a screen, because grouping is read down a page and *one undifferentiated column* is the complaint. The `gap-2` and `gap-3` holding an icon beside its word, a chip beside its count, or two buttons on one row are untouched, and whether a row has a rhythm of its own is a separate question with its own measurements.

**Anything tighter than the `label` step.** The 4px and 6px gaps in the app are inside one line rather than between two things. They stay raw numbers, and are deliberately not a fifth step for a call site to choose from.

**Container padding.** A card's `p-4` and a fold's panel are how much air a container holds around what is in it, not how far apart two things are. Nothing here moved them, and the one place the two meet — a card at `p-4` holding blocks at `gap-field` — is 16px of padding around 14px of rhythm, which is the right way round.

**The screen record carries its own copies.** `@/test/screens` composes the settings screens and the sourcing screen from markup of its own rather than from the pages, so the scale had to be applied there too or every guard and every number above would be measuring a page the app does not draw. That is the shape [#143](https://github.com/Mikepeerawit-com/tender-tracker/issues/143) left, and it is worth knowing about whenever a screen's layout moves.
