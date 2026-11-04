import type { en } from "./en";

/**
 * French messages.
 *
 * Typed against the English dictionary: a key that exists in `en.ts` and is
 * missing here is a TypeScript error, and so is a typo in a key name. That is
 * the whole point of the arrangement — the compiler keeps the two languages in
 * sync, so nobody has to remember to check.
 *
 * Translation notes (for whoever adds the next language)
 *  - French needs a non-breaking space before `:` and `%`, and here it is a
 *    regular space only inside `{{percent}} %` patterns: the app displays
 *    "18 %" in French and "18%" in English, so the space lives in the string.
 *  - "Uptime" has no natural French noun that fits a 290 px notch. "Sans
 *    redémarrage" carries the meaning in context and stays short.
 *  - Em dashes are kept as sentence separators, as in English: the notch is one
 *    line, and a comma reads as a list rather than a cause.
 */
export const fr: Record<keyof typeof en, string | { one: string; other: string }> = {
  // — Is : conseils affichés dans le notch --------------------------------
  "tip.batteryCritical": "Batterie à {{percent}} % — branchez maintenant",
  "tip.batteryLow": "Batterie à {{percent}} % — à recharger",
  "tip.batteryLowWithTime": "Batterie {{percent}} % — {{time}}, à recharger",
  "tip.batteryTime": "Environ {{time}} d'autonomie",
  "tip.batteryFull": "Batterie pleine — vous pouvez débrancher",
  "tip.chargeReminder": "Chargée à {{percent}} % — vous pouvez débrancher",
  "tip.diskCritical": "{{mount}} est presque plein — {{free}} restants",
  "tip.diskLow": "{{mount}} se remplit — {{free}} restants",
  "tip.memoryCritical": "Mémoire presque pleine ({{percent}} %) — sauvegardez",
  "tip.memoryHigh": "Mémoire à {{percent}} % — fermer une application ?",
  "tip.cpuHigh": "Processeur à {{percent}} % — quelque chose tourne",
  "tip.restart": {
    one: "{{count}} jour sans redémarrer — un redémarrage ?",
    other: "{{count}} jours sans redémarrer — un redémarrage ?",
  },
  "tip.sessionLong": "{{hours}} h de session — une pause ?",
  "tip.lateNight": "Il est {{time}} — penser à s'arrêter ?",
  "tip.dismiss": "Fermer le conseil",

  // — Le notch -------------------------------------------------------------
  "notch.updateAvailable": "Mise à jour disponible",
  "notch.lowBattery": "Batterie faible",
  "notch.charging": "En charge",
  "notch.onBattery": "Sur batterie",

  // — Interface partagée ---------------------------------------------------
  "common.none": "—",
  "common.charing": "en charge",
  "common.now": "Actuel : {{value}}",

  // — Fenêtre Réglages -----------------------------------------------------
  // « notch » reste « notch » en français : c'est le nom de la fonctionnalité
  // dans le produit, pas un mot à traduire. « Encoche » ferait référence à
  // autre chose pour un utilisateur qui lit ce mot dans toute l'interface.
  "settings.title": "Réglages",
  "settings.welcomeTitle": "Bienvenue dans Islet",
  "settings.tab.general": "Général",
  "settings.tab.appearance": "Apparence",
  "settings.tab.notch": "Notch",
  "settings.tab.dock": "Dock",
  "settings.tab.overlays": "Surcouches",
  "settings.tab.about": "À propos",

  // — Réglages : Général ---------------------------------------------------
  "settings.general.system": "Système",
  "settings.general.autostart": "Lancer à l'ouverture de session",
  "settings.general.autostart.desc": "Ouvrir Islet automatiquement",
  "settings.general.updateIndicator": "Indicateur de mise à jour",
  "settings.general.updateIndicator.desc": "Afficher un point vert quand une version est disponible",
  "settings.general.timeFormat": "Heure sur 24 h",
  "settings.general.timeFormat.desc": "Utiliser le format 24 heures",
  "settings.general.lowBattery": "Alerte batterie faible",
  "settings.general.lowBattery.desc": "Se déclenche à {{percent}} %",
  "settings.general.app": "Application",
  "settings.general.replay": "Revoir l'accueil",
  "settings.general.replay.desc": "Refaire la configuration initiale — rien n'est réinitialisé",
  "settings.general.restart": "Redémarrer Islet",
  "settings.general.restart.desc": "Réinitialiser tous les composants",
  "settings.general.quit": "Quitter Islet",
  "settings.general.quit.desc": "Fermer complètement l'application",

  // — Réglages : langue ----------------------------------------------------
  "settings.language": "Langue",
  "settings.language.title": "Langue",
  "settings.language.desc": "Appliquée immédiatement, dans toute l'application",
  "settings.language.system": "Suivre Windows",
  "settings.language.fr": "Français",
  "settings.language.en": "English",

  // — Réglages : Is --------------------------------------------------------
  "settings.assistant.group": "{{name}} — Assistant",
  "settings.assistant.name": "Nom",
  "settings.assistant.name.desc": "Le nom que le notch donne à votre assistant",
  "settings.assistant.enable": "Activer {{name}}",
  "settings.assistant.enable.desc":
    "Des conseils courts dans le notch, et un contour coloré qui reste jusqu'au clic",
  "settings.assistant.watches": "Ce que {{name}} surveille",
  "settings.assistant.battery": "Batterie",
  "settings.assistant.battery.live": "Actuel : {{percent}} %{{charging}}",
  "settings.assistant.battery.desc": "Batterie faible, rappel de charge, charge complète",
  "settings.assistant.storage": "Stockage",
  "settings.assistant.storage.desc": "Disque qui se remplit, et volumes presque pleins",
  "settings.assistant.performance": "Performance",
  "settings.assistant.performance.desc": "Charge processeur et pression mémoire durables",
  "settings.assistant.session": "Session",
  "settings.assistant.session.live": "Session actuelle : {{uptime}}",
  "settings.assistant.session.desc": "Session longue, redémarrage oublié, nuits tardives",

  "settings.assistant.thresholds": "Seuils",
  "settings.assistant.lowBattery": "Alerte batterie faible",
  "settings.assistant.lowBattery.desc": "Prévenir quand la batterie descend à ce niveau",
  "settings.assistant.chargeLimit": "Rappel de charge",
  "settings.assistant.chargeLimit.desc": "Suggérer de débrancher à ce niveau de charge",
  "settings.assistant.freeSpaceFloor": "Plancher d'espace libre",
  "settings.assistant.freeSpaceFloor.desc": "Prévenir sous cette part d'espace libre",
  "settings.assistant.sessionHours": "Session longue",
  "settings.assistant.sessionHours.desc": "Suggérer une pause après ce nombre d'heures",

  "settings.assistant.live": "En ce moment",
  "settings.assistant.cpu": "Processeur",
  "settings.assistant.cpu.desc": "Charge instantanée",
  "settings.assistant.memory": "Mémoire",
  "settings.assistant.memory.desc": "Mémoire physique utilisée",
  "settings.assistant.uptime": "Depuis le démarrage",
  "settings.assistant.uptime.desc": "Temps écoulé depuis le démarrage de Windows",
  "settings.assistant.disks": "Disques",
  "settings.assistant.disks.desc": "Volumes fixes et espace libre",

  // — Accueil --------------------------------------------------------------
  "welcome.title": "Bienvenue dans Islet",
  "welcome.lead":
    "Un notch et un dock, en haut et en bas de votre écran. Deux minutes pour l'installer à votre façon — et rien n'est définitif.",
  "welcome.name": "Comment dois-je m'appeler ?",
  "welcome.nameHint": "Le petit assistant qui lit votre PC et vous en parle.",
  "welcome.nameAria": "Nom de l'assistant",

  "welcome.look": "Choisissez une apparence",
  "welcome.lookLead":
    "Le notch, le dock et Is suivent tous ce choix. Modifiable à tout moment dans Réglages › Apparence.",
  "welcome.theme.dark": "Sombre",
  "welcome.theme.darkHint": "Le choix par défaut. Se fond dans un fond d'écran sombre.",
  "welcome.theme.light": "Clair",
  "welcome.theme.lightHint": "Blanc givré, lisible sur un bureau clair.",
  "welcome.theme.custom": "Personnalisé",
  "welcome.theme.customHint": "Votre propre couleur d'accent, assombrie pour rester lisible.",
  "welcome.theme.adaptive": "Adaptatif",
  "welcome.theme.adaptiveHint": "Suit automatiquement la couleur d'accent de Windows.",
  "welcome.accent": "Couleur d'accent",

  "welcome.home": "Où doit-il vivre ?",
  "welcome.homeLead":
    "Le notch pend au bord supérieur de l'écran. Le dock remplace la barre du menu Démarrer, en bas. Les deux peuvent tourner ensemble.",
  "welcome.top": "Haut de l'écran",
  "welcome.notch.fixed": "Fixe",
  "welcome.notch.fixedHint": "Toujours visible. Le notch classique.",
  "welcome.notch.smart": "Intelligent",
  "welcome.notch.smartHint": "Se cache jusqu'à ce que la souris atteigne le bord supérieur.",
  "welcome.notch.peek": "Aperçu",
  "welcome.notch.peekHint": "Reste en pastille, se déplie au survol.",
  "welcome.bottom": "Bas de l'écran",
  "welcome.dock": "Afficher le dock",
  "welcome.dockHint": "Vos applications épinglées, des aperçus de fenêtres et une recherche, au bord inférieur.",

  "welcome.privacy": "Ce qui quitte votre PC",
  "welcome.privacyLead":
    "Presque rien. Islet fonctionne hors ligne ; trois choses peuvent joindre internet, et chacune vous appartient.",
  "welcome.privacy.local": "Reste ici.",
  "welcome.privacy.localBody":
    "Batterie, disques, mémoire, processeur, durée de session, vos fenêtres, vos réglages, ce que Is vous dit. Rien n'est envoyé nulle part, et il n'y a pas de compte.",
  "welcome.privacy.weather": "La météo",
  "welcome.privacy.weatherBody":
    "interroge un service public de prévisions pour une ville — son nom, rien d'autre. Inactive tant que vous n'avez pas choisi de ville.",
  "welcome.privacy.calendar": "La synchronisation d'agenda",
  "welcome.privacy.calendarBody":
    "ne parle qu'au serveur CalDAV que vous configurez vous-même. Désactivée par défaut.",
  "welcome.updates": "Vérifier les mises à jour automatiquement",
  "welcome.updatesHint":
    "Contacte GitHub au démarrage et télécharge les nouvelles versions. L'installation reste manuelle — la question vous est toujours posée.",

  "welcome.done": "Tout est prêt",
  "welcome.doneLead":
    "Tout est réversible : Réglages › Général contient une entrée pour revoir cet écran.",
  "welcome.summary.assistant": "Assistant",
  "welcome.summary.theme": "Thème",
  "welcome.summary.notch": "Notch",
  "welcome.summary.dock": "Dock",
  "welcome.summary.on": "Activé",
  "welcome.summary.off": "Désactivé",
  "welcome.summary.customAccent": "Accent personnalisé",
  "welcome.footnote":
    "Ensuite : survolez le notch pour l'ouvrir, ou faites un clic droit sur son icône dans la zone de notification pour la même fenêtre de Réglages.",

  "welcome.back": "Retour",
  "welcome.skip": "Passer",
  "welcome.continue": "Continuer",
  "welcome.start": "Commencer avec Islet",
};
