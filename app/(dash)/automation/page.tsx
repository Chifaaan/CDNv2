"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { download, fmtCompact, fmtInt, toCSV } from "@/lib/utils";
import { AUTOMATION_COLUMNS } from "@/lib/sheet";
import type { AutomationRow } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { PageHero, SectionHead } from "@/components/ui";
import { SheetGrid, type SheetColumn, type SheetGridHandle } from "@/components/SheetGrid";
import { ImportDialog } from "@/components/ImportDialog";
import { toast } from "@/components/Toast";

const NUM_KEYS = new Set([
  "impressions",
  "reach",
  "clicks",
  "videoViews",
  "secondViews",
  "sixthViews",
  "at25",
  "at50",
  "at75",
  "at100",
]);

function emptyAutomationRow(brandId: string): AutomationRow {
  return {
    id: `auto_${Math.random().toString(36).slice(2, 9)}`,
    brandId,
    campaign: "",
    ads: "",
    date: "",
    impressions: 0,
    reach: 0,
    clicks: 0,
    videoViews: 0,
    secondViews: 0,
    sixthViews: 0,
    at25: 0,
    at50: 0,
    at75: 0,
    at100: 0,
    linkPost: "",
    cleanLink: "",
    shortcode: "",
    campaignId: null,
  };
}

const COLUMN_META: SheetColumn<AutomationRow>[] = AUTOMATION_COLUMNS.map((c) => ({
  key: c.key,
  label: c.label,
  width: c.width,
  required: c.required,
  type: c.numeric ? "number" : c.key === "date" ? "date" : "text",
}));

export default function AutomationPage() {
  const state = useCdn();
  const brandId = state.ui.brandId;
  const brand = state.brands.find((b) => b.id === brandId) ?? state.brands[0];
  const [importOpen, setImportOpen] = useState(false);
  const gridRef = useRef<SheetGridHandle>(null);

  const rows = useMemo(() => state.automation.filter((r) => r.brandId === brandId), [state.automation, brandId]);
  const makeRow = useCallback(() => emptyAutomationRow(brandId), [brandId]);

  const impressions = rows.reduce((a, r) => a + (Number(r.impressions) || 0), 0);
  const reach = rows.reduce((a, r) => a + (Number(r.reach) || 0), 0);
  const sixth = rows.reduce((a, r) => a + (Number(r.sixthViews) || 0), 0);

  const dupSet = useMemo(() => {
    const seen = new Map<string, number>();
    rows.forEach((r) => {
      const k = `${r.campaign}|${r.ads}|${r.date}`;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    });
    return new Set(
      rows.filter((r) => (seen.get(`${r.campaign}|${r.ads}|${r.date}`) ?? 0) > 1).map((r) => r.id),
    );
  }, [rows]);

  function setRows(next: AutomationRow[]) {
    let i = 0;
    const merged = state.automation.map((r) => (r.brandId === brandId ? next[i++] ?? r : r));
    cdn.setAutomationRows(merged);
  }

  function derive(row: AutomationRow, key: string, value: string): AutomationRow {
    if (key === "linkPost") {
      return { ...row, linkPost: value };
    }
    if (NUM_KEYS.has(key)) {
      const n = Number(String(value).replace(/[^\d.-]/g, ""));
      return { ...row, [key]: Number.isFinite(n) ? n : 0 };
    }
    return row;
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast("Clipboard is empty", "warn");
        return;
      }
      gridRef.current?.pasteText(text);
      gridRef.current?.focus();
    } catch {
      toast("Browser blocked clipboard read — click a cell and press Ctrl+V", "warn");
      gridRef.current?.focus();
    }
  }

  function exportCsv() {
    download(
      `automation-${brandId}.csv`,
      toCSV(
        AUTOMATION_COLUMNS.map((c) => c.label),
        rows.map((r) => AUTOMATION_COLUMNS.map((c) => String((r as unknown as Record<string, string | number>)[c.key] ?? ""))),
      ),
    );
    toast("Automation rows exported as CSV");
  }

  function importRows(raw: Record<string, string>[]) {
    const mapped: AutomationRow[] = raw.map((r) => {
      const row = { ...emptyAutomationRow(brandId) };
      AUTOMATION_COLUMNS.forEach((c) => {
        const v = r[c.key] ?? "";
        if (c.numeric) {
          const n = Number(String(v).replace(/[^\d.-]/g, ""));
          (row as unknown as Record<string, string | number>)[c.key] = Number.isFinite(n) ? n : 0;
        } else {
          (row as unknown as Record<string, string>)[c.key] = v;
        }
      });
      return row;
    });
    setRows([...rows, ...mapped]);
  }

  return (
    <>
      <PageHero
        eyebrow="Automation link · Brand level"
        title="Automation link"
        sub={
          <>
            The full automation export for <b className="font-semibold text-[var(--ink-2)]">{brand.name}</b> lives here as a
            spreadsheet. Paste the export as-is — 13 columns in the original order.
          </>
        }
        actions={
          <>
            <button className="btn" onClick={exportCsv}>
              <Icon name="download" size={13} />
              Export
            </button>
            <button className="btn btn-dark" onClick={() => setImportOpen(true)}>
              <Icon name="upload" size={13} />
              Import
            </button>
          </>
        }
      />

      <div className="relative z-[1] px-9 pt-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Raw rows" value={fmtInt(rows.length)} hint="Whole automation file" />
          <Stat label="Impressions" value={fmtCompact(impressions)} hint="Sum of all raw rows" />
          <Stat label="Reach" value={fmtCompact(reach)} hint="Sum of all raw rows" />
          <Stat label="6s focused views" value={fmtCompact(sixth)} hint="Sum of all raw rows" />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button className="btn" onClick={pasteFromClipboard}>
            <Icon name="copy" size={13} />
            Paste block
          </button>
          <button className="btn" onClick={() => setImportOpen(true)}>
            <Icon name="upload" size={13} />
            Import CSV
          </button>
          <button className="btn" onClick={() => setRows([...rows, emptyAutomationRow(brandId)])}>
            <Icon name="plus" size={13} />
            Add row
          </button>
          <button
            className="btn"
            onClick={() => {
              const seen = new Set<string>();
              const kept = rows.filter((r) => {
                const k = `${r.campaign}|${r.ads}|${r.date}`;
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
              });
              setRows(kept);
              toast(`${rows.length - kept.length} duplicate row(s) removed`);
            }}
          >
            <Icon name="filter" size={13} />
            Remove duplicate
            {dupSet.size > 0 && <span className="badge badge-bad !h-[18px] !px-1.5 !text-[8.5px]">{dupSet.size}</span>}
          </button>
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
            columns={COLUMN_META}
            rows={rows}
            onChange={setRows}
            derive={derive}
            makeRow={makeRow}
            duplicates={dupSet}
            dedupeKey={(r) => `${r.campaign}|${r.ads}|${r.date}`}
            emptyHint="Paste the automation export here — columns match the original file."
          />
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#cfe0ff] bg-[#f3f8ff] px-4 py-3 text-[11.5px] leading-5 text-[#2b4a7a]">
          <Icon name="info" size={14} className="shrink-0" />
          <span>
            This sheet mirrors the raw automation export: Campaign, Ads, Date and the performance metrics. Paste a block
            or import the CSV as it is.
          </span>
        </div>
      </div>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        columns={AUTOMATION_COLUMNS.map((c) => ({ key: c.key, label: c.label, required: c.required }))}
        title="Import automation file"
        templateName="automation-template.csv"
        onImport={importRows}
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
