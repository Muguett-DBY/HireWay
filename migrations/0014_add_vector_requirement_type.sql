-- Skills in the precomputed vector now carry their O*NET category so the
-- role page can rank essential skills, transferable skills and tools from
-- one table for every occupation.
ALTER TABLE occupation_skill_vector
ADD COLUMN requirement_type TEXT NOT NULL DEFAULT 'tool';
