"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCdn } from "@/lib/store";
import { fmtInt, pct, relTime } from "@/lib/utils";
import type { BoostStatus } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { EmptyState, PageHero, SectionHead } from "@/components/ui";

const STATUS_META: Record<BoostStatus, { label: string; color: string }> = {
  backlog: { label: "Backlog", color: "#94a3b8" },
  in_progress: { label: "In Progress", color: "#2f6bff" },
  done: { label: "Done", color: "#12b76a" },
};

const STATUSES: BoostStatus[] = ["backlog", "in_progress", "done"];

export default function VendorWorkspacePage() {
  const state = useCdn();
  const brand = state.brands.find((b) => b.id === state.ui.brandId) ?? state.brands[0];
  const campaignIds = state.ui.campaignIds.length
    ? state.ui.campaignIds
    : state.campaigns.filter((c) => c.brandId === brand.id).map((c) => c.id);
  const [filter, setFilter] = useState<"all" | BoostStatus>("all");

  const containers = useMemo(
    () => state.dataAds.filter((d) => d.brandId === brand.id && campaignIds.includes(d.campaignId)),
    [state.dataAds, brand.id, campaignIds],
  );

  const rows = containers.flatMap((d) => d.sheets.flatMap((s) => s.rows));
  const counts = {
    total: rows.length,
    backlog: rows.filter((r) => r.boostStatus === "backlog").length,
    in_progress: rows.filter((r) => r.boostStatus === "in_progress").length,
    done: rows.filter((r) => r.boostStatus === "done").length,
  };

  const visible = containers.filter((d) => {
    if (filter === "all") return true;
    return d.sheets.some((s) => s.rows.some((r) => r.boostStatus === filter));
  });

  return (
    <>
      <PageHero
        eyebrow="Vendor ADS · Boosting"
        title="Boosting workspace"
        sub={
          <>
            Update the boosting status of each Data Ads row: <b className="font-semibold text-[var(--ink-2)]">Backlog</b> →{" "}
            <b className="font-semibold text-[var(--ink-2)]">In Progress</b> →{" "}
            <b className="font-semibold text-[var(--ink-2)]">Done</b>. Semua kolom lain read-only.
          </>
        }
        actions={
          <span className="chip !h-[33px]">
            <span className="dot" style={{ background: "#8b5cf6" }} />
            {brand.name} · {campaignIds.length} campaign{campaignIds.length === 1 ? "" : "s"}
          </span>
        }
      />

      <div className="relative z-[1] px-9 pt-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Rows to boost" value={fmtInt(counts.total)} hint={`${containers.length} spreadsheets`} />
          <Stat label="Backlog" value={fmtInt(counts.backlog)} hint="Waiting to be picked up" accent={STATUS_META.backlog.color} />
          <Stat label="In Progress" value={fmtInt(counts.in_progress)} hint="Currently boosting" accent={STATUS_META.in_progress.color} />
          <Stat label="Done" value={fmtInt(counts.done)} hint="Boost finished" accent={STATUS_META.done.color} />
        </div>

        <div className="mb-4 mt-5 flex flex-wrap items-center gap-2">
          <button className={`chip ${filter === "all" ? "is-on" : "is-off"}`} onClick={() => setFilter("all")}>
            All status
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`chip ${filter === s ? "is-on" : "is-off"}`}
              onClick={() => setFilter(s)}
            >
              <span className="dot" style={{ background: STATUS_META[s].color }} />
              {STATUS_META[s].label}
            </button>
          ))}
          <span className="ml-auto text-[10.5px] text-[var(--muted-2)]">
            {pct(counts.total ? counts.done / counts.total : 0)} of rows done
          </span>
        </div>

        <SectionHead title="Assigned Data Ads" hint={`${visible.length} spreadsheet${visible.length === 1 ? "" : "s"}`} />

        <div className="card overflow-hidden">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-[240px]">Spreadsheet</th>
                  <th>Campaign</th>
                  <th className="num">Rows</th>
                  <th className="num">Backlog</th>
                  <th className="num">In Progress</th>
                  <th className="num">Done</th>
                  <th className="w-[160px]">Progress</th>
                  <th>Last update</th>
                  <th className="w-[80px]" />
                </tr>
              </thead>
              <tbody>
                {visible.map((d) => {
                  const dRows = d.sheets.flatMap((s) => s.rows);
                  const done = dRows.filter((r) => r.boostStatus === "done").length;
                  const progress = dRows.length ? done / dRows.length : 0;
                  const campaign = state.campaigns.find((c) => c.id === d.campaignId);
                  return (
                    <tr key={d.id}>
                      <td>
                        <Link href={`/data-ads/${d.id}`} className="block truncate font-medium hover:underline">
                          {d.name}
                        </Link>
                        <div className="mt-0.5 truncate text-[10px] text-[var(--muted-2)]">
                          {d.sheets.map((s) => s.name).join(" · ")}
                        </div>
                      </td>
                      <td className="max-w-[170px] truncate text-[var(--muted)]">{campaign?.name ?? "—"}</td>
                      <td className="num">{fmtInt(dRows.length)}</td>
                      <td className="num">{dRows.filter((r) => r.boostStatus === "backlog").length}</td>
                      <td className="num">{dRows.filter((r) => r.boostStatus === "in_progress").length}</td>
                      <td className="num font-semibold">{done}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="block h-[6px] flex-1 overflow-hidden rounded-full bg-[#eef2f8]">
                            <span
                              className="block h-full rounded-full bg-[#12b76a]"
                              style={{ width: `${Math.max(0, progress * 100)}%` }}
                            />
                          </span>
                          <span className="w-9 text-right text-[10px] text-[var(--muted-2)]">{pct(progress)}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-[10.5px] text-[var(--muted-2)]">{relTime(d.savedAt)}</td>
                      <td>
                        <Link
                          href={`/data-ads/${d.id}`}
                          className="whitespace-nowrap text-[11px] font-medium text-[var(--blue-deep)] hover:underline"
                        >
                          Boost →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visible.length === 0 && (
            <EmptyState
              icon="ads"
              title="No Data Ads assigned"
              body="Choose another campaign in the topbar, or ask Spectrum to assign a Data Ads spreadsheet."
            />
          )}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#cfe0ff] bg-[#f3f8ff] px-4 py-3 text-[11.5px] leading-5 text-[#2b4a7a]">
          <Icon name="info" size={14} className="mt-0.5 shrink-0" />
          <span>
            Status hanya bisa diubah oleh Vendor ADS. Spectrum dan Agency melihat status yang sama secara read-only.
          </span>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: string }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="eyebrow-dim !text-[9px]">{label}</div>
      <div className="metric-sm mt-1.5" style={{ color: accent }}>
        {value}
      </div>
      <div className="mt-1 text-[10.5px] text-[var(--muted-2)]">{hint}</div>
    </div>
  );
}
