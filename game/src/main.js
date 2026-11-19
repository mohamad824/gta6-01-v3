// BRINEHAVEN — boot, fixed-step loop, input, cameras, modes, save.
// ?shot=chase|onfoot|map|garage (with &seed=N) stages that scene instead of
// running the loop, renders it, and sets window.__shotReady for a screenshot.
import * as THREE from 'three';
import { PALETTE, STORY, DISTRICTS, money, clamp } from './config.js';
import { mulberry32, hashSeed, range } from './random.js';
import { buildCity, updateCity, canvasTexture } from './world.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPolice, updatePolice, wantedFromHeat } from './police.js';
import { createTide, updateTide } from './tide.js';
import { createMissions, completeChapter, repName, currentChapter } from './missions.js';
import { createPlayer, drivePlayer, walkPlayer, enterCar, exitCar, nearestStealable } from './player.js';
import { drawMinimap, drawFullMap, drawTideChart } from './minimap.js';
import { buildSlots, setSlotsOwned, updateHud, fillMapOverlay, fillShop } from './hud.js';
import { createGarageCar, buyItem } from './garage.js';
import { makePerson } from './vehicles.js';
import { SoundBank } from './audio.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1337;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(PALETTE.fogWarm, 70, 340);

const rng = mulberry32(seed);
const city = buildCity(THREE, rng);
scene.add(city.group);
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 900);

const traffic = createTraffic(THREE, scene, rng);
const police = createPolice(THREE, scene);
const player = createPlayer(THREE, scene);
const garageCars = createGarageCar(THREE, city.group.children.find(c => c.position && c.position.x === 95) || new THREE.Group());
// (garage group is the child at x=95; createGarageCar already added cars to it)
const missions = createMissions();
const tide = createTide(18 * 60 + 42);
const sound = new SoundBank();

// on-foot combatants (Low Quay market)
const enemies = new THREE.Group(); scene.add(enemies);
const muzzleTex = canvasTexture(64, 64, (g) => {
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,240,180,1)'); grad.addColorStop(0.5, 'rgba(255,160,40,0.8)');
  grad.addColorStop(1, 'rgba(255,120,20,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
});
const enemyList = [];
function spawnEnemies() {
  enemies.clear(); enemyList.length = 0;
  const spots = [[-2, -72], [4, -76], [-8, -70]];
  for (const [x, z] of spots) {
    const e = makePerson(0xb03a2a, { gun: true, cap: 0x241a2e });
    e.position.set(x, 0, z); e.rotation.y = 0; // facing +Z, toward Nadia
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.MeshBasicMaterial({ map: muzzleTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    flash.position.set(0.42, 1.35, -0.9); flash.visible = false;
    e.add(flash);
    enemies.add(e);
    enemyList.push({ mesh: e, flash, alive: true, shootT: range(rng, 0.4, 1.4) });
  }
  // two downed Saltjacks on the ground
  for (const [x, z] of [[2, -68], [-5, -74]]) {
    const d = makePerson(0x7a2a1e, { cap: 0x241a2e });
    d.position.set(x, 0.3, z); d.rotation.x = -Math.PI / 2; d.rotation.z = 0.6;
    enemies.add(d);
  }
  city.animated.fires[0].visible = true;
}
spawnEnemies();
enemies.visible = false;
city.animated.fires[0].visible = false;

// drift-glass collectibles (seeded spots near the road)
const driftGlassSpots = [];
for (let i = 0; i < 6; i++) {
  driftGlassSpots.push({ x: range(rng, -6, 6), z: -20 - i * 26, taken: false });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.5),
    new THREE.MeshBasicMaterial({ color: 0x4dff9d }));
  gem.position.set(driftGlassSpots[i].x, 1.1, driftGlassSpots[i].z);
  gem.userData.glass = i;
  scene.add(gem);
  driftGlassSpots[i].mesh = gem;
}

const state = {
  mode: 'title', day: 2, tide, missions, player,
  wanted: 4, roster: [], rosterMore: '+2 more units on the call · 2 officers on foot',
  district: 'THE CAUSEWAY', dialogue: {
    portrait: 'T', who: 'TESS LUMEN', role: 'GETAWAY DRIVER',
    line: '“Hold her steady, Nadia — the water’s up to the lamps and Greer’s boats are faster than they look.”',
  },
  radio: STORY.radio, radioTrack: STORY.radioTrack,
  popups: [], prompt: null, banner: null, speedKmh: 0,
  missionTarget: { x: 0, z: -150 }, wardens: [], driftGlassSpots,
  smgOwned: false,
};

const input = { forward: false, back: false, left: false, right: false, brake: false, nitro: false };
let camYaw = Math.PI; // facing -Z
let mouseDown = false;
let simTime = 0, stepIndex = 0;
let hudTick = 0;

function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (Math.abs(x - d.x) < d.w / 2 + 8 && Math.abs(z - d.z) < d.h / 2 + 8) return d.name;
  }
  // the dockside market stretch on the boulevard reads as Low Quay
  if (Math.abs(x) < 14 && z < -48 && z > -72) return 'LOW QUAY';
  return z < -150 ? 'THE CAUSEWAY' : z < -100 ? "LAMPERS' ROW" : z < -40 ? (x < 0 ? 'GULLGATE' : 'FERRY ROW') : (x < 0 ? 'SALTMARKET' : 'LOW QUAY');
}

function updateRoster() {
  state.roster = updatePolice(police, tide, { x: player.x, z: player.z }, STEP, simTime);
  state.wardens = police.units.map(u => ({ x: u.mesh.position.x, z: u.mesh.position.z }));
  state.rosterMore = tide.phase === 'HIGH'
    ? '+2 more units on the call · 2 officers on foot'
    : '+1 more unit · cruisers on the boulevard';
}

const game = {
  state, player, police, missions, tide, city, traffic,
  shotMode: false,
  refreshRoster() { updateRoster(); },
  setMode(m) {
    state.mode = m;
    document.getElementById('title').style.display = m === 'title' ? 'flex' : 'none';
    document.getElementById('mapov').style.display = m === 'map' ? 'block' : 'none';
    document.getElementById('garageov').style.display = m === 'garage' ? 'block' : 'none';
    // gameplay HUD panels hide on the title screen and under the full map;
    // in the garage the shop panel owns the right side, so the slots, alert
    // chip, tide panel and radio hide too, and the MISSION PASSED banner
    // shifts left so the shop panel never covers it.
    const showGameHud = m !== 'title' && m !== 'map';
    for (const id of ['mission', 'wanted', 'cashbox', 'tide', 'roster', 'miniwrap',
      'dialogue', 'radio', 'vehicle', 'popups', 'controls']) {
      document.getElementById(id).style.display = showGameHud ? '' : 'none';
    }
    for (const id of ['slots', 'alertchip']) {
      document.getElementById(id).style.display = (m === 'garage') ? 'none' : '';
    }
    if (m === 'garage') {
      document.getElementById('tide').style.display = 'none';
      document.getElementById('radio').style.display = 'none';
      document.getElementById('roster').style.display = 'none';
      document.getElementById('banner').style.left = '30%';
    } else {
      document.getElementById('banner').style.left = '50%';
    }
    if (m === 'map') { fillMapOverlay(state); drawFullMap(document.getElementById('mapcanvas'), state); drawTideChart(document.getElementById('tidechart'), tide); }
    if (m === 'garage') { fillShop(); setSlotsOwned(state.smgOwned); this.setNight(true); }
    else this.setNight(false);
    this.updateHudAll();
  },
  setNight(on) {
    const skyMat = city.group.children[0].material;
    if (on) {
      skyMat.uniforms.top.value.setHex(0x1a0f2e);
      skyMat.uniforms.mid.value.setHex(0x2e1a3e);
      skyMat.uniforms.hor.value.setHex(0x3a1a2e);
      scene.fog.color.setHex(0x14101f); scene.fog.near = 20; scene.fog.far = 140;
      city.sun.intensity = 0.12;
    } else {
      skyMat.uniforms.top.value.setHex(PALETTE.skyTop);
      skyMat.uniforms.mid.value.setHex(PALETTE.skyMid);
      skyMat.uniforms.hor.value.setHex(PALETTE.skyHorizon);
      scene.fog.color.setHex(PALETTE.fogWarm); scene.fog.near = 70; scene.fog.far = 340;
      city.sun.intensity = 2.6;
    }
  },
  setupOnFootScene() {
    player.mode = 'onfoot';
    player.x = 0; player.z = -58; player.heading = Math.PI;
    player.nadia.visible = true;
    player.nadia.position.set(0, 0, -58);
    player.nadia.rotation.y = Math.PI;
    player.car.visible = true;
    player.car.position.set(9.5, 0, -64);
    player.car.rotation.y = Math.PI * 0.9;
    enemies.visible = true;
    city.animated.fires[0].visible = true;
    camYaw = Math.PI;
    state.district = 'LOW QUAY';
    state.missionTarget = { x: 4, z: -76 };
  },
  stepSim(dt, s) {
    simTime += dt; stepIndex = s;
    updateTide(tide, dt * 0.25); // game clock runs faster than real time
    updateTraffic(traffic, dt, simTime);
    updateRoster();
    updateCity(city, simTime, dt);
    state.district = districtAt(player.x, player.z);
    state.wanted = wantedFromHeat(player.heat);
    // drift glass pickup (not during staged screenshots)
    for (const dg of driftGlassSpots) {
      if (!dg.taken && !this.shotMode && Math.hypot(dg.x - player.x, dg.z - player.z) < 3.2) {
        dg.taken = true; dg.mesh.visible = false;
        missions.driftGlass += 1;
        state.popups = [{ text: 'DRIFT GLASS', amt: `${missions.driftGlass}/24` }];
        sound.pickup();
      }
      if (dg.mesh.visible) dg.mesh.rotation.y += dt * 2;
    }
    // enemies: muzzle flashes + return fire
    if (enemies.visible) {
      for (const e of enemyList) {
        if (!e.alive) { e.flash.visible = false; continue; }
        e.flash.visible = (s % 14) < 4;
        e.shootT -= dt;
        if (e.shootT <= 0) {
          e.shootT = range(rng, 0.9, 1.8);
          player.health = Math.max(8, player.health - 3);
          player.armour = Math.max(0, player.armour - 2);
        }
      }
    }
    // mission target reached? (not during staged screenshots)
    const ch = currentChapter(missions);
    if (!this.shotMode && ch && ch.state === 'ACTIVE' && state.mode === 'play' && player.mode === 'driving') {
      const d = Math.hypot(state.missionTarget.x - player.x, state.missionTarget.z - player.z);
      if (d < 14) {
        const done = completeChapter(missions);
        if (done) {
          state.banner = ['MISSION PASSED', `+${money(done.chapter.payout)} · +250 REP`, done.next ? `MISSION ${done.next.n} UNLOCKED · ${done.next.title.toUpperCase()}` : 'DEBT CLEARED'];
          sound.cash();
          setTimeout(() => { state.banner = null; }, 4000);
        }
      }
    }
    // police cruiser closes in while wanted
    if (state.wanted >= 3 && state.mode === 'play' && player.mode === 'driving') {
      const c = police.units[0].mesh;
      const dx = player.x - c.position.x, dz = player.z - c.position.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d > 7.6) { c.position.x += dx / d * 12 * dt; c.position.z += dz / d * 12 * dt; }
      c.rotation.y = Math.atan2(dx, dz);
    }
  },
  updateHudAll() {
    updateHud(state);
    drawMinimap(document.getElementById('minimap'), state);
    if (state.mode === 'map') {
      drawFullMap(document.getElementById('mapcanvas'), state);
      drawTideChart(document.getElementById('tidechart'), tide);
    }
  },
  render() {
    // camera per mode
    if (state.mode === 'title') {
      const a = simTime * 0.05;
      camera.position.set(Math.sin(a) * 26, 9, 34 + Math.cos(a) * 8);
      camera.lookAt(0, 2, -20);
    } else if (state.mode === 'garage') {
      camera.position.set(102, 2.2, -23);
      camera.lookAt(95, 1.2, -30);
    } else if (state.mode === 'map') {
      camera.position.set(player.x, 3.2, player.z + 8);
      camera.lookAt(player.x, 1, player.z - 20);
    } else if (player.mode === 'onfoot') {
      camera.position.set(player.x - Math.sin(camYaw) * 5.8, 2.7, player.z - Math.cos(camYaw) * 5.8);
      camera.lookAt(player.x + Math.sin(camYaw) * 8, 1.4, player.z + Math.cos(camYaw) * 8);
    } else {
      const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
      camera.position.set(player.x - fx * 10.5 + 0.3, 2.8, player.z - fz * 10.5);
      camera.lookAt(player.x + fx * 18, 1.7, player.z + fz * 18);
    }
    renderer.render(scene, camera);
  },
};

// ---------- input ----------
const KEYMAP = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'brake', ShiftLeft: 'nitro', ShiftRight: 'nitro' };
window.addEventListener('keydown', (e) => {
  if (KEYMAP[e.code] !== undefined) { input[KEYMAP[e.code]] = true; e.preventDefault(); }
  if (e.code === 'KeyM') game.setMode(state.mode === 'map' ? 'play' : 'map');
  if (e.code === 'KeyG') game.setMode(state.mode === 'garage' ? 'play' : 'garage');
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (state.mode === 'garage' || state.mode === 'map') game.setMode('play');
    else if (state.mode === 'play') game.setMode('title');
  }
  if (e.code === 'KeyE') {
    if (state.mode !== 'play') return;
    if (player.mode === 'driving') { exitCar(player); game.setupOnFootSceneKeepCar(); }
    else {
      const car = nearestStealable(player, traffic);
      if (car) {
        traffic.cars.splice(traffic.cars.indexOf(car), 1);
        scene.remove(car);
        player.heat = Math.min(100, player.heat + 25);
        player.car.material = car.children[0].material;
        player.x = car.position.x; player.z = car.position.z;
        enterCar(player);
        state.banner = ['VEHICLE STOLEN', car.userData.taxi ? 'TAXI — A WITNESS CALLED THE WARDENS' : 'A WITNESS CALLED THE WARDENS', ''];
        setTimeout(() => { state.banner = null; }, 3000);
        sound.pickup();
      }
    }
  }
  if (e.code === 'KeyF') shoot();
  if (e.code === 'KeyN') { sound.radioOn = !sound.radioOn; }
  if (e.code === 'Enter' && state.mode === 'title') startGame(false);
  if (state.mode === 'garage' && ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
    const r = buyItem(state, Number(e.code.slice(5)));
    if (r) { fillShop(); state.banner = r.ok ? ['PURCHASED', r.msg, ''] : ['CAN’T BUY', r.msg, '']; setTimeout(() => { state.banner = null; }, 2500); }
  }
});
window.addEventListener('keyup', (e) => { if (KEYMAP[e.code] !== undefined) input[KEYMAP[e.code]] = false; });
canvas.addEventListener('mousedown', () => { mouseDown = true; sound.ensure(); sound.resume(); });
window.addEventListener('mouseup', () => { mouseDown = false; });
window.addEventListener('mousemove', (e) => { if (mouseDown) camYaw += e.movementX * 0.003; });
canvas.addEventListener('click', () => { if (state.mode === 'play' && player.mode === 'onfoot') shoot(); });
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function shoot() {
  if (state.mode !== 'play' || player.mode !== 'onfoot') return;
  sound.ensure(); sound.shot();
  player.shotsFired += 1;
  let best = null, bestD = 30;
  for (const e of enemyList) {
    if (!e.alive) continue;
    const dx = e.mesh.position.x - player.x, dz = e.mesh.position.z - player.z;
    const d = Math.hypot(dx, dz);
    const ang = Math.abs(Math.atan2(dx, dz) - camYaw);
    if (d < bestD && ang < 0.5) { bestD = d; best = e; }
  }
  if (best) {
    player.shotsHit += 1;
    best.alive = false;
    best.mesh.rotation.x = -Math.PI / 2; best.mesh.position.y = 0.3;
    missions.kills += 1;
    missions.accuracy = Math.round(player.shotsHit / Math.max(1, player.shotsFired) * 100);
    state.popups = [{ text: 'GUNMAN DOWN', amt: '+$120' }];
    missions.cash += 120;
    sound.cash();
  }
}

// keep the hero car where it is when stepping out (live play only)
game.setupOnFootSceneKeepCar = function () {
  player.nadia.position.set(player.x + 2.2, 0, player.z + 1.5);
  enemies.visible = true;
  city.animated.fires[0].visible = true;
  state.missionTarget = { x: player.x + 6, z: player.z - 18 };
};

function startGame(fresh) {
  sound.ensure(); sound.resume();
  if (fresh) {
    missions.cash = 2760; missions.rep = 0; missions.repLevel = 0; missions.current = 1;
    missions.chapters.forEach((c, i) => { c.state = i === 0 ? 'ACTIVE' : 'LOCKED'; });
    player.health = 100; player.armour = 0; player.heat = 5;
    state.wanted = 0; state.day = 1; tide.minutes = 17 * 60 + 45;
    player.x = 0; player.z = 20; player.heading = Math.PI; player.speed = 0;
    enterCar(player);
    state.dialogue = { portrait: 'B', who: 'BRAM OKAFOR', role: 'FIXER',
      line: '“Seven tides, Nadia. First crossing’s free — the rest you earn. Don’t keep the harbour waiting.”' };
  }
  game.setMode('play');
  try { localStorage.setItem('brinehaven-save-v3', JSON.stringify({ cash: missions.cash, rep: missions.rep, chapter: missions.current, day: state.day })); } catch (e) {}
}

document.getElementById('menu-new').addEventListener('click', () => startGame(true));
document.getElementById('menu-continue').addEventListener('click', () => {
  try {
    const s = JSON.parse(localStorage.getItem('brinehaven-save-v3') || 'null');
    if (s) { missions.cash = s.cash; missions.rep = s.rep; missions.current = s.chapter; state.day = s.day; }
  } catch (e) {}
  startGame(false);
});
document.getElementById('menu-how').addEventListener('click', () => {
  state.dialogue = { portrait: 'B', who: 'BRAM OKAFOR', role: 'FIXER',
    line: '“WASD to drive or walk. E to steal a car. F to shoot. SPACE brakes, SHIFT is nitro. M opens the map, G opens Odie’s garage.”' };
  game.setMode('play');
});

// ---------- boot ----------
buildSlots();
setSlotsOwned(false);
fillShop();
game.setMode('title');
updateRoster();

if (shotName) {
  // deterministic shot: no audio, no random input, fixed steps.
  stageShot(game, shotName);
} else {
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    let dt = Math.min(0.25, (now - last) / 1000); last = now;
    if (state.mode === 'play') {
      let acc = dt;
      while (acc > 0) { const h = Math.min(STEP, acc); acc -= h; game.stepSim(h, stepIndex + 1); }
      if (player.mode === 'driving') {
        const r = drivePlayer(player, input, dt);
        state.speedKmh = r.speedKmh;
      } else {
        const r = walkPlayer(player, input, dt, camYaw);
        state.speedKmh = r.speedKmh;
        const car = nearestStealable(player, traffic);
        state.prompt = car ? '<b>E</b> — STEAL CAR' : null;
      }
      sound.setEngine(state.speedKmh, player.mode === 'driving');
      sound.radioTick(dt, state.speedKmh);
      if (state.wanted >= 3) sound.siren(dt);
      hudTick += dt;
      if (hudTick > 0.12) { hudTick = 0; game.updateHudAll(); }
    }
    game.render();
  }
  requestAnimationFrame(loop);
}
