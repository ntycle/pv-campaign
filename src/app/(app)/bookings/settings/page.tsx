"use client";
import { useState, useEffect } from "react";
import { subscribeResourceQuotas, upsertResourceQuota, subscribeAllBookings, upsertTeam, deleteTeam, upsertResource, deleteResource } from "@/lib/firestore";
import { BRAND } from "@/lib/constants";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { useSystem } from "@/hooks/useSystem";
import type { ResourceQuota, ResourceType, Booking, Team, ResourceConfig } from "@/types";

type Tab = "quotas" | "teams" | "resources";

export default function ResourceSettingsPage() {
  const { teams, resources } = useSystem();
  const [quotas, setQuotas] = useState<ResourceQuota[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("quotas");

  useEffect(() => subscribeResourceQuotas(setQuotas), []);
  useEffect(() => subscribeAllBookings(setAllBookings), []);

  // Current week date range for usage display
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDates = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(d => format(d, "yyyy-MM-dd"));

  const getWeekUsage = (rType: string) => {
    return allBookings.filter(b =>
      b.resourceType === rType &&
      b.dates.some(d => weekDates.includes(d))
    ).length;
  };

  const handleUpdateCapacity = async (resourceType: string, timeframe: "default" | "week" | "month", timeValue: string, newCapacity: number) => {
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Thiết Lập Hệ Thống & Tài Nguyên</h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý Teams, Tài nguyên và hạn mức booking.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setActiveTab("quotas")} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === "quotas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Quota Tài Nguyên</button>
          <button onClick={() => setActiveTab("teams")} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === "teams" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Quản Lý Teams</button>
          <button onClick={() => setActiveTab("resources")} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === "resources" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Quản Lý Resource</button>
        </div>
      </div>

      {activeTab === "quotas" && (
        <>
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <div className="text-sm font-bold text-blue-800">Cách hoạt động của Quota</div>
              <div className="text-xs text-blue-700 mt-1">
                Quota là <strong>tổng toàn công ty</strong> — tất cả Campaign và Team gộp lại không được vượt quá số slot này trong 1 tuần. Ví dụ: Design Slot = <strong>3 slots/tuần</strong> nghĩa là toàn bộ công ty chỉ có thể booking tối đa 3 Design Slot trong cùng 1 tuần.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {resources.map((config) => {
              const rType = config.id;
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
                      <div className="text-[11px] text-slate-400 mt-0.5">Team quản lý: {teams.find(t => t.id === config.teamId)?.label || config.teamId}</div>
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
        </>
      )}

      {activeTab === "teams" && (
        <TeamManagementTab teams={teams} />
      )}

      {activeTab === "resources" && (
        <ResourceManagementTab resources={resources} teams={teams} />
      )}
    </div>
  );
}

function TeamManagementTab({ teams }: { teams: Team[] }) {
  const [editingTeam, setEditingTeam] = useState<Partial<Team> | null>(null);

  const handleSave = async () => {
    if (editingTeam?.id && editingTeam.label) {
      await upsertTeam(editingTeam as Team);
      setEditingTeam(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-black text-slate-800">Danh Sách Team</h2>
        <button 
          onClick={() => setEditingTeam({ id: "", label: "", sublabel: "", color: "#3B82F6", icon: "👥" })}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
        >
          + Thêm Team Mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(t => (
          <div key={t.id} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: t.color + "20" }}>{t.icon}</div>
              <div className="flex-1">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  {t.label} 
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">{t.id}</span>
                </div>
                <div className="text-xs text-slate-500">{t.sublabel}</div>
              </div>
            </div>
            <div className="flex gap-2 mt-2 pt-3 border-t border-slate-100">
              <button onClick={() => setEditingTeam(t)} className="text-xs text-blue-600 font-bold hover:underline">Sửa</button>
              {t.id !== "campaign" && (
                <button onClick={() => window.confirm(`Xoá team ${t.label}?`) && deleteTeam(t.id)} className="text-xs text-red-500 font-bold hover:underline">Xoá</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-black mb-4">{editingTeam.id && teams.find(t=>t.id===editingTeam.id) ? "Sửa Team" : "Thêm Team"}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Team ID (không đổi được sau khi tạo)</label>
                <input type="text" className="w-full border p-2 rounded text-sm" value={editingTeam.id} onChange={e => setEditingTeam(p => ({...p, id: e.target.value}))} disabled={!!teams.find(t=>t.id===editingTeam.id)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Tên Team (Label)</label>
                <input type="text" className="w-full border p-2 rounded text-sm" value={editingTeam.label} onChange={e => setEditingTeam(p => ({...p, label: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Mô tả (Sublabel)</label>
                <input type="text" className="w-full border p-2 rounded text-sm" value={editingTeam.sublabel} onChange={e => setEditingTeam(p => ({...p, sublabel: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Icon (Emoji)</label>
                  <input type="text" className="w-full border p-2 rounded text-sm" value={editingTeam.icon} onChange={e => setEditingTeam(p => ({...p, icon: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Màu sắc (Hex)</label>
                  <input type="color" className="w-full h-[38px] border p-1 rounded" value={editingTeam.color} onChange={e => setEditingTeam(p => ({...p, color: e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditingTeam(null)} className="px-4 py-2 text-sm font-bold text-slate-500">Hủy</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResourceManagementTab({ resources, teams }: { resources: ResourceConfig[], teams: Team[] }) {
  const [editingRes, setEditingRes] = useState<Partial<ResourceConfig> | null>(null);

  const handleSave = async () => {
    if (editingRes?.id && editingRes.label && editingRes.teamId) {
      // Set default capacity if not present
      if (editingRes.capacity === undefined) editingRes.capacity = 5;
      await upsertResource(editingRes as ResourceConfig);
      setEditingRes(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-black text-slate-800">Danh Sách Tài Nguyên</h2>
        <button 
          onClick={() => setEditingRes({ id: "", label: "", icon: "📦", teamId: teams[0]?.id, capacity: 5 })}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
        >
          + Thêm Tài Nguyên
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.map(r => {
          const ownerTeam = teams.find(t => t.id === r.teamId);
          return (
            <div key={r.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-slate-100">{r.icon}</div>
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    {r.label}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">{r.id}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Quản lý bởi: <strong style={{ color: ownerTeam?.color }}>{ownerTeam?.label || r.teamId}</strong>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => setEditingRes(r)} className="text-xs text-blue-600 font-bold hover:underline">Sửa</button>
                <button onClick={() => window.confirm(`Xoá tài nguyên ${r.label}?`) && deleteResource(r.id)} className="text-xs text-red-500 font-bold hover:underline">Xoá</button>
              </div>
            </div>
          );
        })}
      </div>

      {editingRes && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-black mb-4">{editingRes.id && resources.find(r=>r.id===editingRes.id) ? "Sửa Tài Nguyên" : "Thêm Tài Nguyên"}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Resource ID (ví dụ: design_slot)</label>
                <input type="text" className="w-full border p-2 rounded text-sm" value={editingRes.id} onChange={e => setEditingRes(p => ({...p, id: e.target.value}))} disabled={!!resources.find(r=>r.id===editingRes.id)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Tên Tài Nguyên (Label)</label>
                <input type="text" className="w-full border p-2 rounded text-sm" value={editingRes.label} onChange={e => setEditingRes(p => ({...p, label: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Icon (Emoji)</label>
                  <input type="text" className="w-full border p-2 rounded text-sm" value={editingRes.icon} onChange={e => setEditingRes(p => ({...p, icon: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Team quản lý</label>
                  <select className="w-full border p-2 rounded text-sm" value={editingRes.teamId} onChange={e => setEditingRes(p => ({...p, teamId: e.target.value}))}>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditingRes(null)} className="px-4 py-2 text-sm font-bold text-slate-500">Hủy</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
