import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-color-picker',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-color-field">
      @if (label()) {
        <label class="ui-color-label">{{ label() }}</label>
      }
      <div class="ui-color-wrapper">
        <input
          type="color"
          class="ui-color-swatch"
          [value]="value() || '#ffffff'"
          (input)="onInput($event)"
        />
        <input
          type="text"
          class="ui-color-hex"
          maxlength="7"
          [value]="value() || ''"
          placeholder="#000000"
          (change)="onHexChange($event)"
        />
      </div>
    </div>
  `,
  styles: [
    `
      .ui-color-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .ui-color-label {
        font-size: 11px;
        font-weight: 500;
        color: #64748b;
      }
      .ui-color-wrapper {
        display: flex;
        align-items: center;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 2px 4px;
        gap: 6px;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .ui-color-wrapper:focus-within {
        border-color: #8b0020;
        box-shadow: 0 0 0 2px rgba(139, 0, 32, 0.12);
      }
      .ui-color-swatch {
        width: 22px;
        height: 22px;
        border: none;
        border-radius: 4px;
        padding: 0;
        cursor: pointer;
        background: transparent;
      }
      .ui-color-swatch::-webkit-color-swatch-wrapper {
        padding: 0;
      }
      .ui-color-swatch::-webkit-color-swatch {
        border: 1px solid #cbd5e1;
        border-radius: 4px;
      }
      .ui-color-hex {
        width: 100%;
        border: none;
        outline: none;
        font-family: monospace;
        font-size: 11px;
        color: #1e293b;
        text-transform: uppercase;
        background: transparent;
      }
    `,
  ],
})
export class UiColorPickerComponent {
  readonly label = input<string>();
  readonly value = input<string | undefined | null>('#000000');
  readonly valueChange = output<string>();

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.valueChange.emit(val);
  }

  onHexChange(event: Event): void {
    let val = (event.target as HTMLInputElement).value.trim();
    if (val && !val.startsWith('#')) {
      val = `#${val}`;
    }
    this.valueChange.emit(val);
  }
}
