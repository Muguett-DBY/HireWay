HireWay

Career guidance powered by Australian labour market data

HireWay is a web-based career exploration platform designed to help young people explore potential careers, understand job requirements, identify skill gaps, and make more informed career decisions.

🌐 Live Website: https://hireway.custard.top

## Reference data

The profile suggestions use three open-data sources:

- ABS OSCA 2024 for Australian occupation names and aliases
- CIP 2020 for fields of study and their occupation links
- O*NET 31.0 for occupation skills and workplace technologies

Install the data script dependency and build the local import file:

```powershell
# openpyxl reads the official Excel workbooks.
python -m pip install -r scripts/data/requirements.txt

# The downloaded and generated files stay outside Git.
npm run data:build
```

Apply the schema and reference data to the local D1 database:

```powershell
# Migrations prepare the local database tables first.
npx wrangler d1 migrations apply hireway-db --local

# This imports only reference catalogues and does not delete user profiles.
npm run data:apply:local
```

O*NET attribution: This product includes information from the O*NET 31.0
Database by the U.S. Department of Labor, Employment and Training
Administration (USDOL/ETA), used under the CC BY 4.0 licence. O*NET® is a
trademark of USDOL/ETA.
