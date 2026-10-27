"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { fmtCompact, pct } from "@/lib/utils";
import { PROJECT_LABEL, brandStyle } from "@/lib/seed";
import type { Campaign, ProjectType } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { EmptyState, Field, Modal, PageHero, SectionHead, Select } from "@/components/ui";
import { toast } from "@/components/Toast";

const PROJECT_ORDER: ProjectType[] = ["KOL", "CONNECTOR", "KOL_ADS", "TROOPS"];
const TYPE_COLOR: Record<ProjectType, string> = {
  KOL: "#ef7f24",
  CONNECTOR: "#ec4b8b",
  KOL_ADS: "#0e9c8c",
  TROOPS: "#64748b",
};

function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function CampaignListView() {
  const state = useCdn();
  const router = useRouter();
  const brandId = state.ui.brandId;
  const brand = state.brands.find((b) => b.id === brandId) ?? state.brands[0];
  const selected = state.ui.campaignIds;
  const [query, setQuery] = useState("");
  const [editTarget, setEditTarget] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupEditId, setGroupEditId] = useState<string | null>(null);
  const [groupSeed, setGroupSeed] = useState<string[]>([]);

  const brandCampaigns = useMemo(
    () => state.campaigns.filter((c) => c.brandId === brandId),
    [state.campaigns, brandId],
  );
  const campaigns = brandCampaigns.filter((c) =>
    `${c.name} ${c.agency}`.toLowerCase().includes(query.toLowerCase()),
  );
  const groups = state.groups.filter((g) => g.brandId === brandId);
  const activeGroup = state.ui.groupId ? state.groups.find((g) => g.id === state.ui.groupId) : null;

  const selectedCampaigns = brandCampaigns.filter((c) => selected.includes(c.id));

  function counts(campaign: Campaign) {
    return {
      projects: state.projects.filter((p) => p.campaignId === campaign.id).length,
      dataAds: state.dataAds.filter((d) => d.campaignId === campaign.id).length,
      groups: groups.filter((g) => g.campaignIds.includes(campaign.id)).length,
      types: [
        ...new Set(state.projects.filter((p) => p.campaignId === campaign.id).map((p) => p.type)),
      ].sort((a, b) => PROJECT_ORDER.indexOf(a) - PROJECT_ORDER.indexOf(b)),
    };
  }

  function toggle(id: string) {
    cdn.toggleCampaign(id);
  }

  function openProjects(ids: string[]) {
    if (!ids.length) return;
    cdn.setCampaignSelection(ids);
    router.push("/projects/all");
  }

  function openGroup(id: string) {
    cdn.openGroup(id);
    router.push("/dashboard");
  }

  function deleteImpact(campaign: Campaign) {
    return {
      projects: state.projects.filter((p) => p.campaignId === campaign.id).length,
      dataAds: state.dataAds.filter((d) => d.campaignId === campaign.id).length,
      groups: groups.filter((g) => g.campaignIds.includes(campaign.id)).length,
      automation: state.automation.filter((r) => r.campaignId === campaign.id).length,
    };
  }

  return (
    <>
      <PageHero
        eyebrow="Campaign · Spektrum setup"
        title="Campaign list"
        sub={
          <>
            Semua campaign <b className="font-semibold text-[var(--ink-2)]">{brand.name}</b>. Klik kartu untuk memilih;
            pilihan bisa lebih dari satu dan langsung dipakai sebagai filter Project list dan Data Ads.
          </>
        }
        actions={
          <button className="btn btn-dark" onClick={() => setNewOpen(true)}>
            <Icon name="plus" size={13} />
            New campaign
          </button>
        }
      />

      <div className="relative z-[1] px-9 pt-5">
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <MiniStat label="Campaigns" value={String(brandCampaigns.length)} hint={`${groups.length} campaign groups`} />
          <MiniStat
            label="Selected"
            value={String(selectedCampaigns.length)}
            hint={selectedCampaigns.length > 1 ? "Multi-campaign filter" : "Single campaign filter"}
          />
          <MiniStat
            label="Scope"
            value={activeGroup ? activeGroup.name : `${selectedCampaigns.length} campaign${selectedCampaigns.length === 1 ? "" : "s"}`}
            hint={activeGroup ? "Dashboard group" : "Project list & Data Ads"}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Icon
              name="search"
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
            />
            <input
              className="field w-[230px] !pl-8"
              placeholder="Search campaign…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {selectedCampaigns.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#cfe0ff] bg-[#f3f8ff] px-3 py-1.5">
              <span className="text-[11px] font-semibold text-[#2b4a7a]">
                {selectedCampaigns.length} selected
              </span>
              <button className="btn btn-sm" onClick={() => openProjects(selected)}>
                Open project list
                <Icon name="arrowRight" size={11} />
              </button>
              <button
                className="btn btn-sm"
                disabled={selectedCampaigns.length < 2}
                title={selectedCampaigns.length < 2 ? "Select at least two campaigns" : "Group the selected campaigns"}
                onClick={() => {
                  setGroupEditId(null);
                  setGroupSeed(selected);
                  setGroupOpen(true);
                }}
              >
                <Icon name="group" size={11} />
                Group selected
              </button>
              <button
                className="text-[10.5px] text-[var(--muted)] underline-offset-2 hover:underline"
                onClick={() => cdn.setCampaignSelection([selected[0]])}
              >
                Clear
              </button>
            </div>
          )}

          <span className="ml-auto text-[10.5px] text-[var(--muted-2)]">
            {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid gap-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => {
            const info = counts(c);
            const on = selected.includes(c.id);
            const s = brandStyle(brand?.hue ?? 210);
            return (
              <div
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`card group flex cursor-pointer flex-col p-5 transition-all duration-200 ${
                  on ? "ring-2 ring-[#9cc3ff]" : "hover:-translate-y-[2px]"
                }`}
                role="button"
                aria-pressed={on}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="brand-avatar"
                    style={{
                      width: 44,
                      height: 44,
                      background: s.bg,
                      color: s.fg,
                      boxShadow: `0 0 0 1px ${s.ring} inset`,
                      borderRadius: 14,
                      fontSize: 14,
                    }}
                  >
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15.5px] font-semibold tracking-[-0.02em]">{c.name}</div>
                    <div className="mt-0.5 truncate text-[11.5px] text-[var(--muted)]">
                      {c.agency} · {c.start} → {c.end}
                    </div>
                  </div>
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                      on ? "border-[#2f6bff] bg-[#2f6bff] text-white" : "border-[var(--line-3)] bg-white text-transparent"
                    }`}
                    title={on ? "Selected" : "Select campaign"}
                  >
                    <Icon name="check" size={12} />
                  </span>
                </div>

                <div className="mt-3 flex min-h-[26px] flex-wrap gap-1.5">
                  {info.types.map((t) => (
                    <span key={t} className="chip !h-[24px] !gap-1.5 !px-2 !text-[8.5px]">
                      <span className="dot" style={{ background: TYPE_COLOR[t] }} />
                      {PROJECT_LABEL[t]}
                    </span>
                  ))}
                  {info.types.length === 0 && (
                    <span className="text-[11px] text-[var(--muted-2)]">No project sheet yet</span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-3 text-[10.5px] text-[var(--muted-2)]">
                  <span className="flex items-center gap-1.5">
                    <Icon name="projects" size={12} /> {info.projects} sheet{info.projects === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon name="table" size={12} /> {info.dataAds} Data Ads
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon name="group" size={12} /> {info.groups} group{info.groups === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-4">
                  <button
                    className="btn btn-primary flex-1 !justify-between"
                    onClick={(e) => {
                      e.stopPropagation();
                      openProjects([c.id]);
                    }}
                  >
                    <span>Open project list</span>
                    <Icon name="arrowRight" size={13} />
                  </button>
                  <button
                    className="icon-btn"
                    title="Edit campaign"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditTarget(c);
                    }}
                  >
                    <Icon name="edit" size={13} />
                  </button>
                  <button
                    className="icon-btn !text-[#b42318]"
                    title="Delete campaign"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(c);
                    }}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          <div className="card-flat flex min-h-[220px] flex-col items-center justify-center gap-2 border-dashed p-6 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line-2)] bg-white text-[var(--muted-2)]">
              <Icon name="plus" size={16} />
            </span>
            <div className="text-[12.5px] font-medium">New campaign</div>
            <div className="max-w-[220px] text-[11px] leading-5 text-[var(--muted-2)]">
              Campaign setup is handled by Spektrum.
            </div>
          </div>
        </div>

        {campaigns.length === 0 && (
          <div className="card">
            <EmptyState
              icon="list"
              title="No campaign found"
              body="Try another search, or create a new campaign for this brand."
              action={
                <button className="btn btn-sm" onClick={() => setNewOpen(true)}>
                  <Icon name="plus" size={12} /> New campaign
                </button>
              }
            />
          </div>
        )}

        <SectionHead
          className="mt-6"
          title="Campaign grouping"
          hint={`${groups.length} group${groups.length === 1 ? "" : "s"} · dashboard roll-up`}
          right={
            <button
              className="btn btn-sm"
              onClick={() => {
                setGroupEditId(null);
                setGroupSeed(selectedCampaigns.length >= 2 ? selected : []);
                setGroupOpen(true);
              }}
            >
              <Icon name="plus" size={12} />
              New group
            </button>
          }
        />

        <div className="grid gap-4 pb-4 lg:grid-cols-2">
          {groups.map((g) => {
            const members = state.campaigns.filter((c) => g.campaignIds.includes(c.id));
            const organic = members.reduce((a, c) => a + c.metrics.organic, 0);
            const engagement = members.reduce((a, c) => a + c.metrics.engagement, 0);
            const on = activeGroup?.id === g.id;
            return (
              <div key={g.id} className={`card p-5 ${on ? "ring-1 ring-[#b9d3ff]" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold tracking-[-0.02em]">{g.name}</span>
                      {on && <span className="badge badge-blue">dashboard scope</span>}
                    </div>
                    <p className="mt-1 max-w-[360px] text-[11.5px] leading-5 text-[var(--muted)]">{g.description}</p>
                  </div>
                  <span className="badge badge-neutral">
                    {members.length} campaign{members.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-[var(--line)] bg-[#fafcff] p-3">
                  <div>
                    <div className="eyebrow-dim !text-[8.5px]">Organic</div>
                    <div className="metric-sm mt-1">{fmtCompact(organic)}</div>
                  </div>
                  <div>
                    <div className="eyebrow-dim !text-[8.5px]">Engagement</div>
                    <div className="metric-sm mt-1">{fmtCompact(engagement)}</div>
                  </div>
                  <div>
                    <div className="eyebrow-dim !text-[8.5px]">Avg ER</div>
                    <div className="metric-sm mt-1">{pct(organic ? engagement / organic : 0)}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {members.map((m) => (
                    <span key={m.id} className="chip !h-[24px] !px-2 !text-[9px]">
                      <span className="dot bg-[#2f6bff]" />
                      {m.name}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button className="btn btn-primary flex-1 !justify-between" onClick={() => openGroup(g.id)}>
                    <span>Open dashboard</span>
                    <Icon name="arrowRight" size={13} />
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setGroupEditId(g.id);
                      setGroupSeed([]);
                      setGroupOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="icon-btn h-[33px] w-[33px] !text-[#b42318]"
                    title="Delete group"
                    onClick={() => {
                      cdn.deleteGroup(g.id);
                      toast("Campaign group deleted");
                    }}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {groups.length === 0 && (
            <div className="card lg:col-span-2">
              <EmptyState
                icon="group"
                title="No campaign group yet"
                body="Select two or more campaigns, then use Group selected to read them together on one dashboard."
              />
            </div>
          )}
        </div>
      </div>

      <CampaignFormModal key="new-campaign" open={newOpen} onClose={() => setNewOpen(false)} />
      <CampaignFormModal
        key={editTarget?.id ?? "edit"}
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        campaign={editTarget ?? undefined}
      />
      <DeleteCampaignModal
        campaign={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        impact={deleteTarget ? deleteImpact(deleteTarget) : null}
      />
      <GroupFormModal
        key={`${groupEditId ?? "new"}-${groupSeed.join(",")}-${groupOpen}`}
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        groupId={groupEditId}
        seed={groupSeed}
        onCreated={() => {
          toast("Campaign group created");
        }}
      />
    </>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="eyebrow-dim !text-[9px]">{label}</div>
      <div className="metric-sm mt-1.5 truncate">{value}</div>
      <div className="mt-1 text-[10.5px] text-[var(--muted-2)]">{hint}</div>
    </div>
  );
}

function CampaignFormModal({
  open,
  onClose,
  campaign,
}: {
  open: boolean;
  onClose: () => void;
  campaign?: Campaign;
}) {
  const state = useCdn();
  const brandId = state.ui.brandId;
  const brand = state.brands.find((b) => b.id === brandId) ?? state.brands[0];
  const [name, setName] = useState(campaign?.name ?? "");
  const [agency, setAgency] = useState(campaign?.agency ?? brand?.agencies[0] ?? "");
  const [start, setStart] = useState(campaign?.start ?? "2026-11-01");
  const [end, setEnd] = useState(campaign?.end ?? "2026-12-31");

  function submit() {
    if (!name.trim()) {
      toast("Campaign name is required", "err");
      return;
    }
    if (campaign) {
      cdn.updateCampaign(campaign.id, { name: name.trim(), agency, start, end });
      toast(`Campaign updated · ${name.trim()}`);
    } else {
      const created = cdn.addCampaign({ brandId, name: name.trim(), agency, start, end });
      cdn.setCampaignSelection([created.id]);
      toast(`Campaign created · ${name.trim()}`);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={campaign ? "Edit campaign" : "Spektrum setup"}
      title={campaign ? "Edit campaign" : "New campaign"}
      subtitle="Campaigns are the anchor for project sheets, Data Ads and automation matching."
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-dark" onClick={submit}>
            {campaign ? "Save changes" : "Create campaign"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Campaign name">
          <input
            className="field w-full"
            autoFocus
            value={name}
            placeholder="e.g. Ramadan Glow 2027"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Agency">
            <Select
              value={agency}
              onChange={setAgency}
              options={(brand?.agencies ?? []).map((a) => ({ value: a, label: a }))}
              className="w-full"
            />
          </Field>
          <Field label="Period">
            <div className="grid grid-cols-2 gap-2">
              <input className="field w-full" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              <input className="field w-full" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </Field>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[#fafcff] p-3 text-[11.5px] leading-5 text-[var(--muted)]">
          Brand <b className="text-[var(--ink-2)]">{brand.name}</b> · pilih beberapa campaign di halaman ini untuk
          membuat group dashboard.
        </div>
      </div>
    </Modal>
  );
}

function DeleteCampaignModal({
  campaign,
  onClose,
  impact,
}: {
  campaign: Campaign | null;
  onClose: () => void;
  impact: { projects: number; dataAds: number; groups: number; automation: number } | null;
}) {
  if (!campaign || !impact) return null;
  return (
    <Modal
      open={Boolean(campaign)}
      onClose={onClose}
      eyebrow="Delete campaign"
      title={`Delete “${campaign.name}”?`}
      subtitle="This cannot be undone in the prototype."
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn !border-[#f6c9c5] !bg-[#d92d20] !text-white"
            onClick={() => {
              cdn.deleteCampaign(campaign.id);
              toast(`Campaign deleted · ${campaign.name}`);
              onClose();
            }}
          >
            <Icon name="trash" size={13} />
            Delete campaign
          </button>
        </>
      }
    >
      <div className="grid gap-2 rounded-xl border border-[#f6c9c5] bg-[#fdf3f2] p-4 text-[11.5px] leading-5 text-[#7a271a]">
        <div className="font-semibold">This also removes:</div>
        <ul className="space-y-1">
          <li>· {impact.projects} project sheet(s) and all their rows</li>
          <li>· {impact.dataAds} Data Ads container(s) and all their sheets</li>
          <li>· membership in {impact.groups} campaign group(s)</li>
          <li>· {impact.automation} automation row(s) will be unlinked (data kept)</li>
        </ul>
      </div>
    </Modal>
  );
}

function GroupFormModal({
  open,
  onClose,
  groupId,
  seed,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string | null;
  seed: string[];
  onCreated?: () => void;
}) {
  const state = useCdn();
  const brandId = state.ui.brandId;
  const group = groupId ? state.groups.find((g) => g.id === groupId) : undefined;
  const campaigns = state.campaigns.filter((c) => c.brandId === brandId);
  const [name, setName] = useState(group?.name ?? "");
  const [desc, setDesc] = useState(group?.description ?? "");
  const [picked, setPicked] = useState<string[]>(group?.campaignIds ?? seed);

  function submit() {
    if (!name.trim() || picked.length < 2) {
      toast("Name and at least two campaigns are required", "err");
      return;
    }
    if (group) {
      cdn.updateGroup(group.id, { name: name.trim(), description: desc.trim() || "Custom dashboard group.", campaignIds: picked });
      toast(`Group updated · ${picked.length} campaigns`);
    } else {
      cdn.addGroup({
        brandId,
        name: name.trim(),
        description: desc.trim() || "Custom dashboard group.",
        campaignIds: picked,
      });
      onCreated?.();
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Dashboard scope"
      title={group ? "Edit campaign group" : "New campaign group"}
      subtitle="A group combines the data of the selected campaigns into one dashboard."
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-dark" onClick={submit}>
            {group ? "Save group" : "Create group"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Group name">
          <input className="field w-full" autoFocus value={name} placeholder="e.g. Q4 Payday cluster" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description">
          <input className="field w-full" value={desc} placeholder="Short note for the team" onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <div>
          <div className="eyebrow-dim mb-2">Campaigns · {picked.length} selected</div>
          <div className="max-h-[240px] overflow-y-auto rounded-xl border border-[var(--line)]">
            {campaigns.map((c) => {
              const on = picked.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-2.5 border-b border-[var(--line)] px-3 py-2.5 text-[12px] last:border-0 ${
                    on ? "bg-[#f3f8ff]" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setPicked((p) => (on ? p.filter((id) => id !== c.id) : [...p, c.id]))}
                    className="accent-[var(--blue)]"
                  />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="shrink-0 text-[9.5px] uppercase tracking-[0.06em] text-[var(--muted-2)]">
                    {c.agency}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
