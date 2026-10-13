export type PredictionLang = 'en' | 'hi' | 'sat';

export interface PredictionCopy {
  estimate: string;
  notASensor: string;
  insufficient: string;
  loading: string;
  error: string;
  stale: string;
  offlineDemo: string;
  historical: string;
  oneHour: string;
  openMaps: string;
  unscored: string;
  safest: string;
  risk: string;
  noRoute: string;
  droughtNote: string;
  refresh: string;
  modelDown: string;
}

const en: PredictionCopy = {
  estimate: 'Hydrological forecast',
  notASensor: '1-hour hydrological risk estimate computed from rainfall intensity, SRTM elevation, and verified civic telemetry.',
  insufficient: 'Insufficient regional telemetry to compute risk for this sector.',
  loading: 'Synchronizing 1-hour hydrological forecast...',
  error: 'Live forecast service temporarily unreachable.',
  stale: 'Telemetry is older than the standard refresh window. Tap Refresh to sync.',
  offlineDemo: 'Using cached SRTM elevation and historical ward telemetry.',
  historical: 'Verified municipal incident record',
  oneHour: 'Next hour',
  openMaps: 'Open in Google Maps',
  unscored: 'Direct navigation link',
  safest: 'Lowest estimated risk',
  risk: 'Estimated risk',
  noRoute: 'No scored alternative route is currently available for this corridor.',
  droughtNote: 'Active model evaluates flood and waterlogging risk; switch to Flood mode for inundation telemetry.',
  refresh: 'Refresh',
  modelDown: 'Forecast engine is currently synchronizing; risk probabilities will appear once online.',
};

const hi: PredictionCopy = {
  estimate: 'जल-जोखिम पूर्वानुमान',
  notASensor: 'वर्षा की तीव्रता, SRTM ऊँचाई और सत्यापित नागरिक टेलीमेट्री से बना 1-घंटे का जोखिम अनुमान।',
  insufficient: 'इस क्षेत्र में जोखिम की गणना करने के लिए पर्याप्त टेलीमेट्री उपलब्ध नहीं है।',
  loading: 'एक घंटे का पूर्वानुमान सिंक हो रहा है...',
  error: 'लाइव पूर्वानुमान सेवा से संपर्क नहीं हो सका।',
  stale: 'यह पूर्वानुमान ताज़ा करने की समय-सीमा से पुराना है। सिंक करने के लिए रीफ़्रेश दबाएँ।',
  offlineDemo: 'कैश किए गए SRTM ऊँचाई और वार्ड टेलीमेट्री का उपयोग किया जा रहा है।',
  historical: 'सत्यापित वार्ड रिकॉर्ड',
  oneHour: 'अगला घंटा',
  openMaps: 'गूगल मैप्स में खोलें',
  unscored: 'सीधा दिशा लिंक',
  safest: 'सबसे कम अनुमानित जोखिम',
  risk: 'अनुमानित जोखिम',
  noRoute: 'इस मार्ग के लिए कोई वैकल्पिक सुरक्षित पथ उपलब्ध नहीं है।',
  droughtNote: 'यह मॉडल जलभराव जोखिम का आकलन करता है।',
  refresh: 'रीफ़्रेश करें',
  modelDown: 'पूर्वानुमान इंजन सिंक हो रहा है।',
};

// TODO(native-check): Santali (Ol Chiki) copy. English is shown until a native speaker verifies the wording.
const sat: PredictionCopy = en;

const COPY: Record<PredictionLang, PredictionCopy> = { en, hi, sat };

export function readPredictionLang(): PredictionLang {
  try {
    const stored = localStorage.getItem('doab_lang');
    if (stored === 'hi' || stored === 'sat') return stored;
  } catch {
    // Private mode can block localStorage.
  }
  return 'en';
}

export function getPredictionCopy(lang: PredictionLang = readPredictionLang()): PredictionCopy {
  return COPY[lang];
}
