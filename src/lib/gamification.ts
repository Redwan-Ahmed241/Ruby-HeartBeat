/**
 * Dynamic Donor Gamification Tiers and Progression System
 *
 * Standardized Tier Thresholds (Doc Section 8):
 * - 0 donations:     New Donor (Slate badge) 🩸
 * - 1 – 2 donations: Bronze Donor (Amber/Bronze accent) 🥉
 * - 3 – 5 donations: Silver Donor (Slate/Silver accent) 🥈
 * - 6 – 9 donations: Platinum Donor (Cyan/Platinum accent) ⚡
 * - 10+ donations:   Diamond Donor (Purple/Diamond accent, highest honor) 💎
 */

export type DonorTier = 'New' | 'Bronze' | 'Silver' | 'Platinum' | 'Diamond';

export interface DonorTierInfo {
  name: DonorTier;
  title: string;
  badgeColor: string;
  borderAccent: string;
  icon: string;
  currentCount: number;
  nextTier?: DonorTier;
  nextTierThreshold?: number;
  remainingToNext?: number;
  progressPercent: number;
}

export function getDonorTier(count: number): DonorTierInfo {
  const safeCount = Math.max(0, count || 0);

  if (safeCount >= 10) {
    return {
      name: 'Diamond',
      title: 'Diamond Donor',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      borderAccent: 'border-purple-500',
      icon: '💎',
      currentCount: safeCount,
      progressPercent: 100,
    };
  }

  if (safeCount >= 6) {
    const nextTierThreshold = 10;
    const remainingToNext = nextTierThreshold - safeCount;
    const progressPercent = Math.round(((safeCount - 6) / (nextTierThreshold - 6)) * 100);
    return {
      name: 'Platinum',
      title: 'Platinum Donor',
      badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
      borderAccent: 'border-cyan-500',
      icon: '⚡',
      currentCount: safeCount,
      nextTier: 'Diamond',
      nextTierThreshold,
      remainingToNext,
      progressPercent,
    };
  }

  if (safeCount >= 3) {
    const nextTierThreshold = 6;
    const remainingToNext = nextTierThreshold - safeCount;
    const progressPercent = Math.round(((safeCount - 3) / (nextTierThreshold - 3)) * 100);
    return {
      name: 'Silver',
      title: 'Silver Donor',
      badgeColor: 'bg-slate-200 text-slate-900 border-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
      borderAccent: 'border-slate-400',
      icon: '🥈',
      currentCount: safeCount,
      nextTier: 'Platinum',
      nextTierThreshold,
      remainingToNext,
      progressPercent,
    };
  }

  if (safeCount >= 1) {
    const nextTierThreshold = 3;
    const remainingToNext = nextTierThreshold - safeCount;
    const progressPercent = Math.round(((safeCount - 1) / (nextTierThreshold - 1)) * 100);
    return {
      name: 'Bronze',
      title: 'Bronze Donor',
      badgeColor: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
      borderAccent: 'border-orange-500',
      icon: '🥉',
      currentCount: safeCount,
      nextTier: 'Silver',
      nextTierThreshold,
      remainingToNext,
      progressPercent,
    };
  }

  // 0 donations
  return {
    name: 'New',
    title: 'New Donor',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800',
    borderAccent: 'border-slate-300',
    icon: '🩸',
    currentCount: 0,
    nextTier: 'Bronze',
    nextTierThreshold: 1,
    remainingToNext: 1,
    progressPercent: 0,
  };
}

