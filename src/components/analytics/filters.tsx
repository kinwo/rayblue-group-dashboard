"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";

import { useNonce } from "@/components/security/nonce";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgencyOption } from "@/services/rental-analytics.types";
import { cn } from "@/utils/cn";
import { GRANULARITIES, type Granularity } from "@/utils/granularity";
import { toQueryString, type AnalyticsFilters } from "@/utils/search-params";
import { ALL_STATES_LABEL, isStateCode, STATES, stateName, type StateCode } from "@/utils/states";

const ALL = "all";
export const ALL_AGENCIES_LABEL = "All agencies";

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
 */
export function Filters({ filters, agencyOptions, children }: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const navigate = (next: AnalyticsFilters) => router.push(`${pathname}${toQueryString(next)}`, { scroll: false });

  return (
    <Tabs
      value={filters.granularity}
      onValueChange={(value) => navigate({ ...filters, granularity: value as Granularity })}
      className="gap-6"
    >
      <section
        aria-label="Filters"
        className="flex flex-wrap items-end gap-4 rounded-lg bg-surface-sunken px-4 py-3"
      >
        <StateSelect
          value={filters.state}
          onChange={(state) => navigate(filtersForState(filters, state, agencyOptions))}
        />
        <AgencyCombobox
          value={filters.agencyId}
          options={agencyOptions}
          onChange={(agencyId) => navigate({ ...filters, agencyId })}
        />
        <div className="flex flex-col gap-1">
          <span id="listing-period-label" className="text-label text-ink">
            Listing period
          </span>
          <TabsList
            variant="line"
            aria-labelledby="listing-period-label"
            className="h-9 gap-4 rounded-none border-b border-line p-0"
          >
            {GRANULARITIES.map((g) => (
              <TabsTrigger
                key={g}
                value={g}
                className="h-full flex-none rounded-none px-0 text-label text-ink-muted hover:text-ink data-[state=active]:text-ink group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100 after:bottom-[-1px] after:bg-primary"
              >
                {GRANULARITY_LABELS[g]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </section>
      <TabsContent value={filters.granularity} className="flex flex-col gap-6">
        {children}
      </TabsContent>
    </Tabs>
  );
}

const fieldTriggerClass =
  "h-9 w-64 max-w-full justify-between rounded-md border border-line-strong bg-surface-raised px-3 text-body text-ink shadow-none hover:border-ink-muted hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-raised";

function StateSelect({ value, onChange }: { value: StateCode | null; onChange: (state: StateCode | null) => void }) {
  const id = useId();
  const nonce = useNonce();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label text-ink">
        State or territory
      </label>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(isStateCode(v) ? v : null)}>
        <SelectTrigger id={id} className={fieldTriggerClass}>
          {/* Explicit text so the server-rendered trigger shows the selection before hydration. */}
          <SelectValue>{value ? stateName(value) : ALL_STATES_LABEL}</SelectValue>
        </SelectTrigger>
        <SelectContent nonce={nonce} position="popper" className="rounded-md bg-surface-raised shadow-md">
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
  onChange,
}: {
  value: number | null;
  options: readonly AgencyOption[];
  onChange: (agencyId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const listId = useId();
  const sorted = [...options].sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
  const selected = sorted.find((a) => a.id === value);

  const choose = (agencyId: number | null) => {
    setOpen(false);
    if (agencyId !== value) onChange(agencyId);
  };

  return (
    <div className="flex flex-col gap-1">
      <span id={labelId} className="text-label text-ink">
        Agency
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-labelledby={labelId}
            aria-expanded={open}
            aria-controls={listId}
            className={cn(fieldTriggerClass, "font-normal")}
          >
            <span className="truncate">{selected ? selected.name : ALL_AGENCIES_LABEL}</span>
            <ChevronsUpDownIcon aria-hidden="true" className="text-ink-muted" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 rounded-md bg-surface-raised p-0 shadow-md">
          <Command label="Search agencies">
            <CommandInput placeholder="Search agencies" />
            <CommandList id={listId} label="Agencies">
              <CommandEmpty className="py-6 text-center text-body text-ink-muted">No agencies found.</CommandEmpty>
              <CommandItem value={ALL_AGENCIES_LABEL} onSelect={() => choose(null)} className="min-h-8">
                <CheckIcon aria-hidden="true" className={cn(value === null ? "opacity-100" : "opacity-0")} />
                {ALL_AGENCIES_LABEL}
              </CommandItem>
              {sorted.map((agency) => (
                <CommandItem
                  key={agency.id}
                  value={`${agency.name} ${agency.state} ${agency.id}`}
                  keywords={[agency.name]}
                  onSelect={() => choose(agency.id)}
                  className="min-h-8"
                >
                  <CheckIcon aria-hidden="true" className={cn(agency.id === value ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{agency.name}</span>
                  <span className="text-caption text-ink-muted">{agency.state}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
