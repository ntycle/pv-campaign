"use client";
import { useState } from "react";
import { BRAND } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useSystem } from "@/hooks/useSystem";
import type { TeamId, UserRole } from "@/types";

const ROLES: { value: UserRole; label: string; desc: string; icon: string }[] = [
  { value: "campaign_lead", label: "Campaign Lead",  desc: "Tạo plan, giao KPI, xem toàn bộ report", icon: "🏆" },
  { value: "team_member",   label: "Team Member",    desc: "Chỉ edit workspace team mình",            icon: "👤" },
  { value: "viewer",        label: "Viewer",         desc: "Xem tất cả, không chỉnh sửa",            icon: "👁️" },
];

export function TeamSetupModal() {
  const { userProfile, updateProfile } = useAuth();
  const { teams } = useSystem();
  const [selectedTeam, setSelectedTeam] = useState<TeamId | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("team_member");
  const [saving, setSaving] = useState(false);

  if (!userProfile || userProfile.teamId !== null) return null;

  const handleSave = async () => {
    if (!selectedTeam && selectedRole !== "campaign_lead") return;
    setSaving(true);
    await updateProfile({
      teamId: selectedRole === "campaign_lead" ? "campaign" : selectedTeam,
      role:   selectedRole,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 text-center" style={{ background: BRAND.navy }}>
          <div className="text-3xl mb-2">👋</div>
          <h1 className="text-lg font-black text-white">Chào mừng {userProfile.displayName}!</h1>
          <p className="text-sm text-slate-300 mt-1">Bạn thuộc team nào trong PV Marketing?</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Role selection */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">
              Vai trò của bạn
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setSelectedRole(r.value)}
                  className="p-3 rounded-xl border-2 text-left transition-all"
                  style={selectedRole === r.value
                    ? { borderColor: BRAND.navy, background: BRAND.navy + "0D" }
                    : { borderColor: "#E5E7EB", background: "#F9FAFB" }
                  }
                >
                  <div className="text-xl mb-1">{r.icon}</div>
                  <div className="text-xs font-black text-slate-700">{r.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Team selection — chỉ hiện khi không phải campaign_lead */}
          {selectedRole !== "campaign_lead" && (
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">
                Chọn team của bạn
              </label>
              <div className="grid grid-cols-3 gap-2">
                {teams.filter(t => t.id !== "campaign").map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTeam(t.id)}
                    className="p-3 rounded-xl border-2 text-left transition-all"
                    style={selectedTeam === t.id
                      ? { borderColor: t.color, background: t.color + "18" }
                      : { borderColor: "#E5E7EB", background: "#F9FAFB" }
                    }
                  >
                    <div className="text-xl mb-1">{t.icon}</div>
                    <div className="text-xs font-black text-slate-700">{t.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{t.sublabel}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || (selectedRole !== "campaign_lead" && !selectedTeam)}
            className="w-full py-3 text-sm font-black text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: BRAND.navy }}
          >
            {saving ? "Đang lưu..." : "✅ Xác nhận & Vào hệ thống"}
          </button>
        </div>
      </div>
    </div>
  );
}
