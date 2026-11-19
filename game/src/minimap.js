// Circular minimap (HUD canvas) + the full pause-map canvas. Both draw the
// same island: districts, roads, the causeway, the tide state, the player
// arrow, wardens, drift-glass diamonds and the mission star.
import { DISTRICTS } from './config.js';

// World bounds mapped onto the canvas.
const WX0 = -70, WX1 = 70, WZ0 = -230, WZ1 = 140;

function mapX(x, w) { return ((x - WX0) / (WX1 - WX0)) * w; }
function mapY(z, h) { return ((z - WZ0) / (WZ1 - WZ0)) * h; }

export function drawMinimap(canvas, state) {
  const g = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  // sea
  g.fillStyle = '#17525e'; g.fillRect(0, 0, w, h);
  // island land
  g.fillStyle = '#3a2f45';
  g.beginPath(); g.roundRect(w * 0.18, h * 0.06, w * 0.64, h * 0.88, 26); g.fill();
  // roads
  g.strokeStyle = '#f2ead9'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(mapX(0, w), mapY(120, h)); g.lineTo(mapX(0, w), mapY(-215, h)); g.stroke();
  g.lineWidth = 3;
  for (const z of [-40, 20, 80]) {
    g.beginPath(); g.moveTo(mapX(-52, w), mapY(z, h)); g.lineTo(mapX(52, w), mapY(z, h)); g.stroke();
  }
  // causeway + water gap at the far end
  g.strokeStyle = '#f5d76e'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(mapX(0, w), mapY(-150, h)); g.lineTo(mapX(0, w), mapY(-215, h)); g.stroke();
  // mudflat shortcut (amber) — only drawn at low tide
  if (state.tide.phase === 'LOW') {
    g.strokeStyle = '#b98a4e'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(mapX(8, w), mapY(-150, h)); g.lineTo(mapX(22, w), mapY(-205, h)); g.stroke();
  }
  // district dots
  g.fillStyle = '#9fd8e8';
  for (const d of DISTRICTS) { g.beginPath(); g.arc(mapX(d.x, w), mapY(d.z, h), 3, 0, 7); g.fill(); }
  // drift glass
  g.fillStyle = '#4dff9d';
  for (const dg of state.driftGlassSpots) {
    g.save(); g.translate(mapX(dg.x, w), mapY(dg.z, h)); g.rotate(Math.PI / 4);
    g.fillRect(-3, -3, 6, 6); g.restore();
  }
  // mission star
  g.fillStyle = '#ffd27a';
  const mx = mapX(state.missionTarget.x, w), my = mapY(state.missionTarget.z, h);
  g.beginPath(); g.arc(mx, my, 7, 0, 7); g.fill();
  g.fillStyle = '#241505'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('★', mx, my + 0.5);
  // wardens
  g.fillStyle = '#ff4d4d';
  for (const u of state.wardens) {
    g.beginPath(); g.moveTo(mapX(u.x, w), mapY(u.z, h) - 5);
    g.lineTo(mapX(u.x, w) + 5, mapY(u.z, h) + 4); g.lineTo(mapX(u.x, w) - 5, mapY(u.z, h) + 4);
    g.closePath(); g.fill();
  }
  // player arrow
  const px = mapX(state.player.x, w), py = mapY(state.player.z, h);
  g.save(); g.translate(px, py); g.rotate(state.player.heading);
  g.fillStyle = '#fff'; g.strokeStyle = '#241505'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke();
  g.restore();
  // north tick
  g.fillStyle = '#f2ead9'; g.font = 'bold 13px sans-serif'; g.textAlign = 'left';
  g.fillText('N', 10, 20);
}

export function drawFullMap(canvas, state) {
  const g = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  // sea + land
  const sea = g.createLinearGradient(0, 0, w, h);
  sea.addColorStop(0, '#17525e'); sea.addColorStop(1, '#0d2f3a');
  g.fillStyle = sea; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2c2438';
  g.beginPath(); g.roundRect(w * 0.1, h * 0.05, w * 0.8, h * 0.9, 18); g.fill();
  // district blocks (labels drawn after the roads, with backing, so the
  // road lines never strike through the text)
  for (const d of DISTRICTS) {
    g.fillStyle = '#3a2f45';
    g.fillRect(mapX(d.x - d.w / 2, w), mapY(d.z - d.h / 2, h), (d.w / (WX1 - WX0)) * w, (d.h / (WZ1 - WZ0)) * h);
  }
  // roads
  g.strokeStyle = '#f2ead9'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(mapX(0, w), mapY(120, h)); g.lineTo(mapX(0, w), mapY(-215, h)); g.stroke();
  g.lineWidth = 4;
  for (const z of [-40, 20, 80]) {
    g.beginPath(); g.moveTo(mapX(-52, w), mapY(z, h)); g.lineTo(mapX(52, w), mapY(z, h)); g.stroke();
  }
  // flooded causeway (blue) or mudflat shortcut (amber)
  if (state.tide.phase === 'HIGH') {
    g.strokeStyle = '#3fa7b0'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(mapX(0, w), mapY(-150, h)); g.lineTo(mapX(0, w), mapY(-215, h)); g.stroke();
    g.fillStyle = '#9fd8e8'; g.font = 'bold 15px sans-serif';
    g.fillText('CAUSEWAY FLOODED', mapX(-38, w), mapY(-185, h));
  } else {
    g.strokeStyle = '#b98a4e'; g.lineWidth = 10; g.setLineDash([10, 6]);
    g.beginPath(); g.moveTo(mapX(8, w), mapY(-150, h)); g.lineTo(mapX(24, w), mapY(-205, h)); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#f5b942'; g.font = 'bold 15px sans-serif';
    g.fillText('MUDFLAT SHORTCUT — OPEN', mapX(-30, w), mapY(-185, h));
  }
  // district labels with dark backing — drawn LAST over every road line,
  // so no road or causeway line can strike through the text
  for (const d of DISTRICTS) {
    g.fillStyle = '#ffd27a'; g.font = 'bold 21px "Trebuchet MS", sans-serif'; g.textAlign = 'center';
    const tw = g.measureText(d.name).width;
    const cx = mapX(d.x, w), cy = mapY(d.z, h);
    g.fillStyle = 'rgba(20,14,28,0.88)';
    g.beginPath(); g.roundRect(cx - tw / 2 - 8, cy - 16, tw + 16, 30, 6); g.fill();
    g.fillStyle = '#ffd27a';
    g.fillText(d.name, cx, cy + 6);
  }
  // drift glass
  g.fillStyle = '#4dff9d';
  for (const dg of state.driftGlassSpots) {
    g.save(); g.translate(mapX(dg.x, w), mapY(dg.z, h)); g.rotate(Math.PI / 4);
    g.fillRect(-5, -5, 10, 10); g.restore();
  }
  // garage (a note below Lampers' Row — the garage sits off the drawn
  // island edge, so the label sits in the gap under the district block)
  g.fillStyle = '#ff5fa2'; g.font = 'bold 18px sans-serif'; g.textAlign = 'left';
  g.fillText('⌂ ODIE’S GARAGE', mapX(-12, w), mapY(-104, h));
  // mission star + player
  const mx = mapX(state.missionTarget.x, w), my = mapY(state.missionTarget.z, h);
  g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(mx, my, 11, 0, 7); g.fill();
  g.fillStyle = '#241505'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center';
  g.fillText('★', mx, my + 1);
  const px = mapX(state.player.x, w), py = mapY(state.player.z, h);
  g.save(); g.translate(px, py); g.rotate(state.player.heading);
  g.fillStyle = '#fff'; g.strokeStyle = '#241505'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, -15); g.lineTo(11, 12); g.lineTo(-11, 12); g.closePath(); g.fill(); g.stroke();
  g.restore();
  g.fillStyle = '#fff'; g.font = 'bold 15px sans-serif'; g.textAlign = 'left';
  g.fillText('● YOU — NADIA', px + 16, py + 5);
  // wardens
  g.fillStyle = '#ff4d4d';
  for (const u of state.wardens) {
    g.beginPath(); g.moveTo(mapX(u.x, w), mapY(u.z, h) - 8);
    g.lineTo(mapX(u.x, w) + 8, mapY(u.z, h) + 6); g.lineTo(mapX(u.x, w) - 8, mapY(u.z, h) + 6);
    g.closePath(); g.fill();
  }
}

export function drawTideChart(canvas, tide) {
  const g = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#0d1a24'; g.fillRect(0, 0, w, h);
  // flood line
  g.strokeStyle = '#f5b942'; g.setLineDash([8, 6]); g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, h * 0.32); g.lineTo(w, h * 0.32); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#f5b942'; g.font = 'bold 15px sans-serif'; g.textAlign = 'left';
  g.fillText('CAUSEWAY FLOODS ABOVE THIS LINE', 12, h * 0.32 - 8);
  // tide curve over 24h
  g.strokeStyle = '#9fd8e8'; g.lineWidth = 3; g.beginPath();
  for (let x = 0; x <= w; x += 4) {
    const mins = (x / w) * 1440;
    const cyc = (mins / 360) * Math.PI * 2;
    const lvl = 0.5 + 0.5 * Math.sin(cyc - Math.PI / 2 + 1.15);
    const y = h * 0.85 - lvl * h * 0.62;
    if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  // now marker
  const nx = (tide.minutes / 1440) * w;
  g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(nx, h * 0.85 - tide.level * h * 0.62, 7, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 16px sans-serif';
  g.fillText(`NOW · ${tide.phase} TIDE · next high tide in ${tide.nextHighIn} min`, Math.min(nx + 14, w - 420), 24);
  g.fillStyle = '#9fd8e8'; g.font = '13px sans-serif';
  g.fillText('00:00', 8, h - 8); g.fillText('06:00', w * 0.25, h - 8);
  g.fillText('12:00', w * 0.5, h - 8); g.fillText('18:00', w * 0.75, h - 8);
  g.fillText('24:00', w - 52, h - 8);
}
