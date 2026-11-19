// Odie's garage: night-neon pocket of the city, the car on the lift, and
// the priced upgrade shop. Buying is real: cash, condition and stats move,
// and RESPRAY clears the wanted level.
import { GARAGE_ITEMS, money } from './config.js';
import { makeCar } from './vehicles.js';
import { PALETTE } from './config.js';

export function createGarageCar(THREE, garageGroup) {
  const car = makeCar(PALETTE.heroCar, { cabinColor: 0x7a6a5a }); // lighter cabin so it reads in the dark garage
  car.position.set(0, 1.15, 0);
  car.rotation.y = 0.6; // front three-quarter toward the garage camera
  garageGroup.add(car);
  // a second car parked in the back, for depth
  const back = makeCar(0x3fa7b0, { cabinColor: 0x2c2438 });
  back.position.set(-12, 0, -5); back.rotation.y = Math.PI * 0.82;
  garageGroup.add(back);
  const bike = makeCar(0xd94f30, { cabinColor: 0x241a2e });
  bike.scale.setScalar(0.8);
  bike.position.set(-16, 0, 2); bike.rotation.y = Math.PI * 0.3;
  garageGroup.add(bike);
  // two characters: Odie at the bench, Tess leaning on the lift
  return { car, back, bike };
}

export function buyItem(state, n) {
  const item = GARAGE_ITEMS.find(i => i.n === n);
  if (!item) return null;
  const m = state.missions;
  if (m.cash < item.price) return { ok: false, msg: 'Not enough cash.' };
  m.cash -= item.price;
  if (item.name === 'REPAIR') state.player.condition = 100;
  if (item.name === 'RESPRAY') { state.wanted = 0; state.player.heat = 5; }
  if (item.name === 'ENGINE') state.player.topSpeedBonus = 30;
  if (item.name === 'ARMOUR PLATING') state.player.armour = 100;
  if (item.name === 'NITRO') state.player.nitro = 100;
  item.dots = Math.min(3, item.dots + 1);
  return { ok: true, msg: `${item.name} fitted — ${money(item.price)}` };
}
