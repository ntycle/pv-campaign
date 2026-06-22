"use client";
import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { DateWeekHeader } from "@/components/layout/DateWeekHeader";
import { RESOURCE_CONFIG, TEAMS, BRAND } from "@/lib/constants";
import { subscribeAllBookings, subscribeCampaigns, upsertBooking, deleteBooking } from "@/lib/firestore";
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
  const [form, setForm] = useState<Omit<Booking,"id">>({
    campaignId: campaigns[0]?.id ?? "",
    resourceType: "design_slot",
    teams: [], dates: [selectedDate],
    status: "pending", priority: "medium",
    description: "", updatedBy: user,
    ...(item ? { ...item } : {}),
  });

  const sortedDates = [...form.dates].sort();
  const [startDate, setStartDate] = useState(sortedDates[0] || selectedDate);
  const [endDate, setEndDate] = useState(sortedDates[sortedDates.length - 1] || selectedDate);

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
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [modal, setModal] = useState<Booking | true | null>(null);
  const [confirmingBooking, setConfirmingBooking] = useState<Booking | null>(null);
  const [deliveredDate, setDeliveredDate] = useState("");

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

  const handleConfirm = async () => {
    if (!confirmingBooking) return;
    await upsertBooking({
      ...confirmingBooking,
      status: "approved",
      deliveredDate: deliveredDate || format(new Date(), "yyyy-MM-dd"),
      confirmedAt: new Date().toISOString(),
      updatedBy: user?.displayName ?? "User",
    });
    setConfirmingBooking(null);
    setDeliveredDate("");
  };

  // Resource usage (calculate based on currently filtered bookings)
  const usage = Object.entries(RESOURCE_CONFIG).map(([rType, cfg]) => {
    const used = filteredBookings.filter(b => b.resourceType === rType).reduce((sum, b) => {
      // count how many days of this booking fall in the current week
      const daysInWeek = b.dates.filter(d => d >= weekStartStr && d <= weekEndStr).length;
      return sum + daysInWeek;
    }, 0);
    // Since we now count per day, capacity might mean "per week" capacity, or we should re-think it.
    // Let's assume capacity is per week.
    const pct  = Math.round(used / cfg.capacity * 100);
    return { rType, ...cfg, used, pct };
  });

  return (
    <div className="flex flex-col min-h-screen">
      <DateWeekHeader currentDate={currentDate} onChange={setCurrentDate} title="Booking Tài Nguyên" />

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
                <div className="mt-2 text-[10px]">
                  <span className="text-red-500 font-bold">{r.used}</span>
                  <span className="text-slate-400">/{r.capacity} slot (tuần)</span>
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
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">📋 Danh sách Booking Tuần Này</h2>
            <button onClick={() => setModal(true)} className="px-4 py-2 text-xs font-black text-white rounded-lg" style={{ background: BRAND.navy }}>
              ＋ Thêm Booking
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: BRAND.navy }}>
                  {["Campaign","Tài nguyên","Teams","Ngày book","Ngày giao","Mô tả","Trạng thái",""].map((h,i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-xs font-bold text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-slate-300 text-sm">Chưa có booking nào trong tuần này.</td></tr>
                ) : filteredBookings.map((b, i) => {
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
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-600">
                        {b.dates.length > 1 ? (
                          <span className={b.dates.some(d => d >= weekStartStr && d <= weekEndStr) ? "text-blue-600" : ""}>
                            {format(new Date(b.dates[0]), "dd/MM")} - {format(new Date(b.dates[b.dates.length - 1]), "dd/MM")}
                          </span>
                        ) : (
                          <span className={b.dates[0] >= weekStartStr && b.dates[0] <= weekEndStr ? "text-blue-600" : ""}>
                            {format(new Date(b.dates[0]), "dd/MM")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold">
                        {b.deliveredDate ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-emerald-600">{format(new Date(b.deliveredDate), "dd/MM/yyyy")}</span>
                            <span className="text-[10px] text-slate-400">Đã giao</span>
                          </div>
                        ) : b.status === "approved" ? (
                          <span className="text-slate-400 text-[10px]">—</span>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">Chờ xác nhận</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 max-w-36 truncate">{b.description || "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={b.status} />
                          {b.status === "pending" && (
                            <button
                              onClick={() => { setConfirmingBooking(b); setDeliveredDate(format(new Date(), "yyyy-MM-dd")); }}
                              className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-600 font-bold rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            >
                              Xác nhận
                            </button>
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

      {/* Confirm modal */}
      {confirmingBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-black text-slate-800 text-sm">✅ Xác nhận giao tài nguyên</span>
              <button onClick={() => setConfirmingBooking(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-xs">
                <div className="font-bold text-slate-700 mb-1">
                  {RESOURCE_CONFIG[confirmingBooking.resourceType]?.icon} {RESOURCE_CONFIG[confirmingBooking.resourceType]?.label}
                </div>
                <div className="text-slate-500">
                  Ngày book: {confirmingBooking.dates.length > 1
                    ? `${format(new Date(confirmingBooking.dates[0]), "dd/MM")} - ${format(new Date(confirmingBooking.dates[confirmingBooking.dates.length-1]), "dd/MM")}`
                    : format(new Date(confirmingBooking.dates[0]), "dd/MM/yyyy")}
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1.5">📅 Ngày giao thực tế</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  value={deliveredDate}
                  onChange={e => setDeliveredDate(e.target.value)}
                />
                <p className="text-[11px] text-slate-400 mt-1">Ngày tài nguyên thực tế được bàn giao hoặc bắt đầu sử dụng.</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setConfirmingBooking(null); setDeliveredDate(""); }}
                  className="flex-1 px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-2 text-xs font-bold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700"
                >
                  Xác nhận giao
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
