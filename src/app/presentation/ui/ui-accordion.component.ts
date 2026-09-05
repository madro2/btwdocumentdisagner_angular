import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-accordion',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-accordion-item" [class.expanded]="expanded()">
      <button
        type="button"
        class="ui-accordion-header"
        (click)="toggle()"
        [attr.aria-expanded]="expanded()"
      >
        <span class="ui-accordion-title">{{ title() }}</span>
        @if (badge()) {
          <span class="ui-accordion-badge">{{ badge() }}</span>
        }
        <svg
          class="ui-accordion-icon"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      @if (expanded()) {
        <div class="ui-accordion-content">
          <ng-content />
        </div>
      }
    </div>
  `,
  styles: [
    `
      .ui-accordion-item {
        border-bottom: 1px solid var(--border, #e2e8f0);
      }
      .ui-accordion-header {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 10px 14px;
        background: transparent;
        border: none;
        cursor: pointer;
        text-align: left;
        user-select: none;
        transition: background 0.15s ease;
      }
      .ui-accordion-header:hover {
        background: #f8fafc;
      }
      .ui-accordion-title {
        flex: 1;
        font-size: 11.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #475569;
      }
      .ui-accordion-badge {
        font-size: 10px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 999px;
        background: #f1f5f9;
        color: #64748b;
        margin-right: 8px;
      }
      .ui-accordion-icon {
        color: #94a3b8;
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .expanded .ui-accordion-icon {
        transform: rotate(180deg);
      }
      .ui-accordion-content {
        padding: 10px 14px 14px;
      }
    `,
  ],
})
export class UiAccordionComponent {
  readonly title = input.required<string>();
  readonly badge = input<string | number>();
  readonly expanded = input<boolean>(true);
  readonly toggleChange = output<boolean>();

  toggle(): void {
    this.toggleChange.emit(!this.expanded());
  }
}
