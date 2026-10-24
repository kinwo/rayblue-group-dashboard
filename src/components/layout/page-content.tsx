import type { ReactNode } from "react";

import styles from "@/components/layout/page-content.module.css";

/** Content column under the page header (DESIGN.md §5): padding 20/24/32, max 1360px, 24px gaps. */
export function PageContent({ children }: { children: ReactNode }) {
  return <div className={styles.content}>{children}</div>;
}
