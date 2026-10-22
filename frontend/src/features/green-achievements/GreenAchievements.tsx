
import { useCallback, useEffect, useState } from 'react';
import {
  getManagedTrees,
} from '@/services/tree.service';

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  target: number;
  unlocked: boolean;
  progress: number;
  category: string;
}

export function GreenAchievements() {
  const [treeCount, setTreeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAchievements = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getManagedTrees(1, 1);
      setTreeCount(response.pagination.total);
    } catch (err) {
      console.error('Failed to load achievement data:', err);
      setError('Unable to load achievement data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAchievements();
  }, [loadAchievements]);

  const achievements: Achievement[] = [
    {
      id: 1,
      title: 'Green Beginner',
      description: 'Register your first managed tree.',
      icon: '🌱',
      target: 1,
      unlocked: treeCount >= 1,
      progress: Math.min(treeCount, 1),
      category: 'Getting Started',
    },
    {
      id: 2,
      title: 'Tree Keeper',
      description: 'Register 10 managed trees.',
      icon: '🌳',
      target: 10,
      unlocked: treeCount >= 10,
      progress: Math.min(treeCount, 10),
      category: 'Tree Management',
    },
    {
      id: 3,
      title: 'Forest Guardian',
      description: 'Register 50 managed trees.',
      icon: '🌲',
      target: 50,
      unlocked: treeCount >= 50,
      progress: Math.min(treeCount, 50),
      category: 'Tree Management',
    },
    {
      id: 4,
      title: 'Urban Forest Hero',
      description: 'Register 100 managed trees.',
      icon: '🏆',
      target: 100,
      unlocked: treeCount >= 100,
      progress: Math.min(treeCount, 100),
      category: 'Major Milestones',
    },
  ];

  const unlockedCount = achievements.filter(
    (achievement) => achievement.unlocked
  ).length;

  const overallProgress = Math.round(
    (unlockedCount / achievements.length) * 100
  );

  const nextAchievement = achievements.find(
    (achievement) => !achievement.unlocked
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Recognition Centre
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Green Achievements 🏆
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Track your tree-management milestones and celebrate your
              contribution to a greener urban environment.
            </p>
          </div>

          <button
            onClick={() => void loadAchievements()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 py-3 font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>↻</span>
            {loading ? 'Refreshing...' : 'Refresh Progress'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>
            <button
              onClick={() => void loadAchievements()}
              className="font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Managed Trees
              </p>
              <span className="text-2xl">🌳</span>
            </div>
            <p className="mt-4 text-4xl font-extrabold text-slate-900">
              {loading ? '—' : treeCount.toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Total registered managed-tree records
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Unlocked Badges
              </p>
              <span className="text-2xl">🏅</span>
            </div>
            <p className="mt-4 text-4xl font-extrabold text-emerald-700">
              {loading ? '—' : `${unlockedCount}/${achievements.length}`}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Milestones reached so far
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Achievement Progress
              </p>
              <span className="text-2xl">📈</span>
            </div>
            <p className="mt-4 text-4xl font-extrabold text-slate-900">
              {loading ? '—' : `${overallProgress}%`}
            </p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-700 to-green-900 p-6 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-100">
                Next Milestone
              </p>
              <span className="text-2xl">🎯</span>
            </div>
            <p className="mt-4 text-2xl font-extrabold">
              {loading
                ? 'Loading...'
                : nextAchievement?.title ?? 'All Complete!'}
            </p>
            <p className="mt-2 text-sm text-emerald-100">
              {loading
                ? 'Checking your progress'
                : nextAchievement
                  ? `${nextAchievement.target - treeCount} more ${
                      nextAchievement.target - treeCount === 1
                        ? 'tree'
                        : 'trees'
                    } to reach this milestone`
                  : 'You have reached every tree milestone!'}
            </p>
          </div>
        </div>

        {/* Achievement collection */}
        <section>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Your Badge Collection
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Badges unlock automatically when the registered tree count
                reaches each milestone.
              </p>
            </div>
            <span className="w-fit rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
              🌿 Growing together
            </span>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {achievements.map((achievement) => {
                const progressPercent = Math.round(
                  (achievement.progress / achievement.target) * 100
                );

                return (
                  <article
                    key={achievement.id}
                    className={`relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg ${
                      achievement.unlocked
                        ? 'border-emerald-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div
                      className={`absolute right-0 top-0 h-20 w-20 rounded-bl-full ${
                        achievement.unlocked
                          ? 'bg-emerald-50'
                          : 'bg-slate-50'
                      }`}
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between">
                        <div
                          className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${
                            achievement.unlocked
                              ? 'bg-emerald-100'
                              : 'bg-slate-100 grayscale'
                          }`}
                        >
                          {achievement.icon}
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            achievement.unlocked
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {achievement.unlocked ? 'UNLOCKED' : 'LOCKED'}
                        </span>
                      </div>

                      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                        {achievement.category}
                      </p>

                      <h3 className="mt-2 text-xl font-bold text-slate-900">
                        {achievement.title}
                      </h3>

                      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
                        {achievement.description}
                      </p>

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-500">Progress</span>
                          <span className="text-slate-700">
                            {achievement.progress.toLocaleString()} /{' '}
                            {achievement.target}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              achievement.unlocked
                                ? 'bg-emerald-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <p
                        className={`mt-4 text-sm font-semibold ${
                          achievement.unlocked
                            ? 'text-emerald-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {achievement.unlocked
                          ? '✓ Milestone achieved!'
                          : `${Math.max(
                              achievement.target - treeCount,
                              0
                            ).toLocaleString()} more to go`}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Motivation banner */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-green-700 to-teal-700 p-7 text-white shadow-lg sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Every Tree Matters
              </p>
              <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
                Small actions. Greener cities. 🌍
              </h2>
              <p className="mt-3 leading-7 text-emerald-50">
                Keep your managed-tree records accurate and updated. Every
                verified record helps build a better picture of urban greenery.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/20 bg-white/10 p-5 text-center backdrop-blur-sm">
              <p className="text-4xl font-extrabold">
                {loading ? '—' : treeCount.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-emerald-100">
                Managed-tree records
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
