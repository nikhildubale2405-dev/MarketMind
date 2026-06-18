import { Trade, Transaction, SessionStats, HourlyStats } from "./types";

// Helper to calculate session based on IST +5:30 time (HH:MM)
export function getTradingSession(time: string): "Asian" | "London" | "New York" | "London-NY Overlap" | "Unknown" {
  if (!time) return "Unknown";
  const [hourStr, minStr] = time.split(":");
  const hour = parseInt(hourStr) || 0;
  const min = parseInt(minStr) || 0;
  const totalMin = hour * 60 + min;

  // IST +5:30 Forex session boundaries (converted from UTC):
  // Asian Session:         05:30 – 14:30 IST  (00:00–09:00 UTC)
  // London Session:        13:30 – 21:30 IST  (08:00–16:00 UTC)
  // New York Session:      18:30 – 02:30 IST  (13:00–21:00 UTC) ← wraps midnight
  // London-NY Overlap:     18:30 – 21:30 IST  (13:00–16:00 UTC)

  const isAsian   = totalMin >= 330  && totalMin < 870;           // 05:30–14:30
  const isLondon  = totalMin >= 810  && totalMin < 1290;          // 13:30–21:30
  const isNY      = totalMin >= 1110 || totalMin < 150;           // 18:30–02:30 (wraps midnight)
  const isOverlap = totalMin >= 1110 && totalMin < 1290;          // 18:30–21:30

  if (isOverlap) return "London-NY Overlap";
  if (isNY)      return "New York";
  if (isLondon)  return "London";
  if (isAsian)   return "Asian";
  return "Unknown";
}

// Generate empty initial state for a pristine clean start
export const getSampleState = (): { trades: Trade[]; transactions: Transaction[] } => {
  return { trades: [], transactions: [] };
};

function getOffsetDateString(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  // Convert to IST (UTC+5:30) for consistent date strings
  const utcMs = d.getTime() + (d.getTimezoneOffset() * 60000);
  const istDate = new Date(utcMs + 19800000); // IST = UTC+5:30 = +19800000 ms
  return istDate.toISOString().split("T")[0];
}
