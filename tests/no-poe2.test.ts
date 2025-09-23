import { describe, it, expect } from 'vitest';
import { assertPoe1, findPoe2Tokens } from '../src/validate/noPoe2.js';

describe('PoE1 guards', () => {
  it('accepts Path of Building Community PoE1 repository', () => {
    expect(() => assertPoe1('https://github.com/PathOfBuildingCommunity/PathOfBuilding', 'pob', 'url')).not.toThrow();
  });

  it('rejects PoB PoE2 repository', () => {
    expect(() => assertPoe1('https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2', 'pob2', 'url')).toThrow();
  });

  it('flags PoE2-only terminology', () => {
    const hits = findPoe2Tokens('Legendary Companion grants access to PoE2 spearshard spiritgem.');
    expect(hits).toContain('companion');
    expect(hits).toContain('poe2');
    expect(hits).toContain('spearshard');
  });
});
