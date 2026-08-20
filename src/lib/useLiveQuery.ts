import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

let channelCounter = 0;

interface LiveQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-run the fetcher by hand, e.g. straight after a mutation. */
  refetch: () => Promise<void>;
}

/**
 * Fetch once, then keep the result fresh by refetching whenever any of the given
 * tables change.
 *
 * Refetching wholesale — rather than patching the changed row into local state —
 * is deliberate: most views join `profiles` and derive fields like event status
 * client-side, so a raw changed row isn't enough to update them correctly.
 * Changes are debounced so a burst of writes costs one refetch.
 *
 * @param fetcher  Reads and maps the data. Must be stable (wrap in useCallback).
 * @param tables   `public` table names to watch for inserts, updates and deletes.
 */
export function useLiveQuery<T>(
  fetcher: () => Promise<T>,
  tables: string[]
): LiveQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lets the subscription call the newest fetcher without resubscribing.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Guards against a slow early request overwriting a newer one, and against
  // setting state after the component has gone.
  const requestId = useRef(0);
  const mounted = useRef(true);

  const run = useCallback(async () => {
    const thisRequest = ++requestId.current;
    try {
      const result = await fetcherRef.current();
      if (!mounted.current || thisRequest !== requestId.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (!mounted.current || thisRequest !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      if (mounted.current && thisRequest === requestId.current) setLoading(false);
    }
  }, []);

  // Re-subscribe only when the watched tables actually change, not on every
  // render that happens to build a new array.
  const tableKey = tables.join(',');

  useEffect(() => {
    mounted.current = true;
    run();

    const channel = supabase.channel(`live:${tableKey}:${++channelCounter}`);
    let debounce: ReturnType<typeof setTimeout> | undefined;

    for (const table of tableKey.split(',')) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        clearTimeout(debounce);
        debounce = setTimeout(run, 250);
      });
    }

    channel.subscribe();

    return () => {
      mounted.current = false;
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [tableKey, run]);

  return { data, loading, error, refetch: run };
}
