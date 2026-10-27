"use client";

import { useEffect, useState } from "react";
import type { ColumnConfig, ColumnType } from "@/lib/types";
import type { ColumnMeta } from "@/lib/sheet";
import { Icon } from "./Icon";
import { Modal } from "./ui";

const TYPE_OPTIONS: { value: ColumnType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "url", label: "URL" },
  { value: "percent", label: "Percent" },
];

export function ColumnSettingsModal({
  open,
  onClose,
  columns,
  defaults,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  columns: ColumnMeta[];
  defaults: ColumnMeta[];
  onSave: (config: ColumnConfig[]) => void;
}) {
  const [list, setList] = useState<ColumnMeta[]>(columns);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<ColumnType>("text");
  const [newRequired, setNewRequired] = useState(false);

  useEffect(() => {
    if (open) {
      setList(columns);
      setEditingKey(null);
      setAdding(false);
      setNewLabel("");
      setNewType("text");
      setNewRequired(false);
    }
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

  function remove(key: string) {
    if (list.length <= 1) return;
    setList((l) => l.filter((c) => c.key !== key));
    if (editingKey === key) setEditingKey(null);
  }

  function startEdit(col: ColumnMeta) {
    setEditingKey(col.key);
    setEditValue(col.label);
  }

  function commitEdit() {
    if (!editingKey) return;
    const label = editValue.trim();
    if (label) setList((l) => l.map((c) => (c.key === editingKey ? { ...c, label } : c)));
    setEditingKey(null);
  }

  function addColumn() {
    const label = newLabel.trim();
    if (!label) return;
    const key = `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    setList((l) => [
      ...l,
      {
        key,
        label,
        width: 180,
        type: newType,
        required: newRequired,
        custom: true,
      },
    ]);
    setNewLabel("");
    setNewType("text");
    setNewRequired(false);
    setAdding(false);
  }

  function save() {
    const config: ColumnConfig[] = list.map((c) => ({
      key: c.key,
      required: Boolean(c.required),
      label: c.label,
      type: c.type,
      width: c.width,
      custom: c.custom,
    }));
    const hidden = defaults
      .filter((d) => !list.some((c) => c.key === d.key))
      .map((d) => ({ key: d.key, required: false, hidden: true }));
    onSave([...config, ...hidden]);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Spreadsheet layout"
      title="Columns & required fields"
      width={760}
      subtitle="Add, rename, delete and reorder columns. Green headers are required (marked with *)."
      footer={
        <>
          <button className="btn btn-ghost mr-auto" onClick={() => setList(defaults)}>
            <Icon name="refresh" size={12} />
            Reset to template
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-dark" onClick={save}>
            Save layout
          </button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--muted-2)]">
        <span>{list.length} columns · top to bottom = left to right in the sheet</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[#12b76a]" /> required (*)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[#2f6bff]" /> optional
          </span>
        </span>
      </div>

      <div className="max-h-[300px] overflow-y-auto rounded-xl border border-[var(--line)]">
        {list.map((c, i) => (
          <div
            key={c.key}
            className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2 last:border-0 hover:bg-[#fafcff]"
          >
            <span className="w-4 shrink-0 text-right text-[10px] text-[var(--muted-2)]">{i + 1}</span>
            <span className={`h-2 w-2 shrink-0 rounded-sm ${c.required ? "bg-[#12b76a]" : "bg-[#2f6bff]"}`} />

            {editingKey === c.key ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") setEditingKey(null);
                }}
                className="min-w-0 flex-1 rounded border border-[var(--blue)] px-1.5 py-[3px] text-[12px] outline-none"
              />
            ) : (
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                {c.label}
                {c.required && <span className="ml-1 text-[#b42318]">*</span>}
                {c.custom && <span className="badge badge-neutral ml-2 !h-[17px] !text-[8px]">custom</span>}
              </span>
            )}

            <span className="w-[52px] shrink-0 text-[9px] uppercase tracking-[0.05em] text-[var(--muted-2)]">
              {c.type ?? "text"}
            </span>

            <button
              className="icon-btn h-[24px] w-[24px]"
              onClick={() => toggle(i)}
              title={c.required ? "Make optional" : "Make required"}
            >
              <Icon
                name={c.required ? "check" : "minus"}
                size={11}
                className={c.required ? "text-[#067647]" : "text-[var(--muted-2)]"}
              />
            </button>

            <div className="flex shrink-0 items-center gap-0.5">
              <button className="icon-btn h-[24px] w-[24px]" onClick={() => startEdit(c)} title="Rename column">
                <Icon name="edit" size={11} />
              </button>
              <button className="icon-btn h-[24px] w-[24px]" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">
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
              <button
                className="icon-btn h-[24px] w-[24px] !text-[#b42318]"
                onClick={() => remove(c.key)}
                disabled={list.length <= 1}
                title="Delete column"
              >
                <Icon name="trash" size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-3 rounded-xl border border-[var(--line-2)] bg-[#fafcff] p-3">
          <div className="eyebrow-dim mb-2">New column</div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <input
                autoFocus
                className="field w-full"
                placeholder="Column label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addColumn();
                }}
              />
            </div>
            <select
              className="field !h-[33px]"
              value={newType}
              onChange={(e) => setNewType(e.target.value as ColumnType)}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="flex h-[33px] items-center gap-1.5 text-[11px]">
              <input
                type="checkbox"
                checked={newRequired}
                onChange={(e) => setNewRequired(e.target.checked)}
                className="accent-[var(--blue)]"
              />
              Required
            </label>
            <button className="btn btn-sm" onClick={addColumn} disabled={!newLabel.trim()}>
              Add
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-sm mt-3" onClick={() => setAdding(true)}>
          <Icon name="plus" size={12} />
          Add column
        </button>
      )}
    </Modal>
  );
}
