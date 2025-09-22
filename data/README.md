# Data output directory

The ETL jobs populate dated snapshots here (e.g. `data/2025-09-22/`).

This repository intentionally omits generated artifacts; run `pnpm etl:all` to materialise the latest snapshot. The
`data/latest` symlink is refreshed automatically after each successful pipeline execution.
