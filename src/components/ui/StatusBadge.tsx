import { STATUS_CONFIG, CAMPAIGN_STATUS_CONFIG } from "@/lib/constants";
import type { ContentStatus, CampaignStatus } from "@/types";

interface ContentBadgeProps { status: ContentStatus }
interface CampaignBadgeProps { status: CampaignStatus }

export function StatusBadge({ status }: ContentBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

export function CampaignStatusBadge({ status }: CampaignBadgeProps) {
  const cfg = CAMPAIGN_STATUS_CONFIG[status] ?? CAMPAIGN_STATUS_CONFIG.draft;
  return (
    <span
      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}
