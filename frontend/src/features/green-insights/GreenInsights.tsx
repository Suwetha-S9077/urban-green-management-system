
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTrees, type TreeRecord } from '@/services/tree.service';

export function GreenInsights() {
  const [trees, setTrees] = useState<TreeRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getTrees({ page: 1, limit: 100 });
setTrees(response.data);
    } catch (err) {
      console.error('Failed to load Green Insights:', err);
      setError('Unable to load tree data. Please check your backend connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const filteredTrees = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return trees;

    return trees.filter((tree) =>
      [tree.treeName, tree.wardNumber, tree.departmentCode]
        .some((value) => String(value ?? '').toLowerCase().includes(query)),
    );
  }, [trees, search]);

  const insights = useMemo(() => {
    const species = new Map<string, number>();
    const wards = new Set<string>();
    const statuses = new Map<string, number>();

    let missingNames = 0;
    let missingWards = 0;
    let missingLocations = 0;
    let repeatedCoordinateRecords = 0;

    const coordinates = new Map<string, number>();

    filteredTrees.forEach((tree) => {
      const name = tree.treeName?.trim();
      const ward = tree.wardNumber?.trim();

      if (!name) {
        missingNames++;
      } else {
        species.set(name, (species.get(name) ?? 0) + 1);
      }

      if (!ward) {
        missingWards++;
      } else {
        wards.add(ward);
      }

      const status = tree.status === null || tree.status === undefined
        ? 'Unknown'
        : String(tree.status);

      statuses.set(status, (statuses.get(status) ?? 0) + 1);

      const coords = tree.location?.coordinates;

      if (
        !coords ||
        coords.length !== 2 ||
        !Number.isFinite(coords[0]) ||
        !Number.isFinite(coords[1])
      ) {
        missingLocations++;
      } else {
        const key = `${coords[0]},${coords[1]}`;
        const count = (coordinates.get(key) ?? 0) + 1;
        coordinates.set(key, count);

        if (count > 1) repeatedCoordinateRecords++;
      }
    });

    return {
      total: filteredTrees.length,
      speciesCount: species.size,
      wardCount: wards.size,
      species: [...species.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      statuses: [...statuses.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      missingNames,
      missingWards,
      missingLocations,
      repeatedCoordinateRecords,
    };
  }, [filteredTrees]);

  const maxSpeciesCount = Math.max(
    1,
    ...insights.species.slice(0, 8).map((item) => item.count),
  );

  const maxStatusCount = Math.max(
    1,
    ...insights.statuses.map((item) => item.count),
  );

  const cards = [
    {
      title: 'Tree Records',
      value: insights.total,
      icon: '🌳',
      description: 'Records matching your search',
    },
    {
      title: 'Tree Species',
      value: insights.speciesCount,
      icon: '🍃',
      description: 'Distinct tree names',
    },
    {
      title: 'Wards Covered',
      value: insights.wardCount,
      icon: '📍',
      description: 'Wards represented in these records',
    },
    {
      title: 'Missing Locations',
      value: insights.missingLocations,
      icon: '🗺️',
      description: 'Records without valid coordinates',
    },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            Urban Green Management
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Green Insights 🌿
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Explore tree diversity, ward coverage, status distribution and
            the quality of your tree inventory data.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadInsights()}
          disabled={loading}
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : '↻ Refresh Insights'}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2">🔎</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by tree name, ward or department..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Clear Search
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-semibold">Could not load insights</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={() => void loadInsights()}
            className="mt-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading && trees.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="font-semibold text-slate-800">Analyzing tree records...</p>
          <p className="mt-1 text-sm text-slate-500">
            Fetching inventory data from your backend.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    {card.title}
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                    {card.icon}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-extrabold text-slate-900">
                  {card.value.toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-slate-500">{card.description}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                  🌱 Species Distribution
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  The eight most common tree names in the matching records.
                </p>
              </div>

              {insights.species.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No tree species found.
                </p>
              ) : (
                <div className="space-y-5">
                  {insights.species.slice(0, 8).map((item) => (
                    <div key={item.name}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-slate-700">
                          {item.name}
                        </span>
                        <span className="shrink-0 font-bold text-slate-900">
                          {item.count.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                          style={{
                            width: `${(item.count / maxSpeciesCount) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-right text-xs text-slate-400">
                        {insights.total
                          ? ((item.count / insights.total) * 100).toFixed(1)
                          : '0.0'}
                        % of matching records
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                  📊 Tree Status Distribution
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Counts grouped by the status values stored in your data.
                </p>
              </div>

              {insights.statuses.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No status data found.
                </p>
              ) : (
                <div className="space-y-5">
                  {insights.statuses.map((item) => (
                    <div key={item.name}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          {item.name === '1'
                            ? 'Status 1'
                            : item.name === '0'
                              ? 'Status 0'
                              : item.name}
                        </span>
                        <span className="font-bold text-slate-900">
                          {item.count.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-600 transition-all duration-500"
                          style={{
                            width: `${(item.count / maxStatusCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                Status labels are kept as their original values. Confirm your
                backend's status definitions before interpreting them as active
                or inactive.
              </p>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                🛠️ Data Quality Check
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Identify missing fields and repeated locations in the records
                currently matching your search.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Missing Tree Names',
                  count: insights.missingNames,
                  description: 'Records without a tree name',
                },
                {
                  label: 'Missing Ward Numbers',
                  count: insights.missingWards,
                  description: 'Records without a ward',
                },
                {
                  label: 'Missing Coordinates',
                  count: insights.missingLocations,
                  description: 'Records without valid coordinates',
                },
                {
                  label: 'Repeated Coordinate Records',
                  count: insights.repeatedCoordinateRecords,
                  description: 'Additional records at an already-seen location',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="text-sm font-medium text-slate-600">
                    {item.label}
                  </p>
                  <p className="mt-3 text-2xl font-extrabold text-slate-900">
                    {item.count.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="font-semibold text-emerald-900">
                {insights.missingNames +
                  insights.missingWards +
                  insights.missingLocations === 0
                  ? 'Great! No missing names, wards or coordinates were detected.'
                  : 'Data improvement opportunity'}
              </p>
              <p className="mt-1 text-sm leading-6 text-emerald-800">
                Review records with missing information before using the
                inventory for planning. Repeated coordinates may be legitimate
                or may require verification; they are not automatically errors.
              </p>
            </div>
          </section>

          <p className="text-xs leading-5 text-slate-500">
            Insights are calculated from the tree records returned by the
            inventory API. Search filters apply to all displayed statistics.
            Coordinate duplicates are counted as additional records sharing
            an exact coordinate pair.
          </p>
        </>
      )}
    </div>
  );
}
