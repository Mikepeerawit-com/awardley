import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

/**
 * The same two faces the app loads, for the same reasons and with the same subset.
 *
 * `subsets: ["latin"]` is the whole of what is fetched. A Han face cannot be subset —
 * there is no 100-glyph slice of a script with tens of thousands of characters — so the
 * CJK stack is declared in `globals.css` and drawn by the device. On a marketing page
 * reached over a phone network in China, that is the difference between a page and a
 * download.
 *
 * Fewer weights than the app carries: this site has a headline, a heading and body, and
 * the 500 the app spends on its middle tiers has nothing to do here.
 */
const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site");

  return {
    title: t("name"),
    description: t("description"),
  };
}

/**
 * **There is no theme class here, and that is the difference from the app.**
 *
 * The app writes `dark`, `theme-system` or nothing onto `<html>` from the server's first
 * byte, because a reader can pin a theme in Preferences and the server is the only thing
 * that can answer before the first paint. Nothing on this site can be pinned: there is
 * no account to remember it on. So the site has only the app's *System* reading, which
 * `globals.css` answers with a `prefers-color-scheme` media query — settled before the
 * first paint rather than corrected after it, and with no script involved.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${firaSans.variable} ${firaCode.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
