import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type IconName =
  | 'undo'
  | 'redo'
  | 'file'
  | 'folder'
  | 'save'
  | 'download'
  | 'plus'
  | 'trash'
  | 'copy'
  | 'text'
  | 'image'
  | 'table'
  | 'container'
  | 'link'
  | 'qrcode'
  | 'barcode'
  | 'line'
  | 'rectangle'
  | 'page-break'
  | 'page-number'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'align-justify'
  | 'chevron-down'
  | 'chevron-right'
  | 'eye'
  | 'zoom-in'
  | 'zoom-out'
  | 'grid'
  | 'check';

@Component({
  selector: 'ui-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="ui-icon"
    >
      @switch (name()) {
        @case ('undo') {
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        }
        @case ('redo') {
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
        }
        @case ('save') {
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        }
        @case ('download') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        }
        @case ('file') {
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        }
        @case ('plus') {
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        }
        @case ('trash') {
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        }
        @case ('copy') {
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        }
        @case ('text') {
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        }
        @case ('image') {
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        }
        @case ('table') {
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
        }
        @case ('container') {
          <rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3" />
        }
        @case ('link') {
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        }
        @case ('qrcode') {
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        }
        @case ('barcode') {
          <path d="M4 5v14M7 5v14M9 5v14M13 5v14M15 5v14M19 5v14M21 5v14" />
        }
        @case ('line') {
          <line x1="4" y1="12" x2="20" y2="12" />
        }
        @case ('rectangle') {
          <rect x="3" y="5" width="18" height="14" rx="2" />
        }
        @case ('page-break') {
          <path d="M4 12h16" stroke-dasharray="4 4" />
          <polyline points="8 8 12 4 16 8" />
          <polyline points="16 16 12 20 8 16" />
        }
        @case ('page-number') {
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <line x1="12" y1="11" x2="12" y2="17" />
        }
        @case ('bold') {
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        }
        @case ('italic') {
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        }
        @case ('underline') {
          <path d="M6 3v7a6 6 0 0 0 12 0V3" />
          <line x1="4" y1="21" x2="20" y2="21" />
        }
        @case ('align-left') {
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="15" y1="12" x2="3" y2="12" />
          <line x1="17" y1="18" x2="3" y2="18" />
        }
        @case ('align-center') {
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="17" y1="12" x2="7" y2="12" />
          <line x1="19" y1="18" x2="5" y2="18" />
        }
        @case ('align-right') {
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="12" x2="9" y2="12" />
          <line x1="21" y1="18" x2="7" y2="18" />
        }
        @case ('align-justify') {
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="12" x2="3" y2="12" />
          <line x1="21" y1="18" x2="3" y2="18" />
        }
        @case ('chevron-down') {
          <polyline points="6 9 12 15 18 9" />
        }
        @case ('chevron-right') {
          <polyline points="9 18 15 12 9 6" />
        }
        @case ('grid') {
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        }
        @case ('check') {
          <polyline points="20 6 9 17 4 12" />
        }
      }
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      }
      .ui-icon {
        display: block;
        vertical-align: middle;
      }
    `,
  ],
})
export class UiIconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(16);
  readonly strokeWidth = input<number>(1.75);
}
