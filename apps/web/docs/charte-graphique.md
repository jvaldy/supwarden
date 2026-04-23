# Charte graphique Supwarden

## Objectif produit

Supwarden doit transmettre une sécurité claire, moderne et rassurante.
La charte sert à garder une expérience cohérente sur toutes les pages, modales et formulaires, en desktop comme en mobile.

## Direction visuelle

- Sérieux: base bleu nuit stable.
- Lisibilité: accent cyan réservé aux actions et repères.
- Sobriété: peu d’effets, hiérarchie nette, textes utiles.

## Palette officielle

### Fond et surfaces

- `Ink 950` : `#08111D` (fond principal)
- `Ink 900` : `#0F1D2D` (profondeur)
- `Ink 800` : `#13263A` (variation de surface)
- `Panel` : `rgba(7, 16, 28, 0.72)`
- `Panel Strong` : `rgba(12, 25, 39, 0.82)`
- `Accent Soft` : `rgba(143, 211, 255, 0.08)`

### Accent et contenu

- `Cyan 500` : `#5FA8D3`
- `Cyan 400` : `#8FD3FF`
- `Cyan 300` : `#ADD8FF`
- `Text Strong` : `#EEF6FF`
- `Text Soft` : `#C7DCEF`
- `Text Muted` : `#8EA9BF`

### États (à conserver partout)

- `Success` : `#7EE0B5` (validation)
- `Warning` : `#FFD27A` (vérification)
- `Danger` : `#FF8F9F` (erreur, suppression)

## Typographie

### Polices en production

- Titres: `Arial, Helvetica, sans-serif`
- Texte: `Arial, Helvetica, sans-serif`
- Technique: `'JetBrains Mono', Consolas, monospace`

### Échelle

- `--step--2` : `12px`
- `--step--1` : `13px`
- `--step-0` : `14px`
- `--step-1` : `16px`
- `--step-2` : `22px`
- `--step-3` : `30px à 50px` selon viewport

## Espacements unifiés

Règle clé: les mêmes types d’éléments gardent les mêmes distances sur tout le site.

### Vertical rhythm

- Eyebrow -> Titre: `8px` (`--space-2`)
- Titre -> Lede: `12px` (`--space-3`)
- Blocs internes de carte/modale/formulaire: `16px` (`--space-4`)
- Sections majeures: `20px` (`--space-5`)

### Composants concernés

- Cartes de pages (`auth`, `dashboard`, `trousseaux`, `profil`, `messagerie`)
- En-têtes de section et sous-sections
- Formulaires et retours de formulaire
- Modales et sections internes de modales

## Rayons, bordures, ombres

- `--radius-sm` : `12px`
- `--radius-md` : `18px`
- `--radius-lg` : `24px`
- `--radius-pill` : `999px`
- `--border-subtle` : `1px solid rgba(173, 216, 255, 0.14)`
- `--border-strong` : `1px solid rgba(173, 216, 255, 0.2)`
- `--shadow-panel` : `0 24px 80px rgba(0, 0, 0, 0.28)`

## Mobile friendly

- Approche mobile-first sur toutes les pages.
- Grilles qui basculent en mono-colonne sur petits écrans.
- Boutons clés en pleine largeur si nécessaire.
- Modales avec hauteur contrôlée et scroll interne pour rester utilisables sans zoom.

## Bonnes pratiques UX

- Un seul bouton dominant par zone.
- Messages de feedback courts et actionnables.
- Accents couleur réservés aux priorités (actions + états).
- Pas de surcharge de styles dans une même vue.

## Références techniques

- Variables globales: `apps/web/src/index.css`
- Styles partagés: `apps/web/src/styles/components.css`
- Vitrine charte: `apps/web/src/pages/marketing/BrandPage.jsx`
