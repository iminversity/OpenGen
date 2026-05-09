"use client";

import {
  DEFAULT_GENERATION,
  type GenerationSettings,
  type ProviderId,
  type ServiceId,
} from "./models";

const KEYS_STORAGE = "xgen.api-keys.v1";
const SERVICES_STORAGE = "xgen.service-keys.v1";
const GENERATION_STORAGE = "xgen.generation.v1";

export type ApiKeys = Partial<Record<ProviderId, string>>;
export type ServiceKeys = Partial<Record<ServiceId, string>>;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("xgen:keys-changed"));
}

export function loadKeys(): ApiKeys {
  return readJson<ApiKeys>(KEYS_STORAGE, {});
}
export function saveKeys(keys: ApiKeys) {
  const cleaned: ApiKeys = {};
  for (const [k, v] of Object.entries(keys)) {
    if (v && v.trim()) cleaned[k as ProviderId] = v.trim();
  }
  writeJson(KEYS_STORAGE, cleaned);
}

export function loadServiceKeys(): ServiceKeys {
  return readJson<ServiceKeys>(SERVICES_STORAGE, {});
}
export function saveServiceKeys(keys: ServiceKeys) {
  const cleaned: ServiceKeys = {};
  for (const [k, v] of Object.entries(keys)) {
    if (v && v.trim()) cleaned[k as ServiceId] = v.trim();
  }
  writeJson(SERVICES_STORAGE, cleaned);
}

export function loadGeneration(): GenerationSettings {
  const raw = readJson<Partial<GenerationSettings>>(GENERATION_STORAGE, {});
  return { ...DEFAULT_GENERATION, ...raw };
}
export function saveGeneration(value: GenerationSettings) {
  writeJson(GENERATION_STORAGE, value);
}
