import { cleanup, render } from "@testing-library/react";
import { afterAll, describe, expect, it } from "vitest";
import { commands, page, server } from "vitest/browser";

// `@/test/screens` brings the app's stylesheet with it, so nothing is imported here for
// it — the contact sheet, which this file is modelled on, does the same.
import { locales, Screen, screens } from "@/test/screens";
import { column, phone, resolvedFaces, type ResolvedFace } from "@/test/layout";

/**
 * **How long every screen is at 390px, and what it is long *because* of** — the reading
 * [#151](https://github.com/Mikepeerawit-com/tender-tracker/issues/151) asked for.
 *
 * This is deliberately **not a check**, for the same reason `screens.contact-sheet.tsx`
 * is not one: it has no baseline, asserts nothing about any height, and never runs in
 * CI. ADR-0016 refuses checks that cannot fail because they manufacture confidence, and a
 * height assertion is the clearest case of it — pinned loosely it can never fail, pinned
 * tightly it fails on whichever face the runner happened to substitute. So this reports
 * and claims nothing. It runs from `npm run screen-length`, on the machine of whoever
 * wants to know, and is excluded from `npm test` by the project filter in `package.json`.
 *
 * **Why it is committed rather than written and thrown away.** It was thrown away twice,
 * and both times a number came out wrong. ADR-0026's opening table said the tender list
 * was 1100px when it was 1664px, corrected eighty minutes later by `1e43763`; ADR-0009's
 * 189px per quote card was wrong for four weeks and found only because #151 measured
 * again for another reason. A number nobody can re-derive is a number nobody can check.
 *
 * **What a height measured here is a fact about.** `next/font` supplies Fira Sans in the
 * real app and not in this harness, so unless it is installed locally the Latin text is
 * being drawn by the CJK face behind it — the same caveat the contact sheet states, and
 * the reason ADR-0029 asserted on a computed font size rather than a width. Latin heights
 * here are therefore indicative; `zh-Hans` is the closer of the two to what ships, which
 * is also the locale #68 says to judge first. The report says which faces resolved.
 *
 * **No size is being set anywhere.** Every screen in this app is fluid below ADR-0022's
 * measure and reflows at ADR-0009's 768px breakpoint. What is printed below is what that
 * responsive layout *comes to* on a phone — how much scrolling a reader is asked for —
 * not a width or a height anything is held to.
 */

/** A phone screen, so a height can be read as "how many times must somebody scroll". */
const SCREENFUL = phone.height;

const OUT_FROM_ROOT = ".screen-length";

type Block = { position: number; label: string; height: number };

type ScreenRow = {
  screen: string;
  locale: string;
  height: number;
  blocks: Block[];
};

type CardRow = {
  locale: string;
  item: string;
  cards: number;
  median: number;
  shortest: number;
  tallest: number;
  identity: number;
  money: number;
};

const screenRows: ScreenRow[] = [];
const cardRows: CardRow[] = [];
let faces: ResolvedFace[] = [];

describe("how long each screen is", () => {
  it.each(
    locales.flatMap(([locale, messages]) =>
      Object.entries(screens(messages)).map(
        ([name, entry]) => [`${name}, in ${locale}`, name, locale, messages, entry.body] as const,
      ),
    ),
  )("measures %s", async (_case, name, locale, messages, body) => {
    // The viewport the whole layout project stands at, restated rather than assumed: a
    // page laid out in a taller box wraps differently and so measures differently.
    await page.viewport(phone.width, phone.height);

    render(
      <Screen locale={locale} messages={messages}>
        {body}
      </Screen>,
    );

    if (faces.length === 0) faces = resolvedFaces();

    screenRows.push({
      screen: name,
      locale,
      height: pageHeight(),
      blocks: topLevelBlocks(),
    });

    // Every quote card this screen happened to draw, so the per-card cost is measured on
    // the real screen rather than on a card built here to be measured.
    cardRows.push(...quoteCards(locale));

    cleanup();
  });

  afterAll(async () => {
    // A run that measured nothing would otherwise write a cheerful empty report.
    expect(screenRows.length).toBeGreaterThan(0);

    const report = reportPage();

    await commands.writeFile(`${OUT_FROM_ROOT}/report.md`, report);

    // The point of the tool is the numbers, and a file nobody opens is not them.
    console.log(`\n${report}`);
  });
});

/**
 * How tall the page came out, however it chose to lay itself out.
 *
 * Through {@link column}, which is where `@/test/layout` says that question is asked —
 * *"a single edit here rather than three suites quietly disagreeing about what they
 * measured"*. This file measures the same element the width suites do, or it is reporting
 * about a different page than they are.
 */
function pageHeight(): number {
  return Math.round(column().getBoundingClientRect().height);
}

/**
 * The screen broken into the blocks a reader scrolls past, each named by whatever it
 * calls itself.
 *
 * Walked off the DOM rather than listed here, so a part added to a screen appears in the
 * report without anybody remembering to add it twice — and so this file holds no opinion
 * about what the Tender detail is made of.
 */
function topLevelBlocks(): Block[] {
  // **Every child, including the ones that drew nothing.** A block is keyed by where it
  // sits in the region, because that is the one thing about it that is the same in both
  // locales — its heading is translated, so a label join reports the whole Chinese column
  // as missing. Dropping the empty ones here would shift those positions per locale and
  // reintroduce the fault by the other door; they are dropped at the point of rendering,
  // and only where every locale agrees there was nothing to draw.
  return [...column().children].map((child, position) => ({
    position,
    label: labelOf(child),
    height: Math.round(child.getBoundingClientRect().height),
  }));
}

/** What a block calls itself: its heading, else its landmark name, else its tag. */
function labelOf(element: Element): string {
  const heading = element.querySelector("h1, h2, h3");

  if (heading?.textContent) return heading.textContent.trim().slice(0, 40);

  const label = element.getAttribute("aria-label");

  if (label !== null && label !== "") return label.slice(0, 40);

  const id = element.getAttribute("id");

  return id !== null && id !== "" ? `#${id}` : element.tagName.toLowerCase();
}

/**
 * Every quote card drawn on this screen, and where the card's own division falls.
 *
 * Below 768px a Quote is a card and the row is a grid; the hairline ADR-0026 put between
 * *describing* a Quote and *pricing* it is a `max-md:` border on the first money cell. So
 * the split is read off the border rather than off a count of cells, which would go stale
 * the first time a cell moved.
 */
function quoteCards(locale: string): CardRow[] {
  return [...document.querySelectorAll("table")].flatMap((table) => {
    const rows = [...table.querySelectorAll("tbody tr")];

    if (rows.length === 0) return [];

    const heights = rows.map((row) => row.getBoundingClientRect().height);

    // **One card's numbers, not three columns of independent medians.** Taking a median
    // per column let `identity` and `money` come off different cards than the height
    // beside them, so the two halves did not add up to the card they were printed against
    // — 121 + 176 against a stated 326. The split is read off the median-height card
    // itself, so the row is three facts about one Quote and a reader may add them.
    const typical = rows[rankOfMedian(heights)];
    const split = splitOf(typical);

    return [
      {
        locale,
        item: nameOfItemOwning(table),
        cards: rows.length,
        median: Math.round(typical.getBoundingClientRect().height),
        shortest: Math.round(Math.min(...heights)),
        tallest: Math.round(Math.max(...heights)),
        identity: Math.round(split.identity),
        money: Math.round(split.money),
      },
    ];
  });
}

/**
 * Which card is the median one by height.
 *
 * The *lower* middle on an even count, so this always names a card that exists rather
 * than averaging two of them into a card nobody drew.
 */
function rankOfMedian(heights: number[]): number {
  const order = heights.map((height, index) => ({ height, index }));

  order.sort((a, b) => a.height - b.height);

  return order[Math.floor((order.length - 1) / 2)].index;
}

/** Where the card stops describing the Quote and starts pricing it. */
function splitOf(row: Element): { identity: number; money: number } {
  const top = row.getBoundingClientRect().top;
  const height = row.getBoundingClientRect().height;

  const hairline = [...row.children].find(
    (cell) => parseFloat(getComputedStyle(cell).borderTopWidth) > 0,
  );

  if (hairline === undefined) return { identity: height, money: 0 };

  const identity = hairline.getBoundingClientRect().top - top;

  return { identity, money: height - identity };
}

/** Which Tender Item's quotes these are, named by the disclosure the table sits inside. */
function nameOfItemOwning(table: Element): string {
  // `ItemDisclosure` is a button and a panel inside one `<li>`, not a `<details>`: the
  // twisty is the only element that names the Item without also carrying its quantity,
  // its chips and its whole pricing line.
  const twisty = table.closest("li")?.querySelector("button[aria-controls]");

  return twisty?.getAttribute("aria-label")?.trim().slice(0, 34) ?? "—";
}

/** A markdown header row with one column per locale, so the two tables cannot disagree. */
function headerRow(first: string): string {
  const locales = [...new Set(screenRows.map((row) => row.locale))];

  return `| ${first} | ${locales.join(" | ")} |\n|---|${locales.map(() => "---").join("|")}|`;
}

function screenfuls(height: number): string {
  return `${(height / SCREENFUL).toFixed(1)}`;
}

function reportPage(): string {
  const order = [...new Set(screenRows.map((row) => row.screen))];

  const lengths = order
    .map((name) => {
      const cells = screenRows
        .filter((row) => row.screen === name)
        .map((row) => `${row.height.toLocaleString()}px (${screenfuls(row.height)}×)`);

      return `| ${name} | ${cells.join(" | ")} |`;
    })
    .join("\n");

  const parts = order
    .map((name) => {
      const rows = screenRows.filter((row) => row.screen === name);
      const first = rows[0];

      if (first === undefined || first.blocks.length <= 1) return "";

      // **Joined by what a block calls itself, never by its position.** `topLevelBlocks`
      // drops anything with no height, so a band that collapses in one locale and not the
      // other shortens that locale's list — and an index join would then report every
      // block below it under the wrong name, silently and plausibly.
      const blockRows = first.blocks
        .map((block) => {
          const drawn = rows.map(
            (row) =>
              row.blocks.find((other) => other.position === block.position)?.height ?? 0,
          );

          // Nothing anywhere drew it, in any locale: not a block, just an empty wrapper.
          if (drawn.every((height) => height === 0)) return "";

          const cells = drawn.map((height, index) => {
            const total = rows[index].height;
            const share = total === 0 ? 0 : Math.round((height / total) * 100);

            return height === 0 ? "not drawn" : `${height.toLocaleString()}px (${share}%)`;
          });

          // Each locale names its own parts, so the label is whichever locale leads the
          // table — the heights beside it are the same block in every column regardless.
          return `| ${block.label} | ${cells.join(" | ")} |`;
        })
        .filter((row) => row !== "")
        .join("\n");

      return `\n### ${name}, block by block\n\n${headerRow("Block")}\n${blockRows}\n`;
    })
    .join("");

  const cards = cardRows
    .map(
      (row) =>
        `| ${row.locale} | ${row.item} | ${row.cards} | ${row.median}px | ${row.shortest}–${row.tallest}px | ${row.identity}px | ${row.money}px |`,
    )
    .join("\n");

  return `# Screen length at ${phone.width}px

_Measured on ${server.platform} · ${server.browser} · ${phone.width}×${phone.height}._

Nothing here is a check and nothing here is a size that has been set. These are the
lengths the responsive layout **comes to** on a phone — how much scrolling a reader is
asked for. A screenful is ${SCREENFUL}px, so \`2.0×\` means two phone screens of scrolling.

**Faces that drew this run:**

${faces.map((face) => `- ${face.family} — ${face.role}`).join("\n")}

Only the first family that resolves draws anything; the rest are declared and never
consulted. \`next/font\` supplies Fira Sans in the real app and not in this harness, so
where it reads _not installed_ above, the Latin text below was drawn by the CJK face
behind it — Latin heights are therefore indicative, and \`zh-Hans\` is the closer of the
two to what ships.

## Every screen, end to end

${headerRow("Screen")}
${lengths}
${parts}
## What one quote card costs

Ranked Quotes below 768px are one stacked card each. \`identity\` is the half above the
card's hairline — supplier, sourcer, what was actually offered — and \`money\` is the half
below it. Medians and the spread, over the cards each screen really drew — a narrow range
means the length of an Item is close to \`cards × card\`, and a wide one means it is not.

| Locale | Item | Cards | Card (median) | Card (range) | identity | money |
|---|---|---|---|---|---|---|
${cards}
`;
}
