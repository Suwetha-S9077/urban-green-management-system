
import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { TreeDetails } from './TreeDetails';
import {
  getTrees,
  getManagedTrees,
  type TreeRecord,
  type ManagedTreeRecord,
} from '@/services/tree.service';

interface TreeMapProps {
  search: string;
  ward: string;
}

interface MapPoint {
  id: string;
  name: string;
  ward: string;
  latitude: number;
  longitude: number;
  source: 'census' | 'uploaded';
  censusId?: string;
  objectId?: number;
  status?: number | null;
  notes?: string;
  departmentCode?: string;
}

function validCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function MapUpdater({ points }: { points: MapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    const bounds = points.map(
      (point) =>
        [point.latitude, point.longitude] as [number, number],
    );

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 15,
    });
  }, [points, map]);

  return null;
}

export function TreeMap({ search, ward }: TreeMapProps) {
  const [trees, setTrees] = useState<TreeRecord[]>([]);
  const [managedTrees, setManagedTrees] = useState<ManagedTreeRecord[]>([]);
  const [selectedCensusId, setSelectedCensusId] = useState<string | null>(null);
  const [selectedManagedTree, setSelectedManagedTree] =
    useState<ManagedTreeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [managedLoading, setManagedLoading] = useState(true);
  const [error, setError] = useState('');
  const [managedError, setManagedError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCensusTrees() {
      try {
        setLoading(true);
        setError('');

        const result = await getTrees({
          page: 1,
          limit: 100,
          q: search,
          wardNumber: ward,
        });

        if (!cancelled) setTrees(result.data);
      } catch {
        if (!cancelled) {
          setTrees([]);
          setError('Unable to load census tree locations.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCensusTrees();

    return () => {
      cancelled = true;
    };
  }, [search, ward, reload]);

  useEffect(() => {
    let cancelled = false;

    async function loadUploadedTrees() {
      try {
        setManagedLoading(true);
        setManagedError('');

        // Load the most recent 200 uploaded records.
        const result = await getManagedTrees(1, 200);

        if (!cancelled) setManagedTrees(result.data);
      } catch {
        if (!cancelled) {
          setManagedError('Unable to load uploaded trees.');
        }
      } finally {
        if (!cancelled) setManagedLoading(false);
      }
    }

    loadUploadedTrees();

    return () => {
      cancelled = true;
    };
  }, [reload]);

  const points = useMemo<MapPoint[]>(() => {
    const censusPoints: MapPoint[] = trees.flatMap((tree) => {
      if (!tree.location) return [];

      const [longitude, latitude] = tree.location.coordinates;

      if (!validCoordinates(latitude, longitude)) return [];

      return [{
        id: `census-${tree.id}`,
        name: tree.treeName || 'Tree name unavailable',
        ward: String(tree.wardNumber ?? ''),
        latitude,
        longitude,
        source: 'census' as const,
        censusId: String(tree.id),
        objectId: tree.objectId,
status: tree.status,
      }];
    });

    const uploadedPoints: MapPoint[] = managedTrees.flatMap((tree) => {
      if (!validCoordinates(tree.latitude, tree.longitude)) return [];

      return [{
        id: `uploaded-${tree._id}`,
        name: tree.treeName,
        ward: String(tree.wardNumber ?? ''),
        latitude: tree.latitude,
        longitude: tree.longitude,
        source: 'uploaded' as const,
        notes: tree.notes,
        departmentCode: tree.departmentCode,
      }];
    });

    const normalizedSearch = search.trim().toLowerCase();

    return [...censusPoints, ...uploadedPoints].filter((point) => {
      const matchesSearch =
        !normalizedSearch ||
        point.name.toLowerCase().includes(normalizedSearch);

      const matchesWard = !ward || point.ward === ward;

      return matchesSearch && matchesWard;
    });
  }, [trees, managedTrees, search, ward]);

  const locatedCensusCount = points.filter(
    (point) => point.source === 'census',
  ).length;

  const locatedUploadedCount = points.filter(
    (point) => point.source === 'uploaded',
  ).length;

  const totalLoaded = trees.length + managedTrees.length;
  
  const actionSuggestions = useMemo(() => {
    const wardCounts: Record<string, number> = {};
    let recordsToVerify = 0;
    let unknownStatuses = 0;

    trees.forEach((tree) => {
      const wardNumber = String(tree.wardNumber ?? '').trim();

      if (wardNumber) {
        wardCounts[wardNumber] = (wardCounts[wardNumber] || 0) + 1;
      }

      const coordinates = tree.location?.coordinates;

      if (
        !coordinates ||
        coordinates.length !== 2 ||
        !coordinates.every(Number.isFinite) ||
        coordinates[0] < -180 ||
        coordinates[0] > 180 ||
        coordinates[1] < -90 ||
        coordinates[1] > 90
      ) {
        recordsToVerify++;
      }

      if (tree.status !== 0 && tree.status !== 1) {
        unknownStatuses++;
      }
    });

    const leastRecordedWard = Object.entries(wardCounts).sort(
      (a, b) => a[1] - b[1],
    )[0];

    return [
      ...(leastRecordedWard
        ? [{
            icon: '🌱',
            title: 'Review Planting Opportunities',
            priority: 'Medium',
            reason: `Ward ${leastRecordedWard[0]} has the fewest records in the currently loaded census sample (${leastRecordedWard[1]}).`,
            action: 'Check available land, existing green cover and local requirements before proposing new planting.',
          }]
        : []),
      ...(recordsToVerify > 0
        ? [{
            icon: '📍',
            title: 'Verify Tree Locations',
            priority: 'High',
            reason: `${recordsToVerify} loaded records have missing or invalid coordinates.`,
            action: 'Check source records and confirm locations during field verification.',
          }]
        : []),
      ...(unknownStatuses > 0
        ? [{
            icon: '📋',
            title: 'Review Incomplete Records',
            priority: 'Medium',
            reason: `${unknownStatuses} loaded records have unknown or missing status values.`,
            action: 'Verify the original status definition before updating these records.',
          }]
        : []),
      {
        icon: '🌳',
        title: 'Plan Tree Maintenance',
        priority: 'Medium',
        reason: 'The available dataset does not confirm the biological health of individual trees.',
        action: 'Arrange field inspections to assess watering needs, visible damage, soil conditions and maintenance requirements.',
      },
    ];
  }, [trees]);


  const isLoading = loading || managedLoading;

  return (
    <section className="space-y-6">
      {selectedCensusId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-3xl">
            <TreeDetails
              treeId={selectedCensusId}
              onClose={() => setSelectedCensusId(null)}
            />
          </div>
        </div>
      )}

      {selectedManagedTree && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Uploaded Tree
                </p>
                <h3 className="mt-2 text-xl font-bold text-[#123f35]">
                  🌳 {selectedManagedTree.treeName}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedManagedTree(null)}
                className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100"
              >
                Close ✕
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-700">
              <p><strong>Ward:</strong> {selectedManagedTree.wardNumber}</p>
              <p><strong>Department:</strong> {selectedManagedTree.departmentCode || '—'}</p>
              <p><strong>KGIS Tree ID:</strong> {selectedManagedTree.kgisTreeId || '—'}</p>
              <p><strong>KGIS Code:</strong> {selectedManagedTree.kgisCode || '—'}</p>
              <p><strong>Latitude:</strong> {selectedManagedTree.latitude}</p>
              <p><strong>Longitude:</strong> {selectedManagedTree.longitude}</p>
              <p><strong>Notes:</strong> {selectedManagedTree.notes || '—'}</p>
              <p className="break-all">
                <strong>Record ID:</strong> {selectedManagedTree._id}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Geographic Explorer
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-[#123f35]">
            Tree Map
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Explore original census locations and newly registered trees.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
            📍
          </span>
          <div>
            <p className="text-xs text-slate-500">Located records</p>
            <p className="text-xl font-bold text-[#123f35]">
              {points.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Census records loaded</p>
          <p className="mt-2 text-2xl font-bold text-[#123f35]">
            {loading ? '…' : trees.length}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Uploaded records loaded</p>
          <p className="mt-2 text-2xl font-bold text-[#123f35]">
            {managedLoading ? '…' : managedTrees.length}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Located markers</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {points.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {locatedCensusCount} census · {locatedUploadedCount} uploaded
          </p>
        </div>
      </div>

      {(error || managedError) && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <p>{error || managedError}</p>
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="mt-2 font-semibold underline"
          >
            Retry loading records
          </button>
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
          Loading tree locations...
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h3 className="font-bold text-[#123f35]">
              Bengaluru Tree Locations
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Select a marker to view its record. Green markers indicate uploaded trees.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs font-medium">
            <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-800">
              🔵 Census
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-800">
              🟢 Uploaded
            </span>
          </div>
        </div>

        {!isLoading && points.length === 0 && (
          <div className="bg-amber-50 px-5 py-3 text-sm text-amber-800">
            No usable tree coordinates match these filters. Try another tree name or ward.
          </div>
        )}

        <div className="relative z-0">
          <MapContainer
            center={[12.9716, 77.5946]}
            zoom={11}
            scrollWheelZoom
            className="h-[420px] w-full sm:h-[550px]"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapUpdater points={points} />

            {points.map((point) => (
              <Marker
                key={point.id}
                position={[point.latitude, point.longitude]}
              >
                <Popup>
                  <div className="min-w-[180px] space-y-2">
                    <p className="font-bold text-[#123f35]">
                      {point.name}
                    </p>

                    <p className="text-sm">Ward: {point.ward || '—'}</p>
                    {point.source === 'census' && (
  <div className="rounded-lg bg-slate-50 p-3">
    <p className="text-xs font-semibold text-slate-600">
      RECORD STATUS
    </p>

    <p className="mt-1 text-sm font-bold">
      {point.status === 1
        ? 'Status 1'
        : point.status === 0
          ? 'Status 0'
          : 'Unknown'}
    </p>

    <p className="mt-1 text-xs text-slate-500">
      This is the dataset status, not a biological health assessment.
    </p>
  </div>
)}

                    <p className="text-sm">
                      Source: {point.source === 'census' ? 'Original Census' : 'Uploaded Tree'}
                    </p>

                    {point.source === 'census' ? (
                      <>
                        <p className="text-sm">
                          Object ID: {point.objectId ?? '—'}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedCensusId(point.censusId!)}
                          className="rounded-lg bg-[#0b5945] px-3 py-2 text-xs font-semibold text-white hover:bg-[#073f35]"
                        >
                          View Details ↗
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const tree = managedTrees.find(
                            (item) => item._id === point.id.replace('uploaded-', ''),
                          );
                          if (tree) setSelectedManagedTree(tree);
                        }}
                        className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
                      >
                        View Details ↗
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <p className="text-xs text-slate-500">
            Map tiles © OpenStreetMap contributors
          </p>
          <p className="text-xs font-medium text-emerald-800">
            {points.length} markers available
          </p>
        </div>
      </div>

      
      {/* Green Action Planner */}
      <section className="space-y-5 rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              Sustainable City • Action Centre
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#123f35] sm:text-3xl">
              Green Action Planner 🌿
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Practical suggestions for improving tree data quality,
              assessing planting opportunities and planning maintenance.
            </p>
          </div>

          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-4xl">
            🌱
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {actionSuggestions.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-emerald-100 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                  {item.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-[#123f35]">
                      {item.title}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        item.priority === 'High'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.priority} priority
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {item.reason}
                  </p>

                  <div className="mt-4 rounded-xl bg-emerald-50/80 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                      Recommended next step
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {item.action}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="text-xs leading-5 text-slate-400">
          Recommendations use the currently loaded census records.
          Fewer records do not necessarily mean less green cover.
          Confirm findings through field inspection before taking action.
        </p>
      </section>


      <p className="px-1 text-xs text-slate-400">
        Census locations come from the original dataset. Uploaded locations use the latitude and longitude entered in the upload form. This page loads up to 100 census records and 200 uploaded records.
      </p>

      <p className="text-xs text-slate-400">
        Total records fetched: {totalLoaded}
      </p>
    </section>
  );
}
