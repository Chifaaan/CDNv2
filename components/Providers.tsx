"use client";

import { useEffect, useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="relative z-[1] flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="logo-word text-[15px]">Connector</div>
          <div className="h-[3px] w-24 overflow-hidden rounded-full bg-white/70">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--blue)]" />
          </div>
          <div className="eyebrow-dim">Loading workspace</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
