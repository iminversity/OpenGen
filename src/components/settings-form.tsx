"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  GlobeIcon,
  KeyIcon,
  Loader2Icon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  TrashIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ModelSelectorLogo } from "@/components/ai-elements/model-selector";
import {
  type ToolPrefs,
  loadToolPrefs,
  saveToolPrefs,
} from "@/lib/tool-prefs";
import { TOOL_CATALOG, type ToolCategory } from "@/lib/tools";

import {
  type ApiKeys,
  type ServiceKeys,
  loadGeneration,
  loadKeys,
  loadServiceKeys,
  saveGeneration,
  saveKeys,
  saveServiceKeys,
} from "@/lib/byok";
import {
  DEFAULT_GENERATION,
  type GenerationSettings,
  PROVIDERS,
  type ProviderId,
  SERVICES,
  type ServiceId,
} from "@/lib/models";

export type SettingsTab = "models" | "search" | "generation" | "tools";

type TestState = { state: "idle" | "loading" | "ok" | "fail"; message?: string };

export function SettingsForm({
  tab,
  onTabChange,
}: {
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}) {
  const [keys, setKeys] = useState<ApiKeys>({});
  const [services, setServices] = useState<ServiceKeys>({});
  const [gen, setGen] = useState<GenerationSettings>(DEFAULT_GENERATION);
  const [toolPrefs, setToolPrefs] = useState<ToolPrefs>({ disabled: [] });
  const [savedSnapshot, setSavedSnapshot] = useState<{
    keys: ApiKeys;
    services: ServiceKeys;
    gen: GenerationSettings;
    toolPrefs: ToolPrefs;
  } | null>(null);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [tests, setTests] = useState<Record<string, TestState>>({});

  useEffect(() => {
    const k = loadKeys();
    const s = loadServiceKeys();
    const g = loadGeneration();
    const t = loadToolPrefs();
    setKeys(k);
    setServices(s);
    setGen(g);
    setToolPrefs(t);
    setSavedSnapshot({ keys: k, services: s, gen: g, toolPrefs: t });
  }, []);

  const handleSave = () => {
    saveKeys(keys);
    saveServiceKeys(services);
    saveGeneration(gen);
    saveToolPrefs(toolPrefs);
    setSavedSnapshot({ keys, services, gen, toolPrefs });
    toast.success("Settings saved", {
      description: "Stored locally on this device.",
    });
  };

  const handleDiscard = () => {
    if (!savedSnapshot) return;
    setKeys(savedSnapshot.keys);
    setServices(savedSnapshot.services);
    setGen(savedSnapshot.gen);
    setToolPrefs(savedSnapshot.toolPrefs);
    setTests({});
    toast.info("Changes discarded");
  };

  const setToolEnabled = (name: string, enabled: boolean) => {
    setToolPrefs((p) => {
      const set = new Set(p.disabled);
      if (enabled) set.delete(name);
      else set.add(name);
      return { disabled: Array.from(set) };
    });
  };
  const setCategoryEnabled = (cat: ToolCategory, enabled: boolean) => {
    const names = TOOL_CATALOG.filter((t) => t.category === cat).map(
      (t) => t.name
    );
    setToolPrefs((p) => {
      const set = new Set(p.disabled);
      for (const n of names) {
        if (enabled) set.delete(n);
        else set.add(n);
      }
      return { disabled: Array.from(set) };
    });
  };

  const handleResetGen = () => {
    setGen(DEFAULT_GENERATION);
  };

  const isDirty =
    !!savedSnapshot &&
    (JSON.stringify(savedSnapshot.keys) !== JSON.stringify(keys) ||
      JSON.stringify(savedSnapshot.services) !== JSON.stringify(services) ||
      JSON.stringify(savedSnapshot.gen) !== JSON.stringify(gen) ||
      JSON.stringify(savedSnapshot.toolPrefs) !==
        JSON.stringify(toolPrefs));

  const runTest = async (
    key: string,
    body:
      | { kind: "provider"; provider: ProviderId; apiKey: string }
      | { kind: "service"; service: ServiceId; apiKey: string }
  ) => {
    if (!body.apiKey.trim()) {
      setTests({ ...tests, [key]: { state: "fail", message: "Enter a key first" } });
      return;
    }
    setTests({ ...tests, [key]: { state: "loading" } });
    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ok: boolean;
        latencyMs?: number;
        error?: string;
        probedModel?: string;
      };
      if (data.ok) {
        setTests({
          ...tests,
          [key]: {
            state: "ok",
            message:
              data.probedModel != null
                ? `${data.probedModel} · ${data.latencyMs}ms`
                : `${data.latencyMs}ms`,
          },
        });
      } else {
        setTests({
          ...tests,
          [key]: { state: "fail", message: data.error ?? "Failed" },
        });
      }
    } catch (e) {
      setTests({
        ...tests,
        [key]: { state: "fail", message: (e as Error).message },
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Bring your own keys and tune generation. Everything is stored in
            your browser&apos;s localStorage and sent only with each request.
          </p>
        </header>

        <Tabs
          value={tab}
          onValueChange={(v) => onTabChange(v as SettingsTab)}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="models" className="gap-2">
              <KeyIcon className="size-4" />
              Models
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <GlobeIcon className="size-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2">
              <WrenchIcon className="size-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="generation" className="gap-2">
              <SlidersHorizontalIcon className="size-4" />
              Generation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="space-y-4">
            <Alert>
              <AlertTitle>Self-hosted &amp; private</AlertTitle>
              <AlertDescription>
                Or set provider env vars (e.g. <code>OPENAI_API_KEY</code>) and
                skip this entirely.
              </AlertDescription>
            </Alert>
            <FieldGroup>
              {(Object.keys(PROVIDERS) as ProviderId[]).map((provider) => {
                const meta = PROVIDERS[provider];
                const value = keys[provider] ?? "";
                const isRevealed = reveal[`p:${provider}`] ?? false;
                return (
                  <Field key={provider}>
                    <FieldLabel
                      htmlFor={`key-${provider}`}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <ModelSelectorLogo
                          provider={meta.logo}
                          className="size-4"
                        />
                        {meta.name}
                        {value ? (
                          <Badge variant="secondary" className="ml-1">
                            configured
                          </Badge>
                        ) : null}
                      </span>
                      <a
                        href={meta.keyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-normal"
                      >
                        Get key
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    </FieldLabel>
                    <KeyInput
                      id={`key-${provider}`}
                      placeholder={`sk-... (${meta.keyName})`}
                      value={value}
                      revealed={isRevealed}
                      onToggleReveal={() =>
                        setReveal({
                          ...reveal,
                          [`p:${provider}`]: !isRevealed,
                        })
                      }
                      onChange={(v) => setKeys({ ...keys, [provider]: v })}
                      onClear={() => {
                        const next = { ...keys };
                        delete next[provider];
                        setKeys(next);
                      }}
                      onTest={() =>
                        runTest(`p:${provider}`, {
                          kind: "provider",
                          provider,
                          apiKey: value,
                        })
                      }
                      testState={tests[`p:${provider}`]}
                    />
                    <FieldDescription>
                      Falls back to <code>{meta.keyName}</code> env var.
                    </FieldDescription>
                  </Field>
                );
              })}
            </FieldGroup>
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <FieldGroup>
              {(Object.keys(SERVICES) as ServiceId[]).map((id) => {
                const meta = SERVICES[id];
                const value = services[id] ?? "";
                const isRevealed = reveal[`s:${id}`] ?? false;
                return (
                  <Field key={id}>
                    <FieldLabel
                      htmlFor={`svc-${id}`}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <GlobeIcon className="size-4" />
                        {meta.name}
                        {value ? (
                          <Badge variant="secondary" className="ml-1">
                            configured
                          </Badge>
                        ) : null}
                      </span>
                      <a
                        href={meta.keyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-normal"
                      >
                        Get key
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    </FieldLabel>
                    <KeyInput
                      id={`svc-${id}`}
                      placeholder={`tvly-... (${meta.keyName})`}
                      value={value}
                      revealed={isRevealed}
                      onToggleReveal={() =>
                        setReveal({ ...reveal, [`s:${id}`]: !isRevealed })
                      }
                      onChange={(v) => setServices({ ...services, [id]: v })}
                      onClear={() => {
                        const next = { ...services };
                        delete next[id];
                        setServices(next);
                      }}
                      onTest={() =>
                        runTest(`s:${id}`, {
                          kind: "service",
                          service: id,
                          apiKey: value,
                        })
                      }
                      testState={tests[`s:${id}`]}
                    />
                    <FieldDescription>{meta.description}</FieldDescription>
                  </Field>
                );
              })}
            </FieldGroup>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <Alert>
              <AlertTitle>Tool access</AlertTitle>
              <AlertDescription>
                Toggle which tools the model can call. Search-pack tools also
                require a Tavily key, and image generation requires an OpenAI
                key.
              </AlertDescription>
            </Alert>
            {(
              [
                ["core", "Always available"],
                ["search", "Web (needs Tavily key + Search toggle)"],
                ["reference", "Reference"],
                ["dev", "Dev"],
                ["generative", "Generative"],
                ["productivity", "Productivity"],
              ] as [ToolCategory, string][]
            ).map(([cat, label]) => {
              const items = TOOL_CATALOG.filter((t) => t.category === cat);
              if (items.length === 0) return null;
              const allOn = items.every(
                (t) => !toolPrefs.disabled.includes(t.name)
              );
              return (
                <section key={cat} className="space-y-2">
                  <header className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-tight">
                      {label}
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setCategoryEnabled(cat, !allOn)}
                    >
                      {allOn ? "Disable all" : "Enable all"}
                    </Button>
                  </header>
                  <ul className="divide-y rounded-lg border">
                    {items.map((t) => {
                      const enabled = !toolPrefs.disabled.includes(t.name);
                      return (
                        <li
                          key={t.name}
                          className="flex items-center justify-between gap-3 px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 font-medium text-sm">
                              {t.label}
                              {t.needsKey ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  needs {t.needsKey}
                                </Badge>
                              ) : null}
                              <code className="text-muted-foreground text-[10px] font-mono">
                                {t.name}
                              </code>
                            </p>
                            <p className="text-muted-foreground mt-0.5 truncate text-xs">
                              {t.description}
                            </p>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(v) => setToolEnabled(t.name, v)}
                            aria-label={`Toggle ${t.label}`}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </TabsContent>

          <TabsContent value="generation" className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="system-prompt">System prompt</FieldLabel>
                <Textarea
                  id="system-prompt"
                  rows={10}
                  value={gen.systemPrompt}
                  onChange={(e) =>
                    setGen({ ...gen, systemPrompt: e.target.value })
                  }
                  placeholder="You are a helpful assistant..."
                  className="font-mono text-xs"
                />
                <FieldDescription>
                  Prepended to every conversation.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="temp">
                  Temperature
                  <span className="text-muted-foreground ml-2 text-xs font-normal">
                    {gen.temperature.toFixed(2)}
                  </span>
                </FieldLabel>
                <input
                  id="temp"
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={gen.temperature}
                  onChange={(e) =>
                    setGen({ ...gen, temperature: Number(e.target.value) })
                  }
                  className="accent-primary w-full"
                />
                <FieldDescription>
                  0 = deterministic, 1 = balanced, 2 = wild. Note: not all
                  models honor this.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="tokens">Max output tokens</FieldLabel>
                <Input
                  id="tokens"
                  type="number"
                  min={64}
                  max={64_000}
                  step={64}
                  value={gen.maxOutputTokens}
                  onChange={(e) =>
                    setGen({
                      ...gen,
                      maxOutputTokens: Number(e.target.value) || 0,
                    })
                  }
                />
                <FieldDescription>
                  Caps each response. Higher = longer (and pricier) replies.
                </FieldDescription>
              </Field>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetGen}
                className="self-start"
              >
                <RotateCcwIcon data-icon />
                Reset to defaults
              </Button>
            </FieldGroup>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 flex shrink-0 items-center justify-between border-t px-6 py-3 backdrop-blur">
        <p className="text-muted-foreground text-xs">
          {isDirty
            ? "You have unsaved changes."
            : "All changes saved locally."}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDiscard}
            disabled={!isDirty}
          >
            Discard
          </Button>
          <Button onClick={handleSave} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function KeyInput({
  id,
  value,
  placeholder,
  revealed,
  onToggleReveal,
  onChange,
  onClear,
  onTest,
  testState,
}: {
  id: string;
  value: string;
  placeholder: string;
  revealed: boolean;
  onToggleReveal: () => void;
  onChange: (v: string) => void;
  onClear: () => void;
  onTest?: () => void;
  testState?: TestState;
}) {
  const state = testState?.state ?? "idle";
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          id={id}
          type={revealed ? "text" : "password"}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onToggleReveal}
          aria-label={revealed ? "Hide" : "Show"}
        >
          {revealed ? <EyeOffIcon data-icon /> : <EyeIcon data-icon />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onClear}
          disabled={!value}
          aria-label="Clear"
        >
          <TrashIcon data-icon />
        </Button>
        {onTest ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTest}
            disabled={state === "loading" || !value}
          >
            {state === "loading" ? (
              <Loader2Icon data-icon className="animate-spin" />
            ) : null}
            Test
          </Button>
        ) : null}
      </div>
      {state === "ok" ? (
        <p className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
          <CheckCircle2Icon className="size-3.5" />
          Key works · {testState?.message ?? ""}
        </p>
      ) : null}
      {state === "fail" ? (
        <p className="text-destructive flex items-center gap-1.5 text-xs">
          <XCircleIcon className="size-3.5" />
          {testState?.message ?? "Failed"}
        </p>
      ) : null}
    </div>
  );
}
