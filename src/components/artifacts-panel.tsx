"use client";

import { useEffect, useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FileCodeIcon,
} from "lucide-react";

import {
  Artifact,
  ArtifactActions,
  ArtifactClose,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import {
  CodeBlock,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { type Artifact as ArtifactItem, inferFilename } from "@/lib/artifacts";
import { toast } from "sonner";

export function ArtifactsPanel({
  artifacts,
  open,
  onOpenChange,
}: {
  artifacts: ArtifactItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (artifacts.length === 0) {
      setActive(null);
      return;
    }
    if (!active || !artifacts.find((a) => a.id === active)) {
      setActive(artifacts.at(-1)?.id ?? null);
    }
  }, [artifacts, active]);

  if (!open || artifacts.length === 0) return null;

  const current = artifacts.find((a) => a.id === active) ?? artifacts.at(-1)!;

  const handleDownload = () => {
    const blob = new Blob([current.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = inferFilename(current);
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  return (
    <aside className="border-l bg-background flex h-full w-[420px] shrink-0 flex-col xl:w-[520px]">
      <Artifact className="flex h-full flex-col rounded-none border-0">
        <ArtifactHeader>
          <div className="flex min-w-0 items-center gap-2">
            <FileCodeIcon className="size-4 shrink-0" />
            <div className="min-w-0">
              <ArtifactTitle className="truncate">
                {inferFilename(current)}
              </ArtifactTitle>
              <ArtifactDescription>
                {current.language} · {current.code.split("\n").length} lines
              </ArtifactDescription>
            </div>
          </div>
          <ArtifactActions>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              aria-label="Download"
            >
              <DownloadIcon data-icon />
            </Button>
            <ArtifactClose onClick={() => onOpenChange(false)} />
          </ArtifactActions>
        </ArtifactHeader>
        <Tabs
          value={current.id}
          onValueChange={setActive}
          className="flex h-full min-h-0 flex-col"
        >
          {artifacts.length > 1 ? (
            <ScrollArea className="border-b">
              <TabsList className="flex h-9 w-max rounded-none bg-transparent p-1">
                {artifacts.map((a) => (
                  <TabsTrigger
                    key={a.id}
                    value={a.id}
                    className="text-xs data-[state=active]:bg-muted"
                  >
                    {inferFilename(a)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          ) : null}
          {artifacts.map((a) => (
            <TabsContent
              key={a.id}
              value={a.id}
              className="m-0 min-h-0 flex-1 overflow-hidden"
            >
              <ArtifactContent className="h-full overflow-auto p-0">
                <CodeBlock
                  code={a.code}
                  language={a.language as never}
                  className="h-full rounded-none border-0"
                >
                  <CodeBlockCopyButton
                    onCopy={() => toast.success("Copied")}
                  />
                </CodeBlock>
              </ArtifactContent>
            </TabsContent>
          ))}
        </Tabs>
      </Artifact>
    </aside>
  );
}

export function ArtifactsToggleButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  if (count === 0) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={onClick}
      aria-label={`${count} artifact${count === 1 ? "" : "s"}`}
    >
      <FileCodeIcon data-icon />
      {count} artifact{count === 1 ? "" : "s"}
    </Button>
  );
}

export { CheckIcon, CopyIcon };
