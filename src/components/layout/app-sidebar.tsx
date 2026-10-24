"use client";

import { LayoutDashboardIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { parseAnalyticsSearchParams } from "@/utils/search-params";
import { ALL_STATES_LABEL, stateName } from "@/utils/states";

import styles from "@/components/layout/app-sidebar.module.css";

export const PRODUCT_NAME = "Rayblue Agency Group";
const CONTEXT_PREFIX = "Group office";
const RENTAL_ANALYTICS_PATH = "/rental-analytics";

/** "Group office · Victoria", from the URL's state filter (the only scope the shell can know). */
export function contextLine(state: string | null): string {
  const filters = parseAnalyticsSearchParams({ state: state ?? undefined });
  return `${CONTEXT_PREFIX} · ${filters.state ? stateName(filters.state) : ALL_STATES_LABEL}`;
}

function ScopeContextLine() {
  const searchParams = useSearchParams();
  return <>{contextLine(searchParams.get("state"))}</>;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const isCurrent = pathname === RENTAL_ANALYTICS_PATH || pathname.startsWith(`${RENTAL_ANALYTICS_PATH}/`);

  return (
    <Sidebar>
      <SidebarHeader className={styles.header}>
        <p className={styles.productName}>{PRODUCT_NAME}</p>
        <p className={styles.mutedText}>
          <Suspense fallback={contextLine(null)}>
            <ScopeContextLine />
          </Suspense>
        </p>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Main">
          <SidebarGroup className={styles.group}>
            <SidebarGroupLabel className={styles.groupLabel}>Analytics</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isCurrent}
                  className={styles.navLink}
                >
                  <Link
                    href={RENTAL_ANALYTICS_PATH}
                    aria-current={isCurrent ? "page" : undefined}
                    onClick={() => setOpenMobile(false)}
                  >
                    <LayoutDashboardIcon aria-hidden="true" />
                    <span>Rental analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </nav>
      </SidebarContent>
      <SidebarFooter className={styles.footer}>
        <p className={styles.mutedText}>Group manager view</p>
      </SidebarFooter>
    </Sidebar>
  );
}
