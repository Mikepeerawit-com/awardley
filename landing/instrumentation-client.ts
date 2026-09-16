import { initBotId } from "botid/client/core";

/**
 * BotID's client half, mounted the way `botid`'s README asks for Next 15.3 and above:
 * from `instrumentation-client.ts`, which runs before the app does, rather than from a
 * `<BotIdClient>` in the layout.
 *
 * **The path is `/` and the method is POST**, which is what a Server Action invoked from
 * the home page actually is on the wire. There is no `/api/subscribe` to name here — the
 * form posts back to the page it is on — so this entry looks wider than it is: nothing
 * else on this site posts anywhere.
 */
initBotId({
  protect: [{ path: "/", method: "POST" }],
});
