import type { UIMessage } from "ai";

export type Artifact = {
  id: string;
  messageId: string;
  index: number;
  language: string;
  filename?: string;
  code: string;
  preview: string;
};

const FENCE_RE = /```([a-zA-Z0-9_+-]*)(?:\s+([^\n]+))?\n([\s\S]*?)```/g;

const MIN_LINES = 6;

export function extractArtifacts(messages: UIMessage[]): Artifact[] {
  const out: Artifact[] = [];
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    let idx = 0;
    for (const part of m.parts) {
      if (part.type !== "text" || !("text" in part)) continue;
      const text = part.text;
      FENCE_RE.lastIndex = 0;
      let match: RegExpExecArray | null = FENCE_RE.exec(text);
      while (match !== null) {
        const language = (match[1] || "text").toLowerCase();
        const meta = (match[2] || "").trim();
        const code = match[3] ?? "";
        const lines = code.split("\n").length;
        const looksLikeFile = /\.[a-zA-Z0-9]{1,8}$/.test(meta);
        if (lines >= MIN_LINES || looksLikeFile) {
          out.push({
            id: `${m.id}-${idx}`,
            messageId: m.id,
            index: idx,
            language,
            filename: looksLikeFile ? meta : undefined,
            code: code.replace(/\n$/, ""),
            preview: code.split("\n").slice(0, 3).join("\n"),
          });
          idx++;
        }
        match = FENCE_RE.exec(text);
      }
    }
  }
  return out;
}

export function inferFilename(a: Artifact): string {
  if (a.filename) return a.filename;
  const ext = LANG_EXT[a.language] ?? "txt";
  return `artifact-${a.index + 1}.${ext}`;
}

const LANG_EXT: Record<string, string> = {
  ts: "ts",
  tsx: "tsx",
  typescript: "ts",
  js: "js",
  jsx: "jsx",
  javascript: "js",
  py: "py",
  python: "py",
  rs: "rs",
  rust: "rs",
  go: "go",
  java: "java",
  kt: "kt",
  rb: "rb",
  swift: "swift",
  cpp: "cpp",
  c: "c",
  cs: "cs",
  sh: "sh",
  bash: "sh",
  zsh: "sh",
  html: "html",
  css: "css",
  scss: "scss",
  json: "json",
  yaml: "yaml",
  yml: "yml",
  toml: "toml",
  sql: "sql",
  md: "md",
  markdown: "md",
  text: "txt",
};
