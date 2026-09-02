-- Keep the selected occupation separate from the user's broader career goal.
ALTER TABLE profile
ADD COLUMN target_role_code TEXT REFERENCES occupation(code) ON DELETE SET NULL;

-- Preserve recognised occupation choices saved before the two fields were split.
UPDATE profile
SET target_role_code = career_goal_code
WHERE career_goal_code IS NOT NULL;

CREATE INDEX idx_profile_target_role_code
ON profile(target_role_code);
