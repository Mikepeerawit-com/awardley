"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { signUpAction, type SignupState } from "@/app/actions/signup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { convertibleCurrencies } from "@/lib/fx/currencies";

const initialState: SignupState = {};

export function SignupForm() {
  const t = useTranslations("signup");
  const [state, formAction, isPending] = useActionState(
    signUpAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-field">
      {state.error ? (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-surface border px-3 py-2 text-sm"
        >
          {t(`error.${state.error}`)}
        </p>
      ) : null}

      <div className="flex flex-col gap-label">
        <Label htmlFor="name">{t("name")}</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          defaultValue={state.name}
          required
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-label">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          defaultValue={state.email}
          required
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-label">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11"
        />
        <p className="type-quiet">{t("requirement")}</p>
      </div>

      <div className="flex flex-col gap-label">
        <Label htmlFor="confirmation">{t("confirmation")}</Label>
        <Input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-label">
        <Label htmlFor="organisation">{t("organisation")}</Label>
        <Input
          id="organisation"
          name="organisation"
          autoComplete="organization"
          defaultValue={state.organisation}
          required
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-label">
        <Label htmlFor="reportingCurrency">{t("reportingCurrency")}</Label>
        {/*
          A required placeholder rather than a preselected currency, which is the whole
          reason this field is on the form: an organisation that inherits a Reporting
          Currency from whatever the column defaults to is the bug ADR-0036 was written
          to remove. The list is offered in the order `currencies.ts` exports it —
          alphabetical, no house favourite at the top — because there is no organisation
          yet to have one.
        */}
        <NativeSelect
          id="reportingCurrency"
          name="reportingCurrency"
          defaultValue={state.reportingCurrency ?? ""}
          required
          className="h-11"
        >
          <option value="">{t("reportingCurrencyPlaceholder")}</option>
          {convertibleCurrencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </NativeSelect>
        <p className="type-quiet">{t("reportingCurrencyHint")}</p>
      </div>

      <div className="flex flex-col gap-label">
        <Label htmlFor="code">{t("code")}</Label>
        {/*
          Text, not `password`: this is a code copied out of an email rather than
          something the reader remembers, and masking it hides the typo they need to see.
        */}
        <Input
          id="code"
          name="code"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className="h-11"
        />
        <p className="type-quiet">{t("codeHint")}</p>
      </div>

      <Button type="submit" disabled={isPending} className="h-11 w-full">
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
