import type { ReactNode } from "react";

/** Content column under the page header (DESIGN.md §5): padding 20/24/32, max 1360px, 24px gaps. */
export function PageContent({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-6 pt-5 pb-8">{children}</div>;
}
