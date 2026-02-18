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
│  Accept Weaver  │  Ajoute accept() à chaque nœud AST
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Interpréteur   │  Utilise node.accept(this)
│   (Visitor)     │  pour visiter l'AST
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Scène 3D      │  Timestamps du robot
│  + Timestamps   │  pour animation P5.js
└─────────────────┘
```

### Pattern Visitor avec Accept Weaver

L'interpréteur utilise le **pattern Visitor** pur grâce au **Accept Weaver** :

1. **Accept Weaver** : Ajoute dynamiquement une méthode `accept(visitor)` à chaque nœud de l'AST
2. **Interpréteur** : Implémente `RoboMlVisitor` avec toutes les méthodes `visit*`
3. **Dispatch automatique** : Au lieu de `switch(node.$type)`, on appelle `node.accept(this)`

**Exemple** :
```typescript
// ❌ Ancien (dispatch manuel)
visitBinaryExpression(node: BinaryExpression) {
    const left = this.evalExpr(node.left);   // switch sur $type
    const right = this.evalExpr(node.right);
}

// ✅ Nouveau (pattern visitor pur)
visitBinaryExpression(node: BinaryExpression) {
    const left = node.left.accept(this);     // dispatch automatique
    const right = node.right.accept(this);
}
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
- **Déclaration** : `var number x = 10 in cm`
- **Affectation** : `x = 20`
- **Conditions** : `if condition { ... } else { ... }`
- **Boucles** : `loop condition { ... }`
- **Mouvements** : `Forward/Backward/Left/Right <dist> in cm|mm`
- **Rotations** : `Clock/Counter <angle>`
- **Vitesse** : `setSpeed(200 mm)`
- **Retour** : `return value`

### Gestion des unités
- Conversion automatique **cm ↔ mm**
- Support des unités dans les déclarations et mouvements

## Fichiers modifiés

| Fichier | Description |
|---------|-------------|
| `src/semantics/interpreter.ts` | **Interpréteur complet** utilisant `node.accept(this)` pour le pattern Visitor pur. Plus de `evalExpr()` ni `execInstr()` : dispatch automatique via accept() |
| `src/semantics/robo-ml-visitor.ts` | Interface `RoboMlVisitor` **générée automatiquement** par `langium-visitor` |
| `src/semantics/robo-ml-accept-weaver.ts` | **Accept Weaver généré** qui ajoute `accept()` à chaque nœud AST |
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

### Pattern Visitor et Accept Weaver

L'interpréteur utilise le **pattern Visitor** pur via le mécanisme d'**Accept Weaver** :

**1. Génération automatique** (`robo-ml-accept-weaver.ts`)
- Généré par `langium-visitor`
- Écoute l'événement `DocumentState.IndexedReferences`
- Ajoute dynamiquement `accept(visitor)` à chaque nœud AST

**2. Interface Visitor** (`robo-ml-visitor.ts`)
```typescript
export interface RoboMlVisitor {
    visitBinaryExpression(node: BinaryExpression): any;
    visitMovement(node: Movement): any;
    // ... toutes les méthodes pour chaque type de nœud
}
```

**3. Implémentation** (`interpreter.ts`)
```typescript
export class RoboMLInterpreter implements RoboMlVisitor {
    visitBinaryExpression(node: BinaryExpression): any {
        const left = node.left.accept(this);   // ← dispatch automatique
        const right = node.right.accept(this);
        return left + right; // exemple
    }
}
```

**Avantages** :
- ✅ Type-safe : TypeScript vérifie que tous les visiteurs sont implémentés
- ✅ Extensible : Ajouter un nouveau type de nœud génère automatiquement l'interface
- ✅ Pattern GoF : Respecte le design pattern Visitor classique
- ✅ Pas de switch/case : Le dispatch est géré par le système de types

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
