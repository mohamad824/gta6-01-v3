// Traffic cars + pedestrians. Seeded placement, simple lane following with
// wrap-around, and a slow bob for walkers. Deterministic under a fixed seed.
import * as THREE from 'three';
import { makeCar, makePerson } from './vehicles.js';
import { pick, range, intRange } from './random.js';

const TRAFFIC_COLORS = [0xf2ead9, 0x3fa7b0, 0xe8c25a, 0x7a5fd0, 0x4a6b8a, 0xc8758a, 0x8a9a5b, 0xd94f30];
const SHIRT_COLORS = [0xe8c25a, 0x3fa7b0, 0xc8758a, 0xf2ead9, 0x7a5fd0, 0x4a6b8a, 0xe77f25, 0x87e397];

export function createTraffic(THREE, scene, rng) {
  const cars = [];
  // 4 cars ahead in the player's direction + 3 oncoming + 1 parked.
  const lanes = [-4.2, -1.4, 1.4, 4.2];
  const aheadZ = [-26, -44, -62, -86];
  for (let i = 0; i < 4; i++) {
    const car = makeCar(pick(rng, TRAFFIC_COLORS));
    car.position.set(pick(rng, [-4.2, -1.4, 1.4]), 0, aheadZ[i]);
    car.rotation.y = Math.PI; // heading -Z, same way as the player
    car.userData.speed = range(rng, 9, 14);
    car.userData.lane = car.position.x;
    scene.add(car); cars.push(car);
  }
  const oncomingZ = [-34, -58, -78];
  for (let i = 0; i < 3; i++) {
    const car = makeCar(pick(rng, TRAFFIC_COLORS));
    car.position.set(pick(rng, [1.4, 4.2]), 0, oncomingZ[i]);
    car.userData.speed = range(rng, 10, 15);
    car.userData.lane = car.position.x;
    scene.add(car); cars.push(car);
  }
  const parked = makeCar(pick(rng, TRAFFIC_COLORS), { taxi: rng() < 0.5 });
  parked.position.set(6.4, 0, 14); parked.rotation.y = Math.PI / 2 + Math.PI;
  scene.add(parked); cars.push(parked);
  parked.userData.speed = 0;

  // pedestrians on both sidewalks
  const peds = [];
  for (let i = 0; i < 9; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const p = makePerson(pick(rng, SHIRT_COLORS), { hair: pick(rng, [0x241a2e, 0x6a4a34, 0x8a8f96, 0x2c2438]) });
    const z = range(rng, -95, 30);
    p.position.set(side * range(rng, 9.2, 12.0), 0.22, z);
    p.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    p.userData.walkSpeed = range(rng, 0.9, 1.6);
    p.userData.phase = rng() * Math.PI * 2;
    p.userData.side = side;
    scene.add(p); peds.push(p);
  }
  return { cars, peds };
}

export function updateTraffic(traffic, dt, t, bounds) {
  const zMin = bounds?.zMin ?? -150, zMax = bounds?.zMax ?? 120;
  for (const car of traffic.cars) {
    if (!car.userData.speed) continue;
    const dir = car.rotation.y > 2 ? -1 : 1; // heading -Z cars have rotation.y = PI
    car.position.z += dir * car.userData.speed * dt;
    if (car.position.z < zMin) car.position.z = zMax;
    if (car.position.z > zMax) car.position.z = zMin;
  }
  for (const p of traffic.peds) {
    p.position.z += (p.userData.side > 0 ? -1 : 1) * p.userData.walkSpeed * dt * 0.4;
    if (p.position.z < -100) p.position.z = 40;
    if (p.position.z > 40) p.position.z = -100;
    p.position.y = 0.22 + Math.abs(Math.sin(t * 5 + p.userData.phase)) * 0.06;
    p.rotation.z = Math.sin(t * 5 + p.userData.phase) * 0.04;
  }
}
