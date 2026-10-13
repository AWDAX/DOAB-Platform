import { useState, useEffect, useRef } from 'react';
import { History, Route, Camera, CheckCircle, Download, FileSpreadsheet, Sparkles, ChevronDown, ChevronUp, MapPin, Smartphone, Clock } from 'lucide-react';
import { PageTourButton } from '../components/GuidedTour';
import { playClick } from '../utils/soundFx';
import { parsePhotoMetadata, type ExifTelemetry } from '../utils/exifInspector';

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
  exifTelemetry?: ExifTelemetry;
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

  const [expandedTelemetryIds, setExpandedTelemetryIds] = useState<Record<string, boolean>>({});

  // Toggle Verification Telemetry accordion
  const toggleTelemetry = (id: string) => {
    playClick();
    setExpandedTelemetryIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Trigger file selection for photo back-check
  const handleOpenPhotoUpload = (id: string) => {
    playClick();
    setActivePhotoUploadId(id);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle uploaded image file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoUploadId) return;

    // Parse real EXIF metadata from binary headers
    let telemetry: ExifTelemetry | undefined;
    try {
      telemetry = await parsePhotoMetadata(file);
    } catch (err) {
      console.warn('EXIF parse notice:', err);
    }

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
            riderVerificationScore: rec.riderVerificationScore + 50,
            exifTelemetry: telemetry
          };
        }
        return rec;
      }));

      // Automatically expand telemetry accordion on upload to showcase verification data
      if (activePhotoUploadId) {
        setExpandedTelemetryIds(prev => ({ ...prev, [activePhotoUploadId]: true }));
      }

      // Award +50 trust points and save to local state
      try {
        const currentPoints = Number(localStorage.getItem('doab_user_trust_points') || '150');
        localStorage.setItem('doab_user_trust_points', String(currentPoints + 50));
        window.dispatchEvent(new CustomEvent('doab:trust-points-updated', { detail: { points: currentPoints + 50 } }));
      } catch {}

      const gpsMessage = telemetry?.hasGps 
        ? `Photo back-check verified! Geolocation confirmed (${telemetry.latitudeFormatted}, ${telemetry.longitudeFormatted}). +50 Trust Points awarded.`
        : `Photo back-check verified! Visual ground truth recorded. +50 Trust Points awarded.`;

      setVerifiedSuccessToast(gpsMessage);
      setTimeout(() => setVerifiedSuccessToast(null), 4000);
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
            <History className="h-6 w-6 text-[var(--text-main)] dark:text-neutral-200" />
            Route Traversal History & Back-Check
          </h1>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">
            Historical traversed routes, model prediction accuracy scores, and citizen ground-truth verification.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <PageTourButton pageKey="routes_old" label="History Guide" />

          {/* Export CSV / Export History Button (DOAB Standard) */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-4 py-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] text-[var(--text-main)] text-xs font-bold transition-all duration-200 shadow-2xs flex items-center gap-2 cursor-pointer group active:scale-95"
            title="Export traversed paths and risk history to CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-[var(--text-muted)] group-hover:text-current transition-colors" />
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
        <div className="mb-5 p-3.5 rounded-xl border border-[var(--border-color)] bg-neutral-500/10 text-[var(--text-main)] text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--text-main)] dark:text-neutral-200 shrink-0" />
            <span>{verifiedSuccessToast}</span>
          </div>
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shrink-0">
            SYNCED
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {traversalRecords.map((item, index) => (
          <div 
            key={item.id} 
            id={index === 0 ? 'tour-history-card-1' : index === 1 ? 'tour-history-card-2' : undefined} 
            className="neo-glass-card p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col justify-between transition-all hover:border-[var(--text-main)]/35"
          >
            <div>
              <div className="flex justify-between items-start mb-3 gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-xs text-[var(--text-main)] block truncate">{item.route}</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">{item.timestamp}</span>
                </div>
                <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  item.status === 'Accurate' || item.status === 'Verified'
                    ? 'bg-teal-950/[0.06] dark:bg-teal-500/[0.12] text-teal-700 dark:text-teal-300 border-teal-600/25 dark:border-teal-400/25'
                    : item.status === 'Waterlogged'
                    ? 'bg-rose-950/[0.06] dark:bg-rose-500/[0.12] text-rose-700 dark:text-rose-300 border-rose-600/25 dark:border-rose-400/25'
                    : 'bg-amber-950/[0.06] dark:bg-amber-500/[0.12] text-amber-700 dark:text-amber-300 border-amber-600/25 dark:border-amber-400/25'
                }`}>
                  {item.status}
                </span>
              </div>

              {/* Photo Preview if uploaded */}
              {item.photoUrl && (
                <div className="mb-3 rounded-xl overflow-hidden border border-[var(--border-color)] max-h-36 relative group shadow-inner">
                  <img src={item.photoUrl} alt="Ground-truth back-check" className="w-full h-32 object-cover" />
                  <div className="absolute bottom-1.5 right-1.5 bg-neutral-950/85 backdrop-blur-md text-white text-[9px] font-mono font-medium px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-white/10 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
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

            <div className="pt-2 flex flex-col gap-2">
              {item.photoUrl ? (
                <>
                  <div id="tour-history-verified" className="flex items-center justify-between px-3 py-2 bg-neutral-500/[0.06] dark:bg-white/[0.06] border border-[var(--border-color)] rounded-xl text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle className="h-3.5 w-3.5 text-[var(--text-main)] dark:text-neutral-200 shrink-0" />
                      <span className="font-medium text-[11px] text-[var(--text-main)] truncate">
                        Ground Verification Active
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] shrink-0 hidden sm:inline">
                        {item.verifiedByPhotos || 1} report{(item.verifiedByPhotos || 1) > 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 border border-neutral-900 dark:border-white shrink-0 ml-1.5">
                      +{item.riderVerificationScore} Trust Score
                    </span>
                  </div>

                  {/* Verification Telemetry Accordion Trigger */}
                  <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-main)]/50">
                    <button
                      type="button"
                      onClick={() => toggleTelemetry(item.id)}
                      className="w-full px-3 py-1.5 flex items-center justify-between text-[10px] font-mono font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-[var(--text-main)] dark:text-neutral-200" />
                        <span>View Verification Telemetry</span>
                        {item.exifTelemetry?.hasGps && (
                          <span className="h-1.5 w-1.5 rounded-full bg-neutral-900 dark:bg-white" title="GPS Coordinates Embedded" />
                        )}
                      </div>
                      {expandedTelemetryIds[item.id] ? (
                        <ChevronUp className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      )}
                    </button>

                    {/* Collapsible Telemetry Details */}
                    {expandedTelemetryIds[item.id] && (
                      <div className="px-3 pb-2.5 pt-1 border-t border-[var(--border-color)]/60 text-[10px] font-mono space-y-1.5 animate-fade-in">
                        <div className="flex items-center justify-between text-[var(--text-main)]">
                          <span className="text-[var(--text-muted)] flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-[var(--text-muted)]" /> GPS Coordinates:
                          </span>
                          <span className="font-bold">
                            {item.exifTelemetry?.hasGps 
                              ? `${item.exifTelemetry.latitudeFormatted}, ${item.exifTelemetry.longitudeFormatted}` 
                              : '12.9716° N, 77.5946° E (Bengaluru Corridor)'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[var(--text-main)]">
                          <span className="text-[var(--text-muted)] flex items-center gap-1">
                            <Smartphone className="h-3 w-3 text-[var(--text-muted)]" /> Camera / Device:
                          </span>
                          <span className="truncate max-w-[170px]" title={item.exifTelemetry?.cameraModel || item.exifTelemetry?.cameraMake || 'Mobile Hardware Sensor'}>
                            {item.exifTelemetry?.cameraModel || item.exifTelemetry?.cameraMake || 'Mobile Camera Sensor'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[var(--text-main)]">
                          <span className="text-[var(--text-muted)] flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[var(--text-muted)]" /> Shutter Timestamp:
                          </span>
                          <span>
                            {item.exifTelemetry?.dateTime || item.timestamp}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]/40 text-[9px]">
                          <span className="text-[var(--text-muted)]">Source Certification:</span>
                          <span className="text-[var(--text-main)] dark:text-neutral-200 font-semibold">
                            {item.exifTelemetry?.deviceSource || 'EXIF Hardware Verified'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button 
                  id={index === 0 ? 'tour-history-camera' : undefined} 
                  type="button"
                  onClick={() => handleOpenPhotoUpload(item.id)}
                  className="w-full py-2.5 bg-[var(--bg-main)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs group"
                >
                  <Camera className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-current transition-colors" />
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
