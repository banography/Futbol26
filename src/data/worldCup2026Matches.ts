// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL WORLD CUP 2026 MATCH DATA
// Source of truth for all match fixtures in the app.
//
// Rules:
//  - Only add matches that are officially confirmed by FIFA.
//  - dateUtc must be an ISO-8601 UTC string (YYYY-MM-DDTHH:mm:ssZ).
//  - Do NOT invent pairings, venues, or times — leave future matches as a TODO.
//  - flag: use the flag emoji for the team's nation.
//  - code: three-letter FIFA country code.
// ─────────────────────────────────────────────────────────────────────────────

export type Team = {
  name: string;
  code: string;
  flag: string;
};

export type Match = {
  id: string;
  matchNumber: number;
  stage: 'Group Stage' | 'Round of 32' | 'Round of 16' | 'Quarterfinal' | 'Semifinal' | 'Third Place' | 'Final';
  group?: string;
  dateUtc: string;
  homeTeam: Team;
  awayTeam: Team;
  venue: string;
  city: string;
  country: string;
  status: 'scheduled' | 'live' | 'finished';
};

export const WC26_MATCHES: Match[] = [
  // ── MATCH 1 ─ GROUP A ─ June 11, 2026 ────────────────────────────────────
  {
    id: 'wc26-m001',
    matchNumber: 1,
    stage: 'Group Stage',
    group: 'A',
    dateUtc: '2026-06-11T19:00:00Z',
    homeTeam: { name: 'Mexico',       code: 'MEX', flag: '🇲🇽' },
    awayTeam: { name: 'South Africa', code: 'RSA', flag: '🇿🇦' },
    venue: 'Estadio Azteca',
    city: 'Mexico City',
    country: 'Mexico',
    status: 'scheduled',
  },
  // ── MATCH 2 ─ GROUP A ─ June 12, 2026 (03:00 UTC = June 11 11 PM ET) ─────
  {
    id: 'wc26-m002',
    matchNumber: 2,
    stage: 'Group Stage',
    group: 'A',
    dateUtc: '2026-06-12T03:00:00Z',
    homeTeam: { name: 'Korea Republic', code: 'KOR', flag: '🇰🇷' },
    awayTeam: { name: 'Czechia',        code: 'CZE', flag: '🇨🇿' },
    venue: 'Estadio Akron',
    city: 'Guadalajara',
    country: 'Mexico',
    status: 'scheduled',
  },
  // ── MATCH 3 ─ GROUP B ─ June 12, 2026 ────────────────────────────────────
  {
    id: 'wc26-m003',
    matchNumber: 3,
    stage: 'Group Stage',
    group: 'B',
    dateUtc: '2026-06-12T19:00:00Z',
    homeTeam: { name: 'Canada',                 code: 'CAN', flag: '🇨🇦' },
    awayTeam: { name: 'Bosnia and Herzegovina', code: 'BIH', flag: '🇧🇦' },
    venue: 'BMO Field',
    city: 'Toronto',
    country: 'Canada',
    status: 'scheduled',
  },
  // ── MATCH 4 ─ GROUP D ─ June 13, 2026 (01:00 UTC = June 12 9 PM ET) ──────
  {
    id: 'wc26-m004',
    matchNumber: 4,
    stage: 'Group Stage',
    group: 'D',
    dateUtc: '2026-06-13T01:00:00Z',
    homeTeam: { name: 'USA',      code: 'USA', flag: '🇺🇸' },
    awayTeam: { name: 'Paraguay', code: 'PAR', flag: '🇵🇾' },
    venue: 'SoFi Stadium',
    city: 'Los Angeles',
    country: 'USA',
    status: 'scheduled',
  },
  // ── MATCH 5 ─ GROUP B ─ June 13, 2026 ────────────────────────────────────
  {
    id: 'wc26-m005',
    matchNumber: 5,
    stage: 'Group Stage',
    group: 'B',
    dateUtc: '2026-06-13T19:00:00Z',
    homeTeam: { name: 'Argentina', code: 'ARG', flag: '🇦🇷' },
    awayTeam: { name: 'Albania',   code: 'ALB', flag: '🇦🇱' },
    venue: 'MetLife Stadium',
    city: 'East Rutherford',
    country: 'USA',
    status: 'scheduled',
  },
  // ── MATCH 6 ─ GROUP C ─ June 14, 2026 (01:00 UTC = June 13 9 PM ET) ──────
  {
    id: 'wc26-m006',
    matchNumber: 6,
    stage: 'Group Stage',
    group: 'C',
    dateUtc: '2026-06-14T01:00:00Z',
    homeTeam: { name: 'Spain',  code: 'ESP', flag: '🇪🇸' },
    awayTeam: { name: 'Brazil', code: 'BRA', flag: '🇧🇷' },
    venue: 'AT&T Stadium',
    city: 'Dallas',
    country: 'USA',
    status: 'scheduled',
  },

  // TODO: Add remaining group stage matches once officially confirmed by FIFA.
  // TODO: Add Round of 32 / Round of 16 / Quarterfinal / Semifinal / Final fixtures.
];
