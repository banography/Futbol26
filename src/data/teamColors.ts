export interface TeamColors {
  primary: string;
  secondary: string;
}

export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
}

export const TEAM_COLORS: Record<string, TeamColors> = {
  ALG: { primary: '#006233', secondary: '#F2F2F2' },
  ARG: { primary: '#74ACDF', secondary: '#F2F2F2' },
  AUS: { primary: '#FFB81C', secondary: '#00843D' },
  AUT: { primary: '#ED2939', secondary: '#F2F2F2' },
  BEL: { primary: '#EF3340', secondary: '#000000' },
  BIH: { primary: '#002395', secondary: '#FFCD00' },
  BRA: { primary: '#009C3B', secondary: '#FFE000' },
  CAN: { primary: '#FF0000', secondary: '#F2F2F2' },
  CIV: { primary: '#F77F00', secondary: '#F2F2F2' },
  COD: { primary: '#007FFF', secondary: '#FFD100' },
  COL: { primary: '#FCD116', secondary: '#003087' },
  CPV: { primary: '#003893', secondary: '#CF2027' },
  CRO: { primary: '#CC0000', secondary: '#F2F2F2' },
  CUW: { primary: '#002D72', secondary: '#FFD100' },
  CZE: { primary: '#D7141A', secondary: '#F2F2F2' },
  ECU: { primary: '#FFD100', secondary: '#002868' },
  EGY: { primary: '#CE1126', secondary: '#F2F2F2' },
  ENG: { primary: '#EFEFEF', secondary: '#CF081F' },
  ESP: { primary: '#AA151B', secondary: '#F1BF00' },
  FRA: { primary: '#002395', secondary: '#F2F2F2' },
  GER: { primary: '#EFEFEF', secondary: '#111111' },
  GHA: { primary: '#D21034', secondary: '#FCD116' },
  HAI: { primary: '#00209F', secondary: '#D21034' },
  IRN: { primary: '#239F40', secondary: '#F2F2F2' },
  IRQ: { primary: '#CE1126', secondary: '#007A3D' },
  JOR: { primary: '#007A3D', secondary: '#F2F2F2' },
  JPN: { primary: '#000080', secondary: '#F2F2F2' },
  KOR: { primary: '#C60C30', secondary: '#003478' },
  KSA: { primary: '#006C35', secondary: '#F2F2F2' },
  MAR: { primary: '#C1272D', secondary: '#006233' },
  MEX: { primary: '#006847', secondary: '#CE1126' },
  NED: { primary: '#FF6200', secondary: '#F2F2F2' },
  NOR: { primary: '#EF2B2D', secondary: '#F2F2F2' },
  NZL: { primary: '#111111', secondary: '#F2F2F2' },
  PAN: { primary: '#D21034', secondary: '#005293' },
  PAR: { primary: '#D21034', secondary: '#F2F2F2' },
  POR: { primary: '#EE0E00', secondary: '#006600' },
  QAT: { primary: '#8D1B3D', secondary: '#F2F2F2' },
  RSA: { primary: '#FFB81C', secondary: '#007A4D' },
  SCO: { primary: '#003087', secondary: '#F2F2F2' },
  SEN: { primary: '#00853F', secondary: '#FCD116' },
  SUI: { primary: '#FF0000', secondary: '#F2F2F2' },
  SWE: { primary: '#006AA7', secondary: '#FECC02' },
  TUN: { primary: '#E70013', secondary: '#F2F2F2' },
  TUR: { primary: '#E30A17', secondary: '#F2F2F2' },
  URU: { primary: '#5EB6E4', secondary: '#F2F2F2' },
  USA: { primary: '#002868', secondary: '#BF0A30' },
  UZB: { primary: '#0072B5', secondary: '#F2F2F2' },
};

export const DEFAULT_COLORS: TeamColors = {
  primary: '#C8C9CA',
  secondary: '#8B919A',
};

export function getTeamColors(teamCode: string): TeamColors {
  return TEAM_COLORS[teamCode.toUpperCase()] ?? DEFAULT_COLORS;
}
