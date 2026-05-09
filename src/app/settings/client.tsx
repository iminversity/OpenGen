"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SettingsForm, type SettingsTab } from "@/components/settings-form";

export function SettingsPage({ initialTab }: { initialTab: SettingsTab }) {
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  const handleTabChange = (next: SettingsTab) => {
    setTab(next);
    const url = next === "models" ? "/settings" : `/settings?tab=${next}`;
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="flex h-svh min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <SidebarTrigger className="size-8" />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-1"
        >
          <ArrowLeftIcon data-icon />
          Back
        </Button>
        <div className="flex-1" />
        <Button asChild variant="ghost" size="sm">
          <Link href="/">New chat</Link>
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <SettingsForm tab={tab} onTabChange={handleTabChange} />
      </div>
    </div>
  );
}
