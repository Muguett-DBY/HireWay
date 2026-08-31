-- Store the background details needed for US1.1.
CREATE TABLE profile (
  code TEXT PRIMARY KEY,
  qualification TEXT NOT NULL,
  education_level TEXT NOT NULL,
  current_role TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);