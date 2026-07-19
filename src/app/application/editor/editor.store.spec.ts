import { describe, expect, it } from 'vitest';
import { DesignComponent, DesignContract } from '../../domain/models/template.model';
import { withDataSourceBinding } from './data-source-binding';
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

describe('withDataSourceBinding', () => {
  const field = {
    id: 'field-id',
    collectionId: 'collection-id',
    collectionName: 'Factura',
    name: 'LegalNumber',
    displayName: 'Número legal',
    description: 'Número legal de la factura',
    path: 'InvcHead.LegalNumber',
  };

  it('converts a text component into a dynamic field and keeps trace metadata', () => {
    const result = withDataSourceBinding(component('text'), field);

    expect(result?.content).toMatchObject({
      mode: 'dynamic',
      value: '{{InvcHead.LegalNumber}}',
      dataPath: 'InvcHead.LegalNumber',
      defaultValue: 'Número legal',
    });
    expect(result?.properties).toMatchObject({
      dataSourceFieldId: 'field-id',
      dataSourceCollectionId: 'collection-id',
      dataSourcePath: 'InvcHead.LegalNumber',
    });
  });

  it('switches an image from asset to data source', () => {
    const result = withDataSourceBinding(
      {
        ...component('image'),
        content: { source: 'asset', assetId: 'asset-id', previewSrc: 'preview' },
      },
      field,
    );

    expect(result?.content).toMatchObject({
      source: 'data',
      dataPath: 'InvcHead.LegalNumber',
    });
    expect(result?.content?.assetId).toBeUndefined();
    expect(result?.content?.previewSrc).toBeUndefined();
  });

  it('rejects components that do not support scalar bindings', () => {
    expect(withDataSourceBinding(component('rectangle'), field)).toBeNull();
  });
});

function contract(id: string, name: string, version: number): DesignContract {
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

function component(type: DesignComponent['type']): DesignComponent {
  return {
    id: 'component-id',
    type,
    name: 'Componente',
    position: { x: 0, y: 0, width: 20, height: 10, unit: 'mm' },
    content: {},
  };
}
