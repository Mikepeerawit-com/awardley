"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { switchActiveOrg } from "@/lib/org/active-org";

/**
 * Switch which organisation the reader is looking at.
 *
 * Shaped after `switchLocale` rather than after the admin actions, because it is the same
 * kind of control: a global mode with no form behind it and no sentence to render back.
 * The admin actions return a status because a refusal there is something a person did —
 * inviting an address that already has an account, Disabling the last Org Admin — and has
 * to be read. A refusal here is not: the menu offers the organisations the reader holds a
 * live Membership in, so the only way to reach this with anything else is to POST it by
 * hand, and the person who did that is not waiting for a translated sentence.
 *
 * So it throws, exactly as `switchLocale` throws on a locale the app does not ship. The
 * gate itself lives in `switchActiveOrg`, beside the write, where it holds for any caller
 * rather than for this one entry point.
 *
 * **The whole layout is revalidated, not one path.** Switching changes what every read in
 * the app answers — `current_org_id()` is in every policy — so there is no page whose
 * cached render survives it. This is the one action in the app for which that is true.
 */
export async function switchOrg(orgId: string): Promise<void> {
  const switched = await switchActiveOrg(orgId, await cookies());

  if (!switched) {
    throw new Error("Not a live Membership of that organisation");
  }

  revalidatePath("/", "layout");
}
