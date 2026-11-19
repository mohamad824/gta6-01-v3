// Vehicle + person builders. Every model is boxes, cylinders and planes
// assembled in code — no imported art. Colours are flat and warm so the
// golden-hour sun does the shading.
import * as THREE from 'three';
import { PALETTE } from './config.js';

const box = new THREE.BoxGeometry(1, 1, 1);

function lam(color, extra) {
  return new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {}));
}

function wheel(r) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.34, 12), lam(0x14101c));
  w.rotation.z = Math.PI / 2;
  return w;
}

// A low-poly car: body + cabin + wheels + lights. ~4.6 long, 2 wide.
export function makeCar(color, opts) {
  const o = opts || {};
  const g = new THREE.Group();
  const body = new THREE.Mesh(box, lam(color));
  body.scale.set(2.0, 0.62, 4.6); body.position.y = 0.55; body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(box, lam(o.cabinColor || 0x2c2438));
  cabin.scale.set(1.7, 0.55, 2.3); cabin.position.set(0, 1.08, -0.25); cabin.castShadow = true;
  g.add(cabin);
  const nose = new THREE.Mesh(box, lam(color));
  nose.scale.set(1.9, 0.34, 0.7); nose.position.set(0, 0.42, -2.35); g.add(nose);
  // headlights (warm) + taillights (red)
  const hl = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const sx of [-0.7, 0.7]) {
    const h = new THREE.Mesh(box, hl); h.scale.set(0.34, 0.16, 0.08);
    h.position.set(sx, 0.55, -2.72); g.add(h);
  }
  const tl = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const sx of [-0.7, 0.7]) {
    const t = new THREE.Mesh(box, tl); t.scale.set(0.4, 0.14, 0.08);
    t.position.set(sx, 0.62, 2.32); g.add(t);
  }
  const wheelPos = [[-0.95, -1.55], [0.95, -1.55], [-0.95, 1.55], [0.95, 1.55]];
  for (const [x, z] of wheelPos) { const w = wheel(0.42); w.position.set(x, 0.42, z); g.add(w); }
  if (o.police) {
    const bar = new THREE.Mesh(box, lam(0x11131a));
    bar.scale.set(1.2, 0.16, 0.4); bar.position.set(0, 1.44, -0.25); g.add(bar);
    const red = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    red.scale.set(0.5, 0.2, 0.42); red.position.set(-0.3, 1.56, -0.25); g.add(red);
    const blue = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0x2a7fff }));
    blue.scale.set(0.5, 0.2, 0.42); blue.position.set(0.3, 1.56, -0.25); g.add(blue);
    g.userData.lightRed = red; g.userData.lightBlue = blue;
  }
  if (o.taxi) {
    const sign = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    sign.scale.set(0.7, 0.18, 0.5); sign.position.set(0, 1.42, -0.25); g.add(sign);
  }
  return g;
}

// Police boat: hull + cabin + mast + blue light.
export function makeBoat(color) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(box, lam(color || 0x1c2f4a));
  hull.scale.set(2.2, 0.9, 6.4); hull.position.y = 0.5; hull.castShadow = true; g.add(hull);
  const bow = new THREE.Mesh(box, lam(color || 0x1c2f4a));
  bow.scale.set(1.8, 0.7, 1.6); bow.position.set(0, 0.45, -3.6); bow.rotation.x = 0.18; g.add(bow);
  const cab = new THREE.Mesh(box, lam(0xf2ead9));
  cab.scale.set(1.7, 1.1, 2.2); cab.position.set(0, 1.4, 0.4); g.add(cab);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 6), lam(0x8a8f96));
  mast.position.set(0, 2.9, 0.4); g.add(mast);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0x2a7fff }));
  lamp.position.set(0, 4.2, 0.4); g.add(lamp);
  g.userData.lamp = lamp;
  return g;
}

// Police helicopter: body + tail + skids + main rotor + searchlight cone.
export function makeHelicopter() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(box, lam(0xb86c9a));
  body.scale.set(2.4, 1.7, 4.2); body.position.y = 0; body.castShadow = true; g.add(body);
  const nose = new THREE.Mesh(box, lam(0x8a4a72));
  nose.scale.set(2.0, 1.2, 1.4); nose.position.set(0, -0.2, -2.6); g.add(nose);
  const glass = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  glass.scale.set(2.1, 0.7, 0.5); glass.position.set(0, 0.35, -2.15); g.add(glass);
  const tail = new THREE.Mesh(box, lam(0xb86c9a));
  tail.scale.set(0.7, 0.7, 5.2); tail.position.set(0, 0.3, 4.4); g.add(tail);
  const fin = new THREE.Mesh(box, lam(0x8a4a72));
  fin.scale.set(0.2, 1.6, 1.2); fin.position.set(0, 1.0, 6.8); g.add(fin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.0, 6), lam(0x2c2438));
  mast.position.y = 1.3; g.add(mast);
  const rotor = new THREE.Group();
  const bladeMat = lam(0x241a2e);
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(box, bladeMat);
    blade.scale.set(9.2, 0.08, 0.5); blade.rotation.y = a; rotor.add(blade);
  }
  rotor.position.y = 1.85; g.add(rotor);
  const tailRotor = new THREE.Mesh(box, bladeMat);
  tailRotor.scale.set(0.1, 2.0, 0.3); tailRotor.position.set(0.45, 1.0, 6.8); g.add(tailRotor);
  for (const sx of [-0.9, 0.9]) {
    const skid = new THREE.Mesh(box, lam(0x2c2438));
    skid.scale.set(0.16, 0.16, 3.4); skid.position.set(sx, -1.15, 0); g.add(skid);
  }
  // searchlight cone: additive, from belly to the road
  const coneGeo = new THREE.ConeGeometry(2.2, 22, 16, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2c0, transparent: true, opacity: 0.10,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.set(0, -11.5, -2); cone.rotation.x = 0.12;
  g.add(cone);
  // light pool on the road below
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, -22.4, -4.5); g.add(pool);
  g.userData.rotor = rotor; g.userData.tailRotor = tailRotor; g.userData.cone = cone; g.userData.pool = pool;
  return g;
}

// A person: torso + head + legs + arms. Shirt colour varies; Nadia wears
// a teal jacket, enemies wear rust-red, pedestrians wear bright flat colours.
export function makePerson(shirt, opts) {
  const o = opts || {};
  const g = new THREE.Group();
  const skin = o.skin || 0xc98a5e;
  const torso = new THREE.Mesh(box, lam(shirt));
  torso.scale.set(0.62, 0.85, 0.34); torso.position.y = 1.18; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), lam(skin));
  head.position.y = 1.82; head.castShadow = true; g.add(head);
  if (o.hair) {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8, 0, Math.PI * 2, 0, 1.4), lam(o.hair));
    hair.position.y = 1.86; g.add(hair);
  }
  if (o.cap) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 10), lam(o.cap));
    cap.position.y = 2.0; g.add(cap);
  }
  const legMat = lam(o.pants || 0x2c2438);
  for (const sx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(box, legMat);
    leg.scale.set(0.22, 0.72, 0.26); leg.position.set(sx, 0.36, 0); g.add(leg);
  }
  const armMat = lam(shirt);
  for (const sx of [-0.4, 0.4]) {
    const arm = new THREE.Mesh(box, armMat);
    arm.scale.set(0.18, 0.7, 0.2); arm.position.set(sx, 1.2, 0); g.add(arm);
  }
  if (o.gun) {
    const gun = new THREE.Mesh(box, lam(0x14101c));
    gun.scale.set(0.1, 0.12, 0.62); gun.position.set(0.42, 1.35, -0.35); g.add(gun);
    g.userData.gunTip = new THREE.Vector3(0.42, 1.35, -0.7);
  }
  return g;
}
