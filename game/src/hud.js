// HUD updater: every DOM panel in index.html is driven from game state here,
// so the four screenshot frames share one HUD grammar and one source of truth.
import { CHAPTERS, CREW, GARAGE_ITEMS, REP_LADDER, money } from './config.js';
import { tideLabel, clockLabel } from './tide.js';
import { repName, missionProgress } from './missions.js';

const $ = (id) => document.getElementById(id);

function stars(n, total) {
  let s = '';
  for (let i = 0; i < total; i++) s += i < n ? '★' : '<span class="off">★</span>';
  return s;
}

export function buildSlots() {
  const slots = [
    { n: 1, w: 'FISTS', a: '∞', locked: false, active: false },
    { n: 2, w: 'PISTOL', a: '48', locked: false, active: true },
    { n: 3, w: 'WRENCH', a: '—', locked: false, active: false },
    { n: 4, w: 'MOLOTOV', a: '3', locked: false, active: false },
    { n: 5, w: 'SMG', a: 'LOCKED', locked: true, active: false },
  ];
  $('slots').innerHTML = slots.map(s =>
    `<div class="slot${s.locked ? ' locked' : ''}${s.active ? ' active' : ''}">
      <div class="n">${s.n}</div><div class="w">${s.w}</div><div class="a">${s.a}</div></div>`).join('');
  return slots;
}

export function setSlotsOwned(smgOwned) {
  const slots = buildSlots();
  if (smgOwned) {
    const el = document.querySelectorAll('#slots .slot')[4];
    if (el) { el.classList.remove('locked'); el.querySelector('.a').textContent = '120'; }
  }
  return slots;
}

export function updateHud(state) {
  const m = state.missions, tide = state.tide, p = state.player;
  const ch = m.chapters.find(c => c.n === m.current) || CHAPTERS[3];
  $('m-ch').textContent = `CH. ${ch.n} / 7 — ${ch.title.toUpperCase()}`;
  $('m-title').textContent = ch.title;
  $('m-obj').innerHTML = `${ch.objective} · stage <b>${m.stage} of ${m.stages}</b>`;
  const dist = Math.max(12, Math.round(Math.hypot(state.missionTarget.x - p.x, state.missionTarget.z - p.z)));
  const tideH = Math.floor(tide.nextHighIn / 60), tideM = tide.nextHighIn % 60;
  $('m-timer').textContent = state.player.mode === 'onfoot'
    ? `${m.kills}/${m.killsNeeded} DOWN · TARGET ${dist}m`
    : `TARGET ${dist}m · TIDE TURNS IN ${tideH}H ${String(tideM).padStart(2, '0')}M`;
  $('m-pips').innerHTML = Array.from({ length: 5 }, (_, i) =>
    `<i class="${i < m.stage + 1 ? 'on' : ''}"></i>`).join('');
  $('m-next').innerHTML = `NEXT: ${ch.next}`;
  // wanted + cash
  const wanted = state.wanted;
  $('w-stars').innerHTML = stars(wanted, 5);
  $('cash-stars').innerHTML = stars(wanted, 5);
  $('clock').textContent = clockLabel(state.day, tide.minutes);
  $('cash').textContent = money(m.cash);
  $('alertchip').style.display = wanted >= 3 ? 'inline-block' : 'none';
  // tide panel
  const tl = tideLabel(tide);
  $('tide-title').textContent = tl.title;
  $('tide-sub').textContent = tl.sub;
  $('tide-bar').style.width = `${Math.round(tide.level * 100)}%`;
  // roster
  $('roster-cnt').textContent = `${state.roster.length} UNITS`;
  const pillClass = (s) => ({ RAMMING: 'ram', PURSUIT: 'pur', ROADBLOCK: 'rb', SPOTLIGHT: 'sp', DOCKED: 'dk', GROUNDED: 'gr' }[s] || 'pur');
  $('roster-rows').innerHTML = state.roster.map(u =>
    `<div class="unit"><span class="dot${u.type === 'BOAT' ? ' b' : u.type === 'AIR' ? ' a' : ''}"></span>
     <span class="nm">${u.id}</span><span class="ty">${u.type}</span>
     <span class="ds">${u.dist}m</span><span class="pill ${pillClass(u.status)}">${u.status}</span></div>`).join('');
  $('roster-more').textContent = state.rosterMore;
  // bars
  $('bar-hp').style.width = p.health + '%'; $('val-hp').textContent = p.health;
  $('bar-ar').style.width = p.armour + '%'; $('val-ar').textContent = p.armour;
  $('bar-rep').style.width = Math.round((m.rep % 350) / 350 * 100 + 40) + '%';
  $('val-rep').textContent = m.rep;
  $('bar-dg').style.width = Math.round(m.driftGlass / 24 * 100) + '%';
  $('val-dg').textContent = `${m.driftGlass}/24`;
  // district + vehicle (vehicle card hides on foot — the radio stays)
  $('district').innerHTML = `${state.district} &middot; <span>BRINEHAVEN &middot; ${String(Math.floor(tide.minutes / 60)).padStart(2, '0')}:${String(Math.floor(tide.minutes % 60)).padStart(2, '0')}</span>`;
  $('vehicle').style.display = state.player.mode === 'onfoot' ? 'none' : '';
  $('veh-name').textContent = 'FERRYMAN GT "GULLWING"';
  $('veh-cond-n').textContent = p.condition + '%';
  $('veh-fuel').textContent = p.fuel + '%';
  $('veh-cond').style.width = p.condition + '%';
  $('speed').textContent = Math.round(state.speedKmh);
  $('gear').textContent = 'G' + (state.speedKmh < 1 ? 'N' : state.speedKmh < 45 ? '1' : state.speedKmh < 80 ? '2' : state.speedKmh < 120 ? '3' : '4');
  // dialogue
  $('portrait').textContent = state.dialogue.portrait;
  $('dlg-who').innerHTML = `${state.dialogue.who} <span>— ${state.dialogue.role}</span>`;
  $('dlg-line').textContent = state.dialogue.line;
  // radio
  $('radio-st').innerHTML = `♪ ${state.radio}`;
  $('radio-tr').textContent = state.radioTrack;
  // prompt
  $('prompt').classList.toggle('hidden', !state.prompt);
  if (state.prompt) $('prompt').innerHTML = state.prompt;
  // banner
  const b = state.banner;
  $('banner').style.display = b ? 'block' : 'none';
  if (b) { $('banner-1').textContent = b[0]; $('banner-2').textContent = b[1]; $('banner-3').textContent = b[2] || ''; }
  // score popups
  $('popups').innerHTML = state.popups.map(pp =>
    `<div class="pop">${pp.text} <span class="amt">${pp.amt}</span></div>`).join('');
}

export function fillMapOverlay(state) {
  const m = state.missions;
  $('chapters').innerHTML = m.chapters.map(c =>
    `<div class="mrow"><span>CH.${c.n} — ${c.title}</span>
     <span class="st-${c.state === 'DONE' ? 'done' : c.state === 'ACTIVE' ? 'act' : 'lock'}">${c.state} · $${c.payout.toLocaleString('en-US')}</span></div>`).join('');
  $('crew').innerHTML = CREW.map(c =>
    `<div class="crow"><span>${c.name}</span><span style="color:#b9a98c">${c.role}</span></div>`).join('');
  $('stats').innerHTML = [
    ['Cash', money(m.cash)], ['REP', `${repName(m)} · ${m.rep}`],
    ['Missions done', `${m.chapters.filter(c => c.state === 'DONE').length}/7`],
    ['Completion', missionProgress(m) + '%'],
    ['Cars stolen', m.carsStolen], ['Escapes', m.escapes],
    ['Shooting accuracy', m.accuracy + '%'],
    ['Drift Glass', `${m.driftGlass}/24`],
    ['Debt left', money(12400 - m.chapters.filter(c => c.state === 'DONE').reduce((s, c) => s + c.payout, 0))],
    ['Time played', m.timePlayedMin + ' min'],
  ].map(([k, v]) => `<div class="crow"><span>${k}</span><b>${v}</b></div>`).join('');
}

export function fillShop() {
  $('shop-items').innerHTML = GARAGE_ITEMS.map(it =>
    `<div class="item"><span class="no">${it.n}</span>
     <span class="nm">${it.name}<small>${it.desc}</small></span>
     <span class="dots">${[0, 1, 2].map(i => `<i class="${i < it.dots ? 'on' : ''}"></i>`).join('')}</span>
     <span class="pr">$${it.price.toLocaleString('en-US')}</span></div>`).join('');
}
