import { Schema, model, type Model, type Types } from 'mongoose';

/**
 * One record of the Bengaluru Tree Census (July 2026), stored in collection `tree_census`.
 *
 * Fields are exactly the ones found by inspecting the source GeoJSON, keeping their ORIGINAL
 * names so every stored value can be traced back to the source file.
 * The source has NO height, diameter, condition, age, health, canopy or carbon fields,
 * so none are modelled here.
 *
 * This collection is reference data: written only by scripts/import-tree-census.mjs,
 * never by API code.
 */
export interface TreeCensusRecord {
  /** Source identifier. Unique in the inspected data, but NOT used as MongoDB _id. */
  OBJECTID: number;
  /** Repeated in the source (2,502 repeated values): not unique. */
  KGISTreeID: string | null;
  /** Heavily repeated in the source: not unique. */
  KGISCode: string | null;
  /** Village grouping code, repeated by design: not unique. */
  KGISVillageID: number | null;
  DepartmentCode: string | null;
  /** Numeric-looking text in the source (e.g. "12"); kept as text. */
  WardNumber: string | null;
  /** Species / category name; "Others" is a category in the source. */
  TreeName: string | null;
  /** 1 or 0 or null in the source. Its meaning is not documented, so none is assumed. */
  Status: number | null;
  location: { type: 'Point'; coordinates: [number, number] }; // [longitude, latitude]
  importedAt: Date;
  sourceFile: string;
}

export type TreeCensusLean = TreeCensusRecord & { _id: Types.ObjectId };

const treeCensusSchema = new Schema(
  {
    OBJECTID: { type: Number, required: true },
    KGISTreeID: { type: String, default: null },
    KGISCode: { type: String, default: null },
    KGISVillageID: { type: Number, default: null },
    DepartmentCode: { type: String, default: null },
    WardNumber: { type: String, default: null },
    TreeName: { type: String, default: null },
    Status: { type: Number, default: null },
    location: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true },
    },
    importedAt: { type: Date, required: true },
    sourceFile: { type: String, required: true },
  },
  {
    collection: 'tree_census',
    versionKey: false,
    // Indexes are created by the import script AFTER the bulk load (much faster than
    // maintaining them during 700k inserts). The API must never build them on startup.
    autoIndex: false,
    autoCreate: false,
  },
);

// The schema is the runtime contract; the explicit interface gives services precise types.
export const TreeCensus = model('TreeCensus', treeCensusSchema) as unknown as Model<TreeCensusRecord>;
