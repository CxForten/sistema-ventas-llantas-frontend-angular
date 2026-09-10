import { SaleDetail } from './../../core/ui/sale-detail';
import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReportsApi, SalesReport, TopProduct, TopSpec } from '../../core/api/reports-api';
import { SalesApi } from '../../core/api/sales-api';
import { Toast } from '../../core/ui/toast';
import { Auth } from '../../core/auth/auth';
import { MoneyPipe } from '../../core/ui/money.pipe';
import { DashboardData, Sale } from '../../core/models';

interface DaySeries {
  date: string;
  label: string;
  total_cents: number;
  income_cents: number;
  sales_count: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [MoneyPipe, DatePipe, SaleDetail],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private api = inject(ReportsApi);
  private salesApi = inject(SalesApi);
  private toast = inject(Toast);
  auth = inject(Auth);

  data = signal<DashboardData | null>(null);
  topProducts = signal<TopProduct[]>([]);
  topSpecs = signal<TopSpec[]>([]);
  salesReport = signal<SalesReport | null>(null);
  recentSales = signal<Sale[]>([]);
  loading = signal(true);

  /* --- Detalle de un día --- */
  dayOpen = signal(false);
  daySelected = signal<DaySeries | null>(null);
  daySales = signal<Sale[]>([]);
  dayLoading = signal(false);

  saleDetail = signal<Sale | null> (null);

  readonly maxSeries = computed(() => {
    const series = this.data()?.series ?? [];
    return Math.max(1, ...series.map((s) => s.total_cents));
  });

  /* --- Totales del día abierto, calculados sobre las ventas traídas --- */
  readonly dayTotals = computed(() => {
    const sales = this.daySales();
    return {
      count: sales.length,
      total: sales.reduce((a, s) => a + s.total_cents, 0),
      income: sales.reduce((a, s) => a + s.business_income_cents, 0),
      margin: sales.reduce((a, s) => a + (s.gross_margin_cents ?? 0), 0),
    };
  });

   readonly maxProductQty = computed(() =>
    Math.max(1, ...this.topProducts().map((p) => p.qty))
  );

  readonly maxSpecQty = computed(() =>
    Math.max(1, ...this.topSpecs().map((s) => s.qty))
  );

  readonly maxMethodCents = computed(() =>
    Math.max(1, ...(this.salesReport()?.by_method ?? []).map((m) => m.total_cents))
  );

  readonly maxCategoryCents = computed(() =>
    Math.max(1, ...(this.salesReport()?.by_category ?? []).map((c) => c.total_cents))
  );



  constructor() {
    this.load();
  }

  barHeight(cents: number): string {
    const pct = (cents / this.maxSeries()) * 100;
    return Math.max(2, pct) + '%';
  }

  isToday(date: string): boolean {
    return date === new Date().toISOString().slice(0, 10);
  }

  itemCount(sale: Sale): number {
    return (sale.items ?? []).reduce((a, i) => a + i.qty, 0);
  }

  methodLabel(method: string): string {
    const labels: Record<string, string> = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
    };
    return labels[method] ?? method;
  }

   private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [dashboard, products, specs, recent, report] = await Promise.all([
        this.api.dashboard(),
        this.api.topProducts(),
        this.api.topSpec(),
        this.salesApi.list({ per_page: 6 }),
        this.api.sales(),
      ]);

      this.data.set(dashboard);
      this.topProducts.set(products.data);
      this.topSpecs.set(specs.data);
      this.recentSales.set(recent.data);
      this.salesReport.set(report);
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudieron cargar los reportes.');
    } finally {
      this.loading.set(false);
    }
  }



  /** Abre el detalle de un día al tocar su barra. */
  async openDay(day: DaySeries): Promise<void> {
    // Sin ventas no hay nada que mostrar
    if (day.sales_count === 0) {
      this.toast.info(`No hubo ventas el ${day.label}.`);
      return;
    }

    this.daySelected.set(day);
    this.daySales.set([]);
    this.dayOpen.set(true);
    this.dayLoading.set(true);

    try {
      const res = await this.salesApi.listByDay(day.date);
      this.daySales.set(res.data);
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudieron cargar las ventas del día.');
      this.dayOpen.set(false);
    } finally {
      this.dayLoading.set(false);
    }
  }

  closeDay(): void {
    this.dayOpen.set(false);
    this.daySelected.set(null);
  }

   async openSale(sale: Sale): Promise<void> {
    try {
      const res = await this.salesApi.get(sale.id);
      this.saleDetail.set(res.data);
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudo abrir la venta.');
    }
  }

  closeSale(): void {
    this.saleDetail.set(null);
  }

    barPct(value: number, max: number): string {
    return Math.max(3, (value / max) * 100) + '%';
  }


  

}