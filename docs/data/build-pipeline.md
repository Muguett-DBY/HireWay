# Rebuilding the data snapshots

Run commands from the repository root. Install the Python dependencies with
`python3 -m pip install -r scripts/data/requirements.txt`.

## SQL imports and provenance

```sh
python3 scripts/data/build_reference_data.py
python3 scripts/data/build_iteration_one_data.py
python3 scripts/data/build_market_data.py
python3 scripts/data/build_discovery_data.py
python3 scripts/data/build_study_skills.py
```

The four source importers use the existing snapshot's recorded access date,
`2026-09-11`, rather than the day the SQL is regenerated. Identical inputs and
arguments therefore produce identical SQL and reports on different days.
When replacing or downloading a source snapshot, pass its actual access date
explicitly, for example:

```sh
python3 scripts/data/build_reference_data.py --accessed-on 2026-10-11
```

The same `--accessed-on YYYY-MM-DD` option is available on the iteration-one,
market and discovery builders. This is source provenance, not an assertion that
rebuilding local CSV or spreadsheet files rechecked the upstream publisher.
The iteration-one builder still accepts an optional source directory.

`data_build_utils.py` owns SQLite literal escaping, batching, source upserts,
checksums and release statements. Reference imports retain their 150-row batch
size; the other imports retain 120. Reference release updates preserve any
existing publication date, while the other release updates refresh it.

The study-skill builder shares the ratings, baseline, ranking, bridge list and
CIP-family join. Its final coverage fallback deliberately has a different score:
tool support is capped at two, and the 15% field-coverage gate is absent. Do not
merge that rule into the earlier passes when changing recommendations.

Generated SQL and reports remain in ignored `data/generated/`. Browser/audit
artifacts belong in ignored `output/`; the root Windows `nul` artifact is also
ignored.

## Video catalogue

```sh
# Verify all 21 entries online, then write data/learning_videos.json.
python3 scripts/data/build_learning_videos.py

# Verify online without changing the catalogue.
python3 scripts/data/build_learning_videos.py --check

# Reproduce only the recorded snapshot without network access.
python3 scripts/data/build_learning_videos.py --offline
```

A normal build checks each video's title and channel through YouTube oEmbed,
and its ID, title, channel ID, channel name and playback duration through
`ytInitialPlayerResponse.videoDetails` on the watch page. Any network failure
or metadata difference stops the build before writing or advancing verification
dates. Review changes to the curated constants before accepting changed metadata.
YouTube page structure can change; a missing player response fails validation
instead of accepting an unverified duration.

`videoDetails.lengthSeconds` is the duration source. The same page's microformat
may round introductions up by one second, so searching the entire HTML for the
first or last `lengthSeconds` is not a reliable validator. Human-readable duration
strings are derived from seconds.

Successful online builds stamp their actual verification date (UTC by default).
Use `--verified-at YYYY-MM-DD` when recording the date in the team's timezone.
Offline builds keep the recorded dates and cannot accept `--verified-at`.
The metadata's `verifyCommand` is the executable `--check` command above.

The catalogue intentionally covers 15 manually selected tool skills. Missing
videos for other skills are a content-coverage decision; builds do not invent
links or fill thousands of entries with unverified videos.

## Refactor validation

Local offline checks covered SQLite escaping, the market cleanup query with quotes
in its source name, release-publication update semantics, explicit source dates,
the two study scoring rules, canonical video duration parsing, metadata mismatch
rejection and verification-date preservation on failure.

For the October 2026 refactor, the four old/new source SQL outputs and all four
reports were compared byte for byte using the same access date. The study SQL
was executed against two copies of the same local database: all 39,454 skill
recommendations, 19,966 program links and 27,579 knowledge ratings were identical.
Repeated default builds also produced identical SQL and reports. The 21 videos
were verified online on 2026-10-11. These checks do not modify production D1.
