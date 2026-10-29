import type { ColumnConfig, ColumnType, ProjectType, SheetRow } from "./types";
import { cleanPublishLink, extractShortcode } from "./shortcode";
import { uid } from "./utils";

export interface ColumnMeta {
  key: string;
  label: string;
  width: number;
  type?: ColumnType;
  required?: boolean;
  hint?: string;
  custom?: boolean;
}

const NAME: ColumnMeta = { key: "name", label: "Name", width: 170, required: true };
const LINK_ACCOUNT: ColumnMeta = { key: "linkAccount", label: "Link to Account", width: 250, type: "url", required: true };
const FOLLOWERS: ColumnMeta = { key: "followers", label: "Followers", width: 110, type: "number", required: true };
const PUBLISH_LINK: ColumnMeta = { key: "publishLink", label: "Publish Link", width: 300, type: "url", required: true };
const NICHE: ColumnMeta = { key: "niche", label: "Niche", width: 120 };
const SOW: ColumnMeta = { key: "sowItem", label: "SOW Item", width: 190 };
const PUBLISH_DATE: ColumnMeta = { key: "actualPublishDate", label: "Actual Publish Date", width: 150, type: "date" };
const PROOF: ColumnMeta = { key: "proofLink", label: "Link to Proof of Content", width: 250, type: "url" };
const INSIGHTS: ColumnMeta = { key: "insightsLink", label: "Link to Insights", width: 240, type: "url" };
const SIX_SECOND: ColumnMeta = { key: "sixSecondViews", label: "6s Views", width: 100, type: "percent" };

const ADS_LINK: ColumnMeta = { key: "publishLink", label: "Link Publish", width: 300, type: "url", required: true };
const ADS_NAME: ColumnMeta = { key: "adName", label: "Ad name", width: 260, required: true };
const ADS_BY_DAY: ColumnMeta = { key: "byDay", label: "By Day", width: 130, type: "date" };

/** Default tracker sheet layouts per project type. */
export const TS_TEMPLATES: Record<ProjectType, ColumnMeta[]> = {
  KOL: [NAME, LINK_ACCOUNT, FOLLOWERS, PUBLISH_LINK, NICHE, SOW, PUBLISH_DATE, PROOF, INSIGHTS, SIX_SECOND],
  CONNECTOR: [
    NAME,
    LINK_ACCOUNT,
    FOLLOWERS,
    PUBLISH_LINK,
    NICHE,
    SOW,
    PUBLISH_DATE,
    PROOF,
    INSIGHTS,
    { key: "notes", label: "Notes", width: 220 },
  ],
  TROOPS: [
    NAME,
    LINK_ACCOUNT,
    PUBLISH_LINK,
    { key: "postingDate", label: "Posting Date", width: 130, type: "date", required: true },
  ],
  KOL_ADS: [
    ADS_LINK,
    ADS_NAME,
    ADS_BY_DAY,
    { key: "impressions", label: "Impressions", width: 130, type: "number" },
    { key: "reach", label: "Reach", width: 120, type: "number" },
    { key: "clicks", label: "Clicks (destination)", width: 160, type: "number" },
    { key: "videoViews", label: "Video views", width: 130, type: "number" },
    { key: "secondViews", label: "2-second video views", width: 170, type: "number" },
    { key: "sixthViews", label: "6-second focused video views", width: 210, type: "number" },
    { key: "at25", label: "Video views at 25%", width: 160, type: "number" },
    { key: "at50", label: "Video views at 50%", width: 160, type: "number" },
    { key: "at75", label: "Video views at 75%", width: 160, type: "number" },
    { key: "at100", label: "Video views at 100%", width: 170, type: "number" },
  ],
};

/** Tracker list columns for Data Ads. */
export const TL_COLUMNS: ColumnMeta[] = [
  { key: "startDate", label: "Start Date", width: 120, type: "date", required: true },
  { key: "endDate", label: "End Date", width: 120, type: "date", required: true },
  { key: "creativeName", label: "Creative Name", width: 310, required: true },
  { key: "kolCategory", label: "KOL Category", width: 140 },
  { key: "vendor", label: "Vendor", width: 210 },
  { key: "linkPost", label: "Link Post", width: 300, type: "url", required: true },
  { key: "boostCode", label: "Boost Code", width: 130 },
  { key: "ig", label: "IG", width: 110 },
  { key: "newBrief", label: "NEW BRIEF", width: 130 },
  { key: "picture", label: "Picture", width: 110 },
  { key: "remarks", label: "Remarks", width: 170 },
  { key: "namingUplink", label: "Naming - Uplink", width: 320 },
];

/** Automation link columns — 13 columns from the automation export + optional Link Post. */
export const AUTOMATION_COLUMNS: { key: string; label: string; width: number; required?: boolean; numeric?: boolean }[] = [  { key: "campaign", label: "Campaign", width: 320, required: true },
  { key: "ads", label: "Ads", width: 280, required: true },
  { key: "date", label: "Date", width: 120 },
  { key: "impressions", label: "Impressions", width: 120, numeric: true },
  { key: "reach", label: "Reach", width: 110, numeric: true },
  { key: "clicks", label: "Clicks", width: 100, numeric: true },
  { key: "videoViews", label: "Video Views", width: 120, numeric: true },
  { key: "secondViews", label: "2 Second Views", width: 130, numeric: true },
  { key: "sixthViews", label: "6 Second Focused Video", width: 170, numeric: true },
  { key: "at25", label: "Video Views At 25%", width: 160, numeric: true },
  { key: "at50", label: "Video Views At 50%", width: 160, numeric: true },
  { key: "at75", label: "Video Views At 75%", width: 160, numeric: true },
  { key: "at100", label: "Video Views At 100%", width: 170, numeric: true },
];

export const AUTOMATION_DEFAULTS: ColumnMeta[] = AUTOMATION_COLUMNS.map((c) => ({
  key: c.key,
  label: c.label,
  width: c.width,
  required: c.required,
  type: c.numeric ? "number" : c.key === "date" ? "date" : "text",
}));

export const templatesForType = (type: ProjectType): ColumnMeta[] => TS_TEMPLATES[type];

export type SheetKind = "TS" | "TL";

export function defaultColumns(kind: SheetKind): ColumnMeta[] {
  return kind === "TS" ? TS_TEMPLATES.KOL : TL_COLUMNS;
}

export function defaultColumnConfig(defaults: ColumnMeta[]): ColumnConfig[] {
  return defaults.map((c) => ({ key: c.key, required: Boolean(c.required) }));
}

/** Resolve a saved layout (order, labels, required flags, deletions) against defaults. */
export function resolveColumns(defaults: ColumnMeta[], config?: ColumnConfig[]): ColumnMeta[] {
  if (!config || config.length === 0) return defaults;
  const byKey = new Map(defaults.map((c) => [c.key, c]));
  const out: ColumnMeta[] = [];
  const seen = new Set<string>();

  for (const item of config) {
    if (item.hidden) {
      seen.add(item.key);
      continue;
    }
    const base = byKey.get(item.key);
    if (base) {
      out.push({
        ...base,
        label: item.label ?? base.label,
        required: Boolean(item.required),
        type: item.type ?? base.type,
        width: item.width ?? base.width,
      });
    } else if (item.label) {
      out.push({
        key: item.key,
        label: item.label,
        width: item.width ?? 180,
        type: item.type ?? "text",
        required: Boolean(item.required),
        custom: true,
      });
    }
    seen.add(item.key);
  }

  for (const meta of defaults) {
    if (!seen.has(meta.key)) out.push(meta);
  }
  return out;
}

export function emptySheetRow(id?: string): SheetRow {
  return {
    id: id ?? uid("row"),
    name: "",
    linkAccount: "",
    followers: "",
    publishLink: "",
    niche: "",
    sowItem: "",
    actualPublishDate: "",
    proofLink: "",
    insightsLink: "",
    sixSecondViews: "",
    notes: "",
    postingDate: "",
    adName: "",
    byDay: "",
    impressions: "",
    reach: "",
    clicks: "",
    videoViews: "",
    secondViews: "",
    sixthViews: "",
    at25: "",
    at50: "",
    at75: "",
    at100: "",
    startDate: "",
    endDate: "",
    creativeName: "",
    kolCategory: "",
    vendor: "",
    linkPost: "",
    boostCode: "",
    ig: "",
    newBrief: "",
    picture: "",
    remarks: "",
    namingUplink: "",
    cleanLink: "",
    shortcode: "",
    scrape: "pending",
    boostStatus: "backlog",
  };
}

/** Derive clean link + shortcode whenever a publish link column is edited. */
export function deriveSheetRow(row: SheetRow, key: string, value: string): SheetRow {
  if (key === "publishLink" || key === "linkPost") {
    const cleanLink = cleanPublishLink(value);
    const shortcode = extractShortcode(value);
    return {
      ...row,
      cleanLink,
      shortcode,
      scrape: value ? (row.scrape === "success" ? "success" : "pending") : "pending",
    };
  }
  return row;
}

export function sheetDedupeKey(row: SheetRow) {
  return row.shortcode || row.cleanLink || "";
}

export function isRowEmpty(row: SheetRow, columns: ColumnMeta[]) {
  const record = row as unknown as Record<string, unknown>;
  return columns.every((c) => !String(record[c.key] ?? "").trim());
}

export function missingRequired(row: SheetRow, columns: ColumnMeta[]): string[] {
  const record = row as unknown as Record<string, unknown>;
  return columns.filter((c) => c.required && !String(record[c.key] ?? "").trim()).map((c) => c.label);
}

export function isRowComplete(row: SheetRow, columns: ColumnMeta[]) {
  if (isRowEmpty(row, columns)) return false;
  return missingRequired(row, columns).length === 0;
}
