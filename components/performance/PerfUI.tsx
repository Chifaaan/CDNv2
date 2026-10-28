"use client";

import type { ReactNode } from "react";
import { fmtCompact } from "@/lib/utils";
import { Icon } from "@/components/Icon";

export function PerfKpi({
  items,
}: {
  items: { label: string; value: string; hint?: string }[];
}) {
  return (
    <div className="card overflow-hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`min-w-0 px-4 py-4 ${i > 0 ? "border-l border-[var(--line)]" : ""}`}
            title={item.hint}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold tracking-[0.12em] text-[var(--blue)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              {item.hint && <span className="info-dot">i</span>}
            </div>
            <div className="eyebrow-dim mt-3 !text-[9px]">{item.label}</div>
            <div className="metric-sm mt-1.5 truncate !text-[26px]">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StackedShare({
  left,
  right,
  leftLabel,
  rightLabel,
  leftColor = "#ef7f24",
  rightColor = "#0e9c8c",
}: {
  left: number;
  right: number;
  leftLabel: string;
  rightLabel: string;
  leftColor?: string;
  rightColor?: string;
}) {
  const total = left + right || 1;
  const leftPct = (left / total) * 100;
  return (
    <div>
      <div className="flex h-[13px] w-full overflow-hidden rounded-full bg-[#eef2f8]">
        <div style={{ width: `${leftPct}%`, background: leftColor }} />
        <div style={{ width: `${100 - leftPct}%`, background: rightColor }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--line)] bg-[#fafcff] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] text-[var(--muted-2)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: leftColor }} />
            {leftLabel}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[20px] font-semibold tracking-[-0.03em]">{fmtCompact(left)}</span>
            <span className="text-[10px] text-[var(--muted-2)]">
              {Math.round((left / total) * 100)}%
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-[#fafcff] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] text-[var(--muted-2)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: rightColor }} />
            {rightLabel}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[20px] font-semibold tracking-[-0.03em]">{fmtCompact(right)}</span>
            <span className="text-[10px] text-[var(--muted-2)]">
              {Math.round((right / total) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PerfLineChart({
  labels,
  series,
  height = 235,
  showArea = true,
}: {
  labels: string[];
  series: { name: string; color: string; values: number[] }[];
  height?: number;
  showArea?: boolean;
}) {
  const W = 900;
  const H = height;
  const padL = 48;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(1, ...all);
  const n = Math.max(labels.length, 2);
  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * innerW;
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const xTicks = [0, Math.floor((n - 1) / 5), Math.floor(((n - 1) * 2) / 5), Math.floor(((n - 1) * 3) / 5), Math.floor(((n - 1) * 4) / 5), n - 1];

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-4">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.name} id={`pg-${i}-${s.name.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1={padL}
              x2={W - padR}
              y1={padT + innerH * (1 - f)}
              y2={padT + innerH * (1 - f)}
              stroke="#e7edf6"
              strokeWidth="1"
            />
            <text x={padL - 8} y={padT + innerH * (1 - f) + 3} textAnchor="end" fontSize="10" fill="#93a1b3">
              {fmtCompact(max * f)}
            </text>
          </g>
        ))}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          const area = `${padL},${padT + innerH} ${pts} ${W - padR},${padT + innerH}`;
          return (
            <g key={s.name}>
              {showArea && si === 0 && (
                <polygon points={area} fill={`url(#pg-${si}-${s.name.replace(/\W/g, "")})`} />
              )}
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth={si === 0 ? 1.6 : 1.4} />
            </g>
          );
        })}
        {xTicks.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#93a1b3">
            {labels[i] ?? ""}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i).filter((p) => p >= 1 && p <= pages);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-2.5 text-[11px] text-[var(--muted)]">
      <span>
        Page {page} of {pages}
      </span>
      <div className="flex items-center gap-1">
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Prev
        </button>
        {nums.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`grid h-[26px] min-w-[26px] place-items-center rounded-md text-[11px] ${
              p === page ? "bg-[#0b1017] text-white" : "text-[var(--muted)] hover:bg-[#f4f8ff]"
            }`}
          >
            {p}
          </button>
        ))}
        <button className="btn btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

export function Panel({
  title,
  hint,
  right,
  children,
  className = "",
}: {
  title?: ReactNode;
  hint?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      {(title || right) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
          <div>
            <div className="text-[12.5px] font-semibold">{title}</div>
            {hint && <div className="mt-0.5 text-[10px] text-[var(--muted-2)]">{hint}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Initials({ name, size = 34 }: { name: string; size?: number }) {
  const letters = name
    .replace(/^@/, "")
    .split(/[.\s_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  const hue = Array.from(name).reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        background: `hsl(${hue} 60% 93%)`,
        color: `hsl(${hue} 50% 34%)`,
        fontSize: size * 0.34,
      }}
    >
      {letters || "?"}
    </span>
  );
}

export function RangeControls() {
  return null;
}
