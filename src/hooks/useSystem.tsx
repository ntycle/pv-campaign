"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { subscribeTeams, subscribeResources, upsertTeam, upsertResource } from "@/lib/firestore";
import type { Team, ResourceConfig, TeamId, ResourceType } from "@/types";
import { TEAMS, RESOURCE_CONFIG } from "@/lib/constants";

interface SystemContextType {
  teams: Team[];
  resources: ResourceConfig[];
  teamMap: Record<TeamId, Team>;
  resourceMap: Record<ResourceType, ResourceConfig>;
  loading: boolean;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [resources, setResources] = useState<ResourceConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let teamsLoaded = false;
    let resourcesLoaded = false;

    const checkLoading = () => {
      if (teamsLoaded && resourcesLoaded) setLoading(false);
    };

    const unsubTeams = subscribeTeams(async (data) => {
      if (data.length === 0) {
        // Seed database
        console.log("Seeding teams...");
        for (const t of TEAMS) await upsertTeam(t);
      } else {
        setTeams(data);
        teamsLoaded = true;
        checkLoading();
      }
    });

    const unsubResources = subscribeResources(async (data) => {
      if (data.length === 0) {
        // Seed database
        console.log("Seeding resources...");
        for (const [k, v] of Object.entries(RESOURCE_CONFIG)) {
          await upsertResource({ id: k, ...v });
        }
      } else {
        setResources(data);
        resourcesLoaded = true;
        checkLoading();
      }
    });

    return () => {
      unsubTeams();
      unsubResources();
    };
  }, []);

  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t])) as Record<TeamId, Team>;
  const resourceMap = Object.fromEntries(resources.map((r) => [r.id, r])) as Record<ResourceType, ResourceConfig>;

  return (
    <SystemContext.Provider value={{ teams, resources, teamMap, resourceMap, loading }}>
      {!loading ? children : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="spinner" />
        </div>
      )}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error("useSystem must be used within a SystemProvider");
  }
  return context;
}
