import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { StockApi, MovementType } from '../../core/api/stock-api';
import { Toast } from '../../core/ui/toast';
import { StockMovement } from '../../core/models';

interface TypeFilter {
  value: MovementType | null;
  label: string;
}

@Component({
  selector: 'app-movements',
  imports: [FormsModule, DatePipe],
  templateUrl: './movements.html',
})
export class Movements {
  private api = inject(StockApi);
  private toast = inject(Toast);

  movements = signal<StockMovement[]>([]);
  loading = signal(true);
  search = signal('');
  typeFilter = signal<MovementType | null>(null);

  page = signal(1);
  lastPage = signal(1);
  total = signal(0);

  readonly filters: TypeFilter[] = [
    { value: null, label: 'Todos' },
    { value: 'venta', label: 'Ventas' },
    { value: 'entrada', label: 'Entradas' },
    { value: 'salida', label: 'Salidas' },
    { value: 'ajuste', label: 'Conteos' },
    { value: 'anulacion', label: 'Anulaciones' },
  ];

  /** Resumen de lo que se está viendo, para dar contexto a la tabla. */
  readonly totals = computed(() => {
    const list = this.movements();
    return {
      entradas: list.filter((m) => m.qty > 0).reduce((a, m) => a + m.qty, 0),
      salidas: list.filter((m) => m.qty < 0).reduce((a, m) => a + Math.abs(m.qty), 0),
    };
  });

  constructor() {
    effect(() => {
      const search = this.search();
      const type = this.typeFilter();
      const page = this.page();
      this.load(search, type, page);
    });
  }

  private async load(search: string, type: MovementType | null, page: number): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.movements({ search, type, page });
      this.movements.set(res.data);
      this.lastPage.set(res.meta.last_page);
      this.total.set(res.meta.total);
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudieron cargar los movimientos.');
    } finally {
      this.loading.set(false);
    }
  }

  setType(type: MovementType | null): void {
    this.typeFilter.set(type);
    this.page.set(1);
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  prevPage(): void {
    if (this.page() > 1) this.page.update((p) => p - 1);
  }

  nextPage(): void {
    if (this.page() < this.lastPage()) this.page.update((p) => p + 1);
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      entrada: 'Entrada',
      salida: 'Salida',
      ajuste: 'Conteo',
      venta: 'Venta',
      anulacion: 'Anulación',
      inicial: 'Inicial',
    };
    return labels[type] ?? type;
  }

  /** Cada tipo con su color, para reconocerlo sin leer. */
  typeClass(type: string): string {
    const classes: Record<string, string> = {
      entrada: 'badge-green',
      salida: 'badge-amber',
      ajuste: 'badge-blue',
      venta: 'badge-gray',
      anulacion: 'badge-red',
      inicial: 'badge-gray',
    };
    return classes[type] ?? 'badge-gray';
  }
}