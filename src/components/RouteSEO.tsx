import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteMeta {
  title: string;
  description: string;
  path: string;
}

const ROUTE_SEO_MAP: Record<string, RouteMeta> = {
  '/': {
    title: 'DOAB (दोआब) — Dual-Climate Geospatial & Civic Safety Platform',
    description: 'AI-powered municipal flood routing, inundation early warning, and dual-climate civic safety platform. Detect → Order → Alert → Back-check.',
    path: '/'
  },
  '/landing': {
    title: 'DOAB Platform — Dual-Climate Crisis Intelligence & Urban Safety',
    description: 'Explore DOAB: AI-powered municipal intelligence tackling urban floods, waterlogging, and acute drought across India with real-time geospatial telemetry.',
    path: '/landing'
  },
  '/map': {
    title: 'Live 3D Inundation & Hazard Radar — DOAB',
    description: 'Hardware-accelerated 3D terrain and real-time municipal inundation radar. Ground-truth flood clustering, water depth vectors, and sensor feeds.',
    path: '/map'
  },
  '/routes/best': {
    title: 'AI High-Elevation Safe Routes & Evacuation Corridors — DOAB',
    description: 'Dynamic Dijkstra routing over Copernicus DEM ridgelines. Evacuate through high-elevation corridors, avoiding waterlogged underpasses.',
    path: '/routes/best'
  },
  '/routes/old': {
    title: 'Historical Routes & Incident Log — DOAB',
    description: 'Archive of past municipal routes, hazard encounters, and temporal remediation decay analysis.',
    path: '/routes/old'
  },
  '/notifications': {
    title: 'Active Alerts & Emergency Civic Dispatch — DOAB',
    description: 'Real-time flood alerts, rainfall warnings, and municipal civic emergency dispatches across vulnerable zones.',
    path: '/notifications'
  },
  '/assistant': {
    title: 'AI Disaster Copilot & Spatial Crisis Intelligence — DOAB',
    description: 'Intelligent spatial crisis advisory copilot powered by AWS Bedrock / Groq LLaMA 3.3 for real-time safety queries and route recommendations.',
    path: '/assistant'
  },
  '/team': {
    title: 'Meet Team Contrarians — DOAB Platform Architecture & Team',
    description: 'Meet the engineering and architecture team behind DOAB (Detect Order Alert Back-check) built for the WeMakeDevs Hackathon.',
    path: '/team'
  },
  '/profile': {
    title: 'Civic Responder Profile & Safety Preferences — DOAB',
    description: 'Manage responder telemetry preferences, climate operating mode (Flood vs Drought), and offline storage caches.',
    path: '/profile'
  },
  '/login': {
    title: 'Secure Access & Responder Authentication — DOAB',
    description: 'Secure authentication portal for field responders, municipal officers, and civic dispatchers.',
    path: '/login'
  },
  '/dev-admin': {
    title: 'System Diagnostics & Telemetry Dashboard — DOAB Admin',
    description: 'Production monitoring, WebSocket sync metrics, and mock incident generator.',
    path: '/dev-admin'
  }
};

/**
 * RouteSEO - Dynamically synchronizes document title, meta description,
 * OpenGraph, Twitter, and canonical URL on every client-side route navigation.
 */
export default function RouteSEO() {
  const location = useLocation();

  useEffect(() => {
    const meta = ROUTE_SEO_MAP[location.pathname] || {
      title: 'DOAB (दोआब) — Dual-Climate Geospatial & Civic Safety Platform',
      description: 'DOAB (Detect → Order → Alert → Back-check): AI-powered dual-climate municipal flood routing, inundation early warning, and disaster resilience platform.',
      path: location.pathname
    };

    // Update document title
    document.title = meta.title;

    // Update meta description
    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    descTag.setAttribute('content', meta.description);

    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', meta.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', meta.description);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', `https://doab.sahnirmaan.live${meta.path}`);

    // Update Twitter tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', meta.title);

    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute('content', meta.description);

    // Update canonical link
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', `https://doab.sahnirmaan.live${meta.path}`);
  }, [location.pathname]);

  return null;
}
