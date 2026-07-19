import { describe, expect, it } from 'vitest';
import { DesignContract } from '../../domain/models/template.model';
import { calculateVersionSaveInfo } from './versioning';

describe('calculateVersionSaveInfo', () => {
  it('uses the latest saved version when an older version is being edited', () => {
    const current = contract('current-id', 'Factura', 1);
    const result = calculateVersionSaveInfo(current, [
      current,
      contract('version-2', 'Factura', 2),
      contract('version-3', 'Factura', 3),
    ]);

    expect(result).toEqual({
      exists: true,
      latestVersion: 3,
      nextVersion: 4,
    });
  });

  it('matches format names ignoring spaces and letter case', () => {
    const current = contract('current-id', '  FACTURA ', 2);
    const result = calculateVersionSaveInfo(current, [
      current,
      contract('version-5', 'factura', 5),
    ]);

    expect(result.nextVersion).toBe(6);
  });

  it('does not treat a new format as an existing saved version', () => {
    const current = contract('new-id', 'Formato nuevo', 1);
    const result = calculateVersionSaveInfo(current, []);

    expect(result.exists).toBe(false);
  });
});

function contract(
  id: string,
  name: string,
  version: number,
): DesignContract {
  return {
    schemaVersion: '3.0',
    document: { id, name, version },
    page: {
      size: 'A4',
      orientation: 'portrait',
      widthMm: 210,
      heightMm: 297,
      unit: 'mm',
      marginsMm: { top: 7, right: 7, bottom: 7, left: 7 },
    },
    components: [],
  };
}
