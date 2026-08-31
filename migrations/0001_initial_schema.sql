PRAGMA foreign_keys = ON;

CREATE TABLE data_source (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  publisher TEXT NOT NULL,
  source_url TEXT NOT NULL,
  licence TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  accessed_on TEXT NOT NULL
);

CREATE TABLE dataset_release (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data_source_id INTEGER NOT NULL REFERENCES data_source(id),
  release_label TEXT NOT NULL,
  published_on TEXT,
  source_file TEXT NOT NULL,
  checksum_sha256 TEXT,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (data_source_id, release_label, source_file)
);

CREATE TABLE anzsco_group (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  classification_level INTEGER NOT NULL CHECK (
    classification_level BETWEEN 1 AND 5
  ),
  parent_code TEXT REFERENCES anzsco_group(code)
);

CREATE TABLE occupation (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE occupation_alias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occupation_code TEXT NOT NULL REFERENCES occupation(code) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  UNIQUE (occupation_code, alias)
);

CREATE TABLE occupation_task (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occupation_code TEXT NOT NULL REFERENCES occupation(code) ON DELETE CASCADE,
  task TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (occupation_code, task)
);

CREATE TABLE occupation_anzsco_map (
  occupation_code TEXT NOT NULL REFERENCES occupation(code) ON DELETE CASCADE,
  anzsco_code TEXT NOT NULL REFERENCES anzsco_group(code),
  dataset_release_id INTEGER NOT NULL REFERENCES dataset_release(id),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  PRIMARY KEY (occupation_code, anzsco_code, dataset_release_id)
);

CREATE TABLE market_snapshot (
  occupation_code TEXT NOT NULL REFERENCES occupation(code) ON DELETE CASCADE,
  period TEXT NOT NULL,
  employed_count INTEGER,
  annual_growth_percent REAL,
  median_weekly_earnings REAL,
  dataset_release_id INTEGER NOT NULL REFERENCES dataset_release(id),
  PRIMARY KEY (occupation_code, period, dataset_release_id)
);

CREATE TABLE market_state_snapshot (
  occupation_code TEXT NOT NULL REFERENCES occupation(code) ON DELETE CASCADE,
  state_code TEXT NOT NULL CHECK (
    state_code IN ('ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA')
  ),
  period TEXT NOT NULL,
  employed_count INTEGER,
  vacancy_count INTEGER,
  dataset_release_id INTEGER NOT NULL REFERENCES dataset_release(id),
  PRIMARY KEY (
    occupation_code,
    state_code,
    period,
    dataset_release_id
  )
);

CREATE TABLE qualification (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  qualification_level TEXT NOT NULL,
  field_of_education TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT ''
);

CREATE TABLE occupation_qualification (
  occupation_code TEXT NOT NULL REFERENCES occupation(code) ON DELETE CASCADE,
  qualification_code TEXT NOT NULL REFERENCES qualification(code) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  dataset_release_id INTEGER NOT NULL REFERENCES dataset_release(id),
  PRIMARY KEY (
    occupation_code,
    qualification_code,
    dataset_release_id
  )
);

CREATE TABLE skill (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE occupation_skill (
  occupation_code TEXT NOT NULL REFERENCES occupation(code) ON DELETE CASCADE,
  skill_code TEXT NOT NULL REFERENCES skill(code) ON DELETE CASCADE,
  importance_score REAL CHECK (
    importance_score BETWEEN 0 AND 100
  ),
  dataset_release_id INTEGER NOT NULL REFERENCES dataset_release(id),
  PRIMARY KEY (occupation_code, skill_code, dataset_release_id)
);

CREATE INDEX idx_occupation_title ON occupation(title);
CREATE INDEX idx_occupation_alias_alias ON occupation_alias(alias);
CREATE INDEX idx_market_snapshot_period ON market_snapshot(period);
CREATE INDEX idx_market_state_period ON market_state_snapshot(state_code, period);
CREATE INDEX idx_qualification_title ON qualification(title);
CREATE INDEX idx_skill_name ON skill(name);
