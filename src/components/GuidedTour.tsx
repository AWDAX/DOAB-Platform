import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, 
  Droplets, 
  Sun, 
  MapPin, 
  Route as RouteIcon, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Search, 
  Layers, 
  Activity,
  History,
  Bell,
  Users2,
  Camera,
  Sparkles
} from 'lucide-react';
import AIOrbIcon from './AIOrbIcon';
import { playClick } from '../utils/soundFx';

export const TOUR_STORAGE_KEY = 'doab_tour_completed_v2';
export const GLOBAL_TOUR_EVENT = 'doab:start-tour';
export const PAGE_TOUR_EVENT = 'doab:start-page-tour';

export interface TourStep {
  id: string;
  targetSelector: string;
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

// ─────────────────────────────────────────────────────────────
// COMPREHENSIVE TOUR STEP CONFIGURATIONS
// ─────────────────────────────────────────────────────────────

export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: 'dashboard_map',
    targetSelector: '#tour-map-view',
    title: 'Risk Telemetry GIS Map',
    badge: 'Step 01/06',
    floodDescription: 'High-resolution Leaflet map displaying historical Bengaluru waterlogging complaints and real-time model risk contours.',
    droughtDescription: 'Spatial tracking of ward water deficit, groundwater depletion alerts, and municipal tanker arrival corridors.',
    proTip: 'Drag to pan. Click any ward cluster or prediction cell to inspect raw depth telemetry.',
    floodHighlight: 'Sub-400m standing water perimeters',
    droughtHighlight: 'Real-time deficit metrics per ward',
    icon: MapPin,
    preferredPosition: 'center',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 20
  },
  {
    id: 'dashboard_search',
    targetSelector: '#tour-map-search',
    title: 'Ward & Hazard Search Bar',
    badge: 'Step 02/06',
    floodDescription: 'Search complaints, waterlogged intersections, and critical flood hotspots with live severity filtering.',
    droughtDescription: 'Filter emergency water request bounties and active municipal distribution points.',
    proTip: 'Use the severity pills (Critical, High, Medium, Low) to isolate impassable roads.',
    floodHighlight: 'Live autocomplete & severity filtering',
    droughtHighlight: 'Ward tanker demand filter',
    icon: Search,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 18
  },
  {
    id: 'dashboard_forecast',
    targetSelector: '#tour-map-forecast',
    title: '1-Hour Prediction Telemetry',
    badge: 'Step 03/06',
    floodDescription: 'Machine learning model estimate for water accumulation in the next 60 minutes based on SRTM elevation and rainfall data.',
    droughtDescription: 'Groundwater depletion forecast and predicted tanker transit delays.',
    proTip: 'Click "Refresh" anytime to poll the newest server prediction telemetry.',
    floodHighlight: 'Model estimate, not a hardware sensor',
    droughtHighlight: 'Simulated drought deficit index',
    icon: Activity,
    preferredPosition: 'top',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 18
  },
  {
    id: 'dashboard_controls',
    targetSelector: '#tour-map-controls',
    title: 'Map Telemetry Controls',
    badge: 'Step 04/06',
    floodDescription: 'Vertical control dock: GPS recenter, risk halos, prediction grids, ward boundaries, and intelligence overlay.',
    droughtDescription: 'Quickly toggle deficit heatmaps, tanker distribution lines, and citizen verification markers.',
    proTip: 'Click the animated crosshair to snap the map directly to your live GPS coordinates.',
    floodHighlight: 'Custom vertical tool column with tooltips',
    droughtHighlight: 'One-click layer visibility toggle',
    icon: Layers,
    preferredPosition: 'left',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 18
  },
  {
    id: 'dashboard_routes_nav',
    targetSelector: '#tour-nav-best',
    title: 'Safe Elevation Routing',
    badge: 'Step 05/06',
    floodDescription: 'Access safe computed paths engineered to navigate through high-elevation ridges and avoid valley flood traps.',
    droughtDescription: 'Access commercial transit corridors for emergency water tankers and plumbing fleets.',
    proTip: 'Keyboard shortcut: Press "2" on your keyboard to open Safe Routes instantly.',
    floodHighlight: 'High-ground routing engine',
    droughtHighlight: 'Priority dispatch corridors',
    icon: RouteIcon,
    preferredPosition: 'right',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 16
  },
  {
    id: 'dashboard_assistant_nav',
    targetSelector: '#tour-nav-assistant',
    title: 'DOAB AI Copilot',
    badge: 'Step 06/06',
    floodDescription: 'Dedicated full-page conversational terminal with voice input, session history, and cited civic answers.',
    droughtDescription: 'Inquire about tanker schedules, water distribution guidelines, and ward status.',
    proTip: 'Press "A" anytime to jump directly to the DOAB AI Assistant.',
    floodHighlight: 'Voice dictation & chat export',
    droughtHighlight: 'Cited civic advisory terminal',
    icon: AIOrbIcon,
    preferredPosition: 'right',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 16
  }
];

export const ASSISTANT_TOUR_STEPS: TourStep[] = [
  {
    id: 'assistant_header',
    targetSelector: '#tour-assistant-header',
    title: 'DOAB AI Copilot Terminal',
    badge: 'Step 01/04',
    floodDescription: 'Conversational assistant analyzing live weather telemetry, model estimates, and historical flood complaints.',
    droughtDescription: 'Intelligent copilot for water scarcity management, tanker coordination, and municipal advisory.',
    proTip: 'Responses clearly differentiate model predictions from verified sensor ground truth.',
    floodHighlight: 'Dual-climate intelligence copilot',
    droughtHighlight: 'Groundwater & tanker advisory',
    icon: AIOrbIcon,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 20
  },
  {
    id: 'assistant_actions',
    targetSelector: '#tour-assistant-actions',
    title: 'Session Management & History',
    badge: 'Step 02/04',
    floodDescription: 'Start new chats, browse past advisory sessions, or export conversations to Markdown.',
    droughtDescription: 'Review previous dispatch queries and export operational consultation records.',
    proTip: 'Click "Sessions" to search past discussions or clear old records.',
    floodHighlight: 'Instant export & session recovery',
    droughtHighlight: 'Persistent on-device storage',
    icon: Activity,
    preferredPosition: 'bottom',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 18
  },
  {
    id: 'assistant_chat',
    targetSelector: '#tour-assistant-chat',
    title: 'Consultation Stream & Voice',
    badge: 'Step 03/04',
    floodDescription: 'Interactive message thread with clickable quick prompts, code blocks, and read-aloud voice playback.',
    droughtDescription: 'Clear text responses with read-aloud capabilities for field workers and municipal drivers.',
    proTip: 'Click the speaker icon next to any assistant reply for high-fidelity speech synthesis.',
    floodHighlight: 'One-click copy & text-to-speech',
    droughtHighlight: 'Field-ready accessibility',
    icon: Compass,
    preferredPosition: 'top',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 22
  },
  {
    id: 'assistant_input',
    targetSelector: '#tour-assistant-input',
    title: 'Voice Dictation & Input Bar',
    badge: 'Step 04/04',
    floodDescription: 'Hands-free voice recognition with live audio visualizer and instant send for wet or moving commutes.',
    droughtDescription: 'Quickly dictate emergency ward requests or query water tanker availability.',
    proTip: 'Click the microphone icon or press Enter after typing your question.',
    floodHighlight: 'Speech-to-text with auto-punctuation',
    droughtHighlight: 'Zero-touch driver interface',
    icon: Sparkles,
    preferredPosition: 'top',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 18
  }
];

export const BEST_ROUTES_TOUR_STEPS: TourStep[] = [
  {
    id: 'best_header',
    targetSelector: '#tour-best-header',
    title: 'Safe Elevation Routing Engine',
    badge: 'Step 01/04',
    floodDescription: 'Calculates high-ground bypass routes using SRTM digital elevation data to prevent vehicles from stalling in standing water.',
    droughtDescription: 'Generates optimized supply lines for commercial water tankers avoiding narrow congested lanes.',
    proTip: 'Safest routes prioritize high elevation margins and lower waterlogging probabilities.',
    floodHighlight: 'Elevation-first bypass calculation',
    droughtHighlight: 'Heavy tanker transit corridors',
    icon: RouteIcon,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 20
  },
  {
    id: 'best_switcher',
    targetSelector: '#tour-best-switcher',
    title: 'Multi-Path Risk Comparison',
    badge: 'Step 02/04',
    floodDescription: 'Switch between primary, secondary, and emergency high-ground bypass routes with one click.',
    droughtDescription: 'Compare alternative delivery corridors and transit time trade-offs.',
    proTip: 'Use arrow buttons (← / →) to quickly cycle through computed alternatives.',
    floodHighlight: 'Instant alternative corridor cycling',
    droughtHighlight: 'Comparative transit analytics',
    icon: Layers,
    preferredPosition: 'bottom',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 18
  },
  {
    id: 'best_table',
    targetSelector: '#tour-best-table',
    title: 'Corridor Safety & Elevation Matrix',
    badge: 'Step 03/04',
    floodDescription: 'Inspect distance in kilometers, estimated commute time, and model risk probability for each alternative.',
    droughtDescription: 'Verify clearance metrics, turnaround times, and delivery priority ratings.',
    proTip: 'Green badge indicates verified safest path with minimal flood exposure.',
    floodHighlight: 'Quantitative elevation margins',
    droughtHighlight: 'Priority deficit ratings',
    icon: Activity,
    preferredPosition: 'top',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 20
  },
  {
    id: 'best_engage',
    targetSelector: '#tour-best-engage',
    title: 'Open in Google Maps / Engage',
    badge: 'Step 04/04',
    floodDescription: 'Launch turn-by-turn navigation directly in Google Maps with high-ground waypoints preserved.',
    droughtDescription: 'Dispatch verified routes directly to drivers or share with logistics fleets.',
    proTip: 'Clicking opens native Google Maps with origin and destination pre-populated.',
    floodHighlight: '1-tap external turn-by-turn navigation',
    droughtHighlight: 'Seamless driver handoff',
    icon: Compass,
    preferredPosition: 'left',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 18
  }
];

export const OLD_ROUTES_TOUR_STEPS: TourStep[] = [
  {
    id: 'history_header',
    targetSelector: '#tour-history-header',
    title: 'Route Traversal History & Audits',
    badge: 'Step 01/04',
    floodDescription: 'Complete audit log of previously traversed corridors, model accuracy verification, and ground-truth back-checks.',
    droughtDescription: 'Historical record of water deliveries, tanker arrivals, and community verification stamps.',
    proTip: 'Click "Export History (CSV)" to download spreadsheet logs for insurance or municipal reporting.',
    floodHighlight: 'Comprehensive trip ledger & CSV export',
    droughtHighlight: 'Delivery audit accountability',
    icon: History,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 20
  },
  {
    id: 'history_card_1',
    targetSelector: '#tour-history-card-1',
    title: 'Ground Truth Verification Card',
    badge: 'Step 02/04',
    floodDescription: 'Compares predicted flood risk against actual street conditions encountered by commuters.',
    droughtDescription: 'Details delivered water volume versus predicted ward water deficit.',
    proTip: 'Cards show verified accuracy tags: "Clear Dry", "Waterlogged", or "Passable".',
    floodHighlight: 'Prediction vs Reality delta',
    droughtHighlight: 'Volume delivered verification',
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
    floodDescription: 'Capture on-ground road photos to verify clearance or report unexpected standing water.',
    droughtDescription: 'Upload photo proof of replenished community water tanks and functional taps.',
    proTip: 'Citizen photo back-checks improve community trust scores and validate model accuracy.',
    floodHighlight: 'Crowdsourced visual proof',
    droughtHighlight: 'Tanker discharge verification',
    icon: Camera,
    preferredPosition: 'top',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 18
  },
  {
    id: 'history_sync',
    targetSelector: '#tour-history-sync',
    title: 'Geofenced Trip Sync',
    badge: 'Step 04/04',
    floodDescription: 'Background on-device geofencing automatically logs completed safe commutes with zero cloud tracking.',
    droughtDescription: 'Tracks fleet coverage across monitored municipal wards without leaking private routes.',
    proTip: 'All location matching happens locally in your browser sandbox.',
    floodHighlight: 'Privacy-first client-side geofence',
    droughtHighlight: 'Zero telemetry data leakage',
    icon: RouteIcon,
    preferredPosition: 'top',
    highlightPadding: { x: 8, y: 8 },
    spotlightRadius: 18
  }
];

export const NOTIFICATIONS_TOUR_STEPS: TourStep[] = [
  {
    id: 'alerts_header',
    targetSelector: '#tour-alerts-header',
    title: 'Civic Alerts & Telemetry Feed',
    badge: 'Step 01/04',
    floodDescription: 'Real-time list of all cells with elevated waterlogging probability sorted by risk urgency.',
    droughtDescription: 'List of active tanker work orders, water scarcity advisories, and maintenance alerts.',
    proTip: 'Alerts update dynamically as new weather forecasts are ingested.',
    floodHighlight: 'Urgency-sorted hazard stream',
    droughtHighlight: 'Civic water distribution updates',
    icon: Bell,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 20
  },
  {
    id: 'alerts_critical',
    targetSelector: '#tour-alerts-critical',
    title: 'Critical Hazard Warning Cards',
    badge: 'Step 02/04',
    floodDescription: 'Indicates high-severity water accumulation (>35% probability) with coordinates and 1-hour forecast window.',
    droughtDescription: 'Indicates acute water shortages requiring immediate commercial tanker intervention.',
    proTip: 'Click "Open in Google Maps" on any alert card to view its exact street coordinates.',
    floodHighlight: 'Direct link to safe bypass routing',
    droughtHighlight: 'Dispatch priority classification',
    icon: Compass,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 22
  },
  {
    id: 'alerts_tanker',
    targetSelector: '#tour-alerts-tanker',
    title: 'Work Orders & Dispatch Bounties',
    badge: 'Step 03/04',
    floodDescription: 'Simulated civic clearing contracts for municipal suction pumps and drainage crews.',
    droughtDescription: 'Commercial tanker delivery bounties for registered fleet operators.',
    proTip: 'Commercial partners can claim open bounties directly in partner mode.',
    floodHighlight: 'Civic response work orders',
    droughtHighlight: 'Verified tanker delivery bounties',
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
    floodDescription: 'Crowdsourced road clearance status verified by fellow commuters on the ground.',
    droughtDescription: 'Community tap refilling confirmed by local ward residents.',
    proTip: 'Back-checks return hazard indicators from amber to safe green.',
    floodHighlight: 'Citizen crowd verification',
    droughtHighlight: 'Community refill confirmations',
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
    title: 'Authentication & Session Sync',
    badge: 'Step 01/03',
    floodDescription: 'Sign in with Google OAuth or local demo mode to sync commute logs and citizen trust score.',
    droughtDescription: 'Dispatcher credentials for tanker orders, verified routes, and billing receipts.',
    proTip: 'One-click sign in preserves your trust badges across multiple devices.',
    floodHighlight: 'Verified Firebase & Demo authentication',
    droughtHighlight: 'Commercial dispatcher access',
    icon: Compass,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 22
  },
  {
    id: 'profile_roles',
    targetSelector: '#tour-profile-roles',
    title: 'Your Role Switcher',
    badge: 'Step 02/03',
    floodDescription: 'Toggle between Citizen Commuter mode and Delivery Partner mode (Swiggy, Zomato, Zepto, Dunzo).',
    droughtDescription: 'Unlock municipal tanker dispatch contracts and commercial plumbing pipelines.',
    proTip: 'Delivery partner mode unlocks heavy-vehicle elevation routing rules.',
    floodHighlight: 'Multi-stakeholder interface toggle',
    droughtHighlight: 'Commercial fleet routing',
    icon: Layers,
    preferredPosition: 'top',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 22
  },
  {
    id: 'profile_permissions',
    targetSelector: '#tour-profile-permissions',
    title: 'Life-Safety & Permissions Suite',
    badge: 'Step 03/03',
    floodDescription: 'Configure GPS tracking, background geofencing, and active life-safety telemetry.',
    droughtDescription: 'Manage municipal SMS broadcasts, push alerts, and emergency contact lists.',
    proTip: 'Tap "Configure" to review device GPS accuracy and municipal alert clearance.',
    floodHighlight: 'Device telemetry & life-safety parameters',
    droughtHighlight: 'Advisory push preferences',
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
    title: 'The Team Behind DOAB',
    badge: 'Step 01/04',
    floodDescription: 'Meet the engineering and design team behind the dual-climate life-safety platform.',
    droughtDescription: 'Learn about the cross-disciplinary contributors architecting water resilience.',
    proTip: 'Click any member card to view their GitHub, LinkedIn, and core contributions.',
    floodHighlight: 'Team Contrarians portfolio',
    droughtHighlight: 'Full-stack civic engineering',
    icon: Users2,
    preferredPosition: 'bottom',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 24
  },
  {
    id: 'team_grid',
    targetSelector: '#tour-team-grid',
    title: 'Interactive Member Profiles',
    badge: 'Step 02/04',
    floodDescription: 'Profiles spanning Frontend Architecture, Cloud Systems, Hydrology ML, and UI/UX Design.',
    droughtDescription: 'Deep-dive into each domain owner’s technical stack and contributions.',
    proTip: 'Cards include subtle soft shadows and responsive layout across mobile and desktop.',
    floodHighlight: 'Role badges & domain specializations',
    droughtHighlight: 'Clean neo-glass card design',
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
    floodDescription: 'Bengaluru complaint coverage, SRTM elevation integration, and sub-150ms client-side latency.',
    droughtDescription: 'Resource optimization metrics designed for low-bandwidth mobile networks.',
    proTip: 'DOAB is architected with zero third-party telemetry trackers.',
    floodHighlight: 'High performance web architecture',
    droughtHighlight: 'Low-bandwidth resilience',
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
    floodDescription: 'Deterministic rule evaluation, privacy-first geofencing, and transparent machine learning.',
    droughtDescription: 'Civilian-first emergency infrastructure and municipal collaboration.',
    proTip: 'Read the architectural philosophy driving our dual-climate platform.',
    floodHighlight: 'Zero hallucination ML guidelines',
    droughtHighlight: 'Civic accountability',
    icon: Compass,
    preferredPosition: 'top',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 22
  }
];

export const LANDING_TOUR_STEPS: TourStep[] = [
  {
    id: 'landing_hero',
    targetSelector: '#tour-landing-hero',
    title: 'DOAB Operations Grid',
    badge: 'Intro',
    floodDescription: 'An intelligent environmental life-safety platform providing 1-hour waterlogging forecasts and safe elevation bypass routes.',
    droughtDescription: 'Civic water management network bridging groundwater depletion, tanker logistics, and citizen verification.',
    proTip: 'Press Shift + E anytime to switch between Monsoon and Scarcity modes.',
    floodHighlight: 'Dual-climate civic intelligence',
    droughtHighlight: 'Zero-middleman water logistics',
    icon: Compass,
    preferredPosition: 'bottom',
    highlightPadding: { x: 14, y: 14 },
    spotlightRadius: 24
  },
  {
    id: 'landing_search',
    targetSelector: '#tour-landing-search',
    title: 'Natural Language Search & Triage',
    badge: 'Step 01/04',
    floodDescription: 'Type or speak street names and wards to retrieve historical waterlogging complaints and passability warnings.',
    droughtDescription: 'Query municipal tanker distribution schedules and ward water deficit ratings.',
    proTip: 'Press Ctrl + K anytime to focus the global command search bar.',
    floodHighlight: 'Ctrl + K command palette integration',
    droughtHighlight: 'Instant ward query triage',
    icon: Search,
    preferredPosition: 'bottom',
    highlightPadding: { x: 10, y: 10 },
    spotlightRadius: 20
  },
  {
    id: 'landing_loop',
    targetSelector: '#tour-landing-loop',
    title: 'The Closed DOAB Loop',
    badge: 'Step 02/04',
    floodDescription: 'Predict accumulation → Compute safe elevation paths → Broadcast geofenced alarms → Verify with photo back-checks.',
    droughtDescription: 'Monitor deficit → Dispatch tanker fleets → Deliver water → Citizen QR verification.',
    proTip: 'Every stage runs locally with verified timestamps.',
    floodHighlight: '4-stage life-safety lifecycle',
    droughtHighlight: 'Closed loop accountability',
    icon: Layers,
    preferredPosition: 'top',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 24
  },
  {
    id: 'landing_bento',
    targetSelector: '#tour-landing-bento',
    title: 'System Architecture & Bento Grid',
    badge: 'Step 03/04',
    floodDescription: 'Hydrology models, Leaflet GIS mapping, client-side geofencing, and serverless edge APIs.',
    droughtDescription: 'High-res groundwater telemetry, tanker routing, and civic bounty management.',
    proTip: 'Built for extreme conditions with full offline caching support.',
    floodHighlight: 'Zero cloud latency architecture',
    droughtHighlight: 'Offline-first PWA design',
    icon: Activity,
    preferredPosition: 'top',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 24
  },
  {
    id: 'landing_modes',
    targetSelector: '#tour-landing-modes',
    title: 'Dual Climate Operational Modes',
    badge: 'Step 04/04',
    floodDescription: 'Monsoon mode: active flood risk corridors, standing water warnings, and safe elevation routes.',
    droughtDescription: 'Scarcity mode: groundwater depletion tracking, heatwave advisories, and emergency tankers.',
    proTip: 'Switch instantly using the climate mode toggle in the navigation bar.',
    floodHighlight: 'Flood cerulean vs Scarcity amber',
    droughtHighlight: 'Adaptive UI tokens & terminology',
    icon: Sun,
    preferredPosition: 'top',
    highlightPadding: { x: 12, y: 12 },
    spotlightRadius: 24
  }
];

export const PAGE_TOUR_CONFIGS: Record<string, TourStep[]> = {
  dashboard: DASHBOARD_TOUR_STEPS,
  routes_best: BEST_ROUTES_TOUR_STEPS,
  routes_old: OLD_ROUTES_TOUR_STEPS,
  notifications: NOTIFICATIONS_TOUR_STEPS,
  assistant: ASSISTANT_TOUR_STEPS,
  profile: PROFILE_TOUR_STEPS,
  team: TEAM_TOUR_STEPS,
  landing: LANDING_TOUR_STEPS
};

export const ROUTE_PATH_MAP: Record<string, string> = {
  '/': 'dashboard',
  '/routes/best': 'routes_best',
  '/routes/old': 'routes_old',
  '/notifications': 'notifications',
  '/assistant': 'assistant',
  '/profile': 'profile',
  '/team': 'team',
  '/landing': 'landing'
};

// ─────────────────────────────────────────────────────────────
// HELPER: ELEMENT VISIBILITY CHECK (SAHNIRMAAN STANDARD)
// ─────────────────────────────────────────────────────────────

export function isElementVisible(el: HTMLElement | null): boolean {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  const rect = el.getBoundingClientRect();
  return (rect.width > 0 && rect.height > 0) || el.offsetParent !== null;
}

// ─────────────────────────────────────────────────────────────
// WELCOME PROMPT MODAL (SAHNIRMAAN / SWATVA OBSIDIAN STANDARD)
// ─────────────────────────────────────────────────────────────

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
        {/* Subtle Warm Amber Halo */}
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
              {isFlood ? 'Monsoon Operations' : 'Scarcity Operations'} · Quick 1-Min Tour
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

// ─────────────────────────────────────────────────────────────
// PAGE TOUR TRIGGER BUTTON (SWATVA / SAHNIRMAAN STANDARD)
// ─────────────────────────────────────────────────────────────

interface PageTourButtonProps {
  pageKey?: string;
  className?: string;
  label?: string;
}

export function PageTourButton({ 
  pageKey, 
  className = '', 
  label = 'Page Guide' 
}: PageTourButtonProps) {
  const location = useLocation();
  const targetKey = pageKey || ROUTE_PATH_MAP[location.pathname] || 'dashboard';

  return (
    <button
      type="button"
      onClick={() => {
        playClick();
        window.dispatchEvent(new CustomEvent(PAGE_TOUR_EVENT, { detail: { pageKey: targetKey } }));
      }}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--text-main)]/5 hover:text-[var(--text-main)] transition-colors duration-200 cursor-pointer select-none shadow-2xs group ${className}`}
      aria-label={`Start ${label}`}
      title={`Start ${label} interactive tour`}
    >
      <Compass size={14} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-all duration-300 group-hover:rotate-45 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

export function rerunGuidedTour() {
  window.dispatchEvent(new CustomEvent(GLOBAL_TOUR_EVENT));
}

export function startPageTour(pageKey: string) {
  window.dispatchEvent(new CustomEvent(PAGE_TOUR_EVENT, { detail: { pageKey } }));
}

// ─────────────────────────────────────────────────────────────
// MAIN GUIDED TOUR COMPONENT
// ─────────────────────────────────────────────────────────────

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  envMode: 'flood' | 'drought';
  tourType?: string;
}

interface SpotlightRect {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  ry: number;
}

interface PopoverPos {
  top: number;
  left: number;
  isTop: boolean;
  arrowLeft: number;
}

export default function GuidedTour({ 
  isOpen, 
  onClose, 
  envMode, 
  tourType: explicitTourType 
}: GuidedTourProps) {
  const location = useLocation();

  // Active tour key resolution
  const activeTourKey = explicitTourType || ROUTE_PATH_MAP[location.pathname] || 'dashboard';

  // State
  const [activeSteps, setActiveSteps] = useState<TourStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightCoords, setSpotlightCoords] = useState<SpotlightRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos>({ top: 0, left: 0, isTop: false, arrowLeft: 175 });
  const [isScrolling, setIsScrolling] = useState(false);
  const [hasTarget, setHasTarget] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter candidate steps so tour ONLY points to mounted and visible DOM elements
  const filterSteps = useCallback((key: string): TourStep[] => {
    const rawSteps = PAGE_TOUR_CONFIGS[key] || DASHBOARD_TOUR_STEPS;
    
    // Check which candidate steps have visible DOM elements
    const availableSteps = rawSteps.filter((step) => {
      const el = document.querySelector(step.targetSelector) as HTMLElement | null;
      return isElementVisible(el);
    });

    // If some page steps are hidden (e.g. mobile collapsed elements), return available;
    // if none match, fallback to the full list with viewport centering
    return availableSteps.length > 0 ? availableSteps : rawSteps;
  }, []);

  // Update active steps when tour opens or page changes
  useEffect(() => {
    if (isOpen) {
      const resolved = filterSteps(activeTourKey);
      setActiveSteps(resolved);
      setCurrentStepIndex(0);
    }
  }, [isOpen, activeTourKey, filterSteps]);

  const currentStep = activeSteps[currentStepIndex] || activeSteps[0];

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
    const radius = currentStep.spotlightRadius ?? 18;

    const cardWidth = 350;
    const cardHeight = popoverRef.current?.offsetHeight || 290;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const screenPadding = 16;
    const gap = 14;

    if (targetEl && isElementVisible(targetEl)) {
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
      const centerW = Math.min(viewportWidth - 32, 520);
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

  // Smooth scroll to target element with settle detection
  const scrollToTarget = useCallback(() => {
    if (!isOpen || !currentStep?.targetSelector) {
      updateTargetPosition();
      return;
    }

    const targetEl = document.querySelector(currentStep.targetSelector) as HTMLElement;
    if (!targetEl || !isElementVisible(targetEl)) {
      updateTargetPosition();
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const isInViewport = (
      rect.top >= 70 &&
      rect.bottom <= window.innerHeight - 70
    );

    if (!isInViewport) {
      setIsScrolling(true);
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

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
    if (currentStepIndex < activeSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      onClose();
    }
  }, [currentStepIndex, activeSteps.length, onClose]);

  const handlePrev = useCallback(() => {
    playClick();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleSkip = useCallback(() => {
    playClick();
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    onClose();
  }, [onClose]);

  // Keyboard navigation
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleSkip]);

  if (!isOpen || activeSteps.length === 0 || !currentStep) return null;

  const Icon = currentStep.icon;
  const isFlood = envMode === 'flood';
  const description = isFlood ? currentStep.floodDescription : currentStep.droughtDescription;
  const highlight = isFlood ? currentStep.floodHighlight : currentStep.droughtHighlight;
  const isLastStep = currentStepIndex === activeSteps.length - 1;

  return typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[99998] select-none">
      
      {/* ── FULLSCREEN SVG SPOTLIGHT MASK & GLIDING HIGHLIGHTER ── */}
      <svg 
        className="fixed inset-0 w-full h-full pointer-events-none" 
        style={{ zIndex: 99998 }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White covers entire viewport */}
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
                  transition: 'all 0.35s cubic-bezier(0.33, 1, 0.68, 1)'
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

        {/* Synchronized Highlighter Outline Ring */}
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
              transition: 'all 0.35s cubic-bezier(0.33, 1, 0.68, 1)'
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
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
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
                  {currentStep.stepLabel || currentStep.badge || `Step ${currentStepIndex + 1}/${activeSteps.length}`}
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
                {activeSteps.map((_, idx) => (
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

            {/* Micro Keyboard Hints Badge (Hidden on mobile/touch screens, grouped prev/next on left, esc on right) */}
            <div className="mt-2.5 pt-2 border-t border-[var(--border-color)]/60 hidden sm:flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)] select-none">
              <div className="flex items-center gap-2.5">
                <span><kbd className="px-1 py-0.2 bg-[var(--bg-main)] rounded border border-[var(--border-color)] font-bold">←</kbd> Prev</span>
                <span><kbd className="px-1 py-0.2 bg-[var(--bg-main)] rounded border border-[var(--border-color)] font-bold">→</kbd> Next</span>
              </div>
              <div>
                <span><kbd className="px-1 py-0.2 bg-[var(--bg-main)] rounded border border-[var(--border-color)] font-bold">Esc</kbd> Exit</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
