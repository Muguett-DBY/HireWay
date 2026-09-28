"""Generate a local-only SQL import using existing D1 catalogues and O*NET knowledge.

No fuzzy matching, title keywords, target roles or universal fallback lists.
ASCED/CIP links are project equivalences, never claimed as an official crosswalk.
Exact subject title links come first; narrow fields without any exact link fall
back to a curated ASCED narrow-field to CIP two-digit family table below, so
every field of study keeps a subject-shaped recommendation set.
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Curated ASCED narrow-field (first four digits of the major code) to CIP
# two-digit family equivalences. One line per field, same spirit as the three
# explicit aliases below: hand-reviewed, versioned and never fuzzy. Family
# links are only applied to majors the exact-title rules did not cover, so
# existing recommendations never change.
NARROW_FIELD_FAMILIES = {
    '0101': ['27'],          # Mathematical Sciences -> Mathematics
    '0105': ['40.05', '40.10'],  # Chemical Sciences -> Chemistry, Materials Sciences
    '0107': ['40.04', '40.06'],  # Earth Sciences -> Meteorology, Geology and Geoscience
    '0109': ['26'],          # Biological Sciences -> Biological Sciences
    '0199': ['40', '26'],    # Other Natural and Physical Sciences
    '0201': ['11'],          # Computer Science -> Computer and Information Sciences
    '0203': ['11', '52'],    # Information Systems -> Computer Science, Business
    '0299': ['11'],          # Other Information Technology
    '0301': ['14', '15'],    # Manufacturing Engineering and Technology
    '0303': ['14'],          # Process and Resources Engineering
    '0305': ['15'],          # Automotive Engineering and Technology
    '0307': ['14'],          # Mechanical and Industrial Engineering and Technology
    '0309': ['14'],          # Civil Engineering
    '0311': ['15'],          # Geomatic Engineering -> Engineering Technologies (surveying)
    '0313': ['14', '15'],    # Electrical and Electronic Engineering and Technology
    '0315': ['14', '15'],    # Aerospace Engineering and Technology
    '0317': ['14', '15', '49'],  # Maritime Engineering and Technology
    '0399': ['14', '15'],    # Other Engineering and Related Technologies
    '0401': ['04'],          # Architecture and Urban Environment
    '0403': ['46', '52'],    # Building -> Construction Trades, Construction Management
    '0501': ['01'],          # Agriculture
    '0503': ['01'],          # Horticulture and Viticulture
    '0505': ['03'],          # Forestry Studies -> Natural Resources and Conservation
    '0507': ['03'],          # Fisheries Studies
    '0509': ['03'],          # Environmental Studies
    '0599': ['01', '03'],    # Other Agriculture, Environmental and Related Studies
    # Health maps to CIP sub-families, not the whole 51 tree: the full
    # family pulls two hundred occupations and hospital-IT tooling swamps
    # the clinical core each sub-field actually teaches.
    '0601': ['51.12', '51.14'],  # Medical Studies -> Medicine, Medical Science
    '0603': ['51.38', '51.39'],  # Nursing -> Registered and Practical Nursing
    '0605': ['51.20'],           # Pharmacy
    '0607': ['51.04', '51.05'],  # Dental Studies -> Dentistry, Advanced Dentistry
    '0609': ['51.17', '51.18'],  # Optical Science -> Optometry, Opticianry
    '0611': ['01.80', '01.81'],  # Veterinary Studies
    '0613': ['51.22'],           # Public Health
    '0615': ['51.09'],           # Radiography -> Diagnostic and Treatment Services
    '0617': ['51.23'],           # Rehabilitation Therapies
    '0619': ['51.33', '51.35', '51.36', '51.37'],  # Complementary Therapies
    '0699': ['51'],              # Other Health
    '0701': ['13'],          # Teacher Education -> Education
    '0703': ['13'],          # Curriculum and Education Studies
    '0799': ['13'],          # Other Education
    '0803': ['52'],          # Business and Management
    '0805': ['52'],          # Sales and Marketing
    '0807': ['52'],          # Tourism -> Business (hospitality and tourism management)
    '0809': ['52'],          # Office Studies
    '0811': ['52'],          # Banking, Finance and Related Fields
    '0899': ['52'],          # Other Management and Commerce
    '0901': ['45'],          # Political Science and Policy Studies -> Social Sciences
    '0903': ['45'],          # Studies in Human Society
    '0905': ['44', '19'],    # Human Welfare Studies and Services -> Public Administration, Human Sciences
    '0907': ['42', '45'],    # Behavioural Science -> Psychology, Social Sciences
    '0909': ['22'],          # Law -> Legal Professions and Studies
    '0911': ['43'],          # Justice and Law Enforcement -> Homeland Security and Law Enforcement
    '0913': ['25', '11'],    # Librarianship and Information Management -> Library Science, Computer Science
    '0915': ['16', '23'],    # Language and Literature -> Foreign Languages, English
    '0917': ['38', '39'],    # Philosophy and Religious Studies
    '0919': ['45'],          # Economics and Econometrics -> Social Sciences
    '0921': ['31'],          # Sport and Recreation -> Parks, Recreation and Fitness
    '0999': ['45', '42'],    # Other Society and Culture
    '1001': ['50'],          # Performing Arts -> Visual and Performing Arts
    '1003': ['50'],          # Visual Arts and Crafts
    '1005': ['50'],          # Graphic and Design Studies
    '1007': ['09'],          # Communication and Media Studies
    '1099': ['50'],          # Other Creative Arts
    '1101': ['12', '52'],    # Food and Hospitality -> Personal and Culinary Services, Business
    '1103': ['12'],          # Personal Services -> Personal and Culinary Services
    '1201': ['24', '13'],    # General Education Programmes -> Liberal Arts, Education
    '1203': ['13'],          # Social Skills Programmes
    '1205': ['13'],          # Employment Skills Programmes
    '1299': ['30'],          # Other Mixed Field Programmes -> Multidisciplinary Studies
}


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
    # Narrow-field family links fill the majors the exact-title rules missed.
    # Each uncovered major joins every CIP program in its subject family, which
    # trades some precision for complete coverage; exact links always win
    # because this pass skips majors that already have one.
    family_pairs = ',\n  '.join(
        '(' + quote(narrow) + ',' + quote(family) + ')'
        for narrow, families in sorted(NARROW_FIELD_FAMILIES.items())
        for family in families
    )
    statements.append(f"""
WITH nf(narrow_code,family) AS (VALUES
  {family_pairs}
)
INSERT OR IGNORE INTO study_program_map
SELECT DISTINCT m.code,e.code,'ASCED narrow-field to CIP family (project rule)'
FROM major_option m
JOIN nf ON substr(m.code,1,4)=nf.narrow_code
JOIN education_program e ON e.code LIKE 'CIP:' || nf.family ||
    CASE WHEN nf.family LIKE '%.%' THEN '%' ELSE '.%' END
WHERE NOT EXISTS(SELECT 1 FROM study_program_map p WHERE p.major_code=m.code);
""")
    # Shared aggregation block: links majors' programs to O*NET ratings and
    # ranks each skill above the all-occupations baseline for its category.
    # A skill must be asked for by at least two linked occupations and by a
    # meaningful slice of them (15 percent, floor of two), so one software
    # title rated by a couple of stray professions cannot dominate a large
    # field. Family links also skip crosswalk generalists - statisticians,
    # generic managers and similar research jobs the crosswalk spreads across
    # every subject, whose quantitative toolkits overwhelm softer fields.
    # Exact subject links keep them, so Statistics still keeps statisticians.
    # Knowledge doubles its lift over baseline because generic knowledge
    # such as English language scores highly everywhere; tools take no lift
    # so a rare tool cannot out-rank the field's everyday ones. The baseline is global, so chunked runs cannot change
    # the result; chunks keep every statement inside remote D1 time limits.
    aggregate_sql = """
INSERT INTO study_skill_map
WITH ratings AS (
 SELECT onet_code,skill_code,score FROM onet_occupation_skill
 UNION ALL SELECT onet_code,skill_code,score FROM study_occupation_knowledge
), baseline AS (
 SELECT skill_code,AVG(score) mean_score FROM ratings GROUP BY skill_code
), bridge(onet_code) AS (VALUES
  ('15-2021.00'),('15-2041.00'),('15-2041.01'),('19-3022.00'),
  ('13-2099.01'),('19-1042.00'),('11-9199.00'),('11-9199.01'),
  ('11-9199.02'),('11-9199.08'),('11-9121.00'),('11-9121.01'),
  ('11-9121.02'),('13-1111.00'),('13-2099.00'),('13-2099.04'),
  ('17-2199.00'),('17-2199.03'),('17-2199.05'),('17-2199.06'),
  ('17-2199.07'),('17-2199.08'),('17-2199.09'),('17-2199.10'),('17-2199.11')
), linked AS (
 SELECT DISTINCT p.major_code,r.onet_code,r.skill_code,r.score
 FROM study_program_map p
 JOIN education_onet_map e ON e.education_code=p.education_code
 JOIN ratings r ON r.onet_code=e.onet_code
 WHERE substr(p.major_code,1,2)='{chunk}'
   AND (p.source NOT LIKE '%family%' OR r.onet_code NOT IN (SELECT onet_code FROM bridge))
), field_size AS (
 SELECT major_code,COUNT(DISTINCT onet_code) linked_total FROM linked GROUP BY major_code
), ranked AS (
 SELECT l.major_code,l.skill_code,AVG(l.score) average_score,
        COUNT(*) occupation_count, b.mean_score
 FROM linked l JOIN baseline b ON b.skill_code=l.skill_code
 GROUP BY l.major_code,l.skill_code
)
SELECT ranked.major_code,ranked.skill_code,
 ranked.average_score + (CASE sk.kind
   WHEN 'knowledge' THEN 2 WHEN 'tool' THEN 0 ELSE 1 END)
   * MAX(0,ranked.average_score-mean_score)
   + CASE sk.kind WHEN 'tool'
     THEN 10.0*ranked.occupation_count/f.linked_total
     ELSE MIN(10,ranked.occupation_count) END,
 'ASCED/CIP subject link -> CIP/O*NET occupations -> O*NET ratings'
FROM ranked JOIN field_size f ON f.major_code=ranked.major_code
JOIN skill sk ON sk.code=ranked.skill_code
WHERE average_score >= 50
  AND occupation_count >= MAX(2,CAST(0.15*f.linked_total AS INT));
"""
    # One chunk per ASCED broad field (first two digits of the major code).
    for broad_field in ['01', '02', '03', '04', '05', '06',
                        '07', '08', '09', '10', '11', '12']:
        statements.append(aggregate_sql.format(chunk=broad_field))
    # Coverage fallback: majors whose family links produced no qualifying rows
    # (typically the fine sub-families above) retry with their broad CIP
    # two-digit family, so every field of study keeps recommendations.
    broad_pairs = ',\n  '.join(
        '(' + quote(narrow) + ',' + quote(sorted({family.split('.')[0] for family in families})[0]) + ')'
        for narrow, families in sorted(NARROW_FIELD_FAMILIES.items())
    )
    statements.append(f"""
WITH nf(narrow_code,family) AS (VALUES
  {broad_pairs}
)
INSERT INTO study_skill_map
WITH ratings AS (
 SELECT onet_code,skill_code,score FROM onet_occupation_skill
 UNION ALL SELECT onet_code,skill_code,score FROM study_occupation_knowledge
), baseline AS (
 SELECT skill_code,AVG(score) mean_score FROM ratings GROUP BY skill_code
), bridge(onet_code) AS (VALUES
  ('15-2021.00'),('15-2041.00'),('15-2041.01'),('19-3022.00'),
  ('13-2099.01'),('19-1042.00'),('11-9199.00'),('11-9199.01'),
  ('11-9199.02'),('11-9199.08'),('11-9121.00'),('11-9121.01'),
  ('11-9121.02'),('13-1111.00'),('13-2099.00'),('13-2099.04'),
  ('17-2199.00'),('17-2199.03'),('17-2199.05'),('17-2199.06'),
  ('17-2199.07'),('17-2199.08'),('17-2199.09'),('17-2199.10'),('17-2199.11')
), linked AS (
 SELECT DISTINCT m.code major_code,r.onet_code,r.skill_code,r.score
 FROM major_option m
 JOIN nf ON substr(m.code,1,4)=nf.narrow_code
 JOIN education_program e ON e.code LIKE 'CIP:' || nf.family ||
    CASE WHEN nf.family LIKE '%.%' THEN '%' ELSE '.%' END
 JOIN education_onet_map em ON em.education_code=e.code
 JOIN ratings r ON r.onet_code=em.onet_code
 WHERE m.code NOT IN (SELECT DISTINCT major_code FROM study_skill_map)
   AND r.onet_code NOT IN (SELECT onet_code FROM bridge)
), field_size AS (
 SELECT major_code,COUNT(DISTINCT onet_code) linked_total FROM linked GROUP BY major_code
), ranked AS (
 SELECT l.major_code,l.skill_code,AVG(l.score) average_score,
        COUNT(*) occupation_count, b.mean_score
 FROM linked l JOIN baseline b ON b.skill_code=l.skill_code
 GROUP BY l.major_code,l.skill_code
)
SELECT ranked.major_code,ranked.skill_code,
 ranked.average_score + (CASE sk.kind
   WHEN 'knowledge' THEN 2 WHEN 'tool' THEN 0 ELSE 1 END)
   * MAX(0,ranked.average_score-mean_score)
   + CASE sk.kind WHEN 'tool'
     THEN 10.0*ranked.occupation_count/f.linked_total
     ELSE MIN(10,ranked.occupation_count) END,
 'ASCED narrow-field broad family -> CIP/O*NET occupations -> O*NET ratings'
FROM ranked JOIN field_size f ON f.major_code=ranked.major_code
JOIN skill sk ON sk.code=ranked.skill_code
WHERE average_score >= 50
  AND occupation_count >= MAX(2,CAST(0.15*f.linked_total AS INT));
""")
    # Last resort: a major still empty after the gated fallback (its subject
    # family may only reach bridge occupations) retries the same broad family
    # without the bridge filter, because some recommendation beats none.
    statements.append(f"""
WITH nf(narrow_code,family) AS (VALUES
  {broad_pairs}
)
INSERT INTO study_skill_map
WITH ratings AS (
 SELECT onet_code,skill_code,score FROM onet_occupation_skill
 UNION ALL SELECT onet_code,skill_code,score FROM study_occupation_knowledge
), baseline AS (
 SELECT skill_code,AVG(score) mean_score FROM ratings GROUP BY skill_code
), linked AS (
 SELECT DISTINCT m.code major_code,r.onet_code,r.skill_code,r.score
 FROM major_option m
 JOIN nf ON substr(m.code,1,4)=nf.narrow_code
 JOIN education_program e ON e.code LIKE 'CIP:' || nf.family ||
    CASE WHEN nf.family LIKE '%.%' THEN '%' ELSE '.%' END
 JOIN education_onet_map em ON em.education_code=e.code
 JOIN ratings r ON r.onet_code=em.onet_code
 WHERE m.code NOT IN (SELECT DISTINCT major_code FROM study_skill_map)
), ranked AS (
 SELECT l.major_code,l.skill_code,AVG(l.score) average_score,
        COUNT(*) occupation_count, b.mean_score
 FROM linked l JOIN baseline b ON b.skill_code=l.skill_code
 GROUP BY l.major_code,l.skill_code
)
SELECT ranked.major_code,ranked.skill_code,
 ranked.average_score + (CASE sk.kind
   WHEN 'knowledge' THEN 2 WHEN 'tool' THEN 0 ELSE 1 END)
   * MAX(0,ranked.average_score-mean_score)
   + MIN(CASE sk.kind WHEN 'tool' THEN 2 ELSE 10 END, ranked.occupation_count),
 'ASCED narrow-field broad family, bridges included -> CIP/O*NET occupations -> O*NET ratings'
FROM ranked JOIN skill sk ON sk.code=ranked.skill_code
WHERE average_score >= 50 AND occupation_count >= 2;
""")
    destination = ROOT / 'data/generated/study_skills.sql'
    destination.parent.mkdir(exist_ok=True)
    destination.write_text('\n'.join(statements), encoding='utf-8')
    print(f'Generated {destination}; {len(names)} knowledge categories.')


if __name__ == '__main__':
    build()
