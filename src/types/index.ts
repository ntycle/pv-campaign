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

// ── User & Roles ────────────────────────────────────────────
export type UserRole = "campaign_lead" | "team_member" | "viewer";

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  teamId: TeamId | null;   // team được assign
  role: UserRole;
}

// ── KPI (legacy — giữ nguyên cho backwards compat) ─────────
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

// ── Period (week / month / quarter) ────────────────────────
export interface Period {
  type: "week" | "month" | "quarter";
  value: number;  // week: 0-51 | month: 1-12 | quarter: 1-4
}

// ── Report Entry — UNIFIED structure cho tất cả 6 teams ────
export interface ReportEntry {
  id: string;
  campaignId: string;
  teamId: TeamId;
  metricId: string;         // e.g. 'post_count', 'reach', 'traffic'
  period: Period;
  target: number;           // Campaign lead assign
  actual: number;           // Team member cập nhật
  unit?: string;
  note?: string;
  updatedBy: string;
  updatedAt: string;
}

// ── Team Plan — booking slots theo kỳ ──────────────────────
export interface TeamPlan {
  id: string;
  campaignId: string;
  teamId: TeamId;
  weeklyTargets: Record<number, number>;  // weekIndex → target count
  monthlyTarget: number;
  quarterlyTarget: number;
  notes: string;
  submittedBy: string;
  updatedAt: string;
}

// ── Campaign ────────────────────────────────────────────────
export type CampaignStatus = "draft" | "planning" | "running" | "done" | "paused";

export interface Campaign {
  id: string;
  name: string;
  color: string;
  status: CampaignStatus;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
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
  monthIndex?: number;
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
