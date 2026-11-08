// Moteur video 3D v2 (methode_video_3d.md). TOUT est fonction du temps t. Aucun Math.random().
import * as THREE from '../lib/three.module.js';

const W = 1080, H = 1920;
export const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
function mulberry32(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function kf(t, keys) {
  if (!keys || !keys.length) return [];
  if (t <= keys[0][0]) return keys[0].slice(1);
  const L = keys[keys.length - 1];
  if (t >= L[0]) return L.slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t >= a[0] && t <= b[0]) { const k = ss(a[0], b[0], t); return a.slice(1).map((v, j) => lerp(v, b[j + 1], k)); } }
  return L.slice(1);
}
const col = (c) => new THREE.Color(c);
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.85, metalness: 0.02, ...o });
const EM = (c, i = 2) => new THREE.MeshStandardMaterial({ color: col(c), emissive: col(c), emissiveIntensity: i, roughness: 0.4 });
const mesh = (geo, mat, x = 0, y = 0, z = 0, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; return m; };

// ---------- rendu ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('stage').prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a2a1a, 0.8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 }); sun.shadow.bias = -0.0004;
scene.add(sun); scene.add(sun.target);
const accent = new THREE.PointLight(0x4aa8ff, 0, 45, 1.5); scene.add(accent);

// ---------- personnages ----------
const SHEET_DEFAULT = { kind: 'human', jacket: '#2f6b5a', pants: '#4d3a28', boots: '#2b1c10', pack: '#c8782c', scarf: '#e04a3a', hair: '#2a180c', skin: '#e0ac84', ponytail: true, ears: 'none', tail: false, hat: 'none', scale: 1, kid: false, earColor: null, tailColor: null, hatColor: '#c0392b' };
function limb(len, r, c, x, y, box) { const p = new THREE.Group(); p.position.set(x, y, 0); const m = mesh(box ? new THREE.BoxGeometry(r * 2, len + r * 2, r * 2) : new THREE.CapsuleGeometry(r, len, 5, 10), M(c, box ? { metalness: .6, roughness: .35 } : {})); m.position.y = -len / 2 - r; p.add(m); return p; }
function makeCharacter(sh) {
  const s = { ...SHEET_DEFAULT, ...sh };
  const g = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.95; g.add(hips);
  let head = new THREE.Group(); head.position.y = 1.08; hips.add(head);
  let legL, legR, armL, armR;
  if (s.kind === 'robot') {
    hips.add(mesh(new THREE.BoxGeometry(.62, .8, .4), M(s.jacket, { metalness: .7, roughness: .3 }), 0, .45, 0));
    hips.add(mesh(new THREE.BoxGeometry(.3, .3, .05), EM(s.scarf, 1.6), 0, .5, .22, false));
    head.add(mesh(new THREE.BoxGeometry(.55, .45, .45), M(s.skin, { metalness: .7, roughness: .3 })));
    head.add(mesh(new THREE.BoxGeometry(.4, .14, .05), EM('#7fe9ff', 2.5), 0, .03, .24, false));
    head.add(mesh(new THREE.CylinderGeometry(.02, .02, .3, 6), M('#999999'), 0, .38, 0)); head.add(mesh(new THREE.SphereGeometry(.06, 8, 8), EM(s.scarf, 2), 0, .55, 0, false));
    legL = limb(.55, .1, s.pants, -.17, 0, true); legR = limb(.55, .1, s.pants, .17, 0, true); armL = limb(.5, .08, s.jacket, -.4, .78, true); armR = limb(.5, .08, s.jacket, .4, .78, true);
  } else {
    hips.add(mesh(new THREE.CapsuleGeometry(.26, .5, 6, 14), M(s.jacket), 0, .45, 0));
    if (s.pack) hips.add(mesh(new THREE.BoxGeometry(.42, .5, .22), M(s.pack), 0, .5, -.27));
    if (s.scarf) { const sc = new THREE.Mesh(new THREE.TorusGeometry(.2, .07, 10, 20), M(s.scarf)); sc.rotation.x = Math.PI / 2; sc.position.y = .88; hips.add(sc); }
    const hr = s.kid ? 1.3 : 1;
    const skull = mesh(new THREE.SphereGeometry(.25 * hr, 20, 16), M(s.skin)); head.add(skull); head.position.y = 1.08 + (s.kid ? .06 : 0);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.265 * hr, 20, 14, 0, Math.PI * 2, 0, Math.PI * .55), M(s.hair)); hair.position.y = .02; hair.rotation.x = -.25; head.add(hair);
    if (s.ponytail) { const pt = mesh(new THREE.CapsuleGeometry(.06, .28, 4, 8), M(s.hair), 0, -.02, -.3 * hr); pt.rotation.x = .5; head.add(pt); head.userData.pt = pt; }
    for (const x of [-.09, .09]) head.add(mesh(new THREE.SphereGeometry(.03 * hr, 8, 8), M('#000', { roughness: .3 }), x * hr, .02, .235 * hr, false));
    legL = limb(.62, .11, s.pants, -.14, 0); legR = limb(.62, .11, s.pants, .14, 0); armL = limb(.5, .085, s.jacket, -.34, .78); armR = limb(.5, .085, s.jacket, .34, .78);
    if (s.ears !== 'none') {
      const ec = s.earColor || s.hair; const tall = s.ears === 'bunny';
      for (const x of [-.14, .14]) { const e = mesh(new THREE.ConeGeometry(tall ? .07 : .09, tall ? .5 : .24, 8), M(ec), x * hr, tall ? .42 * hr : .3 * hr, 0); if (tall) e.rotation.z = -x * 1.2; head.add(e); }
    }
    if (s.tail) { const tl = mesh(new THREE.CapsuleGeometry(.09, .4, 4, 8), M(s.tailColor || s.hair), 0, .1, -.34); tl.rotation.x = 1.0; hips.add(tl); hips.userData.tail = tl; }
    if (s.hat === 'cap') { head.add(mesh(new THREE.SphereGeometry(.27 * hr, 16, 10, 0, Math.PI * 2, 0, Math.PI * .5), M(s.hatColor), 0, .04, 0)); head.add(mesh(new THREE.BoxGeometry(.3, .03, .22), M(s.hatColor), 0, .06, .26)); }
    if (s.hat === 'wizard') { head.add(mesh(new THREE.ConeGeometry(.28, .7, 12), M(s.hatColor), 0, .5, 0)); head.add(mesh(new THREE.CylinderGeometry(.42, .42, .03, 16), M(s.hatColor), 0, .18, 0)); }
    if (s.hat === 'crown') head.add(mesh(new THREE.CylinderGeometry(.2, .24, .16, 8), M('#f0c030', { metalness: .9, roughness: .25 }), 0, .27, 0));
    if (s.hat === 'helmet') head.add(mesh(new THREE.SphereGeometry(.29 * hr, 16, 12, 0, Math.PI * 2, 0, Math.PI * .6), M(s.hatColor, { metalness: .5, roughness: .3 }), 0, .03, 0));
  }
  for (const l of [legL, legR]) l.add(mesh(new THREE.BoxGeometry(.2, .14, .32), M(s.boots), 0, -.82, .05));
  hips.add(legL, legR, armL, armR);
  g.scale.setScalar(s.scale || 1);
  g.userData = { hips, head, legL, legR, armL, armR, tail: hips.userData.tail };
  return g;
}
function poseCharacter(c, t, speed, anim) {
  const U = c.userData; const walk = Math.min(1, speed / 1.6), ph = t * (3.2 + speed * 1.3);
  U.legL.rotation.x = Math.sin(ph) * .8 * walk; U.legR.rotation.x = -Math.sin(ph) * .8 * walk;
  U.armL.rotation.x = -Math.sin(ph) * .7 * walk; U.armR.rotation.x = Math.sin(ph) * .7 * walk;
  U.armL.rotation.z = U.armR.rotation.z = 0; U.hips.rotation.z = Math.sin(ph) * .03 * walk;
  U.hips.position.y = .95 + Math.abs(Math.cos(ph)) * .05 * walk + Math.sin(t * 2) * .01;
  U.head.rotation.set(0, 0, 0);
  if (anim === 'run') { const p2 = t * 7; U.legL.rotation.x = Math.sin(p2) * 1.1; U.legR.rotation.x = -Math.sin(p2) * 1.1; U.armL.rotation.x = -Math.sin(p2) * 1.0; U.armR.rotation.x = Math.sin(p2) * 1.0; U.hips.position.y = .95 + Math.abs(Math.cos(p2)) * .09; }
  if (anim === 'scared') { U.armL.rotation.x = U.armR.rotation.x = -1.9; U.armL.rotation.z = .3; U.armR.rotation.z = -.3; U.head.rotation.x = -.15; U.hips.position.y -= .06; U.hips.rotation.z = Math.sin(t * 38) * .02; }
  else if (anim === 'wave') { U.armR.rotation.x = -2.6; U.armR.rotation.z = -.2 + Math.sin(t * 9) * .45; }
  else if (anim === 'look') { U.head.rotation.y = Math.sin(t * 1.3) * .9; }
  else if (anim === 'dance') { U.hips.rotation.y = Math.sin(t * 6) * .5; U.armL.rotation.x = -2.4 + Math.sin(t * 6) * .6; U.armR.rotation.x = -2.4 - Math.sin(t * 6) * .6; U.legL.rotation.x = Math.sin(t * 6) * .4; U.legR.rotation.x = -Math.sin(t * 6) * .4; U.hips.position.y = .95 + Math.abs(Math.sin(t * 6)) * .1; }
  else if (anim === 'jump') { const j = Math.abs(Math.sin(t * 3.2)); U.hips.position.y = .95 + j * .6; U.armL.rotation.x = U.armR.rotation.x = -2.8 * j; U.legL.rotation.x = U.legR.rotation.x = -.5 * j; }
  else if (anim === 'point') { U.armR.rotation.x = -1.57; U.head.rotation.y = .3; }
  else if (anim === 'sit') { U.hips.position.y = .55; U.legL.rotation.x = U.legR.rotation.x = -1.5; }
  if (U.head.userData.pt) U.head.userData.pt.rotation.x = .5 + Math.sin(ph * .5) * .25 * walk + Math.sin(t * 3) * .05;
  if (U.tail) U.tail.rotation.z = Math.sin(t * 4) * .35;
}

// ---------- decors ----------
const hex = (c) => c;
function treeObj(r, kind, color) {
  const g = new THREE.Group();
  if (kind === 'palm') { const h = 5 + r() * 2.5; const tr = mesh(new THREE.CylinderGeometry(.18, .28, h, 8), M('#8a6a45'), 0, h / 2, 0); tr.rotation.z = (r() - .5) * .25; g.add(tr); for (let i = 0; i < 7; i++) { const l = mesh(new THREE.ConeGeometry(.5, 3.2, 4), M(color || '#2f8f4a')); const a = i / 7 * Math.PI * 2; l.position.set(Math.cos(a) * 1.3, h - .2, Math.sin(a) * 1.3); l.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); g.add(l); } }
  else if (kind === 'round') { const h = 3 + r() * 2; g.add(mesh(new THREE.CylinderGeometry(.25, .35, h, 8), M('#6a4a2c'), 0, h / 2, 0)); for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(1.3 + r() * .6, 12, 10), M(color || '#4cae4f'), (r() - .5) * 1.2, h + .4 + r() * .8, (r() - .5) * 1.2)); }
  else if (kind === 'dead') { const h = 4 + r() * 3; const tr = mesh(new THREE.CylinderGeometry(.12, .3, h, 6), M('#2a2420'), 0, h / 2, 0); tr.rotation.z = (r() - .5) * .3; g.add(tr); for (let i = 0; i < 5; i++) { const b = mesh(new THREE.CylinderGeometry(.04, .09, 1.8, 5), M('#2a2420'), 0, h * (.5 + i * .1), 0); b.rotation.z = (i % 2 ? 1 : -1) * (.7 + r() * .5); b.rotation.y = r() * 6; b.position.x = (i % 2 ? .6 : -.6); g.add(b); } }
  else { const h = 5 + r() * 5; g.add(mesh(new THREE.CylinderGeometry(.25, .4, h * .5, 8), M('#4a3322'), 0, h * .25, 0)); for (let i = 0; i < 3; i++) g.add(mesh(new THREE.ConeGeometry(2.1 - i * .5, h * .55, 9), M(color || (kind === 'dark' ? '#173d2a' : kind === 'snow' ? '#e8f2ff' : '#1f5a35')), 0, h * .45 + i * h * .22, 0)); }
  return g;
}
function ground(w, d, color, z = -40, y = 0, rough = .95) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M(color, { roughness: rough })); m.rotation.x = -Math.PI / 2; m.position.set(0, y, z); m.receiveShadow = true; return m; }
function scatter(g, r, n, fn, xr = [4, 30], zr = [10, -150]) { for (let i = 0; i < n; i++) { const o = fn(i); const side = r() < .5 ? -1 : 1; o.position.set(side * (xr[0] + r() * (xr[1] - xr[0])), o.position.y || 0, zr[0] + r() * (zr[1] - zr[0])); g.add(o); } }
const SETS = {
  beach(r, p) { const g = new THREE.Group(); const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), M(p.water || '#1fa6b8', { roughness: .25, metalness: .1 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -.3; g.add(sea); g.add(ground(70, 160, p.ground || '#e6cf9b', -55)); scatter(g, r, 18, () => treeObj(r, 'palm'), [7, 22]); scatter(g, r, 20, () => { const k = mesh(new THREE.DodecahedronGeometry(.4 + r() * 1.1), M('#8b8478'), 0, .2, 0); return k; }, [1, 14]); g.userData.sky = '#9fd8f2'; g.userData.light = 'day'; return g; },
  meadow(r, p) { const g = new THREE.Group(); g.add(ground(200, 260, p.ground || '#5cc15a', -80)); for (let i = 0; i < 9; i++) { const h = mesh(new THREE.SphereGeometry(14 + r() * 10, 18, 12), M(p.hill || '#4aa84c'), (r() - .5) * 140, -8 - r() * 3, -60 - r() * 70, false); h.scale.y = .55; g.add(h); }
    scatter(g, r, 14, () => treeObj(r, 'round', p.leaf), [6, 28]); const fc = ['#ff6b8b', '#ffd23f', '#ffffff', '#b78cff', '#ff9a3c'];
    for (let i = 0; i < 160; i++) { const f = new THREE.Group(); f.add(mesh(new THREE.CylinderGeometry(.02, .02, .35, 4), M('#2f8f3a'), 0, .17, 0, false)); f.add(mesh(new THREE.SphereGeometry(.11, 8, 6), M(fc[i % 5]), 0, .38, 0, false)); f.position.set((r() - .5) * 30, 0, 8 - r() * 110); g.add(f); }
    for (let i = 0; i < 8; i++) { const c = new THREE.Group(); for (let j = 0; j < 4; j++) c.add(mesh(new THREE.SphereGeometry(2 + r() * 1.5, 10, 8), M('#ffffff', { roughness: 1 }), j * 2.2, r(), 0, false)); c.position.set((r() - .5) * 120, 22 + r() * 10, -50 - r() * 90); g.add(c); }
    g.userData.sky = '#8fd3ff'; g.userData.light = 'day'; return g; },
  forest(r, p) { const g = new THREE.Group(); g.add(ground(200, 260, p.ground || '#14301f', -80)); scatter(g, r, 95, () => { const t = treeObj(r, p.kind || 'dark', p.leaf); t.scale.setScalar(.8 + r() * .9); return t; }, [4, 32]);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 220), M('#4a3a28')); path.rotation.x = -Math.PI / 2; path.position.set(0, .02, -80); path.receiveShadow = true; g.add(path);
    g.userData.sky = '#0d1f1a'; g.userData.light = 'creepy'; return g; },
  cave(r, p) { const g = new THREE.Group(); g.add(ground(60, 140, '#2a2622', -40)); for (const x of [-9, 9]) g.add(mesh(new THREE.BoxGeometry(2, 14, 140), M('#26221f'), x, 7, -40, false)); g.add(mesh(new THREE.BoxGeometry(22, 2, 140), M('#1d1a18'), 0, 14, -40, false));
    for (let i = 0; i < 45; i++) { const up = r() < .5; const k = mesh(new THREE.ConeGeometry(.3 + r() * .6, 1.5 + r() * 3, 6), M('#3a342f'), (r() - .5) * 16, up ? .8 : 13, -r() * 70); if (!up) k.rotation.x = Math.PI; g.add(k); }
    const cr = mesh(new THREE.OctahedronGeometry(1.1, 0), new THREE.MeshStandardMaterial({ color: col(p.crystal || '#66c8ff'), emissive: col(p.crystal || '#2a8cff'), emissiveIntensity: 2.2, roughness: .15 }), 0, 1.9, p.crystalZ ?? -22, false); cr.scale.y = 1.7; g.add(cr); g.userData.crystal = cr; g.add(mesh(new THREE.CylinderGeometry(1.1, 1.4, .9, 10), M('#4a4540'), 0, .45, p.crystalZ ?? -22));
    for (let i = 0; i < 60; i++) g.add(mesh(new THREE.CylinderGeometry(.22, .22, .05, 12), M('#e8b63a', { metalness: .9, roughness: .25, emissive: 0x6a4a00, emissiveIntensity: .45 }), (r() - .5) * 8, .06 + r() * .25, (p.crystalZ ?? -22) + 6 + r() * 10, false));
    g.userData.sky = '#050608'; g.userData.light = 'magic'; return g; },
  house(r, p) { const g = new THREE.Group(); g.add(ground(14, 100, p.floor || '#3b2a1e', -35)); for (const x of [-4, 4]) g.add(mesh(new THREE.BoxGeometry(.4, 7, 100), M(p.wall || '#5b4a3a'), x, 3.5, -35, false)); g.add(mesh(new THREE.BoxGeometry(8.4, .4, 100), M('#2b211a'), 0, 7, -35, false));
    for (let i = 0; i < 7; i++) { g.add(mesh(new THREE.BoxGeometry(.2, 3.4, 1.7), M('#2a1c12'), i % 2 ? 3.7 : -3.7, 1.7, -4 - i * 7, false)); g.add(mesh(new THREE.BoxGeometry(.1, 2.2, 1.5), M('#6a5238'), i % 2 ? 3.55 : -3.55, 3.6, -4 - i * 7, false)); g.add(mesh(new THREE.SphereGeometry(.18, 8, 8), EM('#ffcf80', 2), 0, 6.5, -6 - i * 7, false)); }
    const door = mesh(new THREE.BoxGeometry(3, 5, .3), M('#1d120b'), 0, 2.5, p.doorZ ?? -46, false); g.add(door); g.userData.door = door; g.userData.sky = '#0a0705'; g.userData.light = 'creepy'; return g; },
  desert(r, p) { const g = new THREE.Group(); g.add(ground(300, 300, p.ground || '#e2b266', -80)); for (let i = 0; i < 14; i++) { const d = mesh(new THREE.SphereGeometry(10 + r() * 14, 16, 10), M(p.dune || '#d9a557'), (r() - .5) * 160, -6, -40 - r() * 120, false); d.scale.set(1.8, .45, 1); g.add(d); }
    scatter(g, r, 22, () => { const c = new THREE.Group(); const h = 2 + r() * 2.5; c.add(mesh(new THREE.CapsuleGeometry(.3, h, 4, 8), M('#4f8f3e'), 0, h / 2 + .3, 0)); const a = mesh(new THREE.CapsuleGeometry(.18, 1, 4, 8), M('#4f8f3e'), .6, h * .6, 0); a.rotation.z = -.5; c.add(a); return c; }, [4, 26]);
    scatter(g, r, 18, () => mesh(new THREE.DodecahedronGeometry(.5 + r()), M('#a8794a'), 0, .3, 0), [2, 24]);
    if (p.pyramid !== false) { const py = mesh(new THREE.ConeGeometry(18, 22, 4), M('#cfa056'), 20, 11, -110, false); py.rotation.y = .8; g.add(py); }
    g.userData.sky = '#ffd9a0'; g.userData.light = 'golden'; return g; },
  snow(r, p) { const g = new THREE.Group(); g.add(ground(220, 280, '#f2f8ff', -80, 0, .7)); for (let i = 0; i < 8; i++) { const h = mesh(new THREE.SphereGeometry(14 + r() * 10, 16, 10), M('#e8f1fb'), (r() - .5) * 140, -8, -60 - r() * 70, false); h.scale.y = .6; g.add(h); }
    scatter(g, r, 70, () => { const t = treeObj(r, 'snow'); t.scale.setScalar(.8 + r() * .8); return t; }, [4, 30]); scatter(g, r, 14, () => mesh(new THREE.DodecahedronGeometry(.6 + r()), M('#cfd9e6'), 0, .3, 0), [2, 20]);
    g.userData.sky = '#cfe4f7'; g.userData.light = 'snow'; return g; },
  street(r, p) { const g = new THREE.Group(); g.add(ground(26, 260, '#25282e', -80, 0, .6)); for (const x of [-9, 9]) g.add(ground(8, 260, '#4a4d55', -80, .12)).position.x = x;
    const wc = ['#ffd27a', '#ffefb0', '#7ac8ff', '#2a3040']; for (const sx of [-1, 1]) for (let i = 0; i < 16; i++) { const h = 10 + r() * 22, d = 8 + r() * 6; const b = mesh(new THREE.BoxGeometry(10, h, d), M('#2d3140'), sx * (17 + r() * 3), h / 2, 8 - i * 14, false); g.add(b); for (let k = 0; k < 14; k++) { const w = mesh(new THREE.BoxGeometry(.1, 1.2, 1.4), EM(wc[Math.floor(r() * 4)], wc[0] === '#2a3040' ? .1 : 1.4), sx * 12, 2 + r() * (h - 3), 8 - i * 14 + (r() - .5) * (d - 2), false); g.add(w); } }
    for (let i = 0; i < 12; i++) for (const sx of [-1, 1]) { const l = new THREE.Group(); l.add(mesh(new THREE.CylinderGeometry(.08, .1, 5, 6), M('#222'), 0, 2.5, 0)); l.add(mesh(new THREE.SphereGeometry(.28, 8, 8), EM('#ffdca0', 3), 0, 5.1, 0, false)); l.position.set(sx * 6, 0, 4 - i * 12); g.add(l); }
    g.userData.sky = '#0b1230'; g.userData.light = 'night'; return g; },
  graveyard(r, p) { const g = new THREE.Group(); g.add(ground(160, 240, '#1c2418', -70)); scatter(g, r, 40, () => { const t = new THREE.Group(); t.add(mesh(new THREE.BoxGeometry(1, 1.5, .25), M('#6a6e70'), 0, .75, 0)); const top = mesh(new THREE.CylinderGeometry(.5, .5, .25, 12), M('#6a6e70'), 0, 1.5, 0); top.rotation.x = Math.PI / 2; t.add(top); t.rotation.y = (r() - .5) * .5; t.rotation.z = (r() - .5) * .2; return t; }, [2, 18]);
    scatter(g, r, 16, () => treeObj(r, 'dead'), [6, 28]); g.add(mesh(new THREE.SphereGeometry(5, 20, 16), EM('#f2f0d8', 1.2), -30, 38, -120, false)); const fence = []; g.userData.sky = '#0c1018'; g.userData.light = 'creepy'; return g; },
  bedroom(r, p) { const g = new THREE.Group(); g.add(ground(12, 40, '#6a4e36', -8)); g.add(mesh(new THREE.BoxGeometry(12, 6, .3), M(p.wall || '#7a7088'), 0, 3, -22, false)); for (const x of [-6, 6]) g.add(mesh(new THREE.BoxGeometry(.3, 6, 40), M(p.wall || '#7a7088'), x, 3, -8, false)); g.add(mesh(new THREE.BoxGeometry(12, .3, 40), M('#cfc8d6'), 0, 6, -8, false));
    const bed = new THREE.Group(); bed.add(mesh(new THREE.BoxGeometry(2.4, .5, 3.4), M('#5a3a24'), 0, .45, 0)); bed.add(mesh(new THREE.BoxGeometry(2.2, .35, 3.1), M('#c9d6ff'), 0, .85, 0)); bed.add(mesh(new THREE.BoxGeometry(1.2, .25, .7), M('#ffffff'), 0, 1.1, -1.2)); bed.position.set(-3.5, 0, -19); g.add(bed);
    const w = mesh(new THREE.BoxGeometry(2.2, 4.4, 1.2), M('#3a2a1e'), 3.8, 2.2, -19); g.add(w); const wd = mesh(new THREE.BoxGeometry(2, 4.1, .1), M('#2a1c12'), 3.8, 2.2, -18.35, false); g.add(wd); g.userData.wardrobeDoor = wd;
    const win = mesh(new THREE.BoxGeometry(2.4, 2.6, .1), EM('#6a8aff', .9), 0, 3.4, -21.8, false); g.add(win); g.userData.sky = '#0a0c18'; g.userData.light = 'creepy'; return g; },
  moon(r, p) { const g = new THREE.Group(); g.add(ground(300, 300, '#8d8d94', -80)); for (let i = 0; i < 40; i++) { const c = mesh(new THREE.CylinderGeometry(1 + r() * 4, 1 + r() * 4, .3, 18), M('#76767e'), (r() - .5) * 120, .02, 10 - r() * 160, false); g.add(c); }
    scatter(g, r, 26, () => mesh(new THREE.DodecahedronGeometry(.4 + r() * 1.4), M('#9a9aa2'), 0, .3, 0), [3, 40]); g.add(mesh(new THREE.SphereGeometry(14, 28, 20), M('#2e6bd6', { roughness: .6 }), -40, 35, -130, false)); g.userData.sky = '#02030a'; g.userData.light = 'space'; g.userData.stars = true; return g; },
};
// ---------- accessoires ----------
function makeProp(type, o = {}) {
  const c = o.color; const g = new THREE.Group();
  switch (type) {
    case 'house': g.add(mesh(new THREE.BoxGeometry(5, 3.5, 5), M(c || '#e8d3a8'), 0, 1.75, 0)); g.add(mesh(new THREE.ConeGeometry(4.2, 2.4, 4), M('#a8402c'), 0, 4.7, 0)).rotation.y = Math.PI / 4; g.add(mesh(new THREE.BoxGeometry(1, 2, .1), M('#5a3a24'), 0, 1, 2.52, false)); g.add(mesh(new THREE.BoxGeometry(1, 1, .1), EM('#ffd27a', 1.2), 1.5, 2, 2.52, false)); break;
    case 'lamp': g.add(mesh(new THREE.CylinderGeometry(.08, .1, 4, 6), M('#222'), 0, 2, 0)); g.add(mesh(new THREE.SphereGeometry(.3, 10, 10), EM(c || '#ffdca0', 3), 0, 4.1, 0, false)); break;
    case 'chest': g.add(mesh(new THREE.BoxGeometry(1.4, .8, .9), M(c || '#7a4a24'), 0, .4, 0)); g.add(mesh(new THREE.CylinderGeometry(.45, .45, 1.4, 12, 1, false, 0, Math.PI), M(c || '#7a4a24'), 0, .8, 0)).rotation.z = Math.PI / 2; g.add(mesh(new THREE.SphereGeometry(.14, 8, 8), M('#f0c030', { metalness: .9 }), 0, .75, .46)); break;
    case 'flower': g.add(mesh(new THREE.CylinderGeometry(.05, .05, 1.2, 6), M('#2f8f3a'), 0, .6, 0)); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; g.add(mesh(new THREE.SphereGeometry(.22, 8, 6), M(c || '#ff6b8b'), Math.cos(a) * .3, 1.25, Math.sin(a) * .3)); } g.add(mesh(new THREE.SphereGeometry(.18, 8, 8), M('#ffd23f'), 0, 1.28, 0)); break;
    case 'balloon': g.add(mesh(new THREE.SphereGeometry(.6, 16, 12), M(c || '#ff4a5a', { roughness: .3 }), 0, 3, 0)).scale.y = 1.2; g.add(mesh(new THREE.CylinderGeometry(.01, .01, 2.4, 4), M('#ddd'), 0, 1.4, 0, false)); break;
    case 'ghost': { const b = mesh(new THREE.CapsuleGeometry(.5, 1.1, 6, 12), new THREE.MeshStandardMaterial({ color: col(c || '#e8f4ff'), emissive: col(c || '#9ac8ff'), emissiveIntensity: .8, transparent: true, opacity: .8 }), 0, 1.6, 0, false); g.add(b); for (const x of [-.18, .18]) g.add(mesh(new THREE.SphereGeometry(.08, 8, 8), M('#000'), x, 2.0, .45, false)); g.add(mesh(new THREE.SphereGeometry(.12, 8, 8), M('#000'), 0, 1.7, .47, false)); break; }
    case 'snowman': g.add(mesh(new THREE.SphereGeometry(.9, 14, 12), M('#fff'), 0, .9, 0)); g.add(mesh(new THREE.SphereGeometry(.65, 14, 12), M('#fff'), 0, 2.1, 0)); g.add(mesh(new THREE.SphereGeometry(.45, 14, 12), M('#fff'), 0, 3, 0)); g.add(mesh(new THREE.ConeGeometry(.08, .45, 6), M('#ff8a30'), 0, 3, .5)).rotation.x = Math.PI / 2; g.add(mesh(new THREE.CylinderGeometry(.3, .3, .35, 10), M('#222'), 0, 3.5, 0)); break;
    case 'tombstone': g.add(mesh(new THREE.BoxGeometry(1, 1.5, .25), M('#6a6e70'), 0, .75, 0)); break;
    case 'rocket': g.add(mesh(new THREE.CylinderGeometry(.9, 1.1, 5, 14), M(c || '#e8e8f0', { metalness: .4 }), 0, 2.5, 0)); g.add(mesh(new THREE.ConeGeometry(.9, 1.8, 14), M('#d0392b'), 0, 5.9, 0)); for (let i = 0; i < 3; i++) { const f = mesh(new THREE.BoxGeometry(.1, 1.4, 1), M('#d0392b'), Math.cos(i * 2.09) * 1.1, .7, Math.sin(i * 2.09) * 1.1); f.rotation.y = -i * 2.09; g.add(f); } g.add(mesh(new THREE.SphereGeometry(.4, 10, 10), EM('#7fe9ff', 1.2), 0, 3.6, .9, false)); break;
    case 'star': g.add(mesh(new THREE.OctahedronGeometry(.5), EM(c || '#ffe36a', 2.4), 0, 1.5, 0, false)); break;
    case 'mushroom': g.add(mesh(new THREE.CylinderGeometry(.15, .2, .8, 8), M('#f2e6d0'), 0, .4, 0)); g.add(mesh(new THREE.SphereGeometry(.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(c || '#d0392b'), 0, .8, 0)); break;
    case 'crystal': g.add(mesh(new THREE.OctahedronGeometry(.8), new THREE.MeshStandardMaterial({ color: col(c || '#66c8ff'), emissive: col(c || '#2a8cff'), emissiveIntensity: 2, roughness: .15 }), 0, 1.3, 0, false)).scale.y = 1.7; break;
    case 'tree': g.add(treeObj(mulberry32(5), o.kind || 'round', c)); break;
    case 'rock': g.add(mesh(new THREE.DodecahedronGeometry(.9), M(c || '#8b8478'), 0, .5, 0)); break;
    case 'fence': for (let i = 0; i < 5; i++) g.add(mesh(new THREE.BoxGeometry(.15, 1.1, .15), M(c || '#a07a4a'), i * .7 - 1.4, .55, 0)); g.add(mesh(new THREE.BoxGeometry(3.2, .12, .1), M(c || '#a07a4a'), 0, .8, 0)); break;
    case 'bed': g.add(mesh(new THREE.BoxGeometry(2.4, .5, 3.4), M('#5a3a24'), 0, .45, 0)); g.add(mesh(new THREE.BoxGeometry(2.2, .35, 3.1), M(c || '#c9d6ff'), 0, .85, 0)); break;
    case 'campfire': g.add(mesh(new THREE.CylinderGeometry(.5, .6, .2, 10), M('#3a2a1e'), 0, .1, 0)); g.add(mesh(new THREE.ConeGeometry(.35, 1.1, 8), EM('#ff8a30', 2.5), 0, .75, 0, false)); break;
    case 'monster': { const b = mesh(new THREE.SphereGeometry(1.2, 16, 12), M(c || '#5a2a7a'), 0, 1.4, 0); b.scale.y = 1.15; g.add(b); for (const x of [-.4, .4]) { g.add(mesh(new THREE.SphereGeometry(.3, 10, 10), M('#fff'), x, 1.9, 1)); g.add(mesh(new THREE.SphereGeometry(.14, 8, 8), M('#000'), x, 1.9, 1.25)); } for (const x of [-.7, .7]) g.add(mesh(new THREE.ConeGeometry(.2, .6, 6), M('#f2e6d0'), x, 2.9, 0)); break; }
    default: throw new Error('prop inconnu: ' + type);
  }
  g.scale.setScalar(o.scale || 1); return g;
}
// ---------- meteo / particules ----------
function makeWeather(kind, seed) {
  const r = mulberry32(seed * 31 + 5); const n = { rain: 900, snow: 700, fireflies: 80, dust: 220, embers: 160, stars: 700, bubbles: 120 }[kind]; if (!n) throw new Error('weather inconnu: ' + kind);
  const pos = new Float32Array(n * 3), base = []; for (let i = 0; i < n; i++) { base.push([(r() - .5) * 26, r() * 14, -r() * 24, r()]); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const cfg = { rain: ['#a8c8ff', .09, .75], snow: ['#ffffff', .16, .95], fireflies: ['#c8ff80', .22, 1], dust: ['#e8d8b0', .07, .5], embers: ['#ff9a40', .12, .9], stars: ['#ffffff', .22, 1], bubbles: ['#a8e8ff', .2, .6] }[kind];
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx = cv.getContext('2d'); const gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: col(cfg[0]), size: cfg[1] * 1.6, map: new THREE.CanvasTexture(cv), transparent: true, opacity: cfg[2], sizeAttenuation: true, depthWrite: false, fog: false }));
  pts.frustumCulled = false; pts.userData = { kind, base, n }; return pts;
}
function updateWeather(w, t, cam) {
  const { kind, base, n } = w.userData; const a = w.geometry.attributes.position.array;
  for (let i = 0; i < n; i++) { const b = base[i]; let x = b[0], y = b[1], z = b[2];
    if (kind === 'rain') { y = ((b[1] - t * 14 * (.8 + b[3] * .4)) % 14 + 14) % 14; x += Math.sin(t * .5) * .3; }
    else if (kind === 'snow') { y = ((b[1] - t * 1.4 * (.6 + b[3])) % 14 + 14) % 14; x += Math.sin(t * .8 + b[3] * 9) * .6; }
    else if (kind === 'fireflies') { y = 1 + (b[1] % 5) * .6 + Math.sin(t * .9 + b[3] * 9) * .5; x += Math.sin(t * .6 + b[3] * 7) * 1.2; z += Math.cos(t * .5 + b[3] * 5) * 1.2; }
    else if (kind === 'dust') { x += Math.sin(t * .3 + b[3] * 9) * 1.5 + t * .4; x = ((x + 13) % 26 + 26) % 26 - 13; y = b[1] * .6 + Math.sin(t + b[3] * 6) * .4; }
    else if (kind === 'embers' || kind === 'bubbles') { y = ((b[1] + t * (kind === 'bubbles' ? .8 : 1.6) * (.5 + b[3])) % 14 + 14) % 14; x += Math.sin(t + b[3] * 8) * .5; }
    else if (kind === 'stars') { x = b[0] * 5; y = 5 + b[1] * 4; z = -60 - b[2] * 2; }
    a[i * 3] = x; a[i * 3 + 1] = y - (kind === 'stars' ? 0 : 3); a[i * 3 + 2] = z;
  }
  w.geometry.attributes.position.needsUpdate = true; w.position.copy(cam.position);
  w.rotation.y = Math.atan2(cam.getWorldDirection(new THREE.Vector3()).x, cam.getWorldDirection(new THREE.Vector3()).z) + Math.PI;
}
// ---------- lumiere ----------
const LIGHTS = {
  day: { sun: 2.6, hemi: 1.0, sky: '#9fd8f2', fog: [50, 180], sunColor: '#fff0d0', hemiColor: '#cfe6ff' },
  golden: { sun: 2.2, hemi: .9, sky: '#ffcf90', fog: [40, 170], sunColor: '#ffc07a', hemiColor: '#ffe0b0', sunPos: [-35, 22, 10] },
  dusk: { sun: 1.0, hemi: .65, sky: '#7a5a9a', fog: [25, 110], sunColor: '#ff9a70', hemiColor: '#a89ae0', sunPos: [-35, 10, 10] },
  night: { sun: .5, hemi: .7, sky: '#0f1838', fog: [20, 95], sunColor: '#9fb8ff', hemiColor: '#5a6ab0' },
  creepy: { sun: .7, hemi: .95, sky: '#101c20', fog: [10, 70], sunColor: '#b8c8d0', hemiColor: '#5a7078', accent: { color: '#9ad8c8', intensity: 4, rel: [0, 3, -5] } },
  blood: { sun: .35, hemi: .6, sky: '#14040a', fog: [5, 40], sunColor: '#ff5040', hemiColor: '#601820', accent: { color: '#ff2a1a', intensity: 55, rel: [0, 4, -12] } },
  magic: { sun: .5, hemi: .55, sky: '#120a30', fog: [10, 70], sunColor: '#b0a0ff', hemiColor: '#6a5ad0', accent: { color: '#66d0ff', intensity: 60, rel: [0, 4, -10] } },
  snow: { sun: 1.8, hemi: 1.1, sky: '#d8ecff', fog: [30, 120], sunColor: '#fffaf0', hemiColor: '#e0f0ff' },
  space: { sun: 2.4, hemi: .35, sky: '#02030a', fog: [150, 400], sunColor: '#ffffff', hemiColor: '#3a4a7a' },
};

// ---------- chargement ----------
let spec = null, character = null, companion = null, shadowObj = null, sceneState = [];
function charYaw(sc) { const p = sc.path || [[0, 0, 0]]; const a = p[0], b = p[p.length - 1]; const dx = b[1] - a[1], dz = b[2] - a[2]; return Math.hypot(dx, dz) > .5 ? Math.atan2(dx, dz) : (sc.faceYaw ?? Math.PI); }
function loadSpec(s) {
  spec = s; const known = Object.keys(SETS);
  character = makeCharacter(s.character || {}); scene.add(character);
  if (s.companion) { companion = makeCharacter({ pack: null, scarf: null, ponytail: false, ...s.companion }); scene.add(companion); }
  shadowObj = new THREE.Group(); { const m = new THREE.MeshBasicMaterial({ color: 0x050000 }); const b = new THREE.Mesh(new THREE.CapsuleGeometry(.5, 1.7, 6, 12), m); b.position.y = 1.5; shadowObj.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(.45, 14, 12), m); h.position.y = 3; shadowObj.add(h); for (const x of [-.15, .15]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2a1a })); e.position.set(x, 3.05, .4); shadowObj.add(e); } shadowObj.visible = false; scene.add(shadowObj); }
  s.scenes.forEach((sc, i) => {
    if (!SETS[sc.set]) throw new Error(`decor inconnu "${sc.set}" (scene ${i}). Valides: ${known.join(', ')}`);
    const r = mulberry32((sc.seed ?? (s.seed || 1) * 100 + i) * 7919);
    const grp = SETS[sc.set](r, sc.setParams || {}); grp.visible = false; scene.add(grp);
    const props = (sc.props || []).map((p, k) => { const o = makeProp(p.type, p); const at = p.at || [0, 0]; o.position.set(at[0], p.y || 0, at[1]); o.rotation.y = p.rot || 0; grp.add(o); return { o, p }; });
    const weather = sc.weather ? makeWeather(sc.weather, i + 1) : (grp.userData.stars ? makeWeather('stars', i + 1) : null); if (weather) { weather.visible = false; scene.add(weather); }
    sceneState.push({ grp, props, weather });
  });
}
function autoCam(sc, t, c, yaw, speed) {
  const cam = typeof sc.cam === 'string' ? { mode: sc.cam } : (sc.cam || { mode: 'follow' });
  if (cam.pos) return null;
  const mode = cam.mode || 'follow', d = cam.dist ?? 6, h = cam.height ?? 2.4; const dx = Math.sin(yaw), dz = Math.cos(yaw); const k = ss(sc.start, sc.end, t); const ch = new THREE.Vector3(c.x, 1.45, c.z);
  let pos, look;
  switch (mode) {
    case 'front': pos = [c.x + dx * d, h, c.z + dz * d]; look = [c.x, 1.5, c.z]; break;
    case 'side': pos = [c.x + dz * d, h, c.z - dx * d]; look = [c.x, 1.4, c.z]; break;
    case 'orbit': { const a = yaw + Math.PI + (t - sc.start) * (cam.speed ?? .35); pos = [c.x + Math.sin(a) * d, h, c.z + Math.cos(a) * d]; look = [c.x, 1.4, c.z]; break; }
    case 'closeup': pos = [c.x + dx * (cam.dist ?? 3.2), 1.55, c.z + dz * (cam.dist ?? 3.2)]; look = [c.x, 1.45, c.z]; break;
    case 'wide': pos = [c.x - dx * d * 2.4, 6.5, c.z - dz * d * 2.4]; look = [c.x + dx * 5, 1.2, c.z + dz * 5]; break;
    case 'low': pos = [c.x - dx * d * .8 + dz * 2, .5, c.z - dz * d * .8 - dx * 2]; look = [c.x, 1.9, c.z]; break;
    case 'dolly_in': { const dd = lerp(d + 3, 2.4, k); pos = [c.x + dx * dd, h * .75, c.z + dz * dd]; look = [c.x, 1.5, c.z]; break; }
    case 'crane': { const hh = lerp(11, 2.2, k); pos = [c.x - dx * d, hh, c.z - dz * d]; look = [c.x + dx * 3, 1.3, c.z + dz * 3]; break; }
    default: { const sway = Math.sin(t * .45) * 1.1; pos = [c.x - dx * d + dz * sway, h, c.z - dz * d - dx * sway]; look = [c.x + dx * 4, 1.5, c.z + dz * 4]; }
  }
  return { pos, look };
}
const PRESET = (name) => LIGHTS[name] || (() => { throw new Error('lumiere inconnue: ' + name + '. Valides: ' + Object.keys(LIGHTS).join(', ')); })();
function update(t) {
  const idx = Math.max(0, spec.scenes.findIndex(s => t >= s.start && t < s.end)); const sc = spec.scenes[idx < 0 ? spec.scenes.length - 1 : idx];
  const st = sceneState[spec.scenes.indexOf(sc)];
  sceneState.forEach((x, i) => { x.grp.visible = i === spec.scenes.indexOf(sc); if (x.weather) x.weather.visible = x.grp.visible; });
  const g = st.grp;
  // lumiere
  const preset = PRESET(typeof sc.light === 'string' ? sc.light : (sc.light && sc.light.preset) || g.userData.light || 'day');
  const L = { ...preset, ...(typeof sc.light === 'object' ? sc.light : {}) };
  sun.intensity = L.sun; hemi.intensity = L.hemi; sun.color.set(L.sunColor); hemi.color.set(L.hemiColor);
  const bg = L.sky; scene.background = col(bg); scene.fog = new THREE.Fog(col(L.fogColor || bg), L.fog[0], L.fog[1]);
  // personnage
  const p = kf(t, sc.path || [[0, 0, 0]]); const p2 = kf(t + .12, sc.path || [[0, 0, 0]]);
  const px = p[0] ?? 0, pz = p[1] ?? 0; const vx = (p2[0] ?? px) - px, vz = (p2[1] ?? pz) - pz; const speed = Math.hypot(vx, vz) / .12;
  character.position.set(px, 0, pz);
  const anim = sc.anim || 'walk'; let yaw = speed > .05 ? Math.atan2(vx, vz) : charYaw(sc);
  const camYaw = speed > .05 ? yaw : charYaw(sc);
  if (sc.faceCamera) yaw = Math.atan2(camera.position.x - px, camera.position.z - pz);
  character.rotation.y = yaw; poseCharacter(character, t, speed, anim); character.visible = !sc.hideCharacter;
  if (companion) { const q = kf(Math.max(sc.start, t - .9), sc.path || [[0, 0, 0]]); const off = (spec.companion.offset || [1.3, 1.1]); companion.position.set((q[0] ?? px) + off[0], 0, (q[1] ?? pz) + off[1]); companion.rotation.y = yaw; poseCharacter(companion, t + 1.7, speed, anim === 'walk' ? 'walk' : anim); companion.visible = !sc.hideCharacter; }
  // ombre menacante
  shadowObj.visible = !!sc.shadow; if (sc.shadow) { const s = kf(t, sc.shadow); shadowObj.position.set(s[0], 0, s[1]); shadowObj.rotation.y = Math.atan2(px - s[0], pz - s[1]); shadowObj.scale.setScalar(s[2] ?? 1.6); }
  // accessoires animes
  for (const { o, p: pr } of st.props) { if (pr.path) { const q = kf(t, pr.path); o.position.x = q[0]; o.position.z = q[1]; } if (pr.bob) o.position.y = (pr.y || 0) + Math.sin(t * 1.6 + (pr.at ? pr.at[0] : 0)) * .35; if (pr.spin) o.rotation.y = t * pr.spin; if (pr.face) o.rotation.y = Math.atan2(px - o.position.x, pz - o.position.z); }
  if (g.userData.crystal) { g.userData.crystal.rotation.y = t * .8; g.userData.crystal.position.y = 1.9 + Math.sin(t * 1.6) * .12; }
  if (g.userData.door && sc.doorOpen) g.userData.door.position.y = 2.5 + (kf(t, sc.doorOpen)[0] ?? 0) * 5.2;
  if (g.userData.wardrobeDoor && sc.doorOpen) g.userData.wardrobeDoor.rotation.y = -(kf(t, sc.doorOpen)[0] ?? 0) * 1.6;
  // accent
  const ac = L.accent || sc.accent; if (ac) { accent.color.set(ac.color); accent.intensity = ac.intensity; const rel = ac.rel || [0, 3, -5]; accent.position.set(ac.pos ? ac.pos[0] : px + rel[0], ac.pos ? ac.pos[1] : rel[1], ac.pos ? ac.pos[2] : pz + rel[2]); } else accent.intensity = 0;
  const sp = L.sunPos || [30, 50, 20]; sun.position.set(px + sp[0], sp[1], pz + sp[2]); sun.target.position.set(px, 0, pz); sun.target.updateMatrixWorld();
  // camera
  const camObj = typeof sc.cam === 'object' && sc.cam ? sc.cam : {};
  const ac2 = autoCam(sc, t, { x: px, z: pz }, camYaw, speed);
  let cp, cl; if (ac2) { cp = ac2.pos; cl = ac2.look; } else { cp = kf(t, sc.cam.pos); cl = kf(t, sc.cam.look); }
  const shk = camObj.shake ? kf(t, camObj.shake)[0] : 0; const rr = mulberry32(Math.floor(t * 30) * 9301 + 49297);
  camera.position.set(cp[0] + (rr() - .5) * shk, cp[1] + (rr() - .5) * shk, cp[2] + (rr() - .5) * shk); camera.lookAt(cl[0], cl[1], cl[2]);
  camera.fov = camObj.fov ? kf(t, camObj.fov)[0] : 50; camera.updateProjectionMatrix();
  if (st.weather) updateWeather(st.weather, t, camera);
  // fondus
  let fade = 0; for (const s of spec.scenes) if (s.start > 0) fade = Math.max(fade, 1 - Math.min(1, Math.abs(t - s.start) / .3));
  fade = Math.max(fade, 1 - ss(0, .5, t)); const endAt = spec.duration - (spec.cardDuration || 0);
  if (spec.card) fade = Math.max(fade, ss(endAt - 2, endAt - .4, t)); else fade = Math.max(fade, ss(spec.duration - .6, spec.duration, t));
  document.getElementById('fade').style.opacity = fade.toFixed(3);
  const cap = document.getElementById('cap'); const capT = sc.caption && t >= sc.start + .4 && t < sc.end - .3;
  cap.textContent = capT ? sc.caption : ''; cap.style.opacity = capT ? Math.min(ss(sc.start + .4, sc.start + .8, t), 1 - ss(sc.end - .6, sc.end - .3, t)).toFixed(3) : 0;
  const card = document.getElementById('card'); if (spec.card) { card.textContent = spec.card; card.style.opacity = ss(endAt - .4, endAt + .4, t).toFixed(3); } else card.style.opacity = 0;
  renderer.render(scene, camera);
}

// ---------- audio ----------
async function renderAudio(sr = 44100) {
  const dur = spec.duration; const ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const master = ctx.createGain(); master.gain.value = .9; master.connect(ctx.destination);
  const mood = spec.music?.mood || 'adventure'; const r = mulberry32(spec.seed || 7);
  const scales = { adventure: [293.66, 349.23, 392, 440, 523.25, 587.33, 698.46], happy: [392, 440, 493.88, 587.33, 659.25, 783.99], horror: [293.66, 311.13, 392, 415.3], calm: [261.63, 293.66, 329.63, 392, 440], mystery: [220, 261.63, 311.13, 329.63, 392] };
  const scale = scales[mood] || scales.adventure; const horror = mood === 'horror', calm = mood === 'calm' || mood === 'mystery';
  const pad = ctx.createOscillator(); pad.type = 'sawtooth'; pad.frequency.value = spec.music?.root || 73.42; const pf = ctx.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 280; const pg = ctx.createGain(); pg.gain.setValueAtTime(0, 0); pg.gain.linearRampToValueAtTime(.09, 3); pg.gain.setValueAtTime(.09, dur - 3); pg.gain.linearRampToValueAtTime(0, dur); pad.connect(pf).connect(pg).connect(master); pad.start(0); pad.stop(dur);
  const step = horror ? 2.2 : calm ? 1.2 : mood === 'happy' ? .375 : .5;
  for (let tt = 1; tt < dur - 2; tt += step) if (r() < (horror ? .55 : .75)) { const o = ctx.createOscillator(); o.type = horror ? 'sine' : 'triangle'; o.frequency.value = scale[Math.floor(r() * scale.length)] * (horror ? .5 : 1); const gn = ctx.createGain(); gn.gain.setValueAtTime(0, tt); gn.gain.linearRampToValueAtTime(horror ? .06 : .11, tt + .02); gn.gain.exponentialRampToValueAtTime(.0008, tt + (horror ? 2 : .55)); o.connect(gn).connect(master); o.start(tt); o.stop(tt + 2.2); }
  const nb = ctx.createBuffer(1, sr * 2, sr); const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;
  const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true; const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 600; const ng = ctx.createGain(); ng.gain.value = spec.music?.wind ?? .035; ns.connect(nf).connect(ng).connect(master); ns.start(0);
  for (const e of (spec.sfx || [])) {
    if (e.type === 'chime') for (let i = 0; i < 3; i++) { const o = ctx.createOscillator(); o.frequency.value = [880, 1174.7, 1568][i]; const gn = ctx.createGain(); const tt = e.t + i * .22; gn.gain.setValueAtTime(0, tt); gn.gain.linearRampToValueAtTime(.18, tt + .02); gn.gain.exponentialRampToValueAtTime(.001, tt + 1.8); o.connect(gn).connect(master); o.start(tt); o.stop(tt + 2); }
    if (e.type === 'hit') { const o = ctx.createOscillator(); o.frequency.setValueAtTime(70, e.t); o.frequency.exponentialRampToValueAtTime(28, e.t + 1.2); const gn = ctx.createGain(); gn.gain.setValueAtTime(.9, e.t); gn.gain.exponentialRampToValueAtTime(.001, e.t + 1.4); o.connect(gn).connect(master); o.start(e.t); o.stop(e.t + 1.5); }
    if (e.type === 'whoosh') { const s = ctx.createBufferSource(); s.buffer = nb; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(300, e.t); f.frequency.exponentialRampToValueAtTime(3000, e.t + .8); const gn = ctx.createGain(); gn.gain.setValueAtTime(0, e.t); gn.gain.linearRampToValueAtTime(.35, e.t + .4); gn.gain.linearRampToValueAtTime(0, e.t + 1); s.connect(f).connect(gn).connect(master); s.start(e.t, 0, 1.2); }
    if (e.type === 'creak') { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, e.t); o.frequency.linearRampToValueAtTime(140, e.t + 1.4); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; const gn = ctx.createGain(); gn.gain.setValueAtTime(0, e.t); gn.gain.linearRampToValueAtTime(.12, e.t + .3); gn.gain.linearRampToValueAtTime(0, e.t + 1.5); o.connect(f).connect(gn).connect(master); o.start(e.t); o.stop(e.t + 1.6); }
    if (e.type === 'pop') { const o = ctx.createOscillator(); o.frequency.setValueAtTime(600, e.t); o.frequency.exponentialRampToValueAtTime(200, e.t + .12); const gn = ctx.createGain(); gn.gain.setValueAtTime(.3, e.t); gn.gain.exponentialRampToValueAtTime(.001, e.t + .15); o.connect(gn).connect(master); o.start(e.t); o.stop(e.t + .2); }
  }
  const buf = await ctx.startRendering(); return [Array.from(buf.getChannelData(0)), Array.from(buf.getChannelData(1))];
}
window.loadSpec = (s) => { loadSpec(s); return true; };
window.renderFrame = (i) => { update(i / (spec.fps || 30)); return true; };
window.renderAudio = renderAudio;
window.__ready = true;
