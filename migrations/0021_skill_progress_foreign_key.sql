-- D1 applies a migration as a transaction. Copy every existing row before
-- swapping tables, keeping all progress values and profile-delete cascades.
-- If a legacy orphan exists, the INSERT fails and the migration rolls back;
-- it must be investigated rather than silently deleting learning history.
CREATE TABLE profile_skill_progress_new (
  profile_code TEXT NOT NULL REFERENCES profile(code) ON DELETE CASCADE,
  skill_code TEXT NOT NULL REFERENCES skill(code) ON DELETE CASCADE,
  progress_pct INTEGER NOT NULL DEFAULT 0,
  seconds_total INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,
  last_session_at TEXT,
  PRIMARY KEY (profile_code, skill_code)
);

INSERT INTO profile_skill_progress_new
  (profile_code, skill_code, progress_pct, seconds_total, sessions, last_session_at)
SELECT profile_code, skill_code, progress_pct, seconds_total, sessions, last_session_at
FROM profile_skill_progress;

DROP TABLE profile_skill_progress;
ALTER TABLE profile_skill_progress_new RENAME TO profile_skill_progress;

CREATE INDEX idx_profile_skill_progress_skill ON profile_skill_progress(skill_code);
