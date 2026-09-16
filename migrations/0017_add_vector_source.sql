-- Match quality: record where each occupation's skill vector came from, so
-- the ranking can weight direct O*NET links above group-level inference.
ALTER TABLE occupation_match
ADD COLUMN vector_source TEXT NOT NULL DEFAULT 'group';
