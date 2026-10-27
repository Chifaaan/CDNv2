"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { cdn, useCdn } from "@/lib/store";
import { aggregate, sliceSeries, type Aggregate } from "@/lib/derive";
import type { Campaign, CampaignMetrics } from "@/lib/types";
import { fmtCompact, mmdd, pct } from "@/lib/utils";
import { Icon, type IconName } from "@/components/Icon";
import { InfoDot, PageHero, SectionHead, Sparkline, StatusBadge } from "@/components/ui";
import { PROJECT_LABEL } from "@/lib/seed";

type EffortKey = "kol" | "connector" | "attend" | "ads";

const EFFORT_META: Record<EffortKey, { label: string; color: string; soft: string; icon: IconName; link: string }> = {
  kol: { label: "KOL", color: "#ef7f24", soft: "#fdf0e3", icon: "kol", link: "/dashboard/kol" },
  connector: { label: "Connector", color: "#ec4b8b", soft: "#fdebf3", icon: "connector", link: "/dashboard/connector" },
  attend: { label: "Attend", color: "#8b5cf6", soft: "#f1ecfe", icon: "attend", link: "/dashboard/attend" },
  ads: { label: "KOL Ads", color: "#0e9c8c", soft: "#e3f6f3", icon: "ads", link: "/dashboard/ads" },
};

const METRIC_KEYS: (keyof CampaignMetrics)[] = [
  "organic",
  "gs",
  "engagement",
  "content",
  "followers",
  "adsVideo",
  "impressions",
  "reach",
  "materials",
  "registered",
  "attended",
];

const EMPTY: Aggregate = {
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
  campaignCount: 0,
  avgEr: 0,
  series: [],
};

function scaleAgg(a: Aggregate, range: 7 | 30 | 90): Aggregate {
  const f = range === 90 ? 1 : range === 30 ? 0.34 : 0.085;
  const out: Aggregate = { ...a };
  for (const k of METRIC_KEYS) out[k] = Math.round(a[k] * f);
  out.series = sliceSeries(a.series, range);
  return out;
}

function campaignsOfType(list: Campaign[], key: EffortKey): Campaign[] {
  if (key === "kol") return list.filter((c) => c.type === "KOL");
  if (key === "connector") return list.filter((c) => c.type === "CONNECTOR" || c.type === "TROOPS");
  if (key === "attend") return list.filter((c) => c.type === "ATTEND");
  return list;
}

export function DashboardView({ effort }: { effort?: EffortKey }) {
  const state = useCdn();
  const router = useRouter();
  const brandId = state.ui.brandId;
  const brand = state.brands.find((b) => b.id === brandId) ?? state.brands[0];
  const range = state.ui.range;

  const group = state.ui.groupId ? state.groups.find((g) => g.id === state.ui.groupId) : undefined;
  const campaign =
    state.campaigns.find((c) => c.id === state.ui.campaignId) ??
    state.campaigns.find((c) => c.brandId === brandId);

  const scoped = useMemo(() => {
    if (group) {
      const list = state.campaigns.filter((c) => group.campaignIds.includes(c.id));
      if (list.length) return list;
    }
    return campaign ? [campaign] : [];
  }, [group, state.campaigns, campaign]);

  const aggregates = useMemo(() => {
    const out = {} as Record<EffortKey, Aggregate>;
    (["kol", "connector", "attend", "ads"] as EffortKey[]).forEach((k) => {
      out[k] = scaleAgg(aggregate(campaignsOfType(scoped, k)), range);
    });
    return out;
  }, [scoped, range]);

  const available: Record<EffortKey, boolean> = {
    kol: aggregates.kol.campaignCount > 0,
    connector: aggregates.connector.campaignCount > 0,
    attend: aggregates.attend.campaignCount > 0,
    ads: aggregates.ads.adsVideo > 0 || aggregates.ads.impressions > 0,
  };

  const cards: EffortKey[] = effort
    ? [effort]
    : (["kol", "connector", "attend", "ads"] as EffortKey[]).filter((k) => available[k]);

  const totals = useMemo(() => scaleAgg(aggregate(scoped), range), [scoped, range]);

  const scopedIds = scoped.map((c) => c.id);
  const projects = state.projects.filter((p) => scopedIds.includes(p.campaignId));
  const containers = state.dataAds.filter((d) => scopedIds.includes(d.campaignId));
  const adRows = containers.flatMap((d) =>
    d.sheets.flatMap((sh) => sh.rows.map((r) => ({ ...r, sheet: sh, container: d }))),
  );
  const adsWithLink = adRows.filter((r) => r.shortcode).length;
  const automationRows = state.automation.filter((r) => r.brandId === brandId);
  const automationMatched = automationRows.filter((r) => r.campaignId && scopedIds.includes(r.campaignId)).length;

  const rangeEnd = new Date("2026-10-27T09:00:00Z");
  const rangeStart = new Date(rangeEnd);
  rangeStart.setDate(rangeEnd.getDate() - range);

  const heroEyebrow = effort
    ? `CAMPAIGN DASHBOARD · ${brand.name.toUpperCase()} · ${EFFORT_META[effort].label.toUpperCase()} PERFORMANCE`
    : group
      ? `CAMPAIGN DASHBOARD · ${brand.name.toUpperCase()} · GROUP`
      : `CAMPAIGN DASHBOARD · ${brand.name.toUpperCase()} · ${campaign?.type ?? ""}`;

  const kpis = [
    { label: "Total views", value: totals.organic + totals.gs + totals.adsVideo, hint: "Organic + GS + ads video views" },
    { label: "Organic views", value: totals.organic, hint: "Views from KOL, connector and troops content" },
    { label: "GS views", value: totals.gs, hint: "Views attributed to group-shared content" },
    { label: "Total engagement", value: totals.engagement, hint: "Likes, comments, saves and shares" },
    { label: "Total content", value: totals.content, hint: "Published posts in the range" },
    { label: "Followers", value: totals.followers, hint: "Net new followers from KOL accounts" },
  ];

  if (!campaign && !group) {
    return (
      <div className="px-9 pt-10">
        <div className="card px-6 py-16 text-center">
          <div className="text-[13px] font-semibold">No campaign in this brand yet</div>
          <p className="mx-auto mt-1 max-w-[340px] text-[12px] leading-5 text-[var(--muted)]">
            Create a campaign from the campaign list, then this dashboard fills itself.
          </p>
          <Link href="/campaigns" className="btn btn-sm mt-4">
            Open campaign list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHero
        eyebrow={heroEyebrow}
        title={group ? group.name : campaign?.name ?? ""}
        sub={
          group ? (
            <>
              {brand.name} · {scoped.length} live campaigns · dashboard roll-up
            </>
          ) : (
            <>
              {brand.name} · {campaign?.agency} · {campaign?.start} → {campaign?.end}{" "}
              <span className="ml-1 inline-flex align-middle">
                <StatusBadge status={campaign?.status ?? "live"} />
              </span>
            </>
          )
        }
        actions={
          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {(["kol", "connector", "attend", "ads"] as EffortKey[]).map((key) => {
                const meta = EFFORT_META[key];
                const on = effort ? effort === key : Boolean(available[key]);
                return (
                  <button
                    key={key}
                    className={`chip ${on ? "is-on" : "is-off"}`}
                    title={available[key] ? `Open ${meta.label} performance` : `No ${meta.label} effort in this scope`}
                    onClick={() => router.push(meta.link)}
                  >
                    <span className="dot" style={{ background: meta.color }} />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="chip !h-[33px] !px-3 !text-[10.5px] !tracking-[0.06em]">
                <Icon name="calendar" size={12} />
                {mmdd(rangeStart)} → {mmdd(rangeEnd)}
              </span>
              <div className="seg">
                {[7, 30, 90].map((r) => (
                  <button
                    key={r}
                    className={range === r ? "is-on" : ""}
                    onClick={() => cdn.setUI({ range: r as 7 | 30 | 90 })}
                  >
                    {r}d
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
      />

      <div className="relative z-[1] px-9 pb-1 pt-8">
        <SectionHead
          title="Total across all efforts"
          right={
            <span className="flex items-center gap-1.5 text-[10.5px] text-[var(--muted-2)]">
              {range} day range · {scoped.length} campaign{scoped.length === 1 ? "" : "s"} · {projects.length} project
              sheets
            </span>
          }
        />
        <div className="kpi-strip">
          {kpis.map((k, i) => (
            <div key={k.label} className={`kpi-cell ${i === 0 ? "is-active" : ""}`}>
              <div className="kpi-head">
                <span className="kpi-index">{String(i + 1).padStart(2, "0")}</span>
                <InfoDot text={k.hint} />
              </div>
              <div className="kpi-label">{k.label}</div>
              <div className="metric">{fmtCompact(k.value)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-[1] px-9 pt-9">
        <SectionHead
          title="By effort"
          hint={effort ? "Filtered view" : `${cards.length} effort${cards.length === 1 ? "" : "s"} in this scope`}
          right={<span className="text-[10.5px] text-[var(--muted-2)]">Click a card to open the detailed view</span>}
        />
        {effort && !available[effort] && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#f6d8b4] bg-[#fdf6ec] px-4 py-2.5 text-[11.5px] text-[#8a4b06]">
            <Icon name="info" size={14} />
            No {EFFORT_META[effort].label} effort recorded in this scope. The totals above reflect the whole scope.
          </div>
        )}
        <div
          className={`grid gap-4 ${
            cards.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : cards.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          {cards.map((key) => (
            <EffortCard key={key} effortKey={key} agg={aggregates[key]} range={range} hasData={available[key]} />
          ))}
        </div>
      </div>

      <div className="relative z-[1] grid gap-4 px-9 pt-9 xl:grid-cols-[1.35fr_1fr]">
        <div>
          <SectionHead
            title="Data Ads content"
            hint={`${adRows.length} rows · ${adsWithLink} with a publish link`}
            right={
              <Link href="/data-ads" className="text-[11.5px] font-medium text-[var(--blue-deep)] hover:underline">
                Open Data Ads →
              </Link>
            }
          />
          <div className="card overflow-hidden">
            <div className="scroll-x">
              <table className="table">
                <thead>
                  <tr>
                    <th>Creative Name</th>
                    <th className="w-[110px]">Shortcode</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Link Post</th>
                    <th className="w-[130px]">Sheet</th>
                  </tr>
                </thead>
                <tbody>
                  {adRows.slice(0, 8).map((r) => (
                    <tr key={r.id}>
                      <td className="max-w-[220px] truncate text-[12px] font-medium">{r.creativeName}</td>
                      <td>
                        <span className="mono text-[10px] text-[var(--muted)]">{r.shortcode}</span>
                      </td>
                      <td className="whitespace-nowrap text-[11px] text-[var(--muted-2)]">{r.startDate || "—"}</td>
                      <td className="whitespace-nowrap text-[11px] text-[var(--muted-2)]">{r.endDate || "—"}</td>
                      <td className="max-w-[170px] truncate">
                        <span className="text-[10.5px] text-[var(--muted-2)]">
                          {r.linkPost ? r.linkPost.replace("https://www.", "") : "—"}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/data-ads/${r.container.id}`}
                          className="whitespace-nowrap text-[11px] text-[var(--blue-deep)] hover:underline"
                        >
                          {r.sheet.name}
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {adRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10">
                        <div className="text-center">
                          <div className="text-[12.5px] font-medium">No Data Ads rows in this scope</div>
                          <p className="mx-auto mt-1 max-w-[380px] text-[11.5px] leading-5 text-[var(--muted)]">
                            Create a Data Ads spreadsheet and paste the tracker-list block.
                          </p>
                          <Link href="/data-ads" className="btn btn-sm mt-3">
                            Go to Data Ads
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <SectionHead title={group ? "Group detail" : "Campaign detail"} className="!mb-3" />
            {group ? (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11.5px]">
                  <Detail label="Brand" value={brand.name} />
                  <Detail label="Campaigns" value={String(scoped.length)} />
                  <Detail label="Project sheets" value={String(projects.length)} />
                  <Detail label="Data Ads" value={String(containers.length)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[var(--line)] pt-3">
                  {scoped.map((c) => (
                    <span key={c.id} className="chip !h-[24px] !px-2 !text-[9px]">
                      <span className="dot" style={{ background: c.status === "live" ? "#12b76a" : "#94a3b8" }} />
                      {c.name}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11.5px]">
                  <Detail label="Brand" value={brand.name} />
                  <Detail label="Campaign type" value={campaign?.type ?? ""} />
                  <Detail label="Agency" value={campaign?.agency ?? ""} />
                  <Detail label="Status" value={campaign?.status ?? ""} />
                  <Detail label="Start" value={campaign?.start ?? ""} />
                  <Detail label="End" value={campaign?.end ?? ""} />
                  <Detail label="Project sheets" value={String(projects.length)} />
                  <Detail label="Data Ads rows" value={String(adRows.length)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[var(--line)] pt-3">
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/ts/${p.id}`}
                      className="chip !h-[24px] !px-2 !text-[9px] hover:border-[var(--line-3)]"
                    >
                      {PROJECT_LABEL[p.type]}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card p-5">
            <SectionHead title="Shortcode match health" className="!mb-3" />
            <div className="space-y-4">
              <MatchRow
                label="Data Ads · this scope"
                matched={adsWithLink}
                total={adRows.length}
                color="#2f6bff"
                href="/data-ads"
              />
              <MatchRow
                label="Automation link · brand"
                matched={automationMatched}
                total={automationRows.length}
                color="#0e9c8c"
                href="/automation"
              />
            </div>
            <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] leading-[1.6] text-[var(--muted)]">
              Every publish link is reduced to a shortcode. A row resolves only when that shortcode exists in one of{" "}
              {brand.name}&apos;s project sheets.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow-dim !text-[8.5px]">{label}</div>
      <div className="mt-0.5 truncate font-medium capitalize">{value}</div>
    </div>
  );
}

function MatchRow({
  label,
  total,
  matched,
  color,
  href,
}: {
  label: string;
  total: number;
  matched: number;
  color: string;
  href: string;
}) {
  const rate = total ? matched / total : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium">{label}</span>
        <span className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
          {matched}/{total} matched
          <Link href={href} className="text-[var(--blue-deep)] hover:underline">
            open
          </Link>
        </span>
      </div>
      <div className="mb-1.5 flex gap-[3px]">
        {Array.from({ length: 34 }).map((_, i) => (
          <span
            key={i}
            className="h-2 flex-1 rounded-[2px]"
            style={{ background: i / 34 < rate ? color : "#eef2f8" }}
          />
        ))}
      </div>
      <div className="text-[10.5px] text-[var(--muted-2)]">{pct(rate)} resolved automatically</div>
    </div>
  );
}

function EffortCard({
  effortKey,
  agg,
  range,
  hasData,
}: {
  effortKey: EffortKey;
  agg: Aggregate;
  range: 7 | 30 | 90;
  hasData: boolean;
}) {
  const meta = EFFORT_META[effortKey];

  const big =
    effortKey === "ads"
      ? { label: "Video views", value: agg.adsVideo }
      : effortKey === "attend"
        ? { label: "Attendance", value: agg.attended }
        : { label: "Organic views", value: agg.organic };

  const rows =
    effortKey === "ads"
      ? [
          { k: "Impressions", v: fmtCompact(agg.impressions) },
          { k: "Reach", v: fmtCompact(agg.reach) },
          { k: "Materials", v: String(agg.materials) },
        ]
      : effortKey === "attend"
        ? [
            { k: "Registrations", v: fmtCompact(agg.registered) },
            { k: "Content", v: String(agg.content) },
            { k: "Show-up rate", v: pct(agg.registered ? agg.attended / agg.registered : 0) },
          ]
        : [
            { k: "Engagement", v: fmtCompact(agg.engagement) },
            { k: "Content", v: String(agg.content) },
            { k: "Avg ER", v: pct(agg.avgEr) },
            ...(effortKey === "kol"
              ? [{ k: "Boosted via KOL ads", v: agg.adsVideo ? `+${fmtCompact(agg.adsVideo)}` : "—" }]
              : []),
          ];

  return (
    <div className="card effort-card">
      <div className="effort-head">
        <span className="effort-icon" style={{ color: meta.color, background: meta.soft }}>
          <Icon name={meta.icon} size={17} />
        </span>
        <div>
          <div className="text-[13px] font-semibold">{meta.label}</div>
          <div className="text-[10px] text-[var(--muted-2)]">
            {hasData ? `${agg.campaignCount} campaign${agg.campaignCount === 1 ? "" : "s"} · ${range}d` : `No ${meta.label} effort`}
          </div>
        </div>
      </div>

      <div className="eyebrow-dim">{big.label}</div>
      <div className="metric mt-1.5">{hasData ? fmtCompact(big.value) : "0"}</div>

      <div className="mt-4">
        {rows.map((r) => (
          <div key={r.k} className="effort-row">
            <span className="k">{r.k}</span>
            <span className="v">{hasData ? r.v : "0"}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-3">
        {!hasData ? (
          <div className="flex h-[74px] flex-col items-center justify-center gap-2 text-center">
            <div className="h-px w-full border-t border-dashed border-[var(--line-2)]" />
            <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted-2)]">
              No data in this scope
            </span>
          </div>
        ) : (
          <Sparkline data={agg.series} color={meta.color} height={74} />
        )}
      </div>

      <Link href={meta.link} className="btn btn-primary mt-3 w-full !justify-between">
        <span>Open {meta.label}</span>
        <Icon name="arrowRight" size={13} />
      </Link>
    </div>
  );
}
