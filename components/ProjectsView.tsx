"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { fmtInt, pct } from "@/lib/utils";
import { PROJECT_LABEL, PROJECT_SLUG } from "@/lib/seed";
import { isRowComplete, resolveColumns, templatesForType } from "@/lib/sheet";
import type { ProjectType } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Bar, BrandAvatar, CopyButton, EmptyState, Field, Modal, PageHero, SectionHead, Select } from "@/components/ui";
import { toast } from "@/components/Toast";

const ORDER: ProjectType[] = ["KOL", "CONNECTOR", "KOL_ADS", "TROOPS"];

export function ProjectsView({ initialType }: { initialType?: ProjectType | "ALL" }) {
  const state = useCdn();
  const router = useRouter();
  const brandId = state.ui.brandId;
  const brand = state.brands.find((b) => b.id === brandId) ?? state.brands[0];
  const selectedCampaigns = state.campaigns.filter(
    (c) => c.brandId === brandId && state.ui.campaignIds.includes(c.id),
  );
  const singleCampaign = selectedCampaigns.length === 1 ? selectedCampaigns[0] : undefined;
  const [type, setType] = useState<ProjectType | "ALL">(initialType ?? "ALL");
  const [query, setQuery] = useState("");
  const [agency, setAgency] = useState("all");
  const [openNew, setOpenNew] = useState(false);
  const [sort, setSort] = useState<{
    key: "type" | "agency" | "rows" | "complete" | "created" | "lastSaved";
    dir: "asc" | "desc";
  }>({ key: "lastSaved", dir: "desc" });

  const scope = useMemo(
    () =>
      state.projects.filter(
        (p) =>
          p.brandId === brandId &&
          state.ui.campaignIds.includes(p.campaignId) &&
          (type === "ALL" || p.type === type),
      ),
    [state.projects, brandId, state.ui.campaignIds, type],
  );

  const projects = scope
    .filter((p) => (agency === "all" ? true : p.agency === agency))
    .filter((p) => `${p.agency} ${p.pmLink} ${PROJECT_LABEL[p.type]}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const completeOf = (p: (typeof scope)[number]) =>
        p.rows.length
          ? p.rows.filter((r) => isRowComplete(r, resolveColumns(templatesForType(p.type), p.columns))).length /
            p.rows.length
          : 0;
      switch (sort.key) {
        case "type":
          return (ORDER.indexOf(a.type) - ORDER.indexOf(b.type)) * dir;
        case "agency":
          return a.agency.localeCompare(b.agency) * dir;
        case "rows":
          return (a.rows.length - b.rows.length) * dir;
        case "complete":
          return (completeOf(a) - completeOf(b)) * dir;
        case "created":
          return a.createdAt.localeCompare(b.createdAt) * dir;
        case "lastSaved":
        default:
          return a.savedAt.localeCompare(b.savedAt) * dir;
      }
    });

  function toggleSort(key: typeof sort.key) {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  }

  function SortTh({
    sortKey,
    label,
    className = "",
  }: {
    sortKey: typeof sort.key;
    label: string;
    className?: string;
  }) {
    const active = sort.key === sortKey;
    return (
      <th className={className}>
        <button
          onClick={() => toggleSort(sortKey)}
          className={`inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.13em] ${
            active ? "text-[var(--ink)]" : "text-[var(--muted-2)]"
          }`}
          title={`Sort by ${label}`}
        >
          {label}
          <Icon
            name="chevronDown"
            size={10}
            className={`transition-transform ${active ? (sort.dir === "asc" ? "rotate-180" : "") : "opacity-30"}`}
          />
        </button>
      </th>
    );
  }

  const rows = scope.flatMap((p) => p.rows);
  const complete = scope
    .flatMap((p) =>
      p.rows.map((r) => isRowComplete(r, resolveColumns(templatesForType(p.type), p.columns))),
    )
    .filter(Boolean).length;
  const withLink = rows.filter((r) => r.shortcode).length;
  const dataAdsCount = state.dataAds.filter(
    (d) => d.brandId === brandId && state.ui.campaignIds.includes(d.campaignId),
  ).length;

  const counts = ORDER.reduce<Record<string, number>>((acc, t) => {
    acc[t] = state.projects.filter(
      (p) =>
        p.brandId === brandId &&
        state.ui.campaignIds.includes(p.campaignId) &&
        p.type === t,
    ).length;
    return acc;
  }, {});
  const allCount = ORDER.reduce((sum, t) => sum + counts[t], 0);

  return (
    <>
      <PageHero
        eyebrow="Project list · All projects"
        title="Project list"
        sub={
          <>
            {selectedCampaigns.length === 1 ? (
              <>
                Sheets for <b className="font-semibold text-[var(--ink-2)]">{selectedCampaigns[0].name}</b> at{" "}
                {brand.name}.
              </>
            ) : (
              <>
                Sheets for <b className="font-semibold text-[var(--ink-2)]">{selectedCampaigns.length} selected campaigns</b>{" "}
                at {brand.name}.
              </>
            )}{" "}
            Every sheet publishes its own PM link; required columns are green, optional columns are blue.
          </>
        }
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => router.push("/data-ads")}>
              <Icon name="table" size={13} />
              Data Ads
            </button>
            <button
              className="btn btn-dark"
              disabled={!singleCampaign}
              title={singleCampaign ? "Create a project sheet" : "Select exactly one campaign to create a project"}
              onClick={() => setOpenNew(true)}
            >
              <Icon name="plus" size={13} />
              New project
            </button>
          </>
        }
      />

      <div className="relative z-[1] px-9 pt-5">
        <div className="mb-5 flex w-fit max-w-full flex-wrap items-center gap-1 rounded-full border border-[var(--line-2)] bg-white/80 p-1">
          <button
            onClick={() => setType("ALL")}
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] transition ${
              type === "ALL" ? "bg-[#0b1017] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            All projects
            <span className={type === "ALL" ? "opacity-60" : "text-[var(--muted-2)]"}>{allCount}</span>
          </button>
          {ORDER.map((t) => {
            const on = t === type;
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] transition ${
                  on ? "bg-[#0b1017] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {PROJECT_LABEL[t]}
                <span className={on ? "opacity-60" : "text-[var(--muted-2)]"}>{counts[t]}</span>
              </button>
            );
          })}
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            label="Sheets"
            value={String(scope.length)}
            hint={`${type === "ALL" ? "All types" : PROJECT_LABEL[type]} · ${selectedCampaigns.length} campaign${selectedCampaigns.length === 1 ? "" : "s"}`}
          />
          <MiniStat label="Rows collected" value={fmtInt(rows.length)} hint={`${withLink} rows carry a publish link`} />
          <MiniStat
            label="Complete rows"
            value={pct(rows.length ? complete / rows.length : 0)}
            hint={`${rows.length - complete} rows missing required columns`}
            accent={complete === rows.length ? "ok" : "warn"}
          />
          <MiniStat label="Data Ads" value={String(dataAdsCount)} hint="Spreadsheets in this scope" />
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
              placeholder="Search agency, type or PM link…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            value={agency}
            onChange={setAgency}
            options={[
              { value: "all", label: "All agencies" },
              ...brand.agencies.map((a) => ({ value: a, label: a })),
            ]}
          />
          <span className="ml-auto flex items-center gap-3 text-[10.5px] text-[var(--muted-2)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#12b76a]" /> required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#2f6bff]" /> optional
            </span>
          </span>
        </div>

        <SectionHead
          title={`${projects.length} sheet${projects.length === 1 ? "" : "s"}`}
          hint={`${new Set(projects.map((p) => p.agency)).size} agencies`}
        />

        <div className="card overflow-hidden">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-[220px]">PM link</th>
                  <SortTh sortKey="type" label="Type" />
                  <SortTh sortKey="agency" label="Agency" />
                  <SortTh sortKey="rows" label="Rows" className="num" />
                  <SortTh sortKey="complete" label="Complete" className="w-[150px]" />
                  <SortTh sortKey="created" label="Created" />
                  <SortTh sortKey="lastSaved" label="Last saved" />
                  <th className="w-[70px]" />
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const filled = p.rows.filter((r) =>
                    isRowComplete(r, resolveColumns(templatesForType(p.type), p.columns)),
                  ).length;
                  const slug = p.pmLink.split("/pm/")[1] ?? p.id;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/projects/ts/${p.id}`}
                            className="mono truncate text-[10.5px] text-[var(--blue-deep)] hover:underline"
                          >
                            /pm/{slug}
                          </Link>
                          <CopyButton value={p.pmLink} label="PM link" compact />
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{PROJECT_LABEL[p.type]}</span>
                      </td>
                      <td className="whitespace-nowrap text-[var(--muted)]">{p.agency}</td>
                      <td className="num font-semibold">{p.rows.length}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Bar
                            value={p.rows.length ? filled / p.rows.length : 0}
                            color={filled === p.rows.length ? "#12b76a" : "#f79009"}
                          />
                          <span className="w-9 shrink-0 text-right text-[10.5px] text-[var(--muted-2)]">
                            {filled}/{p.rows.length}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-[11px] text-[var(--muted-2)]">{p.createdAt}</td>
                      <td className="whitespace-nowrap text-[11px] text-[var(--muted-2)]">
                        {new Date(p.savedAt).toLocaleDateString("en-US")}
                      </td>
                      <td>
                        <Link
                          href={`/projects/ts/${p.id}`}
                          className="text-[11px] font-medium text-[var(--blue-deep)] hover:underline"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {projects.length === 0 && (
            <EmptyState
              icon="projects"
              title="No sheet in this filter"
              body="Create a project sheet to publish a PM link for the agency."
              action={
                <button className="btn btn-sm" onClick={() => setOpenNew(true)}>
                  <Icon name="plus" size={12} /> New project
                </button>
              }
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#cfe0ff] bg-[#f3f8ff] px-4 py-3 text-[11.5px] leading-5 text-[#2b4a7a]">
          <Icon name="info" size={14} className="shrink-0" />
          <span>
            <b>Required columns</b> are green and marked with <b>*</b>. Each project type has its own template (KOL,
            Connector, Troops, KOL Ads) and the layout can be adjusted per sheet via <b>Columns</b>.
          </span>
        </div>
      </div>

      <NewProjectModal
        key={openNew ? "open" : "closed"}
        open={openNew}
        onClose={() => setOpenNew(false)}
        defaultType={type === "ALL" ? "KOL" : type}
      />
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

function NewProjectModal({
  open,
  onClose,
  defaultType,
}: {
  open: boolean;
  onClose: () => void;
  defaultType: ProjectType;
}) {
  const state = useCdn();
  const router = useRouter();
  const brandId = state.ui.brandId;
  const brand = state.brands.find((b) => b.id === brandId) ?? state.brands[0];
  const campaign =
    state.ui.campaignIds.length === 1
      ? state.campaigns.find((c) => c.id === state.ui.campaignIds[0])
      : undefined;
  const [type, setType] = useState<ProjectType>(defaultType);
  const [agency, setAgency] = useState(brand?.agencies[0] ?? "");

  function submit() {
    if (!campaign) {
      toast("Pick a campaign first", "err");
      return;
    }
    const project = cdn.addProject({ brandId, campaignId: campaign.id, type, agency });
    toast("PM link published · project sheet ready");
    onClose();
    router.push(`/projects/ts/${project.id}`);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="PM link"
      title="New project"
      subtitle="Brand and campaign follow the active scope. The sheet template follows the project type."
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-dark" onClick={submit}>
            Publish PM link
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
          <span className="chip !h-[28px] !px-2.5">
            <span className="dot" style={{ background: "#2f6bff" }} />
            {campaign?.name ?? "—"}
          </span>
          <span className="ml-auto text-[10px] text-[var(--muted-2)]">fixed by the active scope</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Project type">
            <Select
              value={type}
              onChange={(v) => setType(v as ProjectType)}
              options={ORDER.map((t) => ({ value: t, label: PROJECT_LABEL[t] }))}
              className="w-full"
            />
          </Field>
          <Field label="Agency">
            <Select
              value={agency}
              onChange={setAgency}
              options={brand.agencies.map((a) => ({ value: a, label: a }))}
              className="w-full"
            />
          </Field>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[#fafcff] p-3">
          <div className="eyebrow-dim !text-[8.5px]">Sheet columns · {PROJECT_LABEL[type]} template</div>
          <div className="mt-1.5 text-[11px] leading-5 text-[var(--muted)]">
            {templatesForType(type).map((c) => (
              <span key={c.key} className={c.required ? "font-semibold text-[#05603a]" : "text-[#23477f]"}>
                {c.label}
                {c.required ? " *" : ""}
                {" · "}
              </span>
            ))}
          </div>
          <div className="mt-1.5 text-[10px] text-[var(--muted-2)]">
            The layout can be changed per sheet from the Columns button — this is the default template.
          </div>
        </div>
      </div>
    </Modal>
  );
}
