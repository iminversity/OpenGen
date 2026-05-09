"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  EyeIcon,
  EyeOffIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  MODELS,
  PROVIDERS,
  getModel,
  type ProviderId,
} from "@/lib/models";

const SHOW_ALL_KEY = "xgen.modelpicker.show-all";

export function ModelPicker({
  value,
  onChange,
  configuredProviders,
}: {
  value: string;
  onChange: (id: string) => void;
  configuredProviders: Set<ProviderId>;
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const current = getModel(value);

  // Default: hide unconfigured providers when at least one key is set.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(SHOW_ALL_KEY);
    if (saved !== null) {
      setShowAll(saved === "1");
    } else {
      setShowAll(configuredProviders.size === 0);
    }
  }, [configuredProviders.size]);

  const toggleShowAll = (next: boolean) => {
    setShowAll(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(SHOW_ALL_KEY, next ? "1" : "0");
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<ProviderId, typeof MODELS>();
    for (const m of MODELS) {
      if (!showAll && !configuredProviders.has(m.provider)) continue;
      const list = map.get(m.provider) ?? [];
      list.push(m);
      map.set(m.provider, list);
    }
    return Array.from(map.entries());
  }, [showAll, configuredProviders]);

  const totalConfigured = MODELS.filter((m) =>
    configuredProviders.has(m.provider)
  ).length;

  return (
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {current ? (
            <ModelSelectorLogo provider={PROVIDERS[current.provider].logo} />
          ) : null}
          <span className="max-w-[180px] truncate">
            {current?.name ?? "Pick a model"}
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" className="opacity-60" />
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent title="Select model" className="max-w-2xl">
        <ModelSelectorInput placeholder="Search models or providers..." />
        <div className="border-b px-3 py-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {showAll
              ? `${MODELS.length} models · ${configuredProviders.size}/${
                  Object.keys(PROVIDERS).length
                } providers configured`
              : `${totalConfigured} models from your configured providers`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-xs"
            onClick={() => toggleShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <EyeOffIcon className="size-3" />
                Hide unconfigured
              </>
            ) : (
              <>
                <EyeIcon className="size-3" />
                Show all
              </>
            )}
          </Button>
        </div>
        <ModelSelectorList className="max-h-[60vh]">
          <ModelSelectorEmpty>
            {grouped.length === 0 && !showAll ? (
              <Empty className="py-6">
                <EmptyTitle className="text-sm">No keys configured</EmptyTitle>
                <EmptyDescription className="text-xs">
                  Add an API key in Settings, or click &quot;Show all&quot; to
                  browse.
                </EmptyDescription>
              </Empty>
            ) : (
              "No matching model."
            )}
          </ModelSelectorEmpty>
          {grouped.map(([provider, models]) => {
            const meta = PROVIDERS[provider];
            const hasKey = configuredProviders.has(provider);
            return (
              <ModelSelectorGroup
                key={provider}
                heading={
                  <span className="flex items-center gap-2">
                    <ModelSelectorLogo provider={meta.logo} />
                    {meta.name}
                    {!hasKey ? (
                      <Badge variant="outline" className="ml-1 text-[10px]">
                        no key
                      </Badge>
                    ) : null}
                  </span>
                }
              >
                {models.map((m) => {
                  const selected = m.id === value;
                  return (
                    <ModelSelectorItem
                      key={m.id}
                      value={`${m.name} ${meta.name} ${m.id}`}
                      onSelect={() => {
                        onChange(m.id);
                        setOpen(false);
                      }}
                      className="gap-2"
                    >
                      <ModelSelectorLogo provider={meta.logo} />
                      <ModelSelectorName>
                        <span className="font-medium">{m.name}</span>
                        {m.description ? (
                          <span className="text-muted-foreground ml-2 text-xs">
                            {m.description}
                          </span>
                        ) : null}
                      </ModelSelectorName>
                      <div className="flex items-center gap-1">
                        {m.capabilities?.includes("reasoning") ? (
                          <SparklesIcon className="text-muted-foreground size-3" />
                        ) : null}
                        {m.capabilities?.includes("vision") ? (
                          <ZapIcon className="text-muted-foreground size-3" />
                        ) : null}
                        {selected ? (
                          <CheckIcon className="size-4" />
                        ) : null}
                      </div>
                    </ModelSelectorItem>
                  );
                })}
              </ModelSelectorGroup>
            );
          })}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
