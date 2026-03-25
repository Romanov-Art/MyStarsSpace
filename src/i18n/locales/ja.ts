/**
 * Japanese translations (日本語)
 */
import { registerLocale } from '../index.js';

const ja: Record<string, string> = {
  'cardinal.north': '北', 'cardinal.south': '南', 'cardinal.east': '東', 'cardinal.west': '西',
  'ui.city': '都市', 'ui.date': '日付', 'ui.time': '時刻', 'ui.theme': 'テーマ',
  'ui.layers': 'レイヤー', 'ui.meridians': '子午線', 'ui.constellations': '星座',
  'ui.constellation_names': '星座名', 'ui.milky_way': '天の川',
  'ui.export_png': 'PNGダウンロード', 'ui.phrase': 'フレーズ', 'ui.size': 'サイズ', 'ui.language': '言語',
  'poster.under_this_sky': 'この空の下で',
  'poster.the_night_we_met': '出会った夜',
  'poster.stars_of_your_birth': 'あなたが生まれた日の星空',
  'poster.our_special_night': '特別な夜',
  'poster.written_in_stars': '星に書かれた物語',
  'poster.moment_in_time': '時の一瞬',
  'category.birthday': '誕生日', 'category.wedding': '結婚式',
  'category.relationship': '恋愛', 'category.memorial': '記念日',
  'category.baby': '出産', 'category.custom': 'カスタム',
  'phrase.birthday.1': 'あなたが生まれた日の空',
  'phrase.birthday.2': 'この星の下であなたは生まれました',
  'phrase.birthday.3': '誕生日の星空',
  'phrase.wedding.1': '結婚式の日の空',
  'phrase.wedding.2': 'この星の下で「はい」と言った',
  'phrase.wedding.3': '最高の日の星たち',
  'phrase.relationship.1': '出会った夜',
  'phrase.relationship.2': '星の下でのファーストキス',
  'phrase.relationship.3': '私たちの愛を見守った星たち',
  'month.1': '1月', 'month.2': '2月', 'month.3': '3月',
  'month.4': '4月', 'month.5': '5月', 'month.6': '6月',
  'month.7': '7月', 'month.8': '8月', 'month.9': '9月',
  'month.10': '10月', 'month.11': '11月', 'month.12': '12月',
  'theme.black': 'ブラック', 'theme.white': 'ホワイト', 'theme.navy': 'ネイビー',
};

registerLocale('ja', ja);
export default ja;
