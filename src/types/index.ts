// ── Teams ──────────────────────────────────────────────────
export type TeamId =
  | "campaign"
  | "social"
  | "retail"
  | "media"
  | "seo"
  | "digital"
  | "onsite"
  | "design"
  | "trade";

export interface Team {
  id: TeamId;
  label: string;
  sublabel: string;
  color: string;
  icon: string;
}

// ── KPI ────────────────────────────────────────────────────
export interface KpiField {
  id: string;
  label: string;
  unit?: string;
  type: "number" | "currency" | "percentage";
}

export interface KpiEntry {
  id: string;
  campaignId: string;
  teamId: TeamId;
  weekIndex: number; // 0-3
  fieldId: string;
  target: number;
  actual: number;
  note?: string;
  updatedBy?: string;
  updatedAt?: string;
}

// ── Campaign ────────────────────────────────────────────────
export type CampaignStatus = "draft" | "planning" | "running" | "done" | "paused";

export interface Campaign {
  id: string;
  name: string;
  color: string;
  status: CampaignStatus;
  startWeek: number; // 0-3
  endWeek: number;   // 0-3
  teams: TeamId[];
  concept: string;
  budget: number;
  targetGmv: number;
  createdBy: string;
  createdAt: string;
}

// ── Content Item ────────────────────────────────────────────
export type ContentType = "post" | "video" | "sku" | "article";
export type ContentStatus = "pending" | "approved" | "running" | "done" | "blocked";

export interface ContentItem {
  id: string;
  campaignId: string;
  teamId: TeamId;
  type: ContentType;
  title: string;
  day: number; // 0=Mon … 6=Sun
  weekIndex: number;
  status: ContentStatus;
  note?: string;
  updatedBy?: string;
  updatedAt?: string;
}

// ── Resource Booking ────────────────────────────────────────
export type ResourceType = "design_slot" | "video_prod" | "ads_budget" | "email_slot" | "event_slot";
export type Priority = "critical" | "high" | "medium" | "low";

export interface Booking {
  id: string;
  campaignId: string;
  resourceType: ResourceType;
  teams: TeamId[];
  days: number[];
  weekIndex: number;
  status: ContentStatus;
  priority: Priority;
  description?: string;
  updatedBy?: string;
  updatedAt?: string;
}

// ── Auth ────────────────────────────────────────────────────
export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
