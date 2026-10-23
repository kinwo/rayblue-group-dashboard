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
    <Sidebar className="border-r-0">
      <SidebarHeader className="gap-1 px-4 pt-5 pb-4">
        <p className="text-subheading text-on-chrome">{PRODUCT_NAME}</p>
        <p className="text-caption text-on-chrome-muted">
          <Suspense fallback={contextLine(null)}>
            <ScopeContextLine />
          </Suspense>
        </p>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Main">
          <SidebarGroup className="px-3">
            <SidebarGroupLabel className="text-overline text-on-chrome-muted">Analytics</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isCurrent}
                  className="h-9 rounded-md text-label text-on-chrome data-[active=true]:font-semibold [&>svg]:text-on-chrome-muted data-[active=true]:[&>svg]:text-sky"
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
      <SidebarFooter className="border-t border-chrome-line px-4 py-3">
        <p className="text-caption text-on-chrome-muted">Group manager view</p>
      </SidebarFooter>
    </Sidebar>
  );
}
