import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-number-field',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-field" [class.compact]="compact()">
      @if (label()) {
        <label class="ui-label" [attr.for]="id()">{{ label() }}</label>
      }
      <div class="ui-input-wrapper">
        <input
          [id]="id()"
          type="number"
          class="ui-input"
          [value]="value()"
          [min]="min() ?? null"
          [max]="max() ?? null"
          [step]="step() ?? 1"
          [disabled]="disabled()"
          (input)="onInput($event)"
        />
        @if (unit()) {
          <span class="ui-unit">{{ unit() }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .ui-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .ui-label {
        font-size: 11px;
        font-weight: 500;
        color: #64748b;
      }
      .ui-input-wrapper {
        display: flex;
        align-items: center;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        overflow: hidden;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .ui-input-wrapper:focus-within {
        border-color: #8b0020;
        box-shadow: 0 0 0 2px rgba(139, 0, 32, 0.12);
      }
      .ui-input {
        width: 100%;
        padding: 5px 8px;
        font-size: 12px;
        color: #1e293b;
        background: transparent;
        border: none;
        outline: none;
      }
      .ui-unit {
        padding-right: 8px;
        font-size: 10.5px;
        font-weight: 600;
        color: #94a3b8;
        user-select: none;
      }
      .compact .ui-input {
        padding: 4px 6px;
      }
    `,
  ],
})
export class UiNumberFieldComponent {
  readonly id = input<string>(`ui-num-${Math.random().toString(36).substring(2, 7)}`);
  readonly label = input<string>();
  readonly value = input<number | undefined | null>();
  readonly min = input<number>();
  readonly max = input<number>();
  readonly step = input<number>();
  readonly unit = input<string>();
  readonly compact = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly valueChange = output<number>();

  onInput(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.valueChange.emit(val);
  }
}
