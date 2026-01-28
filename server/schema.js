const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS pedigrees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  session_data TEXT,
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- Family members table for Family Center module
CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedigree_id INTEGER,
  family_id INTEGER,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date TEXT,
  birth_year INTEGER,
  death_year INTEGER,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')),
  status TEXT CHECK(status IN ('alive', 'deceased', 'unknown', 'unborn', 'aborted', 'miscarriage')) DEFAULT 'alive',
  relationship TEXT,
  is_proband INTEGER DEFAULT 0,
  generation INTEGER DEFAULT 1,
  position INTEGER,
  notes TEXT,
  ethnicity TEXT,
  external_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedigree_id) REFERENCES pedigrees (id) ON DELETE CASCADE,
  FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE
);

-- Enhanced medical conditions table
CREATE TABLE IF NOT EXISTS medical_conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_member_id INTEGER,
  condition_name TEXT NOT NULL,
  condition_type TEXT DEFAULT 'disorder',
  onset_age INTEGER,
  severity TEXT,
  status TEXT DEFAULT 'affected',
  notes TEXT,
  external_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_member_id) REFERENCES family_members (id) ON DELETE CASCADE
);

-- Risk assessments table for Risk Assessment module
CREATE TABLE IF NOT EXISTS risk_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedigree_id INTEGER,
  family_member_id INTEGER,
  assessment_type TEXT NOT NULL,
  risk_score TEXT,
  risk_level TEXT CHECK(risk_level IN ('low', 'moderate', 'high')),
  assessment_data TEXT,
  recommendations TEXT,
  completed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  next_review_date DATETIME,
  status TEXT CHECK(status IN ('draft', 'completed', 'reviewed')) DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedigree_id) REFERENCES pedigrees (id) ON DELETE CASCADE,
  FOREIGN KEY (family_member_id) REFERENCES family_members (id) ON DELETE CASCADE
);

-- Reports table for Report module
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedigree_id INTEGER,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT CHECK(status IN ('draft', 'completed', 'archived')) DEFAULT 'draft',
  generated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedigree_id) REFERENCES pedigrees (id) ON DELETE CASCADE
);

-- Relationships table for complex family relationships
CREATE TABLE IF NOT EXISTS family_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedigree_id INTEGER,
  member1_id INTEGER,
  member2_id INTEGER,
  relationship_type TEXT NOT NULL,
  is_biological BOOLEAN DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedigree_id) REFERENCES pedigrees (id) ON DELETE CASCADE,
  FOREIGN KEY (member1_id) REFERENCES family_members (id) ON DELETE CASCADE,
  FOREIGN KEY (member2_id) REFERENCES family_members (id) ON DELETE CASCADE
);

-- Families table for simple family management
CREATE TABLE IF NOT EXISTS families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  proband_name TEXT,
  proband_id INTEGER,
  doctor_notes TEXT,
  status TEXT DEFAULT 'active',
  total_members INTEGER DEFAULT 0,
  affected_members INTEGER DEFAULT 0,
  generations INTEGER DEFAULT 1,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  pedigree_id INTEGER,
  FOREIGN KEY (pedigree_id) REFERENCES pedigrees (id) ON DELETE SET NULL
);

-- Family members for integrated approach
CREATE TABLE IF NOT EXISTS family_people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  external_id TEXT,
  is_proband BOOLEAN DEFAULT 0,
  first_name TEXT NOT NULL,
  last_name TEXT,
  maiden_name TEXT,
  nickname TEXT,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')),
  birth_date TEXT,
  birth_date_estimated BOOLEAN DEFAULT 0,
  death_date TEXT,
  death_date_estimated BOOLEAN DEFAULT 0,
  is_alive BOOLEAN DEFAULT 1,
  is_adopted BOOLEAN DEFAULT 0,
  is_consanguineous BOOLEAN DEFAULT 0,
  ethnicity TEXT,
  occupation TEXT,
  education_level TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  height REAL,
  weight REAL,
  eye_color TEXT,
  hair_color TEXT,
  skin_color TEXT,
  karyotype TEXT,
  notes TEXT,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS person_medical_conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL,
  condition_name TEXT NOT NULL,
  condition_code TEXT,
  condition_system TEXT,
  onset_age INTEGER,
  onset_age_unit TEXT DEFAULT 'years',
  onset_date TEXT,
  diagnosis_date TEXT,
  severity TEXT CHECK(severity IN ('mild', 'moderate', 'severe')),
  status TEXT CHECK(status IN ('active', 'resolved', 'chronic')) DEFAULT 'active',
  notes TEXT,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (person_id) REFERENCES family_people (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS family_person_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  person1_id INTEGER NOT NULL,
  person2_id INTEGER NOT NULL,
  relationship_type TEXT NOT NULL,
  is_biological BOOLEAN DEFAULT 1,
  notes TEXT,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
  FOREIGN KEY (person1_id) REFERENCES family_people (id) ON DELETE CASCADE,
  FOREIGN KEY (person2_id) REFERENCES family_people (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS family_person_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL,
  note_type TEXT DEFAULT 'general',
  note_text TEXT NOT NULL,
  created_by TEXT,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (person_id) REFERENCES family_people (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS family_pregnancies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  mother_id INTEGER NOT NULL,
  father_id INTEGER,
  pregnancy_outcome TEXT,
  gestational_age_weeks INTEGER,
  pregnancy_notes TEXT,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
  FOREIGN KEY (mother_id) REFERENCES family_people (id) ON DELETE CASCADE,
  FOREIGN KEY (father_id) REFERENCES family_people (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS family_genetic_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  test_name TEXT NOT NULL,
  test_date TEXT,
  test_results TEXT,
  notes TEXT,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS genetic_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_member_id INTEGER,
  test_name TEXT NOT NULL,
  test_date TEXT,
  result TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_member_id) REFERENCES family_members (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS family_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER,
  patient_id INTEGER,
  session_date TEXT,
  session_notes TEXT,
  session_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  family_member_id INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES family_sessions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_medical_conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  condition_name TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES family_sessions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_twin_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  group_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES family_sessions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_twin_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  twin_group_id INTEGER NOT NULL,
  family_member_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (twin_group_id) REFERENCES session_twin_groups (id) ON DELETE CASCADE,
  FOREIGN KEY (family_member_id) REFERENCES family_members (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_fhir_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  fhir_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES family_sessions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_import_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  import_type TEXT NOT NULL,
  import_status TEXT NOT NULL,
  import_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES family_sessions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pedigree_pdfs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER,
  pedigree_id INTEGER,
  file_name TEXT,
  file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
  FOREIGN KEY (pedigree_id) REFERENCES pedigrees (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS family_analysis_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  analysis_type TEXT NOT NULL,
  analysis_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webform_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  fhir_data TEXT NOT NULL,
  raw_data TEXT NOT NULL,
  completion_date TEXT,
  imported_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS report_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id INTEGER,
  content TEXT NOT NULL,
  variables TEXT,
  is_system INTEGER DEFAULT 0,
  created_by TEXT,
  user_id INTEGER,
  language TEXT DEFAULT 'pt-BR',
  format TEXT DEFAULT 'html',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generated_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT,
  template_id TEXT,
  pedigree_id INTEGER,
  family_id INTEGER,
  person_external_id TEXT,
  title TEXT,
  content TEXT,
  status TEXT,
  format TEXT,
  metadata TEXT,
  file_path TEXT,
  user_id INTEGER,
  generated_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedigree_id) REFERENCES pedigrees (id) ON DELETE CASCADE,
  FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS report_variables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT NOT NULL,
  variable_name TEXT NOT NULL,
  variable_value TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS template_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctor_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_name TEXT,
  crm_number TEXT,
  clinic_name TEXT,
  clinic_address TEXT,
  clinic_phone TEXT,
  clinic_email TEXT,
  doctor_signature_path TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

module.exports = {
  SCHEMA_SQL
};
