"use client";
import { useState, useEffect, useCallback } from "react";
import { WeekHeader } from "@/components/layout/WeekHeader";
import { TEAMS, TEAM_KPI_FIELDS, BRAND } from "@/lib/constants";
import { subscribeCampaigns, subscribeKpis, upsertKpi } from "@/lib/firestore";
import { KpiCard } from "@/components/ui/KpiCard";
import { useAuth } from "@/hooks/useAuth";
import type { Campaign, KpiEntry, TeamId } from "@/types";

function KpiEditModal({
  entry, label, onSave, onClose
}: {
  entry: Partial<KpiEntry> & { fieldId: string; campaignId: string; teamId: TeamId; weekIndex: number };
  label: string;
  onSave: (e: typeof entry) => void;
  onClose: () => void;
}) {
  const [target, setTarget] = useState(entry.target ?? 0);
  const [actual, setActual] = useState(entry.actual ?? 0);
  const [note, setNote]     = useState(entry.note ?? "");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-black text-slate-800 text-sm">{label}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Target</label>
            <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400" value={target} onChange={e => setTarget(+e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Actual</label>
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
            onClick={() => { onSave({ ...entry, target, actual, note }); onClose(); }}
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

export default function KpisPage() {
  const { user } = useAuth();
  const [week, setWeek] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCamp, setSelectedCamp] = useState<string>("");
  const [kpis, setKpis] = useState<KpiEntry[]>([]);
  const [editEntry, setEditEntry] = useState<null | { entry: Partial<KpiEntry> & { fieldId: string; campaignId: string; teamId: TeamId; weekIndex: number }; label: string }>(null);

  useEffect(() => subscribeCampaigns(d => {
    setCampaigns(d);
    if (d.length && !selectedCamp) setSelectedCamp(d[0].id);
  }), []);

  useEffect(() => {
    if (!selectedCamp) return;
    return subscribeKpis(selectedCamp, week, setKpis);
  }, [selectedCamp, week]);

  const handleSave = async (entry: Partial<KpiEntry> & { fieldId: string; campaignId: string; teamId: TeamId; weekIndex: number }) => {
    await upsertKpi({
      ...entry,
      target: entry.target ?? 0,
      actual: entry.actual ?? 0,
      updatedBy: user?.displayName ?? "User",
    } as Omit<KpiEntry, "id"> & { id?: string });
  };

  const getKpi = (teamId: TeamId, fieldId: string) =>
    kpis.find(k => k.teamId === teamId && k.fieldId === fieldId);

  return (
    <div className="flex flex-col min-h-screen">
      <WeekHeader activeWeek={week} onChange={setWeek} title="KPI Teams" subtitle="Theo dõi KPI từng team theo campaign" />

      <div className="flex-1 p-6">
        {/* Campaign selector */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Campaign:</span>
          <div className="flex gap-2 flex-wrap">
            {campaigns.map(cp => (
              <button
                key={cp.id}
                onClick={() => setSelectedCamp(cp.id)}
                className="px-4 py-1.5 text-xs font-black rounded-lg border transition-all"
                style={selectedCamp === cp.id
                  ? { background: cp.color, color: "#fff", borderColor: cp.color }
                  : { background: "#F9FAFB", color: "#374151", borderColor: "#E5E7EB" }
                }
              >
                {cp.name}
              </button>
            ))}
            {campaigns.length === 0 && (
              <span className="text-sm text-slate-400">Chưa có campaign nào. Tạo campaign trước.</span>
            )}
          </div>
        </div>

        {/* KPI grid per team */}
        <div className="space-y-6">
          {TEAMS.map(team => {
            const fields = TEAM_KPI_FIELDS[team.id];
            return (
              <div key={team.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div
                  className="px-5 py-3 flex items-center gap-3"
                  style={{ background: team.color + "15", borderBottom: "2px solid " + team.color + "30" }}
                >
                  <span className="text-xl">{team.icon}</span>
                  <div>
                    <div className="font-black text-sm" style={{ color: team.color }}>{team.label}</div>
                    <div className="text-xs text-slate-500">{team.sublabel}</div>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {fields.map(field => {
                    const existing = getKpi(team.id, field.id);
                    return (
                      <KpiCard
                        key={field.id}
                        field={field}
                        target={existing?.target ?? 0}
                        actual={existing?.actual ?? 0}
                        onEdit={() => setEditEntry({
                          entry: {
                            id: existing?.id,
                            fieldId: field.id,
                            campaignId: selectedCamp,
                            teamId: team.id,
                            weekIndex: week,
                            target: existing?.target ?? 0,
                            actual: existing?.actual ?? 0,
                            note: existing?.note,
                          },
                          label: `${team.label} · ${field.label}`,
                        })}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
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
