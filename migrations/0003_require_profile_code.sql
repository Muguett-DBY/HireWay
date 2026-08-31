-- Every profile needs a recovery code.
CREATE TABLE profile_new (
  code TEXT PRIMARY KEY NOT NULL,
  qualification TEXT NOT NULL,
  education_level TEXT NOT NULL,
  current_role TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Keep existing details while replacing the table.
INSERT INTO profile_new (
  code, qualification, education_level, current_role, created_at, updated_at
)
SELECT
  code, qualification, education_level, current_role, created_at, updated_at
FROM profile;

-- Use the original table name for the corrected structure.
DROP TABLE profile;
ALTER TABLE profile_new RENAME TO profile;