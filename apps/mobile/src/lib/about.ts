// "About the complex" page content, in English and Arabic.
// Only facts the owner gave (2026-11-18). To add more later, edit this file only.

export const MAPS_URL = 'https://maps.app.goo.gl/N2awgJRRfiVL3mWy6';

type Section = { title: string; lines: string[]; note?: string };
type Sport = { name: string; place: string; lines: string[] };
export type AboutContent = {
  name: string;
  tagline: string;
  swimming: Sport;
  jiujitsu: Sport;
  sections: Section[];
  location: string;
};

export const ABOUT: Record<'en' | 'ar', AboutContent> = {
  en: {
    name: 'LOSE | GAIN Complex',
    tagline: 'A family sports center for swimming and jiu-jitsu',
    swimming: {
      name: 'Swimming',
      place: "Kids' pool and Olympic pool",
      lines: ["Kids' classes at 4 PM and 5 PM", "Men's swimming: 4 PM, Sun, Tue, Thu", 'Open pool membership for men and women'],
    },
    jiujitsu: {
      name: 'Jiu-jitsu',
      place: 'Two mats, with a viewing area for parents',
      lines: ['Kids, Titans, men and women', 'Gi and No-Gi'],
    },
    sections: [
      {
        title: 'Opening hours',
        lines: ['Saturday to Thursday, 10:30 AM to 9 PM'],
        note: 'Friday closed',
      },
      {
        title: 'Jiu-jitsu classes',
        lines: [
          'Warriors 1 (ages 5–7): 4 PM Sat, Mon, Wed · 5 PM Sun, Tue, Thu',
          'Warriors 2 (ages 8–10): 4 PM Sun, Tue, Thu · 5 PM Sat, Mon, Wed',
          'Titans (11–15) and adults: 6–7:30 PM, Sunday to Thursday',
          'Women: 7:30–8:30 PM, Sun, Tue, Thu',
          'Saturday open mat: 6 PM, free',
        ],
        note: 'Gi Thursday to Monday · No-Gi Tuesday and Wednesday. Women are also welcome in the 6 PM adult class.',
      },
      {
        title: 'Open pool',
        lines: ['10:30 AM to 3 PM and 7:30 to 9 PM, Saturday to Thursday', 'Adults, men and women · 40 KD for 4 weeks'],
        note: 'Sometimes cancelled; members are told in the app and get an extra day.',
      },
    ],
    location: 'Mansouriya, Kuwait',
  },
  ar: {
    name: 'LOSE | GAIN Complex',
    tagline: 'مركز رياضي عائلي للسباحة والجوجيتسو',
    swimming: {
      name: 'السباحة',
      place: 'مسبح الأطفال والمسبح الأولمبي',
      lines: ['حصص الأطفال الساعة ٤ و٥ مساءً', 'سباحة الرجال: ٤ مساءً، الأحد والثلاثاء والخميس', 'عضوية المسبح المفتوح للرجال والنساء'],
    },
    jiujitsu: {
      name: 'الجوجيتسو',
      place: 'صالتان مع منطقة مشاهدة لأولياء الأمور',
      lines: ['أطفال، تايتنز، رجال ونساء', 'جي ونو-جي'],
    },
    sections: [
      {
        title: 'أوقات الدوام',
        lines: ['من السبت إلى الخميس، من ١٠:٣٠ صباحاً إلى ٩ مساءً'],
        note: 'الجمعة مغلق',
      },
      {
        title: 'حصص الجوجيتسو',
        lines: [
          'المحاربون ١ (٥–٧ سنوات): ٤ مساءً السبت والاثنين والأربعاء · ٥ مساءً الأحد والثلاثاء والخميس',
          'المحاربون ٢ (٨–١٠ سنوات): ٤ مساءً الأحد والثلاثاء والخميس · ٥ مساءً السبت والاثنين والأربعاء',
          'تايتنز (١١–١٥) والكبار: ٦–٧:٣٠ مساءً، من الأحد إلى الخميس',
          'النساء: ٧:٣٠–٨:٣٠ مساءً، الأحد والثلاثاء والخميس',
          'البساط المفتوح يوم السبت: ٦ مساءً، مجاناً',
        ],
        note: 'جي من الخميس إلى الاثنين · نو-جي الثلاثاء والأربعاء. يمكن للنساء أيضاً حضور حصة الكبار الساعة ٦.',
      },
      {
        title: 'المسبح المفتوح',
        lines: ['من ١٠:٣٠ صباحاً إلى ٣ عصراً ومن ٧:٣٠ إلى ٩ مساءً، من السبت إلى الخميس', 'للكبار، رجال ونساء · ٤٠ د.ك لمدة ٤ أسابيع'],
        note: 'قد يُلغى أحياناً؛ يُبلَّغ الأعضاء في التطبيق ويحصلون على يوم إضافي.',
      },
    ],
    location: 'المنصورية، الكويت',
  },
};
