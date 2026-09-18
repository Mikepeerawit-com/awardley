import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
 * Inter, variable, with its optical-size axis. No `weight` array: a variable font is one
 * file that answers every weight this page asks for, so listing five of them would fetch
 * five static cuts instead. `axes: ["opsz"]` is what keeps `font-optical-sizing: auto`
 * in `globals.css` from being a no-op — without the axis in the fetched file the 64px
 * display line and the 14px table cell are the same drawing at two sizes.
 *
 * It replaces Plus Jakarta Sans, which replaced Fira. Fira is the app's face and reads
 * as a console at display sizes; Jakarta has a humanist wobble that shows up at 64px.
 * The bar for this page is Linear and Stripe, and Inter is what that bar is set in.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
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
 * byte, because a reader can pin a theme in Preferences (ADR-0024). This site is light
 * only, so there is nothing to write: `color-scheme: light` in `globals.css` settles the
 * canvas and the native controls before the first paint, with no class and no script.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
