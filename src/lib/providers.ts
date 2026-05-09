import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createFireworks } from "@ai-sdk/fireworks";
import type { LanguageModel } from "ai";
import { type ProviderId, parseModelId, PROVIDERS } from "./models";

export type ApiKeyMap = Partial<Record<ProviderId, string>>;

function pickKey(
  provider: ProviderId,
  clientKeys: ApiKeyMap
): string | undefined {
  if (clientKeys[provider]) return clientKeys[provider];
  return process.env[PROVIDERS[provider].keyName];
}

export class MissingKeyError extends Error {
  constructor(public provider: ProviderId) {
    super(
      `No API key configured for ${PROVIDERS[provider].name}. Add one in Settings.`
    );
    this.name = "MissingKeyError";
  }
}

export function getLanguageModel(
  modelId: string,
  clientKeys: ApiKeyMap = {}
): LanguageModel {
  const { provider, model } = parseModelId(modelId);
  const apiKey = pickKey(provider, clientKeys);
  if (!apiKey) throw new MissingKeyError(provider);

  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(model);
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model);
    case "xai":
      return createXai({ apiKey })(model);
    case "groq":
      return createGroq({ apiKey })(model);
    case "openrouter":
      return createOpenRouter({ apiKey })(model);
    case "fireworks":
      return createFireworks({ apiKey })(model);
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown provider: ${String(_exhaustive)}`);
    }
  }
}
