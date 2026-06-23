"use client";
import { useState, useEffect, useMemo } from "react";
import { subscribeActivityLogs } from "@/lib/firestore";
import { useSystem } from "@/hooks/useSystem";
import type { ActivityLog } from "@/types";
import { formatDistanceToNow, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

export function ActivityFeed({ campaignId }: { campaignId: string | null }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const { teams, teamMap } = useSystem();
  
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);

  useEffect(() => {
    // Nếu không truyền campaignId thì subscribe tất cả (nếu null)
    // Nhưng Dashboard sẽ truyền campaignId
    const unsub = subscribeActivityLogs(campaignId, setLogs);
    return () => unsub();
  }, [campaignId]);

  useEffect(() => {
    setSelectedTeams([]);
    setSelectedActions([]);
  }, [campaignId]);

  // Handle Team Filter
  const toggleTeam = (tid: string) => {
    setSelectedTeams(prev => prev.includes(tid) ? prev.filter(t => t !== tid) : [...prev, tid]);
  };

  // Handle Action Filter
  const toggleAction = (act: string) => {
    setSelectedActions(prev => prev.includes(act) ? prev.filter(a => a !== act) : [...prev, act]);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchTeam = selectedTeams.length === 0 || selectedTeams.includes(log.teamId);
      const matchAction = selectedActions.length === 0 || selectedActions.includes(log.action);
      return matchTeam && matchAction;
    });
  }, [logs, selectedTeams, selectedActions]);

  const renderActionText = (log: ActivityLog) => {
    switch (log.action) {
      case "created": return <span className="text-emerald-600 font-medium">đã tạo mới</span>;
      case "updated": return <span className="text-blue-600 font-medium">đã cập nhật</span>;
      case "deleted": return <span className="text-red-600 font-medium">đã xoá</span>;
      default: return <span>thực hiện hành động</span>;
    }
  };

  const renderEntityType = (log: ActivityLog) => {
    switch (log.entityType) {
      case "content": return <span className="text-slate-500">nội dung</span>;
      case "booking": return <span className="text-slate-500">booking</span>;
      case "kpi_report": return <span className="text-slate-500">KPI actual cho</span>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-sm w-full md:w-80 lg:w-96">
      <div className="px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          ⚡ Activity Feed
        </h3>
        
        {/* Filters */}
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {teams.filter(t => t.id !== "campaign").map(team => (
              <button
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${selectedTeams.includes(team.id) ? 'font-bold' : 'text-slate-500 border-slate-200'}`}
                style={selectedTeams.includes(team.id) ? { backgroundColor: team.color + '20', color: team.color, borderColor: team.color } : {}}
              >
                {team.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {['created', 'updated', 'deleted'].map(act => {
              const actionLabel: Record<string, string> = {
                created: 'Tạo mới',
                updated: 'Cập nhật',
                deleted: 'Xoá'
              };
              return (
                <button
                  key={act}
                  onClick={() => toggleAction(act)}
                  className={`text-[10px] px-2 py-0.5 rounded border capitalize ${selectedActions.includes(act) ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-500 border-slate-200'}`}
                >
                  {actionLabel[act]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-xs text-slate-400 mt-10">Chưa có hoạt động nào.</div>
        ) : (
          <>
            {filteredLogs.map(log => {
              const team = teamMap[log.teamId];
            return (
              <div key={log.id} className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Avatar / Icon */}
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: (team?.color || "#94A3B8") + '20', color: team?.color || "#94A3B8" }}
                >
                  {team?.icon || "👤"}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900">{log.actorName}</span>{' '}
                    {renderActionText(log)}{' '}
                    {renderEntityType(log)}{' '}
                    <span className="font-bold text-slate-800">"{log.entityTitle}"</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span>
                      {formatDistanceToNow(parseISO(log.timestamp), { addSuffix: true, locale: vi })}
                    </span>
                    {team && (
                      <>
                        <span>•</span>
                        <span style={{ color: team.color }} className="font-medium">{team.label}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            );
            })}

          </>
        )}
      </div>
    </div>
  );
}
