// Usage: node validate_spec.mjs specs/today.json  -> affiche les erreurs et sort avec code 1 si invalide
import fs from 'node:fs';
const OK = {
  set: ['beach', 'meadow', 'forest', 'cave', 'house', 'desert', 'snow', 'street', 'graveyard', 'bedroom', 'moon'],
  light: ['day', 'golden', 'dusk', 'night', 'creepy', 'blood', 'magic', 'snow', 'space'],
  anim: ['walk', 'run', 'idle', 'scared', 'wave', 'look', 'dance', 'jump', 'point', 'sit'],
  cam: ['follow', 'front', 'side', 'orbit', 'closeup', 'wide', 'low', 'dolly_in', 'crane'],
  weather: ['rain', 'snow', 'fireflies', 'dust', 'embers', 'bubbles'],
  prop: ['house', 'lamp', 'chest', 'flower', 'balloon', 'ghost', 'snowman', 'tombstone', 'rocket', 'star', 'mushroom', 'crystal', 'tree', 'rock', 'fence', 'bed', 'campfire', 'monster'],
  kind: ['human', 'robot'], ears: ['none', 'fox', 'cat', 'bunny'], hat: ['none', 'cap', 'wizard', 'crown', 'helmet'],
  sfx: ['chime', 'hit', 'whoosh', 'creak', 'pop'], mood: ['adventure', 'happy', 'horror', 'calm', 'mystery'], voice: ['kids', 'horror'],
};
const errs = [], warns = [];
const e = (m) => errs.push(m), w = (m) => warns.push(m);
let s;
try { s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); } catch (x) { console.log('JSON invalide:', x.message); process.exit(1); }
if (!(s.duration >= 30 && s.duration <= 59)) e(`duration doit etre entre 30 et 59 (actuel: ${s.duration})`);
if (!OK.voice.includes(s.voice)) e(`voice doit etre ${OK.voice.join('|')}`);
if (s.music && s.music.mood && !OK.mood.includes(s.music.mood)) e(`music.mood invalide: ${s.music.mood}`);
if (!s.title || s.title.length > 95) e('title manquant ou trop long (max 95 caracteres)');
const c = s.character || {};
if (c.kind && !OK.kind.includes(c.kind)) e('character.kind invalide');
if (c.ears && !OK.ears.includes(c.ears)) e('character.ears invalide');
if (c.hat && !OK.hat.includes(c.hat)) e('character.hat invalide');
for (const f of (s.sfx || [])) { if (!OK.sfx.includes(f.type)) e(`sfx inconnu: ${f.type}`); if (!(f.t >= 0 && f.t <= s.duration)) e(`sfx.t hors duree: ${f.t}`); }
if (!Array.isArray(s.scenes) || s.scenes.length < 4) e('il faut au moins 4 scenes');
else {
  if (s.scenes.length > 9) w('plus de 9 scenes: risque de video confuse');
  s.scenes.forEach((sc, i) => {
    const P = `scene ${i}`;
    if (i === 0 && sc.start !== 0) e(`${P}: start doit valoir 0`);
    if (i > 0 && sc.start !== s.scenes[i - 1].end) e(`${P}: start (${sc.start}) doit egaler end de la scene precedente (${s.scenes[i - 1].end})`);
    if (!(sc.end > sc.start)) e(`${P}: end <= start`);
    if (i === s.scenes.length - 1 && Math.abs(sc.end - s.duration) > 0.01) e(`${P}: la derniere scene doit finir a duration (${s.duration}), pas ${sc.end}`);
    if (!OK.set.includes(sc.set)) e(`${P}: set invalide "${sc.set}"`);
    const lt = typeof sc.light === 'string' ? sc.light : sc.light && sc.light.preset;
    if (lt && !OK.light.includes(lt)) e(`${P}: light invalide "${lt}"`);
    if (sc.anim && !OK.anim.includes(sc.anim)) e(`${P}: anim invalide "${sc.anim}"`);
    const cm = typeof sc.cam === 'string' ? sc.cam : sc.cam && sc.cam.mode;
    if (cm && !OK.cam.includes(cm)) e(`${P}: cam invalide "${cm}"`);
    if (sc.weather && !OK.weather.includes(sc.weather)) e(`${P}: weather invalide "${sc.weather}"`);
    for (const p of (sc.props || [])) if (!OK.prop.includes(p.type)) e(`${P}: prop invalide "${p.type}"`);
    if (!Array.isArray(sc.path) || !sc.path.length) e(`${P}: path manquant (ex [[${sc.start},0,0],[${sc.end},0,-10]])`);
    else for (const k of sc.path) { if (k.length !== 3) e(`${P}: chaque point de path = [temps,x,z]`); else if (k[0] < sc.start - .01 || k[0] > sc.end + .01) e(`${P}: temps de path ${k[0]} hors scene`); }
    if (!sc.narration) w(`${P}: pas de narration`);
    else { const words = sc.narration.trim().split(/\s+/).length, avail = sc.end - sc.start - 1.0; if (words / avail > 2.7) e(`${P}: narration trop longue (${words} mots pour ${avail.toFixed(1)} s utiles, max ~${Math.floor(avail * 2.6)} mots)`); }
    if (!sc.caption) w(`${P}: pas de caption`);
  });
}
for (const x of warns) console.log('AVERTISSEMENT:', x);
if (errs.length) { for (const x of errs) console.log('ERREUR:', x); console.log(`${errs.length} erreur(s)`); process.exit(1); }
console.log('Spec valide:', s.scenes.length, 'scenes,', s.duration, 's');
