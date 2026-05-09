import { asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { chats, messages as messagesTable } from "@/lib/db/schema";
import { chatToMarkdown } from "@/lib/markdown-export";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const [chat] = await db.select().from(chats).where(eq(chats.id, id));
  if (!chat) return Response.json({ error: "Not found" }, { status: 404 });
  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, id))
    .orderBy(asc(messagesTable.createdAt));

  const md = chatToMarkdown({
    title: chat.title,
    model: chat.model,
    createdAt: chat.createdAt,
    messages: rows.map((r) => ({
      role: r.role,
      parts: r.parts as unknown,
      model: r.model,
    })),
  });

  const filename = `${slug(chat.title) || "chat"}.md`;
  return new Response(md, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 60);
}
