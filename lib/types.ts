export type Role = "spektrum" | "agency";

export type CampaignType = "KOL" | "CONNECTOR" | "TROOPS" | "ATTEND";

/** Project sheets: KOL Ads is a matrix/TS sheet again, Data Ads is its own module. */
export type ProjectType = "KOL" | "CONNECTOR" | "KOL_ADS" | "TROOPS";

export type SheetFormat = "TS" | "TL";

export type ScrapeStatus = "success" | "failed" | "pending";

/** Per-sheet column layout: order = array order, required = green header. */
export interface ColumnConfig {
  key: string;
  required: boolean;
}
export interface Brand {
  id: string;
  name: string;
  code: string;
  initials: string;
  hue: number;
  agencies: string[];
}

export interface CampaignMetrics {
  organic: number;
  gs: number;
  engagement: number;
  content: number;
  followers: number;
  adsVideo: number;
  impressions: number;
  reach: number;
  materials: number;
  registered: number;
  attended: number;
}

export interface Campaign {
  id: string;
  brandId: string;
  name: string;
  /** Internal effort profile — never shown in the UI. */
  type: CampaignType;
  agency: string;
  start: string;
  end: string;
  metrics: CampaignMetrics;
  series: number[];
}

export interface CampaignGroup {
  id: string;
  brandId: string;
  name: string;
  description: string;
  campaignIds: string[];
}

/** One row in a project sheet or a Data Ads sheet. */
export interface SheetRow {
  id: string;
  // Tracker sheet columns
  name: string;
  linkAccount: string;
  followers: string;
  publishLink: string;
  niche: string;
  sowItem: string;
  actualPublishDate: string;
  proofLink: string;
  insightsLink: string;
  sixSecondViews: string;
  // Tracker list columns
  startDate: string;
  endDate: string;
  oaContent: string;
  creativeName: string;
  kolCategory: string;
  vendor: string;
  linkPost: string;
  boostCode: string;
  ig: string;
  newBrief: string;
  picture: string;
  remarks: string;
  namingUplink: string;
  // Derived
  cleanLink: string;
  shortcode: string;
  scrape: ScrapeStatus;
}

export interface Project {
  id: string;
  brandId: string;
  campaignId: string;
  type: ProjectType;
  agency: string;
  pmLink: string;
  createdAt: string;
  savedAt: string;
  rows: SheetRow[];
  columns?: ColumnConfig[];
}

export interface DataAdsSheet {
  id: string;
  name: string;
  rows: SheetRow[];
  columns?: ColumnConfig[];
}

export interface DataAds {
  id: string;
  brandId: string;
  campaignId: string;
  name: string;
  agency: string;
  createdAt: string;
  savedAt: string;
  sheets: DataAdsSheet[];
}

export interface AutomationRow {
  id: string;
  brandId: string;
  campaign: string;
  ads: string;
  date: string;
  impressions: number;
  reach: number;
  clicks: number;
  videoViews: number;
  secondViews: number;
  sixthViews: number;
  at25: number;
  at50: number;
  at75: number;
  at100: number;
  linkPost: string;
  cleanLink: string;
  shortcode: string;
  campaignId: string | null;
}

export interface UIState {
  role: Role;
  brandId: string;
  /** Multi-select scope: project sheets and Data Ads show all selected campaigns. */
  campaignIds: string[];
  /** Optional dashboard scope label when the selection came from a group. */
  groupId: string | null;
  sidebarCollapsed: boolean;
  lastSync: string;
  range: 7 | 30 | 90;
}

export interface State {
  version: number;
  brands: Brand[];
  campaigns: Campaign[];
  groups: CampaignGroup[];
  projects: Project[];
  dataAds: DataAds[];
  automation: AutomationRow[];
  ui: UIState;
}

export interface ScrapeJob {
  id: string;
  source: "TS" | "TL";
  brandId: string;
  label: string;
  link: string;
  shortcode: string;
  status: ScrapeStatus;
  checkedAt: string;
  owner: string;
  href: string;
}
