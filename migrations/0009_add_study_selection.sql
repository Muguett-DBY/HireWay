-- Keep the selected Australian course and field available for later analysis.
ALTER TABLE profile
ADD COLUMN degree_code TEXT REFERENCES degree_option(code) ON DELETE SET NULL;

ALTER TABLE profile
ADD COLUMN major_code TEXT REFERENCES major_option(code) ON DELETE SET NULL;

CREATE INDEX idx_profile_degree_code ON profile(degree_code);
CREATE INDEX idx_profile_major_code ON profile(major_code);
