-- Progress tracking for iteration 2: every saved skill carries a status so
-- the dashboard can separate what the profile has, what is being learned and
-- what is planned next. Existing rows keep working as current skills.
ALTER TABLE profile_skill
ADD COLUMN status TEXT NOT NULL DEFAULT 'current';
