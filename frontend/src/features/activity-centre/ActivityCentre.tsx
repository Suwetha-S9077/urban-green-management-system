
import { useCallback, useEffect, useState } from 'react';
import { getManagedTrees } from '@/services/tree.service';

interface Activity {
  id: string;
  title: string;
  description: string;
  category: 'Data' | 'System';
  time: string;
}

export function ActivityCentre() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Read the real managed-tree total without fetching every record.
      const response = await getManagedTrees(1, 1);
      const total = response.pagination.total;

      const latestActivities: Activity[] = [
        {
          id: 'managed-tree-count',
          title: 'Managed Tree Records',
          description: `${total.toLocaleString()} managed-tree records are currently registered in the system.`,
          category: 'Data',
          time: 'Current status',
        },
      ];

      setActivities(latestActivities);
    } catch (err) {
      console.error('Failed to load activity information:', err);
      setError('Unable to load activity information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const visibleActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.title.toLowerCase().includes(search.toLowerCase()) ||
      activity.description.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === 'All' || activity.category === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Page header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-700">
              Your workspace
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Activity Centre ⚡
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              View system activity and monitor the current status of your
              urban greenery records.
            </p>
          </div>

          <button
            onClick={() => void loadActivities()}
            disabled={loading}
            className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : '↻ Refresh Activity'}
          </button>
        </header>

        {/* Summary cards */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Activity Entries
              </p>
              <span className="text-2xl">📋</span>
            </div>
            <p className="mt-4 text-4xl font-extrabold text-slate-900">
              {loading ? '—' : activities.length}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Available activity summaries
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Data Activities
              </p>
              <span className="text-2xl">🌳</span>
            </div>
            <p className="mt-4 text-4xl font-extrabold text-emerald-700">
              {loading
                ? '—'
                : activities.filter((item) => item.category === 'Data').length}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Summaries related to tree data
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-900 p-6 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-teal-100">
                Monitoring Status
              </p>
              <span className="text-2xl">📡</span>
            </div>
            <p className="mt-4 text-2xl font-extrabold">
              {loading ? 'Checking...' : error ? 'Unavailable' : 'Connected'}
            </p>
            <p className="mt-2 text-sm text-teal-100">
              {loading
                ? 'Checking the data service'
                : error
                  ? 'Could not retrieve current data'
                  : 'Current data summary loaded successfully'}
            </p>
          </div>
        </div>

        {/* Activity timeline */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Activity Timeline
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search and filter the available activity information.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search activities..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-64"
              />

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="All">All activities</option>
                <option value="Data">Data activities</option>
                <option value="System">System activities</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{error}</p>
              <button
                onClick={() => void loadActivities()}
                className="mt-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="mt-8 space-y-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex animate-pulse gap-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-4 w-1/3 rounded bg-slate-100" />
                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : !error && visibleActivities.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-5xl">🔎</div>
              <h3 className="mt-4 text-lg font-bold text-slate-800">
                No matching activities
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Try another search term or change the activity filter.
              </p>
              <button
                onClick={() => {
                  setSearch('');
                  setFilter('All');
                }}
                className="mt-4 font-semibold text-emerald-700 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : !error ? (
            <div className="mt-8">
              {visibleActivities.map((activity, index) => (
                <div key={activity.id} className="relative flex gap-4 pb-8">
                  {index !== visibleActivities.length - 1 && (
                    <div className="absolute bottom-0 left-6 top-12 w-px bg-emerald-100" />
                  )}

                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl ring-4 ring-white">
                    {activity.category === 'Data' ? '🌳' : '⚙️'}
                  </div>

                  <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {activity.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {activity.description}
                        </p>
                      </div>

                      <span className="w-fit shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                        {activity.category}
                      </span>
                    </div>

                    <p className="mt-4 text-xs font-medium text-slate-400">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* Footer banner */}
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
              🌍
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-950">
                Building a greener city, one record at a time
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-800">
                Keep tree records accurate and up to date. A full historical
                timeline of uploads, edits, and deletions can be added when
                the backend records those events.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
