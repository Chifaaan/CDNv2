"use client";

import { useParams } from "next/navigation";
import { DashboardView } from "@/components/DashboardView";

const MAP: Record<string, "kol" | "connector" | "attend" | "ads"> = {
  kol: "kol",
  connector: "connector",
  attend: "attend",
  ads: "ads",
};

export default function Page() {
  const params = useParams<{ effort: string }>();
  const effort = MAP[params?.effort ?? ""] ?? "kol";
  return <DashboardView effort={effort} key={effort} />;
}
