import { Injectable } from '@angular/core';
import {
  ComponentType,
  DesignComponent,
  DesignContract,
} from '../../domain/models/template.model';

const SUPPORTED_TYPES = new Set<ComponentType>([
  'text',
  'image',
  'container',
  'table',
  'link',
  'qrCode',
  'pageNumber',
  'line',
  'rectangle',
  'barcode',
  'pageBreak',
]);

@Injectable({ providedIn: 'root' })
export class ContractValidatorService {
  validate(contract: DesignContract): string[] {
    const errors: string[] = [];
    if (!['2.1', '2.2', '3.0'].includes(contract.schemaVersion)) {
      errors.push(`schemaVersion '${contract.schemaVersion}' no está soportada.`);
    }
    if (!contract.document?.id || !contract.document.name) {
      errors.push('document.id y document.name son obligatorios.');
    }
    if (
      !contract.page ||
      contract.page.widthMm <= 0 ||
      contract.page.heightMm <= 0
    ) {
      errors.push('La página debe tener dimensiones positivas.');
      return errors;
    }

    const ids = new Set<string>();
    this.validateComponents(
      contract.components ?? [],
      contract.page.widthMm,
      contract.page.heightMm,
      ids,
      errors,
    );

    // Los bindings pendientes son advertencias en plantillas en desarrollo,
    // no deben bloquear el uso ni la exportación del diseño incompleto.
    return errors;
  }

  warnings(contract: DesignContract): string[] {
    const warnings: string[] = [];
    for (const pending of contract.validation?.pendingBindings ?? []) {
      const bindingId = typeof pending === 'object' && pending !== null ? (pending as any).id || JSON.stringify(pending) : pending;
      warnings.push(`Campo dinámico sin configurar (Binding pendiente): ${bindingId}`);
    }
    return warnings;
  }

  private validateComponents(
    components: DesignComponent[],
    widthMm: number,
    heightMm: number,
    ids: Set<string>,
    errors: string[],
  ): void {
    for (const component of components) {
      if (!component.id) {
        errors.push('Todos los componentes deben tener id.');
        continue;
      }
      if (ids.has(component.id)) {
        errors.push(`Id de componente duplicado: ${component.id}.`);
      }
      ids.add(component.id);

      if (!SUPPORTED_TYPES.has(component.type)) {
        errors.push(
          `Tipo '${String(component.type)}' no soportado en ${component.id}.`,
        );
      }

      const position = component.position;
      if (
        !position ||
        position.width < 0 ||
        position.height < 0 ||
        position.x < 0 ||
        position.y < 0 ||
        position.x + position.width > widthMm + 0.01 ||
        position.y + position.height > heightMm + 0.01
      ) {
        errors.push(`El componente ${component.id} está fuera de sus límites.`);
      }

      if (component.type === 'table' && component.columns?.length) {
        const sum = component.columns.reduce(
          (total, column) => total + (column.widthMm ?? 0),
          0,
        );
        if (Math.abs(sum - position.width) > 0.1) {
          errors.push(
            `La suma de columnas de ${component.id} (${sum.toFixed(2)} mm) no coincide con su ancho (${position.width.toFixed(2)} mm).`,
          );
        }
      }

      this.validateComponents(
        component.components ?? [],
        position.width,
        position.height,
        ids,
        errors,
      );
    }
  }
}
