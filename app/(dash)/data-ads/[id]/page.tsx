"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { download, fmtInt, pct, toCSV } from "@/lib/utils";
import {
  TL_COLUMNS,
  deriveSheetRow,
  emptySheetRow,
  isRowComplete,
  isRowEmpty,
  missingRequired,
  sheetDedupeKey,
} from "@/lib/sheet";
import type { SheetRow } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { CopyButton, EmptyState, PageHero, SavedIndicator, StatusBadge } from "@/components/ui";
import { SheetGrid, type SheetGridHandle } from "@/components/SheetGrid";
import { ImportDialog } from "@/components/ImportDialog";
import { toast } from "@/components/Toast";

export default function DataAdsDetailPage() {
  const state = useCdn();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const dataAds = state.dataAds.find((d) => d.id === params?.id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<SheetRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const history = useRef<SheetRow[][]>([]);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const gridRef = useRef<SheetGridHandle>(null);

  if (!dataAds) {
    return (
      <div className="px-9 pt-10">
        <div className="card">
          <EmptyState
            icon="table"
            title="Data Ads not found"
            body="It may have been deleted from the Data Ads list."
            action={
              <Link href="/data-ads" className="btn btn-sm">
                Back to Data Ads
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const campaign = state.campaigns.find((c) => c.id === dataAds.campaignId);
  const brand = state.brands.find((b) => b.id === dataAds.brandId);
  const sheet = dataAds.sheets.find((s) => s.id === activeId) ?? dataAds.sheets[0];
  const rows = sheet?.rows ?? [];
  const columns = TL_COLUMNS;

  const dupSet = useMemo(() => {
    const seen = new Map<string, number>();
    rows.forEach((r) => {
      const k = sheetDedupeKey(r);
      if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
    });
    return new Set(
      rows
        .filter((r) => {
          const k = sheetDedupeKey(r);
          return k && (seen.get(k) ?? 0) > 1;
        })
        .map((r) => r.id),
    );
  }, [rows]);

  const complete = rows.filter((r) => isRowComplete(r, columns)).length;
  const incomplete = rows.filter((r) => !isRowEmpty(r, columns) && missingRequired(r, columns).length > 0).length;
  const linked = rows.filter((r) => r.shortcode).length;
  const totalRows = dataAds.sheets.reduce((sum, s) => sum + s.rows.length, 0);

  function applyRows(next: SheetRow[]) {
    if (!sheet) return;
    history.current.push(rows);
    if (history.current.length > 40) history.current.shift();
    setCanUndo(true);
    cdn.setDataAdsRows(dataAds!.id, sheet.id, next);
  }

  function undo() {
    const prev = history.current.pop();
    setCanUndo(history.current.length > 0);
    if (prev && sheet) cdn.setDataAdsRows(dataAds!.id, sheet.id, prev);
  }

  function deleteRow(row: SheetRow) {
    applyRows(rows.filter((r) => r.id !== row.id));
  }

  useEffect(() => {
    history.current = [];
    setCanUndo(false);
  }, [sheet?.id]);

  function removeDuplicates() {
    if (!sheet) return;
    const seen = new Set<string>();
    const kept = rows.filter((r) => {
      const k = sheetDedupeKey(r);
      if (!k) return true;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    applyRows(kept);
    toast(`${rows.length - kept.length} duplicate row(s) removed`);
  }

  function clearEmpty() {
    applyRows(rows.filter((r) => !isRowEmpty(r, columns)));
    toast("Empty rows cleared");
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

  function save() {
    setSaving(true);
    cdn.saveDataAds(dataAds!.id);
    setTimeout(() => {
      setSaving(false);
      toast("Saved");
    }, 350);
  }

  function exportCsv() {
    download(
      `data-ads-${dataAds!.id}-${sheet?.name ?? "sheet"}.csv`.replace(/\s+/g, "-").toLowerCase(),
      toCSV(
        [...columns.map((c) => c.label), "Clean Publish Link", "Shortcode", "Scrape"],
        rows.map((r) => [...columns.map((c) => String(r[c.key] ?? "")), r.cleanLink, r.shortcode, r.scrape]),
      ),
    );
    toast("Sheet exported as CSV");
  }

  function importRows(raw: Record<string, string>[]) {
    const mapped: SheetRow[] = raw.map((r) => {
      const row: SheetRow = { ...emptySheetRow(), ...r, scrape: "pending" };
      const derived = deriveSheetRow(row, "linkPost", r.linkPost ?? "");
      row.cleanLink = derived.cleanLink;
      row.shortcode = derived.shortcode;
      return row;
    });
    applyRows([...rows, ...mapped]);
  }

  function addSheet() {
    const created = cdn.addDataAdsSheet(dataAds!.id);
    if (created) setActiveId(created.id);
    toast("Sheet added");
  }

  return (
    <>
      <PageHero
        compact
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/data-ads" className="inline-flex items-center gap-1 hover:underline">
              <Icon name="arrowLeft" size={12} /> Data Ads
            </Link>
            <span className="text-[var(--muted-2)]">/</span>
            Tracker list
          </span>
        }
        title={dataAds.name}
        sub={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{brand?.name}</span>
            <span className="text-[var(--muted-2)]">·</span>
            <span>{campaign?.name}</span>
            <span className="text-[var(--muted-2)]">·</span>
            <span>{dataAds.agency}</span>
            <span className="text-[var(--muted-2)]">·</span>
            <span>{dataAds.sheets.length} sheets · {fmtInt(totalRows)} rows</span>
            <SavedIndicator savedAt={dataAds.savedAt} className="ml-1" />
          </span>
        }
        actions={
          <>
            <button className="btn" onClick={exportCsv}>
              <Icon name="download" size={13} />
              Export
            </button>
            <button className="btn" onClick={() => setImportOpen(true)}>
              <Icon name="upload" size={13} />
              Import
            </button>
            <button className="btn btn-dark" onClick={save} disabled={saving}>
              <Icon name="check" size={13} className={saving ? "spin" : ""} />
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      />

      <div className="relative z-[1] px-9 pt-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Rows · this sheet" value={fmtInt(rows.length)} hint={`${complete} complete rows`} />
          <Stat
            label="Required complete"
            value={pct(rows.length ? complete / rows.length : 0)}
            hint={incomplete ? `${incomplete} rows missing required columns` : "All rows have required columns"}
            accent={incomplete ? "warn" : "ok"}
          />
          <Stat label="With link" value={`${linked}/${rows.length}`} hint="Shortcode extracted for matching" />
          <Stat
            label="Duplicates"
            value={fmtInt(dupSet.size)}
            hint={dupSet.size ? "Remove before syncing" : "Sheet is clean"}
            accent={dupSet.size ? "warn" : "ok"}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-1 rounded-xl border border-[var(--line-2)] bg-white/80 p-1">
          {dataAds.sheets.map((s) => {
            const on = s.id === sheet?.id;
            const isRenaming = renaming?.id === s.id;
            return (
              <div
                key={s.id}
                className={`group flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] ${
                  on ? "bg-[#0b1017] text-white" : "text-[var(--muted)] hover:bg-[#f4f8ff]"
                }`}
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renaming.value}
                    onChange={(e) => setRenaming({ id: s.id, value: e.target.value })}
                    onBlur={() => {
                      if (renaming.value.trim()) cdn.renameDataAdsSheet(dataAds.id, s.id, renaming.value.trim());
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (renaming.value.trim()) cdn.renameDataAdsSheet(dataAds.id, s.id, renaming.value.trim());
                        setRenaming(null);
                      }
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    className="w-[120px] rounded bg-white px-1 py-0.5 text-[11px] text-[var(--ink)] outline-none"
                  />
                ) : (
                  <button onClick={() => setActiveId(s.id)} className="flex items-center gap-1.5">
                    {s.name}
                    <span className={on ? "text-white/50" : "text-[var(--muted-2)]"}>{s.rows.length}</span>
                  </button>
                )}
                {on && !isRenaming && (
                  <>
                    <button
                      className="ml-1 grid h-5 w-5 place-items-center rounded hover:bg-white/15"
                      title="Rename sheet"
                      onClick={() => setRenaming({ id: s.id, value: s.name })}
                    >
                      <Icon name="edit" size={10} />
                    </button>
                    {dataAds.sheets.length > 1 && (
                      <button
                        className="grid h-5 w-5 place-items-center rounded hover:bg-white/15"
                        title="Delete sheet"
                        onClick={() => {
                          cdn.deleteDataAdsSheet(dataAds.id, s.id);
                          setActiveId(null);
                          toast("Sheet deleted");
                        }}
                      >
                        <Icon name="x" size={10} />
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
          <button
            onClick={addSheet}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--blue-deep)] hover:bg-[#f4f8ff]"
          >
            <Icon name="plus" size={11} /> Sheet
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn" onClick={undo} disabled={!canUndo} title="Undo last change (Ctrl+Z)">
            <Icon name="undo" size={13} />
            Undo
          </button>
          <button className="btn" onClick={pasteFromClipboard}>
            <Icon name="copy" size={13} />
            Paste block
          </button>
          <button className="btn" onClick={() => setImportOpen(true)}>
            <Icon name="upload" size={13} />
            Import CSV
          </button>
          <button className="btn" onClick={() => applyRows([...rows, emptySheetRow()])}>
            <Icon name="plus" size={13} />
            Add row
          </button>
          <button className="btn" onClick={removeDuplicates} disabled={rows.length === 0}>
            <Icon name="filter" size={13} />
            Remove duplicate
            {dupSet.size > 0 && <span className="badge badge-bad !h-[18px] !px-1.5 !text-[8.5px]">{dupSet.size}</span>}
          </button>
          <button className="btn btn-ghost" onClick={clearEmpty}>
            Clear empty rows
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
          <SheetGrid<SheetRow>
            ref={gridRef}
            columns={columns}
            rows={rows}
            onChange={applyRows}
            derive={deriveSheetRow}
            makeRow={emptySheetRow}
            duplicates={dupSet}
            dedupeKey={sheetDedupeKey}
            onSelectRow={(row) => setSelected(row)}
            onUndo={undo}
            onDeleteRow={deleteRow}
            marker={(r) =>
              !isRowEmpty(r, columns) && missingRequired(r, columns).length > 0 ? "bad" : null
            }
            emptyHint="Paste the tracker list block here — one sheet per batch/seat."
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--line)] bg-[#f7faff] text-[var(--muted-2)]">
              <Icon name="link" size={13} />
            </span>
            <div>
              <div className="eyebrow-dim !text-[8.5px]">Derived · read only</div>
              <div className="text-[11.5px] font-medium">Clean link &amp; shortcode</div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="eyebrow-dim !text-[8.5px]">Clean link</div>
            <div className="mono max-w-[360px] truncate text-[10.5px] text-[var(--ink-2)]">{selected?.cleanLink || "—"}</div>
          </div>
          <div>
            <div className="eyebrow-dim !text-[8.5px]">Shortcode</div>
            <div className="mono text-[11px] font-medium text-[var(--blue-deep)]">{selected?.shortcode || "—"}</div>
          </div>
          <div>
            <div className="eyebrow-dim !text-[8.5px]">Missing required</div>
            <div className="text-[11px] font-medium">
              {selected && !isRowEmpty(selected, columns) ? missingRequired(selected, columns).join(", ") || "—" : "—"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-[var(--muted-2)]">
            <CopyButton value={`/data-ads/${dataAds.id}`} label="Link" compact />
            <span>Ctrl+Z to undo · trash icon removes a row</span>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/data-ads")}>
            Back to Data Ads
          </button>
        </div>
      </div>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        columns={TL_COLUMNS.map((c) => ({ key: c.key, label: c.label, required: c.required }))}
        title={`Import into ${sheet?.name ?? "sheet"}`}
        templateName="data-ads-template.csv"
        onImport={importRows}
      />
    </>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: "ok" | "warn" }) {
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
