import type { ColumnConfig, ProjectType, SheetRow } from "./types";
import { cleanPublishLink, extractShortcode } from "./shortcode";
import { uid } from "./utils";

export interface ColumnMeta {
  key: keyof SheetRow & string;
  label: string;
  width: number;
  type?: "text" | "url" | "date" | "number" | "percent";
  required?: boolean;
  hint?: string;
}

/** Tracker sheet columns — green = required, blue = optional. */
export const TS_COLUMNS: ColumnMeta[] = [
  { key: "name", label: "Name", width: 170, required: true },
  { key: "linkAccount", label: "Link to Account", width: 250, type: "url", required: true },
  { key: "followers", label: "Followers", width: 110, type: "number", required: true },
  { key: "publishLink", label: "Publish Link", width: 300, type: "url", required: true },
  { key: "niche", label: "Niche", width: 120 },
  { key: "sowItem", label: "SOW Item", width: 190 },
  { key: "actualPublishDate", label: "Actual Publish Date", width: 150, type: "date" },
  { key: "proofLink", label: "Link to Proof of Content", width: 250, type: "url" },
  { key: "insightsLink", label: "Link to Insights", width: 240, type: "url" },
  { key: "sixSecondViews", label: "6s Views", width: 100, type: "percent" },
];

/** Tracker list columns for Data Ads — green = required, blue = optional. */
export const TL_COLUMNS: ColumnMeta[] = [
  { key: "startDate", label: "Start Date", width: 120, type: "date", required: true },
  { key: "endDate", label: "End Date", width: 120, type: "date", required: true },
  { key: "oaContent", label: "OA_Content", width: 150 },
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
export const AUTOMATION_COLUMNS: { key: string; label: string; width: number; required?: boolean; numeric?: boolean }[] = [
  { key: "campaign", label: "Campaign", width: 320, required: true },
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
  { key: "linkPost", label: "Link Post", width: 300 },
];

/** Every project sheet uses the tracker sheet format (KOL Ads included). */
export const columnsFor = (_type: ProjectType) => TS_COLUMNS;

export type SheetKind = "TS" | "TL";

export function defaultColumns(kind: SheetKind): ColumnMeta[] {
  return kind === "TS" ? TS_COLUMNS : TL_COLUMNS;
}

export function defaultColumnConfig(kind: SheetKind): ColumnConfig[] {
  return defaultColumns(kind).map((c) => ({ key: c.key, required: Boolean(c.required) }));
}

/** Resolve a saved layout (order + required flags) against the known columns. */
export function resolveColumns(kind: SheetKind, config?: ColumnConfig[]): ColumnMeta[] {
  const base = defaultColumns(kind);
  if (!config || config.length === 0) return base;
  const byKey = new Map(base.map((c) => [c.key, c]));
  const out: ColumnMeta[] = [];
  const seen = new Set<string>();
  for (const item of config) {
    const meta = byKey.get(item.key as ColumnMeta["key"]);
    if (!meta || seen.has(item.key)) continue;
    seen.add(item.key);
    out.push({ ...meta, required: Boolean(item.required) });
  }
  for (const meta of base) {
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
    startDate: "",
    endDate: "",
    oaContent: "",
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
  return columns.every((c) => !String(row[c.key] ?? "").trim());
}

export function missingRequired(row: SheetRow, columns: ColumnMeta[]): string[] {
  return columns.filter((c) => c.required && !String(row[c.key] ?? "").trim()).map((c) => c.label);
}

export function isRowComplete(row: SheetRow, columns: ColumnMeta[]) {
  if (isRowEmpty(row, columns)) return false;
  return missingRequired(row, columns).length === 0;
}
