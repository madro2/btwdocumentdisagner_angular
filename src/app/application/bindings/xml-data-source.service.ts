import { Injectable, signal } from '@angular/core';
import { DataSourceDefinition } from '../../domain/models/template.model';

export interface XmlBindingScope {
  aliases?: Record<string, Element>;
}

@Injectable({ providedIn: 'root' })
export class XmlDataSourceService {
  private readonly documentState = signal<XMLDocument | null>(null);
  private dataSource?: DataSourceDefinition;

  readonly document = this.documentState.asReadonly();

  configure(dataSource?: DataSourceDefinition): void {
    this.dataSource = dataSource;
  }

  load(xml: string): string | null {
    const hasMojibake = /Ã.|â[\x80-\xBF]|Ă./u.test(xml);

    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const parserError = document.querySelector('parsererror');
    if (parserError) return `XML inválido: ${parserError.textContent ?? ''}`;

    this.documentState.set(document);
    return hasMojibake
      ? 'Advertencia: el XML se cargó, pero contiene texto con codificación dañada (mojibake).'
      : null;
  }

  clear(): void {
    this.documentState.set(null);
  }

  resolve(path: string, scope: XmlBindingScope = {}): string | null {
    const element = this.resolveElement(path, scope);
    return element?.textContent?.trim() || null;
  }

  collection(path: string): Element[] {
    const document = this.documentState();
    if (!document) return [];
    const root = this.dataRoot(document);
    const tablePath =
      this.dataSource?.tables?.find((table) => table.name === path)?.dataPath ??
      path;
    return this.directChildren(root, tablePath);
  }

  paths(): string[] {
    const document = this.documentState();
    if (!document) return [];
    const root = this.dataRoot(document);
    const result = new Set<string>();

    for (const table of Array.from(root.children)) {
      for (const child of Array.from(table.children)) {
        if (!child.children.length) {
          result.add(`${table.localName}.${child.localName}`);
        }
      }
    }
    return [...result].sort();
  }

  private resolveElement(
    path: string,
    scope: XmlBindingScope,
  ): Element | null {
    const document = this.documentState();
    if (!document) return null;

    const segments = path.split('.').filter(Boolean);
    if (!segments.length) return null;

    const scoped = scope.aliases?.[segments[0]];
    if (scoped) return this.walk(scoped, segments.slice(1));

    const root = this.dataRoot(document);
    const table = this.dataSource?.tables?.find(
      (definition) => definition.name === segments[0],
    );
    const recordName = table?.dataPath ?? segments[0];
    const record = this.directChildren(root, recordName)[0];
    return record ? this.walk(record, segments.slice(1)) : null;
  }

  private dataRoot(document: XMLDocument): Element {
    const configured = this.dataSource?.rootPath?.split('/').filter(Boolean).at(-1);
    if (!configured || document.documentElement.localName === configured) {
      return document.documentElement;
    }
    return (
      Array.from(document.getElementsByTagName('*')).find(
        (element) => element.localName === configured,
      ) ?? document.documentElement
    );
  }

  private walk(element: Element, segments: string[]): Element | null {
    let current: Element | undefined = element;
    for (const segment of segments) {
      current = current
        ? this.directChildren(current, segment)[0]
        : undefined;
    }
    return current ?? null;
  }

  private directChildren(element: Element, name: string): Element[] {
    return Array.from(element.children).filter(
      (child) => child.localName === name,
    );
  }
}
