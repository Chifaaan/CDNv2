"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { fmtCompact, pct } from "@/lib/utils";
import { PROJECT_LABEL } from "@/lib/seed";
import type { Campaign, CampaignType } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { EmptyState, Field, Modal, PageHero, SectionHead, Select, StatusBadge } from "@/components/ui";
import { toast } from "@/components/Toast";

const TYPES: CampaignType[] = ["KOL", "CONNECTOR", "TROOPS", "ATTEND"];
const TYPE_LABEL: Record<CampaignType, string> = {
  KOL: "KOL",
  CONNECTOR: "Connector",
  TROOPS: "Troops",
  ATTEND: "Attend",
};

type StatusFilter = "live" | "all" | "scheduled" | "ended";

export function CampaignListView() {
  const state = useCdn();
  const router = useRouter();
  const brandId = state.ui.brandId;
  const brand = state.brands.find((b) => b.id === brandId) ?? state.brands[0];
  const [filter, setFilter] = useState<StatusFilter>("live");
  const [query, setQuery] = useState("");
  const [editTarget, setEditTarget] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupEditId, setGroupEditId] = useState<string | null>(null);

  const brandCampaigns = useMemo(
    () => state.campaigns.filter((c) => c.brandId === brandId),
    [state.campaigns, brandId],
  );
  const liveCampaigns = brandCampaigns.filter((c) => c.status === "live");
  const groups = state.groups.filter((g) => g.brandId === brandId);

  const campaigns = brandCampaigns
    .filter((c) => (filter === "all" ? true : c.status === filter))
    .filter((c) => `${c.name} ${c.agency} ${c.type}`.toLowerCase().includes(query.toLowerCase()));

  const activeId = state.ui.campaignId;
  const activeGroup = state.ui.groupId;

  function setActive(campaign: Campaign) {
    cdn.setCampaign(campaign.id);
    toast(`Active campaign · ${campaign.name}`);
    router.push("/projects/all");
  }

  function openGroup(id: string) {
    cdn.openGroup(id);
    router.push("/dashboard");
  }

  function campaignCounts(campaign: Campaign) {
    return {
      projects: state.projects.filter((p) => p.campaignId === campaign.id).length,
      dataAds: state.dataAds.filter((d) => d.campaignId === campaign.id).length,
      groups: groups.filter((g) => g.campaignIds.includes(campaign.id)).length,
    };
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
            Active campaigns for <b className="font-semibold text-[var(--ink-2)]">{brand.name}</b>. Set one as the active
            campaign, group several live campaigns for the dashboard, or edit the setup.
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
          <MiniStat label="Active campaigns" value={String(liveCampaigns.length)} hint={`${brandCampaigns.length} total campaigns`} />
          <MiniStat label="Campaign groups" value={String(groups.length)} hint="Dashboard roll-ups" />
          <MiniStat
            label="Active scope"
            value={activeGroup ? state.groups.find((g) => g.id === activeGroup)?.name ?? "—" : brandCampaigns.find((c) => c.id === activeId)?.name ?? "—"}
            hint={activeGroup ? "Group scope (dashboard)" : "Campaign scope"}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex w-fit items-center gap-1 rounded-full border border-[var(--line-2)] bg-white/80 p-1">
            {([
              ["live", "Active"],
              ["all", "All"],
              ["scheduled", "Scheduled"],
              ["ended", "Ended"],
            ] as [StatusFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] transition ${
                  filter === key ? "bg-[#0b1017] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Icon
              name="search"
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
            />
            <input
              className="field w-[220px] !pl-8"
              placeholder="Search campaign…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <span className="ml-auto text-[10.5px] text-[var(--muted-2)]">
            {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"} shown
          </span>
        </div>

        <div className="card overflow-hidden">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-[240px]">Campaign</th>
                  <th>Type</th>
                  <th>Agency</th>
                  <th>Period</th>
                  <th className="num">Organic</th>
                  <th className="num">Sheets</th>
                  <th className="num">Data Ads</th>
                  <th>Groups</th>
                  <th>Status</th>
                  <th className="w-[250px]" />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const counts = campaignCounts(c);
                  const isActive = c.id === activeId && !activeGroup;
                  return (
                    <tr key={c.id} className={isActive ? "bg-[#f3f8ff]" : undefined}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{c.name}</span>
                          {isActive && <span className="badge badge-blue !h-[18px] !text-[8.5px]">active</span>}
                        </div>
                      </td>
                      <td>
                        <span className="chip !h-[22px] !px-2 !text-[9.5px]">{TYPE_LABEL[c.type]}</span>
                      </td>
                      <td className="whitespace-nowrap text-[var(--muted)]">{c.agency}</td>
                      <td className="whitespace-nowrap text-[11px] text-[var(--muted-2)]">
                        {c.start} → {c.end}
                      </td>
                      <td className="num font-semibold">{fmtCompact(c.metrics.organic)}</td>
                      <td className="num">{counts.projects}</td>
                      <td className="num">{counts.dataAds}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {groups
                            .filter((g) => g.campaignIds.includes(c.id))
                            .map((g) => (
                              <span key={g.id} className="badge badge-neutral !h-[18px] !text-[8.5px]">
                                {g.name}
                              </span>
                            ))}
                          {counts.groups === 0 && <span className="text-[11px] text-[var(--muted-2)]">—</span>}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button className="btn btn-sm !px-2.5" onClick={() => setActive(c)}>
                            Set active
                          </button>
                          <button className="icon-btn h-[26px] w-[26px]" onClick={() => setEditTarget(c)} title="Edit campaign">
                            <Icon name="edit" size={12} />
                          </button>
                          <button
                            className="icon-btn h-[26px] w-[26px] !text-[#b42318]"
                            onClick={() => setDeleteTarget(c)}
                            title="Delete campaign"
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
          {campaigns.length === 0 && (
            <EmptyState
              icon="list"
              title="No campaign in this filter"
              body="Switch to All, or create a new campaign for this brand."
              action={
                <button className="btn btn-sm" onClick={() => setNewOpen(true)}>
                  <Icon name="plus" size={12} /> New campaign
                </button>
              }
            />
          )}
        </div>

        <SectionHead
          className="mt-8"
          title="Campaign grouping"
          hint={`${groups.length} group${groups.length === 1 ? "" : "s"} · dashboard roll-up`}
          right={
            <button className="btn btn-sm" onClick={() => { setGroupEditId(null); setGroupOpen(true); }}>
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
            const on = activeGroup === g.id;
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
                  <span className="badge badge-neutral">{members.length} campaigns</span>
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
                      <span className="dot" style={{ background: m.status === "live" ? "#12b76a" : "#94a3b8" }} />
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
                body="Group two or more live campaigns to read their performance together on the dashboard."
                action={
                  <button className="btn btn-sm" onClick={() => { setGroupEditId(null); setGroupOpen(true); }}>
                    <Icon name="plus" size={12} /> Create group
                  </button>
                }
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
        key={groupEditId ?? "new-group"}
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        groupId={groupEditId}
        onCreated={(id) => {
          cdn.openGroup(id);
          toast("Group created · dashboard scoped to it");
          router.push("/dashboard");
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
  const [type, setType] = useState<CampaignType>(campaign?.type ?? "KOL");
  const [agency, setAgency] = useState(campaign?.agency ?? brand?.agencies[0] ?? "");
  const [start, setStart] = useState(campaign?.start ?? "2026-11-01");
  const [end, setEnd] = useState(campaign?.end ?? "2026-12-31");
  const [status, setStatus] = useState<Campaign["status"]>(campaign?.status ?? "live");

  function submit() {
    if (!name.trim()) {
      toast("Campaign name is required", "err");
      return;
    }
    if (campaign) {
      cdn.updateCampaign(campaign.id, { name: name.trim(), type, agency, start, end, status });
      toast(`Campaign updated · ${name.trim()}`);
    } else {
      const created = cdn.addCampaign({ brandId, name: name.trim(), type, agency, start, end, status });
      cdn.setCampaign(created.id);
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
          <Field label="Campaign type">
            <Select
              value={type}
              onChange={(v) => setType(v as CampaignType)}
              options={TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
              className="w-full"
            />
          </Field>
          <Field label="Agency">
            <Select
              value={agency}
              onChange={setAgency}
              options={(brand?.agencies ?? []).map((a) => ({ value: a, label: a }))}
              className="w-full"
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Start date">
            <input className="field w-full" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End date">
            <input className="field w-full" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select
              value={status}
              onChange={(v) => setStatus(v as Campaign["status"])}
              options={[
                { value: "live", label: "Live" },
                { value: "scheduled", label: "Scheduled" },
                { value: "ended", label: "Ended" },
              ]}
              className="w-full"
            />
          </Field>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[#fafcff] p-3 text-[11.5px] leading-5 text-[var(--muted)]">
          Brand <b className="text-[var(--ink-2)]">{brand.name}</b> · only <b>live</b> campaigns can be added to a group.
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
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string | null;
  onCreated?: (id: string) => void;
}) {
  const state = useCdn();
  const brandId = state.ui.brandId;
  const group = groupId ? state.groups.find((g) => g.id === groupId) : undefined;
  const live = state.campaigns.filter((c) => c.brandId === brandId && (c.status === "live" || group?.campaignIds.includes(c.id)));
  const [name, setName] = useState(group?.name ?? "");
  const [desc, setDesc] = useState(group?.description ?? "");
  const [picked, setPicked] = useState<string[]>(group?.campaignIds ?? []);

  function submit() {
    if (!name.trim() || picked.length < 2) {
      toast("Name and at least two live campaigns are required", "err");
      return;
    }
    if (group) {
      cdn.updateGroup(group.id, { name: name.trim(), description: desc.trim() || "Custom dashboard group.", campaignIds: picked });
      toast(`Group updated · ${picked.length} campaigns`);
    } else {
      const created = cdn.addGroup({
        brandId,
        name: name.trim(),
        description: desc.trim() || "Custom dashboard group.",
        campaignIds: picked,
      });
      onCreated?.(created.id);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Dashboard scope"
      title={group ? "Edit campaign group" : "New campaign group"}
      subtitle="A group combines the data of the selected live campaigns into one dashboard."
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
          <div className="eyebrow-dim mb-2">Live campaigns · {picked.length} selected</div>
          <div className="max-h-[240px] overflow-y-auto rounded-xl border border-[var(--line)]">
            {live.map((c) => {
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
                    {TYPE_LABEL[c.type]}
                  </span>
                </label>
              );
            })}
            {live.length === 0 && (
              <div className="px-3 py-4 text-center text-[11px] text-[var(--muted-2)]">No live campaign found</div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
