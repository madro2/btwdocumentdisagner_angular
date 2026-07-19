import { HttpClient } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface DesignDto {
  id: string;
  designName: string;
  designVersion: number;
}

interface XmlResponse {
  cufe: string;
  fileName: string;
  contentType: string;
  base64: string;
}

interface SourceUrlResponse {
  cufe: string;
  url: string;
}

@Component({
  selector: 'app-electronic-document-demo',
  imports: [FormsModule, RouterLink],
  templateUrl: './electronic-document-demo.html',
  styleUrl: './electronic-document-demo.css',
})
export class ElectronicDocumentDemo implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private pdfObjectUrl: string | null = null;
  readonly designs = signal<DesignDto[]>([]);
  readonly selectedDesign = signal('');
  readonly cufe = signal('');
  readonly loading = signal(false);
  readonly status = signal('');
  readonly pdfUrl = signal<SafeResourceUrl | null>(null);

  ngOnInit(): void {
    this.http.get<DesignDto[]>(`${environment.apiBaseUrl}/Designs`).subscribe({
      next: (designs) => {
        const valid = designs.filter((design) => design.designName && design.designVersion > 0);
        this.designs.set(valid);
        if (valid.length) {
          this.selectedDesign.set(this.designKey(valid[0]));
        }
      },
      error: () => this.status.set('No fue posible consultar los formatos disponibles.'),
    });
  }

  ngOnDestroy(): void {
    this.revokePdfUrl();
  }

  updateCufe(event: Event): void {
    this.cufe.set((event.target as HTMLInputElement).value.trim());
  }

  updateDesign(event: Event): void {
    this.selectedDesign.set((event.target as HTMLSelectElement).value);
  }

  async generate(): Promise<void> {
    const design = this.currentDesign();
    if (!design || !this.cufe()) {
      this.status.set('Indica el CUFE y selecciona un formato.');
      return;
    }

    this.loading.set(true);
    try {
      let xml: string | null = null;
      try {
        this.status.set('Consultando XML ERP desde la red local...');
        xml = await this.fetchXmlFromSource(this.cufe());
      } catch {
        this.status.set('La red local no respondió. Intentando la consulta desde el backend...');
      }

      let pdf: Blob;
      if (xml) {
        this.status.set('XML ERP obtenido. Generando PDF...');
        pdf = await firstValueFrom(
          this.http.post(`${environment.apiBaseUrl}/pdf/generate`, xml, {
            params: {
              designName: design.designName,
              version: design.designVersion,
            },
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
            },
            responseType: 'blob',
          }),
        );
      } else {
        pdf = await firstValueFrom(
          this.http.post(
            `${environment.apiBaseUrl}/electronic-documents/interpret`,
            {
              cufe: this.cufe(),
              designName: design.designName,
              version: design.designVersion,
            },
            { responseType: 'blob' },
          ),
        );
      }

      this.revokePdfUrl();
      this.pdfObjectUrl = URL.createObjectURL(pdf);
      this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfObjectUrl));
      this.status.set('Documento interpretado correctamente.');
    } catch (error) {
      await this.showRequestError(
        error,
        'No fue posible obtener o interpretar el documento electrónico.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async downloadXml(): Promise<void> {
    if (!this.cufe()) {
      this.status.set('Indica primero el CUFE.');
      return;
    }

    this.loading.set(true);
    try {
      let xml: string;
      try {
        this.status.set('Consultando XML ERP desde la red local...');
        xml = await this.fetchXmlFromSource(this.cufe());
      } catch {
        this.status.set('La red local no respondió. Intentando la consulta desde el backend...');
        const response = await firstValueFrom(
          this.http.get<XmlResponse>(
            `${environment.apiBaseUrl}/electronic-documents/${encodeURIComponent(this.cufe())}/xml`,
          ),
        );
        xml = this.decodeXmlPayload(response.base64);
      }

      this.downloadXmlFile(xml, `${this.cufe()}.xml`);
      this.status.set('XML ERP descargado en UTF-8.');
    } catch (error) {
      await this.showRequestError(error, 'No fue posible descargar el XML ERP.');
    } finally {
      this.loading.set(false);
    }
  }

  designKey(design: DesignDto): string {
    return `${design.id}|${design.designVersion}`;
  }

  private currentDesign(): DesignDto | undefined {
    return this.designs().find((design) => this.designKey(design) === this.selectedDesign());
  }

  private async fetchXmlFromSource(cufe: string): Promise<string> {
    const source = await firstValueFrom(
      this.http.get<SourceUrlResponse>(
        `${environment.apiBaseUrl}/electronic-documents/${encodeURIComponent(cufe)}/source-url`,
      ),
    );
    const response = await fetch(source.url, {
      headers: {
        Accept: 'application/json, application/xml, text/plain',
      },
    });
    if (!response.ok) {
      throw new Error(`FilesFE respondió HTTP ${response.status}.`);
    }
    return this.decodeXmlPayload(await response.text());
  }

  private decodeXmlPayload(payload: string): string {
    const trimmed = payload.trim();
    let candidate = trimmed;
    if (!trimmed.startsWith('<')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        candidate = this.findXmlPayload(parsed) ?? trimmed;
      } catch {
        candidate = trimmed;
      }
    }

    if (candidate.trimStart().startsWith('<')) {
      return this.normalizeXmlEncoding(candidate);
    }

    let bytes: Uint8Array;
    try {
      const binary = atob(candidate.trim());
      bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } catch {
      bytes = new TextEncoder().encode(candidate);
    }

    const header = new TextDecoder('ascii').decode(bytes.slice(0, 256));
    const declaredEncoding = header.match(/encoding\s*=\s*['"]([^'"]+)['"]/i)?.[1];
    let xml: string;
    try {
      xml = new TextDecoder(declaredEncoding || 'utf-8', {
        fatal: true,
      }).decode(bytes);
    } catch {
      xml = new TextDecoder('iso-8859-1').decode(bytes);
    }

    if (!xml.trimStart().startsWith('<')) {
      throw new Error('FilesFE no devolvió un XML ERP válido.');
    }
    return this.normalizeXmlEncoding(xml);
  }

  private findXmlPayload(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    }
    if (!value || typeof value !== 'object') {
      return null;
    }

    const record = value as Record<string, unknown>;
    for (const key of ['base64', 'data', 'content', 'xml', 'file']) {
      if (typeof record[key] === 'string' && record[key]) {
        return record[key] as string;
      }
    }
    return this.findXmlPayload(record['result']);
  }

  private normalizeXmlEncoding(xml: string): string {
    return xml.replace(/encoding\s*=\s*['"][^'"]+['"]/i, 'encoding="utf-8"');
  }

  private downloadXmlFile(xml: string, fileName: string): void {
    const url = URL.createObjectURL(
      new Blob([new TextEncoder().encode(xml)], {
        type: 'application/xml; charset=utf-8',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private async showRequestError(error: unknown, fallback: string): Promise<void> {
    const response = error as {
      error?: Blob | string | { message?: string };
    };
    if (response.error instanceof Blob) {
      this.status.set((await response.error.text()) || fallback);
      return;
    }
    if (typeof response.error === 'string') {
      this.status.set(response.error || fallback);
      return;
    }
    this.status.set(response.error?.message || fallback);
  }

  private revokePdfUrl(): void {
    if (this.pdfObjectUrl) {
      URL.revokeObjectURL(this.pdfObjectUrl);
      this.pdfObjectUrl = null;
    }
    this.pdfUrl.set(null);
  }
}
