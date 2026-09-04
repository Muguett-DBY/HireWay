-- The Jobs and Skills Australia outlook is published per four-digit ANZSCO
-- unit, so the market tables key on the ANZSCO group rather than the
-- six-digit OSCA occupation. occupation_anzsco_map already links the two.
CREATE TABLE anzsco4_market (
  anzsco4_code TEXT PRIMARY KEY REFERENCES anzsco_group(code),
  employed_may_2025 INTEGER,
  employed_may_2030 INTEGER,
  employed_may_2035 INTEGER,
  change_5y_percent REAL,
  change_10y_percent REAL,
  median_weekly_earnings REAL,
  vacancies_total REAL,
  dataset_release_id INTEGER NOT NULL REFERENCES dataset_release(id)
);

-- Vacancies are split by state so the dashboard can show where demand sits.
CREATE TABLE anzsco4_state_vacancy (
  anzsco4_code TEXT NOT NULL REFERENCES anzsco_group(code),
  state_code TEXT NOT NULL CHECK (
    state_code IN ('ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA')
  ),
  vacancy_count REAL NOT NULL,
  dataset_release_id INTEGER NOT NULL REFERENCES dataset_release(id),
  PRIMARY KEY (anzsco4_code, state_code, dataset_release_id)
);
