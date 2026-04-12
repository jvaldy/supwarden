export const colorGroups = [
  {
    title: 'Couleurs principales',
    items: [
      { name: 'Ink 950', value: '#08111D', role: 'Fond principal et pages structurantes' },
      { name: 'Ink 900', value: '#0F1D2D', role: 'Plans intermédiaires et profondeur' },
      { name: 'Ink 800', value: '#13263A', role: 'Cartes, sections et surfaces' },
      { name: 'Cyan 500', value: '#5FA8D3', role: 'Halo, signature visuelle et focus' },
      { name: 'Cyan 400', value: '#8FD3FF', role: 'Actions importantes et repères' },
      { name: 'Cyan 300', value: '#ADD8FF', role: 'Bordures, détails et états doux' },
    ],
  },
  {
    title: 'États fonctionnels',
    items: [
      { name: 'Success', value: '#7EE0B5', role: 'Validation et messages rassurants' },
      { name: 'Warning', value: '#FFD27A', role: 'Vérification ou action en attente' },
      { name: 'Danger', value: '#FF8F9F', role: 'Erreur, suppression et action critique' },
    ],
  },
]

export const principles = [
  'Mettre l’utilisateur en confiance sans surjouer la sécurité.',
  'Rendre les actions importantes visibles dès le premier regard.',
  'Conserver une interface aérée, claire et stable.',
]

export const experiencePillars = [
  {
    title: 'Clarté immédiate',
    description: 'Chaque écran doit aider à comprendre où l’on est, quoi faire et ce qui va se passer ensuite.',
  },
  {
    title: 'Confiance discrète',
    description: 'La sécurité se ressent dans la précision, la lisibilité et le calme visuel, pas dans la dramatisation.',
  },
  {
    title: 'Fluidité réelle',
    description: 'Moins de friction, des formulaires plus lisibles et des états plus explicites pour mieux avancer.',
  },
]

export const userSignals = [
  { value: 'Lisible', label: 'Hiérarchie claire sur mobile comme sur desktop.' },
  { value: 'Stable', label: 'Couleurs et composants cohérents sur tout le parcours.' },
  { value: 'Rassurant', label: 'Retours visuels qui aident sans alerter inutilement.' },
]

export const buttonExamples = [
  { label: 'Découvrir', className: 'button-link button-link-primary button-link-cta' },
  { label: 'Créer un trousseau', className: 'button-link button-link-primary' },
  { label: 'Inviter un membre', className: 'button-link button-link-primary' },
]

export const buttonRules = [
  {
    title: 'Référence principale',
    value: 'Bouton Découvrir',
    description: 'Le bouton principal du produit reprend la teinte, le relief et la rondeur du CTA visible sur la page d’accueil.',
  },
  {
    title: 'Couleur',
    value: 'Bleu clair lumineux',
    description: 'Les actions principales utilisent la même base cyan claire pour rester immédiatement identifiables.',
  },
  {
    title: 'Hiérarchie',
    value: 'Une seule action dominante',
    description: 'Dans une même zone, un seul bouton doit vraiment porter l’attention et guider la prochaine étape.',
  },
]

export const statusCards = [
  {
    label: 'En savoir plus',
    value: 'Un message direct, une promesse claire et une action principale visible dès les premières secondes.',
  },
  {
    label: 'Connexion',
    value: 'Des champs lisibles, des libellés simples et un chemin sans ambiguïté vers l’action attendue.',
  },
  {
    label: 'Tableau de bord',
    value: 'Les informations importantes remontent en premier, sans surcharge d’effets ni de densité.',
  },
  {
    label: 'Feedback',
    value: 'Les validations, alertes et erreurs guident l’utilisateur sans casser le rythme de navigation.',
  },
]

export const tableRows = [
  { pattern: 'Bouton principal', usage: 'Action dominante de la vue', example: 'Créer un trousseau' },
  { pattern: 'Badge de statut', usage: 'État système ou accès', example: 'Actif, en attente, critique' },
  { pattern: 'Carte de synthèse', usage: 'Résumé rapide', example: 'Derniers accès ou activité récente' },
]

export const typographyScale = [
  {
    token: '--step--2',
    label: 'Micro-texte',
    value: '12 px',
    usage: 'Mentions secondaires et petits repères.',
  },
  {
    token: '--step--1',
    label: 'Texte discret',
    value: '13 px',
    usage: 'Labels, badges et informations de contexte.',
  },
  {
    token: '--step-0',
    label: 'Texte courant',
    value: '14 px',
    usage: 'Texte principal et contenu des champs.',
  },
  {
    token: '--step-1',
    label: 'Texte renforcé',
    value: '16 px',
    usage: 'Actions et informations clés.',
  },
  {
    token: '--step-2',
    label: 'Titre de section',
    value: '22 px',
    usage: 'Titres de sections.',
  },
  {
    token: '--step-3',
    label: 'Titre principal',
    value: '30 à 50 px',
    usage: 'Titre principal de page.',
  },
]

export const layoutRules = [
  {
    title: 'Cadre commun',
    value: '1200 px max',
    description: 'Toutes les pages publiques et connectées partagent le même conteneur central.',
  },
  {
    title: 'Alignement',
    value: 'Centré',
    description: 'Le header, le contenu principal et le footer suivent la même ligne visuelle.',
  },
  {
    title: 'Comportement',
    value: 'Mobile-first',
    description: 'Le cadre reste identique, puis la mise en page interne s’adapte selon l’écran.',
  },
]

export const headingRules = [
  {
    title: 'Titre principal',
    value: 'Pas de retour anticipé',
    description: 'Un h1 ne doit pas se casser trop tôt si le conteneur laisse encore de la place utile.',
  },
  {
    title: 'Respiration',
    value: 'Écart resserré',
    description: 'Le paragraphe d’introduction reste proche du titre pour former un bloc compact et lisible.',
  },
  {
    title: 'Largeur utile',
    value: 'Pas de césure forcée',
    description: 'Le texte sous le titre ne doit pas repartir à la ligne tant que le conteneur offre encore de l’espace.',
  },
  {
    title: 'Cohérence',
    value: 'Même logique partout',
    description: 'La hiérarchie des titres doit rester stable sur l’accueil, l’authentification, les trousseaux et les items.',
  },
]

export const spacingRules = [
  {
    title: 'Bloc titre standard',
    value: '8 px puis 12 px',
    description: 'Eyebrow -> titre: 8 px. Titre -> texte: 12 px.',
  },
  {
    title: 'Sections de carte',
    value: '16 px',
    description: 'Même niveau visuel = même espacement.',
  },
  {
    title: 'Champs et actions',
    value: '16 px',
    description: 'Formulaires, boutons et messages gardent un rythme constant.',
  },
]

export const mobileRules = [
  {
    title: 'Lecture compacte',
    value: 'Structure mono-colonne',
    description: 'Les blocs se réorganisent sans perdre la hiérarchie.',
  },
  {
    title: 'Actions accessibles',
    value: 'Boutons pleine largeur sur mobile',
    description: 'Actions visibles et faciles à toucher.',
  },
  {
    title: 'Modales confortables',
    value: 'Scroll interne',
    description: 'Les modales longues restent utilisables sur petit écran.',
  },
]

export const landingForces = [
  {
    title: 'Un espace clair pour chaque équipe',
    description: 'Créez des trousseaux personnels ou partagés pour organiser les accès sans confusion.',
  },
  {
    title: 'Les bons droits, au bon moment',
    description: 'Lecture, modification et accès sensibles restent visibles pour éviter les zones grises.',
  },
  {
    title: 'Toutes les informations utiles au même endroit',
    description: 'Identifiants, mots de passe, notes, URIs et pièces jointes restent regroupés dans un seul élément.',
  },
  {
    title: 'Connexion simple et flexible',
    description: 'Accédez à l’outil avec une connexion standard ou fédérée selon les usages de l’entreprise.',
  },
  {
    title: 'Recherche, import et export facilités',
    description: 'Retrouvez rapidement vos informations et gardez des données interprétables en JSON ou CSV.',
  },
  {
    title: 'Une collaboration qui garde le contexte',
    description: 'La messagerie intégrée aide les équipes à échanger directement au bon endroit.',
  },
]
