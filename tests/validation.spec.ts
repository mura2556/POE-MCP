import { describe, it, expect, beforeAll } from 'vitest';
import { verifyCoverage } from '../src/validation/coverage.js';
import { runEtl } from '../src/etl/index.js';

let report: Awaited<ReturnType<typeof verifyCoverage>>;

beforeAll(async () => {
  await runEtl();
  report = await verifyCoverage();
});

describe('coverage checks', () => {
  it('achieves >= 0.99 coverage across core datasets', () => {
    expect(report.coverage.bases).toBeGreaterThanOrEqual(0.99);
    expect(report.coverage.mods).toBeGreaterThanOrEqual(0.99);
    expect(report.coverage.gems).toBeGreaterThanOrEqual(0.99);
    expect(report.coverage.passives).toBeGreaterThanOrEqual(0.99);
  });

  it('has no PoE2 artifacts', () => {
    expect(report.hasPoE2Artifacts).toBe(false);
  });

  it('validates fixtures and snapshots', () => {
    expect(report.itemParserFixtures).toBeGreaterThanOrEqual(50);
    expect(report.pobRoundTrip).toBeGreaterThanOrEqual(25);
    expect(report.economySnapshots).toBeGreaterThanOrEqual(20);
  });
});
