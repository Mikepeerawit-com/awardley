import { vi } from "vitest";

/**
 * `process`, for the one dependency in the tree that expects to be bundled by Next.
 *
 * `next/link` reads `process.env.__NEXT_ROUTER_BASEPATH` while its module is still
 * evaluating, and Next's own build replaces that expression at compile time. Vite serves
 * the module untouched to a real browser, where there is no `process` at all — so the
 * page's layout could not be measured without this, over a variable whose absence is the
 * whole answer anyway.
 */
globalThis.process ??= { env: {} } as typeof globalThis.process;

/**
 * The two Server Actions the page reaches for, stubbed once.
 *
 * Neither is behaviour this suite asserts — it measures a layout — but a form reaching
 * `useActionState` with an undefined action throws on render, and the action modules
 * themselves import `next/cache` and `botid/server`, neither of which survives being
 * imported into a browser. So the suite has to answer for both to draw anything at all.
 */
vi.mock("@/app/actions/locale", () => ({ switchLocale: async () => {} }));
vi.mock("@/app/actions/waiting-list", () => ({
  joinWaitingList: async () => ({ status: "idle" }),
}));
