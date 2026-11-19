// Seeded screenshot scenes (?shot=chase|onfoot|map|garage). Each one plays
// the real rules forward from a fresh seeded state for a fixed number of
// steps with a scripted autopilot, so the same seed always gives the same
// frame, and the frame is what a short game really looks like.
import * as THREE from 'three';
import { CASH, STORY } from './config.js';
import { makePerson, makeCar } from './vehicles.js';
import { updateTide } from './tide.js';
import { drivePlayer } from './player.js';

const STEPS = { chase: 240, onfoot: 155, map: 120, garage: 90 };

// Chase autopilot: hold the lane, gentle weave, steady 33 m/s (119 km/h) —
// capped so the staged traffic stays ahead of the player for the whole run
// instead of being overtaken and ending up behind the camera.
function chaseAutopilot(game, step) {
  const p = game.player;
  const weave = Math.sin(step * 0.05) * 0.5;
  const targetX = Math.sin(step * 0.02) * 1.6;
  const input = {
    forward: true, back: false, brake: false,
    left: p.x > targetX + weave, right: p.x < targetX - weave,
    nitro: false,
  };
  drivePlayer(p, input, 1 / 60);
  if (p.speed > 33) p.speed = 33;
  // the cruiser stays RIGHT behind the player car (imminent contact): left
  // lane, half a car-length back, so it reads over the hero car's shoulder
  // instead of hiding behind the minimap in the bottom corner
  const cruiser = game.police.units[0].mesh;
  cruiser.position.set(p.x - 3.8, 0, p.z + 1.0);
  cruiser.rotation.y = p.heading;
  // the second cruiser boxes in from ahead-right (units[1] is WARDEN-7)
  const cruiser2 = game.police.units[1].mesh;
  cruiser2.position.set(p.x + 4.4, 0, p.z - 16);
  cruiser2.rotation.y = p.heading;
  // helicopter holds its station above-left of the player, inside the frame
  const heli = game.police.heli;
  heli.position.set(p.x - 13, 13, p.z - 34);
}

export function stageShot(game, name) {
  const g = game;
  g.shotMode = true; // no pickups / mission completions while staging
  if (name === 'chase') {
    g.setMode('play');
    g.state.day = 2; g.state.tide.minutes = 18 * 60 + 42;
    updateTide(g.state.tide, 0);
    g.state.missions.cash = CASH.chase;
    g.state.missions.rep = 720; g.state.missions.repLevel = 2;
    g.state.wanted = 4; g.state.player.heat = 82;
    g.state.player.speed = 36.7; // 132 km/h
    g.state.player.x = 0; g.state.player.z = 60; g.state.player.heading = Math.PI;
    g.state.missionTarget = { x: 0, z: -120 };
    // stage the traffic: 4 cars ahead in the side lanes, near player speed,
    // so they stay ahead of the frame instead of being rear-ended.
    const lanes = [3.5, -4.5, 3.5, -4.5], zs = [15, 27, 40, 52], spds = [34, 34, 33, 33];
    g.traffic.cars.slice(0, 4).forEach((car, i) => {
      car.position.set(lanes[i], 0, zs[i]);
      car.userData.speed = spds[i];
    });
    g.state.dialogue = {
      portrait: 'T', who: 'TESS LUMEN', role: 'GETAWAY DRIVER',
      line: '“Hold her steady, Nadia — the water’s up to the lamps and Greer’s boats are faster than they look.”',
    };
    g.state.prompt = null;
    g.state.banner = null;
    for (let s = 0; s < STEPS.chase; s++) {
      g.stepSim(1 / 60, s);
      chaseAutopilot(g, s);
    }
    g.state.popups = [
      { text: 'DRIFT', amt: '+$150' },
      { text: 'NEAR MISS', amt: '+$250' },
    ];
    g.state.speedKmh = 132;
    g.refreshRoster();
  } else if (name === 'onfoot') {
    g.setMode('play');
    g.state.day = 1; g.state.tide.minutes = 17 * 60 + 45;
    updateTide(g.state.tide, 0);
    g.state.missions.cash = CASH.onfoot;
    g.state.missions.rep = 0; g.state.missions.repLevel = 0;
    g.state.missions.kills = 4; g.state.missions.killsNeeded = 7;
    // this frame is chapter 2, the dockside fight
    g.state.missions.current = 2;
    g.state.missions.chapters.forEach(c => {
      c.state = c.n === 1 ? 'DONE' : c.n === 2 ? 'ACTIVE' : 'LOCKED';
    });
    g.state.wanted = 2; g.state.player.heat = 34;
    g.setupOnFootScene();
    g.state.dialogue = {
      portrait: 'C', who: 'CUTTER BANE', role: 'SALTJACKS · RIVAL CREW',
      line: '“Brinehaven belongs to the Saltjacks, Ferro. You’re trespassing on our docks.”',
    };
    g.state.popups = [{ text: 'GUNMAN DOWN', amt: '+$120' }];
    g.state.prompt = '<b>E</b> — STEAL CAR';
    g.state.banner = null;
    for (let s = 0; s < STEPS.onfoot; s++) g.stepSim(1 / 60, s);
    g.state.speedKmh = 0;
    g.refreshRoster();
  } else if (name === 'map') {
    g.setMode('play');
    g.state.day = 2; g.state.tide.minutes = 18 * 60 + 42;
    updateTide(g.state.tide, 0);
    g.state.missions.cash = CASH.chase;
    g.state.missions.rep = 720; g.state.missions.repLevel = 2;
    g.state.wanted = 4;
    g.state.player.speed = 36.7;
    g.state.dialogue = {
      portrait: 'T', who: 'TESS LUMEN', role: 'GETAWAY DRIVER',
      line: '“Hold her steady, Nadia — the water’s up to the lamps and Greer’s boats are faster than they look.”',
    };
    for (let s = 0; s < STEPS.map; s++) { g.stepSim(1 / 60, s); chaseAutopilot(g, s); }
    g.state.speedKmh = 132;
    g.refreshRoster();
    g.setMode('map');
  } else if (name === 'garage') {
    g.setMode('garage');
    g.state.day = 2; g.state.tide.minutes = 21 * 60 + 12;
    updateTide(g.state.tide, 0);
    g.state.missions.cash = CASH.garage;
    g.state.missions.rep = 970; g.state.missions.repLevel = 3;
    // chapter 4 is DONE here — chapter 5 is the active next job
    g.state.missions.current = 5;
    g.state.missions.chapters.forEach(c => {
      c.state = c.n < 5 ? 'DONE' : c.n === 5 ? 'ACTIVE' : 'LOCKED';
    });
    g.state.wanted = 0; g.state.player.heat = 5;
    g.state.smgOwned = true;
    g.state.dialogue = {
      portrait: 'O', who: 'ODIE STRAND', role: 'MECHANIC · LAMPERS’ ROW',
      line: '“She’ll do 200 now, Nadia. The Gullwing’s the fastest thing on the causeway — don’t scratch her.”',
    };
    g.state.banner = ['MISSION PASSED', '+$800 · +250 REP', 'MISSION 5 UNLOCKED · ODIE’S GARAGE UNLOCKED'];
    g.state.popups = [];
    g.state.prompt = null;
    for (let s = 0; s < STEPS.garage; s++) g.stepSim(1 / 60, s);
    g.state.district = "LAMPERS' ROW"; // the garage sits in Lampers' Row
    g.state.speedKmh = 0;
  }
  g.updateHudAll();
  g.render();
  g.render();
  window.__shotReady = true;
  document.title = 'SHOT_READY';
}
