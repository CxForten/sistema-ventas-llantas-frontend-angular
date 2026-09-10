import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ProductsApi } from '../../core/api/products-api';
import { CategoriesApi } from '../../core/api/categories-api';
import { CashApi } from '../../core/api/cash-api';
import { SalesApi, CreateSalePayload } from '../../core/api/sales-api';
import { SettingsApi } from '../../core/api/settings-api';
import { CartStore } from './cart-store';
import { Toast } from '../../core/ui/toast';
import { Auth } from '../../core/auth/auth';
import { MoneyPipe } from '../../core/ui/money.pipe';
import { SaleDetail } from '../../core/ui/sale-detail';
import { Money } from '../../core/ui/money';
import { Product, Category, Sale, PaymentMethod } from '../../core/models';

@Component({
  selector: 'app-pos',
  imports: [FormsModule, MoneyPipe, RouterLink, SaleDetail, DecimalPipe],
  templateUrl: './pos.html',
})
export class Pos {
  private productsApi = inject(ProductsApi);
  private categoriesApi = inject(CategoriesApi);
  private cashApi = inject(CashApi);
  private salesApi = inject(SalesApi);
  private settingsApi = inject(SettingsApi);
  private toast = inject(Toast);
  auth = inject(Auth);
  cart = inject(CartStore);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  search = signal('');
  categoryFilter = signal<number | null>(null);
  cashOpen = signal<boolean | null>(null);

  /* --- Total editable: se guarda el texto tal como lo escribe el cajero --- */
  totalInput = signal('');

  /* --- Modal de cobro --- */
  checkoutOpen = signal(false);
  receivedInput = signal('');
  submitting = signal(false);

  /* --- Venta terminada --- */
  lastSale = signal<Sale | null>(null);
  detailOpen = signal(false);

  readonly changeCents = computed(() =>
    Math.max(0, Money.toCents(this.receivedInput()) - this.cart.totalCents())
  );

  readonly missingCents = computed(() =>
    Math.max(0, this.cart.totalCents() - Money.toCents(this.receivedInput()))
  );

  readonly needsReason = computed(() => this.cart.isOverridden());


  constructor() {
    this.checkCash();
    this.loadCategories();
    this.loadSettings();

    effect(() => {
      this.loadProducts(this.search(), this.categoryFilter());
    });
  }

  private async checkCash(): Promise<void> {
    try {
      const res = await this.cashApi.current();
      this.cashOpen.set(res.data !== null);
    } catch {
      this.cashOpen.set(false);
    }
  }

  /** El recargo de tarjeta vive en el backend; lo leemos para no duplicarlo. */
  private async loadSettings(): Promise<void> {
    try {
      const res = await this.settingsApi.get();
      this.cart.cardFeePct.set(res.defaults.card_fee_pct);
    } catch {
      // Queda el 15% por defecto del store
    }
  }

  private async loadProducts(search: string, categoryId: number | null): Promise<void> {
    try {
      const res = await this.productsApi.list({ search, category_id: categoryId });
      this.products.set(res.data);
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudo cargar el catálogo.');
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      const res = await this.categoriesApi.list();
      this.categories.set(res.data);
    } catch {
      // El catálogo funciona igual sin filtros
    }
  }

  /* ============ Carrito ============ */

  addToCart(product: Product): void {
    const result = this.cart.add(product);
    if (!result.ok) this.toast.error(result.message!);
  }

  setMargin(pct: number | null): void {
    this.cart.marginOverride.set(pct);
  }

  setMethod(method: PaymentMethod): void {
    this.cart.paymentMethod.set(method);
  }

  onDiscountInput(value: string): void {
    this.cart.discountCents.set(Money.toCents(value));
  }

  /**
   * El campo del total está vacío mientras se use el calculado.
   * Si el cajero escribe algo, ese número manda.
   */
  onTotalInput(value: string): void {
    this.totalInput.set(value);

    if (value.trim() === '') {
      this.cart.overrideTotalCents.set(null);
      this.cart.overrideReason.set('');
      return;
    }

    this.cart.overrideTotalCents.set(Money.toCents(value));
  }

  resetTotal(): void {
    this.totalInput.set('');
    this.cart.overrideTotalCents.set(null);
    this.cart.overrideReason.set('');
  }

  /* ============ Cobro ============ */

  openCheckout(): void {
    this.receivedInput.set('');
    this.checkoutOpen.set(true);
  }

  /** Botones de monto exacto y billetes comunes. */
  quickAmount(cents: number): void {
    this.receivedInput.set(Money.format(cents));
  }

  suggestedAmounts(): number[] {
    const total = this.cart.totalCents();
    const bills = [500, 1000, 2000, 5000, 10000];
    const options = bills.filter((b) => b > total);

    // El monto exacto siempre primero
    return [total, ...options.slice(0, 3)];
  }

  async confirmSale(): Promise<void> {
    this.submitting.set(true);

    const payload: CreateSalePayload = {
      items: this.cart.lines().map((l) => ({ product_id: l.product.id, qty: l.qty })),
      payment_method: this.cart.paymentMethod(),
      doc_type: 'consumidor_final',
    };

    // Solo si el cajero tocó el selector de margen
    const marginOverride = this.cart.marginOverride();
    if (marginOverride !== null) payload.margin_pct = marginOverride;

    if (this.cart.discountCents() > 0) {
      payload.discount_cents = this.cart.discountCents();
    }

    if (this.cart.isOverridden()) {
      payload.override_total_cents = this.cart.totalCents();
      payload.override_reason = this.cart.overrideReason().trim();
    }

    if (this.cart.paymentMethod() === 'efectivo') {
      payload.received_cents = Money.toCents(this.receivedInput());
    }

    try {
      const res = await this.salesApi.create(payload);
      this.lastSale.set(res.data);
      this.checkoutOpen.set(false);
      this.cart.clear();
      this.totalInput.set('');
      this.loadProducts(this.search(), this.categoryFilter());
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudo registrar la venta.');
    } finally {
      this.submitting.set(false);
    }
  }

  /** Trae la venta completa para el modal de detalle. */
  async showDetail(): Promise<void> {
    const sale = this.lastSale();
    if (!sale) return;

    try {
      const res = await this.salesApi.get(sale.id);
      this.lastSale.set(res.data);
      this.detailOpen.set(true);
    } catch (err) {
      this.toast.fromHttpError(err);
    }
  }

  newSale(): void {
    this.lastSale.set(null);
    this.detailOpen.set(false);
  }
}
