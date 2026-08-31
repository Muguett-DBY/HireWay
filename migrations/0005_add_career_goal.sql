-- Keep one current career goal on each profile.
ALTER TABLE profile
ADD COLUMN career_goal TEXT NOT NULL DEFAULT '';
