import type { ReactNode } from "react";

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
    <div className="mx-auto flex w-full max-w-[1360px] flex-col items-start gap-3 px-6 py-12">
      <Heading className="text-title text-ink">{title}</Heading>
      <p className="max-w-prose text-body text-ink-muted">{message}</p>
      <div className="pt-2">{action}</div>
    </div>
  );
}
