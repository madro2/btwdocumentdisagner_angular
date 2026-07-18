import { Component } from '@angular/core';
import { EditorPage } from './presentation/editor/editor-page';

@Component({
  selector: 'app-root',
  imports: [EditorPage],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
