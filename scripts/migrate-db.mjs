import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = resolve(process.env.DATABASE_PATH || ".data/treinamentos.sqlite");
const migrationsPath = resolve("db/migrations");

mkdirSync(dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
db.exec(`CREATE TABLE IF NOT EXISTS app_migrations (
  name TEXT PRIMARY KEY NOT NULL,
  applied_at INTEGER NOT NULL
)`);

const applied = new Set(db.prepare("SELECT name FROM app_migrations").all().map((row) => row.name));
const migrations = readdirSync(migrationsPath).filter((name) => name.endsWith(".sql")).sort();

for (const name of migrations) {
  if (applied.has(name)) continue;

  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(readFileSync(resolve(migrationsPath, name), "utf8"));
    db.prepare("INSERT INTO app_migrations (name, applied_at) VALUES (?, ?)").run(name, Date.now());
    db.exec("COMMIT");
    console.log(`Migração aplicada: ${name}`);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

db.close();
console.log(`Banco pronto em ${databasePath}`);
