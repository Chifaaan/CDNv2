"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { cdn, useCdn } from "@/lib/store";
import { brandStyle } from "@/lib/seed";
import type { CampaignType } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { BrandAvatar, PageHero } from "@/components/ui";
import { toast } from "@/components/Toast";

const TYPE_META: Record<CampaignType, { label: string; color: string }> = {
  KOL: { label: "KOL", color: "#ef7f24" },
  CONNECTOR: { label: "Connector", color: "#ec4b8b" },
  TROOPS: { label: "Troops", color: "#64748b" },
  ATTEND: { label: "Attend", color: "#8b5cf6" },
};

export default function BrandChooserPage() {
  const state = useCdn();
  const router = useRouter();

  const cards = useMemo(
    () =>
      state.brands.map((b) => {
        const campaigns = state.campaigns.filter((c) => c.brandId === b.id);
        const types = [...new Set(campaigns.map((c) => c.type))].sort();
        return {
          brand: b,
          campaigns: campaigns.length,
          agencies: b.agencies.length,
          types,
          projects: state.projects.filter((p) => p.brandId === b.id).length,
          adsSheets: state.projects.filter((p) => p.brandId === b.id && p.type === "KOL_ADS").length,
        };
      }),
    [state.brands, state.campaigns, state.projects],
  );

  const totalCampaigns = state.campaigns.length;

  function openBrand(brandId: string) {
    cdn.setBrand(brandId);
    if (state.ui.role === "agency") router.push("/agency");
    else router.push("/dashboard");
  }

  return (
    <div className="relative z-[1] min-h-screen">
      <div className="flex h-[64px] items-center border-b border-[var(--line)] bg-white/60 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <span className="logo-word text-[17px]">Connector</span>
          <span className="rounded border border-[var(--line-2)] px-1.5 py-[1px] text-[9px] font-semibold tracking-[0.1em] text-[var(--muted-2)]">
            CDN v2
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="chip hidden sm:inline-flex">
            <Icon name="dashboard" size={11} />
            Campaign dashboard
          </span>
          <button className="btn btn-sm" onClick={() => toast("Signed out of the prototype")}>
            Sign out
            <Icon name="logout" size={12} />
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1180px] px-9">
        <PageHero
          eyebrow="CDN · Campaign dashboard"
          title="Choose a brand"
          sub="Every brand the team runs, in one place. Social accounts, KOL and Connector campaigns, and KOL Ads — pulled daily."
        >
          <div className="mt-7 flex flex-wrap gap-2">
            <span className="chip">{cards.length} brands</span>
            <span className="chip">{totalCampaigns} campaigns</span>
            <span className="chip">{state.projects.length} tracking sheets</span>
            <span className="chip">
              <span className="dot" style={{ background: "#12b76a" }} />
              Pulled daily
            </span>
          </div>
        </PageHero>

        {state.ui.role === "agency" && (
          <div className="mx-9 mt-2 flex items-center gap-2 rounded-xl border border-[#cfe0ff] bg-[#eef5ff] px-4 py-2.5 text-[11.5px] text-[#2b4a7a]">
            <Icon name="info" size={13} />
            You are previewing as <b>Agency</b> — the dashboard and CMS are hidden. Pick a brand to see its assigned
            tracking sheets only.
          </div>
        )}

        <div className="grid gap-4 px-0 pb-16 pt-7 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ brand, campaigns, agencies, types, projects, adsSheets }) => {
            const s = brandStyle(brand.hue);
            return (
              <div
                key={brand.id}
                className="card group flex flex-col p-5 transition-all duration-200 hover:-translate-y-[2px]"
                style={{ boxShadow: "var(--shadow-card)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 24px 48px -30px ${s.ring}, var(--shadow-card)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "var(--shadow-card)";
                }}
              >
                <div className="flex items-start gap-3">
                  <BrandAvatar brand={brand} size={44} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-[15.5px] font-semibold tracking-[-0.02em]">{brand.name}</div>
                      <span className="text-[10px] font-medium uppercase text-[var(--muted-2)]">{brand.code}</span>
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-[var(--muted)]">
                      {campaigns} campaigns · {agencies} agenc{agencies === 1 ? "y" : "ies"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {types.map((t) => (
                    <span key={t} className="chip !h-[24px] !gap-1.5 !px-2 !text-[8.5px]">
                      <span className="dot" style={{ background: TYPE_META[t].color }} />
                      {TYPE_META[t].label}
                    </span>
                  ))}
                  {types.length === 0 && <span className="text-[11px] text-[var(--muted-2)]">No campaign yet</span>}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-3 text-[10.5px] text-[var(--muted-2)]">
                  <span className="flex items-center gap-1.5">
                    <Icon name="projects" size={12} /> {projects} project sheets
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon name="table" size={12} /> {adsSheets} KOL Ads
                  </span>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-4">
                  <button className="btn btn-primary flex-1 !justify-between" onClick={() => openBrand(brand.id)}>
                    <span>{state.ui.role === "agency" ? "Open workspace" : "Open dashboard"}</span>
                    <Icon name="arrowRight" size={13} />
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      const url = `https://cdn.spectrum.id/client/${brand.id}`;
                      navigator.clipboard?.writeText(url).catch(() => {});
                      toast(`Client link copied · ${url}`);
                    }}
                  >
                    <Icon name="link" size={12} />
                    Client link
                  </button>
                </div>
              </div>
            );
          })}

          <div className="card-flat flex min-h-[220px] flex-col items-center justify-center gap-2 border-dashed p-6 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line-2)] bg-white text-[var(--muted-2)]">
              <Icon name="plus" size={16} />
            </span>
            <div className="text-[12.5px] font-medium">New brand</div>
            <div className="max-w-[220px] text-[11px] leading-5 text-[var(--muted-2)]">
              Brand setup is handled by Spectrum. Agency accounts cannot create brands.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--line)] py-5 text-[10.5px] text-[var(--muted-2)]">
          <span>Connector · Campaign Dashboard Architecture v2 — prototype, data is mocked.</span>
          <Link href="/scraping" className="inline-flex items-center gap-1.5 hover:text-[var(--ink)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />
            Last sync 42m ago
          </Link>
        </div>
      </div>
    </div>
  );
}
