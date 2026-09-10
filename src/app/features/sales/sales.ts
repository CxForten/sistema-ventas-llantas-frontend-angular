import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SalesApi } from '../../core/api/sales-api';
import { Toast } from '../../core/ui/toast';
import { Auth } from '../../core/auth/auth';
import { MoneyPipe } from '../../core/ui/money.pipe';
import { Sale } from '../../core/models';

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
}
