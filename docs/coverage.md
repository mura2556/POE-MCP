# Coverage guarantees

`pnpm data:validate` executes `verifyCoverage()` which enforces:

- ≥99% coverage vs. RePoE for BaseItem, Mod, Gem, and PassiveNode tables.
- Zero PoE2 identifiers across manifest, metadata, and normalized datasets.
- Every Mod ID is reachable from at least one `CraftAction` constraint.
- ≥50 curated item text fixtures resolve to canonical BaseItem IDs.
- ≥25 PoB codes round-trip decode/encode with identical XML payloads.
- ≥20 poe.ninja price points captured for the active (or user-pinned) league(s).

Both machine and human artifacts are written to `dist/coverage/`:

```
verify_coverage generated at 2025-09-23T00:05:08.912Z
- [PASS] BaseItem coverage >= 99% versus RePoE (actual=1.0000, expected=>=0.99)
- [PASS] Mod coverage >= 99% versus RePoE (actual=1.0000, expected=>=0.99)
- [PASS] Gem coverage >= 99% versus RePoE (actual=1.0000, expected=>=0.99)
- [PASS] PassiveNode coverage >= 99% versus RePoE (actual=1.0000, expected=>=0.99)
- [PASS] No PoE2 artifacts detected (actual=false, expected=false)
- [PASS] Every Mod reachable through at least one crafting path (actual=true, expected=true)
- [PASS] >=50 item text fixtures resolve to canonical IDs (actual=50, expected=>=50)
- [PASS] >=25 PoB codes round-trip decode/encode (actual=25, expected=>=25)
- [PASS] Economy snapshots present for current league(s) (actual=40, expected=>=20 entries)
```

The JSON report (`dist/coverage/coverage.json`) mirrors these checks and exposes supporting metadata:

```json
{
  "generatedAt": "2025-09-23T00:05:08.912Z",
  "coverage": {"bases": 1, "mods": 1, "gems": 1, "passives": 1},
  "hasPoE2Artifacts": false,
  "modCraftReachable": true,
  "economyLeagues": ["Standard"],
  "missingEconomyLeagues": [],
  "checks": [...]
}
```

Downstream CI jobs fail whenever any check flips to `FAIL`; GitHub Actions archives both files for auditing.
