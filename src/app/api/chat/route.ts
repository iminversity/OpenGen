import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chats, messages as messagesTable } from "@/lib/db/schema";
import {
  getLanguageModel,
  MissingKeyError,
  type ApiKeyMap,
} from "@/lib/providers";
import { getModel } from "@/lib/models";
import { buildToolSet, getOpenAIKey, getTavilyKey } from "@/lib/tools";
import {
  buildProviderOptions,
  modelRejectsTemperature,
  type ReasoningSettings,
} from "@/lib/reasoning";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ServiceKeys = { tavily?: string };

type ChatRequest = {
  id: string;
  messages: UIMessage[];
  model: string;
  apiKeys?: ApiKeyMap;
  serviceKeys?: ServiceKeys;
  webSearch?: boolean;
  disabledTools?: string[];
  reasoning?: ReasoningSettings;
  generation?: {
    systemPrompt?: string;
    temperature?: number;
    maxOutputTokens?: number;
  };
};

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    id: chatId,
    messages: uiMessages,
    model: modelId,
    apiKeys = {},
    serviceKeys = {},
    webSearch = false,
    disabledTools = [],
    reasoning,
    generation = {},
  } = body;

  const modelInfo = getModel(modelId);
  if (!modelInfo) {
    return Response.json({ error: `Unknown model: ${modelId}` }, { status: 400 });
  }

  let model;
  try {
    model = getLanguageModel(modelId, apiKeys);
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return Response.json(
        { error: err.message, provider: err.provider, code: "MISSING_KEY" },
        { status: 400 }
      );
    }
    throw err;
  }

  const tavilyKey = getTavilyKey(serviceKeys.tavily);

  if (webSearch && !tavilyKey) {
    return Response.json(
      {
        error:
          "Web search is on but no Tavily key is configured. Add one in Settings or set TAVILY_API_KEY.",
        code: "MISSING_TAVILY_KEY",
      },
      { status: 400 }
    );
  }

  const openaiKey = getOpenAIKey(apiKeys);
  const tools = buildToolSet({
    webSearch,
    tavilyKey,
    openaiKey,
    disabled: disabledTools,
  });

  const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");

  await db
    .insert(chats)
    .values({
      id: chatId,
      title: deriveTitle(lastUser) ?? "New chat",
      model: modelId,
    })
    .onConflictDoUpdate({
      target: chats.id,
      set: { model: modelId, updatedAt: new Date() },
    });

  if (lastUser) {
    await db
      .insert(messagesTable)
      .values({
        id: lastUser.id,
        chatId,
        role: "user",
        parts: lastUser.parts as unknown as object,
      })
      .onConflictDoNothing();
  }

  const modelMessages = await convertToModelMessages(uiMessages);

  const systemPrompt =
    generation.systemPrompt?.trim() ||
    "You are xgen, a helpful, concise multi-model AI assistant.";
  const toolNames = Object.keys(tools);
  const toolBlock =
    toolNames.length > 0
      ? `\n\nYou have access to the following tools — call them whenever they would improve your answer. Always prefer using a tool over guessing or making up data:\n${toolNames
          .map((n) => `- \`${n}\``)
          .join("\n")}`
      : "";

  const providerOptions = buildProviderOptions(modelId, reasoning);
  const skipTemperature = modelRejectsTemperature(modelId, reasoning);

  const result = streamText({
    model,
    system: `${systemPrompt}${toolBlock}`,
    messages: modelMessages,
    temperature: skipTemperature ? undefined : clampTemp(generation.temperature),
    maxOutputTokens: clampTokens(generation.maxOutputTokens),
    tools,
    stopWhen: Object.keys(tools).length > 0 ? stepCountIs(6) : undefined,
    providerOptions,
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
    onFinish: async ({ responseMessage }) => {
      if (!responseMessage) return;
      // Truthy check (not ??) — the SDK can hand us an empty string id, which
      // would collide across chats under onConflictDoUpdate.
      const messageId =
        (responseMessage.id && responseMessage.id.trim()) || nanoid();
      await db
        .insert(messagesTable)
        .values({
          id: messageId,
          chatId,
          role: "assistant",
          parts: responseMessage.parts as unknown as object,
          model: modelId,
        })
        .onConflictDoUpdate({
          target: messagesTable.id,
          set: {
            chatId,
            parts: responseMessage.parts as unknown as object,
            model: modelId,
          },
        });
      await db
        .update(chats)
        .set({ updatedAt: new Date() })
        .where(eq(chats.id, chatId));
    },
  });
}

function deriveTitle(message: UIMessage | undefined): string | null {
  if (!message) return null;
  const textPart = message.parts.find(
    (p): p is Extract<typeof p, { type: "text" }> => p.type === "text"
  );
  const text = textPart?.text?.trim();
  if (!text) return null;
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

function clampTemp(t: number | undefined): number | undefined {
  if (t === undefined || Number.isNaN(t)) return undefined;
  return Math.max(0, Math.min(2, t));
}

function clampTokens(t: number | undefined): number | undefined {
  if (t === undefined || Number.isNaN(t)) return undefined;
  return Math.max(64, Math.min(64_000, Math.round(t)));
}
