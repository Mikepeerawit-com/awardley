# A corner says what kind of thing it is, and an edge means you can operate it

> **Fills a gap [ADR-0019](0019-the-visual-system-is-built-for-a-chinese-reader-on-a-phone.md)
> left rather than reversing anything it decided.** That ADR and its four amendments settle
> the typefaces, the hues, what each hue is allowed to say, the money direction and the two
> themes. Not one of those moves here. What it never covers is **form** — radius, edge,
> elevation — and the app had no rules for any of them.

The complaint that started this was that the app looked *dated and generic*. The palette was
the obvious suspect and the wrong one: it is the most reasoned part of the codebase, and
`contrast.layout.test.tsx` walks every screen in both locales, both themes and both widths
to keep it honest. The inventory found the real answer somewhere else:

| | Count |
|---|---|
| `rounded-lg` | **68** of 84 rounded corners in the app |
| Shadows | **2**, in the whole app |
| Distinct edge treatments | effectively one hairline |

`rounded-lg` was on the `Button` base itself. So **a submit button, a text field, a filter
chip, a banner and a Tender row were the same 10px rectangle behind the same 1px line.** On
a screen whose only surviving hierarchy is colour, that reads as a wireframe of the app
rather than as the app.

The radius scale had existed since the app was scaffolded. Nothing had ever assigned a
meaning to a step of it, so every call site reached for the middle one.

## Three rules

**1. A corner says what kind of thing it is.**

- **`rounded-full`** — you pick it out of a set. A filter chip, a rank pill, a count badge.
- **`rounded-control`** — you operate it. A button, an input, a select, a nav target.
- **`rounded-surface`** — it contains other things. A card, a banner, a fold, a panel.

Named for what wears them rather than for how big they are, so the rule is legible at the
call site and a fourth reading has to be argued for. They are aliases of the existing `md`
and `xl` steps: **the visual system did not need more numbers, it needed the numbers to
mean something.**

**The filter chips becoming pills is the single largest change on any screen.** The tender
list opens on ten narrowings across three rows, and as rectangles they were ten more buttons
between the reader and the list. `rounded-full` says *pick from this set* in a way no
rectangle can, and it separates them at a glance from *Record a tender*, which is a thing
you do rather than a thing you choose.

**2. An edge means you can operate it.**

A control keeps its line — that is how a reader knows a field is a field, which is
information rather than decoration under WCAG 1.4.11, and `--input` is already held to 3:1
by the contrast walk. **A container loses it.** A card is a fill and a shadow now; a wash
bar is a wash. Nothing is a box drawn on paper.

The exception is stated rather than tolerated: **a coloured edge carries a tone and stays.**
A refusal notice, an Alternative Quote, a Submission Missed group — their edge is the hue
saying which of ADR-0019's four things this is, and the hue is not decoration.

**3. Elevation is a light-theme device, and there is one raised thing on a screen.**

`--shadow-surface` is the shadow of a sheet lying on a desk. `--shadow-raised` is a thing
floating over one, and it is spent on the two things that actually float: the app menu
popup, and the Tender detail's sticky jump bar.

**In dark it is `none`, and not a re-tuned value.** A shadow works by darkening the ground
and a dark ground has nothing left to darken; every dark theme that ships the light theme's
shadows gets cards that look smudged rather than raised. Dark separates surfaces by
lightness, which this palette already does — `--card` at 0.225 against a 0.185 ground is
twice the separation the light theme has. So a container carries **one** declaration in
both themes and there is no second shadow to keep in step.

## What the guard caught, and the lesson it is the third instance of

`contrast.layout.test.tsx` went red on the tender edit screen in dark, in both locales:
**the destructive Remove measured 4.26:1 against a floor of 4.5.**

Nothing about the button changed. What changed is what is behind it: the Item card stopped
being a bordered box on the ground and became a `--card` sheet, and `bg-destructive/20`
composites over whatever it is drawn on. Behind it got lighter, so the wash got lighter, so
the ink on it lost contrast.

The wash is 12% in dark now. The alternative was lightening `--destructive` itself, which
would have repainted every refusal notice in the app to fix one button.

**This is the fault ADR-0019 has now named three times** — at `--ink-faint` in #130, again at
`--ink-faint` in #135, and here. *A token's contrast claim is a claim about a list of
surfaces, and the list is only as long as the screens somebody measured.* Adding a surface
to the app is therefore a contrast change even when no colour moves, and it is worth
expecting the walk to go red rather than being surprised by it.

## What this deliberately does not touch

**No hue moved and no typeface moved.** Everything ADR-0019 and ADR-0023 decide is
unchanged, and the money direction still follows the rendered locale.

**The type scale.** Screen titles are still `text-2xl` over a `text-base` section tier and a
10.5px field label, which is the three-tier scale ADR-0026 established and it works. A
display tier and more weight contrast is the obvious next lever and is deliberately not
taken here: it moves every screen in both scripts, and ADR-0019's standing instruction is to
judge that in `zh-Hans` first, against Fira — which is a separate pass with its own
measurements.

**The spacing rhythm.** Gaps are still a fairly uniform 12 and 16px. Grouping distances that
say what belongs with what would be the third pass, after type.

> **Both passes have since been taken**, and both are amendments to
> [ADR-0019](0019-the-visual-system-is-built-for-a-chinese-reader-on-a-phone.md) rather than
> to this one, because what they move is that ADR's subject: the type scale in
> [#153](https://github.com/Mikepeerawit-com/tender-tracker/issues/153) and the spacing scale
> in [#154](https://github.com/Mikepeerawit-com/tender-tracker/issues/154). The finding above
> — a scale existed, no step of it meant anything, so every call site took the middle one —
> held for all three, which is why both answers are named steps rather than new numbers.
