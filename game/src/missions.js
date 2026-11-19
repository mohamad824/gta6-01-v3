// Seven chapters, one per tide. Missions are data + a small state machine:
// objectives complete by driving to a marker, clearing enemies, or surviving
// the chase; completing one pays out, raises REP and unlocks the next.
import { CHAPTERS, REP_LADDER } from './config.js';

export function createMissions() {
  return {
    chapters: CHAPTERS.map(c => ({ ...c })),
    current: 4,
    rep: 720, repLevel: 2, // TIDE RUNNER (0 DECKHAND, 1 FERRYHAND, 2 TIDE RUNNER, 3 HARBOUR GHOST)
    cash: 5940,
    driftGlass: 4,
    carsStolen: 3,
    escapes: 2,
    accuracy: 61,
    timePlayedMin: 47,
    kills: 0, killsNeeded: 7,
    stage: 2, stages: 2,
  };
}

export function repName(m) { return REP_LADDER[m.repLevel]; }

export function currentChapter(m) { return m.chapters.find(c => c.n === m.current); }

// Complete the current chapter: payout, REP, advance.
export function completeChapter(m) {
  const ch = currentChapter(m);
  if (!ch || ch.state !== 'ACTIVE') return null;
  ch.state = 'DONE';
  m.cash += ch.payout;
  m.rep += 250;
  if (m.rep >= 950 && m.repLevel < 3) m.repLevel = 3;
  else if (m.rep >= 500 && m.repLevel < 2) m.repLevel = 2;
  else if (m.rep >= 150 && m.repLevel < 1) m.repLevel = 1;
  const next = m.chapters.find(c => c.n === m.current + 1);
  if (next) { next.state = 'ACTIVE'; m.current = next.n; }
  return { chapter: ch, next };
}

export function missionProgress(m) {
  const done = m.chapters.filter(c => c.state === 'DONE').length;
  return Math.round((done / m.chapters.length) * 100);
}
