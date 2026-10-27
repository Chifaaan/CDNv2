"use client";

import { useState } from "react";
import { cdn, useCdn } from "@/lib/store";
import { Field, Modal } from "@/components/ui";
import { toast } from "@/components/Toast";

export function GroupFormModal({
  open,
  onClose,
  groupId,
  seed,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string | null;
  seed: string[];
  onCreated?: (id: string) => void;
}) {
  const state = useCdn();
  const brandId = state.ui.brandId;
  const group = groupId ? state.groups.find((g) => g.id === groupId) : undefined;
  const otherGrouped = new Set(
    state.groups.filter((g) => g.id !== groupId).flatMap((g) => g.campaignIds),
  );
  const campaigns = state.campaigns.filter(
    (c) => c.brandId === brandId && (!otherGrouped.has(c.id) || Boolean(group?.campaignIds.includes(c.id))),
  );
  const [name, setName] = useState(group?.name ?? "");
  const [desc, setDesc] = useState(group?.description ?? "");
  const [picked, setPicked] = useState<string[]>(group?.campaignIds ?? seed);

  const willDissolve = Boolean(group) && picked.length < 2;

  function submit() {
    if (!name.trim()) {
      toast("Group name is required", "err");
      return;
    }
    if (group) {
      if (picked.length < 2) {
        cdn.deleteGroup(group.id);
        toast("Group dibubarkan · campaign kembali ke daftar");
      } else {
        cdn.updateGroup(group.id, {
          name: name.trim(),
          description: desc.trim() || "Custom dashboard group.",
          campaignIds: picked,
        });
        toast(`Group updated · ${picked.length} campaigns`);
      }
    } else {
      if (picked.length < 2) {
        toast("Select at least two campaigns to create a group", "err");
        return;
      }
      const created = cdn.addGroup({
        brandId,
        name: name.trim(),
        description: desc.trim() || "Custom dashboard group.",
        campaignIds: picked,
      });
      onCreated?.(created.id);
      toast(`Group created · ${picked.length} campaigns`);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Dashboard scope"
      title={group ? "Edit campaign group" : "New campaign group"}
      subtitle="A group combines the data of the selected campaigns into one dashboard."
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-dark" onClick={submit}>
            {group ? (willDissolve ? "Dissolve group" : "Save group") : "Create group"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Group name">
          <input
            className="field w-full"
            autoFocus
            value={name}
            placeholder="e.g. Q4 Payday cluster"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Description">
          <input
            className="field w-full"
            value={desc}
            placeholder="Short note for the team"
            onChange={(e) => setDesc(e.target.value)}
          />
        </Field>

        <div>
          <div className="eyebrow-dim mb-2">Campaigns · {picked.length} selected</div>
          <div className="max-h-[240px] overflow-y-auto rounded-xl border border-[var(--line)]">
            {campaigns.map((c) => {
              const on = picked.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-2.5 border-b border-[var(--line)] px-3 py-2.5 text-[12px] last:border-0 ${
                    on ? "bg-[#f3f8ff]" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setPicked((p) => (on ? p.filter((id) => id !== c.id) : [...p, c.id]))}
                    className="accent-[var(--blue)]"
                  />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="shrink-0 text-[9.5px] uppercase tracking-[0.06em] text-[var(--muted-2)]">
                    {c.agency}
                  </span>
                </label>
              );
            })}
            {campaigns.length === 0 && (
              <div className="px-3 py-4 text-center text-[11px] text-[var(--muted-2)]">
                No campaign available — all campaigns are already grouped.
              </div>
            )}
          </div>
        </div>

        {willDissolve && (
          <div className="rounded-xl border border-[#f6d8b4] bg-[#fdf6ec] px-3 py-2.5 text-[11px] leading-5 text-[#8a4b06]">
            Hanya {picked.length} campaign tersisa. Menyimpan perubahan akan <b>membubarkan group</b> dan
            mengembalikan campaign ke daftar.
          </div>
        )}
        {group && (
          <div className="text-[10.5px] leading-5 text-[var(--muted-2)]">
            A campaign can only belong to one group. Campaigns belonging to other groups are not listed here.
          </div>
        )}
      </div>
    </Modal>
  );
}
