import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

/**
 * Runs an async function on mount and exposes loading / success / error state.
 * `fn` must be referentially stable (a module-level function or a useCallback).
 */
export function useAsync<T>(fn: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  const run = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'success', data: await fn() });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    }
  }, [fn]);

  useEffect(() => {
    void run();
  }, [run]);

  return { state, refetch: run };
}
