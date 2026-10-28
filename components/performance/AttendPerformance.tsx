"use client";

import { useMemo, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { attendeesFor, attendSummary } from "@/lib/performance";
import { fmtInt, mmdd, pct } from "@/lib/utils";
import { Icon } from "@/components/Icon";
import { EmptyState, PageHero, StatusBadge } from "@/components/ui";
import { Initials, Pager, Panel, PerfKpi } from "./PerfUI";

const rupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

export function AttendPerformance() {
  const state = useCdn();
  const brand = state.brands.find((b) => b.id === state.ui.brandId) ?? state.brands[0];
  const range = state.ui.range;
  const campaignIds = state.ui.campaignIds.length
    ? state.ui.campaignIds
    : state.campaigns.filter((c) => c.brandId === brand.id).map((c) => c.id);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const attendees = useMemo(() => attendeesFor(state, campaignIds, range), [state, campaignIds, range]);
  const summary = attendSummary(attendees);

  const filtered = useMemo(
    () =>
      attendees
        .filter((a) => (status === "all" ? true : a.status === status))
        .filter((a) => `${a.name} ${a.campaignId}`.toLowerCase().includes(query.toLowerCase())),
    [attendees, status, query],
  );

  const sorted = [...filtered].sort((a, b) => (a.checkedInAt < b.checkedInAt ? 1 : -1));
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const rangeEnd = new Date("2026-10-28T09:00:00Z");
  const rangeStart = new Date(rangeEnd);
  rangeStart.setDate(rangeEnd.getDate() - range);

  const campaignName = (id: string) => state.campaigns.find((c) => c.id === id)?.name ?? "—";

  const kpis = [
    { label: "Total attendance", value: fmtInt(summary.total), hint: "Participants checked in" },
    { label: "Completed (verified)", value: fmtInt(summary.complete), hint: "Verified attendance" },
    { label: "In process", value: fmtInt(summary.inProcess), hint: "Waiting for verification" },
    { label: "Total spend", value: rupiah(summary.spend), hint: "Total participant payout" },
    { label: "Invitations sent", value: fmtInt(summary.invited), hint: "Invite links sent" },
  ];

  return (
    <>
      <PageHero
        eyebrow="Dashboard · Attend performance"
        title="Attend performance"
        sub={
          <>
            {brand.name} · {campaignIds.length} campaign{campaignIds.length === 1 ? "" : "s"} ·{" "}
            {attendees.length} participants in range
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

        <Panel
          title="Participants"
          hint={`${filtered.length} of ${attendees.length} · ${pct(attendees.length ? summary.complete / attendees.length : 0)} verified`}
          right={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Icon name="search" size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
                <input
                  className="field h-[30px] w-[230px] !pl-8 !text-[11.5px]"
                  placeholder="Search participant or campaign…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <select
                className="field !h-[30px] !text-[11.5px]"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All status</option>
                <option value="complete">Complete</option>
                <option value="in_process">In process</option>
              </select>
            </div>
          }
        >
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Campaign</th>
                  <th>Check-in</th>
                  <th>Referral link</th>
                  <th>Proof</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Initials name={a.name} size={30} />
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-medium">{a.name}</div>
                          <span className="badge badge-neutral !h-[17px] !text-[8px]">{a.tier}</span>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[180px] truncate text-[var(--muted)]">{campaignName(a.campaignId)}</td>
                    <td className="whitespace-nowrap text-[11px] text-[var(--muted-2)]">
                      {new Date(a.checkedInAt).toLocaleString("en-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="max-w-[170px] truncate text-[10.5px] text-[var(--muted-2)]">
                      {a.referral || "—"}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {Array.from({ length: a.photos }).map((_, i) => (
                          <span
                            key={i}
                            className="h-6 w-6 rounded border border-[var(--line)]"
                            style={{
                              background: `linear-gradient(135deg, hsl(${(a.name.length * 37 + i * 60) % 360} 55% 78%), hsl(${(a.name.length * 37 + i * 60 + 40) % 360} 45% 62%))`,
                            }}
                            title="Proof photo"
                          />
                        ))}
                      </div>
                    </td>
                    <td className="num">{a.amount ? rupiah(a.amount) : "—"}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[12px] text-[var(--muted-2)]">
                      No participants in this scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager page={safePage} pages={pages} onChange={setPage} />
        </Panel>

        <div className="flex items-start gap-2 rounded-xl border border-[#cfe0ff] bg-[#f3f8ff] px-4 py-3 text-[11.5px] leading-5 text-[#2b4a7a]">
          <Icon name="info" size={14} className="mt-0.5 shrink-0" />
          <span>
            Participant rows are dummy data. Status follows the attendance verification: complete means the proof photo and
            payout were verified.
          </span>
        </div>
      </div>
    </>
  );
}
