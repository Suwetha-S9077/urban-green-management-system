import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/utils/classNames';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
};

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
