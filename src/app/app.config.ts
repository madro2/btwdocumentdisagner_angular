import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { TEMPLATE_REPOSITORY } from './application/tokens/template-repository.token';
import { LocalTemplateRepository } from './infrastructure/persistence/local-template.repository';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    {
      provide: TEMPLATE_REPOSITORY,
      useClass: LocalTemplateRepository,
    },
  ]
};
