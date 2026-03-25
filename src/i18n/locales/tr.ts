/**
 * Turkish translations (Türkçe)
 */
import { registerLocale } from '../index.js';

const tr: Record<string, string> = {
  'cardinal.north': 'K', 'cardinal.south': 'G', 'cardinal.east': 'D', 'cardinal.west': 'B',
  'ui.city': 'Şehir', 'ui.date': 'Tarih', 'ui.time': 'Saat', 'ui.theme': 'Tema',
  'ui.layers': 'Katmanlar', 'ui.meridians': 'Meridyenler', 'ui.constellations': 'Takımyıldızlar',
  'ui.constellation_names': 'Takımyıldız adları', 'ui.milky_way': 'Samanyolu',
  'ui.export_png': 'PNG İndir', 'ui.phrase': 'Söz', 'ui.size': 'Boyut', 'ui.language': 'Dil',
  'poster.under_this_sky': 'Bu gökyüzünün altında',
  'poster.the_night_we_met': 'Tanıştığımız gece',
  'poster.stars_of_your_birth': 'Doğduğun günün yıldızları',
  'poster.our_special_night': 'Özel gecemiz',
  'poster.written_in_stars': 'Yıldızlarda yazılmış',
  'poster.moment_in_time': 'Zamanda bir an',
  'category.birthday': 'Doğum Günü', 'category.wedding': 'Düğün',
  'category.relationship': 'İlişki', 'category.memorial': 'Anma',
  'category.baby': 'Bebek', 'category.custom': 'Özel metin',
  'phrase.birthday.1': 'Doğduğun günün gökyüzü',
  'phrase.birthday.2': 'Bu yıldızların altında dünyaya geldin',
  'phrase.birthday.3': 'Doğum gününün yıldızlı gökyüzü',
  'phrase.wedding.1': 'Düğün günümüzün gökyüzü',
  'phrase.wedding.2': 'Bu yıldızların altında "Evet" dedik',
  'phrase.wedding.3': 'En güzel günümüzün yıldızları',
  'phrase.relationship.1': 'Tanıştığımız gece',
  'phrase.relationship.2': 'Yıldızların altındaki ilk öpücüğümüz',
  'phrase.relationship.3': 'Aşkımıza tanıklık eden yıldızlar',
  'month.1': 'Ocak', 'month.2': 'Şubat', 'month.3': 'Mart',
  'month.4': 'Nisan', 'month.5': 'Mayıs', 'month.6': 'Haziran',
  'month.7': 'Temmuz', 'month.8': 'Ağustos', 'month.9': 'Eylül',
  'month.10': 'Ekim', 'month.11': 'Kasım', 'month.12': 'Aralık',
  'theme.black': 'Siyah', 'theme.white': 'Beyaz', 'theme.navy': 'Lacivert',
};

registerLocale('tr', tr);
export default tr;
