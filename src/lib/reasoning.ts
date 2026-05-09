import { getModel, parseModelId, type ProviderId } from "./models";

export type ReasoningEffort = "low" | "medium" | "high";
export type ReasoningSettings = {
  enabled: boolean;
  effort: ReasoningEffort;
};

export const DEFAULT_REASONING: ReasoningSettings = {
  enabled: false,
  effort: "medium",
};

const ANTHROPIC_BUDGET: Record<ReasoningEffort, number> = {
  low: 4_000,
  medium: 10_000,
  high: 24_000,
};

const GOOGLE_BUDGET: Record<ReasoningEffort, number> = {
  low: 1_024,
  medium: 4_096,
  high: 12_000,
};

export function modelSupportsReasoning(modelId: string): boolean {
  return getModel(modelId)?.capabilities?.includes("reasoning") ?? false;
}

/**
 * Reasoning-capable OpenAI models (o-series, gpt-5) reject `temperature`.
 * Same for Anthropic when extended thinking is on.
 */
export function modelRejectsTemperature(
  modelId: string,
  reasoning: ReasoningSettings | undefined
): boolean {
  const { provider, model } = parseModelId(modelId);
  if (provider === "openai" && /^(o\d|gpt-5)/i.test(model)) return true;
  if (provider === "anthropic" && reasoning?.enabled) return true;
  return false;
}

type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JSONValue }
  | JSONValue[];
type JSONObject = { [k: string]: JSONValue };

export function buildProviderOptions(
  modelId: string,
  reasoning: ReasoningSettings | undefined
): Record<string, JSONObject> | undefined {
  if (!reasoning?.enabled) return undefined;
  if (!modelSupportsReasoning(modelId)) return undefined;
  const { provider } = parseModelId(modelId);
  const effort = reasoning.effort;
  switch (provider as ProviderId) {
    case "openai":
      return { openai: { reasoningEffort: effort, reasoningSummary: "auto" } };
    case "anthropic":
      return {
        anthropic: {
          thinking: {
            type: "enabled",
            budgetTokens: ANTHROPIC_BUDGET[effort],
          },
        },
      };
    case "google":
      return {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: GOOGLE_BUDGET[effort],
          },
        },
      };
    case "xai":
      return { xai: { reasoningEffort: effort } };
    case "groq":
      return { groq: { reasoningEffort: effort } };
    case "openrouter":
      return { openrouter: { reasoning: { effort } } };
    case "fireworks":
      return undefined;
    default:
      return undefined;
  }
}
