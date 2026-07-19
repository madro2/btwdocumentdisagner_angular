import { Injectable, signal } from '@angular/core';
import {
  BindingDefinition,
  DesignContract,
} from '../../domain/models/template.model';
import {
  XmlBindingScope,
  XmlDataSourceService,
} from './xml-data-source.service';

@Injectable({ providedIn: 'root' })
export class BindingEvaluatorService {
  private readonly contractState = signal<DesignContract | null>(null);
  private readonly systemState = signal<Record<string, unknown>>({});

  constructor(private readonly xml: XmlDataSourceService) {}

  configure(contract: DesignContract): void {
    this.contractState.set(contract);
    this.xml.configure(contract.dataSource);
  }

  setSystem(system: Record<string, unknown>): void {
    this.systemState.set(system);
  }

  getSystem(): Record<string, unknown> {
    return this.systemState();
  }

  loadXml(xml: string): string | null {
    return this.xml.load(xml);
  }

  availablePaths(): string[] {
    return this.xml.paths();
  }

  hasLoadedXml(): boolean {
    return this.xml.document() !== null;
  }

  collection(path: string): Element[] {
    return this.xml.collection(path);
  }

  render(
    template: string | undefined,
    scope: XmlBindingScope = {},
    bindings: Record<string, BindingDefinition> = {},
    defaultValue = '',
  ): string {
    if (!template) return defaultValue;

    return template.replace(/\{\{(.+?)\}\}/g, (_match, expression: string) => {
      const result = this.evaluateExpression(expression.trim(), scope, bindings);
      return result == null || result === '' ? defaultValue : String(result);
    });
  }

  resolve(path: string, scope: XmlBindingScope = {}): unknown {
    const [root, ...rest] = path.split('.');
    if (root === 'System') return this.systemState()[rest.join('.')] ?? null;
    if (root === 'Runtime') return this.systemState()[rest.join('.')] ?? null; // fallback compatibility
    if (root === 'Computed') return this.computed(rest.join('.'), scope);
    if (root === 'Pagina') return root === path ? null : '1';
    return this.xml.resolve(path, scope);
  }

  private evaluateExpression(
    expression: string,
    scope: XmlBindingScope,
    bindings: Record<string, BindingDefinition>,
  ): unknown {
    const [source, ...filters] = expression.split('|');
    let value =
      bindings[source]?.source === 'function'
        ? this.functionBinding(bindings[source], scope)
        : this.resolve(source, scope);

    for (const filterExpression of filters) {
      const [filter, ...args] = filterExpression.split(':');
      value = this.applyFilter(filter, value, args, scope);
    }
    return value;
  }

  private applyFilter(
    filter: string,
    value: unknown,
    args: string[],
    scope: XmlBindingScope,
  ): unknown {
    switch (filter) {
      case 'upper':
        return String(value ?? '').toUpperCase();
      case 'number':
        return this.asNumber(value).toLocaleString('es-CO', {
          minimumFractionDigits: Number(args[0] ?? 0),
          maximumFractionDigits: Number(args[0] ?? 0),
        });
      case 'currency':
        return `$ ${this.asNumber(value).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      case 'date': {
        const date = new Date(String(value ?? ''));
        return Number.isNaN(date.getTime())
          ? value
          : new Intl.DateTimeFormat('es-CO', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }).format(date);
      }
      case 'lookup':
        return (
          this.contractState()?.dataSource?.lookups?.[args[0]]?.[
            String(value ?? '')
          ] ?? value
        );
      case 'percentageOf': {
        const denominator = this.asNumber(this.resolve(args[0], scope));
        return denominator ? (this.asNumber(value) / denominator) * 100 : 0;
      }
      default:
        return value;
    }
  }

  private computed(name: string, scope: XmlBindingScope): unknown {
    const definition = this.contractState()?.dataSource?.computedFields?.find(
      (field) => field.name === name,
    );
    const resolver = definition?.resolver;
    if (!resolver) return null;

    const kind = String(resolver['kind'] ?? '');
    if (kind === 'lookup') {
      const key = this.operand(resolver['key'], scope);
      const lookup = String(resolver['lookup'] ?? '');
      return (
        this.contractState()?.dataSource?.lookups?.[lookup]?.[String(key ?? '')] ??
        resolver['defaultValue'] ??
        null
      );
    }

    const args = Array.isArray(resolver['arguments'])
      ? resolver['arguments'].map((argument) => this.operand(argument, scope))
      : [];
    if (kind === 'coalesce') return args.find((value) => value != null && value !== '');
    if (kind !== 'function') return null;

    switch (resolver['name']) {
      case 'replace':
        return String(args[0] ?? '').replaceAll(
          String(args[1] ?? ''),
          String(args[2] ?? ''),
        );
      case 'colombianNitCheckDigit':
        return this.nitCheckDigit(String(args[0] ?? ''));
      default:
        return null;
    }
  }

  private functionBinding(
    binding: BindingDefinition,
    scope: XmlBindingScope,
  ): unknown {
    const args = binding.arguments?.map((argument) =>
      argument.kind === 'path'
        ? this.resolve(argument.path ?? '', scope)
        : argument.value,
    ) ?? [];
    if (binding.function === 'amountToWords') {
      return `${this.asNumber(args[0]).toLocaleString('es-CO')} ${args[1] ?? ''}`;
    }
    return binding.defaultValue ?? null;
  }

  private operand(raw: unknown, scope: XmlBindingScope): unknown {
    if (!raw || typeof raw !== 'object') return null;
    const operand = raw as Record<string, unknown>;
    return operand['kind'] === 'path'
      ? this.resolve(String(operand['path'] ?? ''), scope)
      : operand['value'];
  }

  private asNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private nitCheckDigit(value: string): number {
    const digits = [...value.replace(/\D/g, '')].map(Number);
    const weights = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3];
    const offset = weights.length - digits.length;
    const remainder =
      digits.reduce((sum, digit, index) => sum + digit * weights[index + offset], 0) %
      11;
    return remainder < 2 ? remainder : 11 - remainder;
  }
}
