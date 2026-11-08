# Guide d'ecriture d'un scenario (spec JSON) pour le moteur 3D

Une video = un fichier JSON. Format: Short vertical 1080x1920, 30 fps. Duree conseillee: 45 a 58 s.
Tout est deterministe. Ne JAMAIS mettre de valeurs aleatoires: le moteur gere les graines.

## Squelette
```json
{
  "title": "Titre #Shorts",
  "fps": 30, "duration": 50, "seed": 12,
  "voice": "kids",                       // "kids" ou "horror" (voix off)
  "music": { "mood": "happy" },          // adventure | happy | horror | calm | mystery
  "character": { ... },                  // fiche du personnage (voir plus bas). Ne change pas pendant la video.
  "companion": { "kind":"human", ... , "offset":[1.3,1.1] },   // optionnel, suit le heros
  "sfx": [ {"t": 12.0, "type": "chime"} ],   // chime | hit | whoosh | creak | pop
  "card": "Texte du carton final",       // optionnel (dernieres secondes sur fond noir)
  "cardDuration": 4,
  "scenes": [ ... ]
}
```
Les scenes se suivent SANS trou: `end` d'une scene = `start` de la suivante, la derniere finit a `duration`.
Un fondu au noir de 0,3 s est ajoute automatiquement a chaque coupure.

## Une scene
```json
{
  "start": 0, "end": 10,
  "set": "meadow",                       // decor (voir liste)
  "light": "day",                        // preset de lumiere (voir liste), ou {"preset":"night","fog":[10,60]}
  "anim": "walk",                        // animation du heros (voir liste)
  "path": [[0, 0, 0], [10, 0, -20]],     // trajet du heros: [temps, x, z]. z negatif = vers le fond. 1 seul point = immobile
  "cam": "follow",                       // mode camera (voir liste) ou objet {"mode":"orbit","dist":7,"height":3,"fov":[[0,60],[10,45]],"shake":[[0,0],[5,.05]]}
  "weather": "snow",                     // optionnel
  "props": [ {"type":"house","at":[8,-18],"scale":1,"rot":0,"color":"#e8d3a8"} ],
  "narration": "Phrase dite par la voix off (1 a 2 phrases courtes).",
  "caption": "Sous-titre court a l'ecran"
}
```
Le texte `narration` est lu a start+0,6 s: il doit tenir dans la scene (environ 2,5 mots par seconde).

## Listes valides
- **set**: beach, meadow, forest, cave, house, desert, snow, street, graveyard, bedroom, moon
  - `setParams` optionnel: couleurs (`ground`, `leaf`, `water`, `crystal`...), ex `{"leaf":"#ff9a3c"}` pour un automne.
- **light**: day, golden, dusk, night, creepy, blood, magic, snow, space
- **anim**: walk, run, idle (path d'un seul point), scared, wave, look, dance, jump, point, sit
  - `faceCamera: true` fait regarder le heros la camera (utile avec scared/wave/dance).
- **cam**: follow, front, side, orbit, closeup, wide, low, dolly_in, crane
- **weather**: rain, snow, fireflies, dust, embers, bubbles (stars est automatique sur "moon")
- **props.type**: house, lamp, chest, flower, balloon, ghost, snowman, tombstone, rocket, star, mushroom, crystal, tree, rock, fence, bed, campfire, monster
  - options d'un prop: `bob:true` (flotte), `spin:1.5` (tourne), `face:true` (regarde le heros), `path:[[t,x,z],...]` (se deplace), `y`.
- **shadow** (silhouette menacante, horreur): `"shadow": [[t, x, z, taille], ...]`, ex `[[46,0,-34,1.6],[53,0,-18,1.6]]`.
- **doorOpen** (decors house et bedroom): `"doorOpen": [[t,0],[t2,1]]` ouvre la porte/l'armoire.

## Fiche personnage (`character`)
Humain: `{"kind":"human","jacket":"#2f6b5a","pants":"#4d3a28","boots":"#2b1c10","hair":"#2a180c","skin":"#e0ac84","pack":"#c8782c","scarf":"#e04a3a","ponytail":true,"kid":false,"scale":1}`
- `kid:true` = grosse tete d'enfant. Mettre `pack:null` / `scarf:null` pour les retirer.
- `ears`: none | fox | cat | bunny (+ `earColor`), `tail:true` (+ `tailColor`).
- `hat`: none | cap | wizard | crown | helmet (+ `hatColor`).
- Robot: `{"kind":"robot","jacket":"#c0c8d8","skin":"#aab4c4","scarf":"#ff8a30"}`.

## Regles de qualite
1. UNE histoire claire en 5 a 8 scenes, avec un debut, une montee, une fin. Pas de gore: suspense/frissons.
2. Varier a chaque video: decor, personnage, couleurs, camera, meteo, accessoires. Ne pas reutiliser le meme scenario.
3. Alterner les cameras (pas deux fois de suite la meme); gros plan (`closeup`) pour l'emotion.
4. Horreur: lumiere creepy/blood/night, `shadow` ou `ghost`, sfx `creak`/`hit`, music `horror`, voice `horror`.
   Enfants: lumiere day/golden, decors meadow/beach/snow, music `happy`/`calm`, voice `kids`, ton joyeux et educatif.
5. Verifier avant rendu: `node render.mjs spec.json prefix --frames 3,20,40` produit des images de controle (aucune video).
