"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import type { Campaign, BoostStatus } from "@/lib/types";
import { fmtInt, pct, relTime } from "@/lib/utils";
import { Icon } from "@/components/Icon";
import { BrandAvatar, EmptyState, Field, Modal, PageHero, SectionHead, Select, StatusBadge } from "@/components/ui";
import { toast } from "@/components/Toast";

export default function DataAdsPage() {
  const state = useCdn();
  const router = useRouter();
  const brandId = state.ui.brandId;
  const brand = state.brands.find((b) => b.id === brandId) ?? state.brands[0];
  const campaign =
    state.campaigns.find((c) => state.ui.campaignIds.includes(c.id)) ??
    state.campaigns.find((c) => c.brandId === brandId);
  const selectedCampaigns = state.campaigns.filter((c) => state.ui.campaignIds.includes(c.id));
  const [openNew, setOpenNew] = useState(false);
  const [query, setQuery] = useState("");
  const [boost, setBoost] = useState<"all" | BoostStatus>("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const containers = useMemo(
    () =>
      state.dataAds
        .filter((d) => d.brandId === brandId && state.ui.campaignIds.includes(d.campaignId))
        .filter((d) => (boost === "all" ? true : d.sheets.some((s) => s.rows.some((r) => r.boostStatus === boost))))
        .filter((d) => d.name.toLowerCase().includes(query.toLowerCase())),
    [state.dataAds, brandId, state.ui.campaignIds, query, boost],
  );

  const all = state.dataAds.filter(
    (d) => d.brandId === brandId && state.ui.campaignIds.includes(d.campaignId),
  );
  const rows = all.flatMap((d) => d.sheets.flatMap((s) => s.rows));
  const linked = rows.filter((r) => r.shortcode).length;
  const sheets = all.reduce((sum, d) => sum + d.sheets.length, 0);
  const target = deleteTarget ? state.dataAds.find((d) => d.id === deleteTarget) : null;

  return (
    <>
      <PageHero
        eyebrow="Data Ads · Tracker list"
        title="Data Ads"
        sub={
          <>
            Tracker-list spreadsheets for{" "}
            <b className="font-semibold text-[var(--ink-2)]">
              {selectedCampaigns.length === 1 ? selectedCampaigns[0].name : `${selectedCampaigns.length} selected campaigns`}
            </b>
            . One spreadsheet can hold many sheets — every sheet uses the same tracker-list columns.
          </>
        }
        actions={
          <button className="btn btn-dark" onClick={() => setOpenNew(true)}>
            <Icon name="plus" size={13} />
            New Data Ads
          </button>
        }
      />

      <div className="relative z-[1] px-9 pt-5">
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Spreadsheets" value={String(all.length)} hint={`${sheets} sheets inside`} />
          <MiniStat label="Rows" value={fmtInt(rows.length)} hint={`${linked} rows carry a link`} />
          <MiniStat label="Shortcode coverage" value={pct(rows.length ? linked / rows.length : 0)} hint="Matching ready" accent={linked === rows.length ? "ok" : "warn"} />
          <MiniStat label="Sheets" value={String(sheets)} hint="Across all spreadsheets" />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Icon
              name="search"
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
            />
            <input
              className="field w-[240px] !pl-8"
              placeholder="Search spreadsheet…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            value={boost}
            onChange={(v) => setBoost(v as "all" | BoostStatus)}
            options={[
              { value: "all", label: "All boosting status" },
              { value: "backlog", label: "Has backlog" },
              { value: "in_progress", label: "Has in progress" },
              { value: "done", label: "Has done" },
            ]}
          />
          <span className="ml-auto text-[10.5px] text-[var(--muted-2)]">
            Scoped to {brand.name} · {selectedCampaigns.length} campaign{selectedCampaigns.length === 1 ? "" : "s"}
          </span>
        </div>

        <SectionHead title="Spreadsheets" hint={`${containers.length} spreadsheets`} />

        <div className="card overflow-hidden">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-[260px]">Spreadsheet</th>
                  <th>Campaign</th>
                  <th>Agency</th>
                  <th className="num">Sheets</th>
                  <th className="num">Rows</th>
                  <th className="num">With link</th>
                  <th className="w-[150px]">Boosting</th>
                  <th>Last saved</th>
                  <th className="w-[130px]" />
                </tr>
              </thead>
              <tbody>
                {containers.map((d) => {
                  const dRows = d.sheets.flatMap((s) => s.rows);
                  const dLinked = dRows.filter((r) => r.shortcode).length;
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
                      <td className="max-w-[180px] truncate text-[var(--muted)]">{campaign?.name ?? "—"}</td>
                      <td className="whitespace-nowrap text-[var(--muted)]">{d.agency}</td>
                      <td className="num font-semibold">{d.sheets.length}</td>
                      <td className="num">{fmtInt(dRows.length)}</td>
                      <td className="num">{dLinked}</td>
                      <td>
                        {(() => {
                          const done = dRows.filter((r) => r.boostStatus === "done").length;
                          const rate = dRows.length ? done / dRows.length : 0;
                          return (
                            <div className="flex items-center gap-2">
                              <span className="block h-[6px] flex-1 overflow-hidden rounded-full bg-[#eef2f8]">
                                <span
                                  className="block h-full rounded-full bg-[#12b76a]"
                                  style={{ width: `${Math.max(0, rate * 100)}%` }}
                                />
                              </span>
                              <span className="w-10 shrink-0 text-right text-[10px] text-[var(--muted-2)]">
                                {done}/{dRows.length}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="whitespace-nowrap text-[11px] text-[var(--muted-2)]">
                        {new Date(d.savedAt).toLocaleDateString("en-US")}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/data-ads/${d.id}`} className="text-[11px] font-medium text-[var(--blue-deep)] hover:underline">
                            Open →
                          </Link>
                          <button
                            className="icon-btn h-[26px] w-[26px] !text-[#b42318]"
                            title="Delete Data Ads"
                            onClick={() => setDeleteTarget(d.id)}
                          >
                            <Icon name="trash" size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {containers.length === 0 && (
            <EmptyState
              icon="table"
              title="No Data Ads spreadsheet yet"
              body="Create one, then add as many tracker-list sheets as the campaign needs."
              action={
                <button className="btn btn-sm" onClick={() => setOpenNew(true)}>
                  <Icon name="plus" size={12} /> New Data Ads
                </button>
              }
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#cfe0ff] bg-[#f3f8ff] px-4 py-3 text-[11.5px] leading-5 text-[#2b4a7a]">
          <Icon name="info" size={14} className="shrink-0" />
          <span>
            Every spreadsheet can hold many sheets. Column layout and required fields are set per sheet from the
            spreadsheet view.
          </span>
        </div>
      </div>

      <NewDataAdsModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        campaigns={selectedCampaigns}
      />

      <Modal
        open={Boolean(target)}
        onClose={() => setDeleteTarget(null)}
        eyebrow="Delete Data Ads"
        title={`Delete “${target?.name ?? ""}”?`}
        subtitle="All sheets inside will be removed."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button
              className="btn !border-[#f6c9c5] !bg-[#d92d20] !text-white"
              onClick={() => {
                if (target) {
                  cdn.deleteDataAds(target.id);
                  toast("Data Ads deleted");
                }
                setDeleteTarget(null);
              }}
            >
              Delete
            </button>
          </>
        }
      >
        <div className="rounded-xl border border-[#f6c9c5] bg-[#fdf3f2] p-4 text-[11.5px] leading-5 text-[#7a271a]">
          {target?.sheets.length ?? 0} sheet(s) ·{" "}
          {target?.sheets.reduce((sum, s) => sum + s.rows.length, 0) ?? 0} rows will be deleted.
        </div>
      </Modal>
    </>
  );
}

function MiniStat({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: "ok" | "warn" }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="eyebrow-dim !text-[9px]">{label}</div>
      <div className="metric-sm mt-1.5" style={{ color: accent === "warn" ? "#b25c05" : accent === "ok" ? "#067647" : undefined }}>
        {value}
      </div>
      <div className="mt-1 text-[10.5px] text-[var(--muted-2)]">{hint}</div>
    </div>
  );
}

function NewDataAdsModal({
  open,
  onClose,
  campaigns,
}: {
  open: boolean;
  onClose: () => void;
  campaigns: Campaign[];
}) {
  const state = useCdn();
  const router = useRouter();
  const brandId = state.ui.brandId;
  const brand = state.brands.find((b) => b.id === brandId) ?? state.brands[0];
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const campaign = state.campaigns.find((c) => c.id === campaignId);
  const [name, setName] = useState("");
  const [agency, setAgency] = useState(brand?.agencies[0] ?? "");

  function submit() {
    if (!name.trim() || !campaignId) {
      toast("Name and campaign are required", "err");
      return;
    }
    const created = cdn.addDataAds({ brandId, campaignId, name: name.trim(), agency });
    toast("Data Ads created · add rows in the first sheet");
    onClose();
    router.push(`/data-ads/${created.id}`);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Tracker list"
      title="New Data Ads"
      subtitle="Creates one spreadsheet with a first sheet. You can add more sheets inside."
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-dark" onClick={submit}>
            Create &amp; open
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[#fafcff] p-3">
          <span className="eyebrow-dim !text-[8.5px]">Context</span>
          <span className="chip !h-[28px] !px-2.5">
            <BrandAvatar brand={brand} size={16} radius={4} />
            {brand.name}
          </span>
          {campaigns.length > 1 ? (
            <Select
              value={campaignId}
              onChange={setCampaignId}
              options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
              className="!h-[28px]"
            />
          ) : (
            <span className="chip !h-[28px] !px-2.5">
              <span className="dot" style={{ background: "#2f6bff" }} />
              {campaign?.name ?? "—"}
            </span>
          )}
          <span className="ml-auto text-[10px] text-[var(--muted-2)]">
            {campaigns.length > 1 ? "choose one of the selected campaigns" : "fixed by the active scope"}
          </span>
        </div>

        <Field label="Spreadsheet name" hint="For example: Set 667 Data Ads, Boost Data Ads.">
          <input className="field w-full" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Set 667 Data Ads" />
        </Field>
        <Field label="Agency">
          <Select value={agency} onChange={setAgency} options={brand.agencies.map((a) => ({ value: a, label: a }))} className="w-full" />
        </Field>
        <div className="rounded-xl border border-[var(--line)] bg-[#fafcff] p-3 text-[11px] leading-5 text-[var(--muted)]">
          Sheet 1 is created automatically with the tracker-list columns:{" "}
          {["Start Date", "End Date", "Creative Name", "Link Post"].join(", ")} are required.
        </div>
      </div>
    </Modal>
  );
}
