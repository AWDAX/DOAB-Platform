import { Bell, AlertCircle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotificationPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar flex flex-col items-center">
      <div id="tour-alerts-header" className="mb-6 w-full max-w-3xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2.5">
          <Bell className="h-6 w-6 text-[var(--color-brand-accent)]" />
          All Civic Alerts
        </h1>
        <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">Ward-level risk telemetry, precipitation updates, and dispatch work orders.</p>
      </div>
      
      <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto">
        {/* Alert 1: Critical Flood Warning */}
        <div id="tour-alerts-critical" className="neo-glass-card p-5 sm:p-6 rounded-2xl flex gap-4 items-start border-l-4 border-l-[var(--text-main)] border border-[var(--border-color)] shadow-sm w-full">
          <div className="h-10 w-10 bg-[var(--text-main)]/10 text-[var(--text-main)] rounded-2xl flex items-center justify-center shrink-0 border border-[var(--border-color)]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex justify-between items-start mb-2 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-[var(--text-main)] text-sm">CRITICAL: Severe Waterlogging</h3>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)]">Ward 14</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                8m ago
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Sensor cluster reports 2.4ft standing water near MG Road junction. Algorithmic rerouting engaged for all citizen & delivery partner units.
            </p>
            <div className="mt-3.5 flex items-center gap-4">
              <Link to="/routes/best" className="text-xs font-bold text-[var(--text-main)] hover:underline uppercase tracking-wider transition-colors">
                View Safe Reroute
              </Link>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('doab:trigger-danger-broadcast'));
                }}
                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline uppercase tracking-wider transition-colors cursor-pointer"
              >
                Test SOS Danger Screen
              </button>
            </div>
          </div>
        </div>

        {/* Alert 2: Tanker Dispatch Notification */}
        <div id="tour-alerts-tanker" className="neo-glass-card p-5 sm:p-6 rounded-2xl flex gap-4 items-start border-l-4 border-l-[var(--text-main)] border border-[var(--border-color)] shadow-sm w-full">
          <div className="h-10 w-10 bg-[var(--bg-main)] text-[var(--text-main)] rounded-2xl flex items-center justify-center shrink-0 border border-[var(--border-color)]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex justify-between items-start mb-2 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-[var(--text-main)] text-sm">DISPATCH: Emergency Tanker Unit</h3>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)]">Bounty Order</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                22m ago
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Drought sensor triggered in Ward 08. Water tanker bounty work order disbursed to registered logistics partner.
            </p>
          </div>
        </div>

        {/* Alert 3: Verified Back-Check */}
        <div id="tour-alerts-backcheck" className="neo-glass-card p-5 sm:p-6 rounded-2xl flex gap-4 items-start border-l-4 border-l-[var(--text-main)] border border-[var(--border-color)] shadow-sm w-full">
          <div className="h-10 w-10 bg-[var(--bg-main)] text-[var(--text-main)] rounded-2xl flex items-center justify-center shrink-0 border border-[var(--border-color)]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex justify-between items-start mb-2 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-[var(--text-main)] text-sm">BACK-CHECK: Road Clear Confirmed</h3>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)]">Verified</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                1h ago
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              5 Citizen photos verified standing water cleared at Ring Road North. Risk score reduced to 4.2%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
