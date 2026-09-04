-- The discovery engine scores occupations against a user's profile in a
-- shared skill space. Scores are precomputed per occupation so a request
-- only aggregates over the few skills a user actually saved.
CREATE TABLE occupation_skill_vector (
  occupation_code TEXT NOT NULL REFERENCES occupation(code) ON DELETE CASCADE,
  skill_code TEXT NOT NULL REFERENCES skill(code) ON DELETE CASCADE,
  score REAL NOT NULL,
  PRIMARY KEY (occupation_code, skill_code)
);

CREATE INDEX idx_occupation_skill_vector_skill
ON occupation_skill_vector(skill_code);

-- One cached row per occupation keeps ranking data out of the hot path.
CREATE TABLE occupation_match (
  occupation_code TEXT PRIMARY KEY REFERENCES occupation(code) ON DELETE CASCADE,
  skill_norm REAL NOT NULL,
  growth_percentile REAL NOT NULL,
  riasec TEXT NOT NULL,
  dataset_release_id INTEGER NOT NULL REFERENCES dataset_release(id)
);

-- Quiz answers and the computed interest profile stay with the profile.
CREATE TABLE profile_interest (
  profile_code TEXT PRIMARY KEY REFERENCES profile(code) ON DELETE CASCADE,
  answers TEXT NOT NULL,
  riasec TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Deck reactions feed back into later suggestion runs.
CREATE TABLE profile_role_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_code TEXT NOT NULL REFERENCES profile(code) ON DELETE CASCADE,
  occupation_code TEXT NOT NULL REFERENCES occupation(code) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('not_for_me', 'curious', 'interested')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (profile_code, occupation_code)
);

-- OSCA publishes a 1-5 skill level per occupation; education alignment
-- compares it with the level the user picked in the wizard.
ALTER TABLE occupation ADD COLUMN skill_level INTEGER;
