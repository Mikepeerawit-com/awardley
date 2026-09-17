---
name: Awardley landing
description: A monochrome product site with one indigo accent, equally finished in light and dark, benchmarked against Linear and Stripe.
colors:
  background: "light-dark(#ffffff, #0a0a0b)"
  card: "light-dark(#fafafa, #121214)"
  foreground: "light-dark(#0a0a0a, #ededef)"
  muted-foreground: "light-dark(#5f6368, #9a9ba1)"
  border: "light-dark(rgb(10 10 10 / 0.08), rgb(255 255 255 / 0.09))"
  input: "light-dark(#767676, rgb(255 255 255 / 0.42))"
  accent: "light-dark(#4f46e5, #818cf8)"
  accent-foreground: "light-dark(#ffffff, #0a0a0b)"
  accent-wash: "light-dark(rgb(79 70 229 / 0.1), rgb(129 140 248 / 0.14))"
  accent-edge: "light-dark(rgb(79 70 229 / 0.4), rgb(129 140 248 / 0.45))"
  glow: "light-dark(rgb(79 70 229 / 0.12), rgb(129 140 248 / 0.26))"
  danger: "light-dark(#b91c1c, #f87171)"
  device-edge: "light-dark(#e6e6e9, #2b2b31)"
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

The landing at `awardley.com` is a conventional product site at full craft, with Linear and Stripe as the bar. It is a separate world from the app (which keeps Fira and warm paper under ADR-0019); it shares only the name and the three-bar mark. The page is one ground and one accent: every section is told apart by a hairline rather than by a change of colour, so the only saturated thing above the fold is the primary button, and the indigo appears exactly three more times (the glow behind the product panel, the selected Quotes in the example sheet, the focus ring). Proof is shown as real UI, a phone capture cropped by its frame beside an HTML Quotes sheet labelled "Example data", never as logos, counts or testimonials.

Density is generous and quiet: a `max-w-6xl` measure, 40px landmarks (72px on desktop), four type tiers and no eyebrow. Both themes are one declaration, every colour a `light-dark()` pair read through `color-scheme: light dark`, and the site follows the device with no toggle; a reviewer flips it with `document.documentElement.dataset.theme`. Both scripts are first-class: Inter is fetched for Latin only, Han is drawn by the device, and `:lang(zh-Hans)` trades tracking for leading at every tier.

Confirmed anti-references: the app's Fira + warm-paper brochure (`4238188`) and the slate-and-navy Trust page with three icon cards in Plus Jakarta Sans (`041851c`). Neither is to be quoted.

**Key Characteristics:**
- Monochrome ground, one indigo accent, no second ground or coloured band anywhere.
- Sections divided by 8% hairlines; controls edged by a separate, darker `input` token.
- Inter (variable, `opsz`) with tight negative tracking on Latin display; zero tracking and open leading under `:lang(zh-Hans)`.
- Four type tiers (display, heading, section, quiet), all headings at 600, none heavier.
- One easing (`--ease-rise`) and one entrance (`rise`, 420ms, 60ms stagger) in the hero; one focal sequence, the Quotes sheet assembling, over by 2.2s; two sections borrow the entrance once each on scroll; the ask never animates; reduced-motion collapses everything.
- Corner says what a thing is: 8px operated, 12px replies, 16px containers.

## Colors

A near-achromatic palette whose two readings are stated once, as `light-dark()` pairs, with indigo as the single chromatic voice.

### Primary
- **Indigo** (`accent`): the primary button fill, the tick on a selected Quote, the top bar of the mark, `accent-color` for native controls, and the focus ring (`ring` aliases it). Deep on paper, lifted on the near-black reading so it still clears 4.5:1 as button ink's ground.
- **Indigo Wash** (`accent-wash`): the selected cell in the Quotes sheet and `::selection`. Sits under text, so it stays quiet enough to read through.
- **Indigo Edge** (`accent-edge`): reserved edge tint at 40–45% alpha; defined for controls that need a coloured border, not used on the home page today.
- **Indigo Glow** (`glow`): the blurred radial light above and behind the product panel. Its own token because it is spread over 20rem and blurred; at the wash's alpha it vanishes on the dark ground.
- **Indigo Ink** (`accent`, aliased as `signal-ink`): inline links on the privacy and confirm pages.

### Neutral
- **Paper / Near-black** (`background`): the one page ground, and the inset frame of the Quotes sheet inside the panel.
- **Alternate** (`card`): the product panel, the ghost button's hover, the sheet's header row, and the success notice. One step off the ground, never a band.
- **Ink** (`foreground`): body and heading text, the middle bar of the mark.
- **Muted Ink** (`muted-foreground`): sub lines, column body copy, nav links at rest, the fact row, table headers, non-selected amounts; clears 4.5:1 in both readings. Also the bottom bar of the mark.
- **Hairline** (`border`): section rules, column rules, the panel frame, the sheet's row rules, the bar's bottom edge. Deliberately below 3:1 and never a control edge.
- **Control Edge** (`input`): the email field's border, a full step darker than the hairline so an operable edge clears 3:1.
- **Device Edge** (`device-edge`): the 6px bezel of the phone frame; the one colour that is neither ink nor hairline.
- **Danger** (`danger`): form validation and failure text only.

### Named Rules
**The One Ground Rule.** There is one page ground and one alternate a step off it. No section, header or call to action changes the ground colour; sections are separated by hairlines.
**The Once-Spent Accent Rule.** Indigo is spent on the primary button and appears again only as the panel glow, the selected-quote wash and tick, and the focus ring. It is never a stripe, band, eyebrow or decorative rule.
**The Two Edges Rule.** `border` (8%) is for rules and frames and may sit below 3:1; anything the reader operates is edged with `input`, which clears 3:1 in both readings.
**The One Declaration Rule.** Every colour is a `light-dark()` pair on `:root`. No `dark:` variants, no second token block, no toggle; `color-scheme: light dark` is the switch and `data-theme` on `<html>` is the reviewer's override.

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
- **Quiet** (400, 0.875rem, 1.6, muted ink): captions ("Example data"), the copyright line, nav and footer links (at 500), the fact row, the form's privacy note. Han: leading 1.7.
- **Label** (500, 0.75rem, muted ink, sentence case): table column headers. Never uppercase.

### Named Rules
**The No Eyebrow Rule.** Four tiers and nothing over a heading. A kicker above a headline is a heading that did not trust itself.
**The Han Leading Rule.** Under `:lang(zh-Hans)` every tier sets `letter-spacing: 0` and opens leading (1.25 display, 1.45 heading and section, 1.7 quiet). There is no uppercase anywhere on the site, so nothing needs suppressing.
**The Tabular Rule.** Any table of amounts is `tabular-nums`, one currency, grouped by three and two-placed, written out rather than left to `toLocaleString`.
**The Six Hundred Rule.** Headings and the wordmark are 600; 700 does not appear. The display line is bigger than the wordmark, not heavier.

## Layout

A single centred measure: `max-w-6xl` (72rem) with `px-5` gutters on a phone and `px-8` from `md`. Copy columns narrow inside it: the hero stack to `max-w-3xl`, the sub line to 56ch, section intros to 46–52ch, the form to `max-w-xl`, the privacy page to `max-w-3xl`. `main .mx-auto` always has a max-width (the 390px suite asserts it).

Vertical rhythm is the four-step scale named for what it separates: `label` (8px) between a heading and its paragraph, `field` (14px) between controls in a row, `group` (24px) between blocks in a stack, `landmark` (40px) as section padding, rising to 4.5rem on `lg`. Sections are `border-t` hairlines with no ground change; the bar is `h-16` sticky at `z-50`, translucent (`bg-background/80 backdrop-blur`), and anchors use `scroll-mt-20` to clear it.

Responsive: the how-it-works columns are a single stack becoming `md:grid-cols-3` at `gap-8`; who-it-is-for becomes `lg:grid-cols-2`; the product panel is `h-[26rem]` on a phone (the Quotes sheet hidden, the phone capture centred) and `h-[32rem]` with a `5fr / 7fr` split at `lg`. The fact row stacks on a phone and runs inline with a middle dot from `sm`. Nav links are `hidden md:inline-flex`; on a phone the bar is the wordmark and the one control. Body text steps from 16px to 17px at 48rem. Both calls to action are above the fold at every width; the bar's own copy of the primary is hidden while the hero's is on screen.

## Elevation & Depth

Flat by default, with depth carried by tone and hairline rather than by shadow. The panel is `card` on `background` inside a hairline; the sheet is `background` on `card` inside a hairline; the bar is glass over the page. Exactly one shadow exists on the site, under the phone frame inside the product panel (`0 28px 60px -24px rgb(0 0 0 / 0.45)`), and one light, the `glow` radial above and behind the panel with a `-top-28` offset so it reads as a source rather than a halo. Buttons and inputs have no shadow at any state; hover is an opacity or ground shift.

### Shadow Vocabulary
- **Device drop** (`box-shadow: 0 28px 60px -24px rgb(0 0 0 / 0.45)`): the phone capture's frame only, so the device sits into the panel instead of on it.

### Named Rules
**The Hairline Depth Rule.** Layers are declared by a hairline and a one-step ground change. Shadows do not mark elevation; the single shadow on the site is a photographic device drop, not a UI elevation.

## Shapes

One radius token (`--radius: 0.5rem`) and three derived steps, each meaning a kind of thing: 8px (`lg`) is something you operate (buttons, the email field, nav link focus rects, the wordmark link); 12px (`xl`) is a reply or an inset (the Quotes sheet frame inside the panel, the success notice); 16px (`2xl`) is a container that holds other things (the product panel). Borders are 1px hairlines everywhere except the email field (`input`) and the phone bezel (6px `device-edge`). The phone frame is a one-off 2rem radius clipped by `overflow-hidden`, cropped by the panel's bottom edge on purpose. The mark is three left-aligned bars of descending width (≈7:5:4) with fully rounded ends on a 24-unit square; the one glyph (the tick) is a 24-unit stroke at 1.75 with round caps and joins, `currentColor`, no fill.

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
- **Focus:** `outline-none` replaced by the global ring, 2px solid `ring` at 2px offset.
- **Error:** `aria-invalid` and a 14px `danger` message below with `role="alert"`; success replaces the form with a 12px-radius `card` notice under a hairline.
- **Honeypot:** an off-screen `website` field hidden by geometry, `aria-hidden`, `tabIndex -1`.

### Navigation
- **Style:** sticky 64px bar, hairline bottom edge, `background` at 80% with `backdrop-blur`. Wordmark left (mark 24px, name 17px at 600, -0.015em). Right: text links at 14px/500 in muted ink, `min-h-11`, `px-3`, hover to full ink over 200ms; then the bar button. No menu, no hamburger; links are hidden below `md`.
- **Footer:** hairline top, wordmark and a 36ch tagline left, three `min-h-11` links right (Sign in, Privacy, the other locale labelled in its own script), copyright as a quiet line under a second hairline.

### Cards / Containers
- **Product panel:** 16px radius, hairline, `card` ground, fixed height with `overflow-hidden`; a quiet "Example data" caption pinned top-right; the `glow` radial behind it.
- **Inset sheet:** 12px radius, hairline, `background` ground, holding the Quotes table.
- **Not used:** feature cards. How-it-works columns and who-it-is-for rows are `border-t` hairlines with `gap-label` stacks, not boxed.

### Quotes Sheet (signature)
An HTML table standing in for the product's comparison screen: header row on `card` with 12px/500 muted labels; body rows 14px, `py-2.5`, separated by hairlines; item names as row headers at 400; amounts right-aligned in `tabular-nums`, muted when not chosen; the selected cell on `accent-wash` at 500 with a 14px accent tick and a visually-hidden "Selected"; a `tfoot` Bid row at 600. One currency, grouped by three, two decimals.

### Mark
Three bars of `--mark-1..3` (accent, ink, muted ink), inline SVG so the middle bar inverts with the theme; always beside the wordmark, never alone, except as `app/icon.svg` with the values written out.

### Motion
One easing, `--ease-rise` (`cubic-bezier(0.16, 1, 0.3, 1)`), a hard ease-out with no bounce or overshoot, and every gesture on the site is written `both` from an already-visible default.

- **Entrance** (`rise`): opacity 0→1 with a 12px lift, 420ms. Five hero children stagger by `animation-delay` at 60ms steps (headline 60, sub 120, buttons 180, facts 240, panel 300), so the page assembles top-down and ends on the product.
- **Focal sequence**, the Quotes sheet assembling, once per load, in the order the work happens: the amounts arrive by supplier column (`quote-arrive`, 360ms, 4px lift, `--col` × 120ms from 520ms); the four chosen cells take the wash, full ink, weight 500 and a self-drawing tick (`quote-choose` 300ms and `tick-draw` 320ms via `pathLength="1"`, `--row` × 80ms from 1240ms, 120ms after the last column has landed); the Bid arrives last at 1860ms, 60ms after the last tick. Over by about 2.2s. Row and column headers are present from the start; only data moves. The chosen cell is styled as an unselected one by class and animated into its end state, so under reduced motion it lands there instantly.
- **Reveal**: the How-it-works and Who-it-is-for blocks borrow `rise` once, the first time they are scrolled to (`components/reveal.tsx`: `IntersectionObserver`, `threshold: 0`, hides only a block that is off screen after hydration, disconnects after the first entrance, never created under reduced motion). The closed-beta heading and the form never animate: the ask is simply there.
- **Feedback**: the bar's call to action fades and lifts 1px over 200ms instead of snapping, and is `aria-hidden` with `tabIndex -1` while faded; the form's success notice enters with `rise`. Other state transitions are 150–200ms on opacity or colour only.
- **Off switches**: `scroll-behavior: smooth` only under `prefers-reduced-motion: no-preference`; under `reduce`, every animation and transition collapses to 0.01ms with zero delay and one iteration, so each lands on its end state. `@media print` resets every motion class to its end state so nothing is mid-gesture on paper.

### Browser surfaces
`::selection` is `accent-wash` with full ink; `accent-color` is `accent`; `text-underline-offset` is 0.2em; `:focus-visible` is 2px solid `ring` at 2px offset everywhere; `color-scheme: light dark` paints the pre-stylesheet canvas and native controls in the right reading.

## Do's and Don'ts

### Do:
- **Do** state every colour once as a `light-dark()` pair on `:root` and read it through `color-scheme`; preview the other reading with `data-theme` on `<html>`.
- **Do** separate sections and columns with the 8% hairline and keep the page on one ground.
- **Do** edge anything operable with `input`, the darker control edge, and leave `border` for rules and frames.
- **Do** keep every control at 44px (the tap floor); the 36px bar button is the one exception and it defers to the 44px primary while that is on screen.
- **Do** set headings at 600 and let size, tracking and leading carry hierarchy; cap section headings at 36px.
- **Do** keep `:lang(zh-Hans)` at zero tracking with open leading at every tier, and draw Han from the device stack.
- **Do** use `tabular-nums`, one currency and hand-formatted grouping in any table of amounts.
- **Do** label example data on its face, and show the product as real UI (the phone capture, an HTML sheet).
- **Do** name spacing by what it separates: `label` 8, `field` 14, `group` 24, `landmark` 40 (72 on desktop).

### Don't:
- **Don't** fetch a CJK webfont; Inter is Latin-only and Han is the device's.
- **Don't** add a theme toggle, a `dark:` variant, or a second token block.
- **Don't** introduce a coloured band, stripe, second ground, eyebrow, kicker, numbered step or icon-over-column card.
- **Don't** put a price, a signup link, logos, counts or testimonials on the page (ADR-0035; the only app link is `/login`, the only ask is the waiting list).
- **Don't** use a weight above 600, uppercase labels, or negative tracking on Han.
- **Don't** add shadows to buttons, inputs or panels; the one shadow is the phone's device drop.
- **Don't** add a second easing, a loop, a scroll-linked effect, or an entrance on the closed-beta section or the form; don't animate a size, margin or position in the flow; don't leave motion running under `prefers-reduced-motion: reduce`.
- **Don't** add a second icon; the tick is the whole icon vocabulary, inline and `currentColor`.
