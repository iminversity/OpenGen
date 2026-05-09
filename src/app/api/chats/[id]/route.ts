import { asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { chats, messages as messagesTable } from "@/lib/db/schema";

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
  return Response.json({
    chat,
    messages: rows.map((r) => ({
      id: r.id,
      role: r.role,
      parts: r.parts,
    })),
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(chats).where(eq(chats.id, id));
  return Response.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    title?: string;
    isShared?: boolean;
    isPinned?: boolean;
  };
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string" && body.title.trim()) {
    update.title = body.title.trim();
  }
  if (typeof body.isShared === "boolean") update.isShared = body.isShared;
  if (typeof body.isPinned === "boolean") update.isPinned = body.isPinned;
  await db.update(chats).set(update).where(eq(chats.id, id));
  const [chat] = await db.select().from(chats).where(eq(chats.id, id));
  return Response.json({ ok: true, chat });
}
