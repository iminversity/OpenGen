import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

const dbPath = process.env.XGEN_DB_PATH ?? ".data/xgen.db";
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New chat',
    model TEXT NOT NULL,
    is_shared INTEGER NOT NULL DEFAULT 0,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    parts TEXT NOT NULL,
    model TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(updated_at DESC);
`);

const cols = sqlite
  .prepare("PRAGMA table_info(chats)")
  .all() as { name: string }[];
const colNames = new Set(cols.map((c) => c.name));
if (!colNames.has("is_shared")) {
  sqlite.exec("ALTER TABLE chats ADD COLUMN is_shared INTEGER NOT NULL DEFAULT 0");
}
if (!colNames.has("is_pinned")) {
  sqlite.exec("ALTER TABLE chats ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0");
}
