"use client";

import { useSyncExternalStore } from "react";
import type {
  AutomationRow,
  Campaign,
  CampaignGroup,
  CampaignType,
  ColumnConfig,
  DataAds,
  DataAdsSheet,
  Project,
  ProjectType,
  SheetRow,
  State,
  UIState,
} from "./types";
import { createSeed, STORAGE_KEY, STATE_VERSION } from "./seed";
import { buildShortcodeIndex, lookupCampaign, cleanPublishLink, extractShortcode } from "./shortcode";
import { emptySheetRow } from "./sheet";

let state: State | null = null;
let serverState: State | null = null;
const listeners = new Set<() => void>();

function readStorage(): State | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as State;
    if (!parsed || parsed.version !== STATE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getState(): State {
  if (!state) state = readStorage() ?? createSeed();
  return state;
}

function getServerState(): State {
  if (!serverState) serverState = createSeed();
  return serverState;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota — prototype keeps working in memory */
  }
}

function commit(next: State) {
  state = next;
  persist();
  emit();
}

const nowIso = () => new Date().toISOString();

export function useCdn(): State {
  return useSyncExternalStore(subscribe, getState, getServerState);
}

export const cdn = {
  setUI(patch: Partial<UIState>) {
    const s = getState();
    commit({ ...s, ui: { ...s.ui, ...patch } });
  },

  setBrand(brandId: string) {
    const s = getState();
    const firstCampaign = s.campaigns.find((c) => c.brandId === brandId);
    commit({
      ...s,
      ui: {
        ...s.ui,
        brandId,
        campaignIds: firstCampaign ? [firstCampaign.id] : [],
        groupId: null,
      },
    });
  },

  setCampaignSelection(campaignIds: string[]) {
    const s = getState();
    commit({ ...s, ui: { ...s.ui, campaignIds, groupId: null } });
  },

  toggleCampaign(campaignId: string) {
    const s = getState();
    const has = s.ui.campaignIds.includes(campaignId);
    const next = has ? s.ui.campaignIds.filter((id) => id !== campaignId) : [...s.ui.campaignIds, campaignId];
    commit({ ...s, ui: { ...s.ui, campaignIds: next.length ? next : s.ui.campaignIds, groupId: null } });
  },

  openGroup(groupId: string) {
    const s = getState();
    const group = s.groups.find((g) => g.id === groupId);
    commit({
      ...s,
      ui: { ...s.ui, groupId, campaignIds: group ? group.campaignIds : s.ui.campaignIds },
    });
  },

  closeGroup() {
    const s = getState();
    commit({ ...s, ui: { ...s.ui, groupId: null } });
  },

  syncNow() {
    const s = getState();
    commit({ ...s, ui: { ...s.ui, lastSync: nowIso() } });
  },

  resetDemo() {
    commit(createSeed());
  },

  /* ---------------- campaigns ---------------- */

  addCampaign(input: {
    brandId: string;
    name: string;
    type?: CampaignType;
    agency: string;
    start: string;
    end: string;
  }) {
    const s = getState();
    const campaign: Campaign = {
      id: `cmp_${Math.random().toString(36).slice(2, 8)}`,
      brandId: input.brandId,
      name: input.name,
      type: input.type ?? "KOL",
      agency: input.agency,
      start: input.start,
      end: input.end,
      metrics: {
        organic: 0,
        gs: 0,
        engagement: 0,
        content: 0,
        followers: 0,
        adsVideo: 0,
        impressions: 0,
        reach: 0,
        materials: 0,
        registered: 0,
        attended: 0,
      },
      series: new Array(24).fill(0),
    };
    commit({ ...s, campaigns: [campaign, ...s.campaigns] });
    return campaign;
  },

  updateCampaign(id: string, patch: Partial<Campaign>) {
    const s = getState();
    commit({ ...s, campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  },

  deleteCampaign(id: string) {
    const s = getState();
    const projects = s.projects.filter((p) => p.campaignId !== id);
    const dataAds = s.dataAds.filter((d) => d.campaignId !== id);
    const groups = s.groups
      .map((g) => ({ ...g, campaignIds: g.campaignIds.filter((c) => c !== id) }))
      .filter((g) => g.campaignIds.length > 0);
    const automation = s.automation.map((r) => (r.campaignId === id ? { ...r, campaignId: null } : r));
    const remaining = s.campaigns.filter((c) => c.id !== id && c.brandId === s.ui.brandId);
    const selected = s.ui.campaignIds.filter((c) => c !== id);

    commit({
      ...s,
      projects,
      dataAds,
      groups,
      automation,
      campaigns: s.campaigns.filter((c) => c.id !== id),
      ui: {
        ...s.ui,
        campaignIds: selected.length ? selected : remaining[0] ? [remaining[0].id] : [],
        groupId: s.ui.groupId && !groups.some((g) => g.id === s.ui.groupId) ? null : s.ui.groupId,
      },
    });
  },

  /* ---------------- groups ---------------- */

  addGroup(input: { brandId: string; name: string; description: string; campaignIds: string[] }) {
    const s = getState();
    const picked = new Set(input.campaignIds);
    const group: CampaignGroup = { id: `grp_${Math.random().toString(36).slice(2, 8)}`, ...input };
    const groups = s.groups
      .map((g) => ({ ...g, campaignIds: g.campaignIds.filter((id) => !picked.has(id)) }))
      .filter((g) => g.campaignIds.length > 0);
    commit({ ...s, groups: [group, ...groups] });
    return group;
  },

  updateGroup(id: string, patch: Partial<CampaignGroup>) {
    const s = getState();
    const picked = new Set(patch.campaignIds ?? []);
    const groups = s.groups
      .map((g) => {
        if (g.id === id) return { ...g, ...patch };
        if (!picked.size) return g;
        return { ...g, campaignIds: g.campaignIds.filter((c) => !picked.has(c)) };
      })
      .filter((g) => g.id === id || g.campaignIds.length > 0);
    commit({ ...s, groups });
  },

  deleteGroup(id: string) {
    const s = getState();
    const group = s.groups.find((g) => g.id === id);
    const firstMember = group?.campaignIds[0];
    commit({
      ...s,
      groups: s.groups.filter((g) => g.id !== id),
      ui: {
        ...s.ui,
        groupId: s.ui.groupId === id ? null : s.ui.groupId,
        campaignIds:
          s.ui.groupId === id && firstMember ? [firstMember] : s.ui.campaignIds,
      },
    });
  },

  /* ---------------- project sheets ---------------- */

  addProject(input: { brandId: string; campaignId: string; type: ProjectType; agency: string }) {
    const s = getState();
    const campaign = s.campaigns.find((c) => c.id === input.campaignId);
    const id = `prj_${Math.random().toString(36).slice(2, 8)}`;
    const rows: SheetRow[] = Array.from({ length: 3 }, () => emptySheetRow());

    const project: Project = {
      id,
      brandId: input.brandId,
      campaignId: input.campaignId,
      type: input.type,
      agency: input.agency,
      pmLink: `https://cdn.spektrum.id/pm/${(campaign?.name ?? "project")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}-${input.type.toLowerCase().replace("_", "-")}-${id.slice(-4)}`,
      createdAt: new Date().toISOString().slice(0, 10),
      savedAt: nowIso(),
      rows,
    };
    commit({ ...s, projects: [project, ...s.projects] });
    return project;
  },

  setProjectRows(projectId: string, rows: SheetRow[]) {
    const s = getState();
    commit({
      ...s,
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, rows, savedAt: nowIso() } : p)),
    });
  },

  setProjectColumns(projectId: string, columns: ColumnConfig[]) {
    const s = getState();
    commit({
      ...s,
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, columns, savedAt: nowIso() } : p)),
    });
  },

  saveProject(projectId: string) {
    const s = getState();
    commit({
      ...s,
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, savedAt: nowIso() } : p)),
    });
  },

  /* ---------------- data ads ---------------- */

  addDataAds(input: { brandId: string; campaignId: string; name: string; agency: string }) {
    const s = getState();
    const id = `da_${Math.random().toString(36).slice(2, 8)}`;
    const sheet: DataAdsSheet = { id: `${id}_s0`, name: "Sheet 1", rows: [] };
    const dataAds: DataAds = {
      id,
      brandId: input.brandId,
      campaignId: input.campaignId,
      name: input.name,
      agency: input.agency,
      createdAt: new Date().toISOString().slice(0, 10),
      savedAt: nowIso(),
      sheets: [sheet],
    };
    commit({ ...s, dataAds: [dataAds, ...s.dataAds] });
    return dataAds;
  },

  addDataAdsSheet(dataAdsId: string) {
    const s = getState();
    const container = s.dataAds.find((d) => d.id === dataAdsId);
    if (!container) return null;
    const sheet: DataAdsSheet = {
      id: `${container.id}_s${Math.random().toString(36).slice(2, 6)}`,
      name: `Sheet ${container.sheets.length + 1}`,
      rows: [],
    };
    commit({
      ...s,
      dataAds: s.dataAds.map((d) =>
        d.id === dataAdsId ? { ...d, sheets: [...d.sheets, sheet], savedAt: nowIso() } : d,
      ),
    });
    return sheet;
  },

  renameDataAdsSheet(dataAdsId: string, sheetId: string, name: string) {
    const s = getState();
    commit({
      ...s,
      dataAds: s.dataAds.map((d) =>
        d.id === dataAdsId
          ? { ...d, savedAt: nowIso(), sheets: d.sheets.map((sh) => (sh.id === sheetId ? { ...sh, name } : sh)) }
          : d,
      ),
    });
  },

  deleteDataAdsSheet(dataAdsId: string, sheetId: string) {
    const s = getState();
    commit({
      ...s,
      dataAds: s.dataAds.map((d) => {
        if (d.id !== dataAdsId || d.sheets.length <= 1) return d;
        return { ...d, savedAt: nowIso(), sheets: d.sheets.filter((sh) => sh.id !== sheetId) };
      }),
    });
  },

  setDataAdsRows(dataAdsId: string, sheetId: string, rows: SheetRow[]) {
    const s = getState();
    commit({
      ...s,
      dataAds: s.dataAds.map((d) =>
        d.id === dataAdsId
          ? { ...d, savedAt: nowIso(), sheets: d.sheets.map((sh) => (sh.id === sheetId ? { ...sh, rows } : sh)) }
          : d,
      ),
    });
  },

  setDataAdsColumns(dataAdsId: string, sheetId: string, columns: ColumnConfig[]) {
    const s = getState();
    commit({
      ...s,
      dataAds: s.dataAds.map((d) =>
        d.id === dataAdsId
          ? {
              ...d,
              savedAt: nowIso(),
              sheets: d.sheets.map((sh) => (sh.id === sheetId ? { ...sh, columns } : sh)),
            }
          : d,
      ),
    });
  },

  saveDataAds(dataAdsId: string) {
    const s = getState();
    commit({
      ...s,
      dataAds: s.dataAds.map((d) => (d.id === dataAdsId ? { ...d, savedAt: nowIso() } : d)),
    });
  },

  deleteDataAds(dataAdsId: string) {
    const s = getState();
    commit({ ...s, dataAds: s.dataAds.filter((d) => d.id !== dataAdsId) });
  },

  /* ---------------- automation ---------------- */

  setAutomationRows(rows: AutomationRow[]) {
    const s = getState();
    commit({ ...s, automation: rows });
  },

  runMatching(target: { brandId?: string }) {
    const s = getState();
    const index = buildShortcodeIndex(s.projects);
    const brandId = target.brandId ?? s.ui.brandId;
    let matched = 0;
    let unresolved = 0;
    let eligible = 0;

    const automation = s.automation.map((r) => {
      if (r.brandId !== brandId || r.campaignId) return r;
      if (!r.shortcode) return r;
      eligible++;
      const hit = lookupCampaign(index, brandId, r.shortcode);
      if (hit) {
        matched++;
        return { ...r, campaignId: hit };
      }
      unresolved++;
      return r;
    });
    commit({ ...s, automation });
    return { matched, unresolved, eligible };
  },

  retryScrape(ids: string[]) {
    const wanted = new Set(ids);
    const s = getState();
    let count = 0;
    const projects = s.projects.map((p) => {
      let changed = false;
      const rows = p.rows.map((r) => {
        if (wanted.has(`ts:${p.id}:${r.id}`) && r.scrape !== "success") {
          changed = true;
          count++;
          return { ...r, scrape: "success" as const };
        }
        return r;
      });
      return changed ? { ...p, rows, savedAt: nowIso() } : p;
    });
    const dataAds = s.dataAds.map((d) => {
      let changed = false;
      const sheets = d.sheets.map((sh) => {
        const rows = sh.rows.map((r) => {
          if (wanted.has(`tl:${d.id}:${sh.id}:${r.id}`) && r.scrape !== "success") {
            changed = true;
            count++;
            return { ...r, scrape: "success" as const };
          }
          return r;
        });
        return { ...sh, rows };
      });
      return changed ? { ...d, sheets, savedAt: nowIso() } : d;
    });
    commit({ ...s, projects, dataAds });
    return count;
  },

  deriveAutomationLink(value: string) {
    return { cleanLink: cleanPublishLink(value), shortcode: extractShortcode(value) };
  },
};
