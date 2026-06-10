export const PALETTE = [
  '#003C1E', '#3CF0B4', '#96B400', '#B4F01E',
  '#9678F0', '#3C00B4', '#1E1EF0', '#F01E00',
  '#B40000', '#780000',
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
} as const;
