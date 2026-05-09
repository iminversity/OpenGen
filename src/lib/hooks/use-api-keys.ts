"use client";

import { useEffect, useState } from "react";
import {
  type ApiKeys,
  type ServiceKeys,
  loadGeneration,
  loadKeys,
  loadServiceKeys,
} from "@/lib/byok";
import { type ToolPrefs, loadToolPrefs } from "@/lib/tool-prefs";
import type { GenerationSettings, ProviderId } from "@/lib/models";

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeys>({});
  const [serviceKeys, setServiceKeys] = useState<ServiceKeys>({});
  const [generation, setGeneration] = useState<GenerationSettings | null>(null);
  const [toolPrefs, setToolPrefs] = useState<ToolPrefs>({ disabled: [] });

  useEffect(() => {
    const sync = () => {
      setKeys(loadKeys());
      setServiceKeys(loadServiceKeys());
      setGeneration(loadGeneration());
      setToolPrefs(loadToolPrefs());
    };
    sync();
    window.addEventListener("xgen:keys-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("xgen:keys-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const configured = new Set<ProviderId>(
    (Object.entries(keys) as [ProviderId, string | undefined][])
      .filter(([, v]) => Boolean(v && v.trim()))
      .map(([k]) => k)
  );

  return { keys, serviceKeys, generation, toolPrefs, configured };
}
