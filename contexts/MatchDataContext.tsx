import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { REMOTE_MATCHES_URL } from '../constants/config';
import { WC26_MATCHES } from '../src/data/worldCup2026Matches';
import type { Match as WC26Match } from '../src/data/worldCup2026Matches';

const VALID_STATUSES = new Set(['scheduled', 'live', 'finished']);

function isValidMatchArray(data: unknown): data is WC26Match[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0] as Record<string, unknown>;
  return (
    typeof first['id']      === 'string' &&
    typeof first['dateUtc'] === 'string' &&
    typeof first['status']  === 'string' && VALID_STATUSES.has(first['status']) &&
    typeof (first['homeTeam'] as Record<string, unknown>)?.['code'] === 'string'
  );
}

// Session-level cache — survives tab switches, cleared on explicit refetch.
let _cache: WC26Match[] | null = null;
// Prevents duplicate in-flight requests when polling fires while a fetch is active.
let _fetching = false;

export type MatchDataContextValue = {
  matches: WC26Match[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refetch: () => void;
};

const MatchDataContext = createContext<MatchDataContextValue | null>(null);

export function MatchDataProvider({ children }: { children: React.ReactNode }) {
  const [matches,    setMatches]    = useState<WC26Match[]>(_cache ?? WC26_MATCHES);
  const [loading,    setLoading]    = useState(_cache === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [tick,       setTick]       = useState(0);
  // True once any fetch has completed at least once; separates initial load from refresh.
  const hasLoadedRef = useRef(_cache !== null);

  const refetch = useCallback(() => {
    _cache = null;
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    if (_cache !== null) {
      setMatches(_cache);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (_fetching) return;

    let cancelled = false;
    _fetching = true;

    if (hasLoadedRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    fetch(REMOTE_MATCHES_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then(data => {
        if (cancelled) return;
        if (isValidMatchArray(data)) {
          _cache = data;
          hasLoadedRef.current = true;
          setMatches(data);
          setError(null);
        } else {
          throw new Error('Remote data failed shape validation');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (__DEV__) console.warn('[MatchDataContext] Falling back to bundled data:', msg);
        setMatches(WC26_MATCHES);
        setError(msg);
      })
      .finally(() => {
        _fetching = false;
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => { cancelled = true; };
  }, [tick]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      refetch();
    }, 60_000);
    return () => clearInterval(intervalId);
  }, [refetch]);

  return (
    <MatchDataContext.Provider value={{ matches, loading, refreshing, error, refetch }}>
      {children}
    </MatchDataContext.Provider>
  );
}

export function useMatchData(): MatchDataContextValue {
  const ctx = useContext(MatchDataContext);
  if (!ctx) throw new Error('useMatchData must be used within MatchDataProvider');
  return ctx;
}
