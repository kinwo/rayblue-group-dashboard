import type { Metadata } from "next";
import Link from "next/link";

import { StatusView } from "@/components/layout/status-view";

import styles from "@/app/not-found.module.css";

export const metadata: Metadata = { title: "Access denied" };

/** Rendered when a route calls `forbidden()`; Next sends HTTP 403 before streaming starts (ADR 0006). */
export default function Forbidden() {
  return (
    <StatusView
      title="You don't have access to this page"
      message="Your account isn't allowed to view it. If you think it should be, ask your group administrator."
      action={
        <Link href="/rental-analytics" className={styles.link}>
          Go to Rental analytics
        </Link>
      }
    />
  );
}
