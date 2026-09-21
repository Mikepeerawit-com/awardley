"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { signIn } from "@/lib/auth/session";
import { signUp, type SignupError } from "@/lib/auth/signup";

/**
 * The request boundary for the signup screen, in the same shape as `signInAction`:
 * `cookies()` is resolved here and everything below it is reachable from a test without
 * a Next request context.
 */

/**
 * What comes back on a refusal, because React resets the form on every submit. Neither
 * password does, and neither does the Beta Code — echoing a secret through a server
 * response and back into the page is exactly what `signInAction` refuses to do with a
 * password, for the same reason.
 */
export type SignupState = {
  error?: SignupError;
  email?: string;
  name?: string;
  organisation?: string;
  reportingCurrency?: string;
};

export async function signUpAction(
  _previous: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const organisation = String(formData.get("organisation") ?? "").trim();
  const reportingCurrency = String(formData.get("reportingCurrency") ?? "").trim();
  const code = String(formData.get("code") ?? "");
  const typed = { email, name, organisation, reportingCurrency };

  if (
    !name ||
    !email ||
    !password ||
    !confirmation ||
    !organisation ||
    !reportingCurrency ||
    !code
  ) {
    return { error: "incomplete", ...typed };
  }

  // The app's own floor, which is higher than the platform's `minimum_password_length`
  // of 6. This is the account that can invite every other one into the organisation, so
  // it is the last place to accept the weaker of two numbers.
  if (password.length < 8) return { error: "too_short", ...typed };
  if (password !== confirmation) return { error: "mismatch", ...typed };

  // The currency is checked by `signUp` itself, at the write that stamps every Tender
  // the organisation will open, rather than here where only the form would be covered.
  const result = await signUp({
    email,
    name,
    password,
    organisation,
    reportingCurrency,
    code,
  });

  if (!result.ok) return { error: result.reason, ...typed };

  // They typed the password into this form a moment ago, so making them type it again on
  // the login screen tests nothing. `locale` is null by construction — first start-up
  // asks — so this lands on the language choice, exactly as an accepted Invite does.
  const session = await signIn({ email, password }, await cookies());

  // The organisation and the account exist either way. A sign-in that somehow fails sends
  // them to the login screen, which is a place they can act, rather than to
  // `/choose-language`, which is not public and would bounce them there anyway with
  // nothing said about why.
  if (!session.ok) redirect("/login");

  redirect("/choose-language");
}
