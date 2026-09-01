-- Keep standard education fields separate from a user's free-text profile.
CREATE TABLE education_program (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL COLLATE NOCASE,
  source TEXT NOT NULL
);

-- O*NET uses its own occupation codes, so keep them separate from OSCA.
CREATE TABLE onet_occupation (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL COLLATE NOCASE,
  description TEXT NOT NULL DEFAULT ''
);

-- CIP links fields of study to the occupations they can prepare people for.
CREATE TABLE education_onet_map (
  education_code TEXT NOT NULL REFERENCES education_program(code) ON DELETE CASCADE,
  onet_code TEXT NOT NULL REFERENCES onet_occupation(code) ON DELETE CASCADE,
  PRIMARY KEY (education_code, onet_code)
);

-- Store the source category so the page can distinguish skills from tools.
ALTER TABLE skill
ADD COLUMN kind TEXT NOT NULL DEFAULT 'skill';

ALTER TABLE skill
ADD COLUMN source TEXT NOT NULL DEFAULT '';

CREATE TABLE skill_alias (
  skill_code TEXT NOT NULL REFERENCES skill(code) ON DELETE CASCADE,
  alias TEXT NOT NULL COLLATE NOCASE,
  PRIMARY KEY (skill_code, alias)
);

-- Keep each O*NET rating attached to the occupation that supplied it.
CREATE TABLE onet_occupation_skill (
  onet_code TEXT NOT NULL REFERENCES onet_occupation(code) ON DELETE CASCADE,
  skill_code TEXT NOT NULL REFERENCES skill(code) ON DELETE CASCADE,
  score REAL NOT NULL CHECK (score BETWEEN 0 AND 100),
  hot_technology INTEGER NOT NULL DEFAULT 0 CHECK (hot_technology IN (0, 1)),
  in_demand INTEGER NOT NULL DEFAULT 0 CHECK (in_demand IN (0, 1)),
  PRIMARY KEY (onet_code, skill_code)
);

-- This bridge is generated from official ISCO and ESCO crosswalks.
CREATE TABLE occupation_onet_map (
  occupation_code TEXT NOT NULL REFERENCES occupation(code) ON DELETE CASCADE,
  onet_code TEXT NOT NULL REFERENCES onet_occupation(code) ON DELETE CASCADE,
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  method TEXT NOT NULL,
  PRIMARY KEY (occupation_code, onet_code)
);

-- Save optional catalogue codes without blocking free-text answers.
ALTER TABLE profile
ADD COLUMN qualification_code TEXT REFERENCES education_program(code) ON DELETE SET NULL;

ALTER TABLE profile
ADD COLUMN career_goal_code TEXT REFERENCES occupation(code) ON DELETE SET NULL;

ALTER TABLE profile_skill
ADD COLUMN skill_code TEXT REFERENCES skill(code) ON DELETE SET NULL;

CREATE INDEX idx_education_program_title ON education_program(title);
CREATE INDEX idx_onet_occupation_title ON onet_occupation(title);
CREATE INDEX idx_skill_name_nocase ON skill(name COLLATE NOCASE);
CREATE INDEX idx_skill_alias_alias ON skill_alias(alias);
CREATE INDEX idx_education_onet_code ON education_onet_map(onet_code);
CREATE INDEX idx_onet_skill_code ON onet_occupation_skill(skill_code);
CREATE INDEX idx_occupation_onet_code ON occupation_onet_map(onet_code);
