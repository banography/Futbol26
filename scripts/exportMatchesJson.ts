import * as fs from 'fs';
import * as path from 'path';
import { WC26_MATCHES } from '../src/data/worldCup2026Matches';

const outPath = path.resolve(__dirname, '../public/matches.json');
fs.writeFileSync(outPath, JSON.stringify(WC26_MATCHES, null, 2), 'utf8');
console.log(`Wrote ${WC26_MATCHES.length} matches → ${outPath}`);
