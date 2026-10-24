"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";

import { useOnlineStatus } from "@/components/hooks/use-online-status";
import { useNonce } from "@/components/security/nonce";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgencyOption } from "@/services/rental-analytics.types";
import { cn } from "@/utils/cn";
import { GRANULARITIES, type Granularity } from "@/utils/granularity";
import { toQueryString, type AnalyticsFilters, type FilterKey } from "@/utils/search-params";
import { ALL_STATES_LABEL, isStateCode, STATES, stateName, type StateCode } from "@/utils/states";

import styles from "@/components/analytics/filters.module.css";

const ALL = "all";
export const ALL_AGENCIES_LABEL = "All agencies";

/** Field labels, shared with the filter-reset notice so both name a filter the same way. */
export const FILTER_LABELS: Record<FilterKey, string> = {
  state: "State or territory",
  agencyId: "Agency",
  granularity: "Listing period",
};

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/** Filters after choosing a state: the agency is kept only if it belongs to that state (AC-FLT-10). */
export function filtersForState(
  filters: AnalyticsFilters,
  state: StateCode | null,
  agencyOptions: readonly AgencyOption[],
): AnalyticsFilters {
  const agency = agencyOptions.find((a) => a.id === filters.agencyId);
  const keepAgency = agency !== undefined && (state === null || agency.state === state);
  return { ...filters, state, agencyId: keepAgency ? agency.id : null };
}

type FiltersProps = {
  filters: AnalyticsFilters;
  agencyOptions: readonly AgencyOption[];
  /** The period-dependent view, rendered as the selected tab's panel. */
  children?: ReactNode;
};

/**
 * Filter bar and Listing period tabs. The URL is the only state (AC-FLT-5):
 * every change pushes new search params and the server renders the new view.
 * While the new view loads the panel is marked busy; offline, changes are held
 * back and the connection banner says why (AC-STE-6).
 */
export function Filters({ filters, agencyOptions, children }: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const online = useOnlineStatus();
  const [isPending, startTransition] = useTransition();
  const navigate = (next: AnalyticsFilters) => {
    if (!online) return;
    startTransition(() => router.push(`${pathname}${toQueryString(next)}`, { scroll: false }));
  };

  return (
    <Tabs
      value={filters.granularity}
      onValueChange={(value) => navigate({ ...filters, granularity: value as Granularity })}
      className={styles.tabs}
    >
      <section aria-label="Filters" className={styles.bar}>
        <StateSelect
          value={filters.state}
          onChange={(state) => navigate(filtersForState(filters, state, agencyOptions))}
        />
        <AgencyCombobox
          value={filters.agencyId}
          options={agencyOptions}
          emptyHint={`No agencies in ${filters.state ? stateName(filters.state) : "the group"}`}
          onChange={(agencyId) => navigate({ ...filters, agencyId })}
        />
        <div className={styles.field}>
          <span id="listing-period-label" className={styles.label}>
            {FILTER_LABELS.granularity}
          </span>
          <TabsList
            variant="line"
            aria-labelledby="listing-period-label"
            className={styles.periodTabs}
          >
            {GRANULARITIES.map((g) => (
              <TabsTrigger key={g} value={g} className={styles.periodTab}>
                {GRANULARITY_LABELS[g]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </section>
      <TabsContent value={filters.granularity} aria-busy={isPending} className={styles.panel}>
        {children}
      </TabsContent>
    </Tabs>
  );
}

function StateSelect({ value, onChange }: { value: StateCode | null; onChange: (state: StateCode | null) => void }) {
  const id = useId();
  const nonce = useNonce();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {FILTER_LABELS.state}
      </label>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(isStateCode(v) ? v : null)}>
        <SelectTrigger id={id} className={styles.trigger}>
          {/* Explicit text so the server-rendered trigger shows the selection before hydration. */}
          <SelectValue>{value ? stateName(value) : ALL_STATES_LABEL}</SelectValue>
        </SelectTrigger>
        <SelectContent nonce={nonce} position="popper" className={styles.menu}>
          <SelectItem value={ALL}>{ALL_STATES_LABEL}</SelectItem>
          {STATES.map((s) => (
            <SelectItem key={s.code} value={s.code}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AgencyCombobox({
  value,
  options,
  emptyHint,
  onChange,
}: {
  value: number | null;
  options: readonly AgencyOption[];
  /** Shown, and the combobox disabled, when the state has no agencies. */
  emptyHint: string;
  onChange: (agencyId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const listId = useId();
  const hintId = useId();
  const isEmpty = options.length === 0;
  const sorted = [...options].sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
  const selected = sorted.find((a) => a.id === value);

  const choose = (agencyId: number | null) => {
    setOpen(false);
    if (agencyId !== value) onChange(agencyId);
  };

  return (
    <div className={styles.field}>
      <span id={labelId} className={styles.label}>
        {FILTER_LABELS.agencyId}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-labelledby={labelId}
            aria-expanded={open}
            aria-controls={listId}
            aria-describedby={isEmpty ? hintId : undefined}
            disabled={isEmpty}
            className={styles.trigger}
          >
            <span className={styles.triggerText}>{selected ? selected.name : ALL_AGENCIES_LABEL}</span>
            <ChevronsUpDownIcon aria-hidden="true" className={styles.triggerIcon} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className={cn(styles.menu, styles.agencyMenu)}>
          <Command label="Search agencies">
            <CommandInput placeholder="Search agencies" />
            <CommandList id={listId} label="Agencies">
              <CommandEmpty className={styles.empty}>No agencies found.</CommandEmpty>
              <CommandItem value={ALL_AGENCIES_LABEL} onSelect={() => choose(null)} className={styles.option}>
                <CheckMark checked={value === null} />
                {ALL_AGENCIES_LABEL}
              </CommandItem>
              {sorted.map((agency) => (
                <CommandItem
                  key={agency.id}
                  value={`${agency.name} ${agency.state} ${agency.id}`}
                  keywords={[agency.name]}
                  onSelect={() => choose(agency.id)}
                  className={styles.option}
                >
                  <CheckMark checked={agency.id === value} />
                  <span className={styles.optionName}>{agency.name}</span>
                  <span className={styles.optionState}>{agency.state}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {isEmpty ? (
        <span id={hintId} className={styles.hint}>
          {emptyHint}
        </span>
      ) : null}
    </div>
  );
}

/** Keeps its space when unchecked so option names line up. */
function CheckMark({ checked }: { checked: boolean }) {
  return <CheckIcon aria-hidden="true" className={styles.check} data-checked={checked ? "" : undefined} />;
}
