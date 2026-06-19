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
