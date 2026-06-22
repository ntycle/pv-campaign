"use client";
import { WEEKS, MONTHS, BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  activeWeek: number;
  onChange: (w: number) => void;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  activeMonth?: number;
  onMonthChange?: (m: number) => void;
}

export function WeekHeader({ activeWeek, onChange, title, subtitle, actions, activeMonth, onMonthChange }: Props) {
  return (
    <div
      className="flex items-center justify-between px-6 py-3 border-b border-white/10"
      style={{ background: BRAND.navy }}
    >
      <div>
        {title && <div className="text-white font-bold text-base">{title}</div>}
        {subtitle && <div className="text-slate-400 text-xs mt-0.5">{subtitle}</div>}
      </div>

      <div className="flex items-center gap-2">
        {actions}
        
        {onMonthChange && activeMonth !== undefined && (
          <select
            className="ml-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20 outline-none cursor-pointer transition-all"
            value={activeMonth}
            onChange={(e) => onMonthChange(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i} className="text-slate-800 bg-white">{m}</option>
            ))}
          </select>
        )}

        <div className="flex gap-1.5 ml-4">
          {WEEKS.map((w, i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                activeWeek === i
                  ? "text-white border-transparent"
                  : "text-slate-400 border-white/20 hover:text-white"
              )}
              style={activeWeek === i ? { background: BRAND.red, borderColor: BRAND.red } : {}}
            >
              W{i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
