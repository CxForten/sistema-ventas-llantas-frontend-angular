import { Injectable, signal, computed } from '@angular/core';
import { Money } from '../../core/ui/money';
import { Product, PaymentMethod } from '../../core/models';

export interface CartLine {
  product: Product;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  readonly lines = signal<CartLine[]>([]);
  readonly discountCents = signal(0);
  readonly paymentMethod = signal<PaymentMethod>('efectivo');

  /**
   * null  = cada producto usa su propio margen (lo normal).
   * número = el cajero tocó el selector y ese margen pisa a todos.
   */
  readonly marginOverride = signal<number | null>(null);

  /**
   * Total escrito a mano por el cajero. null = se usa el calculado.
   * Cuando tiene valor, ese ES el total final: no se le suma nada encima.
   */
  readonly overrideTotalCents = signal<number | null>(null);
  readonly overrideReason = signal('');

  /** Se carga desde /api/settings al abrir el POS. */
  readonly cardFeePct = signal(15);

  readonly count = computed(() => this.lines().reduce((a, l) => a + l.qty, 0));

  readonly costTotalCents = computed(() =>
    this.lines().reduce((a, l) => a + (l.product.cost_cents ?? 0) * l.qty, 0)
  );

  unitPrice(product: Product): number {
    const override = this.marginOverride();
    if (override === null) return product.price_cents;
    return Money.withMargin(product.cost_cents ?? 0, override);
  }

  lineTotal(line: CartLine): number {
    return this.unitPrice(line.product) * line.qty;
  }

  readonly subtotalCents = computed(() =>
    this.lines().reduce((a, l) => a + this.unitPrice(l.product) * l.qty, 0)
  );

  readonly marginAltPct = signal(20);

  /** Subtotal con el margen alterno, para mostrarlo en el selector. */
  readonly altSubtotalCents = computed(() =>
  this.lines().reduce(
    (a, l) => a + Money.withMargin(l.product.cost_cents ?? 0, this.marginAltPct()) * l.qty,
    0
  )
);

  readonly baseCents = computed(() => {
      const override = this.overrideTotalCents();
      if (override !== null) return override;
      return Math.max(0, this.subtotalCents() - this.discountCents());
    });

  /** Lo que se lleva el banco. Se calcula sobre la base, no sobre el total editado. */
  readonly cardFeeCents = computed(() =>
    this.paymentMethod() === 'tarjeta'
      ? Math.round((this.baseCents() * this.cardFeePct()) / 100)
      : 0
  );

  /** El total que sale de la aritmética, sin intervención del cajero. */
  readonly computedTotalCents = computed(() => this.baseCents() + this.cardFeeCents());

  /** El total real a cobrar. */
  readonly totalCents = computed(() => this.baseCents() + this.cardFeeCents());

  readonly isOverridden = computed(() => {
    const override = this.overrideTotalCents();
    if (override === null) return false;
    return override !== Math.max(0, this.subtotalCents() - this.discountCents());
  });

  /** El recargo de tarjeta no es del negocio. */
  readonly incomeCents = computed(() => this.totalCents() - this.cardFeeCents());

  readonly marginCents = computed(() => this.incomeCents() - this.costTotalCents());

  add(product: Product): { ok: boolean; message?: string } {
    if (product.track_stock && product.stock <= 0) {
      return { ok: false, message: `${product.name} no tiene stock.` };
    }

    const lines = this.lines();
    const existing = lines.find((l) => l.product.id === product.id);

    if (existing) {
      if (product.track_stock && existing.qty >= product.stock) {
        return { ok: false, message: `Solo quedan ${product.stock} de ${product.name}.` };
      }
      this.lines.set(lines.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l)));
    } else {
      this.lines.set([...lines, { product, qty: 1 }]);
    }

    return { ok: true };
  }

  changeQty(productId: number, delta: number): void {
    const lines = this.lines();
    const line = lines.find((l) => l.product.id === productId);
    if (!line) return;

    const next = line.qty + delta;

    if (next <= 0) {
      this.lines.set(lines.filter((l) => l.product.id !== productId));
      return;
    }

    if (line.product.track_stock && next > line.product.stock) return;

    this.lines.set(lines.map((l) => (l.product.id === productId ? { ...l, qty: next } : l)));
  }

  remove(productId: number): void {
    this.lines.set(this.lines().filter((l) => l.product.id !== productId));
  }

  clear(): void {
    this.lines.set([]);
    this.discountCents.set(0);
    this.marginOverride.set(null);
    this.overrideTotalCents.set(null);
    this.overrideReason.set('');
    this.paymentMethod.set('efectivo');
  }
}