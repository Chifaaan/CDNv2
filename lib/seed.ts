import type {
  AutomationRow,
  Brand,
  Campaign,
  CampaignGroup,
  CampaignMetrics,
  CampaignType,
  DataAds,
  DataAdsSheet,
  Project,
  ProjectType,
  SheetRow,
  State,
} from "./types";
import { cleanPublishLink } from "./shortcode";
import { slugify } from "./utils";

export const STORAGE_KEY = "cdn-v2.state.v1";
export const STATE_VERSION = 16;

const BASE = new Date("2026-10-27T09:00:00.000Z");

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rnd: () => number = mulberry32(20261027);
const int = (a: number, b: number) => Math.floor(a + rnd() * (b - a + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const pad = (n: number, len = 2) => String(n).padStart(len, "0");

const B62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const igCode = () => Array.from({ length: 11 }, () => B62[int(0, B62.length - 1)]).join("");
const ttCode = () => String(Math.floor(7.2e17 + rnd() * 1.7e17));

const IG_TRACKING = [
  "igsh=MTZ0cWZ4bXo1bA%3D%3D",
  "igsh=MXZqbjBqZ2F4cQ%3D%3D",
  "utm_source=ig_web_copy_link&utm_medium=social",
];
const igLink = (sc: string, dirty = true) =>
  `https://www.instagram.com/p/${sc}/${dirty ? `?${pick(IG_TRACKING)}` : ""}`;
const ttLink = (handle: string, sc: string, dirty = true) =>
  `https://www.tiktok.com/@${handle}/video/${sc}${dirty ? "?is_from_webapp=1&sender_device=pc" : ""}`;
const driveLink = () =>
  `https://drive.google.com/drive/folders/1${Array.from({ length: 24 }, () => B62[int(0, 61)]).join("")}?usp=sharing`;

const HANDLES = [
  "incinjoy",
  "syaharaniputri",
  "allexiamaggie",
  "randysherly",
  "ray.paramarta",
  "atikazz17",
  "ayuwisya666",
  "shellyche",
  "melkibajaj",
  "hey.moniccc",
  "makanlurrr",
  "ripanakmalamir",
  "mikhadonovon",
  "pangeranhensem",
  "nadiasafira",
  "zara.spectrum",
];

const NICHES = ["Beauty", "Parenting", "Food", "Fashion", "Travel", "Fitness", "Lifestyle", "Tech"];

const SOW_ITEMS = [
  "Instagram Photo (Feed)",
  "Instagram Reel",
  "Instagram Story",
  "TikTok Video",
  "TikTok Photo",
];

const KOL_CATEGORIES = ["Troops", "Spectrum", "Beauty", "Mom & Baby", "Food & Beverage"];
const VENDORS = [
  "KOL_8_Zara_Spectrum_101s",
  "KOL_5_Nadia_Spectrum_90s",
  "KOL_12_Rafi_Troops_60s",
  "KOL_3_Dewi_Beauty_80s",
];

const THEMES = [
  "Ramadan Glow",
  "Always On Q3",
  "Payday Rush",
  "Back to School",
  "Mega Live",
  "Year End Gifting",
  "New Launch Teaser",
  "Community Day",
  "Bundle Hero",
  "Retention Wave",
  "Brand Day",
  "Marketplace Push",
  "Holiday Reels",
  "Campus Tour",
  "Beauty Fest",
  "Staycation",
  "Payday 9.9",
  "Payday 10.10",
  "Payday 11.11",
  "Payday 12.12",
  "Anniversary",
  "Sustainability",
  "Raya Kembali",
  "Deep Clean",
];

const BRAND_SEED: {
  id: string;
  name: string;
  code: string;
  initials: string;
  hue: number;
  campaignCount: number;
  agencies: string[];
}[] = [
  { id: "zentara", name: "Zentara", code: "Z", initials: "Z", hue: 204, campaignCount: 7, agencies: ["Nova Digital", "Kopi Kreatif", "Orbit Media"] },
  { id: "energen", name: "Energen", code: "E", initials: "E", hue: 26, campaignCount: 21, agencies: ["Nova Digital"] },
  { id: "wardah", name: "Wardah", code: "W", initials: "W", hue: 158, campaignCount: 12, agencies: ["Ruang Reka", "Pulse Agency", "Kanca Studio", "Orbit Media", "Kopi Kreatif", "Nova Digital"] },
  { id: "bebelac", name: "Bebelac", code: "B", initials: "B", hue: 198, campaignCount: 9, agencies: ["Kanca Studio"] },
  { id: "erigo", name: "Erigo", code: "R", initials: "R", hue: 262, campaignCount: 12, agencies: ["Pulse Agency", "Orbit Media", "Ruang Reka", "Nova Digital"] },
  { id: "somethinc", name: "Somethinc", code: "S", initials: "S", hue: 330, campaignCount: 5, agencies: ["Kopi Kreatif"] },
];

const TYPE_ROTATION: CampaignType[] = ["KOL", "CONNECTOR", "KOL", "ATTEND", "CONNECTOR", "KOL", "TROOPS"];

const PROJECT_TYPES: ProjectType[] = ["KOL", "CONNECTOR", "KOL_ADS", "TROOPS"];

export const PROJECT_LABEL: Record<ProjectType, string> = {
  KOL: "KOL",
  CONNECTOR: "Connector",
  KOL_ADS: "KOL Ads",
  TROOPS: "Troops",
};

export const PROJECT_SLUG: Record<ProjectType, string> = {
  KOL: "kol",
  CONNECTOR: "connector",
  KOL_ADS: "kol-ads",
  TROOPS: "troops",
};

function iso(daysBack: number) {
  const d = new Date(BASE);
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

function isoTime(hoursBack: number) {
  return new Date(BASE.getTime() - hoursBack * 3600_000).toISOString();
}

function metricsFor(type: CampaignType): CampaignMetrics {
  const base = 0.4 + rnd() * 1.5;
  const zero: CampaignMetrics = {
    organic: 0,
    gs: 0,
    engagement: 0,
    content: 0,
    followers: 0,
    adsVideo: 0,
    impressions: 0,
    reach: 0,
    materials: 0,
    registered: 0,
    attended: 0,
  };
  if (type === "KOL") {
    const organic = Math.round((140_000 + rnd() * 520_000) * base);
    return {
      ...zero,
      organic,
      engagement: Math.round(organic * (0.11 + rnd() * 0.06)),
      content: int(2, 4),
      gs: Math.round(organic * (0.04 + rnd() * 0.06)),
      adsVideo: Math.round(organic * (0.12 + rnd() * 0.1)),
      impressions: Math.round(organic * (0.2 + rnd() * 0.12)),
      reach: Math.round(organic * (0.18 + rnd() * 0.1)),
      materials: int(1, 3),
    };
  }
  if (type === "CONNECTOR") {
    const organic = Math.round((60_000 + rnd() * 220_000) * base);
    return {
      ...zero,
      organic,
      engagement: Math.round(organic * (0.05 + rnd() * 0.04)),
      content: int(3, 9),
      gs: Math.round(organic * (0.03 + rnd() * 0.05)),
    };
  }
  if (type === "ATTEND") {
    const registered = Math.round((350 + rnd() * 1800) * base);
    return {
      ...zero,
      registered,
      attended: Math.round(registered * (0.55 + rnd() * 0.3)),
      content: int(1, 4),
      engagement: Math.round(registered * (0.5 + rnd() * 0.6)),
    };
  }
  const organic = Math.round((20_000 + rnd() * 90_000) * base);
  return { ...zero, organic, engagement: Math.round(organic * (0.05 + rnd() * 0.05)), content: int(1, 3) };
}

function seriesFor(type: CampaignType): number[] {
  const n = 24;
  const decay = type === "KOL" ? 0.9 : 0.55;
  const out: number[] = [];
  let v = 0.55 + rnd() * 0.4;
  for (let i = 0; i < n; i++) {
    const drift = (rnd() - 0.5) * 0.22;
    v = Math.max(0.06, v + drift - (v - 0.25) * 0.12 * decay);
    out.push(Math.round(v * 1000) / 1000);
  }
  return out;
}

function buildBrandsAndCampaigns() {
  const brands: Brand[] = [];
  const campaigns: Campaign[] = [];

  for (const b of BRAND_SEED) {
    brands.push({ id: b.id, name: b.name, code: b.code, initials: b.initials, hue: b.hue, agencies: b.agencies });
    for (let i = 0; i < b.campaignCount; i++) {
      const type = TYPE_ROTATION[i % TYPE_ROTATION.length];
      campaigns.push({
        id: `cmp_${b.id}_${i}`,
        brandId: b.id,
        name: THEMES[i % THEMES.length],
        type,
        agency: b.agencies[i % b.agencies.length],
        start: iso(58 - (i % 4) * 7),
        end: iso(12 + (i % 3) * 4),
        metrics: metricsFor(type),
        series: seriesFor(type),
      });
    }
  }
  return { brands, campaigns };
}

function emptyRow(id: string): SheetRow {
  return {
    id,
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
  };
}

function tsRow(prefix: string, idx: number, type: ProjectType): SheetRow {
  const handle = pick(HANDLES);
  const useTikTok = rnd() > 0.5;
  const code = useTikTok ? ttCode() : igCode();
  const link = useTikTok ? ttLink(handle, code) : igLink(code);
  const base = emptyRow(`${prefix}_r${idx}`);
  const common = {
    ...base,
    publishLink: link,
    cleanLink: cleanPublishLink(link),
    shortcode: code,
    scrape: rnd() > 0.9 ? (rnd() > 0.6 ? "failed" : "pending") : "success",
  } as SheetRow;

  if (type === "KOL_ADS") {
    const impressions = int(9_000, 450_000);
    return {
      ...common,
      adName: `KOL_${int(1, 12)}_${pick(["Zara", "Nadia", "Rafi", "Dewi"])}_${int(60, 150)}s_Brand@${int(5, 20)}s`,
      byDay: iso(int(1, 40)),
      impressions: String(impressions),
      reach: String(Math.round(impressions * (0.45 + rnd() * 0.35))),
      clicks: String(Math.round(impressions * (0.004 + rnd() * 0.01))),
      videoViews: String(Math.round(impressions * (0.45 + rnd() * 0.4))),
      secondViews: String(Math.round(impressions * (0.3 + rnd() * 0.35))),
      sixthViews: String(Math.round(impressions * (0.12 + rnd() * 0.2))),
      at25: String(Math.round(impressions * (0.2 + rnd() * 0.3))),
      at50: String(Math.round(impressions * (0.05 + rnd() * 0.2))),
      at75: String(Math.round(impressions * (0.02 + rnd() * 0.1))),
      at100: String(Math.round(impressions * (0.005 + rnd() * 0.05))),
    };
  }

  if (type === "TROOPS") {
    return {
      ...common,
      name: handle,
      linkAccount: useTikTok ? `https://www.tiktok.com/@${handle}` : `https://www.instagram.com/${handle}`,
      postingDate: iso(int(10, 80)),
    };
  }

  const row: SheetRow = {
    ...common,
    name: handle,
    linkAccount: useTikTok ? `https://www.tiktok.com/@${handle}` : `https://www.instagram.com/${handle}`,
    followers: `${int(8, 2500)}.${pad(int(0, 999), 3)}`,
    niche: pick(NICHES),
    sowItem: pick(SOW_ITEMS),
    actualPublishDate: iso(int(10, 80)),
    proofLink: driveLink(),
    insightsLink: driveLink(),
    sixSecondViews: `${int(12, 62)}%`,
  };

  if (type === "CONNECTOR") {
    row.notes = pick([
      "Posted on feed + story",
      "Waiting for creator revision",
      "Approved by brand",
      "Caption updated after review",
    ]);
  }

  return row;
}

function tlRow(prefix: string, idx: number, brandName: string): SheetRow {
  const handle = pick(HANDLES);
  const useTikTok = rnd() > 0.35;
  const code = useTikTok ? ttCode() : igCode();
  const link = useTikTok ? ttLink(handle, code) : igLink(code);
  const creative = `KOL_${pick(["Troops", "Spectrum"])} ${pad(idx + 1)}_${handle}_${int(10, 30)}s_Brand@${int(5, 15)}s`;
  const base = emptyRow(`${prefix}_r${idx}`);
  return {
    ...base,
    startDate: iso(int(2, 40)),
    endDate: iso(int(1, 12)),
    creativeName: creative,
    kolCategory: pick(KOL_CATEGORIES),
    vendor: pick(VENDORS),
    linkPost: link,
    boostCode: rnd() > 0.7 ? `BOOST-${int(1000, 9999)}` : "",
    ig: "Running",
    newBrief: "Running",
    picture: rnd() > 0.2 ? "✓" : "",
    remarks: "",
    namingUplink: `OA_Content1_${brandName}_${int(10, 20)}s_Brand@${int(5, 15)}s`,
    cleanLink: cleanPublishLink(link),
    shortcode: code,
    scrape: rnd() > 0.92 ? "failed" : "success",
  };
}

function makeProject(
  brandId: string,
  campaign: Campaign,
  type: ProjectType,
  id: string,
  rowCount: number,
): Project {
  return {
    id,
    brandId,
    campaignId: campaign.id,
    type,
    agency: campaign.agency,
    pmLink: `https://cdn.spectrum.id/pm/${slugify(campaign.name)}-${PROJECT_SLUG[type]}-${id.slice(-3)}${int(10, 99)}`,
    createdAt: iso(int(5, 40)),
    savedAt: isoTime(int(1, 72)),
    rows: Array.from({ length: rowCount }, (_, r) => tsRow(id, r, type)),
  };
}

function buildProjects(campaigns: Campaign[]): Project[] {
  const projects: Project[] = [];
  const byBrand = new Map<string, Campaign[]>();
  for (const c of campaigns) {
    if (!byBrand.has(c.brandId)) byBrand.set(c.brandId, []);
    byBrand.get(c.brandId)!.push(c);
  }

  for (const [brandId, list] of byBrand) {
    const primary = list[0];
    let n = 0;

    for (const type of PROJECT_TYPES) {
      const id = `prj_${brandId}_${n++}`;
      projects.push(makeProject(brandId, primary, type, id, type === "KOL" ? 11 : type === "CONNECTOR" ? 9 : 7));
    }

    list.slice(1).forEach((campaign, idx) => {
      const type = PROJECT_TYPES[(idx + 1) % PROJECT_TYPES.length];
      const id = `prj_${brandId}_${n++}`;
      projects.push(makeProject(brandId, campaign, type, id, 6 + int(0, 3)));
    });
  }
  return projects;
}

function buildDataAds(campaigns: Campaign[]): DataAds[] {
  const out: DataAds[] = [];
  const byBrand = new Map<string, Campaign[]>();
  for (const c of campaigns) {
    if (!byBrand.has(c.brandId)) byBrand.set(c.brandId, []);
    byBrand.get(c.brandId)!.push(c);
  }
  const sheetNames = ["TikTok Batch 1", "IG Batch 2", "Boost Batch", "Reels Batch"];
  const containerNames = ["Set 667 Data Ads", "Performance Data Ads", "Boost Data Ads"];

  for (const [brandId, list] of byBrand) {
    const brandName = BRAND_SEED.find((b) => b.id === brandId)!.name;
    let n = 0;

    const make = (campaign: Campaign, sheetCount: number, name?: string) => {
      const id = `da_${brandId}_${n++}`;
      const sheets: DataAdsSheet[] = Array.from({ length: sheetCount }, (_, s) => {
        const sheetId = `${id}_s${s}`;
        return {
          id: sheetId,
          name: sheetNames[s % sheetNames.length],
          rows: Array.from({ length: 6 + int(0, 5) }, (_, r) => tlRow(sheetId, r, brandName)),
        };
      });
      out.push({
        id,
        brandId,
        campaignId: campaign.id,
        name: name ?? `${campaign.name} Data Ads`,
        agency: campaign.agency,
        createdAt: iso(int(3, 25)),
        savedAt: isoTime(int(1, 48)),
        sheets,
      });
    };

    make(list[0], 3, containerNames[0]);
    make(list[0], 2, containerNames[1]);
    list.slice(1).forEach((c) => make(c, 1 + (rnd() > 0.6 ? 1 : 0)));
  }
  return out;
}

function buildGroups(campaigns: Campaign[]): CampaignGroup[] {
  const groups: CampaignGroup[] = [];
  const byBrand = new Map<string, Campaign[]>();
  for (const c of campaigns) {
    if (!byBrand.has(c.brandId)) byBrand.set(c.brandId, []);
    byBrand.get(c.brandId)!.push(c);
  }
  const names = ["Q3 Always On", "Ramadan 2026", "Payday Cluster", "Launch Wave"];

  for (const [brandId, list] of byBrand) {
    const pool = list.slice(1);
    if (pool.length < 2) continue;
    const count = brandId === "zentara" ? 2 : 1;
    let cursor = 0;
    for (let i = 0; i < count; i++) {
      const size = i === 0 ? 3 : 2;
      const members = pool.slice(cursor, cursor + size);
      cursor += size;
      if (members.length < 2) continue;
      groups.push({
        id: `grp_${brandId}_${i}`,
        brandId,
        name: names[i % names.length],
        description:
          i === 0
            ? "Always-on campaigns read together on one dashboard."
            : "Seasonal burst — KOL, connector and ads in one view.",
        campaignIds: members.map((c) => c.id),
      });
    }
  }
  return groups;
}

function buildAutomation(brands: Brand[], campaigns: Campaign[], projects: Project[]): AutomationRow[] {
  const countByBrand: Record<string, number> = {
    zentara: 360,
    energen: 220,
    wardah: 160,
    bebelac: 110,
    erigo: 90,
    somethinc: 60,
  };
  const rows: AutomationRow[] = [];

  for (const [brandId, count] of Object.entries(countByBrand)) {
    const brandName = brands.find((b) => b.id === brandId)?.name ?? brandId;
    const pool = projects
      .filter((p) => p.brandId === brandId)
      .flatMap((p) =>
        p.rows
          .filter((r) => r.shortcode)
          .map((r) => ({ shortcode: r.shortcode, campaignId: p.campaignId, link: r.publishLink })),
      );

    for (let i = 0; i < count; i++) {
      const usePool = pool.length > 0 && rnd() > 0.45;
      const src = usePool ? pool[int(0, pool.length - 1)] : null;
      const link = src?.link ?? "";
      const ads = `KOL_${int(1, 12)}_${pick(["Zara", "Nadia", "Rafi", "Dewi", "Kirana"])}_${pick([
        "Spectrum",
        "Troops",
        "Beauty",
      ])}_${int(60, 150)}s_Brand@${int(5, 20)}s`;
      const impressions = int(9_000, 450_000);

      rows.push({
        id: `auto_${brandId}_${i}`,
        brandId,
        campaign: `${int(10000, 99999)}_${int(1000, 9999)}_ID_${brandName} ${pick([
          "Topping",
          "Glow",
          "Launch",
          "Retention",
          "Bundling",
        ])}_${pick(["Mom", "Gen Z", "Beauty", "Family"])}_${pick(["TT", "IG", "YT"])}_CPV`,
        ads,
        date: iso(int(1, 130)),
        impressions,
        reach: Math.round(impressions * (0.45 + rnd() * 0.35)),
        clicks: Math.round(impressions * (0.004 + rnd() * 0.01)),
        videoViews: Math.round(impressions * (0.45 + rnd() * 0.4)),
        secondViews: Math.round(impressions * (0.3 + rnd() * 0.35)),
        sixthViews: Math.round(impressions * (0.12 + rnd() * 0.2)),
        at25: Math.round(impressions * (0.2 + rnd() * 0.3)),
        at50: Math.round(impressions * (0.05 + rnd() * 0.2)),
        at75: Math.round(impressions * (0.02 + rnd() * 0.1)),
        at100: Math.round(impressions * (0.005 + rnd() * 0.05)),
        linkPost: link,
        cleanLink: cleanPublishLink(link),
        shortcode: link ? (src?.shortcode ?? "") : "",
        campaignId: link && rnd() > 0.5 ? (src?.campaignId ?? null) : null,
      });
    }
  }
  return rows;
}

export function createSeed(): State {
  rnd = mulberry32(20261027);

  const { brands, campaigns } = buildBrandsAndCampaigns();
  const groups = buildGroups(campaigns);
  const projects = buildProjects(campaigns);
  const dataAds = buildDataAds(campaigns);
  const automation = buildAutomation(brands, campaigns, projects);

  return {
    version: STATE_VERSION,
    brands,
    campaigns,
    groups,
    projects,
    dataAds,
    automation,
    ui: {
      role: "spectrum",
      brandId: "zentara",
      campaignIds: ["cmp_zentara_0"],
      groupId: null,
      campaignView: "cards",
      sidebarCollapsed: false,
      lastSync: new Date(BASE.getTime() - 42 * 60_000).toISOString(),
      range: 90,
    },
  };
}

export function brandStyle(hue: number) {
  return {
    bg: `hsl(${hue} 78% 92%)`,
    fg: `hsl(${hue} 62% 34%)`,
    ring: `hsl(${hue} 60% 80%)`,
    solid: `hsl(${hue} 62% 46%)`,
  };
}
