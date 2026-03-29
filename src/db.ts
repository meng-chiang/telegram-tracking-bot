import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tracking_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    label           TEXT NOT NULL,
    last_result     TEXT,
    last_queried_at DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    chat_id       INTEGER PRIMARY KEY,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface TrackingItem {
  id: number;
  label: string;
  last_result: string | null;
  last_queried_at: string | null;
  created_at: string;
}

const stmts = {
  getAllItems: db.prepare('SELECT * FROM tracking_items ORDER BY created_at'),
  getItemById: db.prepare('SELECT * FROM tracking_items WHERE id = ?'),
  insertItem: db.prepare('INSERT INTO tracking_items (label) VALUES (?)'),
  updateItem: db.prepare('UPDATE tracking_items SET label = ? WHERE id = ?'),
  deleteItem: db.prepare('DELETE FROM tracking_items WHERE id = ?'),
  updateResult: db.prepare(
    'UPDATE tracking_items SET last_result = ?, last_queried_at = CURRENT_TIMESTAMP WHERE id = ?'
  ),
  registerUser: db.prepare('INSERT OR IGNORE INTO users (chat_id) VALUES (?)'),
  getAllUsers: db.prepare('SELECT chat_id FROM users'),
};

export const itemsDb = {
  getAll(): TrackingItem[] {
    return stmts.getAllItems.all() as TrackingItem[];
  },

  getById(id: number): TrackingItem | undefined {
    return stmts.getItemById.get(id) as TrackingItem | undefined;
  },

  create(label: string): TrackingItem {
    const result = stmts.insertItem.run(label);
    return stmts.getItemById.get(result.lastInsertRowid) as TrackingItem;
  },

  update(id: number, label: string): boolean {
    return stmts.updateItem.run(label, id).changes > 0;
  },

  delete(id: number): boolean {
    return stmts.deleteItem.run(id).changes > 0;
  },

  updateResult(id: number, result: string): void {
    stmts.updateResult.run(result, id);
  },
};

export const usersDb = {
  register(chatId: number): void {
    stmts.registerUser.run(chatId);
  },

  getAll(): number[] {
    return (stmts.getAllUsers.all() as { chat_id: number }[]).map((r) => r.chat_id);
  },
};

export default db;
