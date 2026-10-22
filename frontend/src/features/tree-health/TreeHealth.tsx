
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getTrees,
  type TreeRecord,
} from '@/services/tree.service';

type StatusFilter = 'All' | 'Active' | 'Inactive' | 'Unknown';

function getStatusLabel(status: number | null) {
  if (status === 1) return 'Active';
  if (status === 0) return 'Inactive';
  return 'Unknown';
}

function getStatusStyle(status: number | null) {
  if (status === 1) {
    return 'bg-emerald-100 text-emerald-800';
  }

  if (status === 0) {
    return 'bg-amber-100 text-amber-800';
  }

  return 'bg-slate-100 text-slate-600';
}

function getRecommendation(tree: TreeRecord) {
  if (tree.status === null) {
    return 'Verify missing status';
  }

  if (tree.status === 0) {
    return 'Verify record and inspect if needed';
  }

  if (!tree.treeName?.trim()) {
    return 'Complete tree identification';
  }

  if (!tree.location?.coordinates) {
    return 'Verify location details';
  }

  return 'Maintain routine monitoring';
}

export function TreeHealth() {
  const [trees, setTrees] = useState<TreeRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [wardSearch, setWardSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTrees = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch only one page to avoid excessive API requests.
      const response = await getTrees({ page: 1, limit: 100 });

      setTrees(response.data);
      setTotalRecords(response.pagination.total);
    } catch (err) {
      console.error('Failed to load tree monitoring data:', err);
      setError('Unable to load tree records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrees();
  }, [loadTrees]);

  const counts = useMemo(() => {
    const active = trees.filter((tree) => tree.status === 1).length;
    const inactive = trees.filter((tree) => tree.status === 0).length;
    const unknown = trees.filter(
      (tree) => tree.status !== 0 && tree.status !== 1,
    ).length;

    const needsVerification = trees.filter(
      (tree) =>
        tree.status !== 1 ||
        !tree.treeName?.trim() ||
        !tree.location?.coordinates,
    ).length;

    return { active, inactive, unknown, needsVerification };
  }, [trees]);

  const filteredTrees = useMemo(() => {
    const query = search.trim().toLowerCase();
    const wardQuery = wardSearch.trim().toLowerCase();

    return trees.filter((tree) => {
      const matchesSearch =
        !query ||
        tree.treeName?.toLowerCase().includes(query) ||
        tree.kgisTreeId?.toLowerCase().includes(query) ||
        tree.kgisCode?.toLowerCase().includes(query);

      const matchesWard =
        !wardQuery ||
        tree.wardNumber?.toLowerCase().includes(wardQuery);

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && tree.status === 1) ||
        (statusFilter === 'Inactive' && tree.status === 0) ||
        (statusFilter === 'Unknown' &&
          tree.status !== 0 &&
          tree.status !== 1);

      return matchesSearch && matchesWard && matchesStatus;
    });
  }, [trees, search, wardSearch, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
              Urban Forest Care
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Tree Health Monitoring 🌳
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Monitor tree-record status, identify missing information,
              and prioritize records for verification.
            </p>
          </div>

          <button
            onClick={() => void loadTrees()}
            disabled={loading}
            className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? 'Loading...' : '↻ Refresh Records'}
          </button>
        </header>

        {/* Data scope notice */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <strong>Monitoring note:</strong> Active and inactive are the
          source dataset's status values, not a diagnosis of biological
          tree health. This page currently analyses the first 100 records
          returned by the API.
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p>{error}</p>
            <button
              onClick={() => void loadTrees()}
              className="mt-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total Dataset Records
              </p>
              <span className="text-2xl">🌲</span>
            </div>
            <p className="mt-4 text-4xl font-extrabold text-slate-900">
              {loading ? '—' : totalRecords.toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Records available in the API
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Status 1
              </p>
              <span className="text-2xl">🟢</span>
            </div>
            <p className="mt-4 text-4xl font-extrabold text-emerald-700">
              {loading ? '—' : counts.active}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Active-status records in this sample
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Status 0
              </p>
              <span className="text-2xl">🟠</span>
            </div>
            <p className="mt-4 text-4xl font-extrabold text-amber-700">
              {loading ? '—' : counts.inactive}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Inactive-status records in this sample
            </p>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Verification Flags
              </p>
              <span className="text-2xl">🔎</span>
            </div>
            <p className="mt-4 text-4xl font-extrabold text-violet-700">
              {loading ? '—' : counts.needsVerification}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Records flagged for review in this sample
            </p>
          </div>
        </div>

        {/* Monitoring indicators */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Record Status Overview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Distribution within the loaded sample of tree records.
              </p>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {loading ? 'Calculating...' : `${trees.length} records loaded`}
            </span>
          </div>

          {!loading && trees.length > 0 && (
            <div className="mt-6 space-y-5">
              {[
                {
                  label: 'Status 1 — Active',
                  count: counts.active,
                  color: 'bg-emerald-500',
                },
                {
                  label: 'Status 0 — Inactive',
                  count: counts.inactive,
                  color: 'bg-amber-500',
                },
                {
                  label: 'Unknown or other status',
                  count: counts.unknown,
                  color: 'bg-slate-400',
                },
              ].map((item) => {
                const percentage = Math.round(
                  (item.count / trees.length) * 100,
                );

                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700">
                        {item.label}
                      </span>
                      <span className="text-slate-500">
                        {item.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Tree records table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Tree Monitoring Records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Search trees and review the recommended data-verification action.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tree name or ID..."
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <input
                value={wardSearch}
                onChange={(event) => setWardSearch(event.target.value)}
                placeholder="Filter by ward..."
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="All">All statuses</option>
                <option value="Active">Status 1 — Active</option>
                <option value="Inactive">Status 0 — Inactive</option>
                <option value="Unknown">Unknown / Other</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-12 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : !error && filteredTrees.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-4xl">🔍</span>
              <h3 className="mt-3 font-bold text-slate-800">
                No matching tree records
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Change your search or filters to see more records.
              </p>
              <button
                onClick={() => {
                  setSearch('');
                  setWardSearch('');
                  setStatusFilter('All');
                }}
                className="mt-4 font-semibold text-emerald-700 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : !error ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Tree</th>
                      <th className="px-5 py-4 font-semibold">Tree ID</th>
                      <th className="px-5 py-4 font-semibold">Ward</th>
                      <th className="px-5 py-4 font-semibold">Record Status</th>
                      <th className="px-5 py-4 font-semibold">Location</th>
                      <th className="px-5 py-4 font-semibold">Recommended Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredTrees.map((tree) => {
                      const coordinates = tree.location?.coordinates;
                      const hasCoordinates =
                        Array.isArray(coordinates) &&
                        coordinates.length === 2 &&
                        coordinates.every(Number.isFinite);

                      return (
                        <tr
                          key={tree.id}
                          className="transition hover:bg-emerald-50/40"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {tree.treeName?.trim() || 'Name not available'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Object ID: {tree.objectId}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {tree.kgisTreeId || tree.kgisCode || '—'}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {tree.wardNumber || 'Unknown'}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(tree.status)}`}
                            >
                              {getStatusLabel(tree.status)}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`text-xs font-semibold ${
                                hasCoordinates
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {hasCoordinates
                                ? '✓ Available'
                                : '⚠ Missing'}
                            </span>
                          </td>

                          <td className="max-w-xs px-5 py-4 text-slate-600">
                            {getRecommendation(tree)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                Showing {filteredTrees.length} matching records from the{' '}
                {trees.length} loaded records. The dataset contains{' '}
                {totalRecords.toLocaleString()} records in total.
              </div>
            </>
          ) : null}
        </section>

        {/* Footer */}
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
          <h2 className="font-bold text-emerald-950">
            🌱 Recommended next step
          </h2>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            Use field inspections and verified health observations to assess
            actual tree condition. The current dataset supports record-status
            monitoring, not automatic detection of disease, pests, or decay.
          </p>
        </section>

      </div>
    </div>
  );
}
