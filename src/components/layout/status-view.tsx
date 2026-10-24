import type { ReactNode } from "react";

import styles from "@/components/layout/status-view.module.css";

type StatusViewProps = {
  title: string;
  message: string;
  /** A button or link that gets the visitor moving again. */
  action: ReactNode;
  /** Heading level: h1 when the view replaces the page. */
  headingLevel?: 1 | 2;
};

/** Plain-language full-page message for error and not-found states. Never shows error details (AC-STE-3). */
export function StatusView({ title, message, action, headingLevel = 1 }: StatusViewProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className={styles.view}>
      <Heading className={styles.title}>{title}</Heading>
      <p className={styles.message}>{message}</p>
      <div className={styles.action}>{action}</div>
    </div>
  );
}
