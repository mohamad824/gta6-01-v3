// BRINEHAVEN — the entry program (Node 22, standard library only).
// It hands the game in: copy this directory's game/ and screenshots/ into
// /output (or MAKEFUN_OUTPUT_DIR outside the grader) and write
// /output/dossier.json with the vendored make.fun library, so the judge
// reads the game exactly as it is built here. No network, no build step:
// the game is plain static files a desktop browser loads offline.
//
// Check it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// and play it with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
// Copy only the four named screenshots, never the whole directory: a stray
// file left in screenshots/ (a probe capture, a scratch render) must not
// leak into the entry and trip the scorer's 4-screenshot cap.
const SHOTS = ['1-chase.jpg', '2-onfoot.jpg', '3-map.jpg', '4-garage.jpg'];
let copied = 0;
for (const name of SHOTS) {
  const src = join(here, 'screenshots', name);
  if (existsSync(src)) { cpSync(src, join(out, 'screenshots', name)); copied++; }
  else console.error(`warning: missing screenshot ${name}`);
}

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the
// dossier's bytes; the rest refuse an entry the scorer would refuse — more
// than 4 screenshots or one over 256 KiB; more than 993 files in game/ or
// 48 MiB of game files in all; a path under game/ over 1000 bytes. game/
// counts beside /output's own 1000-entry cap, its screenshots/ and
// dossier.json, so the entry leaves them room.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
