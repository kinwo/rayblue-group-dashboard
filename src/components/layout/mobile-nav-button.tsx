"use client";

import { MenuIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

/** Below ~808px the sidebar hides behind this button and opens as a sheet (AC-NAV-4). */
export function MobileNavButton() {
  const { setOpenMobile, openMobile } = useSidebar();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(openMobile);

  // The sheet is opened from outside its own trigger, so Radix cannot return focus on close; do it here.
  useEffect(() => {
    if (wasOpen.current && !openMobile) buttonRef.current?.focus();
    wasOpen.current = openMobile;
  }, [openMobile]);

  return (
    <Button
      ref={buttonRef}
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
