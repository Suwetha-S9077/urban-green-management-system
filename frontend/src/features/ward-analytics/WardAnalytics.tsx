
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getWards, type WardData } from '@/services/tree.service';

export function WardAnalytics() {
  const [wards, setWards] = useState<WardData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWards = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getWards();
      setWards(data);
    } catch (err) {
      console.error('Failed to load ward analytics:', err);
      setError(
        'Unable to load ward analytics. Please check your backend connection.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWards();
  }, [loadWards]);

  const filteredWards = useMemo(() => {
    const query = search.trim().toLowerCase();

    return wards
      .filter((ward) =>
        String(ward.wardNumber ?? '').toLowerCase().includes(query),
      )
      .sort((a, b) => b.count - a.count);
  }, [wards, search]);

  const totalTrees = filteredWards.reduce(
    (sum, ward) => sum + ward.count,
    0,
  );

  const maxCount = Math.max(
    1,
    ...filteredWards.map((ward) => ward.count),
  );

  const highestWard = filteredWards[0];
  const lowestWard = filteredWards.length
    ? filteredWards.reduce((lowest, ward) =>
        ward.count < lowest.count ? ward : lowest,
      )
    : undefined;

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            Urban Green Management
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Ward Analytics 📊
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Compare tree coverage across wards and identify areas that may
            need closer attention.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadWards()}
          disabled={loading}
          className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? 'Loading...' : '↻ Refresh Data'}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => void loadWards()}
            className="mt-2 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading && wards.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="font-semibold text-slate-800">
            Loading ward statistics...
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Fetching ward data from your backend.
          </p>
        </div>
      ) : !error && wards.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-lg font-bold text-slate-800">
            No ward data available
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Your backend returned no ward statistics.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: 'Wards Found',
                value: filteredWards.length.toLocaleString(),
                icon: '📍',
                detail: 'Wards matching your search',
              },
              {
                title: 'Tree Records',
                value: totalTrees.toLocaleString(),
                icon: '🌳',
                detail: 'Sum of returned ward counts',
              },
              {
                title: 'Highest Tree Count',
                value: highestWard
                  ? highestWard.count.toLocaleString()
                  : '—',
                icon: '🏆',
                detail: highestWard
                  ? `Ward ${highestWard.wardNumber}`
                  : 'No matching ward',
              },
              {
                title: 'Lowest Tree Count',
                value: lowestWard
                  ? lowestWard.count.toLocaleString()
                  : '—',
                icon: '🌱',
                detail: lowestWard
                  ? `Ward ${lowestWard.wardNumber}`
                  : 'No matching ward',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    {card.title}
                  </p>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                    {card.icon}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-extrabold text-slate-900">
                  {card.value}
                </p>
                <p className="mt-2 text-xs text-slate-500">{card.detail}</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  🌿 Ward-wise Tree Comparison
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Compare the number of tree records reported for each ward.
                </p>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ward number..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:max-w-xs"
              />
            </div>

            {filteredWards.length === 0 ? (
              <p className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                No wards match your search.
              </p>
            ) : (
              <div className="mt-7 space-y-5">
                {filteredWards.map((ward, index) => (
                  <div key={ward.wardNumber}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-800">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">
                            Ward {ward.wardNumber}
                          </p>
                          <p className="text-xs text-slate-500">
                            {Number.isFinite(ward.percentage)
                              ? `${ward.percentage.toFixed(1)}% of wards API total`
                              : 'Percentage unavailable'}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                        {ward.count.toLocaleString()} trees
                      </span>
                    </div>

                    <div className="ml-12 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          index === 0
                            ? 'bg-emerald-700'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (ward.count / maxCount) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 sm:p-6">
            <h2 className="font-bold text-emerald-950">
              💡 Ward Coverage Insight
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-900">
              {highestWard
                ? `Ward ${highestWard.wardNumber} has the highest tree-record count among the returned wards (${highestWard.count.toLocaleString()}).`
                : 'No ward statistics are available for comparison.'}
              {lowestWard && highestWard?.wardNumber !== lowestWard.wardNumber
                ? ` Ward ${lowestWard.wardNumber} has the lowest count (${lowestWard.count.toLocaleString()}).`
                : ''}
              {' '}Record counts alone do not show tree density or whether a
              ward needs more trees; ward area and population would also be
              needed for that comparison.
            </p>
          </section>

          <p className="text-xs leading-5 text-slate-500">
            Statistics use the values returned by your existing
            /analytics/wards API. Counts and percentages reflect the backend
            response; they are not estimated by this page.
          </p>
        </>
      )}
    </div>
  );
}
