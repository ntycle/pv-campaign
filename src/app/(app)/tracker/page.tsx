"use client";
import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { vi } from "date-fns/locale";
import { DateWeekHeader } from "@/components/layout/DateWeekHeader";
import { CONTENT_QUOTAS, STATUS_CONFIG, BRAND } from "@/lib/constants";
import { subscribeAllContentItems, subscribeCampaigns, upsertContentItem } from "@/lib/firestore";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { pct } from "@/lib/utils";
import type { ContentItem, ContentStatus, Campaign } from "@/types";

export default function TrackerPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [content, setContent] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<ContentStatus>("pending");

  useEffect(() => subscribeCampaigns(setCampaigns), []);
  useEffect(() => subscribeAllContentItems(setContent), []);

  const campMap = Object.fromEntries(campaigns.map(c => [c.id, c]));

  const weekStartStr = format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEndStr = format(endOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const filteredContent = content.filter(c => c.date >= weekStartStr && c.date <= weekEndStr);

  const handleStatusSave = async (item: ContentItem) => {
    await upsertContentItem({ ...item, status: editStatus });
    setEditId(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <DateWeekHeader currentDate={currentDate} onChange={setCurrentDate} title="Content Tracker" />

      <div className="flex-1 p-6 space-y-6">
        {Object.entries(CONTENT_QUOTAS).map(([type, cfg]) => {
          const items = filteredContent.filter(c => c.type === type);
          const done  = items.filter(c => c.status === "done").length;
          const p     = pct(items.length, cfg.weekly);

          return (
            <div key={type}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: cfg.color, color: "#fff" }}
                >
                  {cfg.icon}
                </div>
                <div>
                  <span className="font-black text-sm text-slate-800">{cfg.label}</span>
                  <span className="text-xs text-slate-400 ml-2">({items.length}/{cfg.weekly})</span>
                </div>
                <div className="flex-1 max-w-40 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: Math.min(p,100)+"%", background: cfg.color }} />
                </div>
                <span className="text-xs font-black" style={{ color: cfg.color }}>{p}%</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr style={{ background: BRAND.navy }}>
                      {["Tiêu đề","Team","Campaign","Ngày","Trạng thái","Ghi chú",""].map((h,i) => (
                        <th key={i} className="px-4 py-2.5 text-left text-xs font-bold text-white">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={7} className="py-6 text-center text-slate-300 text-xs">Chưa có nội dung tuần này</td></tr>
                    ) : items.map((item, i) => {
                      const cp = campMap[item.campaignId];
                      const isEditing = editId === item.id;
                      return (
                        <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-4 py-2.5 font-semibold text-slate-800">{item.title}</td>
                          <td className="px-4 py-2.5"><TeamBadge teamId={item.teamId} /></td>
                          <td className="px-4 py-2.5">
                            {cp ? (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: cp.color, background: cp.color + "18" }}>{cp.name}</span>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-xs">{format(new Date(item.date), "EEEE, dd/MM", { locale: vi })}</td>
                          <td className="px-4 py-2.5">
                            {isEditing ? (
                              <select
                                value={editStatus}
                                onChange={e => setEditStatus(e.target.value as ContentStatus)}
                                className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none"
                              >
                                {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                            ) : (
                              <span className="cursor-pointer" onClick={() => { setEditId(item.id); setEditStatus(item.status); }}>
                                <StatusBadge status={item.status} />
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-400">{item.note || "—"}</td>
                          <td className="px-4 py-2.5 text-right">
                            {isEditing && (
                              <button
                                onClick={() => handleStatusSave(item)}
                                className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100"
                              >
                                Lưu
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
