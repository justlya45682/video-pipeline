// Moteur video 3D (methode_video_3d.md). TOUT est fonction du temps t. Aucun Math.random().
import * as THREE from '../lib/three.module.js';

const W = 1080, H = 1920;
// ---------- utilitaires ----------
export const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
function mulberry32(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// kf: keys = [[t, v...], ...] -> tableau de valeurs interpolees (smoothstep entre cles)
function kf(t, keys) {
  if (!keys || !keys.length) return [];
  if (t <= keys[0][0]) return keys[0].slice(1);
  const L = keys[keys.length - 1];
  if (t >= L[0]) return L.slice(1);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a[0] && t <= b[0]) { const k = ss(a[0], b[0], t); return a.slice(1).map((v, j) => lerp(v, b[j + 1], k)); }
  }
  return L.slice(1);
}
const col = (c) => new THREE.Color(c);
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.85, metalness: 0.02, ...o });

// ---------- rendu ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('stage').prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 400);
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a2a1a, 0.8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 2.2);
sun.position.set(30, 50, 20); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 140 });
scene.add(sun);
const accent = new THREE.PointLight(0x4aa8ff, 0, 40, 1.6); scene.add(accent);

// ---------- personnage (fiche figee) ----------
const SHEET_DEFAULT = { jacket: '#2f6b5a', pants: '#4d3a28', boots: '#2b1c10', pack: '#c8782c', scarf: '#e04a3a', hair: '#2a180c', skin: '#e0ac84', ponytail: true };
function makeCharacter(sh) {
  const s = { ...SHEET_DEFAULT, ...sh };
  const g = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.95; g.add(hips);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 6, 14), M(s.jacket)); torso.position.y = 0.45; torso.castShadow = true; hips.add(torso);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.22), M(s.pack)); pack.position.set(0, 0.5, -0.27); pack.castShadow = true; hips.add(pack);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 10, 20), M(s.scarf)); scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.88; hips.add(scarf);
  const head = new THREE.Group(); head.position.y = 1.08; hips.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 16), M(s.skin)); skull.castShadow = true; head.add(skull);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.265, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M(s.hair)); hair.position.y = 0.02; hair.rotation.x = -0.25; head.add(hair);
  if (s.ponytail) { const pt = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.28, 4, 8), M(s.hair)); pt.position.set(0, -0.02, -0.3); pt.rotation.x = 0.5; head.add(pt); head.userData.pt = pt; }
  for (const x of [-0.09, 0.09]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), M('#000000', { roughness: 0.3 })); e.position.set(x, 0.02, 0.235); head.add(e); }
  const mkLimb = (len, r, c, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 5, 10), M(c)); m.position.y = -len / 2 - r; m.castShadow = true; p.add(m); return p; };
  const legL = mkLimb(0.62, 0.11, s.pants, -0.14, 0.0), legR = mkLimb(0.62, 0.11, s.pants, 0.14, 0.0);
  const armL = mkLimb(0.5, 0.085, s.jacket, -0.34, 0.78), armR = mkLimb(0.5, 0.085, s.jacket, 0.34, 0.78);
  for (const l of [legL, legR]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.32), M(s.boots)); b.position.set(0, -0.82, 0.05); l.add(b); }
  hips.add(legL, legR, armL, armR);
  g.userData = { hips, head, legL, legR, armL, armR, torso };
  return g;
}

// ---------- decors (groupes) ----------
const G = {}; const rngFor = (n) => mulberry32(1000 + n * 77);
function tree(r, kind) {
  const g = new THREE.Group();
  if (kind === 'palm') {
    const h = 5 + r() * 2.5; const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, h, 8), M('#8a6a45')); trunk.position.y = h / 2; trunk.rotation.z = (r() - .5) * .25; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.2, 4), M('#2f8f4a')); const a = i / 7 * Math.PI * 2; l.position.set(Math.cos(a) * 1.3, h - 0.2, Math.sin(a) * 1.3); l.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); l.castShadow = true; g.add(l); }
  } else {
    const h = 5 + r() * 5; const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, h * .5, 8), M('#4a3322')); trunk.position.y = h * .25; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(2.1 - i * .5, h * .55, 9), M(kind === 'dark' ? '#173d2a' : '#1f5a35')); c.position.y = h * .45 + i * h * .22; c.castShadow = true; g.add(c); }
  }
  return g;
}
function buildBeach() {
  const g = new THREE.Group(), r = rngFor(1);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M('#1fa6b8', { roughness: 0.25, metalness: 0.1 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.3; g.add(sea);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, 140, 1, 1), M('#e6cf9b')); sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0, -50); sand.receiveShadow = true; g.add(sand);
  for (let i = 0; i < 16; i++) { const t = tree(r, 'palm'); t.position.set((r() < .5 ? -1 : 1) * (7 + r() * 14), 0, -r() * 95); g.add(t); }
  for (let i = 0; i < 18; i++) { const k = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + r() * 1.1), M('#8b8478')); k.position.set((r() - .5) * 26, 0.2, -r() * 95); k.castShadow = true; g.add(k); }
  g.userData.bg = '#9fd8f2'; return g;
}
function buildForest() {
  const g = new THREE.Group(), r = rngFor(2);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 260), M('#14301f')); ground.rotation.x = -Math.PI / 2; ground.position.z = -80; ground.receiveShadow = true; g.add(ground);
  for (let i = 0; i < 95; i++) { const t = tree(r, 'dark'); const side = r() < .5 ? -1 : 1; t.position.set(side * (4 + r() * 28), 0, 10 - r() * 160); t.scale.setScalar(.8 + r() * .9); g.add(t); }
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 200), M('#4a3a28')); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.02, -80); path.receiveShadow = true; g.add(path);
  const fl = []; for (let i = 0; i < 60; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshBasicMaterial({ color: 0xbfffa0 })); f.userData = { x: (r() - .5) * 18, y: .6 + r() * 3, z: -r() * 90, p: r() * 6.28, s: .5 + r() }; g.add(f); fl.push(f); }
  g.userData.fireflies = fl; g.userData.bg = '#0d1f1a'; return g;
}
function buildCave() {
  const g = new THREE.Group(), r = rngFor(3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 120), M('#2a2622')); floor.rotation.x = -Math.PI / 2; floor.position.z = -30; floor.receiveShadow = true; g.add(floor);
  for (const x of [-9, 9]) { const w = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 120), M('#26221f')); w.position.set(x, 7, -30); g.add(w); }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(22, 2, 120), M('#1d1a18')); roof.position.set(0, 14, -30); g.add(roof);
  for (let i = 0; i < 40; i++) { const k = new THREE.Mesh(new THREE.ConeGeometry(.3 + r() * .6, 1.5 + r() * 3, 6), M('#3a342f')); const up = r() < .5; k.position.set((r() - .5) * 16, up ? .8 : 13, -r() * 60); if (!up) k.rotation.x = Math.PI; k.castShadow = true; g.add(k); }
  const cr = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), new THREE.MeshStandardMaterial({ color: 0x66c8ff, emissive: 0x2a8cff, emissiveIntensity: 2.2, roughness: 0.15 })); cr.scale.y = 1.7; cr.position.set(0, 1.9, -22); g.add(cr);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 0.9, 10), M('#4a4540')); ped.position.set(0, .45, -22); g.add(ped);
  for (let i = 0; i < 70; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .05, 12), M('#e8b63a', { metalness: .9, roughness: .25, emissive: 0x6a4a00, emissiveIntensity: .45 })); c.position.set((r() - .5) * 8, .06 + r() * .25, -14 - r() * 14); c.rotation.x = r() * 1.2; g.add(c); }
  g.userData.crystal = cr; g.userData.bg = '#050608'; return g;
}
function buildHouse() {
  const g = new THREE.Group(), r = rngFor(4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 80), M('#3b2a1e')); floor.rotation.x = -Math.PI / 2; floor.position.z = -25; floor.receiveShadow = true; g.add(floor);
  for (const x of [-4, 4]) { const w = new THREE.Mesh(new THREE.BoxGeometry(.4, 7, 80), M('#5b4a3a')); w.position.set(x, 3.5, -25); w.receiveShadow = true; g.add(w); }
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(8.4, .4, 80), M('#2b211a')); ceil.position.set(0, 7, -25); g.add(ceil);
  for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(.2, 3.4, 1.7), M('#2a1c12')); d.position.set(i % 2 ? 3.7 : -3.7, 1.7, -4 - i * 7); g.add(d); const f = new THREE.Mesh(new THREE.BoxGeometry(.1, 2.2, 1.5), M('#6a5238')); f.position.set(i % 2 ? 3.55 : -3.55, 3.6, -4 - i * 7); g.add(f); }
  const door = new THREE.Mesh(new THREE.BoxGeometry(3, 5, .3), M('#1d120b')); door.position.set(0, 2.5, -42); g.add(door);
  g.userData.door = door; g.userData.bg = '#0a0705'; return g;
}
G.beach = buildBeach(); G.forest = buildForest(); G.cave = buildCave(); G.house = buildHouse();
for (const k in G) { scene.add(G[k]); G[k].visible = false; }

// ombre menacante (scene de peur)
const shadow = new THREE.Group();
{ const b = new THREE.Mesh(new THREE.CapsuleGeometry(.5, 1.7, 6, 12), new THREE.MeshBasicMaterial({ color: 0x050000 })); b.position.y = 1.5; shadow.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(.45, 14, 12), new THREE.MeshBasicMaterial({ color: 0x050000 })); h.position.y = 3; shadow.add(h);
  for (const x of [-.15, .15]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2a1a })); e.position.set(x, 3.05, .4); shadow.add(e); } }
shadow.visible = false; scene.add(shadow);

let character = null; let spec = null;

// ---------- boucle : update(t) ----------
function update(t) {
  const sc = spec.scenes.find(s => t >= s.start && t < s.end) || spec.scenes[spec.scenes.length - 1];
  for (const k in G) G[k].visible = (k === sc.set);
  const setObj = G[sc.set];
  // lumiere / brouillard
  const L = sc.light || {};
  const k0 = ss(sc.start, sc.start + 1.2, t);
  sun.intensity = L.sun ?? 1.5; hemi.intensity = L.hemi ?? 0.6;
  sun.color.set(L.sunColor || '#fff0d0'); hemi.color.set(L.hemiColor || '#bfd8ff');
  const bg = L.sky || setObj.userData.bg || '#222';
  scene.background = col(bg);
  const fog = L.fog || [20, 120]; scene.fog = new THREE.Fog(col(L.fogColor || bg), fog[0], fog[1]);
  const ac = L.accent;
  if (ac) { accent.color.set(ac.color); accent.intensity = ac.intensity; accent.position.set(...(ac.pos || [0, 3, -10])); } else accent.intensity = 0;
  sun.position.set(...(L.sunPos || [30, 50, 20]));
  // personnage : trajet
  const p = kf(t, sc.path); const p2 = kf(t + 0.08, sc.path);
  const [px, pz] = p.length ? p : [0, 0];
  const vx = (p2[0] ?? px) - px, vz = (p2[1] ?? pz) - pz;
  const speed = Math.hypot(vx, vz) / 0.08;
  character.position.set(px, 0, pz);
  const U = character.userData;
  const walk = Math.min(1, speed / 1.6);
  const ph = t * (3.2 + speed * 1.3);
  const anim = sc.anim || 'walk';
  let yaw = speed > 0.05 ? Math.atan2(vx, vz) : (sc.faceYaw ?? Math.PI);
  if (sc.faceCamera) yaw = Math.atan2(camera.position.x - px, camera.position.z - pz);
  character.rotation.y = yaw;
  U.legL.rotation.x = Math.sin(ph) * .8 * walk; U.legR.rotation.x = -Math.sin(ph) * .8 * walk;
  U.armL.rotation.x = -Math.sin(ph) * .7 * walk; U.armR.rotation.x = Math.sin(ph) * .7 * walk;
  U.hips.position.y = .95 + Math.abs(Math.cos(ph)) * .05 * walk + Math.sin(t * 2) * .01;
  U.hips.rotation.z = Math.sin(ph) * .03 * walk;
  U.head.rotation.y = 0; U.head.rotation.x = 0;
  if (anim === 'scared') { U.armL.rotation.x = -1.9; U.armR.rotation.x = -1.9; U.armL.rotation.z = .3; U.armR.rotation.z = -.3; U.head.rotation.x = -.15; U.hips.position.y -= .06; U.hips.rotation.z = Math.sin(t * 38) * .02; }
  else if (anim === 'wave') { U.armR.rotation.x = -2.6; U.armR.rotation.z = -.2 + Math.sin(t * 9) * .45; U.armL.rotation.z = 0; }
  else if (anim === 'look') { U.head.rotation.y = Math.sin(t * 1.3) * .9; U.armL.rotation.z = U.armR.rotation.z = 0; }
  else { U.armL.rotation.z = U.armR.rotation.z = 0; }
  if (U.head.userData.pt) U.head.userData.pt.rotation.x = .5 + Math.sin(ph * .5) * .25 * walk + Math.sin(t * 3) * .05;
  // ombre
  shadow.visible = !!sc.shadow;
  if (sc.shadow) { const s = kf(t, sc.shadow); shadow.position.set(s[0], 0, s[1]); shadow.rotation.y = Math.atan2(px - s[0], pz - s[1]); shadow.scale.setScalar(s[2] ?? 1); }
  // props animes
  if (G.forest.userData.fireflies && sc.set === 'forest') for (const f of G.forest.userData.fireflies) { const d = f.userData; f.position.set(d.x + Math.sin(t * d.s + d.p) * .8, d.y + Math.sin(t * d.s * 1.3 + d.p) * .4, d.z + Math.cos(t * d.s + d.p) * .8); }
  if (sc.set === 'cave') { const cr = G.cave.userData.crystal; cr.rotation.y = t * .8; cr.position.y = 1.9 + Math.sin(t * 1.6) * .12; }
  if (sc.set === 'house' && sc.doorOpen) { const o = kf(t, sc.doorOpen)[0] ?? 0; G.house.userData.door.position.y = 2.5 + o * 5.2; }
  // camera
  const cp = kf(t, sc.cam.pos), cl = kf(t, sc.cam.look);
  const sh = sc.cam.shake ? kf(t, sc.cam.shake)[0] : 0;
  const r = mulberry32(Math.floor(t * 30) * 9301 + 49297);
  camera.position.set(cp[0] + (r() - .5) * sh, cp[1] + (r() - .5) * sh, cp[2] + (r() - .5) * sh);
  camera.lookAt(cl[0], cl[1], cl[2]);
  camera.fov = sc.cam.fov ? kf(t, sc.cam.fov)[0] : 48; camera.updateProjectionMatrix();
  // fondus : noir 0.3s autour des coupures + debut + fin
  let fade = 0;
  for (const s of spec.scenes) { if (s.start > 0) fade = Math.max(fade, 1 - Math.min(1, Math.abs(t - s.start) / 0.3)); }
  fade = Math.max(fade, 1 - ss(0, 0.5, t));
  const endAt = spec.duration - (spec.cardDuration || 0);
  if (spec.card) fade = Math.max(fade, ss(endAt - 2, endAt - 0.4, t));
  else fade = Math.max(fade, ss(spec.duration - 0.6, spec.duration, t));
  document.getElementById('fade').style.opacity = fade.toFixed(3);
  // sous-titre
  const cap = document.getElementById('cap');
  const capT = sc.caption && t >= sc.start + 0.4 && t < sc.end - 0.3;
  cap.textContent = capT ? sc.caption : '';
  cap.style.opacity = capT ? Math.min(ss(sc.start + .4, sc.start + .8, t), 1 - ss(sc.end - .6, sc.end - .3, t)).toFixed(3) : 0;
  // carton final
  const card = document.getElementById('card');
  if (spec.card) { card.textContent = spec.card; card.style.opacity = ss(endAt - 0.4, endAt + 0.4, t).toFixed(3); } else card.style.opacity = 0;
  renderer.render(scene, camera);
}

// ---------- audio (OfflineAudioContext, tout pre-programme) ----------
async function renderAudio(sr = 44100) {
  const dur = spec.duration; const ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  const pent = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33, 698.46]; // Re mineur pentatonique+
  const r = mulberry32(spec.seed || 7);
  const pad = ctx.createOscillator(); pad.type = 'sawtooth'; pad.frequency.value = (spec.music?.root || 73.42);
  const pf = ctx.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 280; const pg = ctx.createGain(); pg.gain.setValueAtTime(0, 0); pg.gain.linearRampToValueAtTime(.09, 3); pg.gain.setValueAtTime(.09, dur - 3); pg.gain.linearRampToValueAtTime(0, dur);
  pad.connect(pf).connect(pg).connect(master); pad.start(0); pad.stop(dur);
  const mood = spec.music?.mood || 'adventure';
  const step = mood === 'horror' ? 2.2 : 0.5;
  const scale = mood === 'horror' ? [293.66, 311.13, 392.0, 415.3] : pent;
  for (let tt = 1; tt < dur - 2; tt += step) {
    if (r() < (mood === 'horror' ? .55 : .75)) {
      const o = ctx.createOscillator(); o.type = mood === 'horror' ? 'sine' : 'triangle'; o.frequency.value = scale[Math.floor(r() * scale.length)] * (mood === 'horror' ? .5 : 1);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(mood === 'horror' ? .06 : .11, tt + .02); g.gain.exponentialRampToValueAtTime(.0008, tt + (mood === 'horror' ? 2 : .55));
      o.connect(g).connect(master); o.start(tt); o.stop(tt + 2.2);
    }
  }
  // bruit (vent / air)
  const nb = ctx.createBuffer(1, sr * 2, sr); const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;
  const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true; const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 600; const ng = ctx.createGain(); ng.gain.value = spec.music?.wind ?? .035; ns.connect(nf).connect(ng).connect(master); ns.start(0);
  for (const e of (spec.sfx || [])) {
    if (e.type === 'chime') for (let i = 0; i < 3; i++) { const o = ctx.createOscillator(); o.frequency.value = [880, 1174.7, 1568][i]; const g = ctx.createGain(); const tt = e.t + i * .22; g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(.18, tt + .02); g.gain.exponentialRampToValueAtTime(.001, tt + 1.8); o.connect(g).connect(master); o.start(tt); o.stop(tt + 2); }
    if (e.type === 'hit') { const o = ctx.createOscillator(); o.frequency.setValueAtTime(70, e.t); o.frequency.exponentialRampToValueAtTime(28, e.t + 1.2); const g = ctx.createGain(); g.gain.setValueAtTime(.9, e.t); g.gain.exponentialRampToValueAtTime(.001, e.t + 1.4); o.connect(g).connect(master); o.start(e.t); o.stop(e.t + 1.5); }
    if (e.type === 'whoosh') { const s = ctx.createBufferSource(); s.buffer = nb; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(300, e.t); f.frequency.exponentialRampToValueAtTime(3000, e.t + .8); const g = ctx.createGain(); g.gain.setValueAtTime(0, e.t); g.gain.linearRampToValueAtTime(.35, e.t + .4); g.gain.linearRampToValueAtTime(0, e.t + 1); s.connect(f).connect(g).connect(master); s.start(e.t, 0, 1.2); }
  }
  const buf = await ctx.startRendering();
  return [Array.from(buf.getChannelData(0)), Array.from(buf.getChannelData(1))];
}

window.loadSpec = (s) => { spec = s; character = makeCharacter(s.character || {}); scene.add(character); return true; };
window.renderFrame = (i) => { update(i / (spec.fps || 30)); return true; };
window.renderAudio = renderAudio;
window.__ready = true;
