import { describe, expect, it } from "vitest";

import { cookieDomainFor } from "@/i18n/config";

/**
 * The locale cookie's reach, which is the whole of the promise `localeCookieName` makes:
 * pick 中文 on the marketing site, press **Sign in**, and still be in 中文 on the app.
 *
 * It is asserted rather than reasoned about because both ways of getting it wrong are
 * invisible in a browser. Too narrow and the app never sees the choice — the bug this
 * function exists to fix, and one that looks fine on every page of the site itself. Too
 * wide and the browser drops the cookie outright on `localhost` and on preview
 * deployments, where nothing may write a `domain` it is not under; the toggle then fails
 * everywhere except production, which is the one place it cannot be tried first.
 */
describe("the domain the locale cookie is written for", () => {
  it("reaches the app from the site, because they are siblings", () => {
    expect(cookieDomainFor("awardley.com")).toBe(".awardley.com");
    expect(cookieDomainFor("www.awardley.com")).toBe(".awardley.com");
    expect(cookieDomainFor("app.awardley.com")).toBe(".awardley.com");
  });

  it("carries a Host header's port, and an odd case, without being fooled", () => {
    expect(cookieDomainFor("Awardley.com:443")).toBe(".awardley.com");
    expect(cookieDomainFor("localhost:3000")).toBeUndefined();
  });

  it("stays host-only where there is no parent to share with", () => {
    expect(cookieDomainFor("localhost")).toBeUndefined();
    expect(cookieDomainFor("127.0.0.1")).toBeUndefined();
    expect(cookieDomainFor("awardley-landing-git-abc123.vercel.app")).toBeUndefined();
    expect(cookieDomainFor(null)).toBeUndefined();
  });

  it("is not fooled by a domain that merely ends in ours", () => {
    // `notawardley.com` ends with the same nine characters; the dot is what makes a
    // suffix a parent, and a check without it would hand our readers' language choice
    // to whoever registered it.
    expect(cookieDomainFor("notawardley.com")).toBeUndefined();
    expect(cookieDomainFor("awardley.com.example.net")).toBeUndefined();
  });
});
