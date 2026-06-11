// Font family constants for the FUTBOL26 type system.
// Barlow Condensed = display, headers, sport labels
// Inter = body text, data, captions

export const fonts = {
  // Barlow Condensed
  barlowBold: 'BarlowCondensed_700Bold',     // app title, tab labels, team names, scores, round labels, date headers, group labels
  barlowSemi: 'BarlowCondensed_600SemiBold', // section headers, standings col headers, bracket labels, player names, pick buttons
  barlowReg:  'BarlowCondensed_400Regular',  // lighter display labels

  // Inter
  interRegular: 'Inter_400Regular',  // body text, venue/city, broadcast info, helper text, notes, standings detail rows
  interMedium:  'Inter_500Medium',   // stat labels, secondary labels, timestamps
  interSemi:    'Inter_600SemiBold', // positions, dates, points values in standings
} as const;

export type FontName = (typeof fonts)[keyof typeof fonts];
