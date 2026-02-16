# RoboML — Grammaire

DSL pour programmer un robot : mouvements, rotations, vitesse, variables, boucles, conditions, fonctions.

## Exemple

```roboml
let void entry() {
    setSpeed(150 in mm)
    var number count = 0
    loop count < 5 {
        count = count + 1
        square()
    }
}

let void square() {
    Forward 30 in cm
    Clock 90
    Forward 300 in mm
    Clock 90
    Forward 30 in cm
    Clock 90
    Forward 300 in mm
    Clock 90
}

let number doubler(number x) {
    return x * 2
}
```

## Fonctions

```
let <type_retour> <nom>(<type> <param>, ...) { ... }
```

Types : `number`, `boolean`, `void`.

## Variables

```roboml
var number x = 10       // déclaration
x = x + 5               // affectation
```

## Opérateurs

Par ordre de priorité décroissante :

1. `*` `/`
2. `+` `-`
3. `<` `>` `==`

Parenthèses `()` pour forcer la priorité.

## Contrôle

```roboml
loop condition {         // boucle (pas de parenthèses)
    ...
}

if condition {           // condition (else optionnel)
    ...
} else {
    ...
}
```

## Mouvement

```roboml
Forward 100 in cm        // avancer
Backward 50 in mm        // reculer
Left 30 in cm            // gauche
Right 20 in mm           // droite
```

## Rotation

```roboml
Clock 90                 // sens horaire
Counter 45               // sens anti-horaire
```

## Vitesse

```roboml
setSpeed(150 in mm)       // 'in' optionnel
setSpeed(200 mm)
```

## Capteurs

```roboml
getDistance()              // distance en unité par défaut
getTimestamp()             // temps courant
var number d = getDistance() in cm   // avec conversion
```

## Appels de fonction

```roboml
square()                          // comme instruction
var number r = doubler(5) + 1     // comme expression
```

## Retour

```roboml
return expression
```

## Mots-clés

`let` `var` `loop` `if` `else` `return` `setSpeed`
`Forward` `Backward` `Left` `Right` `Clock` `Counter`
`in` `cm` `mm` `true` `false` `getDistance` `getTimestamp`
`number` `boolean` `void`

## Validations

Le compilateur vérifie automatiquement :

- **Point d'entrée** : une fonction `entry` retournant `void` doit exister.
- **Fonctions dupliquées** : deux fonctions ne peuvent pas avoir le même nom.
- **Void dans expression** : une fonction `void` ne peut pas être utilisée comme valeur (`var number x = doNothing()` → erreur).
- **Nombre d'arguments** : l'appel doit fournir le bon nombre de paramètres.
- **Type des arguments** : chaque argument doit correspondre au type attendu (`number` / `boolean`).
- **Return manquant** : une fonction non-`void` sans `return` produit un warning.
