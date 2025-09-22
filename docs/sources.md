# Data sources

| Source | URL | License | Notes |
| --- | --- | --- | --- |
| Path of Building Community | https://github.com/PathOfBuildingCommunity/PathOfBuilding | MIT | Passive tree metadata, PoB encoding | 
| RePoE | https://github.com/brather1ng/RePoE | CC-BY-SA-4.0 | Canonical base/mod/gem/passive definitions |
| PyPoE | https://github.com/OmegaK2/PyPoE | MIT | GGPK extraction utilities and dat file helpers |
| Official PoE API | https://www.pathofexile.com/developer/docs/api | ToS-bound | League metadata, trade static endpoints |
| poe.ninja | https://poe.ninja | CC-BY-NC-4.0 | Economy snapshots, currency/item history |
| Community PoB builds | Various GitHub gists/repos | Mixed (per entry) | Manifest records per-build provenance |

The ETL pipeline records the precise commit SHA, license text, checksum, and retrieval metadata in `manifest.json` for reproducibility. PoE2 data is explicitly filtered at the adapter layer and further guarded by validation.
