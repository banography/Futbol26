// Run with: npm run enrich-bios
// Calls Claude Haiku to generate 2-sentence bios for every player in squads.generated.ts.
// Saves progress to scripts/bioCheckpoint.json every 10 players so it can resume.
// Output: src/data/generated/playerBios.generated.ts

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { SQUADS } from '../src/data/generated/squads.generated';

// ── Config ────────────────────────────────────────────────────────────────────

const MODEL           = 'claude-haiku-4-5-20251001';
const MAX_TOKENS      = 150;
const REQUESTS_PER_S  = 3;
const CHECKPOINT_PATH = path.join(__dirname, 'bioCheckpoint.json');
const OUTPUT_PATH     = path.join(__dirname, '../src/data/generated/playerBios.generated.ts');

// ── Types ─────────────────────────────────────────────────────────────────────

interface Checkpoint {
  bios: Record<string, string>;   // BIO_KEY → bio text
  completedKeys: string[];         // keys finished so far
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bioKey(teamCode: string, jerseyNumber: number): string {
  return `${teamCode}_${jerseyNumber}`;
}

function positionLabel(pos: string): string {
  const map: Record<string, string> = {
   FW: 'Forward', MF: 'Midfielder', DF: 'Defender', GK: 'Goalkeeper',
  };
  return map[pos] ?? pos;
}

function loadCheckpoint(): Checkpoint {
  if (fs.existsSync(CHECKPOINT_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8')) as Checkpoint;
    } catch {
      // corrupt checkpoint — start fresh
    }
  }
  return { bios: {}, completedKeys: [] };
}

function saveCheckpoint(cp: Checkpoint): void {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
}

function writeOutput(bios: Record<string, string>): void {
  const entries = Object.entries(bios)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  "${k}": ${JSON.stringify(v)},`)
    .join('\n');

  const content = `// AUTO-GENERATED — do not edit manually.
// Source: Claude Haiku (${MODEL})
// Re-generate: npm run enrich-bios

export const PLAYER_BIOS: Record<string, string> = {
${entries}
};

export function getBio(teamCode: string, jerseyNumber: number): string | undefined {
  return PLAYER_BIOS[\`\${teamCode}_\${jerseyNumber}\`];
}
`;
  fs.writeFileSync(OUTPUT_PATH, content, 'utf-8');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function progressBar(done: number, total: number, width = 30): string {
  const filled = Math.round((done / total) * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('\n❌  ANTHROPIC_API_KEY not set.\n');
    console.error('    Add it to your .env file or export it before running:\n');
    console.error('      export ANTHROPIC_API_KEY=sk-ant-...\n');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // Flatten all players with their team info
  const allPlayers: { teamCode: string; teamName: string; player: typeof SQUADS[0]['players'][0] }[] = [];
  for (const squad of SQUADS) {
    for (const player of squad.players) {
      allPlayers.push({ teamCode: squad.teamCode, teamName: squad.teamName, player });
    }
  }

  const total = allPlayers.length;
  const cp    = loadCheckpoint();
  const completedSet = new Set(cp.completedKeys);

  const remaining = allPlayers.filter(
    ({ teamCode, player }) => !completedSet.has(bioKey(teamCode, player.jerseyNumber)),
  );

  const done0 = total - remaining.length;
  console.log(`\n🏆  Futbol26 — Player Bio Enrichment`);
  console.log(`    Model  : ${MODEL}`);
  console.log(`    Players: ${total} total · ${done0} already done · ${remaining.length} to go`);
  console.log(`    Rate   : ${REQUESTS_PER_S} req/s · ~${Math.ceil(remaining.length / REQUESTS_PER_S)}s remaining\n`);

  if (remaining.length === 0) {
    console.log('✅  All bios already generated. Writing output...');
    writeOutput(cp.bios);
    console.log(`    → ${OUTPUT_PATH}`);
    return;
  }

  const intervalMs = Math.ceil(1000 / REQUESTS_PER_S);
  let doneTotal    = done0;
  let batchCount   = 0;

  for (const { teamCode, teamName, player } of remaining) {
    const key = bioKey(teamCode, player.jerseyNumber);

    const prompt =
      `Write 2 factual sentences about ${player.fullName}, ` +
      `a professional footballer from ${teamName}. ` +
      `Position: ${positionLabel(player.position)}. ` +
      `Club: ${player.club}. ` +
      `Born: ${player.dateOfBirth}. ` +
      `Be factual and present tense. ` +
      `If you don't know this specific player write based on their position and club. ` +
      `Return ONLY the bio.`;

    let bio = '';
    try {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });
      const block = msg.content[0];
      bio = block.type === 'text' ? block.text.trim() : '';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n  ⚠  API error for ${key}: ${message}`);
      // Store a fallback so we don't retry on resume
      bio = `${player.fullName} is a ${positionLabel(player.position).toLowerCase()} ` +
            `currently playing for ${player.club.replace(/\s*\([^)]+\)\s*$/, '').trim()}.`;
    }

    cp.bios[key] = bio;
    cp.completedKeys.push(key);
    doneTotal++;
    batchCount++;

    // ── Progress line
    const pct  = Math.round((doneTotal / total) * 100);
    const bar  = progressBar(doneTotal, total);
    process.stdout.write(
      `\r  ${bar} ${pct}%  (${doneTotal}/${total})  ${player.fullName.padEnd(28)}`,
    );

    // ── Checkpoint every 10 players
    if (batchCount % 10 === 0) {
      saveCheckpoint(cp);
      // Also write a partial output so the file is always current
      writeOutput(cp.bios);
    }

    // ── Rate limit
    await sleep(intervalMs);
  }

  // Final save
  saveCheckpoint(cp);
  writeOutput(cp.bios);

  console.log(`\n\n✅  Done!  ${doneTotal} bios written to:`);
  console.log(`    ${OUTPUT_PATH}\n`);
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
