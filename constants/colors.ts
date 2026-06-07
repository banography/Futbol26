export const PALETTE = [
  '#003C1E', '#3CF0B4', '#96B400', '#B4F01E',
  '#9678F0', '#3C00B4', '#1E1EF0', '#F01E00',
  '#B40000', '#780000',
] as const;

export type PaletteColor = (typeof PALETTE)[number];

export const colors = {
  background:       '#040C14',
  card:             '#091622',
  cardBorder:       '#152536',
  accent:           '#B4F01E',
  accentCyan:       '#3CF0B4',
  accentPurple:     '#9678F0',
  textPrimary:      '#FFFFFF',
  textSecondary:    '#7A8FA6',
  textMuted:        '#384E62',
  groupPillBg:      '#132030',
  groupPillText:    '#3CF0B4',
  liveRed:          '#F01E00',
  divider:          '#152536',
  tabActiveLine:    '#B4F01E',
  tabActiveText:    '#B4F01E',
  tabInactiveText:  '#384E62',
  headerBg:         '#020A10',
  watchPillBg:      '#132030',
  watchPillText:    '#9678F0',
} as const;
