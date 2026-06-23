"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { format, addDays, startOfWeek, addWeeks } from "date-fns";
import { vi } from "date-fns/locale";
import {
  subscribeCampaigns, subscribeReports, upsertReport,
  subscribeContentItems, upsertContentItem, deleteContentItem,
  subscribeBookings, upsertBooking, deleteBooking,
} from "@/lib/firestore";
import { BRAND, TEAM_KPI_FIELDS, CONTENT_QUOTAS, STATUS_CONFIG, WEEKS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useSystem } from "@/hooks/useSystem";
import type { Campaign, ReportEntry, TeamId, ContentItem, Booking, ContentType, ResourceType, ContentStatus } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";

type PeriodType = "week" | "month" | "quarter" | "campaign";

// ── KPI Actuals Panel ──────────────────────────────────────
function KpiRow({
  field, entry, campaignTarget, canEdit, saving, onSave
}: {
  field: { id: string; label: string; unit?: string };
  entry: ReportEntry | undefined;
  campaignTarget: number;
  canEdit: boolean;
  saving: boolean;
  onSave: (val: number) => void;
}) {
  const [val, setVal] = useState(entry?.actual ?? 0);

  useEffect(() => {
    setVal(entry?.actual ?? 0);
  }, [entry?.actual]);

  const displayTarget = campaignTarget > 0 ? campaignTarget : (entry?.target ?? 0);
  const pct = displayTarget > 0 ? Math.round(val / displayTarget * 100) : 0;
  const barColor = pct >= 90 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-4">
          <div className="text-sm font-black text-slate-800 mb-1">{field.label}</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-2 bg-slate-200 rounded-full">
              <div className="h-full rounded-full transition-all" style={{ width: Math.min(pct,100)+"%", background: barColor }} />
            </div>
            <span className="text-xs font-black w-10 text-right" style={{ color: barColor }}>{pct}%</span>
          </div>
          <div className="text-xs font-medium text-slate-500 mt-2">
            Target: <span className="font-bold text-slate-800">{displayTarget.toLocaleString()}</span> {field.unit}
          </div>
        </div>

        {canEdit ? (
          <div className="flex flex-col gap-2 items-end">
            <input
              type="number" min={0}
              disabled={saving}
              className="w-32 px-3 py-2 border border-slate-200 rounded-xl text-sm text-right focus:outline-none focus:border-slate-400 font-bold"
              value={val || ""}
              onChange={e => setVal(+e.target.value)}
              placeholder="Actual"
            />
            <div className="flex items-center gap-2 mt-1">
              <button
                disabled={saving || val === 0}
                onClick={() => { setVal(0); onSave(0); }}
                className="px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Xoá
              </button>
              <button
                disabled={saving || val === (entry?.actual ?? 0)}
                onClick={() => onSave(val)}
                className="px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                style={{ background: BRAND.navy }}
              >
                {saving ? "..." : "Lưu"}
              </button>
            </div>
          </div>
        ) : (
          <span className="text-lg font-black text-slate-800 w-24 text-right mt-1">
            {val.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

function KpiTab({ teamId, campaignId, reports, canEdit, userName }: { teamId: TeamId; campaignId: string; reports: ReportEntry[]; canEdit: boolean; userName: string; }) {
  const [weekMode, setWeekMode] = useState<"campaign" | "week">("campaign");
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);

  const periodType: PeriodType = weekMode;
  const periodValue = weekMode === "campaign" ? 0 : selectedWeek;
  const fields = TEAM_KPI_FIELDS[teamId] ?? [];

  const getEntry = (metricId: string) => reports.find(r => r.metricId === metricId && r.period.type === periodType && r.period.value === periodValue);
  const getCampaignTarget = (metricId: string) => reports.find(r => r.metricId === metricId && r.period.type === "campaign")?.target ?? 0;

  const handleActualChange = async (metricId: string, unit: string, actual: number) => {
    setSaving(metricId);
    const existing = getEntry(metricId);
    await upsertReport({
      id:         existing?.id,
      campaignId,
      teamId,
      metricId,
      unit,
      period:     { type: periodType, value: periodValue },
      target:     existing?.target ?? getCampaignTarget(metricId),
      actual,
      updatedBy:  userName,
      updatedAt:  new Date().toISOString(),
    });
    setSaving(null);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">📊 Cập nhật KPI Actual</h3>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg shadow-inner">
            <button
              onClick={() => setWeekMode("campaign")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${weekMode === "campaign" ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tổng campaign
            </button>
            <button
              onClick={() => setWeekMode("week")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${weekMode === "week" ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Theo tuần
            </button>
          </div>
          {weekMode === "week" && (
            <select
              className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg font-bold bg-white focus:outline-none shadow-sm"
              value={selectedWeek}
              onChange={e => setSelectedWeek(+e.target.value)}
            >
              {WEEKS.map((w, i) => <option key={i} value={i}>{w}</option>)}
            </select>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {fields.map(field => (
          <KpiRow
            key={field.id} field={field} entry={getEntry(field.id)}
            campaignTarget={getCampaignTarget(field.id)} canEdit={canEdit}
            saving={saving === field.id} onSave={(val) => handleActualChange(field.id, field.unit ?? "", val)}
          />
        ))}
        {fields.length === 0 && <div className="col-span-full text-center text-sm text-slate-400 py-10">Team này chưa có KPI metrics.</div>}
      </div>
    </div>
  );
}

// ── Nội dung Tab ──────────────────────────────────────────
function ContentTab({ teamId, campaign, contents, canEdit, userName }: { teamId: TeamId; campaign: Campaign; contents: ContentItem[]; canEdit: boolean; userName: string; }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(campaign.startDate || format(new Date(), "yyyy-MM-dd"));
  const [type, setType] = useState<ContentType>("post");
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewWeekOffset, setViewWeekOffset] = useState(0);

  useEffect(() => {
    setViewWeekOffset(0);
  }, [campaign.id]);

  const handleAdd = async () => {
    if (!title) return;
    setSaving(true);
    await upsertContentItem({
      campaignId: campaign.id, teamId, title, date, type, status: "pending", updatedBy: userName
    });
    setTitle("");
    setSaving(false);
  };

  const updateStatus = async (item: ContentItem, newStatus: ContentStatus) => {
    await upsertContentItem({ ...item, status: newStatus, updatedBy: userName });
  };

  const filteredContents = contents.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    return true;
  });

  const getTypeBadge = (ctype: ContentType) => {
    const config = CONTENT_QUOTAS[ctype];
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: config?.color + "20", color: config?.color }}>{config?.icon} {config?.label}</span>;
  };

  const renderSocialGrid = () => {
    const weekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), viewWeekOffset);
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setViewWeekOffset(v => v - 1)}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            ← Tuần trước
          </button>
          <div className="text-center">
            <div className="text-sm font-black text-slate-800">
              {format(weekStart, "dd/MM")} – {format(addDays(weekStart, 6), "dd/MM/yyyy")}
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xs text-slate-400">Tuần {format(weekStart, "w")}</span>
              {viewWeekOffset === 0 && (
                <span className="text-xs text-blue-500 font-bold">· Tuần này</span>
              )}
              {viewWeekOffset !== 0 && (
                <button
                  onClick={() => setViewWeekOffset(0)}
                  className="text-xs text-blue-500 font-bold hover:underline"
                >
                  · Về hôm nay
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setViewWeekOffset(v => v + 1)}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Tuần sau →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayContents = filteredContents.filter(c => c.date === dateStr);
          const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
          return (
            <div key={dateStr} className={`bg-slate-50 rounded-xl border ${isToday ? 'border-blue-300 ring-1 ring-blue-300' : 'border-slate-200'} p-3 min-h-[200px] flex flex-col`}>
              <div className="text-center mb-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase">{format(day, "EEEE", { locale: vi })}</div>
                <div className={`text-lg font-black ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{format(day, "dd/MM")}</div>
              </div>
              <div className="flex-1 space-y-2">
                {dayContents.map(c => (
                  <div key={c.id} className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm group">
                    <div className="mb-1">{getTypeBadge(c.type)}</div>
                    <div className="text-xs font-bold text-slate-800 leading-tight mb-2">{c.title}</div>
                    <div className="flex justify-between items-center">
                      {canEdit ? (
                        <select 
                          className="text-[10px] py-1 pl-1 pr-4 bg-slate-50 border border-slate-200 rounded font-medium focus:outline-none"
                          value={c.status}
                          onChange={e => updateStatus(c, e.target.value as ContentStatus)}
                        >
                          {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      ) : (
                        <StatusBadge status={c.status} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    );
  };

  const renderGenericTable = () => (
    <div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-bold text-slate-600">Tiêu đề</th>
              <th className="px-4 py-3 font-bold text-slate-600">Ngày đăng</th>
              <th className="px-4 py-3 font-bold text-slate-600">Loại</th>
              <th className="px-4 py-3 font-bold text-slate-600">Trạng thái</th>
              {canEdit && <th className="px-4 py-3 text-right"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...filteredContents].sort((a,b) => b.date.localeCompare(a.date)).map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{c.title}</td>
                <td className="px-4 py-3 text-slate-500">{format(new Date(c.date), "dd/MM/yyyy")}</td>
                <td className="px-4 py-3">{getTypeBadge(c.type)}</td>
                <td className="px-4 py-3">
                  {canEdit ? (
                    <select 
                      className="text-xs py-1 px-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none"
                      value={c.status}
                      onChange={e => updateStatus(c, e.target.value as ContentStatus)}
                    >
                      {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  ) : <StatusBadge status={c.status} />}
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteContentItem(c.id)} className="text-red-500 font-bold hover:underline text-xs">Xoá</button>
                  </td>
                )}
              </tr>
            ))}
            {filteredContents.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Không tìm thấy nội dung nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-6">📝 Quản lý Nội dung</h3>
      {canEdit && (
        <div className="flex gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <input type="text" placeholder="Tên nội dung mới..." className="px-4 py-2 border border-slate-200 rounded-xl text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-100" value={title} onChange={e => setTitle(e.target.value)} />
          <input type="date" min={campaign.startDate} max={campaign.endDate} className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none" value={date} onChange={e => setDate(e.target.value)} />
          <select className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none" value={type} onChange={e => setType(e.target.value as ContentType)}>
            {Object.entries(CONTENT_QUOTAS).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
          <button onClick={handleAdd} disabled={saving || !title} className="px-6 py-2 text-white rounded-xl text-sm font-bold shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: BRAND.navy }}>Thêm</button>
        </div>
      )}

      <div className="flex gap-4 mb-4 mt-6">
        <select className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">Tất cả định dạng</option>
          {Object.keys(CONTENT_QUOTAS).map(k => <option key={k} value={k}>{CONTENT_QUOTAS[k as ContentType].label}</option>)}
        </select>
      </div>

      {teamId === "social" ? renderSocialGrid() : renderGenericTable()}
    </div>
  );
}

// ── Kế Hoạch Tab (Checklist Deliverables) ─────────────────────
function RevisionInput({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [localVal, setLocalVal] = useState(value);
  useEffect(() => setLocalVal(value), [value]);
  return (
    <input
      type="number" min={0}
      className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs text-center font-bold"
      value={localVal}
      onChange={e => setLocalVal(+e.target.value)}
      onBlur={() => { if (localVal !== value) onSave(localVal); }}
    />
  );
}
function PlanTab({ teamId, campaign, bookings, reports, canEdit, userName }: { teamId: TeamId; campaign: Campaign; bookings: Booking[]; reports: ReportEntry[]; canEdit: boolean; userName: string; }) {
  const { resources, resourceMap } = useSystem();
  const [resource, setResource] = useState<ResourceType>("design_slot");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!desc) return;
    setSaving(true);
    await upsertBooking({
      campaignId: campaign.id, teams: [teamId], resourceType: resource, dates: [format(new Date(), "yyyy-MM-dd")],
      priority: "medium", status: "pending", description: desc, updatedBy: userName, revisionRounds: 0
    });
    setDesc("");
    setSaving(false);
  };

  const updateBookingStatus = async (booking: Booking, newStatus: ContentStatus) => {
    await upsertBooking({ ...booking, status: newStatus, updatedBy: userName });
  };

  const updateRevisions = async (booking: Booking, rounds: number) => {
    await upsertBooking({ ...booking, revisionRounds: rounds, updatedBy: userName });
  };

  const renderDesignStats = () => {
    if (teamId !== "design") return null;
    const target = reports.find(r => r.metricId === "assets_done" && r.period.type === "campaign")?.target || 0;
    const doneCount = bookings.filter(b => b.status === "done").length;
    const revisionsSum = bookings.reduce((sum, b) => sum + (b.revisionRounds || 0), 0);
    const avgRevisions = bookings.length ? (revisionsSum / bookings.length).toFixed(1) : "0.0";
    
    return (
      <div className="flex gap-6 mb-6">
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex-1">
          <div className="text-xs text-emerald-600 font-bold mb-1 uppercase tracking-wide">Assets Hoàn thành / Target</div>
          <div className="text-3xl font-black text-emerald-700">{doneCount} <span className="text-xl text-emerald-500">/ {target}</span></div>
        </div>
        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex-1">
          <div className="text-xs text-amber-600 font-bold mb-1 uppercase tracking-wide">Avg. Revision Rounds</div>
          <div className="text-3xl font-black text-amber-700">{avgRevisions} <span className="text-xl text-amber-500 font-medium">lần/asset</span></div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-6">✅ Checklist Kế Hoạch & Công Việc</h3>
      
      {renderDesignStats()}

      {canEdit && (
        <div className="flex gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <select className="px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none w-48" value={resource} onChange={e => setResource(e.target.value as ResourceType)}>
            {resources.map(r => <option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
          </select>
          <input type="text" placeholder="Mô tả công việc / Asset name..." className="px-4 py-2 border border-slate-200 rounded-xl text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-100" value={desc} onChange={e => setDesc(e.target.value)} />
          <button onClick={handleAdd} disabled={saving || !desc} className="px-6 py-2 text-white rounded-xl text-sm font-bold shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: BRAND.navy }}>Thêm</button>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map(b => (
          <div key={b.id} className={`flex items-center justify-between p-4 rounded-xl border ${b.status === 'done' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-4 flex-1">
              {canEdit ? (
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  checked={b.status === "done"}
                  onChange={(e) => updateBookingStatus(b, e.target.checked ? "done" : "pending")}
                />
              ) : (
                <div className={`w-5 h-5 rounded-full border-2 ${b.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}></div>
              )}
              
              <div>
                <div className={`font-bold text-sm ${b.status === 'done' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                  {b.description || "Công việc không tên"}
                </div>
                <div className="text-[10px] text-slate-400 font-black uppercase mt-1">
                  {resourceMap[b.resourceType]?.icon} {resourceMap[b.resourceType]?.label}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {teamId === "design" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Revisions:</span>
                  {canEdit ? (
                    <RevisionInput value={b.revisionRounds ?? 0} onSave={(v) => updateRevisions(b, v)} />
                  ) : (
                    <span className="text-sm font-black text-slate-800">{b.revisionRounds ?? 0}</span>
                  )}
                </div>
              )}
              
              {canEdit ? (
                <div className="flex items-center gap-3">
                  <select 
                    className="text-xs py-1 pl-2 pr-6 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none"
                    value={b.status}
                    onChange={e => updateBookingStatus(b, e.target.value as ContentStatus)}
                  >
                    {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button onClick={() => deleteBooking(b.id)} className="text-red-500 font-bold text-xs hover:underline">Xoá</button>
                </div>
              ) : (
                <StatusBadge status={b.status} />
              )}
            </div>
          </div>
        ))}
        {bookings.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Chưa có công việc nào trong kế hoạch.</div>}
      </div>
    </div>
  );
}

// ── Main Team Workspace ───────────────────────────────────
export default function TeamWorkspacePage({ params }: { params: Promise<{ id: string; teamId: string }> }) {
  const { id, teamId } = use(params);
  const tid = teamId as TeamId;
  const { canEdit, user } = useAuth();
  const { teamMap } = useSystem();
  const team = teamMap[tid];

  const [activeTab, setActiveTab] = useState<"plan" | "content" | "kpi">("plan");
  
  const [campaign, setCampaign]   = useState<Campaign | null>(null);
  const [reports, setReports]     = useState<ReportEntry[]>([]);
  const [contents, setContents]   = useState<ContentItem[]>([]);
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    return subscribeCampaigns(camps => {
      if (camps.length === 0) return;
      const found = camps.find(c => c.id === id);
      if (found) {
        setCampaign(found);
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => subscribeReports(id, setReports), [id]);
  useEffect(() => subscribeContentItems(id, tid, setContents), [id, tid]);
  useEffect(() => subscribeBookings(id, tid, setBookings), [id, tid]);

  const editAllowed = canEdit(tid);
  const userName    = user?.displayName ?? "user";

  const tabs: { id: "plan" | "content" | "kpi"; label: string }[] = [
    { id: "plan", label: "📋 Kế hoạch" },
    { id: "content", label: "📝 Nội dung" },
    { id: "kpi", label: "🎯 KPI" }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-3 text-slate-400">
        <p className="text-sm font-medium">Campaign không tồn tại hoặc đã bị xóa.</p>
        <Link href="/campaigns" className="text-xs text-blue-500 font-bold hover:underline">← Quay lại danh sách</Link>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-3 text-slate-400">
        <p className="text-sm font-medium">Team không hợp lệ.</p>
        <Link href="/campaigns" className="text-xs text-blue-500 font-bold hover:underline">← Quay lại danh sách</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-sm text-slate-400 font-medium">
          <Link href="/campaigns" className="hover:text-slate-600 transition-colors">Campaigns</Link>
          <span>›</span>
          <Link href={`/campaigns/${id}`} className="hover:text-slate-600 transition-colors">{campaign.name}</Link>
          <span>›</span>
          <span className="font-bold text-slate-700">{team.icon} Workspace</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner" style={{ background: team.color + "15", border: `1px solid ${team.color}30` }}>
              {team.icon}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800" style={{ color: team.color }}>{team.label} Workspace</h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">{team.sublabel} · {campaign.name}</p>
            </div>
          </div>
          
          {/* Tabs Navigation */}
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Workspace Content */}
      <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === "plan" && (
            <PlanTab teamId={tid} campaign={campaign} bookings={bookings} reports={reports} canEdit={editAllowed} userName={userName} />
          )}
          {activeTab === "content" && (
            <ContentTab teamId={tid} campaign={campaign} contents={contents} canEdit={editAllowed} userName={userName} />
          )}
          {activeTab === "kpi" && (
            <KpiTab teamId={tid} campaignId={id} reports={reports.filter(r => r.teamId === tid)} canEdit={editAllowed} userName={userName} />
          )}
        </div>
      </div>
    </div>
  );
}
