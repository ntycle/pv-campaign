"use client";
import { useState, useEffect } from "react";
import { subscribeCampaigns, createCampaign, updateCampaign, deleteCampaign } from "@/lib/firestore";
import { TEAMS, BRAND, WEEKS, CAMPAIGN_STATUS_CONFIG } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { CampaignStatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import type { Campaign, CampaignStatus, TeamId } from "@/types";

const COLORS = ["#EF4444","#8B5CF6","#10B981","#3B82F6","#F59E0B","#EC4899","#06B6D4","#F97316"];

// ── Form type ────────────────────────────────────────────────
type FormState = {
  name: string; color: string; status: CampaignStatus;
  startWeek: number; endWeek: number; teams: TeamId[];
  concept: string; budget: number; targetGmv: number;
};

const defaultForm = (): FormState => ({
  name: "", color: COLORS[0], status: "planning",
  startWeek: 0, endWeek: 0, teams: [],
  concept: "", budget: 0, targetGmv: 0,
});

// ── Campaign Modal (Create + Edit) ───────────────────────────
function CampaignModal({
  initial, mode, onClose, onSave,
}: {
  initial?: FormState;
  mode: "create" | "edit";
  onClose: () => void;
  onSave: (data: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(initial ?? defaultForm());

  const toggleTeam = (tid: TeamId) =>
    setForm(p => ({
      ...p,
      teams: p.teams.includes(tid) ? p.teams.filter(t => t !== tid) : [...p.teams, tid],
    }));

  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl">
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

          {/* Weeks */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Tuần bắt đầu</label>
              <select className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none"
                value={form.startWeek} onChange={e => setForm(p => ({...p, startWeek: +e.target.value}))}>
                {WEEKS.map((w, i) => <option key={i} value={i}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Tuần kết thúc</label>
              <select className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none"
                value={form.endWeek} onChange={e => setForm(p => ({...p, endWeek: +e.target.value}))}>
                {WEEKS.map((w, i) => <option key={i} value={i}>{w}</option>)}
              </select>
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
              {TEAMS.map(t => (
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
          Bạn sắp xoá <span className="font-bold text-slate-700">"{name}"</span>.<br/>
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
    | { type: "edit"; campaign: Campaign }
    | null
  >(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  useEffect(() => subscribeCampaigns(setCampaigns), []);

  // ── Handlers ──
  const handleCreate = async (data: FormState) => {
    await createCampaign({ ...data, createdBy: user?.displayName ?? "User" });
  };

  const handleEdit = async (data: FormState) => {
    if (!modal || modal.type !== "edit") return;
    await updateCampaign(modal.campaign.id, data);
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
                    <div className="min-w-0">
                      <div className="font-black text-slate-800 text-base truncate">{cp.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{cp.concept}</div>
                    </div>
                  </div>

                  {/* Right: status + action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <CampaignStatusBadge status={cp.status} />

                    {/* Edit button */}
                    <button
                      onClick={() => setModal({ type: "edit", campaign: cp })}
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
                  <span>📅 Tuần {cp.startWeek + 1} → {cp.endWeek + 1}</span>
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
            startWeek:  modal.campaign.startWeek,
            endWeek:    modal.campaign.endWeek,
            teams:      modal.campaign.teams,
            concept:    modal.campaign.concept ?? "",
            budget:     modal.campaign.budget ?? 0,
            targetGmv:  modal.campaign.targetGmv ?? 0,
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
