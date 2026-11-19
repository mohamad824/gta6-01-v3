// BRINEHAVEN — shared game data: story, chapters, police, districts, palette.
// All names, places and numbers are original to this game.

// Golden-hour palette sampled from the sunset look we target:
// mauve sky -> pink -> burnt-orange horizon, warm sunlit road, violet shadow.
export const PALETTE = {
  skyTop: 0x985fa2, skyMid: 0xc8758a, skyHorizon: 0xec6a00, sunCore: 0xffd27a,
  roadSun: 0xdf7c40, roadShadow: 0x211d2a, roadLine: 0xf5d76e,
  sidewalk: 0xc98a5e, buildingSun: 0xebe3dc, buildingShade: 0x8a6f7d,
  windowLit: 0xffd27a, waterTeal: 0x2a7f8a, waterDeep: 0x17525e,
  heroCar: 0xff8d4c, cashGreen: 0x87e397, palmGreen: 0x3f8f4a,
  fogWarm: 0xd98a6a, nightSky: 0x1a0f2e, neonPink: 0xff5fa2, neonGreen: 0x4dff9d,
};

export const STORY = {
  city: 'BRINEHAVEN',
  tagline: 'Seven tides. One debt. A whole city to lose the cops in.',
  protagonist: 'Nadia Ferro',
  protagonistRole: 'ex-ferry pilot',
  debt: 12400,
  fixer: 'Bram Okafor',
  antagonist: 'Detective Anselm Greer',
  radio: 'BRINE FM 91.4',
  radioTrack: '"Low Tide" · The Salt Choir',
  carName: 'FERRYMAN GT "GULLWING"',
};

export const CHAPTERS = [
  { n: 1, title: 'First Crossing', payout: 800,  state: 'DONE',   objective: 'Steal the Ferryman GT and cross the causeway at low tide.', next: 'Meet Tess at Gullgate' },
  { n: 2, title: 'Mudflat Run',    payout: 1200, state: 'DONE',   objective: 'Run the mudflat shortcut before the tide turns', next: 'Lose the Wardens in Saltmarket' },
  { n: 3, title: 'The Salt Ledger', payout: 1500, state: 'DONE',   objective: 'Lift the harbour ledger from the Saltmarket office.', next: 'Get the ledger to Bram' },
  { n: 4, title: 'High Water',     payout: 800,  state: 'ACTIVE', objective: 'Cross the flooded causeway before the tide turns', next: 'Reach the Gullgate safehouse' },
  { n: 5, title: 'Causeway Lights', payout: 2000, state: 'LOCKED', objective: 'Outrun the Wardens under the causeway lamps', next: 'Lose Greer before the tide turns' },
  { n: 6, title: 'The Long Night', payout: 2600, state: 'LOCKED', objective: 'Hold the ferry terminal until dawn.', next: '—' },
  { n: 7, title: 'Ebb Tide',       payout: 3400, state: 'LOCKED', objective: 'Settle the $12,400 debt — or settle with Greer.', next: '—' },
];

export const CREW = [
  { name: 'Nadia Ferro',   role: 'PROTAGONIST · ex-ferry pilot' },
  { name: 'Bram Okafor',   role: 'FIXER · the seven jobs' },
  { name: 'Tess Lumen',    role: 'GETAWAY DRIVER' },
  { name: 'Odie Strand',   role: 'MECHANIC · Lampers’ Row garage' },
  { name: 'Pip Halden',    role: 'INFORMANT · Saltmarket' },
  { name: 'Anselm Greer',  role: 'DETECTIVE · Harbour Wardens' },
];

export const REP_LADDER = ['DECKHAND', 'FERRYHAND', 'TIDE RUNNER', 'HARBOUR GHOST'];

// Police roster. Tide/roster consistency is mandatory: grounded cruisers can
// never be shown RAMMING; boats PURSUIT/ROADBLOCK only at high tide, DOCKED
// at low tide. Status is computed from the tide in police.js.
export const POLICE_UNITS = [
  { id: 'WARDEN-4', type: 'CRUISER', kind: 'car' },
  { id: 'SKIFF-2',  type: 'BOAT',    kind: 'boat' },
  { id: 'CUTTER-9', type: 'BOAT',    kind: 'boat' },
  { id: 'TERN-1',   type: 'AIR',     kind: 'heli' },
  { id: 'WARDEN-7', type: 'CRUISER', kind: 'car' },
];

export const DISTRICTS = [
  { name: 'SALTMARKET',  x: -34, z: -18, w: 34, h: 30 },
  { name: 'LOW QUAY',    x: 30,  z: -14, w: 30, h: 26 },
  { name: 'GULLGATE',    x: -32, z: -78, w: 32, h: 30 },
  { name: 'FERRY ROW',   x: 30,  z: -76, w: 30, h: 28 },
  { name: "LAMPERS' ROW", x: -30, z: -128, w: 30, h: 26 },
  { name: 'THE CAUSEWAY', x: 0,  z: -168, w: 22, h: 34 },
];

export const SHOP_SIGNS = [
  'GULLGATE HOTEL', 'SALT & ANCHOR', 'TIDE & TIMBER', 'BRINE FM 91.4',
  'FERRY ROW CAFÉ', "LAMPERS' ROW", 'DRIFT GLASS CO', 'THE LONG NIGHT',
  'GULLWING MOTORS', 'HARBOUR BAIT', 'MUDLARK BOOKS', 'FERRY TERMINAL',
];

export const GARAGE_ITEMS = [
  { n: 1, name: 'ENGINE',   desc: 'Top speed +30% · unlocks at REP 5', price: 5000, dots: 0 },
  { n: 2, name: 'ARMOUR PLATING', desc: 'Takes twice the hits',        price: 1800, dots: 0 },
  { n: 3, name: 'NITRO',    desc: 'SHIFT boost, longer burn',          price: 3000, dots: 0 },
  { n: 4, name: 'REPAIR',   desc: 'Condition back to 100%',            price: 250,  dots: 3 },
  { n: 5, name: 'RESPRAY',  desc: 'New colour, clears wanted level',   price: 100,  dots: 3 },
];

// Cash arc across the four frames (never the kit defaults).
export const CASH = { onfoot: 2760, chase: 5940, garage: 9180 };

export function money(n) { return '$' + n.toLocaleString('en-US'); }
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
