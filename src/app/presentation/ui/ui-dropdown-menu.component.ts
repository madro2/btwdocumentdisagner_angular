import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: string;
  danger?: boolean;
  divider?: boolean;
}

@Component({
  selector: 'ui-dropdown-menu',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-dropdown" [class.open]="isOpen()">
      <button
        type="button"
        class="ui-dropdown-trigger"
        (click)="toggle()"
        [attr.aria-expanded]="isOpen()"
      >
        <span>{{ label() }}</span>
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      @if (isOpen()) {
        <div class="ui-dropdown-backdrop" (click)="close()"></div>
        <div class="ui-dropdown-menu">
          @for (item of items(); track item.id) {
            @if (item.divider) {
              <div class="ui-dropdown-divider"></div>
            } @else {
              <button
                type="button"
                class="ui-dropdown-item"
                [class.danger]="item.danger"
                (click)="select(item)"
              >
                {{ item.label }}
              </button>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .ui-dropdown {
        position: relative;
        display: inline-block;
      }
      .ui-dropdown-trigger {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        font-size: 12.5px;
        font-weight: 500;
        color: #334155;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease;
      }
      .ui-dropdown-trigger:hover,
      .ui-dropdown.open .ui-dropdown-trigger {
        background: #f1f5f9;
        border-color: #cbd5e1;
      }
      .ui-dropdown-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99;
      }
      .ui-dropdown-menu {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        z-index: 100;
        min-width: 170px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
        padding: 4px;
      }
      .ui-dropdown-item {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 6px 10px;
        font-size: 12px;
        color: #1e293b;
        background: transparent;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        text-align: left;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .ui-dropdown-item:hover {
        background: #f8fafc;
        color: #0f172a;
      }
      .ui-dropdown-item.danger {
        color: #dc2626;
      }
      .ui-dropdown-item.danger:hover {
        background: #fef2f2;
      }
      .ui-dropdown-divider {
        height: 1px;
        background: #e2e8f0;
        margin: 4px 0;
      }
    `,
  ],
})
export class UiDropdownMenuComponent {
  readonly label = input.required<string>();
  readonly items = input.required<DropdownItem[]>();
  readonly isOpen = input<boolean>(false);
  readonly itemSelect = output<string>();
  readonly toggleChange = output<boolean>();

  toggle(): void {
    this.toggleChange.emit(!this.isOpen());
  }

  close(): void {
    this.toggleChange.emit(false);
  }

  select(item: DropdownItem): void {
    this.itemSelect.emit(item.id);
    this.close();
  }
}
