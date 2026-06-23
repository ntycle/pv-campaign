"use client";

import { useState, useEffect } from "react";
import { subscribeUserProfiles, subscribeTeams, upsertUserProfile } from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import type { UserProfile, Team, UserRole } from "@/types";
import { BRAND } from "@/lib/constants";
import { NAV } from "@/components/layout/Sidebar";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "campaign_lead", label: "Campaign Lead" },
  { value: "team_member", label: "Team Member" },
  { value: "viewer", label: "Viewer" },
];

export default function UsersPage() {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabModalUser, setTabModalUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    let unmounted = false;
    const unsubUsers = subscribeUserProfiles(data => {
      if (!unmounted) setUsers(data);
    });
    const unsubTeams = subscribeTeams(data => {
      if (!unmounted) {
        setTeams(data);
        setLoading(false);
      }
    });

    return () => {
      unmounted = true;
      unsubUsers();
      unsubTeams();
    };
  }, []);

  const isAdmin = userProfile?.role === "campaign_lead";

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (!isAdmin) return;
    const userToUpdate = users.find(u => u.uid === uid);
    if (!userToUpdate) return;
    await upsertUserProfile({ ...userToUpdate, role: newRole });
  };

  const handleTeamChange = async (uid: string, newTeamId: string) => {
    if (!isAdmin) return;
    const userToUpdate = users.find(u => u.uid === uid);
    if (!userToUpdate) return;
    await upsertUserProfile({ ...userToUpdate, teamId: newTeamId || null });
  };

  if (loading) {
    return <div className="p-8 text-slate-400">Đang tải...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Quản lý Users</h1>
        <p className="text-slate-500">
          Quản lý tài khoản, phân quyền và gán team cho các thành viên. (Chỉ Campaign Lead mới có quyền thay đổi)
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse min-w-max text-sm">
          <thead>
            <tr style={{ background: BRAND.navy }}>
              <th className="p-4 text-sm font-bold text-white">User</th>
              <th className="p-4 text-sm font-bold text-white">Email</th>
              <th className="p-4 text-sm font-bold text-white">Team</th>
              <th className="p-4 text-sm font-bold text-white">Role</th>
              <th className="p-4 text-sm font-bold text-white">Tabs Access</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, index) => {
              return (
                <tr key={u.uid} className={`border-b border-slate-100 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {u.displayName?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <span className="font-semibold text-slate-800">{u.displayName || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{u.email}</td>
                  <td className="p-4">
                    <select
                      value={u.teamId || ""}
                      disabled={!isAdmin}
                      onChange={e => handleTeamChange(u.uid, e.target.value)}
                      className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- No Team --</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    <select
                      value={u.role}
                      disabled={!isAdmin}
                      onChange={e => handleRoleChange(u.uid, e.target.value as UserRole)}
                      className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    >
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    <button 
                      disabled={!isAdmin}
                      onClick={() => setTabModalUser(u)} 
                      className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 transition-colors"
                    >
                      {u.allowedTabs ? `${u.allowedTabs.length}/${NAV.length} Tabs` : "0 Tabs"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Chưa có user nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {tabModalUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Phân quyền Tabs</h3>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTabModalUser({...tabModalUser, allowedTabs: NAV.map(n => n.href)})} 
                  className="text-[11px] text-blue-600 font-bold hover:underline bg-blue-50 px-2 py-1 rounded"
                >
                  Chọn tất cả
                </button>
                <button 
                  onClick={() => setTabModalUser({...tabModalUser, allowedTabs: []})} 
                  className="text-[11px] text-slate-500 font-bold hover:underline bg-slate-100 px-2 py-1 rounded"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-6">
              {tabModalUser.photoURL ? (
                <img src={tabModalUser.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                  {tabModalUser.displayName?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div>
                <div className="font-semibold text-slate-800 leading-tight">{tabModalUser.displayName}</div>
                <div className="text-xs text-slate-500">{tabModalUser.email}</div>
              </div>
            </div>

            <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto pr-2">
              {NAV.map(nav => {
                const isAllowed = tabModalUser.allowedTabs ? tabModalUser.allowedTabs.includes(nav.href) : false;
                return (
                  <label key={nav.href} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={isAllowed}
                      onChange={(e) => {
                        const currentAllowed = tabModalUser.allowedTabs || [];
                        let newAllowed;
                        if (e.target.checked) {
                          newAllowed = [...currentAllowed, nav.href];
                        } else {
                          newAllowed = currentAllowed.filter(href => href !== nav.href);
                        }
                        setTabModalUser({ ...tabModalUser, allowedTabs: newAllowed });
                      }}
                    />
                    <span className="text-slate-700 font-medium text-sm flex items-center gap-2">
                      <span className="text-lg w-5 text-center">{nav.icon}</span> {nav.label}
                    </span>
                  </label>
                );
              })}
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setTabModalUser(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Hủy</button>
              <button
                onClick={async () => {
                  await upsertUserProfile(tabModalUser);
                  setTabModalUser(null);
                }}
                className="px-4 py-2 text-sm font-black text-white rounded-lg shadow-md"
                style={{ background: BRAND.navy }}
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
