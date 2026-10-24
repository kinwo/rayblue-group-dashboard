import type { Metadata } from "next";
import Link from "next/link";

import { StatusView } from "@/components/layout/status-view";

import styles from "@/app/not-found.module.css";

export const metadata: Metadata = { title: "Sign-in required" };

/** Rendered when a route calls `unauthorized()`; Next sends HTTP 401 before streaming starts (ADR 0006). */
export default function Unauthorized() {
  return (
    <StatusView
      title="Please sign in to continue"
      message="This page needs you to be signed in. Your session may have expired."
      action={
        <Link href="/rental-analytics" className={styles.link}>
          Go to Rental analytics
        </Link>
      }
    />
  );
}
