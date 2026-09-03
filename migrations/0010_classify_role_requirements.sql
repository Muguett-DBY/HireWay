-- Earlier imports used stable O*NET codes before the category column existed.
UPDATE onet_occupation_skill
SET requirement_type = CASE
  WHEN skill_code LIKE 'onet-skill:2.A.%' THEN 'essential_skill'
  WHEN skill_code LIKE 'onet-skill:2.B.%' THEN 'transferable_skill'
  WHEN skill_code LIKE 'onet-tool:%' THEN 'tool'
  ELSE requirement_type
END
WHERE requirement_type = 'skill';
