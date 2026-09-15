# Email is the channel every customer has, and the Group Robot is an extra

_Written by the sellability design session of 15 September 2026._

**Status:** accepted. **Narrows [ADR-0012](0012-what-the-group-robot-may-say.md) and [ADR-0013](0013-group-robot-webhook-is-org-data.md)** from "the one outbound integration" to "one transport of two". Every rule 0012 sets about *what a message may say* stands, and is extended to the new transport rather than relaxed for it. What changes below is 0012's decision on **language**, and it changes for 0012's own stated reason.

The Group Robot is the only way this app speaks to anybody, and it is a WeCom group webhook. Taihue lives in WeCom. Almost no other company the product is being sold to does — a Thai trading SME uses LINE, and everyone outside that trade uses neither. For those customers every Reminder, the Digest and all Outcome News reach nobody, which deletes the product: the reminders are the reason anyone opens the app at all.

Email is the only channel every customer already has, in every market, with nothing to configure and nobody's console to get gated out of.

## The decision

- **Email is the floor.** Reminders, the Digest and Outcome News go by email to the people the Milestone names, for every organisation, with no setup.
- **The Group Robot becomes an extra**, not the channel. An org that sets a webhook gets the group post *as well*; an org that sets none loses nothing it was promised.
- **LINE, when a paying customer asks for it, joins as a second extra** on the same seam. It does not become a second floor.
- **One message builder set, two transports.** The builders keep producing the text; the transport decides how it leaves.

## Financial silence carries over unchanged

ADR-0012 forbids a price, a Margin, a Landed Cost and a supplier's name, because the WeCom group is "a broadcast surface whose membership nobody in this app controls". A private email to one named recipient is plainly not that surface, so the rule could have been relaxed for it. It is not, for three reasons.

**A forwarded email is an uncontrolled surface too.** It is one tap, it leaves no trace in this app, and a supplier's name reaching a client is the commercial problem 0012 is actually about.

**[ADR-0020](0020-an-assignee-sees-their-own-quotes-and-no-money.md) already forbids it for most recipients.** An Assignee sees no money anywhere in this product. The quote-deadline Reminder goes to Assignees, so the majority of email this app will ever send could not carry a figure regardless of the surface.

**The guard cannot survive a carve-out.** `src/lib/wecom/messages.test.ts` calls every exported builder by introspection against a salted fixture and asserts no price, margin, cost, supplier or currency symbol reaches the content — which is what makes a builder written for a future ticket covered on the day it is written, with nobody remembering to come back. A per-channel exemption means that guard must first learn which transport each builder serves, and a guard with a condition in it is one that stops holding the first time somebody gets the condition wrong. The guard moves out of `wecom/` and covers both transports.

**The mention is still a pointer, not a report.** A message that needs a figure is still a message that should be a link. Revisit only for an Owner-only message, with a reason, and never by loosening the introspection test.

## Email goes through `next-intl`, and the robot still does not

ADR-0012 hardcodes the robot's text in Simplified Chinese and keeps it outside the i18n system. The reason it gives is precise and correct: a group post "has no reader whose locale could select between two versions" — it is rendered once for everyone in the group, so the only thing available to pick a language by is whoever the message happens to be *about*, which would make the Digest's language swing with whose Tender sorted first.

**An email has exactly one reader, and this app already knows their locale**: it is on their user row, the same posture the Theme has under [ADR-0024](0024-the-theme-is-the-readers-not-the-devices.md). The condition 0012 named as the reason to stay outside the catalogue is not met by email, so email does not stay outside it. Email subjects and bodies are `next-intl` messages in both locales, complete, under the same parity test as every screen.

This is not a reversal of 0012. It is 0012's rule applied to a surface it did not have: the text goes wherever there is a reader to select it, and the group post still has none.

## Delivery state, now that there are two transports

`reminders.sent` is one boolean, and ADR-0005 says never to flip it on a failure. With two transports one flag cannot say what happened: flipping it when email succeeded and the robot failed loses the group post, and not flipping it re-sends the email tomorrow to somebody who already read it.

- **A `reminder_deliveries` row records one reminder's success on one channel**, unique on `(reminder_id, channel)`. It is what stops a transport that already succeeded from firing twice.
- **`reminders.sent` keeps its meaning of "nothing further is owed on this row"** and is set only once every channel the org actually has has succeeded. The `reminders_due` partial index on `where not sent` is untouched, and so is the catch-up behaviour that ADR-0015 and the `due_date <=` query depend on.
- **An org with no Group Robot is complete on email alone**, which is the same posture ADR-0013 already takes: an org with no robot is unconfigured, never a send failure.

## Consequences

- **A self-serve signup notifies somebody on day one.** ADR-0013 accepted that "a fresh deployment notifies nobody until an Org Admin sets it up" as the trade for deleting the env var. That trade was fine for one customer being set up by hand and is not fine for a stranger who signed up at midnight and will judge the product by whether it chases them.
- **The Digest becomes one email per reader rather than one post.** It stays stateless — nothing records that one went out, and a Digest missed is answered by tomorrow's, never caught up — and it stays silent on a morning with nothing open. It gains the ability to be scoped to its reader, which the group post could never be.
- **Pacing is per transport.** ADR-0005's ~3 seconds is WeCom's rate limit and says nothing about an email provider's. The injected boundary that ADR-0012 built for exactly this reason is what each transport brings its own `wait` to.
- **Email may have a real delivery indicator, where the robot may not.** ADR-0012 bans any "delivered" or "sent to" state anywhere in the UI or schema, because `errcode 0` accepts a nonexistent userid silently and so cannot support one. A bounce is different in kind: it is the provider stating that a named address rejected the message, which is a fact, and a wrong address is the single most likely reason a paying customer says the reminders do not work. A bounce may therefore be surfaced. Nothing else may — an accepted email is still not a read one.
- **The builders move out of `src/lib/wecom/`.** They are no longer WeCom's, and neither is the test that guards them.
- **`ADR-0012`'s opening line — "the one outbound integration in v1" — is now false**, as is the same claim in `CONTEXT.md`'s **Group Robot** entry. Both are corrected rather than left to be discovered.
