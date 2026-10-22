import type { ReactNode } from 'react';
import { cx } from '@/utils/classNames';

interface CardProps {
  title?: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

export function Card({ title, description, className, children }: CardProps) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white p-6 shadow-sm', className)}>
      {(title || description) && (
        <header className="mb-4">
          {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
