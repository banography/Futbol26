import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REMOTE_CONFIG_URL } from '../constants/config';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Slot = 'home' | 'away';

export type SeedSource =
  | { kind: 'groupPosition'; group: string; position: 1 | 2 }
  | { kind: 'thirdPlace' };

export type TournamentConfig = {
  schemaVersion: number;
  revision?: number;
  updatedAt?: string;
  /** Override the computed group standings order for specific groups.
   *  Key: group letter ("A"–"L"). Value: ordered array of team codes. */
  groupRankOverrides?: Record<string, string[]>;
  /** Override the list of 8 qualifying third-place teams in slot order. */
  thirdPlaceRankOverride?: string[];
  /** Override the R32 seeding. Key: match id (e.g. "wc26-m073"). */
  r32Seeding?: Record<string, { home: SeedSource; away: SeedSource }>;
  /** Third-place pool matrix.
   *  Outer key: sorted comma-joined group letters of the 8 qualifying groups.
   *  Inner key: match id. Inner value: group letter whose 3rd-place team fills that slot. */
  thirdPlaceMatrix?: Record<string, Record<string, string>>;
  /** Knockout advancement graph.
   *  Key: source match id. Value: where winner/loser of that match go next. */
  knockoutAdvancement?: Record<
    string,
    {
      winnerTo?: { matchId: string; slot: Slot };
      loserTo?:  { matchId: string; slot: Slot };
    }
  >;
};

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: TournamentConfig = {
  schemaVersion: 1,
  groupRankOverrides:    {},
  thirdPlaceRankOverride: [],
  r32Seeding:            {},
  thirdPlaceMatrix:      {},
  knockoutAdvancement:   {},
};

// ── Validation ────────────────────────────────────────────────────────────────

function isValidConfig(data: unknown): data is TournamentConfig {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return false;
  return typeof (data as Record<string, unknown>)['schemaVersion'] === 'number';
}

// ── AsyncStorage persistence ──────────────────────────────────────────────────

const CONFIG_STORAGE_KEY = 'futbol26_config_cache';

async function loadStoredConfig(): Promise<TournamentConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isValidConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveStoredConfig(config: TournamentConfig): void {
  AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config)).catch(() => {});
}

// ── Context ───────────────────────────────────────────────────────────────────

type TournamentConfigContextValue = {
  config: TournamentConfig;
};

const TournamentConfigContext = createContext<TournamentConfigContextValue | null>(null);

export function TournamentConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<TournamentConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    let cancelled = false;

    // Hydrate from storage immediately so config is ready before the remote arrives.
    loadStoredConfig().then(stored => {
      if (cancelled || !stored) return;
      setConfig(stored);
    });

    // Fetch remote config once; no polling (config changes infrequently).
    fetch(REMOTE_CONFIG_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then(json => {
        if (cancelled) return;
        if (!isValidConfig(json)) throw new Error('Invalid config shape');
        setConfig(json);
        saveStoredConfig(json);
      })
      .catch((err: unknown) => {
        if (__DEV__) {
          console.warn(
            '[TournamentConfigContext] Config fetch failed, retaining cached config:',
            err instanceof Error ? err.message : String(err),
          );
        }
        // Retain whatever config is already in state (stored or default).
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TournamentConfigContext.Provider value={{ config }}>
      {children}
    </TournamentConfigContext.Provider>
  );
}

export function useTournamentConfig(): TournamentConfigContextValue {
  const ctx = useContext(TournamentConfigContext);
  if (!ctx) throw new Error('useTournamentConfig must be used within TournamentConfigProvider');
  return ctx;
}
