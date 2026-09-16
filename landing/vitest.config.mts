import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { phone } from "./test/phone.mts";

/**
 * Two projects, told apart by the file extension — the same split the app makes, cut
 * down to what a four-part marketing page can actually get wrong.
 *
 * **`.test.ts` — node.** The token: signed, verified, expired, tampered with. It is pure
 * Web Crypto over two strings, so it needs no browser and no server.
 *
 * **`.layout.test.tsx` — a real browser.** ADR-0009's failure bar, that nothing scrolls
 * sideways at 390×844. jsdom has no layout engine and reports every `scrollWidth` as
 * `0`, so an assertion about overflow passes there on a page overflowing by a mile.
 * Headless Chromium instead, which is why this project alone needs
 * `npx playwright install chromium`.
 *
 * The harness in `test/` is a deliberate minimal copy of the app's `src/test/layout.ts`
 * rather than an import across the two projects: `landing/` is its own package with its
 * own `node_modules`, deployed as its own Vercel project, and a relative import reaching
 * up out of it would be a build-time dependency on a directory the deployment does not
 * contain.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "unit",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: ["node_modules/**", ".next/**"],
        },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "layout",
          include: ["**/*.layout.test.tsx"],
          exclude: ["node_modules/**", ".next/**"],
          setupFiles: ["./vitest.setup.layout.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            // The width ADR-0009's failure bar is stated at, held in one place so a
            // suite naming it in its title cannot drift from what is measured.
            instances: [{ browser: "chromium", viewport: phone }],
          },
        },
      },
    ],
  },
});
