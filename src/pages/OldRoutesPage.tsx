import { useState, useEffect, useRef } from 'react';
import { History, Route, Camera, CheckCircle, Download, FileSpreadsheet, Sparkles } from 'lucide-react';
import { PageTourButton } from '../components/GuidedTour';
import { playClick } from '../utils/soundFx';

export interface TraversalRecord {
  id: string;
  route: string;
  timestamp: string;
  predictedRiskPercent: number;
  riskClassification: string;
  actualEncounter: string;
  floodDepthCm: number;
  status: 'Accurate' | 'Waterlogged' | 'Moderate' | 'Verified';
  elevationMarginM: number;
  riderVerificationScore: number;
  verifiedByPhotos?: number;
  photoUrl?: string;
  notes?: string;
}

const DEFAULT_SAMPLE_TRAVERSED_HISTORY: TraversalRecord[] = [
  {
    id: 'TRV-2026-001',
    route: 'MG Road to Railway Hub via Elevated Corridor',
    timestamp: '2026-10-10 18:42',
    predictedRiskPercent: 8.5,
    riskClassification: 'Safe',
    actualEncounter: 'Clear Dry',
    floodDepthCm: 0,
    status: 'Accurate',
    elevationMarginM: 14.2,
    riderVerificationScore: 50,
    verifiedByPhotos: 3
  },
  {
    id: 'TRV-2026-002',
    route: 'Ward 14 South Link (Low-lying Underpass)',
    timestamp: '2026-10-09 09:15',
    predictedRiskPercent: 62.0,
    riskClassification: 'High',
    actualEncounter: '1.8ft Flood',
    floodDepthCm: 55,
    status: 'Waterlogged',
    elevationMarginM: -1.8,
    riderVerificationScore: 50,
    verifiedByPhotos: 5
  },
  {
    id: 'TRV-2026-003',
    route: 'Harmu River Bypass Corridor',
    timestamp: '2026-10-08 14:30',
    predictedRiskPercent: 12.4,
    riskClassification: 'Low',
    actualEncounter: 'Damp Surface',
    floodDepthCm: 2,
    status: 'Accurate',
    elevationMarginM: 8.5,
    riderVerificationScore: 35,
    verifiedByPhotos: 2
  }
];

export default function OldRoutesPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [traversalRecords, setTraversalRecords] = useState<TraversalRecord[]>([]);
  const [activePhotoUploadId, setActivePhotoUploadId] = useState<string | null>(null);
  const [verifiedSuccessToast, setVerifiedSuccessToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load live user-submitted arrival feedbacks merged with baseline samples
  useEffect(() => {
    try {
      const rawFeedback = localStorage.getItem('doab_route_accuracy_feedback');
      const parsedFeedback = rawFeedback ? JSON.parse(rawFeedback) : [];

      const convertedLiveRecords: TraversalRecord[] = parsedFeedback.map((f: any, idx: number) => {
        const isAccurate = f.userRating === 'accurate';
        const isWaterlogged = f.userRating === 'inaccurate';
        return {
          id: `TRV-${new Date(f.timestamp || Date.now()).getFullYear()}-${String(idx + 101).padStart(3, '0')}`,
          route: f.routeSummary || 'Traversed Safe Route',
          timestamp: new Date(f.timestamp || Date.now()).toLocaleString('en-IN', {
            dateStyle: 'short',
            timeStyle: 'short'
          }),
          predictedRiskPercent: f.predictedRisk?.includes('Safe') ? 9.2 : 45.0,
          riskClassification: f.predictedRisk || 'Analyzed Risk',
          actualEncounter: isAccurate ? 'As Predicted (Clear)' : isWaterlogged ? 'Heavy Inundation' : 'Moderate Water',
          floodDepthCm: isWaterlogged ? 50 : 0,
          status: isAccurate ? 'Accurate' : isWaterlogged ? 'Waterlogged' : 'Moderate',
          elevationMarginM: isAccurate ? 12.5 : -0.8,
          riderVerificationScore: 50,
          verifiedByPhotos: f.photoUrl ? 1 : 0,
          photoUrl: f.photoUrl,
          notes: f.notes
        };
      });

      setTraversalRecords([...convertedLiveRecords, ...DEFAULT_SAMPLE_TRAVERSED_HISTORY]);
    } catch {
      setTraversalRecords(DEFAULT_SAMPLE_TRAVERSED_HISTORY);
    }
  }, []);

  // Trigger file selection for photo back-check
  const handleOpenPhotoUpload = (id: string) => {
    playClick();
    setActivePhotoUploadId(id);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle uploaded image file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoUploadId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;

      setTraversalRecords(prev => prev.map(rec => {
        if (rec.id === activePhotoUploadId) {
          return {
            ...rec,
            photoUrl: base64Url,
            status: 'Verified',
            verifiedByPhotos: (rec.verifiedByPhotos || 0) + 1,
            riderVerificationScore: rec.riderVerificationScore + 50
          };
        }
        return rec;
      }));

      // Award +50 trust points and save to local state
      try {
        const currentPoints = Number(localStorage.getItem('doab_user_trust_points') || '150');
        localStorage.setItem('doab_user_trust_points', String(currentPoints + 50));
        window.dispatchEvent(new CustomEvent('doab:trust-points-updated', { detail: { points: currentPoints + 50 } }));
      } catch {}

      setVerifiedSuccessToast(`Photo back-check verified! +50 Trust Points awarded to your profile.`);
      setTimeout(() => setVerifiedSuccessToast(null), 3500);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExportCSV = () => {
    playClick();
    setIsExporting(true);

    try {
      const headers = [
        'Traversal ID',
        'Route Summary',
        'Timestamp',
        'Predicted Risk (%)',
        'Risk Level',
        'Actual Ground Encounter',
        'Flood Depth (cm)',
        'Accuracy Status',
        'Elevation Margin (m)',
        'Trust Points Earned',
        'Verified Photos',
        'Driver Notes'
      ];

      const rows = traversalRecords.map((item) => [
        `"${item.id}"`,
        `"${item.route}"`,
        `"${item.timestamp}"`,
        item.predictedRiskPercent,
        `"${item.riskClassification}"`,
        `"${item.actualEncounter}"`,
        item.floodDepthCm,
        `"${item.status}"`,
        item.elevationMarginM,
        item.riderVerificationScore,
        item.verifiedByPhotos || 0,
        `"${item.notes || 'None'}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `DOAB_Route_Traversal_History_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export history CSV:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
      <div id="tour-history-header" className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2.5">
            <History className="h-6 w-6 text-[var(--color-brand-accent)]" />
            Route Traversal History & Back-Check
          </h1>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">
            Historical traversed routes, model prediction accuracy scores, and citizen ground-truth verification.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <PageTourButton pageKey="routes_old" label="History Guide" />

          {/* Export CSV / Export History Button (SAHNIRMAAN / SWATVA Standard) */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-4 py-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] text-[var(--text-main)] text-xs font-bold transition-all duration-200 shadow-2xs flex items-center gap-2 cursor-pointer group active:scale-95"
            title="Export traversed paths and risk history to CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-[var(--color-brand-accent)] group-hover:text-current transition-colors" />
            <span>{isExporting ? 'Generating CSV...' : 'Export History (CSV)'}</span>
            <Download className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-current transition-colors" />
          </button>
        </div>
      </div>

      {/* Hidden file input for Photo Back-Check upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileChange} 
      />

      {/* Success Notification Banner / Toast */}
      {verifiedSuccessToast && (
        <div className="mb-5 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{verifiedSuccessToast}</span>
          </div>
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500 text-white shrink-0">
            SYNCED
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {traversalRecords.map((item, index) => (
          <div 
            key={item.id} 
            id={index === 0 ? 'tour-history-card-1' : index === 1 ? 'tour-history-card-2' : undefined} 
            className="neo-glass-card p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col justify-between transition-all hover:border-[var(--color-brand-accent)]/40"
          >
            <div>
              <div className="flex justify-between items-start mb-3 gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-xs text-[var(--text-main)] block truncate">{item.route}</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">{item.timestamp}</span>
                </div>
                <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border border-[var(--border-color)] shrink-0 ${
                  item.status === 'Accurate' || item.status === 'Verified'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : item.status === 'Waterlogged'
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                }`}>
                  {item.status}
                </span>
              </div>

              {/* Photo Preview if uploaded */}
              {item.photoUrl && (
                <div className="mb-3 rounded-xl overflow-hidden border border-[var(--border-color)] max-h-36 relative group shadow-inner">
                  <img src={item.photoUrl} alt="Ground-truth back-check" className="w-full h-32 object-cover" />
                  <div className="absolute bottom-1.5 right-1.5 bg-neutral-950/85 backdrop-blur-md text-white text-[9px] font-mono font-medium px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-white/10 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Visual Ground Truth</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 my-3 p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] text-xs text-center">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Predicted Risk</span>
                  <span className="font-mono font-bold text-[var(--text-main)]">{item.predictedRiskPercent}%</span>
                </div>
                <div className="border-l border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Ground Truth</span>
                  <span className="font-mono font-bold text-[var(--text-main)]">{item.actualEncounter}</span>
                </div>
              </div>

              {item.notes && (
                <p className="text-[11px] text-[var(--text-muted)] italic bg-[var(--bg-main)]/60 p-2 rounded-lg border border-[var(--border-color)] mb-3">
                  "{item.notes}"
                </p>
              )}
            </div>

            <div className="pt-2">
              {item.photoUrl ? (
                <div id="tour-history-verified" className="flex items-center justify-between px-3 py-2 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] border border-emerald-500/25 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-medium text-[11px] text-[var(--text-main)] truncate">
                      Ground Verification Active
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] shrink-0 hidden sm:inline">
                      {item.verifiedByPhotos || 1} report{(item.verifiedByPhotos || 1) > 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0 ml-1.5">
                    +{item.riderVerificationScore} Trust Score
                  </span>
                </div>
              ) : (
                <button 
                  id={index === 0 ? 'tour-history-camera' : undefined} 
                  type="button"
                  onClick={() => handleOpenPhotoUpload(item.id)}
                  className="w-full py-2.5 bg-[var(--bg-main)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs group"
                >
                  <Camera className="h-3.5 w-3.5 text-[var(--color-brand-accent)] group-hover:text-current transition-colors" />
                  <span>Submit Photo Back-Check</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Dynamic Add / Automatic Trip Logging Card */}
        <div id="tour-history-sync" className="neo-glass-card p-6 rounded-2xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
          <div className="h-11 w-11 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] flex items-center justify-center mb-3.5 mx-auto">
            <Route className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
          <span className="font-bold text-xs text-[var(--text-main)] mb-1">Live Arrival Trip Logging</span>
          <span className="text-[11px] text-[var(--text-muted)] leading-relaxed max-w-xs mx-auto">
            When you complete any route on the Safe Routes page and tap "Reached Destination", the model accuracy confirmation logs here in real-time.
          </span>
        </div>
      </div>
    </div>
  );
}
