import AsyncStorage from '@react-native-async-storage/async-storage';

export type TeamEntry = { code: string; name: string };

export type MatchupPick = {
  top: TeamEntry | null;
  bot: TeamEntry | null;
  winner: TeamEntry | null;
};

export type BracketPicks = {
  r16: MatchupPick[];  // 8 matchups
  qf:  MatchupPick[];  // 4 matchups
  sf:  MatchupPick[];  // 2 matchups
  fin: MatchupPick[];  // 1 matchup (array-of-1 for type consistency)
  champion: TeamEntry | null;
};

export type BracketState = 'draft' | 'locked';

export type Bracket = {
  id: string;
  state: BracketState;
  lockedAt: string | null;
  picks: BracketPicks;
};

const STORAGE_KEY = 'futbol26_bracket_v1';

function emptyMatchup(): MatchupPick {
  return { top: null, bot: null, winner: null };
}

export function emptyBracket(): Bracket {
  return {
    id: Date.now().toString(),
    state: 'draft',
    lockedAt: null,
    picks: {
      r16: Array.from({ length: 8 }, emptyMatchup),
      qf:  Array.from({ length: 4 }, emptyMatchup),
      sf:  Array.from({ length: 2 }, emptyMatchup),
      fin: [emptyMatchup()],
      champion: null,
    },
  };
}

export async function loadBracket(): Promise<Bracket | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Bracket) : null;
  } catch {
    return null;
  }
}

export async function saveBracket(bracket: Bracket): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bracket));
  } catch {
    // non-fatal
  }
}

export async function deleteBracket(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // non-fatal
  }
}
