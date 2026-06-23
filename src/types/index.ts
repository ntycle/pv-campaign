// ── Teams ──────────────────────────────────────────────────
export type TeamId = string;

export interface Team {
  id: string;
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

// ── Period (week / month / quarter / campaign) ───────────────
export interface Period {
  type: "week" | "month" | "quarter" | "campaign";
  value: number;  // week: 0-51 | month: 1-12 | quarter: 1-4 | campaign: 0
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
export type ContentType = "post" | "video" | "sku" | "article" | "event";
export type ContentStatus = "pending" | "approved" | "running" | "done" | "blocked";

export interface ContentItem {
  id: string;
  campaignId: string;
  teamId: TeamId;
  type: ContentType;
  title: string;
  date: string; // YYYY-MM-DD
  status: ContentStatus;
  note?: string;
  updatedBy?: string;
  updatedAt?: string;
}

// ── Resource Booking ────────────────────────────────────────
export type ResourceType = string;
export type Priority = "critical" | "high" | "medium" | "low";

export interface ResourceConfig {
  id: string; // ResourceType
  label: string;
  icon: string;
  capacity: number; // Default capacity
  teamId: string;   // Which team manages this
}

export interface Booking {
  id: string;
  campaignId: string;
  resourceType: ResourceType;
  teams: TeamId[];
  dates: string[]; // YYYY-MM-DD - requested/booked dates
  status: ContentStatus;
  priority: Priority;
  description?: string;
  completedDate?: string; // YYYY-MM-DD - actual completed date
  confirmedAt?: string;   // ISO timestamp when confirmed
  updatedBy?: string;
  updatedAt?: string;
}

// ── Resource Quota ──────────────────────────────────────────
export interface ResourceQuota {
  id: string;
  resourceType: ResourceType;
  timeframe: "default" | "week" | "month";
  timeValue: string; // e.g. "default", "2026-W26", "2026-06"
  capacity: number; // total slots across ALL teams/campaigns in this period
}

// ── Auth ────────────────────────────────────────────────────
export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
