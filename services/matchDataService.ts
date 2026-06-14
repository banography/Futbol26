import { useCallback, useEffect, useState } from 'react';
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

type MatchDataResult = {
  matches: WC26Match[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useMatchData(): MatchDataResult {
  const [matches, setMatches]   = useState<WC26Match[]>(_cache ?? WC26_MATCHES);
  const [loading, setLoading]   = useState(_cache === null);
  const [error,   setError]     = useState<string | null>(null);
  const [tick,    setTick]      = useState(0);

  const refetch = useCallback(() => {
    _cache = null;
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    if (_cache !== null) {
      setMatches(_cache);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
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
          setMatches(data);
          setError(null);
        } else {
          throw new Error('Remote data failed shape validation');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[matchDataService] Falling back to bundled data:', msg);
        setMatches(WC26_MATCHES);
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  return { matches, loading, error, refetch };
}

/** Read the current match data (remote cache if loaded, otherwise bundled) by ID. */
export function getMatchByIdRaw(id: string): WC26Match | null {
  return (_cache ?? WC26_MATCHES).find(m => m.id === id) ?? null;
}
