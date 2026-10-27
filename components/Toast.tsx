"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./Icon";

type Kind = "ok" | "warn" | "err";
type ToastItem = { id: number; msg: string; kind: Kind };

let items: ToastItem[] = [];
const subs = new Set<() => void>();
let seq = 0;

function emit() {
  subs.forEach((s) => s());
}

export function toast(msg: string, kind: Kind = "ok") {
  const id = ++seq;
  items = [...items, { id, msg, kind }];
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 3800);
}

function subscribe(cb: () => void) {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

export function Toaster() {
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => items,
  );
  return (
    <div className="toast-stack">
      {list.map((t) => (
        <div key={t.id} className="toast">
          <span
            className="grid h-[18px] w-[18px] place-items-center rounded-full"
            style={{
              background: t.kind === "ok" ? "#12b76a" : t.kind === "warn" ? "#f79009" : "#f04438",
            }}
          >
            <Icon name={t.kind === "err" ? "x" : "check"} size={11} strokeWidth={2.4} />
          </span>
          <span className="max-w-[380px] leading-snug">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
