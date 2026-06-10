// AUTO-GENERATED — do not edit manually.
// Source: Wikidata API (enrichPlayerWikipedia.ts)
// Re-generate: npm run enrich-wikipedia

export type WikipediaStatus = 'verified' | 'missing' | 'ambiguous';

export interface PlayerWikipediaEntry {
  wikidataId?: string;
  wikipediaUrl?: string;
  wikipediaTitle?: string;
  wikipediaStatus: WikipediaStatus;
}

export const PLAYER_WIKIPEDIA: Record<string, PlayerWikipediaEntry> = {};

export function getWikipediaEntry(
  teamCode: string,
  jerseyNumber: number,
): PlayerWikipediaEntry | undefined {
  return PLAYER_WIKIPEDIA[`${teamCode}_${jerseyNumber}`];
}
