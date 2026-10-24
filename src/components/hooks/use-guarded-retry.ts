"use client";

import { useSyncExternalStore, useTransition } from "react";

/** Wait before each next retry is allowed: the first is immediate, then 5 s, then 15 s. */
export const RETRY_COOLDOWNS_MS = [0, 5_000, 15_000] as const;
/** Attempts after which the view stops promising a quick fix. */
export const RETRY_ATTEMPT_LIMIT = 3;
/** How long failed attempts are remembered; a later outage starts afresh. */
export const RETRY_MEMORY_MS = 5 * 60_000;

type RetryRecord = { attempts: number; coolingDown: boolean };

const EMPTY: RetryRecord = { attempts: 0, coolingDown: false };

// Attempts live outside the component: a retry re-renders the route, which can remount the
// error view, and the cooldown must survive that. Browser-only; the server snapshot is EMPTY.
const records = new Map<string, RetryRecord>();
const timers = new Map<string, { cool?: ReturnType<typeof setTimeout>; forget?: ReturnType<typeof setTimeout> }>();
const listeners = new Set<() => void>();

function write(key: string, record: RetryRecord | null): void {
  if (record) records.set(key, record);
  else records.delete(key);
  for (const listener of listeners) listener();
}

function recordAttempt(key: string): void {
  const attempts = (records.get(key) ?? EMPTY).attempts + 1;
  const cooldown = RETRY_COOLDOWNS_MS[Math.min(attempts, RETRY_COOLDOWNS_MS.length - 1)];
  const timer = timers.get(key) ?? {};
  clearTimeout(timer.cool);
  clearTimeout(timer.forget);
  write(key, { attempts, coolingDown: cooldown > 0 });
  timer.cool = setTimeout(() => write(key, { attempts, coolingDown: false }), cooldown);
  timer.forget = setTimeout(() => write(key, null), RETRY_MEMORY_MS);
  timers.set(key, timer);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Forgets every attempt. For tests. */
export function resetRetryMemory(): void {
  for (const timer of timers.values()) {
    clearTimeout(timer.cool);
    clearTimeout(timer.forget);
  }
  timers.clear();
  records.clear();
}

export type GuardedRetry = {
  onRetry: () => void;
  /** True while a retry is in flight or cooling down. */
  disabled: boolean;
  isPending: boolean;
  /** Retries made so far. The view unmounts on success, so every counted attempt failed once it settles. */
  attempts: number;
  exhausted: boolean;
};

/**
 * Wraps a retry (`retry()` from an error boundary, or `router.refresh()`) so it cannot be
 * hammered: one attempt at a time, with a growing cooldown between attempts (AC-STE-5).
 */
export function useGuardedRetry(retry: () => void, key = "page"): GuardedRetry {
  const record = useSyncExternalStore(
    subscribe,
    () => records.get(key) ?? EMPTY,
    () => EMPTY,
  );
  const [isPending, startTransition] = useTransition();
  const disabled = isPending || record.coolingDown;

  const onRetry = () => {
    if (disabled) return;
    recordAttempt(key);
    startTransition(() => retry());
  };

  return { onRetry, disabled, isPending, attempts: record.attempts, exhausted: record.attempts >= RETRY_ATTEMPT_LIMIT };
}
