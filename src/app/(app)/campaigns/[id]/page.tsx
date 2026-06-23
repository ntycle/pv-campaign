"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  subscribeCampaigns, subscribeReports, subscribeTeamPlans,
  upsertReport,
} from "@/lib/firestore";
import { BRAND, WEEKS, MONTHS, QUARTERS, PERIOD_LABELS, TEAM_KPI_FIELDS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { CampaignStatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useSystem } from "@/hooks/useSystem";
import type { Campaign, ReportEntry, TeamPlan, TeamId, Period, Team } from "@/types";

type Tab = "overview" | "plan" | "report";
type PeriodType = "week" | "month" | "quarter" | "campaign";

// ── Progress Ring ─────────────────────────────────────────
function ProgressRing({ pct, color, size = 48 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const stroke = Math.min(pct / 100, 1) * circ;
  const trafficColor = pct >= 90 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="6" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={trafficColor} strokeWidth="6"
        strokeDasharray={`${stroke} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

// ── Tab Overview ──────────────────────────────────────────
function TabOverview({ campaign, teamPlans }: { campaign: Campaign; teamPlans: TeamPlan[] }) {
  const { teams } = useSystem();
  const submittedTeams = new Set(teamPlans.map(p => p.teamId));
  return (
    <div className="p-6 space-y-6">
      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Trạng thái",     value: <CampaignStatusBadge status={campaign.status} /> },
          { label: "Timeline",       value: `${campaign.startDate ? format(new Date(campaign.startDate), "dd/MM/yyyy") : "—"} → ${campaign.endDate ? format(new Date(campaign.endDate), "dd/MM/yyyy") : "—"}` },
          { label: "Budget",         value: formatCurrency(campaign.budget) },
          { label: "Target GMV",     value: formatCurrency(campaign.targetGmv) },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="text-xs text-slate-400 font-semibold mb-1">{c.label}</div>
            <div className="font-black text-slate-800">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Concept */}
      {campaign.concept && (
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Concept</div>
          <p className="text-sm text-slate-700">{campaign.concept}</p>
        </div>
      )}

      {/* Team status */}
      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
        <div className="text-xs font-black text-slate-500 uppercase tracking-wide mb-4">
          Trạng thái Team ({submittedTeams.size}/{campaign.teams.length} đã submit plan)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {campaign.teams.map(tid => {
            const team = teams.find(t => t.id === tid);
            if (!team) return null;
            const submitted = submittedTeams.has(tid);
            return (
              <Link
                key={tid}
                href={`/campaigns/${campaign.id}/team/${tid}`}
                className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all hover:shadow-md"
                style={{ borderColor: submitted ? team.color : "#E5E7EB" }}
              >
                <span className="text-2xl">{team.icon}</span>
                <div>
                  <div className="text-xs font-black text-slate-700">{team.label}</div>
                  <div className={`text-[10px] font-bold ${submitted ? "text-emerald-600" : "text-slate-400"}`}>
                    {submitted ? "✅ Đã submit plan" : "⏳ Chưa submit"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tab Plan (Campaign Lead assigns targets) ──────────────
function TabPlan({
  campaign, reports, onUpdate, canEditPlan
}: {
  campaign: Campaign;
  reports: ReportEntry[];
  onUpdate: (entry: Omit<ReportEntry, "id"> & { id?: string }) => void;
  canEditPlan: boolean;
}) {
  const { teams } = useSystem();
  const [periodType, setPeriodType]   = useState<PeriodType>("campaign");
  const [periodValue, setPeriodValue] = useState(0);

  const periodOptions =
    periodType === "campaign" ? [{ label: "Tổng Campaign", value: 0 }] :
    periodType === "week"    ? WEEKS.map((w,i) => ({ label: w, value: i })) :
    periodType === "month"   ? MONTHS.map((m,i) => ({ label: m, value: i+1 })) :
    QUARTERS.map((q,i) => ({ label: q, value: i+1 }));

  const getEntry = (teamId: TeamId, metricId: string) =>
    reports.find(r =>
      r.teamId === teamId &&
      r.metricId === metricId &&
      r.period.type === periodType &&
      r.period.value === periodValue
    );

  const handleTargetChange = (teamId: TeamId, metricId: string, unit: string, value: number) => {
    const existing = getEntry(teamId, metricId);
    onUpdate({
      ...(existing ?? {}),
      id:         existing?.id,
      campaignId: campaign.id,
      teamId, metricId, unit,
      period:     { type: periodType, value: periodValue },
      target:     value,
      actual:     existing?.actual ?? 0,
      updatedBy:  "campaign_lead",
      updatedAt:  new Date().toISOString(),
    });
  };

  return (
    <div className="p-6 space-y-4">
      {!canEditPlan && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          ⚠️ Chỉ Campaign Lead mới có thể chỉnh sửa target. Bạn đang ở chế độ xem.
        </div>
      )}

      {/* Period selector */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="flex rounded-lg overflow-hidden border border-slate-200">
          {(["week","month","quarter", "campaign"] as PeriodType[]).map(pt => (
            <button key={pt}
              onClick={() => { setPeriodType(pt); setPeriodValue(pt === "week" || pt === "campaign" ? 0 : 1); }}
              className="px-3 py-1.5 text-xs font-bold transition-colors"
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
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
          value={periodValue}
          onChange={e => setPeriodValue(+e.target.value)}
        >
          {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Target assignment table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: BRAND.navy }}>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-white">Team</th>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-white">Chỉ số</th>
              <th className="px-4 py-2.5 text-right text-xs font-bold text-white">Target</th>
            </tr>
          </thead>
          <tbody>
            {campaign.teams.filter(t => t !== "campaign").flatMap((tid, ti) => {
              const team = teams.find(t => t.id === tid);
              if (!team) return [];
              const fields = TEAM_KPI_FIELDS[tid] ?? [];
              return fields.map((field, fi) => {
                const entry = getEntry(tid, field.id);
                return (
                  <tr key={`${tid}-${field.id}`} className={(ti + fi) % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    {fi === 0 && (
                      <td className="px-4 py-2.5" rowSpan={fields.length}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{team.icon}</span>
                          <span className="font-black text-xs text-slate-700">{team.label}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-xs text-slate-600">{field.label}</td>
                    <td className="px-4 py-2.5 text-right">
                      {canEditPlan ? (
                        <input
                          type="number"
                          className="w-28 px-2 py-1 border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:border-slate-400"
                          value={entry?.target ?? 0}
                          onChange={e => handleTargetChange(tid, field.id, field.unit ?? "", +e.target.value)}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-700">
                          {entry?.target ?? 0}{field.unit ? ` ${field.unit}` : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab Report ────────────────────────────────────────────
function TabReport({ campaign, reports }: { campaign: Campaign; reports: ReportEntry[] }) {
  const { teams } = useSystem();
  const [periodType, setPeriodType] = useState<PeriodType>("campaign");
  const [periodValue, setPeriodValue] = useState(0);

  const periodOptions =
    periodType === "campaign" ? [{ label: "Tổng Campaign", value: 0 }] :
    periodType === "week"  ? WEEKS.map((w,i) => ({ label: w, value: i })) :
    periodType === "month" ? MONTHS.map((m,i) => ({ label: m, value: i+1 })) :
    QUARTERS.map((q,i) => ({ label: q, value: i+1 }));

  const filtered = reports.filter(r =>
    r.period.type === periodType && r.period.value === periodValue
  );

  // Group by team
  const byTeam = campaign.teams.filter(t => t !== "campaign").map(tid => {
    const entries = filtered.filter(r => r.teamId === tid);
    const totalTarget = entries.reduce((s, e) => s + e.target, 0);
    const totalActual = entries.reduce((s, e) => s + e.actual, 0);
    const pct = totalTarget > 0 ? Math.round(totalActual / totalTarget * 100) : 0;
    return { tid, entries, totalTarget, totalActual, pct };
  });

  const trafficLight = (pct: number) => pct >= 90 ? "🟢" : pct >= 60 ? "🟡" : "🔴";

  return (
    <div className="p-6 space-y-4">
      {/* Period selector */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="flex rounded-lg overflow-hidden border border-slate-200">
          {(["week","month","quarter", "campaign"] as PeriodType[]).map(pt => (
            <button key={pt}
              onClick={() => { setPeriodType(pt); setPeriodValue(pt === "week" || pt === "campaign" ? 0 : 1); }}
              className="px-3 py-1.5 text-xs font-bold transition-colors"
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
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
          value={periodValue}
          onChange={e => setPeriodValue(+e.target.value)}
        >
          {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Team summary rings */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {byTeam.map(({ tid, pct }) => {
          const team = teams.find(t => t.id === tid);
          if (!team) return null;
          return (
            <div key={tid} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm text-center">
              <div className="relative inline-flex items-center justify-center mb-1">
                <ProgressRing pct={pct} color={team.color} size={52} />
                <span className="absolute text-[10px] font-black text-slate-700"
                  style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>
                  {pct}%
                </span>
              </div>
              <div className="text-xs font-black text-slate-700 truncate">{team.label}</div>
              <div className="text-sm">{trafficLight(pct)}</div>
            </div>
          );
        })}
      </div>

      {/* Detail table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: BRAND.navy }}>
              {["Team", "Chỉ số", "Target", "Actual", "% Hoàn thành", ""].map((h,i) => (
                <th key={i} className="px-4 py-2.5 text-left text-xs font-bold text-white">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byTeam.flatMap(({ tid, entries }, ti) => {
              const team = teams.find(t => t.id === tid);
              if (!team) return [];
              const fields = TEAM_KPI_FIELDS[tid] ?? [];
              return fields.map((field, fi) => {
                const entry = entries.find(e => e.metricId === field.id);
                const t = entry?.target ?? 0;
                const a = entry?.actual ?? 0;
                const p = t > 0 ? Math.round(a/t*100) : 0;
                const barColor = p >= 90 ? "#10B981" : p >= 60 ? "#F59E0B" : "#EF4444";
                return (
                  <tr key={`${tid}-${field.id}`} className={(ti+fi)%2===0?"bg-white":"bg-slate-50"}>
                    {fi === 0 && (
                      <td className="px-4 py-2.5" rowSpan={fields.length}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{team.icon}</span>
                          <span className="font-black text-xs text-slate-700">{team.label}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-xs text-slate-600">{field.label}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-500">{t.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-slate-800">{a.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: Math.min(p,100)+"%", background: barColor }} />
                        </div>
                        <span className="text-xs font-black w-8 text-right" style={{ color: barColor }}>{p}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm">{trafficLight(p)}</td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { userProfile, canEdit } = useAuth();
  const router = useRouter();

  const [campaign, setCampaign]     = useState<Campaign | null>(null);
  const [reports, setReports]       = useState<ReportEntry[]>([]);
  const [teamPlans, setTeamPlans]   = useState<TeamPlan[]>([]);
  const [tab, setTab]               = useState<Tab>("overview");
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const unsub = subscribeCampaigns(camps => {
      const found = camps.find(c => c.id === id);
      if (found) { setCampaign(found); setLoading(false); }
      else if (!loading) router.replace("/campaigns");
    });
    return unsub;
  }, [id]);

  useEffect(() => subscribeReports(id, setReports), [id]);
  useEffect(() => subscribeTeamPlans(id, setTeamPlans), [id]);

  const handleUpdateReport = async (entry: Omit<ReportEntry,"id"> & {id?:string}) => {
    await upsertReport(entry);
  };

  if (loading || !campaign) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "📋 Tổng quan" },
    { key: "plan",     label: "🎯 Giao Plan" },
    { key: "report",   label: "📊 Report" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/campaigns" className="text-slate-400 hover:text-slate-600 text-sm">← Campaigns</Link>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-10 rounded-full" style={{ background: campaign.color }} />
            <div>
              <h1 className="text-lg font-black text-slate-800">{campaign.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <CampaignStatusBadge status={campaign.status} />
                <span className="text-xs text-slate-400">Tạo bởi {campaign.createdBy}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {campaign.teams.map(tid => <TeamBadge key={tid} teamId={tid} />)}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b border-slate-100 -mb-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 text-xs font-black transition-colors border-b-2 -mb-px"
              style={tab === t.key
                ? { borderColor: BRAND.navy, color: BRAND.navy }
                : { borderColor: "transparent", color: "#94A3B8" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "overview" && <TabOverview campaign={campaign} teamPlans={teamPlans} />}
      {tab === "plan"     && (
        <TabPlan
          campaign={campaign}
          reports={reports}
          onUpdate={handleUpdateReport}
          canEditPlan={canEdit("campaign")}
        />
      )}
      {tab === "report"   && <TabReport campaign={campaign} reports={reports} />}
    </div>
  );
}
