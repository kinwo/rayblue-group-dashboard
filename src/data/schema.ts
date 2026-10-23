import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { STATE_CODES, type StateCode } from "@/utils/states";

// Timestamps are integer UTC epoch milliseconds (AGENTS.md rule 3).

export const LISTING_STATUSES = ["active", "leased", "withdrawn"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const PROPERTY_TYPES = ["apartment", "house", "townhouse", "unit", "studio"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

const stateEnum = STATE_CODES as [StateCode, ...StateCode[]];

export const agencies = sqliteTable("agencies", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
  state: text("state", { enum: stateEnum }).notNull(),
  suburb: text("suburb").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const listings = sqliteTable(
  "listings",
  {
    id: integer("id").primaryKey(),
    agencyId: integer("agency_id")
      .notNull()
      .references(() => agencies.id),
    subNumber: text("sub_number"),
    streetNumber: text("street_number").notNull(),
    street: text("street").notNull(),
    suburb: text("suburb").notNull(),
    postcode: text("postcode").notNull(),
    state: text("state", { enum: stateEnum }).notNull(),
    propertyType: text("property_type", { enum: PROPERTY_TYPES }).notNull(),
    beds: integer("beds").notNull(),
    baths: integer("baths").notNull(),
    rentPerWeek: integer("rent_per_week").notNull(),
    propertyManager: text("property_manager").notNull(),
    status: text("status", { enum: LISTING_STATUSES }).notNull(),
    listedDate: integer("listed_date").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("listings_agency_id_listed_date_idx").on(t.agencyId, t.listedDate),
    index("listings_listed_date_idx").on(t.listedDate),
  ],
);

/** Single row (id = 1) describing the dataset as a whole. */
export const datasetMeta = sqliteTable("dataset_meta", {
  id: integer("id").primaryKey(),
  asOf: integer("as_of").notNull(),
  seed: integer("seed").notNull(),
  generatedAt: integer("generated_at").notNull(),
});

export type AgencyRow = typeof agencies.$inferSelect;
export type NewAgency = typeof agencies.$inferInsert;
export type ListingRow = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type DatasetMetaRow = typeof datasetMeta.$inferSelect;
