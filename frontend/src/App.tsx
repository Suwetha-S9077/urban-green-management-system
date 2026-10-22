
import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { TreeInventory } from '@/features/trees/TreeInventory';
import { TreeMap } from '@/features/trees/TreeMap';
import { TreeUpload } from '@/features/trees/TreeUpload';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { GreenInsights } from '@/features/green-insights/GreenInsights';
import { WardAnalytics } from '@/features/ward-analytics/WardAnalytics';
import { GreenAchievements } from '@/features/green-achievements/GreenAchievements';
import { ActivityCentre } from '@/features/activity-centre/ActivityCentre';
import { TreeHealth } from '@/features/tree-health/TreeHealth';
import { GreenActionPlanner } from '@/features/green-action-planner/GreenActionPlanner';

function getUsername() {
  return localStorage.getItem('urbanGreenDisplayName') || 'Green Admin';
}

function getSavedEmail() {
  try {
    const user = JSON.parse(
      localStorage.getItem('urbanGreenUser') || '{}',
    );

    return (
      user.email ||
      localStorage.getItem('urbanGreenSignupEmail') ||
      ''
    );
  } catch {
    return localStorage.getItem('urbanGreenSignupEmail') || '';
  }
}

function DashboardPage() {
  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}

function InventoryPage() {
  const [search, setSearch] = useState('');
  const [ward, setWard] = useState('');

  return (
    <AppLayout>
      <TreeInventory
        search={search}
        ward={ward}
        setSearch={setSearch}
        setWard={setWard}
      />
    </AppLayout>
  );
}

function TreeMapPage() {
  const [search] = useState('');
  const [ward] = useState('');

  return (
    <AppLayout>
      <TreeMap search={search} ward={ward} />
    </AppLayout>
  );
}

function TreeUploadPage() {
  return (
    <AppLayout>
      <TreeUpload />
    </AppLayout>
  );
}

function ProfilePage() {
  const [username, setUsername] = useState(getUsername);
  const [email, setEmail] = useState(getSavedEmail);

  useEffect(() => {
    const updateProfile = () => {
      setUsername(getUsername());
      setEmail(getSavedEmail());
    };

    window.addEventListener('urbanGreenProfileUpdated', updateProfile);

    return () => {
      window.removeEventListener(
        'urbanGreenProfileUpdated',
        updateProfile,
      );
    };
  }, []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            ACCOUNT
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
            My Account
          </h1>
          <p className="mt-2 text-slate-500">
            View your Urban Green account information.
          </p>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-32 bg-gradient-to-r from-emerald-950 via-emerald-800 to-lime-700" />

          <div className="px-6 pb-7 sm:px-8">
            <div className="-mt-12 flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white bg-[#dce5d0] text-5xl shadow-sm">
              🌳
            </div>

            <h2 className="mt-4 text-2xl font-bold text-slate-900">
              {username}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Urban Green Member
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Name</p>
                <p className="mt-2 break-words font-bold text-slate-900">
                  {username}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Email</p>
                <p className="mt-2 break-words font-bold text-slate-900">
                  {email || 'Email not available'}
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              You can update your account details from Settings in the
              profile menu.
            </p>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function SettingsPage() {
  const [name, setName] = useState(getUsername);
  const [email, setEmail] = useState(getSavedEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(getUsername());
    setEmail(getSavedEmail());
  }, []);

  function saveSettings() {
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail) {
      setMessage('Please enter your name and email.');
      setSaved(false);
      return;
    }

    if (password && password.length < 8) {
      setMessage('Your new password must contain at least 8 characters.');
      setSaved(false);
      return;
    }

    if (password && password !== confirmPassword) {
      setMessage('The passwords do not match.');
      setSaved(false);
      return;
    }

    if (password) {
      setMessage(
        'Name and email were not saved. Password updates need secure backend support.',
      );
      setSaved(false);
      return;
    }

    localStorage.setItem('urbanGreenDisplayName', cleanName);
    localStorage.setItem('urbanGreenSignupEmail', cleanEmail);

    try {
      const storedUser = localStorage.getItem('urbanGreenUser');

      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.name = cleanName;
        user.username = cleanName;
        user.email = cleanEmail;

        localStorage.setItem('urbanGreenUser', JSON.stringify(user));
      }
    } catch {
      // Name and email remain saved in their separate browser keys.
    }

    window.dispatchEvent(new Event('urbanGreenProfileUpdated'));

    setName(cleanName);
    setEmail(cleanEmail);
    setPassword('');
    setConfirmPassword('');
    setMessage('Your name and email have been saved successfully.');
    setSaved(true);
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            ACCOUNT
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
            Settings
          </h1>
          <p className="mt-2 text-slate-500">
            Manage your personal account details.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
              👤
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Account Information
              </h2>
              <p className="text-sm text-slate-500">
                Update your name, email, and password.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="settings-name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Name
              </label>
              <input
                id="settings-name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setMessage('');
                  setSaved(false);
                }}
                maxLength={50}
                placeholder="Enter your name"
                autoComplete="name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="settings-email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email Address
              </label>
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setMessage('');
                  setSaved(false);
                }}
                autoComplete="email"
                placeholder="Enter your email address"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="settings-password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                New Password
              </label>
              <input
                id="settings-password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setMessage('');
                  setSaved(false);
                }}
                autoComplete="new-password"
                placeholder="Enter a new password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-2 text-xs text-slate-500">
                Leave blank if you do not want to change your password.
              </p>
            </div>

            {password && (
              <div>
                <label
                  htmlFor="settings-confirm-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Confirm New Password
                </label>
                <input
                  id="settings-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setMessage('');
                    setSaved(false);
                  }}
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            )}
          </div>

          {message && (
            <p
              role="status"
              className={`mt-5 text-sm font-medium ${
                saved ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {message}
            </p>
          )}

          <div className="mt-7 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={saveSettings}
              className="w-full rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 sm:w-auto"
            >
              Save Changes
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}


function GreenInsightsPage() {
  return (
    <AppLayout>
      <GreenInsights />
    </AppLayout>
  );
}

function WardAnalyticsPage() {
  return (
    <AppLayout>
      <WardAnalytics />
    </AppLayout>
  );
}

function GreenAchievementsPage() {
  return (
    <AppLayout>
      <GreenAchievements />
    </AppLayout>
  );
}

function ActivityCentrePage() {
  return (
    <AppLayout>
      <ActivityCentre />
    </AppLayout>
  );
}

function TreeHealthPage() {
  return (
    <AppLayout>
      <TreeHealth />
    </AppLayout>
  );
}

function GreenActionPlannerPage() {
  return (
    <AppLayout>
      <GreenActionPlanner />
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/trees" element={<InventoryPage />} />
        <Route path="/tree-map" element={<TreeMapPage />} />
        <Route path="/tree-upload" element={<TreeUploadPage />} />

        <Route path="/green-insights" element={<GreenInsightsPage />} />
        <Route path="/ward-analytics" element={<WardAnalyticsPage />} />
        <Route path="/green-achievements" element={<GreenAchievementsPage />} />
        <Route path="/activity-centre" element={<ActivityCentrePage />} />
        <Route path="/tree-health" element={<TreeHealthPage />} />
        <Route
  path="/green-action-planner"
  element={<GreenActionPlannerPage />}
/>

        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
