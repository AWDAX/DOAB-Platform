// DOAB Official IMD Station Registry & Fallback Resolution
// Maps coordinates and state names directly to their closest official IMD Station ID.
// Ensures robust fallback even when connecting to remote instances without recent backend updates.

export interface RegionalStation {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
}

export const IMD_REGIONAL_STATIONS: Record<string, RegionalStation> = {
  // Karnataka
  bengaluru: { id: "43295", name: "Bengaluru-City", state: "karnataka", lat: 12.9716, lng: 77.5946 },
  bengaluru_hal: { id: "43296", name: "Bengaluru-HAL Airport", state: "karnataka", lat: 12.9566, lng: 77.6650 },
  bengaluru_kia: { id: "43293", name: "Bengaluru-International Airport", state: "karnataka", lat: 13.1986, lng: 77.7066 },
  mysuru: { id: "43307", name: "Mysuru", state: "karnataka", lat: 12.2958, lng: 76.6394 },
  mangaluru: { id: "43284", name: "Mangaluru", state: "karnataka", lat: 12.9141, lng: 74.8560 },

  // Uttar Pradesh
  lucknow: { id: "42369", name: "Lucknow-Airport", state: "uttar pradesh", lat: 26.7606, lng: 80.8893 },
  kanpur: { id: "42366", name: "Kanpur", state: "uttar pradesh", lat: 26.4499, lng: 80.3319 },
  noida: { id: "100559", name: "Noida Apmc", state: "uttar pradesh", lat: 28.5355, lng: 77.3910 },
  varanasi: { id: "42479", name: "Varanasi", state: "uttar pradesh", lat: 25.3176, lng: 82.9739 },
  agra: { id: "42260", name: "Agra", state: "uttar pradesh", lat: 27.1767, lng: 78.0081 },
  prayagraj: { id: "42475", name: "Prayagraj", state: "uttar pradesh", lat: 25.4358, lng: 81.8463 },
  ghaziabad: { id: "99927", name: "Ghaziabad", state: "uttar pradesh", lat: 28.6692, lng: 77.4538 },

  // Delhi / NCR
  delhi: { id: "42182", name: "New Delhi-Safdarjung", state: "delhi", lat: 28.5847, lng: 77.2066 },
  gurugram: { id: "42182", name: "Gurugram / NCR", state: "haryana", lat: 28.4595, lng: 77.0266 },

  // Maharashtra
  mumbai: { id: "43003", name: "Mumbai-Colaba", state: "maharashtra", lat: 18.9067, lng: 72.8147 },
  mumbai_santacruz: { id: "43057", name: "Mumbai-Santacruz", state: "maharashtra", lat: 19.0896, lng: 72.8656 },
  pune: { id: "43063", name: "Pune", state: "maharashtra", lat: 18.5204, lng: 73.8567 },

  // Telangana & Andhra Pradesh
  hyderabad: { id: "43128", name: "Hyderabad-Begumpet", state: "telangana", lat: 17.4531, lng: 78.4677 },
  visakhapatnam: { id: "43149", name: "Visakhapatnam", state: "andhra pradesh", lat: 17.6868, lng: 83.2185 },

  // Tamil Nadu & Kerala
  chennai: { id: "43279", name: "Chennai-Nungambakkam", state: "tamil nadu", lat: 13.0604, lng: 80.2496 },
  kochi: { id: "43355", name: "Kochi", state: "kerala", lat: 9.9312, lng: 76.2673 },

  // Eastern & Central
  kolkata: { id: "42809", name: "Kolkata-Alipore", state: "west bengal", lat: 22.5333, lng: 88.3333 },
  patna: { id: "42492", name: "Patna", state: "bihar", lat: 25.5941, lng: 85.1376 },
  ranchi: { id: "42701", name: "Ranchi", state: "jharkhand", lat: 23.3441, lng: 85.3096 },
  jaipur: { id: "42348", name: "Jaipur", state: "rajasthan", lat: 26.9124, lng: 75.7873 },
  ahmedabad: { id: "42647", name: "Ahmedabad", state: "gujarat", lat: 23.0225, lng: 72.5714 },
  bhopal: { id: "42667", name: "Bhopal", state: "madhya pradesh", lat: 23.2599, lng: 77.4126 },
  chandigarh: { id: "42111", name: "Chandigarh", state: "punjab", lat: 30.7333, lng: 76.7794 },
};

export const STATE_TO_DEFAULT_STATION_ID: Record<string, string> = {
  "uttar pradesh": "42369", // Lucknow-Airport
  "uttar_pradesh": "42369",
  "up": "42369",
  "delhi": "42182",         // New Delhi-Safdarjung
  "karnataka": "43295",     // Bengaluru-City
  "maharashtra": "43057",   // Mumbai-Santacruz
  "haryana": "42182",
  "tamil nadu": "43279",
  "tamil_nadu": "43279",
  "telangana": "43128",
  "west bengal": "42809",
  "west_bengal": "42809",
  "gujarat": "42647",
  "rajasthan": "42348",
  "kerala": "43355",
  "bihar": "42492",
  "jharkhand": "42701",
  "madhya pradesh": "42667",
  "madhya_pradesh": "42667",
  "punjab": "42111",
  "andhra pradesh": "43149",
  "andhra_pradesh": "43149",
};

/**
 * Resolve the most accurate official IMD Station ID for any given coordinates or state string.
 * This guarantees the frontend requests the correct station even if the deployed backend lacks query parameters.
 */
export function resolveImdStationId(
  state?: string | null,
  coords?: { lat: number; lng: number } | null
): string {
  // 1. If explicit state is given
  if (state && state.trim().toLowerCase() !== 'all') {
    const clean = state.trim().toLowerCase();
    // Direct state lookup
    if (STATE_TO_DEFAULT_STATION_ID[clean]) {
      // If coordinates are also provided, check if a nearer station within that state exists
      if (coords && (Math.abs(coords.lat) > 0.1 || Math.abs(coords.lng) > 0.1)) {
        const stateStations = Object.values(IMD_REGIONAL_STATIONS).filter(
          s => s.state.toLowerCase() === clean || s.state.replace(' ', '_').toLowerCase() === clean
        );
        if (stateStations.length > 0) {
          let best = stateStations[0];
          let minDist = Infinity;
          for (const s of stateStations) {
            const d = Math.hypot(coords.lat - s.lat, coords.lng - s.lng);
            if (d < minDist) {
              minDist = d;
              best = s;
            }
          }
          if (minDist <= 3.5) {
            return best.id;
          }
        }
      }
      return STATE_TO_DEFAULT_STATION_ID[clean];
    }
  }

  // 2. If coordinates are available, find the closest regional station
  if (coords && (Math.abs(coords.lat) > 0.1 || Math.abs(coords.lng) > 0.1)) {
    let bestId = "42182"; // Default New Delhi
    let minDist = Infinity;
    for (const s of Object.values(IMD_REGIONAL_STATIONS)) {
      const d = Math.hypot(coords.lat - s.lat, coords.lng - s.lng);
      if (d < minDist) {
        minDist = d;
        bestId = s.id;
      }
    }
    return bestId;
  }

  // 3. Fallback: New Delhi Safdarjung
  return "42182";
}
