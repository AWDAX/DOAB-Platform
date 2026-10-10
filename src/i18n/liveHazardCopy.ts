/**
 * Copy for the live hazard layers. en, hi and sat keys are kept identical.
 * The sat (Ol Chiki) strings are not yet verified by a native speaker and currently fall
 * back to English; see the TODO(native-check) markers below.
 */

export type LiveLang = 'en' | 'hi' | 'sat';

export interface LiveHazardCopy {
  title: string;
  subtitle: string;
  flood: { label: string; description: string };
  drought: { label: string; description: string };
  status: { loading: string; ready: string; error: string; noContrast: string; idle: string };
  levels: { elevated: string; high: string; severe: string; none: string; unavailable: string };
  popup: {
    rain3h: string;
    rain24h: string;
    rainNext6h: string;
    rain30d: string;
    soil: string;
    ratio: string;
    unit: string;
    unavailable: string;
    notAnOfficialAlert: string;
  };
  updated: string;
  source: string;
  checked: string;
  flagged: string;
  floodCount: string;
  droughtCount: string;
  viewIndia: string;
  refresh: string;
  noFlags: string;
}

const en: LiveHazardCopy = {
  title: 'Live India conditions',
  subtitle: 'Current waterlogging and drought signals. Not official alerts.',
  flood: {
    label: 'Flood / waterlogging',
    description: 'Heavy rain in the last 24 hours. Not an official flood warning.',
  },
  drought: {
    label: 'Drought (dry spell)',
    description: 'Dry topsoil and low rain over the last 30 days. Not an official drought classification.',
  },
  status: {
    loading: 'Loading live data',
    ready: 'Updated',
    error: 'Live hazard data is unavailable right now. Try again later.',
    noContrast: 'Not enough rain variation in view to compare dryness.',
    idle: 'Turn on a layer to see live data',
  },
  levels: { elevated: 'Above normal', high: 'High', severe: 'Severe', none: 'No signal', unavailable: 'No data' },
  popup: {
    rain3h: 'Rain, last 3 h',
    rain24h: 'Rain, last 24 h',
    rainNext6h: 'Rain, next 6 h',
    rain30d: 'Rain, last 30 days',
    soil: 'Topsoil moisture',
    ratio: 'Versus visible-area median',
    unit: 'mm',
    unavailable: 'No data',
    notAnOfficialAlert: 'Model estimate. Not an official alert.',
  },
  updated: 'Updated',
  source: 'Source: Open-Meteo rainfall and topsoil moisture. About 11 km. Not a municipal sensor.',
  checked: 'Places checked',
  flagged: 'Flagged',
  floodCount: 'Waterlogging',
  droughtCount: 'Drought',
  viewIndia: 'Show India',
  refresh: 'Refresh',
  noFlags: 'No waterlogging or drought signal at these places right now.',
};

const hi: LiveHazardCopy = {
  title: 'भारत की लाइव स्थिति',
  subtitle: 'मौजूदा जलभराव और सूखे के संकेत। ये आधिकारिक चेतावनी नहीं हैं।',
  flood: {
    label: 'बाढ़ / जलभराव',
    description: 'पिछले 24 घंटों में भारी वर्षा। यह आधिकारिक बाढ़ चेतावनी नहीं है।',
  },
  drought: {
    label: 'सूखा (शुष्क अवधि)',
    description: 'सूखी ऊपरी मिट्टी और पिछले 30 दिनों में कम वर्षा। यह आधिकारिक सूखा वर्गीकरण नहीं है।',
  },
  status: {
    loading: 'लाइव डेटा लोड हो रहा है',
    ready: 'अपडेट किया गया',
    error: 'अभी लाइव जोखिम डेटा उपलब्ध नहीं है। बाद में फिर कोशिश करें।',
    noContrast: 'दिख रहे क्षेत्र में शुष्कता की तुलना के लिए पर्याप्त वर्षा अंतर नहीं है।',
    idle: 'लाइव डेटा देखने के लिए कोई परत चालू करें',
  },
  levels: { elevated: 'सामान्य से अधिक', high: 'उच्च', severe: 'गंभीर', none: 'कोई संकेत नहीं', unavailable: 'डेटा नहीं' },
  popup: {
    rain3h: 'वर्षा, पिछले 3 घंटे',
    rain24h: 'वर्षा, पिछले 24 घंटे',
    rainNext6h: 'वर्षा, अगले 6 घंटे',
    rain30d: 'वर्षा, पिछले 30 दिन',
    soil: 'ऊपरी मिट्टी की नमी',
    ratio: 'दिख रहे क्षेत्र के माध्यम की तुलना में',
    unit: 'मि.मी.',
    unavailable: 'डेटा नहीं',
    notAnOfficialAlert: 'मॉडल अनुमान। आधिकारिक चेतावनी नहीं।',
  },
  updated: 'अपडेट',
  source: 'स्रोत: Open-Meteo वर्षा और ऊपरी मिट्टी की नमी। लगभग 11 किमी। नगर निगम का सेंसर नहीं।',
  checked: 'जाँचे गए स्थान',
  flagged: 'चिह्नित',
  floodCount: 'जलभराव',
  droughtCount: 'सूखा',
  viewIndia: 'पूरा भारत दिखाएँ',
  refresh: 'फिर से लोड करें',
  noFlags: 'इन स्थानों पर अभी जलभराव या सूखे का संकेत नहीं है।',
};

// TODO(native-check): sat (Ol Chiki) strings. Currently English placeholders so the
// UI stays truthful until a native speaker supplies verified Santali wording.
const sat: LiveHazardCopy = en;

const COPY: Record<LiveLang, LiveHazardCopy> = { en, hi, sat };

export function getLiveCopy(lang: LiveLang): LiveHazardCopy {
  return COPY[lang];
}

/** Reads the app language from localStorage key `doab_lang` (defaults to English). */
export function readLiveLang(): LiveLang {
  try {
    const stored = localStorage.getItem('doab_lang');
    if (stored === 'hi' || stored === 'sat') return stored;
  } catch {
    // localStorage can be unavailable (private mode); fall back to English.
  }
  return 'en';
}
