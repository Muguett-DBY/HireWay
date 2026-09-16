-- Project-maintained ASCED/CIP links, not an official classification crosswalk.
CREATE TABLE study_program_map (
  major_code TEXT NOT NULL REFERENCES major_option(code) ON DELETE CASCADE,
  education_code TEXT NOT NULL REFERENCES education_program(code) ON DELETE CASCADE,
  source TEXT NOT NULL,
  PRIMARY KEY (major_code, education_code)
);

CREATE TABLE study_occupation_knowledge (
  onet_code TEXT NOT NULL REFERENCES onet_occupation(code) ON DELETE CASCADE,
  skill_code TEXT NOT NULL REFERENCES skill(code) ON DELETE CASCADE,
  score REAL NOT NULL CHECK(score BETWEEN 0 AND 100),
  PRIMARY KEY (onet_code, skill_code)
);

CREATE TABLE study_skill_map (
  major_code TEXT NOT NULL REFERENCES major_option(code) ON DELETE CASCADE,
  skill_code TEXT NOT NULL REFERENCES skill(code) ON DELETE CASCADE,
  relevance REAL NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (major_code, skill_code)
);
