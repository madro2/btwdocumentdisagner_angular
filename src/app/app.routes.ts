import { Routes } from '@angular/router';
import { EditorPage } from './presentation/editor/editor-page';
import { HomePage } from './presentation/home/home-page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'editor', component: EditorPage },
  { path: 'editor/:id', component: EditorPage },
  { path: '**', redirectTo: '' },
];
