"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  KeyIcon,
  Link2Icon,
  Link2OffIcon,
  MoonIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export type SidebarChat = {
  id: string;
  title: string;
  model: string;
  isShared: boolean;
  isPinned: boolean;
  updatedAt: string;
};

export function AppSidebar({ initialChats }: { initialChats: SidebarChat[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [chats, setChats] = useState<SidebarChat[]>(initialChats);
  const [query, setQuery] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setChats(initialChats), [initialChats]);

  const refresh = async () => {
    const res = await fetch("/api/chats", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { chats: SidebarChat[] };
    setChats(data.chats);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("xgen:chats-changed", handler);
    return () => window.removeEventListener("xgen:chats-changed", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (renameId) renameRef.current?.focus();
  }, [renameId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => c.title.toLowerCase().includes(q));
  }, [chats, query]);

  const pinned = filtered.filter((c) => c.isPinned);
  const recent = filtered.filter((c) => !c.isPinned);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/chats/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed to delete chat");
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (pathname?.endsWith(`/${id}`)) router.push("/");
    toast.success("Chat deleted");
  };

  const handlePatch = async (
    id: string,
    body: Partial<Pick<SidebarChat, "title" | "isPinned" | "isShared">>
  ) => {
    const res = await fetch(`/api/chats/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("Update failed");
      return null;
    }
    const data = (await res.json()) as { chat: SidebarChat };
    setChats((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...body,
              isShared: data.chat?.isShared ?? c.isShared,
              isPinned: data.chat?.isPinned ?? c.isPinned,
              title: data.chat?.title ?? c.title,
            }
          : c
      )
    );
    return data;
  };

  const handleShare = async (chat: SidebarChat) => {
    const next = !chat.isShared;
    await handlePatch(chat.id, { isShared: next });
    if (next) {
      const url = `${window.location.origin}/share/${chat.id}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied", { description: url });
      } catch {
        toast.success("Sharing enabled", { description: url });
      }
    } else {
      toast.success("Sharing disabled");
    }
  };

  const handleExport = (chat: SidebarChat) => {
    window.location.href = `/api/chats/${chat.id}/export`;
  };

  const startRename = (chat: SidebarChat) => {
    setRenameId(chat.id);
    setRenameValue(chat.title);
  };

  const commitRename = async () => {
    if (!renameId) return;
    const title = renameValue.trim();
    if (title) {
      await handlePatch(renameId, { title });
      toast.success("Renamed");
    }
    setRenameId(null);
  };

  const isActive = (id: string) => pathname?.endsWith(`/${id}`);
  const currentTheme = mounted ? resolvedTheme ?? theme : null;

  const renderRow = (c: SidebarChat) => (
    <SidebarMenuItem key={c.id} className="group/item">
      {renameId === c.id ? (
        <div className="flex items-center gap-1 px-2 py-1">
          <Input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenameId(null);
            }}
            className="h-7 text-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={commitRename}
            aria-label="Save"
          >
            <CheckIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => setRenameId(null)}
            aria-label="Cancel"
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <SidebarMenuButton
            asChild
            isActive={isActive(c.id)}
            className="pr-8"
            tooltip={c.title}
          >
            <Link href={`/c/${c.id}`} className="truncate">
              <span className="flex flex-1 items-center gap-1.5 truncate">
                <span className="truncate">{c.title}</span>
                {c.isShared ? (
                  <Link2Icon className="text-muted-foreground size-3 shrink-0" />
                ) : null}
              </span>
            </Link>
          </SidebarMenuButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuAction
                showOnHover
                aria-label="Chat actions"
                className="data-[state=open]:opacity-100"
              >
                <MoreHorizontalIcon data-icon />
              </SidebarMenuAction>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuItem onClick={() => startRename(c)}>
                <PencilIcon data-icon />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handlePatch(c.id, { isPinned: !c.isPinned })}
              >
                {c.isPinned ? (
                  <>
                    <PinOffIcon data-icon />
                    Unpin
                  </>
                ) : (
                  <>
                    <PinIcon data-icon />
                    Pin
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare(c)}>
                {c.isShared ? (
                  <>
                    <Link2OffIcon data-icon />
                    Stop sharing
                  </>
                ) : (
                  <>
                    <Link2Icon data-icon />
                    Share link
                  </>
                )}
              </DropdownMenuItem>
              {c.isShared ? (
                <DropdownMenuItem
                  onClick={() => {
                    const url = `${window.location.origin}/share/${c.id}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Link copied");
                  }}
                >
                  <CopyIcon data-icon />
                  Copy share link
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => handleExport(c)}>
                <DownloadIcon data-icon />
                Export markdown
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(c.id)}
                variant="destructive"
              >
                <TrashIcon data-icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 px-1">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="from-primary to-primary/40 bg-gradient-to-br bg-clip-text text-lg text-transparent">
              xgen
            </span>
            <span className="text-muted-foreground text-xs font-normal">
              multi-LLM
            </span>
          </Link>
          <SidebarTrigger className="size-7" />
        </div>
        <Button asChild variant="default" size="sm" className="mt-2 w-full">
          <Link href="/">
            <PlusIcon data-icon="inline-start" />
            New chat
          </Link>
        </Button>
        <div className="relative mt-2">
          <SearchIcon className="text-muted-foreground absolute left-2 top-1/2 size-3.5 -translate-y-1/2" />
          <SidebarInput
            placeholder="Search chats..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-7"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {pinned.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>
              <PinIcon className="mr-1 size-3" />
              Pinned
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{pinned.map(renderRow)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        <SidebarGroup>
          <SidebarGroupLabel>
            {query ? `Results (${filtered.length})` : "History"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {recent.length === 0 && pinned.length === 0 ? (
              <Empty className="py-6">
                <EmptyTitle className="text-sm">
                  {query ? "No matches" : "No chats yet"}
                </EmptyTitle>
                <EmptyDescription className="text-xs">
                  {query
                    ? "Try a different search."
                    : "Your conversations will live here."}
                </EmptyDescription>
              </Empty>
            ) : (
              <SidebarMenu>{recent.map(renderRow)}</SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname?.startsWith("/settings")}
            >
              <Link href="/settings">
                <KeyIcon data-icon />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() =>
                setTheme(currentTheme === "dark" ? "light" : "dark")
              }
            >
              {currentTheme === "dark" ? (
                <SunIcon data-icon />
              ) : (
                <MoonIcon data-icon />
              )}
              <span>
                {currentTheme === "dark" ? "Light mode" : "Dark mode"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon data-icon />
                <span>GitHub</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
