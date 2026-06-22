"use client";
import { useState, useEffect } from "react";
import { subscribeResourceQuotas, upsertResourceQuota, subscribeAllBookings } from "@/lib/firestore";
import { RESOURCE_CONFIG, BRAND } from "@/lib/constants";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import type { ResourceQuota, ResourceType, Booking } from "@/types";

export default function ResourceSettingsPage() {
  const [quotas, setQuotas] = useState<ResourceQuota[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);

  useEffect(() => subscribeResourceQuotas(setQuotas), []);
  useEffect(() => subscribeAllBookings(setAllBookings), []);

  // Current week date range for usage display
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDates = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(d => format(d, "yyyy-MM-dd"));

  const getWeekUsage = (rType: ResourceType) => {
    // Count distinct bookings that overlap with current week
    return allBookings.filter(b =>
      b.resourceType === rType &&
      b.dates.some(d => weekDates.includes(d))
    ).length;
  };

  const handleUpdateCapacity = async (resourceType: ResourceType, timeframe: "default" | "week" | "month", timeValue: string, newCapacity: number) => {
    const existing = quotas.find(q => q.resourceType === resourceType && q.timeframe === timeframe && q.timeValue === timeValue);
    await upsertResourceQuota({
      ...(existing ? { id: existing.id } : {}),
      resourceType,
      timeframe,
      timeValue,
      capacity: newCapacity,
    });
  };

  return (
    <div className="flex flex-col min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">Thiết Lập Tài Nguyên</h1>
        <p className="text-sm text-slate-500 mt-1">
          Quota là <strong>tổng toàn công ty</strong> — tất cả Campaign và Team gộp lại không được vượt quá số slot này trong 1 tuần.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <span className="text-2xl">ℹ️</span>
        <div>
          <div className="text-sm font-bold text-blue-800">Cách hoạt động</div>
          <div className="text-xs text-blue-700 mt-1">
            Ví dụ: Design Slot = <strong>3 slots/tuần</strong> nghĩa là toàn bộ công ty chỉ có thể booking tối đa 3 Design Slot trong cùng 1 tuần.
            Khi team thứ 4 cố book Design trong tuần đó, hệ thống sẽ báo hết slot.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Object.entries(RESOURCE_CONFIG).map(([key, config]) => {
          const rType = key as ResourceType;
          const defaultQuota = quotas.find(q => q.resourceType === rType && q.timeframe === "default");
          const exceptions = quotas.filter(q => q.resourceType === rType && q.timeframe !== "default");
          const weekUsage = getWeekUsage(rType);
          const capacity = defaultQuota?.capacity ?? config.capacity;
          const remaining = Math.max(0, capacity - weekUsage);
          const pct = capacity > 0 ? Math.min(100, (weekUsage / capacity) * 100) : 0;

          return (
            <div key={rType} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: "#F1F5F9" }}>
                  {config.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-black text-slate-800">{config.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Team quản lý: {config.teamId}</div>
                </div>
              </div>

              {/* Usage bar */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-500">Tuần này đã dùng</span>
                  <span className={weekUsage >= capacity ? "text-red-600" : remaining <= 1 ? "text-amber-600" : "text-emerald-600"}>
                    {weekUsage}/{capacity} slots
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct >= 100 ? "#DC2626" : pct >= 70 ? "#F59E0B" : "#10B981"
                    }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {remaining > 0 ? `Còn ${remaining} slot trống tuần này` : "⚠️ Đã hết slot tuần này"}
                </div>
              </div>

              {/* Quota per week setting */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">Quota mặc định / tuần</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={capacity}
                    min={0}
                    onChange={(e) => handleUpdateCapacity(rType, "default", "default", Number(e.target.value))}
                  />
                  <span className="text-sm text-slate-600 font-semibold">slots / tuần (toàn công ty)</span>
                </div>
              </div>

              {/* Exception overrides */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Ngoại Lệ (Tuần cụ thể)</span>
                  <button
                    onClick={() => {
                      const timeValue = prompt("Nhập tuần (vd: 2026-W26):", `${new Date().getFullYear()}-W${format(new Date(), "ww")}`);
                      if (timeValue) handleUpdateCapacity(rType, "week", timeValue, capacity);
                    }}
                    className="text-[11px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    + Thêm
                  </button>
                </div>
                {exceptions.length === 0 ? (
                  <div className="text-[11px] text-slate-400 italic">Chưa có ngoại lệ nào.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {exceptions.map(exc => (
                      <div key={exc.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <span className="text-xs font-bold text-amber-800">{exc.timeValue}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="w-16 px-2 py-1 border border-amber-300 rounded text-xs text-center font-bold focus:outline-none"
                            value={exc.capacity}
                            min={0}
                            onChange={(e) => handleUpdateCapacity(rType, exc.timeframe, exc.timeValue, Number(e.target.value))}
                          />
                          <span className="text-[11px] text-amber-700">slots</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
