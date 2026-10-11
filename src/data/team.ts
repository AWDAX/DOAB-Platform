export interface TeamMember {
  id: string;
  name: string;
  role: string;
  title: string;
  domain: string;
  college?: string;
  bio: string;
  avatar?: string;
  fallbackAvatar: string;
  tags: string[];
  github?: string;
  linkedin?: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'member-1',
    name: 'Suneet Chugh',
    role: 'Team Lead',
    title: 'TEAM LEAD • DUAL GIS, DEV & DEVOPS',
    domain: 'Dual GIS (2D/3D), Full-Stack Dev, DevOps & Platform Architecture',
    college: 'Engineering & Technology',
    bio: 'Leads the team, platform architecture, and research. Implemented both 2D Leaflet and 3D MapLibre GPU Vector engines, full-stack development, and automated cloud DevOps infrastructure for the DOAB grid.',
    avatar: '/team/suneet-chugh.jpg',
    fallbackAvatar: 'https://ui-avatars.com/api/?name=Suneet+Chugh&background=0284c7&color=fff',
    tags: ['Dual GIS (2D & 3D)', 'Full-Stack Dev', 'DevOps', 'MapLibre 3D & Leaflet', 'Platform Architecture', 'React 19', 'Civic Research'],
    github: 'https://github.com/suneetchugh-dev',
    linkedin: 'https://www.linkedin.com/in/suneetchugh-dev/'
  },
  {
    id: 'member-2',
    name: 'Sarvapriya Harsh',
    role: 'ML & Backend Developer',
    title: 'BACKEND AND ML DEVELOPER',
    domain: 'Predictive Machine Learning & Hydrological Intelligence',
    college: 'Engineering & Technology',
    bio: 'Architected predictive machine learning pipelines, hydrological risk algorithms, ultrasonic depth telemetry processing, and backend service clusters.',
    avatar: '/team/sarvapriya-harsh.jpg',
    fallbackAvatar: 'https://ui-avatars.com/api/?name=Sarvapriya+Harsh&background=0284c7&color=fff',
    tags: ['Python', 'FastAPI', 'PyTorch ML', 'Hydrology Models', 'PostgreSQL'],
    github: 'https://github.com/sarvapriya12',
    linkedin: 'https://www.linkedin.com/in/sarvapriya-harsh/'
  },
  {
    id: 'member-3',
    name: 'Harshit Chauhan',
    role: 'UI/UX Developer',
    title: 'UI/UX DESIGN & FRONTEND DEVELOPER',
    domain: 'Product Design, Kinetic Motion & Civic UX',
    college: 'Engineering & Technology',
    bio: 'Crafted the tactile design system, dual-climate high-contrast visual hierarchy, kinetic animations, and life-safety SOS broadcast interfaces.',
    avatar: '/team/harshit-chauhan.jpg',
    fallbackAvatar: 'https://ui-avatars.com/api/?name=Harshit+Chauhan&background=d97706&color=fff',
    tags: ['Design Systems', 'Framer Motion', 'Emergency UX', 'Tailwind CSS', 'Accessibility'],
    github: 'https://github.com/harsh4k',
    linkedin: 'https://www.linkedin.com/in/harshitchauhan-dev/'
  },
  {
    id: 'member-4',
    name: 'Jatin Jha',
    role: 'Full-Stack Developer',
    title: 'FULL-STACK DEVELOPER & DEVOPS',
    domain: 'Full-Stack Development, Cloud Infrastructure & DevOps',
    college: 'Engineering & Technology',
    bio: 'Spearheaded full-stack system implementation, distributed cloud deployments, high-throughput WebSocket streams, and automated DevOps infrastructure.',
    avatar: '/team/jatin-jha.jpg',
    fallbackAvatar: 'https://ui-avatars.com/api/?name=Jatin+Jha&background=0284c7&color=fff',
    tags: ['Cloud Infrastructure', 'DevOps', 'Docker', 'WebSockets', 'Full-Stack Dev'],
    github: 'https://github.com/jatin0jha',
    linkedin: 'https://www.linkedin.com/in/jhajatin/'
  }
];

export const PROJECT_DETAILS = {
  name: 'DOAB (Two Waters Response System)',
  teamName: 'Contrarians',
  theme: 'Environmental Civic Life-Safety Grid',
  category: 'Software & IoT Edition'
};

export const PLATFORM_STATS = [
  {
    label: 'Monitored Wards',
    value: '24 Wards',
    detail: 'Ranchi Municipal Grid'
  },
  {
    label: 'Telemetry Refresh',
    value: '<120ms',
    detail: 'Real-time WebSocket sync'
  },
  {
    label: 'Reroute Accuracy',
    value: 'Sub-400m',
    detail: 'Elevation-calibrated bypass'
  },
  {
    label: 'Bounty System',
    value: 'Automated',
    detail: '₹5,000 Plumber & Tanker Orders'
  }
];

export const CORE_PILLARS = [
  {
    title: 'Dual-State Environmental Engine',
    desc: 'Dynamically adapts between Monsoon (flood submersion, drainage choke) and Scarcity (groundwater deficit, tanker demand) based on live meteorological data.'
  },
  {
    title: 'Low-Clearance Rider Protection',
    desc: 'Turn-by-turn flood-avoidance rerouting calculating high-elevation bypasses to protect two-wheelers, gig delivery riders, and civic commuters.'
  },
  {
    title: 'Decentralized Ground-Truth Back-Check',
    desc: 'Citizen photo verification mechanism that rewards commuters with civic trust points while feeding verified ground elevation data back into the AI model.'
  }
];
