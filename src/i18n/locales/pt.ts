/**
 * Portuguese translations (Português)
 */
import { registerLocale } from '../index.js';

const pt: Record<string, string> = {
  'cardinal.north': 'N', 'cardinal.south': 'S', 'cardinal.east': 'L', 'cardinal.west': 'O',
  'ui.city': 'Cidade', 'ui.date': 'Data', 'ui.time': 'Hora', 'ui.theme': 'Tema',
  'ui.layers': 'Camadas', 'ui.meridians': 'Meridianos', 'ui.constellations': 'Constelações',
  'ui.constellation_names': 'Nomes das constelações', 'ui.milky_way': 'Via Láctea',
  'ui.export_png': 'Baixar PNG', 'ui.phrase': 'Frase', 'ui.size': 'Tamanho', 'ui.language': 'Idioma',
  'poster.under_this_sky': 'Sob este céu',
  'poster.the_night_we_met': 'A noite em que nos conhecemos',
  'poster.stars_of_your_birth': 'As estrelas no dia do seu nascimento',
  'poster.our_special_night': 'Nossa noite especial',
  'poster.written_in_stars': 'Escrito nas estrelas',
  'poster.moment_in_time': 'Um momento no tempo',
  'category.birthday': 'Aniversário', 'category.wedding': 'Casamento',
  'category.relationship': 'Relacionamento', 'category.memorial': 'Homenagem',
  'category.baby': 'Nascimento', 'category.custom': 'Texto personalizado',
  'phrase.birthday.1': 'O céu no dia em que você nasceu',
  'phrase.birthday.2': 'Sob estas estrelas, você veio ao mundo',
  'phrase.birthday.3': 'O céu do seu aniversário',
  'phrase.wedding.1': 'O céu no dia do nosso casamento',
  'phrase.wedding.2': 'Sob estas estrelas, dissemos «Sim»',
  'phrase.wedding.3': 'As estrelas do nosso melhor dia',
  'phrase.relationship.1': 'A noite em que nos conhecemos',
  'phrase.relationship.2': 'Nosso primeiro beijo sob as estrelas',
  'phrase.relationship.3': 'As estrelas testemunhas do nosso amor',
  'month.1': 'Janeiro', 'month.2': 'Fevereiro', 'month.3': 'Março',
  'month.4': 'Abril', 'month.5': 'Maio', 'month.6': 'Junho',
  'month.7': 'Julho', 'month.8': 'Agosto', 'month.9': 'Setembro',
  'month.10': 'Outubro', 'month.11': 'Novembro', 'month.12': 'Dezembro',
  'theme.black': 'Preto', 'theme.white': 'Branco', 'theme.navy': 'Azul marinho',
};

registerLocale('pt', pt);
export default pt;
