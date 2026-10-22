
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);

      const cleanEmail = email.trim();

      const response = await fetch(
        'http://localhost:5000/api/v1/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: cleanEmail,
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed. Please try again.');
        return;
      }

      if (!data.token) {
        setError('Login response did not contain a token.');
        return;
      }

      localStorage.setItem('urbanGreenToken', data.token);

      localStorage.setItem(
        'urbanGreenUser',
        JSON.stringify(data.user ?? {}),
      );

      const savedSignupEmail =
        localStorage.getItem('urbanGreenSignupEmail');

      const savedSignupName =
        localStorage.getItem('urbanGreenDisplayName');

      const isSameSignupAccount =
        savedSignupEmail?.trim().toLowerCase() ===
        cleanEmail.toLowerCase();

      const accountName =
        isSameSignupAccount && savedSignupName
          ? savedSignupName
          : data.user?.username ||
            data.user?.name ||
            data.user?.fullName ||
            cleanEmail.split('@')[0];

      localStorage.setItem(
        'urbanGreenDisplayName',
        accountName,
      );

      navigate('/dashboard');
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#edf5ef] p-5">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">

        {/* Left promotional panel */}
        <div className="flex flex-col justify-between bg-[#174d38] p-10 text-white">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Urban Green
            </p>

            <h1 className="mt-8 text-4xl font-bold leading-tight">
              A greener city starts with better management.
            </h1>

            <p className="mt-5 leading-7 text-emerald-100">
              Manage tree records, explore real locations and understand
              urban green resources in one place.
            </p>
          </div>

          <p className="mt-12 text-sm text-emerald-200">
            Urban Green Management System
          </p>
        </div>

        {/* Right login panel */}
        <div className="p-8 sm:p-12">
          <h2 className="text-3xl font-bold text-slate-800">
            Welcome back
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to continue to your workspace.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  alert('Password reset setup is coming next.')
                }
                className="text-sm font-medium text-[#176b45] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Login error */}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#176b45] py-3 font-semibold text-white transition hover:bg-[#125437] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Signup navigation */}
          <p className="mt-5 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="font-semibold text-[#176b45] hover:underline"
            >
              Sign up
            </button>
          </p>

          {/* Green message box */}
          <div className="mt-6 flex items-center gap-4 rounded-xl border border-[#e2f0e6] bg-[#edf7f0] p-5 sm:p-6">
            <div className="flex min-h-[58px] w-[76px] shrink-0 items-center justify-center border-r border-[#a8d5b8] pr-4 text-[#27865c]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                width="42"
                height="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M24 42V21" />
                <path d="M24 29C11 29 5 20 6 7C19 7 27 14 24 29Z" />
                <path d="M24 35C37 35 43 26 42 13C29 13 21 20 24 35Z" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="mb-2 text-base font-bold leading-snug text-[#17633f] sm:text-[17px]">
                # Grow a Greener Tomorrow
              </h3>

              <p className="text-sm leading-relaxed text-[#426b56]">
                Every tree matters. Every location counts.
                Together, let's build greener cities.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
