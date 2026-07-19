import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

  generate(): void {
    const design = this.currentDesign();
    if (!design || !this.cufe()) {
      this.status.set('Indica el CUFE y selecciona un formato.');
      return;
    }

    this.loading.set(true);
    this.status.set('Consultando XML ERP y generando PDF...');
    this.http
      .post(
        `${environment.apiBaseUrl}/electronic-documents/interpret`,
        {
          cufe: this.cufe(),
          designName: design.designName,
          version: design.designVersion,
        },
        { responseType: 'blob' },
      )
      .subscribe({
        next: (pdf) => {
          this.revokePdfUrl();
          this.pdfObjectUrl = URL.createObjectURL(pdf);
          this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfObjectUrl));
          this.loading.set(false);
          this.status.set('Documento interpretado correctamente.');
        },
        error: (error) => {
          this.loading.set(false);
          this.showRequestError(
            error,
            'No fue posible obtener o interpretar el documento electrónico.',
          );
        },
      });
  }

  downloadXml(): void {
    if (!this.cufe()) {
      this.status.set('Indica primero el CUFE.');
      return;
    }

    this.loading.set(true);
    this.http
      .get<XmlResponse>(
        `${environment.apiBaseUrl}/electronic-documents/${encodeURIComponent(this.cufe())}/xml`,
      )
      .subscribe({
        next: (response) => {
          const binary = atob(response.base64);
          const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
          const url = URL.createObjectURL(new Blob([bytes], { type: response.contentType }));
          const link = document.createElement('a');
          link.href = url;
          link.download = response.fileName;
          link.click();
          URL.revokeObjectURL(url);
          this.loading.set(false);
          this.status.set('XML ERP descargado en UTF-8.');
        },
        error: () => {
          this.loading.set(false);
          this.status.set('No fue posible descargar el XML ERP.');
        },
      });
  }

  designKey(design: DesignDto): string {
    return `${design.id}|${design.designVersion}`;
  }

  private currentDesign(): DesignDto | undefined {
    return this.designs().find((design) => this.designKey(design) === this.selectedDesign());
  }

  private showRequestError(error: unknown, fallback: string): void {
    const response = error as {
      error?: Blob | string | { message?: string };
    };
    if (response.error instanceof Blob) {
      void response.error.text().then((message) => this.status.set(message || fallback));
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
