import type { Campaign, ScrapeJob, State } from "./types";
import { PROJECT_LABEL } from "./seed";

export const EMPTY_METRICS = {
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

export type Aggregate = typeof EMPTY_METRICS & {
  campaignCount: number;
  avgEr: number;
  series: number[];
};

export function aggregate(list: Campaign[]): Aggregate {
  const out: Aggregate = { ...EMPTY_METRICS, campaignCount: list.length, avgEr: 0, series: [] };
  const seriesLen = 24;
  const acc = new Array(seriesLen).fill(0);
  for (const c of list) {
    out.organic += c.metrics.organic;
    out.gs += c.metrics.gs;
    out.engagement += c.metrics.engagement;
    out.content += c.metrics.content;
    out.followers += c.metrics.followers;
    out.adsVideo += c.metrics.adsVideo;
    out.impressions += c.metrics.impressions;
    out.reach += c.metrics.reach;
    out.materials += c.metrics.materials;
    out.registered += c.metrics.registered;
    out.attended += c.metrics.attended;
    c.series.forEach((v, i) => {
      if (i < seriesLen) acc[i] += v;
    });
  }
  if (list.length) out.series = acc.map((v) => v / list.length);
  out.avgEr = out.organic > 0 ? out.engagement / out.organic : 0;
  return out;
}

export function sliceSeries(series: number[], range: 7 | 30 | 90): number[] {
  if (!series.length) return [];
  const n = range === 90 ? 24 : range === 30 ? 16 : 8;
  return series.slice(-n);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function checkedAt(id: string): string {
  const base = new Date("2026-10-27T09:00:00.000Z").getTime();
  const offset = (hash(id) % 72) * 3600_000 + (hash(id) % 59) * 60_000;
  return new Date(base - offset).toISOString();
}

export function scrapeJobs(state: State): ScrapeJob[] {
  const jobs: ScrapeJob[] = [];

  for (const p of state.projects) {
    const campaign = state.campaigns.find((c) => c.id === p.campaignId);
    for (const r of p.rows) {
      if (!r.publishLink) continue;
      jobs.push({
        id: `ts:${p.id}:${r.id}`,
        source: "TS",
        brandId: p.brandId,
        label: r.name || r.linkAccount,
        link: r.cleanLink || r.publishLink,
        shortcode: r.shortcode,
        status: r.scrape,
        checkedAt: checkedAt(r.id),
        owner: `${campaign?.name ?? "—"} · ${PROJECT_LABEL[p.type]}`,
        href: `/projects/ts/${p.id}`,
      });
    }
  }

  for (const d of state.dataAds) {
    const campaign = state.campaigns.find((c) => c.id === d.campaignId);
    for (const sh of d.sheets) {
      for (const r of sh.rows) {
        if (!r.linkPost) continue;
        jobs.push({
          id: `tl:${d.id}:${sh.id}:${r.id}`,
          source: "TL",
          brandId: d.brandId,
          label: r.creativeName || r.linkPost,
          link: r.cleanLink || r.linkPost,
          shortcode: r.shortcode,
          status: r.scrape,
          checkedAt: checkedAt(r.id),
          owner: `${campaign?.name ?? "—"} · ${d.name}`,
          href: `/data-ads/${d.id}`,
        });
      }
    }
  }

  return jobs.sort((a, b) => (a.checkedAt < b.checkedAt ? 1 : -1));
}

export function automationStats(state: State, brandId: string) {
  const rows = state.automation.filter((r) => r.brandId === brandId);
  const linked = rows.filter((r) => Boolean(r.shortcode));
  const matched = rows.filter((r) => r.campaignId).length;
  return {
    total: rows.length,
    linked: linked.length,
    matched,
    rate: rows.length ? matched / rows.length : 0,
  };
}
