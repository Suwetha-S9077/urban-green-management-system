
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function SignupPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername || !cleanEmail || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        'http://localhost:5000/api/v1/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: cleanUsername,
            name: cleanUsername,
            email: cleanEmail,
            password,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to create your account. Please try again.',
        );
      }

      // Save the exact signup name and its matching email.
      localStorage.setItem('urbanGreenDisplayName', cleanUsername);
      localStorage.setItem(
        'urbanGreenSignupEmail',
        cleanEmail.toLowerCase(),
      );

      alert('Account created successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create your account. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-emerald-950 p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
              🌳
            </div>
            <div>
              <h1 className="text-xl font-bold">Urban Green</h1>
              <p className="text-sm text-emerald-200">
                Management System
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
            Build a greener future
          </p>

          <h2 className="text-5xl font-extrabold leading-tight">
            Every tree matters.
            <span className="mt-2 block text-emerald-300">
              Every action counts.
            </span>
          </h2>

          <p className="mt-6 max-w-md text-lg leading-8 text-emerald-100/80">
            Create your account to explore tree inventory, monitor
            green spaces, and support a healthier urban environment.
          </p>
        </div>

        <p className="relative z-10 text-sm text-emerald-200/70">
          Growing greener cities, one tree at a time.
        </p>
      </div>

      <div className="flex w-full items-center justify-center px-6 py-12 sm:px-10 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-3xl lg:hidden">
              🌳
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Create your account
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Join Urban Green Management System
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-800 px-4 py-3.5 font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-emerald-800 hover:text-emerald-950"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
