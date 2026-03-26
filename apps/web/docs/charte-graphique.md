# Charte graphique Supwarden

## ADN de marque

Supwarden exprime une securite moderne, premium et collaborative.
La direction visuelle melange trois idees :

- confiance : une base bleu nuit stable et serieuse ;
- clarte : des accents cyan lisibles et technologiques ;
- sang-froid : peu de couleurs, beaucoup d'air, des contrastes nets.

## Palette de couleurs

### Couleurs principales

- `Ink 950` : `#08111D` - fond principal de l'application
- `Ink 900` : `#0F1D2D` - profondeur intermediaire
- `Ink 800` : `#13263A` - variation pour degrades et sections
- `Cyan 500` : `#5FA8D3` - halo, illustrations, signatures visuelles
- `Cyan 400` : `#8FD3FF` - accent principal, liens, labels
- `Cyan 300` : `#ADD8FF` - bordures et etats doux

### Couleurs de contenu

- `Text Strong` : `#EEF6FF` - titres et contenus critiques
- `Text Soft` : `#C7DCEF` - texte courant
- `Text Muted` : `#8EA9BF` - aide, meta, informations secondaires

### Couleurs d'etat

- `Success` : `#7EE0B5`
- `Warning` : `#FFD27A`
- `Danger` : `#FF8F9F`

## Degrades et surfaces

### Fond applicatif

Utiliser un fond profond structure par un degrade vertical :

```css
linear-gradient(180deg, #08111d 0%, #0f1d2d 55%, #13263a 100%)
```

### Halo de marque

Ajouter un halo cyan discret dans les zones hero ou d'accueil :

```css
radial-gradient(circle at top left, rgba(95, 168, 211, 0.18), transparent 28%)
```

### Surfaces

- panneau principal : `rgba(7, 16, 28, 0.72)`
- carte secondaire : `rgba(12, 25, 39, 0.82)`
- accent doux : `rgba(143, 211, 255, 0.08)`

## Typographie

### Recommandation

- titrage : `Sora`
- texte courant : `Inter`
- code / donnees techniques : `JetBrains Mono`

### Fallback local actuel

Si les fontes web ne sont pas encore chargees, conserver :

- titrage : `Sora, Inter, "Segoe UI", sans-serif`
- texte : `Inter, "Segoe UI", sans-serif`
- mono : `"JetBrains Mono", Consolas, monospace`

### Hierarchie

- `Display` : `clamp(2.2rem, 5vw, 4.4rem)` pour les ecrans hero
- `Heading L` : `1.5rem`
- `Body` : `1rem`
- `Body Large` : `1.125rem`
- `Meta` : `0.875rem`

## Rayons, bordures et ombres

- rayon principal : `24px`
- rayon carte : `18px`
- rayon compact : `12px`
- bouton pill : `999px`
- bordure douce : `1px solid rgba(173, 216, 255, 0.14)`
- bordure accent : `1px solid rgba(173, 216, 255, 0.2)`
- ombre panneau : `0 24px 80px rgba(0, 0, 0, 0.28)`

## Regles d'usage

- privilegier le bleu nuit comme masse dominante ;
- reserver le cyan aux actions, reperes et informations importantes ;
- garder des interfaces aeriennes, avec peu de separateurs visibles ;
- ne pas multiplier les couleurs d'accent sur une meme vue ;
- utiliser les couleurs d'etat seulement pour du feedback fonctionnel.

## Ton visuel

- sobre, precis, rassurant ;
- technique sans etre froid ;
- premium sans surcharge decorative.

## Tokens techniques

Les variables globales de cette charte sont exposees dans :

- `apps/web/src/index.css`

Les ecrans peuvent reutiliser ces tokens au lieu de redefinir des couleurs localement.
