import { DesignComponent } from '../../domain/models/template.model';

export interface DataSourceFieldBinding {
  id?: string;
  collectionId?: string;
  collectionName?: string;
  name: string;
  displayName: string;
  description: string;
  path: string;
}

export function withDataSourceBinding(
  element: DesignComponent,
  field: DataSourceFieldBinding,
): DesignComponent | null {
  const metadata = {
    ...(element.properties ?? {}),
    dataSourceFieldId: field.id,
    dataSourceCollectionId: field.collectionId,
    dataSourceCollectionName: field.collectionName,
    dataSourceFieldName: field.name,
    dataSourceFieldDescription: field.description,
    dataSourcePath: field.path,
  };
  const defaultValue = field.displayName || field.name;

  switch (element.type) {
    case 'text':
      return {
        ...element,
        name: defaultValue,
        content: {
          ...element.content,
          mode: 'dynamic',
          value: `{{${field.path}}}`,
          dataPath: field.path,
          defaultValue,
        },
        properties: metadata,
      };
    case 'image':
      return {
        ...element,
        content: {
          ...element.content,
          source: 'data',
          dataPath: field.path,
          assetId: undefined,
          previewSrc: undefined,
        },
        properties: metadata,
      };
    case 'link':
      return {
        ...element,
        content: {
          ...element.content,
          value: `{{${field.path}}}`,
          url: `{{${field.path}}}`,
          dataPath: field.path,
          defaultValue,
        },
        properties: metadata,
      };
    case 'qrCode':
    case 'barcode':
      return {
        ...element,
        content: {
          ...element.content,
          mode: 'dynamic',
          dataPath: field.path,
        },
        properties: metadata,
      };
    default:
      return null;
  }
}
