# Source data

These files are the input snapshots used to rebuild HireWay's reference data. They do not contain profiles, recovery codes or other user-submitted information.

## Folders

- `reference` contains the official OSCA, CIP, ESCO and O*NET files used by `build_reference_data.py`.
- `iteration-1` contains the team's cleaned CRICOS, ASCED, OSCA and Training Occupation Pathways files used by `build_iteration_one_data.py`.

The generated SQL and validation reports belong in `data/generated`. They are ignored by Git because both builders can recreate them.

## Sources and licences

- CRICOS course data is published by the Australian Government Department of Education under the Creative Commons Attribution 2.5 Australia licence.
- ASCED and OSCA material is published by the Australian Bureau of Statistics and is generally available under the Creative Commons Attribution 4.0 International licence.
- Training Occupation Pathways is published by Jobs and Skills Australia under the Creative Commons Attribution 4.0 International licence. Reuse includes `© Commonwealth of Australia`.
- O*NET occupational data and crosswalks are United States data licensed under the Creative Commons Attribution 4.0 International licence.

O*NET content must be presented as general United States career guidance, not as a guarantee of what an Australian employer will require.
