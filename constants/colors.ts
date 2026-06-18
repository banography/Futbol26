export const PALETTE = [
  '#0A3D22', '#34E6B0', '#9FB80A', '#AEE82A',
  '#9070EC', '#3A0AAE', '#2424E6', '#EC2A0A',
  '#AE0A0A', '#700A0A',
] as const;

export type PaletteColor = (typeof PALETTE)[number];

export const colors = {
  background:      '#F9F7F5',   // warm off-white
  card:            '#FFFFFF',
  cardBorder:      '#E6E1DB',   // warm stone border
  accent:          '#2D6A49',   // deep forest green (replaces harsh olive)
  accentCyan:      '#1C7E60',
  accentPurple:    '#5B45C0',
  textPrimary:     '#171412',   // warm near-black
  textSecondary:   '#5A6474',   // muted slate
  textNavy:        '#1E3A5C',   // deep navy — venue lines, date headers
  textMuted:       '#9BA4AF',
  groupPillBg:     '#E5EDE7',   // soft sage (replaces minty)
  groupPillText:   '#2D6A49',   // matches accent
  liveRed:         '#C0392B',   // warmer red
  divider:         '#EDE9E4',   // soft warm divider
  tabActiveLine:   '#2D6A49',
  tabActiveText:   '#2D6A49',
  tabInactiveText: '#9BA4AF',
  headerBg:        '#FFFFFF',
  watchPillBg:     '#EEF0F8',   // neutral blue-gray
  watchPillText:   '#4A5680',   // slate blue
  amber:           '#B45309',   // amber — 2nd-place / wildcard indicators
  neutralSelected: '#2D2D2D',   // bracket pick selected dark
  neutralUnselected:'#F0F0F0',  // bracket pick unselected bg
  neutralBorder:   '#E0E0E0',   // bracket pick unselected border
  neutralText:     '#6B6B6B',   // bracket pick label text
  toggleActive:    '#EDF1F6',   // active toggle / watch pill bg
} as const;
