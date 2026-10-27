"use client";

import { useEffect, useState } from "react";
import type { ColumnConfig } from "@/lib/types";
import { defaultColumns, type ColumnMeta, type SheetKind } from "@/lib/sheet";
import { Icon } from "./Icon";
import { Modal } from "./ui";

export function ColumnSettingsModal({
  open,
  onClose,
  columns,
  kind,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  columns: ColumnMeta[];
  kind: SheetKind;
  onSave: (config: ColumnConfig[]) => void;
}) {
  const [list, setList] = useState<ColumnMeta[]>(columns);

  useEffect(() => {
    if (open) setList(columns);
  }, [open, columns]);

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
  }

  function toggle(index: number) {
    setList((l) => l.map((c, i) => (i === index ? { ...c, required: !c.required } : c)));
  }

  function reset() {
    setList(defaultColumns(kind));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Spreadsheet layout"
      title="Columns & required fields"
      width={720}
      subtitle="Reorder columns and choose which ones are required. Green headers are required, blue are optional."
      footer={
        <>
          <button className="btn btn-ghost mr-auto" onClick={reset}>
            <Icon name="refresh" size={12} />
            Reset to default
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-dark"
            onClick={() => {
              onSave(list.map((c) => ({ key: c.key, required: Boolean(c.required) })));
              onClose();
            }}
          >
            Save layout
          </button>
        </>
      }
    >
      <div className="mb-3 flex items-center justify-between text-[11px] text-[var(--muted-2)]">
        <span>{list.length} columns · top to bottom = left to right in the sheet</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[#12b76a]" /> required
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[#2f6bff]" /> optional
          </span>
        </span>
      </div>

      <div className="max-h-[420px] overflow-y-auto rounded-xl border border-[var(--line)]">
        {list.map((c, i) => (
          <div
            key={c.key}
            className="flex items-center gap-2.5 border-b border-[var(--line)] px-3 py-2 last:border-0 hover:bg-[#fafcff]"
          >
            <span className="w-4 shrink-0 text-right text-[10px] text-[var(--muted-2)]">{i + 1}</span>
            <span
              className={`h-2 w-2 shrink-0 rounded-sm ${c.required ? "bg-[#12b76a]" : "bg-[#2f6bff]"}`}
            />
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{c.label}</span>
            <button
              className="icon-btn h-[24px] w-[24px]"
              onClick={() => toggle(i)}
              title={c.required ? "Make optional" : "Make required"}
            >
              <Icon name={c.required ? "check" : "minus"} size={11} className={c.required ? "text-[#067647]" : "text-[var(--muted-2)]"} />
            </button>
            <span className="w-[62px] shrink-0 text-[9.5px] uppercase tracking-[0.06em] text-[var(--muted-2)]">
              {c.required ? "required" : "optional"}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <button
                className="icon-btn h-[24px] w-[24px]"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                title="Move up"
              >
                <Icon name="chevronDown" size={11} className="rotate-180" />
              </button>
              <button
                className="icon-btn h-[24px] w-[24px]"
                onClick={() => move(i, 1)}
                disabled={i === list.length - 1}
                title="Move down"
              >
                <Icon name="chevronDown" size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
