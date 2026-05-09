import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { chats, messages as messagesTable } from "@/lib/db/schema";
import { getModel } from "@/lib/models";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export default async function SharedChatPage({ params }: Ctx) {
  const { id } = await params;
  const [chat] = await db.select().from(chats).where(eq(chats.id, id));
  if (!chat || !chat.isShared) notFound();
  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, id))
    .orderBy(asc(messagesTable.createdAt));

  const modelName = getModel(chat.model)?.name ?? chat.model;

  return (
    <div className="bg-background min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            <span className="from-primary to-primary/40 bg-gradient-to-br bg-clip-text text-transparent">
              xgen
            </span>
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              shared chat
            </span>
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link href="/">Try xgen →</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">{chat.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {modelName} · {new Date(chat.createdAt).toLocaleDateString()}
        </p>
        <div className="mt-6">
          <Conversation className="h-auto">
            <ConversationContent>
              {rows.map((m) => {
                const parts = (m.parts as unknown as Array<{
                  type: string;
                  text?: string;
                  url?: string;
                  filename?: string;
                  mediaType?: string;
                  title?: string;
                }>) ?? [];
                const reasoningText = parts
                  .filter((p) => p.type === "reasoning")
                  .map((p) => p.text ?? "")
                  .join("\n\n");
                const sourceParts = parts.filter((p) => p.type === "source-url");

                return (
                  <Fragment key={m.id}>
                    {m.role === "assistant" && sourceParts.length > 0 ? (
                      <Sources>
                        <SourcesTrigger count={sourceParts.length} />
                        <SourcesContent>
                          {sourceParts.map((p, i) => (
                            <Source
                              key={`${m.id}-src-${i}`}
                              href={p.url ?? "#"}
                              title={p.title ?? p.url ?? ""}
                            />
                          ))}
                        </SourcesContent>
                      </Sources>
                    ) : null}
                    <Message from={m.role as "user" | "assistant" | "system"}>
                      <MessageContent>
                        {reasoningText ? (
                          <Reasoning className="w-full" defaultOpen={false}>
                            <ReasoningTrigger />
                            <ReasoningContent>{reasoningText}</ReasoningContent>
                          </Reasoning>
                        ) : null}
                        {parts.map((p, i) => {
                          const key = `${m.id}-${i}`;
                          if (p.type === "text" && p.text) {
                            if (m.role === "user") {
                              return (
                                <div
                                  key={key}
                                  className="text-sm whitespace-pre-wrap break-words"
                                >
                                  {p.text}
                                </div>
                              );
                            }
                            return (
                              <MessageResponse key={key} className="prose-chat">
                                {p.text}
                              </MessageResponse>
                            );
                          }
                          if (
                            p.type === "file" &&
                            p.url &&
                            p.mediaType?.startsWith("image/")
                          ) {
                            return (
                              <img
                                key={key}
                                src={p.url}
                                alt={p.filename ?? ""}
                                className="my-2 max-h-80 rounded-lg border"
                              />
                            );
                          }
                          return null;
                        })}
                      </MessageContent>
                    </Message>
                  </Fragment>
                );
              })}
            </ConversationContent>
          </Conversation>
        </div>
      </main>
      <footer className="text-muted-foreground py-8 text-center text-xs">
        Shared via xgen · open-source multi-LLM chat
      </footer>
    </div>
  );
}
