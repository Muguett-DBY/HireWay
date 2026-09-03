-- Early profiles saved free-text skills without a catalogue link.
-- Match those names to the O*NET catalogue, ignoring case, so the stored
-- name becomes the official one and the row gains its skill code.
UPDATE profile_skill
SET skill_code = (
  SELECT s.code FROM skill s WHERE s.name = profile_skill.name COLLATE NOCASE
),
name = (
  SELECT s.name FROM skill s WHERE s.name = profile_skill.name COLLATE NOCASE
)
WHERE skill_code IS NULL
  AND EXISTS (
    SELECT 1 FROM skill s WHERE s.name = profile_skill.name COLLATE NOCASE
  );

-- Rows that match nothing cannot take part in occupation matching, so the
-- new catalogue-only rule removes them instead of leaving loose text.
DELETE FROM profile_skill
WHERE skill_code IS NULL;
