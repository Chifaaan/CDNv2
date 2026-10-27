"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { download, fmtInt, pct, toCSV } from "@/lib/utils";
import { PROJECT_LABEL, PROJECT_SLUG } from "@/lib/seed";
import {
  deriveSheetRow,
  emptySheetRow,
  isRowComplete,
  isRowEmpty,
  missingRequired,
  resolveColumns,
  sheetDedupeKey,
  templatesForType,
} from "@/lib/sheet";
import type { SheetRow } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { CopyButton, EmptyState, PageHero, SavedIndicator, StatusBadge } from "@/components/ui";
import { SheetGrid, type SheetGridHandle } from "@/components/SheetGrid";
import { ImportDialog } from "@/components/ImportDialog";
import { ColumnSettingsModal } from "@/components/ColumnSettingsModal";
import { toast } from "@/components/Toast";

export default function ProjectSheetPage() {
  const state = useCdn();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const project = state.projects.find((p) => p.id === params?.id);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<SheetRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const history = useRef<SheetRow[][]>([]);
  const gridRef = useRef<SheetGridHandle>(null);

  if (!project) {
    return (
      <div className="px-9 pt-10">
        <div className="card">
          <EmptyState
            icon="projects"
            title="Project sheet not found"
            body="It may have been removed, or the PM link belongs to another brand."
            action={
              <Link href="/projects/all" className="btn btn-sm">
                Back to project list
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const campaign = state.campaigns.find((c) => c.id === project.campaignId);
  const brand = state.brands.find((b) => b.id === project.brandId);
  const template = templatesForType(project.type);
  const columns = useMemo(() => resolveColumns(template, project.columns), [template, project.columns]);

  const dupSet = useMemo(() => {
    const seen = new Map<string, number>();
    project.rows.forEach((r) => {
      const k = sheetDedupeKey(r);
      if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
    });
    return new Set(
      project.rows
        .filter((r) => {
          const k = sheetDedupeKey(r);
          return k && (seen.get(k) ?? 0) > 1;
        })
        .map((r) => r.id),
    );
  }, [project.rows]);

  const rowCount = project.rows.length;
  const complete = project.rows.filter((r) => isRowComplete(r, columns)).length;
  const incomplete = project.rows.filter(
    (r) => !isRowEmpty(r, columns) && missingRequired(r, columns).length > 0,
  ).length;
  const linked = project.rows.filter((r) => r.shortcode).length;

  function applyRows(next: SheetRow[]) {
    history.current.push(project!.rows);
    if (history.current.length > 40) history.current.shift();
    setCanUndo(true);
    cdn.setProjectRows(project!.id, next);
  }

  function undo() {
    const prev = history.current.pop();
    setCanUndo(history.current.length > 0);
    if (prev) cdn.setProjectRows(project!.id, prev);
  }

  function deleteRow(row: SheetRow) {
    applyRows(project!.rows.filter((r) => r.id !== row.id));
  }

  function removeDuplicates() {
    const seen = new Set<string>();
    const kept = project!.rows.filter((r) => {
      const k = sheetDedupeKey(r);
      if (!k) return true;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    applyRows(kept);
    toast(`${project!.rows.length - kept.length} duplicate row(s) removed`);
  }

  function clearEmpty() {
    const kept = project!.rows.filter((r) => !isRowEmpty(r, columns));
    applyRows(kept);
    toast(`${project!.rows.length - kept.length} empty row(s) cleared`);
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
      `${PROJECT_SLUG[project!.type]}-${project!.id}.csv`,
      toCSV(
        [...columns.map((c) => c.label), "Clean Publish Link", "Shortcode", "Scrape"],
        project!.rows.map((r) => [
          ...columns.map((c) => String((r as unknown as Record<string, string>)[c.key] ?? "")),
          r.cleanLink,
          r.shortcode,
          r.scrape,
        ]),
      ),
    );
    toast("Sheet exported as CSV");
  }

  function save() {
    setSaving(true);
    cdn.saveProject(project!.id);
    setTimeout(() => {
      setSaving(false);
      toast("Saved");
    }, 350);
  }

  function importRows(rows: Record<string, string>[]) {
    const mapped: SheetRow[] = rows.map((raw) => {
      const row: SheetRow = { ...emptySheetRow(), ...raw, scrape: "pending" };
      const derived = deriveSheetRow(row, "publishLink", raw.publishLink ?? "");
      row.cleanLink = derived.cleanLink;
      row.shortcode = derived.shortcode;
      return row;
    });
    applyRows([...project!.rows, ...mapped]);
  }

  return (
    <>
      <PageHero
        compact
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/projects/all" className="inline-flex items-center gap-1 hover:underline">
              <Icon name="arrowLeft" size={12} /> Project list
            </Link>
            <span className="text-[var(--muted-2)]">/</span>
            {PROJECT_LABEL[project.type]} · Tracker sheet
          </span>
        }
        title={campaign?.name ?? "Untitled campaign"}
        sub={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{brand?.name}</span>
            <span className="text-[var(--muted-2)]">·</span>
            <span>{project.agency}</span>
            <span className="text-[var(--muted-2)]">·</span>
            <span className="mono text-[11px]">/pm/{project.pmLink.split("/pm/")[1]}</span>
            <CopyButton value={project.pmLink} label="PM link" compact />
            <SavedIndicator savedAt={project.savedAt} className="ml-1" />
          </span>
        }
        actions={
          <>
            <button className="btn" onClick={exportCsv}>
              <Icon name="download" size={13} />
              Export CSV
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
        <div className="grid gap-3 sm:grid-cols-3">
          <SheetStat label="Rows" value={fmtInt(rowCount)} hint={`${complete} complete rows · ${linked} shortcodes`} />
          <SheetStat
            label="Required complete"
            value={pct(rowCount ? complete / rowCount : 0)}
            hint={incomplete ? `${incomplete} rows missing required columns` : "All rows have required columns"}
            accent={incomplete ? "warn" : "ok"}
          />
          <SheetStat
            label="Duplicates"
            value={fmtInt(dupSet.size)}
            hint={dupSet.size ? "Run remove duplicate before syncing" : "Sheet is clean"}
            accent={dupSet.size ? "warn" : "ok"}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button className="btn" onClick={undo} disabled={!canUndo} title="Undo last change (Ctrl+Z)">
            <Icon name="undo" size={13} />
            Undo
          </button>
          <button className="btn" onClick={() => setColumnsOpen(true)} title="Reorder columns and set required fields">
            <Icon name="list" size={13} />
            Columns
          </button>
          <button className="btn" onClick={pasteFromClipboard}>
            <Icon name="copy" size={13} />
            Paste block
          </button>
          <button className="btn" onClick={() => setImportOpen(true)}>
            <Icon name="upload" size={13} />
            Import CSV
          </button>
          <button className="btn" onClick={() => applyRows([...project.rows, emptySheetRow()])}>
            <Icon name="plus" size={13} />
            Add row
          </button>
          <button className="btn" onClick={removeDuplicates} disabled={rowCount === 0}>
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
            rows={project.rows}
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
            emptyHint="Paste a block of rows from your spreadsheet, or use Import to map columns."
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
            <div className="mono max-w-[380px] truncate text-[10.5px] text-[var(--ink-2)]">
              {selected?.cleanLink || "—"}
            </div>
          </div>

          <div>
            <div className="eyebrow-dim !text-[8.5px]">Shortcode</div>
            <div className="mono text-[11px] font-medium text-[var(--blue-deep)]">{selected?.shortcode || "—"}</div>
          </div>

          <div>
            <div className="eyebrow-dim !text-[8.5px]">Missing required</div>
            <div className="text-[11px] font-medium">
              {selected && !isRowEmpty(selected, columns)
                ? missingRequired(selected, columns).join(", ") || "—"
                : "—"}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 text-[10px] text-[var(--muted-2)]">
            <span>Ctrl+Z to undo · trash icon removes a row</span>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/projects/all")}>
            Back to project list
          </button>
        </div>
      </div>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        columns={columns.map((c) => ({ key: c.key, label: c.label, required: c.required }))}
        title={`Import ${PROJECT_LABEL[project.type]} sheet`}
        templateName={`${PROJECT_SLUG[project.type]}-template.csv`}
        onImport={importRows}
      />

      <ColumnSettingsModal
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        columns={columns}
        defaults={template}
        onSave={(config) => {
          cdn.setProjectColumns(project.id, config);
          toast("Column layout saved");
        }}
      />
    </>
  );
}

function SheetStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: "ok" | "warn" | "bad";
}) {
  const color = accent === "bad" ? "#d92d20" : accent === "warn" ? "#b25c05" : accent === "ok" ? "#067647" : undefined;
  return (
    <div className="card px-4 py-3.5">
      <div className="eyebrow-dim !text-[9px]">{label}</div>
      <div className="metric-sm mt-1.5" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-[10.5px] text-[var(--muted-2)]">{hint}</div>
    </div>
  );
}
