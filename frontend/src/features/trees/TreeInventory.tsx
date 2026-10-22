
import { useEffect, useState } from 'react';
import { TreeDetails } from './TreeDetails';
import {
  getTrees,
  getWards,
  getManagedTrees,
  type TreeRecord,
  type WardData,
  type ManagedTreeRecord,
} from '@/services/tree.service';

interface TreeInventoryProps {
  search: string;
  ward: string;
  setSearch: (value: string) => void;
  setWard: (value: string) => void;
}

export function TreeInventory({
  search,
  ward,
  setSearch,
  setWard,
}: TreeInventoryProps) {
  const [trees, setTrees] = useState<TreeRecord[]>([]);
  const [managedTrees, setManagedTrees] = useState<ManagedTreeRecord[]>([]);
  const [page, setPage] = useState(1);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [selectedManagedTree, setSelectedManagedTree] =
    useState<ManagedTreeRecord | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [wards, setWards] = useState<WardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [managedLoading, setManagedLoading] = useState(true);
  const [error, setError] = useState('');
  const [managedError, setManagedError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadTrees() {
      try {
        setLoading(true);
        setError('');

        const result = await getTrees({
          page,
          limit: 20,
          q: search,
          wardNumber: ward,
        });

        if (active) {
          setTrees(result.data);
          setTotalPages(Math.max(1, result.pagination.totalPages));
        }
      } catch {
        if (active) {
          setError('Unable to load tree inventory. Please try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    const timer = setTimeout(loadTrees, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, ward, page, reload]);

  useEffect(() => {
    let active = true;

    async function loadWards() {
      try {
        const result = await getWards();
        if (active) setWards(result);
      } catch {
        if (active) setWards([]);
      }
    }

    loadWards();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadManagedTrees() {
      try {
        setManagedLoading(true);
        setManagedError('');

        const result = await getManagedTrees(1, 200);

        if (active) setManagedTrees(result.data);
      } catch {
        if (active) {
          setManagedError('Unable to load uploaded trees. Please retry.');
        }
      } finally {
        if (active) setManagedLoading(false);
      }
    }

    loadManagedTrees();

    return () => {
      active = false;
    };
  }, [reload]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleWard(value: string) {
    setWard(value);
    setPage(1);
  }

  const filteredManagedTrees = managedTrees.filter((tree) => {
    const matchesSearch =
      !search ||
      tree.treeName.toLowerCase().includes(search.trim().toLowerCase());

    const matchesWard = !ward || tree.wardNumber === ward;

    return matchesSearch && matchesWard;
  });

  return (
    <section className="space-y-6">
      {selectedTreeId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-3xl">
            <TreeDetails
              treeId={selectedTreeId}
              onClose={() => setSelectedTreeId(null)}
            />
          </div>
        </div>
      )}

      {selectedManagedTree && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-[#123f35]">
                🌳 {selectedManagedTree.treeName}
              </h3>
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
              <p className="break-words">
                <strong>Notes:</strong> {selectedManagedTree.notes || '—'}
              </p>
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
            Tree Management
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#123f35]">
            Tree Inventory
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Browse census records and trees registered through your upload form.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
            🌳
          </span>
          <div>
            <p className="text-xs text-slate-500">Census records on this page</p>
            <p className="text-xl font-bold text-[#123f35]">{trees.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h3 className="font-bold text-[#123f35]">Find a tree</h3>
          <p className="mt-1 text-sm text-slate-500">
            Search tree names across both sections and filter by ward.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_240px_auto]">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search tree
            </span>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-emerald-600 focus-within:bg-white">
              <span className="text-lg text-emerald-700">⌕</span>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Enter tree name..."
                className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Filter by ward
            </span>
            <select
              value={ward}
              onChange={(e) => handleWard(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white"
            >
              <option value="">All Wards</option>
              {wards.map((item) => (
                <option key={item.wardNumber} value={item.wardNumber}>
                  Ward {item.wardNumber}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                handleSearch('');
                handleWard('');
                setPage(1);
              }}
              className="w-full rounded-xl border border-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 md:w-auto"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h3 className="font-bold text-[#123f35]">Original Census Records</h3>
            <p className="mt-1 text-xs text-slate-500">
              Read-only records from the Bengaluru Tree Census.
            </p>
          </div>
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            Page {page} of {totalPages}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
            <p className="text-sm text-slate-500">Loading census records...</p>
          </div>
        ) : error ? (
          <div className="px-5 py-12 text-center">
            <p className="font-semibold text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => setReload((value) => value + 1)}
              className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[850px] w-full text-left text-sm">
                <thead className="bg-[#f0f7f2] text-[11px] uppercase tracking-wider text-[#45685b]">
                  <tr>
                    <th className="px-5 py-4 font-bold">Object ID</th>
                    <th className="px-5 py-4 font-bold">Tree name</th>
                    <th className="px-5 py-4 font-bold">Ward</th>
                    <th className="px-5 py-4 font-bold">Status</th>
                    <th className="px-5 py-4 font-bold">KGIS Tree ID</th>
                    <th className="px-5 py-4 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trees.map((tree) => (
                    <tr key={tree.id} className="transition hover:bg-emerald-50/50">
                      <td className="px-5 py-4 font-medium text-slate-500">
                        {tree.objectId ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                            🌿
                          </span>
                          <span className="font-semibold text-[#123f35]">
                            {tree.treeName || 'Name not available'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                          {tree.wardNumber ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {tree.status == null ? (
                          <span className="text-xs text-slate-400">Not available</span>
                        ) : (
                          <span className="text-xs font-medium text-slate-700">
                            {tree.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {tree.kgisTreeId ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedTreeId(String(tree.id))}
                          className="whitespace-nowrap rounded-lg bg-[#0b5945] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#073f35]"
                        >
                          View Details ↗
                        </button>
                      </td>
                    </tr>
                  ))}
                  {trees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="text-4xl">🌱</div>
                        <p className="mt-3 font-semibold text-slate-700">No census trees found</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try another tree name or select a different ward.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-slate-500">
                Showing {trees.length} census records on this page
              </p>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>
                <span className="min-w-[85px] text-center text-sm font-semibold text-[#123f35]">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || loading}
                  className="rounded-xl bg-[#0b5945] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#073f35] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <section className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-xl font-bold text-[#123f35]">🌱 Newly Added Trees</h3>
            <p className="mt-1 text-sm text-slate-500">
              Records registered through your Upload Tree page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            Refresh uploaded trees
          </button>
        </div>

        {managedLoading ? (
          <p className="py-6 text-sm text-slate-500">Loading uploaded trees...</p>
        ) : managedError ? (
          <div>
            <p role="alert" className="py-3 text-sm text-red-600">{managedError}</p>
            <button
              type="button"
              onClick={() => setReload((value) => value + 1)}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs text-emerald-800">Uploaded records loaded</p>
                <p className="mt-1 text-2xl font-bold text-[#123f35]">
                  {filteredManagedTrees.length}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Storage</p>
                <p className="mt-1 font-semibold text-slate-800">ManagedTree collection</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-emerald-50 text-xs uppercase text-emerald-900">
                  <tr>
                    <th className="px-4 py-3">Tree Name</th>
                    <th className="px-4 py-3">Ward</th>
                    <th className="px-4 py-3">Latitude</th>
                    <th className="px-4 py-3">Longitude</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredManagedTrees.map((tree) => (
                    <tr key={tree._id} className="hover:bg-emerald-50/50">
                      <td className="px-4 py-3 font-semibold text-[#123f35]">
                        🌳 {tree.treeName}
                      </td>
                      <td className="px-4 py-3">{tree.wardNumber}</td>
                      <td className="px-4 py-3">{tree.latitude}</td>
                      <td className="px-4 py-3">{tree.longitude}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedManagedTree(tree)}
                          className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredManagedTrees.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No uploaded trees match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <p className="px-1 text-xs text-slate-400">
        Original census records are read-only. Uploaded records are stored separately.
      </p>
    </section>
  );
}
