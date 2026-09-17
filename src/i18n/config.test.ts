import { describe, expect, it } from "vitest";

import { cookieDomainFor } from "./config";

/**
 * How far the locale cookie reaches, which is what decides whether a language chosen in
 * one of our two hosts is still chosen in the other.
 *
 * It is asserted rather than reasoned about because both ways of getting it wrong are
 * invisible in a browser. Too narrow and the marketing site never sees a choice made in
 * the app — every page of the app itself looks right. Too wide and the browser drops the
 * cookie outright on `localhost` and on preview deployments, where nothing may write a
 * `domain` it is not under; the switcher then works only in production, which is the one
 * place it cannot be tried first.
 *
 * `landing/i18n/config.test.ts` asserts the same table against the site's copy of this
 * function. ADR-0035 keeps the two packages apart, so this pair of suites is the only
 * thing holding the two copies to the same answer.
 */
describe("the domain the locale cookie is written for", () => {
  it("reaches the site from the app, because they are siblings", () => {
    expect(cookieDomainFor("app.awardley.com")).toBe(".awardley.com");
    expect(cookieDomainFor("awardley.com")).toBe(".awardley.com");
    expect(cookieDomainFor("www.awardley.com")).toBe(".awardley.com");
  });

  it("carries a Host header's port, and an odd case, without being fooled", () => {
    expect(cookieDomainFor("App.Awardley.com:443")).toBe(".awardley.com");
    expect(cookieDomainFor("localhost:3000")).toBeUndefined();
  });

  it("stays host-only where there is no parent to share with", () => {
    expect(cookieDomainFor("localhost")).toBeUndefined();
    expect(cookieDomainFor("127.0.0.1")).toBeUndefined();
    expect(cookieDomainFor("awardley-git-abc123.vercel.app")).toBeUndefined();
    expect(cookieDomainFor(null)).toBeUndefined();
  });

  it("is not fooled by a domain that merely ends in ours", () => {
    // `notawardley.com` ends with the same nine characters; the dot is what makes a
    // suffix a parent, and a check without it would hand a member's language choice —
    // and the shape of any cookie we later write beside it — to whoever registered it.
    expect(cookieDomainFor("notawardley.com")).toBeUndefined();
    expect(cookieDomainFor("awardley.com.example.net")).toBeUndefined();
  });
});
