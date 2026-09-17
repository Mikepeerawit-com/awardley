import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

/**
 * One face, and only its Latin.
 *
 * `subsets: ["latin"]` is the whole of what is fetched. A Han face cannot be subset —
 * there is no 100-glyph slice of a script with tens of thousands of characters — so the
 * CJK stack is declared in `globals.css` and drawn by the device. On a marketing page
 * reached over a phone network in China, that is the difference between a page and a
 * download.
 *
 * Plus Jakarta Sans replaces Fira (#194). Fira is the app's face and the app is a dense
 * working screen; a shop window is set large, and Fira's display sizes read as a console
 * rather than as a brand. Five weights because this page actually spends them: 400 body,
 * 500 quiet links, 600 headings and labels, 700 section headings, 800 the display line.
 */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
 * `globals.css` answers with `color-scheme: light dark` and a `light-dark()` pair on
 * every token — settled before the first paint rather than corrected after it, and with
 * no script involved.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
