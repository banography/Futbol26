import AsyncStorage from '@react-native-async-storage/async-storage';

export type DailyOutcome = 'home' | 'draw' | 'away';

export type DailyPrediction = {
  matchId: string;
  outcome: DailyOutcome | null;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  scorerNote: string;
  userNote: string;
  lockedAt: string | null;
};

export type DailyPredictions = Record<string, DailyPrediction>;

const STORAGE_KEY = 'futbol26_daily_predictions_v1';

export function emptyPrediction(matchId: string): DailyPrediction {
  return {
    matchId,
    outcome: null,
    predictedHomeScore: null,
    predictedAwayScore: null,
    scorerNote: '',
    userNote: '',
    lockedAt: null,
  };
}

export async function loadDailyPredictions(): Promise<DailyPredictions> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as DailyPredictions;
  } catch {
    return {};
  }
}

export async function saveDailyPredictions(predictions: DailyPredictions): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(predictions));
  } catch {
    // non-fatal
  }
}
