import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + "B₫";
  if (value >= 1_000_000)     return (value / 1_000_000).toFixed(1) + "M₫";
  if (value >= 1_000)         return (value / 1_000).toFixed(0) + "K₫";
  return value.toLocaleString("vi-VN") + "₫";
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
  if (value >= 1_000)     return (value / 1_000).toFixed(1) + "K";
  return value.toLocaleString("vi-VN");
}

export function pct(actual: number, target: number): number {
  if (!target) return 0;
  return Math.round((actual / target) * 100);
}

export function pctColor(p: number): string {
  if (p >= 100) return "#10B981";
  if (p >= 60)  return "#F59E0B";
  return "#EF4444";
}

export function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Kiểm tra xem một campaign (có startDate, endDate) có active trong "Tháng M, Tuần W" không.
 * Giả sử: Tháng M bắt đầu từ ngày 1 của tháng đó năm hiện tại.
 * Tuần W là tuần có 7 ngày (Tuần 0: 1-7, Tuần 1: 8-14, Tuần 2: 15-21, Tuần 3: 22-cuối tháng).
 */
export function isCampaignActiveInWeek(
  startDateStr: string,
  endDateStr: string,
  monthIndex: number,
  weekIndex: number,
  year = new Date().getFullYear()
): boolean {
  if (!startDateStr || !endDateStr) return false;

  const campStart = new Date(startDateStr).getTime();
  const campEnd = new Date(endDateStr).getTime();

  // Tính start/end date của cái "Tuần W" đó
  const weekStartDay = weekIndex * 7 + 1;
  let weekEndDay = weekStartDay + 6;
  
  // Nếu là tuần cuối cùng (weekIndex === 3), kéo dài đến cuối tháng
  if (weekIndex === 3) {
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
    weekEndDay = lastDayOfMonth;
  }

  const calStart = new Date(year, monthIndex, weekStartDay).getTime();
  const calEnd = new Date(year, monthIndex, weekEndDay, 23, 59, 59, 999).getTime();

  // Kiểm tra 2 khoảng thời gian giao nhau
  return campStart <= calEnd && campEnd >= calStart;
}
