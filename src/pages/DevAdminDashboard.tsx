import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Radio, 
  MapPin, 
  Bell, 
  Send, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  LogOut, 
  Users, 
  Activity, 
  Terminal, 
  Play,
  Sliders,
  Flame,
  Droplets,
  Layers,
  ShieldAlert,
  CloudRain,
  Sun,
  Waves,
  RotateCcw,
  MessageSquare,
  Download
} from 'lucide-react';
import { 
  getCurrentAdminSession, 
  verifyAdminCredentials, 
  adminSignOut, 
  getAuthorizedAdmins, 
  addAuthorizedAdmin, 
  removeAuthorizedAdmin,
  type AdminUser 
} from '../lib/adminAuth';
import { playClick } from '../utils/soundFx';
import { NativeService } from '../utils/nativeService';
import { RemoteAdminChannel } from '../services/remoteAdminChannel';

export interface DisasterScenario {
  id: string;
  name: string;
  category: 'cloudburst' | 'dam_overflow' | 'sump_waterlogging' | 'drought_deficit' | 'heatwave' | 'water_contamination';
  envMode: 'flood' | 'drought';
  severity: 'Critical' | 'High' | 'Medium';
  location: string;
  conditions: {
    rainfallRate?: string;
    inundationDepth?: string;
    dischargeRate?: string;
    reservoirLevel?: string;
    waterDeficit?: string;
    groundwaterDrop?: string;
    ambientTemp?: string;
    turbidity?: string;
  };
  triggerThreshold: string;
  impactAdvisory: string;
  payload: {
    title: string;
    ward: string;
    severity: 'Critical' | 'High' | 'Medium';
    waterDepthCm: number;
    rainfallMmH: number;
    probability: number;
    confidence: string;
    description: string;
    lat: number;
    lng: number;
  };
}

export const DISASTER_SCENARIOS: DisasterScenario[] = [
  {
    id: 'scen-cloudburst',
    name: 'Flash Flood & Cloudburst Inundation',
    category: 'cloudburst',
    envMode: 'flood',
    severity: 'Critical',
    location: 'Koramangala 80ft Road & Sony World Junction (Ward 14)',
    conditions: {
      rainfallRate: '82.4 mm/h (> 65mm/h Threshold)',
      inundationDepth: '95 cm (> 60cm Extreme)',
      dischargeRate: 'Local Storm Runoff Saturated (4.2 m/s)'
    },
    triggerThreshold: 'Rainfall > 60mm/h AND Sump Depth > 45cm → Critical Life-Safety Alarm',
    impactAdvisory: 'Immediate bypass engaged. 80ft Road completely submerged. Low-clearance transit halted.',
    payload: {
      title: '🚨 CRITICAL FLASH FLOOD: 80ft Road Inundation',
      ward: 'Ward 14 (Koramangala)',
      severity: 'Critical',
      waterDepthCm: 95,
      rainfallMmH: 82,
      probability: 0.98,
      confidence: 'Multi-Sensor DEM Inundation Rule Triggered',
      description: 'Severe flash flood surge reported. Water depth exceeds 90cm. Immediate high-ground bypass active.',
      lat: 12.9352,
      lng: 77.6245
    }
  },
  {
    id: 'scen-dam-overflow',
    name: 'Dam Reservoir Overflow & Riverine Surge',
    category: 'dam_overflow',
    envMode: 'flood',
    severity: 'Critical',
    location: 'Cauvery Basin / Low-Lying Riverine Corridor',
    conditions: {
      reservoirLevel: '104.2% Full Reservoir Level (FRL)',
      dischargeRate: '48,500 Cusecs Crest Gate Discharge',
      inundationDepth: 'River Stage +1.85m Above Danger Level'
    },
    triggerThreshold: 'Reservoir Level > 100% FRL AND Discharge > 35,000 cusecs → Riverine Evacuation',
    impactAdvisory: 'Spillway release active. Riparian settlements alerted. Emergency high-elevation corridors deployed.',
    payload: {
      title: '🌊 RESERVOIR CREST DISCHARGE WARNING: +1.85m Surge',
      ward: 'Cauvery Riverine Lowlands (Zone 4)',
      severity: 'Critical',
      waterDepthCm: 120,
      rainfallMmH: 64,
      probability: 0.95,
      confidence: 'Hydrological River Gauge & Reservoir Model',
      description: 'Crest gates opened due to excess inflow. Downstream low-lying zones instructed to evacuate to relief camps.',
      lat: 12.4215,
      lng: 76.5724
    }
  },
  {
    id: 'scen-underpass',
    name: 'Sub-Level Urban Underpass Sump Submersion',
    category: 'sump_waterlogging',
    envMode: 'flood',
    severity: 'High',
    location: 'Domlur / Inner Ring Road Sump Passage',
    conditions: {
      inundationDepth: '68 cm Sump Waterlogging',
      rainfallRate: '44.0 mm/h Moderate Intensity',
      dischargeRate: 'Sub-surface Sump Pump Tripped'
    },
    triggerThreshold: 'Underpass Inundation > 40cm OR Pump Failure → Traffic Interlock Engagement',
    impactAdvisory: 'Automatic barrier deployment advised. Two-wheelers and sedans redirected via elevated flyover.',
    payload: {
      title: '⚠️ URBAN SUMP HAZARD: Domlur Underpass Submerged',
      ward: 'Domlur (Ward 72)',
      severity: 'High',
      waterDepthCm: 68,
      rainfallMmH: 44,
      probability: 0.88,
      confidence: 'Copernicus 201m DEM Baseline + Telemetry',
      description: 'Underpass sump flooded to 68cm depth. Overhead flyover bypass active for all traffic.',
      lat: 12.9610,
      lng: 77.6387
    }
  },
  {
    id: 'scen-drought-tanker',
    name: 'Acute Drought & Water Tanker Logistics Deficit',
    category: 'drought_deficit',
    envMode: 'drought',
    severity: 'Critical',
    location: 'Varthur & Whitefield Peripheral Borewell Belt',
    conditions: {
      waterDeficit: '86% Ward Demand-Supply Logistics Deficit',
      groundwaterDrop: '-5.2m Below Seasonal Historical Baseline',
      dischargeRate: 'Municipal Tanker Dispatch ETA: +6.5 Hours Delay'
    },
    triggerThreshold: 'Borewell Yield < 15% AND Deficit > 75% → Logistics Emergency Reroute',
    impactAdvisory: 'Emergency water distribution protocol initiated. Fleet priority assigned to community health clinics.',
    payload: {
      title: '🚰 ACUTE WATER LOGISTICS DEFICIT: 86% Depletion',
      ward: 'Ward 85 (Varthur Sub-basin)',
      severity: 'Critical',
      waterDepthCm: 0,
      rainfallMmH: 0,
      probability: 0.94,
      confidence: 'Central Ground Water Board (CGWB) & Civic Telemetry',
      description: 'Severe water deficit detected. Tanker corridor prioritized. Civic ration hubs active.',
      lat: 12.9392,
      lng: 77.7460
    }
  },
  {
    id: 'scen-heatwave',
    name: 'Extreme Heatwave & Wet-Bulb Stress Advisory',
    category: 'heatwave',
    envMode: 'drought',
    severity: 'High',
    location: 'Central Transit Hub & Industrial Corridor',
    conditions: {
      ambientTemp: '44.8°C Peak Surface Temp (> 42°C Threshold)',
      dischargeRate: 'Wet-Bulb Temperature: 32.4°C (Danger Mark)',
      waterDeficit: 'Thermal Radiation Heat Index: 51.0°C'
    },
    triggerThreshold: 'Ambient > 42°C AND Wet-Bulb > 31°C → Red Advisory for Delivery Fleets & Outdoor Crews',
    impactAdvisory: 'Mandatory hydration halts for Swiggy/Zomato fleets. Shaded hydration stations activated.',
    payload: {
      title: '☀️ SEVERE THERMAL HEAT STRESS: 44.8°C Wet-Bulb Alert',
      ward: 'Central Commercial Corridor',
      severity: 'High',
      waterDepthCm: 0,
      rainfallMmH: 0,
      probability: 0.91,
      confidence: 'IMD AWS Station Thermistor & Satellite LST',
      description: 'Dangerous heatwave threshold breached. Delivery partners advised to utilize DOAB cool corridors.',
      lat: 12.9716,
      lng: 77.5946
    }
  },
  {
    id: 'scen-contamination',
    name: 'Potable Water Infiltration & Contamination Notice',
    category: 'water_contamination',
    envMode: 'flood',
    severity: 'High',
    location: 'Indiranagar 100ft Road Feeder Trunk',
    conditions: {
      turbidity: '18.4 NTU (Permissible Standard < 5.0 NTU)',
      dischargeRate: 'Stormwater Runoff Cross-Seepage Detected',
      inundationDepth: 'Pipeline Trench Waterlogging: 42cm'
    },
    triggerThreshold: 'Turbidity > 10 NTU OR Cross-Pipeline Pressure Inversion → Boil Water Notice',
    impactAdvisory: 'Precautionary municipal boil-water advisory. Automated chlorination booster dosing initiated.',
    payload: {
      title: '☣️ CIVIC POTABLE WATER QUALITY ADVISORY: Boil Water',
      ward: 'Indiranagar (Ward 80)',
      severity: 'High',
      waterDepthCm: 42,
      rainfallMmH: 35,
      probability: 0.86,
      confidence: 'Water Treatment Pipeline SCADA Telemetry',
      description: 'Elevated turbidity and stormwater infiltration detected. Citizens advised to boil water prior to consumption.',
      lat: 12.9784,
      lng: 77.6408
    }
  }
];

export default function DevAdminDashboard() {
  const [session, setSession] = useState<AdminUser | null>(() => getCurrentAdminSession());
  
  // Login Form State
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active Admin Tabs
  const [activeTab, setActiveTab] = useState<'scenarios' | 'triggers' | 'feedbacks' | 'admins'>('scenarios');

  // Rider Arrival Feedback Telemetry State
  interface RiderFeedbackRecord {
    timestamp: number;
    routeSummary: string;
    predictedRisk?: string;
    userRating: 'accurate' | 'moderate' | 'inaccurate';
    notes?: string;
  }
  const [riderFeedbacks, setRiderFeedbacks] = useState<RiderFeedbackRecord[]>([]);

  const loadFeedbacks = () => {
    try {
      const raw = localStorage.getItem('doab_route_accuracy_feedback');
      if (raw) {
        setRiderFeedbacks(JSON.parse(raw));
      } else {
        setRiderFeedbacks([
          {
            timestamp: Date.now() - 1800000,
            routeSummary: 'MG Road to IT Corridor via Elevated Bypass',
            predictedRisk: 'Low Risk / Passable (9.2%)',
            userRating: 'accurate',
            notes: 'Elevated roadway was completely clear. Underpass was properly barricaded by municipal police as predicted.'
          },
          {
            timestamp: Date.now() - 7200000,
            routeSummary: 'Indira Market to City Hospital Safe Corridor',
            predictedRisk: 'Moderate Risk (38.5%)',
            userRating: 'moderate',
            notes: 'Water depth was approximately 15cm near culvert junction. Traversed safely in high-clearance EV.'
          }
        ]);
      }
    } catch {
      setRiderFeedbacks([]);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const clearFeedbacks = () => {
    playClick();
    localStorage.removeItem('doab_route_accuracy_feedback');
    setRiderFeedbacks([]);
    showToast('Rider ground-truth feedback log cleared.');
  };

  const exportFeedbackCsv = () => {
    playClick();
    const rows = [
      ['Timestamp', 'Route Summary', 'Predicted Risk', 'User Rating', 'Notes'],
      ...riderFeedbacks.map(f => [
        new Date(f.timestamp).toISOString(),
        `"${(f.routeSummary || '').replace(/"/g, '""')}"`,
        `"${(f.predictedRisk || '').replace(/"/g, '""')}"`,
        f.userRating,
        `"${(f.notes || '').replace(/"/g, '""')}"`
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `doab_rider_feedbacks_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported rider feedback CSV successfully.');
  };

  // Trigger Action States
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Active Simulated Broadcast State (tracks live hazard sent to field devices)
  const [activeBroadcast, setActiveBroadcast] = useState<{
    active?: boolean;
    scenarioId?: string;
    isSimCustom?: boolean;
    title?: string;
    ward?: string;
    waterDepthCm?: number;
    severity?: string;
  } | null>(null);

  useEffect(() => {
    const handleStatus = (e: any) => {
      if (e?.detail?.active) {
        setActiveBroadcast(e.detail.payload || { title: 'Emergency Simulation Active' });
      } else {
        setActiveBroadcast(null);
      }
    };
    window.addEventListener('doab:admin-broadcast-status', handleStatus as EventListener);
    return () => window.removeEventListener('doab:admin-broadcast-status', handleStatus as EventListener);
  }, []);

  const handleStandDown = () => {
    playClick();
    RemoteAdminChannel.broadcast('clear_alarm', { reason: 'Admin stood down simulation' });
    setActiveBroadcast(null);
    showToast('All-Clear broadcasted: Silenced siren & stood down alert across all remote devices.', 'info');
  };

  const handleResetBaseline = () => {
    playClick();
    setSimRainfall(14);
    setSimWaterDepth(8);
    setSimTemp(28);
    setSimGroundwaterDeficit(0.4);
    if (activeBroadcast) {
      handleStandDown();
    } else {
      showToast('Reset conditions to baseline normal synoptic parameters.');
    }
  };

  // Interactive Rule Engine Threshold Simulator State
  const [simRainfall, setSimRainfall] = useState(48);
  const [simWaterDepth, setSimWaterDepth] = useState(38);
  const [simTemp, setSimTemp] = useState(33);
  const [simGroundwaterDeficit, setSimGroundwaterDeficit] = useState(2.2);

  // Custom Alert Injection Form State
  const [alertTitle, setAlertTitle] = useState('Critical Inundation: 80ft Road Corridor');
  const [alertWard, setAlertWard] = useState('Ward 14 (Koramangala)');
  const [alertSeverity, setAlertSeverity] = useState<'Critical' | 'High' | 'Medium'>('Critical');
  const [alertDepth, setAlertDepth] = useState(65);

  // Custom Danger Broadcast Form State
  const [sosTitle, setSosTitle] = useState('Severe Flash Flood Surge');
  const [sosWard, setSosWard] = useState('MG Road Underpass');
  const [sosDesc, setSosDesc] = useState('Water level rapidly rising. Immediate bypass engaged. All low clearance vehicles halted.');

  // Admin Delegation State
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminMgmtMsg, setAdminMgmtMsg] = useState('');

  useEffect(() => {
    if (session) {
      setAdminsList(getAuthorizedAdmins());
    }
  }, [session]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    setLoginError('');

    const res = verifyAdminCredentials(usernameInput, passwordInput);
    if (res.success && res.user) {
      setSession(res.user);
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setLoginError(res.error || 'Authentication failed.');
    }
  };

  const handleLogout = () => {
    playClick();
    adminSignOut();
    setSession(null);
  };

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // 2. Trigger Destination Reached Feedback Panel (Local + Remote Mobile Devices)
  const triggerDestinationArrival = () => {
    playClick();
    const payload = {
      summary: 'Koramangala 80ft Road → Domlur Safe Haven Corridor',
      distance_meters: 4200,
      duration_seconds: 720,
      mean_risk: 0.08,
      maps_url: 'https://maps.google.com'
    };

    RemoteAdminChannel.broadcast('destination_arrival', payload);
    showToast('Toggled Destination Arrival & AI Accuracy Feedback Panel across app & remote devices.');
  };

  // 3. Inject Municipal Test Alert into All Alerts Page (Local + Remote Mobile Devices)
  const injectMunicipalAlert = () => {
    playClick();
    try {
      const newAlert = {
        lat: 12.9352,
        lng: 77.6245,
        title: alertTitle,
        ward: alertWard,
        severity: alertSeverity,
        waterDepthCm: Number(alertDepth),
        rainfallMmH: 42,
        probability: alertSeverity === 'Critical' ? 0.92 : alertSeverity === 'High' ? 0.74 : 0.45,
        confidence: 'Live Admin Dispatched Event',
        updatedTime: 'Just now (Admin Live Broadcast)',
        isMockup: false,
      };

      RemoteAdminChannel.broadcast('custom_alert', newAlert);
      showToast(`Injected alert "${alertTitle}" into Notification Stream on all devices.`);
    } catch (e) {
      showToast('Failed to save simulated alert.', 'error');
    }
  };

  // Clear injected alerts
  const clearAdminAlerts = () => {
    playClick();
    localStorage.removeItem('doab_admin_custom_alerts');
    window.dispatchEvent(new CustomEvent('doab:admin-alerts-updated'));
    showToast('Cleared all custom admin alerts.');
  };

  // 1. Broadcast Pre-calibrated Disaster Scenario (Toggle ON/OFF)
  const handleBroadcastScenario = (scen: DisasterScenario) => {
    playClick();

    // Toggle OFF if this scenario is already active
    if (activeBroadcast && activeBroadcast.scenarioId === scen.id) {
      handleStandDown();
      return;
    }

    const payload = {
      ...scen.payload,
      scenarioId: scen.id
    };

    setActiveBroadcast(payload);

    // Broadcast through RemoteAdminChannel to all connected field devices & native APK
    RemoteAdminChannel.broadcast('custom_alert', payload);

    if (scen.severity === 'Critical') {
      RemoteAdminChannel.broadcast('sos_danger', {
        title: scen.payload.title,
        ward: scen.payload.ward,
        waterDepthCm: scen.payload.waterDepthCm,
        description: scen.payload.description,
        distanceAhead: '150 meters',
        isCritical: true,
        scenarioId: scen.id,
      });
    }

    showToast(`Dispatched test case: [${scen.name}] to all remote devices (Admin console unaffected).`);
  };

  // 2. Compute dynamic severity from threshold simulator
  const computeSimulatedSeverity = (): { severity: 'Critical' | 'High' | 'Medium' | 'Low'; reason: string } => {
    if (simWaterDepth >= 60 || simRainfall >= 70 || simTemp >= 44) {
      return {
        severity: 'Critical',
        reason: simWaterDepth >= 60 
          ? `Inundation depth (${simWaterDepth}cm) exceeds critical threshold (60cm)`
          : simRainfall >= 70 
            ? `Rainfall intensity (${simRainfall}mm/h) exceeds cloudburst threshold (70mm/h)`
            : `Ambient temperature (${simTemp}°C) exceeds extreme thermal limit (44°C)`
      };
    }
    if (simWaterDepth >= 35 || simRainfall >= 40 || simGroundwaterDeficit >= 4.0 || simTemp >= 40) {
      return {
        severity: 'High',
        reason: simWaterDepth >= 35
          ? `Inundation depth (${simWaterDepth}cm) triggers low-clearance vehicle hazard`
          : simRainfall >= 40
            ? `Heavy precipitation (${simRainfall}mm/h) risks rapid urban pooling`
            : simGroundwaterDeficit >= 4.0
              ? `Groundwater table depletion (-${simGroundwaterDeficit}m) triggers tanker supply deficit`
              : `High heat index (${simTemp}°C) triggers outdoor worker advisory`
      };
    }
    if (simWaterDepth >= 15 || simRainfall >= 20 || simGroundwaterDeficit >= 2.0) {
      return {
        severity: 'Medium',
        reason: 'Localized water pooling or moderate drought stress'
      };
    }
    return {
      severity: 'Low',
      reason: 'Normal baseline conditions; no alert threshold breached'
    };
  };

  const simResult = computeSimulatedSeverity();

  // 3. Broadcast custom simulated threshold condition (Toggle ON/OFF)
  const handleBroadcastSimulatedThreshold = () => {
    playClick();

    // Toggle OFF if simulator is already actively broadcasting
    if (activeBroadcast && activeBroadcast.isSimCustom) {
      handleStandDown();
      return;
    }

    const payload = {
      lat: 12.9352,
      lng: 77.6245,
      title: `[SIMULATED ${simResult.severity.toUpperCase()} ALERT] Custom Condition Trigger`,
      ward: 'Active Monitored Zone (Ward 14)',
      severity: simResult.severity,
      waterDepthCm: simWaterDepth,
      rainfallMmH: simRainfall,
      probability: simResult.severity === 'Critical' ? 0.96 : simResult.severity === 'High' ? 0.78 : simResult.severity === 'Medium' ? 0.45 : 0.08,
      confidence: 'Live Rule-Engine Simulation Trigger',
      updatedTime: 'Just now (Rule Engine Trigger)',
      description: `Threshold rule triggered: ${simResult.reason}. Conditions: Rain ${simRainfall}mm/h, Inundation ${simWaterDepth}cm, Temp ${simTemp}°C.`,
      isMockup: false,
      isSimCustom: true,
    };

    setActiveBroadcast(payload);
    RemoteAdminChannel.broadcast('custom_alert', payload);
    if (simResult.severity === 'Critical') {
      RemoteAdminChannel.broadcast('sos_danger', {
        title: payload.title,
        ward: payload.ward,
        waterDepthCm: payload.waterDepthCm,
        description: payload.description,
        distanceAhead: '200 meters',
        isCritical: true,
        isSimCustom: true,
      });
    }

    showToast(`Broadcasted ${simResult.severity} threshold breach to all connected devices.`);
  };

  // 4. Register New Sub-Admin
  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    setAdminMgmtMsg('');

    if (!session) return;
    const res = addAuthorizedAdmin(newAdminEmail, newAdminUsername, newAdminPassword, session.username);
    if (res.success) {
      setAdminsList(getAuthorizedAdmins());
      setNewAdminEmail('');
      setNewAdminUsername('');
      setNewAdminPassword('');
      setAdminMgmtMsg('Admin added successfully.');
    } else {
      setAdminMgmtMsg(res.error || 'Failed to add admin.');
    }
  };

  const handleRemoveAdmin = (username: string) => {
    playClick();
    const res = removeAuthorizedAdmin(username);
    if (res.success) {
      setAdminsList(getAuthorizedAdmins());
      showToast(`Admin ${username} removed.`);
    } else {
      showToast(res.error || 'Failed to remove admin.', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. UNPROTECTED / LOGIN SCREEN (DOAB Monochromatic Strict Obsidian & Porcelain)
  // ─────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-white dark:bg-[#080808] text-neutral-900 dark:text-neutral-100 font-sans selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 mx-auto flex items-center justify-center shadow-md">
              <Terminal className="h-6 w-6 stroke-[2]" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white">DOAB Developer Console</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
              [RESTRICTED] Operations Dispatch & Demo Simulation
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-neutral-200/80 dark:bg-white/10 border border-neutral-400 dark:border-white/20 text-neutral-950 dark:text-white text-xs font-mono font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block font-semibold">
                Admin Username / Email
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter username or email"
                autoComplete="off"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white placeholder:text-neutral-400 font-mono transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block font-semibold">
                Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white placeholder:text-neutral-400 font-mono transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 active:scale-98 transition-all shadow-md cursor-pointer font-sans"
            >
              Sign In to Dev Console
            </button>
          </form>

          <div className="pt-2 border-t border-neutral-200 dark:border-white/10 text-center text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
            <span>[INTERNAL USE ONLY] • AUTHENTICATED ACCESS REQUIRED</span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. AUTHENTICATED DEV / ADMIN DASHBOARD (Pure Obsidian & Porcelain Monochromatic Architecture)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#080808] text-neutral-900 dark:text-neutral-100 p-4 sm:p-6 md:p-8 flex flex-col items-center font-sans selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      <div className="w-full max-w-5xl space-y-6">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shrink-0 shadow-sm">
              <Terminal className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-neutral-950 dark:text-white">Developer Operations Center</h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-white/10 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-white/20 uppercase tracking-wider">
                  {session.role === 'super_admin' ? '[SUPER ADMIN]' : '[DEV ADMIN]'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                Operator: <span className="font-semibold text-neutral-950 dark:text-white">{session.username}</span> ({session.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                window.open('/', '_blank');
              }}
              className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-white/15 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Open Public App</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-100 dark:bg-white/5 text-neutral-900 dark:text-white text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-white/15 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Global Action Toast */}
        {statusMsg && (
          <div className="p-3.5 rounded-2xl border border-neutral-400 dark:border-white/20 bg-neutral-100 dark:bg-[#18181b] text-neutral-950 dark:text-white text-xs font-mono font-medium flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Navigation Tabs (Framer Motion Shared-Layout Sliding Pill) */}
        <div className="relative flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-x-auto">
          {[
            { id: 'scenarios', label: 'Disaster Scenarios & Condition Matrix', icon: Layers },
            { id: 'triggers', label: 'Instant Triggers & Broadcast Suite', icon: Play },
            { id: 'feedbacks', label: 'Rider Ground-Truth Feedbacks', icon: MessageSquare },
            { id: 'admins', label: 'Admin Access Control', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { playClick(); setActiveTab(tab.id as any); }}
                className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
                  active
                    ? 'text-[var(--bg-canvas)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="adminDashboardActiveTabPill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-xl bg-[var(--text-main)] -z-10 pointer-events-none shadow-xs"
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* TAB 0: DISASTER SCENARIOS & CONDITION TRIGGER MATRIX */}
        {activeTab === 'scenarios' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Live Active Alert Command Banner (Visible when a scenario or simulation is currently broadcasted) */}
            {activeBroadcast && (
              <div className="p-4 sm:p-5 rounded-3xl border-2 border-rose-600/50 bg-rose-500/[0.08] dark:bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 neo-glass-card shadow-lg animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-rose-700 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                    <Radio className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-rose-700 text-white uppercase tracking-wider">
                        [BROADCAST ACTIVE]
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                        {activeBroadcast.title || 'Simulated Disaster Condition'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--text-muted)] block mt-0.5">
                      Siren, notification and evacuation bypass active across all field phones & connected clients.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStandDown}
                  className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-mono font-bold uppercase tracking-wider active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-sm"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>[STAND DOWN / REVOKE ALL ALARMS]</span>
                </button>
              </div>
            )}

            {/* Header & Notice */}
            <div className="p-5 sm:p-6 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-neutral-950 dark:text-white" />
                  <h2 className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white">
                    Operational Disaster Test Cases & Threshold Rules
                  </h2>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-3xl">
                  Standardized test suites for all 6 extreme hazard events. Broadcasting any scenario transmits live telemetry to all field devices and mobile APKs. The Admin Console remains completely interactive with zero screen hijacking.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {activeBroadcast && (
                  <button
                    type="button"
                    onClick={handleStandDown}
                    className="px-3.5 py-1.5 text-xs font-mono font-bold uppercase rounded-xl bg-rose-700 hover:bg-rose-800 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>[STAND DOWN]</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={clearAdminAlerts}
                  className="px-3 py-1.5 text-xs font-mono rounded-xl border border-neutral-300 dark:border-white/15 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Clear All Custom Alerts</span>
                </button>
              </div>
            </div>

            {/* Interactive Environmental Threshold Rule Engine Simulator */}
            <div className="p-5 sm:p-6 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                      Live Environmental Threshold Rule Simulator
                    </h3>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                      [CALIBRATION SANDBOX] Dynamically test alert condition rules by modulating live inputs
                    </p>
                  </div>
                </div>

                {/* Computed Severity Monospace Badge (Executive DOAB Palette) */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 uppercase hidden sm:inline">Calculated State:</span>
                  <span className={`text-[10.5px] font-mono font-bold px-2.5 py-1 rounded-lg border ${
                    simResult.severity === 'Critical'
                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                      : simResult.severity === 'High'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        : simResult.severity === 'Medium'
                          ? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30'
                          : 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30'
                  }`}>
                    [{simResult.severity.toUpperCase()} ALERT]
                  </span>
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                
                {/* 1. Rainfall */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-300">
                      <CloudRain className="h-3.5 w-3.5 text-sky-500" />
                      <span>Rainfall Rate</span>
                    </span>
                    <span className="font-bold text-neutral-950 dark:text-white">{simRainfall} mm/h</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="1"
                    value={simRainfall}
                    onChange={(e) => setSimRainfall(Number(e.target.value))}
                    className="w-full accent-neutral-950 dark:accent-white cursor-pointer"
                  />
                  <div className="flex justify-between text-[8.5px] font-mono text-neutral-400">
                    <span>0 (Dry)</span>
                    <span>40 (Heavy)</span>
                    <span>70+ (Cloudburst)</span>
                  </div>
                </div>

                {/* 2. Inundation Depth */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-300">
                      <Waves className="h-3.5 w-3.5 text-teal-500" />
                      <span>Sump Inundation</span>
                    </span>
                    <span className="font-bold text-neutral-950 dark:text-white">{simWaterDepth} cm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="1"
                    value={simWaterDepth}
                    onChange={(e) => setSimWaterDepth(Number(e.target.value))}
                    className="w-full accent-neutral-950 dark:accent-white cursor-pointer"
                  />
                  <div className="flex justify-between text-[8.5px] font-mono text-neutral-400">
                    <span>0cm (Dry)</span>
                    <span>35cm (Halt Low)</span>
                    <span>60cm+ (Closure)</span>
                  </div>
                </div>

                {/* 3. Ambient Temperature */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-300">
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      <span>Ambient Temp</span>
                    </span>
                    <span className="font-bold text-neutral-950 dark:text-white">{simTemp}°C</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="50"
                    step="0.5"
                    value={simTemp}
                    onChange={(e) => setSimTemp(Number(e.target.value))}
                    className="w-full accent-neutral-950 dark:accent-white cursor-pointer"
                  />
                  <div className="flex justify-between text-[8.5px] font-mono text-neutral-400">
                    <span>25°C (Cool)</span>
                    <span>40°C (Stress)</span>
                    <span>44°C+ (Red Alert)</span>
                  </div>
                </div>

                {/* 4. Groundwater Table Deficit */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-300">
                      <Droplets className="h-3.5 w-3.5 text-orange-500" />
                      <span>Water Table Drop</span>
                    </span>
                    <span className="font-bold text-neutral-950 dark:text-white">-{simGroundwaterDeficit}m</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={simGroundwaterDeficit}
                    onChange={(e) => setSimGroundwaterDeficit(Number(e.target.value))}
                    className="w-full accent-neutral-950 dark:accent-white cursor-pointer"
                  />
                  <div className="flex justify-between text-[8.5px] font-mono text-neutral-400">
                    <span>0m (Recharged)</span>
                    <span>2m (Mild)</span>
                    <span>4m+ (Acute)</span>
                  </div>
                </div>

              </div>

              {/* Dynamic Evaluation Diagnostic Banner & Broadcast Trigger Button */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Rule Engine Evaluation:</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{simResult.reason}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetBaseline}
                    className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-white/15 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-100 dark:hover:bg-white/5 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-sans"
                    title="Reset sliders back to dry/safe baseline"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>[Reset Baseline]</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBroadcastSimulatedThreshold}
                    className={`px-4 py-2 rounded-xl font-bold text-xs hover:opacity-90 active:scale-98 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 font-sans ${
                      activeBroadcast?.isSimCustom
                        ? 'bg-rose-700 hover:bg-rose-800 text-white'
                        : 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
                    }`}
                  >
                    {activeBroadcast?.isSimCustom ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>[ACTIVE — STAND DOWN ALARM]</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Broadcast Condition Trigger</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 6 Pre-calibrated Standard Disaster Scenarios Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-neutral-950 dark:text-white" />
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                    Pre-Calibrated Disaster Test Case Matrix (6 Major Hazards)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                  Click to broadcast exact simulated conditions to all testers
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DISASTER_SCENARIOS.map((scen) => {
                  const isCurrentActive = activeBroadcast?.active && activeBroadcast?.scenarioId === scen.id;
                  return (
                    <div
                      key={scen.id}
                      className={`p-5 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border shadow-sm flex flex-col justify-between gap-3 transition-all ${
                        isCurrentActive 
                          ? 'border-rose-500/80 ring-2 ring-rose-500/20' 
                          : 'border-neutral-300 dark:border-white/10 hover:border-neutral-400 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-white/10 text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                              [{scen.envMode === 'flood' ? 'FLOOD MODE' : 'DROUGHT MODE'}]
                            </span>
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                              scen.severity === 'Critical'
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                : scen.severity === 'High'
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                  : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30'
                            }`}>
                              [{scen.severity.toUpperCase()}]
                            </span>
                          </div>
                          {isCurrentActive && (
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 animate-pulse flex items-center gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              <span>[BROADCASTING LIVE]</span>
                            </span>
                          )}
                        </div>

                        {/* Title & Location */}
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-neutral-950 dark:text-white leading-snug">
                            {scen.name}
                          </h4>
                          <div className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{scen.location}</span>
                          </div>
                        </div>

                        {/* Measured Conditions */}
                        <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300/80 dark:border-white/10 space-y-1 text-[10px] font-mono">
                          <span className="text-[8.5px] uppercase tracking-wider text-neutral-400 block font-semibold">Active Measurements:</span>
                          {Object.entries(scen.conditions).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between text-neutral-800 dark:text-neutral-200">
                              <span className="capitalize text-neutral-500">{k.replace(/([A-Z])/g, ' $1')}:</span>
                              <span className="font-semibold">{v}</span>
                            </div>
                          ))}
                        </div>

                        {/* Trigger Rule */}
                        <div className="text-[9.5px] text-neutral-600 dark:text-neutral-400 leading-snug font-sans bg-neutral-100 dark:bg-white/5 p-2 rounded-xl">
                          <strong className="text-neutral-950 dark:text-white block font-mono text-[9px] uppercase mb-0.5">Threshold Rule:</strong>
                          {scen.triggerThreshold}
                        </div>
                      </div>

                      {/* Broadcast Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isCurrentActive) {
                            handleStandDown();
                          } else {
                            handleBroadcastScenario(scen);
                          }
                        }}
                        className={`w-full mt-2 py-2 px-3 rounded-xl text-xs font-bold active:scale-98 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 font-sans ${
                          isCurrentActive
                            ? 'bg-rose-700 hover:bg-rose-800 text-white'
                            : 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90'
                        }`}
                      >
                        {isCurrentActive ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>[ACTIVE — CLICK TO STAND DOWN]</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" />
                            <span>Broadcast Scenario to All Users</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 1: INSTANT TRIGGERS */}
        {activeTab === 'triggers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Action 1: Destination Arrival Modal Trigger */}
            <div className="p-5 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neutral-200 dark:bg-white/10 text-neutral-950 dark:text-white border border-neutral-300 dark:border-white/20">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Simulate Destination Reached</h3>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                    [TELEMETRY] Trigger Arrival & AI Accuracy Verification Modal
                  </p>
                </div>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                During 3-minute hackathon evaluations, testers cannot walk across the city. This dispatches the destination arrival flow with AI model feedback and bookmarking across desktop and connected phones.
              </p>

              <button
                type="button"
                onClick={triggerDestinationArrival}
                className="w-full py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 active:scale-98 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Trigger Destination Reached Modal</span>
              </button>
            </div>

            {/* Section 2: Direct Emergency SOS Push Notification Dispatcher */}
            <div className="md:col-span-2 p-6 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-sm">
                    <Radio className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Emergency SOS Alert Broadcast</h3>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                      [CRITICAL SIREN & HAPTICS] Dispatches emergency push notification overriding silent/vibrate mode
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-200 dark:bg-white/10 text-neutral-950 dark:text-white border border-neutral-300 dark:border-white/20 font-bold uppercase tracking-wider">
                  HIGH PRIORITY SOS
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 block mb-1">Alert Title</label>
                  <input
                    type="text"
                    value={sosTitle}
                    onChange={(e) => setSosTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 block mb-1">Ward / Location</label>
                  <input
                    type="text"
                    value={sosWard}
                    onChange={(e) => setSosWard(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 block mb-1">Advisory Description</label>
                  <input
                    type="text"
                    value={sosDesc}
                    onChange={(e) => setSosDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    NativeService.triggerSosHaptics();

                    const alertTitle = `DOAB EMERGENCY SOS ALERT: ${sosTitle || 'Critical Hazard Alert'}`;
                    const alertBody = `${sosWard ? `[${sosWard}] ` : ''}${sosDesc || 'Severe flash waterlogging reported. Immediate high-ground bypass advised.'}`;

                    // 1. Broadcast 'sos_danger' (triggers emergency siren, overlay, and haptics on field/remote devices)
                    RemoteAdminChannel.broadcast('sos_danger', {
                      title: alertTitle,
                      ward: sosWard,
                      waterDepthCm: 85,
                      description: alertBody,
                      distanceAhead: '200 meters',
                      isCritical: true,
                    });

                    // 2. Also broadcast push_notification for generic listeners
                    RemoteAdminChannel.broadcast('push_notification' as any, {
                      title: alertTitle,
                      body: alertBody,
                      isCritical: true,
                    });

                    showToast('Dispatched Instant SOS Broadcast to all active field devices.');
                  }}
                  className="flex-1 w-full py-3 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 active:scale-98 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 font-sans"
                >
                  <Send className="h-4 w-4" />
                  <span>Dispatch Instant Push Notification (SOS)</span>
                </button>

                <button
                  type="button"
                  onClick={handleStandDown}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs active:scale-98 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 font-sans shrink-0"
                  title="Stands down all sirens and closes emergency danger screens across all connected devices"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>[Stand Down / All-Clear]</span>
                </button>
              </div>
            </div>

            {/* Action 4: Inject Live Alert Stream Item */}
            <div className="md:col-span-2 p-5 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-neutral-200 dark:bg-white/10 text-neutral-950 dark:text-white border border-neutral-300 dark:border-white/20">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Simulate Municipal Hazard Alert</h3>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                      [INUNDATION STREAM] Injects instant live alert into All Alerts feed
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearAdminAlerts}
                  className="px-2.5 py-1 text-[10px] font-mono rounded-lg border border-neutral-300 dark:border-white/15 text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Clear Custom Alerts
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Title</label>
                  <input
                    type="text"
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Ward / Location</label>
                  <input
                    type="text"
                    value={alertWard}
                    onChange={(e) => setAlertWard(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Severity</label>
                  <select
                    value={alertSeverity}
                    onChange={(e: any) => setAlertSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Water Depth (cm)</label>
                  <input
                    type="number"
                    value={alertDepth}
                    onChange={(e) => setAlertDepth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={injectMunicipalAlert}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Inject Alert into Notifications Stream</span>
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: RIDER GROUND-TRUTH & ARRIVAL FEEDBACKS */}
        {activeTab === 'feedbacks' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header with KPI cards & Actions */}
            <div className="p-6 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-neutral-950 dark:text-white" />
                    <h2 className="text-sm font-bold text-neutral-950 dark:text-white">Rider Ground-Truth Telemetry & Arrival Feedbacks</h2>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Real-time field evaluations submitted by citizens, emergency volunteers, and delivery riders upon reaching destinations.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={exportFeedbackCsv}
                    className="px-3 py-2 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearFeedbacks}
                    className="px-3 py-2 bg-neutral-200 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Log</span>
                  </button>
                </div>
              </div>

              {/* KPI Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10">
                  <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">Total Field Submissions</div>
                  <div className="text-xl font-bold font-mono text-neutral-950 dark:text-white mt-1">
                    {riderFeedbacks.length}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10">
                  <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">Model Accuracy Alignment</div>
                  <div className="text-xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-1">
                    {riderFeedbacks.length > 0 
                      ? `${Math.round((riderFeedbacks.filter(f => f.userRating === 'accurate').length / riderFeedbacks.length) * 100)}%` 
                      : '100%'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10">
                  <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">Unforeseen Inundation Reports</div>
                  <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                    {riderFeedbacks.filter(f => f.userRating === 'inaccurate').length}
                  </div>
                </div>
              </div>
            </div>

            {/* Submissions Feed List */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Audited Traversal Reports ({riderFeedbacks.length})
              </h3>

              {riderFeedbacks.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500 dark:text-neutral-400 rounded-2xl border border-dashed border-neutral-300 dark:border-white/10">
                  No arrival feedback records submitted yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {riderFeedbacks.map((f, idx) => {
                    const isAccurate = f.userRating === 'accurate';
                    const isInaccurate = f.userRating === 'inaccurate';
                    return (
                      <div
                        key={`feedback-item-${idx}`}
                        className="p-4 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-white/10 space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isAccurate
                              ? 'bg-teal-500/10 text-teal-800 dark:text-teal-300 border-teal-900/30'
                              : isInaccurate
                                ? 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-900/30'
                                : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-900/30'
                          }`}>
                            {isAccurate ? '[ACCURATE ROUTE]' : isInaccurate ? '[UNFORESEEN WATER]' : '[MODERATE PASSAGE]'}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                            {new Date(f.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-neutral-950 dark:text-white">
                            {f.routeSummary || 'Traversed Safe Route'}
                          </div>
                          {f.predictedRisk && (
                            <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
                              Model Prediction: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{f.predictedRisk}</span>
                            </div>
                          )}
                        </div>

                        {f.notes && (
                          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/5 text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                            "{f.notes}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN ACCESS CONTROL */}
        {activeTab === 'admins' && (
          <div className="space-y-6">
            
            {/* Add Admin Form */}
            {session.role === 'super_admin' ? (
              <div className="p-6 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-neutral-950 dark:text-white" />
                  <h2 className="text-sm font-bold text-neutral-950 dark:text-white">Register New Dev Admin</h2>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Only the Super Admin ({session.username}) can grant access to team members to operate this dashboard.
                </p>

                {adminMgmtMsg && (
                  <div className="p-3 rounded-xl bg-neutral-200 dark:bg-white/10 border border-neutral-300 dark:border-white/20 text-neutral-950 dark:text-white text-xs font-mono">
                    {adminMgmtMsg}
                  </div>
                )}

                <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Username</label>
                    <input
                      type="text"
                      placeholder="e.g. dev_alex"
                      value={newAdminUsername}
                      onChange={(e) => setNewAdminUsername(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="alex@example.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Initial Password</label>
                    <input
                      type="text"
                      placeholder="Secret password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-sm font-sans"
                    >
                      Grant Admin Credentials
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/15 text-neutral-700 dark:text-neutral-300 text-xs font-mono">
                [NOTICE] You are logged in as a Dev Admin. Only Super Admin has permission to invite or remove administrators.
              </div>
            )}

            {/* Admin Table */}
            <div className="p-6 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-neutral-950 dark:text-white">
                <Users className="h-4 w-4" />
                <span>Authorized Dashboard Operators</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-white/10 text-[10px] font-mono uppercase text-neutral-500 dark:text-neutral-400">
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Added Date</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:border-white/10">
                    {adminsList.map((a) => (
                      <tr key={a.username} className="hover:bg-neutral-100/50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-bold text-neutral-950 dark:text-white">{a.username}</td>
                        <td className="py-3 px-3 text-neutral-500 dark:text-neutral-400 font-mono">{a.email}</td>
                        <td className="py-3 px-3">
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border border-neutral-300 dark:border-white/20 bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-neutral-100 uppercase">
                            [{a.role}]
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                          {new Date(a.addedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {session.role === 'super_admin' && a.username !== 'krish' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAdmin(a.username)}
                              className="p-1 rounded-lg text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              title="Revoke Admin Access"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
