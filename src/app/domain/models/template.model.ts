export type PdfElementType = 'text' | 'image' | 'container';
export type TextAlignment = 'left' | 'center' | 'right';
export type ImageFit = 'contain' | 'cover';

export interface PageDefinition {
  size: 'A4';
  orientation: 'portrait' | 'landscape';
  widthMm: number;
  heightMm: number;
  marginMm: number;
}

export interface ElementStyle {
  fontFamily?: string;
  fontSizePt?: number;
  bold?: boolean;
  color?: string;
  align?: TextAlignment;
  background?: string;
  borderColor?: string;
  borderWidthPx?: number;
  paddingMm?: number;
}

export interface ElementContent {
  value?: string;
  dataPath?: string;
  src?: string;
  fit?: ImageFit;
}

export interface PdfElement {
  id: string;
  type: PdfElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  required?: boolean;
  style: ElementStyle;
  content: ElementContent;
  children?: PdfElement[];
}

export interface PdfTemplate {
  schemaVersion: '1.0';
  name: string;
  page: PageDefinition;
  elements: PdfElement[];
}

export const A4_PORTRAIT: PageDefinition = {
  size: 'A4',
  orientation: 'portrait',
  widthMm: 210,
  heightMm: 297,
  marginMm: 10,
};
