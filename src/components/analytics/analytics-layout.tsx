import type { ReactNode } from "react";

import layout from "@/components/analytics/analytics-layout.module.css";

/** Row of analytics cards that wraps below the cards' minimum widths. */
export function CardRow({ children }: { children: ReactNode }) {
  return <div className={layout.cardRow}>{children}</div>;
}
