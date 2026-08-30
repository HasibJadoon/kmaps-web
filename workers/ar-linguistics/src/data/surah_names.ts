const SURAH_CANONICAL: Record<string, number> = {

  'الفاتحة': 1, 'فاتحة الكتاب': 1, 'أم الكتاب': 1,

  'البقرة': 2,

  'آل عمران': 3,

  'النساء': 4,

  'المائدة': 5,

  'الأنعام': 6,

  'الأعراف': 7,

  'الأنفال': 8,

  'التوبة': 9, 'براءة': 9,

  'يونس': 10,

  'هود': 11,

  'يوسف': 12,

  'الرعد': 13,

  'إبراهيم': 14, 'ابراهيم': 14,

  'الحجر': 15,

  'النحل': 16,

  'الإسراء': 17, 'الاسراء': 17, 'بني إسرائيل': 17, 'بنى إسرائيل': 17,

  'الكهف': 18,

  'مريم': 19,

  'طه': 20, 'طـه': 20,

  'الأنبياء': 21,

  'الحج': 22, 'الحجّ': 22,

  'المؤمنون': 23,

  'النور': 24,

  'الفرقان': 25,

  'الشعراء': 26,

  'النمل': 27, 'سورة النمل': 27,

  'القصص': 28,

  'العنكبوت': 29,

  'الروم': 30,

  'لقمان': 31,

  'السجدة': 32,

  'الأحزاب': 33,

  'سبأ': 34, 'سبا': 34,

  'فاطر': 35, 'الملائكة': 35,

  'يس': 36, 'يـس': 36, 'ياسين': 36,

  'الصافات': 37,

  'ص': 38,

  'الزمر': 39,

  'غافر': 40, 'المؤمن': 40,

  'فصلت': 41, 'حم السجدة': 41,

  'الشورى': 42,

  'الزخرف': 43,

  'الدخان': 44,

  'الجاثية': 45,

  'الأحقاف': 46,

  'محمد': 47, 'محمّد': 47, 'القتال': 47,

  'الفتح': 48,

  'الحجرات': 49,

  'ق': 50,

  'الذاريات': 51,

  'الطور': 52,

  'النجم': 53,

  'القمر': 54,

  'الرحمن': 55, 'الرحمٰن': 55,

  'الواقعة': 56,

  'الحديد': 57,

  'المجادلة': 58, 'المجادله': 58,

  'الحشر': 59,

  'الممتحنة': 60,

  'الصف': 61, 'الصفّ': 61,

  'الجمعة': 62,

  'المنافقون': 63,

  'التغابن': 64,

  'الطلاق': 65,

  'التحريم': 66,

  'الملك': 67, 'تبارك': 67,

  'القلم': 68, 'ن': 68,

  'الحاقة': 69,

  'المعارج': 70,

  'نوح': 71,

  'الجن': 72,

  'المزمل': 73, 'المزّمل': 73,

  'المدثر': 74, 'المدّثر': 74,

  'القيامة': 75,

  'الإنسان': 76, 'الدهر': 76, 'هل أتى': 76,

  'المرسلات': 77,

  'النبأ': 78, 'النبا': 78, 'عمّ': 78, 'عم': 78,

  'النازعات': 79,

  'عبس': 80,

  'التكوير': 81,

  'الانفطار': 82,

  'المطففين': 83, 'المطفّفين': 83,

  'الانشقاق': 84,

  'البروج': 85,

  'الطارق': 86,

  'الأعلى': 87,

  'الغاشية': 88,

  'الفجر': 89,

  'البلد': 90,

  'الشمس': 91,

  'الليل': 92,

  'الضحى': 93,

  'الشرح': 94, 'الانشراح': 94, 'ألم نشرح': 94,

  'التين': 95,

  'العلق': 96, 'اقرأ': 96,

  'القدر': 97,

  'البينة': 98,

  'الزلزلة': 99, 'إذا زلزلت': 99,

  'العاديات': 100,

  'القارعة': 101,

  'التكاثر': 102, 'ألهاكم': 102,

  'العصر': 103,

  'الهمزة': 104,

  'الفيل': 105,

  'قريش': 106,

  'الماعون': 107,

  'الكوثر': 108,

  'الكافرون': 109,

  'النصر': 110,

  'المسد': 111, 'تبت': 111, 'اللهب': 111,

  'الإخلاص': 112,

  'الفلق': 113,

  'الناس': 114,
};

const TASHKEEL_RE = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;

function stripDiacritics(s: string): string {
  return s.replace(TASHKEEL_RE, '');
}

function unifyForms(s: string): string {
  return s
    .replace(/[إأٱآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه');
}

function squashSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

const SURAH_LOOKUP: Map<string, number> = (() => {
  const m = new Map<string, number>();
  for (const [name, num] of Object.entries(SURAH_CANONICAL)) {
    m.set(name, num);
    m.set(squashSpaces(name), num);
    const norm = unifyForms(stripDiacritics(squashSpaces(name)));
    m.set(norm, num);
  }
  return m;
})();

export function normalizeSurahName(raw: string): number | null {
  if (!raw) return null;
  const trimmed = squashSpaces(raw);
  if (SURAH_LOOKUP.has(trimmed)) return SURAH_LOOKUP.get(trimmed)!;

  const noPrefix = trimmed.replace(/^سورة\s+/, '');
  if (SURAH_LOOKUP.has(noPrefix)) return SURAH_LOOKUP.get(noPrefix)!;

  const normalized = unifyForms(stripDiacritics(noPrefix));
  if (SURAH_LOOKUP.has(normalized)) return SURAH_LOOKUP.get(normalized)!;

  return null;
}

export function canonicalSurahName(num: number): string | null {
  for (const [name, n] of Object.entries(SURAH_CANONICAL)) {
    if (n === num) return name;
  }
  return null;
}
