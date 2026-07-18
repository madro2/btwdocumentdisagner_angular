import { PdfElement, PdfElementType } from '../models/template.model';

/** Crea un elemento vacío del tipo indicado. Sin valores de demostración. */
export function createElement(type: PdfElementType): PdfElement {
  return {
    id: crypto.randomUUID(),
    type,
    name: '',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    style: {},
    content: {},
    ...(type === 'container' ? { children: [] } : {}),
  };
}
