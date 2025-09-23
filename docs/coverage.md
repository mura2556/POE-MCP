# Coverage guarantees

`pnpm data:validate` executes `verifyCoverage()` which reports:

- Coverage ratios vs RePoE for bases, mods, gems, and passives (>99%).
- PoE1-only guardrails (no PoE2 identifiers, tags, or mechanics).
- Mod reachability: every mod participates in at least one `craft_action` row.
- 50+ item text fixtures parse into canonical identifiers.
- 25 PoB codes round-trip (decode → encode) with canonical hashes preserved.
- poe.ninja snapshots provide ≥20 price points per execution.

The validation result is serialized by the MCP tool `verify_coverage` to power automated health checks inside clients.
