import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { requiredEnv } from "@/lib/env";

/**
 * Rules this project depends on that no runtime test can catch, because breaking them
 * produces code that works perfectly in every environment a developer will try.
 *
 * They are checked by reading the source, which is blunt, and which is the point: each
 * one fails weeks later, on someone else's phone, in a way nobody will connect back to
 * the change that caused it.
 */

const sourceRoot = join(process.cwd(), "src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return sourceFiles(path);
    if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) return [path];

    return [];
  });
}

/**
 * Comments are stripped before matching. Each of these rules is worth a paragraph
 * explaining itself at the place it applies, and a guard that fires on its own
 * documentation trains people to delete the documentation.
 */
function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

function offendingFiles(pattern: RegExp, root = sourceRoot): string[] {
  return sourceFiles(root).filter((path) => pattern.test(code(path)));
}

const userFacingText = [
  join(sourceRoot, "messages", "en.json"),
  join(sourceRoot, "messages", "zh-Hans.json"),
  join(process.cwd(), "supabase", "templates", "invite.html"),
];

describe("session storage", () => {
  it("never puts anything in localStorage", () => {
    // WebKit's Tracking Prevention clears script-writable storage after 7 idle days.
    // A session there turns the promised 30 days into 7 for an app whose usage is
    // sparse by design — and it fails on a phone, weeks later, for one person at a
    // time.
    expect(offendingFiles(/\blocalStorage\b/)).toEqual([]);
  });

  it("builds no browser-side Supabase client", () => {
    // `createBrowserClient` persists the session from script, which lands in the same
    // capped storage. Every client in this codebase is server-side and cookie-backed.
    expect(offendingFiles(/createBrowserClient/)).toEqual([]);
  });
});

describe("the email surface", () => {
  it("has no password-reset flow", () => {
    // Under ten users the Org Admin resets from the Supabase dashboard. Keeping the app
    // at exactly one template is what makes an SMTP misconfiguration obvious instead of
    // a class of bug.
    expect(offendingFiles(/resetPasswordForEmail/)).toEqual([]);
  });
});

describe("the WeCom webview", () => {
  it.each(userFacingText)("never tells the reader to use a browser (%s)", (path) => {
    // Every reminder link lands in the WeCom in-app webview and there is no way out of
    // it into Safari, so the advice is unfollowable as well as wrong.
    const text = readFileSync(path, "utf8");

    expect(text.toLowerCase()).not.toContain("open in your browser");
    expect(text).not.toContain("浏览器");
  });
});

describe("the way in", () => {
  it("refuses self-signup at the platform, not just in the UI", async () => {
    // Accounts exist only by invitation. An unlinked signup form is not the gate — the
    // endpoint is public whether or not anything renders a link to it.
    const response = await fetch(
      `${requiredEnv("NEXT_PUBLIC_SUPABASE_URL")}/auth/v1/signup`,
      {
        method: "POST",
        headers: {
          apikey: requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: `self-signup-${crypto.randomUUID()}@example.test`,
          password: "correct-horse-battery-staple",
        }),
      },
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error_code: "signup_disabled",
    });
  });

  it("writes nothing into `memberships`", () => {
    // The Membership table is read by the app and written by nobody in it, for exactly one
    // release. `users.org_id`, `users.is_org_admin` and `users.disabled_at` are still the
    // columns every write lands on — inviting somebody, seeding the first org, Disabling a
    // colleague — and a trigger mirrors each of those into a Membership. A second writer
    // here would not be an extra safeguard, it would be a race with that trigger over the
    // same `(user_id, org_id)` row, and the loser is whichever one the statement order
    // happened to put second.
    //
    // This is the half of ADR-0017's rule the old check could not have caught. That one
    // reads the *column* name, which is why it survived `is_org_admin` gaining a second
    // home: the name did not change. It says nothing about `insert into memberships (...)
    // values (...)`, which mints an Org Admin without ever writing the two words
    // `is_org_admin:` anywhere, and which is the shape the contract migration will make
    // the only shape there is.
    //
    // `[^;]*` spans the query chain and cannot cross a statement, because a Supabase chain
    // is one expression ending in a semicolon.
    expect(offendingFiles(/from\("memberships"\)[^;]*\.(insert|upsert|update|delete)\(/))
      .toEqual([]);
  });

  it("mints an Org Admin in exactly one place", () => {
    // ADR-0017's whole claim, and the one part of it no runtime test can reach: a test
    // proves what the code it calls does, not that a *second* writer has appeared
    // somewhere else. `/setup` earns the right to set this column by being unreachable
    // twice — a secret, and a `users` table that is empty exactly once per database.
    // Neither guard travels with the column. Anything else that learns to write it is
    // promotion with no gate at all, and it would work perfectly in every environment a
    // developer will try.
    //
    // Promoting a second admin stays an `update` from the Supabase dashboard (README §6),
    // which is why this is a rule about the codebase rather than about the database.
    //
    // **The column has moved and the rule has not, which is the point of writing it about
    // a name.** `is_org_admin` is read off `memberships` everywhere now — the session, the
    // People screen, the last-admin count — and not one of those reads trips this, because
    // reading a column is `select("is_org_admin")` and setting one is `is_org_admin:`. The
    // two are told apart by the colon, and the colon is what a write has. `setup.ts` still
    // writes the `users` column and a trigger still carries it across; when the contract
    // migration takes that column away, the one file named here is the one file that has
    // to change, and this assertion is what will say so.
    expect(offendingFiles(/is_org_admin\s*:/)).toEqual([
      join(sourceRoot, "lib", "auth", "setup.ts"),
    ]);
  });
});

describe("the group robot", () => {
  it("never mentions anyone by mobile number", () => {
    // Both mention routes bind, and they fail at different scales. A typo'd userid
    // drops one person; a mis-formatted mobile binds for *nobody*, and the format a
    // Thai person naturally types is one of the ones that binds for nobody. So the
    // whole org goes unreachable at once, with `errcode 0` on every send. ADR-0012.
    expect(offendingFiles(/mentioned_mobile_list/)).toEqual([]);
  });

  it("keeps the robot's text out of the i18n system", () => {
    // The messages are broadcast into one group and rendered once for everyone, so
    // there is no reader whose locale could choose between two versions. Half-inside
    // next-intl is worse than outside it: it looks like a setting and obeys nobody.
    expect(offendingFiles(/next-intl/, join(sourceRoot, "lib", "wecom"))).toEqual([]);
  });

  it("takes its webhook from the org, never from the environment", () => {
    // ADR-0013: one source of truth. An env var creeping back would mean two places to
    // look when a notification lands in the wrong group — and the fallback would win
    // silently on exactly the deployment whose org row was never filled in.
    expect(offendingFiles(/WECOM_ROBOT_WEBHOOK/)).toEqual([]);
  });

  it.each(userFacingText.filter((path) => path.endsWith(".json")))(
    "never says a test mention arrived (%s)",
    (path) => {
      // `errcode 0` means accepted, never notified — a nonexistent userid and an empty
      // string are both accepted silently. Success wording that promises delivery is
      // the whole silent failure, dressed as reassurance, so the one string reporting a
      // successful send must ask the human to confirm instead. ADR-0012.
      //
      // Only the *success* message is checked: "nobody was notified" on a failure is an
      // honest thing to say, and a guard forbidding the word outright would push that
      // wording somewhere vaguer.
      const sent = JSON.parse(readFileSync(path, "utf8")).people.wecom.test.status.sent;

      expect(sent).not.toMatch(/\b(delivered|notified|received it|reached them)\b/i);
      expect(sent).not.toMatch(/已通知|已送达|已收到|已提醒/);
      // It has to point at the only verification that exists.
      expect(sent).toMatch(/confirm|确认/);
    },
  );
});
