export interface TreeLocation {
  type: 'Point';
  /** [longitude, latitude] (GeoJSON order) */
  coordinates: [number, number];
}

export interface TreeDto {
  id: string;
  objectId: number;
  kgisTreeId: string | null;
  kgisCode: string | null;
  kgisVillageId: number | null;
  departmentCode: string | null;
  wardNumber: string | null;
  treeName: string | null;
  status: number | null;
  location: TreeLocation;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface SpeciesEntry {
  treeName: string | null;
  count: number;
  percentage: number;
}

export interface WardEntry {
  wardNumber: string | null;
  count: number;
  percentage: number;
}

export interface StatusEntry {
  status: number | null;
  count: number;
  percentage: number;
}

export interface Distribution<E> {
  totalTrees: number;
  distinctValues: number;
  entries: E[];
}

export interface SpatialOverlap {
  totalRecords: number;
  distinctLocations: number;
  /** Records whose exact coordinates already appear on another record (totalRecords - distinctLocations). */
  repeatedCoordinateRecords: number;
  locationsSharedByMultipleTrees: number;
}

export interface DashboardData {
  totals: { trees: number; speciesCategories: number; wards: number };
  status: { count1: number; count0: number; countNull: number; countOther: number };
  spatial: SpatialOverlap;
  topSpecies: SpeciesEntry[];
  topWards: WardEntry[];
  notes: string[];
  generatedAt: string;
}
