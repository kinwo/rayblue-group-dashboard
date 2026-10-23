import { RentalAnalyticsSkeleton } from "@/components/analytics/rental-analytics-skeleton";

/** Suspense fallback for the page's request-time data (AC-STE-1). */
export default function Loading() {
  return <RentalAnalyticsSkeleton />;
}
