"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { format, eachDayOfInterval } from "date-fns";
import {
  subscribeCampaigns, subscribeReports, upsertReport,
  subscribeContentItems, upsertContentItem, deleteContentItem,
  subscribeBookings, subscribeAllBookings, upsertBooking, deleteBooking,
  subscribeResourceQuotas
} from "@/lib/firestore";
import { BRAND, WEEKS, MONTHS, QUARTERS, PERIOD_LABELS, TEAM_KPI_FIELDS, CONTENT_QUOTAS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useSystem } from "@/hooks/useSystem";
import type { Campaign, ReportEntry, TeamId, Period, ContentItem, Booking, ContentType, ResourceType, Priority, ResourceQuota } from "@/types";

type PeriodType = "week" | "month" | "quarter" | "campaign";

// ── Production Panel ───────────────────────────────────────
function ProductionPanel({
  teamId, campaign, contents, canEdit, userName,
}: {
  teamId: TeamId; campaign: Campaign; contents: ContentItem[]; canEdit: boolean; userName: string;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(campaign.startDate || format(new Date(), "yyyy-MM-dd"));
  const [type, setType] = useState<ContentType>("post");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!title) return;
    setSaving(true);
    await upsertContentItem({
      campaignId: campaign.id, teamId, title, date, type, status: "pending",
      updatedBy: userName
    });
    setTitle("");
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-wide mb-4">📅 Lên lịch sản xuất</h3>
      {canEdit && (
        <div className="flex flex-col gap-2 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <input type="text" placeholder="Tên nội dung..." className="px-3 py-2 border border-slate-200 rounded text-sm w-full focus:outline-none" value={title} onChange={e => setTitle(e.target.value)} />
          <div className="flex gap-2">
            <input type="date" min={campaign.startDate} max={campaign.endDate} className="px-3 py-2 border border-slate-200 rounded text-sm flex-1 focus:outline-none" value={date} onChange={e => setDate(e.target.value)} />
            <select className="px-3 py-2 border border-slate-200 rounded text-sm flex-1 focus:outline-none" value={type} onChange={e => setType(e.target.value as ContentType)}>
              {Object.entries(CONTENT_QUOTAS).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <button onClick={handleAdd} disabled={saving || !title} className="px-4 py-2 text-white rounded text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: BRAND.navy }}>Thêm</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {contents.sort((a,b) => a.date.localeCompare(b.date)).map(c => (
          <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm">
            <div>
              <div className="font-bold text-slate-700">{c.title} <span className="text-xs font-medium text-slate-400 ml-1">({c.type})</span></div>
              <div className="text-[10px] font-black text-slate-500 mt-0.5">{format(new Date(c.date), "dd/MM/yyyy")}</div>
            </div>
            {canEdit && <button onClick={() => deleteContentItem(c.id)} className="text-red-500 text-xs font-bold hover:underline">Xóa</button>}
          </div>
        ))}
        {contents.length === 0 && <div className="text-xs text-slate-400 text-center py-4">Chưa có lịch sản xuất.</div>}
      </div>
    </div>
  );
}

// ── Resource Booking Panel ─────────────────────────────────
function ResourceBookingPanel({
  teamId, campaign, bookings, allBookings, quotas, canEdit, userName,
}: {
  teamId: TeamId; campaign: Campaign; bookings: Booking[];
  allBookings: Booking[]; quotas: ResourceQuota[];
  canEdit: boolean; userName: string;
}) {
  const { resources, resourceMap } = useSystem();
  const [resource, setResource] = useState<ResourceType>("design_slot");
  const [startDate, setStartDate] = useState<string>(campaign.startDate || format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(campaign.startDate || format(new Date(), "yyyy-MM-dd"));
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [saving, setSaving] = useState(false);

  // Calculate remaining slots for selected resource and date range
  const calculateRemainingSlots = () => {
    if (!startDate || !endDate) return null;
    const cfg = resourceMap[resource];
    if (!cfg) return null;
    // Find the most specific quota: week > default
    const dateRange = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) }).map(d => format(d, "yyyy-MM-dd"));
    // Get max usage across all days in the range
    let maxUsed = 0;
    dateRange.forEach(dateStr => {
      const used = allBookings.filter(b => b.resourceType === resource && b.dates.includes(dateStr)).length;
      if (used > maxUsed) maxUsed = used;
    });
    // Find capacity from quotas or fall back to default
    const specificQuota = quotas.find(q => q.resourceType === resource && q.timeframe === "default");
    const capacity = specificQuota?.capacity ?? cfg.capacity;
    return { used: maxUsed, capacity, remaining: Math.max(0, capacity - maxUsed) };
  };

  const slotInfo = calculateRemainingSlots();
  const isOverCapacity = slotInfo !== null && slotInfo.remaining <= 0;

  const handleAdd = async () => {
    if (!startDate || !endDate) return;
    if (startDate > endDate) {
      alert("Ngày kết thúc phải sau ngày bắt đầu!");
      return;
    }
    if (isOverCapacity) {
      alert("Không còn slot trống cho tài nguyên này trong khoảng ngày đã chọn!");
      return;
    }
    const dateArray = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) }).map(d => format(d, "yyyy-MM-dd"));
    setSaving(true);
    await upsertBooking({
      campaignId: campaign.id, teams: [teamId], resourceType: resource, dates: dateArray,
      priority, status: "pending", description: desc, updatedBy: userName
    });
    setDesc("");
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm mt-6">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-wide mb-4">🛠️ Booking Tài Nguyên</h3>
      {canEdit && (
        <div className="flex flex-col gap-2 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <select className="px-3 py-2 border border-slate-200 rounded text-sm w-full focus:outline-none" value={resource} onChange={e => setResource(e.target.value as ResourceType)}>
            {resources.map(r => <option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="date" min={campaign.startDate} max={campaign.endDate} className="px-3 py-2 border border-slate-200 rounded text-sm flex-1 focus:outline-none" value={startDate} onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }} />
            <span className="self-center text-xs text-slate-400">đến</span>
            <input type="date" min={startDate} max={campaign.endDate} className="px-3 py-2 border border-slate-200 rounded text-sm flex-1 focus:outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          {/* Slot availability indicator */}
          {slotInfo !== null && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border ${
              isOverCapacity
                ? "bg-red-50 border-red-200 text-red-600"
                : slotInfo.remaining <= 1
                  ? "bg-amber-50 border-amber-200 text-amber-600"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}>
              <span>{isOverCapacity ? "🔴 Hết slot!" : slotInfo.remaining <= 1 ? "🟡 Sắp hết" : "🟢 Còn slot"}</span>
              <span>Còn trống: {slotInfo.remaining}/{slotInfo.capacity} slot</span>
            </div>
          )}

          <input type="text" placeholder="Ghi chú thêm..." className="px-3 py-2 border border-slate-200 rounded text-sm w-full focus:outline-none" value={desc} onChange={e => setDesc(e.target.value)} />
          <div className="flex gap-2">
            <select className="px-3 py-2 border border-slate-200 rounded text-sm flex-1 focus:outline-none" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button onClick={handleAdd} disabled={saving || !startDate || !endDate || isOverCapacity} className="px-4 py-2 text-white rounded text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: isOverCapacity ? "#DC2626" : BRAND.navy }}>Book</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {bookings.map(b => (
          <div key={b.id} className="flex flex-col p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="font-bold text-slate-700">{resourceMap[b.resourceType]?.icon} {resourceMap[b.resourceType]?.label}</span>
              {canEdit && <button onClick={() => deleteBooking(b.id)} className="text-red-500 text-xs font-bold hover:underline">Xóa</button>}
            </div>
            <div className="text-[10px] font-black text-slate-500 mb-1">
              {b.dates.length > 1 
                ? `${format(new Date(b.dates[0]), "dd/MM/yyyy")} - ${format(new Date(b.dates[b.dates.length - 1]), "dd/MM/yyyy")}` 
                : format(new Date(b.dates[0]), "dd/MM/yyyy")}
            </div>
            {b.description && <div className="text-xs italic text-slate-600">{b.description}</div>}
          </div>
        ))}
        {bookings.length === 0 && <div className="text-xs text-slate-400 text-center py-4">Chưa có booking nào.</div>}
      </div>
    </div>
  );
}

// ── KPI Row Component ──────────────────────────────────────
function KpiRow({
  field, entry, canEdit, saving, onSave
}: {
  field: { id: string; label: string; unit?: string };
  entry: ReportEntry | undefined;
  canEdit: boolean;
  saving: boolean;
  onSave: (val: number) => void;
}) {
  const [val, setVal] = useState(entry?.actual ?? 0);

  useEffect(() => {
    setVal(entry?.actual ?? 0);
  }, [entry?.actual]);

  const target = entry?.target ?? 0;
  const pct = target > 0 ? Math.round(val / target * 100) : 0;
  const barColor = pct >= 90 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-4">
          <div className="text-xs font-bold text-slate-700 mb-1">{field.label}</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full">
              <div className="h-full rounded-full transition-all" style={{ width: Math.min(pct,100)+"%", background: barColor }} />
            </div>
            <span className="text-[10px] font-black w-8 text-right" style={{ color: barColor }}>{pct}%</span>
          </div>
          <div className="text-[10px] font-medium text-slate-500">
            Target: <span className="font-bold text-slate-700">{target.toLocaleString()}</span> {field.unit}
          </div>
        </div>

        {canEdit ? (
          <div className="flex flex-col gap-1 items-end">
            <input
              type="number" min={0}
              disabled={saving}
              className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:border-slate-400"
              value={val || ""}
              onChange={e => setVal(+e.target.value)}
              placeholder="Actual"
            />
            <div className="flex items-center gap-1 mt-1">
              <button
                disabled={saving || val === 0}
                onClick={() => { setVal(0); onSave(0); }}
                className="px-2 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              >
                Xoá
              </button>
              <button
                disabled={saving || val === (entry?.actual ?? 0)}
                onClick={() => onSave(val)}
                className="px-3 py-1 text-[10px] font-bold text-white rounded transition-colors disabled:opacity-50"
                style={{ background: BRAND.navy }}
              >
                {saving ? "..." : "Lưu"}
              </button>
            </div>
          </div>
        ) : (
          <span className="text-sm font-black text-slate-700 w-20 text-right mt-1">
            {val.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

// ── KPI Actuals Panel ──────────────────────────────────────
function KpiPanel({
  teamId, campaignId, reports, canEdit, userName,
}: {
  teamId: TeamId; campaignId: string;
  reports: ReportEntry[]; canEdit: boolean; userName: string;
}) {
  const [periodType, setPeriodType] = useState<PeriodType>("week");
  const [periodValue, setPeriodValue] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);

  const periodOptions =
    periodType === "campaign" ? [{ label: "Tổng Campaign", value: 0 }] :
    periodType === "week"  ? WEEKS.map((w,i) => ({ label: w, value: i })) :
    periodType === "month" ? MONTHS.map((m,i) => ({ label: m, value: i+1 })) :
    QUARTERS.map((q,i) => ({ label: q, value: i+1 }));

  const fields = TEAM_KPI_FIELDS[teamId] ?? [];

  const getEntry = (metricId: string) =>
    reports.find(r =>
      r.metricId === metricId &&
      r.period.type === periodType &&
      r.period.value === periodValue
    );

  const handleActualChange = async (metricId: string, unit: string, actual: number) => {
    setSaving(metricId);
    const existing = getEntry(metricId);
    await upsertReport({
      ...(existing ?? {}),
      id:         existing?.id,
      campaignId,
      teamId,
      metricId,
      unit,
      period:     { type: periodType, value: periodValue },
      target:     existing?.target ?? 0,
      actual,
      updatedBy:  userName,
      updatedAt:  new Date().toISOString(),
    });
    setSaving(null);
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wide">📊 Cập nhật KPI Actual</h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            {(["week","month","quarter", "campaign"] as PeriodType[]).map(pt => (
              <button key={pt}
                onClick={() => { setPeriodType(pt); setPeriodValue(pt === "week" || pt === "campaign" ? 0 : 1); }}
                className="px-2.5 py-1 text-[10px] font-bold transition-colors"
                style={periodType === pt
                  ? { background: BRAND.navy, color: "#fff" }
                  : { background: "#F9FAFB", color: "#374151" }
                }
              >
                {PERIOD_LABELS[pt]}
              </button>
            ))}
          </div>
          <select
            className="px-2 py-1 border border-slate-200 rounded-lg text-[10px] font-semibold focus:outline-none"
            value={periodValue}
            onChange={e => setPeriodValue(+e.target.value)}
          >
            {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {fields.map(field => {
          const entry = getEntry(field.id);
          return (
            <KpiRow
              key={field.id}
              field={field}
              entry={entry}
              canEdit={canEdit}
              saving={saving === field.id}
              onSave={(val) => handleActualChange(field.id, field.unit ?? "", val)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Main Team Workspace ───────────────────────────────────
export default function TeamWorkspacePage({
  params,
}: { params: Promise<{ id: string; teamId: string }> }) {
  const { id, teamId } = use(params);
  const tid = teamId as TeamId;
  const { userProfile, canEdit, user } = useAuth();
  const { teamMap } = useSystem();
  const team = teamMap[tid];

  const [campaign, setCampaign]   = useState<Campaign | null>(null);
  const [reports, setReports]     = useState<ReportEntry[]>([]);
  const [contents, setContents]   = useState<ContentItem[]>([]);
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [quotas, setQuotas]       = useState<ResourceQuota[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    return subscribeCampaigns(camps => {
      const found = camps.find(c => c.id === id);
      if (found) { setCampaign(found); setLoading(false); }
    });
  }, [id]);

  useEffect(() => subscribeReports(id, setReports), [id]);
  useEffect(() => subscribeContentItems(id, tid, setContents), [id, tid]);
  useEffect(() => subscribeBookings(id, tid, setBookings), [id, tid]);
  useEffect(() => subscribeAllBookings(setAllBookings), []);
  useEffect(() => subscribeResourceQuotas(setQuotas), []);

  const myReports   = reports.filter(r => r.teamId === tid);
  const editAllowed = canEdit(tid);
  const userName    = user?.displayName ?? "user";

  if (loading || !campaign || !team) {
    return <div className="flex items-center justify-center h-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2 mb-2 text-sm text-slate-400">
          <Link href="/campaigns" className="hover:text-slate-600">Campaigns</Link>
          <span>›</span>
          <Link href={`/campaigns/${id}`} className="hover:text-slate-600">{campaign.name}</Link>
          <span>›</span>
          <span className="font-bold text-slate-700">{team.icon} {team.label}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: team.color + "20" }}>
              {team.icon}
            </div>
            <div>
              <h1 className="text-base font-black text-slate-800">{team.label} Workspace</h1>
              <p className="text-xs text-slate-400">{team.sublabel} · {campaign.name}</p>
            </div>
          </div>
          {!editAllowed && (
            <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg font-semibold">
              👁️ Chế độ xem
            </div>
          )}
          {editAllowed && (
            <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-semibold">
              ✏️ Có thể chỉnh sửa
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production & Booking (Left Column) */}
        <div className="flex flex-col">
          <ProductionPanel
            teamId={tid}
            campaign={campaign}
            contents={contents}
            canEdit={editAllowed}
            userName={userName}
          />
          <ResourceBookingPanel
            teamId={tid}
            campaign={campaign}
            bookings={bookings}
            allBookings={allBookings}
            quotas={quotas}
            canEdit={editAllowed}
            userName={userName}
          />
        </div>

        {/* KPI Actuals */}
        <KpiPanel
          teamId={tid}
          campaignId={id}
          reports={myReports}
          canEdit={editAllowed}
          userName={userName}
        />
      </div>
    </div>
  );
}
