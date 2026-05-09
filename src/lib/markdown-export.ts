type Part = {
  type: string;
  text?: string;
  url?: string;
  filename?: string;
  mediaType?: string;
  input?: unknown;
  output?: unknown;
  state?: string;
};

export function chatToMarkdown(chat: {
  title: string;
  model: string;
  createdAt: Date | string | number;
  messages: { role: string; parts: unknown; model?: string | null }[];
}) {
  const created =
    chat.createdAt instanceof Date
      ? chat.createdAt
      : new Date(chat.createdAt);
  const lines: string[] = [];
  lines.push(`# ${chat.title}`);
  lines.push("");
  lines.push(`> _Exported from xgen — ${created.toISOString()}_`);
  lines.push(`> _Default model: \`${chat.model}\`_`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const m of chat.messages) {
    const role = m.role === "user" ? "🧑 User" : m.role === "assistant" ? "🤖 Assistant" : `⚙️ ${m.role}`;
    const tag = m.role === "assistant" && m.model ? ` _(${m.model})_` : "";
    lines.push(`## ${role}${tag}`);
    lines.push("");

    const parts = (Array.isArray(m.parts) ? m.parts : []) as Part[];
    for (const p of parts) {
      if (p.type === "text" && p.text) {
        lines.push(p.text);
        lines.push("");
      } else if (p.type === "reasoning" && p.text) {
        lines.push("<details><summary>Reasoning</summary>");
        lines.push("");
        lines.push(p.text);
        lines.push("");
        lines.push("</details>");
        lines.push("");
      } else if (p.type === "file" && p.url) {
        if (p.mediaType?.startsWith("image/")) {
          lines.push(`![${p.filename ?? "image"}](${p.url})`);
        } else {
          lines.push(`[${p.filename ?? "attachment"}](${p.url})`);
        }
        lines.push("");
      } else if (p.type === "source-url" && p.url) {
        lines.push(`- 🔗 [${(p as { title?: string }).title ?? p.url}](${p.url})`);
      } else if (p.type.startsWith("tool-")) {
        const toolName = p.type.slice("tool-".length);
        lines.push(`<details><summary>🛠 Tool: <code>${toolName}</code></summary>`);
        lines.push("");
        if (p.input !== undefined) {
          lines.push("Input:");
          lines.push("```json");
          lines.push(JSON.stringify(p.input, null, 2));
          lines.push("```");
        }
        if (p.output !== undefined) {
          lines.push("Output:");
          lines.push("```json");
          lines.push(JSON.stringify(p.output, null, 2));
          lines.push("```");
        }
        lines.push("");
        lines.push("</details>");
        lines.push("");
      }
    }
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
