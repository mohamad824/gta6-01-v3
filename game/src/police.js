// Wanted level + Harbour Wardens response. The roster is tide-consistent:
// at high tide boats PURSUIT/ROADBLOCK and cruisers are GROUNDED (they can
// never be shown RAMMING); at low tide cruisers chase and boats are DOCKED.
// The helicopter always runs SPOTLIGHT. Distances are live, in metres.
import * as THREE from 'three';
import { POLICE_UNITS } from './config.js';
import { makeCar, makeBoat, makeHelicopter } from './vehicles.js';

export function createPolice(THREE, scene) {
  const units = [];
  // WARDEN-4 cruiser RIGHT behind the player car (the cover's imminent contact)
  const cruiser = makeCar(0x1c2f4a, { police: true, cabinColor: 0xf2ead9 });
  cruiser.position.set(0.9, 0, 8.2);
  cruiser.rotation.y = Math.PI;
  scene.add(cruiser);
  units.push({ def: POLICE_UNITS[0], mesh: cruiser, dist: 6, status: 'GROUNDED' });
  // second cruiser ahead-right, boxing in
  const cruiser2 = makeCar(0x1c2f4a, { police: true, cabinColor: 0xf2ead9 });
  cruiser2.position.set(4.6, 0, -18);
  cruiser2.rotation.y = Math.PI;
  scene.add(cruiser2);
  units.push({ def: POLICE_UNITS[4], mesh: cruiser2, dist: 22, status: 'GROUNDED' });
  // boats on the water flanks
  const boat1 = makeBoat(0x1c2f4a); boat1.position.set(-26, 0.1, -52); boat1.rotation.y = Math.PI * 0.9;
  scene.add(boat1);
  units.push({ def: POLICE_UNITS[1], mesh: boat1, dist: 31, status: 'PURSUIT' });
  const boat2 = makeBoat(0x24365a); boat2.position.set(30, 0.1, -96); boat2.rotation.y = -Math.PI * 0.85;
  scene.add(boat2);
  units.push({ def: POLICE_UNITS[2], mesh: boat2, dist: 58, status: 'ROADBLOCK' });
  // TERN-1 helicopter, large, upper-centre-left, searchlight on the road.
  // It flies low over the boulevard (not inside the building row) so the
  // chase camera can see it against the sunset.
  const heli = makeHelicopter();
  heli.position.set(-8, 14, -30);
  heli.scale.setScalar(1.35);
  heli.userData.baseY = 14; heli.userData.baseX = -8;
  // shorten the searchlight cone + pool to the new flight height
  if (heli.userData.cone) { heli.userData.cone.scale.y = 0.55; heli.userData.cone.position.y = -6.2; }
  if (heli.userData.pool) heli.userData.pool.position.y = -11.9;
  scene.add(heli);
  units.push({ def: POLICE_UNITS[3], mesh: heli, dist: 17, status: 'SPOTLIGHT' });
  return { units, heli };
}

// Recompute roster statuses from the tide. Returns the roster rows for the HUD.
export function updatePolice(police, tide, playerPos, dt, t) {
  const high = tide.phase === 'HIGH';
  for (const u of police.units) {
    if (u.def.kind === 'car') {
      u.status = high ? 'GROUNDED' : (u.dist < 12 ? 'RAMMING' : 'PURSUIT');
    } else if (u.def.kind === 'boat') {
      u.status = high ? (u.def.id === 'SKIFF-2' ? 'PURSUIT' : 'ROADBLOCK') : 'DOCKED';
    } else {
      u.status = 'SPOTLIGHT';
    }
    // live distance from the player (metres), jittered slightly
    if (u.mesh) {
      const dx = u.mesh.position.x - playerPos.x;
      const dz = u.mesh.position.z - playerPos.z;
      u.dist = Math.max(4, Math.round(Math.sqrt(dx * dx + dz * dz)));
    }
  }
  // helicopter bobs and its rotor spins; the searchlight sweeps a little
  const heli = police.heli;
  const baseY = heli.userData.baseY || 14, baseX = heli.userData.baseX || -8;
  heli.position.y = baseY + Math.sin(t * 0.8) * 0.5;
  heli.position.x = baseX + Math.sin(t * 0.4) * 1.2;
  if (heli.userData.rotor) heli.userData.rotor.rotation.y += dt * 22;
  if (heli.userData.tailRotor) heli.userData.tailRotor.rotation.z += dt * 30;
  // police light bars flash red/blue, alternating
  const flash = Math.floor(t * 4) % 2 === 0;
  for (const u of police.units) {
    if (!u.mesh.userData.lightRed) continue;
    u.mesh.userData.lightRed.material.color.setHex(flash ? 0xff2a2a : 0x550000);
    u.mesh.userData.lightBlue.material.color.setHex(flash ? 0x0a2a66 : 0x2a7fff);
  }
  // boats bob on the water
  for (const u of police.units) {
    if (u.def.kind === 'boat') {
      u.mesh.position.y = 0.1 + Math.sin(t * 1.3 + u.dist) * 0.12;
      u.mesh.rotation.z = Math.sin(t * 1.1 + u.dist) * 0.03;
    }
  }
  return police.units.map(u => ({
    id: u.def.id, type: u.def.type, dist: u.dist, status: u.status,
  }));
}

// Wanted stars from heat: 0..5.
export function wantedFromHeat(heat) {
  if (heat < 10) return 0;
  if (heat < 30) return 1;
  if (heat < 55) return 2;
  if (heat < 75) return 3;
  if (heat < 90) return 4;
  return 5;
}
