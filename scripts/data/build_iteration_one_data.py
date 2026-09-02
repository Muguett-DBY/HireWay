"""Build the Iteration 1 D1 import from the team's cleaned CSV files."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Iterable, Iterator, Sequence


ROOT = Path(__file__).resolve().parents[2]
GENERATED_DIR = ROOT / "data" / "generated"
SQL_PATH = GENERATED_DIR / "iteration_one_reference_data.sql"
REPORT_PATH = GENERATED_DIR / "iteration_one_reference_report.json"

FILES = {
    "levels": "hireway_degree_level_options.csv",
    "published_degrees": "hireway_degree_options.csv",
    "active_courses": "cricos_active_courses.csv",
    "majors": "hireway_major_options.csv",
    "occupations": "hireway_role_catalog_osca.csv",
    "pathways": "training_occupation_pathways.csv",
}


@dataclass
class DegreeGroup:
    """Collect rows that describe the same course name and level."""

    titles: Counter[str] = field(default_factory=Counter)
    levels: Counter[str] = field(default_factory=Counter)
    courses: set[tuple[str, str]] = field(default_factory=set)
    providers: set[str] = field(default_factory=set)
    majors: dict[str, int] = field(default_factory=dict)


def clean_text(value: object) -> str:
    """Trim display text and collapse repeated whitespace."""

    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def normalise_title(value: str) -> str:
    """Create a stable key without erasing meaningful course punctuation."""

    return " ".join(value.casefold().split())


def integer(value: str) -> int:
    """Read the whole-number counts supplied by the cleaned data."""

    return int(float(clean_text(value) or "0"))


def stable_code(prefix: str, *parts: str) -> str:
    """Keep generated option codes stable when the import is repeated."""

    key = "|".join(normalise_title(part) for part in parts)
    digest = hashlib.sha256(key.encode()).hexdigest()[:16]
    return f"{prefix}:{digest}"


def split_list(value: str) -> list[str]:
    """Split the semicolon lists used by the cleaned CSV files."""

    return [item.strip() for item in value.split(";") if item.strip()]


def csv_rows(
    path: Path,
    required_columns: set[str],
) -> Iterator[dict[str, str]]:
    """Read one CSV file and fail early when an expected column is missing."""

    with path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        columns = set(reader.fieldnames or [])
        missing = required_columns - columns
        if missing:
            names = ", ".join(sorted(missing))
            raise ValueError(f"{path.name} is missing columns: {names}")

        for row in reader:
            yield {key: clean_text(value) for key, value in row.items()}


def sha256(path: Path) -> str:
    """Record the exact cleaned file used to build the import."""

    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_levels(path: Path) -> dict[str, tuple[int, int, int]]:
    """Read the education-level menu prepared from active CRICOS courses."""

    required = {
        "course_level",
        "active_cricos_course_count",
        "unique_course_name_count",
        "provider_count",
    }
    levels: dict[str, tuple[int, int, int]] = {}
    for row in csv_rows(path, required):
        name = row["course_level"]
        if not name:
            continue
        levels[name] = (
            integer(row["active_cricos_course_count"]),
            integer(row["unique_course_name_count"]),
            integer(row["provider_count"]),
        )
    return levels


def read_published_degree_keys(path: Path) -> tuple[set[tuple[str, str]], int]:
    """Use the team's summary file to check our course normalisation."""

    required = {"course_name", "course_level"}
    keys: set[tuple[str, str]] = set()
    row_count = 0
    for row in csv_rows(path, required):
        title = row["course_name"]
        level = row["course_level"]
        if not title or not level:
            continue
        row_count += 1
        keys.add((normalise_title(title), normalise_title(level)))
    return keys, row_count


def read_majors(path: Path) -> dict[str, tuple[str, str, str, str, str]]:
    """Read selectable detailed ASCED fields and their parent groups."""

    required = {
        "major_code",
        "major_name",
        "narrow_field_code",
        "narrow_field_name",
        "broad_field_code",
        "broad_field_name",
    }
    majors: dict[str, tuple[str, str, str, str, str]] = {}
    for row in csv_rows(path, required):
        code = row["major_code"]
        if not re.fullmatch(r"\d{6}", code):
            continue
        majors[code] = (
            row["major_name"],
            row["narrow_field_code"],
            row["narrow_field_name"],
            row["broad_field_code"],
            row["broad_field_name"],
        )
    return majors


def read_degrees(
    path: Path,
    major_codes: set[str],
) -> tuple[dict[str, tuple], set[tuple], dict[str, object]]:
    """Group active CRICOS rows into concise course autocomplete options."""

    required = {
        "cricos_provider_code",
        "cricos_course_code",
        "course_name",
        "course_level",
        "primary_detailed_field_code",
        "secondary_detailed_field_code",
    }
    groups: dict[tuple[str, str], DegreeGroup] = {}
    level_courses: dict[str, set[tuple[str, str]]] = defaultdict(set)
    level_titles: dict[str, set[str]] = defaultdict(set)
    level_providers: dict[str, set[str]] = defaultdict(set)
    source_rows = 0
    unknown_major_links = 0

    for index, row in enumerate(csv_rows(path, required), start=1):
        title = row["course_name"]
        level = row["course_level"]
        if not title or not level:
            continue

        source_rows += 1
        key = (normalise_title(title), normalise_title(level))
        group = groups.setdefault(key, DegreeGroup())
        group.titles[title] += 1
        group.levels[level] += 1

        # A provider and CRICOS code identify one active course record.
        provider = row["cricos_provider_code"]
        course = row["cricos_course_code"] or f"row-{index}"
        group.courses.add((provider, course))
        level_courses[key[1]].add((provider, course))
        level_titles[key[1]].add(title)
        if provider:
            group.providers.add(provider)
            level_providers[key[1]].add(provider)

        for field_rank, column in (
            (1, "primary_detailed_field_code"),
            (2, "secondary_detailed_field_code"),
        ):
            major_code = row[column]
            if not major_code:
                continue
            if major_code not in major_codes:
                unknown_major_links += 1
                continue
            previous_rank = group.majors.get(major_code, field_rank)
            group.majors[major_code] = min(previous_rank, field_rank)

    degrees: dict[str, tuple] = {}
    degree_major_links: set[tuple] = set()
    degrees_without_major = 0

    for (title_key, level_key), group in groups.items():
        # The most common spelling becomes the label shown to users.
        title = sorted(
            group.titles.items(),
            key=lambda item: (-item[1], len(item[0]), item[0].casefold()),
        )[0][0]
        level = sorted(
            group.levels.items(),
            key=lambda item: (-item[1], len(item[0]), item[0].casefold()),
        )[0][0]
        degree_code = stable_code("CRICOS-OPTION", title_key, level_key)
        degrees[degree_code] = (
            title,
            level,
            len(group.courses),
            len(group.providers),
        )

        if not group.majors:
            degrees_without_major += 1
        for major_code, field_rank in group.majors.items():
            degree_major_links.add((degree_code, major_code, field_rank))

    metrics = {
        "active_course_rows": source_rows,
        "normalised_degree_options": len(degrees),
        "degree_major_links": len(degree_major_links),
        "degrees_without_detailed_major": degrees_without_major,
        "unknown_detailed_major_links": unknown_major_links,
        "normalised_keys": set(groups),
        "computed_level_counts": {
            level_key: (
                len(level_courses[level_key]),
                len(level_titles[level_key]),
                len(level_providers[level_key]),
            )
            for level_key in level_courses
        },
    }
    return degrees, degree_major_links, metrics


def read_occupations(path: Path) -> tuple[dict, set[tuple], set[tuple], int]:
    """Read valid OSCA roles while ignoring non-data footer rows."""

    required = {
        "osca_code",
        "occupation",
        "alternative_titles",
        "specialisations",
        "lead_statement",
        "main_tasks",
    }
    occupations: dict[str, tuple[str, str]] = {}
    aliases: set[tuple[str, str]] = set()
    tasks: set[tuple[str, str, int]] = set()
    ignored_rows = 0

    for row in csv_rows(path, required):
        code = row["osca_code"]
        title = row["occupation"]
        if not re.fullmatch(r"\d{6}", code) or not title:
            ignored_rows += 1
            continue

        occupations[code] = (title, row["lead_statement"])
        for alias in split_list(
            ";".join([row["alternative_titles"], row["specialisations"]])
        ):
            if alias.casefold() != title.casefold():
                aliases.add((code, alias))

        for display_order, task in enumerate(split_list(row["main_tasks"]), start=1):
            tasks.add((code, task, display_order))

    return occupations, aliases, tasks, ignored_rows


def qualification_level(title: str) -> str:
    """Extract a short level label from a national qualification title."""

    levels = (
        "Graduate Certificate",
        "Graduate Diploma",
        "Advanced Diploma",
        "Certificate IV",
        "Certificate III",
        "Certificate II",
        "Certificate I",
        "Diploma",
    )
    return next((level for level in levels if title.startswith(level)), "Other")


def pathway_score(row: dict[str, str]) -> tuple[int, int]:
    """Prefer the duplicate pathway row that contains more useful notes."""

    notes = row["special_conditions"] + row["special_conditions_description"]
    filled = sum(
        bool(row[column])
        for column in (
            "pathway",
            "special_conditions",
            "special_conditions_description",
            "jsc",
        )
    )
    return filled, len(notes)


def read_pathways(
    path: Path,
    occupation_codes: set[str],
) -> tuple[dict[str, tuple[str, str]], set[tuple], dict[str, int]]:
    """Deduplicate Australian qualification links without losing rich notes."""

    required = {
        "qualification_code",
        "qualification_title",
        "osca_code",
        "pathway",
        "special_conditions",
        "special_conditions_description",
        "jsc",
    }
    qualifications: dict[str, tuple[str, str]] = {}
    chosen: dict[tuple[str, str], dict[str, str]] = {}
    valid_rows = 0
    orphan_rows = 0
    conflicting_rows = 0

    for row in csv_rows(path, required):
        qualification_code = row["qualification_code"]
        occupation_code = row["osca_code"]
        title = row["qualification_title"]
        if not qualification_code or not title or not occupation_code:
            continue
        if occupation_code not in occupation_codes:
            orphan_rows += 1
            continue

        valid_rows += 1
        qualifications[qualification_code] = (
            title,
            qualification_level(title),
        )
        key = (occupation_code, qualification_code)
        previous = chosen.get(key)
        if previous is not None:
            conflicting_rows += 1
        if previous is None or pathway_score(row) > pathway_score(previous):
            chosen[key] = row

    links = {
        (
            occupation_code,
            qualification_code,
            row["pathway"],
            row["special_conditions"],
            row["special_conditions_description"],
            row["jsc"],
        )
        for (occupation_code, qualification_code), row in chosen.items()
    }
    metrics = {
        "valid_pathway_rows": valid_rows,
        "pathway_links": len(links),
        "duplicate_pathway_rows_resolved": conflicting_rows,
        "orphan_pathway_rows_ignored": orphan_rows,
    }
    return qualifications, links, metrics


def sql_value(value: object) -> str:
    """Encode generated values as SQLite literals."""

    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def batched(items: Sequence[tuple], size: int = 120) -> Iterator[Sequence[tuple]]:
    """Keep generated statements small enough for local and remote D1."""

    for start in range(0, len(items), size):
        yield items[start : start + size]


def insert_many(
    table: str,
    columns: Sequence[str],
    rows: Iterable[tuple],
    conflict_sql: str,
) -> list[str]:
    """Create compact multi-row upserts without database parameters."""

    ordered_rows = sorted(set(rows), key=lambda row: tuple(str(value) for value in row))
    statements: list[str] = []
    for batch in batched(ordered_rows):
        values = ",\n  ".join(
            "(" + ", ".join(sql_value(value) for value in row) + ")"
            for row in batch
        )
        statements.append(
            f"INSERT INTO {table} ({', '.join(columns)}) VALUES\n  {values}\n"
            f"ON CONFLICT {conflict_sql};"
        )
    return statements


def insert_with_release(
    table: str,
    columns: Sequence[str],
    rows: Iterable[tuple],
    source_name: str,
    release_label: str,
    source_file: str,
    conflict_sql: str,
) -> list[str]:
    """Attach a generated row to the matching provenance record."""

    ordered_rows = sorted(set(rows), key=lambda row: tuple(str(value) for value in row))
    statements: list[str] = []
    input_columns = ", ".join(columns)
    output_columns = ", ".join([*columns, "dataset_release_id"])
    selected_columns = ", ".join(f"input.{column}" for column in columns)

    for batch in batched(ordered_rows):
        values = ",\n    ".join(
            "(" + ", ".join(sql_value(value) for value in row) + ")"
            for row in batch
        )
        statements.append(
            f"WITH input ({input_columns}) AS (\n  VALUES\n    {values}\n)\n"
            f"INSERT INTO {table} ({output_columns})\n"
            f"SELECT {selected_columns}, release.id\n"
            "FROM input\n"
            "JOIN data_source source\n"
            f"  ON source.name = {sql_value(source_name)}\n"
            "JOIN dataset_release release\n"
            "  ON release.data_source_id = source.id\n"
            f" AND release.release_label = {sql_value(release_label)}\n"
            f" AND release.source_file = {sql_value(source_file)}\n"
            "WHERE 1\n"
            f"ON CONFLICT {conflict_sql};"
        )
    return statements


def release_statement(
    source_name: str,
    release_label: str,
    published_on: str | None,
    path: Path,
) -> str:
    """Create or refresh one dataset release record."""

    return (
        "INSERT INTO dataset_release "
        "(data_source_id, release_label, published_on, source_file, checksum_sha256) "
        f"SELECT id, {sql_value(release_label)}, {sql_value(published_on)}, "
        f"{sql_value(path.name)}, {sql_value(sha256(path))} "
        f"FROM data_source WHERE name = {sql_value(source_name)} "
        "ON CONFLICT (data_source_id, release_label, source_file) "
        "DO UPDATE SET published_on = excluded.published_on, "
        "checksum_sha256 = excluded.checksum_sha256;"
    )


def build_import(source_dir: Path) -> dict[str, object]:
    """Validate the cleaned dataset and write the repeatable D1 import."""

    paths = {key: source_dir / filename for key, filename in FILES.items()}
    missing = [path.name for path in paths.values() if not path.is_file()]
    if missing:
        raise FileNotFoundError("Missing cleaned files: " + ", ".join(missing))

    levels = read_levels(paths["levels"])
    published_degree_keys, published_degree_rows = read_published_degree_keys(
        paths["published_degrees"]
    )
    majors = read_majors(paths["majors"])
    degrees, degree_major_links, degree_metrics = read_degrees(
        paths["active_courses"], set(majors)
    )
    occupations, aliases, tasks, ignored_occupation_rows = read_occupations(
        paths["occupations"]
    )
    qualifications, pathway_links, pathway_metrics = read_pathways(
        paths["pathways"], set(occupations)
    )

    computed_level_names = {
        normalise_title(values[1]) for values in degrees.values() if values[1]
    }
    supplied_level_names = {normalise_title(name) for name in levels}
    computed_degree_keys = degree_metrics.pop("normalised_keys")
    computed_level_counts = degree_metrics.pop("computed_level_counts")
    supplied_level_counts = {
        normalise_title(name): counts for name, counts in levels.items()
    }
    checks = {
        "education_levels_match_active_courses": computed_level_names
        == supplied_level_names,
        "education_level_counts_match_active_courses": computed_level_counts
        == supplied_level_counts,
        "degree_options_match_published_summary": computed_degree_keys
        == published_degree_keys,
        "all_degree_major_links_have_parents": all(
            degree_code in degrees and major_code in majors
            for degree_code, major_code, _ in degree_major_links
        ),
        "all_pathway_links_have_parents": all(
            occupation_code in occupations
            and qualification_code in qualifications
            for occupation_code, qualification_code, *_ in pathway_links
        ),
        "data_science_course_present": any(
            "data science" in title.casefold()
            for title, *_ in degrees.values()
        ),
        "data_scientist_role_present": occupations.get("223234", ("", ""))[0]
        == "Data Scientist",
    }
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        raise ValueError("Iteration 1 data checks failed: " + ", ".join(failed))

    release_label = "cleaned_data_2"
    accessed_on = date.today().isoformat()
    source_rows = [
        (
            "ABS OSCA 2024",
            "Australian Bureau of Statistics",
            "https://www.abs.gov.au/statistics/classifications/"
            "osca-occupation-standard-classification-australia/2024-version-1-0",
            "Creative Commons Attribution 4.0 International",
            "Australian occupation titles, aliases, descriptions and tasks.",
            accessed_on,
        ),
        (
            "ASCED 2001",
            "Australian Bureau of Statistics",
            "https://www.abs.gov.au/statistics/classifications/"
            "australian-standard-classification-education-asced/latest-release",
            "Creative Commons Attribution 4.0 International",
            "Australian fields of education used for major suggestions.",
            accessed_on,
        ),
        (
            "CRICOS",
            "Australian Government Department of Education",
            "https://data.gov.au/data/dataset/cricos",
            "Creative Commons Attribution 2.5 Australia",
            "Active Australian course names and education levels.",
            accessed_on,
        ),
        (
            "Australian training pathways",
            "Australian Jobs and Skills Councils",
            "https://www.dewr.gov.au/skills-reform/jobs-and-skills-councils",
            "Licence not stated in the supplied cleaned dataset",
            "Qualification-to-occupation pathways supplied by the project team.",
            accessed_on,
        ),
    ]

    # Source rows and checksums make every imported value traceable.
    statements = [
        "-- Generated by scripts/data/build_iteration_one_data.py.",
        "-- User profiles and saved skills are never deleted by this import.",
        "PRAGMA foreign_keys = ON;",
    ]
    statements += insert_many(
        "data_source",
        ("name", "publisher", "source_url", "licence", "description", "accessed_on"),
        source_rows,
        "(name) DO UPDATE SET publisher = excluded.publisher, "
        "source_url = excluded.source_url, licence = excluded.licence, "
        "description = excluded.description, accessed_on = excluded.accessed_on",
    )

    releases = (
        ("CRICOS", None, paths["active_courses"]),
        ("CRICOS", None, paths["levels"]),
        ("CRICOS", None, paths["published_degrees"]),
        ("ASCED 2001", "2001-08-22", paths["majors"]),
        ("ABS OSCA 2024", None, paths["occupations"]),
        ("Australian training pathways", None, paths["pathways"]),
    )
    statements += [
        release_statement(source_name, release_label, published_on, path)
        for source_name, published_on, path in releases
    ]

    # Rebuild only the dedicated education menus; personal records stay intact.
    statements += [
        "DELETE FROM degree_major_map;",
        "DELETE FROM degree_option;",
        "DELETE FROM major_option;",
        "DELETE FROM education_level_option;",
    ]
    statements += insert_with_release(
        "education_level_option",
        (
            "name",
            "active_course_count",
            "unique_course_name_count",
            "provider_count",
        ),
        ((name, *counts) for name, counts in levels.items()),
        "CRICOS",
        release_label,
        paths["active_courses"].name,
        "(name) DO UPDATE SET active_course_count = excluded.active_course_count, "
        "unique_course_name_count = excluded.unique_course_name_count, "
        "provider_count = excluded.provider_count, "
        "dataset_release_id = excluded.dataset_release_id",
    )
    statements += insert_with_release(
        "major_option",
        (
            "code",
            "title",
            "narrow_field_code",
            "narrow_field_name",
            "broad_field_code",
            "broad_field_name",
        ),
        ((code, *values) for code, values in majors.items()),
        "ASCED 2001",
        release_label,
        paths["majors"].name,
        "(code) DO UPDATE SET title = excluded.title, "
        "narrow_field_code = excluded.narrow_field_code, "
        "narrow_field_name = excluded.narrow_field_name, "
        "broad_field_code = excluded.broad_field_code, "
        "broad_field_name = excluded.broad_field_name, "
        "dataset_release_id = excluded.dataset_release_id",
    )
    statements += insert_with_release(
        "degree_option",
        (
            "code",
            "title",
            "education_level",
            "active_course_count",
            "provider_count",
        ),
        ((code, *values) for code, values in degrees.items()),
        "CRICOS",
        release_label,
        paths["active_courses"].name,
        "(code) DO UPDATE SET title = excluded.title, "
        "education_level = excluded.education_level, "
        "active_course_count = excluded.active_course_count, "
        "provider_count = excluded.provider_count, "
        "dataset_release_id = excluded.dataset_release_id",
    )
    statements += insert_with_release(
        "degree_major_map",
        ("degree_code", "major_code", "field_rank"),
        degree_major_links,
        "CRICOS",
        release_label,
        paths["active_courses"].name,
        "(degree_code, major_code) DO UPDATE SET "
        "field_rank = excluded.field_rank, "
        "dataset_release_id = excluded.dataset_release_id",
    )

    # OSCA rows ensure every qualification relationship has a valid parent.
    statements += insert_many(
        "occupation",
        ("code", "title", "description"),
        ((code, *values) for code, values in occupations.items()),
        "(code) DO UPDATE SET title = excluded.title, "
        "description = excluded.description, updated_at = CURRENT_TIMESTAMP",
    )
    statements += insert_many(
        "occupation_alias",
        ("occupation_code", "alias"),
        aliases,
        "(occupation_code, alias) DO NOTHING",
    )
    statements += insert_many(
        "occupation_task",
        ("occupation_code", "task", "display_order"),
        tasks,
        "(occupation_code, task) DO UPDATE SET "
        "display_order = excluded.display_order",
    )
    statements += insert_many(
        "qualification",
        ("code", "title", "qualification_level"),
        ((code, *values) for code, values in qualifications.items()),
        "(code) DO UPDATE SET title = excluded.title, "
        "qualification_level = excluded.qualification_level",
    )

    # Replace only links from this supplied pathway release.
    statements.append(
        "DELETE FROM occupation_qualification WHERE dataset_release_id = ("
        "SELECT release.id FROM dataset_release release "
        "JOIN data_source source ON source.id = release.data_source_id "
        f"WHERE source.name = {sql_value('Australian training pathways')} "
        f"AND release.release_label = {sql_value(release_label)} "
        f"AND release.source_file = {sql_value(paths['pathways'].name)}"
        ");"
    )
    statements += insert_with_release(
        "occupation_qualification",
        (
            "occupation_code",
            "qualification_code",
            "relationship",
            "special_conditions",
            "special_conditions_description",
            "jobs_and_skills_council",
        ),
        pathway_links,
        "Australian training pathways",
        release_label,
        paths["pathways"].name,
        "(occupation_code, qualification_code, dataset_release_id) DO UPDATE SET "
        "relationship = excluded.relationship, "
        "special_conditions = excluded.special_conditions, "
        "special_conditions_description = excluded.special_conditions_description, "
        "jobs_and_skills_council = excluded.jobs_and_skills_council",
    )

    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    SQL_PATH.write_text("\n\n".join(statements) + "\n", encoding="utf-8")

    warnings = []
    if degree_metrics["degrees_without_detailed_major"]:
        warnings.append(
            "Some CRICOS course options have no detailed ASCED major; keep free-text input available."
        )
    if degree_metrics["unknown_detailed_major_links"]:
        warnings.append(
            "Some CRICOS field codes are broader or unspecified and are not selectable detailed majors."
        )
    warnings.append(
        "The cleaned training pathway file does not state a redistribution licence; confirm it before production import."
    )

    report = {
        "source_directory": str(source_dir.resolve()),
        "files": {
            key: {"filename": path.name, "sha256": sha256(path)}
            for key, path in paths.items()
        },
        "counts": {
            "education_levels": len(levels),
            "published_degree_rows": published_degree_rows,
            **degree_metrics,
            "major_options": len(majors),
            "osca_occupations": len(occupations),
            "ignored_occupation_rows": ignored_occupation_rows,
            "occupation_aliases": len(aliases),
            "occupation_tasks": len(tasks),
            "qualifications": len(qualifications),
            **pathway_metrics,
        },
        "quality": {
            "status": "passed_with_warnings" if warnings else "passed",
            "checks": checks,
            "warnings": warnings,
        },
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> None:
    """Read the source directory supplied on the command line."""

    parser = argparse.ArgumentParser(
        description="Build the Iteration 1 D1 import from cleaned CSV files."
    )
    parser.add_argument("source_dir", type=Path, help="Path to cleaned_data_2")
    arguments = parser.parse_args()

    report = build_import(arguments.source_dir)
    print(json.dumps(report["counts"], indent=2))
    print(f"Quality: {report['quality']['status']}")
    print(f"Wrote {SQL_PATH.relative_to(ROOT)}")
    print(f"Wrote {REPORT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
