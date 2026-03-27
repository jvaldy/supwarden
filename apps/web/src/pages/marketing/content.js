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
  { label: 'Créer un trousseau', className: 'button button-primary' },
  { label: 'Inviter un membre', className: 'button button-secondary' },
  { label: 'Révoquer un accès', className: 'button button-danger' },
]

export const statusCards = [
  {
    label: 'Accueil',
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
