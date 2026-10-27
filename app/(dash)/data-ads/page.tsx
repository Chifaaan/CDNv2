"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import type { Campaign } from "@/lib/types";
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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const containers = useMemo(
    () =>
      state.dataAds
        .filter((d) => d.brandId === brandId && state.ui.campaignIds.includes(d.campaignId))
        .filter((d) => d.name.toLowerCase().includes(query.toLowerCase())),
    [state.dataAds, brandId, state.ui.campaignIds, query],
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
          <span className="ml-auto text-[10.5px] text-[var(--muted-2)]">
            Scoped to {brand.name} · {selectedCampaigns.length} campaign{selectedCampaigns.length === 1 ? "" : "s"}
          </span>
        </div>

        <SectionHead title="Spreadsheets" hint={`${containers.length} sheets`} />

        <div className="grid gap-4 pb-4 lg:grid-cols-2">
          {containers.map((d) => {
            const dRows = d.sheets.flatMap((s) => s.rows);
            const dLinked = dRows.filter((r) => r.shortcode).length;
            return (
              <div key={d.id} className="card flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[#f7faff] text-[var(--blue-deep)]">
                    <Icon name="table" size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-[14.5px] font-semibold tracking-[-0.02em]">{d.name}</div>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {d.sheets.length} sheets · {d.agency} · created {d.createdAt}
                    </div>
                  </div>
                  <Link href={`/data-ads/${d.id}`} className="btn btn-sm">
                    Open
                    <Icon name="arrowRight" size={12} />
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {d.sheets.map((s) => (
                    <span key={s.id} className="chip !h-[24px] !px-2 !text-[9px]">
                      {s.name}
                      <span className="text-[var(--muted-2)]">{s.rows.length}</span>
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-[var(--line)] bg-[#fafcff] px-3 py-2">
                    <div className="eyebrow-dim !text-[8px]">Rows</div>
                    <div className="mt-1 text-[15px] font-semibold">{fmtInt(dRows.length)}</div>
                  </div>
                  <div className="rounded-lg border border-[var(--line)] bg-[#fafcff] px-3 py-2">
                    <div className="eyebrow-dim !text-[8px]">With link</div>
                    <div className="mt-1 text-[15px] font-semibold">{dLinked}</div>
                  </div>
                  <div className="rounded-lg border border-[var(--line)] bg-[#fafcff] px-3 py-2">
                    <div className="eyebrow-dim !text-[8px]">Sheets</div>
                    <div className="mt-1 text-[15px] font-semibold">{d.sheets.length}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-[var(--line)] pt-3 text-[10.5px] text-[var(--muted-2)]">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" /> Saved {relTime(d.savedAt)}
                  </span>
                  <button
                    className="ml-auto flex items-center gap-1 text-[#b42318] hover:underline"
                    onClick={() => setDeleteTarget(d.id)}
                  >
                    <Icon name="trash" size={11} /> Delete
                  </button>
                </div>
              </div>
            );
          })}

          {containers.length === 0 && (
            <div className="card lg:col-span-2">
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
            </div>
          )}
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
