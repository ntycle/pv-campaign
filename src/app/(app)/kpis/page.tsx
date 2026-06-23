"use client";
import { useState, useEffect, useMemo } from "react";
import { TEAM_KPI_FIELDS, BRAND, WEEKS, TEAM_MAP } from "@/lib/constants";
import { subscribeCampaigns, subscribeCampaignBookings, subscribeReports, upsertReport } from "@/lib/firestore";
import { KpiCard } from "@/components/ui/KpiCard";
import { useSystem } from "@/hooks/useSystem";
import { useAuth } from "@/hooks/useAuth";
import type { Campaign, ReportEntry, TeamId, Booking } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

function KpiEditModal({
  entry, label, onSave, onClose
}: {
  entry: Partial<ReportEntry> & { metricId: string; campaignId: string; teamId: TeamId; weekIndex: number; unit: string };
  label: string;
  onSave: (e: typeof entry) => void;
  onClose: () => void;
}) {
  const [actual, setActual] = useState(entry.actual ?? 0);
  const [note, setNote]     = useState(entry.note ?? "");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-black text-slate-800 text-sm">Cập nhật Actual - {label}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <div className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1">Campaign Target</div>
            <div className="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{entry.target ?? 0} {entry.unit}</div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Actual ({entry.unit})</label>
            <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400" value={actual} onChange={e => setActual(+e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Ghi chú</label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" value={note} onChange={e => setNote(e.target.value)} placeholder="..." />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm font-bold text-slate-500">Hủy</button>
          <button
            onClick={() => { onSave({ ...entry, target: entry.target ?? 0, actual, note }); onClose(); }}
            className="px-4 py-1.5 text-sm font-black text-white rounded-lg"
            style={{ background: BRAND.navy }}
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignTargetRow({
  field, currentTarget, onSave
}: {
  field: { id: string; label: string; unit?: string };
  currentTarget: number;
  onSave: (val: number) => Promise<void>;
}) {
  const [val, setVal] = useState(currentTarget);
  const [saving, setSaving] = useState(false);

  useEffect(() => setVal(currentTarget), [currentTarget]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(val);
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-1.5 p-3 bg-white border border-slate-200 rounded-xl">
      <label className="text-xs font-bold text-slate-700">{field.label}</label>
      <div className="flex gap-2">
        <input 
          type="number" 
          className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none"
          value={val}
          onChange={e => setVal(+e.target.value)}
        />
        <button 
          onClick={handleSave}
          disabled={saving || val === currentTarget}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
        >
          {saving ? "..." : "Lưu"}
        </button>
      </div>
    </div>
  );
}

export default function KpisReportPage() {
  const { user } = useAuth();
  const { teams } = useSystem();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCamp, setSelectedCamp] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<TeamId>("");
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [editWeek, setEditWeek] = useState(0);

  const [allReports, setAllReports] = useState<ReportEntry[]>([]);
  const [campaignBookings, setCampaignBookings] = useState<Booking[]>([]);
  const [editEntry, setEditEntry] = useState<null | { entry: Partial<ReportEntry> & { metricId: string; campaignId: string; teamId: TeamId; weekIndex: number; unit: string }; label: string }>(null);

  useEffect(() => subscribeCampaigns(d => {
    setCampaigns(d);
    if (d.length && !selectedCamp) setSelectedCamp(d[0].id);
  }), []);

  useEffect(() => {
    if (!selectedCamp) return;
    const unsubReports = subscribeReports(selectedCamp, setAllReports);
    const unsubBookings = subscribeCampaignBookings(selectedCamp, setCampaignBookings);
    return () => {
      unsubReports();
      unsubBookings();
    };
  }, [selectedCamp]);

  const activeCampaign = campaigns.find(c => c.id === selectedCamp);
  const participatingTeams = useMemo(() => {
    if (!activeCampaign) return [];
    return teams.filter(t => activeCampaign.teams.includes(t.id) && t.id !== "campaign");
  }, [activeCampaign, teams]);

  useEffect(() => {
    if (participatingTeams.length && (!selectedTeam || !participatingTeams.find(t => t.id === selectedTeam))) {
      setSelectedTeam(participatingTeams[0].id);
    }
  }, [participatingTeams, selectedTeam]);

  const teamFields = TEAM_KPI_FIELDS[selectedTeam] || [];
  
  useEffect(() => {
    if (teamFields.length && (!selectedMetric || !teamFields.find(f => f.id === selectedMetric))) {
      setSelectedMetric(teamFields[0].id);
    }
  }, [teamFields, selectedMetric]);

  const handleSave = async (entry: Partial<ReportEntry> & { metricId: string; campaignId: string; teamId: TeamId; weekIndex: number; unit: string }) => {
    await upsertReport({
      id: entry.id,
      campaignId: entry.campaignId,
      teamId: entry.teamId,
      metricId: entry.metricId,
      unit: entry.unit,
      period: { type: "week", value: entry.weekIndex },
      target: entry.target ?? 0,
      actual: entry.actual ?? 0,
      note: entry.note,
      updatedBy: user?.displayName ?? "User",
      updatedAt: new Date().toISOString(),
    });
  };

  const saveCampaignTarget = async (metricId: string, unit: string, target: number) => {
    const existing = allReports.find(r => r.teamId === selectedTeam && r.metricId === metricId && r.period.type === "campaign");
    await upsertReport({
      id: existing?.id,
      campaignId: selectedCamp,
      teamId: selectedTeam,
      metricId,
      unit,
      period: { type: "campaign", value: 0 },
      target,
      actual: existing?.actual ?? 0,
      updatedBy: user?.displayName ?? "User",
      updatedAt: new Date().toISOString(),
    });
  };

  const getCampaignTarget = (teamId: TeamId, metricId: string) => {
    return allReports.find(r => r.teamId === teamId && r.metricId === metricId && r.period.type === "campaign")?.target ?? 0;
  };

  const getReportForWeek = (teamId: TeamId, metricId: string, weekIdx: number) => {
    return allReports.find(r => r.teamId === teamId && r.metricId === metricId && r.period.type === "week" && r.period.value === weekIdx);
  };

  const getAggregatedActual = (teamId: TeamId, metricId: string, isAutoCalculated?: boolean) => {
    if (isAutoCalculated) {
      return campaignBookings.filter(b => b.teams?.includes(teamId) && b.status === "done").length;
    }
    const metricReports = allReports.filter(r => r.teamId === teamId && r.metricId === metricId);
    const weeklyReports = metricReports.filter(r => r.period.type === "week");
    if (weeklyReports.length > 0) {
      return weeklyReports.reduce((sum, r) => sum + r.actual, 0);
    }
    const campaignReport = metricReports.find(r => r.period.type === "campaign");
    return campaignReport?.actual ?? 0;
  };

  const chart1Data = teamFields.map(f => {
    const target = getCampaignTarget(selectedTeam, f.id);
    const actual = getAggregatedActual(selectedTeam, f.id, f.isAutoCalculated);
    const pct = target > 0 ? (actual / target) * 100 : (actual > 0 ? 100 : 0);
    return { 
      name: f.label, 
      unit: f.unit ?? "",
      TargetRaw: target, 
      ActualRaw: actual,
      "Hoàn thành (%)": Math.min(100, Math.round(pct)),
      pctDisplay: Math.round(pct)
    };
  });

  const chart2Data = WEEKS.map((w, idx) => {
    const weekReport = allReports.find(r =>
      r.teamId === selectedTeam &&
      r.metricId === selectedMetric &&
      r.period.type === "week" &&
      r.period.value === idx
    );
    return { name: w, Actual: weekReport?.actual ?? 0 };
  });

  const chart3Data = participatingTeams.map(t => {
    const fields = TEAM_KPI_FIELDS[t.id] || [];
    let totalPct = 0;
    let count = 0;
    fields.forEach(f => {
      const target = getCampaignTarget(t.id, f.id);
      const actual = getAggregatedActual(t.id, f.id, f.isAutoCalculated);
      if (target > 0) {
        totalPct += Math.min(100, (actual / target) * 100);
        count++;
      }
    });
    const avgHealth = count > 0 ? Math.round(totalPct / count) : 0;
    return { team: t.label, Health: avgHealth, fullMark: 100, color: t.color };
  });

  const exportCSV = () => {
    if (!activeCampaign) return;
    const headers = ["Campaign", "Team", "Metric", "Target", "Actual", "Week0", "Week1", "Week2", "Week3"];
    const rows: any[] = [];
    
    participatingTeams.forEach(t => {
      const fields = TEAM_KPI_FIELDS[t.id] || [];
      fields.forEach(f => {
        const target = getCampaignTarget(t.id, f.id);
        const actual = getAggregatedActual(t.id, f.id, f.isAutoCalculated);
        const w0 = getReportForWeek(t.id, f.id, 0)?.actual ?? 0;
        const w1 = getReportForWeek(t.id, f.id, 1)?.actual ?? 0;
        const w2 = getReportForWeek(t.id, f.id, 2)?.actual ?? 0;
        const w3 = getReportForWeek(t.id, f.id, 3)?.actual ?? 0;
        rows.push([activeCampaign.name, t.label, f.label, target, actual, w0, w1, w2, w3]);
      });
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map((cell: any) => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `KPI_Report_${activeCampaign.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!activeCampaign) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-slate-400 min-h-screen">
        <p>Không có campaign nào.</p>
      </div>
    );
  }

  const activeTeamObj = TEAM_MAP[selectedTeam];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-black text-slate-800">📊 KPIs Report</h1>
          <p className="text-xs text-slate-400 mt-0.5">Phân tích chuyên sâu & Xu hướng hoạt động</p>
        </div>
        <button 
          onClick={exportCSV}
          className="text-sm px-4 py-2 bg-slate-800 text-white rounded-xl font-bold shadow-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          ⬇️ Export CSV
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        <div className="w-full lg:w-72 bg-white border-r border-slate-200 p-6 overflow-y-auto flex-shrink-0">
          <div className="space-y-6">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">Chọn Campaign</label>
              <select
                className="w-full text-sm px-4 py-2.5 border border-slate-200 rounded-xl font-bold bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={selectedCamp}
                onChange={e => setSelectedCamp(e.target.value)}
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>🚀 {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">Chọn Team</label>
              <div className="space-y-2">
                {participatingTeams.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTeam(t.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${selectedTeam === t.id ? 'shadow-sm' : ''}`}
                    style={selectedTeam === t.id 
                      ? { backgroundColor: t.color + '15', borderColor: t.color + '40', color: t.color } 
                      : { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9', color: '#64748B' }
                    }
                  >
                    <span className="text-lg">{t.icon}</span>
                    <div>
                      <div className="text-sm font-black">{t.label}</div>
                      <div className="text-[10px] opacity-80">{t.sublabel}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
               <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">Chỉnh sửa KPI (Tuần)</label>
               <select
                className="w-full text-sm px-4 py-2.5 border border-slate-200 rounded-xl font-medium bg-white text-slate-600 focus:outline-none shadow-sm"
                value={editWeek}
                onChange={e => setEditWeek(+e.target.value)}
              >
                {WEEKS.map((w, idx) => (
                  <option key={idx} value={idx}>{w}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">
                🎯 Set Campaign Target
              </label>
              <div className="space-y-2">
                {teamFields.map(field => {
                  const currentTarget = getCampaignTarget(selectedTeam, field.id);
                  return (
                    <CampaignTargetRow
                      key={field.id}
                      field={field}
                      currentTarget={currentTarget}
                      onSave={(val) => saveCampaignTarget(field.id, field.unit ?? "", val)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {teamFields.map(field => {
              const target = getCampaignTarget(selectedTeam, field.id);
              const actual = getAggregatedActual(selectedTeam, field.id, field.isAutoCalculated);
              const existing = getReportForWeek(selectedTeam, field.id, editWeek);
              
              return (
                <KpiCard
                  key={field.id}
                  field={field}
                  target={target}
                  actual={actual}
                  onEdit={field.isAutoCalculated ? undefined : () => setEditEntry({
                    entry: {
                      id: existing?.id,
                      metricId: field.id,
                      campaignId: selectedCamp,
                      teamId: selectedTeam,
                      weekIndex: editWeek,
                      unit: field.unit ?? "",
                      target: target,
                      actual: existing?.actual ?? 0,
                      note: existing?.note,
                    },
                    label: `${activeTeamObj?.label} · ${field.label} (${WEEKS[editWeek]})`,
                  })}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-80 flex flex-col">
              <h3 className="text-sm font-black text-slate-800 mb-4">🎯 Target vs Actual ({activeTeamObj?.label})</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart1Data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip 
                      cursor={{ fill: '#F8FAFC' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100">
                              <div className="font-bold text-slate-800 mb-2">{label}</div>
                              <div className="text-sm">
                                <div className="text-slate-500">Target: <span className="font-bold text-slate-700">{data.TargetRaw.toLocaleString()} {data.unit}</span></div>
                                <div className="text-slate-500">Actual: <span className="font-bold text-slate-700">{data.ActualRaw.toLocaleString()} {data.unit}</span></div>
                                <div className="text-blue-500 font-bold mt-1">Đạt: {data.pctDisplay}%</div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="Hoàn thành (%)" fill={activeTeamObj?.color || "#3B82F6"} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-80 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-800">📈 Weekly Trend</h3>
                <select
                  className="text-xs px-2 py-1 border border-slate-200 rounded-lg font-medium text-slate-600 bg-slate-50 focus:outline-none"
                  value={selectedMetric}
                  onChange={e => setSelectedMetric(e.target.value)}
                >
                  {teamFields.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart2Data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }} />
                    <Line type="monotone" dataKey="Actual" stroke={activeTeamObj?.color || "#3B82F6"} strokeWidth={3} dot={{ r: 4, fill: activeTeamObj?.color || "#3B82F6" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-96 xl:col-span-2 flex flex-col items-center">
              <h3 className="text-sm font-black text-slate-800 mb-2 w-full text-left">🌟 Campaign Health (Avg. KPI % by Team)</h3>
              <div className="w-full max-w-lg flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chart3Data}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="team" tick={{ fill: '#475569', fontSize: 12, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                    <Radar name="Health (%)" dataKey="Health" stroke={BRAND.navy} fill={BRAND.navy} fillOpacity={0.4} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editEntry && (
        <KpiEditModal
          entry={editEntry.entry}
          label={editEntry.label}
          onSave={handleSave}
          onClose={() => setEditEntry(null)}
        />
      )}
    </div>
  );
}
