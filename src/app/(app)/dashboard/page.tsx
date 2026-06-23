"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  subscribeCampaigns,
  subscribeReports,
  subscribeContentItems,
  subscribeCampaignBookings
} from "@/lib/firestore";
import { formatCurrency } from "@/lib/utils";
import { TEAM_KPI_FIELDS } from "@/lib/constants";
import { CampaignStatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useSystem } from "@/hooks/useSystem";
import type { Campaign, ReportEntry, ContentItem, Booking } from "@/types";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { isWithinInterval, startOfWeek, endOfWeek, parseISO } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

export default function DashboardPage() {
  const { teamMap } = useSystem();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [allReports, setAllReports] = useState<ReportEntry[]>([]);
  const [allContents, setAllContents] = useState<ContentItem[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);

  const [activeCampaignId, setActiveCamp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load basic data
  useEffect(() => subscribeCampaigns((d) => { setCampaigns(d); setLoading(false); }), []);

  // Filter valid campaigns for dropdown (running / planning)
  const validCampaigns = useMemo(() => {
    return campaigns.filter(c => c.status === "running" || c.status === "planning");
  }, [campaigns]);

  // Set default active campaign
  useEffect(() => {
    if (validCampaigns.length && !activeCampaignId) {
      setActiveCamp(validCampaigns[0].id);
    }
  }, [validCampaigns, activeCampaignId]);

  // Subscriptions for active campaign
  useEffect(() => {
    if (!activeCampaignId) return;
    const unsubReports = subscribeReports(activeCampaignId, setAllReports);
    const unsubBookings = subscribeCampaignBookings(activeCampaignId, setAllBookings);
    const unsubContents = subscribeContentItems(activeCampaignId, null, setAllContents);
    return () => {
      unsubReports();
      unsubBookings();
      unsubContents();
    };
  }, [activeCampaignId]);

  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

  // Current week interval
  const { thisWeekStart, thisWeekEnd } = useMemo(() => ({
    thisWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
    thisWeekEnd: endOfWeek(new Date(), { weekStartsOn: 1 }),
  }), []);

  // Teams to display: Teams that are part of the campaign, excluding the "campaign" pseudo-team
  const participatingTeams = useMemo(() => {
    if (!activeCampaign) return [];
    return activeCampaign.teams.filter(tid => tid !== "campaign");
  }, [activeCampaign]);

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!activeCampaign) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-slate-400">
        <p>Không có campaign nào đang chạy hoặc planning.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-black text-slate-800">⚔️ War Room Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-team overview & performance tracking
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            className="text-sm px-4 py-2 border border-slate-200 rounded-xl font-bold bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            value={activeCampaignId ?? ""}
            onChange={e => setActiveCamp(e.target.value)}
          >
            {validCampaigns.map(c => (
              <option key={c.id} value={c.id}>🚀 {c.name}</option>
            ))}
          </select>
          <CampaignStatusBadge status={activeCampaign.status} />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto">
          {/* ── Campaign Hero ── */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-2xl font-black text-blue-900">{activeCampaign.name}</h2>
              <p className="text-sm text-blue-600/80 font-medium mt-1">{activeCampaign.concept}</p>
            </div>
            <div className="flex gap-8">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Budget</div>
                <div className="text-xl font-black text-slate-800">{formatCurrency(activeCampaign.budget)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target GMV</div>
                <div className="text-xl font-black text-emerald-600">{formatCurrency(activeCampaign.targetGmv)}</div>
              </div>
            </div>
          </div>

          {/* ── War Room Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {participatingTeams.map(teamId => {
              const team = teamMap[teamId];
              if (!team) return null;

              // 1. Reports/KPI calculations
              const teamReports = allReports.filter(r => r.teamId === teamId && r.period.type === "campaign");
              const totalTarget = teamReports.reduce((s, r) => s + r.target, 0);
              const totalActual = teamReports.reduce((s, r) => s + r.actual, 0);
              const progressPct = totalTarget > 0 ? Math.min(100, Math.round((totalActual / totalTarget) * 100)) : 0;

              // Recharts Data preparation
              // Aggregate by metricId
              const metricMap: Record<string, { target: number; actual: number }> = {};
              teamReports.forEach(r => {
                if (!metricMap[r.metricId]) metricMap[r.metricId] = { target: 0, actual: 0 };
                metricMap[r.metricId].target += r.target;
                metricMap[r.metricId].actual += r.actual;
              });
              const teamKpiFields = TEAM_KPI_FIELDS[teamId] ?? [];
              const chartData = Object.keys(metricMap).map(key => {
                const fieldDef = teamKpiFields.find(f => f.id === key);
                return {
                  name: fieldDef?.label ?? key.replace(/_/g, ' '),
                  Target: metricMap[key].target,
                  Actual: metricMap[key].actual,
                };
              });

              // 2. Contents calculations (This Week)
              const teamContents = allContents.filter(c => c.teamId === teamId);
              const thisWeekContents = teamContents.filter(c => {
                try {
                  const d = parseISO(c.date);
                  return isWithinInterval(d, { start: thisWeekStart, end: thisWeekEnd });
                } catch {
                  return false;
                }
              });
              const pendingContents = thisWeekContents.filter(c => c.status === "pending" || c.status === "approved").length;
              const doneContents = thisWeekContents.filter(c => c.status === "done" || c.status === "running").length;

              // 3. Bookings calculations (Active/Pending)
              const teamBookings = allBookings.filter(b => b.teams.includes(teamId));
              const activeBookings = teamBookings.filter(b => b.status === "running" || b.status === "approved").length;

              return (
                <div key={teamId} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all flex flex-col">
                  <div className="p-4 border-b border-slate-50 flex items-center justify-between" style={{ backgroundColor: team.color + '10' }}>
                    <TeamBadge teamId={teamId} />
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-white text-slate-500 shadow-sm">
                      KPI: {progressPct}%
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col gap-5">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        <span>Overall Progress</span>
                        <span style={{ color: team.color }}>{progressPct}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%`, backgroundColor: team.color }}
                        />
                      </div>
                    </div>

                    {/* Chart */}
                    {chartData.length > 0 ? (
                      <div className="h-32 w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                              cursor={{ fill: '#F1F5F9' }}
                            />
                            <Bar dataKey="Target" fill="#CBD5E1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                            <Bar dataKey="Actual" fill={team.color} radius={[4, 4, 0, 0]} maxBarSize={30} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-32 w-full mt-2 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <span className="text-xs font-medium text-slate-400">Chưa có KPI data</span>
                      </div>
                    )}

                    {/* Micro stats */}
                    <div className="grid grid-cols-2 gap-3 mt-auto">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Content (Tuần này)</div>
                        <div className="flex items-end gap-2">
                          <span className="text-lg font-black text-emerald-500" title="Done">{doneContents}</span>
                          <span className="text-xs font-bold text-slate-300 pb-1">/</span>
                          <span className="text-lg font-black text-amber-500" title="Pending">{pendingContents}</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Bookings</div>
                        <div className="text-lg font-black text-blue-500">{activeBookings}</div>
                      </div>
                    </div>
                    <Link
                      href={`/campaigns/${activeCampaignId}/team/${teamId}`}
                      className="mt-2 w-full text-center text-xs font-bold py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors block"
                    >
                      Xem Workspace →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Activity Feed Sidebar */}
        <ActivityFeed campaignId={activeCampaignId} />
      </div>
    </div>
  );
}
