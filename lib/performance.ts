import type { AdMaterial, Attendee, PerformancePost, State } from "./types";

const DAY = 86_400_000;

export function rangeStartIso(range: 7 | 30 | 90): string {
  return new Date(Date.now() - range * DAY).toISOString();
}

export function postsFor(
  state: State,
  effort: "KOL" | "CONNECTOR",
  campaignIds: string[],
  range: 7 | 30 | 90,
): PerformancePost[] {
  const start = rangeStartIso(range);
  return state.posts.filter(
    (p) => p.effort === effort && campaignIds.includes(p.campaignId) && p.postedAt >= start,
  );
}

export function adsFor(state: State, campaignIds: string[], range: 7 | 30 | 90): AdMaterial[] {
  const start = rangeStartIso(range);
  return state.adMaterials.filter((a) => campaignIds.includes(a.campaignId) && a.lastSync >= start);
}

export function attendeesFor(state: State, campaignIds: string[], range: 7 | 30 | 90): Attendee[] {
  const start = rangeStartIso(range);
  return state.attendees.filter((a) => campaignIds.includes(a.campaignId) && a.checkedInAt >= start);
}

export interface PostSummary {
  accounts: number;
  content: number;
  views: number;
  organic: number;
  paid: number;
  sixthViews: number;
  engagement: number;
  avgEr: number;
  boosted: number;
}

export function summarizePosts(posts: PerformancePost[]): PostSummary {
  const views = posts.reduce((a, p) => a + p.views, 0);
  const engagement = posts.reduce((a, p) => a + p.likes + p.comments, 0);
  return {
    accounts: new Set(posts.map((p) => p.account)).size,
    content: posts.length,
    views,
    organic: posts.reduce((a, p) => a + p.organic, 0),
    paid: posts.reduce((a, p) => a + p.paid, 0),
    sixthViews: posts.reduce((a, p) => a + p.sixthViews, 0),
    engagement,
    avgEr: views ? engagement / views : 0,
    boosted: posts.filter((p) => p.boosted).length,
  };
}

export function dailyPostSeries(posts: PerformancePost[], range: 7 | 30 | 90) {
  const points = range;
  const labels: string[] = [];
  const organic: number[] = [];
  const paid: number[] = [];
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * DAY);
    const key = d.toISOString().slice(0, 10);
    labels.push(`${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`);
    const day = posts.filter((p) => p.postedAt.slice(0, 10) === key);
    organic.push(day.reduce((a, p) => a + p.organic, 0));
    paid.push(day.reduce((a, p) => a + p.paid, 0));
  }
  return { labels, organic, paid };
}

export function dailyAdSeries(ads: AdMaterial[], range: 7 | 30 | 90, metric: "views" | "impressions" | "reach" | "clicks") {
  const pickValue = (r: AdMaterial) => (metric === "views" ? r.videoViews : r[metric]);
  const total = ads.reduce((a, r) => a + pickValue(r), 0);
  const points = Math.min(range, 60);
  const labels: string[] = [];
  const values: number[] = [];
  const end = new Date();
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * DAY);
    labels.push(`${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`);
    const wave = 0.55 + 0.45 * Math.sin((i / points) * Math.PI * 2.2) + (i % 5) * 0.03;
    values.push(Math.round((total / points) * Math.max(0.15, wave)));
  }
  const sum = values.reduce((a, v) => a + v, 0) || 1;
  const scaled = values.map((v) => Math.round((v / sum) * total));
  return { labels, values: scaled };
}

export function adTotals(ads: AdMaterial[]) {
  return {
    materials: ads.length,
    views: ads.reduce((a, r) => a + r.videoViews, 0),
    impressions: ads.reduce((a, r) => a + r.impressions, 0),
    reach: ads.reduce((a, r) => a + r.reach, 0),
    clicks: ads.reduce((a, r) => a + r.clicks, 0),
    spend: ads.reduce((a, r) => a + r.spend, 0),
    ctr: (() => {
      const imp = ads.reduce((a, r) => a + r.impressions, 0);
      const clicks = ads.reduce((a, r) => a + r.clicks, 0);
      return imp ? clicks / imp : 0;
    })(),
  };
}

export function adFunnel(ads: AdMaterial[]) {
  const sum = (key: keyof AdMaterial) => ads.reduce((a, r) => a + (Number(r[key]) || 0), 0);
  const base = sum("videoViews") || 1;
  const steps = [
    { key: "videoViews", label: "Video views" },
    { key: "secondViews", label: "2-second views" },
    { key: "sixthViews", label: "6-second focused" },
    { key: "at25", label: "Reached 25%" },
    { key: "at50", label: "Reached 50%" },
    { key: "at75", label: "Reached 75%" },
    { key: "at100", label: "Reached 100%" },
  ] as const;
  return steps.map((s) => ({ label: s.label, value: sum(s.key), pct: sum(s.key) / base }));
}

export function attendSummary(attendees: Attendee[]) {
  return {
    total: attendees.length,
    complete: attendees.filter((a) => a.status === "complete").length,
    inProcess: attendees.filter((a) => a.status === "in_process").length,
    spend: attendees.reduce((a, r) => a + r.amount, 0),
    invited: attendees.filter((a) => a.invited).length,
  };
}
