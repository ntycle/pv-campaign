import type { Team, TeamId, KpiField, ResourceType } from "@/types";

export const WEEKS   = ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"];
export const MONTHS  = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
                        "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
export const QUARTERS = ["Q1 (T1–T3)", "Q2 (T4–T6)", "Q3 (T7–T9)", "Q4 (T10–T12)"];
export const PERIOD_LABELS = { week: "Theo tuần", month: "Theo tháng", quarter: "Theo quý" } as const;
export const DAYS_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export const DAYS_FULL = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

export const TEAMS: Team[] = [
  { id: "campaign", label: "Campaign",    sublabel: "Planning tổng thể",   color: "#6366F1", icon: "🏆" },
  { id: "social",   label: "Social",      sublabel: "Nội dung social",      color: "#3B82F6", icon: "📣" },
  { id: "retail",   label: "Retail",      sublabel: "Trưng bày điểm bán",   color: "#EF4444", icon: "🏪" },
  { id: "media",    label: "Media",       sublabel: "Video content",         color: "#8B5CF6", icon: "🎬" },
  { id: "seo",      label: "SEO",         sublabel: "Organic traffic",       color: "#06B6D4", icon: "🔍" },
  { id: "digital",  label: "Digital",     sublabel: "Paid performance",      color: "#F59E0B", icon: "📈" },
  { id: "onsite",   label: "Onsite",      sublabel: "Banner on-site",        color: "#10B981", icon: "🌐" },
  { id: "design",   label: "Design",      sublabel: "Creative assets",       color: "#EC4899", icon: "🎨" },
  { id: "trade",    label: "Trade",       sublabel: "Trade marketing",       color: "#F97316", icon: "🏷️" },
];

export const TEAM_MAP = Object.fromEntries(TEAMS.map(t => [t.id, t])) as Record<TeamId, Team>;

// KPI fields per team (from mindmap)
export const TEAM_KPI_FIELDS: Record<TeamId, KpiField[]> = {
  campaign: [
    { id: "concept_done",   label: "Concept & Timeline",   type: "number" },
    { id: "budget_used",    label: "Budget sử dụng",        type: "currency", unit: "₫" },
    { id: "budget_total",   label: "Budget tổng",           type: "currency", unit: "₫" },
    { id: "target_gmv",     label: "Target GMV",            type: "currency", unit: "₫" },
  ],
  social: [
    { id: "post_count",     label: "Số lượng bài viết",    type: "number" },
    { id: "engagement",     label: "Tương tác",             type: "number" },
    { id: "reach",          label: "Reach",                 type: "number" },
  ],
  retail: [
    { id: "posm_count",     label: "POSM theo vị trí",     type: "number" },
    { id: "display_spots",  label: "Vị trí trưng bày",     type: "number" },
  ],
  media: [
    { id: "clips_produced", label: "Sản xuất clip",         type: "number" },
    { id: "views",          label: "Views",                  type: "number" },
  ],
  seo: [
    { id: "traffic_sku",    label: "Traffic SKU",           type: "number" },
    { id: "traffic_cat",    label: "Trang category",        type: "number" },
  ],
  digital: [
    { id: "traffic",        label: "Traffic",               type: "number" },
    { id: "reach",          label: "Reach",                 type: "number" },
    { id: "cpm",            label: "CPM",                   type: "currency", unit: "₫" },
    { id: "cpc",            label: "CPC",                   type: "currency", unit: "₫" },
    { id: "cost_gmv",       label: "Cost / GMV",            type: "percentage" },
  ],
  onsite: [
    { id: "banners",        label: "Banner",                type: "number" },
    { id: "traffic",        label: "Traffic",               type: "number" },
    { id: "clicks",         label: "Click",                 type: "number" },
  ],
  design: [
    { id: "assets_done",    label: "Assets hoàn thành",    type: "number" },
    { id: "revision_rounds",label: "Số vòng revision",     type: "number" },
  ],
  trade: [
    { id: "promo_count",    label: "Chương trình KM",      type: "number" },
    { id: "sku_on_promo",   label: "SKU được KM",          type: "number" },
  ],
};

export const RESOURCE_CONFIG: Record<ResourceType, { label: string; icon: string; capacity: number; teamId: TeamId }> = {
  design_slot: { label: "Design Slot",      icon: "🎨", capacity: 3, teamId: "design"  },
  video_prod:  { label: "Video Production", icon: "🎬", capacity: 2, teamId: "media"   },
  ads_budget:  { label: "Ads Budget Slot",  icon: "💰", capacity: 5, teamId: "digital" },
  email_slot:  { label: "Email/ZNS Slot",   icon: "📧", capacity: 2, teamId: "onsite"  },
  event_slot:  { label: "Event/POSM",       icon: "🏪", capacity: 1, teamId: "retail"  },
};

export const STATUS_CONFIG = {
  pending:  { label: "Chờ duyệt",  color: "#6B7280", bg: "#F3F4F6" },
  approved: { label: "Đã duyệt",   color: "#059669", bg: "#D1FAE5" },
  running:  { label: "Đang chạy",  color: "#2563EB", bg: "#DBEAFE" },
  done:     { label: "Hoàn thành", color: "#7C3AED", bg: "#EDE9FE" },
  blocked:  { label: "Bị block",   color: "#DC2626", bg: "#FEE2E2" },
};

export const CONTENT_QUOTAS = {
  post:    { label: "Bài viết",    icon: "📝", weekly: 20, color: "#3B82F6" },
  video:   { label: "Short Video", icon: "🎥", weekly: 4,  color: "#8B5CF6" },
  sku:     { label: "SKU Tối ưu",  icon: "📦", weekly: 30, color: "#F59E0B" },
  article: { label: "Article SEO", icon: "📰", weekly: 10, color: "#10B981" },
};

export const CAMPAIGN_STATUS_CONFIG = {
  draft:    { label: "Nháp",         color: "#9CA3AF", bg: "#F9FAFB" },
  planning: { label: "Đang plan",    color: "#F59E0B", bg: "#FEF3C7" },
  running:  { label: "Đang chạy",   color: "#2563EB", bg: "#DBEAFE" },
  done:     { label: "Hoàn thành",  color: "#059669", bg: "#D1FAE5" },
  paused:   { label: "Tạm dừng",    color: "#DC2626", bg: "#FEE2E2" },
};

// Brand colors
export const BRAND = {
  navy:  "#1A2B4A",
  red:   "#E8231A",
  light: "#F1F5F9",
};
