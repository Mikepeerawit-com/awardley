# The apex is the shop window, and the app lives next door

_Written by the landing-page grilling session of 16 September 2026, for issue #183._

**Status:** accepted. **Extends [ADR-0006](0006-email-password-floor-wecom-convenience.md) and [ADR-0017](0017-the-first-org-admin-arrives-through-a-guarded-setup-screen.md)** outward to a hostname the app does not serve. Everything either of them says about how an account comes into being stands; this ADR is about what a stranger sees _before_ there is an account to talk about, and about keeping that separate from the app on purpose.

Until now `awardley.com` had no DNS record at all. The product moved to `app.awardley.com` under #181, and the launch is a closed beta (decided 15 September 2026): only an invited client can use the app, `enable_signup` is `false`, and the only doors are `/setup` and an Invite. So anyone who hears the name and types it into a browser meets nothing, and anyone who finds the app meets a sign-in they cannot use. Interest evaporates silently. A page has to exist, and it has to have somewhere for that interest to go.

## The decision

**`awardley.com` is the marketing site. `www.awardley.com` redirects to it. `app.awardley.com` is the product, and nothing else is.**

The marketing site is a **second Vercel project**, built from `landing/` in this repository, and it shares no code, no runtime and no database with the app. It has one piece of behaviour beyond static pages: a **waiting list**, which is an email address, double-opted-in, held as a contact in a Resend Audience. The list exists so that Mike can send the people on it updates about the project by hand, as Resend Broadcasts, and so that they are told first when self-serve signup opens (#178).

The landing page links to `https://app.awardley.com/login` for people who already hold an Invite. It links to nothing else on the app host.

## Why a second project and not a host-routed page in the app

**Because the app's front door is a statement about identity, and a marketing page is not.** `src/proxy.ts` sends every request that is not on `publicPaths` to `/login`; `src/app/(app)/page.tsx` is the signed-in home. Serving `awardley.com` from the same deployment means teaching the proxy that a hostname changes what a path means, on the same seam that decides who is signed in. That is more surface on the one file that most needs to stay small, in exchange for a page whose only requirement is to render.

**Because the app's tests would inherit a page that has nothing to do with them.** The layout and screenshot suites (`src/test/layout.ts`, `src/app/__screenshots__/`) exist to hold the app's visual system still. A marketing page changes for marketing reasons, and every one of those changes would have to answer to a suite written for a supplier-chaser on a phone.

**Because a deploy of the app should not be a deploy of the brochure, and the reverse.** Two projects, two build paths, two sets of environment variables — and the marketing site's variables (a Resend key with contact-write scope, a signing secret for confirmation links) never sit in the same environment as the service-role key.

The price is a second Vercel project, a second `package.json`, and a `landing` job in CI. That is the price of the boundary, and it is paid once.

## Why the list is not a table

ADR-0017 is precise about the app's RLS posture: one policy per table, and inside your org you read and write everything. Preview and production share one Supabase project. A table that an anonymous visitor can insert into is a new posture on a shared project, and the first one. A Resend Audience holds an email address and an unsubscribed flag, which is the whole of what a waiting list is; it exports as CSV or over the API; and the thing the list is _for_ — sending an update — is a Broadcast to that Audience with Resend's own unsubscribe link, built in.

For the same reason **"waiting list" does not enter `CONTEXT.md`.** It is not a thing the business does with a Tender; it is a marketing mechanism that sits outside the product and will be replaced by open signup. A glossary entry would promise the code cares about it, and the code does not.

## What must not be quietly undone

- **The landing page never links to a signup that does not exist.** Until #178 ships, the only call to action is the waiting list, and the only app link is `/login`. A "Get started" button pointing at `/setup` would turn ADR-0017's one-shot bootstrap screen into a public invitation to try a secret.
- **Nothing is stored before the link is clicked.** The form sends one email and forgets the address. The contact is created on `/confirm`, from a token the site itself signed. Storing on submit "to be safe" is how a scraped form becomes a list of strangers.
- **The apex sends marketing mail; `notify.awardley.com` sends the app's.** ADR-0034 put Reminders on `reminders@notify.awardley.com`. The waiting-list confirmation and every Broadcast go out from `hello@awardley.com`. A person who unsubscribes from updates must go on receiving the Reminders their Org Admin set up, and two senders on two domains is what makes that true.
- **No price on the page.** The commercial decisions are Mike's and are not in this repository. The page sells the mechanism and the list; a number arrives with self-serve signup, in the app, where it can be acted on.
- **`app.awardley.com` stays the only hostname the app serves.** Adding a second one back to the app's Vercel project reopens the question this ADR closed.

## Consequences

- `landing/` is a sibling, not a workspace: its own dependencies, its own checks, its own deploy. Root scripts do not reach into it; CI runs its job separately.
- Two hostnames need Cloudflare records, DNS-only, and attaching to the new project. The apex must also be verified as a Resend sending domain. All of these are dashboard steps that Mike performs; the wizard in `landing/scripts/` walks them.
- The page is bilingual (`en`, `zh-Hans`) like the app, for the same audience, and a Thai locale waits for the same trigger as the app's (a Thai-speaking company saying they would pay).
- When #178 opens signup, the landing page gains a second call to action and the Audience becomes the list that is told first. This ADR does not decide what the page says on that day.
