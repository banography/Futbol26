// ─────────────────────────────────────────────────────────────────────────────
// LIVE SCORES: There is no automatic score feed. The app has no live-data
// backend wired up. To reflect real results, manually set each match's
// `status` to 'finished' and fill `homeScore` / `awayScore` with the actual
// scoreline. Until then, all bracket and standings logic treats every match
// as unplayed (status: 'scheduled', scores: null).
// ─────────────────────────────────────────────────────────────────────────────

export type Team = { name: string; code: string; flag: string };

export type Match = {
  id: string;
  matchNumber: number;
  stage: string;
  group?: string;
  dateUtc: string;
  homeTeam: Team;
  awayTeam: Team;
  venue: string;
  city: string;
  country: string;
  status: 'scheduled' | 'live' | 'finished';
  homeScore: number | null;
  awayScore: number | null;
};

// ── Team definitions (reused across multiple matches) ──────────────────────

const MEX: Team = { name: 'Mexico',            code: 'MEX', flag: '🇲🇽' };
const RSA: Team = { name: 'South Africa',       code: 'RSA', flag: '🇿🇦' };
const KOR: Team = { name: 'South Korea',        code: 'KOR', flag: '🇰🇷' };
const CZE: Team = { name: 'Czechia',            code: 'CZE', flag: '🇨🇿' };
const CAN: Team = { name: 'Canada',             code: 'CAN', flag: '🇨🇦' };
const BIH: Team = { name: 'Bosnia and Herzegovina', code: 'BIH', flag: '🇧🇦' };
const USA: Team = { name: 'USA',               code: 'USA', flag: '🇺🇸' };
const PAR: Team = { name: 'Paraguay',           code: 'PAR', flag: '🇵🇾' };
const QAT: Team = { name: 'Qatar',              code: 'QAT', flag: '🇶🇦' };
const SUI: Team = { name: 'Switzerland',        code: 'SUI', flag: '🇨🇭' };
const BRA: Team = { name: 'Brazil',             code: 'BRA', flag: '🇧🇷' };
const MAR: Team = { name: 'Morocco',            code: 'MAR', flag: '🇲🇦' };
const HAI: Team = { name: 'Haiti',              code: 'HAI', flag: '🇭🇹' };
const SCO: Team = { name: 'Scotland',           code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' };
const AUS: Team = { name: 'Australia',          code: 'AUS', flag: '🇦🇺' };
const TUR: Team = { name: 'Türkiye',            code: 'TUR', flag: '🇹🇷' };
const GER: Team = { name: 'Germany',            code: 'GER', flag: '🇩🇪' };
const CUW: Team = { name: 'Curaçao',            code: 'CUW', flag: '🇨🇼' };
const NED: Team = { name: 'Netherlands',        code: 'NED', flag: '🇳🇱' };
const JPN: Team = { name: 'Japan',              code: 'JPN', flag: '🇯🇵' };
const CIV: Team = { name: "Côte d'Ivoire",      code: 'CIV', flag: '🇨🇮' };
const ECU: Team = { name: 'Ecuador',            code: 'ECU', flag: '🇪🇨' };
const SWE: Team = { name: 'Sweden',             code: 'SWE', flag: '🇸🇪' };
const TUN: Team = { name: 'Tunisia',            code: 'TUN', flag: '🇹🇳' };
const ESP: Team = { name: 'Spain',              code: 'ESP', flag: '🇪🇸' };
const CPV: Team = { name: 'Cabo Verde',          code: 'CPV', flag: '🇨🇻' };
const BEL: Team = { name: 'Belgium',            code: 'BEL', flag: '🇧🇪' };
const EGY: Team = { name: 'Egypt',              code: 'EGY', flag: '🇪🇬' };
const KSA: Team = { name: 'Saudi Arabia',       code: 'KSA', flag: '🇸🇦' };
const URU: Team = { name: 'Uruguay',            code: 'URU', flag: '🇺🇾' };
const IRN: Team = { name: 'Iran',               code: 'IRN', flag: '🇮🇷' };
const NZL: Team = { name: 'New Zealand',        code: 'NZL', flag: '🇳🇿' };
const FRA: Team = { name: 'France',             code: 'FRA', flag: '🇫🇷' };
const SEN: Team = { name: 'Senegal',            code: 'SEN', flag: '🇸🇳' };
const IRQ: Team = { name: 'Iraq',               code: 'IRQ', flag: '🇮🇶' };
const NOR: Team = { name: 'Norway',             code: 'NOR', flag: '🇳🇴' };
const ARG: Team = { name: 'Argentina',          code: 'ARG', flag: '🇦🇷' };
const ALG: Team = { name: 'Algeria',            code: 'ALG', flag: '🇩🇿' };
const AUT: Team = { name: 'Austria',            code: 'AUT', flag: '🇦🇹' };
const JOR: Team = { name: 'Jordan',             code: 'JOR', flag: '🇯🇴' };
const POR: Team = { name: 'Portugal',           code: 'POR', flag: '🇵🇹' };
const COD: Team = { name: 'Congo DR',            code: 'COD', flag: '🇨🇩' };
const ENG: Team = { name: 'England',            code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' };
const CRO: Team = { name: 'Croatia',            code: 'CRO', flag: '🇭🇷' };
const GHA: Team = { name: 'Ghana',              code: 'GHA', flag: '🇬🇭' };
const PAN: Team = { name: 'Panama',             code: 'PAN', flag: '🇵🇦' };
const UZB: Team = { name: 'Uzbekistan',         code: 'UZB', flag: '🇺🇿' };
const COL: Team = { name: 'Colombia',           code: 'COL', flag: '🇨🇴' };
const TBD: Team = { name: 'TBD',               code: 'TBD', flag: ''    };

// ── Venue helpers ──────────────────────────────────────────────────────────

type VenueInfo = { venue: string; city: string; country: string };

const V: Record<string, VenueInfo> = {
  AZTECA:   { venue: 'Estadio Azteca',           city: 'Mexico City', country: 'Mexico' },
  AKRON:    { venue: 'Estadio Akron',            city: 'Guadalajara', country: 'Mexico' },
  BBVA:     { venue: 'Estadio BBVA',             city: 'Monterrey',   country: 'Mexico' },
  BMO:      { venue: 'BMO Field',                city: 'Toronto',     country: 'Canada' },
  BC:       { venue: 'BC Place',                 city: 'Vancouver',   country: 'Canada' },
  SOFI:     { venue: 'SoFi Stadium',             city: 'Los Angeles', country: 'USA'    },
  LEVIS:    { venue: "Levi's Stadium",           city: 'Santa Clara', country: 'USA'    },
  METLIFE:  { venue: 'MetLife Stadium',          city: 'New York',    country: 'USA'    },
  GILLETTE: { venue: 'Gillette Stadium',         city: 'Boston',      country: 'USA'    },
  NRG:      { venue: 'NRG Stadium',              city: 'Houston',     country: 'USA'    },
  ATT:      { venue: 'AT&T Stadium',             city: 'Dallas',      country: 'USA'    },
  LUMEN:    { venue: 'Lumen Field',              city: 'Seattle',     country: 'USA'    },
  MERCEDES: { venue: 'Mercedes-Benz Stadium',    city: 'Atlanta',     country: 'USA'    },
  LINCOLN:  { venue: 'Lincoln Financial Field',  city: 'Philadelphia',country: 'USA'    },
  HARD_ROCK:{ venue: 'Hard Rock Stadium',        city: 'Miami',       country: 'USA'    },
  ARROWHEAD:{ venue: 'Arrowhead Stadium',        city: 'Kansas City', country: 'USA'    },
};

function m(
  num: number, stage: string, group: string | undefined,
  dateUtc: string, home: Team, away: Team, venueKey: string,
): Match {
  return {
    id: `wc26-m${String(num).padStart(3, '0')}`,
    matchNumber: num,
    stage,
    ...(group !== undefined ? { group } : {}),
    dateUtc,
    homeTeam: home,
    awayTeam: away,
    ...V[venueKey]!,
    status: 'scheduled',
    homeScore: null,
    awayScore: null,
  };
}

const GS = 'Group Stage';
const R32 = 'Round of 32';
const R16 = 'Round of 16';
const QF = 'Quarterfinal';
const SF = 'Semifinal';
const TP = 'Third Place';
const FIN = 'Final';

export const WC26_MATCHES: Match[] = [
  // ── GROUP STAGE ───────────────────────────────────────────────────────────
  // Group A
  m(  1, GS,'A','2026-06-11T19:00:00Z', MEX, RSA, 'AZTECA'   ),
  m(  2, GS,'A','2026-06-12T02:00:00Z', KOR, CZE, 'AKRON'    ),
  m( 25, GS,'A','2026-06-18T16:00:00Z', CZE, RSA, 'MERCEDES' ),
  m( 28, GS,'A','2026-06-19T01:00:00Z', MEX, KOR, 'AKRON'    ),
  m( 53, GS,'A','2026-06-25T01:00:00Z', RSA, KOR, 'BBVA'     ),
  m( 54, GS,'A','2026-06-25T01:00:00Z', CZE, MEX, 'AZTECA'   ),

  // Group B
  m(  3, GS,'B','2026-06-12T19:00:00Z', CAN, BIH, 'BMO'      ),
  m(  5, GS,'B','2026-06-13T19:00:00Z', QAT, SUI, 'LEVIS'    ),
  m( 26, GS,'B','2026-06-18T19:00:00Z', SUI, BIH, 'SOFI'     ),
  m( 27, GS,'B','2026-06-18T22:00:00Z', CAN, QAT, 'BC'       ),
  m( 49, GS,'B','2026-06-24T19:00:00Z', SUI, CAN, 'BC'       ),
  m( 50, GS,'B','2026-06-24T19:00:00Z', BIH, QAT, 'LUMEN'    ),

  // Group C
  m(  6, GS,'C','2026-06-13T22:00:00Z', BRA, MAR, 'METLIFE'  ),
  m(  7, GS,'C','2026-06-14T01:00:00Z', HAI, SCO, 'GILLETTE' ),
  m( 30, GS,'C','2026-06-19T22:00:00Z', SCO, MAR, 'GILLETTE' ),
  m( 31, GS,'C','2026-06-20T00:30:00Z', BRA, HAI, 'LINCOLN'  ),
  m( 51, GS,'C','2026-06-24T22:00:00Z', MAR, HAI, 'MERCEDES' ),
  m( 52, GS,'C','2026-06-24T22:00:00Z', SCO, BRA, 'HARD_ROCK'),

  // Group D
  m(  4, GS,'D','2026-06-13T01:00:00Z', USA, PAR, 'SOFI'     ),
  m(  8, GS,'D','2026-06-14T04:00:00Z', AUS, TUR, 'BC'       ),
  m( 29, GS,'D','2026-06-19T19:00:00Z', USA, AUS, 'LUMEN'    ),
  m( 32, GS,'D','2026-06-20T03:00:00Z', TUR, PAR, 'LEVIS'    ),
  m( 59, GS,'D','2026-06-26T02:00:00Z', TUR, USA, 'SOFI'     ),
  m( 60, GS,'D','2026-06-26T02:00:00Z', PAR, AUS, 'LEVIS'    ),

  // Group E
  m(  9, GS,'E','2026-06-14T17:00:00Z', GER, CUW, 'NRG'      ),
  m( 11, GS,'E','2026-06-14T23:00:00Z', CIV, ECU, 'LINCOLN'  ),
  m( 34, GS,'E','2026-06-20T20:00:00Z', GER, CIV, 'BMO'      ),
  m( 35, GS,'E','2026-06-21T00:00:00Z', ECU, CUW, 'ARROWHEAD'),
  m( 55, GS,'E','2026-06-25T20:00:00Z', CUW, CIV, 'LINCOLN'  ),
  m( 56, GS,'E','2026-06-25T20:00:00Z', ECU, GER, 'METLIFE'  ),

  // Group F
  m( 10, GS,'F','2026-06-14T20:00:00Z', NED, JPN, 'ATT'      ),
  m( 12, GS,'F','2026-06-15T02:00:00Z', SWE, TUN, 'BBVA'     ),
  m( 33, GS,'F','2026-06-20T17:00:00Z', NED, SWE, 'NRG'      ),
  m( 36, GS,'F','2026-06-21T04:00:00Z', TUN, JPN, 'BBVA'     ),
  m( 57, GS,'F','2026-06-25T23:00:00Z', TUN, NED, 'ARROWHEAD'),
  m( 58, GS,'F','2026-06-25T23:00:00Z', JPN, SWE, 'ATT'      ),

  // Group G
  m( 14, GS,'G','2026-06-15T19:00:00Z', BEL, EGY, 'LUMEN'    ),
  m( 16, GS,'G','2026-06-16T01:00:00Z', IRN, NZL, 'SOFI'     ),
  m( 38, GS,'G','2026-06-21T19:00:00Z', BEL, IRN, 'SOFI'     ),
  m( 40, GS,'G','2026-06-22T01:00:00Z', NZL, EGY, 'BC'       ),
  m( 65, GS,'G','2026-06-27T03:00:00Z', NZL, BEL, 'BC'       ),
  m( 66, GS,'G','2026-06-27T03:00:00Z', EGY, IRN, 'LUMEN'    ),

  // Group H
  m( 13, GS,'H','2026-06-15T16:00:00Z', ESP, CPV, 'MERCEDES' ),
  m( 15, GS,'H','2026-06-15T22:00:00Z', KSA, URU, 'HARD_ROCK'),
  m( 37, GS,'H','2026-06-21T16:00:00Z', ESP, KSA, 'MERCEDES' ),
  m( 39, GS,'H','2026-06-21T22:00:00Z', URU, CPV, 'HARD_ROCK'),
  m( 63, GS,'H','2026-06-27T00:00:00Z', CPV, KSA, 'NRG'      ),
  m( 64, GS,'H','2026-06-27T00:00:00Z', URU, ESP, 'AKRON'    ),

  // Group I
  m( 17, GS,'I','2026-06-16T19:00:00Z', FRA, SEN, 'METLIFE'  ),
  m( 18, GS,'I','2026-06-16T22:00:00Z', IRQ, NOR, 'GILLETTE' ),
  m( 42, GS,'I','2026-06-22T21:00:00Z', FRA, IRQ, 'LINCOLN'  ),
  m( 43, GS,'I','2026-06-23T00:00:00Z', NOR, SEN, 'METLIFE'  ),
  m( 61, GS,'I','2026-06-26T19:00:00Z', NOR, FRA, 'GILLETTE' ),
  m( 62, GS,'I','2026-06-26T19:00:00Z', SEN, IRQ, 'BMO'      ),

  // Group J
  m( 19, GS,'J','2026-06-17T01:00:00Z', ARG, ALG, 'ARROWHEAD'),
  m( 20, GS,'J','2026-06-17T04:00:00Z', AUT, JOR, 'LEVIS'    ),
  m( 41, GS,'J','2026-06-22T17:00:00Z', ARG, AUT, 'ATT'      ),
  m( 44, GS,'J','2026-06-23T03:00:00Z', JOR, ALG, 'LEVIS'    ),
  m( 71, GS,'J','2026-06-28T02:00:00Z', ALG, AUT, 'ARROWHEAD'),
  m( 72, GS,'J','2026-06-28T02:00:00Z', JOR, ARG, 'ATT'      ),

  // Group K
  m( 21, GS,'K','2026-06-17T17:00:00Z', POR, COD, 'NRG'      ),
  m( 24, GS,'K','2026-06-18T02:00:00Z', UZB, COL, 'AZTECA'   ),
  m( 45, GS,'K','2026-06-23T17:00:00Z', POR, UZB, 'NRG'      ),
  m( 48, GS,'K','2026-06-24T02:00:00Z', COL, COD, 'AKRON'    ),
  m( 69, GS,'K','2026-06-27T23:30:00Z', COL, POR, 'HARD_ROCK'),
  m( 70, GS,'K','2026-06-27T23:30:00Z', COD, UZB, 'MERCEDES' ),

  // Group L
  m( 22, GS,'L','2026-06-17T20:00:00Z', ENG, CRO, 'ATT'      ),
  m( 23, GS,'L','2026-06-17T23:00:00Z', GHA, PAN, 'BMO'      ),
  m( 46, GS,'L','2026-06-23T20:00:00Z', ENG, GHA, 'GILLETTE' ),
  m( 47, GS,'L','2026-06-23T23:00:00Z', PAN, CRO, 'BMO'      ),
  m( 67, GS,'L','2026-06-27T21:00:00Z', PAN, ENG, 'METLIFE'  ),
  m( 68, GS,'L','2026-06-27T21:00:00Z', CRO, GHA, 'LINCOLN'  ),

  // ── ROUND OF 32 ───────────────────────────────────────────────────────────
  m( 73, R32, undefined,'2026-06-28T19:00:00Z', TBD, TBD, 'SOFI'     ),
  m( 74, R32, undefined,'2026-06-29T20:30:00Z', TBD, TBD, 'GILLETTE' ),
  m( 75, R32, undefined,'2026-06-30T01:00:00Z', TBD, TBD, 'BBVA'     ),
  m( 76, R32, undefined,'2026-06-29T17:00:00Z', TBD, TBD, 'NRG'      ),
  m( 77, R32, undefined,'2026-06-30T21:00:00Z', TBD, TBD, 'METLIFE'  ),
  m( 78, R32, undefined,'2026-06-30T17:00:00Z', TBD, TBD, 'ATT'      ),
  m( 79, R32, undefined,'2026-07-01T01:00:00Z', TBD, TBD, 'AZTECA'   ),
  m( 80, R32, undefined,'2026-07-01T16:00:00Z', TBD, TBD, 'MERCEDES' ),
  m( 81, R32, undefined,'2026-07-02T00:00:00Z', TBD, TBD, 'LEVIS'    ),
  m( 82, R32, undefined,'2026-07-01T20:00:00Z', TBD, TBD, 'LUMEN'    ),
  m( 83, R32, undefined,'2026-07-02T23:00:00Z', TBD, TBD, 'BMO'      ),
  m( 84, R32, undefined,'2026-07-02T19:00:00Z', TBD, TBD, 'SOFI'     ),
  m( 85, R32, undefined,'2026-07-03T03:00:00Z', TBD, TBD, 'BC'       ),
  m( 86, R32, undefined,'2026-07-03T22:00:00Z', TBD, TBD, 'HARD_ROCK'),
  m( 87, R32, undefined,'2026-07-04T01:30:00Z', TBD, TBD, 'ARROWHEAD'),
  m( 88, R32, undefined,'2026-07-03T18:00:00Z', TBD, TBD, 'ATT'      ),

  // ── ROUND OF 16 ───────────────────────────────────────────────────────────
  m( 89, R16, undefined,'2026-07-04T21:00:00Z', TBD, TBD, 'LINCOLN'  ),
  m( 90, R16, undefined,'2026-07-04T17:00:00Z', TBD, TBD, 'NRG'      ),
  m( 91, R16, undefined,'2026-07-05T20:00:00Z', TBD, TBD, 'METLIFE'  ),
  m( 92, R16, undefined,'2026-07-06T00:00:00Z', TBD, TBD, 'AZTECA'   ),
  m( 93, R16, undefined,'2026-07-06T19:00:00Z', TBD, TBD, 'ATT'      ),
  m( 94, R16, undefined,'2026-07-07T00:00:00Z', TBD, TBD, 'LUMEN'    ),
  m( 95, R16, undefined,'2026-07-07T16:00:00Z', TBD, TBD, 'MERCEDES' ),
  m( 96, R16, undefined,'2026-07-07T20:00:00Z', TBD, TBD, 'BC'       ),

  // ── QUARTERFINALS ────────────────────────────────────────────────────────
  m( 97, QF,  undefined,'2026-07-09T20:00:00Z', TBD, TBD, 'GILLETTE' ),
  m( 98, QF,  undefined,'2026-07-10T19:00:00Z', TBD, TBD, 'SOFI'     ),
  m( 99, QF,  undefined,'2026-07-11T21:00:00Z', TBD, TBD, 'HARD_ROCK'),
  m(100, QF,  undefined,'2026-07-12T01:00:00Z', TBD, TBD, 'ARROWHEAD'),

  // ── SEMIFINALS ───────────────────────────────────────────────────────────
  m(101, SF,  undefined,'2026-07-14T19:00:00Z', TBD, TBD, 'ATT'      ),
  m(102, SF,  undefined,'2026-07-15T19:00:00Z', TBD, TBD, 'MERCEDES' ),

  // ── THIRD PLACE ──────────────────────────────────────────────────────────
  m(103, TP,  undefined,'2026-07-18T21:00:00Z', TBD, TBD, 'HARD_ROCK'),

  // ── FINAL ────────────────────────────────────────────────────────────────
  m(104, FIN, undefined,'2026-07-19T19:00:00Z', TBD, TBD, 'METLIFE'  ),
];
