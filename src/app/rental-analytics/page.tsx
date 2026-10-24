import type { Metadata } from "next";

import { CardRow } from "@/components/analytics/analytics-layout";
import { Filters } from "@/components/analytics/filters";
import { KpiTiles } from "@/components/analytics/kpi-tiles";
import { StateBars } from "@/components/analytics/state-bars";
import { TopAgenciesTable } from "@/components/analytics/top-agencies-table";
import { TrendChart } from "@/components/analytics/trend-chart";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { loadRentalAnalytics } from "@/services/rental-analytics";
import { parseAnalyticsSearchParams, type RawSearchParams } from "@/utils/search-params";

export const metadata: Metadata = { title: { absolute: "Rental analytics · Rayblue Agency Group" } };

/** The server clock, read once per request at the app edge (AGENTS.md rule 3). */
const requestTime = () => Date.now();

/**
 * Rental analytics (F2–F7). Rendered per request (the root layout awaits
 * connection()); the data streams in behind loading.tsx and failures
 * propagate to error.tsx.
 */
export default async function RentalAnalyticsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const filters = parseAnalyticsSearchParams(await searchParams);
  const view = await loadRentalAnalytics(filters, requestTime());

  return (
    <>
      <PageHeader title="Rental analytics" scopeLabel={view.scope.label} asOf={view.asOf} isStale={view.isStale} />
      <PageContent>
        {/* view.filters, not filters: an agency outside the state has been dropped (AC-FLT-9). */}
        <Filters filters={view.filters} agencyOptions={view.agencyOptions}>
          <KpiTiles kpis={view.kpis} scope={view.scope} asOf={view.asOf} />
          <TrendChart trend={view.trend} scope={view.scope} />
          <CardRow>
            <StateBars byState={view.byState} scope={view.scope} trend={view.trend} />
            <TopAgenciesTable topAgencies={view.topAgencies} scope={view.scope} trend={view.trend} />
          </CardRow>
        </Filters>
      </PageContent>
    </>
  );
}
