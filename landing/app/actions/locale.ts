"use server";

import { revalidatePath } from "next/cache";

import { defaultLocale, isLocale } from "@/i18n/config";
import { setLocale } from "@/i18n/locale";

/**
 * The footer toggle. It writes the same cookie the app reads, so a reader who switched
 * to 中文 here and then followed **Sign in** is not asked again.
 *
 * A Server Action and a real `<form>` rather than an `onClick`: the toggle has to work
 * on a page the reader may have reached with JavaScript still in flight, and switching
 * language is precisely the moment somebody decides whether this site is for them.
 */
export async function switchLocale(formData: FormData): Promise<void> {
  const requested = String(formData.get("locale") ?? "");
  const next = isLocale(requested) ? requested : defaultLocale;

  await setLocale(next);

  // The pages read the cookie through `getLocale`, so the rendered output is
  // locale-dependent and the cached copy has to go.
  revalidatePath("/", "layout");
}
