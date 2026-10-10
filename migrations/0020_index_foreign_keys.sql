-- Index every foreign-key child column which lacked a leading index.
-- Existing compound primary keys only cover their first column.
CREATE INDEX idx_anzsco_group_parent ON anzsco_group(parent_code);
CREATE INDEX idx_occupation_anzsco_release ON occupation_anzsco_map(dataset_release_id);
CREATE INDEX idx_occupation_anzsco_group ON occupation_anzsco_map(anzsco_code);
CREATE INDEX idx_market_snapshot_release ON market_snapshot(dataset_release_id);
CREATE INDEX idx_market_state_snapshot_release ON market_state_snapshot(dataset_release_id);
CREATE INDEX idx_occupation_qualification_release ON occupation_qualification(dataset_release_id);
CREATE INDEX idx_occupation_qualification_qualification ON occupation_qualification(qualification_code);
CREATE INDEX idx_occupation_skill_release ON occupation_skill(dataset_release_id);
CREATE INDEX idx_occupation_skill_skill ON occupation_skill(skill_code);
CREATE INDEX idx_profile_qualification ON profile(qualification_code);
CREATE INDEX idx_profile_career_goal ON profile(career_goal_code);
CREATE INDEX idx_profile_skill_skill ON profile_skill(skill_code);
CREATE INDEX idx_education_level_release ON education_level_option(dataset_release_id);
CREATE INDEX idx_degree_release ON degree_option(dataset_release_id);
CREATE INDEX idx_major_release ON major_option(dataset_release_id);
CREATE INDEX idx_degree_major_release ON degree_major_map(dataset_release_id);
CREATE INDEX idx_anzsco4_market_release ON anzsco4_market(dataset_release_id);
CREATE INDEX idx_anzsco4_state_vacancy_release ON anzsco4_state_vacancy(dataset_release_id);
CREATE INDEX idx_occupation_match_release ON occupation_match(dataset_release_id);
CREATE INDEX idx_profile_role_feedback_occupation ON profile_role_feedback(occupation_code);
CREATE INDEX idx_study_program_education ON study_program_map(education_code);
CREATE INDEX idx_study_knowledge_skill ON study_occupation_knowledge(skill_code);
CREATE INDEX idx_study_skill_skill ON study_skill_map(skill_code);
