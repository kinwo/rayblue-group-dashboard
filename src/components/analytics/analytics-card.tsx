import { useId, type ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";

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
      className={cn("min-w-0 gap-0 rounded-lg border-line bg-surface-raised py-0 text-ink shadow-none", className)}
    >
      <CardHeader className="flex flex-wrap items-start justify-between gap-2 px-4 pt-4">
        <div className="flex flex-col gap-1">
          <CardTitle>
            <h2 id={headingId} className="text-heading text-ink">
              {title}
            </h2>
          </CardTitle>
          {description ? <CardDescription className="text-caption text-ink-muted">{description}</CardDescription> : null}
        </div>
        {aside}
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
