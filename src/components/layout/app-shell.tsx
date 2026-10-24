import type { CSSProperties, ReactNode } from "react";

import { AppSidebar, PRODUCT_NAME } from "@/components/layout/app-sidebar";
import { MobileNavButton } from "@/components/layout/mobile-nav-button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const SHELL_STYLE = { "--sidebar-width": "var(--sidenav-width)" } as CSSProperties;

/** Side navigation on --chrome plus the main column (DESIGN.md §5). */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider style={SHELL_STYLE}>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-surface">
        <header data-chrome className="flex h-12 items-center gap-2 bg-chrome px-2 text-on-chrome md:hidden">
          <MobileNavButton />
          <span className="text-subheading">{PRODUCT_NAME}</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
