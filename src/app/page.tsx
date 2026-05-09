import { desc } from "drizzle-orm";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, type SidebarChat } from "@/components/app-sidebar";
import { ChatView } from "@/components/chat-view";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

async function loadChats(): Promise<SidebarChat[]> {
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
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    model: r.model,
    isShared: Boolean(r.isShared),
    isPinned: Boolean(r.isPinned),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export default async function HomePage() {
  const chatList = await loadChats();
  return (
    <SidebarProvider>
      <AppSidebar initialChats={chatList} />
      <SidebarInset>
        <ChatView />
      </SidebarInset>
    </SidebarProvider>
  );
}
