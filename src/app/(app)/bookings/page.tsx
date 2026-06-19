"use client";
import { useState, useEffect } from "react";
import { WeekHeader } from "@/components/layout/WeekHeader";
import { RESOURCE_CONFIG, TEAMS, DAYS_SHORT, DAYS_FULL, BRAND } from "@/lib/constants";
import { subscribeBookings, subscribeCampaigns, createBooking, updateBooking, deleteBooking } from "@/lib/firestore";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import type { Booking, Campaign, ResourceType, TeamId, Priority, ContentStatus } from "@/types";

function BookingModal({
  item, campaigns, weekIndex, bookings, user, onSave, onClose,
}: {
  item?: Booking; campaigns: Campaign[]; weekIndex: number; bookings: Booking[];
  user: string; onSave: (d: Omit<Booking,"id">) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Booking,"id">>({
    campaignId: campaigns[0]?.id ?? "",
    resourceType: "design_slot",
    teams: [], days: [], weekIndex,
    status: "pending", priority: "medium",
    description: "", updatedBy: user,
    ...(item ? { ...item } : {}),
  });

  const rt = RESOURCE_CONFIG[form.resourceType];
  const used = bookings.filter(b => b.resourceType === form.resourceType && b.weekIndex === weekIndex && b.id !== item?.id).length;
  const remaining = Math.max(0, rt.capacity - used);

  const toggleDay = (di: number) =>
    setForm(p => ({ ...p, days: p.days.includes(di) ? p.days.filter(d=>d!==di) : [...p.days, di] }));
  const toggleTeam = (tid: TeamId) =>
    setForm(p => ({ ...p, teams: p.teams.includes(tid) ? p.teams.filter(t=>t!==tid) : [...p.teams, tid] }));

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
                {Object.entries(RESOURCE_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              <div className="text-xs mt-1 font-semibold" style={{ color: remaining===0?"#EF4444":"#F59E0B" }}>
                Còn {remaining}/{rt.capacity} slot{remaining===0?" ⚠️ Đầy!":""}
              </div>
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
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">Teams tham gia</label>
            <div className="flex flex-wrap gap-2">
              {TEAMS.map(t => (
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
              {DAYS_SHORT.map((d,i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className="flex-1 py-2 text-xs font-bold rounded-lg border transition-all"
                  style={form.days.includes(i)?{background:BRAND.navy,color:"#fff",borderColor:BRAND.navy}:{background:"#F9FAFB",color:"#374151",borderColor:"#E5E7EB"}}>
                  {d}
                </button>
              ))}
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
            onClick={() => { onSave({...form, updatedBy: user}); onClose(); }}
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
  const { user } = useAuth();
  const [week, setWeek] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [modal, setModal] = useState<Booking | true | null>(null);

  useEffect(() => subscribeCampaigns(setCampaigns), []);
  useEffect(() => subscribeBookings(week, setBookings), [week]);

  const campMap = Object.fromEntries(campaigns.map(c => [c.id, c]));

  const handleSave = async (data: Omit<Booking,"id">) => {
    if (modal === true) {
      await createBooking(data);
    } else if (modal && typeof modal === "object") {
      await updateBooking((modal as Booking).id, data);
    }
  };

  // Resource usage
  const usage = Object.entries(RESOURCE_CONFIG).map(([rType, cfg]) => {
    const used = bookings.filter(b => b.resourceType === rType).length;
    const pct  = Math.round(used / cfg.capacity * 100);
    return { rType, ...cfg, used, pct };
  });

  return (
    <div className="flex flex-col min-h-screen">
      <WeekHeader activeWeek={week} onChange={setWeek} title="Booking Tài Nguyên" />

      <div className="flex-1 p-6 space-y-6">
        {/* Resource capacity overview */}
        <div className="grid grid-cols-5 gap-4">
          {usage.map(r => {
            const pColor = r.pct >= 100 ? "#EF4444" : r.pct >= 70 ? "#F59E0B" : "#10B981";
            const team = TEAMS.find(t => t.id === r.teamId)!;
            return (
              <div key={r.rType} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm" style={{ borderTop: `4px solid ${team.color}` }}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-2xl">{r.icon}</span>
                  <span className="text-2xl font-black" style={{ color: pColor }}>{r.pct}%</span>
                </div>
                <div className="font-black text-xs text-slate-700 mb-2">{r.label}</div>
                <TeamBadge teamId={r.teamId} />
                <div className="mt-2 text-xs">
                  <span className="text-red-500 font-bold">{r.used}</span>
                  <span className="text-slate-400">/{r.capacity} slot</span>
                  <span className="text-emerald-500 ml-2">Còn {Math.max(0, r.capacity - r.used)}</span>
                </div>
                <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: Math.min(r.pct, 100) + "%", background: pColor }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Booking list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">📋 Danh sách Booking</h2>
            <button onClick={() => setModal(true)} className="px-4 py-2 text-xs font-black text-white rounded-lg" style={{ background: BRAND.navy }}>
              ＋ Thêm Booking
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: BRAND.navy }}>
                  {["Campaign","Tài nguyên","Teams","Ngày","Mô tả","Trạng thái",""].map((h,i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-xs font-bold text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-slate-300 text-sm">Chưa có booking. Nhấn "＋ Thêm Booking"</td></tr>
                ) : bookings.map((b, i) => {
                  const cp = campMap[b.campaignId];
                  const rt = RESOURCE_CONFIG[b.resourceType];
                  return (
                    <tr key={b.id} className={i%2===0?"bg-white":"bg-slate-50"}>
                      <td className="px-4 py-2.5">
                        {cp && <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{ color: cp.color, background: cp.color+"18", borderColor: cp.color+"40" }}>{cp.name}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-semibold">{rt?.icon} {rt?.label}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1 flex-wrap">
                          {b.teams.map(tid => <TeamBadge key={tid} teamId={tid} />)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold">{b.days.map(d=>DAYS_SHORT[d]).join(", ")}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 max-w-36 truncate">{b.description || "—"}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={b.status} /></td>
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
          weekIndex={week}
          bookings={bookings}
          user={user?.displayName ?? "User"}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
