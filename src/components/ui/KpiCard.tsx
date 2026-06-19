import { cn, pct, pctColor, formatCurrency, formatNumber } from "@/lib/utils";
import type { KpiField } from "@/types";

interface Props {
  field: KpiField;
  target: number;
  actual: number;
  onEdit?: () => void;
}

export function KpiCard({ field, target, actual, onEdit }: Props) {
  const p = pct(actual, target);
  const color = pctColor(p);

  const fmt = (v: number) =>
    field.type === "currency" ? formatCurrency(v)
    : field.type === "percentage" ? v.toFixed(2) + "%"
    : formatNumber(v);

  return (
    <div
      className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide leading-tight pr-2">
          {field.label}
        </div>
        <span
          className="text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ color, background: color + "18" }}
        >
          {p}%
        </span>
      </div>

      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-xl font-black" style={{ color }}>
          {fmt(actual)}
        </span>
        <span className="text-xs text-slate-400">/ {fmt(target)}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: Math.min(p, 100) + "%", background: color }}
        />
      </div>
    </div>
  );
}
