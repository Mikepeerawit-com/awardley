import path from "node:path";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withBotId } from "botid/next/config";

/**
 * The marketing site. No database, no Supabase, no schema to bake in — the only things
 * this build needs wiring are `next-intl`'s request config and BotID's client script,
 * which `withBotId` injects so the deep challenge is served from this origin rather than
 * a third-party one an ad blocker will drop.
 *
 * **`turbopack.root` is not optional here, and it is not cosmetic.** Turbopack finds the
 * project root by walking up for a lockfile, and there are two in this repository: the
 * app's at the top and this package's one level down. It picks the *outer* one, and from
 * that root it discovers the app's `src/proxy.ts` — Next 16's renaming of what used to
 * be `middleware.ts` — and compiles it as though it belonged to this project. The build
 * then fails on `@/lib/supabase/session-client`, an alias resolved against `landing/`,
 * pointing at a Supabase client this site deliberately does not have.
 *
 * Pinning the root to this directory is what makes `landing/` a project rather than a
 * subdirectory of one. It is also why the Vercel project for the site must have its root
 * directory set to `landing`: the same two-lockfile confusion is waiting there.
 */
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(import.meta.dirname, "."),
  },
};

export default withBotId(createNextIntlPlugin()(nextConfig));
