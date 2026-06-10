// Run with: npm run enrich-wikipedia
// Searches Wikidata for each player in squads.generated.ts.
// Accepts a match only when: P31=Q5 (human) + P106=Q937857 (association football player).
// Uses date-of-birth to break ties when multiple footballers share a name.
// Output: src/data/generated/playerWikipedia.generated.ts

import * as fs from 'fs';
import * as path from 'path';
import { SQUADS } from '../src/data/generated/squads.generated';

// ── Config ─────────────────────────────────────────────────────────────────────

const CHECKPOINT_PATH = path.join(__dirname, 'wikiCheckpoint.json');
const OUTPUT_PATH     = path.join(__dirname, '../src/data/generated/playerWikipedia.generated.ts');
const USER_AGENT      = 'Futbol26Bot/1.0 (enrichPlayerWikipedia.ts; gulatib2003@gmail.com)';
const DELAY_MS        = 1200;  // ~0.8 req/s — well under Wikimedia limits

// Wikidata QIDs
const Q_HUMAN        = 'Q5';
const Q_FOOTBALLER   = 'Q937857';  // association football player

// ── Types ──────────────────────────────────────────────────────────────────────

type WikiStatus = 'verified' | 'missing' | 'ambiguous';

interface WikiEntry {
  wikidataId?: string;
  wikipediaUrl?: string;
  wikipediaTitle?: string;
  wikipediaStatus: WikiStatus;
}

interface Checkpoint {
  entries: Record<string, WikiEntry>;
  completedKeys: string[];
}

interface WikidataSnak {
  snaktype: string;
  datavalue?: {
    type: string;
    value: Record<string, unknown>;
  };
}

interface WikidataClaim {
  mainsnak: WikidataSnak;
}

interface WikidataEntity {
  id: string;
  claims?: Record<string, WikidataClaim[]>;
  sitelinks?: Record<string, { title: string }>;
}

interface SearchResult {
  id: string;
  label?: string;
  description?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function entryKey(teamCode: string, jerseyNumber: number): string {
  return `${teamCode}_${jerseyNumber}`;
}

function loadCheckpoint(): Checkpoint {
  if (fs.existsSync(CHECKPOINT_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8')) as Checkpoint;
    } catch {
      // corrupt — start fresh
    }
  }
  return { entries: {}, completedKeys: [] };
}

function saveCheckpoint(cp: Checkpoint): void {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
}

function writeOutput(entries: Record<string, WikiEntry>): void {
  const lines = Object.entries(entries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  "${k}": ${JSON.stringify(v)},`)
    .join('\n');

  const content = `// AUTO-GENERATED — do not edit manually.
// Source: Wikidata API (enrichPlayerWikipedia.ts)
// Re-generate: npm run enrich-wikipedia

export type WikipediaStatus = 'verified' | 'missing' | 'ambiguous';

export interface PlayerWikipediaEntry {
  wikidataId?: string;
  wikipediaUrl?: string;
  wikipediaTitle?: string;
  wikipediaStatus: WikipediaStatus;
}

export const PLAYER_WIKIPEDIA: Record<string, PlayerWikipediaEntry> = {
${lines}
};

export function getWikipediaEntry(
  teamCode: string,
  jerseyNumber: number,
): PlayerWikipediaEntry | undefined {
  return PLAYER_WIKIPEDIA[\`\${teamCode}_\${jerseyNumber}\`];
}
`;
  fs.writeFileSync(OUTPUT_PATH, content, 'utf-8');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function progressBar(done: number, total: number, width = 30): string {
  const filled = Math.round((done / total) * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
}

// ── Wikidata API ───────────────────────────────────────────────────────────────

async function wbSearch(name: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: name,
    language: 'en',
    type: 'item',
    format: 'json',
    limit: '5',
  });
  const url = `https://www.wikidata.org/w/api.php?${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  const data = await res.json() as { search?: SearchResult[] };
  return (data.search ?? []).map((r) => r.id);
}

async function wbGetEntities(ids: string[]): Promise<Record<string, WikidataEntity>> {
  if (ids.length === 0) return {};
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props: 'claims|sitelinks',
    format: 'json',
  });
  const url = `https://www.wikidata.org/w/api.php?${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  const data = await res.json() as { entities?: Record<string, WikidataEntity> };
  return data.entities ?? {};
}

function getClaimEntityIds(entity: WikidataEntity, property: string): string[] {
  const claims = entity.claims?.[property] ?? [];
  const ids: string[] = [];
  for (const claim of claims) {
    const snak = claim.mainsnak;
    if (snak.snaktype === 'value' && snak.datavalue?.type === 'wikibase-entityid') {
      const id = (snak.datavalue.value as { id: string }).id;
      if (id) ids.push(id);
    }
  }
  return ids;
}

function isFootballer(entity: WikidataEntity): boolean {
  const p31 = getClaimEntityIds(entity, 'P31');
  const p106 = getClaimEntityIds(entity, 'P106');
  return p31.includes(Q_HUMAN) && p106.includes(Q_FOOTBALLER);
}

// Returns "YYYY-MM-DD" or null
function getEntityDob(entity: WikidataEntity): string | null {
  const claims = entity.claims?.['P569'] ?? [];
  for (const claim of claims) {
    const snak = claim.mainsnak;
    if (snak.snaktype === 'value' && snak.datavalue?.type === 'time') {
      const time = (snak.datavalue.value as { time: string }).time;
      const m = time?.match(/^\+(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
    }
  }
  return null;
}

// ── Core lookup ────────────────────────────────────────────────────────────────

async function lookupPlayer(fullName: string, dob: string): Promise<WikiEntry> {
  // Step 1: search by name
  let ids: string[] = [];
  try {
    ids = await wbSearch(fullName);
  } catch {
    return { wikipediaStatus: 'missing' };
  }

  if (ids.length === 0) return { wikipediaStatus: 'missing' };

  // Step 2: fetch entity details (claims + sitelinks)
  let entities: Record<string, WikidataEntity> = {};
  try {
    entities = await wbGetEntities(ids);
  } catch {
    return { wikipediaStatus: 'missing' };
  }

  // Step 3: keep only verified footballers (human + footballer occupation)
  const footballers = Object.values(entities).filter(isFootballer);

  if (footballers.length === 0) return { wikipediaStatus: 'missing' };

  // Step 4: resolve when multiple matches
  let best: WikidataEntity | null = null;
  if (footballers.length === 1) {
    best = footballers[0];
  } else {
    // Try DOB to disambiguate
    const dobMatch = footballers.find((e) => getEntityDob(e) === dob);
    if (dobMatch) {
      best = dobMatch;
    } else {
      // Multiple footballers with same name, no DOB match → ambiguous
      return { wikipediaStatus: 'ambiguous' };
    }
  }

  // Step 5: extract English Wikipedia sitelink
  const enwiki = best.sitelinks?.['enwiki'];
  if (!enwiki?.title) {
    return { wikidataId: best.id, wikipediaStatus: 'missing' };
  }

  const title = enwiki.title;
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

  return {
    wikidataId: best.id,
    wikipediaUrl: url,
    wikipediaTitle: title,
    wikipediaStatus: 'verified',
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const allPlayers: { teamCode: string; fullName: string; dob: string; jerseyNumber: number }[] = [];
  for (const squad of SQUADS) {
    for (const player of squad.players) {
      allPlayers.push({
        teamCode: squad.teamCode,
        fullName: player.fullName,
        dob: player.dateOfBirth,
        jerseyNumber: player.jerseyNumber,
      });
    }
  }

  const total = allPlayers.length;
  const cp    = loadCheckpoint();
  const completedSet = new Set(cp.completedKeys);

  const remaining = allPlayers.filter(
    (p) => !completedSet.has(entryKey(p.teamCode, p.jerseyNumber)),
  );

  const done0 = total - remaining.length;
  console.log('\n🌐  Futbol26 — Player Wikipedia Enrichment');
  console.log(`    Players : ${total} total · ${done0} done · ${remaining.length} to go`);
  console.log(`    Source  : Wikidata API (no API key needed)`);
  console.log(`    Rate    : ~${Math.ceil(1000 / DELAY_MS * 60)} players/min\n`);

  if (remaining.length === 0) {
    console.log('✅  All entries already resolved. Writing output...');
    writeOutput(cp.entries);
    console.log(`    → ${OUTPUT_PATH}`);
    return;
  }

  let doneTotal = done0;
  let batchCount = 0;
  let verified = 0;
  let missing = 0;
  let ambiguous = 0;

  // Count stats from already-completed entries
  for (const entry of Object.values(cp.entries)) {
    if (entry.wikipediaStatus === 'verified') verified++;
    else if (entry.wikipediaStatus === 'ambiguous') ambiguous++;
    else missing++;
  }

  for (const { teamCode, fullName, dob, jerseyNumber } of remaining) {
    const key = entryKey(teamCode, jerseyNumber);

    const entry = await lookupPlayer(fullName, dob);

    if (entry.wikipediaStatus === 'verified') verified++;
    else if (entry.wikipediaStatus === 'ambiguous') ambiguous++;
    else missing++;

    cp.entries[key] = entry;
    cp.completedKeys.push(key);
    doneTotal++;
    batchCount++;

    const pct = Math.round((doneTotal / total) * 100);
    const bar = progressBar(doneTotal, total);
    const status = entry.wikipediaStatus === 'verified' ? '✓' :
                   entry.wikipediaStatus === 'ambiguous' ? '?' : '–';
    process.stdout.write(
      `\r  ${bar} ${pct}%  (${doneTotal}/${total})  [${status}] ${fullName.padEnd(28)}`,
    );

    if (batchCount % 10 === 0) {
      saveCheckpoint(cp);
      writeOutput(cp.entries);
    }

    await sleep(DELAY_MS);
  }

  saveCheckpoint(cp);
  writeOutput(cp.entries);

  const vPct = Math.round((verified / total) * 100);
  console.log(`\n\n✅  Done!`);
  console.log(`    Verified : ${verified} (${vPct}%)`);
  console.log(`    Ambiguous: ${ambiguous}`);
  console.log(`    Missing  : ${missing}`);
  console.log(`    Output   : ${OUTPUT_PATH}\n`);
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
