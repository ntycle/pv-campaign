import { TEAM_MAP } from "@/lib/constants";
import type { TeamId } from "@/types";

export function TeamBadge({ teamId }: { teamId: TeamId }) {
  const team = TEAM_MAP[teamId];
  if (!team) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color: team.color, background: team.color + "18" }}
    >
      <span>{team.icon}</span>
      {team.label}
    </span>
  );
}
