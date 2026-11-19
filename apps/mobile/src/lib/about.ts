// "About the complex" page content, in English and Arabic.
// Only facts the owner gave (2026-11-18). Class times are not listed here (owner, 2026-11-19): families see
// them when registering. To add more later, edit this file only.

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
      lines: ["Kids' classes and men's swimming", 'Open pool membership for men and women'],
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
        title: 'Open pool',
        lines: ['10:30 AM to 3 PM and 7:30 to 9 PM, Saturday to Thursday', 'Adults, men and women · {pool} KD for 4 weeks'],
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
      lines: ['حصص الأطفال وسباحة الرجال', 'عضوية المسبح المفتوح للرجال والنساء'],
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
        title: 'المسبح المفتوح',
        lines: ['من ١٠:٣٠ صباحاً إلى ٣ عصراً ومن ٧:٣٠ إلى ٩ مساءً، من السبت إلى الخميس', 'للكبار، رجال ونساء · {pool} د.ك لمدة ٤ أسابيع'],
        note: 'قد يُلغى أحياناً؛ يُبلَّغ الأعضاء في التطبيق ويحصلون على يوم إضافي.',
      },
    ],
    location: 'المنصورية، الكويت',
  },
};
