// Adapts the auto-generated squad data into the shape the UI components expect.
// Do NOT add player data here — run `npm run parse-squads` to regenerate.

import {
  getSquad as _getSquad,
  SQUADS as _SQUADS,
} from './generated/squads.generated';
import type { SquadPlayer } from './generated/squads.generated';

export type PositionCode = 'GK' | 'DF' | 'MF' | 'FW';

export type Player = {
  id: string;
  fullName: string;
  jerseyNumber: number;
  position: PositionCode;
  nameOnShirt: string;
  club: string;
  dateOfBirth: string;
  heightCm: number;
  photoUrl?: string;
};

export type Squad = {
  teamCode: string;
  teamName: string;
  headCoach: string;
  headCoachNationality: string;
  players: Player[];
};

function adaptPlayer(teamCode: string, p: SquadPlayer): Player {
  return {
    id: `${teamCode.toLowerCase()}-${p.jerseyNumber}`,
    fullName: p.fullName,
    jerseyNumber: p.jerseyNumber,
    position: p.position as PositionCode,
    nameOnShirt: p.nameOnShirt,
    club: p.club,
    dateOfBirth: p.dateOfBirth,
    heightCm: p.heightCm,
    photoUrl: p.photoUrl,
  };
}

function adaptSquad(raw: ReturnType<typeof _getSquad>): Squad | null {
  if (!raw) return null;
  return {
    teamCode: raw.teamCode,
    teamName: raw.teamName,
    headCoach: raw.headCoach,
    headCoachNationality: raw.headCoachNationality,
    players: raw.players.map((p) => adaptPlayer(raw.teamCode, p)),
  };
}

export function getSquad(fifaCode: string): Squad | null {
  return adaptSquad(_getSquad(fifaCode.toUpperCase()));
}

export function getAllTeams(): { teamCode: string; teamName: string }[] {
  return _SQUADS
    .map(s => ({ teamCode: s.teamCode, teamName: s.teamName }))
    .sort((a, b) => a.teamName.localeCompare(b.teamName));
}

export const SQUADS: Record<string, Squad> = Object.fromEntries(
  _SQUADS
    .map((s) => adaptSquad(_getSquad(s.teamCode))!)
    .map((s) => [s.teamCode, s])
);
