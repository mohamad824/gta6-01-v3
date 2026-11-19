// BRINEHAVEN city builder (three.js). One low sun, golden-hour light:
// mauve-purple sky -> pink -> burnt-orange horizon, warm sunlit road,
// dark-violet shadow side, teal water as an accent below the warm light.
import * as THREE from 'three';
import { PALETTE, SHOP_SIGNS, DISTRICTS } from './config.js';
import { pick, range, intRange } from './random.js';

// ---------- canvas texture helpers (all art generated here, no assets) ----------
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roadTexture() {
  return canvasTexture(256, 512, (g, w, h) => {
    g.fillStyle = '#c96a38'; g.fillRect(0, 0, w, h);
    // sunlit warm asphalt with darker violet wheel tracks
    g.fillStyle = 'rgba(33,29,42,0.28)';
    g.fillRect(52, 0, 26, h); g.fillRect(178, 0, 26, h);
    g.fillStyle = 'rgba(255,190,120,0.10)';
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    // centre dashed line, warm gold
    g.fillStyle = '#f5d76e';
    for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 4, y, 8, 34);
    // edge lines
    g.fillStyle = '#f2ead9'; g.fillRect(6, 0, 4, h); g.fillRect(w - 10, 0, 4, h);
    // crosswalk at the top of the tile
    g.fillStyle = 'rgba(242,234,217,0.85)';
    for (let x = 14; x < w - 14; x += 22) g.fillRect(x, 8, 12, 26);
  });
}

function facadeTexture(rng, base, litRatio) {
  return canvasTexture(256, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // sunlit top edge, shaded base
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,214,150,0.35)'); grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(33,29,42,0.35)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    const cols = 5, rows = 9;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = 16 + c * 46, y = 18 + r * 52;
      const lit = rng() < litRatio;
      g.fillStyle = lit ? '#ffd27a' : (rng() < 0.5 ? '#3a2f45' : '#2c2438');
      g.fillRect(x, y, 30, 36);
      if (lit) { g.fillStyle = 'rgba(255,240,190,0.9)'; g.fillRect(x + 3, y + 3, 24, 8); }
      else { g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x + 3, y + 3, 24, 6); }
    }
    // ground-floor shopfront
    g.fillStyle = '#241a2e'; g.fillRect(0, h - 64, w, 64);
    g.fillStyle = '#ff9e57'; g.fillRect(10, h - 56, w - 20, 40);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(14, h - 52, w - 28, 6);
  });
}

function signTexture(text, bg, fg) {
  return canvasTexture(128, 512, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; g.font = '900 44px "Trebuchet MS", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = text.split(' ');
    const lh = 52; const y0 = h / 2 - (words.length - 1) * lh / 2;
    words.forEach((wd, i) => g.fillText(wd, w / 2, y0 + i * lh));
  });
}
// Horizontal one-line sign (garage fascia): wide canvas, text on one line.
function signTextureH(text, bg, fg) {
  return canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; g.font = '900 38px "Trebuchet MS", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2);
  });
}

function glowTexture(inner, outer) {
  return canvasTexture(128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    grad.addColorStop(0, inner); grad.addColorStop(0.4, outer); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
}

function awningTexture(rng) {
  const cols = pick(rng, [['#e77f25', '#f2ead9'], ['#c8758a', '#f2ead9'], ['#3fa7b0', '#f2ead9']]);
  return canvasTexture(256, 128, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % 2]; g.fillRect(i * 32, 0, 32, h); }
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(0, h - 14, w, 14);
  });
}

// ---------- sky ----------
function makeSky(THREE) {
  const sunDir = new THREE.Vector3(-0.18, 0.10, -1).normalize();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      mid: { value: new THREE.Color(PALETTE.skyMid) },
      hor: { value: new THREE.Color(PALETTE.skyHorizon) },
      sunDir: { value: sunDir },
      sunCol: { value: new THREE.Color(PALETTE.sunCore) },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vDir; uniform vec3 top; uniform vec3 mid; uniform vec3 hor;
      uniform vec3 sunDir; uniform vec3 sunCol;
      void main(){
        float y = clamp(vDir.y, -0.05, 1.0);
        vec3 col = mix(hor, mid, smoothstep(0.02, 0.16, y));
        col = mix(col, top, smoothstep(0.08, 0.35, y));
        float s = max(dot(normalize(vDir), sunDir), 0.0);
        col += sunCol * pow(s, 350.0) * 1.6;         // sun disc, low on the horizon
        col += sunCol * pow(s, 60.0) * 0.10;         // narrow warm halo
        // darken below the horizon only: (1 - smoothstep) is 1 when
        // vDir.y is below -0.05 and 0 above the horizon. smoothstep with
        // edge0 < edge1 returns 1 for x >= edge1, so the bare form would
        // paint the WHOLE sky horizon-orange — the earlier flat-orange bug.
        col = mix(col, hor * 0.85, 1.0 - smoothstep(-0.05, 0.0, vDir.y));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 16), mat);
  return { sky, sunDir };
}

// ---------- city ----------
export function buildCity(THREE, rng) {
  const group = new THREE.Group();
  const animated = { water: [], rotors: [], lampGlow: [], fires: [] };

  const { sky, sunDir } = makeSky(THREE);
  group.add(sky);

  // lights: one low warm sun + mauve hemisphere fill
  const sun = new THREE.DirectionalLight(0xffb066, 2.6);
  sun.position.copy(sunDir).multiplyScalar(160); sun.position.y = 26;
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
  sun.shadow.camera.far = 400; sun.shadow.bias = -0.0015;
  group.add(sun); group.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xd98a6a, 0x5a3a4a, 1.35);
  group.add(hemi);
  const amb = new THREE.AmbientLight(0x8a5a6e, 0.65);
  group.add(amb);
  // warm fill from behind the chase camera so the hero car's rear and the
  // shadow sides of buildings read orange, not black.
  const fill = new THREE.DirectionalLight(0xffc490, 1.2);
  fill.position.set(24, 34, 120);
  group.add(fill); group.add(fill.target);

  // ground base (warm dark earth under everything)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(520, 520),
    new THREE.MeshLambertMaterial({ color: 0x4a2f3a }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true;
  group.add(ground);

  // main boulevard along Z, sunset at -Z
  const roadTex = roadTexture();
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping; roadTex.repeat.set(1, 9);
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex, emissive: 0x7a3a18, emissiveIntensity: 0.4 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(16, 340), roadMat);
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -30); road.receiveShadow = true;
  group.add(road);
  // cross streets
  const crossTex = roadTexture(); crossTex.wrapS = crossTex.wrapT = THREE.RepeatWrapping;
  crossTex.repeat.set(6, 1); crossTex.rotation = Math.PI / 2;
  for (const z of [-40, 20, 80]) {
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(180, 11),
      new THREE.MeshLambertMaterial({ map: crossTex }));
    cross.rotation.x = -Math.PI / 2; cross.position.set(0, 0.04, z); cross.receiveShadow = true;
    group.add(cross);
  }
  // sidewalks
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.22, 340), walkMat);
    walk.position.set(side * 10.3, 0.11, -30); walk.receiveShadow = true; group.add(walk);
  }

  // water: teal accent on both flanks and past the causeway
  const waterMat = new THREE.MeshLambertMaterial({
    color: PALETTE.waterTeal, transparent: true, opacity: 0.92 });
  const waterL = new THREE.Mesh(new THREE.PlaneGeometry(180, 340), waterMat);
  waterL.rotation.x = -Math.PI / 2; waterL.position.set(-120, 0.02, -30); group.add(waterL);
  const waterR = waterL.clone(); waterR.position.x = 120; group.add(waterR);
  const waterEnd = new THREE.Mesh(new THREE.PlaneGeometry(520, 120), waterMat);
  waterEnd.rotation.x = -Math.PI / 2; waterEnd.position.set(0, 0.02, -250); group.add(waterEnd);
  animated.water.push(waterL, waterR, waterEnd);

  // causeway: narrow strip over the water at the far end, with lamps
  const cause = new THREE.Mesh(new THREE.PlaneGeometry(12, 90), roadMat.clone());
  cause.material.map = roadTex.clone(); cause.material.map.repeat.set(1, 3);
  cause.rotation.x = -Math.PI / 2; cause.position.set(0, 0.08, -205); group.add(cause);
  // mudflats: amber strips beside the causeway, open at low tide
  const mudMat = new THREE.MeshLambertMaterial({ color: 0xb98a4e });
  const mudL = new THREE.Mesh(new THREE.PlaneGeometry(26, 90), mudMat);
  mudL.rotation.x = -Math.PI / 2; mudL.position.set(-22, 0.06, -205); group.add(mudL);
  const mudR = mudL.clone(); mudR.position.x = 22; group.add(mudR);

  // buildings: 6-8 lining BOTH sides of the boulevard, multi-storey,
  // lit windows, vertical signs, our own shop names.
  const facadeMats = [
    new THREE.MeshLambertMaterial({ map: facadeTexture(rng, '#ebe3dc', 0.42), emissive: 0xffc46a, emissiveMap: facadeTexture(rng, '#000000', 0.0) }),
  ];
  // Build facade materials properly: map + emissiveMap from the same lit canvas.
  const facadeVariants = [];
  for (let v = 0; v < 4; v++) {
    const base = pick(rng, ['#ebe3dc', '#e8d5c0', '#d9c2b8', '#e5d8a8']);
    const tex = facadeTexture(rng, base, 0.38 + rng() * 0.2);
    facadeVariants.push(new THREE.MeshLambertMaterial({
      map: tex, emissive: 0xffb85e, emissiveMap: tex, emissiveIntensity: 0.5 }));
  }
  facadeMats.length = 0;
  const signMats = SHOP_SIGNS.map((s, i) => new THREE.MeshBasicMaterial({
    map: signTexture(s, pick(rng, ['#241a2e', '#3a1f2e', '#12303a']), pick(rng, ['#ffd27a', '#ff9ecf', '#4dff9d', '#f2ead9'])) }));
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a3a44 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  let signIdx = 0;
  const buildingSpots = [];
  for (const side of [-1, 1]) {
    let z = 118;
    while (z > -150) {
      const w = range(rng, 12, 20), d = range(rng, 14, 22), hgt = range(rng, 12, 34);
      if (Math.abs(z - -40) < 14 || Math.abs(z - 20) < 14 || Math.abs(z - 80) < 14) { z -= d + 4; continue; }
      const b = new THREE.Mesh(boxGeo, facadeVariants[intRange(rng, 0, 3)]);
      b.scale.set(w, hgt, d);
      b.position.set(side * (14 + w / 2 + range(rng, 0, 3)), hgt / 2, z);
      b.castShadow = true; b.receiveShadow = true; group.add(b);
      const roof = new THREE.Mesh(boxGeo, roofMat);
      roof.scale.set(w * 0.92, 1.2, d * 0.9); roof.position.set(b.position.x, hgt + 0.6, z);
      group.add(roof);
      if (rng() < 0.55) { // AC unit / water tank on the roof
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.4, 10),
          new THREE.MeshLambertMaterial({ color: 0x8a6f7d }));
        tank.position.set(b.position.x + range(rng, -3, 3), hgt + 2.2, z + range(rng, -3, 3));
        group.add(tank);
      }
      if (signIdx < SHOP_SIGNS.length && rng() < 0.75 && (z < -85 || z > 10)) {
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 10.4), signMats[signIdx++]);
        sign.position.set(side * (13.4), hgt * 0.55, z + d / 2 + 0.15);
        if (side > 0) sign.rotation.y = Math.PI;
        group.add(sign);
      }
      buildingSpots.push({ x: b.position.x, z, w, d, h: hgt });
      z -= d + range(rng, 3, 9);
    }
  }

  // palms along both sidewalks (~10 in the cover's view)
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const frondMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmGreen, side: THREE.DoubleSide });
  function makePalm(x, z, s) {
    const p = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.34 * s, 7 * s, 7), trunkMat);
    trunk.position.y = 3.5 * s; trunk.rotation.z = range(rng, -0.08, 0.08); trunk.castShadow = true;
    p.add(trunk);
    for (let i = 0; i < 7; i++) {
      const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * s, 3.4 * s), frondMat);
      const a = (i / 7) * Math.PI * 2;
      fr.position.set(Math.cos(a) * 1.3 * s, 7.1 * s, Math.sin(a) * 1.3 * s);
      fr.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      fr.rotation.y = a;
      p.add(fr);
    }
    p.position.set(x, 0, z);
    return p;
  }
  for (let z = 108; z > -150; z -= 17) {
    group.add(makePalm(-12.6, z + range(rng, -3, 3), range(rng, 0.9, 1.25)));
    group.add(makePalm(12.6, z - 8 + range(rng, -3, 3), range(rng, 0.9, 1.25)));
  }

  // street lamps with warm glow
  const lampPoleMat = new THREE.MeshLambertMaterial({ color: 0x2c2438 });
  const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  const glowTex = glowTexture('rgba(255,210,122,0.9)', 'rgba(255,150,60,0.35)');
  for (let z = 100; z > -160; z -= 26) {
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.4, 6), lampPoleMat);
      pole.position.set(side * 12.2, 3.2, z); group.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), lampHeadMat);
      head.position.set(side * 11.6, 6.5, z); group.add(head);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4),
        new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));
      glow.position.set(side * 11.6, 6.4, z); glow.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(glow); animated.lampGlow.push(glow);
    }
  }

  // dockside market stalls (on-foot scene, Low Quay)
  const stallSpots = [];
  for (let i = 0; i < 6; i++) {
    const stall = new THREE.Group();
    const awn = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3),
      new THREE.MeshLambertMaterial({ map: awningTexture(rng), side: THREE.DoubleSide }));
    awn.rotation.x = -Math.PI / 2 + 0.25; awn.position.y = 2.6; stall.add(awn);
    const counter = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x6a4a34 }));
    counter.scale.set(4, 1.1, 1.6); counter.position.y = 0.55; counter.castShadow = true; stall.add(counter);
    const crate = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x8a6f3a }));
    crate.scale.set(1.1, 1.1, 1.1); crate.position.set(2.6, 0.55, 0.4); stall.add(crate);
    const x = -24 + (i % 3) * 7, z = -58 - Math.floor(i / 3) * 9;
    stall.position.set(x, 0, z); stall.rotation.y = 0.35;
    group.add(stall); stallSpots.push({ x, z });
  }

  // garage set (night neon) — separate pocket at x = +95 so the main
  // boulevard camera never sees it; the garage camera lives there.
  const garage = new THREE.Group();
  const gFloor = new THREE.Mesh(new THREE.PlaneGeometry(46, 30),
    new THREE.MeshLambertMaterial({ color: 0x1e1826 }));
  gFloor.rotation.x = -Math.PI / 2; gFloor.position.y = 0.08; gFloor.receiveShadow = true;
  // (0.08, not 0.02: the sea planes sit at y=0.02 and a coplanar garage
  // floor z-fights with them, painting the floor teal)
  garage.add(gFloor);
  const gWallMat = new THREE.MeshLambertMaterial({ color: 0x1c1526 });
  const gBack = new THREE.Mesh(new THREE.PlaneGeometry(46, 12), gWallMat);
  gBack.position.set(0, 6, -14); garage.add(gBack);
  const gLeft = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), gWallMat);
  gLeft.rotation.y = Math.PI / 2; gLeft.position.set(-23, 6, 0); garage.add(gLeft);
  // neon strips
  const neonPink = new THREE.MeshBasicMaterial({ color: PALETTE.neonPink });
  const neonGreen = new THREE.MeshBasicMaterial({ color: PALETTE.neonGreen });
  const strip1 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.35, 0.35), neonPink);
  strip1.position.set(-6, 10.4, -13.7); garage.add(strip1);
  const strip2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 8, 0.35), neonGreen);
  strip2.position.set(20, 5, -13.7); garage.add(strip2);
  const strip3 = new THREE.Mesh(new THREE.BoxGeometry(14, 0.35, 0.35), neonGreen);
  strip3.position.set(8, 3.2, -13.7); garage.add(strip3);
  // (the fascia sign lives in the HUD shop panel instead — a big 3D sign
  // on the back wall lands on top of the cash / WANTED text from the
  // garage camera, so the wall keeps only the neon strips)
  // lift: two posts + platform, car sits on the platform
  const liftMat = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
  for (const dx of [-1.5, 1.5]) {
    const post = new THREE.Mesh(boxGeo, liftMat);
    post.scale.set(0.5, 3.4, 0.5); post.position.set(dx, 1.7, 0); garage.add(post);
  }
  const platform = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x39415a }));
  platform.scale.set(5.4, 0.35, 2.6); platform.position.set(0, 0.9, 0); platform.castShadow = true;
  garage.add(platform);
  // tool cabinets + tyres
  const cabMat = new THREE.MeshLambertMaterial({ color: 0xc81e2b });
  for (let i = 0; i < 3; i++) {
    const cab = new THREE.Mesh(boxGeo, cabMat);
    cab.scale.set(1.8, 2.6, 1); cab.position.set(-19 + i * 2.4, 1.3, -12.4); garage.add(cab);
  }
  const tyreMat = new THREE.MeshLambertMaterial({ color: 0x14101c });
  for (let i = 0; i < 4; i++) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.24, 8, 16), tyreMat);
    tyre.position.set(18, 0.55 + i * 0.2, -12.6); tyre.rotation.x = Math.PI / 2; garage.add(tyre);
  }
  const gWarm = new THREE.PointLight(0xffe0b0, 75, 34, 1.6);
  gWarm.position.set(0, 7, 5); garage.add(gWarm);
  const gLight = new THREE.PointLight(0xff5fa2, 45, 40, 1.6);
  gLight.position.set(-6, 9, -6); garage.add(gLight);
  const gLight2 = new THREE.PointLight(0x4dff9d, 20, 40, 1.6);
  gLight2.position.set(12, 8, -10); garage.add(gLight2);
  garage.position.set(95, 0, -30);
  group.add(garage);

  // explosion / fire effect (on-foot scene): additive glow sprites + smoke
  const fireTex = glowTexture('rgba(255,230,140,1)', 'rgba(255,110,20,0.55)');
  const fire = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshBasicMaterial({ map: fireTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    s.position.set(range(rng, -1.4, 1.4), range(rng, 0.6, 2.4), range(rng, -0.6, 0.6));
    fire.add(s);
  }
  const smoke = new THREE.Mesh(new THREE.PlaneGeometry(7, 5),
    new THREE.MeshBasicMaterial({ map: glowTexture('rgba(60,50,60,0.85)', 'rgba(60,50,60,0.0)'), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  smoke.position.set(0, 4.2, 0); fire.add(smoke);
  fire.position.set(8, 0, -72); fire.scale.setScalar(1.2); fire.visible = false;
  group.add(fire); animated.fires.push(fire);

  return { group, animated, buildingSpots, stallSpots, sun, garagePos: new THREE.Vector3(95, 0, -30) };
}

// Animate the living bits: water shimmer, lamp glow facing, fire flicker.
export function updateCity(city, t, dt) {
  for (const w of city.animated.water) w.material.opacity = 0.88 + Math.sin(t * 0.7) * 0.04;
  for (const f of city.animated.fires) {
    if (!f.visible) continue;
    f.children.forEach((c, i) => {
      const s = 1 + Math.sin(t * 9 + i * 1.7) * 0.14;
      c.scale.set(s, s, 1);
    });
  }
}
