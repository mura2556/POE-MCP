# Changelog

All notable changes to this project are documented here, following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2025-09-23
### Added
- Nightly and release GitHub Actions workflows that rebuild the dataset, validate coverage, and publish artifacts.
- Client smoke tests validating JSON/YAML generation, placeholder preservation, and HTTP JSON-RPC reachability.
- Machine-readable and human-readable coverage reports under `dist/coverage/`.
- Comprehensive MCP client documentation with OS-specific copy paths and first-run checks.

### Data
- Configurable `POE_MCP_NINJA_LEAGUES` environment variable to pin poe.ninja pulls to specific PoE1 leagues.
- Metadata files now record active league IDs alongside `generated_at` and PoE1 provenance.

### CI
- Nightly job archives `data/latest/`, `manifest.json`, client bundles, coverage artifacts, and Vitest output.
- Release workflow publishes tarballs and coverage reports to the `v0.1.0` GitHub release.

### Clients
- Hardened `build:clients` to keep `{{ABS_PATH}}` placeholders until explicitly substituted.
- Added Open WebUI + mcpo compose bundle, remote LM Studio profile, and detailed installation instructions.
