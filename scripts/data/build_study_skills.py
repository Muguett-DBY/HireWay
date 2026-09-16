"""Generate a local-only SQL import using existing D1 catalogues and O*NET knowledge.

No fuzzy matching, title keywords, target roles or universal fallback lists.
ASCED/CIP links are project equivalences, never claimed as an official crosswalk.
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def build():
    statements = [
        "-- Requires migrations and populated reference + iteration-one catalogues.",
        "DELETE FROM study_skill_map;",
        "DELETE FROM study_program_map;",
        "DELETE FROM study_occupation_knowledge;",
    ]
    with (ROOT / 'data/onet_knowledge.csv').open(encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.DictReader(stream))
    names = {}
    for row in rows:
        names['onet-knowledge:' + row['element_id']] = row['element_name']
    for code, name in sorted(names.items()):
        statements.append(
            'INSERT INTO skill(code,name,description,kind,source) VALUES('
            f"{quote(code)},{quote(name + ' (knowledge)')},'Occupational knowledge from US O*NET','knowledge','O*NET') "
            'ON CONFLICT(code) DO UPDATE SET description=excluded.description;'
        )
    for row in rows:
        if not row['importance'] or row['not_relevant'] == 'Y':
            continue
        score = float(row['importance']) * 20
        if not 0 <= score <= 100:
            raise ValueError('Invalid O*NET importance')
        statements.append(
            'INSERT INTO study_occupation_knowledge(onet_code,skill_code,score) '
            f"SELECT {quote(row['onet_soc_code'])},{quote('onet-knowledge:' + row['element_id'])},{score} "
            f"WHERE EXISTS(SELECT 1 FROM onet_occupation WHERE code={quote(row['onet_soc_code'])}) "
            'ON CONFLICT(onet_code,skill_code) DO UPDATE SET score=excluded.score;'
        )
    # Exact titles, ignoring a trailing CIP ', General' only. No broad word matches.
    statements.append("""
INSERT INTO study_program_map
SELECT m.code,e.code,'ASCED/CIP exact subject title (project rule)'
FROM major_option m JOIN education_program e
ON lower(trim(m.title)) = lower(trim(CASE WHEN e.title LIKE '%, General'
THEN substr(e.title,1,length(e.title)-9) ELSE e.title END));
""")
    # Explicit subject equivalences; narrowly scoped, inspectable and versioned.
    aliases = [('090999', 'CIP:22.0101', 'Law, n.e.c. / Law'),
               ('060301', 'CIP:51.3801', 'General Nursing / Registered Nursing'),
               ('020199', 'CIP:11.0701', 'Computer Science, n.e.c. / Computer Science')]
    for major, cip, note in aliases:
        statements.append(
            'INSERT OR IGNORE INTO study_program_map '
            f'SELECT {quote(major)},{quote(cip)},{quote("Project subject equivalence: " + note)} '
            f'WHERE EXISTS(SELECT 1 FROM major_option WHERE code={quote(major)}) '
            f'AND EXISTS(SELECT 1 FROM education_program WHERE code={quote(cip)});'
        )
    statements.append("""
INSERT INTO study_skill_map
WITH ratings AS (
 SELECT onet_code,skill_code,score FROM onet_occupation_skill
 UNION ALL SELECT onet_code,skill_code,score FROM study_occupation_knowledge
), baseline AS (
 SELECT skill_code,AVG(score) mean_score FROM ratings GROUP BY skill_code
), linked AS (
 SELECT DISTINCT p.major_code,r.onet_code,r.skill_code,r.score
 FROM study_program_map p JOIN education_onet_map e ON e.education_code=p.education_code
 JOIN ratings r ON r.onet_code=e.onet_code
), ranked AS (
 SELECT l.major_code,l.skill_code,AVG(l.score) average_score,
        COUNT(*) occupation_count, b.mean_score
 FROM linked l JOIN baseline b ON b.skill_code=l.skill_code
 GROUP BY l.major_code,l.skill_code
)
SELECT major_code,skill_code,
 average_score + MAX(0,average_score-mean_score) + MIN(10,occupation_count),
 'ASCED/CIP subject link -> CIP/O*NET occupations -> O*NET ratings'
FROM ranked WHERE average_score >= 50;
""")
    destination = ROOT / 'data/generated/study_skills.sql'
    destination.parent.mkdir(exist_ok=True)
    destination.write_text('\n'.join(statements), encoding='utf-8')
    print(f'Generated {destination}; {len(names)} knowledge categories.')


if __name__ == '__main__':
    build()
