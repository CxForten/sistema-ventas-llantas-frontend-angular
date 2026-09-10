import { Component, computed, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Auth } from '../auth/auth';
import { MoneyPipe } from './money.pipe';
import { Sale } from '../models';

/**
 * Detalle de una venta en modal. Se usa desde el dashboard, las ventas
 * recientes, el detalle de un día y el historial.
 *
 * Muestra las tres cifras separadas: cobrado, ingreso del negocio y margen.
 * El costo y el margen solo se ven con el permiso products.cost.
 */
@Component({
  selector: 'app-sale-detail',
  imports: [MoneyPipe, DatePipe],
  templateUrl: './sale-detail.html',
})
export class SaleDetail {
  auth = inject(Auth);

  readonly sale = input.required<Sale>();
  readonly canVoid = input(false);

  readonly closed = output<void>();
  readonly voidRequested = output<Sale>();

  readonly canSeeCost = computed(() => this.auth.can('products.cost'));

  readonly payment = computed(() => this.sale().payments?.[0] ?? null);

  methodLabel(method: string): string {
    const labels: Record<string, string> = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
    };
    return labels[method] ?? method;
  }
}