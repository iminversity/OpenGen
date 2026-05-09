"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import {
  BinaryIcon,
  BookOpenIcon,
  BrainIcon,
  CalculatorIcon,
  CheckCircle2Icon,
  ClockIcon,
  CloudIcon,
  CodeIcon,
  CoinsIcon,
  CopyIcon,
  FileCodeIcon,
  FingerprintIcon,
  FlaskConicalIcon,
  GitBranchIcon,
  GlobeIcon,
  HashIcon,
  ImageIcon,
  KeyIcon,
  LinkIcon,
  Loader2Icon,
  LockIcon,
  NewspaperIcon,
  PackageIcon,
  PaletteIcon,
  QrCodeIcon,
  RefreshCcwIcon,
  RegexIcon,
  SearchIcon,
  SparklesIcon,
  SpellCheckIcon,
  SquareIcon,
  WrenchIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Suggestion } from "@/components/ai-elements/suggestion";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModelPicker } from "@/components/model-picker";
import { ArtifactsPanel } from "@/components/artifacts-panel";
import {
  DEFAULT_REASONING,
  modelSupportsReasoning,
  type ReasoningEffort,
  type ReasoningSettings,
} from "@/lib/reasoning";
import { useApiKeys } from "@/lib/hooks/use-api-keys";
import { extractArtifacts } from "@/lib/artifacts";
import {
  DEFAULT_MODEL_ID,
  PROVIDERS,
  getModel,
  parseModelId,
  type ProviderId,
} from "@/lib/models";
import { ModelSelectorLogo } from "@/components/ai-elements/model-selector";

const SUGGESTIONS = [
  "Explain quantum entanglement like I'm a curious 12-year-old",
  "Write a Python script to find duplicate files by hash",
  "Compare GPT-5, Claude Opus 4.7, and Gemini 2.5 Pro",
  "Draft a release note for v0.1 of an open-source AI app",
];

type ToolMeta = { icon: LucideIcon; label: string; activeLabel?: string };
const TOOL_META: Record<string, ToolMeta> = {
  // Core
  get_current_time: { icon: ClockIcon, label: "Current time", activeLabel: "Checking the clock" },
  wikipedia_search: { icon: BookOpenIcon, label: "Wikipedia", activeLabel: "Looking up Wikipedia" },
  // Search
  web_search: { icon: SearchIcon, label: "Web search", activeLabel: "Searching the web" },
  fetch_url: { icon: LinkIcon, label: "Fetch page", activeLabel: "Reading page" },
  // Reference
  calculator: { icon: CalculatorIcon, label: "Calculator", activeLabel: "Calculating" },
  weather: { icon: CloudIcon, label: "Weather", activeLabel: "Checking weather" },
  currency_convert: { icon: CoinsIcon, label: "Currency", activeLabel: "Converting currency" },
  dictionary: { icon: SpellCheckIcon, label: "Dictionary", activeLabel: "Looking up word" },
  arxiv_search: { icon: FlaskConicalIcon, label: "arXiv", activeLabel: "Searching arXiv" },
  // Dev
  github_search: { icon: GitBranchIcon, label: "GitHub", activeLabel: "Searching GitHub" },
  npm_info: { icon: PackageIcon, label: "npm", activeLabel: "Looking up npm" },
  hacker_news_search: { icon: NewspaperIcon, label: "Hacker News", activeLabel: "Searching HN" },
  regex_test: { icon: RegexIcon, label: "Regex", activeLabel: "Testing regex" },
  base64_codec: { icon: BinaryIcon, label: "Base64", activeLabel: "Encoding/decoding" },
  hash: { icon: HashIcon, label: "Hash", activeLabel: "Hashing" },
  uuid_generate: { icon: FingerprintIcon, label: "UUID", activeLabel: "Generating UUID" },
  // Generative
  generate_image: { icon: ImageIcon, label: "Image", activeLabel: "Generating image" },
  qr_code: { icon: QrCodeIcon, label: "QR code", activeLabel: "Generating QR" },
  // Productivity
  timezone_convert: { icon: ClockIcon, label: "Timezone", activeLabel: "Converting timezone" },
  color_convert: { icon: PaletteIcon, label: "Color", activeLabel: "Converting color" },
  password_generate: { icon: LockIcon, label: "Password", activeLabel: "Generating password" },
  // Generic catch-all
  _generic_code: { icon: CodeIcon, label: "Tool", activeLabel: "Running tool" },
};
function getToolMeta(toolName: string): ToolMeta {
  return (
    TOOL_META[toolName] ?? {
      icon: WrenchIcon,
      label: `Tool · ${toolName}`,
      activeLabel: `Running ${toolName}`,
    }
  );
}

const AttachmentsRow = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <Attachments variant="inline">
      {attachments.files.map((a) => (
        <Attachment data={a} key={a.id} onRemove={() => attachments.remove(a.id)}>
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

type ChatViewProps = {
  chatId?: string;
  initialMessages?: UIMessage[];
  initialModel?: string;
};

export function ChatView({
  chatId: providedChatId,
  initialMessages,
  initialModel,
}: ChatViewProps) {
  const router = useRouter();
  const { keys, serviceKeys, generation, toolPrefs, configured } = useApiKeys();
  // Stable client-generated id for new chats. Server-generated ids are unsafe
  // because router.refresh() / re-renders would change them and reset useChat.
  const [chatId] = useState(() => providedChatId ?? nanoid());
  const [model, setModel] = useState(initialModel ?? DEFAULT_MODEL_ID);
  const [webSearch, setWebSearch] = useState(false);
  const [reasoning, setReasoning] = useState<ReasoningSettings>(DEFAULT_REASONING);
  const [artifactsOpen, setArtifactsOpen] = useState(true);
  const navigatedRef = useRef(false);

  const goToSettings = (tab: "models" | "search" | "generation") => {
    router.push(tab === "models" ? "/settings" : `/settings?tab=${tab}`);
  };

  // When navigating between chats, sync the picker to the chat's model.
  useEffect(() => {
    if (initialModel) setModel(initialModel);
  }, [initialModel]);

  // Chat caches transport at construction. Keep a stable transport that
  // reads the latest model/keys/etc from a ref so switching models or
  // toggling search mid-conversation actually sticks.
  const requestStateRef = useRef({
    chatId,
    model,
    keys,
    serviceKeys,
    webSearch,
    reasoning,
    generation,
    toolPrefs,
  });
  useEffect(() => {
    requestStateRef.current = {
      chatId,
      model,
      keys,
      serviceKeys,
      webSearch,
      reasoning,
      generation,
      toolPrefs,
    };
  }, [
    chatId,
    model,
    keys,
    serviceKeys,
    webSearch,
    reasoning,
    generation,
    toolPrefs,
  ]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, id }) => {
          const s = requestStateRef.current;
          return {
            body: {
              id: id ?? s.chatId,
              messages,
              model: s.model,
              apiKeys: s.keys,
              serviceKeys: s.serviceKeys,
              webSearch: s.webSearch,
              reasoning: s.reasoning,
              generation: s.generation,
              disabledTools: s.toolPrefs?.disabled ?? [],
            },
          };
        },
      }),
    []
  );

  const { messages, sendMessage, status, regenerate, stop, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    onError: (err) => {
      const msg = err.message ?? "Something went wrong";
      const parsed = tryParseError(msg);
      if (parsed?.code === "MISSING_KEY" && parsed.provider) {
        const name = PROVIDERS[parsed.provider as ProviderId]?.name ?? parsed.provider;
        toast.error(`No ${name} API key configured`, {
          description: `Add it in Settings, or set ${PROVIDERS[parsed.provider as ProviderId]?.keyName} in your environment.`,
          action: {
            label: "Open settings",
            onClick: () => goToSettings("models"),
          },
        });
        return;
      }
      if (parsed?.code === "MISSING_TAVILY_KEY") {
        toast.error("Web search needs a Tavily key", {
          action: {
            label: "Open settings",
            onClick: () => goToSettings("search"),
          },
        });
        return;
      }
      const modelName = getModel(model)?.name ?? model;
      toast.error(`${modelName} request failed`, {
        description: parsed?.error ?? msg.slice(0, 240),
      });
    },
    onFinish: () => {
      // Tell the sidebar to refetch — new chat may have just been created.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("xgen:chats-changed"));
      }
      // For brand-new chats started on `/`, soft-update the URL once the
      // assistant has finished so refresh / share works without unmounting.
      if (!providedChatId && !navigatedRef.current) {
        navigatedRef.current = true;
        try {
          window.history.replaceState(null, "", `/c/${chatId}`);
        } catch {
          /* ignore */
        }
      }
    },
  });

  useEffect(() => {
    if (error) console.error("Chat error:", error);
  }, [error]);

  const currentProvider = parseModelId(model).provider as ProviderId;
  const hasKeyForCurrent = configured.has(currentProvider);
  const hasTavilyKey =
    Boolean(serviceKeys.tavily && serviceKeys.tavily.trim()) ||
    Boolean(process.env.NEXT_PUBLIC_TAVILY_CONFIGURED); // best effort hint

  const artifacts = useMemo(() => extractArtifacts(messages), [messages]);

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim() && (!message.files || message.files.length === 0)) {
      return;
    }
    if (!hasKeyForCurrent) {
      toast.error(`Add your ${PROVIDERS[currentProvider].name} API key`, {
        action: { label: "Settings", onClick: () => goToSettings("models") },
      });
      return;
    }
    if (webSearch && !serviceKeys.tavily) {
      toast.error("Web search needs a Tavily key", {
        action: { label: "Add key", onClick: () => goToSettings("search") },
      });
      return;
    }
    sendMessage({
      text: message.text ?? "",
      files: message.files ?? [],
    });
  };

  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-svh min-h-0 w-full">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl">
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={<SparklesIcon className="size-8 text-muted-foreground" />}
                title="What should we build today?"
                description="Pick a model, paste a prompt — every major LLM in one chat."
              >
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <Suggestion
                      key={s}
                      suggestion={s}
                      onClick={() => sendMessage({ text: s })}
                    />
                  ))}
                </div>
              </ConversationEmptyState>
            ) : null}

            {messages.map((message, idx) => {
              const isLast = idx === messages.length - 1;
              const lastPart = message.parts.at(-1);

              // Group "process" parts (reasoning, tool calls, citations) so we
              // can render them inside a unified ChainOfThought block above the
              // assistant's final answer.
              type ToolPart = Extract<
                (typeof message.parts)[number],
                { type: `tool-${string}` }
              >;
              const reasoningParts = message.parts.filter(
                (p) => p.type === "reasoning"
              );
              const reasoningText = reasoningParts
                .map((p) => ("text" in p ? p.text : ""))
                .join("\n\n");
              const reasoningStreaming =
                isLast && isStreaming && lastPart?.type === "reasoning";
              const toolParts = message.parts.filter((p) =>
                p.type.startsWith("tool-")
              ) as ToolPart[];
              const sourceParts = message.parts.filter(
                (p) => p.type === "source-url"
              );

              const hasProcess =
                message.role === "assistant" &&
                (reasoningParts.length > 0 ||
                  toolParts.length > 0 ||
                  sourceParts.length > 0);

              const allToolsComplete = toolParts.every(
                (t) =>
                  t.state === "output-available" ||
                  t.state === "output-error"
              );
              const processActive =
                isLast &&
                isStreaming &&
                (reasoningStreaming ||
                  !allToolsComplete ||
                  lastPart?.type === "source-url" ||
                  (lastPart?.type ?? "").startsWith("tool-"));

              const headerLabel = processActive
                ? "Thinking…"
                : reasoningParts.length > 0 || toolParts.length > 0
                  ? "Thought process"
                  : "Sources";

              return (
                <Fragment key={message.id}>
                  {hasProcess ? (
                    <ChainOfThought defaultOpen={processActive}>
                      <ChainOfThoughtHeader>{headerLabel}</ChainOfThoughtHeader>
                      <ChainOfThoughtContent>
                        {reasoningParts.length > 0 ? (
                          <ChainOfThoughtStep
                            icon={BrainIcon}
                            label="Reasoning"
                            description={
                              reasoningStreaming
                                ? "Working through the problem…"
                                : `${reasoningText.split(/\s+/).filter(Boolean).length} thoughts`
                            }
                            status={reasoningStreaming ? "active" : "complete"}
                          >
                            <Reasoning
                              className="w-full"
                              isStreaming={reasoningStreaming}
                              defaultOpen={reasoningStreaming}
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>
                                {reasoningText}
                              </ReasoningContent>
                            </Reasoning>
                          </ChainOfThoughtStep>
                        ) : null}

                        {toolParts.map((tool, i) => {
                          const toolName = tool.type.slice("tool-".length);
                          const meta = getToolMeta(toolName);
                          const isComplete =
                            tool.state === "output-available";
                          const isError = tool.state === "output-error";
                          const status: "active" | "complete" | "pending" =
                            isComplete || isError ? "complete" : "active";

                          // Pull commonly-used input fields generically
                          const input =
                            (tool.input as Record<string, unknown>) ?? {};
                          const output =
                            (tool.output as Record<string, unknown>) ?? {};

                          // Build a friendly per-tool description + result chips
                          let description: string | null = null;
                          let chips: { label: string; url?: string }[] = [];
                          if (toolName === "web_search") {
                            description =
                              typeof input.query === "string"
                                ? `"${input.query}"`
                                : null;
                            const results = (output.results ?? []) as Array<{
                              title?: string;
                              url?: string;
                            }>;
                            chips = results.slice(0, 8).map((r) => ({
                              label: r.title ?? r.url ?? "result",
                              url: r.url,
                            }));
                          } else if (toolName === "fetch_url") {
                            description =
                              typeof input.url === "string"
                                ? input.url.length > 60
                                  ? input.url.slice(0, 60) + "…"
                                  : input.url
                                : null;
                          } else if (toolName === "wikipedia_search") {
                            description =
                              typeof input.query === "string"
                                ? `"${input.query}"`
                                : null;
                            const results = (output.results ?? []) as Array<{
                              title?: string;
                              url?: string;
                            }>;
                            chips = results.slice(0, 5).map((r) => ({
                              label: r.title ?? "article",
                              url: r.url,
                            }));
                          } else if (toolName === "get_current_time") {
                            const tz =
                              typeof input.timezone === "string"
                                ? input.timezone
                                : "UTC";
                            const local =
                              typeof output.local === "string"
                                ? output.local
                                : null;
                            description = isComplete
                              ? local ?? tz
                              : `(${tz})`;
                          }

                          const label =
                            status === "active"
                              ? meta.activeLabel ?? meta.label
                              : meta.label;

                          return (
                            <ChainOfThoughtStep
                              key={`${message.id}-tool-${i}`}
                              icon={meta.icon}
                              label={label}
                              description={
                                description ??
                                (isError
                                  ? "Failed"
                                  : status === "active"
                                    ? "Running…"
                                    : "Done")
                              }
                              status={status}
                            >
                              {chips.length > 0 ? (
                                <ChainOfThoughtSearchResults>
                                  {chips.map((c, ri) => (
                                    <ChainOfThoughtSearchResult
                                      key={`${message.id}-chip-${ri}`}
                                      asChild
                                    >
                                      <a
                                        href={c.url ?? "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="max-w-[18rem] truncate"
                                        title={c.url ?? ""}
                                      >
                                        {c.label}
                                      </a>
                                    </ChainOfThoughtSearchResult>
                                  ))}
                                </ChainOfThoughtSearchResults>
                              ) : null}
                              {/* For non-chip tools, expose the raw input/output for power users */}
                              {chips.length === 0 ? (
                                <Tool defaultOpen={false}>
                                  <ToolHeader
                                    type={tool.type}
                                    state={tool.state}
                                  />
                                  <ToolContent>
                                    <ToolInput input={tool.input} />
                                    {isComplete ? (
                                      <ToolOutput
                                        output={tool.output}
                                        errorText={undefined}
                                      />
                                    ) : null}
                                  </ToolContent>
                                </Tool>
                              ) : null}
                            </ChainOfThoughtStep>
                          );
                        })}

                        {sourceParts.length > 0 ? (
                          <ChainOfThoughtStep
                            icon={CheckCircle2Icon}
                            label="Citations"
                            description={`${sourceParts.length} source${sourceParts.length === 1 ? "" : "s"}`}
                            status="complete"
                          >
                            <ChainOfThoughtSearchResults>
                              {sourceParts.map((p, i) =>
                                p.type === "source-url" ? (
                                  <ChainOfThoughtSearchResult
                                    key={`${message.id}-cite-${i}`}
                                    asChild
                                  >
                                    <a
                                      href={p.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="max-w-[18rem] truncate"
                                      title={p.url}
                                    >
                                      {p.title ?? new URL(p.url).hostname}
                                    </a>
                                  </ChainOfThoughtSearchResult>
                                ) : null
                              )}
                            </ChainOfThoughtSearchResults>
                          </ChainOfThoughtStep>
                        ) : null}
                      </ChainOfThoughtContent>
                    </ChainOfThought>
                  ) : null}

                  <Message from={message.role}>
                    <MessageContent>
                      {message.parts.map((part, i) => {
                        const key = `${message.id}-${i}`;
                        switch (part.type) {
                          case "text":
                            // User-typed prose preserves their exact whitespace
                            // (newlines, indentation). Assistant text renders
                            // as markdown via Streamdown.
                            if (message.role === "user") {
                              return (
                                <div
                                  key={key}
                                  className="text-sm whitespace-pre-wrap break-words"
                                >
                                  {part.text}
                                </div>
                              );
                            }
                            return (
                              <MessageResponse key={key} className="prose-chat">
                                {part.text}
                              </MessageResponse>
                            );
                          case "file": {
                            if (part.mediaType?.startsWith("image/")) {
                              return (
                                <img
                                  key={key}
                                  src={part.url}
                                  alt={part.filename ?? "attachment"}
                                  className="my-2 max-h-80 rounded-lg border"
                                />
                              );
                            }
                            return (
                              <a
                                key={key}
                                href={part.url}
                                className="text-sm underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {part.filename ?? "Attachment"}
                              </a>
                            );
                          }
                          default:
                            return null;
                        }
                      })}
                      {message.role === "assistant" &&
                      isLast &&
                      isStreaming &&
                      !message.parts.some((p) => p.type === "text") ? (
                        <span className="text-muted-foreground inline-flex items-center gap-2 text-sm">
                          <Loader2Icon className="size-3.5 animate-spin" />
                          Working on it…
                        </span>
                      ) : null}
                    </MessageContent>
                  </Message>

                  {message.role === "assistant" && isLast && !isStreaming ? (
                    <MessageActions className="ml-12 -mt-2">
                      <MessageAction
                        tooltip="Regenerate"
                        onClick={() => regenerate()}
                      >
                        <RefreshCcwIcon data-icon />
                      </MessageAction>
                      <MessageAction
                        tooltip="Copy"
                        onClick={() => {
                          const txt = message.parts
                            .filter((p) => p.type === "text")
                            .map((p) => ("text" in p ? p.text : ""))
                            .join("\n\n");
                          navigator.clipboard.writeText(txt);
                          toast.success("Copied");
                        }}
                      >
                        <CopyIcon data-icon />
                      </MessageAction>
                    </MessageActions>
                  ) : null}
                </Fragment>
              );
            })}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4">
          <PromptInput
            onSubmit={handleSubmit}
            accept="image/*,application/pdf,text/*"
            multiple
          >
            <PromptInputBody>
              <AttachmentsRow />
              <PromptInputTextarea
                placeholder={
                  hasKeyForCurrent
                    ? `Message ${getModel(model)?.name ?? model}...`
                    : `Add your ${PROVIDERS[currentProvider].name} key to chat...`
                }
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <PromptInputButton
                  variant={webSearch ? "default" : "ghost"}
                  onClick={() => {
                    if (!serviceKeys.tavily && !webSearch) {
                      goToSettings("search");
                      return;
                    }
                    setWebSearch((v) => !v);
                  }}
                  aria-pressed={webSearch}
                >
                  <GlobeIcon data-icon />
                  <span>Search</span>
                </PromptInputButton>
                {modelSupportsReasoning(model) ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <PromptInputButton
                        variant={reasoning.enabled ? "default" : "ghost"}
                        aria-pressed={reasoning.enabled}
                      >
                        <BrainIcon data-icon />
                        <span>
                          {reasoning.enabled
                            ? `Think · ${reasoning.effort}`
                            : "Think"}
                        </span>
                      </PromptInputButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuLabel className="text-xs">
                        Reasoning
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() =>
                          setReasoning((r) => ({ ...r, enabled: !r.enabled }))
                        }
                      >
                        {reasoning.enabled ? "Turn off" : "Turn on"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs">
                        Effort
                      </DropdownMenuLabel>
                      {(["low", "medium", "high"] as ReasoningEffort[]).map(
                        (level) => (
                          <DropdownMenuItem
                            key={level}
                            onClick={() =>
                              setReasoning({ enabled: true, effort: level })
                            }
                          >
                            <span
                              className={
                                reasoning.effort === level && reasoning.enabled
                                  ? "font-semibold"
                                  : ""
                              }
                            >
                              {level[0].toUpperCase() + level.slice(1)}
                            </span>
                          </DropdownMenuItem>
                        )
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
                <ModelPicker
                  value={model}
                  onChange={setModel}
                  configuredProviders={configured}
                />
                {!hasKeyForCurrent ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => goToSettings("models")}
                    className="gap-1.5"
                  >
                    <KeyIcon data-icon />
                    Add{" "}
                    <ModelSelectorLogo
                      provider={PROVIDERS[currentProvider].logo}
                    />{" "}
                    key
                  </Button>
                ) : null}
                {artifacts.length > 0 ? (
                  <Button
                    type="button"
                    variant={artifactsOpen ? "default" : "outline"}
                    size="sm"
                    onClick={() => setArtifactsOpen((v) => !v)}
                    className="gap-1.5"
                  >
                    <FileCodeIcon data-icon />
                    {artifacts.length}
                  </Button>
                ) : null}
              </PromptInputTools>
              {isStreaming ? (
                <Button type="button" size="icon" variant="outline" onClick={stop}>
                  <SquareIcon data-icon />
                </Button>
              ) : (
                <PromptInputSubmit status={status} />
              )}
            </PromptInputFooter>
          </PromptInput>
          <p className="text-muted-foreground mt-2 text-center text-xs">
            xgen never persists your API keys.{" "}
            {webSearch && hasTavilyKey ? "Web search via Tavily is on. " : ""}
            Models can hallucinate — verify critical info.
          </p>
        </div>
      </div>

      <ArtifactsPanel
        artifacts={artifacts}
        open={artifactsOpen}
        onOpenChange={setArtifactsOpen}
      />
    </div>
  );
}

export function newChatId() {
  return nanoid();
}

function tryParseError(
  message: string
): { error?: string; provider?: string; code?: string } | null {
  try {
    return JSON.parse(message);
  } catch {
    return null;
  }
}
