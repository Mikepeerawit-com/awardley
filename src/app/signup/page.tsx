import { getTranslations } from "next-intl/server";

import { AuthScreen } from "@/components/auth/auth-screen";
import { SignupForm } from "@/components/auth/signup-form";
import { signupIsOpen } from "@/lib/auth/signup";

/**
 * Where an organisation comes into existence, along with its first Org Admin.
 *
 * Reachable signed-out — it has to be, since there is nobody to be signed in as yet — so
 * it is in `publicPaths` alongside the login. A deployment with no `SIGNUP_CODE` renders
 * a notice here instead of a form, which is what `signupIsOpen` is asked. That question
 * is not a security boundary and is not treated as one: it decides what to draw, and the
 * refusal that matters is made at the write, in `signUp`. See ADR-0039 and
 * `@/lib/auth/signup`.
 *
 * The closed notice says the app is not taking new organisations rather than pretending
 * the route does not exist. Whoever reads it is either an invited client who has not been
 * given a code yet or somebody who already has an account — and a 404 would mislead the
 * first while telling the second nothing they could not infer from the login screen.
 */
export default async function SignupPage() {
  const t = await getTranslations("signup");

  if (!signupIsOpen()) {
    return (
      <AuthScreen
        title={t("closed.title")}
        description={t("closed.description")}
      >
        {/*
          A plain anchor, not `next/link`: `AuthScreen` is built for the WeCom in-app
          webview and states that it assumes no client-side routing. Whoever reads this
          has nowhere else to go, so the notice has to carry the way out rather than
          leaving them to guess at a URL in a webview with no address bar.
        */}
        <a
          href="/login"
          className="text-primary flex h-11 items-center justify-center text-sm font-medium underline underline-offset-4"
        >
          {t("closed.signIn")}
        </a>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title={t("title")} description={t("description")}>
      <SignupForm />
    </AuthScreen>
  );
}
