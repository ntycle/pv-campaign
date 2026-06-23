"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { subscribeCampaigns, subscribeReports } from "@/lib/firestore";
import { BRAND } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { CampaignStatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useSystem } from "@/hooks/useSystem";
import type { Campaign, ReportEntry, TeamId } from "@/types";

// ── Team workflow steps ────────────────────────────────────
const TEAM_STEPS: Record<string, { phase: string; steps: string[] }[]> = {
  campaign: [
    { phase: "Pha 1 – Lập Plan", steps: [
      "Tạo Campaign mới với concept & timeline",
      "Phân bổ budget và target GMV",
      "Assign teams tham gia",
      "Vào tab 'Giao Plan' → nhập target cho từng team",
      "Publish kế hoạch cho các team",
    ]},
    { phase: "Pha 3 – Theo dõi", steps: [
      "Xem tab Report → kiểm tra tiến độ",
      "Đánh giá traffic light từng team",
      "Tối ưu ngân sách nếu cần",
    ]},
  ],
  social: [
    { phase: "Pha 2 – Kế hoạch", steps: [
      "Vào Campaign → Social Workspace",
      "Điền booking bài theo tuần/tháng/quý",
      "Phân bổ bài vào các campaign tương ứng",
    ]},
    { phase: "Pha 2 – Thực thi", steps: [
      "Sản xuất nội dung theo lịch",
      "Đăng bài đúng kế hoạch",
      "Update actual: Số bài, engagement, reach",
    ]},
  ],
  media: [
    { phase: "Pha 2 – Kế hoạch", steps: [
      "Vào Campaign → Media Workspace",
      "Booking clip TikTok/YouTube theo tuần/tháng/quý",
      "Phân bổ vào campaign tương ứng",
    ]},
    { phase: "Pha 2 – Thực thi", steps: [
      "Sản xuất video theo lịch",
      "Đăng tải lên TikTok/YouTube",
      "Update actual: Số clip, views",
    ]},
  ],
  design: [
    { phase: "Pha 2 – Kế hoạch", steps: [
      "Vào Campaign → Design Workspace",
      "Nhập slot design theo tuần",
      "Kiểm soát số lượng tác vụ/tuần",
    ]},
    { phase: "Pha 2 – Thực thi", steps: [
      "Nhận brief từ các team",
      "Thiết kế assets theo kế hoạch",
      "Update actual: Số assets hoàn thành",
    ]},
  ],
  onsite: [
    { phase: "Pha 2 – Kế hoạch", steps: [
      "Vào Campaign → Onsite Workspace",
      "Lên kế hoạch banner web/app",
    ]},
    { phase: "Pha 2 – Thực thi", steps: [
      "Air banner theo lịch campaign",
      "Theo dõi CTR và traffic",
      "Update actual: Clicks, traffic, CTR",
    ]},
  ],
  seo: [
    { phase: "Pha 2 – Kế hoạch", steps: [
      "Vào Campaign → SEO Workspace",
      "Target keywords và traffic",
    ]},
    { phase: "Pha 2 – Thực thi", steps: [
      "Tối ưu trang category/SKU",
      "Publish article SEO",
      "Update actual: Organic sessions",
    ]},
  ],
  digital: [
    { phase: "Pha 2 – Kế hoạch", steps: [
      "Vào Campaign → Digital Workspace",
      "Lên kế hoạch campaign GG & Meta",
      "Phân bổ budget quảng cáo",
    ]},
    { phase: "Pha 2 – Thực thi", steps: [
      "Setup campaign ads",
      "Monitor performance hàng ngày",
      "Update actual: Spend, traffic, GMV",
    ]},
  ],
};

// ── Flow Node ──────────────────────────────────────────────
function FlowNode({
  teamId, label, icon, color, pct, isActive, onClick,
}: {
  teamId: string; label: string; icon: string; color: string;
  pct: number; isActive: boolean; onClick: () => void;
}) {
  const borderColor = pct >= 90 ? "#10B981" : pct >= 60 ? "#F59E0B" : pct > 0 ? "#EF4444" : "#E5E7EB";
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group cursor-pointer"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-all group-hover:scale-105 group-hover:shadow-md border-2"
        style={{
          background: isActive ? color : color + "18",
          borderColor: isActive ? color : borderColor,
          boxShadow: isActive ? `0 0 0 4px ${color}30` : undefined,
        }}
      >
        {icon}
      </div>
      <span className="text-[10px] font-black text-slate-600">{label}</span>
      {pct > 0 && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: borderColor + "20", color: borderColor }}>
          {pct}%
        </span>
      )}
    </button>
  );
}

// ── Arrow connector ────────────────────────────────────────
function Arrow({ vertical = false }: { vertical?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${vertical ? "py-1" : "px-1"}`}>
      <div className="text-slate-300 text-lg">{vertical ? "↓" : "→"}</div>
    </div>
  );
}

// ── Step Panel (slide-in sidebar) ─────────────────────────
function StepPanel({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const { teamMap } = useSystem();
  const team = teamMap[teamId];
  const steps = TEAM_STEPS[teamId] ?? [];
  if (!team) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ background: team.color }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{team.icon}</span>
          <div>
            <div className="font-black text-white text-sm">{team.label}</div>
            <div className="text-xs text-white/70">{team.sublabel}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {steps.map((phase, pi) => (
          <div key={pi}>
            <div className="text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ color: team.color }}>{phase.phase}</div>
            <div className="space-y-2">
              {phase.steps.map((step, si) => (
                <div key={si} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 mt-0.5"
                    style={{ background: team.color }}>
                    {si + 1}
                  </div>
                  <span className="text-xs text-slate-600 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 text-center">
          Bấm vào campaign bên dưới để vào workspace
        </p>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────
export default function DashboardPage() {
  const { userProfile } = useAuth();
  const { teams, teamMap } = useSystem();
  const [campaigns, setCampaigns]       = useState<Campaign[]>([]);
  const [allReports, setAllReports]     = useState<ReportEntry[]>([]);
  const [activeCampaignId, setActiveCamp] = useState<string | null>(null);
  const [activeNode, setActiveNode]     = useState<string | null>(null);

  useEffect(() => subscribeCampaigns(setCampaigns), []);

  // Subscribe reports for active campaign
  useEffect(() => {
    if (!activeCampaignId) return;
    return subscribeReports(activeCampaignId, setAllReports);
  }, [activeCampaignId]);

  // Set first running campaign as default
  useEffect(() => {
    if (campaigns.length && !activeCampaignId) {
      const running = campaigns.find(c => c.status === "running") ?? campaigns[0];
      if (running) setActiveCamp(running.id);
    }
  }, [campaigns]);

  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

  // Compute team % completion
  const teamPct = (tid: TeamId) => {
    const entries = allReports.filter(r => r.teamId === tid);
    const t = entries.reduce((s, e) => s + e.target, 0);
    const a = entries.reduce((s, e) => s + e.actual, 0);
    return t > 0 ? Math.round(a / t * 100) : 0;
  };

  // Hero stats
  const running = campaigns.filter(c => c.status === "running").length;
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget ?? 0), 0);
  const totalGmv    = campaigns.reduce((s, c) => s + (c.targetGmv ?? 0), 0);

  const TEAM_NODES = teams.filter(t => t.id !== "campaign").map(t => t.id);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-lg font-black text-slate-800">🏠 Dashboard</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Xin chào {userProfile?.displayName} ·{" "}
          {userProfile?.teamId ? teamMap[userProfile.teamId]?.label : "Chưa chọn team"}
        </p>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* ── Hero Stats ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Campaigns đang chạy", value: running,                  icon: "🚀", color: "#3B82F6" },
            { label: "Tổng Budget",         value: formatCurrency(totalBudget), icon: "💰", color: "#F59E0B" },
            { label: "Target GMV",          value: formatCurrency(totalGmv),    icon: "🎯", color: "#10B981" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: s.color + "18" }}>
                {s.icon}
              </div>
              <div>
                <div className="text-xl font-black text-slate-800">{s.value}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Interactive Flow Diagram ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-black text-slate-800">🗺️ User Flow — Quy trình 3 Pha</h2>
              <p className="text-xs text-slate-400 mt-0.5">Click vào từng node để xem chi tiết bước công việc</p>
            </div>
            {/* Campaign selector */}
            {campaigns.length > 0 && (
              <select
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg font-semibold focus:outline-none"
                value={activeCampaignId ?? ""}
                onChange={e => setActiveCamp(e.target.value)}
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Flow diagram */}
          <div className="flex items-center justify-center gap-0 overflow-x-auto pb-2">
            {/* Pha 1: Campaign */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Pha 1</div>
              <FlowNode
                teamId="campaign" label="Campaign" icon="🏆"
                color={teamMap["campaign"]?.color || "#6366F1"}
                pct={0}
                isActive={activeNode === "campaign"}
                onClick={() => setActiveNode(activeNode === "campaign" ? null : "campaign")}
              />
              <div className="text-[9px] text-slate-400 mt-1 text-center max-w-[70px] leading-tight">
                Lập plan<br/>Giao KPI
              </div>
            </div>

            {/* Arrow */}
            <Arrow />

            {/* Pha 2: 6 teams */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Pha 2 — Song song</div>
              <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                {TEAM_NODES.map(tid => {
                  const team = teamMap[tid];
                  if (!team) return null;
                  const pct  = teamPct(tid);
                  return (
                    <FlowNode
                      key={tid}
                      teamId={tid} label={team.label} icon={team.icon}
                      color={team.color} pct={pct}
                      isActive={activeNode === tid}
                      onClick={() => setActiveNode(activeNode === tid ? null : tid)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Arrow */}
            <Arrow />

            {/* Pha 3: Report */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Pha 3</div>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl border-2 border-emerald-300 shadow-sm"
                style={{ background: "#D1FAE5" }}
              >
                📊
              </div>
              <span className="text-[10px] font-black text-slate-600">Report</span>
              {activeCampaign && (
                <Link
                  href={`/campaigns/${activeCampaignId}`}
                  className="text-[9px] text-emerald-600 font-bold underline mt-0.5"
                >
                  Xem →
                </Link>
              )}
            </div>
          </div>

          {/* Phase labels below */}
          <div className="mt-4 flex justify-center gap-6">
            {[
              { color: "#6366F1", label: "1. Campaign lập & giao plan" },
              { color: "#3B82F6", label: "2. Các team điền kế hoạch & thực thi" },
              { color: "#10B981", label: "3. Đổ chỉ số về Report chung" },
            ].map(p => (
              <div key={p.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                <span className="text-[10px] text-slate-500 font-semibold">{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Campaign Progress Cards ── */}
        <div>
          <h2 className="text-sm font-black text-slate-700 mb-3">📋 Tất cả Campaigns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map(cp => (
              <Link
                key={cp.id}
                href={`/campaigns/${cp.id}`}
                className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-4 flex gap-3"
              >
                <div className="w-1.5 rounded-full flex-shrink-0 self-stretch" style={{ background: cp.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-sm text-slate-800 truncate">{cp.name}</span>
                    <CampaignStatusBadge status={cp.status} />
                  </div>
                  <p className="text-xs text-slate-400 truncate mb-2">{cp.concept}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>💰 {formatCurrency(cp.budget)}</span>
                    <span>🎯 {formatCurrency(cp.targetGmv)}</span>
                  </div>
                </div>
              </Link>
            ))}
            {campaigns.length === 0 && (
              <div className="col-span-2 text-center py-10 text-slate-400 text-sm">
                Chưa có campaign nào.{" "}
                <Link href="/campaigns" className="text-blue-500 font-bold underline">Tạo ngay →</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step Panel slide-in */}
      {activeNode && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveNode(null)} />
          <StepPanel teamId={activeNode} onClose={() => setActiveNode(null)} />
        </>
      )}
    </div>
  );
}
