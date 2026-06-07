export type MatchStatus = 'scheduled' | 'live' | 'final';

export interface Team {
  id: string;
  name: string;
  flagEmoji: string;
  flagUrl: string | null;
  winProbability: number | null;
}

export interface ProjectedPlayer {
  id: string;
  fullName: string;
  jerseyNumber: number | null;
  position: string;
  imageUrl: string | null;
}

export interface WatchOption {
  network: string;
  channel: string | null;
}

export interface MatchScore {
  teamA: number;
  teamB: number;
}

export interface Match {
  id: string;
  date: string;
  label: string;
  time: string;
  group: string;
  matchNumber: number;
  teamA: Team;
  teamB: Team;
  venue: string;
  city: string;
  country: string;
  watchOptions: WatchOption[];
  status: MatchStatus;
  score: MatchScore | null;
  projectedLineups?: {
    teamA: ProjectedPlayer[];
    teamB: ProjectedPlayer[];
  };
}

export interface DateGroup {
  date: string;
  label: string;
  matches: Match[];
}
