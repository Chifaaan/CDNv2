"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { fmtInt } from "@/lib/utils";
import { PROJECT_LABEL } from "@/lib/seed";
import { TL_COLUMNS, isRowComplete, resolveColumns, templatesForType } from "@/lib/sheet";
import { Icon } from "@/components/Icon";
import { PageHero, SectionHead, Select } from "@/components/ui";
import { toast } from "@/components/Toast";

export default function AgencyPage() {
  const state = useCdn();
  const router = useRouter();
  const brandId = state.ui.brandId;
  const brand = state.brands.find((b) => b.id === brandId) ?? state.brands[0];
  const agencies = brand?.agencies ?? [];
  const [agency, setAgency] = useState(agencies[0] ?? "");

  useEffect(() => {
    setAgency(state.brands.find((b) => b.id === brandId)?.agencies[0] ?? "");
  }, [brandId, state.brands]);

  const projects = state.projects.filter((p) => p.brandId === brandId && p.agency === agency);
  const containers = state.dataAds.filter((d) => d.brandId === brandId && d.agency === agency);
  const projectRows = projects.flatMap((p) => p.rows);
  const adRows = containers.flatMap((d) => d.sheets.flatMap((s) => s.rows));
  const incomplete =
    projects.reduce(
      (sum, p) =>
        sum +
        p.rows.filter(
          (r) => !isRowComplete(r, resolveColumns(templatesForType(p.type), p.columns)),
        ).length,
      0,
    ) +
    containers.reduce(
      (sum, d) =>
        sum + d.sheets.reduce((s, sh) => s + sh.rows.filter((r) => !isRowComplete(r, TL_COLUMNS)).length, 0),
      0,
    );

  return (
    <>
      <PageHero
        eyebrow="Agency workspace"
        title={brand.name}
        sub={
          <>
            Workspace untuk <b className="font-semibold text-[var(--ink-2)]">{agency || "—"}</b>. Pilih agency di
            kanan untuk menampilkan sheet dan Data Ads miliknya saja.
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Select
              ariaLabel="Agency"
              value={agency}
              onChange={setAgency}
              options={agencies.map((a) => ({ value: a, label: a }))}
              className="!h-[33px]"
            />
            <button
              className="btn btn-ghost"
              onClick={() => {
                cdn.setUI({ role: "spectrum" });
                toast("Switched back to Spectrum view");
                router.push("/dashboard");
              }}
            >
              <Icon name="arrowLeft" size={13} />
              Back to Spectrum view
            </button>
          </div>
        }
      />

      <div className="relative z-[1] px-9 pt-4">
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#cfe0ff] bg-[#f3f8ff] px-4 py-2.5 text-[11.5px] text-[#2b4a7a]">
          <Icon name="info" size={14} />
          Agency role: dashboards, campaign setup and other brands are hidden. Showing{" "}
          <b>{agency || "no agency"}</b> only.
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Mini label="Project sheets" value={String(projects.length)} hint={`${projectRows.length} rows to fill`} />
          <Mini label="Data Ads" value={String(containers.length)} hint={`${adRows.length} tracker-list rows`} />
          <Mini label="Incomplete rows" value={fmtInt(incomplete)} hint="Missing required columns" accent={incomplete ? "warn" : "ok"} />
        </div>

        <div className="mt-7 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div>
            <SectionHead title="Project sheets" hint={`${projects.length} assigned`} />
            <div className="space-y-3">
              {projects.map((p) => {
                const campaign = state.campaigns.find((c) => c.id === p.campaignId);
                const complete = p.rows.filter((r) =>
                  isRowComplete(r, resolveColumns(templatesForType(p.type), p.columns)),
                ).length;
                return (
                  <Link
                    key={p.id}
                    href={`/projects/ts/${p.id}`}
                    className="card flex items-center gap-3 p-4 transition hover:-translate-y-[1px]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[#f7faff] text-[var(--blue-deep)]">
                      <Icon name="projects" size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold">{campaign?.name ?? "Untitled"}</span>
                        <span className="chip !h-[20px] !px-1.5 !text-[8.5px]">{PROJECT_LABEL[p.type]}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[10.5px] text-[var(--muted-2)]">
                        {p.agency} · {p.rows.length} rows · {complete} complete · saved {new Date(p.savedAt).toLocaleDateString("en-US")}
                      </div>
                    </div>
                    <Icon name="chevronRight" size={14} className="text-[var(--muted-2)]" />
                  </Link>
                );
              })}
              {projects.length === 0 && (
                <div className="card px-5 py-10 text-center text-[12px] text-[var(--muted-2)]">
                  No project sheet assigned yet.
                </div>
              )}
            </div>

            <SectionHead title="Data Ads" hint={`${containers.length} spreadsheets`} className="mt-7" />
            <div className="space-y-3">
              {containers.map((d) => {
                const campaign = state.campaigns.find((c) => c.id === d.campaignId);
                const rows = d.sheets.flatMap((s) => s.rows);
                return (
                  <Link
                    key={d.id}
                    href={`/data-ads/${d.id}`}
                    className="card flex items-center gap-3 p-4 transition hover:-translate-y-[1px]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[#f7faff] text-[var(--blue-deep)]">
                      <Icon name="table" size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold">{d.name}</span>
                        <span className="badge badge-neutral">{d.sheets.length} sheets</span>
                      </div>
                      <div className="mt-0.5 truncate text-[10.5px] text-[var(--muted-2)]">
                        {campaign?.name} · {rows.length} rows · saved {new Date(d.savedAt).toLocaleDateString("en-US")}
                      </div>
                    </div>
                    <Icon name="chevronRight" size={14} className="text-[var(--muted-2)]" />
                  </Link>
                );
              })}
              {containers.length === 0 && (
                <div className="card px-5 py-10 text-center text-[12px] text-[var(--muted-2)]">
                  No Data Ads assigned yet.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <div className="text-[12.5px] font-semibold">What you can do</div>
              <ul className="mt-3 space-y-2.5 text-[11.5px] leading-5 text-[var(--muted)]">
                {[
                  "Paste a block of rows from Excel or Google Sheets.",
                  "Import a CSV and map your own column order.",
                  "Remove duplicates and clear empty rows in one click.",
                  "Edit inline — links and shortcodes derive automatically.",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Icon name="check" size={13} className="mt-[3px] shrink-0 text-[#12b76a]" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-5">
              <div className="text-[12.5px] font-semibold">Not available to agencies</div>
              <ul className="mt-3 space-y-2.5 text-[11.5px] leading-5 text-[var(--muted)]">
                {["Campaign dashboard", "Campaign & brand setup", "CMS connector", "Other brands"].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Icon name="x" size={13} className="mt-[3px] shrink-0 text-[#d92d20]" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-white/70 p-4 text-[11px] leading-5 text-[var(--muted)]">
              Deadline reminders and submission notes live in the email digest — this workspace only keeps the sheets.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Mini({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: "ok" | "warn" }) {
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
