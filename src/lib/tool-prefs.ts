"use client";

const STORAGE = "xgen.tool-prefs.v1";

export type ToolPrefs = {
  /** Tool names the user has explicitly disabled. Anything not in this list is enabled by default. */
  disabled: string[];
};

export function loadToolPrefs(): ToolPrefs {
  if (typeof window === "undefined") return { disabled: [] };
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return { disabled: [] };
    const parsed = JSON.parse(raw) as Partial<ToolPrefs>;
    return { disabled: Array.isArray(parsed.disabled) ? parsed.disabled : [] };
  } catch {
    return { disabled: [] };
  }
}

export function saveToolPrefs(prefs: ToolPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE, JSON.stringify(prefs));
  window.dispatchEvent(new Event("xgen:keys-changed"));
}

export function setToolEnabled(name: string, enabled: boolean) {
  const prefs = loadToolPrefs();
  const set = new Set(prefs.disabled);
  if (enabled) set.delete(name);
  else set.add(name);
  saveToolPrefs({ disabled: Array.from(set) });
}
