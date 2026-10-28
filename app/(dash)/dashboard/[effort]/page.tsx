"use client";

import { useParams } from "next/navigation";
import { ContentPerformance } from "@/components/performance/ContentPerformance";
import { AdsPerformance } from "@/components/performance/AdsPerformance";
import { AttendPerformance } from "@/components/performance/AttendPerformance";

export default function Page() {
  const params = useParams<{ effort: string }>();
  const effort = params?.effort ?? "kol";

  if (effort === "connector") return <ContentPerformance effort="CONNECTOR" key="connector" />;
  if (effort === "ads") return <AdsPerformance key="ads" />;
  if (effort === "attend") return <AttendPerformance key="attend" />;
  return <ContentPerformance effort="KOL" key="kol" />;
}
