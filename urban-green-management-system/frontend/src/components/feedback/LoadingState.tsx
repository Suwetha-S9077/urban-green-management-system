import { Spinner } from '@/components/ui/Spinner';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="flex items-center gap-3 py-6 text-sm text-slate-600">
      <Spinner />
      <span>{message}</span>
    </div>
  );
}
