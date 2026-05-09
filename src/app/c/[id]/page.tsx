import { asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, type SidebarChat } from "@/components/app-sidebar";
import { ChatView } from "@/components/chat-view";
import { db } from "@/lib/db";
import { chats, messages as messagesTable } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

async function loadChat(id: string) {
  const [chat] = await db.select().from(chats).where(eq(chats.id, id));
  if (!chat) return null;
  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, id))
    .orderBy(asc(messagesTable.createdAt));
  const sidebarRows = await db
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
  return {
    chat,
    messages: rows.map((r) => ({
      id: r.id,
      role: r.role,
      parts: r.parts as unknown,
    })) as UIMessage[],
    sidebar: sidebarRows.map<SidebarChat>((r) => ({
      id: r.id,
      title: r.title,
      model: r.model,
      isShared: Boolean(r.isShared),
      isPinned: Boolean(r.isPinned),
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

export default async function ChatByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadChat(id);
  if (!data) notFound();

  return (
    <SidebarProvider>
      <AppSidebar initialChats={data.sidebar} />
      <SidebarInset>
        <ChatView
          chatId={data.chat.id}
          initialMessages={data.messages}
          initialModel={data.chat.model}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
