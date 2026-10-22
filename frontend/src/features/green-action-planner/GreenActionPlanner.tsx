
import { useEffect, useMemo, useState } from 'react';
import { getTrees, type TreeRecord } from '@/services/tree.service';

interface ActionItem {
  title: string;
  reason: string;
  action: string;
  priority: 'High' | 'Medium' | 'Low';
  icon: string;
}

export function GreenActionPlanner() {
  const [trees, setTrees] = useState<TreeRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;

    async function loadTrees() {
      try {
        setLoading(true);
        setError('');

        const result = await getTrees({ page: 1, limit: 100 });

        if (!cancelled) {
          setTrees(result.data);
          setTotalRecords(result.pagination.total);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load tree data. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTrees();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const wardCounts: Record<string, number> = {};
    let missingLocations = 0;
    let unknownStatuses = 0;

    trees.forEach((tree) => {
      const ward = String(tree.wardNumber || '').trim();

      if (ward) {
        wardCounts[ward] = (wardCounts[ward] || 0) + 1;
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
        missingLocations++;
      }

      if (tree.status !== 0 && tree.status !== 1) {
        unknownStatuses++;
      }
    });

    const wards = Object.entries(wardCounts).sort(
      (a, b) => a[1] - b[1],
    );

    return {
      wardCount: wards.length,
      wards,
      missingLocations,
      unknownStatuses,
    };
  }, [trees]);

  const actions = useMemo<ActionItem[]>(() => {
    const result: ActionItem[] = [];

    if (stats.wards.length > 0) {
      const [ward, count] = stats.wards[0];

      result.push({
        title: 'Review planting coverage',
        reason: `Ward ${ward} has the fewest records (${count}) in the loaded sample.`,
        action:
          'Compare ward area, population, existing green cover and available planting space before proposing new trees.',
        priority: 'Medium',
        icon: '🌱',
      });
    }

    if (stats.missingLocations > 0) {
      result.push({
        title: 'Verify tree locations',
        reason: `${stats.missingLocations} loaded records have missing or invalid coordinates.`,
        action:
          'Check the original records and confirm the tree locations during field verification.',
        priority: 'High',
        icon: '📍',
      });
    }

    if (stats.unknownStatuses > 0) {
      result.push({
        title: 'Review incomplete status records',
        reason: `${stats.unknownStatuses} loaded records have an unknown or missing status value.`,
        action:
          'Check the source data and confirm what the status field means before updating records.',
        priority: 'Medium',
        icon: '📋',
      });
    }

    result.push({
      title: 'Plan a field inspection',
      reason: 'The dataset does not confirm the biological health of individual trees.',
      action:
        'Arrange an inspection by a qualified person to assess visible damage, soil conditions, watering needs and maintenance requirements.',
      priority: 'Medium',
      icon: '🌳',
    });

    return result;
  }, [stats]);

  const visibleActions = actions.filter(
    (action) => filter === 'All' || action.priority === filter,
  );

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#123f35] to-emerald-700 p-6 text-white sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">
            Sustainable City • Action Centre
          </p>

          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Green Action Planner 🌿
          </h1>

          <p className="mt-3 text-sm leading-6 text-emerald-50 sm:text-base">
            Turn tree records into practical recommendations for
            planting assessment, data verification and green-space
            maintenance planning.
          </p>
        </div>

        <div className="pointer-events-none absolute -bottom-10 -right-4 text-[150px] opacity-15">
          🌳
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ml-2 font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Total tree records',
            value: loading ? '…' : totalRecords.toLocaleString(),
            icon: '🌳',
          },
          {
            label: 'Wards in sample',
            value: loading ? '…' : stats.wardCount,
            icon: '📍',
          },
          {
            label: 'Locations to verify',
            value: loading ? '…' : stats.missingLocations,
            icon: '🧭',
          },
          {
            label: 'Statuses to review',
            value: loading ? '…' : stats.unknownStatuses,
            icon: '📋',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{item.label}</p>
              <span className="text-2xl">{item.icon}</span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-[#123f35]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-[#123f35]">
              Recommended Actions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Suggestions generated from available tree records.
            </p>
          </div>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
          >
            <option value="All">All priorities</option>
            <option value="High">High priority</option>
            <option value="Medium">Medium priority</option>
            <option value="Low">Low priority</option>
          </select>
        </div>

        {loading ? (
          <p className="mt-6 rounded-xl bg-emerald-50 p-5 text-sm text-emerald-800">
            Analysing tree records...
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {visibleActions.map((action) => (
              <article
                key={action.title}
                className="rounded-2xl border border-slate-100 p-4 transition hover:border-emerald-200 hover:shadow-sm sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                    {action.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-[#123f35]">
                        {action.title}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          action.priority === 'High'
                            ? 'bg-red-50 text-red-700'
                            : action.priority === 'Medium'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {action.priority} priority
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {action.reason}
                    </p>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                        Suggested next step
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {action.action}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {visibleActions.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                No actions match this priority.
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-xs leading-5 text-slate-400">
        Analysis is based on up to 100 loaded census records. Total records
        reflects the API total. A ward with fewer records is not necessarily
        lacking green cover. Status values do not indicate biological tree
        health. Validate recommendations with field data before taking action.
      </p>
    </section>
  );
}
