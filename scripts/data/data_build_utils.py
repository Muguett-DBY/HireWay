"""Shared deterministic SQL and provenance helpers for the data builders."""

from __future__ import annotations

import argparse
import hashlib
import re
from datetime import date
from pathlib import Path
from typing import Iterable, Iterator, Sequence

# Access date recorded by the existing local source snapshot imports. Rebuilds
# preserve it; a refreshed source snapshot must supply its actual access date.
SNAPSHOT_ACCESSED_ON = "2026-09-11"
DATA_SOURCE_CONFLICT = (
    "(name) DO UPDATE SET publisher = excluded.publisher, "
    "source_url = excluded.source_url, licence = excluded.licence, "
    "description = excluded.description, accessed_on = excluded.accessed_on"
)


def iso_date(value: str) -> str:
    """Require an explicit ISO date, never silently substitute today's date."""
    try:
        parsed = date.fromisoformat(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("Expected a date in YYYY-MM-DD format") from error
    if parsed.isoformat() != value:
        raise argparse.ArgumentTypeError("Expected a date in YYYY-MM-DD format")
    return value


def add_accessed_on_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--accessed-on", type=iso_date, default=SNAPSHOT_ACCESSED_ON,
        help="Source snapshot access date (YYYY-MM-DD); default: %(default)s",
    )


def clean_text(value: object) -> str:
    """Trim display text and collapse repeated whitespace."""

    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def sha256(path: Path) -> str:
    """Record the exact cleaned file used to build the import."""

    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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
    conflict_sql: str = "DO NOTHING",
    *,
    batch_size: int = 120,
) -> list[str]:
    """Create compact multi-row upserts without database parameters."""

    ordered_rows = sorted(set(rows), key=lambda row: tuple(str(value) for value in row))
    statements: list[str] = []
    for batch in batched(ordered_rows, batch_size):
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
    *,
    update_published_on: bool = True,
) -> str:
    """Create or refresh one dataset release record."""

    published_update = "published_on = excluded.published_on, " if update_published_on else ""
    return (
        "INSERT INTO dataset_release "
        "(data_source_id, release_label, published_on, source_file, checksum_sha256) "
        f"SELECT id, {sql_value(release_label)}, {sql_value(published_on)}, "
        f"{sql_value(path.name)}, {sql_value(sha256(path))} "
        f"FROM data_source WHERE name = {sql_value(source_name)} "
        "ON CONFLICT (data_source_id, release_label, source_file) "
        f"DO UPDATE SET {published_update}"
        "checksum_sha256 = excluded.checksum_sha256;"
    )
