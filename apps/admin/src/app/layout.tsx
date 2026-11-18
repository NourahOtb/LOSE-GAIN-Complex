import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const barlowCond = Barlow_Condensed({ variable: "--font-barlow-cond", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "LOSE | GAIN Admin",
  description: "Staff dashboard for LOSE | GAIN Complex",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // light unless this person switched to dark (saved in a cookie, so there's no flash)
  const theme = (await cookies()).get("lg-theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="en" data-theme={theme} className={`${barlow.variable} ${barlowCond.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
