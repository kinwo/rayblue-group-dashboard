import type { Metadata } from "next";
import Link from "next/link";

import { StatusView } from "@/components/layout/status-view";

export const metadata: Metadata = { title: "Page not found" };

/** Unknown routes (AC-STE-4); Next.js sends HTTP 404. */
export default function NotFound() {
  return (
    <StatusView
      title="Page not found"
      message="There's no page at this address. It may have moved, or the link may be wrong."
      action={
        <Link href="/rental-analytics" className="text-label text-link underline underline-offset-4 hover:no-underline">
          Go to Rental analytics
        </Link>
      }
    />
  );
}
