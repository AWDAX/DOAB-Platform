import { useState } from 'react';
import { History, Route, Camera, CheckCircle, Download, FileSpreadsheet } from 'lucide-react';
import { playClick } from '../utils/soundFx';

const SAMPLE_TRAVERSED_HISTORY = [
  {
    id: 'TRV-2026-001',
    route: 'MG Road to Railway Hub',
    timestamp: '2026-10-10 18:42',
    predictedRiskPercent: 8.5,
    riskClassification: 'Safe',
    actualEncounter: 'Clear Dry',
    floodDepthCm: 0,
    status: 'Accurate',
    elevationMarginM: 14.2,
    riderVerificationScore: 50
  },
  {
    id: 'TRV-2026-002',
    route: 'Ward 14 South Link',
    timestamp: '2026-10-09 09:15',
    predictedRiskPercent: 62.0,
    riskClassification: 'High',
    actualEncounter: '1.8ft Flood',
    floodDepthCm: 55,
    status: 'Waterlogged',
    elevationMarginM: -1.8,
    riderVerificationScore: 50
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
    riderVerificationScore: 35
  }
];

export default function OldRoutesPage() {
  const [isExporting, setIsExporting] = useState(false);

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
        'Trust Points Earned'
      ];

      const rows = SAMPLE_TRAVERSED_HISTORY.map((item) => [
        `"${item.id}"`,
        `"${item.route}"`,
        `"${item.timestamp}"`,
        item.predictedRiskPercent,
        `"${item.riskClassification}"`,
        `"${item.actualEncounter}"`,
        item.floodDepthCm,
        `"${item.status}"`,
        item.elevationMarginM,
        item.riderVerificationScore
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

        {/* Export CSV / Export History Button (SAHNIRMAAN / SWATVA Standard) */}
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={isExporting}
          className="self-start sm:self-auto px-4 py-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--text-main)] hover:text-[var(--bg-card)] text-[var(--text-main)] text-xs font-bold transition-all duration-200 shadow-2xs flex items-center gap-2 cursor-pointer group shrink-0 active:scale-95"
          title="Export traversed paths and risk history to CSV"
        >
          <FileSpreadsheet className="h-4 w-4 text-[var(--color-brand-accent)] group-hover:text-current transition-colors" />
          <span>{isExporting ? 'Generating CSV...' : 'Export History (CSV)'}</span>
          <Download className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-current transition-colors" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Sample Past Traversed Route 1 */}
        <div id="tour-history-card-1" className="neo-glass-card p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3 gap-2">
              <div className="min-w-0">
                <span className="font-bold text-xs text-[var(--text-main)] block truncate">MG Road to Railway Hub</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Completed Yesterday • 18:42</span>
              </div>
              <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--text-main)]/10 text-[var(--text-main)] shrink-0">
                Accurate
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4 p-3.5 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] text-xs text-center">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">Predicted Risk</span>
                <span className="font-mono font-bold text-[var(--text-main)]">8.5% (Safe)</span>
              </div>
              <div className="border-l border-[var(--border-color)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Actual Encounter</span>
                <span className="font-mono font-bold text-[var(--text-main)]">Clear Dry</span>
              </div>
            </div>
          </div>

          <button id="tour-history-camera" className="w-full mt-3 py-2.5 bg-[var(--bg-main)] hover:bg-[var(--text-main)]/5 border border-[var(--border-color)] text-[var(--text-main)] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer">
            <Camera className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            Submit Photo Back-Check
          </button>
        </div>

        {/* Sample Past Traversed Route 2 */}
        <div id="tour-history-card-2" className="neo-glass-card p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3 gap-2">
              <div className="min-w-0">
                <span className="font-bold text-xs text-[var(--text-main)] block truncate">Ward 14 South Link</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Completed 2 days ago</span>
              </div>
              <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)] shrink-0">
                Waterlogged
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4 p-3.5 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] text-xs text-center">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">Predicted Risk</span>
                <span className="font-mono font-bold text-[var(--text-main)]">62.0% (High)</span>
              </div>
              <div className="border-l border-[var(--border-color)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Actual Encounter</span>
                <span className="font-mono font-bold text-[var(--text-muted)]">1.8ft Flood</span>
              </div>
            </div>
          </div>

          <div id="tour-history-verified" className="mt-3 flex items-center justify-between px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)]">
            <span className="flex items-center gap-1.5 font-medium text-[11px]">
              <CheckCircle className="h-3.5 w-3.5 text-[var(--text-main)] shrink-0" />
              Photo verified by 3 riders
            </span>
            <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded-full bg-[var(--text-main)] text-[var(--bg-card)] shrink-0">+50 pts</span>
          </div>
        </div>

        {/* Empty / Add more placeholder */}
        <div id="tour-history-sync" className="neo-glass-card p-6 rounded-2xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
          <div className="h-11 w-11 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] flex items-center justify-center mb-3.5 mx-auto">
            <Route className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
          <span className="font-bold text-xs text-[var(--text-main)] mb-1">Automatic Trip Logging</span>
          <span className="text-[11px] text-[var(--text-muted)] leading-relaxed max-w-xs mx-auto">
            As you navigate with background geofencing enabled, new routes and risk back-checks will auto-sync here.
          </span>
        </div>
      </div>
    </div>
  );
}
