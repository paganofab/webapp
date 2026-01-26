const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { SCHEMA_SQL } = require("./schema");
const { initializePedigreeImportSchema } = require("../src/script/pedigree-import-schema");

let db = null;

function getDbPath() {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  return path.join(__dirname, "..", "data", "pedigree.db");
}

function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initDb() {
  if (db) return db;

  const dbPath = getDbPath();
  ensureDirExists(dbPath);
  db = new Database(dbPath);

  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA encoding = 'UTF-8'");

  // Core schema
  db.exec(SCHEMA_SQL);

  // Import schema
  initializePedigreeImportSchema(db);

  // Migrations
  runMigrations(db);

  return db;
}

function runMigrations(dbInstance) {
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = new Set(
    dbInstance.prepare("SELECT id FROM migrations").all().map((r) => r.id)
  );

  const migrations = [
    {
      id: "2026-01-26-001-users-and-pedigree-user",
      up: () => {
        dbInstance.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Add user_id to pedigrees if missing
        const columns = dbInstance
          .prepare("PRAGMA table_info(pedigrees)")
          .all()
          .map((c) => c.name);

        if (!columns.includes("user_id")) {
          dbInstance.exec("ALTER TABLE pedigrees ADD COLUMN user_id INTEGER");
        }

        dbInstance.exec(
          "CREATE INDEX IF NOT EXISTS idx_pedigrees_user_id ON pedigrees(user_id)"
        );
        dbInstance.exec(
          "CREATE UNIQUE INDEX IF NOT EXISTS idx_pedigrees_user_name ON pedigrees(user_id, name)"
        );
      },
    },
  ];

  const insertStmt = dbInstance.prepare(
    "INSERT INTO migrations (id) VALUES (?)"
  );

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    migration.up();
    insertStmt.run(migration.id);
  }
}

module.exports = {
  initDb,
  getDbPath,
};
