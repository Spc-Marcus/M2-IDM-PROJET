# Interpréteur RoboML

## Vue d'ensemble

L'interpréteur RoboML exécute les programmes écrits dans le langage RoboML et génère une simulation animée du robot dans le navigateur. Il utilise le **pattern Visitor** pour parcourir l'AST (Abstract Syntax Tree) et simule les déplacements du robot en temps réel.

## Architecture

```
┌─────────────────┐
│   Programme     │  Écrit en RoboML (.robo-ml)
│    RoboML       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Langium Parser │  Génère l'AST
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Interpréteur   │  Visite l'AST et simule
│   (Visitor)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Scène 3D      │  Timestamps du robot
│  + Timestamps   │  pour animation P5.js
└─────────────────┘
```

## Fonctionnalités implémentées

### Expressions
- **Arithmétiques** : `+`, `-`, `*`, `/`
- **Comparaisons** : `<`, `>`, `==`
- **Littéraux** : nombres, booléens (`true`/`false`)
- **Capteurs** : `getDistance()`, `getTimestamp()`
- **Variables** : lecture et écriture
- **Fonctions** : appels avec arguments

### Instructions
- **Mouvements** : `Forward/Backward/Left/Right <dist> in cm|mm`
- **Rotations** : `Clock/Counter <angle>`
- **Vitesse** : `setSpeed(200 mm)`
- **Retour** : `return value`

### Gestion des unités
- Conversion automatique **cm ↔ mm**
- Support des unités dans les déclarations et mouvements

## Débogage rapide et test (à lire d'abord)

Suivre ces étapes pour vérifier rapidement que l'interpréteur fait bien ce qu'on attend et pour localiser un comportement incorrect :

- Lancer le serveur de développement :

```bash
npm run dev
```

- Ouvrir la page (Vite indique l'URL, p.ex. `http://localhost:5173` ou `http://localhost:5177`).
- Ouvrir la console du navigateur (F12) et filtrer sur les tags suivants : `RoboML:server`, `RoboML:interpreter`, `RoboML:setup`, `RoboML:simulator`, `RoboML:sketch`.
- Dans l'éditeur, charger ou coller un programme (p.ex. `test/example.robo`).
- Cliquer `Parse and Validate` → vérifier dans la console `RoboML:server` que le modèle est valide (pas de diagnostics bloquants).
- Cliquer `Execute Simulation` → dans la console vous devez voir :
   - `RoboML:server` → réception de la requête et confirmation d'envoi de la scène
   - `RoboML:interpreter` → liste des fonctions détectées puis lignes `moveRobot` / `rotateRobot` pour chaque action
   - `RoboML:setup` → réception de la scène, affichage du facteur d'échelle et des entités
   - `RoboML:sketch` → démarrage de l'animation et progression des timestamps

Que regarder si la simulation est incorrecte :
- Si la scène n'arrive pas : vérifier les diagnostics dans `RoboML:server` (getModelFromUri).  
- Si les positions sont étranges : contrôler les logs `RoboML:interpreter` pour les positions après chaque mouvement et la conversion d'unités (cm→mm).  
- Si l'animation ne démarre pas : vérifier `RoboML:setup` pour la présence de `timestamps` (doit y avoir plusieurs entrées).  
- Si les rayons (`getDistance`) rendent des valeurs inattendues : vérifier `scene.entities` dans `RoboML:setup` et les sorties de `Ray.intersect` dans la console.

### Petit pas‑à‑pas attendu pour `test/example.robo`

1. `Parse and Validate` → `RoboML:server` indique « Model is valid ».  
2. `Execute Simulation` → `RoboML:server` appelle l'interpréteur et loggue « Executing entry function... ».  
3. `RoboML:interpreter` loggue `moveRobot`/`rotateRobot` pour chaque instruction ; après chaque mouvement on voit la nouvelle position et le temps courant.  
4. `RoboML:interpreter` termine et renvoie la scène (log : `Interpretation complete.`).  
5. `RoboML:setup` reçoit la scène, calcule `factor` et instancie le robot côté client.  
6. `RoboML:sketch` démarre l'animation et interpole entre les timestamps jusqu'à la fin.

Si tu veux, j'ajoute un petit script de test (fichier à créer) qui construit le projet puis exécute l'interpréteur sur `test/example.robo` et écrit le JSON produit dans `out/scene.json` — veux‑tu que je le crée et l'exécute automatiquement ?
## Fichiers modifiés

| Fichier | Description |
|---------|-------------|
| `src/semantics/interpreter.ts` | Interpréteur complet avec scope stack, exécution d'expressions/instructions, génération de timestamps |
| `src/web/simulator/entities.ts` | Implémentation des méthodes `turn()`, `move()`, `side()` du Robot |
| `src/language/main-browser.ts` | Serveur de langage : gestion des notifications `custom/execute` et `custom/hello` |
| `src/web/setup.ts` | Client web : écoute des résultats et configuration du simulateur P5.js |
| `src/setupClassic.ts` | Intégration Monaco : connexion client/serveur |

## Utilisation

### 1. Compiler le projet

```bash
npm run build
```

Cela exécute :
- `langium:generate` — Génère le parser depuis la grammaire
- `langium:visitor` — Génère les interfaces visiteur
- `tsc` — Compile TypeScript
- `esbuild` — Bundle les fichiers

### 2. Lancer le serveur de développement

```bash
npm run dev
```

Ouvre automatiquement le navigateur à `http://localhost:5173`

### 3. Utiliser l'éditeur web

1. **Écrire le code** dans l'éditeur Monaco (gauche)
2. **Parse and Validate** — Vérifie la syntaxe
3. **Execute Simulation** — Lance l'interpréteur et anime le robot
4. **Restart Simulation** — Redémarre l'animation
5. **Clear Data** — Réinitialise le simulateur

## Exemple de programme

```roboml
let void entry () {
    setSpeed(200 mm)
    var number time = getTimestamp()
    
    loop time < 60000 {
        var number dist = getDistance() in cm
        Forward dist - 25 in cm
        Clock 90
        time = getTimestamp()
    }
}
```

## Flux d'exécution

1. **Client web** : clic sur "Execute Simulation"
   - Envoie notification `custom/execute` avec l'URI du document

2. **Serveur (main-browser.ts)** :
   - Récupère l'AST depuis Langium
   - Instancie `RoboMLInterpreter`
   - Appelle `interpret(model)`
   - Renvoie la scène via `custom/executeResult`

3. **Interpréteur** :
   - Crée une `BaseScene` (10000×10000 mm avec murs)
   - Enregistre toutes les fonctions
   - Exécute la fonction `entry()`
   - Pour chaque mouvement/rotation :
     - Met à jour la position/angle du robot
     - Calcule le temps écoulé (distance/vitesse)
     - Ajoute un **timestamp** (snapshot du robot)
   - Sérialise la scène en JSON

4. **Client web (setup.ts)** :
   - Reçoit la scène
   - Configure le simulateur P5.js
   - Interpole entre les timestamps pour animer

5. **P5.js (sketch.ts)** :
   - Dessine le robot et les obstacles
   - Anime le robot entre les timestamps
   - Utilise `p5.map()` pour interpolation fluide

## Détails techniques

### Scope stack
Les variables sont stockées dans une pile de scopes :
- Un nouveau scope à chaque entrée de fonction
- Recherche de variable : du scope courant vers le global
- Permet les variables locales et le shadowing

### Protection anti-boucle infinie
Limite à **100 000 itérations** par boucle (configurable dans `MAX_LOOP_ITERATIONS`)

### Calcul du temps
- Mouvement : `temps = distance / vitesse`
- Rotation : `temps = angle × 5ms/degré`
- Stocké en millisecondes

### Capteur de distance
`getDistance()` lance un rayon depuis le robot et retourne la distance au premier obstacle (murs ou blocs).

## Commandes utiles

```bash
# Développement avec rechargement auto
npm run dev

# Build en production
npm run build

# Tests
npm test

# Génération Langium seule
npm run langium:generate

# Watch mode (recompilation auto)
npm run watch

# Servir le bundle de production
npm run bundle
npm run bundle:serve
```

## Architecture des notifications

```
┌──────────────┐                         ┌──────────────┐
│ Client Web   │                         │   Serveur    │
│  (setup.ts)  │                         │(main-browser)│
└──────┬───────┘                         └──────┬───────┘
       │                                        │
       │ ──── custom/execute (uri) ──────────> │
       │                                        │
       │                                        │ interpret()
       │                                        │
       │ <─── custom/executeResult (scene) ─── │
       │                                        │
       │ setupSimulator(scene)                  │
       │                                        │
```
