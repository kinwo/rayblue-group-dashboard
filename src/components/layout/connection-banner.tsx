"use client";

import { WifiOffIcon } from "lucide-react";

import { useOnlineStatus } from "@/components/hooks/use-online-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import styles from "@/components/layout/connection-banner.module.css";

/** Says when the browser is offline: the figures may be out of date and filters are paused (AC-STE-6). */
export function ConnectionBanner() {
  const online = useOnlineStatus();
  return (
    // The live region stays mounted so screen readers hear the banner appear.
    <div role="status">
      {online ? null : (
        <Alert role="none" className={styles.banner}>
          <WifiOffIcon aria-hidden="true" />
          <AlertTitle className={styles.title}>You&rsquo;re offline</AlertTitle>
          <AlertDescription className={styles.text}>
            The figures shown may be out of date. Filters will work again when you reconnect.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
