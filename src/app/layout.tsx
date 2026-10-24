import type { Metadata } from "next";
import { JetBrains_Mono, Public_Sans } from "next/font/google";
import { headers } from "next/headers";
import { connection } from "next/server";

import { AppShell } from "@/components/layout/app-shell";
import { NonceProvider } from "@/components/security/nonce";
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

/**
 * Every route renders at request time so Next.js can put the proxy's CSP nonce
 * on every script and style; a static or partially prerendered page has none.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  // Set by src/proxy.ts; client code that injects <style> elements needs it too.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en-AU" className={`${publicSans.variable} ${jetBrainsMono.variable}`}>
      <body>
        <NonceProvider nonce={nonce}>
          <TooltipProvider>
            <AppShell>{children}</AppShell>
          </TooltipProvider>
        </NonceProvider>
      </body>
    </html>
  );
}
