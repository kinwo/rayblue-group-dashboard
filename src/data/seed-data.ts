// Synthetic, fictitious dataset for the prototype (ADR 0002). Generation is pure and
// deterministic for a (seed, asOf) pair; writing is separate so both can be tested.
import type Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  agencies,
  datasetMeta,
  listings,
  type ListingStatus,
  type NewAgency,
  type NewListing,
  type PropertyType,
} from "@/data/schema";
import { addSydneyDays, startOfSydneyDay, sydneyWeekday } from "@/utils/date-buckets";

/** Sydney calendar days of listings, ending with the as-of day. */
export const SEED_DAYS = 30;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

type Suburb = { name: string; postcode: string };

const SUBURBS: Record<"NSW" | "VIC" | "QLD", Suburb[]> = {
  NSW: [
    { name: "Parramatta", postcode: "2150" },
    { name: "Bondi", postcode: "2026" },
    { name: "Chatswood", postcode: "2067" },
    { name: "Newtown", postcode: "2042" },
    { name: "Penrith", postcode: "2750" },
    { name: "Manly", postcode: "2095" },
    { name: "Liverpool", postcode: "2170" },
    { name: "Hornsby", postcode: "2077" },
    { name: "Cronulla", postcode: "2230" },
    { name: "Newcastle", postcode: "2300" },
    { name: "Wollongong", postcode: "2500" },
    { name: "Ryde", postcode: "2112" },
  ],
  VIC: [
    { name: "Carlton", postcode: "3053" },
    { name: "Richmond", postcode: "3121" },
    { name: "St Kilda", postcode: "3182" },
    { name: "Footscray", postcode: "3011" },
    { name: "Box Hill", postcode: "3128" },
    { name: "Brunswick", postcode: "3056" },
    { name: "Geelong", postcode: "3220" },
    { name: "Frankston", postcode: "3199" },
    { name: "Dandenong", postcode: "3175" },
    { name: "Ballarat", postcode: "3350" },
  ],
  QLD: [
    { name: "Fortitude Valley", postcode: "4006" },
    { name: "South Brisbane", postcode: "4101" },
    { name: "Toowong", postcode: "4066" },
    { name: "Southport", postcode: "4215" },
    { name: "Ipswich", postcode: "4305" },
    { name: "Cairns City", postcode: "4870" },
    { name: "Townsville City", postcode: "4810" },
    { name: "Maroochydore", postcode: "4558" },
  ],
};

const STREETS = [
  "Acacia Street", "Banksia Avenue", "Bottlebrush Lane", "Coral Parade", "Eucalypt Road",
  "Grevillea Close", "Harbourview Drive", "Jacaranda Way", "Kurrajong Street", "Lilly Pilly Court",
  "Magpie Crescent", "Waratah Road", "Wattle Street", "Rosella Terrace", "Kookaburra Place",
];

// Invented given and family names for the fictitious property managers (ADR 0002).
const GIVEN_NAMES = ["Arlo", "Brielle", "Caspian", "Delphine", "Ezra", "Fenna", "Galen", "Hollis", "Isla", "Juno", "Kael", "Liora"];
const FAMILY_NAMES = ["Ashcombe", "Brightwater", "Calloway", "Dunmore", "Elsworth", "Fairbank", "Glenholme", "Harrowgate", "Inverleigh", "Kestrell"];

const PROPERTY_WEIGHTS: [PropertyType, number][] = [
  ["apartment", 40],
  ["house", 25],
  ["unit", 15],
  ["townhouse", 12],
  ["studio", 8],
];

const BASE_RENT: Record<"NSW" | "VIC" | "QLD", number> = { NSW: 520, VIC: 430, QLD: 450 };

/** Relative listing volume by Sydney weekday (0 = Sunday): weekends are quieter. */
const WEEKDAY_FACTOR = [0.2, 1, 1.1, 1.15, 1.1, 1, 0.45];

export type Dataset = {
  agencies: NewAgency[];
  listings: NewListing[];
  meta: { id: number; asOf: number; seed: number; generatedAt: number };
};

/** Mulberry32: small, fast, deterministic 32-bit PRNG. */
function createRandom(seed: number) {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)];
  const weighted = <T>(items: readonly [T, number][]): T => {
    let r = next() * items.reduce((sum, [, w]) => sum + w, 0);
    for (const [item, w] of items) {
      r -= w;
      if (r < 0) return item;
    }
    return items[items.length - 1][0];
  };
  return { next, int, pick, weighted };
}

type Random = ReturnType<typeof createRandom>;

function generateAgencies(asOf: number): NewAgency[] {
  const createdAt = asOf - 365 * DAY;
  const states = Object.keys(SUBURBS) as (keyof typeof SUBURBS)[];
  return states
    .flatMap((state) => SUBURBS[state].map((suburb) => ({ state, suburb: suburb.name })))
    .map((a, i) => ({
      id: i + 1,
      name: `Rayblue ${a.suburb}`,
      state: a.state,
      suburb: a.suburb,
      createdAt,
      updatedAt: createdAt,
    }));
}

function beds(type: PropertyType, random: Random): number {
  switch (type) {
    case "studio":
      return 0;
    case "apartment":
    case "unit":
      return random.int(1, 3);
    case "townhouse":
      return random.int(2, 4);
    case "house":
      return random.int(2, 5);
  }
}

function status(listedDate: number, asOf: number, random: Random): ListingStatus {
  const ageDays = (asOf - listedDate) / DAY;
  const r = random.next();
  if (ageDays > 14) return r < 0.6 ? "leased" : r < 0.7 ? "withdrawn" : "active";
  if (ageDays > 5) return r < 0.25 ? "leased" : r < 0.3 ? "withdrawn" : "active";
  return "active";
}

function makeListing(
  agency: NewAgency,
  managers: string[],
  listedDate: number,
  asOf: number,
  random: Random,
): NewListing {
  const state = agency.state as keyof typeof SUBURBS;
  const suburb = SUBURBS[state].find((s) => s.name === agency.suburb)!;
  const propertyType = random.weighted(PROPERTY_WEIGHTS);
  const bedCount = beds(propertyType, random);
  const listingStatus = status(listedDate, asOf, random);
  const updatedAt =
    listingStatus === "active" ? listedDate : Math.min(asOf, listedDate + random.int(1, 10) * DAY);
  return {
    agencyId: agency.id!,
    subNumber: ["apartment", "unit", "studio"].includes(propertyType) ? String(random.int(1, 40)) : null,
    streetNumber: String(random.int(1, 250)),
    street: random.pick(STREETS),
    suburb: suburb.name,
    postcode: suburb.postcode,
    state: agency.state,
    propertyType,
    beds: bedCount,
    baths: Math.max(1, Math.min(3, bedCount - random.int(0, 1))),
    rentPerWeek: Math.round((BASE_RENT[state] + bedCount * 120 + random.int(-60, 90)) / 5) * 5,
    propertyManager: random.pick(managers),
    status: listingStatus,
    listedDate,
    createdAt: listedDate,
    updatedAt,
  };
}

/** Listing times for one agency on one Sydney day, during business hours and never after `asOf`. */
function listingTimes(dayStart: number, rate: number, asOf: number, random: Random): number[] {
  const nextDay = addSydneyDays(dayStart, 1);
  const count = Math.floor(rate * WEEKDAY_FACTOR[sydneyWeekday(dayStart)] + random.next());
  return Array.from({ length: count }, () => dayStart + Math.floor((8 + random.next() * 10) * HOUR))
    .filter((t) => t < nextDay && t <= asOf)
    .sort((a, b) => a - b);
}

/** The whole dataset for a seed and as-of time (UTC ms). Pure and deterministic (AC-DAT-2). */
export function generateDataset(seed: number, asOf: number): Dataset {
  const random = createRandom(seed);
  const agencyRows = generateAgencies(asOf);
  const lastDay = startOfSydneyDay(asOf);
  const days = Array.from({ length: SEED_DAYS }, (_, i) => addSydneyDays(lastDay, i - (SEED_DAYS - 1)));

  const drafts: NewListing[] = [];
  for (const agency of agencyRows) {
    const managers = Array.from({ length: random.int(2, 3) }, () => `${random.pick(GIVEN_NAMES)} ${random.pick(FAMILY_NAMES)}`);
    const rate = 1.5 + random.next() * 5;
    for (const day of days) {
      for (const t of listingTimes(day, rate, asOf, random)) drafts.push(makeListing(agency, managers, t, asOf, random));
    }
  }

  const sorted = drafts
    .map((listing, order) => ({ listing, order }))
    .sort((a, b) => a.listing.listedDate - b.listing.listedDate || a.order - b.order)
    .map(({ listing }, i) => ({ ...listing, id: i + 1 }));

  return { agencies: agencyRows, listings: sorted, meta: { id: 1, asOf, seed, generatedAt: asOf } };
}

const INSERT_BATCH = 500;

/** Replaces every row with `dataset` in one transaction. Needs a migrated, read-write connection. */
export function writeDataset(sqlite: Database.Database, dataset: Dataset): void {
  const db = drizzle(sqlite);
  sqlite.transaction(() => {
    db.delete(listings).run();
    db.delete(agencies).run();
    db.delete(datasetMeta).run();
    db.insert(agencies).values(dataset.agencies).run();
    for (let i = 0; i < dataset.listings.length; i += INSERT_BATCH) {
      db.insert(listings).values(dataset.listings.slice(i, i + INSERT_BATCH)).run();
    }
    db.insert(datasetMeta).values(dataset.meta).run();
  })();
}
