"use client";
import { useState, useEffect } from "react";
import { WeekHeader } from "@/components/layout/WeekHeader";
import { RESOURCE_CONFIG, TEAMS, CONTENT_QUOTAS, DAYS_FULL, BRAND } from "@/lib/constants";
import { subscribeContentLegacy as subscribeContent, subscribeBookingsLegacy as subscribeBookings, subscribeCampaigns } from "@/lib/firestore";
import { isCampaignActiveInWeek } from "@/lib/utils";
import type { ContentItem, Booking, Campaign } from "@/types";

interface Conflict {
  sev: "high" | "medium" | "low";
  type: string;
  msg: string;
  action: string;
}

const SEV_CONFIG = {
  high:   { bg: "#FEE2E2", border: "#EF4444", icon: "🔴", label: "Nghiêm trọng" },
  medium: { bg: "#FEF3C7", border: "#F59E0B", icon: "🟡", label: "Cần chú ý"    },
  low:    { bg: "#EFF6FF", border: "#3B82F6", icon: "🔵", label: "Thông tin"     },
};

function detectConflicts(content: ContentItem[], bookings: Booking[], campaigns: Campaign[], month: number, week: number): Conflict[] {
  const conflicts: Conflict[] = [];

  // 1. Resource overload
  Object.entries(RESOURCE_CONFIG).forEach(([rType, cfg]) => {
    DAYS_FULL.forEach((dayLabel, di) => {
      const n = bookings.filter(b => b.resourceType === rType && b.days.includes(di)).length;
      if (n > cfg.capacity) {
        conflicts.push({
          sev: "high",
          type: "Resource Overload",
          msg: `${cfg.label} bị overbook vào ${dayLabel}: ${n}/${cfg.capacity} slots`,
          action: "Dời 1 booking sang ngày khác hoặc tăng capacity",
        });
      }
    });
  });

  // 2. Team overload
  TEAMS.forEach(t => {
    const n = content.filter(c => c.teamId === t.id).length;
    if (n > 15) {
      conflicts.push({
        sev: "medium",
        type: "Team Overload",
        msg: `Team ${t.label} có ${n} items trong tuần ${week + 1}`,
        action: "Redistribute sang team khác hoặc giảm output",
      });
    }
  });

  // 3. Campaign overlap
  const activeCamps = campaigns.filter(c => isCampaignActiveInWeek(c.startDate, c.endDate, month, week));
  if (activeCamps.length > 2) {
    conflicts.push({
      sev: "medium",
      type: "Campaign Overlap",
      msg: `${activeCamps.length} campaigns chạy song song tuần ${week + 1}`,
      action: `Phân chia rõ priority: ${activeCamps.map(c => c.name).join(" + ")}`,
    });
  }

  // 4. Quota gap
  Object.entries(CONTENT_QUOTAS).forEach(([type, cfg]) => {
    const n = content.filter(c => c.type === type).length;
    if (n < cfg.weekly * 0.5) {
      conflicts.push({
        sev: "low",
        type: "Quota Gap",
        msg: `${cfg.label} đạt ${n}/${cfg.weekly} (${Math.round(n / cfg.weekly * 100)}%)`,
        action: "Cần thêm nội dung để đạt chỉ tiêu tuần",
      });
    }
  });

  return conflicts;
}

export default function ConflictsPage() {
  const [week, setWeek] = useState(0);
  const [month, setMonth] = useState(new Date().getMonth());
  const [content, setContent] = useState<ContentItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => subscribeCampaigns(setCampaigns), []);
  useEffect(() => subscribeContent(month, week, setContent), [month, week]);
  useEffect(() => subscribeBookings(week, setBookings), [week]);

  const conflicts = detectConflicts(content, bookings, campaigns, month, week);
  const highCount   = conflicts.filter(c => c.sev === "high").length;
  const medCount    = conflicts.filter(c => c.sev === "medium").length;

  return (
    <div className="flex flex-col min-h-screen">
      <WeekHeader activeWeek={week} onChange={setWeek} title="Conflict Check" activeMonth={month} onMonthChange={setMonth} />

      <div className="flex-1 p-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
            <div className="text-3xl font-black" style={{ color: highCount > 0 ? "#EF4444" : "#10B981" }}>{highCount}</div>
            <div className="text-xs font-bold text-slate-500 mt-1">🔴 Nghiêm trọng</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
            <div className="text-3xl font-black" style={{ color: medCount > 0 ? "#F59E0B" : "#10B981" }}>{medCount}</div>
            <div className="text-xs font-bold text-slate-500 mt-1">🟡 Cần chú ý</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
            <div className="text-3xl font-black text-emerald-500">{conflicts.filter(c=>c.sev==="low").length}</div>
            <div className="text-xs font-bold text-slate-500 mt-1">🔵 Thông tin</div>
          </div>
        </div>

        {conflicts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-16 text-center">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-xl font-black text-emerald-700">Tất cả ổn!</div>
            <div className="text-slate-400 text-sm mt-2">Không phát hiện conflict tuần {week + 1}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {(["high","medium","low"] as const).map(sev => {
              const items = conflicts.filter(c => c.sev === sev);
              if (!items.length) return null;
              const cfg = SEV_CONFIG[sev];
              return (
                <div key={sev}>
                  <div className="text-xs font-black uppercase tracking-wide mb-2" style={{ color: cfg.border }}>
                    {cfg.icon} {cfg.label}
                  </div>
                  <div className="space-y-2">
                    {items.map((c, i) => (
                      <div key={i} className="rounded-xl p-4 border-l-4" style={{ background: cfg.bg, borderColor: cfg.border }}>
                        <div className="font-black text-sm mb-1" style={{ color: cfg.border }}>{c.type}</div>
                        <div className="text-sm text-slate-700 mb-1">{c.msg}</div>
                        <div className="text-xs text-slate-500 italic">💡 {c.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
