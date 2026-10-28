"use client";

import { useMemo, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { adFunnel, adTotals, adsFor, dailyAdSeries } from "@/lib/performance";
import { fmtCompact, fmtInt, mmdd, pct } from "@/lib/utils";
import { Icon } from "@/components/Icon";
import { EmptyState, PageHero, SectionHead } from "@/components/ui";
import { Panel, PerfKpi, PerfLineChart } from "./PerfUI";

const METRICS = [
  { key: "views", label: "Video views", color: "#0e9c8c" },
  { key: "impressions", label: "Impressions", color: "#2f6bff" },
  { key: "reach", label: "Reach", color: "#8b5cf6" },
  { key: "clicks", label: "Clicks", color: "#ef7f24" },
] as const;

export function AdsPerformance() {
  const state = useCdn();
  const brand = state.brands.find((b) => b.id === state.ui.brandId) ?? state.brands[0];
  const range = state.ui.range;
  const campaignIds = state.ui.campaignIds.length
    ? state.ui.campaignIds
    : state.campaigns.filter((c) => c.brandId === brand.id).map((c) => c.id);

  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("views");
  const ads = useMemo(() => adsFor(state, campaignIds, range), [state, campaignIds, range]);
  const totals = adTotals(ads);
  const funnel = adFunnel(ads);
  const activeMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const series = dailyAdSeries(ads, range, metric);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof ads>();
    ads.forEach((a) => {
      const list = map.get(a.group) ?? [];
      list.push(a);
      map.set(a.group, list);
    });
    return [...map.entries()]
      .map(([group, list]) => ({ group, list: list.sort((a, b) => b.videoViews - a.videoViews) }))
      .sort((a, b) => b.list.reduce((s, r) => s + r.videoViews, 0) - a.list.reduce((s, r) => s + r.videoViews, 0));
  }, [ads]);

  const rangeEnd = new Date("2026-10-28T09:00:00Z");
  const rangeStart = new Date(rangeEnd);
  rangeStart.setDate(rangeEnd.getDate() - range);

  const kpis = [
    { label: "Total materials", value: fmtInt(totals.materials), hint: "Ad materials in scope" },
    { label: "Video views", value: fmtCompact(totals.views), hint: "Views from ad delivery" },
    { label: "Impressions", value: fmtCompact(totals.impressions), hint: "Total impressions" },
    { label: "Reach", value: fmtCompact(totals.reach), hint: "Unique reach" },
    { label: "Total clicks", value: fmtCompact(totals.clicks), hint: `CTR ${pct(totals.ctr)}` },
  ];

  return (
    <>
      <PageHero
        eyebrow="Dashboard · KOL Ads performance"
        title="KOL Ads performance"
        sub={
          <>
            {brand.name} · {campaignIds.length} campaign{campaignIds.length === 1 ? "" : "s"} ·{" "}
            {ads.length} ad materials in range
          </>
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="chip !h-[33px] !px-3 !text-[10.5px] !tracking-[0.06em]">
              <Icon name="calendar" size={12} />
              {mmdd(rangeStart)} → {mmdd(rangeEnd)}
            </span>
            <div className="seg">
              {[7, 30, 90].map((r) => (
                <button key={r} className={range === r ? "is-on" : ""} onClick={() => cdn.setUI({ range: r as 7 | 30 | 90 })}>
                  {r}d
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="relative z-[1] space-y-4 px-9 pt-5">
        <PerfKpi items={kpis} />

        <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <Panel
            title="Delivery per day"
            hint={`${activeMetric.label} · last ${range} days`}
            right={
              <div className="flex items-center gap-1">
                {METRICS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    className={`chip !h-[24px] !px-2 !text-[9px] ${metric === m.key ? "is-on" : "is-off"}`}
                  >
                    <span className="dot" style={{ background: m.color }} />
                    {m.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="p-4">
              <PerfLineChart
                labels={series.labels}
                series={[{ name: activeMetric.label, color: activeMetric.color, values: series.values }]}
                height={230}
              />
            </div>
          </Panel>

          <Panel title="View-through funnel" hint={`${fmtCompact(totals.views)} video views`}>
            <div className="space-y-3 p-4">
              {funnel.map((f, i) => (
                <div key={f.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
                    <span className={i === 0 ? "font-semibold" : "text-[var(--ink-2)]"}>{f.label}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="font-semibold">{fmtCompact(f.value)}</span>
                      <span className="w-[42px] text-right text-[9.5px] text-[var(--muted-2)]">{pct(f.pct)}</span>
                    </span>
                  </div>
                  <span className="block h-[6px] w-full overflow-hidden rounded-full bg-[#eef2f8]">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.max(2, f.pct * 100)}%`,
                        background: i === 0 ? "#0e9c8c" : `rgba(14,156,140,${Math.max(0.25, 0.95 - i * 0.1)})`,
                      }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel
          title="All KOL Ads materials"
          hint={`${ads.length} materials · grouped by ad set`}
          right={<span className="text-[10px] text-[var(--muted-2)]">Spend and sync from the ads sheet</span>}
        >
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Ad material</th>
                  <th className="num">Views</th>
                  <th className="num">Impressions</th>
                  <th className="num">Reach</th>
                  <th className="num">Spend</th>
                  <th className="num">Clicks</th>
                  <th className="num">CTR</th>
                  <th>Last sync</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(({ group, list }) => (
                  <GroupRows key={group} group={group} list={list} />
                ))}
              </tbody>
            </table>
          </div>
          {ads.length === 0 && (
            <EmptyState
              icon="ads"
              title="No ad materials in this scope"
              body="Choose another campaign or a wider date range."
            />
          )}
        </Panel>

        <SectionHead title="About this page" hint="Dummy data" />
        <div className="flex items-start gap-2 rounded-xl border border-[#cfe0ff] bg-[#f3f8ff] px-4 py-3 text-[11.5px] leading-5 text-[#2b4a7a]">
          <Icon name="info" size={14} className="mt-0.5 shrink-0" />
          <span>
            Materials are grouped by their ad set (KOL_xx). Funnel numbers come from the automation metrics mapped to
            each material; spend is a dummy rupiah value.
          </span>
        </div>
      </div>
    </>
  );
}

function GroupRows({ group, list }: { group: string; list: ReturnType<typeof adsFor> }) {
  const totalViews = list.reduce((a, r) => a + r.videoViews, 0);
  return (
    <>
      <tr className="bg-[#f7faff]">
        <td colSpan={8} className="!py-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <Icon name="ads" size={12} className="text-[var(--blue-deep)]" />
            {group}
            <span className="ml-1 text-[10px] font-normal text-[var(--muted-2)]">
              {list.length} materials · {fmtCompact(totalViews)} views
            </span>
          </div>
        </td>
      </tr>
      {list.map((a) => (
        <tr key={a.id}>
          <td className="max-w-[260px]">
            <div className="truncate text-[11.5px] font-medium">{a.adName}</div>
            <div className="text-[10px] text-[var(--muted-2)]">video · {a.group}</div>
          </td>
          <td className="num font-semibold">{fmtCompact(a.videoViews)}</td>
          <td className="num">{fmtCompact(a.impressions)}</td>
          <td className="num">{fmtCompact(a.reach)}</td>
          <td className="num">Rp {fmtCompact(a.spend)}</td>
          <td className="num">{fmtCompact(a.clicks)}</td>
          <td className="num">{pct(a.ctr)}</td>
          <td className="whitespace-nowrap text-[10.5px] text-[var(--muted-2)]">
            {new Date(a.lastSync).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
          </td>
        </tr>
      ))}
    </>
  );
}
