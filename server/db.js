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
    {
      id: "2026-01-28-001-molecular-variations-import-person",
      up: () => {
        const columns = dbInstance
          .prepare("PRAGMA table_info(pedigree_import_person_molecular_variation)")
          .all()
          .map((c) => c.name);

        if (columns.length === 0) {
          return;
        }

        if (columns.includes("import_person_id")) {
          dbInstance.exec(
            "CREATE INDEX IF NOT EXISTS idx_pedigree_import_person_gene_pair ON pedigree_import_person_gene(person_id, gene_id)"
          );
          dbInstance.exec(
            "CREATE INDEX IF NOT EXISTS idx_pedigree_import_person_hpo_pair ON pedigree_import_person_hpo_term(person_id, hpo_id)"
          );
          return;
        }

        if (!columns.includes("person_id")) {
          return;
        }

        const missing = dbInstance
          .prepare(`
            SELECT COUNT(*) AS cnt
            FROM pedigree_import_person_molecular_variation mv
            LEFT JOIN pedigree_import_person ip
              ON ip.pedigree_id = mv.pedigree_id
             AND ip.external_id = CAST(mv.person_id AS TEXT)
            WHERE ip.id IS NULL
          `)
          .get().cnt;

        if (missing > 0) {
          throw new Error(
            `Cannot migrate molecular variations: ${missing} rows missing import person mapping`
          );
        }

        dbInstance.exec("BEGIN");
        try {
          dbInstance.exec(
            "ALTER TABLE pedigree_import_person_molecular_variation RENAME TO pedigree_import_person_molecular_variation_old"
          );

          dbInstance.exec(`
            CREATE TABLE IF NOT EXISTS pedigree_import_person_molecular_variation (
              id                      INTEGER PRIMARY KEY AUTOINCREMENT,
              pedigree_id             INTEGER NOT NULL,
              import_person_id        INTEGER NOT NULL,
              external_person_id      TEXT,
              gene                    TEXT,
              transcript              TEXT,
              exon_intron             TEXT,
              exon_intron_position    TEXT,
              g_change                TEXT,
              c_change                TEXT,
              p_change                TEXT,
              zygosity                TEXT,
              test_method             TEXT,
              test_classification     TEXT,
              clinvar_classification  TEXT,
              var_id                  TEXT,
              rs                      TEXT,
              comments                TEXT,
              created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (pedigree_id) REFERENCES pedigrees(id) ON DELETE CASCADE,
              FOREIGN KEY (import_person_id) REFERENCES pedigree_import_person(id) ON DELETE CASCADE
            );
          `);

          dbInstance.exec(`
            INSERT INTO pedigree_import_person_molecular_variation (
              id, pedigree_id, import_person_id, external_person_id,
              gene, transcript, exon_intron, exon_intron_position,
              g_change, c_change, p_change, zygosity, test_method, test_classification,
              clinvar_classification, var_id, rs, comments, created_at, updated_at
            )
            SELECT
              mv.id,
              mv.pedigree_id,
              ip.id AS import_person_id,
              CAST(mv.person_id AS TEXT) AS external_person_id,
              mv.gene,
              mv.transcript,
              mv.exon_intron,
              mv.exon_intron_position,
              mv.g_change,
              mv.c_change,
              mv.p_change,
              mv.zygosity,
              mv.test_method,
              mv.test_classification,
              mv.clinvar_classification,
              mv.var_id,
              mv.rs,
              mv.comments,
              mv.created_at,
              mv.updated_at
            FROM pedigree_import_person_molecular_variation_old mv
            JOIN pedigree_import_person ip
              ON ip.pedigree_id = mv.pedigree_id
             AND ip.external_id = CAST(mv.person_id AS TEXT);
          `);

          dbInstance.exec(
            "CREATE INDEX IF NOT EXISTS idx_pedigree_import_molecular_pedigree_id ON pedigree_import_person_molecular_variation(pedigree_id)"
          );
          dbInstance.exec(
            "CREATE INDEX IF NOT EXISTS idx_pedigree_import_molecular_import_person_id ON pedigree_import_person_molecular_variation(import_person_id)"
          );
          dbInstance.exec(
            "CREATE INDEX IF NOT EXISTS idx_pedigree_import_molecular_pedigree_import_person ON pedigree_import_person_molecular_variation(pedigree_id, import_person_id)"
          );
          dbInstance.exec(
            "CREATE INDEX IF NOT EXISTS idx_pedigree_import_molecular_external_person_id ON pedigree_import_person_molecular_variation(external_person_id)"
          );
          dbInstance.exec(
            "CREATE INDEX IF NOT EXISTS idx_pedigree_import_molecular_gene ON pedigree_import_person_molecular_variation(gene)"
          );
          dbInstance.exec(
            "CREATE INDEX IF NOT EXISTS idx_pedigree_import_molecular_test_classification ON pedigree_import_person_molecular_variation(test_classification)"
          );
          dbInstance.exec(
            "CREATE INDEX IF NOT EXISTS idx_pedigree_import_person_gene_pair ON pedigree_import_person_gene(person_id, gene_id)"
          );
          dbInstance.exec(
            "CREATE INDEX IF NOT EXISTS idx_pedigree_import_person_hpo_pair ON pedigree_import_person_hpo_term(person_id, hpo_id)"
          );

          dbInstance.exec("DROP TABLE pedigree_import_person_molecular_variation_old");
          dbInstance.exec("COMMIT");
        } catch (error) {
          dbInstance.exec("ROLLBACK");
          throw error;
        }
      },
    },
    {
      id: "2026-01-28-002-user-settings",
      up: () => {
        dbInstance.exec(`
          CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, key)
          );
        `);
        dbInstance.exec(
          "CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id)"
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
