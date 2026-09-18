---
version: 1
slug: "components-home-tsx"
primary_target: "components/home.tsx"
related_targets: ["components/site-header.tsx","components/footer.tsx","components/waiting-list-form.tsx","app/globals.css","app/layout.tsx"]
---

# Surface brief: awardley.com home (`components/home.tsx`)

Scope: the marketing home page, both locales (`en`, `zh-Hans`), light only. Visitor mode: **Persuade**.

Audience and job: a trading-company owner or manager who has heard the name and wants to know what Awardley is and whether to ask for an invite; secondarily a colleague who followed a Reminder link, and investors. Action: join the waiting list. Proof: the real phone capture (`public/screenshot-tender.webp`) and an HTML-rendered example of the Quotes sheet, labelled example data. Constraints: ADR-0035 (no price, no signup, only `/login`, waiting list only, nothing stored before confirm); no CJK webfont; 390px layout suite; sync components.

Chosen direction: the category standard, played straight (Impeccable's standing exit), benchmarked against Linear and Stripe. Memorable moment: the product panel under the headline, a real phone screen beside a live-looking Quotes sheet, rising once as the page opens.

Unresolved: none. Reseeding the app screenshot waits on the Supabase CLI.

## Direction contract

THESIS: One record per tender, shown as the working UI it is, on a page that could sit beside Linear and Stripe. Refuses the two prior arrangements on this project: the warm-paper brochure and the slate-and-navy Trust page with three icon cards. No cards, no eyebrows, no numbered steps, no coloured bands.

OWN-WORLD: Monochrome ground, one indigo accent. Light only: white ground, `#fafafa` alternate, near-black ink, muted grey text that clears 4.5:1, hairline borders at ~8% ink. Inter (Latin, variable, `opsz`) with tight display tracking (-0.02 to -0.03em) beside the device Han stack; `:lang(zh-Hans)` keeps zero tracking, open leading, no uppercase. Controls: 8px radius, 44px height (the tap floor, PRODUCT.md accessibility), filled indigo primary, ghost secondary with hairline. Type scale: display 56–64px desktop / 36px phone, section headings 32–36px, body 16–17px, small 14px. Tabular numerals in any table.

STORY: The visitor reads the headline and knows it is a tender record; sees the real phone screen and an example Quotes sheet and believes it exists and works; reads three plain columns on how it works and three rows on who it is for; and leaves an email at the foot. Someone with an Invite finds Sign in in the header without it competing.

FIRST VIEWPORT: Sticky header (mark left; How it works, Sign in right; hairline, backdrop blur). Centred stack: badge-free headline (display size, balanced), one sub line at 18–20px in muted ink, two buttons side by side (primary indigo "Join the waiting list", ghost "Sign in"), then the three facts as a quiet inline row. Directly under, edge-to-measure product panel: a rounded (16px) hairline frame on the alternate ground, a soft indigo radial glow behind it, holding the phone capture at left (~30% width, cropped at the frame's bottom edge) and the example Quotes sheet at right (an HTML table: four Items down, three suppliers across, one Selected quote per row ticked, one currency, a Bid total), with a small "Example data" caption. On a phone the sheet hides and the phone capture is centred. Primary action sits above the fold at every width.

FORM: The category standard (canon), the standing exit rather than a card from the roll; seed key f9f50ed2; the user declined the dealt worlds as over the top and named Linear and Stripe as the bar.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
