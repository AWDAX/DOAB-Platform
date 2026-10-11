import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, 
  Droplets, 
  Sun, 
  MapPin, 
  Route as RouteIcon, 
  Mic, 
  ShieldCheck, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Search, 
  Layers, 
  Activity 
} from 'lucide-react';
import { playClick } from '../utils/soundFx';

export interface TourStep {
  id: string;
  targetSelector?: string;
  title: string;
  stepLabel?: string;
  badge?: string;
  floodDescription: string;
  droughtDescription: string;
  proTip?: string;
  floodHighlight?: string;
  droughtHighlight?: string;
  icon: any;
  preferredPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlightPadding?: { x: number; y: number };
  spotlightRadius?: number;
}

export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: 'env_dual_engine',
    targetSelector: '#tour-env-toggle',
    title: 'Dual-Climate Engine',
    badge: 'Step 01/05',
    floodDescription: 'Flood mode asks for a one-hour waterlogging estimate. Drought mode does not invent tanker demand.',
    droughtDescription: 'Heatwave mode tracking groundwater depletion and municipal water tankers.',
    proTip: 'Press Shift + E to toggle climate modes instantly.',
    floodHighlight: 'Sub-400m standing water perimeters',
    droughtHighlight: 'Live groundwater & tanker ETA tracking',
    icon: Droplets,
    preferredPosition: 'bottom',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 18
  },
  {
    id: 'operations_map',
    targetSelector: '#tour-map-view',
    title: 'Risk Telemetry GIS Map',
    badge: 'Step 02/05',
    floodDescription: 'Historical Bengaluru complaints plus a one-hour model estimate where labels exist. Not a live sensor grid.',
    droughtDescription: 'Drought mode does not predict tanker demand. Areas without labels stay unmarked.',
    proTip: 'Open a complaint, then use the Google Maps link for directions.',
    floodHighlight: 'Amber marks a higher model estimate. Grey is lower.',
    droughtHighlight: 'Real-time deficit metrics per ward',
    icon: MapPin,
    preferredPosition: 'center',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 24
  },
  {
    id: 'safe_routing',
    targetSelector: '#tour-nav-routes',
    title: 'Safe Rerouting Engine',
    badge: 'Step 03/05',
    floodDescription: 'Calculates high-elevation bypasses to prevent 2-wheelers from stalling in floodwaters.',
    droughtDescription: 'Optimized transit routes for emergency water tankers and plumbing crews.',
    proTip: 'Preview turn-by-turn elevation safety deltas under Safe Routes.',
    floodHighlight: 'Real-time +4 min safe elevation bypass',
    droughtHighlight: 'Automated priority dispatch corridors',
    icon: RouteIcon,
    preferredPosition: 'bottom',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 18
  },
  {
    id: 'ai_copilot',
    targetSelector: '#tour-ai-copilot',
    title: 'AI Copilot Terminal',
    badge: 'Step 04/05',
    floodDescription: 'Asks about the one-hour estimate. Answers must say it is not a live depth reading.',
    droughtDescription: 'The assistant does not report tanker arrival times. That is not in the model.',
    proTip: 'Ask for a maps link. The reply will not invent a water depth.',
    floodHighlight: 'Model estimate, not a sensor',
    droughtHighlight: 'No tanker prediction',
    icon: Mic,
    preferredPosition: 'left',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 22
  },
  {
    id: 'life_safety_permissions',
    targetSelector: '#tour-permissions',
    title: 'Life-Safety & Permissions',
    badge: 'Step 05/05',
    floodDescription: 'Full-screen emergency override alarm when entering critical flood zones, even in DND.',
    droughtDescription: 'Civic heatwave advisories and automated verified bounty alerts.',
    proTip: 'Manage GPS and alert permissions to enable geofenced warnings.',
    floodHighlight: 'Critical SOS screen with 1-tap safe reroute',
    droughtHighlight: 'Verified citizen trust score rewards',
    icon: ShieldCheck,
    preferredPosition: 'top',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 18
  }
];

export const LANDING_TOUR_STEPS: TourStep[] = [
  {
    id: 'landing_hero',
    targetSelector: '#tour-landing-hero',
    title: 'DOAB Operations Grid',
    stepLabel: 'Beginning',
    badge: 'Intro',
    floodDescription: 'A prototype for a one-hour waterlogging estimate and an unscored or scored maps link.',
    droughtDescription: 'Drought dispatch is not predicted by the current model.',
    proTip: 'Estimates are limited to the Bengaluru area that has labelled complaints.',
    icon: Compass,
    preferredPosition: 'bottom',
    highlightPadding: { x: 14, y: 14 },
    spotlightRadius: 24
  },
  {
    id: 'landing_search',
    targetSelector: '#tour-landing-search',
    title: 'Complaint search',
    badge: 'Step 01/04',
    floodDescription: 'Search historical complaint text. Results are not live flood depths.',
    droughtDescription: 'Drought demand is not estimated, so search will not show tanker schedules.',
    proTip: 'Press Ctrl + K anytime to focus the search bar.',
    icon: Search,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 20
  },
  {
    id: 'landing_loop',
    targetSelector: '#tour-landing-loop',
    title: 'The DOAB Loop',
    badge: 'Step 02/04',
    floodDescription: 'Detect (model estimate) → Order (concept only) → Alert (maps link) → Back-check (not wired to the model).',
    droughtDescription: 'Drought detection is not part of the current model.',
    proTip: 'Nothing here resolves a civic incident on its own.',
    icon: Layers,
    preferredPosition: 'top',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 24
  },
  {
    id: 'landing_bento',
    targetSelector: '#tour-landing-bento',
    title: 'Platform Architecture',
    badge: 'Step 03/04',
    floodDescription: 'Rainfall, elevation and past complaints feed the estimate. No bounty is paid.',
    droughtDescription: 'Tanker tracking is not implemented.',
    proTip: 'The map uses Leaflet and OpenStreetMap.',
    icon: Activity,
    preferredPosition: 'top',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 24
  },
  {
    id: 'landing_modes',
    targetSelector: '#tour-landing-modes',
    title: 'Dual Climate Modes',
    badge: 'Step 04/04',
    floodDescription: 'Monsoon mode detects flood waterlogging and road passability.',
    droughtDescription: 'Scarcity mode manages groundwater depletion and emergency water tankers.',
    proTip: 'Switch climate modes using the header toggle.',
    icon: Sun,
    preferredPosition: 'top',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 24
  }
];

export const BEST_ROUTES_TOUR_STEPS: TourStep[] = [
  {
    id: 'best_header',
    targetSelector: '#tour-best-header',
    title: 'Safe Elevation Routes',
    badge: 'Step 01/04',
    floodDescription: 'Lists a Google Maps link. Alternatives are ranked only when a server route key is set.',
    droughtDescription: 'Drought supply routes are not calculated.',
    proTip: 'An unscored link has not been checked against the model.',
    floodHighlight: 'Safety first, then travel time, when scoring is available',
    droughtHighlight: 'No tanker corridor is produced',
    icon: RouteIcon,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 20
  },
  {
    id: 'best_switcher',
    targetSelector: '#tour-best-switcher',
    title: 'Multi-Path Risk Matrix',
    badge: 'Step 02/04',
    floodDescription: 'Compare primary, alternate, and high-ground emergency routes.',
    droughtDescription: 'Switch between commercial tanker corridors and distribution lines.',
    proTip: 'Evaluate alternate route risk percentages before departing.',
    icon: Layers,
    preferredPosition: 'bottom',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 18
  },
  {
    id: 'best_table',
    targetSelector: '#tour-best-table',
    title: 'Risk Probability Matrix',
    badge: 'Step 03/04',
    floodDescription: 'Corridor risk scores, estimated travel times, and elevation margins.',
    droughtDescription: 'Deficit clearance rates, transit times, and priority scores.',
    proTip: 'Recommended routes maintain <5% risk probability.',
    icon: Activity,
    preferredPosition: 'top',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 22
  },
  {
    id: 'best_engage',
    targetSelector: '#tour-best-engage',
    title: 'Engage Turn-by-Turn',
    badge: 'Step 04/04',
    floodDescription: 'Activates live voice prompts and flood hazard warnings.',
    droughtDescription: 'Dispatches verified routes to delivery riders and municipal fleets.',
    proTip: 'Engaging activates background geofencing and automatic reroute alerts.',
    icon: ShieldCheck,
    preferredPosition: 'left',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 18
  }
];

export const OLD_ROUTES_TOUR_STEPS: TourStep[] = [
  {
    id: 'history_header',
    targetSelector: '#tour-history-header',
    title: 'Audit History & Receipts',
    badge: 'Step 01/04',
    floodDescription: 'A page of example past routes. It is not a sensor audit.',
    droughtDescription: 'Tanker deliveries are not logged here.',
    proTip: 'These rows are not used to retrain the model automatically.',
    icon: Activity,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 20
  },
  {
    id: 'history_card_1',
    targetSelector: '#tour-history-card-1',
    title: 'Example route cards',
    badge: 'Step 02/04',
    floodDescription: 'Compares predicted flood risk (e.g. 8.5%) with actual road passability.',
    droughtDescription: 'Tracks delivered water volume vs predicted ward deficit.',
    proTip: 'High-correlation trips earn verified trust badges.',
    icon: MapPin,
    preferredPosition: 'top',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 20
  },
  {
    id: 'history_camera',
    targetSelector: '#tour-history-camera',
    title: '1-Tap Photo Back-Check',
    badge: 'Step 03/04',
    floodDescription: 'Photo back-check is a concept on this page. It does not change the model.',
    droughtDescription: 'Photo verification of replenished community water tanks.',
    proTip: 'Citizen back-checks feed the core reinforcement learning engine.',
    icon: Droplets,
    preferredPosition: 'top',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 18
  },
  {
    id: 'history_sync',
    targetSelector: '#tour-history-sync',
    title: 'Geofenced Trip Sync',
    badge: 'Step 04/04',
    floodDescription: 'Automatically logs completed commute corridors without manual check-ins.',
    droughtDescription: 'Automated fleet tracking across monitored municipal wards.',
    proTip: 'On-device geofencing with zero location data leaks.',
    icon: RouteIcon,
    preferredPosition: 'top',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 20
  }
];

export const NOTIFICATIONS_TOUR_STEPS: TourStep[] = [
  {
    id: 'alerts_header',
    targetSelector: '#tour-alerts-header',
    title: 'Civic Alert Stream',
    badge: 'Step 01/04',
    floodDescription: 'Cells whose one-hour estimate is elevated. Empty when the service has no labelled coverage.',
    droughtDescription: 'Drought and tanker alerts are not produced.',
    proTip: 'Ranked by ward risk index and commuter proximity.',
    icon: Activity,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 20
  },
  {
    id: 'alerts_critical',
    targetSelector: '#tour-alerts-critical',
    title: 'Critical Hazard Alerts',
    badge: 'Step 02/04',
    floodDescription: 'High-severity alerts (>30cm water) linked to Safe Reroutes and SOS mode.',
    droughtDescription: 'Severe water deficit alerts triggering commercial plumber work orders.',
    proTip: 'Can override device DND when emergency broadcast alerts are enabled.',
    icon: ShieldCheck,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 22
  },
  {
    id: 'alerts_tanker',
    targetSelector: '#tour-alerts-tanker',
    title: 'Bounty Work Orders',
    badge: 'Step 03/04',
    floodDescription: 'Work orders are a concept in this prototype. No payment is sent.',
    droughtDescription: 'Commercial tanker delivery contracts for registered fleets.',
    proTip: 'Delivery partners can claim open bounties directly.',
    icon: RouteIcon,
    preferredPosition: 'top',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 22
  },
  {
    id: 'alerts_backcheck',
    targetSelector: '#tour-alerts-backcheck',
    title: 'Verification Broadcasts',
    badge: 'Step 04/04',
    floodDescription: 'Crowdsourced road clearance confirmed by citizen photos.',
    droughtDescription: 'Community tap refills verified by ward residents.',
    proTip: 'Verified back-checks return ward indicators to green.',
    icon: MapPin,
    preferredPosition: 'top',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 22
  }
];

export const PROFILE_TOUR_STEPS: TourStep[] = [
  {
    id: 'profile_auth',
    targetSelector: '#tour-profile-auth',
    title: 'Authentication & Sync',
    badge: 'Step 01/03',
    floodDescription: 'Google OAuth / Demo session syncing commute history and civic trust scores.',
    droughtDescription: 'Verified dispatcher session for tanker orders and commercial billing.',
    proTip: 'One-click login preserves your trust score across devices.',
    icon: ShieldCheck,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 22
  },
  {
    id: 'profile_roles',
    targetSelector: '#tour-profile-roles',
    title: 'Stakeholder Roles',
    badge: 'Step 02/03',
    floodDescription: 'Switch between Citizen mode and Delivery Partner mode (Swiggy, Zomato, Zepto).',
    droughtDescription: 'Unlock commercial tanker and plumbing dispatch contracts.',
    proTip: 'Partner mode unlocks commercial elevation routing.',
    icon: Layers,
    preferredPosition: 'top',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 22
  },
  {
    id: 'profile_permissions',
    targetSelector: '#tour-profile-permissions',
    title: 'Life-Safety Suite',
    badge: 'Step 03/03',
    floodDescription: 'Configure GPS, civic alerts, geofencing, and test full-screen SOS Danger alarms.',
    droughtDescription: 'Manage alert subscriptions and municipal notification channels.',
    proTip: 'Click Manage & Test SOS to preview the full-screen danger screen.',
    icon: Compass,
    preferredPosition: 'top',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 22
  }
];

export const TEAM_TOUR_STEPS: TourStep[] = [
  {
    id: 'team_header',
    targetSelector: '#tour-team-header',
    title: 'Team Contrarians',
    badge: 'Step 01/04',
    floodDescription: 'Meet the builders behind the DOAB environmental life-safety platform.',
    droughtDescription: 'Explore the team behind the dual-climate civic response architecture.',
    proTip: 'Click any member card to inspect their domain profile.',
    icon: Compass,
    preferredPosition: 'bottom',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 24
  },
  {
    id: 'team_grid',
    targetSelector: '#tour-team-grid',
    title: 'Interactive Member Profiles',
    badge: 'Step 02/04',
    floodDescription: 'Profiles across Frontend Architecture, Cloud Systems, Hydrology ML, and UI/UX.',
    droughtDescription: 'Detailed engineering breakdown of telemetry and dispatch systems.',
    proTip: 'Use arrow keys or swipe to navigate profiles.',
    icon: Layers,
    preferredPosition: 'top',
    highlightPadding: { x: 14, y: 14 },
    spotlightRadius: 24
  },
  {
    id: 'team_stats',
    targetSelector: '#tour-team-stats',
    title: 'Engineering Benchmarks',
    badge: 'Step 03/04',
    floodDescription: 'The labelled area is the Bengaluru complaint box. There is no claimed accuracy percentage.',
    droughtDescription: 'High-efficiency serverless architecture with zero-downtime resilience.',
    proTip: 'DOAB is engineered for low-bandwidth mobile networks across urban corridors.',
    icon: Activity,
    preferredPosition: 'top',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 22
  },
  {
    id: 'team_pillars',
    targetSelector: '#tour-team-pillars',
    title: 'Core Architecture Pillars',
    badge: 'Step 04/04',
    floodDescription: 'Complaint labels, a one-hour estimate, and a Google Maps link.',
    droughtDescription: 'Three-tiered resilience architecture built for smart Indian cities.',
    proTip: 'Explore how DOAB bridges citizen safety with automated municipal operations.',
    icon: ShieldCheck,
    preferredPosition: 'top',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 22
  }
];

export const TOUR_REGISTRY: Record<string, TourStep[]> = {
  '/': DASHBOARD_TOUR_STEPS,
  '/routes/best': BEST_ROUTES_TOUR_STEPS,
  '/routes/old': OLD_ROUTES_TOUR_STEPS,
  '/notifications': NOTIFICATIONS_TOUR_STEPS,
  '/profile': PROFILE_TOUR_STEPS,
  '/landing': LANDING_TOUR_STEPS,
  '/team': TEAM_TOUR_STEPS
};

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  envMode: 'flood' | 'drought';
  tourType?: 'dashboard' | 'landing' | 'routes_best' | 'routes_old' | 'notifications' | 'profile' | 'team';
}

interface SpotlightRect {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  ry: number;
}

interface WelcomeTourPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  envMode: 'flood' | 'drought';
}

export function WelcomeTourPromptModal({
  isOpen,
  onClose,
  onAccept,
  envMode
}: WelcomeTourPromptModalProps) {
  const isFlood = envMode === 'flood';

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playClick();
        onClose();
      } else if (e.key === 'Enter') {
        playClick();
        onAccept();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onAccept]);

  if (!isOpen) return null;

  return typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 bg-black/65 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-prompt-title"
        className="relative w-full max-w-lg rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] dark:border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.9)] p-6 sm:p-8 text-[var(--text-main)] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Subtle Warm Amber / Accent Obsidian Glow Halo */}
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-amber-500/[0.08] dark:bg-amber-500/[0.12] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-amber-500/[0.06] dark:bg-amber-500/[0.10] blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            playClick();
            onClose();
          }}
          type="button"
          aria-label="Close"
          className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Header Icon + Mode Pill */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-10 w-10 rounded-2xl bg-[var(--text-main)] text-[var(--bg-card)] flex items-center justify-center shadow-md">
            <Compass size={20} className="stroke-[2.2]" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)]">
              {isFlood ? 'Monsoon Grid' : 'Scarcity Grid'} · Quick 1-Min Tour
            </span>
          </div>
        </div>

        {/* Title & Subtitle */}
        <h2 id="tour-prompt-title" className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)] leading-snug">
          Welcome to DOAB Operations!
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed mt-2">
          Would you like a quick interactive tour to navigate your dual-climate GIS map, safe computed elevation routes, and civic hazard response?
        </p>

        {/* Feature Highlights List */}
        <div className="my-5 p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-main)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-accent)] flex-shrink-0" />
            <span>Interactive GPS telemetry toolbar & live one-hour model estimates</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-main)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-accent)] flex-shrink-0" />
            <span>Safe elevation bypass routing to prevent stalling in standing water</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-main)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-accent)] flex-shrink-0" />
            <span>Context-aware DOAB Voice Copilot terminal & full-screen SOS alerts</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              playClick();
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-semibold transition cursor-pointer text-center"
          >
            No thanks, explore on my own
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              onAccept();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start Guided Tour</span>
            <ChevronRight size={14} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface PopoverPos {
  top: number;
  left: number;
  isTop: boolean;
  arrowLeft: number;
}

import { useLocation } from 'react-router-dom';

export default function GuidedTour({ 
  isOpen, 
  onClose, 
  envMode, 
  tourType 
}: GuidedTourProps) {
  const location = useLocation();

  // Auto-resolve sub-tour steps by current active route or explicit tourType prop
  const getStepsForCurrentRoute = (): TourStep[] => {
    if (tourType === 'landing') return LANDING_TOUR_STEPS;
    if (tourType === 'routes_best') return BEST_ROUTES_TOUR_STEPS;
    if (tourType === 'routes_old') return OLD_ROUTES_TOUR_STEPS;
    if (tourType === 'notifications') return NOTIFICATIONS_TOUR_STEPS;
    if (tourType === 'profile') return PROFILE_TOUR_STEPS;
    if (tourType === 'team') return TEAM_TOUR_STEPS;
    if (tourType === 'dashboard') return DASHBOARD_TOUR_STEPS;

    const path = location.pathname;
    return TOUR_REGISTRY[path] || DASHBOARD_TOUR_STEPS;
  };

  const steps = getStepsForCurrentRoute();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightCoords, setSpotlightCoords] = useState<SpotlightRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos>({ top: 0, left: 0, isTop: false, arrowLeft: 175 });
  const [isScrolling, setIsScrolling] = useState(false);
  const [hasTarget, setHasTarget] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep = steps[currentStepIndex] || steps[0];

  // Update spotlight & popover coordinates
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !currentStep) return;

    const selector = currentStep.targetSelector;
    let targetEl: HTMLElement | null = null;
    if (selector) {
      targetEl = document.querySelector(selector) as HTMLElement;
    }

    const padX = currentStep.highlightPadding?.x ?? 8;
    const padY = currentStep.highlightPadding?.y ?? 8;
    const radius = currentStep.spotlightRadius ?? 20;

    const cardWidth = 350;
    const cardHeight = popoverRef.current?.offsetHeight || 280;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const screenPadding = 16;
    const gap = 14;

    if (targetEl && targetEl.offsetParent !== null) {
      const rect = targetEl.getBoundingClientRect();
      const x = Math.max(4, rect.left - padX);
      const y = Math.max(4, rect.top - padY);
      const w = Math.min(viewportWidth - 8, rect.width + padX * 2);
      const h = Math.min(viewportHeight - 8, rect.height + padY * 2);

      setSpotlightCoords({ x, y, w, h, rx: radius, ry: radius });
      setHasTarget(true);

      // Auto-flipping popover calculation
      let isTop = false;
      let top = rect.bottom + padY + gap;

      if (currentStep.preferredPosition === 'top' || top + cardHeight > viewportHeight - screenPadding) {
        if (rect.top - padY - gap - cardHeight >= screenPadding) {
          top = rect.top - padY - gap - cardHeight;
          isTop = true;
        } else if (top + cardHeight > viewportHeight - screenPadding) {
          top = Math.max(screenPadding, viewportHeight - cardHeight - screenPadding);
        }
      }

      // Center horizontally on target, clamped within screen margins
      const effectiveCardWidth = Math.min(cardWidth, viewportWidth - screenPadding * 2);
      const targetCenterX = rect.left + rect.width / 2;
      let left = targetCenterX - effectiveCardWidth / 2;
      left = Math.max(screenPadding, Math.min(viewportWidth - effectiveCardWidth - screenPadding, left));

      // Calculate relative pointer arrow X offset so notch points directly at target element
      const arrowLeft = Math.max(20, Math.min(effectiveCardWidth - 20, targetCenterX - left));

      setPopoverPos({ top, left, isTop, arrowLeft });
    } else {
      // Fallback: Center spotlight and card in viewport if target not mounted
      const centerW = Math.min(viewportWidth - 32, 500);
      const centerH = 260;
      const x = (viewportWidth - centerW) / 2;
      const y = (viewportHeight - centerH) / 2;

      setSpotlightCoords({ x, y, w: centerW, h: centerH, rx: 24, ry: 24 });
      setHasTarget(false);

      const effectiveCardWidth = Math.min(cardWidth, viewportWidth - screenPadding * 2);
      const left = Math.max(screenPadding, (viewportWidth - effectiveCardWidth) / 2);
      const top = Math.max(screenPadding, (viewportHeight - cardHeight) / 2);
      setPopoverPos({ top, left, isTop: false, arrowLeft: effectiveCardWidth / 2 });
    }
  }, [isOpen, currentStep]);

  // Smooth scroll to target element with settled detection
  const scrollToTarget = useCallback(() => {
    if (!isOpen || !currentStep?.targetSelector) {
      updateTargetPosition();
      return;
    }

    const targetEl = document.querySelector(currentStep.targetSelector) as HTMLElement;
    if (!targetEl) {
      updateTargetPosition();
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const isInViewport = (
      rect.top >= 60 &&
      rect.bottom <= window.innerHeight - 60
    );

    if (!isInViewport) {
      setIsScrolling(true);
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Continuously track target bounding rect during scroll animation
      let lastScrollY = window.scrollY;
      let settleCount = 0;

      const trackScroll = () => {
        updateTargetPosition();
        const currentScrollY = window.scrollY;

        if (Math.abs(currentScrollY - lastScrollY) < 1) {
          settleCount += 1;
        } else {
          settleCount = 0;
        }
        lastScrollY = currentScrollY;

        if (settleCount < 5) {
          rafRef.current = requestAnimationFrame(trackScroll);
        } else {
          setIsScrolling(false);
          updateTargetPosition();
        }
      };

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(trackScroll);

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        updateTargetPosition();
      }, 700);
    } else {
      updateTargetPosition();
    }
  }, [isOpen, currentStep, updateTargetPosition]);

  // Step change trigger
  useEffect(() => {
    if (isOpen) {
      scrollToTarget();
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [isOpen, currentStepIndex, scrollToTarget]);

  // Handle window resize and scroll listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleResizeOrScroll = () => {
      updateTargetPosition();
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, updateTargetPosition]);

  const handleNext = useCallback(() => {
    playClick();
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      localStorage.setItem('doab_tour_completed', 'true');
      onClose();
    }
  }, [currentStepIndex, steps.length, onClose]);

  const handlePrev = useCallback(() => {
    playClick();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleSkip = useCallback(() => {
    playClick();
    localStorage.setItem('doab_tour_completed', 'true');
    onClose();
  }, [onClose]);

  // Keyboard navigation & scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ' || e.key === 'PageDown' || e.key === 'PageUp') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleSkip]);

  // Reset to first step on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const Icon = currentStep.icon;
  const isFlood = envMode === 'flood';
  const description = isFlood ? currentStep.floodDescription : currentStep.droughtDescription;
  const highlight = isFlood ? currentStep.floodHighlight : currentStep.droughtHighlight;
  const isLastStep = currentStepIndex === steps.length - 1;

  return typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[99998] select-none">
      
      {/* ── FULLSCREEN SVG SPOTLIGHT MASK & GLIDING HIGHLIGHTER ── */}
      <svg 
        className="fixed inset-0 w-full h-full pointer-events-none" 
        style={{ zIndex: 99998 }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White covers entire viewport (visible scrim) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            
            {/* Black cutout creates transparent window over highlighted element */}
            {spotlightCoords && (
              <rect
                x={spotlightCoords.x}
                y={spotlightCoords.y}
                width={spotlightCoords.w}
                height={spotlightCoords.h}
                rx={spotlightCoords.rx}
                ry={spotlightCoords.ry}
                fill="black"
                style={{
                  transition: 'all 0.4s cubic-bezier(0.33, 1, 0.68, 1)'
                }}
              />
            )}
          </mask>
        </defs>

        {/* Backdrop Scrim with transparent cutout mask */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.78)"
          mask="url(#tour-spotlight-mask)"
          className="pointer-events-auto cursor-pointer"
          onClick={handleSkip}
        />

        {/* Synchronized Highlighter Outline Ring (Clean Solid Accent Stroke) */}
        {spotlightCoords && hasTarget && (
          <rect
            x={spotlightCoords.x}
            y={spotlightCoords.y}
            width={spotlightCoords.w}
            height={spotlightCoords.h}
            rx={spotlightCoords.rx}
            ry={spotlightCoords.ry}
            fill="none"
            stroke="var(--color-brand-accent)"
            strokeWidth="2"
            className="pointer-events-none"
            style={{
              transition: 'all 0.4s cubic-bezier(0.33, 1, 0.68, 1)'
            }}
          />
        )}
      </svg>

      {/* ── COLLISION-AWARE POPOVER CARD ── */}
      <AnimatePresence mode="wait">
        {!isScrolling && (
          <motion.div
            key={currentStep.id}
            ref={popoverRef}
            initial={{ 
              opacity: 0, 
              scale: 0.96, 
              y: popoverPos.isTop ? 8 : -8 
            }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0 
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.96, 
              y: popoverPos.isTop ? 8 : -8 
            }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              width: '350px',
              maxWidth: 'calc(100vw - 32px)',
              zIndex: 99999
            }}
            className="relative neo-glass-card rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl p-5 sm:p-5.5 flex flex-col pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dynamic Arrow Notch pointing directly to target element */}
            {hasTarget && (
              <div 
                className={`absolute w-3.5 h-3.5 bg-[var(--bg-card)] border-[var(--border-color)] pointer-events-none transform rotate-45 ${
                  popoverPos.isTop 
                    ? '-bottom-1.75 border-b border-r' 
                    : '-top-1.75 border-t border-l'
                }`}
                style={{
                  left: `${popoverPos.arrowLeft}px`,
                  transform: 'translateX(-50%) rotate(45deg)'
                }}
              />
            )}

            {/* Header: Step Counter Badge & Close */}
            <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)]">
                  {currentStep.stepLabel || currentStep.badge || `Step ${currentStepIndex + 1}/${steps.length}`}
                </span>
                
                {/* Climate Engine Mode Indicator Badge */}
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)] flex items-center gap-1">
                  {isFlood ? <Droplets className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                  <span>{isFlood ? 'Monsoon' : 'Scarcity'}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleSkip}
                className="p-1.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                title="Exit Tour (Esc)"
                aria-label="Close Tour"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Title & Icon */}
            <div className="flex items-start gap-3 mb-2.5">
              <div className="h-8 w-8 rounded-xl bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)] border border-[var(--color-brand-accent)]/30 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[var(--text-main)] tracking-tight leading-snug">
                  {currentStep.title}
                </h3>
                {highlight && (
                  <div className="text-[10px] font-mono font-semibold text-[var(--color-brand-accent)] mt-0.5">
                    {highlight}
                  </div>
                )}
              </div>
            </div>

            {/* Concise Feature Description */}
            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
              {description}
            </p>

            {/* Pro-Tip Callout Box */}
            {currentStep.proTip && (
              <div className="mb-4 px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[11px] text-[var(--text-muted)] leading-relaxed flex items-start gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-brand-accent)] shrink-0">TIP</span>
                <span>{currentStep.proTip}</span>
              </div>
            )}

            {/* Action Controls & Interactive Step Dots */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              {/* Skip Button */}
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                Skip
              </button>

              {/* Interactive Step Indicator Dots */}
              <div className="flex items-center gap-1.5">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playClick();
                      setCurrentStepIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                      idx === currentStepIndex
                        ? 'w-5 bg-[var(--color-brand-accent)]'
                        : 'w-1.5 bg-[var(--text-muted)]/30 hover:bg-[var(--text-muted)]'
                    }`}
                    aria-label={`Jump to step ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Back / Next Buttons */}
              <div className="flex items-center gap-1.5">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="p-1.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                    aria-label="Previous Step"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] text-xs font-bold flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  <span>{isLastStep ? 'Finish' : 'Next'}</span>
                  {!isLastStep && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Micro Keyboard Hints Badge */}
            <div className="mt-2.5 pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-center gap-3 text-[9px] font-mono text-[var(--text-muted)]">
              <span><kbd className="px-1 py-0.2 bg-[var(--bg-main)] rounded border border-[var(--border-color)] font-bold">←</kbd> Prev</span>
              <span><kbd className="px-1 py-0.2 bg-[var(--bg-main)] rounded border border-[var(--border-color)] font-bold">→</kbd> Next</span>
              <span><kbd className="px-1 py-0.2 bg-[var(--bg-main)] rounded border border-[var(--border-color)] font-bold">Esc</kbd> Exit</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
