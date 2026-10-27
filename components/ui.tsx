"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Brand } from "@/lib/types";
import { brandStyle } from "@/lib/seed";
import { relTime } from "@/lib/utils";
import { Icon, type IconName } from "./Icon";
import { toast } from "./Toast";

export function BrandAvatar({ brand, size = 38, radius }: { brand: Brand; size?: number; radius?: number }) {
  const s = brandStyle(brand.hue);
  return (
    <span
      className="brand-avatar"
      style={{
        width: size,
        height: size,
        background: s.bg,
        color: s.fg,
        boxShadow: `0 0 0 1px ${s.ring} inset`,
        borderRadius: radius ?? Math.round(size * 0.32),
        fontSize: size * 0.34,
      }}
    >
      {brand.initials}
    </span>
  );
}

export function InfoDot({ text }: { text: string }) {
  return (
    <span className="info-dot" title={text} aria-label={text}>
      i
    </span>
  );
}

export function Sparkline({
  data,
  color = "#ef7f24",
  width = 300,
  height = 74,
  fill = true,
  dashed,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  dashed?: boolean;
}) {
  const { line, area } = useMemo(() => {
    const pts = data.length ? data : [];
    if (pts.length < 2) return { line: "", area: "" };
    const max = Math.max(...pts);
    const min = Math.min(...pts);
    const span = max - min || 1;
    const step = width / (pts.length - 1);
    const coords = pts.map((v, i) => {
      const x = i * step;
      const y = height - 6 - ((v - min) / span) * (height - 14);
      return [x, y] as const;
    });
    const d = coords
      .map(([x, y], i) => {
        if (i === 0) return `M${x.toFixed(1)},${y.toFixed(1)}`;
        const [px, py] = coords[i - 1];
        const cx = (px + x) / 2;
        return `C${cx.toFixed(1)},${py.toFixed(1)} ${cx.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return {
      line: d,
      area: `${d} L${width},${height} L0,${height} Z`,
    };
  }, [data, width, height]);

  if (!data.length) {
    return (
      <div className="flex h-[74px] items-center justify-center">
        <div className="h-px w-full border-t border-dashed border-[var(--line-2)]" />
      </div>
    );
  }

  const gid = `sp-${color.replace("#", "")}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray={dashed ? "3 3" : undefined}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  subtitle,
  children,
  footer,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card fade-up" style={{ width: `min(${width}px, 100%)` }} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-6 py-5">
          <div>
            {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
            <h2 className="h-page text-[24px]">{title}</h2>
            {subtitle && <p className="mt-2 max-w-[400px] text-[12.5px] leading-5 text-[var(--muted)]">{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow-dim mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] text-[var(--muted-2)]">{hint}</span>}
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
  className = "",
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <span className={`select-wrap ${className}`}>
      <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevronDown"
        size={13}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
      />
    </span>
  );
}

export function CopyButton({
  value,
  label = "Copy",
  compact,
  onCopied,
}: {
  value: string;
  label?: string;
  compact?: boolean;
  onCopied?: () => void;
}) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setDone(true);
    toast("Copied to clipboard");
    onCopied?.();
    setTimeout(() => setDone(false), 1400);
  }

  if (compact) {
    return (
      <button className="icon-btn h-[26px] w-[26px]" onClick={copy} title={`Copy ${label}`} aria-label={`Copy ${label}`}>
        <Icon name={done ? "check" : "copy"} size={12} />
      </button>
    );
  }

  return (
    <button className="btn btn-sm" onClick={copy}>
      <Icon name={done ? "check" : "copy"} size={12} />
      {done ? "Copied" : label}
    </button>
  );
}

export function PageHero({
  eyebrow,
  title,
  sub,
  actions,
  children,
  compact,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="hero fade-up">
      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="eyebrow">{eyebrow}</div>
          <h1 className={compact ? "h-page mt-3" : "display mt-4"}>{title}</h1>
          {sub && <div className="mt-3.5 max-w-[560px] text-[13px] leading-[1.65] text-[var(--muted)]">{sub}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function SectionHead({
  title,
  hint,
  right,
  className = "",
}: {
  title: ReactNode;
  hint?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-end justify-between gap-4 ${className}`}>
      <div className="flex items-baseline gap-2.5">
        <h2 className="h-section">{title}</h2>
        {hint && <span className="text-[11px] text-[var(--muted-2)]">{hint}</span>}
      </div>
      {right}
    </div>
  );
}

export function EmptyState({
  icon = "table",
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--muted-2)]">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        {body && <div className="mx-auto mt-1 max-w-[320px] text-[12px] leading-5 text-[var(--muted)]">{body}</div>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "badge-ok",
    failed: "badge-bad",
    pending: "badge-warn",
    live: "badge-ok",
    scheduled: "badge-blue",
    ended: "badge-neutral",
    open: "badge-blue",
    in_review: "badge-warn",
    complete: "badge-ok",
    matched: "badge-ok",
    unmatched: "badge-bad",
  };
  const label = status.replace("_", " ");
  return <span className={`badge ${map[status] ?? "badge-neutral"}`}>{label}</span>;
}

export function Bar({ value, color = "var(--blue)" }: { value: number; color?: string }) {
  return (
    <span className="block h-[5px] w-full overflow-hidden rounded-full bg-[#eef2f8]">
      <span
        className="block h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: color }}
      />
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-[var(--line-2)] bg-white px-1.5 py-[1px] text-[10px] font-medium text-[var(--muted)] shadow-[0_1px_0_rgba(10,26,51,0.05)]">
      {children}
    </kbd>
  );
}

export function useNow(interval = 15000) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), interval);
    return () => clearInterval(t);
  }, [interval]);
}

export function SavedIndicator({ savedAt, className = "" }: { savedAt: string; className?: string }) {
  useNow(15000);
  return (
    <span className={`flex items-center gap-1.5 text-[10.5px] text-[var(--muted-2)] ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />
      Saved {relTime(savedAt)}
    </span>
  );
}
