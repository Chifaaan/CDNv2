"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { scrapeJobs } from "@/lib/derive";
import { fmtInt, pct, relTime } from "@/lib/utils";
import type { ScrapeStatus } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Bar, PageHero, SectionHead, Select, StatusBadge } from "@/components/ui";
import { toast } from "@/components/Toast";

export default function ScrapingPage() {
  const state = useCdn();
  const brandId = state.ui.brandId;
  const brand = state.brands.find((b) => b.id === brandId) ?? state.brands[0];
  const [status, setStatus] = useState<"all" | ScrapeStatus>("all");
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const jobs = useMemo(() => scrapeJobs(state).filter((j) => j.brandId === brandId), [state, brandId]);
  const counts = {
    success: jobs.filter((j) => j.status === "success").length,
    failed: jobs.filter((j) => j.status === "failed").length,
    pending: jobs.filter((j) => j.status === "pending").length,
  };

  const filtered = useMemo(
    () =>
      jobs
        .filter((j) => (status === "all" ? true : j.status === status))
        .filter((j) => (source === "all" ? true : j.source === source))
        .filter((j) => `${j.label} ${j.shortcode} ${j.owner}`.toLowerCase().includes(query.toLowerCase())),
    [jobs, status, source, query],
  );

  function retry(ids: string[], label: string) {
    if (!ids.length) {
      toast("Nothing to retry", "warn");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const n = cdn.retryScrape(ids);
      setBusy(false);
      toast(`${n} link(s) re-scraped · ${label}`);
    }, 700);
  }

  const failedIds = filtered.filter((j) => j.status !== "success").map((j) => j.id);

  return (
    <>
      <PageHero
        eyebrow="Scraping monitoring"
        title="Scraping monitoring"
        sub={
          <>
            Every publish link from <b className="font-semibold text-[var(--ink-2)]">{brand.name}</b> tracking sheets and
            tracker lists, checked on a 15 minute cycle.
          </>
        }
        actions={
          <>
            <button className="btn" onClick={() => retry(failedIds, "bulk retry")} disabled={busy || failedIds.length === 0}>
              <Icon name="refresh" size={13} className={busy ? "spin" : ""} />
              Retry {failedIds.length > 0 ? `${failedIds.length} pending` : "all"}
            </button>
            <span className="chip">
              <span className="dot" style={{ background: "#12b76a" }} />
              Next run in 06:12
            </span>
          </>
        }
      />

      <div className="relative z-[1] px-9 pt-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Links tracked" value={fmtInt(jobs.length)} hint={`${counts.success} succeeded`} />
          <Stat label="Success rate" value={pct(jobs.length ? counts.success / jobs.length : 0)} hint="Rolling 24 hours" accent="ok" />
          <Stat label="Failed" value={fmtInt(counts.failed)} hint="Needs a retry or a new link" accent={counts.failed ? "bad" : "ok"} />
          <Stat label="Pending" value={fmtInt(counts.pending)} hint="Queued for the next cycle" accent={counts.pending ? "warn" : "ok"} />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_300px]">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative">
                <Icon
                  name="search"
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
                />
                <input
                  className="field w-[280px] !pl-8"
                  placeholder="Search account, campaign or shortcode…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Select
                value={status}
                onChange={(v) => setStatus(v as "all" | ScrapeStatus)}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "success", label: "Success" },
                  { value: "failed", label: "Failed" },
                  { value: "pending", label: "Pending" },
                ]}
              />
              <Select
                value={source}
                onChange={setSource}
                options={[
                  { value: "all", label: "TS + TL" },
                  { value: "TS", label: "Tracking sheet" },
                  { value: "TL", label: "Tracker list" },
                ]}
              />
              <span className="ml-auto text-[10.5px] text-[var(--muted-2)]">{filtered.length} links</span>
            </div>

            <SectionHead title="Scrape log" hint="Newest first" />
            <div className="card overflow-hidden">
              <div className="scroll-x">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Link</th>
                      <th className="w-[70px]">Source</th>
                      <th className="w-[120px]">Shortcode</th>
                      <th>Owner</th>
                      <th className="w-[110px]">Status</th>
                      <th className="w-[120px]">Checked</th>
                      <th className="w-[80px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 60).map((j) => (
                      <tr key={j.id}>
                        <td className="max-w-[300px]">
                          <Link href={j.href} className="block truncate text-[11.5px] font-medium hover:underline">
                            {j.label}
                          </Link>
                          <div className="truncate text-[10px] text-[var(--muted-2)]">{j.link.replace("https://www.", "")}</div>
                        </td>
                        <td>
                          <span className="badge badge-neutral">{j.source}</span>
                        </td>
                        <td>
                          <span className="mono text-[10px] text-[var(--muted)]">{j.shortcode || "—"}</span>
                        </td>
                        <td className="max-w-[160px] truncate text-[11.5px] text-[var(--muted)]">{j.owner}</td>
                        <td>
                          <StatusBadge status={j.status} />
                        </td>
                        <td className="whitespace-nowrap text-[10.5px] text-[var(--muted-2)]">{relTime(j.checkedAt)}</td>
                        <td>
                          {j.status !== "success" ? (
                            <button className="text-[10.5px] font-medium text-[var(--blue-deep)] hover:underline" onClick={() => retry([j.id], j.label)}>
                              Retry
                            </button>
                          ) : (
                            <span className="text-[10.5px] text-[var(--muted-2)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-[12px] text-[var(--muted-2)]">
                          No links match this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filtered.length > 60 && (
                <div className="border-t border-[var(--line)] px-4 py-2.5 text-[10.5px] text-[var(--muted-2)]">
                  Showing 60 of {filtered.length} links — refine the filters to narrow down.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-4">
              <SectionHead title="Health by source" className="!mb-3" />
              {(["TS", "TL"] as const).map((src) => {
                const list = jobs.filter((j) => j.source === src);
                const ok = list.filter((j) => j.status === "success").length;
                return (
                  <div key={src} className="mb-4 last:mb-0">
                    <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                      <span>{src === "TS" ? "Tracking sheets" : "Tracker lists"}</span>
                      <span className="text-[10.5px] text-[var(--muted-2)]">{pct(list.length ? ok / list.length : 0)}</span>
                    </div>
                    <Bar value={list.length ? ok / list.length : 0} color={src === "TS" ? "#2f6bff" : "#0e9c8c"} />
                    <div className="mt-1 text-[10px] text-[var(--muted-2)]">
                      {ok}/{list.length} links healthy
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--line)] bg-[#f7faff] text-[var(--blue-deep)]">
                  <Icon name="radar" size={15} />
                </span>
                <div className="text-[12.5px] font-semibold">Retry policy</div>
              </div>
              <ul className="mt-3 space-y-2 text-[11.5px] leading-5 text-[var(--muted)]">
                <li>· Failed links retry 3× with backoff.</li>
                <li>· After 3 failures the row is flagged for the agency.</li>
                <li>· Links without a shortcode stay pending until fixed.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: "ok" | "warn" | "bad" }) {
  const color = accent === "bad" ? "#d92d20" : accent === "warn" ? "#b25c05" : accent === "ok" ? "#067647" : undefined;
  return (
    <div className="card px-4 py-3.5">
      <div className="eyebrow-dim !text-[9px]">{label}</div>
      <div className="metric-sm mt-1.5" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-[10.5px] text-[var(--muted-2)]">{hint}</div>
    </div>
  );
}
