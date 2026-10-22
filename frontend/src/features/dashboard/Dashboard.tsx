
import { useCallback, useEffect, useState } from 'react';
import { getDashboard, getUploadedTreeCount, type DashboardData } from '@/services/dashboard.service';
import { getTrees, type TreeRecord } from '@/services/tree.service';
import { DashboardCharts } from './DashboardCharts';

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [recentTrees, setRecentTrees] = useState<TreeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const userName =
  localStorage.getItem('urbanGreenDisplayName') || 'Green Admin';

  const loadDashboard = useCallback(async () => {
    try {
      setError('');

      const [dashboard, uploaded, trees] = await Promise.all([
        getDashboard(),
        getUploadedTreeCount(),
        getTrees({ page: 1, limit: 5 }),
      ]);

      setData(dashboard);
      setUploadedCount(uploaded);
      setRecentTrees(trees.data);
    } catch (err) {
      console.error('Unable to load dashboard:', err);
      setError('Unable to load dashboard data. Please check your backend connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();

    const interval = window.setInterval(() => {
      void loadDashboard();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  if (loading && !data) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="font-medium text-slate-500">Loading your green dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
        <h2 className="font-bold">Dashboard unavailable</h2>
        <p className="mt-2 text-sm">{error || 'No dashboard data returned.'}</p>
        <button
          onClick={() => {
            setLoading(true);
            void loadDashboard();
          }}
          className="mt-4 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Census Trees',
      value: data.totals.trees,
      icon: '🌳',
      note: 'Official tree records',
      color: 'bg-emerald-50 text-emerald-800',
    },
    {
      label: 'Tree Species',
      value: data.totals.speciesCategories,
      icon: '🍃',
      note: 'Recorded categories',
      color: 'bg-lime-50 text-lime-800',
    },
    {
      label: 'Wards Covered',
      value: data.totals.wards,
      icon: '📍',
      note: 'Across the dataset',
      color: 'bg-sky-50 text-sky-800',
    },
    {
      label: 'Managed Trees',
      value: uploadedCount,
      icon: '🌱',
      note: 'Added through this system',
      color: 'bg-amber-50 text-amber-800',
    },
  ];

  return (
    <div className="space-y-7 pb-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-700 p-7 text-white shadow-xl sm:p-9">
        <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full border-[35px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-24 right-36 h-52 w-52 rounded-full bg-lime-300/10 blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-lime-300">
            Urban Green Management System
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Welcome back, {userName}! 🌱
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-100 sm:text-base">
            Monitor tree inventory, explore species distribution, and keep track
            of the green spaces across your managed areas.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => void loadDashboard()}
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-950 transition hover:bg-lime-100"
            >
              ↻ Refresh dashboard
            </button>
            <a
              href="/tree-upload"
              className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              + Add tree records
            </a>
          </div>
        </div>
        <div className="absolute bottom-5 right-7 hidden text-7xl opacity-20 sm:block" aria-hidden="true">
          🌿
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error} Showing the last successfully loaded data.
        </div>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              At a glance
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              Greenery overview
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Automatically refreshed every 10 seconds
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
                    {stat.value.toLocaleString('en-IN')}
                  </p>
                </div>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${stat.color}`}>
                  {stat.icon}
                </span>
              </div>
              <p className="mt-4 text-xs text-slate-500">{stat.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Analytics
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">
            Understand the tree census
          </h2>
        </div>
        <DashboardCharts
  status={data.status}
  topSpecies={data.topSpecies}
  topWards={data.topWards}
/>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
            <div>
              <h2 className="font-extrabold text-slate-900">Recent Tree Records</h2>
              <p className="mt-1 text-xs text-slate-500">
                Latest records returned by the tree inventory API
              </p>
            </div>
            <a
              href="/trees"
              className="text-sm font-bold text-emerald-800 hover:text-emerald-600"
            >
              View inventory →
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tree name</th>
                  <th className="px-5 py-3 font-semibold">Ward</th>
                  <th className="px-5 py-3 font-semibold">K-GIS ID</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTrees.map((tree) => (
                  <tr key={tree.id} className="transition hover:bg-emerald-50/50">
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      <span className="mr-2">🌳</span>
                      {tree.treeName || 'Unspecified'}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {tree.wardNumber || '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {tree.kgisTreeId || tree.kgisCode || '—'}
                    </td>
                    <td className="px-5 py-4">
                      {tree.status === 1 ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                          Active
                        </span>
                      ) : tree.status === 0 ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          Inactive
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          Unknown
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {recentTrees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                      No tree records were returned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Data snapshot
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-slate-900">
            Quick insights
          </h2>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-800">Most represented species</p>
              <p className="mt-2 font-bold text-slate-900">
                {data.topSpecies[0]?.treeName || 'No species data'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {data.topSpecies[0]
                  ? `${data.topSpecies[0].count.toLocaleString('en-IN')} records`
                  : 'No count available'}
              </p>
            </div>

            <div className="rounded-xl bg-lime-50 p-4">
              <p className="text-xs font-semibold text-lime-800">Top ward by records</p>
              <p className="mt-2 font-bold text-slate-900">
                {data.topWards[0]?.wardNumber
                  ? `Ward ${data.topWards[0].wardNumber}`
                  : 'No ward data'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {data.topWards[0]
                  ? `${data.topWards[0].count.toLocaleString('en-IN')} records`
                  : 'No count available'}
              </p>
            </div>

            <div className="rounded-xl bg-sky-50 p-4">
              <p className="text-xs font-semibold text-sky-800">Unique locations</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {data.spatial.distinctLocations.toLocaleString('en-IN')}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Distinct recorded coordinates
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-800">Repeated coordinate records</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {data.spatial.repeatedCoordinateRecords.toLocaleString('en-IN')}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Records sharing coordinates
              </p>
            </div>
          </div>
        </aside>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <p>Urban Green Management System · Tree Census Dashboard</p>
        <p>Data is loaded from your connected backend</p>
      </footer>
    </div>
  );
}
