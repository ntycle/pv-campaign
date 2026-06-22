"use client";
import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, addDays } from "date-fns";
import { vi } from "date-fns/locale";
import { DateWeekHeader } from "@/components/layout/DateWeekHeader";
import { CONTENT_QUOTAS, TEAMS, BRAND, DAYS_FULL } from "@/lib/constants";
import { subscribeAllContentItems, subscribeCampaigns, upsertContentItem, deleteContentItem } from "@/lib/firestore";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import type { ContentItem, ContentType, ContentStatus, TeamId, Campaign } from "@/types";

function ContentModal({
  item, campaigns, selectedDate, user,
  onSave, onClose,
}: {
  item?: ContentItem; campaigns: Campaign[]; selectedDate: string; user: string;
  onSave: (d: Omit<ContentItem,"id">) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<ContentItem,"id">>({
    campaignId: "", teamId: "social", type: "post", title: "",
    date: selectedDate, status: "pending", note: "",
    updatedBy: user,
    ...(item ? { ...item } : {}),
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <span className="font-black text-slate-800 text-sm">📝 {item ? "Sửa" : "Thêm"} Content</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Loại nội dung</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value as ContentType}))}>
                {Object.entries(CONTENT_QUOTAS).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Team</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.teamId} onChange={e => setForm(p => ({...p, teamId: e.target.value as TeamId}))}>
                {TEAMS.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Ngày</label>
              <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Trạng thái</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value as ContentStatus}))}>
                {["pending","approved","running","done","blocked"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Tiêu đề</label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" placeholder="Nhập tiêu đề..." value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Campaign (tuỳ chọn)</label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.campaignId} onChange={e => setForm(p => ({...p, campaignId: e.target.value}))}>
              <option value="">— Không gắn —</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Ghi chú</label>
            <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none resize-none" rows={2} value={form.note} onChange={e => setForm(p => ({...p, note: e.target.value}))} />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-3 py-1.5 text-sm font-bold text-slate-500">Hủy</button>
          {item && (
            <button
              onClick={() => { deleteContentItem(item.id); onClose(); }}
              className="px-4 py-1.5 text-sm font-black text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg mr-auto"
            >
              Xóa
            </button>
          )}
          <button
            onClick={() => { if(form.title.trim()) { onSave({...form, updatedBy: user}); onClose(); } }}
            className="px-4 py-1.5 text-sm font-black text-white rounded-lg"
            style={{ background: BRAND.navy }}
          >
            {item ? "Cập nhật" : "Thêm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [content, setContent] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [modal, setModal] = useState<ContentItem | string | null>(null);

  useEffect(() => subscribeCampaigns(setCampaigns), []);
  useEffect(() => subscribeAllContentItems(setContent), []);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(addWeeks(weekStart, 4), -1);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const activeCamps = campaigns.filter(c => {
    if (!c.startDate || !c.endDate) return false;
    const s = new Date(c.startDate);
    const e = new Date(c.endDate);
    return s <= weekEnd && e >= weekStart;
  });

  const filtered = content.filter(c =>
    (filterType === "all" || c.type === filterType) &&
    (filterTeam === "all" || c.teamId === filterTeam) &&
    (c.date >= format(weekStart, "yyyy-MM-dd") && c.date <= format(weekEnd, "yyyy-MM-dd"))
  );

  const handleSave = async (data: Omit<ContentItem,"id">) => {
    if (typeof modal === "string") {
      await upsertContentItem(data);
    } else if (modal && typeof modal === "object") {
      await upsertContentItem({ ...data, id: modal.id });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <DateWeekHeader 
        currentDate={currentDate}
        onChange={setCurrentDate}
        title="Lịch Sản Xuất (4 Tuần)" 
        viewType="4weeks"
      />

      {/* Filter bar */}
      <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-slate-400 w-12">Loại:</span>
          {[{id:"all",label:"Tất cả",icon:"🗂️"},...Object.entries(CONTENT_QUOTAS).map(([k,v])=>({id:k,...v}))].map(ct => (
            <button key={ct.id} onClick={() => setFilterType(ct.id)}
              className="text-xs font-bold px-3 py-1 rounded-full border transition-all"
              style={filterType===ct.id?{background:BRAND.navy,color:"#fff",borderColor:BRAND.navy}:{borderColor:"#E5E7EB",color:"#4B5563"}}
            >{ct.icon} {ct.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-slate-400 w-12">Team:</span>
          {[{id:"all",label:"Tất cả",icon:"👥",color:"#6B7280"},...TEAMS].map(t => (
            <button key={t.id} onClick={() => setFilterTeam(t.id)}
              className="text-xs font-bold px-3 py-1 rounded-full border transition-all"
              style={filterTeam===t.id?{background:BRAND.navy,color:"#fff",borderColor:BRAND.navy}:{borderColor:"#E5E7EB",color:"#4B5563"}}
            >{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, di) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayItems = filtered.filter(c => c.date === dateStr);
            const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;

            return (
              <div key={di} className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden min-h-[140px] flex flex-col">
                <div className="px-2 py-1.5 flex items-center justify-between" style={{ background: isToday ? BRAND.red : BRAND.navy }}>
                  <div className="flex flex-row items-baseline gap-1">
                    <span className="text-white text-xs font-black">{format(day, "dd/MM")}</span>
                    <span className="text-white/70 text-[9px] font-bold uppercase">{format(day, "EE", { locale: vi })}</span>
                  </div>
                  <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-full">{dayItems.length}</span>
                </div>
                {/* Active campaigns */}
                <div className="px-2 pt-1.5 flex flex-col gap-1">
                  {activeCamps.filter(c => c.startDate <= dateStr && c.endDate >= dateStr).map(cp => (
                    <div key={cp.id} className="text-[10px] font-bold px-2 py-0.5 rounded border-l-2 truncate"
                      style={{ borderColor: cp.color, background: cp.color + "18", color: cp.color }}>
                      {cp.name}
                    </div>
                  ))}
                </div>
                {/* Content items */}
                <div className="p-2 flex flex-col gap-1.5 flex-1 relative">
                  {dayItems.length === 0 ? (
                    <div className="text-center text-slate-300 text-[10px] py-2">Trống</div>
                  ) : dayItems.map(item => {
                    const ct = CONTENT_QUOTAS[item.type];
                    const team = TEAMS.find(t => t.id === item.teamId);
                    return (
                      <div
                        key={item.id}
                        className="bg-slate-50 rounded p-1.5 cursor-pointer hover:bg-slate-100 transition-colors border-l-2 flex flex-col gap-1"
                        style={{ borderColor: ct?.color ?? "#ccc" }}
                        onClick={() => setModal(item)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px]">{ct?.icon}</span>
                            <span className="text-[9px] font-bold truncate max-w-[80px]" style={{ color: team?.color }}>{team?.label}</span>
                          </div>
                          <div className="scale-75 origin-top-right">
                            <StatusBadge status={item.status} />
                          </div>
                        </div>
                        <div className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-2">{item.title}</div>
                      </div>
                    );
                  })}
                  
                  {/* Add button inline */}
                  <div 
                    onClick={() => setModal(dateStr)}
                    className="mt-auto pt-1 opacity-0 hover:opacity-100 transition-opacity text-center cursor-pointer text-[10px] font-bold text-slate-400 hover:text-blue-500"
                  >
                    + Thêm
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setModal(format(new Date(), "yyyy-MM-dd"))}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white text-2xl shadow-xl flex items-center justify-center font-black z-40 hover:scale-105 transition-transform"
        style={{ background: BRAND.navy }}
      >
        ＋
      </button>

      {modal && (
        <ContentModal
          item={typeof modal === "object" ? modal : undefined}
          selectedDate={typeof modal === "string" ? modal : (modal as ContentItem).date}
          campaigns={campaigns}
          user={user?.displayName ?? "User"}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
