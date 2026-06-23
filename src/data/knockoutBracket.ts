import type { Match } from './worldCup2026Matches';

export function resolveKnockoutWinner(match: Match): string | null {
  if (match.status !== 'finished') return null;
  if (match.winnerCode) return match.winnerCode;
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return match.homeTeam.code;
  if (match.awayScore > match.homeScore) return match.awayTeam.code;
  return null;
}
