// The player: Nadia Ferro, on foot and behind the wheel. Driving is
// arcade physics (speed, steering that tightens with speed, nitro, brake);
// on foot she walks, aims with the mouse and shoots with F. Stealing a car
// (E near a traffic car) raises heat and the wanted level.
import * as THREE from 'three';
import { makeCar, makePerson } from './vehicles.js';
import { PALETTE, clamp } from './config.js';

export function createPlayer(THREE, scene) {
  const car = makeCar(PALETTE.heroCar, { cabinColor: 0x2c2438 });
  car.position.set(0, 0, 0);
  car.rotation.y = Math.PI; // facing -Z, into the sunset
  scene.add(car);
  const nadia = makePerson(0x2a7f8a, { hair: 0x241a2e, skin: 0xd9a06b });
  nadia.visible = false;
  scene.add(nadia);
  return {
    car, nadia,
    mode: 'driving', // 'driving' | 'onfoot'
    x: 0, z: 0, heading: Math.PI, // heading PI = facing -Z
    speed: 0, // m/s
    nitro: 100, condition: 87, fuel: 71,
    health: 82, armour: 64,
    heat: 68,
    shotsFired: 0, shotsHit: 0,
    steer: 0,
  };
}

const MAX_SPEED = 46; // ~165 km/h
const ACCEL = 16, BRAKE = 30, DRAG = 4.5;

export function drivePlayer(p, input, dt) {
  const nitro = input.nitro && p.nitro > 0;
  if (input.forward) p.speed += ACCEL * dt * (nitro ? 1.7 : 1);
  if (input.back) p.speed -= ACCEL * 0.7 * dt;
  if (input.brake) p.speed -= BRAKE * dt * Math.sign(p.speed || 1);
  p.speed -= p.speed * DRAG * 0.02 * dt;
  p.speed = clamp(p.speed, -10, nitro ? MAX_SPEED * 1.25 : MAX_SPEED);
  if (nitro) p.nitro = Math.max(0, p.nitro - dt * 26);
  else p.nitro = Math.min(100, p.nitro + dt * 4);
  // steering: sharper at low speed, gentle at full speed
  const steerAmt = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  p.steer = steerAmt;
  const turnRate = 1.9 * (1 - Math.min(1, Math.abs(p.speed) / MAX_SPEED) * 0.55);
  p.heading += steerAmt * turnRate * dt * (p.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(p.speed) / 8 + 0.15);
  p.x += Math.sin(p.heading) * p.speed * dt;
  p.z += Math.cos(p.heading) * p.speed * dt;
  // stay on the island's roads (soft clamp)
  p.x = clamp(p.x, -52, 52);
  p.z = clamp(p.z, -210, 125);
  p.car.position.set(p.x, 0, p.z);
  p.car.rotation.y = p.heading;
  // body roll + pitch for feel
  p.car.rotation.z = -steerAmt * 0.045 * Math.min(1, Math.abs(p.speed) / 20);
  p.car.rotation.x = input.forward ? -0.012 : (input.brake ? 0.02 : 0);
  return { speedKmh: Math.abs(p.speed) * 3.6, nitro };
}

export function walkPlayer(p, input, dt, camYaw) {
  const sp = 5.2;
  let mx = 0, mz = 0;
  if (input.forward) mz -= 1;
  if (input.back) mz += 1;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  const len = Math.hypot(mx, mz) || 1;
  const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
  const dx = (mx * cos - mz * sin) / len * sp * dt;
  const dz = (mx * sin + mz * cos) / len * sp * dt;
  p.x = clamp(p.x + dx, -52, 52);
  p.z = clamp(p.z + dz, -210, 125);
  p.nadia.position.set(p.x, 0, p.z);
  if (mx || mz) p.nadia.rotation.y = Math.atan2(dx, dz);
  p.nadia.visible = true;
  p.car.visible = false;
  return { speedKmh: Math.hypot(dx, dz) / dt * 3.6 };
}

export function enterCar(p) {
  p.mode = 'driving';
  p.nadia.visible = false;
  p.car.visible = true;
  p.car.position.set(p.x, 0, p.z);
  p.car.rotation.y = p.heading;
}

export function exitCar(p) {
  p.mode = 'onfoot';
  p.speed = 0;
  p.car.visible = true; // the car stays parked where she left it
  p.nadia.visible = true;
  p.nadia.position.set(p.x + 2.2, 0, p.z + 1.5);
}

// Distance to the nearest traffic car (for the E — STEAL CAR prompt).
export function nearestStealable(p, traffic) {
  let best = null, bestD = 4.2;
  for (const car of traffic.cars) {
    if (!car.userData.speed && car.userData.speed !== 0) continue;
    const d = Math.hypot(car.position.x - p.x, car.position.z - p.z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
