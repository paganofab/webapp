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
    {
      id: "2026-01-28-003-report-user-columns",
      up: () => {
        const templateCols = dbInstance
          .prepare("PRAGMA table_info(report_templates)")
          .all()
          .map((c) => c.name);
        if (!templateCols.includes("user_id")) {
          dbInstance.exec("ALTER TABLE report_templates ADD COLUMN user_id INTEGER");
        }
        if (!templateCols.includes("language")) {
          dbInstance.exec("ALTER TABLE report_templates ADD COLUMN language TEXT DEFAULT 'pt-BR'");
        }

        const reportCols = dbInstance
          .prepare("PRAGMA table_info(generated_reports)")
          .all()
          .map((c) => c.name);
        if (!reportCols.includes("person_external_id")) {
          dbInstance.exec("ALTER TABLE generated_reports ADD COLUMN person_external_id TEXT");
        }
        if (!reportCols.includes("file_path")) {
          dbInstance.exec("ALTER TABLE generated_reports ADD COLUMN file_path TEXT");
        }
        if (!reportCols.includes("user_id")) {
          dbInstance.exec("ALTER TABLE generated_reports ADD COLUMN user_id INTEGER");
        }
      },
    },
    {
      id: "2026-01-28-004-default-report-template",
      up: () => {
        const count = dbInstance
          .prepare("SELECT COUNT(*) AS cnt FROM report_templates WHERE is_system = 1")
          .get().cnt;
        if (count > 0) return;

        const templateId = "tpl_system_default";
        const content = `
<div style="font-family: Arial, sans-serif; color: #1f2a44;">
  <h1>Relatorio do paciente</h1>
  <p><strong>Paciente:</strong> {{patient.name}}</p>
  <p><strong>Sexo:</strong> {{patient.gender}}</p>
  <p><strong>Nascimento:</strong> {{patient.dob}}</p>
  <p><strong>Observacoes:</strong> {{patient.comments}}</p>

  <h2>Disorders</h2>
  <ul>
    {{#each patient.disorders}}
      <li>{{this}}</li>
    {{/each}}
  </ul>

  <h2>HPO</h2>
  <ul>
    {{#each patient.hpo_terms}}
      <li>{{this}}</li>
    {{/each}}
  </ul>

  <h2>Genes</h2>
  <ul>
    {{#each patient.genes}}
      <li>{{this}}</li>
    {{/each}}
  </ul>

  <h2>Variacoes moleculares</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr>
        <th style="border: 1px solid #ccd3e0; padding: 6px;">Gene</th>
        <th style="border: 1px solid #ccd3e0; padding: 6px;">c.</th>
        <th style="border: 1px solid #ccd3e0; padding: 6px;">p.</th>
        <th style="border: 1px solid #ccd3e0; padding: 6px;">Zigosidade</th>
        <th style="border: 1px solid #ccd3e0; padding: 6px;">Classificacao</th>
      </tr>
    </thead>
    <tbody>
      {{#each patient.molecular_variations}}
      <tr>
        <td style="border: 1px solid #ccd3e0; padding: 6px;">{{gene}}</td>
        <td style="border: 1px solid #ccd3e0; padding: 6px;">{{c_change}}</td>
        <td style="border: 1px solid #ccd3e0; padding: 6px;">{{p_change}}</td>
        <td style="border: 1px solid #ccd3e0; padding: 6px;">{{zygosity}}</td>
        <td style="border: 1px solid #ccd3e0; padding: 6px;">{{test_classification}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <h2>Pedigree</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr>
        <th style="border: 1px solid #ccd3e0; padding: 6px;">Node</th>
        <th style="border: 1px solid #ccd3e0; padding: 6px;">Nome</th>
        <th style="border: 1px solid #ccd3e0; padding: 6px;">Sexo</th>
      </tr>
    </thead>
    <tbody>
      {{#each pedigree.people}}
      <tr>
        <td style="border: 1px solid #ccd3e0; padding: 6px;">{{external_id}}</td>
        <td style="border: 1px solid #ccd3e0; padding: 6px;">{{name}}</td>
        <td style="border: 1px solid #ccd3e0; padding: 6px;">{{gender}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
</div>
`;

        dbInstance.prepare(`
          INSERT INTO report_templates (template_id, name, description, content, is_system, created_by, language)
          VALUES (?, ?, ?, ?, 1, 'system', 'pt-BR')
        `).run(templateId, "Relatorio base", "Template padrao para testes", content);
      },
    },
    {
      id: "2026-01-28-005-report-template-format",
      up: () => {
        const templateCols = dbInstance
          .prepare("PRAGMA table_info(report_templates)")
          .all()
          .map((c) => c.name);
        if (!templateCols.includes("format")) {
          dbInstance.exec("ALTER TABLE report_templates ADD COLUMN format TEXT DEFAULT 'html'");
          dbInstance.exec("UPDATE report_templates SET format = 'html' WHERE format IS NULL");
        }
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
