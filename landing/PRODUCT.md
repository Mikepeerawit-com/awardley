# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The visitor to `awardley.com` is, in order of weight (confirmed 17 September 2026):

1. **The owner or manager of a trading company** who has heard the name and wants to know what it is and whether to ask for an invite. They run tenders for a living: a client sends a request for several products, they collect supplier quotes, build a bid, and either win or lose.
2. **A colleague who received a Reminder** from the app and followed a link to find out what the tool is. Often reads Chinese first.
3. **Investors and partners** assessing the project rather than buying.

Market right now: **international, English first**; `zh-Hans` is a full second locale, not an afterthought, because the working staff of these firms often read Chinese. The app is a web app and runs on any device; the people in it are supplier-chasers who are often on a phone, frequently inside the WeCom webview, and owners who compare on a desk (see `../CONTEXT.md`, `../docs/adr/0019-*`).

## Product Purpose

Awardley keeps one record per client Tender: what the client asked for (Items with quantity, specification and Reference Images), what suppliers quoted (Quotes, compared on one sheet in one currency), what the company bid back (the Bid, built from selected Quotes), and whether it won. Reminders go by email to the one person chasing an Item, in the language that person reads. Success for the landing page is a qualified visitor joining the waiting list, and an invited one finding the sign-in door.

## Positioning

The mechanism a neighbouring product cannot truthfully copy: **the Tender, its Items, every supplier's Quote per Item, and the Bid derived from the Quotes chosen, on one record, bilingual per person.** Not a CRM, not a spreadsheet, not a procurement portal. Reminders address one person in their own language, so the tender does not live in a group chat.

## Operating Context

- Trading companies (the first is a medical-supplies trader in Thailand) that answer client tenders/RFQs by sourcing from several suppliers.
- Client requests arrive as email with pictures; supplier quotes arrive piecemeal; the comparison is usually a spreadsheet somebody keeps.
- The app is on the web and works on any device: staff often use a phone, inside WeCom; owners compare on a desk.
- Launch state: **closed beta**, invite-only. Self-serve signup does not exist yet.

## Capabilities and Constraints

- The landing is a separate Vercel project in `landing/`, sharing no code or runtime with the app (`../docs/adr/0035-*`).
- **No price anywhere. No signup link.** The only link to the app is `https://app.awardley.com/login`. The only call to action is the waiting list (double opt-in; nothing stored until the confirm link is clicked).
- Bilingual `en` + `zh-Hans` via `next-intl`; copy lives in `messages/*.json`. Domain terms are fixed by `../CONTEXT.md` (Tender, Item, Quote, Bid, Assignee, Reminder; zh 招标 / 产品项 / 报价 …).
- **No CJK webfont may be fetched.** The Han stack is declared in `app/globals.css` and drawn by the device. `:lang(zh-Hans)` typography rules (no tracking, open leading, no uppercase) must survive any redesign.
- The 390px layout suite (`test/home.layout.test.tsx`) must pass in both locales: no sideways scroll, `main .mx-auto` has a max-width, exactly one `role=textbox`, the `input[name="website"]` honeypot present and `aria-hidden`. All components it renders must be sync.
- **The site is light only** (decided 18 September 2026): `color-scheme: light` on `:root`, every colour stated once as a plain value, no dark reading and no theme switch. The app keeps its own three theme states (ADR-0024).
- Stack: Next.js 16 App Router, Tailwind v4, React 19. No new runtime dependencies without a reason.

## Brand Commitments

- Name **Awardley**; the mark in `components/mark.tsx`.
- The landing is **free to look different from the app** (confirmed 17 September 2026): same name and mark, its own faces and palette. ADR-0019 governs the app only.
- Owner's stated bar: **"modern and professional"**, judged in light. Two prior passes were rejected (commits `4238188`, `041851c`): the first kept the app's Fira + warm paper; the second was a Swiss/Trust-and-Authority slate-and-navy page in Plus Jakarta Sans. Both are anti-references.
- Voice: plain, specific, no hype. Says what it is; never invents proof.
- **Standing preference (17 September 2026): the category standard, played straight.** Impeccable's dealt visual worlds (a sailing board, a bid tabulation sheet, a custody line) were declined as over the top. The landing is a conventional product site at full craft, and its bar is **Linear and Stripe**: restrained, precise type, product shown as real UI, finished to that standard in its one light reading. No irony, no smuggled quirk.

## Evidence on Hand

- `public/screenshot-tender.png` — one real capture of a Tender on a phone (390×767 CSS px after the 17 Sep 2026 recrop, from a 390×844 capture), English, fictional medical seed data. The **only** product image; reseeding is currently blocked.
- Real copy in `messages/en.json` and `messages/zh-Hans.json`.
- **Absent, and not to be fabricated:** customers, logos, testimonials, counts, benchmarks, prices.

## Product Principles

1. Trust before persuasion: every sentence on the page is checkable today.
2. The mechanism is the pitch: show the record, the sheet, the Reminder.
3. One ask: the waiting list. The sign-in door is findable but never competes.
4. Both scripts are first-class: judge `zh-Hans` as seriously as `en`.
5. Nothing fetched that a phone in China cannot afford.

## Accessibility & Inclusion

Text pairs ≥ 4.5:1; control edges ≥ 3:1. `prefers-reduced-motion` collapses all motion. Colour never carries the only copy of a meaning.
