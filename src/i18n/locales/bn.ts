/**
 * Bengali translations (বাংলা)
 */
import { registerLocale } from '../index.js';

const bn: Record<string, string> = {
  // Cardinal directions
  'cardinal.north': 'উ',
  'cardinal.south': 'দ',
  'cardinal.east': 'পূ',
  'cardinal.west': 'প',

  // UI labels
  'ui.city': 'শহর',
  'ui.date': 'তারিখ',
  'ui.time': 'সময়',
  'ui.theme': 'থিম',
  'ui.layers': 'স্তর',
  'ui.meridians': 'মেরিডিয়ান',
  'ui.constellations': 'নক্ষত্রমণ্ডল',
  'ui.constellation_names': 'নাম',
  'ui.milky_way': 'আকাশগঙ্গা',
  'ui.export_png': 'PNG ডাউনলোড',
  'ui.order_pdf': 'PDF সংস্করণ অর্ডার করুন',
  'ui.order_unavailable': 'অর্ডার সাময়িকভাবে অনুপলব্ধ',
  'ui.edit_in_canva': 'Canva-তে সম্পাদনা করুন',
  'ui.canva_preparing': 'Canva-র জন্য আপনার ডিজাইন প্রস্তুত হচ্ছে…',
  'ui.canva_hint': 'এই পোস্টারটি সম্পাদনাযোগ্য লেখাসহ আপনার Canva অ্যাকাউন্টে খোলে',
  'ui.canva_popup_blocked': 'Canva খুলতে এই সাইটের জন্য পপ-আপ অনুমতি দিন।',
  'ui.canva_failed': 'Canva-র জন্য ডিজাইন প্রস্তুত করা যায়নি: {{error}}',
  'ui.total': 'মোট:',
  'ui.preview_info': 'প্রিভিউ সাইজ নির্বাচিত ফ্রেম সাইজের সাথে মিলে।',
  'ui.phrase': 'বাক্যাংশ',
  'ui.size': 'আকার',
  'ui.language': 'ভাষা',

  // Phrase categories
  'category.birthday': 'জন্মদিন',
  'category.wedding': 'বিবাহ',
  'category.relationship': 'সম্পর্ক',
  'category.memorial': 'স্মরণীয়',
  'category.baby': 'শিশু জন্ম',
  'category.custom': 'কাস্টম টেক্সট',
  'category.business': 'ব্যবসা',

  // Birthday phrases
  'phrase.birthday.1': 'তুমি যেদিন জন্মেছিলে সেদিনের আকাশ',
  'phrase.birthday.2': 'এই তারার নিচে তুমি পৃথিবীতে এসেছিলে',
  'phrase.birthday.3': 'তোমার জন্মদিনের তারা',
  'phrase.birthday.4': 'শুধু তোমার জন্য একটি আকাশ',
  'phrase.birthday.5': 'এই তারার নিচে জন্ম',
  'phrase.birthday.6': 'তোমার প্রথম তারাভরা রাত',
  'phrase.birthday.7': 'মহাবিশ্ব তোমাকে স্বাগত জানিয়েছে',
  'phrase.birthday.8': 'তোমার জন্য তারা সাজানো',
  'phrase.birthday.9': 'তোমার জন্মের রাতের আকাশ',
  'phrase.birthday.10': 'আনন্দের নক্ষত্রমণ্ডল',

  // Wedding phrases
  'phrase.wedding.1': 'আমাদের বিবাহের দিনের আকাশ',
  'phrase.wedding.2': 'এই তারার নিচে আমরা প্রতিজ্ঞা করেছিলাম',
  'phrase.wedding.3': 'আমাদের সেরা দিনের তারা',
  'phrase.wedding.4': 'চিরকাল তারায় লেখা',
  'phrase.wedding.5': 'দুটি হৃদয় একটি আকাশ',
  'phrase.wedding.6': 'তারার নিচে আমাদের ভালোবাসা',
  'phrase.wedding.7': 'যে রাতে আমরা এক হয়েছিলাম',
  'phrase.wedding.8': 'আজ রাত থেকে চিরকাল',
  'phrase.wedding.9': 'তারারা আমাদের শপথ দেখেছে',
  'phrase.wedding.10': 'আকাশের নিচে একটি প্রতিশ্রুতি',

  // Relationship phrases
  'phrase.relationship.1': 'যে রাতে আমরা দেখা করেছিলাম',
  'phrase.relationship.2': 'তারার নিচে আমাদের প্রথম চুম্বন',
  'phrase.relationship.3': 'যে তারারা আমাদের ভালোবাসার সাক্ষী',
  'phrase.relationship.4': 'এই আকাশের নিচে আমরা একে অপরকে খুঁজে পেয়েছি',
  'phrase.relationship.5': 'আমাদের গল্প এখানে শুরু হয়েছিল',
  'phrase.relationship.6': 'আকাশ আমাদের মনে রেখেছে',
  'phrase.relationship.7': 'তারায় লেখা ভালোবাসা',
  'phrase.relationship.8': 'সেই জাদুকরী রাত',
  'phrase.relationship.9': 'যেখানে সব শুরু হয়েছিল',
  'phrase.relationship.10': 'আমাদের বিশেষ রাত',

  // Memorial phrases
  'phrase.memorial.1': 'কষ্টের মধ্য দিয়ে তারার দিকে',
  'phrase.memorial.2': 'যেদিন তোমার সাথে দেখা হয়েছিল',
  'phrase.memorial.3': 'সমগ্র পৃথিবী তোমার জন্য উন্মুক্ত',
  'phrase.memorial.4': 'স্বপ্ন দেখো। নতুন তারা আবিষ্কার করো।',
  'phrase.memorial.5': 'এটি ছিল অবিস্মরণীয়',
  'phrase.memorial.6': 'তারার নিচে বার্ষিকী',
  'phrase.memorial.7': 'যে মুহূর্তটি সব বদলে দিয়েছে',
  'phrase.memorial.8': 'সেই সন্ধ্যা',
  'phrase.memorial.9': 'আমাদের প্রথম সাক্ষাতের আকাশ',
  'phrase.memorial.10': 'তারারা এই দিন মনে রেখেছে',

  // Baby phrases
  'phrase.baby.1': 'তোমার জন্মদিনের তারা',
  'phrase.baby.2': 'পৃথিবীতে স্বাগতম',
  'phrase.baby.3': 'একটি নতুন তারার জন্ম হয়েছে',
  'phrase.baby.4': 'আকাশ তোমার জন্য হেসেছে',
  'phrase.baby.5': 'ছোট হাত বিশাল মহাবিশ্ব',
  'phrase.baby.6': 'ভাগ্যবান তারার নিচে জন্ম',
  'phrase.baby.7': 'আমাদের ছোট তারা',
  'phrase.baby.8': 'তুমি যে রাতে এসেছিলে',
  'phrase.baby.9': 'তারার নিচে একটি অলৌকিক ঘটনা',
  'phrase.baby.10': 'হ্যালো ছোট্ট সোনা',

  // Business phrases
  'phrase.business.1': 'একটি মহান যাত্রার শুরু',
  'phrase.business.2': 'যে রাতে স্বপ্ন বাস্তব হয়েছিল',
  'phrase.business.3': 'প্রথম দিন থেকে তারায় লেখা',
  'phrase.business.4': 'যেখানে উচ্চাভিলাষ তারার সাথে মিলেছে',
  'phrase.business.5': 'এই আকাশের নিচে একটি স্বপ্ন শুরু হয়েছিল',
  'phrase.business.6': 'আমাদের প্রতিষ্ঠার দিনের আকাশ',
  'phrase.business.7': 'নতুন শুরুর তারা',
  'phrase.business.8': 'আমাদের যাত্রা এখানে শুরু হয়েছিল',
  'phrase.business.9': 'তারার দিকে পৌঁছানো',
  'phrase.business.10': 'যে রাতে সব শুরু হয়েছিল',

  // Months
  'month.1': 'জানুয়ারি', 'month.2': 'ফেব্রুয়ারি', 'month.3': 'মার্চ',
  'month.4': 'এপ্রিল', 'month.5': 'মে', 'month.6': 'জুন',
  'month.7': 'জুলাই', 'month.8': 'আগস্ট', 'month.9': 'সেপ্টেম্বর',
  'month.10': 'অক্টোবর', 'month.11': 'নভেম্বর', 'month.12': 'ডিসেম্বর',

  // Theme names
  'theme.black': 'কালো', 'theme.white': 'সাদা', 'theme.navy': 'নেভি',

  // UI — Style panel
  'ui.choose_color': 'রঙ বেছে নিন',
  'ui.choose_style': 'স্টাইল বেছে নিন',
  'ui.choose_size': 'আকার বেছে নিন',
  'ui.stars': 'তারা',
  'ui.colors': 'রঙ',
  'ui.bw': 'সাদা-কালো',
  'ui.frame': 'ফ্রেম',
  'ui.compass': 'কম্পাস',
  'ui.zodiac': 'রাশিচক্র',
  'ui.show': 'দেখান',
  'ui.hide': 'লুকান',
  'ui.flat': 'সমতল',
  'ui.3d': '3D',
  'ui.none': 'কোনোটি নয়',
  'ui.line': 'রেখা',
  'ui.double': 'দ্বিগুণ',
  'ui.border': 'বর্ডার',
  'ui.simple': 'সরল',
  'ui.degrees': 'ডিগ্রি',
  'ui.cardinal': 'মূল দিক',
  'ui.unit_cm': 'সেমি',
  'ui.unit_inch': 'ইঞ্চি',
  'ui.exporting': '⏳ রপ্তানি হচ্ছে...',
  'ui.editor': 'সম্পাদক',

  // UI — Event details
  'ui.enter_event_details': 'ইভেন্টের বিবরণ লিখুন',
  'ui.format_settings': 'ফরম্যাট সেটিংস',
  'ui.date_format': 'তারিখ ফরম্যাট',
  'ui.full_month_name': 'পূর্ণ মাসের নাম',
  'ui.time_format': 'সময় ফরম্যাট',
  'ui.city_search_placeholder': '🔍 শহর বা স্থানাঙ্ক',
  'ui.coords_detected': 'স্থানাঙ্ক সনাক্ত হয়েছে — Enter চাপুন',

  // UI — Phrase & text
  'ui.add_phrase': 'একটি বাক্যাংশ যোগ করুন',
  'ui.or_generate': 'একটি বিকল্প বেছে নিন',
  'ui.editable_text': 'সম্পাদনাযোগ্য টেক্সট',
  'ui.text_settings': 'টেক্সট সেটিংস',
  'ui.name_placeholder': 'নাম / কোম্পানি',

  // Size names
  'size.postcard': 'পোস্টকার্ড',
  'size.a4': 'A4',
  'size.standard': 'স্ট্যান্ডার্ড',
  'size.medium': 'মাঝারি',
  'size.large': 'বড়',
  'size.max': 'সর্বোচ্চ',

  // Font selector
  'ui.font': 'ফন্ট',
  'ui.print_color_warning': 'প্রিন্ট রঙ স্ক্রিনে যা দেখছেন তার থেকে আলাদা হতে পারে!',

  // Zodiac signs
  'zodiac.capricorn': 'মকর', 'zodiac.aquarius': 'কুম্ভ',
  'zodiac.pisces': 'মীন', 'zodiac.aries': 'মেষ',
  'zodiac.taurus': 'বৃষ', 'zodiac.gemini': 'মিথুন',
  'zodiac.cancer': 'কর্কট', 'zodiac.leo': 'সিংহ',
  'zodiac.virgo': 'কন্যা', 'zodiac.libra': 'তুলা',
  'zodiac.scorpio': 'বৃশ্চিক', 'zodiac.sagittarius': 'ধনু',
};

registerLocale('bn', bn);
export default bn;
