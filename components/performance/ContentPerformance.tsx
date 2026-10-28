"use client";

import { useMemo, useState } from "react";
import type { PerformancePost } from "@/lib/types";
import { cdn, useCdn } from "@/lib/store";
import { dailyPostSeries, postsFor, summarizePosts } from "@/lib/performance";
import { fmtCompact, fmtInt, mmdd, pct } from "@/lib/utils";
import { Icon } from "@/components/Icon";
import { EmptyState, PageHero, SectionHead } from "@/components/ui";
import { toast } from "@/components/Toast";
import { Initials, Pager, Panel, PerfKpi, PerfLineChart, StackedShare } from "./PerfUI";

export function ContentPerformance({ effort }: { effort: "KOL" | "CONNECTOR" }) {
  const state = useCdn();
  const brand = state.brands.find((b) => b.id === state.ui.brandId) ?? state.brands[0];
  const range = state.ui.range;
  const campaignIds = state.ui.campaignIds.length
    ? state.ui.campaignIds
    : state.campaigns.filter((c) => c.brandId === brand.id).map((c) => c.id);

  const [agency, setAgency] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const posts = useMemo(() => postsFor(state, effort, campaignIds, range), [state, effort, campaignIds, range]);
  const agencies = [...new Set(posts.map((p) => p.agency))].sort();

  const filtered = useMemo(
    () =>
      posts
        .filter((p) => (agency === "all" ? true : p.agency === agency))
        .filter((p) => p.account.toLowerCase().includes(query.toLowerCase())),
    [posts, agency, query],
  );

  const summary = summarizePosts(filtered);
  const series = dailyPostSeries(filtered, range);
  const top = [...filtered].sort((a, b) => b.views - a.views).slice(0, 5);

  const leaderboard = useMemo(() => {
    const map = new Map<string, { account: string; agency: string; tier: string; posts: number; views: number; sixth: number; engagement: number }>();
    filtered.forEach((p) => {
      const cur = map.get(p.account) ?? {
        account: p.account,
        agency: p.agency,
        tier: p.tier,
        posts: 0,
        views: 0,
        sixth: 0,
        engagement: 0,
      };
      cur.posts += 1;
      cur.views += p.views;
      cur.sixth += p.sixthViews;
      cur.engagement += p.likes + p.comments;
      map.set(p.account, cur);
    });
    return [...map.values()].sort((a, b) => b.views - a.views).slice(0, 5);
  }, [filtered]);

  const sorted = [...filtered].sort((a, b) => b.views - a.views);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const label = effort === "KOL" ? "KOL" : "Connector";
  const rangeEnd = new Date("2026-10-28T09:00:00Z");
  const rangeStart = new Date(rangeEnd);
  rangeStart.setDate(rangeEnd.getDate() - range);

  const kpis = [
    { label: effort === "KOL" ? "KOLs" : "Accounts", value: fmtInt(summary.accounts), hint: "Unique accounts in this scope" },
    { label: "Content", value: fmtInt(summary.content), hint: "Posts in the selected range" },
    { label: "Views", value: fmtCompact(summary.views), hint: "Organic + paid views" },
    { label: "Organic views", value: fmtCompact(summary.organic), hint: "Views without paid boost" },
    { label: "6s views", value: fmtCompact(summary.sixthViews), hint: "Views that passed 6 seconds" },
    { label: "Engagement", value: fmtCompact(summary.engagement), hint: "Likes + comments" },
    { label: "Avg ER", value: pct(summary.avgEr), hint: "Engagement divided by views" },
  ];

  return (
    <>
      <PageHero
        eyebrow={`Dashboard · ${label} performance`}
        title={`${label} performance`}
        sub={
          <>
            {brand.name} · {campaignIds.length} campaign{campaignIds.length === 1 ? "" : "s"} ·{" "}
            {filtered.length} posts in range
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

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            className={`chip ${agency === "all" ? "is-on" : "is-off"}`}
            onClick={() => {
              setAgency("all");
              setPage(1);
            }}
          >
            All agencies
          </button>
          {agencies.map((a) => (
            <button
              key={a}
              className={`chip ${agency === a ? "is-on" : "is-off"}`}
              onClick={() => {
                setAgency(a);
                setPage(1);
              }}
            >
              {a}
            </button>
          ))}
          <div className="relative ml-auto">
            <Icon name="search" size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
            <input
              className="field h-[30px] w-[220px] !pl-8 !text-[11.5px]"
              placeholder="Search account…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Panel
            title="Organic vs paid views"
            hint={`${summary.boosted} of ${summary.content} posts boosted`}
          >
            <div className="p-4">
              <StackedShare
                left={summary.organic}
                right={summary.paid}
                leftLabel="Organic views"
                rightLabel="Paid views"
                leftColor={effort === "KOL" ? "#ef7f24" : "#ec4b8b"}
                rightColor="#0e9c8c"
              />
              <p className="mt-3 text-[10.5px] leading-4 text-[var(--muted-2)]">
                Paid views are derived from the ads sheets. Posts without a publish link are excluded from this split.
              </p>
            </div>
          </Panel>

          <Panel title="New views per day" hint={`Last ${range} days`}>
            <div className="p-4">
              <PerfLineChart
                labels={series.labels}
                series={[
                  { name: "Organic", color: effort === "KOL" ? "#ef7f24" : "#ec4b8b", values: series.organic },
                  { name: "Paid", color: "#0e9c8c", values: series.paid },
                ]}
                height={210}
              />
            </div>
          </Panel>
        </div>

        <div>
          <SectionHead title={`Top ${label} content by views`} hint="5 highest-view posts" />
          {top.length === 0 ? (
            <div className="card px-6 py-12 text-center text-[12px] text-[var(--muted-2)]">
              No content in this scope. Try another campaign or range.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {top.map((p, i) => (
                <ContentCard key={p.id} post={p} index={i + 1} />
              ))}
            </div>
          )}
        </div>

        <Panel
          title={`${label} leaderboard`}
          hint={`Top ${leaderboard.length} of ${summary.accounts}`}
        >
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-[36px]">#</th>
                  <th>{effort === "KOL" ? "KOL" : "Account"}</th>
                  <th>Agency</th>
                  <th className="num">Posts</th>
                  <th className="num">Views</th>
                  <th className="num">6s views</th>
                  <th className="num">ER</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((r, i) => (
                  <tr key={r.account}>
                    <td className="text-[10px] text-[var(--muted-2)]">{String(i + 1).padStart(2, "0")}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Initials name={r.account} size={26} />
                        <span className="font-medium">{r.account}</span>
                      </div>
                    </td>
                    <td className="text-[var(--muted)]">{r.agency}</td>
                    <td className="num">{r.posts}</td>
                    <td className="num font-semibold">{fmtCompact(r.views)}</td>
                    <td className="num">{fmtCompact(r.sixth)}</td>
                    <td className="num">{pct(r.views ? r.engagement / r.views : 0)}</td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[12px] text-[var(--muted-2)]">
                      No accounts in this scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title={`All ${label} content`}
          hint={`${filtered.length} posts`}
          right={
            <span className="text-[10px] text-[var(--muted-2)]">
              Sorted by views · {safePage}/{pages}
            </span>
          }
        >
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-[32px]">#</th>
                  <th>Post</th>
                  <th>Agency</th>
                  <th>Tier</th>
                  <th className="num">Views</th>
                  <th className="num">Organic</th>
                  <th className="num">Paid</th>
                  <th className="num">Likes</th>
                  <th className="num">Comments</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id}>
                    <td className="text-[10px] text-[var(--muted-2)]">{(safePage - 1) * pageSize + i + 1}</td>
                    <td className="max-w-[300px]">
                      <div className="flex items-center gap-1.5">
                        <span className="badge badge-neutral !h-[17px] !text-[8px]">{p.platform}</span>
                        {p.boosted && <span className="badge badge-blue !h-[17px] !text-[8px]">boosted</span>}
                        <span className="truncate font-medium">{p.account}</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-[var(--muted-2)]">
                        {new Date(p.postedAt).toLocaleString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="text-[var(--muted)]">{p.agency}</td>
                    <td>{p.tier === "—" ? <span className="text-[var(--muted-2)]">—</span> : <span className="badge badge-neutral">{p.tier}</span>}</td>
                    <td className="num font-semibold">{fmtCompact(p.views)}</td>
                    <td className="num">{fmtCompact(p.organic)}</td>
                    <td className="num">{fmtCompact(p.paid)}</td>
                    <td className="num">{fmtCompact(p.likes)}</td>
                    <td className="num">{fmtCompact(p.comments)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-[12px] text-[var(--muted-2)]">
                      No content found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager page={safePage} pages={pages} onChange={setPage} />
        </Panel>
      </div>
    </>
  );
}

function ContentCard({ post, index }: { post: PerformancePost; index: number }) {
  const hue = Array.from(post.account).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div className="card overflow-hidden">
      <div
        className="relative flex h-[150px] items-center justify-center"
        style={{
          background: `linear-gradient(150deg, hsl(${hue} 45% 88%), hsl(${hue} 35% 74%))`,
        }}
      >
        <span className="absolute left-2 top-2 grid h-5 w-5 place-items-center rounded bg-white/80 text-[9px] font-semibold text-[var(--ink-2)]">
          {String(index).padStart(2, "0")}
        </span>
        <span className="absolute right-2 top-2 badge badge-neutral !bg-white/80 !text-[8px]">{post.platform}</span>
        <span className="text-[34px] font-semibold tracking-[-0.04em]" style={{ color: `hsl(${hue} 40% 32%)` }}>
          {post.account.replace("@", "").slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Initials name={post.account} size={22} />
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold">{post.account}</div>
            <div className="truncate text-[9px] text-[var(--muted-2)]">{post.agency}</div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 border-t border-[var(--line)] pt-2 text-[9px] text-[var(--muted-2)]">
          <div>
            <div>Views</div>
            <div className="text-[11px] font-semibold text-[var(--ink)]">{fmtCompact(post.views)}</div>
          </div>
          <div>
            <div>ER</div>
            <div className="text-[11px] font-semibold text-[var(--ink)]">{pct(post.er)}</div>
          </div>
          <div>
            <div>Likes</div>
            <div className="text-[11px] font-semibold text-[var(--ink)]">{fmtCompact(post.likes)}</div>
          </div>
        </div>
        <button
          className="btn btn-sm mt-2 w-full !justify-between"
          onClick={() => toast(`Opening ${post.platform} post · ${post.account}`)}
        >
          View post
          <Icon name="external" size={11} />
        </button>
      </div>
    </div>
  );
}
