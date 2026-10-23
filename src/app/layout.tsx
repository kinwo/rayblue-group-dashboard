import type { Metadata } from "next";
import { JetBrains_Mono, Public_Sans } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

// Self-hosted at build time by next/font: no runtime requests to other hosts (AC-PRV-5).
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-public-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: { default: "Rental analytics · Rayblue Agency Group", template: "%s · Rayblue Agency Group" },
  description: "New rental listings per day, week and month across Rayblue agencies. Sample data.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${publicSans.variable} ${jetBrainsMono.variable}`}>
      <body>
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
