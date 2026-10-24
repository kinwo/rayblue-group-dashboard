import { useId, type ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";

import styles from "@/components/analytics/analytics-card.module.css";

type AnalyticsCardProps = {
  title: string;
  description?: ReactNode;
  /** Right of the title, e.g. a legend. */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Cirrus card (DESIGN.md §6 › Card) as a labelled section. */
export function AnalyticsCard({ title, description, aside, className, children }: AnalyticsCardProps) {
  const headingId = useId();
  return (
    <Card
      role="region"
      aria-labelledby={headingId}
      className={cn(styles.card, className)}
    >
      <CardHeader className={styles.header}>
        <div className={styles.heading}>
          <CardTitle>
            <h2 id={headingId} className={styles.title}>
              {title}
            </h2>
          </CardTitle>
          {description ? <CardDescription className={styles.description}>{description}</CardDescription> : null}
        </div>
        {aside}
      </CardHeader>
      <CardContent className={styles.content}>{children}</CardContent>
    </Card>
  );
}
