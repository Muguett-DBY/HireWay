-- Video learning progress: one row per saved skill being studied. Watching
-- sessions add seconds and push progress_pct forward; it never moves back.
CREATE TABLE profile_skill_progress (
  profile_code TEXT NOT NULL REFERENCES profile(code) ON DELETE CASCADE,
  skill_code TEXT NOT NULL,
  progress_pct INTEGER NOT NULL DEFAULT 0,
  seconds_total INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,
  last_session_at TEXT,
  PRIMARY KEY (profile_code, skill_code)
);

-- Roll-up of learning time on the saved skill row itself, so the skills
-- list can show invested minutes without joining the progress table.
ALTER TABLE profile_skill ADD COLUMN learning_minutes INTEGER NOT NULL DEFAULT 0;
