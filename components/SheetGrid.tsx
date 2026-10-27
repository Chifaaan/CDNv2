"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { parseDelimited, uid } from "@/lib/utils";
import { Icon } from "./Icon";
import { toast } from "./Toast";

export interface SheetColumn<T> {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "url" | "date" | "number" | "percent";
  readOnly?: boolean;
  required?: boolean;
  hint?: string;
  render?: (row: T) => ReactNode;
}

export interface SheetGridHandle {
  pasteText: (text: string) => void;
  focus: () => void;
}

export interface SheetGridProps<T extends { id: string }> {
  columns: SheetColumn<T>[];
  rows: T[];
  onChange: (rows: T[]) => void;
  /** Derive extra fields (shortcode, clean link, match status) when a cell changes. */
  derive?: (row: T, key: string, value: string) => T;
  makeRow?: () => T;
  minRows?: number;
  duplicates?: Set<string>;
  dedupeKey?: (row: T) => string;
  marker?: (row: T) => "ok" | "bad" | "warn" | null;
  extraColumn?: { label: string; width?: number; render: (row: T) => ReactNode };
  emptyHint?: string;
  onPasteReport?: (report: { pasted: number; skipped: number; cells: number }) => void;
  onSelectRow?: (row: T | null, index: number) => void;
  onUndo?: () => void;
  onDeleteRow?: (row: T, index: number) => void;
}

function letter(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

function SheetGridInner<T extends { id: string }>(
  {
    columns,
    rows,
    onChange,
    derive,
    makeRow,
    minRows = 14,
    duplicates,
    dedupeKey,
    marker,
    extraColumn,
    emptyHint,
    onPasteReport,
    onSelectRow,
    onUndo,
    onDeleteRow,
  }: SheetGridProps<T>,
  ref: React.Ref<SheetGridHandle>,
) {
  const [sel, setSel] = useState({ r: 0, c: 0 });
  const [anchor, setAnchor] = useState({ r: 0, c: 0 });
  const [editing, setEditing] = useState<{ r: number; c: number; value: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastChange = useRef<{ at: number; report: { pasted: number; skipped: number; cells: number } } | null>(null);

  const blank = useCallback((): T => {
    if (makeRow) return makeRow();
    const base: Record<string, unknown> = { id: uid("row") };
    columns.forEach((c) => (base[c.key] = ""));
    return base as unknown as T;
  }, [makeRow, columns]);

  const display = useMemo(() => {
    const list: T[] = [...rows];
    // Always keep one empty row at the bottom so Enter can grow the sheet.
    const blanks = Math.max(1, minRows - rows.length);
    for (let i = 0; i < blanks; i++) list.push(blank());
    return list;
  }, [rows, minRows, blank]);

  const maxRow = display.length;
  const maxCol = columns.length;

  const isBlankRow = useCallback(
    (row: T | undefined) => {
      if (!row) return true;
      return columns.every((c) => c.readOnly || !String((row as Record<string, unknown>)[c.key] ?? "").trim());
    },
    [columns],
  );

  const commitRows = useCallback(
    (list: T[]) => {
      const real = rows;
      const kept = list.filter((r, i) => !(i >= real.length && isBlankRow(r)));
      onChange(kept);
    },
    [rows, onChange, isBlankRow],
  );

  const patchCell = useCallback(
    (r: number, c: number, value: string) => {
      const col = columns[c];
      if (!col || col.readOnly) return;
      const next = [...display];
      let row = next[r];
      if (!row) {
        row = blank();
        next[r] = row;
      }
      let patched = { ...row, [col.key]: value } as T;
      if (derive) patched = derive(patched, col.key, value);
      next[r] = patched;
      commitRows(next);
    },
    [columns, display, blank, derive, commitRows],
  );

  const clearCells = useCallback(() => {
    const r0 = Math.min(sel.r, anchor.r);
    const r1 = Math.max(sel.r, anchor.r);
    const c0 = Math.min(sel.c, anchor.c);
    const c1 = Math.max(sel.c, anchor.c);
    const next = [...display];
    for (let r = r0; r <= r1; r++) {
      if (!next[r]) next[r] = blank();
      let row = next[r];
      for (let c = c0; c <= c1; c++) {
        const col = columns[c];
        if (!col || col.readOnly) continue;
        row = { ...row, [col.key]: "" } as T;
        if (derive) row = derive(row, col.key, "");
      }
      next[r] = row;
    }
    commitRows(next);
  }, [display, sel, anchor, columns, derive, commitRows, blank]);

  const move = useCallback(
    (dr: number, dc: number, extend = false) => {
      setSel((s) => {
        const r = Math.min(maxRow - 1, Math.max(0, s.r + dr));
        const c = Math.min(maxCol - 1, Math.max(0, s.c + dc));
        if (!extend) setAnchor({ r, c });
        return { r, c };
      });
    },
    [maxRow, maxCol],
  );

  const startEdit = useCallback(
    (r: number, c: number, initial?: string) => {
      const col = columns[c];
      if (!col || col.readOnly) return;
      const value = initial ?? String((display[r] as Record<string, unknown>)?.[col.key] ?? "");
      setEditing({ r, c, value });
    },
    [columns, display],
  );

  const commitEdit = useCallback(
    (moveDown = true) => {
      if (!editing) return;
      patchCell(editing.r, editing.c, editing.value);
      setEditing(null);
      if (moveDown) move(1, 0);
      requestAnimationFrame(() => wrapRef.current?.focus());
    },
    [editing, patchCell, move],
  );

  const applyMatrix = useCallback(
    (startR: number, startC: number, matrix: string[][]) => {
      const next = [...display];
      let pasted = 0;
      let cells = 0;

      matrix.forEach((line, i) => {
        const r = startR + i;
        const candidateCols = line.slice(0, Math.max(1, maxCol - startC));
        let row = next[r] ?? blank();
        candidateCols.forEach((val, j) => {
          const c = startC + j;
          const col = columns[c];
          if (!col || col.readOnly) return;
          row = { ...row, [col.key]: val } as T;
          if (derive) row = derive(row, col.key, val);
          cells++;
        });
        next[r] = row;
        pasted++;
      });

      commitRows(next);
      const report = { pasted, skipped: 0, cells };
      lastChange.current = { at: Date.now(), report };
      onPasteReport?.(report);
      setSel({ r: startR, c: startC });
      setAnchor({ r: startR, c: startC });
    },
    [display, columns, derive, commitRows, blank, maxCol, onPasteReport],
  );

  const pasteText = useCallback(
    (text: string) => {
      const matrix = parseDelimited(text);
      if (!matrix.length) return;
      applyMatrix(sel.r, sel.c, matrix);
      toast(
        matrix.length === 1
          ? "Pasted into 1 cell"
          : `${matrix.length} row${matrix.length === 1 ? "" : "s"} added · duplicates are flagged, not dropped`,
      );
    },
    [sel.r, sel.c, applyMatrix],
  );

  useImperativeHandle(ref, () => ({
    pasteText,
    focus: () => wrapRef.current?.focus(),
  }), [pasteText]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      onUndo?.();
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      if (e.key.toLowerCase() === "v") return; // let paste event run
      if (e.key.toLowerCase() === "c") {
        const r0 = Math.min(sel.r, anchor.r);
        const r1 = Math.max(sel.r, anchor.r);
        const c0 = Math.min(sel.c, anchor.c);
        const c1 = Math.max(sel.c, anchor.c);
        const lines: string[] = [];
        for (let r = r0; r <= r1; r++) {
          const line: string[] = [];
          for (let c = c0; c <= c1; c++) {
            line.push(String((display[r] as Record<string, unknown>)?.[columns[c].key] ?? ""));
          }
          lines.push(line.join("\t"));
        }
        navigator.clipboard?.writeText(lines.join("\n"));
        toast(`${lines.length} row${lines.length === 1 ? "" : "s"} copied`);
        e.preventDefault();
        return;
      }
      return;
    }
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        move(-1, 0, e.shiftKey);
        return;
      case "ArrowDown":
        e.preventDefault();
        move(1, 0, e.shiftKey);
        return;
      case "ArrowLeft":
        e.preventDefault();
        move(0, -1, e.shiftKey);
        return;
      case "ArrowRight":
        e.preventDefault();
        move(0, 1, e.shiftKey);
        return;
      case "Tab":
        e.preventDefault();
        move(0, e.shiftKey ? -1 : 1);
        return;
      case "Enter":
        e.preventDefault();
        startEdit(sel.r, sel.c);
        return;
      case "F2":
        e.preventDefault();
        startEdit(sel.r, sel.c);
        return;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        clearCells();
        return;
      case "Escape":
        setAnchor(sel);
        return;
      default:
        if (e.key.length === 1 && !e.altKey) {
          e.preventDefault();
          startEdit(sel.r, sel.c, e.key);
        }
    }
  };

  const box = {
    r0: Math.min(sel.r, anchor.r),
    r1: Math.max(sel.r, anchor.r),
    c0: Math.min(sel.c, anchor.c),
    c1: Math.max(sel.c, anchor.c),
  };

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing]);

  useEffect(() => {
    onSelectRow?.(display[sel.r] ?? null, sel.r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.r, display]);

  const rowDup = (row: T) => (duplicates ? duplicates.has(row.id) : false);

  return (
    <div className="sheet-frame">
      <div
        ref={wrapRef}
        className="sheet-scroll"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text/plain");
          if (!text) return;
          e.preventDefault();
          pasteText(text);
        }}
        onMouseUp={() => setDragging(false)}
        style={{ outline: "none" }}
      >
        <table className="sheet">
          <thead>
            <tr>
              <th className="corner" />
              {onDeleteRow && (
                <th className="col-head" style={{ width: 44, minWidth: 44 }}>
                  <span className="col-letter">#</span>
                  <span className="col-label">Row</span>
                </th>
              )}
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  style={{ width: col.width, minWidth: col.width }}
                  className={`col-head ${col.required ? "is-req" : "is-opt"}`}
                  title={col.hint ?? (col.required ? "Required column" : "Optional column")}
                >
                  <span className="col-letter">{letter(i)}</span>
                  <span className="col-label">
                    {col.label}
                    {col.required && <span className="req-dot" />}
                  </span>
                </th>
              ))}
              {extraColumn && (
                <th className="col-head" style={{ width: extraColumn.width ?? 150, minWidth: extraColumn.width ?? 150 }}>
                  <span className="col-letter">{letter(columns.length)}</span>
                  <span className="col-label">{extraColumn.label}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {display.map((row, r) => {
              const dup = rowDup(row);
              const mark = marker?.(row);
              return (
                <tr key={row.id} className={dup ? "is-dup" : undefined}>
                  <td
                    className="row-head"
                    onClick={() => {
                      setSel({ r, c: 0 });
                      setAnchor({ r, c: 0 });
                    }}
                  >
                    {r + 1}
                    {mark === "bad" && <span className="ml-1 inline-block h-1 w-1 rounded-full bg-[#e5484d] align-middle" />}
                    {mark === "warn" && <span className="ml-1 inline-block h-1 w-1 rounded-full bg-[#f79009] align-middle" />}
                  </td>
                  {onDeleteRow && (
                    <td className="cell cell-actions">
                      {r < rows.length && (
                        <button
                          className="row-del"
                          title="Delete row"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRow(row, r);
                          }}
                        >
                          <Icon name="trash" size={12} />
                        </button>
                      )}
                    </td>
                  )}
                  {columns.map((col, c) => {
                    const value = String((row as Record<string, unknown>)[col.key] ?? "");
                    const inRange = r >= box.r0 && r <= box.r1 && c >= box.c0 && c <= box.c1;
                    const isSel = r === sel.r && c === sel.c;
                    const isEditing = editing?.r === r && editing?.c === c;
                    return (
                      <td
                        key={col.key}
                        className={[
                          "cell",
                          col.type === "number" ? "is-num" : "",
                          col.type === "url" ? "is-url" : "",
                          isSel ? "is-selected" : inRange ? "is-in-range" : "",
                          dup ? "is-dup" : "",
                          !value ? "is-empty" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{ width: col.width, minWidth: col.width }}
                        title={value || undefined}
                        onMouseDown={(e) => {
                          if (isEditing) return;
                          e.preventDefault();
                          setSel({ r, c });
                          setAnchor({ r, c });
                          setDragging(true);
                          wrapRef.current?.focus();
                        }}
                        onMouseEnter={() => {
                          if (dragging) setSel({ r, c });
                        }}
                        onDoubleClick={() => startEdit(r, c)}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            className="cell-input"
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onBlur={() => commitEdit(false)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitEdit(true);
                              } else if (e.key === "Tab") {
                                e.preventDefault();
                                commitEdit(false);
                                move(0, e.shiftKey ? -1 : 1);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                setEditing(null);
                                wrapRef.current?.focus();
                              }
                            }}
                          />
                        ) : col.render ? (
                          col.render(row)
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
                  {extraColumn && (
                    <td className="cell" style={{ width: extraColumn.width ?? 150, minWidth: extraColumn.width ?? 150 }}>
                      {extraColumn.render(row)}
                    </td>
                  )}
                </tr>
              );
            })}
            {rows.length === 0 && emptyHint && (
              <tr>
                <td className="row-head" />
                <td colSpan={columns.length + (extraColumn ? 1 : 0) + (onDeleteRow ? 1 : 0)} className="px-3 py-6 text-[12px] text-[var(--muted-2)]">
                  {emptyHint}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="sheet-status">
        <span>
          <b>{rows.length}</b> rows
        </span>
        <span>
          <b>{columns.length}</b> columns
        </span>
        <span>
          cell <b>{letter(sel.c)}{Math.min(sel.r + 1, rows.length || 1)}</b>
        </span>
        {duplicates && duplicates.size > 0 && (
          <span className="text-[#b42318]">
            <b className="!text-[#b42318]">{duplicates.size}</b> duplicate row{duplicates.size === 1 ? "" : "s"}
          </span>
        )}
        <span className="ml-auto hidden items-center gap-1.5 md:flex">
          <b>Paste</b> a block from Excel · <b>Ctrl+C</b> copies selection · <b>Del</b> clears
        </span>
      </div>
    </div>
  );
}

export const SheetGrid = forwardRef(SheetGridInner) as <T extends { id: string }>(
  props: SheetGridProps<T> & { ref?: React.Ref<SheetGridHandle> },
) => React.ReactElement;
