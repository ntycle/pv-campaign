"use client";
import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { DateWeekHeader } from "@/components/layout/DateWeekHeader";
import { BRAND, STATUS_CONFIG, TEAM_KPI_FIELDS } from "@/lib/constants";
import { subscribeAllBookings, subscribeCampaigns, upsertBooking, deleteBooking } from "@/lib/firestore";
import { useSystem } from "@/hooks/useSystem";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import type { Booking, Campaign, ResourceType, TeamId, Priority, ContentStatus } from "@/types";

function BookingModal({
  item, campaigns, selectedDate, user, onSave, onClose,
}: {
  item?: Booking; campaigns: Campaign[]; selectedDate: string;
  user: string; onSave: (d: Omit<Booking,"id">) => void; onClose: () => void;
}) {
  const { teams, resources } = useSystem();
  const [form, setForm] = useState<Omit<Booking,"id">>({
    campaignId: campaigns[0]?.id ?? "",
    resourceType: "design_slot",
    teams: [], dates: [selectedDate],
    status: "pending", priority: "medium",
    description: "", updatedBy: user, kpiMetricId: "",
    ...(item ? { ...item } : {}),
  });

  const sortedDates = [...form.dates].sort();
  const [startDate, setStartDate] = useState(sortedDates[0] || selectedDate);
  const [endDate, setEndDate] = useState(sortedDates[sortedDates.length - 1] || selectedDate);

  const toggleTeam = (tid: TeamId) =>
    setForm(p => ({ ...p, teams: p.teams.includes(tid) ? p.teams.filter(t=>t!==tid) : [...p.teams, tid] }));

  const currentResource = resources.find(r => r.id === form.resourceType);
  const kpiOptions = currentResource ? (TEAM_KPI_FIELDS[currentResource.teamId] || []) : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <span className="font-black text-slate-800 text-sm">🔒 {item ? "Sửa" : "Thêm"} Booking</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Campaign</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.campaignId} onChange={e => setForm(p=>({...p,campaignId:e.target.value}))}>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Tài nguyên</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.resourceType} onChange={e => setForm(p=>({...p,resourceType:e.target.value as ResourceType}))}>
                {resources.map(r => <option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Trạng thái</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.status} onChange={e => setForm(p=>({...p,status:e.target.value as ContentStatus}))}>
                {["pending","approved","running","done","blocked"].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Priority</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.priority} onChange={e => setForm(p=>({...p,priority:e.target.value as Priority}))}>
                {["critical","high","medium","low"].map(p=><option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
            {kpiOptions.length > 0 && (
              <div className="col-span-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Phục vụ KPI (Tự động cộng Actual)</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.kpiMetricId || ""} onChange={e => setForm(p=>({...p,kpiMetricId:e.target.value}))}>
                  <option value="">-- Không liên kết KPI --</option>
                  {kpiOptions.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">Teams tham gia</label>
            <div className="flex flex-wrap gap-2">
              {teams.map(t => (
                <button key={t.id} type="button" onClick={() => toggleTeam(t.id)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1"
                  style={form.teams.includes(t.id)?{background:t.color,color:"#fff",borderColor:t.color}:{background:"#F9FAFB",color:"#374151",borderColor:"#E5E7EB"}}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">Ngày triển khai</label>
            <div className="flex gap-2">
              <input type="date" className="px-3 py-2 border border-slate-200 rounded text-sm flex-1 focus:outline-none" value={startDate} onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }} />
              <span className="self-center text-xs text-slate-400">đến</span>
              <input type="date" min={startDate} className="px-3 py-2 border border-slate-200 rounded text-sm flex-1 focus:outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Mô tả</label>
            <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none resize-none" rows={2} value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} placeholder="Mô tả chi tiết..." />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-3 py-1.5 text-sm font-bold text-slate-500">Hủy</button>
          <button
            onClick={() => {
              if (startDate > endDate) {
                alert("Ngày kết thúc phải sau ngày bắt đầu!");
                return;
              }
              const dateArray = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) }).map(d => format(d, "yyyy-MM-dd"));
              onSave({...form, dates: dateArray, updatedBy: user});
              onClose(); 
            }}
            disabled={!startDate || !endDate}
            className="px-4 py-1.5 text-sm font-black text-white rounded-lg"
            style={{ background: BRAND.navy }}
          >
            {item ? "Cập nhật" : "Tạo Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const { user, userProfile } = useAuth();
  const { teams, resources, resourceMap } = useSystem();
  const [currentDate, setCurrentDate] = useState(new Date());
  useEffect(() => setCurrentDate(new Date()), []);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [modal, setModal] = useState<Booking | true | null>(null);

  useEffect(() => subscribeCampaigns(setCampaigns), []);
  useEffect(() => subscribeAllBookings(setBookings), []);

  const campMap = Object.fromEntries(campaigns.map(c => [c.id, c]));
  
  const weekStartStr = format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEndStr = format(endOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const filteredBookings = bookings.filter(b => {
    return b.dates.some(d => d >= weekStartStr && d <= weekEndStr);
  });

  const handleSave = async (data: Omit<Booking,"id">) => {
    if (modal === true) {
      await upsertBooking(data);
    } else if (modal && typeof modal === "object") {
      await upsertBooking({ ...data, id: modal.id });
    }
  };

  const usage = resources.map((cfg) => {
    const rType = cfg.id;
    const used = filteredBookings.filter(b => b.resourceType === rType).length;
    const pct  = Math.round(used / (cfg.capacity || 1) * 100);
    return { rType, ...cfg, used, pct };
  });

  return (
    <div className="flex flex-col min-h-screen">
      <DateWeekHeader currentDate={currentDate} onChange={setCurrentDate} title="Booking Tài Nguyên" />

      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-5 gap-4">
          {usage.map(r => {
            const pColor = r.pct >= 100 ? "#EF4444" : r.pct >= 70 ? "#F59E0B" : "#10B981";
            const team = teams.find(t => t.id === r.teamId);
            return (
              <div key={r.rType} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm" style={{ borderTop: `4px solid ${team?.color || "#e2e8f0"}` }}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-2xl">{r.icon}</span>
                  <span className="text-2xl font-black" style={{ color: pColor }}>{r.pct}%</span>
                </div>
                <div className="font-black text-xs text-slate-700 mb-2">{r.label}</div>
                {team && <TeamBadge teamId={team.id} />}
                <div className="mt-2 text-[10px]">
                  <span className="text-red-500 font-bold">{r.used}</span>
                  <span className="text-slate-400">/{r.capacity} slot (tuần)</span>
                </div>
                <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: Math.min(r.pct, 100) + "%", background: pColor }} />
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">📋 Danh sách Booking Tuần Này</h2>
            <button onClick={() => setModal(true)} className="px-4 py-2 text-xs font-black text-white rounded-lg" style={{ background: BRAND.navy }}>
              ＋ Thêm Booking
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: BRAND.navy }}>
                  {["Campaign","Tài nguyên","Teams","Ngày book","Hoàn thành","Mô tả","Trạng thái",""].map((h,i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-xs font-bold text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr><td colSpan={8} className="py-10 text-center text-slate-300 text-sm">Chưa có booking nào trong tuần này.</td></tr>
                ) : filteredBookings.map((b, i) => {
                  const cp = campMap[b.campaignId];
                  const rt = resourceMap[b.resourceType];
                  return (
                    <tr key={b.id} className={i%2===0?"bg-white":"bg-slate-50"}>
                      <td className="px-4 py-2.5">
                        {cp && <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{ color: cp.color, background: cp.color+"18", borderColor: cp.color+"40" }}>{cp.name}</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-xs font-semibold flex items-center gap-2">{rt?.icon} {rt?.label}</div>
                        {b.kpiMetricId && rt && (
                          <div className="mt-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded inline-block">
                            KPI: {TEAM_KPI_FIELDS[rt.teamId]?.find(k => k.id === b.kpiMetricId)?.label || b.kpiMetricId}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1 flex-wrap">
                          {b.teams.map(tid => <TeamBadge key={tid} teamId={tid} />)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-600">
                        {b.dates.length > 1 ? (
                          <span>{format(new Date(b.dates[0]), "dd/MM")} - {format(new Date(b.dates[b.dates.length - 1]), "dd/MM")}</span>
                        ) : (
                          <span>{format(new Date(b.dates[0]), "dd/MM")}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold">
                        {b.status === "done" && b.completedDate ? (
                          <span className="text-emerald-600">{format(new Date(b.completedDate), "dd/MM/yyyy")}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 max-w-36 truncate">{b.description || "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {(userProfile?.teamId === "campaign" || userProfile?.teamId === rt?.teamId) ? (
                            <select
                              className="text-[11px] px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold appearance-none cursor-pointer"
                              style={{ 
                                backgroundColor: STATUS_CONFIG[b.status]?.bg || "#F3F4F6", 
                                color: STATUS_CONFIG[b.status]?.color || "#6B7280",
                                borderColor: (STATUS_CONFIG[b.status]?.color || "#6B7280") + "40"
                              }}
                              value={b.status}
                              onChange={(e) => {
                                const newStatus = e.target.value as ContentStatus;
                                const payload: Partial<Booking> = { status: newStatus, updatedBy: user?.displayName ?? "User" };
                                if (newStatus === "done") {
                                  payload.completedDate = format(new Date(), "yyyy-MM-dd");
                                } else {
                                  payload.completedDate = "";
                                }
                                upsertBooking({ ...b, ...payload });
                              }}
                            >
                              <option value="pending">Chờ duyệt</option>
                              <option value="approved">Đã duyệt</option>
                              <option value="running">Đang chạy</option>
                              <option value="done">Hoàn thành</option>
                            </select>
                          ) : (
                            <StatusBadge status={b.status} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => setModal(b)} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100">✏️</button>
                          <button onClick={() => window.confirm("Xóa booking này?") && deleteBooking(b.id)} className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded hover:bg-red-100">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <BookingModal
          item={modal === true ? undefined : modal}
          campaigns={campaigns}
          selectedDate={format(currentDate, "yyyy-MM-dd")}
          user={user?.displayName ?? "User"}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

    </div>
  );
}
