import { Button } from '@/components/ui/Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-800">{title}</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
