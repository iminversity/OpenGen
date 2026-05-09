import { desc } from "drizzle-orm";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, type SidebarChat } from "@/components/app-sidebar";
import { SettingsPage } from "./client";
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

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [chatList, sp] = await Promise.all([loadChats(), searchParams]);
  const initialTab =
    sp.tab === "search" || sp.tab === "generation" ? sp.tab : "models";

  return (
    <SidebarProvider>
      <AppSidebar initialChats={chatList} />
      <SidebarInset>
        <SettingsPage initialTab={initialTab} />
      </SidebarInset>
    </SidebarProvider>
  );
}
