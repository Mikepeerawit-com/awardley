import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import "@/app/globals.css";

import en from "@/messages/en.json";
import zhHans from "@/messages/zh-Hans.json";
import { HomeContent } from "@/components/home";
import { drawn, expectNoSidewaysScroll, phone } from "@/test/layout";

/**
 * ADR-0009's failure bar, applied to the one page that is not the app: at {@link phone}
 * nothing scrolls sideways, and the form is reachable.
 *
 * **In both locales**, because the two are not the same page. Han has no spaces for a
 * line to break at the way Latin does, and the longest single unbreakable run in the
 * English copy is an email address in the closed-beta band — different failure modes,
 * and a suite that measured only `en` would be measuring the easier one.
 *
 * *Reachable* rather than *visible* is deliberate. #183's promise is that somebody who
 * cannot use the app has somewhere to go, and a form scrolled off the side of a phone is
 * nowhere: this asserts the field and its submit are drawn, are inside the viewport's
 * width, and are not the thing pushing the page sideways.
 */

afterEach(cleanup);

function draw(locale: "en" | "zh-Hans") {
  render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : zhHans}>
      {/*
        `lang` is on the ground rather than left off, because `globals.css` opens the
        leading and drops the tracking of the display tier for Han through a `:lang()`
        selector — a zh-Hans run without it would be measuring the Latin typography with
        Chinese words in it, which is not a page anybody sees.
      */}
      <div lang={locale} className="min-h-full flex flex-col font-sans">
        <HomeContent />
      </div>
    </NextIntlClientProvider>,
  );
}

describe.each(["en", "zh-Hans"] as const)(`the home page at %s, ${phone.width}px`, (locale) => {
  it("does not scroll sideways", () => {
    draw(locale);

    // The stylesheet first, or this whole suite is vacuous: an unstyled page is a
    // column of block elements that cannot overflow sideways, so it would pass the
    // assertion below while proving nothing. The measure the page is set at is the
    // cheapest thing to look for that only a generated Tailwind utility can be
    // responsible for — and it is about layout, which is what this suite is about.
    const measure = document.querySelector<HTMLElement>("main .mx-auto")!;

    expect(getComputedStyle(measure).maxWidth).not.toBe("none");

    expectNoSidewaysScroll();
  });

  it("puts the waiting-list field and its submit on the page", () => {
    draw(locale);

    // By role rather than by label text, so the assertion reads the same in both locales.
    const email = screen.getByRole("textbox");
    const submit = screen.getByRole("button", {
      name: locale === "en" ? en.beta.submit : zhHans.beta.submit,
    });

    expect(drawn(email)).toBe(true);
    expect(drawn(submit)).toBe(true);

    for (const control of [email, submit]) {
      const box = control.getBoundingClientRect();

      expect(box.width).toBeGreaterThan(0);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(phone.width);
    }
  });

  it("keeps the honeypot off the page and out of the reading order", () => {
    draw(locale);

    // One textbox only: the honeypot is `aria-hidden`, so a screen reader — and
    // `getByRole` — must not find it, while a form-filler walking the DOM still does.
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(document.querySelector('input[name="website"]')).not.toBeNull();
  });
});
