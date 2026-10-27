"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { download, parseDelimited, toCSV } from "@/lib/utils";
import { Icon } from "./Icon";
import { Modal } from "./ui";
import { toast } from "./Toast";

export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  columns: ImportColumn[];
  title?: string;
  templateName?: string;
  /** Receives one object per imported row, keyed by target column key. */
  onImport: (rows: Record<string, string>[], meta: { mapping: Record<string, number>; headerRow: boolean }) => void;
}

const SYNONYMS: Record<string, string[]> = {
  account: ["link account", "link to account", "account", "username", "handle", "akun"],
  publishLink: ["publish link", "link post", "post link", "link", "url", "posting link"],
  postingDate: ["posting date", "post date", "date", "tanggal"],
  publishDate: ["publish date", "published", "tayang"],
  niche: ["niche", "category", "kategori"],
  followers: ["followers", "follower", "audience"],
  sw: ["sw", "switch", "wave"],
  content: ["content", "creative", "creative name", "konten"],
  attendance: ["attendance", "attend", "hadir", "kehadiran"],
  creativeName: ["creative name", "creative", "name", "nama kreatif"],
  startDate: ["start date", "start", "mulai", "tanggal mulai"],
  endDate: ["end date", "end", "selesai", "tanggal selesai"],
};

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function guessIndex(label: string, key: string, headers: string[]): number {
  const candidates = [label, ...(SYNONYMS[key] ?? [])].map(norm);
  for (const cand of candidates) {
    const exact = headers.findIndex((h) => norm(h) === cand);
    if (exact >= 0) return exact;
  }
  for (const cand of candidates) {
    const partial = headers.findIndex((h) => {
      const n = norm(h);
      return n.includes(cand) || cand.includes(n);
    });
    if (partial >= 0) return partial;
  }
  return -1;
}

export function ImportDialog({ open, onClose, columns, onImport, title = "Import spreadsheet", templateName = "template.csv" }: Props) {
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [headerRow, setHeaderRow] = useState(true);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const matrix = useMemo(() => parseDelimited(raw), [raw]);
  const headers = headerRow ? (matrix[0] ?? []) : [];
  const dataRows = headerRow ? matrix.slice(1) : matrix;
  const width = Math.max(0, ...matrix.map((r) => r.length));

  useEffect(() => {
    if (!open) return;
    if (matrix.length === 0) {
      setMapping({});
      return;
    }
    const auto: Record<string, number> = {};
    columns.forEach((c, i) => {
      const idx = headerRow ? guessIndex(c.label, c.key, headers) : i;
      auto[c.key] = idx;
    });
    setMapping(auto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, headerRow, open]);

  function ingestFile(file: File) {
    if (!file) return;
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
      toast("Use CSV or TSV. In Excel: File → Save as → CSV.", "warn");
      return;
    }
    file.text().then((text) => {
      setRaw(text);
      setFileName(file.name);
      setHeaderRow(true);
    });
  }

  function reset() {
    setRaw("");
    setFileName("");
    setMapping({});
    setHeaderRow(true);
  }

  function doImport() {
    const mapped = columns.filter((c) => mapping[c.key] >= 0);
    if (mapped.length === 0) {
      toast("Pick at least one column to import", "err");
      return;
    }
    const required = columns.filter((c) => c.required);
    const missing = required.filter((c) => mapping[c.key] < 0);
    if (missing.length) {
      toast(`Map the required column: ${missing.map((m) => m.label).join(", ")}`, "err");
      return;
    }

    const rows: Record<string, string>[] = [];
    for (const line of dataRows) {
      const obj: Record<string, string> = {};
      let hasValue = false;
      for (const col of columns) {
        const src = mapping[col.key];
        const val = src >= 0 ? (line[src] ?? "").trim() : "";
        obj[col.key] = val;
        if (val) hasValue = true;
      }
      if (hasValue) rows.push(obj);
    }
    onImport(rows, { mapping, headerRow });
    toast(`${rows.length} row${rows.length === 1 ? "" : "s"} imported`);
    reset();
    onClose();
  }

  const previewRows = matrix.slice(0, 4);

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      eyebrow="Bulk input"
      title={title}
      width={860}
      subtitle="Paste straight from Google Sheets or Excel. Columns do not need to match — map them once here."
      footer={
        <>
          <span className="mr-auto text-[11px] text-[var(--muted-2)]">
            {dataRows.length > 0 ? `${dataRows.length} data rows detected` : "No data yet"}
          </span>
          <button
            className="btn btn-ghost"
            onClick={() =>
              download(
                templateName,
                toCSV(
                  columns.map((c) => c.label),
                  [columns.map(() => "")],
                ),
              )
            }
          >
            <Icon name="download" size={12} />
            Template
          </button>
          <button className="btn btn-dark" onClick={doImport} disabled={matrix.length === 0}>
            Import {dataRows.length > 0 ? `${dataRows.length} rows` : ""}
          </button>
        </>
      }
    >
      {matrix.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) ingestFile(f);
          }}
          className={`rounded-2xl border border-dashed p-6 text-center transition-colors ${
            dragOver ? "border-[var(--blue)] bg-[#f2f7ff]" : "border-[var(--line-3)] bg-[#fafcff]"
          }`}
        >
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full border border-[var(--line-2)] bg-white text-[var(--muted)]">
            <Icon name="upload" size={18} />
          </div>
          <div className="text-[13px] font-semibold">Drop a CSV here, or paste below</div>
          <div className="mt-1 text-[11.5px] text-[var(--muted)]">
            Excel file? Save as CSV first — header row optional, we auto-detect it.
          </div>
          <button className="btn btn-sm mt-4" onClick={() => fileRef.current?.click()}>
            Choose file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) ingestFile(f);
            }}
          />
          <div className="mx-auto mt-5 max-w-[520px]">
            <textarea
              className="field h-[110px] w-full resize-none !py-2 font-mono !text-[11px]"
              placeholder={"link post\tposting date\tfollowers\nhttps://instagram.com/p/C8x…\t2026-09-12\t48.2K"}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            <div className="mt-1.5 text-left text-[10.5px] text-[var(--muted-2)]">
              Tip: select the block in your sheet, copy (Ctrl+C) and paste here — tabs are preserved.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] bg-[#fafcff] px-3 py-2.5 text-[11.5px]">
            <span className="flex items-center gap-1.5 font-medium">
              <Icon name="table" size={13} />
              {fileName || "Pasted data"}
            </span>
            <span className="text-[var(--muted-2)]">
              {matrix.length} rows · {width} columns
            </span>
            <label className="ml-auto flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" checked={headerRow} onChange={(e) => setHeaderRow(e.target.checked)} className="accent-[var(--blue)]" />
              First row is a header
            </label>
            <button className="btn btn-sm" onClick={reset}>
              Replace
            </button>
          </div>

          <div>
            <div className="eyebrow-dim mb-2">Preview</div>
            <div className="overflow-auto rounded-xl border border-[var(--line)]">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-[34px]" />
                    {Array.from({ length: width }).map((_, i) => (
                      <th key={i} className="whitespace-nowrap">
                        {String.fromCharCode(65 + i)}
                        {headers[i] ? ` · ${headers[i]}` : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, ri) => (
                    <tr key={ri}>
                      <td className="text-[10px] text-[var(--muted-2)]">{ri + 1}</td>
                      {Array.from({ length: width }).map((_, ci) => (
                        <td key={ci} className="max-w-[180px] truncate font-mono text-[10.5px] text-[var(--muted)]">
                          {r[ci] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="eyebrow-dim mb-2">Map columns</div>
            <div className="grid gap-2 md:grid-cols-2">
              {columns.map((c) => (
                <div key={c.key} className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-2.5 py-2">
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium">
                    {c.label}
                    {c.required && <span className="ml-1 text-[#d92d20]">*</span>}
                  </span>
                  <Icon name="arrowLeft" size={12} className="text-[var(--muted-2)]" />
                  <select
                    className="field !h-[28px] !text-[11px]"
                    value={mapping[c.key] ?? -1}
                    onChange={(e) => setMapping((m) => ({ ...m, [c.key]: Number(e.target.value) }))}
                  >
                    <option value={-1}>— skip —</option>
                    {Array.from({ length: width }).map((_, i) => (
                      <option key={i} value={i}>
                        {String.fromCharCode(65 + i)} {headers[i] ? `· ${headers[i]}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
