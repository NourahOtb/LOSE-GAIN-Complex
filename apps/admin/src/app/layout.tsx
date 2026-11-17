import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const barlowCond = Barlow_Condensed({ variable: "--font-barlow-cond", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "LOSE | GAIN Admin",
  description: "Staff dashboard for LOSE | GAIN Complex",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCond.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
