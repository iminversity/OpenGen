import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: chats.id,
      title: chats.title,
      model: chats.model,
      isShared: chats.isShared,
      isPinned: chats.isPinned,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .orderBy(desc(chats.isPinned), desc(chats.updatedAt))
    .limit(500);
  return Response.json({ chats: rows });
}
