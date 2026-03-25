/**
 * French translations (Français)
 */
import { registerLocale } from '../index.js';

const fr: Record<string, string> = {
  'cardinal.north': 'N', 'cardinal.south': 'S', 'cardinal.east': 'E', 'cardinal.west': 'O',
  'ui.city': 'Ville', 'ui.date': 'Date', 'ui.time': 'Heure', 'ui.theme': 'Thème',
  'ui.layers': 'Couches', 'ui.meridians': 'Méridiens', 'ui.constellations': 'Constellations',
  'ui.constellation_names': 'Noms des constellations', 'ui.milky_way': 'Voie lactée',
  'ui.export_png': 'Télécharger PNG', 'ui.phrase': 'Phrase', 'ui.size': 'Taille', 'ui.language': 'Langue',
  'poster.under_this_sky': 'Sous ce ciel',
  'poster.the_night_we_met': 'La nuit où nous nous sommes rencontrés',
  'poster.stars_of_your_birth': 'Les étoiles le jour de ta naissance',
  'poster.our_special_night': 'Notre nuit spéciale',
  'poster.written_in_stars': 'Écrit dans les étoiles',
  'poster.moment_in_time': 'Un instant dans le temps',
  'category.birthday': 'Anniversaire', 'category.wedding': 'Mariage',
  'category.relationship': 'Relation', 'category.memorial': 'Commémoration',
  'category.baby': 'Naissance', 'category.custom': 'Texte personnalisé',
  'phrase.birthday.1': 'Le ciel le jour de ta naissance',
  'phrase.birthday.2': 'Sous ces étoiles, tu es venu au monde',
  'phrase.birthday.3': 'Le ciel de ton anniversaire',
  'phrase.wedding.1': 'Le ciel le jour de notre mariage',
  'phrase.wedding.2': 'Sous ces étoiles, nous avons dit « Oui »',
  'phrase.wedding.3': 'Les étoiles de notre plus beau jour',
  'phrase.relationship.1': 'La nuit où nous nous sommes rencontrés',
  'phrase.relationship.2': 'Notre premier baiser sous les étoiles',
  'phrase.relationship.3': 'Les étoiles témoins de notre amour',
  'month.1': 'Janvier', 'month.2': 'Février', 'month.3': 'Mars',
  'month.4': 'Avril', 'month.5': 'Mai', 'month.6': 'Juin',
  'month.7': 'Juillet', 'month.8': 'Août', 'month.9': 'Septembre',
  'month.10': 'Octobre', 'month.11': 'Novembre', 'month.12': 'Décembre',
  'theme.black': 'Noir', 'theme.white': 'Blanc', 'theme.navy': 'Bleu marine',
};

registerLocale('fr', fr);
export default fr;
