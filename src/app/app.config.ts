import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { TEMPLATE_REPOSITORY } from './application/tokens/template-repository.token';
import { ApiTemplateRepository } from './infrastructure/persistence/api-template.repository';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: TEMPLATE_REPOSITORY,
      useClass: ApiTemplateRepository,
    },
  ]
};
