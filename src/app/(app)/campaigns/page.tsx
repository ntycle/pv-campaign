"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { subscribeCampaigns, createCampaign, deleteCampaign } from "@/lib/firestore";
import { TEAMS, BRAND, WEEKS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { CampaignStatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import type { Campaign, CampaignStatus, TeamId } from "@/types";

const COLORS = ["#EF4444","#8B5CF6","#10B981","#3B82F6","#F59E0B","#EC4899","#06B6D4","#F97316"];

function CampaignModal({
  onClose, onSave, user,
}: { onClose: () => void; onSave: (c: Omit<Campaign,"id"|"createdAt">) => void; user: string }) {
  const [form, setForm] = useState({
    name: "", color: COLORS[0], status: "planning" as CampaignStatus,
    startWeek: 0, endWeek: 0, teams: [] as TeamId[],
    concept: "", budget: 0, targetGmv: 0,
  });

  const toggleTeam = (tid: TeamId) =>
    setForm(p => ({
      ...p,
      teams: p.teams.includes(tid) ? p.teams.filter(t => t !== tid) : [...p.teams, tid],
    }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <span className="font-black text-slate-800">🏆 Tạo Campaign mới</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Tên Campaign</label>
            <input
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
              placeholder="VD: Mid-Year Sale 2025"
              value={form.name}
              onChange={e => setForm(p => ({...p, name: e.target.value}))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Tuần bắt đầu</label>
              <select className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.startWeek} onChange={e => setForm(p => ({...p, startWeek: +e.target.value}))}>
                {WEEKS.map((w,i) => <option key={i} value={i}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Tuần kết thúc</label>
              <select className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.endWeek} onChange={e => setForm(p => ({...p, endWeek: +e.target.value}))}>
                {WEEKS.map((w,i) => <option key={i} value={i}>{w}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Budget (₫)</label>
              <input type="number" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.budget} onChange={e => setForm(p => ({...p, budget: +e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Target GMV (₫)</label>
              <input type="number" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" value={form.targetGmv} onChange={e => setForm(p => ({...p, targetGmv: +e.target.value}))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Màu</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(p => ({...p, color: c}))}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{ background: c, borderColor: form.color === c ? "#1A2B4A" : c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">Teams tham gia</label>
            <div className="flex flex-wrap gap-2">
              {TEAMS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTeam(t.id)}
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

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-1">Concept / Mô tả</label>
            <textarea
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none resize-none"
              rows={3}
              placeholder="Mô tả campaign..."
              value={form.concept}
              onChange={e => setForm(p => ({...p, concept: e.target.value}))}
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Hủy</button>
          <button
            onClick={() => { if (form.name.trim()) { onSave({...form, createdBy: user}); onClose(); } }}
            className="px-5 py-2 text-sm font-black text-white rounded-lg"
            style={{ background: BRAND.navy }}
          >
            Tạo Campaign
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => subscribeCampaigns(setCampaigns), []);

  const handleCreate = async (data: Omit<Campaign,"id"|"createdAt">) => {
    await createCampaign(data);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-800">🏆 Campaigns</h1>
          <p className="text-xs text-slate-400 mt-0.5">{campaigns.length} campaigns</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm font-black text-white rounded-lg"
          style={{ background: BRAND.navy }}
        >
          ＋ Tạo Campaign
        </button>
      </div>

      <div className="flex-1 p-6">
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <div className="text-4xl mb-3">🏆</div>
            <div className="text-sm font-semibold">Chưa có campaign nào</div>
            <button onClick={() => setShowModal(true)} className="mt-4 text-sm font-bold underline">
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
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ background: cp.color }} />
                    <div>
                      <div className="font-black text-slate-800 text-base">{cp.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{cp.concept}</div>
                    </div>
                  </div>
                  <CampaignStatusBadge status={cp.status} />
                </div>

                <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
                  <span>📅 Tuần {cp.startWeek + 1} → {cp.endWeek + 1}</span>
                  <span>💰 {formatCurrency(cp.budget)}</span>
                  <span>🎯 GMV {formatCurrency(cp.targetGmv)}</span>
                  <span>👤 {cp.createdBy}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cp.teams.map(tid => <TeamBadge key={tid} teamId={tid} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CampaignModal
          onClose={() => setShowModal(false)}
          onSave={handleCreate}
          user={user?.displayName ?? "User"}
        />
      )}
    </div>
  );
}
