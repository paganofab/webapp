/**
 * Pedigree Import Schema - New tables for pedigree graph import functionality
 * 
 * This module contains the SQL schema for the new pedigree import system
 * based on the PEDIGREE_IMPORT_FUNCTION.md specification.
 * 
 * Tables are prefixed with 'pedigree_import_' to avoid conflicts with existing tables.
 */

const PEDIGREE_IMPORT_SCHEMA = `
PRAGMA foreign_keys = ON;

-- 1) Pedigree Import Person Table
-- Maps to individual people from decoded pedigree graphs
CREATE TABLE IF NOT EXISTS pedigree_import_person (
  id               INTEGER PRIMARY KEY,     -- keep the same id from your graph if desired
  pedigree_id      INTEGER,                 -- ID of the pedigree this person belongs to
  external_id      TEXT,                    -- original person ID within the pedigree graph
  f_name           TEXT,
  l_name           TEXT,
  gender           TEXT CHECK (gender IN ('M','F','O') OR gender IS NULL),
  dob              TEXT,                    -- store ISO YYYY-MM-DD if available
  dod              TEXT,
  life_status      TEXT,                    -- 'alive','deceased', etc.
  evaluated        INTEGER DEFAULT 0,       -- 0/1
  childless_status TEXT,                    -- e.g. 'infertile'
  carrier_status   TEXT,                    -- e.g. 'carrier','affected','presymptomatic'
  comments         TEXT,
  is_proband       INTEGER DEFAULT 0,
  generation       INTEGER,                 -- from graph.ranks[id]
  position_x       REAL,                    -- from graph.positions[id] if used
  UNIQUE(pedigree_id, external_id)          -- ensure unique person per pedigree
);

CREATE INDEX IF NOT EXISTS idx_pedigree_import_person_generation  ON pedigree_import_person(generation);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_person_external_id ON pedigree_import_person(external_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_person_pedigree_id ON pedigree_import_person(pedigree_id);

-- 2) Pedigree Import Partnership Table (maps relationship hubs)
-- Stores partnership information including relationship properties
CREATE TABLE IF NOT EXISTS pedigree_import_partnership (
  id             INTEGER PRIMARY KEY,       -- reuse rel-hub id or generate your own
  pedigree_id    INTEGER,                   -- ID of the pedigree this partnership belongs to
  notes          TEXT,
  consanguinity  TEXT,                      -- e.g. 'Y', 'N', 'unknown' (maps from prop.consangr)
  is_broken      INTEGER DEFAULT 0,         -- 0/1 (maps from prop.broken)
  prop_json      TEXT                       -- raw JSON dump of all rel-hub props for flexibility
);

CREATE INDEX IF NOT EXISTS idx_pedigree_import_partnership_pedigree_id ON pedigree_import_partnership(pedigree_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_partnership_consang ON pedigree_import_partnership(consanguinity);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_partnership_broken  ON pedigree_import_partnership(is_broken);

-- 3) Pedigree Import Partnership Partners
-- Links people to their partnerships (many-to-many)
CREATE TABLE IF NOT EXISTS pedigree_import_partnership_partner (
  partnership_id INTEGER NOT NULL,
  person_id      INTEGER NOT NULL,
  PRIMARY KEY (partnership_id, person_id),
  FOREIGN KEY (partnership_id) REFERENCES pedigree_import_partnership(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id)      REFERENCES pedigree_import_person(id)      ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pedigree_import_partner_person ON pedigree_import_partnership_partner(person_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_partner_partnership ON pedigree_import_partnership_partner(partnership_id);

-- 4) Pedigree Import Partnership Children
-- Maps children to partnerships (child hubs -> child persons under a rel hub)
CREATE TABLE IF NOT EXISTS pedigree_import_partnership_child (
  partnership_id INTEGER NOT NULL,
  child_id       INTEGER NOT NULL,
  PRIMARY KEY (partnership_id, child_id),
  FOREIGN KEY (partnership_id) REFERENCES pedigree_import_partnership(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id)       REFERENCES pedigree_import_person(id)      ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pedigree_import_child_childid ON pedigree_import_partnership_child(child_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_child_partnership ON pedigree_import_partnership_child(partnership_id);

-- 5) Pedigree Import Disorders
-- Clinical annotations for medical conditions
CREATE TABLE IF NOT EXISTS pedigree_import_disorder (
  id   INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS pedigree_import_person_disorder (
  person_id   INTEGER NOT NULL,
  disorder_id INTEGER NOT NULL,
  PRIMARY KEY (person_id, disorder_id),
  FOREIGN KEY (person_id)   REFERENCES pedigree_import_person(id)   ON DELETE CASCADE,
  FOREIGN KEY (disorder_id) REFERENCES pedigree_import_disorder(id) ON DELETE CASCADE
);

-- 6) Pedigree Import HPO Terms
-- Human Phenotype Ontology terms for detailed phenotype description
CREATE TABLE IF NOT EXISTS pedigree_import_hpo_term (
  id   INTEGER PRIMARY KEY,
  term TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS pedigree_import_person_hpo_term (
  person_id INTEGER NOT NULL,
  hpo_id    INTEGER NOT NULL,
  PRIMARY KEY (person_id, hpo_id),
  FOREIGN KEY (person_id) REFERENCES pedigree_import_person(id) ON DELETE CASCADE,
  FOREIGN KEY (hpo_id)    REFERENCES pedigree_import_hpo_term(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pedigree_import_person_hpo_pair ON pedigree_import_person_hpo_term(person_id, hpo_id);

-- 7) Pedigree Import Genes
-- Genetic markers and candidate genes
CREATE TABLE IF NOT EXISTS pedigree_import_gene (
  id     INTEGER PRIMARY KEY,
  symbol TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS pedigree_import_person_gene (
  person_id INTEGER NOT NULL,
  gene_id   INTEGER NOT NULL,
  role      TEXT,  -- e.g. 'candidate'
  PRIMARY KEY (person_id, gene_id, role),
  FOREIGN KEY (person_id) REFERENCES pedigree_import_person(id) ON DELETE CASCADE,
  FOREIGN KEY (gene_id)   REFERENCES pedigree_import_gene(id)   ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pedigree_import_person_gene_pair ON pedigree_import_person_gene(person_id, gene_id);

-- 8) Pedigree Import Sessions
-- Track import sessions and metadata
CREATE TABLE IF NOT EXISTS pedigree_import_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_name    TEXT NOT NULL,
  source_file     TEXT,                     -- original filename if imported from file
  import_date     DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_persons   INTEGER DEFAULT 0,
  total_partnerships INTEGER DEFAULT 0,
  graph_data      TEXT,                     -- raw graph JSON for reference
  status          TEXT CHECK(status IN ('active', 'archived', 'error')) DEFAULT 'active',
  notes           TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pedigree_import_sessions_status ON pedigree_import_sessions(status);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_sessions_date ON pedigree_import_sessions(import_date);

-- 9) Link import persons to import sessions
CREATE TABLE IF NOT EXISTS pedigree_import_session_person (
  session_id INTEGER NOT NULL,
  person_id  INTEGER NOT NULL,
  PRIMARY KEY (session_id, person_id),
  FOREIGN KEY (session_id) REFERENCES pedigree_import_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id)  REFERENCES pedigree_import_person(id)   ON DELETE CASCADE
);

-- 10) Link import partnerships to import sessions  
CREATE TABLE IF NOT EXISTS pedigree_import_session_partnership (
  session_id     INTEGER NOT NULL,
  partnership_id INTEGER NOT NULL,
  PRIMARY KEY (session_id, partnership_id),
  FOREIGN KEY (session_id)     REFERENCES pedigree_import_sessions(id)        ON DELETE CASCADE,
  FOREIGN KEY (partnership_id) REFERENCES pedigree_import_partnership(id)     ON DELETE CASCADE
);

-- 11) Pedigree Import Person Risk Assessment Data
-- Extended demographic and risk assessment data for each person
CREATE TABLE IF NOT EXISTS pedigree_import_person_risk_data (
  id                            INTEGER PRIMARY KEY AUTOINCREMENT,
  pedigree_id                   INTEGER NOT NULL,        -- Link to pedigree
  person_id                     INTEGER NOT NULL,        -- Link to pedigree_import_person
  
  -- Basic Demographics
  birthdate                     DATE,
  birthplace                    TEXT,
  age                           INTEGER,
  genero                        TEXT,                     -- Gender (Portuguese field)
  orientacao_sexual             TEXT,                     -- Sexual orientation
  escolaridade                  TEXT,                     -- Education level
  profissao                     TEXT,                     -- Profession
  
  -- Death Information
  is_dead                       INTEGER DEFAULT 0,       -- Boolean: is deceased
  date_of_death                 DATE,
  cause_of_death                TEXT,
  
  -- Ancestry and Adoption
  ancestry                      TEXT,
  adopted                       INTEGER,                  -- Boolean: is adopted
  adopted_history               TEXT,
  jewish_ancestry               INTEGER,                  -- Boolean: has Jewish ancestry
  jewish_origin                 TEXT,
  consanguinity                 INTEGER,                  -- Boolean: has consanguineous relationships
  consanguinity_relation        TEXT,
  
  -- Cancer History
  cancer                        INTEGER,                  -- Boolean: has cancer history
  cancer_list                   TEXT,
  
  -- Genetic Testing
  genetic_test                  INTEGER,                  -- Boolean: has genetic testing
  genetic_test_result           TEXT,
  genetic_test_done             TEXT,
  genetic_test_file             TEXT,
  
  -- Reproductive History - Basic
  reproductive_history          TEXT,
  menarche_age                  INTEGER,
  pregnancies                   INTEGER,
  births_over_38wks             INTEGER,
  age_first_birth               INTEGER,
  breastfeeding                 INTEGER,                  -- Boolean: did breastfeed
  breastfeeding_months          INTEGER,
  biopsies                      INTEGER,
  hyperplasia_found             INTEGER,                  -- Boolean: hyperplasia found in biopsies
  
  -- Family Relationships
  relation_to_proband           TEXT CHECK (relation_to_proband IN (
    'proband','father','mother','sibling','child','grandchild','niece',
    'paternal_grandfather','paternal_grandmother','maternal_grandfather','maternal_grandmother',
    'paternal_sibling','maternal_sibling','paternal_cousin','maternal_cousin',
    'partner','partner_father','partner_mother','partner_sibling',
    'partner_paternal_grandfather','partner_paternal_grandmother',
    'partner_maternal_grandfather','partner_maternal_grandmother'
  )),
  is_half_sibling               INTEGER DEFAULT 0,       -- Boolean: is half-sibling
  half_sibling_side             TEXT CHECK (half_sibling_side IN ('mother','father')),
  
  -- Twin Information
  isTwin                        INTEGER DEFAULT 0,       -- Boolean: is twin
  twin_group_id                 TEXT,
  twin_type                     TEXT CHECK (twin_type IN ('monozygotic','dizygotic','unknown')),
  
  -- Partnership Information
  partner_relationship          TEXT CHECK (partner_relationship IN ('spouse','partner','ex_spouse')),
  genetic_condition             INTEGER DEFAULT 0,       -- Boolean: has genetic condition
  sons_count                    INTEGER DEFAULT 0,
  daughters_count               INTEGER DEFAULT 0,
  children_count_unknown        INTEGER DEFAULT 0,       -- Boolean: unknown number of children
  
  -- Physical Measurements
  altura                        DECIMAL(5,1),             -- Height in centimeters
  peso                          DECIMAL(5,1),             -- Weight in kilograms
  bmi                           DECIMAL(4,1),             -- Body Mass Index
  
  -- Alcohol Consumption
  consome_alcool                TEXT,                     -- Consumes alcohol: Sim/Não/Ocasionalmente
  alcohol_grams_week            DECIMAL(6,1),             -- Total alcohol grams per week
  cerveja_week                  DECIMAL(4,1),             -- Beer glasses per week
  vinho_week                    DECIMAL(4,1),             -- Wine glasses per week
  destilados_week               DECIMAL(4,1),             -- Spirits shots per week
  outras_bebidas_week           DECIMAL(4,1),             -- Other alcoholic beverages per week
  alcohol_pattern               TEXT,                     -- Drinking pattern: regular/weekend/social
  alcohol_duration              TEXT,                     -- Duration of current pattern
  alcohol_history               TEXT,                     -- History of heavier drinking: Sim/Não
  
  -- Detailed Reproductive History
  first_menstruation_age        INTEGER,
  total_pregnancies             INTEGER,
  had_miscarriage               INTEGER,                  -- Boolean: had miscarriage
  miscarriage_count             INTEGER,
  pregnancies_over_weeks        INTEGER,
  pregnancies_over_months       INTEGER,
  first_childbirth_age          INTEGER,
  did_breastfeed                INTEGER,                  -- Boolean: did breastfeed
  breastfeed_months_average     INTEGER,
  
  -- Oral Contraceptives
  oc_use                        TEXT,                     -- OC use: Sim/Não
  oc_duration_years             DECIMAL(4,1),             -- Total years of OC use
  oc_age_start                  INTEGER,                  -- Age started OCs
  oc_current_use                TEXT,                     -- Currently using: Sim/Não
  
  -- Hormone Replacement Therapy
  mht_use                       TEXT,                     -- HRT use: Sim/Não
  mht_duration_years            DECIMAL(4,1),             -- Total years of HRT
  mht_age_start                 INTEGER,                  -- Age started HRT
  mht_type                      TEXT,                     -- HRT type: estrogen_only/combined/other/unknown
  
  -- Surgical History
  tubal_ligation                TEXT,                     -- Had tubal ligation: Sim/Não
  tl_age                        INTEGER,                  -- Age at tubal ligation
  
  -- Medical Conditions
  endometriosis                 TEXT,                     -- Has endometriosis: Sim/Não/Suspeita
  endo_age_diagnosis            INTEGER,                  -- Age at endometriosis diagnosis
  endo_severity                 TEXT,                     -- Endometriosis severity
  
  -- Menopause
  menopause_status              TEXT,                     -- Menopause status: Sim/Não/Não sei
  menopause_age                 INTEGER,                  -- Age at menopause
  ovary_removal                 TEXT,                     -- Had ovary removal: Sim/Não
  ovary_removal_age             INTEGER,                  -- Age at ovary removal
  ovary_removal_type            TEXT,                     -- Which ovary: left/right/both
  
  -- Risk Assessment Factors
  mammographic_density          TEXT CHECK (mammographic_density IN ('A','B','C','D','unknown')),
  smoking_status                TEXT,                     -- never/former/current
  smoking_pack_years            DECIMAL(5,1),             -- Pack-years of smoking
  physical_activity             TEXT,                     -- Activity level: sedentary/moderate/active
  lcis_diagnosis                INTEGER,                  -- Boolean: LCIS diagnosis
  radiation_exposure            INTEGER,                  -- Boolean: previous chest radiation
  radiation_age                 INTEGER,                  -- Age at radiation exposure
  
  -- Metadata
  created_at                    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at                    DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  FOREIGN KEY (pedigree_id) REFERENCES pedigrees(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES pedigree_import_person(id) ON DELETE CASCADE,
  
  -- Ensure one record per person per pedigree
  UNIQUE(pedigree_id, person_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pedigree_import_risk_data_pedigree_id ON pedigree_import_person_risk_data(pedigree_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_risk_data_person_id ON pedigree_import_person_risk_data(person_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_risk_data_relation ON pedigree_import_person_risk_data(relation_to_proband);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_risk_data_cancer ON pedigree_import_person_risk_data(cancer);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_risk_data_genetic_test ON pedigree_import_person_risk_data(genetic_test);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_risk_data_smoking ON pedigree_import_person_risk_data(smoking_status);

-- 12) Pedigree Import Person Molecular Variations
-- Store molecular genetic variations for each person (multiple variations per person)
CREATE TABLE IF NOT EXISTS pedigree_import_person_molecular_variation (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  pedigree_id             INTEGER NOT NULL,        -- Link to pedigree
  import_person_id        INTEGER NOT NULL,        -- FK to pedigree_import_person.id
  external_person_id      TEXT,                    -- Graph node id for traceability
  
  -- Molecular Variation Fields
  gene                    TEXT,                    -- Gene symbol
  transcript              TEXT,                    -- Transcript identifier
  exon_intron             TEXT,                    -- exon/intron type
  exon_intron_position    TEXT,                    -- exon/intron position
  g_change                TEXT,                    -- g.change notation
  c_change                TEXT,                    -- c.change notation  
  p_change                TEXT,                    -- p.change notation
  zygosity                TEXT,                    -- homozygous/heterozygous/hemizygous
  test_method             TEXT,                    -- NGS/Sanger/Array/etc
  test_classification     TEXT,                    -- pathogenic/likely_pathogenic/uncertain/likely_benign/benign
  clinvar_classification  TEXT,                    -- ClinVar classification
  var_id                  TEXT,                    -- Variant ID
  rs                      TEXT,                    -- dbSNP rs number
  comments                TEXT,                    -- Additional comments
  
  -- Metadata
  created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  FOREIGN KEY (pedigree_id) REFERENCES pedigrees(id) ON DELETE CASCADE,
  FOREIGN KEY (import_person_id) REFERENCES pedigree_import_person(id) ON DELETE CASCADE
);

-- Indexes for molecular variations
CREATE INDEX IF NOT EXISTS idx_pedigree_import_molecular_pedigree_id ON pedigree_import_person_molecular_variation(pedigree_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_molecular_import_person_id ON pedigree_import_person_molecular_variation(import_person_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_molecular_pedigree_import_person ON pedigree_import_person_molecular_variation(pedigree_id, import_person_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_molecular_external_person_id ON pedigree_import_person_molecular_variation(external_person_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_molecular_gene ON pedigree_import_person_molecular_variation(gene);
CREATE INDEX IF NOT EXISTS idx_pedigree_import_molecular_test_classification ON pedigree_import_person_molecular_variation(test_classification);
`;

/**
 * Initialize the pedigree import schema in the database
 * @param {Database} db - better-sqlite3 database instance
 */
function initializePedigreeImportSchema(db) {
  
  try {
    db.exec(PEDIGREE_IMPORT_SCHEMA);
    
    return true;
  } catch (error) {
    console.error('❌ Error creating pedigree import schema:', error);
    return false;
  }
}

/**
 * Drop all pedigree import tables (for cleanup/reset)
 * @param {Database} db - better-sqlite3 database instance
 */
function dropPedigreeImportSchema(db) {
  const dropTables = [
    'pedigree_import_session_partnership',
    'pedigree_import_session_person',
    'pedigree_import_sessions',
    'pedigree_import_person_gene',
    'pedigree_import_gene',
    'pedigree_import_person_hpo_term',
    'pedigree_import_hpo_term',
    'pedigree_import_person_disorder',
    'pedigree_import_disorder',
    'pedigree_import_partnership_child',
    'pedigree_import_partnership_partner',
    'pedigree_import_partnership',
    'pedigree_import_person_molecular_variation',  // Add the molecular variations table
    'pedigree_import_person_risk_data',  // Add the new table
    'pedigree_import_person'
  ];

  
  try {
    for (const table of dropTables) {
      db.exec(`DROP TABLE IF EXISTS ${table}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error dropping pedigree import schema:', error);
    return false;
  }
}

module.exports = {
  PEDIGREE_IMPORT_SCHEMA,
  initializePedigreeImportSchema,
  dropPedigreeImportSchema
};
