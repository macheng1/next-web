"use client";

import { useEffect } from "react";
import type VConsole from "vconsole";

/** Opt-in per page load; never persist debugging to other visits. */
export function MobileDebugConsole() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("debug") !== "1")
      return;

    let disposed = false;
    let instance: VConsole | undefined;
    void import("vconsole")
      .then(({ default: Console }) => {
        if (disposed) return;
        instance = new Console({
          defaultPlugins: ["system", "network", "element", "storage"],
          log: { maxLogNumber: 200 },
          network: { maxNetworkNumber: 100 },
        });
      })
      .catch(() => console.warn("Mobile debug panel failed to load"));

    return () => {
      disposed = true;
      instance?.destroy();
    };
  }, []);

  return null;
}
