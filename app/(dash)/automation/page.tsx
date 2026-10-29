"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { download, fmtCompact, fmtInt, toCSV } from "@/lib/utils";
import { AUTOMATION_DEFAULTS, resolveColumns } from "@/lib/sheet";
import type { AutomationRow } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { PageHero, SectionHead, SavedIndicator } from "@/components/ui";
import { SheetGrid, type SheetColumn, type SheetGridHandle } from "@/components/SheetGrid";
import { ColumnSettingsModal } from "@/components/ColumnSettingsModal";
import { toast } from "@/components/Toast";

export default function AutomationPage() {
  const state = useCdn();
  const brandId = state.ui.brandId;
  const brand = state.brands.find((b) => b.id === brandId) ?? state.brands[0];
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [link, setLink] = useState(state.automationLinks?.[brandId] ?? "");
  const gridRef = useRef<SheetGridHandle>(null);

  useEffect(() => {
    setLink(state.automationLinks?.[brandId] ?? "");
  }, [brandId, state.automationLinks]);

  const rows = useMemo(() => state.automation.filter((r) => r.brandId === brandId), [state.automation, brandId]);
  const columns = useMemo(
    () => resolveColumns(AUTOMATION_DEFAULTS, state.automationColumns?.[brandId]),
    [state.automationColumns, brandId],
  );
  const gridColumns: SheetColumn<AutomationRow>[] = useMemo(
    () => columns.map((c) => ({ key: c.key, label: c.label, width: c.width, required: c.required, type: c.type, readOnly: true })),
    [columns],
  );

  const impressions = rows.reduce((a, r) => a + (Number(r.impressions) || 0), 0);
  const reach = rows.reduce((a, r) => a + (Number(r.reach) || 0), 0);
  const sixth = rows.reduce((a, r) => a + (Number(r.sixthViews) || 0), 0);
  const savedAt = state.automationSavedAt?.[brandId] ?? state.ui.lastSync;

  function sync() {
    if (!link.trim()) {
      toast("Paste the spreadsheet link first", "err");
      return;
    }
    setSyncing(true);
    setTimeout(() => {
      cdn.setAutomationLink(brandId, link.trim());
      setSyncing(false);
      toast(`Synced ${fmtInt(rows.length)} rows from the spreadsheet`);
    }, 900);
  }

  function exportCsv() {
    download(
      `automation-${brandId}.csv`,
      toCSV(
        columns.map((c) => c.label),
        rows.map((r) => columns.map((c) => String((r as unknown as Record<string, string | number>)[c.key] ?? ""))),
      ),
    );
    toast("Automation rows exported as CSV");
  }

  return (
    <>
      <PageHero
        eyebrow="Automation link · Brand level"
        title="Automation link"
        sub={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              Paste the automation spreadsheet link. Spectrum pulls the rows automatically — the table below is
              read-only.
            </span>
            <SavedIndicator savedAt={savedAt} className="ml-1" />
          </span>
        }
        actions={
          <>
            <button className="btn" onClick={exportCsv}>
              <Icon name="download" size={13} />
              Export
            </button>
            <button className="btn" onClick={() => setColumnsOpen(true)}>
              <Icon name="list" size={13} />
              Columns
            </button>
          </>
        }
      />

      <div className="relative z-[1] px-9 pt-5">
        <div className="card mb-4 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--line)] bg-[#f7faff] text-[var(--blue-deep)]">
              <Icon name="link" size={15} />
            </span>
            <div>
              <div className="text-[12.5px] font-semibold">Source spreadsheet</div>
              <div className="text-[10.5px] text-[var(--muted-2)]">
                {brand.name} · the system crawls this link and maps it into the table
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="field h-[35px] min-w-[280px] flex-1"
              placeholder="https://docs.google.com/spreadsheets/d/…"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <button className="btn btn-dark h-[35px]" onClick={sync} disabled={syncing}>
              <Icon name="refresh" size={13} className={syncing ? "spin" : ""} />
              {syncing ? "Crawling…" : "Sync now"}
            </button>
          </div>
          <div className="mt-2 text-[10.5px] text-[var(--muted-2)]">
            Any spreadsheet link is accepted in this prototype — the crawl returns dummy rows so the table is always
            populated. Data di tabel hanya bisa dibaca.
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Raw rows" value={fmtInt(rows.length)} hint="From the crawled spreadsheet" />
          <Stat label="Impressions" value={fmtCompact(impressions)} hint="Sum of all rows" />
          <Stat label="Reach" value={fmtCompact(reach)} hint="Sum of all rows" />
          <Stat label="6s focused views" value={fmtCompact(sixth)} hint="Sum of all rows" />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="chip is-on">
            <span className="dot bg-[#12b76a]" />
            Read-only
          </span>
          <span className="text-[10.5px] text-[var(--muted-2)]">
            Rows are managed by the crawl. Use Columns only to adjust the layout.
          </span>
          <span className="ml-auto flex items-center gap-3 text-[10.5px] text-[var(--muted-2)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#12b76a]" /> required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#2f6bff]" /> optional
            </span>
          </span>
        </div>

        <div className="mt-3">
          <SheetGrid<AutomationRow>
            ref={gridRef}
            columns={gridColumns}
            rows={rows}
            onChange={() => {}}
            minRows={0}
            padding={0}
            emptyHint="Sync from the spreadsheet to fill this table."
          />
        </div>

        <SectionHead className="mt-6" title="About this table" hint="Mapped automatically" />
        <div className="flex items-start gap-2 rounded-xl border border-[#cfe0ff] bg-[#f3f8ff] px-4 py-3 text-[11.5px] leading-5 text-[#2b4a7a]">
          <Icon name="info" size={14} className="mt-0.5 shrink-0" />
          <span>
            The table mirrors the automation export: Campaign, Ads, Date and the performance metrics. Spectrum only
            provides the spreadsheet link; the crawler fills and refreshes the rows.
          </span>
        </div>
      </div>

      <ColumnSettingsModal
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        columns={columns}
        defaults={AUTOMATION_DEFAULTS}
        onSave={(config) => {
          cdn.setAutomationColumns(brandId, config);
          toast("Column layout saved");
        }}
      />
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="eyebrow-dim !text-[9px]">{label}</div>
      <div className="metric-sm mt-1.5">{value}</div>
      <div className="mt-1 text-[10.5px] text-[var(--muted-2)]">{hint}</div>
    </div>
  );
}
