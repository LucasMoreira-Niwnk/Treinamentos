import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

let connection: DatabaseSync | undefined;

export function getDb() {
  if (connection) return connection;

  const databasePath = resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || ".data/treinamentos.sqlite");
  mkdirSync(dirname(databasePath), { recursive: true });
  connection = new DatabaseSync(databasePath);
  connection.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  return connection;
}
