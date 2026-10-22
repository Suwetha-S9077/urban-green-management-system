import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-emerald-600" />
          <h1 className="text-lg font-semibold tracking-tight">Urban Green Management System</h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Data source: Bengaluru Tree Census
      </footer>
    </div>
  );
}
