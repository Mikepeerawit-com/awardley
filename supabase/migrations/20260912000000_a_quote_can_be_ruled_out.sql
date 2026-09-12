-- The Owner rules a Quote out, and the sheet shortens because they did (ADR-0032).
--
-- Ruled Out is a state on the Quote, and it deliberately does not reuse the shape
-- `Selected` has. `tender_items.selected_quote_id` was chosen in the v1 schema over a
-- `quotes.is_selected` boolean to make "one Selected Quote per Item" structural rather
-- than a rule the app has to remember. Ruling out is many-per-Item by nature — the Owner
-- may discard four offers of five — so the pointer shape is unavailable to it, and it
-- takes the boolean shape that `Selected` rejected. The two terms face each other in the
-- vocabulary and are built differently on purpose.
--
-- There is no `is_ruled_out` beside these three. `ruled_out_at is not null` is the whole
-- state, so there is no second column able to disagree with it.
alter table quotes
  add column ruled_out_by_user_id uuid references users(id),
  add column ruled_out_at         timestamptz,
  add column ruled_out_note       text,
  -- Who and when arrive together or not at all, and a reason cannot outlive the judgement
  -- it was given for: a note on a Quote nobody ruled out is the same species of stale
  -- claim as `alternative_product_name` left behind on a row that no longer offers one.
  --
  -- What this constraint pointedly does *not* require is a note. The judgement is made
  -- several times per Item on a screen the Owner is already scrolling, and a required
  -- reason turns a tap into a form — the friction landing precisely on the behaviour that
  -- shortens the sheet. An Owner who writes "wrong voltage" saves themselves re-reading
  -- the same Quote next week, which is worth offering and not worth insisting on.
  add constraint ruled_out_together check (
    (ruled_out_by_user_id is null) = (ruled_out_at is null)
    and (ruled_out_at is not null or ruled_out_note is null)
  );

-- Recorded even though only one person can ever reach the control. ADR-0020 means an
-- Assignee cannot open the working sheet at all, so the Owner is the only user who can
-- rule anything out — but `CONTEXT.md`'s **Owner** entry says ownership is accountability,
-- not exclusive write access, and `created_by_user_id` on this table is the precedent:
-- this app writes down who did things.
comment on column quotes.ruled_out_by_user_id is
  'The Owner who judged this Quote unsuitable. Recorded even though ADR-0020 leaves only one person able to reach the control, because this app writes down who did things.';
comment on column quotes.ruled_out_at is
  'When the judgement was made, and the whole of the state: `ruled_out_at is not null` is what "ruled out" means. Written by the app from the instant injected at the request boundary (ADR-0010), not by a trigger — it stamps a human act, not a row change, which is what `updated_at` is for.';
comment on column quotes.ruled_out_note is
  'Optional, and never what stops the discard. A reason the Owner wrote for their own later reading; nobody else sees it (#168).';
