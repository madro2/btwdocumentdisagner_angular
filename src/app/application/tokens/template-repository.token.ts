import { InjectionToken } from '@angular/core';
import { TemplateRepository } from '../../domain/ports/template.repository';

export const TEMPLATE_REPOSITORY = new InjectionToken<TemplateRepository>(
  'TemplateRepository',
);
