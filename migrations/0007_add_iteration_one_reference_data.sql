-- Keep the O*NET category used to present essential, transferable and tool items.
ALTER TABLE onet_occupation_skill
ADD COLUMN requirement_type TEXT NOT NULL DEFAULT 'skill'
CHECK (
  requirement_type IN ('skill', 'essential_skill', 'transferable_skill', 'tool')
);

-- Keep useful pathway notes with each Australian qualification link.
ALTER TABLE occupation_qualification
ADD COLUMN special_conditions TEXT NOT NULL DEFAULT '';

ALTER TABLE occupation_qualification
ADD COLUMN special_conditions_description TEXT NOT NULL DEFAULT '';

ALTER TABLE occupation_qualification
ADD COLUMN jobs_and_skills_council TEXT NOT NULL DEFAULT '';

-- These values populate the education-level menu from active CRICOS courses.
CREATE TABLE education_level_option (
  name TEXT PRIMARY KEY COLLATE NOCASE,
  active_course_count INTEGER NOT NULL CHECK (active_course_count >= 0),
  unique_course_name_count INTEGER NOT NULL CHECK (
    unique_course_name_count >= 0
  ),
  provider_count INTEGER NOT NULL CHECK (provider_count >= 0),
  dataset_release_id INTEGER NOT NULL REFERENCES dataset_release(id)
);

-- One option represents one normalised course name at one education level.
CREATE TABLE degree_option (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL COLLATE NOCASE,
  education_level TEXT NOT NULL COLLATE NOCASE,
  active_course_count INTEGER NOT NULL CHECK (active_course_count >= 0),
  provider_count INTEGER NOT NULL CHECK (provider_count >= 0),
  dataset_release_id INTEGER NOT NULL REFERENCES dataset_release(id),
  UNIQUE (title, education_level)
);

-- ASCED keeps Australian fields of education in a three-level hierarchy.
CREATE TABLE major_option (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL COLLATE NOCASE,
  narrow_field_code TEXT NOT NULL,
  narrow_field_name TEXT NOT NULL,
  broad_field_code TEXT NOT NULL,
  broad_field_name TEXT NOT NULL,
  dataset_release_id INTEGER NOT NULL REFERENCES dataset_release(id)
);

-- A CRICOS course can be linked to more than one detailed ASCED field.
CREATE TABLE degree_major_map (
  degree_code TEXT NOT NULL REFERENCES degree_option(code) ON DELETE CASCADE,
  major_code TEXT NOT NULL REFERENCES major_option(code) ON DELETE CASCADE,
  field_rank INTEGER NOT NULL CHECK (field_rank IN (1, 2)),
  dataset_release_id INTEGER NOT NULL REFERENCES dataset_release(id),
  PRIMARY KEY (degree_code, major_code)
);

CREATE INDEX idx_onet_skill_requirement_type
ON onet_occupation_skill(requirement_type);

CREATE INDEX idx_degree_option_title
ON degree_option(title COLLATE NOCASE);

CREATE INDEX idx_major_option_title
ON major_option(title COLLATE NOCASE);

CREATE INDEX idx_degree_major_major
ON degree_major_map(major_code);
