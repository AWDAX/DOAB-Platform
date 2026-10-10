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
  estimate: 'Model estimate',
  notASensor: 'This is a model estimate from rainfall, elevation and past complaints. It is not a municipal sensor reading and not an official warning.',
  insufficient: 'Not enough labelled data to estimate risk here.',
  loading: 'Loading the one-hour estimate',
  error: 'The estimate service did not respond.',
  stale: 'This estimate is older than the refresh window.',
  offlineDemo: 'Offline demo. Showing historical Bengaluru complaints, not a live feed.',
  historical: 'Historical complaint',
  oneHour: 'Next hour',
  openMaps: 'Open in Google Maps',
  unscored: 'Unscored directions link',
  safest: 'Lowest estimated risk',
  risk: 'Estimated risk',
  noRoute: 'No scored alternative is available.',
  droughtNote: 'This model estimates waterlogging only. It does not predict tanker demand.',
  refresh: 'Refresh estimate',
  modelDown: 'The model file is not loaded, so no risk number is shown.',
};

const hi: PredictionCopy = {
  estimate: 'मॉडल का अनुमान',
  notASensor: 'यह वर्षा, ऊँचाई और पुरानी शिकायतों से बना अनुमान है। यह नगर निगम का सेंसर माप नहीं है और आधिकारिक चेतावनी नहीं है।',
  insufficient: 'यहाँ जोखिम बताने के लिए पर्याप्त चिह्नित आँकड़े नहीं हैं।',
  loading: 'एक घंटे आगे का अनुमान लोड हो रहा है',
  error: 'अनुमान सेवा से जवाब नहीं मिला।',
  stale: 'यह अनुमान ताज़ा करने की समय-सीमा से पुराना है।',
  offlineDemo: 'ऑफ़लाइन डेमो। बेंगलुरु की पुरानी शिकायतें दिख रही हैं, लाइव फ़ीड नहीं।',
  historical: 'पुरानी शिकायत',
  oneHour: 'अगला घंटा',
  openMaps: 'गूगल मैप्स में खोलें',
  unscored: 'बिना जोखिम-जाँच वाला दिशा लिंक',
  safest: 'सबसे कम अनुमानित जोखिम',
  risk: 'अनुमानित जोखिम',
  noRoute: 'कोई जाँचा हुआ विकल्प उपलब्ध नहीं है।',
  droughtNote: 'यह मॉडल केवल जलभराव का अनुमान लगाता है। टैंकर की माँग का अनुमान नहीं।',
  refresh: 'अनुमान फिर से लोड करें',
  modelDown: 'मॉडल फ़ाइल लोड नहीं है, इसलिए जोखिम का आँकड़ा नहीं दिखाया गया।',
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
