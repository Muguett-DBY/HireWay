-- Keep user-entered skills separate from the reference skill catalog.
CREATE TABLE profile_skill (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_code TEXT NOT NULL REFERENCES profile(code) ON DELETE CASCADE,
  name TEXT NOT NULL COLLATE NOCASE,

  -- Each profile can save a skill only once, regardless of ASCII letter case.
  UNIQUE (profile_code, name)
);