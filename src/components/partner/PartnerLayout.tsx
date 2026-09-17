import { Link } from "@tanstack/react-router";
import {
  Boxes,
  Radio,
  FileBadge,
  ExternalLink,
  Activity,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PartnerLayoutProps {
  children: React.ReactNode;
  activeTab: "inventory" | "needs" | "profile" | "events";
  facilityName?: string;
  licenseId?: string;
  facilitySelector?: React.ReactNode;
}

export function PartnerLayout({
  children,
  activeTab,
  facilityName = "Square Hospital Blood Bank & Transfusion Center",
  licenseId = "DGHS-BB-2024-0891",
  facilitySelector,
}: PartnerLayoutProps) {
  const tabs = [
    {
      id: "inventory",
      label: "Live Reserve Matrix",
      sublabel: "Shift Handover & Units",
      icon: Boxes,
      param: "inventory",
    },
    {
      id: "needs",
      label: "Demand Broadcast",
      sublabel: "Shortage & ICU Alerts",
      icon: Radio,
      param: "needs",
    },
    {
      id: "events",
      label: "Drives & Campaigns",
      sublabel: "Blood Camps & Auto-Sync",
      icon: Calendar,
      param: "events",
    },
    {
      id: "profile",
      label: "Facility Profile",
      sublabel: "Licensing & Dispatch Lines",
      icon: FileBadge,
      param: "profile",
    },
  ] as const;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* 1. Institutional Top Global Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/90 bg-slate-900/95 backdrop-blur-md">
        <div className="w-full max-w-7xl 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-wrap items-center justify-between gap-4">
          {/* Console Branding & Facility Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shrink-0">
              <Activity className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                  LifeDrop Partner Network
                </span>
                <span className="text-slate-600 text-xs">•</span>
                <span className="text-[11px] font-mono text-slate-400 tracking-tight hidden sm:inline">
                  Institutional Console
                </span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <h1 className="text-sm sm:text-base font-bold text-white truncate">
                  {facilityName}
                </h1>
                <Badge
                  variant="outline"
                  className="hidden lg:inline-flex text-[10px] font-mono border-slate-700 bg-slate-800/60 text-slate-300 py-0 px-1.5"
                >
                  {licenseId}
                </Badge>
              </div>
            </div>
          </div>

          {/* Right Section: Facility Switcher, Status Pulse, Consumer Link */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap">
            {facilitySelector && (
              <div className="shrink-0">{facilitySelector}</div>
            )}

            {/* Live Network Status Pulse */}
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="hidden sm:inline font-medium text-[11px]">Live Network Connected</span>
              <span className="sm:hidden font-medium text-[11px]">Live</span>
            </div>

            {/* Quick link back to consumer directory */}
            <Link
              to="/centers"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-teal-300 transition-colors py-1 px-2.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/50"
              title="Open public blood centers view"
            >
              <span className="hidden sm:inline">Public Centers</span>
              <span className="sm:hidden">Centers</span>
              <ExternalLink className="size-3.5 shrink-0" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Institutional Navigation Sub-bar */}
      <div className="w-full border-b border-slate-800 bg-slate-900/60">
        <div className="w-full max-w-7xl 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-2 no-scrollbar" aria-label="Partner Console Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  to="/partner/portal"
                  search={{ tab: tab.param }}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border ${
                    isActive
                      ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-sm"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? "text-teal-400" : "text-slate-500"}`} />
                  <div className="text-left">
                    <div className="leading-tight">{tab.label}</div>
                    <div className="text-[10px] font-normal text-slate-500 hidden md:block">
                      {tab.sublabel}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. Main Workspace Container */}
      <main className="w-full max-w-7xl 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
        {children}
      </main>

      {/* 4. Institutional Minimal Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="w-full max-w-7xl 2xl:max-w-[1560px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="size-4 text-teal-500" />
            <span>Encrypted Hospital & NGO Protocol • DGHS Regulated Blood Bank Infrastructure</span>
          </div>
          <div>
            LifeDrop Institutional Partner Service • Node ID: <span className="font-mono text-slate-400">BD-DHK-HQ-01</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
