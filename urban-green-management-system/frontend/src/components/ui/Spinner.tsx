import { cx } from '@/utils/classNames';

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className = 'h-5 w-5' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx(
        'inline-block animate-spin rounded-full border-2 border-emerald-600 border-t-transparent',
        className,
      )}
    />
  );
}
