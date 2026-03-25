/**
 * Korean translations (한국어)
 */
import { registerLocale } from '../index.js';

const ko: Record<string, string> = {
  'cardinal.north': '북', 'cardinal.south': '남', 'cardinal.east': '동', 'cardinal.west': '서',
  'ui.city': '도시', 'ui.date': '날짜', 'ui.time': '시간', 'ui.theme': '테마',
  'ui.layers': '레이어', 'ui.meridians': '자오선', 'ui.constellations': '별자리',
  'ui.constellation_names': '별자리 이름', 'ui.milky_way': '은하수',
  'ui.export_png': 'PNG 다운로드', 'ui.phrase': '문구', 'ui.size': '크기', 'ui.language': '언어',
  'poster.under_this_sky': '이 하늘 아래에서',
  'poster.the_night_we_met': '우리가 만난 밤',
  'poster.stars_of_your_birth': '당신이 태어난 날의 별',
  'poster.our_special_night': '우리의 특별한 밤',
  'poster.written_in_stars': '별에 새겨진 이야기',
  'poster.moment_in_time': '시간 속의 순간',
  'category.birthday': '생일', 'category.wedding': '결혼식',
  'category.relationship': '연애', 'category.memorial': '기념일',
  'category.baby': '출산', 'category.custom': '직접 입력',
  'phrase.birthday.1': '당신이 태어난 날의 하늘',
  'phrase.birthday.2': '이 별 아래에서 당신이 태어났습니다',
  'phrase.birthday.3': '생일의 별하늘',
  'phrase.wedding.1': '결혼식 날의 하늘',
  'phrase.wedding.2': '이 별 아래에서 우리는 약속했습니다',
  'phrase.wedding.3': '최고의 날의 별들',
  'phrase.relationship.1': '우리가 만난 밤',
  'phrase.relationship.2': '별 아래에서의 첫 키스',
  'phrase.relationship.3': '우리의 사랑을 지켜본 별들',
  'month.1': '1월', 'month.2': '2월', 'month.3': '3월',
  'month.4': '4월', 'month.5': '5월', 'month.6': '6월',
  'month.7': '7월', 'month.8': '8월', 'month.9': '9월',
  'month.10': '10월', 'month.11': '11월', 'month.12': '12월',
  'theme.black': '블랙', 'theme.white': '화이트', 'theme.navy': '네이비',
};

registerLocale('ko', ko);
export default ko;
