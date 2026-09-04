"""Build the discovery engine tables from the exported O*NET snapshots."""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
from collections import defaultdict
from datetime import date
from pathlib import Path

from build_iteration_one_data import (
    batched,
    insert_many,
    insert_with_release,
    sql_value,
)

ROOT = Path(__file__).resolve().parents[2]
GENERATED_DIR = ROOT / "data" / "generated"
SQL_PATH = GENERATED_DIR / "discovery_data.sql"
REPORT_PATH = GENERATED_DIR / "discovery_report.json"
SOURCE_DIR = ROOT / "data" / "sources" / "discovery"
MARKET_CSV = (
    ROOT / "data" / "sources" / "market" / "hireway_role_market_anzsco4.csv"
)
CATALOG_CSV = (
    ROOT / "data" / "sources" / "iteration-1" / "hireway_role_catalog_osca.csv"
)

SOURCE_NAME = "O*NET 31.0"
RELEASE_LABEL = "discovery_vectors"

# The catalog file carries a trailing attribution line that parses as a row.
OSCA_CODE = re.compile(r"^\d{6}$")
# Inferred vectors keep a bounded top slice so the import stays small.
INFERRED_TOP_SKILLS = 150
INFERRED_MIN_SCORE = 3.0

RIASEC_TYPES = ("Realistic", "Investigative", "Artistic", "Social",
                "Enterprising", "Conventional")


def read_rows(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


TYPE_RANK = {"essential_skill": 0, "transferable_skill": 1, "tool": 2}


def majority_type(types: list[str]) -> str:
    """Pick the most common category, with the more central one winning ties."""

    counts = defaultdict(int)
    for kind in types:
        counts[kind] += 1
    return min(counts, key=lambda kind: (-counts[kind], TYPE_RANK.get(kind, 3)))


def build_vectors(
    skill_rows: list[dict], map_rows: list[dict]
) -> tuple[dict[str, dict[str, float]], dict[str, list[str]], dict[str, dict[str, str]]]:
    """Average skill scores across the O*NET occupations behind each role."""

    onet_by_skill: dict[str, dict[str, list[tuple[float, str]]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for row in skill_rows:
        onet_by_skill[row["onet_code"]][row["skill_code"]].append(
            (float(row["score"]), row["requirement_type"])
        )

    vectors: dict[str, dict[str, float]] = {}
    types: dict[str, dict[str, str]] = {}
    for link in map_rows:
        occupation_code = link["occupation_code"]
        scores: dict[str, list[float]] = defaultdict(list)
        seen_types: dict[str, list[str]] = defaultdict(list)
        for onet_code in link["onet_code"].split(", "):
            for skill_code, entries in onet_by_skill.get(onet_code, {}).items():
                for score, requirement_type in entries:
                    scores[skill_code].append(score)
                    seen_types[skill_code].append(requirement_type)
        vectors[occupation_code] = {
            skill_code: sum(values) / len(values)
            for skill_code, values in scores.items()
        }
        types[occupation_code] = {
            skill_code: majority_type(kinds)
            for skill_code, kinds in seen_types.items()
        }
    return vectors, {
        link["occupation_code"]: link["onet_code"].split(", ")
        for link in map_rows
    }, types


def build_interest_profiles(
    interest_rows: list[dict], onet_codes_by_occupation: dict[str, list[str]]
) -> dict[str, dict[str, float]]:
    """Average the RIASEC high-point scores of the linked O*NET occupations."""

    scores_by_onet: dict[str, dict[str, float]] = defaultdict(dict)
    for row in interest_rows:
        interest_type = row["interest_type"]
        if interest_type not in RIASEC_TYPES:
            continue
        scores_by_onet[row["onet_soc_code"]][interest_type] = float(
            row["score"]
        )

    profiles: dict[str, dict[str, float]] = {}
    for occupation_code, onet_codes in onet_codes_by_occupation.items():
        type_totals: dict[str, list[float]] = defaultdict(list)
        for onet_code in onet_codes:
            for interest_type, score in scores_by_onet.get(
                onet_code, {}
            ).items():
                type_totals[interest_type].append(score)
        if not type_totals:
            continue
        profiles[occupation_code] = {
            interest_type: sum(type_totals[interest_type])
            / len(type_totals[interest_type])
            for interest_type in RIASEC_TYPES
            if interest_type in type_totals
        }
    return profiles


def build_growth_percentiles(
    vectors: dict[str, dict[str, float]],
    osca_to_anzsco: dict[str, str],
) -> dict[str, float]:
    """Rank every modelled role by its five-year projected growth."""

    growth_by_code: dict[str, float] = {}
    for row in read_rows(MARKET_CSV):
        try:
            growth_by_code[row["anzsco4_code"]] = float(row["change_5y_pct"])
        except ValueError:
            continue

    values: dict[str, float] = {}
    for occupation_code in vectors:
        anzsco4 = osca_to_anzsco.get(occupation_code)
        if anzsco4 in growth_by_code:
            values[occupation_code] = growth_by_code[anzsco4]

    # Occupations without a projection share the neutral middle rank.
    ranked = sorted(values.values())
    count = len(ranked) or 1
    percentiles = {
        code: (ranked.index(value) + 0.5) / count
        for code, value in values.items()
    }
    return {
        code: percentiles.get(code, 0.5) for code in vectors
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()

    skill_rows = read_rows(SOURCE_DIR / "onet_occupation_skill.csv")
    map_rows = read_rows(SOURCE_DIR / "occupation_onet_map.csv")
    # The mapping file stores one O*NET code per row.
    map_rows = [
        {"occupation_code": row["occupation_code"], "onet_code": row["onet_code"]}
        for row in map_rows
    ]
    # Group the O*NET codes by occupation for the averaging helpers.
    grouped: dict[str, list[str]] = defaultdict(list)
    for row in map_rows:
        grouped[row["occupation_code"]].append(row["onet_code"])
    map_rows = [
        {"occupation_code": code, "onet_code": ", ".join(codes)}
        for code, codes in grouped.items()
    ]

    interest_rows = read_rows(SOURCE_DIR / "onet_career_interest_types.csv")

    vectors, onet_codes_by_occupation, vector_types = build_vectors(
        skill_rows, map_rows
    )
    # Occupations whose O*NET links carry no skill rows would poison the
    # group averages with empty vectors, so they are dropped before grouping.
    vectors = {
        occupation_code: scores
        for occupation_code, scores in vectors.items()
        if scores
    }
    interest_profiles = build_interest_profiles(
        interest_rows, onet_codes_by_occupation
    )

    # Map every catalogued occupation onto its primary ANZSCO group.
    osca_to_anzsco: dict[str, str] = {}
    catalog_rows = []
    for row in read_rows(CATALOG_CSV):
        code = row["osca_code"].strip()
        if not OSCA_CODE.fullmatch(code):
            continue
        catalog_rows.append(row)
        mapped = [
            code[:4] for code in row["mapped_anzsco_codes"].split(";")
            if code.strip()[:4].isdigit()
        ]
        if mapped:
            osca_to_anzsco[code] = mapped[0]
    anzsco_to_oscas: dict[str, list[str]] = defaultdict(list)
    for osca_code, anzsco4 in osca_to_anzsco.items():
        anzsco_to_oscas[anzsco4].append(osca_code)

    growth_percentiles = build_growth_percentiles(vectors, osca_to_anzsco)

    # Occupations without their own O*NET bridge inherit the mean vector of
    # their ANZSCO group, so the suggestion engine can rank every role.
    group_vectors: dict[str, dict[str, float]] = {}
    group_members: dict[str, list[str]] = defaultdict(list)
    for occupation_code in vectors:
        anzsco4 = osca_to_anzsco.get(occupation_code)
        if anzsco4:
            group_members[anzsco4].append(occupation_code)
    group_types: dict[str, dict[str, str]] = {}
    for anzsco4, members in group_members.items():
        totals: dict[str, float] = defaultdict(float)
        type_votes: dict[str, list[str]] = defaultdict(list)
        for occupation_code in members:
            for skill_code, score in vectors[occupation_code].items():
                totals[skill_code] += score
                type_votes[skill_code].append(
                    vector_types.get(occupation_code, {}).get(
                        skill_code, "tool"
                    )
                )
        count = len(members)
        group_vectors[anzsco4] = {
            skill_code: total / count for skill_code, total in totals.items()
        }
        group_types[anzsco4] = {
            skill_code: majority_type(votes)
            for skill_code, votes in type_votes.items()
        }
    global_vector: dict[str, float] | None = None
    global_types: dict[str, str] = {}
    if group_vectors:
        # A plain mean over groups backs the rare group with no members.
        totals: dict[str, float] = defaultdict(float)
        for group in group_vectors.values():
            for skill_code, score in group.items():
                totals[skill_code] += score
        global_vector = {
            skill_code: total / len(group_vectors)
            for skill_code, total in totals.items()
        }
        type_votes: dict[str, list[str]] = defaultdict(list)
        for types in group_types.values():
            for skill_code, kind in types.items():
                type_votes[skill_code].append(kind)
        global_types = {
            skill_code: majority_type(votes)
            for skill_code, votes in type_votes.items()
        }

    def infer_vector(occupation_code: str) -> tuple[dict[str, float], dict[str, str]]:
        anzsco4 = osca_to_anzsco.get(occupation_code)
        if anzsco4 in group_vectors:
            return group_vectors[anzsco4], group_types.get(anzsco4, {})
        if global_vector:
            return global_vector, global_types
        return {}, {}

    def infer_riasec(occupation_code: str) -> dict[str, float]:
        anzsco4 = osca_to_anzsco.get(occupation_code)
        member_profiles = [
            interest_profiles[code]
            for code in anzsco_to_oscas.get(anzsco4, [])
            if code in interest_profiles
        ]
        if not member_profiles:
            return {}
        count = len(member_profiles)
        return {
            interest_type: sum(
                profile.get(interest_type, 0.0)
                for profile in member_profiles
            )
            / count
            for interest_type in RIASEC_TYPES
        }

    # Every catalogued occupation gets a full profile: growth comes from its
    # group, skills come from O*NET directly or from the group average.
    all_codes = [row["osca_code"] for row in catalog_rows]
    growth_percentiles = {
        code: growth_percentiles.get(code, 0.5) for code in all_codes
    }

    vector_rows: list[tuple[str, str, float, str]] = []
    match_rows: list[tuple[str, float, float, str]] = []
    with_profile = 0
    inferred_count = 0

    # OSCA skill levels let the score compare course level with role level.
    skill_level_by_code: dict[str, int] = {}
    for row in catalog_rows:
        try:
            skill_level_by_code[row["osca_code"]] = int(row["skill_level"])
        except (KeyError, ValueError):
            continue

    skill_level_rows: list[tuple[str, int]] = []
    for occupation_code in all_codes:
        direct = occupation_code in vectors
        if direct:
            scores = vectors[occupation_code]
            skill_types = vector_types.get(occupation_code, {})
        else:
            scores, skill_types = infer_vector(occupation_code)
            inferred_count += 1
            # Keep only each inferred role's strongest skills so the import
            # stays small and the matching keeps a clear signal.
            ranked_skills = sorted(
                scores.items(), key=lambda item: item[1], reverse=True
            )[:INFERRED_TOP_SKILLS]
            scores = {
                skill_code: score
                for skill_code, score in ranked_skills
                if score >= INFERRED_MIN_SCORE
            }
        if not scores:
            continue

        norm = math.sqrt(sum(value * value for value in scores.values()))
        if norm == 0:
            continue
        for skill_code, score in scores.items():
            vector_rows.append(
                (
                    occupation_code,
                    skill_code,
                    round(score, 2),
                    skill_types.get(skill_code, "tool"),
                )
            )

        riasec = interest_profiles.get(occupation_code) or infer_riasec(
            occupation_code
        )
        if riasec:
            with_profile += 1
        match_rows.append(
            (
                occupation_code,
                round(norm, 3),
                round(growth_percentiles.get(occupation_code, 0.5), 4),
                json.dumps(riasec, separators=(",", ":")),
            )
        )
        skill_level = skill_level_by_code.get(occupation_code)
        if skill_level:
            skill_level_rows.append((occupation_code, skill_level))

    statements = [
        "-- Generated by scripts/data/build_discovery_data.py.",
        "-- Personal profiles and quiz answers are never part of this import.",
        "PRAGMA foreign_keys = ON;",
    ]
    statements += insert_many(
        "data_source",
        ("name", "publisher", "source_url", "licence", "description", "accessed_on"),
        [
            (
                SOURCE_NAME,
                "U.S. Department of Labor, Employment and Training Administration",
                "https://www.onetcenter.org/license_db.html",
                "Creative Commons Attribution 4.0 International",
                "Occupation, skill, technology, CIP and ESCO crosswalks. US "
                "guidance used as a skill reference, not Australian employer rules.",
                date.today().isoformat(),
            )
        ],
        "(name) DO UPDATE SET publisher = excluded.publisher, "
        "source_url = excluded.source_url, licence = excluded.licence, "
        "description = excluded.description, accessed_on = excluded.accessed_on",
    )
    statements.append(
        insert_release_statement(SOURCE_DIR / "onet_occupation_skill.csv")
    )

    # A rebuild replaces every precomputed vector, never user answers.
    statements += [
        "DELETE FROM occupation_skill_vector;",
        "DELETE FROM occupation_match;",
        "UPDATE occupation SET skill_level = NULL WHERE skill_level IS NOT NULL;",
    ]
    statements += insert_many(
        "occupation_skill_vector",
        ("occupation_code", "skill_code", "score", "requirement_type"),
        vector_rows,
        "(occupation_code, skill_code) DO UPDATE SET score = excluded.score, "
        "requirement_type = excluded.requirement_type",
    )
    # An UPDATE keeps catalogue rows untouched when a catalog code is missing.
    for batch in batched(skill_level_rows):
        values = ",\n    ".join(
            f"({sql_value(code)}, {sql_value(level)})" for code, level in batch
        )
        statements.append(
            f"WITH input (code, skill_level) AS (\n  VALUES\n    {values}\n)\n"
            "UPDATE occupation SET skill_level = input.skill_level\n"
            "FROM input\n"
            "WHERE occupation.code = input.code;"
        )
    statements += insert_with_release(
        "occupation_match",
        ("occupation_code", "skill_norm", "growth_percentile", "riasec"),
        match_rows,
        SOURCE_NAME,
        RELEASE_LABEL,
        "onet_occupation_skill.csv",
        "(occupation_code) DO UPDATE SET skill_norm = excluded.skill_norm, "
        "growth_percentile = excluded.growth_percentile, "
        "riasec = excluded.riasec, "
        "dataset_release_id = excluded.dataset_release_id",
    )

    SQL_PATH.parent.mkdir(parents=True, exist_ok=True)
    SQL_PATH.write_text("\n".join(statements) + "\n", encoding="utf-8")

    report = {
        "occupations_modelled": len(match_rows),
        "occupations_inferred_from_group": inferred_count,
        "vector_rows": len(vector_rows),
        "occupations_with_interest_profile": with_profile,
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


def insert_release_statement(path: Path) -> str:
    from build_iteration_one_data import release_statement

    return release_statement(SOURCE_NAME, RELEASE_LABEL, None, path)


if __name__ == "__main__":
    main()
