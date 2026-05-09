export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "groq"
  | "openrouter"
  | "fireworks";

export type ServiceId = "tavily";

export const SERVICES: Record<
  ServiceId,
  { name: string; logo: string; keyUrl: string; keyName: string; description: string }
> = {
  tavily: {
    name: "Tavily Search",
    logo: "tavily",
    keyUrl: "https://app.tavily.com/home",
    keyName: "TAVILY_API_KEY",
    description: "Powers the Search toggle for grounded web answers.",
  },
};

export type GenerationSettings = {
  systemPrompt: string;
  temperature: number;
  maxOutputTokens: number;
};

export const DEFAULT_GENERATION: GenerationSettings = {
  systemPrompt: `You are xgen, a sharp, friendly multi-model AI assistant.

Always format your replies with rich markdown so they're easy to scan:
- Use **bold** for key terms and *italics* for emphasis.
- Use \`inline code\` for identifiers, filenames, env vars, and short snippets.
- Use fenced code blocks with a language hint for any code longer than one line. Add a filename after the language when it's helpful, e.g. \`\`\`tsx title="components/button.tsx".
- Use headings (##, ###) to break up longer answers, but skip them for short replies.
- Use bulleted or numbered lists for steps, options, or comparisons.
- Use tables for structured comparisons.
- Use > blockquotes for callouts and warnings.
- Use [links](url) for references.
- Use $$ ... $$ for math when appropriate.

Be concise: prefer short paragraphs, lists over walls of text. When unsure, ask a clarifying question. Never apologize unnecessarily, never invent facts, and admit when you don't know.`,
  temperature: 0.7,
  maxOutputTokens: 4096,
};

export type ModelCapability = "vision" | "reasoning" | "tools" | "web";

export type ModelInfo = {
  id: string;
  name: string;
  provider: ProviderId;
  description?: string;
  context?: number;
  capabilities?: ModelCapability[];
};

export const PROVIDERS: Record<
  ProviderId,
  { name: string; logo: string; keyUrl: string; keyName: string }
> = {
  openai: {
    name: "OpenAI",
    logo: "openai",
    keyUrl: "https://platform.openai.com/api-keys",
    keyName: "OPENAI_API_KEY",
  },
  anthropic: {
    name: "Anthropic",
    logo: "anthropic",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyName: "ANTHROPIC_API_KEY",
  },
  google: {
    name: "Google",
    logo: "google",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyName: "GOOGLE_GENERATIVE_AI_API_KEY",
  },
  xai: {
    name: "xAI",
    logo: "xai",
    keyUrl: "https://console.x.ai",
    keyName: "XAI_API_KEY",
  },
  groq: {
    name: "Groq",
    logo: "groq",
    keyUrl: "https://console.groq.com/keys",
    keyName: "GROQ_API_KEY",
  },
  openrouter: {
    name: "OpenRouter",
    logo: "openrouter",
    keyUrl: "https://openrouter.ai/keys",
    keyName: "OPENROUTER_API_KEY",
  },
  fireworks: {
    name: "Fireworks",
    logo: "fireworks-ai",
    keyUrl: "https://fireworks.ai/account/api-keys",
    keyName: "FIREWORKS_API_KEY",
  },
};

export const MODELS: ModelInfo[] = [
  // OpenAI
  {
    id: "openai:gpt-5",
    name: "GPT-5",
    provider: "openai",
    description: "Frontier reasoning + multimodal",
    capabilities: ["vision", "reasoning", "tools"],
  },
  {
    id: "openai:gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "openai",
    description: "Fast, cheap, capable",
    capabilities: ["vision", "reasoning", "tools"],
  },
  {
    id: "openai:gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    capabilities: ["vision", "tools"],
  },
  {
    id: "openai:gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    capabilities: ["vision", "tools"],
  },
  {
    id: "openai:o3",
    name: "o3",
    provider: "openai",
    description: "Deep reasoning",
    capabilities: ["reasoning", "tools"],
  },
  {
    id: "openai:o3-mini",
    name: "o3 Mini",
    provider: "openai",
    capabilities: ["reasoning", "tools"],
  },

  // Anthropic
  {
    id: "anthropic:claude-opus-4-7",
    name: "Claude Opus 4.7",
    provider: "anthropic",
    description: "Most capable Claude model",
    capabilities: ["vision", "reasoning", "tools"],
  },
  {
    id: "anthropic:claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    capabilities: ["vision", "reasoning", "tools"],
  },
  {
    id: "anthropic:claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    description: "Fast and inexpensive",
    capabilities: ["vision", "reasoning", "tools"],
  },

  // Google
  {
    id: "google:gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    capabilities: ["vision", "reasoning", "tools"],
  },
  {
    id: "google:gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    capabilities: ["vision", "reasoning", "tools"],
  },
  {
    id: "google:gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
    capabilities: ["vision", "tools"],
  },

  // xAI
  {
    id: "xai:grok-4",
    name: "Grok 4",
    provider: "xai",
    capabilities: ["vision", "reasoning", "tools"],
  },
  {
    id: "xai:grok-4-fast",
    name: "Grok 4 Fast",
    provider: "xai",
    capabilities: ["vision", "reasoning", "tools"],
  },
  {
    id: "xai:grok-3",
    name: "Grok 3",
    provider: "xai",
    capabilities: ["tools"],
  },

  // Groq
  {
    id: "groq:llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "groq",
    description: "Ultra-fast inference",
    capabilities: ["tools"],
  },
  {
    id: "groq:llama-3.1-8b-instant",
    name: "Llama 3.1 8B",
    provider: "groq",
    capabilities: ["tools"],
  },
  {
    id: "groq:qwen-2.5-72b",
    name: "Qwen 2.5 72B",
    provider: "groq",
    capabilities: ["tools"],
  },

  // OpenRouter
  {
    id: "openrouter:openrouter/auto",
    name: "OpenRouter Auto",
    provider: "openrouter",
    description: "Smart routing across providers",
    capabilities: ["tools"],
  },
  {
    id: "openrouter:deepseek/deepseek-chat",
    name: "DeepSeek Chat",
    provider: "openrouter",
    capabilities: ["tools"],
  },
  {
    id: "openrouter:meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B (OR)",
    provider: "openrouter",
  },

  // Fireworks
  {
    id: "fireworks:accounts/fireworks/models/deepseek-v3",
    name: "DeepSeek v3",
    provider: "fireworks",
    capabilities: ["tools"],
  },
  {
    id: "fireworks:accounts/fireworks/models/llama-v3p3-70b-instruct",
    name: "Llama 3.3 70B (FW)",
    provider: "fireworks",
    capabilities: ["tools"],
  },
];

export const DEFAULT_MODEL_ID = "anthropic:claude-sonnet-4-6";

export function getModel(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

export function parseModelId(id: string): { provider: ProviderId; model: string } {
  const idx = id.indexOf(":");
  if (idx === -1) throw new Error(`Invalid model id: ${id}`);
  return {
    provider: id.slice(0, idx) as ProviderId,
    model: id.slice(idx + 1),
  };
}
