import { getEnv } from "@/clients/env";

/** The running release's version (`APP_VERSION`, default the package version). */
export function getAppVersion(): string {
  return getEnv().APP_VERSION;
}
