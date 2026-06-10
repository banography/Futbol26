// When EXPO_PUBLIC_API_URL is set this service calls your real backend.
// Otherwise it adapts WC26_MATCHES from the canonical seed into the shape
// that existing UI components expect — no UI changes required.
import type { Match as AppMatch } from '../types/match';
import type { Match as WC26Match, Team as WC26Team } from '../src/data/worldCup2026Matches';
import { WC26_MATCHES } from '../src/data/worldCup2026Matches';
import { formatMatchTime } from '../src/utils/formatMatchTime';

const API_BASE = process.env['EXPO_PUBLIC_API_URL'];

// ── flagcdn.com needs ISO 3166-1 alpha-2 (or subdivision) codes; FIFA uses alpha-3. ─
const FIFA_TO_CDN: Record<string, string> = {
  ALG: 'dz', ARG: 'ar', AUS: 'au', AUT: 'at', BEL: 'be',
  BIH: 'ba', BRA: 'br', CAN: 'ca', CIV: 'ci', COD: 'cd',
  COL: 'co', CPV: 'cv', CRO: 'hr', CUW: 'cw', CZE: 'cz',
  ECU: 'ec', EGY: 'eg', ENG: 'gb-eng', ESP: 'es', FRA: 'fr',
  GER: 'de', GHA: 'gh', HAI: 'ht', IRN: 'ir', IRQ: 'iq',
  JOR: 'jo', JPN: 'jp', KOR: 'kr', KSA: 'sa', MAR: 'ma',
  MEX: 'mx', NED: 'nl', NOR: 'no', NZL: 'nz', PAN: 'pa',
  PAR: 'py', POR: 'pt', QAT: 'qa', RSA: 'za', SCO: 'gb-sct',
  SEN: 'sn', SUI: 'ch', SWE: 'se', TUN: 'tn', TUR: 'tr',
  URU: 'uy', USA: 'us', UZB: 'uz',
  // Non-WC26 teams occasionally appearing in match data
  ALB: 'al',
};

function adaptTeam(team: WC26Team): AppMatch['teamA'] {
  const cdnCode = FIFA_TO_CDN[team.code] ?? team.code.slice(0, 2).toLowerCase();
  return {
    id:              team.code.toLowerCase(),
    name:            team.name,
    flagEmoji:       team.flag,
    flagUrl:         `https://flagcdn.com/w160/${cdnCode}.png`,
    winProbability:  null,
  };
}

// Derive the local calendar date (YYYY-MM-DD) in a given timezone so that
// late-UTC kickoffs (e.g. 03:00 UTC = previous evening ET) group correctly.
function toLocalDate(dateUtc: string, tz = 'America/New_York'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year:     'numeric',
    month:    '2-digit',
    day:      '2-digit',
  }).format(new Date(dateUtc));
}

function adaptMatch(m: WC26Match): AppMatch {
  const date  = toLocalDate(m.dateUtc);
  const time  = formatMatchTime(m.dateUtc, 'America/New_York');
  const label = m.group
    ? `Group ${m.group} · Match ${m.matchNumber}`
    : `${m.stage} · Match ${m.matchNumber}`;

  return {
    id:          m.id,
    date,
    label,
    time,
    group:       m.group ?? '',
    matchNumber: m.matchNumber,
    teamA:       adaptTeam(m.homeTeam),
    teamB:       adaptTeam(m.awayTeam),
    venue:       m.venue,
    city:        m.city,
    country:     m.country,
    watchOptions: [],
    status:      m.status === 'finished' ? 'final' : m.status,
    score:       null,
  };
}

// Adapt once at module load; individual service calls just filter this array.
const ADAPTED_MATCHES: AppMatch[] = WC26_MATCHES.map(adaptMatch);

// ── Public helpers ────────────────────────────────────────────────────────────

/** Return the flagcdn.com image URL for a FIFA three-letter country code. */
export function getFlagUrl(fifaCode: string): string {
  const cdnCode = FIFA_TO_CDN[fifaCode] ?? fifaCode.slice(0, 2).toLowerCase();
  return `https://flagcdn.com/w160/${cdnCode}.png`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getMatchesByDateRange(
  startDate: string,
  endDate: string,
): Promise<AppMatch[]> {
  if (API_BASE) {
    const url = `${API_BASE}/api/worldcup/matches?startDate=${startDate}&endDate=${endDate}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API responded with status ${response.status}`);
    return response.json() as Promise<AppMatch[]>;
  }

  return ADAPTED_MATCHES.filter(
    (m) => m.date >= startDate && m.date <= endDate,
  );
}

export async function getMatchById(matchId: string): Promise<AppMatch | null> {
  if (API_BASE) {
    const url = `${API_BASE}/api/worldcup/matches/${encodeURIComponent(matchId)}`;
    const response = await fetch(url);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`API responded with status ${response.status}`);
    return response.json() as Promise<AppMatch>;
  }

  return ADAPTED_MATCHES.find((m) => m.id === matchId) ?? null;
}
