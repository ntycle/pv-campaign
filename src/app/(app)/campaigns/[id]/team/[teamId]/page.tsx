"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  subscribeCampaigns, subscribeReports, subscribeTeamPlans,
  upsertReport, upsertTeamPlan,
} from "@/lib/firestore";
import { TEAM_MAP, BRAND, WEEKS, MONTHS, QUARTERS, PERIOD_LABELS, TEAM_KPI_FIELDS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { Campaign, ReportEntry, TeamPlan, TeamId, Period } from "@/types";

type PeriodType = "week" | "month" | "quarter";

// ── Booking Slots Panel ────────────────────────────────────
function BookingPanel({
  teamId, campaignId, teamPlan, canEdit, userName,
}: {
  teamId: TeamId; campaignId: string;
  teamPlan: TeamPlan | null; canEdit: boolean; userName: string;
}) {
  const [weekly, setWeekly] = useState<Record<number, number>>(teamPlan?.weeklyTargets ?? {});
  const [monthly, setMonthly] = useState(teamPlan?.monthlyTarget ?? 0);
  const [quarterly, setQuarterly] = useState(teamPlan?.quarterlyTarget ?? 0);
  const [notes, setNotes] = useState(teamPlan?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await upsertTeamPlan({
      id:              teamPlan?.id,
      campaignId,
      teamId,
      weeklyTargets:   weekly,
      monthlyTarget:   monthly,
      quarterlyTarget: quarterly,
      notes,
      submittedBy:     userName,
      updatedAt:       new Date().toISOString(),
    });
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-wide mb-4">📅 Booking Slots</h3>
      <div className="space-y-4">
        {/* Weekly */}
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-2">Theo tuần</label>
          <div className="grid grid-cols-4 gap-2">
            {WEEKS.map((w, i) => (
              <div key={i}>
                <div className="text-[10px] text-slate-400 mb-1">{w}</div>
                <input
                  type="number" min={0}
                  disabled={!canEdit}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  value={weekly[i] ?? 0}
                  onChange={e => setWeekly(p => ({ ...p, [i]: +e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
        {/* Monthly + Quarterly */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Theo tháng</label>
            <input type="number" min={0} disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none disabled:bg-slate-50"
              value={monthly} onChange={e => setMonthly(+e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Theo quý</label>
            <input type="number" min={0} disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none disabled:bg-slate-50"
              value={quarterly} onChange={e => setQuarterly(+e.target.value)} />
          </div>
        </div>
        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">Ghi chú</label>
          <textarea disabled={!canEdit} rows={2}
            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none resize-none disabled:bg-slate-50"
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Ghi chú kế hoạch booking..." />
        </div>
        {canEdit && (
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2 text-xs font-black text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: BRAND.navy }}>
            {saving ? "Đang lưu..." : "💾 Lưu kế hoạch booking"}
          </button>
        )}
        
        {teamPlan?.updatedAt && (
          <div className="text-[10px] text-slate-500 text-center bg-slate-50 py-2 rounded-lg border border-slate-100 mt-2">
            Cập nhật lần cuối lúc <span className="font-bold text-slate-700">{new Date(teamPlan.updatedAt).toLocaleString("vi-VN")}</span>
            <br />
            bởi <span className="font-bold text-slate-700">{teamPlan.submittedBy}</span>
          </div>
        )}
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
            {(["week","month","quarter"] as PeriodType[]).map(pt => (
              <button key={pt}
                onClick={() => { setPeriodType(pt); setPeriodValue(pt === "week" ? 0 : 1); }}
                className="px-2.5 py-1 text-[10px] font-bold transition-colors"
                style={periodType === pt
                  ? { background: BRAND.navy, color: "#fff" }
                  : { background: "#F9FAFB", color: "#374151" }
                }
              >
                {pt === "week" ? "Tuần" : pt === "month" ? "Tháng" : "Quý"}
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
  const team = TEAM_MAP[tid];

  const [campaign, setCampaign]   = useState<Campaign | null>(null);
  const [reports, setReports]     = useState<ReportEntry[]>([]);
  const [teamPlans, setTeamPlans] = useState<TeamPlan[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    return subscribeCampaigns(camps => {
      const found = camps.find(c => c.id === id);
      if (found) { setCampaign(found); setLoading(false); }
    });
  }, [id]);

  useEffect(() => subscribeReports(id, setReports), [id]);
  useEffect(() => subscribeTeamPlans(id, setTeamPlans), [id]);

  const myReports   = reports.filter(r => r.teamId === tid);
  const myTeamPlan  = teamPlans.find(p => p.teamId === tid) ?? null;
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
        {/* Booking Slots */}
        <BookingPanel
          teamId={tid}
          campaignId={id}
          teamPlan={myTeamPlan}
          canEdit={editAllowed}
          userName={userName}
        />

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
