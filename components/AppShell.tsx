"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { relTime } from "@/lib/utils";
import { brandStyle } from "@/lib/seed";
import { Icon, type IconName } from "./Icon";
import { GroupFormModal } from "./GroupFormModal";
import { toast } from "./Toast";

type NavEntry = { href: string; label: string; icon: IconName; count?: number };

const titleFor = (path: string): string => {
  if (path.startsWith("/dashboard/kol")) return "KOL performance";
  if (path.startsWith("/dashboard/connector")) return "Connector performance";
  if (path.startsWith("/dashboard/attend")) return "Attend performance";
  if (path.startsWith("/dashboard/ads")) return "KOL Ads performance";
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return "Dashboard";
  if (path.startsWith("/campaigns/groups")) return "Campaign group";
  if (path.startsWith("/campaigns")) return "Campaign list";
  if (path.startsWith("/projects/ts/")) return "Project sheet";
  if (path.startsWith("/projects")) return "Project list";
  if (path.startsWith("/data-ads")) return "Data ads";
  if (path.startsWith("/automation")) return "Automation link";
  if (path.startsWith("/scraping")) return "Scraping monitoring";
  if (path.startsWith("/agency")) return "Agency workspace";
  return "CDN";
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const state = useCdn();
  const pathname = usePathname();
  const router = useRouter();
  const [role, brandId, sidebarCollapsed] = [state.ui.role, state.ui.brandId, state.ui.sidebarCollapsed];
  const [dashOpen, setDashOpen] = useState(true);
  const [groupOpen, setGroupOpen] = useState(false);
  const [campaignMenuOpen, setCampaignMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const brand = state.brands.find((b) => b.id === brandId) ?? state.brands[0];
  const brandStyleValue = brandStyle(brand?.hue ?? 210);

  const activeCampaigns = state.campaigns.filter((c) => state.ui.campaignIds.includes(c.id));
  const activeCampaign = activeCampaigns[0];
  const brandCampaigns = useMemo(
    () => state.campaigns.filter((c) => c.brandId === brandId),
    [state.campaigns, brandId],
  );
  const activeGroup = state.ui.groupId ? state.groups.find((g) => g.id === state.ui.groupId) : null;

  const counts = useMemo(
    () => ({
      projects: state.projects.filter(
        (p) => p.brandId === brandId && state.ui.campaignIds.includes(p.campaignId),
      ).length,
      dataAds: state.dataAds.filter(
        (d) => d.brandId === brandId && state.ui.campaignIds.includes(d.campaignId),
      ).length,
    }),
    [state.projects, state.dataAds, state.ui.campaignIds, brandId],
  );

  const activeProjectType = useMemo(() => {
    if (!pathname.startsWith("/projects/ts/")) return null;
    const id = pathname.split("/")[3];
    return state.projects.find((p) => p.id === id)?.type ?? null;
  }, [pathname, state.projects]);

  useEffect(() => {
    if (role === "agency" && !/^\/(agency|projects|data-ads)/.test(pathname)) {
      router.replace("/agency");
    }
  }, [role, pathname, router]);

  useEffect(() => {
    if (!campaignMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setCampaignMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [campaignMenuOpen]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/projects/all") return pathname.startsWith("/projects");
    if (href === "/data-ads") return pathname.startsWith("/data-ads");
    return pathname === href;
  };

  const navItem = (n: NavEntry, sub = false) => (
    <Link
      key={n.href}
      href={n.href}
      className={`nav-item ${sub ? "is-sub" : ""} ${isActive(n.href) ? "is-active" : ""}`}
      title={sidebarCollapsed ? n.label : undefined}
    >
      {!sub && <Icon name={n.icon} size={15} />}
      <span className="truncate">{n.label}</span>
      {typeof n.count === "number" && n.count > 0 && <span className="nav-count">{n.count}</span>}
    </Link>
  );

  const perf: NavEntry[] = [
    { href: "/dashboard/kol", label: "KOL performance", icon: "kol" },
    { href: "/dashboard/connector", label: "Connector performance", icon: "connector" },
    { href: "/dashboard/attend", label: "Attend performance", icon: "attend" },
    { href: "/dashboard/ads", label: "KOL Ads performance", icon: "ads" },
  ];

  const dataNav: NavEntry[] = [
    { href: "/data-ads", label: "Data Ads", icon: "table", count: counts.dataAds },
    { href: "/automation", label: "Automation link", icon: "link" },
    { href: "/scraping", label: "Scraping monitoring", icon: "radar" },
  ];

  const agencyNav: NavEntry[] = [
    { href: "/agency", label: "My workspace", icon: "dashboard" },
    { href: "/projects/all", label: "Project list", icon: "projects", count: counts.projects },
    { href: "/data-ads", label: "Data Ads", icon: "table", count: counts.dataAds },
  ];

  const scopeLabel = activeGroup
    ? activeGroup.name
    : activeCampaigns.length > 1
      ? `${activeCampaigns.length} campaigns`
      : activeCampaign?.name ?? "Select campaign";

  return (
    <div className="shell">
      <aside className={`sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`}>
        <div className="sidebar-logo">
          <Link href="/" className="flex items-center gap-2 overflow-hidden" aria-label="Connector home">
            <span className="logo-word">Connector</span>
          </Link>
          <button
            className="ml-auto grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-white"
            onClick={() => cdn.setUI({ sidebarCollapsed: !sidebarCollapsed })}
            aria-label="Toggle sidebar"
          >
            <Icon name="panel" size={15} />
          </button>
        </div>

        <div className="sidebar-scroll">
          {role === "agency" ? (
            <>
              <div className="nav-section">Agency workspace</div>
              {agencyNav.map((n) => navItem(n))}
              <div className="mt-4 rounded-xl border border-[#cfe0ff] bg-[#eef5ff] p-3 text-[11px] leading-[1.5] text-[#2b4a7a]">
                <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.12em]">Assigned to you</div>
                {brand?.name} · {activeCampaigns.length} selected campaign{activeCampaigns.length === 1 ? "" : "s"}
              </div>
            </>
          ) : (
            <>
              <div className={`nav-item ${pathname === "/dashboard" ? "is-active" : ""} !pr-1`}>
                <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Icon name="dashboard" size={15} />
                  <span className="truncate">Dashboard</span>
                </Link>
                <button
                  className="nav-caret grid h-6 w-6 shrink-0 place-items-center rounded-md text-[var(--muted-2)] hover:bg-white/70"
                  onClick={() => setDashOpen((v) => !v)}
                  aria-label="Toggle performance menu"
                  title={dashOpen ? "Collapse performance" : "Expand performance"}
                >
                  <Icon
                    name="chevronDown"
                    size={12}
                    className={`transition-transform ${dashOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {dashOpen && !sidebarCollapsed && (
                <div className="nav-tree">
                  {perf.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={`nav-item ${pathname === n.href ? "is-active" : ""}`}
                    >
                      <span className="truncate">{n.label}</span>
                    </Link>
                  ))}
                </div>
              )}

              <div className="nav-section">Campaign</div>
              {navItem({ href: "/campaigns", label: "Campaign list", icon: "list" })}
              <button
                className="nav-item w-full"
                onClick={() => setGroupOpen(true)}
                title={sidebarCollapsed ? "Campaign group" : "Create a campaign group"}
              >
                <Icon name="group" size={15} />
                <span className="truncate">Campaign group</span>
              </button>

              <div className="nav-section">Project list</div>
              {navItem({ href: "/projects/all", label: "All projects", icon: "projects", count: counts.projects })}

              <div className="nav-section">Data</div>
              {dataNav.map((n) => navItem(n))}
            </>
          )}
        </div>

        <div className="sidebar-foot">
          <Link href="/" className="nav-item !mb-0">
            <Icon name="arrowLeft" size={15} />
            <span>All brands</span>
          </Link>
          {!sidebarCollapsed && (
            <div className="sidebar-foot-note mt-2 px-2 pb-1 text-[10px] leading-4 text-[var(--muted-2)]">
              Signed in as <span className="font-semibold text-[var(--ink-2)]">Spectrum</span> · CDN v2 prototype
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="topbar">
          <div className="flex min-w-0 items-center gap-2">
            <button
              className="icon-btn"
              onClick={() => cdn.setUI({ sidebarCollapsed: !sidebarCollapsed })}
              aria-label="Toggle sidebar"
            >
              <Icon name="panel" size={15} />
            </button>

            <Link href="/" className="brand-chip">
              <span
                className="brand-avatar h-[22px] w-[22px] text-[9px]"
                style={{ background: brandStyleValue.bg, color: brandStyleValue.fg }}
              >
                {brand?.initials}
              </span>
              <span className="max-w-[110px] truncate">{brand?.name}</span>
              <Icon name="chevronDown" size={12} className="text-[var(--muted-2)]" />
            </Link>

            <div className="hidden h-4 w-px bg-[var(--line-2)] sm:block" />

            <button
              className="btn btn-sm ml-1 hidden xl:inline-flex"
              onClick={() => {
                cdn.syncNow();
                toast("Sync queued · links refreshed from TS & TL");
              }}
              title={`Last sync ${relTime(state.ui.lastSync)}`}
            >
              <Icon name="refresh" size={12} />
              Sync data
            </button>

            <div className="mx-1 hidden h-4 w-px bg-[var(--line-2)] xl:block" />
            <div className="hidden truncate text-[13px] font-semibold xl:block">{titleFor(pathname)}</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1.5 text-[10px] text-[var(--muted-2)] 2xl:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />
              Synced {relTime(state.ui.lastSync)}
            </div>

            <div className="relative hidden min-[1100px]:block" ref={menuRef}>
              <button
                className="chip max-w-[240px] !h-[30px] hover:border-[var(--line-3)]"
                onClick={() => setCampaignMenuOpen((v) => !v)}
                title="Select campaigns"
                aria-expanded={campaignMenuOpen}
              >
                <span className="dot bg-[#2f6bff]" />
                <span className="truncate normal-case tracking-normal">{scopeLabel}</span>
                <Icon
                  name="chevronDown"
                  size={11}
                  className={`shrink-0 text-[var(--muted-2)] transition-transform ${campaignMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {campaignMenuOpen && (
                <div className="absolute left-0 top-[38px] z-[60] w-[310px] overflow-hidden rounded-xl border border-[var(--line-2)] bg-white shadow-[0_24px_50px_-20px_rgba(10,26,51,0.35)]">
                  <button
                    className="flex w-full items-center gap-2.5 border-b border-[var(--line)] bg-[#fafcff] px-3 py-2.5 text-left"
                    onClick={() => {
                      const all = brandCampaigns.length > 0 && brandCampaigns.every((c) => state.ui.campaignIds.includes(c.id));
                      cdn.setCampaignSelection(all ? [] : brandCampaigns.map((c) => c.id));
                    }}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={brandCampaigns.length > 0 && brandCampaigns.every((c) => state.ui.campaignIds.includes(c.id))}
                      className="pointer-events-none accent-[var(--blue)]"
                    />
                    <span className="text-[12px] font-semibold">All campaigns</span>
                    <span className="ml-auto text-[10px] text-[var(--muted-2)]">{brandCampaigns.length}</span>
                  </button>

                  <div className="max-h-[280px] overflow-y-auto py-1">
                    {brandCampaigns.map((c) => {
                      const on = state.ui.campaignIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex cursor-pointer items-center gap-2.5 px-3 py-[7px] text-[11.5px] hover:bg-[#f4f8ff]"
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => {
                              const next = on
                                ? state.ui.campaignIds.filter((id) => id !== c.id)
                                : [...state.ui.campaignIds, c.id];
                              cdn.setCampaignSelection(next);
                            }}
                            className="accent-[var(--blue)]"
                          />
                          <span className={`min-w-0 flex-1 truncate ${on ? "font-medium" : ""}`}>{c.name}</span>
                          <span className="shrink-0 text-[9px] uppercase tracking-[0.06em] text-[var(--muted-2)]">
                            {c.agency}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <button
                    className="flex w-full items-center gap-2 border-t border-[var(--line)] px-3 py-2 text-[11px] font-medium text-[var(--blue-deep)] hover:bg-[#f7faff]"
                    onClick={() => {
                      setCampaignMenuOpen(false);
                      router.push("/campaigns");
                    }}
                  >
                    <Icon name="list" size={12} />
                    Manage campaigns
                  </button>
                </div>
              )}
            </div>

            <div className="seg hidden h-[30px] !bg-white/80 md:flex">
              <button
                className={`!h-[23px] !min-w-0 !px-2.5 !text-[9.5px] !uppercase !tracking-[0.08em] ${role === "spectrum" ? "is-on" : ""}`}
                onClick={() => {
                  cdn.setUI({ role: "spectrum" });
                  router.push("/dashboard");
                }}
              >
                Spectrum
              </button>
              <button
                className={`!h-[23px] !min-w-0 !px-2.5 !text-[9.5px] !uppercase !tracking-[0.08em] ${role === "agency" ? "is-on" : ""}`}
                onClick={() => {
                  cdn.setUI({ role: "agency" });
                  router.push("/agency");
                }}
              >
                Agency
              </button>
            </div>

            <span className="chip hidden lg:inline-flex" title="Campaign Dashboard">
              <Icon name="dashboard" size={11} />
              CDN
            </span>

            <button
              className="btn btn-sm"
              onClick={() => {
                toast("Signed out of the prototype — pick a brand to come back");
                router.push("/");
              }}
            >
              Sign out
              <Icon name="logout" size={12} />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-14">{children}</main>
      </div>

      <GroupFormModal
        key={`sidebar-group-${groupOpen}`}
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        groupId={null}
        seed={state.ui.campaignIds.length >= 2 ? state.ui.campaignIds : []}
        onCreated={() => {
          toast("Group created · campaign group card is now on the campaign list");
          router.push("/campaigns");
        }}
      />
    </div>
  );
}
