/**
 * Standardized Date and Time Formatting Utilities for LifeDrop
 */

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "N/A";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return "N/A";
  }
}

export function formatDateOnly(isoString: string | null | undefined): string {
  if (!isoString) return "N/A";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return "N/A";
  }
}

export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Future date guard
    if (diffMs < 0) {
      const futureMins = Math.floor(Math.abs(diffMs) / 60000);
      if (futureMins < 60) return `in ${futureMins}m`;
      const futureHours = Math.floor(futureMins / 60);
      if (futureHours < 24) return `in ${futureHours}h`;
      return formatDateOnly(isoString);
    }

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDateOnly(isoString);
  } catch {
    return "";
  }
}

export function formatExactWithRelative(isoString: string | null | undefined): string {
  if (!isoString) return "N/A";
  const exact = formatDateTime(isoString);
  const relative = formatRelativeTime(isoString);
  if (!relative || relative === "Just now") return exact;
  return `${exact} (${relative})`;
}

export function calculateAge(dobString: string | null | undefined): number | null {
  if (!dobString) return null;
  try {
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}
