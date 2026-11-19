// The tide cycle: the causeway floods and drains twice a day on a visible
// clock. High tide -> boats out, cruisers grounded, causeway underwater.
// Low tide -> mudflats open a smuggler's shortcut the map marks in real time.
export const TIDE_PERIOD_MIN = 360; // 6h per full flood/drain cycle

export function createTide(startMinutes) {
  // startMinutes: minutes since 00:00. High tide at 18:42 in the chase scene.
  return { minutes: startMinutes, phase: 'HIGH', nextHighIn: 359, level: 1 };
}

// level 1 = fully flooded, 0 = fully drained. Sine over the 6h cycle.
export function updateTide(tide, dtMin) {
  tide.minutes = (tide.minutes + dtMin) % 1440;
  const cyc = (tide.minutes / TIDE_PERIOD_MIN) * Math.PI * 2;
  tide.level = 0.5 + 0.5 * Math.sin(cyc - Math.PI / 2 + 1.15);
  tide.phase = tide.level > 0.55 ? 'HIGH' : tide.level < 0.45 ? 'LOW' : 'TURNING';
  // minutes until the next high tide (level peak)
  const peak = ((Math.PI / 2 - 1.15 + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * TIDE_PERIOD_MIN;
  let toPeak = (peak - (tide.minutes % TIDE_PERIOD_MIN) + TIDE_PERIOD_MIN) % TIDE_PERIOD_MIN;
  if (toPeak < 1) toPeak += TIDE_PERIOD_MIN;
  tide.nextHighIn = Math.round(toPeak);
  return tide;
}

export function tideLabel(tide) {
  const hh = String(Math.floor(tide.minutes / 60)).padStart(2, '0');
  const mm = String(Math.floor(tide.minutes % 60)).padStart(2, '0');
  if (tide.phase === 'HIGH') return { title: `HIGH TIDE ${hh}:${mm}`, sub: 'CAUSEWAY FLOODED — boats out, cruisers grounded' };
  if (tide.phase === 'LOW') return { title: `LOW TIDE ${hh}:${mm}`, sub: 'MUDFLATS OPEN — smuggler’s shortcut marked on the map' };
  return { title: `TIDE TURNING ${hh}:${mm}`, sub: 'Water rising on the causeway — move now' };
}

export function clockLabel(day, minutes) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(Math.floor(minutes % 60)).padStart(2, '0');
  return `DAY ${day} · ${hh}:${mm} · BRINEHAVEN`;
}
