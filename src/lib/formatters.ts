/**
 * Clinical and presentation formatting helpers for LifeDrop.
 */

export function formatBloodGroup(bg: string, style: "symbol" | "full" = "symbol"): string {
  if (!bg) return "";
  const clean = bg.toUpperCase().replace(/\s+/g, "_");
  const map: Record<string, { symbol: string; full: string }> = {
    O_PLUS: { symbol: "O+", full: "O Positive" },
    O_MINUS: { symbol: "O-", full: "O Negative" },
    A_PLUS: { symbol: "A+", full: "A Positive" },
    A_MINUS: { symbol: "A-", full: "A Negative" },
    B_PLUS: { symbol: "B+", full: "B Positive" },
    B_MINUS: { symbol: "B-", full: "B Negative" },
    AB_PLUS: { symbol: "AB+", full: "AB Positive" },
    AB_MINUS: { symbol: "AB-", full: "AB Negative" },
    O_POSITIVE: { symbol: "O+", full: "O Positive" },
    O_NEGATIVE: { symbol: "O-", full: "O Negative" },
    A_POSITIVE: { symbol: "A+", full: "A Positive" },
    A_NEGATIVE: { symbol: "A-", full: "A Negative" },
    B_POSITIVE: { symbol: "B+", full: "B Positive" },
    B_NEGATIVE: { symbol: "B-", full: "B Negative" },
    AB_POSITIVE: { symbol: "AB+", full: "AB Positive" },
    AB_NEGATIVE: { symbol: "AB-", full: "AB Negative" },
    // Symbol-based fallbacks
    "O+": { symbol: "O+", full: "O Positive" },
    "O-": { symbol: "O-", full: "O Negative" },
    "A+": { symbol: "A+", full: "A Positive" },
    "A-": { symbol: "A-", full: "A Negative" },
    "B+": { symbol: "B+", full: "B Positive" },
    "B-": { symbol: "B-", full: "B Negative" },
    "AB+": { symbol: "AB+", full: "AB Positive" },
    "AB-": { symbol: "AB-", full: "AB Negative" },
  };
  if (!map[clean]) return bg;
  return style === "full" ? map[clean].full : map[clean].symbol;
}
