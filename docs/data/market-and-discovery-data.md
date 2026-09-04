# Market outlook and discovery imports

Two generated imports extend the Iteration 1 catalogue with Australian
labour market data and the precomputed discovery engine tables. Neither
import touches saved profiles, skills, goals or quiz answers.

## Market outlook

`npm run data:build:market` reads the team's cleaned outlook file from
`data/sources/market` and writes `data/generated/market_data.sql`.

- Jobs and Skills Australia employment projections (May 2025 / 2030 / 2035)
- Internet Vacancy Chart vacancies split by state (July 2026)
- Median weekly earnings per four-digit ANZSCO group
- An OSCA-to-ANZSCO bridge so every occupation reaches its market group

Tables filled: `anzsco_group`, `occupation_anzsco_map`, `anzsco4_market`,
`anzsco4_state_vacancy`. Source attribution is stored in `data_source` and
`dataset_release`; projections and vacancy data are © Commonwealth of
Australia (CC BY 4.0).

## Discovery engine

`npm run data:build:discovery` reads the snapshots in `data/sources/discovery`
(exported D1 catalogue rows plus the O*NET interest file) and writes
`data/generated/discovery_data.sql`.

- `occupation_skill_vector` averages skill and tool scores across the
  O*NET occupations linked to each OSCA occupation, keeping each skill's
  essential / transferable / tool category
- `occupation_match` caches the vector norm, a RIASEC profile and a
  national growth percentile per occupation
- `occupation.skill_level` stores the OSCA 1-5 skill level

Every catalogued occupation is modelled. Roles without their own O*NET
bridge inherit the mean skill vector and interest profile of their ANZSCO
four-digit group (inferred rows make up about two thirds of the set), so
suggestions and role details never come back empty. The UI labels the
skill guidance as coming from US O*NET data, not Australian employer
requirements.

## Apply an import

```powershell
npx wrangler d1 migrations apply hireway-db --local
npm run data:apply:market:local
npm run data:apply:discovery:local
```

For the remote database run the same commands with `--remote`. Read the
generated report JSON before applying.
