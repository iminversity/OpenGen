import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import QRCode from "qrcode";
import type { ApiKeyMap } from "./providers";

/* -------------------------------------------------------------------------- */
/*  Catalog                                                                   */
/* -------------------------------------------------------------------------- */

export type ToolCategory =
  | "core"
  | "reference"
  | "dev"
  | "generative"
  | "productivity"
  | "search";

export type ToolMeta = {
  name: string;
  category: ToolCategory;
  label: string;
  description: string;
  defaultEnabled: boolean;
  /** Tool requires this provider key to be configured to be available. */
  needsKey?: "openai" | "tavily";
  /** Tool is gated behind the `webSearch` request flag (Search button). */
  needsSearchToggle?: boolean;
};

export const TOOL_CATALOG: ToolMeta[] = [
  // Core (always on)
  {
    name: "get_current_time",
    category: "core",
    label: "Current time",
    description: "Look up the current date/time, optionally in a timezone.",
    defaultEnabled: true,
  },
  {
    name: "wikipedia_search",
    category: "core",
    label: "Wikipedia",
    description: "Search Wikipedia and read a top-result summary.",
    defaultEnabled: true,
  },

  // Search (gated by Search toggle + Tavily key)
  {
    name: "web_search",
    category: "search",
    label: "Web search",
    description: "Live web search via Tavily.",
    defaultEnabled: true,
    needsKey: "tavily",
    needsSearchToggle: true,
  },
  {
    name: "fetch_url",
    category: "search",
    label: "Fetch URL",
    description: "Fetch the readable content of a specific URL via Tavily.",
    defaultEnabled: true,
    needsKey: "tavily",
    needsSearchToggle: true,
  },

  // Reference
  {
    name: "calculator",
    category: "reference",
    label: "Calculator",
    description: "Safely evaluate math expressions (sin, sqrt, log, …).",
    defaultEnabled: true,
  },
  {
    name: "weather",
    category: "reference",
    label: "Weather",
    description: "Current weather and forecast via open-meteo.com.",
    defaultEnabled: true,
  },
  {
    name: "currency_convert",
    category: "reference",
    label: "Currency",
    description: "Convert between fiat currencies (ECB rates).",
    defaultEnabled: true,
  },
  {
    name: "dictionary",
    category: "reference",
    label: "Dictionary",
    description: "Look up English word definitions and parts of speech.",
    defaultEnabled: true,
  },
  {
    name: "arxiv_search",
    category: "reference",
    label: "arXiv",
    description: "Search arXiv for research papers.",
    defaultEnabled: true,
  },

  // Dev
  {
    name: "github_search",
    category: "dev",
    label: "GitHub",
    description: "Search public GitHub repositories.",
    defaultEnabled: true,
  },
  {
    name: "npm_info",
    category: "dev",
    label: "npm package",
    description: "Get version, deps, and weekly downloads for an npm package.",
    defaultEnabled: true,
  },
  {
    name: "hacker_news_search",
    category: "dev",
    label: "Hacker News",
    description: "Search Hacker News stories and comments.",
    defaultEnabled: true,
  },
  {
    name: "regex_test",
    category: "dev",
    label: "Regex",
    description: "Test a regular expression against a sample string.",
    defaultEnabled: true,
  },
  {
    name: "base64_codec",
    category: "dev",
    label: "Base64",
    description: "Base64 encode or decode a string.",
    defaultEnabled: true,
  },
  {
    name: "hash",
    category: "dev",
    label: "Hash",
    description: "Compute md5/sha1/sha256/sha512 hash of a string.",
    defaultEnabled: true,
  },
  {
    name: "uuid_generate",
    category: "dev",
    label: "UUID",
    description: "Generate a v4 UUID (or several).",
    defaultEnabled: true,
  },

  // Generative
  {
    name: "generate_image",
    category: "generative",
    label: "Generate image",
    description:
      "Create an image with DALL·E 3 from a text prompt (uses your OpenAI key).",
    defaultEnabled: true,
    needsKey: "openai",
  },
  {
    name: "qr_code",
    category: "generative",
    label: "QR code",
    description: "Generate a QR code for text or a URL.",
    defaultEnabled: true,
  },

  // Productivity
  {
    name: "timezone_convert",
    category: "productivity",
    label: "Timezone convert",
    description:
      "Convert a date/time between two IANA timezones (e.g. America/New_York → Asia/Tokyo).",
    defaultEnabled: true,
  },
  {
    name: "color_convert",
    category: "productivity",
    label: "Color convert",
    description: "Convert a color across hex / rgb / hsl / oklch formats.",
    defaultEnabled: true,
  },
  {
    name: "password_generate",
    category: "productivity",
    label: "Password",
    description: "Generate a strong random password.",
    defaultEnabled: true,
  },
];

export const ALL_TOOL_NAMES = TOOL_CATALOG.map((t) => t.name);

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

export function getTavilyKey(
  clientKey: string | undefined
): string | undefined {
  return clientKey || process.env.TAVILY_API_KEY;
}

export function getOpenAIKey(
  clientKeys: ApiKeyMap | undefined
): string | undefined {
  return clientKeys?.openai || process.env.OPENAI_API_KEY;
}

/* -------------------------------------------------------------------------- */
/*  Core                                                                      */
/* -------------------------------------------------------------------------- */

const buildCurrentTimeTool = () =>
  tool({
    description:
      "Get the current date and time. Optionally for a specific IANA timezone (e.g. 'America/Los_Angeles'). Use whenever the user asks about now/today.",
    inputSchema: z.object({
      timezone: z
        .string()
        .optional()
        .describe("IANA timezone identifier. Omit for UTC."),
    }),
    execute: async ({ timezone }) => {
      const now = new Date();
      let local: string | null = null;
      let tzUsed: string | null = null;
      if (timezone) {
        try {
          local = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            dateStyle: "full",
            timeStyle: "long",
          }).format(now);
          tzUsed = timezone;
        } catch {
          /* ignore */
        }
      }
      return {
        utc: now.toUTCString(),
        iso: now.toISOString(),
        epoch: Math.floor(now.getTime() / 1000),
        timezone: tzUsed,
        local,
        weekday: new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          timeZone: timezone || "UTC",
        }).format(now),
      };
    },
  });

const buildWikipediaTool = () =>
  tool({
    description:
      "Search Wikipedia for an overview of a topic. Returns top results with extracts.",
    inputSchema: z.object({
      query: z.string().describe("Topic or article title to search."),
      lang: z
        .string()
        .default("en")
        .describe("Wikipedia language code (e.g. 'en', 'es')."),
    }),
    execute: async ({ query, lang }) => {
      const langCode = (lang ?? "en").toLowerCase();
      const sUrl =
        `https://${encodeURIComponent(langCode)}.wikipedia.org/w/api.php` +
        `?action=query&list=search&format=json&utf8=1&origin=*&srlimit=5` +
        `&srsearch=${encodeURIComponent(query)}`;
      const sRes = await fetch(sUrl, { headers: { "user-agent": "xgen/0.1" } });
      if (!sRes.ok) throw new Error(`Wikipedia search ${sRes.status}`);
      const sData = (await sRes.json()) as {
        query?: { search?: { title: string; snippet: string }[] };
      };
      const hits = sData.query?.search?.slice(0, 5) ?? [];
      let summary: string | null = null;
      let topUrl: string | null = null;
      const top = hits[0];
      if (top) {
        const sumRes = await fetch(
          `https://${encodeURIComponent(langCode)}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(top.title)}`,
          { headers: { "user-agent": "xgen/0.1" } }
        );
        if (sumRes.ok) {
          const sumData = (await sumRes.json()) as {
            extract?: string;
            content_urls?: { desktop?: { page?: string } };
          };
          summary = sumData.extract ?? null;
          topUrl = sumData.content_urls?.desktop?.page ?? null;
        }
      }
      return {
        query,
        lang: langCode,
        topResult: top
          ? {
              title: top.title,
              url:
                topUrl ??
                `https://${langCode}.wikipedia.org/wiki/${encodeURIComponent(top.title.replaceAll(" ", "_"))}`,
              summary,
            }
          : null,
        results: hits.map((h) => ({
          title: h.title,
          snippet: h.snippet.replaceAll(/<[^>]+>/g, ""),
          url: `https://${langCode}.wikipedia.org/wiki/${encodeURIComponent(h.title.replaceAll(" ", "_"))}`,
        })),
      };
    },
  });

/* -------------------------------------------------------------------------- */
/*  Search (Tavily)                                                           */
/* -------------------------------------------------------------------------- */

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
  published_date?: string | null;
};

const buildSearchTool = (apiKey: string) =>
  tool({
    description:
      "Search the live web for up-to-date information. Use for recent events or time-sensitive facts.",
    inputSchema: z.object({
      query: z.string().describe("Concise keyword query."),
      depth: z.enum(["basic", "advanced"]).default("basic"),
    }),
    execute: async ({ query, depth }) => {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          search_depth: depth,
          max_results: 6,
          include_answer: true,
        }),
      });
      if (!res.ok)
        throw new Error(`Tavily search ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as {
        query: string;
        answer?: string | null;
        results: TavilyResult[];
      };
      return {
        query: data.query,
        answer: data.answer ?? null,
        results: data.results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
          published: r.published_date ?? null,
        })),
      };
    },
  });

const buildFetchUrlTool = (apiKey: string) =>
  tool({
    description:
      "Fetch the readable text content of a specific URL. Use after web_search when you need full article text.",
    inputSchema: z.object({
      url: z.string().describe("Full URL to fetch."),
    }),
    execute: async ({ url }) => {
      const res = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ urls: [url], extract_depth: "basic" }),
      });
      if (!res.ok)
        throw new Error(`Tavily extract ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as {
        results: { url: string; raw_content?: string; content?: string }[];
      };
      const item = data.results?.[0];
      if (!item) return { url, error: "Nothing returned" } as const;
      const content = (item.raw_content ?? item.content ?? "").slice(0, 12000);
      return { url: item.url, content, truncated: content.length >= 12000 };
    },
  });

/* -------------------------------------------------------------------------- */
/*  Reference                                                                 */
/* -------------------------------------------------------------------------- */

const MATH_FNS = [
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "atan2",
  "sinh",
  "cosh",
  "tanh",
  "sqrt",
  "cbrt",
  "log",
  "log2",
  "log10",
  "exp",
  "abs",
  "floor",
  "ceil",
  "round",
  "trunc",
  "sign",
  "min",
  "max",
  "pow",
  "hypot",
  "PI",
  "E",
  "LN2",
  "LN10",
];

const buildCalculatorTool = () =>
  tool({
    description:
      "Evaluate a math expression. Supports + - * / % ** (), parentheses, and standard math functions: sin, cos, tan, sqrt, log, ln, exp, abs, floor, ceil, round, min, max, pow, plus PI and E. Use this any time the user asks for a numeric calculation — never invent numbers.",
    inputSchema: z.object({
      expression: z
        .string()
        .describe(
          "The expression to evaluate, e.g. 'sqrt(2) * 8.5 + sin(PI/4)' or '(1.07 ** 30) * 5000'."
        ),
    }),
    execute: async ({ expression }) => {
      let safe = expression;
      // Allow only digits, operators, parens, whitespace, dots, commas, letters
      if (!/^[\d+\-*/%^().,\s\w]+$/.test(safe)) {
        throw new Error("Expression contains disallowed characters.");
      }
      // Replace allowed identifiers with Math.x
      for (const fn of MATH_FNS) {
        safe = safe.replaceAll(new RegExp(`\\b${fn}\\b`, "g"), `Math.${fn}`);
      }
      // After substitution, only Math. prefixes are allowed, otherwise reject identifiers
      if (/\b[a-zA-Z_]\w*\b/.test(safe.replaceAll(/Math\.\w+/g, ""))) {
        throw new Error("Unknown identifier in expression.");
      }
      let result: unknown;
      try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
        result = new Function(`"use strict"; return (${safe})`)();
      } catch (e) {
        throw new Error(`Evaluation failed: ${(e as Error).message}`);
      }
      if (typeof result !== "number" || !Number.isFinite(result))
        throw new Error("Result is not a finite number.");
      return { expression, result };
    },
  });

const buildWeatherTool = () =>
  tool({
    description:
      "Look up current weather and a 3-day forecast for any place name. Returns temperature in both Celsius and Fahrenheit.",
    inputSchema: z.object({
      place: z
        .string()
        .describe("City or place name, e.g. 'Tokyo', 'Brooklyn, NY'."),
    }),
    execute: async ({ place }) => {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?count=1&format=json&name=${encodeURIComponent(place)}`
      );
      if (!geoRes.ok) throw new Error(`Geocoding ${geoRes.status}`);
      const geo = (await geoRes.json()) as {
        results?: {
          name: string;
          latitude: number;
          longitude: number;
          country: string;
          admin1?: string;
          timezone?: string;
        }[];
      };
      const loc = geo.results?.[0];
      if (!loc) return { place, error: "Place not found" } as const;
      const fcRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3&timezone=auto`
      );
      if (!fcRes.ok) throw new Error(`Forecast ${fcRes.status}`);
      const fc = (await fcRes.json()) as {
        current: Record<string, number>;
        daily: Record<string, number[]>;
      };
      const cToF = (c: number) => +(c * 9) / 5 + 32;
      const code = WMO_CODES[fc.current.weather_code as number] ?? "unknown";
      return {
        place: `${loc.name}${loc.admin1 ? ", " + loc.admin1 : ""}, ${loc.country}`,
        latitude: loc.latitude,
        longitude: loc.longitude,
        timezone: loc.timezone,
        current: {
          temperature_c: fc.current.temperature_2m,
          temperature_f: +cToF(fc.current.temperature_2m).toFixed(1),
          feels_like_c: fc.current.apparent_temperature,
          feels_like_f: +cToF(fc.current.apparent_temperature).toFixed(1),
          humidity_percent: fc.current.relative_humidity_2m,
          wind_kmh: fc.current.wind_speed_10m,
          condition: code,
          is_day: !!fc.current.is_day,
        },
        forecast: fc.daily.time.map((t, i) => ({
          date: (fc.daily.time as unknown as string[])[i],
          high_c: fc.daily.temperature_2m_max[i],
          high_f: +cToF(fc.daily.temperature_2m_max[i]).toFixed(1),
          low_c: fc.daily.temperature_2m_min[i],
          low_f: +cToF(fc.daily.temperature_2m_min[i]).toFixed(1),
          precipitation_probability:
            fc.daily.precipitation_probability_max[i],
          condition: WMO_CODES[fc.daily.weather_code[i]] ?? "unknown",
        })),
      };
    },
  });

// World Meteorological Organization weather codes
const WMO_CODES: Record<number, string> = {
  0: "clear",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "rime fog",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  66: "freezing rain",
  67: "heavy freezing rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "rain showers",
  81: "heavy rain showers",
  82: "violent rain showers",
  85: "snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm w/ hail",
  99: "severe thunderstorm",
};

const buildCurrencyTool = () =>
  tool({
    description:
      "Convert an amount between fiat currencies using ECB reference rates.",
    inputSchema: z.object({
      amount: z.number().describe("Amount in the source currency."),
      from: z.string().describe("ISO 4217 source currency code, e.g. 'USD'."),
      to: z.string().describe("ISO 4217 target currency code, e.g. 'EUR'."),
    }),
    execute: async ({ amount, from, to }) => {
      const url = `https://api.frankfurter.app/latest?amount=${amount}&from=${encodeURIComponent(from.toUpperCase())}&to=${encodeURIComponent(to.toUpperCase())}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
      const data = (await res.json()) as {
        amount: number;
        base: string;
        date: string;
        rates: Record<string, number>;
      };
      const converted = data.rates[to.toUpperCase()];
      if (typeof converted !== "number")
        throw new Error("Currency pair not supported");
      const rate = converted / data.amount;
      return {
        amount: data.amount,
        from: data.base,
        to: to.toUpperCase(),
        converted,
        rate,
        as_of: data.date,
      };
    },
  });

const buildDictionaryTool = () =>
  tool({
    description:
      "Look up a word's definitions, parts of speech, and example sentences (English).",
    inputSchema: z.object({
      word: z.string().describe("Word or phrase to define."),
    }),
    execute: async ({ word }) => {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      );
      if (!res.ok) {
        if (res.status === 404)
          return { word, error: "Word not found" } as const;
        throw new Error(`Dictionary ${res.status}`);
      }
      const data = (await res.json()) as Array<{
        word: string;
        phonetic?: string;
        meanings: {
          partOfSpeech: string;
          definitions: { definition: string; example?: string }[];
          synonyms?: string[];
        }[];
      }>;
      const first = data[0];
      if (!first) return { word, error: "No data" } as const;
      return {
        word: first.word,
        phonetic: first.phonetic,
        meanings: first.meanings.map((m) => ({
          partOfSpeech: m.partOfSpeech,
          definitions: m.definitions.slice(0, 4).map((d) => ({
            definition: d.definition,
            example: d.example ?? null,
          })),
          synonyms: (m.synonyms ?? []).slice(0, 8),
        })),
      };
    },
  });

const buildArxivTool = () =>
  tool({
    description: "Search arXiv.org for research papers.",
    inputSchema: z.object({
      query: z.string().describe("Search query (keywords, author, etc.)."),
      max: z.number().min(1).max(10).default(5),
    }),
    execute: async ({ query, max }) => {
      const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${max}`;
      const res = await fetch(url, {
        headers: { "user-agent": "xgen/0.1" },
      });
      if (!res.ok) throw new Error(`arXiv ${res.status}`);
      const xml = await res.text();
      const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(
        (m) => m[1]
      );
      const pick = (s: string, tag: string) => {
        const m = s.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
        return m?.[1].trim().replaceAll(/\s+/g, " ") ?? null;
      };
      return {
        query,
        results: entries.map((e) => ({
          title: pick(e, "title"),
          summary: pick(e, "summary"),
          published: pick(e, "published"),
          authors: [...e.matchAll(/<author>[\s\S]*?<name>(.*?)<\/name>/g)].map(
            (m) => m[1]
          ),
          url: pick(e, "id"),
        })),
      };
    },
  });

/* -------------------------------------------------------------------------- */
/*  Dev                                                                       */
/* -------------------------------------------------------------------------- */

const buildGithubSearchTool = () =>
  tool({
    description:
      "Search public GitHub repositories. Returns top results sorted by stars.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "Search query. Supports GitHub qualifiers like 'language:rust stars:>100'."
        ),
      max: z.number().min(1).max(10).default(8),
    }),
    execute: async ({ query, max }) => {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${max}`;
      const res = await fetch(url, {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "xgen/0.1",
          ...(process.env.GITHUB_TOKEN
            ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
      });
      if (!res.ok) throw new Error(`GitHub ${res.status}`);
      const data = (await res.json()) as {
        items: {
          full_name: string;
          description: string | null;
          stargazers_count: number;
          html_url: string;
          language: string | null;
          updated_at: string;
        }[];
      };
      return {
        query,
        results: data.items.map((r) => ({
          name: r.full_name,
          description: r.description,
          stars: r.stargazers_count,
          language: r.language,
          updated: r.updated_at,
          url: r.html_url,
        })),
      };
    },
  });

const buildNpmInfoTool = () =>
  tool({
    description: "Get version, license, deps, and weekly downloads for an npm package.",
    inputSchema: z.object({
      packageName: z.string().describe("npm package name."),
    }),
    execute: async ({ packageName }) => {
      const [pkgRes, dlRes] = await Promise.all([
        fetch(
          `https://registry.npmjs.org/${encodeURIComponent(packageName)}`
        ),
        fetch(
          `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`
        ),
      ]);
      if (pkgRes.status === 404)
        return { packageName, error: "Package not found" } as const;
      if (!pkgRes.ok) throw new Error(`npm ${pkgRes.status}`);
      const pkg = (await pkgRes.json()) as {
        name: string;
        description?: string;
        license?: string;
        homepage?: string;
        repository?: { url?: string };
        "dist-tags": { latest: string };
        versions: Record<string, { dependencies?: Record<string, string> }>;
        time?: Record<string, string>;
      };
      const latest = pkg["dist-tags"].latest;
      const dl = dlRes.ok
        ? ((await dlRes.json()) as { downloads?: number })
        : null;
      return {
        name: pkg.name,
        description: pkg.description ?? null,
        latestVersion: latest,
        license: pkg.license ?? null,
        homepage: pkg.homepage ?? null,
        repository: pkg.repository?.url ?? null,
        weeklyDownloads: dl?.downloads ?? null,
        publishedAt: pkg.time?.[latest] ?? null,
        dependencies: pkg.versions[latest]?.dependencies ?? {},
        url: `https://www.npmjs.com/package/${encodeURIComponent(pkg.name)}`,
      };
    },
  });

const buildHackerNewsTool = () =>
  tool({
    description: "Search Hacker News stories and comments via Algolia.",
    inputSchema: z.object({
      query: z.string().describe("Search query."),
      tags: z
        .enum(["story", "comment", "ask_hn", "show_hn", "front_page"])
        .default("story"),
      max: z.number().min(1).max(15).default(8),
    }),
    execute: async ({ query, tags, max }) => {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=${tags}&hitsPerPage=${max}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HN ${res.status}`);
      const data = (await res.json()) as {
        hits: {
          objectID: string;
          title?: string;
          story_title?: string;
          url?: string;
          author: string;
          points?: number;
          num_comments?: number;
          created_at: string;
        }[];
      };
      return {
        query,
        results: data.hits.map((h) => ({
          title: h.title ?? h.story_title ?? "(comment)",
          url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
          author: h.author,
          points: h.points ?? null,
          comments: h.num_comments ?? null,
          posted: h.created_at,
        })),
      };
    },
  });

const buildRegexTool = () =>
  tool({
    description:
      "Test a JavaScript regular expression against a string and return all matches with capture groups and positions.",
    inputSchema: z.object({
      pattern: z.string().describe("Pattern body, without leading/trailing /."),
      flags: z
        .string()
        .default("g")
        .describe("Regex flags, e.g. 'gi' or 'gm'."),
      input: z.string().describe("String to test against."),
    }),
    execute: async ({ pattern, flags, input }) => {
      let re: RegExp;
      try {
        re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
      } catch (e) {
        return { pattern, flags, error: (e as Error).message } as const;
      }
      const matches: {
        match: string;
        index: number;
        groups: Record<string, string>;
        captures: string[];
      }[] = [];
      for (const m of input.matchAll(re)) {
        matches.push({
          match: m[0],
          index: m.index ?? 0,
          captures: m.slice(1),
          groups: m.groups ?? {},
        });
        if (matches.length >= 50) break;
      }
      return {
        pattern,
        flags,
        matchCount: matches.length,
        matches,
      };
    },
  });

const buildBase64Tool = () =>
  tool({
    description: "Encode or decode a string to/from base64.",
    inputSchema: z.object({
      mode: z.enum(["encode", "decode"]),
      input: z.string(),
    }),
    execute: async ({ mode, input }) => {
      try {
        if (mode === "encode") {
          return {
            mode,
            output: Buffer.from(input, "utf8").toString("base64"),
          };
        }
        return {
          mode,
          output: Buffer.from(input, "base64").toString("utf8"),
        };
      } catch (e) {
        throw new Error(`Base64 ${mode} failed: ${(e as Error).message}`);
      }
    },
  });

const buildHashTool = () =>
  tool({
    description: "Compute a cryptographic hash of a string.",
    inputSchema: z.object({
      algorithm: z.enum(["md5", "sha1", "sha256", "sha512"]).default("sha256"),
      input: z.string(),
    }),
    execute: async ({ algorithm, input }) => ({
      algorithm,
      hash: createHash(algorithm).update(input, "utf8").digest("hex"),
    }),
  });

const buildUuidTool = () =>
  tool({
    description: "Generate one or more random UUIDs (v4).",
    inputSchema: z.object({
      count: z.number().min(1).max(10).default(1),
    }),
    execute: async ({ count }) => ({
      count,
      uuids: Array.from({ length: count }, () => randomUUID()),
    }),
  });

/* -------------------------------------------------------------------------- */
/*  Generative                                                                */
/* -------------------------------------------------------------------------- */

const buildImageTool = (apiKey: string) =>
  tool({
    description:
      "Generate an image with DALL·E 3 from a text prompt. Returns a URL to the generated image. Use when the user asks you to create, draw, or visualize something.",
    inputSchema: z.object({
      prompt: z.string().describe("Detailed image description."),
      size: z
        .enum(["1024x1024", "1792x1024", "1024x1792"])
        .default("1024x1024"),
      style: z.enum(["vivid", "natural"]).default("vivid"),
      quality: z.enum(["standard", "hd"]).default("standard"),
    }),
    execute: async ({ prompt, size, style, quality }) => {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          size,
          style,
          quality,
          n: 1,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`DALL·E ${res.status}: ${txt.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        data: { url: string; revised_prompt?: string }[];
      };
      const item = data.data?.[0];
      if (!item?.url) throw new Error("No image returned");
      return {
        prompt,
        revised_prompt: item.revised_prompt ?? prompt,
        url: item.url,
        size,
      };
    },
  });

const buildQrCodeTool = () =>
  tool({
    description:
      "Generate a QR code for any text or URL. Returns a data-URL PNG that the user can scan or save.",
    inputSchema: z.object({
      text: z.string().describe("Text or URL to encode."),
      size: z.number().min(128).max(1024).default(384),
    }),
    execute: async ({ text, size }) => {
      const dataUrl = await QRCode.toDataURL(text, {
        width: size,
        margin: 1,
      });
      return { text, size, dataUrl };
    },
  });

/* -------------------------------------------------------------------------- */
/*  Productivity                                                              */
/* -------------------------------------------------------------------------- */

const buildTimezoneConvertTool = () =>
  tool({
    description:
      "Convert a date/time between two IANA timezones. Pass either an ISO timestamp or a natural date+time string with the source zone.",
    inputSchema: z.object({
      input: z
        .string()
        .describe(
          "ISO timestamp or 'YYYY-MM-DD HH:mm' string interpreted in the `from` zone."
        ),
      from: z.string().describe("Source IANA timezone."),
      to: z.string().describe("Target IANA timezone."),
    }),
    execute: async ({ input, from, to }) => {
      // If input is ISO with offset, parse directly. Otherwise treat as local in `from` zone.
      let date = new Date(input);
      if (Number.isNaN(date.getTime())) {
        // Best-effort parse "YYYY-MM-DD HH:mm"
        const m = input.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
        if (!m) throw new Error("Could not parse input");
        const [, y, mo, d, h, mi] = m;
        // Compute the UTC equivalent of the local time in `from`
        const utcGuess = Date.UTC(+y, +mo - 1, +d, +h, +mi);
        // Use Intl to find the `from` zone offset at that moment
        const fmt = new Intl.DateTimeFormat("en-US", {
          timeZone: from,
          hour12: false,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const parts = Object.fromEntries(
          fmt
            .formatToParts(new Date(utcGuess))
            .filter((p) => p.type !== "literal")
            .map((p) => [p.type, p.value])
        );
        const localAsUtc = Date.UTC(
          +parts.year,
          +parts.month - 1,
          +parts.day,
          +parts.hour,
          +parts.minute,
          +parts.second
        );
        const offset = utcGuess - localAsUtc;
        date = new Date(utcGuess + offset);
      }
      const fromStr = new Intl.DateTimeFormat("en-US", {
        timeZone: from,
        dateStyle: "full",
        timeStyle: "long",
      }).format(date);
      const toStr = new Intl.DateTimeFormat("en-US", {
        timeZone: to,
        dateStyle: "full",
        timeStyle: "long",
      }).format(date);
      return {
        input,
        from: { timezone: from, formatted: fromStr },
        to: { timezone: to, formatted: toStr },
        utc: date.toISOString(),
      };
    },
  });

const buildColorTool = () =>
  tool({
    description:
      "Convert a color across formats (hex, rgb, hsl). Input accepts '#abc', '#aabbcc', 'rgb(r,g,b)', 'hsl(h,s%,l%)'.",
    inputSchema: z.object({
      color: z.string().describe("Color in any of the supported formats."),
    }),
    execute: async ({ color }) => {
      const c = color.trim();
      let r = 0,
        g = 0,
        b = 0;
      const hex3 = c.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
      const hex6 = c.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
      const rgb = c.match(
        /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i
      );
      const hsl = c.match(
        /^hsla?\(\s*(\d{1,3})(?:deg)?\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%/i
      );
      if (hex3) {
        r = parseInt(hex3[1] + hex3[1], 16);
        g = parseInt(hex3[2] + hex3[2], 16);
        b = parseInt(hex3[3] + hex3[3], 16);
      } else if (hex6) {
        r = parseInt(hex6[1], 16);
        g = parseInt(hex6[2], 16);
        b = parseInt(hex6[3], 16);
      } else if (rgb) {
        r = +rgb[1];
        g = +rgb[2];
        b = +rgb[3];
      } else if (hsl) {
        const [hh, ss, ll] = [+hsl[1] / 360, +hsl[2] / 100, +hsl[3] / 100];
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
        const p = 2 * ll - q;
        r = Math.round(hue2rgb(p, q, hh + 1 / 3) * 255);
        g = Math.round(hue2rgb(p, q, hh) * 255);
        b = Math.round(hue2rgb(p, q, hh - 1 / 3) * 255);
      } else {
        throw new Error("Unrecognized color format");
      }
      // hex
      const hex =
        "#" +
        [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
      // hsl
      const rN = r / 255,
        gN = g / 255,
        bN = b / 255;
      const max = Math.max(rN, gN, bN),
        min = Math.min(rN, gN, bN);
      let h = 0,
        s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rN:
            h = (gN - bN) / d + (gN < bN ? 6 : 0);
            break;
          case gN:
            h = (bN - rN) / d + 2;
            break;
          case bN:
            h = (rN - gN) / d + 4;
            break;
        }
        h *= 60;
      }
      return {
        input: color,
        hex,
        rgb: `rgb(${r}, ${g}, ${b})`,
        hsl: `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
        components: { r, g, b, h: Math.round(h), s: +(s * 100).toFixed(1), l: +(l * 100).toFixed(1) },
      };
    },
  });

const buildPasswordTool = () =>
  tool({
    description: "Generate a strong random password.",
    inputSchema: z.object({
      length: z.number().min(8).max(128).default(20),
      includeSymbols: z.boolean().default(true),
      includeNumbers: z.boolean().default(true),
      includeUppercase: z.boolean().default(true),
      includeLowercase: z.boolean().default(true),
    }),
    execute: async ({
      length,
      includeSymbols,
      includeNumbers,
      includeUppercase,
      includeLowercase,
    }) => {
      let alphabet = "";
      if (includeLowercase) alphabet += "abcdefghijklmnopqrstuvwxyz";
      if (includeUppercase) alphabet += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      if (includeNumbers) alphabet += "0123456789";
      if (includeSymbols) alphabet += "!@#$%^&*()-_=+[]{};:,.<>?";
      if (!alphabet) throw new Error("At least one character class required.");
      const bytes = randomBytes(length);
      let pw = "";
      for (let i = 0; i < length; i++)
        pw += alphabet[bytes[i] % alphabet.length];
      return { length, password: pw };
    },
  });

/* -------------------------------------------------------------------------- */
/*  Tool set assembly                                                         */
/* -------------------------------------------------------------------------- */

export function buildToolSet(opts: {
  webSearch: boolean;
  tavilyKey?: string;
  openaiKey?: string;
  disabled?: string[];
}): ToolSet {
  const disabled = new Set(opts.disabled ?? []);
  const out: ToolSet = {};

  const add = (name: string, factory: () => ToolSet[string]) => {
    if (disabled.has(name)) return;
    const meta = TOOL_CATALOG.find((t) => t.name === name);
    if (!meta) return;
    if (meta.needsKey === "tavily" && !opts.tavilyKey) return;
    if (meta.needsKey === "openai" && !opts.openaiKey) return;
    if (meta.needsSearchToggle && !opts.webSearch) return;
    out[name] = factory();
  };

  // Core
  add("get_current_time", buildCurrentTimeTool);
  add("wikipedia_search", buildWikipediaTool);
  // Search (gated)
  if (opts.tavilyKey) {
    add("web_search", () => buildSearchTool(opts.tavilyKey!));
    add("fetch_url", () => buildFetchUrlTool(opts.tavilyKey!));
  }
  // Reference
  add("calculator", buildCalculatorTool);
  add("weather", buildWeatherTool);
  add("currency_convert", buildCurrencyTool);
  add("dictionary", buildDictionaryTool);
  add("arxiv_search", buildArxivTool);
  // Dev
  add("github_search", buildGithubSearchTool);
  add("npm_info", buildNpmInfoTool);
  add("hacker_news_search", buildHackerNewsTool);
  add("regex_test", buildRegexTool);
  add("base64_codec", buildBase64Tool);
  add("hash", buildHashTool);
  add("uuid_generate", buildUuidTool);
  // Generative
  if (opts.openaiKey) add("generate_image", () => buildImageTool(opts.openaiKey!));
  add("qr_code", buildQrCodeTool);
  // Productivity
  add("timezone_convert", buildTimezoneConvertTool);
  add("color_convert", buildColorTool);
  add("password_generate", buildPasswordTool);

  return out;
}
