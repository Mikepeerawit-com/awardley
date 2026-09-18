---
name: Awardley landing
description: A monochrome product site with one indigo accent, light only, benchmarked against Linear and Stripe.
colors:
  background: "#ffffff"
  card: "#fafafa"
  foreground: "#0a0a0a"
  muted-foreground: "#5f6368"
  border: "rgb(10 10 10 / 0.08)"
  input: "#767676"
  accent: "#4f46e5"
  accent-foreground: "#ffffff"
  accent-wash: "rgb(79 70 229 / 0.1)"
  accent-edge: "rgb(79 70 229 / 0.4)"
  glow: "rgb(79 70 229 / 0.12)"
  danger: "#b91c1c"
  device-edge: "#e6e6e9"
typography:
  display:
    fontFamily: "Inter, PingFang SC, Hiragino Sans GB, Source Han Sans SC, Noto Sans SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 1.6rem + 2.67vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  heading:
    fontFamily: "Inter, PingFang SC, Hiragino Sans GB, Source Han Sans SC, Noto Sans SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.35rem + 1.4vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  section:
    fontFamily: "Inter, PingFang SC, Hiragino Sans GB, Source Han Sans SC, Noto Sans SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  lede:
    fontFamily: "Inter, PingFang SC, Hiragino Sans GB, Source Han Sans SC, Noto Sans SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 1.25rem, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Inter, PingFang SC, Hiragino Sans GB, Source Han Sans SC, Noto Sans SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  quiet:
    fontFamily: "Inter, PingFang SC, Hiragino Sans GB, Source Han Sans SC, Noto Sans SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, PingFang SC, Hiragino Sans GB, Source Han Sans SC, Noto Sans SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.6
rounded:
  lg: "0.5rem"
  xl: "0.75rem"
  2xl: "1rem"
spacing:
  label: "8px"
  field: "14px"
  group: "24px"
  landmark: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
  button-ghost:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
  button-bar:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.quiet}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  input-email:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "44px"
  nav-link:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.quiet}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "44px"
  nav-link-hover:
    textColor: "{colors.foreground}"
  panel-product:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.2xl}"
  panel-inset:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.xl}"
  notice:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
---

# Design System: Awardley landing

## Overview

**Creative North Star: "The Category Standard, Played Straight"**

The landing at `awardley.com` is a conventional product site at full craft, with Linear and Stripe as the bar. It is a separate world from the app (which keeps Fira and warm paper under ADR-0019); it shares only the name and the three-bar mark. The page is one ground and one accent: every section is told apart by a hairline rather than by a change of colour, so the only saturated thing above the fold is the primary button, and the indigo appears only as light or as an answer (the glow behind the product panel and again behind the questions above the ask, the light crossing the panel's top hairline, the selected Quotes in the example sheet, the focus ring). Proof is shown as real UI, a phone capture cropped by its frame beside an HTML Quotes sheet labelled "Example data", never as logos, counts or testimonials.

Density is generous and quiet: a `max-w-6xl` measure, 40px landmarks (72px on desktop), four type tiers and no eyebrow. The site is light only: every colour is stated once, as a plain value on `:root`, and `color-scheme: light` keeps the browser's own canvas and controls light on a dark device. There is no dark reading, no toggle and no theme attribute on `<html>`. Both scripts are first-class: Inter is fetched for Latin only, Han is drawn by the device, and `:lang(zh-Hans)` trades tracking for leading at every tier.

Confirmed anti-references: the app's Fira + warm-paper brochure (`4238188`) and the slate-and-navy Trust page with three icon cards in Plus Jakarta Sans (`041851c`). Neither is to be quoted.

**Key Characteristics:**
- Monochrome ground, one indigo accent, no second ground or coloured band anywhere.
- Sections divided by 8% hairlines; controls edged by a separate, darker `input` token.
- Inter (variable, `opsz`) with tight negative tracking on Latin display; zero tracking and open leading under `:lang(zh-Hans)`.
- Four type tiers (display, heading, section, quiet), all headings at 600, none heavier.
- Two easings and two kinds of motion: events rise (`--ease-rise`), continuous motion drifts (`--ease-drift`). One entrance (`rise`, 420ms, 60ms stagger) in the hero, one focal sequence over by 2.2s, and then the panel keeps moving: three ambient loops (the capture pans, the glow breathes, a light crosses the top hairline in twenty seconds) and one sixteen-second beat the rest read off — the sheet takes a new quote, the light lifts, and once a cycle a Reminder lands on the phone as an email. The page's one other loop is the same glow drifting behind the questions above the ask. All of it paused off screen and gone under reduced motion.
- Corner says what a thing is: 8px operated, 12px replies, 16px containers.

## Colors

A near-achromatic palette, each colour stated once on `:root`, with indigo as the single chromatic voice.

### Primary
- **Indigo** (`accent`): the primary button fill, the tick on a selected Quote, the top bar of the mark, `accent-color` for native controls, and the focus ring (`ring` aliases it). Deep on paper, and clears 4.5:1 as button ink's ground.
- **Indigo Wash** (`accent-wash`): the selected cell in the Quotes sheet and `::selection`. Sits under text, so it stays quiet enough to read through.
- **Indigo Edge** (`accent-edge`): reserved edge tint at 40% alpha; defined for controls that need a coloured border, not used on the home page today.
- **Indigo Glow** (`glow`): the blurred radial light above and behind the product panel. Its own token because it is spread over 20rem and blurred, and is asked the opposite question of a wash that sits under text.
- **Indigo Ink** (`accent`, aliased as `signal-ink`): inline links on the privacy and confirm pages.

### Neutral
- **Paper** (`background`): the one page ground, and the inset frame of the Quotes sheet inside the panel.
- **Alternate** (`card`): the product panel, the ghost button's hover, the sheet's header row, and the success notice. One step off the ground, never a band.
- **Ink** (`foreground`): body and heading text, the middle bar of the mark.
- **Muted Ink** (`muted-foreground`): sub lines, column body copy, nav links at rest, table headers, non-selected amounts; clears 4.5:1. Also the bottom bar of the mark.
- **Hairline** (`border`): section rules, column rules, the panel frame, the sheet's row rules, the bar's bottom edge. Deliberately below 3:1 and never a control edge.
- **Control Edge** (`input`): the email field's border, a full step darker than the hairline so an operable edge clears 3:1.
- **Device Edge** (`device-edge`): the 6px bezel of the phone frame; the one colour that is neither ink nor hairline.
- **Danger** (`danger`): form validation and failure text only.

### Named Rules
**The One Ground Rule.** There is one page ground and one alternate a step off it. No section, header or call to action changes the ground colour; sections are separated by hairlines.
**The Once-Spent Accent Rule.** Indigo is spent on the primary button and appears again only as the panel glow, the selected-quote wash and tick, and the focus ring. It is never a stripe, band, eyebrow or decorative rule.
**The Two Edges Rule.** `border` (8%) is for rules and frames and may sit below 3:1; anything the reader operates is edged with `input`, which clears 3:1.
**The One Declaration Rule.** The site is light only, and every colour is stated exactly once on `:root`. No dark reading, no `dark:` variants, no second token block, no toggle and no theme attribute on `<html>`; `color-scheme: light` tells the browser the same thing about its own canvas and controls.

## Typography

**Display Font:** Inter (variable, `opsz` axis, Latin subset via `next/font`), falling to the device Han stack
**Body Font:** Inter, same stack
**Han stack:** PingFang SC, Hiragino Sans GB, Source Han Sans SC, Noto Sans SC, Microsoft YaHei, drawn by the device; no CJK webfont is fetched

**Character:** One face at one heading weight. Everything from the wordmark to the display line is 600; the hierarchy is carried by size, tracking and leading, never by a heavier cut. `font-optical-sizing: auto` gives the 64px line the tight high-contrast cut and the 12px table header the open one. Han takes back all tracking and opens its leading instead, since it has no 400/700 contrast to spend.

### Hierarchy
- **Display** (600, `clamp(2.25rem, 1.6rem + 2.67vw, 4rem)`, 1.05, -0.03em): the hero headline only, `text-balance`, inside a `max-w-3xl` column. 36px at 390, 64px at 1440. Han: tracking 0, leading 1.25.
- **Heading** (600, `clamp(1.75rem, 1.35rem + 1.4vw, 2.25rem)`, 1.1, -0.02em): section titles, capped at 36px so it is always a full step under Display. Han: tracking 0, leading 1.45.
- **Section** (600, 1.25rem, 1.3, -0.01em): column titles inside a section and privacy subheads. Han: tracking 0, leading 1.45.
- **Lede** (400, 18px rising to 20px at `md`, 1.6, muted ink): the one sub line under the headline, `max-w-[56ch]`.
- **Body** (400, 16px, 17px from 48rem, 1.6): paragraphs, in muted ink when they follow a heading; list titles at 600 in full ink. Column copy sits at 46–52ch.
- **Quiet** (400, 0.875rem, 1.6, muted ink): captions ("Example data"), the copyright line, nav and footer links (at 500), the form's privacy note. Han: leading 1.7.
- **Label** (500, 0.75rem, muted ink, sentence case): table column headers. Never uppercase.

### Named Rules
**The No Eyebrow Rule.** Four tiers and nothing over a heading. A kicker above a headline is a heading that did not trust itself.
**The Han Leading Rule.** Under `:lang(zh-Hans)` every tier sets `letter-spacing: 0` and opens leading (1.25 display, 1.45 heading and section, 1.7 quiet). There is no uppercase anywhere on the site, so nothing needs suppressing.
**The Tabular Rule.** Any table of amounts is `tabular-nums`, one currency, grouped by three and two-placed, written out rather than left to `toLocaleString`.
**The Six Hundred Rule.** Headings and the wordmark are 600; 700 does not appear. The display line is bigger than the wordmark, not heavier.

## Layout

A single centred measure: `max-w-6xl` (72rem) with `px-5` gutters on a phone and `px-8` from `md`. Copy columns narrow inside it: the hero stack to `max-w-3xl`, the sub line to 56ch, section intros to 46–52ch, the form to `max-w-xl`, the privacy page to `max-w-3xl`. `main .mx-auto` always has a max-width (the 390px suite asserts it).

Vertical rhythm is the four-step scale named for what it separates: `label` (8px) between a heading and its paragraph, `field` (14px) between controls in a row, `group` (24px) between blocks in a stack, `landmark` (40px) as section padding, rising to 4.5rem on `lg`. Sections are `border-t` hairlines with no ground change; the bar is `h-16` sticky at `z-50`, translucent (`bg-background/80 backdrop-blur`), and anchors use `scroll-mt-20` to clear it.

Responsive: the how-it-works columns are a single stack becoming `md:grid-cols-3` at `gap-8`; the problem rows are a stack becoming `md:grid-cols-[26ch_1fr]` definition rows at `gap-8`, and a third column at `lg` that sets the trace beside its sentence rather than under it; who-it-is-for becomes `lg:grid-cols-2`; the questions become `md:grid-cols-2`; the product panel is `h-[26rem]` on a phone (the Quotes sheet hidden, the phone capture centred) and `h-[32rem]` with a `5fr / 7fr` split at `lg`. Nav links are `hidden md:inline-flex`; on a phone the bar is the wordmark and the one control. Body text steps from 16px to 17px at 48rem. Both calls to action are above the fold at every width; the bar's own copy of the primary is hidden while the hero's is on screen.

## Elevation & Depth

Flat by default, with depth carried by tone and hairline rather than by shadow. The panel is `card` on `background` inside a hairline; the sheet is `background` on `card` inside a hairline; the bar is glass over the page. Exactly one shadow exists on the site, under the phone frame inside the product panel (`0 28px 60px -24px rgb(0 0 0 / 0.45)`). The `glow` radial is used twice and is the same light both times: above and behind the product panel with a `-top-28` offset so it reads as a source rather than a halo, and again low behind the questions above the ask, where the page had gone dark for the half a reader is in when they decide. A third use of it would be a pattern rather than a light. The panel's top hairline additionally carries `--edge-light`, the one place the accent is drawn near full strength, because a pixel has no area to be quiet with. Buttons and inputs have no shadow at any state; hover is an opacity or ground shift.

### Shadow Vocabulary
- **Device drop** (`box-shadow: 0 28px 60px -24px rgb(0 0 0 / 0.45)`): the phone capture's frame only, so the device sits into the panel instead of on it.

### Named Rules
**The Hairline Depth Rule.** Layers are declared by a hairline and a one-step ground change. Shadows do not mark elevation; the single shadow on the site is a photographic device drop, not a UI elevation.

## Shapes

One radius token (`--radius: 0.5rem`) and three derived steps, each meaning a kind of thing: 8px (`lg`) is something you operate (buttons, the email field, nav link focus rects, the wordmark link); 12px (`xl`) is a reply or an inset (the Quotes sheet frame inside the panel, the success notice); 16px (`2xl`) is a container that holds other things (the product panel). Borders are 1px hairlines everywhere except the email field (`input`) and the phone bezel (6px `device-edge`). The phone frame is a one-off 2rem radius clipped by `overflow-hidden`, a fixed height at each width (26/30/31rem) so the capture always overtops it, and cropped by the panel's bottom edge on purpose. The mark is three left-aligned bars of descending width (≈7:5:4) with fully rounded ends on a 24-unit square; the one glyph (the tick) is a 24-unit stroke at 1.75 with round caps and joins, `currentColor`, no fill.

## Components

### Buttons
Confident, filled, and without ornament: the accent is the button and the button is the accent.
- **Shape:** gently rounded (8px), 44px tall, `px-5`, 16px at 500.
- **Primary:** `accent` fill, `accent-foreground` text. Used for "Join the waiting list" in the hero and "Keep me posted" on the form (`SubmitButton`), and for the confirm page's button.
- **Hover / Focus:** hover fades to 90% opacity over 200ms; focus is the global ring, 2px solid `ring` at 2px offset; disabled (pending) sits at 70% opacity and swaps its label for a pending sentence rather than a spinner.
- **Ghost:** transparent on the page ground with a hairline `border`, full ink, same size; hover shifts the ground to `card` over 200ms. Used only for "Sign in" beside the primary.
- **Bar variant:** the sticky bar's copy of the primary is 36px tall (`h-9`, `px-3.5`, 14px) so it does not outweigh the 14px links beside it, and on the home page it is hidden until the hero's 44px primary has scrolled under the bar (IntersectionObserver, `rootMargin: -64px`).

### Inputs / Fields
- **Style:** page `background` inside a 1px `input` edge (the darker control edge, not the hairline), 8px radius, 44px tall, `px-3.5`, 16px; placeholder in muted ink.
- **Focus:** the global ring, 2px solid `ring` at 2px offset — reached by `focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2` and by nothing else beside it.
- **Error:** `aria-invalid` and a 14px `danger` message below with `role="alert"`; success replaces the form with a 12px-radius `card` notice under a hairline.
- **Honeypot:** an off-screen `website` field hidden by geometry, `aria-hidden`, `tabIndex -1`.

### Navigation
- **Style:** sticky 64px bar, hairline bottom edge, `background` at 80% with `backdrop-blur`. Wordmark left (mark 24px, name 17px at 600, -0.015em). Right: text links at 14px/500 in muted ink, `min-h-11`, `px-3`, hover to full ink over 200ms; then the bar button. No menu, no hamburger; links are hidden below `md`.
- **Footer:** hairline top, wordmark and a 36ch tagline left, three `min-h-11` links right (Sign in, Privacy, the other locale labelled in its own script), copyright as a quiet line under a second hairline.

### Cards / Containers
- **Product panel:** 16px radius, hairline, `card` ground, fixed height with `overflow-hidden`; a quiet "Example data" caption pinned top-right; the `glow` radial behind it.
- **Inset sheet:** 12px radius, hairline, `background` ground, `overflow-hidden`. Used around the Quotes table inside the product panel, around each of the three how-it-works specimens (`components/specimens.tsx`) at `md:h-52` so the three line up across the row — below `md` they are stacked and there is no row to line up with, so there is no height either — and, without that height at any width, around the bilingual specimen, which is in a column of its own. The height belongs to the row, not to the frame. Inside one, a `card` strip with a 12px/500 muted line is the sheet's header grammar.
- **Specimens** (the how-it-works row): three framed pieces of the real record — an Item with its quantity and specification, a ruled-out quote beside the selected one on `accent-wash` with the tick, and the Reminder email — carrying one worked example, the same Item and suppliers as the Quotes sheet above. **The ruled-out quote is the cheapest in the row**, never the dearer one: the sheet above decides by counting, so a reason is only worth printing where the amounts alone reach the other answer. The specimen therefore strikes out an amount the sheet itself ticks during its loop and disagrees with it about that one cell — that disagreement is the specimen's whole subject, not a slip in the example data. HTML, not images; no interactivity and no motion. The frame goes around the specimen, never around the column. One height (13rem) across the three from `md` up, and **each specimen names the block that absorbs the slack** — a plate with a band of empty ground under its last row reads as a screen that failed to load the rest. Growing the last child is not that rule: it shows only where that child has a ground of its own, so the Quote fills its wash, the Item splits the slack evenly across its three blocks and centres them, and the Reminder puts it between its two mail paragraphs rather than under them. **Stretch something the reader can see stretch.** The column is spaced by name rather than by one gap: `group` under the specimen, `label` between the heading and its line, because the plate is evidence and the two lines are one block.
- **Traces** (the problem section): three framed scraps of the record a reader already has, one under each definition row's sentence at `max-w-sm` — two versions of one amount, a count of Items quoted against the bid's deadline, an award with the who and the why gone. Same 12px frame and hairline as a specimen, but on `card` rather than `background`: one shade greyer, so the page reads grey-and-unfinished here and white-and-ticked under the next heading. All ink is muted, values included; the absence marker is an em dash (`—`), the same glyph in both locales. **Never the accent, the wash or the tick.** No fixed height — they sit one per row rather than across a grid — and their figures are deliberately not the Quotes sheet's worked example, because a trace is the reader's last tender and not the one the product is running (`components/traces.tsx`).
- **Bilingual specimen** (who-it-is-for): one plate under the section heading, not one per row — the section's thesis is one record and several people, so three plates would argue the opposite. **The item name spans both columns** in a 14px/500 strip on the plate's own ground, localised like the rest of the page (`spec.item.name`): it is one record, so it crosses the hairline instead of being printed twice beside it. Under it, two columns split by a vertical hairline at every width: a `card` strip naming the language, then two `Field` pairs whose **labels are translated and whose values are identical, character for character** (`Quantity` / `数量`, both `20,000 pcs`; `Selected quote` / `已选报价`, both `1,795.00`). The columns carry numerals only, because a numeral cannot be misread as untranslated — a Latin item name under a head reading 中文 could be, and was. The labels are hardcoded, because they are not localisable — they *are* the two locales and must render the same in both builds; the name above them is the one localised string on the plate. Real `lang="en"` and `lang="zh-Hans"` attributes, so the `:lang(zh-Hans)` rules fire and Han is drawn from the device stack: the claim is set rather than asserted.
- **Not used:** feature cards. How-it-works columns, problem rows, who-it-is-for rows and the four questions are all `border-t` hairlines with `gap-label` stacks, not boxed.
- **Definition rows** (the problem section): label left in a 26ch column, sentence right, `border-t` and `py-5`, stacking to two lines on a phone. The page's third block shape, and the one a list of failures wants — the title is what the reader recognises, the body is the detail they only need if they did.

### Quotes Sheet (signature)
An HTML table standing in for the product's comparison screen: header row on `card` with 12px/500 muted labels; body rows 14px, `py-2.5`, separated by hairlines; item names as row headers at 400; amounts right-aligned in `tabular-nums`, muted when not chosen; the selected cell on `accent-wash` at 500 with a 14px accent tick; a `tfoot` Bid row at 600. One currency, grouped by three, two decimals.

**The sheet is operable, and it is the page's one interactive surface.** Every amount is a 44px `<button>` carrying the cell's padding and `aria-pressed`, not a `<td>` with a click on it: pick a supplier's price and the wash and the tick cross to it and the Bid recounts, which is the product's whole mechanism, done rather than described. It is what the page says instead of another paragraph — the reader is *shown* the comparison by making one. A non-chosen cell takes a `card` ground and full ink on hover over 150ms, colour only; the chosen cell is already on the wash and takes no hover at all. Nothing says so in words: the cells are `cursor-pointer` with a hover that only they take, and the one already chosen shows what a choice looks like before the reader makes one.

**One tab stop, not one per cell.** Twelve operable cells between the hero and the page's only real ask is a tax charged to the readers least able to afford it — so the sheet takes the grid pattern: a roving `tabindex` (the focused cell `0`, the other eleven `-1`), the arrow keys and `Home`/`End` inside, no wrapping at the edges. Tab reaches the sheet once and leaves it once, and the cells keep their `aria-pressed` and their labels: the answer to twelve tab stops is never making the demo less operable. The focus ring is the site's own, turned inwards — the sheet's frame clips, and a ring drawn outside the cell is lost down the outer column.

### Mark
Three bars of `--mark-1..3` (accent, ink, muted ink), inline SVG so the middle bar inverts with the theme; always beside the wordmark, never alone, except as `app/icon.svg` with the values written out.

### Motion
Two easings and nothing else: **events rise, continuous motion drifts.** `--ease-rise` (`cubic-bezier(0.16, 1, 0.3, 1)`) is a hard ease-out with no bounce or overshoot, and carries everything that happens once because something happened — entrances, arrivals, a cell becoming the answer. `--ease-drift` (`cubic-bezier(0.45, 0, 0.55, 1)`) is symmetric, and is spent only on the two ambient loops, which have no start or end to ease out of. Every finite gesture is written `both` from an already-visible default.

**The beat yields to the reader, permanently.** The panel's clock stops for good on the first pick — or the first arrow key inside the sheet, which is the same reader taking the same surface over, and which also keeps a script move from remounting the cell their focus is standing on — not for a few seconds, and it never restarts. A script that keeps re-quoting under the reader's hands is the page arguing with them, and a cell that changes by itself while they read a total they just made is the one thing that would make the sheet look invented. The CSS ambience — the pan, the glow's breath, the edge light — keeps running: it is texture, not the story, and it is not what the reader took over.

- **Entrance** (`rise`): opacity 0→1 with a 12px lift, 420ms. Four hero children stagger by `animation-delay` at 60ms steps (headline 60, sub 120, buttons 180, panel 240), so the page assembles top-down and ends on the product.
- **Focal sequence**, the Quotes sheet assembling, once per load, in the order the work happens: the amounts arrive by supplier column (`quote-arrive`, 360ms, 4px lift, `--col` × 120ms from 520ms); the four chosen cells take the wash, full ink, weight 500 and a self-drawing tick (`quote-choose` 300ms and `tick-draw` 320ms via `pathLength="1"`, `--row` × 80ms from 1240ms, 120ms after the last column has landed); the Bid arrives last at 1860ms, 60ms after the last tick. Over by about 2.2s. Row and column headers are present from the start; only data moves. The chosen cell is styled as an unselected one by class and animated into its end state, so under reduced motion it lands there instantly.
- **Reveal**: the How-it-works and Who-it-is-for blocks borrow `rise` once, the first time they are scrolled to (`components/reveal.tsx`: `IntersectionObserver`, `threshold: 0`, hides only a block that is off screen after hydration, disconnects after the first entrance, never created under reduced motion). The closed-beta heading and the form never animate: the ask is simply there.
- **The panel's beat** (`components/ambient-stage.tsx`): one clock for everything inside the panel that happens rather than drifts. The first beat waits out the assemble as well as its step (2220 + 4000ms); after that it is one every 4s, four to a cycle, scheduled from the last rather than on an interval so a pause is a cleared timeout and a resume is a fresh four seconds. Three things read it, and none of them keeps a timer: given one each they would drift apart over a few minutes and the panel would tell three stories at slightly wrong times.
- **The living sheet** (`components/quotes-sheet.tsx`): a pure function of that beat, on a fixed four-move script, ending where it began so the cycle has no seam. A move is one supplier re-quoting one Item (`quote-arrive`, replayed by remounting the cell under a new key); if the new amount is the row's lowest the wash and the tick cross to it (`quote-choose`, `tick-draw`, and `quote-choose` in `reverse` on the cell that loses them), and the Bid arrives again with the new total. The stagger is dropped — a number changing twenty seconds in is not a column landing — but the easing is `--ease-rise`, because these are events.
- **The light on the beat** (`components/panel-glow.tsx`): the glow is two elements, because the two kinds of motion must not interrupt each other. The outer drifts for 18s and is never remounted; the inner carries the gradient, is remounted on each beat, and plays `glow-beat` once — 1400ms, `--ease-rise`, a scale of 1.03 and a return from a resting 0.92 opacity to full. It sits a hair under full precisely so that a lift is possible at all. Nobody can say what moved, which is the right amount for a light behind a page.
- **The Reminder on the phone** (`components/phone-notice.tsx`): on one beat of the four, a mail banner comes down over the capture (`notice-arrive`, 3400ms, `--ease-rise`, held two thirds of the way and then fading rather than sliding back). It is the *phone's* notification, not an in-app toast the product does not have, and its line is the app's own `email.reminder.milestone.internal_quote` string cut to banner length — so *Reminders by email* is shown in the first viewport rather than claimed in it. Mounted on the beat and unmounted after it, `aria-hidden` because it is drawn over a capture that already has an `alt` and a screen reader announcing an unopenable deadline email would be the page's one lie said out loud. Not the first beat of the cycle: the sheet and the light are already using that one.
- **Ambient loops**: the capture pans 2rem up and back inside its frame over 16s on `alternate`, with 10% of each pass held at either end, as if somebody were idly scrolling it; the glow behind the panel drifts 4% sideways and breathes between 0.8 and 1 opacity over 18s; and a lit segment 45% of the panel's width crosses its top hairline and back over 20s (`edge-travel`), clipped by a 1px-tall strip so nothing of it exists off the edge. All CSS only, all `--ease-drift`, all `alternate` — a segment that wrapped would have a seam in it, and a seam in a drift is an event. The capture's frame is a fixed height at each width (26/30/31rem) so that the screenshot always overtops it and there is something to pan through.
- **The one loop outside the panel**: the same `glow` radial, the same 18s `glow-drift`, low behind the questions above the ask. It is wrapped in an `AmbientStage` with `clock={false}` — the observer and the tab's visibility, and deliberately no second beat, because two clocks counting different turns is the drift the panel's one clock exists to prevent. The ask itself still animates nothing at all.
- **Off switches**: the stage marks the panel `stage-still` whenever it is off screen (`IntersectionObserver`, `threshold: 0`) or the tab is hidden, which pauses every animation inside it mid-stroke, and the same flag stops the beat — one switch, because there is one clock. Under `prefers-reduced-motion: reduce` the loops are `animation: none` rather than collapsed (a squashed loop parks mid-gesture) and the beat never starts, so the turn stays 0: the sheet sits at its assembled state, the glow never lifts, and the banner is never mounted at all.
- **Feedback**: the bar's call to action fades and lifts 1px over 200ms instead of snapping, and is `aria-hidden` with `tabIndex -1` while faded; the form's success notice enters with `rise`. Other state transitions are 150–200ms on opacity or colour only.
- **Off switches**: `scroll-behavior: smooth` only under `prefers-reduced-motion: no-preference`; under `reduce`, every animation and transition collapses to 0.01ms with zero delay and one iteration, so each lands on its end state. `@media print` resets every motion class to its end state so nothing is mid-gesture on paper.

### Browser surfaces
`::selection` is `accent-wash` with full ink; `accent-color` is `accent`; `text-underline-offset` is 0.2em; `:focus-visible` is 2px solid `ring` at 2px offset everywhere, turned inwards only where a control fills a clipping frame edge to edge (the Quotes sheet's cells); `color-scheme: light` paints the pre-stylesheet canvas and native controls light, whatever the device is set to.

## Do's and Don'ts

### Do:
- **Do** state every colour once, as a plain value on `:root`, and declare `color-scheme: light` alongside them.
- **Do** separate sections and columns with the 8% hairline and keep the page on one ground.
- **Do** edge anything operable with `input`, the darker control edge, and leave `border` for rules and frames.
- **Do** keep every control at 44px (the tap floor); the 36px bar button is the one exception and it defers to the 44px primary while that is on screen.
- **Do** set headings at 600 and let size, tracking and leading carry hierarchy; cap section headings at 36px.
- **Do** keep `:lang(zh-Hans)` at zero tracking with open leading at every tier, and draw Han from the device stack.
- **Do** use `tabular-nums`, one currency and hand-formatted grouping in any table of amounts.
- **Do** label example data on its face, and show the product as real UI (the phone capture, an HTML sheet, the three how-it-works specimens, the bilingual plate) — one marker per row of examples, not one per specimen.
- **Do** let the problem section show the failure rather than the fix: its evidence is the reader's own artefacts, greyer and unfinished, never a piece of the product doing its job.
- **Do** give an operable demo one tab stop and the arrow keys inside it, not one tab stop per cell.
- **Do** name spacing by what it separates: `label` 8, `field` 14, `group` 24, `landmark` 40 (72 on desktop).

### Don't:
- **Don't** fetch a CJK webfont; Inter is Latin-only and Han is the device's.
- **Don't** add a theme toggle, a dark reading, a `dark:` variant, a theme attribute on `<html>`, or a second token block.
- **Don't** introduce a coloured band, stripe, second ground, eyebrow, kicker, numbered step or icon-over-column card.
- **Don't** put a price, a signup link, logos, counts or testimonials on the page (ADR-0035; the only app link is `/login`, the only ask is the waiting list).
- **Don't** use a weight above 600, uppercase labels, or negative tracking on Han.
- **Don't** add shadows to buttons, inputs or panels; the one shadow is the phone's device drop.
- **Don't** put `outline-none` on a control that draws the ring with `outline-*`: it sets `--tw-outline-style: none`, which `outline-2` reads back at focus time, and the ring then never draws — a control with no focus ring looks exactly like one nobody has focused.
- **Don't** add a third easing, a scroll-linked effect, or an entrance on the closed-beta section or the form; don't animate a size, margin or position in the flow; don't leave motion running under `prefers-reduced-motion: reduce`.
- **Don't** loop anything but ambient motion inside the product panel, and never loop anything the reader has to read. A loop is allowed only if it is slow, quiet, paused when it is off screen or the tab is hidden, and removed outright under `prefers-reduced-motion: reduce`; everything else on the page happens once.
- **Don't** put the accent, the `accent-wash` or the tick on a trace: the problem section shows what happens *without* the product, and the accent is the product working.
- **Don't** add a second icon; the tick is the whole icon vocabulary, inline and `currentColor`.
