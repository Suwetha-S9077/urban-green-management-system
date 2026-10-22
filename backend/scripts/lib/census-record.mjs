/**
 * Pure validation + cleaning for the Bengaluru Tree Census GeoJSON.
 * Field names come from the inspected dataset ONLY:
 *   WardNumber, OBJECTID, TreeName, KGISTreeID, DepartmentCode, KGISCode, KGISVillageID, Status
 * Nothing here invents, renames, merges or derives source values.
 */

export const SOURCE_FIELDS = [
  'WardNumber',
  'OBJECTID',
  'TreeName',
  'KGISTreeID',
  'DepartmentCode',
  'KGISCode',
  'KGISVillageID',
  'Status',
];

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

export function newCleaningStats() {
  return {
    trimmedStrings: 0, // string values that had leading/trailing whitespace removed
    emptyStringsToNull: 0, // "" or whitespace-only strings stored as null
    numbersCoercedToString: 0, // numeric value found where the source uses strings
    unexpectedTypeDropped: 0, // value of an unexpected type stored as null
    villageIdCoerced: 0, // numeric-looking string found in KGISVillageID
    statusUnexpected: 0, // Status that was neither a number nor null
    unknownFields: new Set(), // property names not in SOURCE_FIELDS (reported, not stored)
  };
}

/** Returns a list of reasons the feature cannot be imported (empty list = valid). */
export function validateFeature(feature) {
  const reasons = [];
  if (!feature || typeof feature !== 'object' || feature.type !== 'Feature') {
    return ['not a GeoJSON Feature'];
  }

  const g = feature.geometry;
  if (g === null || g === undefined) {
    reasons.push('missing geometry');
  } else if (g.type !== 'Point') {
    reasons.push('geometry is not a Point');
  } else if (!Array.isArray(g.coordinates) || g.coordinates.length !== 2) {
    reasons.push('coordinates are not [longitude, latitude]');
  } else {
    const [lon, lat] = g.coordinates;
    if (!isFiniteNumber(lon) || !isFiniteNumber(lat)) reasons.push('non-numeric coordinates');
    else if (Math.abs(lon) > 180 || Math.abs(lat) > 90) reasons.push('coordinates out of range');
    else if (lon === 0 && lat === 0) reasons.push('coordinates are exactly (0,0)');
  }

  const p = feature.properties;
  if (p === null || p === undefined || typeof p !== 'object') {
    reasons.push('missing properties');
  } else if (!Number.isInteger(p.OBJECTID)) {
    // OBJECTID is the import identity key, so a record without it cannot be imported idempotently.
    reasons.push('OBJECTID missing or not an integer');
  }
  return reasons;
}

function cleanString(value, stats) {
  if (value === null || value === undefined) return null;
  let s;
  if (typeof value === 'string') {
    s = value;
  } else if (isFiniteNumber(value)) {
    s = String(value);
    stats.numbersCoercedToString++;
  } else {
    stats.unexpectedTypeDropped++;
    return null;
  }
  const t = s.trim();
  if (t !== s) stats.trimmedStrings++;
  if (t === '') {
    stats.emptyStringsToNull++;
    return null;
  }
  return t;
}

/** Call only on features that passed validateFeature(). */
export function cleanFeature(feature, stats) {
  const p = feature.properties;

  for (const key of Object.keys(p)) {
    if (!SOURCE_FIELDS.includes(key) && stats.unknownFields.size < 50) stats.unknownFields.add(key);
  }

  let villageId = null;
  const rawVillage = p.KGISVillageID;
  if (isFiniteNumber(rawVillage)) {
    villageId = rawVillage;
  } else if (typeof rawVillage === 'string' && rawVillage.trim() !== '' && Number.isFinite(Number(rawVillage))) {
    villageId = Number(rawVillage);
    stats.villageIdCoerced++;
  } else if (rawVillage !== null && rawVillage !== undefined) {
    stats.unexpectedTypeDropped++;
  }

  // Status: keep the number as-is, keep null separate. No meaning is attached to 0 or 1.
  let status = null;
  if (isFiniteNumber(p.Status)) status = p.Status;
  else if (p.Status !== null && p.Status !== undefined) stats.statusUnexpected++;

  const [lon, lat] = feature.geometry.coordinates;

  return {
    OBJECTID: p.OBJECTID,
    KGISTreeID: cleanString(p.KGISTreeID, stats),
    KGISCode: cleanString(p.KGISCode, stats),
    KGISVillageID: villageId,
    DepartmentCode: cleanString(p.DepartmentCode, stats),
    WardNumber: cleanString(p.WardNumber, stats),
    TreeName: cleanString(p.TreeName, stats),
    Status: status,
    location: { type: 'Point', coordinates: [lon, lat] },
  };
}
