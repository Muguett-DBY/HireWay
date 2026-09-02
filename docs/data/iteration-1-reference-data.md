# Iteration 1 reference data

This import prepares the catalogue data needed by the Iteration 1 career flow. It does not change or delete saved profiles, current skills or career goals.

## What is loaded

- active Australian education levels and course names from CRICOS
- detailed Australian fields of education from ASCED 2001
- Australian OSCA occupation titles, aliases, descriptions and tasks
- Jobs and Skills Australia TOP qualification pathways linked to OSCA occupations
- existing O*NET skill and tool records remain separate

The source snapshots are kept in `data/sources`. Generated SQL stays in `data/generated` and is not committed because it can be rebuilt.

## Source boundaries

- [CRICOS](https://data.gov.au/data/dataset/cricos) course data is published by the Australian Government Department of Education under the Creative Commons Attribution 2.5 Australia licence.
- [ASCED 2001](https://www.abs.gov.au/statistics/classifications/australian-standard-classification-education-asced/latest-release) is published by the Australian Bureau of Statistics. ABS website material is generally available under the Creative Commons Attribution 4.0 International licence.
- [OSCA 2024](https://www.abs.gov.au/statistics/classifications/osca-occupation-standard-classification-australia/2024-version-1-0) is the Australian occupation classification used by HireWay.
- [Training Occupation Pathways](https://www.jobsandskills.gov.au/data/training-occupation-pathways) is published by Jobs and Skills Australia under the Creative Commons Attribution 4.0 International licence. Reuse includes the attribution `© Commonwealth of Australia`.
- [O*NET 31.0](https://www.onetcenter.org/license_db.html) is United States occupational information licensed under Creative Commons Attribution 4.0 International. It must be labelled as US guidance, not Australian employer requirements.

## Build the local import

Run these commands from the repository root. Both commands read the tracked source snapshots in `data/sources`.

```powershell
# Build the existing OSCA, CIP and O*NET catalogue first.
npm run data:build

# Add the Australian education and qualification data prepared by the team.
npm run data:build:iteration1
```

An alternative cleaned-data directory can still be supplied after `--` when testing a newer team release.

The second command writes:

- `data/generated/iteration_one_reference_data.sql`
- `data/generated/iteration_one_reference_report.json`

Read the report before applying the SQL. A warning is expected for broader or unspecified CRICOS field codes, because only detailed ASCED fields belong in the major menu.

## Test in an isolated local D1 database

Use a separate persistence directory so the test does not touch the normal local database.

```powershell
# Give this test database its own local state folder.
$iterationOneState = Join-Path $env:TEMP "hireway-iteration-one-data"

# Create every table from the tracked migration files.
npx wrangler d1 migrations apply hireway-db --local --persist-to $iterationOneState

# Load the existing catalogues before the Iteration 1 additions.
npx wrangler d1 execute hireway-db --local --persist-to $iterationOneState --file data/generated/reference_data.sql
npx wrangler d1 execute hireway-db --local --persist-to $iterationOneState --file data/generated/iteration_one_reference_data.sql
```

Check the important row counts and one known example:

```powershell
# Confirm that the menus and qualification links are available.
npx wrangler d1 execute hireway-db --local --persist-to $iterationOneState --command "SELECT (SELECT COUNT(*) FROM education_level_option) AS levels, (SELECT COUNT(*) FROM degree_option) AS degrees, (SELECT COUNT(*) FROM major_option) AS majors, (SELECT COUNT(*) FROM occupation_qualification) AS pathways;"

# Data Scientist should exist as an Australian OSCA role.
npx wrangler d1 execute hireway-db --local --persist-to $iterationOneState --command "SELECT code, title FROM occupation WHERE code = '223234';"

# O*NET relationships should keep their presentation category.
npx wrangler d1 execute hireway-db --local --persist-to $iterationOneState --command "SELECT requirement_type, COUNT(*) AS total FROM onet_occupation_skill GROUP BY requirement_type ORDER BY requirement_type;"
```

Do not add `--remote` until the migrations and generated report have been reviewed.
