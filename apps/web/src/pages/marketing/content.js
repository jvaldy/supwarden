export const colorGroups = [
  {
    title: 'Couleurs principales',
    items: [
      { name: 'Ink 950', value: '#08111D', role: 'Fond des pages de connexion, dashboard et modales' },
      { name: 'Ink 900', value: '#0F1D2D', role: 'Sections secondaires et zones de navigation' },
      { name: 'Ink 800', value: '#13263A', role: 'Cartes de trousseaux, panneaux et blocs de formulaire' },
      { name: 'Cyan 500', value: '#5FA8D3', role: 'Action principale: créer, enregistrer, envoyer' },
      { name: 'Cyan 400', value: '#8FD3FF', role: 'Mise en avant des états actifs et liens utiles' },
      { name: 'Cyan 300', value: '#ADD8FF', role: 'Bordures, focus et repères de saisie' },
    ],
  },
  {
    title: 'États fonctionnels',
    items: [
      { name: 'Success', value: '#7EE0B5', role: 'Succès de sauvegarde, invitation envoyée, import terminé' },
      { name: 'Warning', value: '#FFD27A', role: 'Action incomplète: PIN manquant, validation requise' },
      { name: 'Danger', value: '#FF8F9F', role: 'Suppression, erreur API, accès refusé' },
    ],
  },
]

export const principles = [
  'Privilégier les écrans orientés action: créer, partager, retrouver.',
  'Rendre les permissions compréhensibles sans jargon.',
  'Conserver une lecture stable entre mobile et desktop.',
]

export const experiencePillars = [
  {
    title: 'Contexte visible',
    description: 'On doit toujours savoir dans quel trousseau on agit et avec quels droits.',
  },
  {
    title: 'Sécurité praticable',
    description: 'Le PIN et les secrets sont protégés sans bloquer les tâches quotidiennes.',
  },
  {
    title: 'Collaboration directe',
    description: 'Invitations, membres et messages restent au même endroit que les accès.',
  },
]

export const userSignals = [
  { value: 'Orienté tâche', label: 'Un écran = une action claire: consulter, modifier, partager.' },
  { value: 'Prévisible', label: 'Mêmes composants et mêmes états de feedback partout.' },
  { value: 'Exploitable', label: 'Les infos utiles (URL, notes, pièces jointes) restent accessibles vite.' },
]

export const buttonExamples = [
  { label: 'Ouvrir mon dashboard', className: 'button-link button-link-primary button-link-cta' },
  { label: 'Créer un trousseau', className: 'button-link button-link-primary' },
  { label: 'Inviter un membre', className: 'button-link button-link-primary' },
]

export const buttonRules = [
  {
    title: 'Action principale',
    value: 'Une priorité par zone',
    description: 'Dans un bloc, un seul bouton principal porte la prochaine action attendue.',
  },
  {
    title: 'Action secondaire',
    value: 'Édition ou navigation',
    description: 'Les actions de consultation ou retour utilisent les variantes secondaires/tertiaires.',
  },
  {
    title: 'Action critique',
    value: 'Style danger réservé',
    description: 'Suppression de compte, trousseau ou élément: toujours en style danger.',
  },
]

export const statusCards = [
  {
    label: 'Accueil',
    value: 'Expliquer en quelques lignes la gestion de trousseaux et le partage d’accès.',
  },
  {
    label: 'Connexion',
    value: 'Limiter les champs au nécessaire et garder des erreurs compréhensibles.',
  },
  {
    label: 'Dashboard',
    value: 'Remonter les trousseaux actifs, permissions et activité récente.',
  },
  {
    label: 'Feedback',
    value: 'Des messages courts, précis, liés à l’action en cours.',
  },
]

export const tableRows = [
  { pattern: 'Bouton principal', usage: 'Action dominante de la vue', example: 'Créer un trousseau' },
  { pattern: 'Badge de rôle', usage: 'Niveau d’accès', example: 'Propriétaire, éditeur, lecteur' },
  { pattern: 'Carte de synthèse', usage: 'État d’un espace', example: 'Membres, secrets, activité' },
]

export const typographyScale = [
  { token: '--step--2', label: 'Micro-texte', value: '12 px', usage: 'Métadonnées et indications secondaires.' },
  { token: '--step--1', label: 'Texte discret', value: '13 px', usage: 'Labels de champs et badges de contexte.' },
  { token: '--step-0', label: 'Texte courant', value: '14 px', usage: 'Contenu principal des formulaires et listes.' },
  { token: '--step-1', label: 'Texte renforcé', value: '16 px', usage: 'Actions clés et informations prioritaires.' },
  { token: '--step-2', label: 'Titre de section', value: '22 px', usage: 'Titres internes de pages et panneaux.' },
  { token: '--step-3', label: 'Titre principal', value: '30 à 50 px', usage: 'Titre principal d’une vue marketing.' },
]

export const layoutRules = [
  {
    title: 'Cadre commun',
    value: '1200 px max',
    description: 'Même largeur cible entre pages publiques et espace connecté.',
  },
  {
    title: 'Alignement',
    value: 'Axe central',
    description: 'Header, contenu et footer suivent la même colonne principale.',
  },
  {
    title: 'Comportement',
    value: 'Mobile-first',
    description: 'Priorité à la lisibilité sur petit écran, extension sur desktop ensuite.',
  },
]

export const headingRules = [
  {
    title: 'Titre principal',
    value: 'Phrase simple',
    description: 'Un h1 doit annoncer clairement la valeur de la page en une phrase.',
  },
  {
    title: 'Respiration',
    value: 'Bloc compact',
    description: 'Titre et texte d’intro restent proches pour préserver le contexte.',
  },
  {
    title: 'Largeur utile',
    value: 'Lignes stables',
    description: 'Éviter les retours forcés qui cassent la lecture sans bénéfice.',
  },
  {
    title: 'Cohérence',
    value: 'Hiérarchie constante',
    description: 'Même logique de titres entre landing, auth, trousseaux et items.',
  },
]

export const spacingRules = [
  {
    title: 'Bloc titre standard',
    value: '8 px puis 12 px',
    description: 'Eyebrow vers titre puis titre vers texte introductif.',
  },
  {
    title: 'Sections de carte',
    value: '16 px',
    description: 'Même espacement vertical pour les blocs de même niveau.',
  },
  {
    title: 'Champs et actions',
    value: '16 px',
    description: 'Rythme constant sur formulaires, boutons et messages.',
  },
]

export const mobileRules = [
  {
    title: 'Lecture compacte',
    value: 'Mono-colonne',
    description: 'Les panneaux s’empilent sans perdre la hiérarchie des actions.',
  },
  {
    title: 'Actions accessibles',
    value: 'Cibles larges',
    description: 'Boutons et champs restent faciles à toucher sur écran réduit.',
  },
  {
    title: 'Modales confortables',
    value: 'Scroll interne',
    description: 'Les contenus longs restent utilisables sans sortir de la modale.',
  },
]

export const landingForces = [
  {
    title: 'Trousseaux personnels et partagés',
    description: 'Chaque équipe peut séparer ses accès par projet, client ou environnement.',
  },
  {
    title: 'Permissions explicites',
    description: 'Les rôles de membre rendent visibles les droits de lecture, édition et gestion.',
  },
  {
    title: 'Secrets et contexte au même endroit',
    description: 'Identifiants, URL, notes, champs personnalisés et pièces jointes restent groupés.',
  },
  {
    title: 'Partage d’accès maîtrisé',
    description: 'Invitez des membres, ajustez leurs droits et retirez l’accès sans détour.',
  },
  {
    title: 'Import/export exploitable',
    description: 'Conservez des données lisibles en JSON ou CSV pour migrer sans blocage.',
  },
  {
    title: 'Messagerie liée au trousseau',
    description: 'Les échanges d’équipe restent attachés au bon contexte de travail.',
  },
]

