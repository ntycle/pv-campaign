"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { subscribeCampaigns, createCampaign, updateCampaign, deleteCampaign, upsertReport, getCampaignKPIs } from "@/lib/firestore";
import { BRAND, CAMPAIGN_STATUS_CONFIG, TEAM_KPI_FIELDS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

import { TeamBadge } from "@/components/ui/TeamBadge";
import { CampaignStatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useSystem } from "@/hooks/useSystem";
import type { Campaign, CampaignStatus, TeamId } from "@/types";

const COLORS = ["#EF4444","#8B5CF6","#10B981","#3B82F6","#F59E0B","#EC4899","#06B6D4","#F97316"];

// ── Form type ────────────────────────────────────────────────
type FormState = {
  name: string; color: string; status: CampaignStatus;
  startDate: string; endDate: string; teams: TeamId[];
  concept: string; budget: number; targetGmv: number;
  kpiTargets: Record<TeamId, Record<string, number>>;
};

const defaultForm = (): FormState => {
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return {
    name: "", color: COLORS[0], status: "planning",
    startDate: format(today, "yyyy-MM-dd"), 
    endDate: format(nextMonth, "yyyy-MM-dd"), 
    teams: [],
    concept: "", budget: 0, targetGmv: 0,
    kpiTargets: {} as Record<TeamId, Record<string, number>>,
  };
};

// ── Campaign Modal (Create + Edit) ───────────────────────────
function CampaignModal({
  initial, mode, onClose, onSave,
}: {
  initial?: FormState;
  mode: "create" | "edit";
  onClose: () => void;
  onSave: (data: FormState) => void;
}) {
  const { teams } = useSystem();
  const [form, setForm] = useState<FormState>(initial ?? defaultForm());

  const toggleTeam = (tid: TeamId) =>
    setForm(p => {
      const newTeams = p.teams.includes(tid) ? p.teams.filter(t => t !== tid) : [...p.teams, tid];
      const newKpiTargets = { ...p.kpiTargets };
      if (!newTeams.includes(tid)) delete newKpiTargets[tid]; // clear KPIs if team removed
      return { ...p, teams: newTeams, kpiTargets: newKpiTargets };
    });

  const handleKpiChange = (tid: TeamId, metricId: string, val: number) => {
    setForm(p => ({
      ...p,
      kpiTargets: {
        ...p.kpiTargets,
        [tid]: { ...(p.kpiTargets[tid] || {}), [metricId]: val }
      }
    }));
  };

  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <span className="font-black text-slate-800">
            {isEdit ? "✏️ Chỉnh sửa Campaign" : "🏆 Tạo Campaign mới"}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Tên Campaign</label>
            <input
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
              placeholder="VD: Mid-Year Sale 2025"
              value={form.name}
              onChange={e => setForm(p => ({...p, name: e.target.value}))}
            />
          </div>

          {/* Status — chỉ hiện khi edit */}
          {isEdit && (
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Trạng thái</label>
              <select
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none"
                value={form.status}
                onChange={e => setForm(p => ({...p, status: e.target.value as CampaignStatus}))}
              >
                {Object.entries(CAMPAIGN_STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Ngày bắt đầu</label>
              <input type="date" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none"
                value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Ngày kết thúc</label>
              <input type="date" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none"
                value={form.endDate} onChange={e => setForm(p => ({...p, endDate: e.target.value}))} />
            </div>
          </div>

          {/* Budget + GMV */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Budget (₫)</label>
              <input type="number" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none"
                value={form.budget} onChange={e => setForm(p => ({...p, budget: +e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Target GMV (₫)</label>
              <input type="number" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none"
                value={form.targetGmv} onChange={e => setForm(p => ({...p, targetGmv: +e.target.value}))} />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Màu nhận diện</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button"
                  onClick={() => setForm(p => ({...p, color: c}))}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{ background: c, borderColor: form.color === c ? "#1A2B4A" : c }}
                />
              ))}
            </div>
          </div>

          {/* Teams */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">Teams tham gia</label>
            <div className="flex flex-wrap gap-2">
              {teams.map(t => (
                <button key={t.id} type="button" onClick={() => toggleTeam(t.id)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-all"
                  style={form.teams.includes(t.id)
                    ? { background: t.color, color: "#fff", borderColor: t.color }
                    : { background: "#F9FAFB", color: "#374151", borderColor: "#E5E7EB" }
                  }
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Inline KPI Setup */}
          {form.teams.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-3">Giao KPI Tổng cho Campaign</label>
              <div className="space-y-4">
                {form.teams.filter(tid => tid !== "campaign").map(tid => {
                  const team = teams.find(t => t.id === tid);
                  const fields = TEAM_KPI_FIELDS[tid] || [];
                  if (fields.length === 0) return null;
                  return (
                    <div key={tid} className="border-l-2 pl-3" style={{ borderColor: team?.color }}>
                      <div className="text-xs font-bold text-slate-700 mb-2">{team?.icon} {team?.label}</div>
                      <div className="grid grid-cols-2 gap-3">
                        {fields.map(f => (
                          <div key={f.id} className="flex flex-col">
                            <span className="text-[10px] font-semibold text-slate-500 mb-0.5">{f.label}</span>
                            <div className="relative">
                              <input 
                                type="number" 
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none"
                                value={form.kpiTargets[tid]?.[f.id] || ""}
                                onChange={e => handleKpiChange(tid, f.id, +e.target.value)}
                              />
                              {f.unit && <span className="absolute right-2 top-1.5 text-xs text-slate-400">{f.unit}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Concept */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Concept / Mô tả</label>
            <textarea
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none resize-none"
              rows={3} placeholder="Mô tả campaign..."
              value={form.concept}
              onChange={e => setForm(p => ({...p, concept: e.target.value}))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Hủy</button>
          <button
            onClick={() => { if (form.name.trim()) { onSave(form); onClose(); } }}
            className="px-5 py-2 text-sm font-black text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ background: BRAND.navy }}
          >
            {isEdit ? "💾 Lưu thay đổi" : "Tạo Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Dialog ────────────────────────────────────
function DeleteDialog({
  name, onConfirm, onCancel,
}: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="text-4xl text-center mb-3">🗑️</div>
        <h2 className="text-base font-black text-slate-800 text-center mb-1">Xoá Campaign?</h2>
        <p className="text-sm text-slate-500 text-center mb-6">
          Bạn sắp xoá <span className="font-bold text-slate-700">&quot;{name}&quot;</span>.<br/>
          Hành động này không thể hoàn tác.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-black text-white rounded-xl transition-opacity hover:opacity-90"
            style={{ background: "#DC2626" }}
          >
            Xoá
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Modal state
  const [modal, setModal] = useState<
    | { type: "create" }
    | { type: "edit"; campaign: Campaign; kpiTargets: Record<TeamId, Record<string, number>> }
    | null
  >(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  useEffect(() => subscribeCampaigns(setCampaigns), []);

  // ── Handlers ──
  const handleCreate = async (data: FormState) => {
    const { kpiTargets, ...campaignData } = data;
    const cid = await createCampaign({ ...campaignData, createdBy: user?.displayName ?? "User" });
    
    // Save inline KPIs
    for (const tid of campaignData.teams) {
      if (!kpiTargets[tid]) continue;
      for (const [metricId, target] of Object.entries(kpiTargets[tid])) {
        if (target <= 0) continue;
        const field = TEAM_KPI_FIELDS[tid]?.find(f => f.id === metricId);
        if (!field) continue;
        
        await upsertReport({
          campaignId: cid,
          teamId: tid,
          metricId,
          unit: field.unit || "",
          period: { type: "campaign", value: 0 },
          target,
          actual: 0,
          updatedBy: user?.displayName ?? "User",
          updatedAt: new Date().toISOString()
        });
      }
    }
  };

  const handleEdit = async (data: FormState) => {
    if (!modal || modal.type !== "edit") return;
    const { kpiTargets, ...campaignData } = data;
    await updateCampaign(modal.campaign.id, campaignData);
    
    // Save inline KPIs
    const cid = modal.campaign.id;
    for (const tid of campaignData.teams) {
      if (!kpiTargets[tid]) continue;
      for (const [metricId, target] of Object.entries(kpiTargets[tid])) {
        if (target <= 0) continue;
        const field = TEAM_KPI_FIELDS[tid]?.find(f => f.id === metricId);
        if (!field) continue;
        
        await upsertReport({
          campaignId: cid,
          teamId: tid,
          metricId,
          unit: field.unit || "",
          period: { type: "campaign", value: 0 },
          target,
          actual: 0,
          updatedBy: user?.displayName ?? "User",
          updatedAt: new Date().toISOString()
        });
      }
    }
  };

  const handleOpenEdit = async (cp: Campaign) => {
    try {
      const existingKpis = await getCampaignKPIs(cp.id);
      setModal({ type: "edit", campaign: cp, kpiTargets: existingKpis as any });
    } catch (e) {
      console.error(e);
      setModal({ type: "edit", campaign: cp, kpiTargets: {} as any });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCampaign(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-800">🏆 Campaigns</h1>
          <p className="text-xs text-slate-400 mt-0.5">{campaigns.length} campaigns</p>
        </div>
        <button
          onClick={() => setModal({ type: "create" })}
          className="px-4 py-2 text-sm font-black text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ background: BRAND.navy }}
        >
          ＋ Tạo Campaign
        </button>
      </div>

      {/* List */}
      <div className="flex-1 p-6">
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <div className="text-4xl mb-3">🏆</div>
            <div className="text-sm font-semibold">Chưa có campaign nào</div>
            <button onClick={() => setModal({ type: "create" })} className="mt-4 text-sm font-bold underline">
              Tạo campaign đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {campaigns.map(cp => (
              <div
                key={cp.id}
                className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5"
              >
                <div className="flex items-start justify-between">
                  {/* Left: color bar + name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ background: cp.color }} />
                    <Link href={`/campaigns/${cp.id}`} className="min-w-0 hover:opacity-80 transition-opacity">
                      <div className="font-black text-slate-800 text-base truncate">{cp.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{cp.concept}</div>
                    </Link>
                  </div>

                  {/* Right: status + action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <CampaignStatusBadge status={cp.status} />

                    <Link
                      href={`/campaigns/${cp.id}`}
                      className="px-3 py-1.5 ml-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      📋 Xem Detail
                    </Link>

                    {/* Edit button */}
                    <button
                      onClick={() => handleOpenEdit(cp)}
                      title="Chỉnh sửa"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.415.586H8v-2.414a2 2 0 01.586-1.414z"/>
                      </svg>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => setDeleteTarget(cp)}
                      title="Xoá"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Meta info */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span>📅 {cp.startDate ? format(new Date(cp.startDate), "dd/MM/yyyy") : "—"} → {cp.endDate ? format(new Date(cp.endDate), "dd/MM/yyyy") : "—"}</span>
                  <span>💰 {formatCurrency(cp.budget)}</span>
                  <span>🎯 GMV {formatCurrency(cp.targetGmv)}</span>
                  <span>👤 {cp.createdBy}</span>
                </div>

                {/* Team badges */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cp.teams.map(tid => <TeamBadge key={tid} teamId={tid} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {modal?.type === "create" && (
        <CampaignModal
          mode="create"
          onClose={() => setModal(null)}
          onSave={handleCreate}
        />
      )}

      {/* Edit Modal — pre-fill với data hiện tại */}
      {modal?.type === "edit" && (
        <CampaignModal
          mode="edit"
          initial={{
            name:       modal.campaign.name,
            color:      modal.campaign.color,
            status:     modal.campaign.status,
            startDate:  modal.campaign.startDate || format(new Date(), "yyyy-MM-dd"),
            endDate:    modal.campaign.endDate || format(new Date(), "yyyy-MM-dd"),
            teams:      modal.campaign.teams,
            concept:    modal.campaign.concept ?? "",
            budget:     modal.campaign.budget ?? 0,
            targetGmv:  modal.campaign.targetGmv ?? 0,
            kpiTargets: modal.kpiTargets
          }}
          onClose={() => setModal(null)}
          onSave={handleEdit}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <DeleteDialog
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
