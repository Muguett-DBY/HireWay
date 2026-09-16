# Study-only recommendations

Apply after the existing reference, iteration-one and discovery imports:

```sh
npx wrangler d1 migrations apply hireway-db --local
python3 scripts/data/build_study_skills.py
npx wrangler d1 execute hireway-db --local --file data/generated/study_skills.sql
```

The generator uses the tracked `data/onet_knowledge.csv` and joins existing D1
catalogues. It never downloads data. Re-run it after reference data changes.
It replaces only the three feature-owned mapping tables, and upserts knowledge
catalogue items without deleting profiles or saved skills. Generated SQL is ignored
by Git. Remote migration/import is a separate deployment step, not performed by
these local commands. Do not deploy the API before creating and populating its tables.

## Provenance and limits

- `study_program_map`: ASCED subject to CIP program. Exact subject title matches
  (ignoring only the CIP suffix `, General`) plus three explicit subject equivalences
  for Law, General Nursing and Computer Science. Majors the exact rules miss fall
  back to a curated ASCED narrow-field to CIP family table in
  `scripts/data/build_study_skills.py` (one reviewed line per field, with
  sub-family precision such as Meteorology for Earth Sciences where it helps).
  Majors still producing nothing retry with their broad two-digit family. All
  rules are inspectable project mappings, not an official ASCED/CIP crosswalk.
  No fuzzy or broad-keyword match. Every field of study ends up with
  recommendations; the source column records which rule produced each link.
- `study_occupation_knowledge`: O*NET importance ratings normalised from 0–5 to 0–100;
  irrelevant entries and occupations absent from the catalogue are excluded.
- `study_skill_map`: aggregates distinct linked occupations' skill/tool/knowledge
  ratings. Mean importance must be at least 50. Ranking adds above-baseline importance
  and a capped supporting-occupation count; this is a ranking heuristic, not a
  probability or proof of course content. API returns up to four knowledge items,
  four tools and two skills. Knowledge labels are suffixed to distinguish them from
  existing same-named skills (e.g. Mathematics).

Courses use their stored ASCED fields. Ambiguous or absent links produce no results;
no title-based course fallback or generic filler is used. Multiple fields combine and
deduplicate by skill code. Target role and legacy educationCode are ignored.

Knowledge is selectable and saved through the existing skill API. Career recommendation
code and scoring are unchanged: every saved catalogue item still enters the original
user-vector calculation, including items without occupation vectors. Current vectors
do not include knowledge, so knowledge contributes no overlap but can increase the
user-vector norm and lower skill scores. Identical saved inputs retain identical
scoring behavior; newly selected items can change results. No filtering or vector
rebuild is introduced by this feature.

Run the read-only endpoint regression test against a populated local Worker:

```sh
node scripts/test-study-skills.mjs <path-to-local-D1.sqlite>
```

Test course and field display manually: Law should include Law and Government;
unmapped courses should state there are no recommendations. Existing saved skills
are hidden from suggestions. Network errors must be shown separately from no match.
