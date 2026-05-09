import { generateText } from "ai";
import { getLanguageModel, type ApiKeyMap } from "@/lib/providers";
import {
  DEFAULT_MODEL_ID,
  PROVIDERS,
  type ProviderId,
  type ServiceId,
  SERVICES,
} from "@/lib/models";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PROVIDER_PROBE_MODEL: Record<ProviderId, string> = {
  openai: "openai:gpt-4o-mini",
  anthropic: "anthropic:claude-haiku-4-5",
  google: "google:gemini-2.5-flash",
  xai: "xai:grok-3-mini",
  groq: "groq:llama-3.1-8b-instant",
  openrouter: "openrouter:openrouter/auto",
  fireworks: "fireworks:accounts/fireworks/models/llama-v3p3-70b-instruct",
};

type TestKeyRequest = {
  kind: "provider" | "service";
  provider?: ProviderId;
  service?: ServiceId;
  apiKey: string;
};

export async function POST(req: Request) {
  let body: TestKeyRequest;
  try {
    body = (await req.json()) as TestKeyRequest;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.apiKey?.trim()) {
    return Response.json({ ok: false, error: "Missing key" }, { status: 400 });
  }

  if (body.kind === "service" && body.service === "tavily") {
    return testTavily(body.apiKey);
  }

  if (body.kind === "provider" && body.provider) {
    return testProvider(body.provider, body.apiKey);
  }

  return Response.json({ ok: false, error: "Unknown probe target" }, { status: 400 });
}

async function testProvider(provider: ProviderId, apiKey: string) {
  const probeId = PROVIDER_PROBE_MODEL[provider] ?? DEFAULT_MODEL_ID;
  const keyMap: ApiKeyMap = { [provider]: apiKey } as ApiKeyMap;
  const start = Date.now();
  try {
    const model = getLanguageModel(probeId, keyMap);
    const res = await generateText({
      model,
      prompt: "ping",
      maxOutputTokens: 1,
    });
    return Response.json({
      ok: true,
      provider,
      probedModel: probeId,
      latencyMs: Date.now() - start,
      sample: res.text.slice(0, 40),
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        provider,
        probedModel: probeId,
        error: errorMessage(err),
      },
      { status: 200 } // 200 so client can read the body
    );
  }
}

async function testTavily(apiKey: string) {
  const start = Date.now();
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query: "ping", max_results: 1 }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return Response.json({
        ok: false,
        service: "tavily",
        error: `${res.status}: ${txt.slice(0, 200)}`,
      });
    }
    return Response.json({
      ok: true,
      service: "tavily",
      latencyMs: Date.now() - start,
      provider: SERVICES.tavily.name,
    });
  } catch (err) {
    return Response.json({
      ok: false,
      service: "tavily",
      error: errorMessage(err),
    });
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    const e = err as Error & { responseBody?: string; statusCode?: number };
    const parts: string[] = [];
    if (e.statusCode) parts.push(String(e.statusCode));
    parts.push(e.message);
    if (e.responseBody) parts.push(e.responseBody.slice(0, 200));
    return parts.join(" · ");
  }
  return String(err);
}

const _PROBE_BY_PROVIDER = PROVIDERS;
void _PROBE_BY_PROVIDER;
