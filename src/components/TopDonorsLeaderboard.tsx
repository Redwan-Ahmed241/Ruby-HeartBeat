import React, { useState, useMemo } from "react";
import {
  Trophy,
  Award,
  Medal,
  Sparkles,
  MapPin,
  Calendar,
  Search,
  Filter,
  Users,
  ShieldAlert,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { useTopDonors } from "@/hooks/useDonor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatBloodGroup } from "@/lib/formatters";
import { CANONICAL_BLOOD_GROUPS, toDisplayBloodGroup } from "@/lib/api/types";
import type { BloodGroup, TopDonorResponse } from "@/lib/api/types";

interface TopDonorsLeaderboardProps {
  limit?: number;
  className?: string;
  showPodium?: boolean;
}

interface TierStyle {
  badgeBg: string;
  border: string;
  glow: string;
  text: string;
}

const DEFAULT_TIER_STYLE: TierStyle = {
  badgeBg: "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700",
  border: "border-amber-500/60 dark:border-amber-600",
  glow: "shadow-amber-500/10",
  text: "text-amber-700 dark:text-amber-400",
};

const TIER_STYLES: Record<string, TierStyle> = {
  Diamond: {
    badgeBg: "bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-700",
    border: "border-purple-400 dark:border-purple-600",
    glow: "shadow-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
  },
  Platinum: {
    badgeBg: "bg-cyan-100 text-cyan-900 dark:bg-cyan-950/70 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700",
    border: "border-cyan-400 dark:border-cyan-600",
    glow: "shadow-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
  },
  Silver: {
    badgeBg: "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700",
    border: "border-slate-400 dark:border-slate-500",
    glow: "shadow-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
  },
  Bronze: DEFAULT_TIER_STYLE,
};

const TIERS = [
  {
    key: "DIAMOND",
    label: "💎 Diamond (10+)",
    shortLabel: "Diamond",
    inactiveClass: "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50 border-purple-200 dark:border-purple-800",
    activeClass: "bg-purple-600 text-white dark:bg-purple-500 dark:text-white border-purple-600 dark:border-purple-500 shadow-sm ring-2 ring-purple-400/70 ring-offset-1 dark:ring-offset-background",
  },
  {
    key: "PLATINUM",
    label: "⚡ Platinum (6–9)",
    shortLabel: "Platinum",
    inactiveClass: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-900/50 border-cyan-200 dark:border-cyan-800",
    activeClass: "bg-cyan-600 text-white dark:bg-cyan-500 dark:text-white border-cyan-600 dark:border-cyan-500 shadow-sm ring-2 ring-cyan-400/70 ring-offset-1 dark:ring-offset-background",
  },
  {
    key: "SILVER",
    label: "🥈 Silver (3–5)",
    shortLabel: "Silver",
    inactiveClass: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700",
    activeClass: "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 border-slate-700 dark:border-slate-200 shadow-sm ring-2 ring-slate-400/70 ring-offset-1 dark:ring-offset-background",
  },
  {
    key: "BRONZE",
    label: "🥉 Bronze (1–2)",
    shortLabel: "Bronze",
    inactiveClass: "bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 border-amber-200 dark:border-amber-800",
    activeClass: "bg-amber-600 text-white dark:bg-amber-500 dark:text-white border-amber-600 dark:border-amber-500 shadow-sm ring-2 ring-amber-400/70 ring-offset-1 dark:ring-offset-background",
  },
] as const;

function getTierStyle(tier: string): TierStyle {
  return TIER_STYLES[tier] ?? DEFAULT_TIER_STYLE;
}

export function TopDonorsLeaderboard({
  limit = 25,
  className = "",
  showPodium = true,
}: TopDonorsLeaderboardProps) {
  const { data: donors = [], isLoading, isError, refetch } = useTopDonors(limit);
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredDonors = useMemo(() => {
    return donors.filter((donor) => {
      // Filter by tier
      if (selectedTier !== "ALL") {
        const donorTier = donor.tier ? donor.tier.trim().toUpperCase() : "";
        const targetTier = selectedTier.trim().toUpperCase();
        if (donorTier !== targetTier) {
          return false;
        }
      }
      // Filter by blood group (handles canonical UI strings like 'O+' vs API enum strings like 'O_POSITIVE' or 'O_PLUS')
      if (selectedBloodGroup !== "ALL") {
        const donorDisplay = toDisplayBloodGroup(donor.blood_group).trim().toUpperCase();
        const targetDisplay = toDisplayBloodGroup(selectedBloodGroup).trim().toUpperCase();
        if (donorDisplay !== targetDisplay) {
          return false;
        }
      }
      // Filter by query (name, district, area, or blood group)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = donor.full_name ? donor.full_name.toLowerCase().includes(q) : false;
        const matchesArea = donor.area_zone ? donor.area_zone.toLowerCase().includes(q) : false;
        const donorDisplay = toDisplayBloodGroup(donor.blood_group).toLowerCase();
        const matchesBlood = donorDisplay.includes(q) || donor.blood_group.toLowerCase().includes(q);
        if (!matchesName && !matchesArea && !matchesBlood) return false;
      }
      return true;
    });
  }, [donors, selectedTier, selectedBloodGroup, searchQuery]);

  const topThree = useMemo(() => {
    if (!showPodium || selectedTier !== "ALL" || selectedBloodGroup !== "ALL" || searchQuery.trim()) {
      return [];
    }
    return filteredDonors.slice(0, 3);
  }, [filteredDonors, showPodium, selectedTier, selectedBloodGroup, searchQuery]);

  const remainingDonors = useMemo(() => {
    if (topThree.length > 0) {
      return filteredDonors.slice(3);
    }
    return filteredDonors;
  }, [filteredDonors, topThree]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Tier Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-semibold mb-2">
            <Trophy className="w-3.5 h-3.5" />
            Top Life-Savers Leaderboard
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Top Donors & Rankings
          </h2>
          <p className="text-sm text-muted-foreground">
            Ranked by verified completed donations & achievement milestones.
          </p>
        </div>

        {/* Tier Badges Legend & Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {selectedTier !== "ALL" && (
            <button
              type="button"
              onClick={() => setSelectedTier("ALL")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
              title="Clear tier filter and show all donors"
            >
              <X className="w-3 h-3" />
              All Tiers
            </button>
          )}
          {TIERS.map((tier) => {
            const isSelected = selectedTier === tier.key;
            return (
              <button
                key={tier.key}
                type="button"
                onClick={() => setSelectedTier((prev) => (prev === tier.key ? "ALL" : tier.key))}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-all hover:scale-105 active:scale-95 select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? `${tier.activeClass} font-semibold`
                    : `${tier.inactiveClass}`
                )}
                aria-pressed={isSelected}
                title={
                  isSelected
                    ? `Active filter: click to clear ${tier.shortLabel} filter`
                    : `Filter leaderboard by ${tier.shortLabel} tier`
                }
              >
                {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                {tier.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Controls */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search donor name or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-sm"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="w-[140px] text-xs cursor-pointer">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Tiers</SelectItem>
                <SelectItem value="DIAMOND">💎 Diamond (10+)</SelectItem>
                <SelectItem value="PLATINUM">⚡ Platinum (6–9)</SelectItem>
                <SelectItem value="SILVER">🥈 Silver (3–5)</SelectItem>
                <SelectItem value="BRONZE">🥉 Bronze (1–2)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedBloodGroup} onValueChange={setSelectedBloodGroup}>
              <SelectTrigger className="w-[130px] text-xs cursor-pointer">
                <SelectValue placeholder="Blood Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Groups</SelectItem>
                {CANONICAL_BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg} value={bg}>
                    {formatBloodGroup(bg)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(selectedTier !== "ALL" || selectedBloodGroup !== "ALL" || searchQuery.trim()) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTier("ALL");
                  setSelectedBloodGroup("ALL");
                  setSearchQuery("");
                }}
                className="text-xs h-9 px-2.5 text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <Card className="border-destructive/30 bg-destructive/5 text-center p-6">
          <ShieldAlert className="w-10 h-10 text-destructive mx-auto mb-2" />
          <h3 className="font-semibold text-foreground">Could not load leaderboard</h3>
          <p className="text-sm text-muted-foreground mb-4">
            There was an issue fetching the latest top donors ranking.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      )}

      {!isLoading && !isError && donors.length === 0 && (
        <Card className="text-center p-8">
          <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-base font-semibold">No verified donations yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
            Be the first donor to donate blood and claim the #1 spot on the leaderboard!
          </p>
        </Card>
      )}

      {/* Top 3 Podium (When unfiltered) */}
      {!isLoading && !isError && topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2 pb-2">
          {/* #2 Silver Position */}
          {topThree[1] && (
            <PodiumCard
              rank={2}
              donor={topThree[1]}
              rankLabel="2nd"
              colorClass="border-slate-300 dark:border-slate-700 bg-gradient-to-b from-slate-50 to-card dark:from-slate-900/40 dark:to-card"
              crownEmoji="🥈"
            />
          )}

          {/* #1 Diamond / Champion Position */}
          {topThree[0] && (
            <PodiumCard
              rank={1}
              donor={topThree[0]}
              rankLabel="1st"
              isChampion
              colorClass="border-amber-400/80 dark:border-amber-500 bg-gradient-to-b from-amber-50/80 to-card dark:from-amber-950/30 dark:to-card shadow-lg shadow-amber-500/10"
              crownEmoji="👑"
            />
          )}

          {/* #3 Bronze Position */}
          {topThree[2] && (
            <PodiumCard
              rank={3}
              donor={topThree[2]}
              rankLabel="3rd"
              colorClass="border-amber-600/40 dark:border-amber-800 bg-gradient-to-b from-amber-50/40 to-card dark:from-amber-950/20 dark:to-card"
              crownEmoji="🥉"
            />
          )}
        </div>
      )}

      {/* Full Leaderboard Table / Cards */}
      {!isLoading && !isError && remainingDonors.length > 0 && (
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="p-4 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Medal className="w-4 h-4 text-primary" />
                {topThree.length > 0 ? "Rankings Continued" : "Donor Rankings"}
              </CardTitle>
              <span className="text-xs text-muted-foreground font-medium">
                Showing {filteredDonors.length} {filteredDonors.length === 1 ? "donor" : "donors"}
              </span>
            </div>
          </CardHeader>
          <div className="divide-y divide-border">
            {remainingDonors.map((donor, idx) => {
              const actualRank = topThree.length > 0 ? idx + 4 : idx + 1;
              const tierStyle = getTierStyle(donor.tier);

              return (
                <div
                  key={donor.donor_id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      #{actualRank}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">
                          {donor.full_name}
                        </span>
                        <Badge
                          variant="outline"
                          className="font-bold text-rose-600 border-rose-200 dark:border-rose-800 text-[11px] px-2 py-0"
                        >
                          {formatBloodGroup(donor.blood_group)}
                        </Badge>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${tierStyle.badgeBg}`}
                        >
                          {donor.badge_icon} {donor.tier} Donor
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {donor.area_zone && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {donor.area_zone}
                          </span>
                        )}
                        {donor.last_donation_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Last: {donor.last_donation_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:text-right self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">
                        {donor.donation_count} {donor.donation_count === 1 ? "Donation" : "Donations"}
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Verified Completed
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* When filtering returns 0 results */}
      {!isLoading && !isError && donors.length > 0 && filteredDonors.length === 0 && (
        <Card className="text-center p-8">
          <p className="text-sm text-muted-foreground">
            No donors match the selected filters. Try clearing filters or searching for another term.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setSelectedTier("ALL");
              setSelectedBloodGroup("ALL");
              setSearchQuery("");
            }}
          >
            Reset Filters
          </Button>
        </Card>
      )}
    </div>
  );
}

function PodiumCard({
  rank,
  donor,
  rankLabel,
  colorClass,
  crownEmoji,
  isChampion = false,
}: {
  rank: number;
  donor: TopDonorResponse;
  rankLabel: string;
  colorClass: string;
  crownEmoji: string;
  isChampion?: boolean;
}) {
  const tierStyle = getTierStyle(donor.tier);

  return (
    <Card className={`relative border-2 ${colorClass} ${isChampion ? "md:-translate-y-2" : ""}`}>
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm flex items-center gap-1 bg-card text-foreground">
        <span>{crownEmoji}</span>
        <span>Rank #{rank}</span>
      </div>

      <CardContent className="pt-6 pb-5 px-4 text-center">
        <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-xl bg-primary/10 border border-primary/20">
          {donor.badge_icon}
        </div>

        <h4 className="font-bold text-base text-foreground truncate">{donor.full_name}</h4>

        <div className="flex items-center justify-center gap-1.5 mt-1 mb-3">
          <Badge
            variant="outline"
            className="font-bold text-rose-600 border-rose-300 dark:border-rose-800 text-xs px-2"
          >
            {formatBloodGroup(donor.blood_group)}
          </Badge>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${tierStyle.badgeBg}`}
          >
            {donor.tier}
          </span>
        </div>

        <div className="pt-2 border-t border-border/60">
          <div className="text-xl font-extrabold text-foreground">
            {donor.donation_count}
          </div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            Completed Donations
          </div>
        </div>

        {donor.area_zone && (
          <div className="mt-2 text-xs text-muted-foreground flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{donor.area_zone}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
