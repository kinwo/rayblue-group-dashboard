import type { CSSProperties, ReactNode } from "react";

import { AppSidebar, PRODUCT_NAME } from "@/components/layout/app-sidebar";
import { ConnectionBanner } from "@/components/layout/connection-banner";
import { MobileNavButton } from "@/components/layout/mobile-nav-button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import styles from "@/components/layout/app-shell.module.css";

const SHELL_STYLE = { "--sidebar-width": "var(--sidenav-width)" } as CSSProperties;

/** Side navigation on --chrome plus the main column (DESIGN.md §5). */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider style={SHELL_STYLE}>
      <AppSidebar />
      <SidebarInset className={styles.inset}>
        <header data-chrome className={styles.mobileBar}>
          <MobileNavButton />
          <span className={styles.productName}>{PRODUCT_NAME}</span>
        </header>
        <ConnectionBanner />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
