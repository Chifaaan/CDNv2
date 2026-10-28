"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { PROJECT_LABEL, brandStyle } from "@/lib/seed";
import type { Campaign, ProjectType } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { EmptyState, Field, Modal, PageHero, Select } from "@/components/ui";
import { GroupFormModal } from "@/components/GroupFormModal";
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
  const view = state.ui.campaignView ?? "cards";

  const selectedCampaigns = brandCampaigns.filter((c) => selected.includes(c.id));
  const groupedIds = new Set(groups.flatMap((g) => g.campaignIds));
  const entries = [
    ...groups
      .filter((g) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          g.name.toLowerCase().includes(q) ||
          state.campaigns.some((c) => g.campaignIds.includes(c.id) && c.name.toLowerCase().includes(q))
        );
      })
      .map((g) => ({ kind: "group" as const, name: g.name, group: g })),
    ...campaigns
      .filter((c) => !groupedIds.has(c.id))
      .map((c) => ({ kind: "campaign" as const, name: c.name, campaign: c })),
  ].sort((a, b) => a.name.localeCompare(b.name));

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
        eyebrow="Campaign · Spectrum setup"
        title="Campaign list"
        sub={
          <>
            Semua campaign <b className="font-semibold text-[var(--ink-2)]">{brand.name}</b>. Klik kartu untuk memilih;
            pilihan bisa lebih dari satu dan langsung dipakai sebagai filter Project list dan Data Ads. Campaign yang
            sudah digroup tampil sebagai kartu <b className="font-semibold text-[var(--ink-2)]">Group Campaign</b>.
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

          <div className="ml-auto flex items-center gap-2">
            <div className="seg h-[30px] !bg-white/80">
              <button
                className={`!inline-flex !h-[23px] !min-w-0 !items-center !gap-1.5 !px-2.5 !text-[10px] ${view === "cards" ? "is-on" : ""}`}
                onClick={() => cdn.setUI({ campaignView: "cards" })}
                title="Card view"
              >
                <Icon name="dashboard" size={11} />
                Cards
              </button>
              <button
                className={`!inline-flex !h-[23px] !min-w-0 !items-center !gap-1.5 !px-2.5 !text-[10px] ${view === "table" ? "is-on" : ""}`}
                onClick={() => cdn.setUI({ campaignView: "table" })}
                title="Table view"
              >
                <Icon name="table" size={11} />
                Table
              </button>
            </div>
            <span className="text-[10.5px] text-[var(--muted-2)]">
              {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {view === "cards" && (
        <div className="grid gap-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => {
            const s = brandStyle(brand?.hue ?? 210);

            if (entry.kind === "group") {
              const g = entry.group;
              const members = state.campaigns.filter((c) => g.campaignIds.includes(c.id));
              const on = members.length > 0 && members.every((m) => selected.includes(m.id));
              const projects = state.projects.filter((p) => g.campaignIds.includes(p.campaignId)).length;
              const dataAds = state.dataAds.filter((d) => g.campaignIds.includes(d.campaignId)).length;
              const dashboardScope = activeGroup?.id === g.id;
              return (
                <div
                  key={g.id}
                  onClick={() => {
                    const all = members.every((m) => selected.includes(m.id));
                    if (all) cdn.setCampaignSelection(selected.filter((id) => !g.campaignIds.includes(id)));
                    else cdn.setCampaignSelection([...new Set([...selected, ...g.campaignIds])]);
                  }}
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
                      <Icon name="group" size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-blue !h-[18px] !text-[8.5px]">group campaign</span>
                        {dashboardScope && <span className="badge badge-neutral !h-[18px] !text-[8.5px]">dashboard scope</span>}
                      </div>
                      <div className="mt-1 truncate text-[15.5px] font-semibold tracking-[-0.02em]">{g.name}</div>
                      <div className="mt-0.5 truncate text-[11.5px] text-[var(--muted)]">
                        {members.length} campaigns · {new Set(members.map((m) => m.agency)).size} agencies
                      </div>
                    </div>
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                        on ? "border-[#2f6bff] bg-[#2f6bff] text-white" : "border-[var(--line-3)] bg-white text-transparent"
                      }`}
                      title={on ? "Selected" : "Select all group campaigns"}
                    >
                      <Icon name="check" size={12} />
                    </span>
                  </div>

                  <div className="mt-3 flex min-h-[26px] flex-wrap gap-1.5">
                    {members.map((m) => (
                      <span key={m.id} className="chip !h-[24px] !gap-1.5 !px-2 !text-[8.5px]">
                        <span className="dot bg-[#2f6bff]" />
                        {m.name}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-3 text-[10.5px] text-[var(--muted-2)]">
                    <span className="flex items-center gap-1.5">
                      <Icon name="projects" size={12} /> {projects} sheet{projects === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="table" size={12} /> {dataAds} Data Ads
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="group" size={12} /> {members.length} campaigns
                    </span>
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <button
                      className="btn btn-primary flex-1 !justify-between"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGroup(g.id);
                      }}
                    >
                      <span>Open dashboard</span>
                      <Icon name="arrowRight" size={13} />
                    </button>
                    <button
                      className="icon-btn"
                      title="Open project list"
                      onClick={(e) => {
                        e.stopPropagation();
                        openProjects(g.campaignIds);
                      }}
                    >
                      <Icon name="projects" size={13} />
                    </button>
                    <button
                      className="icon-btn"
                      title="Edit group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGroupEditId(g.id);
                        setGroupSeed([]);
                        setGroupOpen(true);
                      }}
                    >
                      <Icon name="edit" size={13} />
                    </button>
                    <button
                      className="icon-btn !text-[#b42318]"
                      title="Delete group"
                      onClick={(e) => {
                        e.stopPropagation();
                        cdn.deleteGroup(g.id);
                        toast("Campaign group deleted · members are back in the list");
                      }}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                </div>
              );
            }

            const c = entry.campaign;
            const info = counts(c);
            const on = selected.includes(c.id);
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
              Campaign setup is handled by Spectrum.
            </div>
          </div>
        </div>
        )}

        {view === "table" && (
          <div className="card overflow-hidden">
            <div className="scroll-x">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-[38px]" />
                    <th className="w-[260px]">Campaign / Group</th>
                    <th className="w-[100px]">Type</th>
                    <th>Agency / Campaigns</th>
                    <th className="w-[195px]">Period</th>
                    <th className="num w-[80px]">Sheets</th>
                    <th className="num w-[95px]">Data Ads</th>
                    <th className="w-[270px]" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    if (entry.kind === "group") {
                      const g = entry.group;
                      const members = state.campaigns.filter((c) => g.campaignIds.includes(c.id));
                      const on = members.length > 0 && members.every((m) => selected.includes(m.id));
                      const projects = state.projects.filter((p) => g.campaignIds.includes(p.campaignId)).length;
                      const dataAds = state.dataAds.filter((d) => g.campaignIds.includes(d.campaignId)).length;
                      return (
                        <tr key={g.id} className={on ? "bg-[#f3f8ff]" : undefined}>
                          <td>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => {
                                const all = members.every((m) => selected.includes(m.id));
                                cdn.setCampaignSelection(
                                  all
                                    ? selected.filter((id) => !g.campaignIds.includes(id))
                                    : [...new Set([...selected, ...g.campaignIds])],
                                );
                              }}
                              className="accent-[var(--blue)]"
                            />
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="badge badge-blue !h-[18px] !text-[8px]">group campaign</span>
                              <span className="truncate font-medium">{g.name}</span>
                            </div>
                            <div className="mt-0.5 truncate text-[10px] text-[var(--muted-2)]">
                              {members.map((m) => m.name).join(" · ")}
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-blue">group</span>
                          </td>
                          <td className="text-[var(--muted)]">
                            {members.length} campaign{members.length === 1 ? "" : "s"}
                          </td>
                          <td className="text-[11px] text-[var(--muted-2)]">—</td>
                          <td className="num">{projects}</td>
                          <td className="num">{dataAds}</td>
                          <td>
                            <div className="flex items-center justify-end gap-1.5">
                              <button className="btn btn-sm" onClick={() => openGroup(g.id)}>
                                Dashboard
                              </button>
                              <button
                                className="icon-btn h-[26px] w-[26px]"
                                title="Open project list"
                                onClick={() => openProjects(g.campaignIds)}
                              >
                                <Icon name="projects" size={12} />
                              </button>
                              <button
                                className="icon-btn h-[26px] w-[26px]"
                                title="Edit group"
                                onClick={() => {
                                  setGroupEditId(g.id);
                                  setGroupSeed([]);
                                  setGroupOpen(true);
                                }}
                              >
                                <Icon name="edit" size={12} />
                              </button>
                              <button
                                className="icon-btn h-[26px] w-[26px] !text-[#b42318]"
                                title="Delete group"
                                onClick={() => {
                                  cdn.deleteGroup(g.id);
                                  toast("Campaign group deleted · members are back in the list");
                                }}
                              >
                                <Icon name="trash" size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    const c = entry.campaign;
                    const info = counts(c);
                    const on = selected.includes(c.id);
                    return (
                      <tr key={c.id} className={on ? "bg-[#f3f8ff]" : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(c.id)}
                            className="accent-[var(--blue)]"
                          />
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{c.name}</span>
                            {activeGroup && activeGroup.campaignIds.includes(c.id) && (
                              <span className="badge badge-neutral !h-[18px] !text-[8px]">dashboard scope</span>
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-[10px] text-[var(--muted-2)]">
                            {info.types.map((t) => PROJECT_LABEL[t]).join(" · ") || "No project sheet yet"}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-neutral">campaign</span>
                        </td>
                        <td className="text-[var(--muted)]">{c.agency}</td>
                        <td className="whitespace-nowrap text-[11px] text-[var(--muted-2)]">
                          {c.start} → {c.end}
                        </td>
                        <td className="num">{info.projects}</td>
                        <td className="num">{info.dataAds}</td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <button className="btn btn-sm" onClick={() => openProjects([c.id])}>
                              Open project list
                            </button>
                            <button
                              className="icon-btn h-[26px] w-[26px]"
                              title="Edit campaign"
                              onClick={() => setEditTarget(c)}
                            >
                              <Icon name="edit" size={12} />
                            </button>
                            <button
                              className="icon-btn h-[26px] w-[26px] !text-[#b42318]"
                              title="Delete campaign"
                              onClick={() => setDeleteTarget(c)}
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
          </div>
        )}

        {entries.length === 0 && (
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
      eyebrow={campaign ? "Edit campaign" : "Spectrum setup"}
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
