import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Card } from '@/components/ui/Card';
import { useAsync } from '@/hooks/useAsync';
import { fetchHealth } from '@/services/health.service';
import { cx } from '@/utils/classNames';
import { formatDateTime, formatUptime } from '@/utils/format';

/**
 * Foundation check only: proves Frontend -> API -> MongoDB is wired up.
 * Safe to delete once real features exist.
 */
export function SystemStatusCard() {
  const { state, refetch } = useAsync(fetchHealth);

  return (
    <Card
      title="Backend connection"
      description="Confirms the frontend can reach the API and that the API can reach MongoDB."
    >
      {state.status === 'loading' && <LoadingState message="Contacting API…" />}

      {state.status === 'error' && <ErrorState message={state.error} onRetry={() => void refetch()} />}

      {state.status === 'success' && (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: 'API status', value: state.data.status, ok: state.data.status === 'ok' },
            { label: 'Database', value: state.data.database, ok: state.data.database === 'connected' },
            { label: 'Environment', value: state.data.environment },
            { label: 'Uptime', value: formatUptime(state.data.uptimeSeconds) },
            { label: 'Server time', value: formatDateTime(state.data.timestamp) },
          ].map((row) => (
            <div key={row.label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{row.label}</dt>
              <dd
                className={cx(
                  'mt-1 text-sm font-medium',
                  row.ok === true && 'text-emerald-700',
                  row.ok === false && 'text-amber-700',
                  row.ok === undefined && 'text-slate-900',
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
