import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REMOTE_MATCHES_URL } from '../constants/config';
import { WC26_MATCHES } from '../src/data/worldCup2026Matches';
import type { Match as WC26Match } from '../src/data/worldCup2026Matches';

// ── Validation ────────────────────────────────────────────────────────────────

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

type ParsedMatchResponse = {
  matches: WC26Match[];
  revision?: number;
  updatedAt?: string;
};

/**
 * Parses and validates remote (or stored) match data.
 *
 * Accepts two formats:
 *   Legacy: [ ...matches ]
 *   New:    { schemaVersion, revision?, updatedAt?, matches: [ ...matches ] }
 *
 * Throws if neither format is valid so callers can fall back safely.
 */
function parseMatchesResponse(json: unknown): ParsedMatchResponse {
  // New wrapper-object format
  if (json !== null && typeof json === 'object' && !Array.isArray(json)) {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj['matches'])) {
      if (!isValidMatchArray(obj['matches'])) {
        throw new Error('matches array failed shape validation');
      }
      const revision  = typeof obj['revision']  === 'number' ? obj['revision']  : undefined;
      const updatedAt = typeof obj['updatedAt'] === 'string'  ? obj['updatedAt'] : undefined;
      return {
        matches: obj['matches'] as WC26Match[],
        ...(revision  !== undefined && { revision  }),
        ...(updatedAt !== undefined && { updatedAt }),
      };
    }
  }
  // Legacy bare-array format
  if (isValidMatchArray(json)) {
    return { matches: json };
  }
  throw new Error('Unrecognised response shape');
}

// ── AsyncStorage persistence ──────────────────────────────────────────────────

const MATCHES_STORAGE_KEY = 'futbol26_matches_cache';

async function loadStoredMatches(): Promise<ParsedMatchResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(MATCHES_STORAGE_KEY);
    if (!raw) return null;
    return parseMatchesResponse(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function saveStoredMatches(parsed: ParsedMatchResponse): void {
  // Fire-and-forget; errors are swallowed to keep the happy path clean.
  AsyncStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(parsed)).catch(() => {});
}

// ── Session-level in-memory cache ─────────────────────────────────────────────

// Survives tab switches within a JS session; cleared on explicit refetch.
let _cache: WC26Match[] | null = null;
// Guards against duplicate in-flight requests when polling fires mid-fetch.
let _fetching = false;

// ── Context ───────────────────────────────────────────────────────────────────

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
  // True once any valid data (remote or stored) has been confirmed this session.
  const hasLoadedRef = useRef(_cache !== null);

  const refetch = useCallback(() => {
    _cache = null;
    setTick(t => t + 1);
  }, []);

  // ── One-time AsyncStorage hydration ───────────────────────────────────────
  // Runs once on first mount. If a session cache already exists this is a
  // no-op. Otherwise it pre-fills the screen while the remote fetch is still
  // in-flight, so users see their last-known-good data immediately.
  useEffect(() => {
    if (_cache !== null) return;

    let cancelled = false;
    loadStoredMatches().then(stored => {
      if (cancelled || !stored) return;
      if (_cache !== null) return; // remote already finished — don't downgrade
      _cache = stored.matches;
      hasLoadedRef.current = true;
      setMatches(stored.matches);
      setLoading(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Remote fetch, re-runs whenever tick changes ────────────────────────────
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
      .then(json => {
        if (cancelled) return;
        const parsed = parseMatchesResponse(json); // throws on invalid shape
        _cache = parsed.matches;
        hasLoadedRef.current = true;
        setMatches(parsed.matches);
        setError(null);
        saveStoredMatches(parsed);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (__DEV__) console.warn('[MatchDataContext] Remote fetch failed, retaining cached data:', msg);
        // Do NOT call setMatches — keep whatever valid data is already on screen.
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

  // ── 60-second polling ──────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(refetch, 60_000);
    return () => clearInterval(id);
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
