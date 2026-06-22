"use client";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays } from "date-fns";
import { vi } from "date-fns/locale";
import { BRAND } from "@/lib/constants";

interface Props {
  currentDate: Date;
  onChange: (d: Date) => void;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  viewType?: "week" | "4weeks";
}

export function DateWeekHeader({ currentDate, onChange, title, subtitle, actions, viewType = "week" }: Props) {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 });
  const end = viewType === "4weeks" 
    ? addDays(addWeeks(start, 4), -1) 
    : endOfWeek(currentDate, { weekStartsOn: 1 });

  const step = viewType === "4weeks" ? 4 : 1;

  return (
    <div
      className="flex items-center justify-between px-6 py-3 border-b border-white/10"
      style={{ background: BRAND.navy }}
    >
      <div>
        {title && <div className="text-white font-bold text-base">{title}</div>}
        {subtitle && <div className="text-slate-400 text-xs mt-0.5">{subtitle}</div>}
      </div>

      <div className="flex items-center gap-4">
        {actions}
        
        <div className="flex items-center gap-2 bg-white/10 p-1 rounded-lg border border-white/20">
          <button
            onClick={() => onChange(subWeeks(currentDate, step))}
            className="px-2 py-1 text-white hover:bg-white/20 rounded transition-colors"
          >
            ◀
          </button>
          
          <div className="text-white text-sm font-bold min-w-[150px] text-center">
            {format(start, "dd/MM")} - {format(end, "dd/MM/yyyy")}
          </div>

          <button
            onClick={() => onChange(addWeeks(currentDate, step))}
            className="px-2 py-1 text-white hover:bg-white/20 rounded transition-colors"
          >
            ▶
          </button>
          
          <button
            onClick={() => onChange(new Date())}
            className="px-3 py-1 ml-2 text-xs font-bold text-white bg-white/20 hover:bg-white/30 rounded transition-colors"
          >
            Hôm nay
          </button>
        </div>
      </div>
    </div>
  );
}
