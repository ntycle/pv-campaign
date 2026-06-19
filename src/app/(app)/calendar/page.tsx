"use client";
import { useState, useEffect } from "react";
import { WeekHeader } from "@/components/layout/WeekHeader";
import { DAYS_SHORT, DAYS_FULL, TEAMS, CONTENT_QUOTAS, BRAND } from "@/lib/constants";
import { subscribeContent, subscribeCampaigns, createContent, updateContent } from "@/lib/firestore";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import type { ContentItem, ContentType, ContentStatus, TeamId, Campaign } from "@/types";

function ContentModal({
  item, campaigns, weekIndex, user,
  onSave, onClose,
}: {
  item?: ContentItem; campaigns: Campaign[]; weekIndex: number; user: string;
  onSave: (d: Omit<ContentItem,"id">) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<ContentItem,"id">>({
    campaignId: "", teamId: "social", type: "post", title: "",
    day: 0, weekIndex, status: "pending", note: "",
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
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.day} onChange={e => setForm(p => ({...p, day: +e.target.value}))}>
                {DAYS_FULL.map((d,i) => <option key={i} value={i}>{d}</option>)}
              </select>
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
  const [week, setWeek] = useState(0);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [modal, setModal] = useState<ContentItem | true | null>(null);

  useEffect(() => subscribeCampaigns(setCampaigns), []);
  useEffect(() => subscribeContent(week, setContent), [week]);

  const activeCamps = campaigns.filter(c => c.startWeek <= week && c.endWeek >= week);
  const filtered = content.filter(c =>
    (filterType === "all" || c.type === filterType) &&
    (filterTeam === "all" || c.teamId === filterTeam)
  );

  const handleSave = async (data: Omit<ContentItem,"id">) => {
    if (modal === true) {
      await createContent(data);
    } else if (modal && typeof modal === "object") {
      await updateContent((modal as ContentItem).id, data);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <WeekHeader activeWeek={week} onChange={setWeek} title="Lịch Tuần" />

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
          {DAYS_SHORT.map((d, di) => {
            const dayItems = filtered.filter(c => c.day === di);
            return (
              <div key={di} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden min-h-64">
                <div className="px-3 py-2 flex items-center justify-between" style={{ background: BRAND.navy }}>
                  <span className="text-white text-xs font-black">{DAYS_FULL[di]}</span>
                  <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded-full">{dayItems.length}</span>
                </div>
                {/* Active campaigns */}
                <div className="px-2 pt-1.5 flex flex-col gap-1">
                  {activeCamps.map(cp => (
                    <div key={cp.id} className="text-xs font-bold px-2 py-0.5 rounded border-l-2 truncate"
                      style={{ borderColor: cp.color, background: cp.color + "18", color: cp.color }}>
                      {cp.name}
                    </div>
                  ))}
                </div>
                {/* Content items */}
                <div className="p-2 flex flex-col gap-1.5">
                  {dayItems.length === 0 ? (
                    <div className="text-center text-slate-300 text-xs py-4">Trống</div>
                  ) : dayItems.map(item => {
                    const ct = CONTENT_QUOTAS[item.type];
                    return (
                      <div
                        key={item.id}
                        className="bg-slate-50 rounded-lg p-2 cursor-pointer hover:bg-slate-100 transition-colors border-l-2"
                        style={{ borderColor: ct?.color ?? "#ccc" }}
                        onClick={() => setModal(item)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs">{ct?.icon}</span>
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="text-xs font-bold text-slate-700 leading-tight mb-1 line-clamp-2">{item.title}</div>
                        <TeamBadge teamId={item.teamId} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white text-2xl shadow-xl flex items-center justify-center font-black z-40 hover:scale-105 transition-transform"
        style={{ background: BRAND.navy }}
      >
        ＋
      </button>

      {modal && (
        <ContentModal
          item={modal === true ? undefined : modal}
          campaigns={campaigns}
          weekIndex={week}
          user={user?.displayName ?? "User"}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
