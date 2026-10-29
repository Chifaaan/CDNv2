import type { Campaign, SheetRow } from "./types";

const now = () => new Date();

export function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  if (Math.abs(n) >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (Math.abs(n) >= 1_000) {
    const v = n / 1_000;
    return `${v < 100 ? Math.round(v * 10) / 10 : Math.round(v)}`.replace(/\.0$/, "") + "K";
  }
  return String(Math.round(n));
}

export function fmtInt(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

export function pct1(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function mmdd(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

export function daysAgo(n: number): string {
  const d = now();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function toCSV(headers: string[], rows: string[][]): string {
  return [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
}

export function download(name: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Normalize follower counts to a dot-separated integer, e.g. 1.234.567. */
export function normalizeFollowers(raw: string): string {
  const input = String(raw ?? "").trim();
  if (!input) return "";
  const compact = input.replace(/\s/g, "").toLowerCase();

  const suffix = compact.match(/^([\d.,]+)([kmb])$/);
  let multiplier = 1;
  let numeric = compact;
  if (suffix) {
    numeric = suffix[1];
    multiplier = suffix[2] === "k" ? 1_000 : suffix[2] === "m" ? 1_000_000 : 1_000_000_000;
  }

  if (!/^[\d.,]+$/.test(numeric)) return input;

  const dots = (numeric.match(/\./g) ?? []).length;
  const commas = (numeric.match(/,/g) ?? []).length;
  let value: number;

  if (dots > 0 && commas > 0) {
    // The last separator is the decimal separator, the other one groups thousands.
    const lastDot = numeric.lastIndexOf(".");
    const lastComma = numeric.lastIndexOf(",");
    if (lastComma > lastDot) {
      value = Number(numeric.replace(/\./g, "").replace(",", "."));
    } else {
      value = Number(numeric.replace(/,/g, ""));
    }
  } else if (dots > 0) {
    const parts = numeric.split(".");
    const thousands = parts.length > 2 || (parts[1]?.length === 3 && parts[0].length <= 3);
    value = thousands ? Number(parts.join("")) : Number(parts.join("."));
  } else if (commas > 0) {
    const parts = numeric.split(",");
    const thousands = parts.length > 2 || (parts[1]?.length === 3 && parts[0].length <= 3);
    value = thousands ? Number(parts.join("")) : Number(parts.join("."));
  } else {
    value = Number(numeric);
  }

  if (!Number.isFinite(value)) return input;
  const rounded = Math.round(value * multiplier);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}


export function parseDelimited(text: string): string[][] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd();
  if (!clean) return [];
  const firstLine = clean.split("\n")[0] ?? "";
  const delim = firstLine.includes("\t") ? "\t" : firstLine.split(",").length > 1 ? "," : "\t";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === delim) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  rows.push(row);
  return rows.filter((r) => r.some((c) => c !== ""));
}

export function campaignOf(state: { campaigns: Campaign[] }, id: string | null) {
  if (!id) return undefined;
  return state.campaigns.find((c) => c.id === id);
}

export function campaignName(state: { campaigns: Campaign[] }, id: string | null) {
  return campaignOf(state, id)?.name ?? "Unmatched";
}

export function projectRowsOfBrand(projects: { brandId: string; rows: SheetRow[] }[], brandId: string): SheetRow[] {
  return projects.filter((p) => p.brandId === brandId).flatMap((p) => p.rows);
}
