"use client";

import { useParams } from "next/navigation";
import { ProjectsView } from "@/components/ProjectsView";
import type { ProjectType } from "@/lib/types";

const MAP: Record<string, ProjectType | "ALL"> = {
  all: "ALL",
  kol: "KOL",
  connector: "CONNECTOR",
  "kol-ads": "KOL_ADS",
  troops: "TROOPS",
};

export default function Page() {
  const params = useParams<{ type: string }>();
  const type = MAP[params?.type ?? ""] ?? "ALL";
  return <ProjectsView initialType={type} key={type} />;
}
