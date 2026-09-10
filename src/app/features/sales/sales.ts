import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SalesApi } from '../../core/api/sales-api';
import { Toast } from '../../core/ui/toast';
import { Auth } from '../../core/auth/auth';
import { MoneyPipe } from '../../core/ui/money.pipe';
import { Sale } from '../../core/models';
import { Csv } from '../../core/ui/csv';

@Component({
  selector: 'app-sales',
  imports: [FormsModule, MoneyPipe, DatePipe],
  templateUrl: './sales.html',
})
export class Sales {
  private api = inject(SalesApi);
  private toast = inject(Toast);
  auth = inject(Auth);

  sales = signal<Sale[]>([]);
  loading = signal(true);
  search = signal('');
  methodFilter = signal<string | null>(null);

  detail = signal<Sale | null>(null);
  voidReason = signal('');
  voiding = signal(false);

  exporting = signal(false);

  constructor() {
    effect(() => {
      this.load(this.search(), this.methodFilter());
    });
  }

  private async load(search: string, method: string | null): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.list({ search, method: method ?? undefined });
      this.sales.set(res.data);
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudo cargar el historial.');
    } finally {
      this.loading.set(false);
    }
  }

  reload(): void {
    this.load(this.search(), this.methodFilter());
  }

  async openDetail(sale: Sale): Promise<void> {
    this.voidReason.set('');
    try {
      const res = await this.api.get(sale.id);
      this.detail.set(res.data);
    } catch (err) {
      this.toast.fromHttpError(err);
    }
  }

  async confirmVoid(): Promise<void> {
    const sale = this.detail();
    if (!sale || this.voiding()) return;

    this.voiding.set(true);
    try {
      await this.api.void(sale.id, this.voidReason().trim());
      this.toast.success(`Venta ${sale.number} anulada. El stock volvió al inventario.`);
      this.detail.set(null);
      this.reload();
    } catch (err) {
      this.toast.fromHttpError(err);
    } finally {
      this.voiding.set(false);
    }
  }

  methodLabel(method: string): string {
    const labels: Record<string, string> = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
    };
    return labels[method] ?? method;
  }

   async exportCsv(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
 
    try {
      const res = await this.api.list({
        search: this.search(),
        method: this.methodFilter() ?? undefined,
        per_page: 2000,
      });
 
      const sales = res.data;
 
      if (!sales.length) {
        this.toast.info('No hay ventas para exportar con esos filtros.');
        return;
      }
 
      const verCostos = this.auth.can('products.cost');
 
      const headers = [
        'Venta',
        'Fecha',
        'Hora',
        'Cliente',
        'CI/RUC',
        'Método de pago',
        'Estado',
        'Artículos',
        'Subtotal',
        'Descuento',
        'Recargo tarjeta',
        'IVA',
        'Total cobrado',
        'Ingreso del negocio',
        ...(verCostos ? ['Costo', 'Margen bruto'] : []),
        'Atendió',
        'Nota',
      ];
 
      const rows = sales.map((s) => {
        const fecha = new Date(s.sold_at);
        const articulos = (s.items ?? []).reduce((a, i) => a + i.qty, 0);
 
        return [
          s.number,
          fecha.toLocaleDateString('es-EC'),
          fecha.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
          s.customer_name,
          s.customer_ident === '9999999999' ? '' : s.customer_ident,
          this.methodLabel(s.payment_method),
          s.status === 'anulada' ? 'Anulada' : 'Completada',
          articulos,
          Csv.money(s.subtotal_cents),
          Csv.money(s.discount_cents),
          Csv.money(s.card_fee_cents),
          Csv.money(s.iva_cents),
          Csv.money(s.total_cents),
          Csv.money(s.business_income_cents),
          ...(verCostos
            ? [Csv.money(s.cost_total_cents), Csv.money(s.gross_margin_cents)]
            : []),
          s.user ?? '',
          s.override_reason ?? '',
        ];
      });
 
      Csv.download(`ventas-${Csv.today()}.csv`, headers, rows);
      this.toast.success(`${sales.length} ventas exportadas.`);
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudo exportar.');
    } finally {
      this.exporting.set(false);
    }
  }
}
