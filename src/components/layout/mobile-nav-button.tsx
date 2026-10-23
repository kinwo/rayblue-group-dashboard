"use client";

import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

/** Below ~808px the sidebar hides behind this button and opens as a sheet (AC-NAV-4). */
export function MobileNavButton() {
  const { setOpenMobile, openMobile } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Open navigation menu"
      aria-expanded={openMobile}
      onClick={() => setOpenMobile(true)}
      className="text-on-chrome hover:bg-chrome-raised hover:text-on-chrome"
    >
      <MenuIcon aria-hidden="true" />
    </Button>
  );
}
